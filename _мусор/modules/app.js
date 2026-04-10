/**
 * Main Application Module - Initializes and manages the Vibe Drawing application
 */

import * as Canvas from './canvas.js';
import * as Layers from './layers.js';
import * as State from './state.js';
import * as UI from './ui.js';

// Main application state
const appState = {
  currentTool: 'select',
  isDrawing: false,
  drawingPaths: [],
  currentPath: [],
  images: [],
  selectedImage: null,
  undoStack: [],
  redoStack: []
};

// Initialize the application
function init() {
  const canvasElement = document.getElementById('drawingCanvas');
  if (canvasElement) {
    Canvas.initCanvas(canvasElement);
    setupEventListeners();
    UI.setupUI();
    State.loadState();
    UI.updateStatusBar('Ready');
  } else {
    console.error('Canvas element not found!');
  }
}

// Setup all event listeners
function setupEventListeners() {
  const elements = UI.getElements();

  // Canvas events
  elements.canvas.addEventListener('mousedown', handleCanvasMouseDown);
  elements.canvas.addEventListener('mousemove', handleCanvasMouseMove);
  elements.canvas.addEventListener('mouseup', handleCanvasMouseUp);
  elements.canvas.addEventListener('mouseleave', handleCanvasMouseUp);
  elements.canvas.addEventListener('wheel', handleCanvasWheel, { passive: false });

  // File input
  elements.fileInput.addEventListener('change', handleFileUpload);

  // Upload button
  if (elements.uploadBtn) {
    elements.uploadBtn.addEventListener('click', () => elements.fileInput.click());
  }

  // Drop zone
  elements.dropZone.addEventListener('dragover', handleDragOver);
  elements.dropZone.addEventListener('drop', handleDrop);
  elements.dropZone.addEventListener('dragleave', handleDragLeave);

  // Toolbar buttons
  elements.zoomInBtn.addEventListener('click', () => {
    const newZoom = Canvas.zoom(1.2);
    UI.updateStatusBar(`Zoom: ${Math.round(newZoom)}%`);
  });

  elements.zoomOutBtn.addEventListener('click', () => {
    const newZoom = Canvas.zoom(0.8);
    UI.updateStatusBar(`Zoom: ${Math.round(newZoom)}%`);
  });

  elements.zoomResetBtn.addEventListener('click', () => {
    Canvas.resetZoom();
    UI.updateStatusBar('Zoom: 100%');
  });

  elements.addLayerBtn.addEventListener('click', () => {
    Layers.addLayer();
    State.saveStateToUndoStack(appState);
    Canvas.redrawCanvas();
  });

  elements.saveBtn.addEventListener('click', () => {
    State.saveState(appState);
    UI.updateStatusBar('State saved');
  });

  elements.loadBtn.addEventListener('click', () => {
    State.loadState(appState);
    Canvas.redrawCanvas();
    UI.updateStatusBar('State loaded');
  });

  // Grid toggle button
  const gridBtn = document.getElementById('gridBtn');
  if (gridBtn) {
    gridBtn.addEventListener('click', () => {
      Canvas.toggleGrid();
      UI.updateStatusBar(`Grid ${Canvas.canvasState.showGrid ? 'enabled' : 'disabled'}`);
    });
  }

  // Developer tools button
  const devToolsBtn = document.getElementById('devToolsBtn');
  if (devToolsBtn) {
    devToolsBtn.addEventListener('click', UI.showDevTools);
  }

  // Tool buttons
  elements.toolButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      appState.currentTool = btn.dataset.tool;
      UI.updateActiveTool(btn);
      UI.updateStatusBar(`Tool: ${btn.dataset.tool}`);
      console.log(`Tool switched to: ${btn.dataset.tool}`);
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyDown);

  // Mouse position tracking
  elements.canvas.addEventListener('mousemove', (e) => {
    const pos = getMousePosition(e);
    elements.posStatus.textContent = `X: ${Math.round(pos.x)} Y: ${Math.round(pos.y)}`;
  });
}

// Handle canvas mouse down
function handleCanvasMouseDown(e) {
  const pos = getMousePosition(e);
  console.log(`Mouse down at ${pos.x}, ${pos.y} with tool: ${appState.currentTool}`);

  // Handle drawing tools
  if (appState.currentTool === 'pencil' || appState.currentTool === 'eraser') {
    console.log(`Starting drawing with ${appState.currentTool}`);
    appState.isDrawing = true;
    appState.currentPath = [{
      x: pos.x,
      y: pos.y,
      size: appState.currentTool === 'pencil' ? 3 : 20,
      color: appState.currentTool === 'pencil' ? '#5a9fd4' : '#2d2d2d'
    }];
    Canvas.redrawCanvas();
    return;
  }

  // Handle move tool or selection
  if (appState.currentTool === 'move' || appState.currentTool === 'select') {
    const clickedImage = getImageAtPosition(pos.x, pos.y);
    if (clickedImage) {
      appState.selectedImage = clickedImage;
      appState.dragStart = {
        x: pos.x - clickedImage.x,
        y: pos.y - clickedImage.y
      };
      console.log(`Started moving image at ${clickedImage.x}, ${clickedImage.y}`);
    } else {
      // Start selection rectangle
      startSelection(pos);
    }
    return;
  }
}

