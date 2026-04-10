import { state, elements } from './state.js';
import { zoom, redrawCanvas } from './canvas.js';
import { saveState } from './history.js';
import { setPipetteCursor, setPencilCursor, setGridDrawCursor, resetCursor } from './cursors.js';
import { updateActiveTool } from './ui.js';
import { 
  gridDrawStart, gridDrawMove, pencilDrawStart, pencilDrawMove, 
  eraserDrawStart, eraserDrawMove, fillTool, buildGridCellsSet 
} from './tools.js';
import { getPathBoundingBox } from './geometry.js';
import { floodFill } from './fill.js';

export function getMousePosition(e) {
  const rect = elements.canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left - state.panOffset.x) / state.zoomLevel;
  const y = (e.clientY - rect.top - state.panOffset.y) / state.zoomLevel;
  return { x, y };
}

export function handleCanvasMouseDown(e) {
  const pos = getMousePosition(e);

  // Moving selection with Ctrl
  if (e.ctrlKey && state.selectedObjects.length > 0) {
    const clickedOnSelection = state.selectedObjects.some(obj => {
      let bbox;
      if (obj.type === 'image') bbox = { minX: obj.obj.x, minY: obj.obj.y, maxX: obj.obj.x + obj.obj.width, maxY: obj.obj.y + obj.obj.height };
      else if (obj.type === 'path') bbox = getPathBoundingBox(obj.obj);
      else if (obj.type === 'grid-cell') bbox = { minX: obj.obj.x, minY: obj.obj.y, maxX: obj.obj.x + state.gridSize, maxY: obj.obj.y + state.gridSize };
      return bbox && pos.x >= bbox.minX && pos.x <= bbox.maxX && pos.y >= bbox.minY && pos.y <= bbox.maxY;
    });

    if (clickedOnSelection) {
      state.isMovingSelection = true;
      state.dragStart = pos;
      state.ghostOffset = { x: 0, y: 0 };
      state.isGhostVisible = true;
      elements.canvas.style.cursor = 'move';
      saveState();
      return;
    }
  }

  // Clear selection if clicking outside
  if (state.selectedObjects.length > 0 && !e.ctrlKey) {
    state.selectedObjects = [];
    redrawCanvas();
  }

  // Panning
  if (state.spacebarDown || e.button === 1) {
    state.isPanning = true;
    state.panStart = { x: e.clientX, y: e.clientY };
    elements.canvas.style.cursor = 'grabbing';
    return;
  }

  // Grid Draw Tool
  if (state.selectionTool === 'grid-draw') {
    gridDrawStart(pos, e.button, (msg) => {
      if (elements.statusBar) elements.statusBar.textContent = msg;
    });
    return;
  }

  // Right-click is ALWAYS eraser
  if (e.button === 2) {
    state.isDrawing = true;
    state.isRightClickErasing = true;
    saveState();
    state.currentPath = [{
      x: pos.x, y: pos.y,
      size: state.eraserSize,
      color: state.backgroundColor
    }];
    redrawCanvas();
    return;
  }

  if (e.button !== 0) return;

  // Pipette
  if (state.selectionTool === 'pipette') {
    const canvasX = pos.x * state.zoomLevel + state.panOffset.x;
    const canvasY = pos.y * state.zoomLevel + state.panOffset.y;
    const pixelData = elements.canvas.getContext('2d').getImageData(canvasX, canvasY, 1, 1).data;
    const hexColor = "#" + ("000000" + ((pixelData[0] << 16) | (pixelData[1] << 8) | pixelData[2]).toString(16)).slice(-6);

    state.drawingColor = hexColor;
    elements.brushColorPicker.value = hexColor;
    updateColorIndicator();

    if (!state.altKeyDown) {
      state.selectionTool = 'pencil';
      const pencilBtn = document.querySelector('.tool-btn[data-tool="pencil"]');
      if (pencilBtn) updateActiveTool(pencilBtn);
      setPencilCursor();
    }
    return;
  }

  // Fill tool
  if (state.selectionTool === 'fill') {
    fillTool(pos, e.button);
    return;
  }

  // Pencil
  if (state.selectionTool === 'pencil') {
    pencilDrawStart(pos);
    return;
  }

  // Eraser
  if (state.selectionTool === 'eraser') {
    eraserDrawStart(pos);
    return;
  }

  // Select tools
  if (state.selectionTool === 'rect-select' || state.selectionTool === 'lasso') {
    saveState();
    state.isSelecting = true;
    if (state.selectionTool === 'lasso') {
      state.selectionPath = [pos];
    } else {
      state.selectionStart = pos;
      state.selectionEnd = pos;
    }
    return;
  }
}

export function handleCanvasMouseMove(e) {
  const pos = getMousePosition(e);

  if (state.isDrawing && state.selectionTool === 'grid-draw') {
    gridDrawMove(pos, e.buttons);
    return;
  }

  if (state.isDrawing && state.selectionTool === 'pencil') {
    pencilDrawMove(pos, e.buttons);
    return;
  }

  if (state.isDrawing && state.selectionTool === 'eraser') {
    eraserDrawMove(pos, e.buttons);
    return;
  }

  // Update position display
  if (elements.posStatus) {
    elements.posStatus.textContent = `X: ${Math.round(pos.x)} Y: ${Math.round(pos.y)}`;
  }
}

export function handleCanvasMouseUp(e) {
  if (state.isDrawing) {
    if (state.currentPath.length > 0 && !state.isRightClickErasing) {
      state.drawingPaths.push([...state.currentPath]);
    }
    state.currentPath = [];
    state.isDrawing = false;
    state.isRightClickErasing = false;
  }

  if (state.isPanning) {
    state.isPanning = false;
    if (state.spacebarDown) {
      if (elements.canvas) elements.canvas.style.cursor = 'grab';
    } else {
      // Restore cursor based on current tool after panning
      if (state.selectionTool === 'grid-draw') {
        setGridDrawCursor();
      } else {
        resetCursor();
      }
    }
  }
}

export function handleCanvasWheel(e) {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const oldZoom = state.zoomLevel;
  state.zoomLevel = Math.min(100, Math.max(0.0001, state.zoomLevel * delta));

  const rect = elements.canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  state.panOffset.x = mouseX - (mouseX - state.panOffset.x) * (state.zoomLevel / oldZoom);
  state.panOffset.y = mouseY - (mouseY - state.panOffset.y) * (state.zoomLevel / oldZoom);

  redrawCanvas();

  if (elements.zoomLevelDisplay) {
    elements.zoomLevelDisplay.textContent = Math.round(state.zoomLevel * 100) + '%';
  }
}

function updateColorIndicator() {
  const colorStatus = document.getElementById('colorStatus');
  if (colorStatus) {
    colorStatus.style.backgroundColor = state.drawingColor;
  }
}
