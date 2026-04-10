import { state, elements } from './state.js';
import { zoom, redrawCanvas } from './canvas.js';
import { undo, redo } from './history.js';
import { setPipetteCursor, setPencilCursor, setEraserCursor, resetCursor } from './cursors.js';
import { updateActiveTool, updateStatusBar } from './ui.js';

export function handleKeyDown(e) {
  // Don't handle shortcuts when typing in inputs
  if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
    return;
  }

  // Space - Pan
  if (e.code === 'Space' && !state.spacebarDown) {
    e.preventDefault();
    state.spacebarDown = true;
    elements.canvas.style.cursor = 'grab';
    return;
  }

  // Alt - Temporary pipette tool
  if (e.key === 'Alt' && !state.altKeyDown) {
    e.preventDefault();
    state.altKeyDown = true;
    setPipetteCursor();
    updateStatusBar('Color Picker (Alt)');
    return;
  }

  // Ctrl+Z - Undo
  if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    undo();
    updateStatusBar('Undo');
    return;
  }

  // Ctrl+Y or Ctrl+Shift+Z - Redo
  if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
    e.preventDefault();
    redo();
    updateStatusBar('Redo');
    return;
  }

  // Delete - Clear selection or delete selected
  if (e.key === 'Delete') {
    if (state.selectedObjects.length > 0) {
      state.selectedObjects = [];
      redrawCanvas();
      updateStatusBar('Selection cleared');
    }
    return;
  }

  // Escape - Deselect or close panels
  if (e.key === 'Escape') {
    if (state.selectedObjects.length > 0) {
      state.selectedObjects = [];
      redrawCanvas();
      updateStatusBar('Selection cleared');
    }
    // Close panels
    const symmetryPanel = document.getElementById('symmetry-panel');
    if (symmetryPanel) symmetryPanel.classList.add('hidden');
    
    const exportPanel = document.getElementById('export-panel');
    if (exportPanel) exportPanel.classList.add('hidden');
    
    const cursorPanel = document.getElementById('cursorPanel');
    if (cursorPanel) cursorPanel.style.display = 'none';
    return;
  }

  // Number keys for zoom
  if (e.key === '0' && !e.ctrlKey) {
    e.preventDefault();
    zoom(1 / state.zoomLevel); // Reset zoom
    updateStatusBar('Zoom reset');
    return;
  }

  // Plus/Minus for zoom
  if (e.key === '=' || e.key === '+') {
    e.preventDefault();
    zoom(1.2);
    updateStatusBar('Zoom in');
    return;
  }
  if (e.key === '-') {
    e.preventDefault();
    zoom(0.8);
    updateStatusBar('Zoom out');
    return;
  }

  // Tool shortcuts (only if not typing)
  if (!e.ctrlKey && !e.altKey) {
    switch(e.key.toLowerCase()) {
      case 'p': // Pencil
        selectTool('pencil');
        break;
      case 'e': // Eraser
        selectTool('eraser');
        break;
      case 'i': // Pipette/Color picker
        selectTool('pipette');
        break;
      case 'b': // Fill bucket
        selectTool('fill');
        break;
      case 'g': // Grid draw
        selectTool('grid-draw');
        break;
      case 'v': // Select
        selectTool('select');
        break;
      case 'r': // Rect select
        selectTool('rect-select');
        break;
      case 'l': // Lasso
        selectTool('lasso');
        break;
      case 'y': // Symmetry
        const symmetryBtn = document.getElementById('symmetryBtn');
        if (symmetryBtn) symmetryBtn.click();
        break;
      case 'q': // Toggle mode
        if (elements.modeToggleBtn) elements.modeToggleBtn.click();
        break;
      case 'f': // Fullscreen
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
        break;
    }
  }
}

export function handleKeyUp(e) {
  // Space released
  if (e.code === 'Space') {
    state.spacebarDown = false;
    // Restore cursor based on current tool
    if (state.altKeyDown) {
      setPipetteCursor();
    } else {
      resetCursor();
    }
    return;
  }

  // Alt released
  if (e.key === 'Alt') {
    state.altKeyDown = false;
    // Restore cursor based on current tool
    resetCursor();
    updateStatusBar(`Tool: ${state.selectionTool}`);
    return;
  }
}

function selectTool(tool) {
  const toolBtn = document.querySelector(`.tool-btn[data-tool="${tool}"]`);
  if (toolBtn && toolBtn.style.display !== 'none') {
    state.selectionTool = tool;
    updateActiveTool(toolBtn);
    
    // Set cursor based on tool
    if (tool === 'pencil') {
      setPencilCursor();
    } else if (tool === 'eraser') {
      setEraserCursor();
    } else if (tool === 'pipette') {
      setPipetteCursor();
    } else if (tool === 'grid-draw') {
      elements.canvas.style.cursor = 'crosshair';
    }
    
    updateStatusBar(`Tool: ${tool}`);
  }
}
