import { state, elements } from './state.js';
import { updateStatusBar } from './ui.js';
import { getPathBoundingBox } from './geometry.js';
import { getImageFromData } from './main.js';


export function setupCanvas() {
  state.canvas = elements.canvas;
  state.ctx = state.canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

export function resizeCanvas() {
  const container = document.querySelector('.canvas-container');
  if (state.canvas) {
    state.canvas.width = container.clientWidth;
    state.canvas.height = container.clientHeight;
    redrawCanvas();
  }
}

export function zoom(factor, mouseX, mouseY) {
  const oldZoom = state.zoomLevel;
  state.zoomLevel = Math.max(1e-6, state.zoomLevel * factor); // Removed upper limit, kept very small lower limit

  const rect = elements.canvas.getBoundingClientRect();
  const centerX = mouseX ?? rect.width / 2;
  const centerY = mouseY ?? rect.height / 2;

  state.panOffset.x = centerX - (centerX - state.panOffset.x) * (state.zoomLevel / oldZoom);
  state.panOffset.y = centerY - (centerY - state.panOffset.y) * (state.zoomLevel / oldZoom);

 redrawCanvas();
  updateStatusBar(`Zoom: ${Math.round(state.zoomLevel * 100)}%`);
}

export function redrawCanvas() {
  if (!state.ctx) return;

  state.ctx.fillStyle = state.backgroundColor;
  state.ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);

  state.ctx.save();
  state.ctx.translate(state.panOffset.x, state.panOffset.y);
  state.ctx.scale(state.zoomLevel, state.zoomLevel);

  drawGrid();

  // Draw vector paths first
  state.drawingPaths.forEach(path => {
    if (path.length > 1) {
      drawPath(path);
    }
  });

  // Draw current path being drawn
  if (state.currentPath.length > 1) {
    drawPath(state.currentPath);
  }

  // Draw filled grid cells with symmetry support
  const transformedGridCells = state.symmetry.transformGridCells(state.gridCells, state.gridSize);
  transformedGridCells.forEach(cell => {
    state.ctx.fillStyle = cell.color;
    state.ctx.fillRect(cell.x, cell.y, state.gridSize, state.gridSize);
  });

  // Draw images on top of everything else
  // Draw images on top of everything else
  state.images.forEach(img => {
    // Only draw images for the active layer that are visible
    const layer = state.layers[img.layer];
    if (!layer || !layer.visible) return;

    state.ctx.save();
    state.ctx.translate(img.x + img.width / 2, img.y + img.height / 2);
    state.ctx.rotate(img.rotation);
    state.ctx.drawImage(
      getImageFromData(img.src),
      -img.width / 2,
      -img.height / 2,
      img.width,
      img.height
    );
    state.ctx.restore();
  });

  if (state.isSelecting) {
    if (state.selectionTool === 'lasso') {
        drawLassoPath();
    } else {
        drawSelectionRectangle();
    }
  }

  // Draw bounding box for selected objects
  if (state.selectedObjects.length > 0) {
    state.selectedObjects.forEach(obj => {
        drawObjectSelection(obj);
    });
  }

  // Draw ghost preview for move operation
  drawGhostPreview();

  state.ctx.restore();
}

function drawPath(path) {
  const transformedPaths = state.symmetry.transformPath(path);

  transformedPaths.forEach(p => {
    if (!p || p.length < 1) return;
    
    state.ctx.beginPath();
    state.ctx.moveTo(p[0].x, p[0].y);
    for (let i = 1; i < p.length; i++) {
        const point = p[i];
        state.ctx.lineTo(point.x, point.y);
    }
    state.ctx.strokeStyle = p[0].color;
    state.ctx.lineWidth = p[0].size;
    state.ctx.lineCap = 'round';
    state.ctx.lineJoin = 'round';
    state.ctx.stroke();
  });
}

function drawGrid() {
  if (!state.showGrid) return;
  const gridSize = state.gridSize;
  const gridColor = state.gridColor;

  state.ctx.strokeStyle = gridColor;
  state.ctx.lineWidth = 0.5;

  const visibleWidth = state.canvas.width / state.zoomLevel;
  const visibleHeight = state.canvas.height / state.zoomLevel;
  const startX = -state.panOffset.x / state.zoomLevel;
  const startY = -state.panOffset.y / state.zoomLevel;
  const endX = startX + visibleWidth;
  const endY = startY + visibleHeight;

  const firstVerticalLine = Math.floor(startX / gridSize) * gridSize;
  const lastVerticalLine = Math.ceil(endX / gridSize) * gridSize;
  for (let x = firstVerticalLine; x <= lastVerticalLine; x += gridSize) {
    state.ctx.beginPath();
    state.ctx.moveTo(x, startY);
    state.ctx.lineTo(x, endY);
    state.ctx.stroke();
  }

  const firstHorizontalLine = Math.floor(startY / gridSize) * gridSize;
  const lastHorizontalLine = Math.ceil(endY / gridSize) * gridSize;
  for (let y = firstHorizontalLine; y <= lastHorizontalLine; y += gridSize) {
    state.ctx.beginPath();
    state.ctx.moveTo(startX, y);
    state.ctx.lineTo(endX, y);
    state.ctx.stroke();
  }
}

