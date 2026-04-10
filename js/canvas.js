import { state } from './state.js';

/**
 * Canvas Module - Handles canvas setup, resizing, and rendering
 */

// Cache for loaded images
const imageCache = new Map();

// Offscreen canvas for grid cells caching
let gridCellsCache = null;
let gridCellsCacheVersion = 0;
let gridCellsLastDrawnCount = 0;
let gridCellsCacheBounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

// Spatial Hash Grid for fast visible cell queries
const SPATIAL_CELL_SIZE = 200;

function invalidateGridCellsCache() {
  gridCellsCacheVersion++;
}

function getRegionKey(x, y) {
  const rx = Math.floor(x / SPATIAL_CELL_SIZE);
  const ry = Math.floor(y / SPATIAL_CELL_SIZE);
  return rx + ',' + ry;
}

function rebuildSpatialHash() {
  if (!state.gridCells || state.gridCells.length === 0) {
    state._spatialHash = null;
    return;
  }

  state._spatialHash = new Map();
  for (let i = 0; i < state.gridCells.length; i++) {
    const cell = state.gridCells[i];
    const key = getRegionKey(cell.x, cell.y);
    if (!state._spatialHash.has(key)) {
      state._spatialHash.set(key, []);
    }
    state._spatialHash.get(key).push(cell); // Store cell reference, not index
  }
}

function getVisibleCells(visStartX, visStartY, visEndX, visEndY) {
  if (!state._spatialHash) return state.gridCells;

  const visibleCells = [];
  const startRx = Math.floor(visStartX / SPATIAL_CELL_SIZE);
  const endRx = Math.floor(visEndX / SPATIAL_CELL_SIZE);
  const startRy = Math.floor(visStartY / SPATIAL_CELL_SIZE);
  const endRy = Math.floor(visEndY / SPATIAL_CELL_SIZE);

  for (let rx = startRx; rx <= endRx; rx++) {
    for (let ry = startRy; ry <= endRy; ry++) {
      const key = rx + ',' + ry;
      const region = state._spatialHash.get(key);
      if (region) {
        for (let i = 0; i < region.length; i++) {
          visibleCells.push(region[i]);
        }
      }
    }
  }
  return visibleCells;
}

function addToSpatialHash(x, y, cell) {
  if (!state._spatialHash) {
    rebuildSpatialHash();
    return;
  }
  const key = getRegionKey(x, y);
  if (!state._spatialHash.has(key)) {
    state._spatialHash.set(key, []);
  }
  state._spatialHash.get(key).push(cell);
}

function removeCellFromSpatialHash(x, y, cellIndex) {
  // Not needed anymore - we store cell references, not indices
  // Spatial hash will be rebuilt after removal via rebuildSpatialHash()
}

function renderGridCellsToCache() {
  if (state.gridCells.length === 0) {
    gridCellsCache = null;
    gridCellsLastDrawnCount = 0;
    gridCellsCacheBounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    return;
  }

  // Calculate bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < state.gridCells.length; i++) {
    const cell = state.gridCells[i];
    if (cell.x < minX) minX = cell.x;
    if (cell.y < minY) minY = cell.y;
    if (cell.x + state.gridSize > maxX) maxX = cell.x + state.gridSize;
    if (cell.y + state.gridSize > maxY) maxY = cell.y + state.gridSize;
  }

  const padding = state.gridSize * 2;
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;

  if (!gridCellsCache || gridCellsCache.width !== width || gridCellsCache.height !== height) {
    gridCellsCache = document.createElement('canvas');
    gridCellsCache.width = width;
    gridCellsCache.height = height;
  }

  const ctx = gridCellsCache.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(-minX + padding, -minY + padding);

  // Color batching
  const cellsByColor = new Map();
  for (let i = 0; i < state.gridCells.length; i++) {
    const cell = state.gridCells[i];
    if (!cellsByColor.has(cell.color)) cellsByColor.set(cell.color, []);
    cellsByColor.get(cell.color).push(cell);
  }

  for (const [color, cells] of cellsByColor) {
    ctx.fillStyle = color;
    for (let j = 0; j < cells.length; j++) {
      ctx.fillRect(cells[j].x, cells[j].y, state.gridSize, state.gridSize);
    }
  }

  ctx.restore();
  gridCellsCache._offsetX = minX - padding;
  gridCellsCache._offsetY = minY - padding;
  gridCellsCacheBounds = { minX, minY, maxX, maxY };
  gridCellsLastDrawnCount = state.gridCells.length;
}

