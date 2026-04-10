import { state } from './state.js';

/**
 * Canvas Module - Handles canvas setup, resizing, and rendering
 */

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

  state.ctx.save();
  state.ctx.translate(state.panOffset.x, state.panOffset.y);
  state.ctx.scale(state.zoomLevel, state.zoomLevel);

  state.ctx.strokeStyle = state.gridColor;
  state.ctx.lineWidth = 0.5;

  // Use effective grid size (accounts for upscale)
  const effectiveGridSize = state.gridSize * state.gridUpscale;

  // Calculate visible area
  const visibleWidth = state.canvas.width / state.zoomLevel;
  const visibleHeight = state.canvas.height / state.zoomLevel;
  const startX = -state.panOffset.x / state.zoomLevel;
  const startY = -state.panOffset.y / state.zoomLevel;
  const endX = startX + visibleWidth;
  const endY = startY + visibleHeight;

  // Draw vertical lines - infinite in both directions
  const firstVerticalLine = Math.floor(startX / effectiveGridSize) * effectiveGridSize;
  const lastVerticalLine = Math.ceil(endX / effectiveGridSize) * effectiveGridSize;

  for (let x = firstVerticalLine; x <= lastVerticalLine; x += effectiveGridSize) {
    state.ctx.beginPath();
    state.ctx.moveTo(x, startY);
    state.ctx.lineTo(x, endY);
    state.ctx.stroke();
  }

  // Draw horizontal lines - infinite in both directions
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
 state.zoomLevel = Math.max(1e-6, state.zoomLevel * factor); // Removed upper limit, kept very small lower limit

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

  // Draw grid cells
  const effectiveGridSize = state.gridSize * state.gridUpscale;
  state.gridCells.forEach(cell => {
    state.ctx.fillStyle = cell.color;
    state.ctx.fillRect(cell.x, cell.y, effectiveGridSize, effectiveGridSize);
  });

  // Draw images
  state.images.forEach(img => {
    const imgElement = new Image();
    imgElement.src = img.src;
    // Since it's data URL, it should be instant, but to be safe
    if (imgElement.complete) {
      state.ctx.save();
      state.ctx.translate(img.x, img.y);
      state.ctx.rotate(img.rotation);
      state.ctx.drawImage(imgElement, -img.width / 2, -img.height / 2, img.width, img.height);
      state.ctx.restore();
    } else {
      imgElement.onload = () => {
        state.ctx.save();
        state.ctx.translate(img.x, img.y);
        state.ctx.rotate(img.rotation);
        state.ctx.drawImage(imgElement, -img.width / 2, -img.height / 2, img.width, img.height);
        state.ctx.restore();
      };
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
  if (!state.symmetry.isActive() || !state.showSymmetryLine) return;

  const { ctx, canvas, zoomLevel, panOffset } = state;

  // Calculate visible area in world coordinates
  const visibleWidth = canvas.width / zoomLevel;
  const visibleHeight = canvas.height / zoomLevel;
  const startX = -panOffset.x / zoomLevel;
  const startY = -panOffset.y / zoomLevel;
  const endX = startX + visibleWidth;
  const endY = startY + visibleHeight;

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1 / zoomLevel; // Keep line width consistent regardless of zoom
  ctx.setLineDash([5 / zoomLevel, 5 / zoomLevel]);

  switch (state.symmetry.mode) {
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
  drawSymmetryLines
};