// Handle canvas mouse move
function handleCanvasMouseMove(e) {
  const pos = getMousePosition(e);

  // Handle drawing
  if (appState.isDrawing) {
    appState.currentPath.push({
      x: pos.x,
      y: pos.y,
      size: appState.currentTool === 'pencil' ? 3 : 20,
      color: appState.currentTool === 'pencil' ? '#5a9fd4' : '#2d2d2d'
    });
    Canvas.redrawCanvas();
    return;
  }

  // Handle image dragging
  if (appState.selectedImage && appState.dragStart) {
    appState.selectedImage.x = pos.x - appState.dragStart.x;
    appState.selectedImage.y = pos.y - appState.dragStart.y;
    Canvas.redrawCanvas();
    return;
  }

  // Handle selection
  if (appState.isSelecting) {
    updateSelection(pos);
    return;
  }

  // Handle panning with middle mouse button
  if (e.buttons === 4) { // Middle mouse button
    const dx = e.movementX;
    const dy = e.movementY;
    Canvas.canvasState.panOffset.x += dx;
    Canvas.canvasState.panOffset.y += dy;
    Canvas.redrawCanvas();
  }
}

// Handle canvas mouse up
function handleCanvasMouseUp(e) {
  if (appState.dragStart) {
    State.saveStateToUndoStack(appState);
    appState.dragStart = null;
  }

  // Handle drawing completion
  if (appState.isDrawing) {
    appState.isDrawing = false;
    if (appState.currentPath.length > 1) {
      appState.drawingPaths.push(appState.currentPath);
      State.saveStateToUndoStack(appState);
    }
    appState.currentPath = [];
  }

  appState.isSelecting = false;
}

// Handle canvas wheel (zoom)
function handleCanvasWheel(e) {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newZoom = Canvas.zoom(delta);
  UI.updateStatusBar(`Zoom: ${Math.round(newZoom)}%`);
}

// Handle file upload
function handleFileUpload(e) {
  const files = e.target.files;
  if (files.length > 0) {
    uploadImages(files);
  }
}

// Handle drag over
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  UI.getElements().dropZone.classList.add('drag-over');
}

// Handle drop
function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  UI.getElements().dropZone.classList.remove('drag-over');

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    uploadImages(files);
  }
}

// Handle drag leave
function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  UI.getElements().dropZone.classList.remove('drag-over');
}

// Upload images
function uploadImages(files) {
  Array.from(files).forEach(file => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const imageData = {
            id: Date.now(),
            src: e.target.result,
            x: 100,
            y: 100,
            width: img.width,
            height: img.height,
            rotation: 0,
            layer: Layers.getActiveLayer()
          };
          appState.images.push(imageData);
          State.saveStateToUndoStack(appState);
          Canvas.redrawCanvas();
          UI.updateStatusBar(`Uploaded: ${file.name}`);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });
}

// Start selection
function startSelection(pos) {
  appState.isSelecting = true;
  appState.selectionStart = pos;
  appState.selectionEnd = pos;
}

// Update selection
function updateSelection(pos) {
  appState.selectionEnd = pos;
  Canvas.redrawCanvas();
}

// Get mouse position relative to canvas
function getMousePosition(e) {
  const rect = Canvas.canvasState.canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left - Canvas.canvasState.panOffset.x) / Canvas.canvasState.zoomLevel,
    y: (e.clientY - rect.top - Canvas.canvasState.panOffset.y) / Canvas.canvasState.zoomLevel
  };
}

// Get image at position
function getImageAtPosition(x, y) {
  for (let i = appState.images.length - 1; i >= 0; i--) {
    const img = appState.images[i];
    if (img.layer !== Layers.getActiveLayer()) continue;

    // Check if point is within image bounds
    if (x >= img.x && x <= img.x + img.width &&
        y >= img.y && y <= img.y + img.height) {
      return img;
    }
  }
  return null;
}

// Handle keyboard shortcuts
function handleKeyDown(e) {
  // Temporary move tool activation with Ctrl
  if (e.ctrlKey || e.metaKey) {
    const originalTool = appState.currentTool;
    appState.currentTool = 'move';
    UI.updateStatusBar(`Temporary Move Mode (Ctrl)`);

    // Restore original tool when Ctrl is released
    window.addEventListener('keyup', function restoreTool() {
      appState.currentTool = originalTool;
      UI.updateStatusBar(`Tool: ${appState.currentTool}`);
      window.removeEventListener('keyup', restoreTool);
    }, { once: true });
  }

  // Delete selected image
  if (e.key === 'Delete' && appState.selectedImage) {
    appState.images = appState.images.filter(img => img !== appState.selectedImage);
    appState.selectedImage = null;
    State.saveStateToUndoStack(appState);
    Canvas.redrawCanvas();
    UI.updateStatusBar('Image deleted');
  }

  // Undo
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    State.undo(appState);
  }

  // Redo
  if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
    State.redo(appState);
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Export public API
export {
  init,
  appState,
  setupEventListeners,
  handleCanvasMouseDown,
  handleCanvasMouseMove,
  handleCanvasMouseUp,
  handleCanvasWheel,
  handleFileUpload,
  handleDragOver,
  handleDrop,
  handleDragLeave,
  uploadImages,
  startSelection,
  updateSelection,
  getMousePosition,
  getImageAtPosition,
  handleKeyDown
};