function getCachedImage(imgData) {
  if (!imageCache.has(imgData.src)) {
    const imgElement = new Image();
    imgElement.src = imgData.src;
    imageCache.set(imgData.src, imgElement);
  }
  return imageCache.get(imgData.src);
}

// Initialize canvas
function setupCanvas() {
  state.canvas = document.getElementById('drawingCanvas');
  state.ctx = state.canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

// Resize canvas to fit container
function resizeCanvas() {
  const container = document.querySelector('.canvas-container');
  if (container && state.canvas) {
    state.canvas.width = container.clientWidth;
    state.canvas.height = container.clientHeight;
    redrawCanvas();
  }
}

// Clear canvas
function clearCanvas() {
  if (state.ctx && state.canvas) {
    state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
  }
}

// Draw grid
function drawGrid() {
  if (!state.showGrid || !state.ctx) return;

  // Calculate visible area in world coordinates
  const visibleWidth = state.canvas.width / state.zoomLevel;
  const visibleHeight = state.canvas.height / state.zoomLevel;
  const startX = -state.panOffset.x / state.zoomLevel;
  const startY = -state.panOffset.y / state.zoomLevel;
  const endX = startX + visibleWidth;
  const endY = startY + visibleHeight;

  // Use effective grid size (accounts for upscale if defined)
  const gridUpscale = state.gridUpscale || 1;
  let effectiveGridSize = state.gridSize * gridUpscale;

  // Limit grid lines to prevent performance issues at low zoom
  const maxGridLines = 500;
  const gridLineCount = Math.ceil(visibleWidth / effectiveGridSize) + Math.ceil(visibleHeight / effectiveGridSize);
  if (gridLineCount > maxGridLines) {
    // Increase grid size to keep line count reasonable
    effectiveGridSize *= Math.ceil(gridLineCount / maxGridLines);
  }

  state.ctx.save();
  state.ctx.strokeStyle = state.gridColor;
  state.ctx.lineWidth = 0.5 / state.zoomLevel;

  // Draw vertical lines
  const firstVerticalLine = Math.floor(startX / effectiveGridSize) * effectiveGridSize;
  const lastVerticalLine = Math.ceil(endX / effectiveGridSize) * effectiveGridSize;

  for (let x = firstVerticalLine; x <= lastVerticalLine; x += effectiveGridSize) {
    state.ctx.beginPath();
    state.ctx.moveTo(x, startY);
    state.ctx.lineTo(x, endY);
    state.ctx.stroke();
  }

  // Draw horizontal lines
  const firstHorizontalLine = Math.floor(startY / effectiveGridSize) * effectiveGridSize;
  const lastHorizontalLine = Math.ceil(endY / effectiveGridSize) * effectiveGridSize;

  for (let y = firstHorizontalLine; y <= lastHorizontalLine; y += effectiveGridSize) {
    state.ctx.beginPath();
    state.ctx.moveTo(startX, y);
    state.ctx.lineTo(endX, y);
    state.ctx.stroke();
  }

  state.ctx.restore();
}

// Zoom functionality
function zoom(factor) {
  const oldZoom = state.zoomLevel;
  // Set reasonable zoom limits: 0.01% to 10000%
  state.zoomLevel = Math.min(100, Math.max(1e-4, state.zoomLevel * factor));

  // Adjust pan offset to zoom around center
  const rect = state.canvas.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  state.panOffset.x = centerX - (centerX - state.panOffset.x) * (state.zoomLevel / oldZoom);
  state.panOffset.y = centerY - (centerY - state.panOffset.y) * (state.zoomLevel / oldZoom);

  redrawCanvas();
  return state.zoomLevel * 100;
}

// Reset zoom
function resetZoom() {
  zoom(1 / state.zoomLevel);
}

// Toggle grid visibility
function toggleGrid() {
  state.showGrid = !state.showGrid;
  const gridBtn = document.getElementById('gridBtn');
  if (gridBtn) {
    gridBtn.setAttribute('data-active', state.showGrid);
    if (state.showGrid) {
      gridBtn.classList.add('active');
    } else {
      gridBtn.classList.remove('active');
    }
  }
  redrawCanvas();
}

// Redraw entire canvas
function redrawCanvas() {
  if (!state.ctx || !state.canvas) return;

  clearCanvas();

  // Apply zoom and pan
  state.ctx.save();
  state.ctx.translate(state.panOffset.x, state.panOffset.y);
  state.ctx.scale(state.zoomLevel, state.zoomLevel);

  // Draw background
  state.ctx.fillStyle = state.backgroundColor;
  const visibleWidth = state.canvas.width / state.zoomLevel;
  const visibleHeight = state.canvas.height / state.zoomLevel;
  const startX = -state.panOffset.x / state.zoomLevel;
  const startY = -state.panOffset.y / state.zoomLevel;
  state.ctx.fillRect(startX, startY, visibleWidth, visibleHeight);

  // Draw grid
  drawGrid();

  // Draw drawing paths
  state.drawingPaths.forEach(path => {
    if (path.length > 0) {
      state.ctx.strokeStyle = path[0].color;
      state.ctx.lineWidth = path[0].size;
      state.ctx.lineCap = 'round';
      state.ctx.lineJoin = 'round';
      state.ctx.beginPath();
      state.ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        state.ctx.lineTo(path[i].x, path[i].y);
      }
      state.ctx.stroke();
    }
  });

  // Draw current path if drawing
  if (state.currentPath.length > 0) {
    state.ctx.strokeStyle = state.currentPath[0].color;
    state.ctx.lineWidth = state.currentPath[0].size;
    state.ctx.lineCap = 'round';
    state.ctx.lineJoin = 'round';
    state.ctx.beginPath();
    state.ctx.moveTo(state.currentPath[0].x, state.currentPath[0].y);
    for (let i = 1; i < state.currentPath.length; i++) {
      state.ctx.lineTo(state.currentPath[i].x, state.currentPath[i].y);
    }
    state.ctx.stroke();
  }

  // Draw grid cells - DIRECT rendering with spatial hash culling + batching
  const gs = state.gridSize;
  const visStartX = -state.panOffset.x / state.zoomLevel;
  const visStartY = -state.panOffset.y / state.zoomLevel;
  const visEndX = visStartX + state.canvas.width / state.zoomLevel;
  const visEndY = visStartY + state.canvas.height / state.zoomLevel;

  // Use spatial hash to get only visible cells (if available)
  let visibleCells;
  if (state._spatialHash) {
    visibleCells = getVisibleCells(visStartX, visStartY, visEndX, visEndY);
  } else {
    // Fallback: use all cells
    visibleCells = state.gridCells;
  }

  // Only visible cells with color batching
  const cellsByColor = new Map();
  for (let i = 0; i < visibleCells.length; i++) {
    const cell = visibleCells[i];
    // Extra culling for cells at region borders
    if (cell.x + gs < visStartX || cell.x > visEndX || cell.y + gs < visStartY || cell.y > visEndY) continue;
    if (!cellsByColor.has(cell.color)) cellsByColor.set(cell.color, []);
    cellsByColor.get(cell.color).push(cell);
  }

  for (const [color, cells] of cellsByColor) {
    state.ctx.fillStyle = color;
    for (let j = 0; j < cells.length; j++) {
      state.ctx.fillRect(cells[j].x, cells[j].y, gs, gs);
    }
  }

  // Draw images (cached for performance)
  state.images.forEach(img => {
    const imgElement = getCachedImage(img);
    if (imgElement.complete && imgElement.naturalWidth > 0) {
      state.ctx.save();
      state.ctx.translate(img.x, img.y);
      state.ctx.rotate(img.rotation);
      state.ctx.drawImage(imgElement, -img.width / 2, -img.height / 2, img.width, img.height);
      state.ctx.restore();
    }
  });

  // Draw symmetry lines
  drawSymmetryLines();

  state.ctx.restore();
}