function drawLassoPath() {
    if (state.selectionPath.length < 2) return;
    state.ctx.strokeStyle = '#0095ff';
    state.ctx.lineWidth = 1;
    state.ctx.setLineDash([5, 5]);
    state.ctx.beginPath();
    state.ctx.moveTo(state.selectionPath[0].x, state.selectionPath[0].y);
    for (let i = 1; i < state.selectionPath.length; i++) {
        state.ctx.lineTo(state.selectionPath[i].x, state.selectionPath[i].y);
    }
    state.ctx.stroke();
    state.ctx.setLineDash([]);
}

function drawSelectionRectangle() {
  const start = state.selectionStart;
  const end = state.selectionEnd;
  state.ctx.strokeStyle = '#0095ff';
  state.ctx.lineWidth = 1;
  state.ctx.setLineDash([5, 5]);
  state.ctx.beginPath();
  state.ctx.rect(
    Math.min(start.x, end.x),
    Math.min(start.y, end.y),
    Math.abs(end.x - start.x),
    Math.abs(end.y - start.y)
  );
  state.ctx.stroke();
  state.ctx.setLineDash([]);
}

function drawSelection(img) {
  state.ctx.strokeStyle = '#0095ff';
  state.ctx.lineWidth = 2;
  state.ctx.setLineDash([5, 5]);
  state.ctx.strokeRect(-img.width / 2, -img.height / 2, img.width, img.height);
  state.ctx.setLineDash([]);

  const handleSize = 10;
  state.ctx.fillStyle = '#0095ff';
  state.ctx.fillRect(
    img.width / 2 - handleSize / 2,
    img.height / 2 - handleSize / 2,
    handleSize,
    handleSize
  );

  state.ctx.fillStyle = '#ff0095';
  state.ctx.beginPath();
  state.ctx.arc(0, -img.height / 2 - 20, 8, 0, Math.PI * 2);
  state.ctx.fill();
}

function drawObjectSelection(obj) {
    let bbox;
    if (obj.type === 'image') {
        bbox = { minX: obj.obj.x, minY: obj.obj.y, maxX: obj.obj.x + obj.obj.width, maxY: obj.obj.y + obj.obj.height };
    } else if (obj.type === 'path') {
        bbox = getPathBoundingBox(obj.obj);
    } else if (obj.type === 'grid-cell') {
        bbox = { minX: obj.obj.x, minY: obj.obj.y, maxX: obj.obj.x + state.gridSize, maxY: obj.obj.y + state.gridSize };
    }

    if (bbox) {
        state.ctx.strokeStyle = '#0095ff';
        state.ctx.lineWidth = 1;
        state.ctx.setLineDash([3, 3]);
        state.ctx.strokeRect(bbox.minX, bbox.minY, bbox.maxX - bbox.minX, bbox.maxY - bbox.minY);
        state.ctx.setLineDash([]);
    }
}

function drawGhostPreview() {
    if (!state.isGhostVisible || state.selectedObjects.length === 0) return;

    const offset = state.ghostOffset;
    state.ctx.globalAlpha = 0.5; // Semi-transparent

    state.selectedObjects.forEach(selected => {
        if (selected.type === 'image') {
            const img = selected.obj;
            state.ctx.save();
            state.ctx.translate(img.x + offset.x + img.width / 2, img.y + offset.y + img.height / 2);
            state.ctx.rotate(img.rotation);
            state.ctx.drawImage(
                getImageFromData(img.src),
                -img.width / 2,
                -img.height / 2,
                img.width,
                img.height
            );
            state.ctx.restore();
        } else if (selected.type === 'path') {
            const path = selected.obj;
            if (path.length > 1) {
                state.ctx.beginPath();
                state.ctx.moveTo(path[0].x + offset.x, path[0].y + offset.y);
                for (let i = 1; i < path.length; i++) {
                    state.ctx.lineTo(path[i].x + offset.x, path[i].y + offset.y);
                }
                state.ctx.strokeStyle = path[0].color;
                state.ctx.lineWidth = path[0].size;
                state.ctx.lineCap = 'round';
                state.ctx.lineJoin = 'round';
                state.ctx.stroke();
            }
        } else if (selected.type === 'grid-cell') {
            const cell = selected.obj;
            state.ctx.fillStyle = cell.color;
            state.ctx.fillRect(cell.x + offset.x, cell.y + offset.y, state.gridSize, state.gridSize);
        }
    });

    state.ctx.globalAlpha = 1.0; // Reset opacity
}
