import { state } from './state.js';
import { redrawCanvas } from './canvas.js';
import { updateStatusBar } from './ui.js';
import { setPencilCursor, setEraserCursor, setPipetteCursor, setGridDrawCursor, resetCursor } from './cursors.js';

export function clearAllContent() {
  state.gridCells = [];
  state.images = [];
  state.drawingPaths = [];
  state.currentPath = [];
  state.selectedObjects = [];
  redrawCanvas();
  updateStatusBar('Canvas cleared');
}

export function updateCursorForTool(tool) {
  const canvas = document.querySelector('canvas');
  if (tool === 'pencil') {
    setPencilCursor();
  } else if (tool === 'eraser') {
    setEraserCursor();
  } else if (tool === 'pipette') {
    setPipetteCursor();
  } else if (tool === 'grid-draw') {
    setGridDrawCursor();
  } else {
    resetCursor();
  }
}