// Get current canvas state
function getCanvasState() {
  return {
    zoomLevel: state.zoomLevel,
    panOffset: state.panOffset,
    showGrid: state.showGrid
  };
}

// Set canvas state
function setCanvasState(canvasState) {
  state.zoomLevel = canvasState.zoomLevel !== undefined ? canvasState.zoomLevel : 1;
  state.panOffset = canvasState.panOffset || { x: 0, y: 0 };
  state.showGrid = canvasState.showGrid !== undefined ? canvasState.showGrid : true;
}

function drawSymmetryLines() {
  if (!state.showSymmetryLine) return;
  // Always draw symmetry line based on current mode, even if 'off' show a vertical guide
  const modeToDraw = state.symmetry.mode !== 'off' ? state.symmetry.mode : 'vertical';

  
  const { ctx, canvas, zoomLevel, panOffset } = state;

  // Calculate visible area in world coordinates
  const visibleWidth = canvas.width / zoomLevel;
  const visibleHeight = canvas.height / zoomLevel;
  const startX = -panOffset.x / zoomLevel;
  const startY = -panOffset.y / zoomLevel;
  const endX = startX + visibleWidth;
  const endY = startY + visibleHeight;

  ctx.save();
  
  // Change color based on symmetry activation state
  if (state.symmetry.isActive()) {
    // Active symmetry - bright green
    ctx.strokeStyle = 'rgba(0, 255, 127, 0.7)';
  } else {
    // Inactive (guide only) - dim white
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  }
  
  ctx.lineWidth = 1 / zoomLevel; // Keep line width consistent regardless of zoom
  ctx.setLineDash([5 / zoomLevel, 5 / zoomLevel]);

  switch (modeToDraw) {
    case 'vertical':
      ctx.beginPath();
      ctx.moveTo(0, startY);
      ctx.lineTo(0, endY);
      ctx.stroke();
      break;
    case 'horizontal':
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(endX, 0);
      ctx.stroke();
      break;
    case 'quad':
      // Vertical line
      ctx.beginPath();
      ctx.moveTo(0, startY);
      ctx.lineTo(0, endY);
      ctx.stroke();
      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(endX, 0);
      ctx.stroke();
      break;
    case 'radial':
      const angleIncrement = (2 * Math.PI) / state.symmetry.radialRays;
      const radius = Math.max(visibleWidth, visibleHeight); // A radius large enough to cover the screen

      for (let i = 0; i < state.symmetry.radialRays; i++) {
        const angle = angleIncrement * i;
        const endX = Math.cos(angle) * radius;
        const endY = Math.sin(angle) * radius;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
      break;
  }

  ctx.restore();
}

export {
  setupCanvas,
  resizeCanvas,
  clearCanvas,
  drawGrid,
  zoom,
  resetZoom,
  toggleGrid,
  redrawCanvas,
  getCanvasState,
  setCanvasState,
  drawSymmetryLines,
  invalidateGridCellsCache,
  addToSpatialHash,
  rebuildSpatialHash,
  removeCellFromSpatialHash
};