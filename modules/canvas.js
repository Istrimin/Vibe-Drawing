/**
 * Canvas Module - Handles canvas setup, resizing, and rendering
 */

// Canvas state
const canvasState = {
  canvas: null,
  ctx: null,
  zoomLevel: 1,
  panOffset: { x: 0, y: 0 },
  showGrid: true,
  gridSize: 50,
  gridColor: '#eeeeee'
};

// Initialize canvas
function initCanvas(canvasElement) {
  canvasState.canvas = canvasElement;
  canvasState.ctx = canvasElement.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

// Resize canvas to fit container
function resizeCanvas() {
  const container = document.querySelector('.canvas-container');
  if (container && canvasState.canvas) {
    canvasState.canvas.width = container.clientWidth;
    canvasState.canvas.height = container.clientHeight;
    redrawCanvas();
  }
}

// Clear canvas
function clearCanvas() {
  if (canvasState.ctx && canvasState.canvas) {
    canvasState.ctx.clearRect(0, 0, canvasState.canvas.width, canvasState.canvas.height);
  }
}

// Draw grid
function drawGrid() {
  if (!canvasState.showGrid || !canvasState.ctx) return;

  canvasState.ctx.save();
  canvasState.ctx.translate(canvasState.panOffset.x, canvasState.panOffset.y);
  canvasState.ctx.scale(canvasState.zoomLevel, canvasState.zoomLevel);

  canvasState.ctx.strokeStyle = canvasState.gridColor;
  canvasState.ctx.lineWidth = 0.5;

  // Calculate visible area
  const visibleWidth = canvasState.canvas.width / canvasState.zoomLevel;
  const visibleHeight = canvasState.canvas.height / canvasState.zoomLevel;
  const startX = -canvasState.panOffset.x / canvasState.zoomLevel;
  const startY = -canvasState.panOffset.y / canvasState.zoomLevel;
  const endX = startX + visibleWidth;
  const endY = startY + visibleHeight;

  // Draw vertical lines - infinite in both directions
  const firstVerticalLine = Math.floor(startX / canvasState.gridSize) * canvasState.gridSize;
  const lastVerticalLine = Math.ceil(endX / canvasState.gridSize) * canvasState.gridSize;

  for (let x = firstVerticalLine; x <= lastVerticalLine; x += canvasState.gridSize) {
    canvasState.ctx.beginPath();
    canvasState.ctx.moveTo(x, startY);
    canvasState.ctx.lineTo(x, endY);
    canvasState.ctx.stroke();
  }

  // Draw horizontal lines - infinite in both directions
  const firstHorizontalLine = Math.floor(startY / canvasState.gridSize) * canvasState.gridSize;
  const lastHorizontalLine = Math.ceil(endY / canvasState.gridSize) * canvasState.gridSize;

  for (let y = firstHorizontalLine; y <= lastHorizontalLine; y += canvasState.gridSize) {
    canvasState.ctx.beginPath();
    canvasState.ctx.moveTo(startX, y);
    canvasState.ctx.lineTo(endX, y);
    canvasState.ctx.stroke();
  }

  canvasState.ctx.restore();
}

// Zoom functionality
function zoom(factor) {
  const oldZoom = canvasState.zoomLevel;
 canvasState.zoomLevel = Math.max(1e-6, canvasState.zoomLevel * factor); // Removed upper limit, kept very small lower limit

 // Adjust pan offset to zoom around center
  const rect = canvasState.canvas.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  canvasState.panOffset.x = centerX - (centerX - canvasState.panOffset.x) * (canvasState.zoomLevel / oldZoom);
  canvasState.panOffset.y = centerY - (centerY - canvasState.panOffset.y) * (canvasState.zoomLevel / oldZoom);

  redrawCanvas();
  return canvasState.zoomLevel * 100;
}

// Reset zoom
function resetZoom() {
  zoom(1 / canvasState.zoomLevel);
}

// Toggle grid visibility
function toggleGrid() {
  canvasState.showGrid = !canvasState.showGrid;
  const gridBtn = document.getElementById('gridBtn');
  if (gridBtn) {
    gridBtn.setAttribute('data-active', canvasState.showGrid);
    if (canvasState.showGrid) {
      gridBtn.classList.add('active');
    } else {
      gridBtn.classList.remove('active');
    }
  }
  redrawCanvas();
}

// Redraw entire canvas
function redrawCanvas() {
  if (!canvasState.ctx || !canvasState.canvas) return;

  clearCanvas();

  // Apply zoom and pan
  canvasState.ctx.save();
  canvasState.ctx.translate(canvasState.panOffset.x, canvasState.panOffset.y);
  canvasState.ctx.scale(canvasState.zoomLevel, canvasState.zoomLevel);

  // Draw grid first (as background)
  drawGrid();

  canvasState.ctx.restore();
}

// Get current canvas state
function getCanvasState() {
  return {
    zoomLevel: canvasState.zoomLevel,
    panOffset: canvasState.panOffset,
    showGrid: canvasState.showGrid
  };
}

// Set canvas state
function setCanvasState(state) {
  canvasState.zoomLevel = state.zoomLevel !== undefined ? state.zoomLevel : 1;
  canvasState.panOffset = state.panOffset || { x: 0, y: 0 };
  canvasState.showGrid = state.showGrid !== undefined ? state.showGrid : true;
}

export {
  initCanvas,
  resizeCanvas,
  clearCanvas,
  drawGrid,
  zoom,
  resetZoom,
  toggleGrid,
  redrawCanvas,
  getCanvasState,
  setCanvasState,
  canvasState
};