 import { state, elements } from './state.js';
import { setupCanvas, redrawCanvas, zoom } from './canvas.js';
import { updateLayerList, updateActiveTool, updateStatusBar, toggleGrid, showDevTools } from './ui.js';
import { floodFill } from './fill.js';
import { initCursors, setupCursorKeyboardShortcuts } from './cursors.js';
import { getPathBoundingBox, doRectanglesIntersect } from './geometry.js';

// --- Functions that were in script.js ---

// Initialize the application
function init() {
  setupCanvas();
  setupEventListeners();
  initCursors();
  setupCursorKeyboardShortcuts();
  setupUI();
  loadState();
  updateStatusBar('Ready');
}

// Setup UI
function setupUI() {
  updateLayerList();
  updateActiveTool(document.querySelector('.tool-btn.active'));
  
  // Disable context menu on color pickers
  elements.brushColorPicker.oncontextmenu = () => false;
  elements.gridColorPicker.oncontextmenu = () => false;
  elements.backgroundColorPicker.oncontextmenu = () => false;
}


// EVENT HANDLERS
function setupEventListeners() {
  // Global variable for last selected swatch color - declare FIRST
  let lastSwatchColor = '#ffffff';

  // Canvas events
  elements.canvas.addEventListener('mousedown', handleCanvasMouseDown);
  elements.canvas.addEventListener('mousemove', handleCanvasMouseMove);
  elements.canvas.addEventListener('mouseup', handleCanvasMouseUp);
  elements.canvas.addEventListener('mouseleave', handleCanvasMouseUp);
  elements.canvas.addEventListener('wheel', handleCanvasWheel, { passive: false });
  elements.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // File input
  elements.fileInput.addEventListener('change', handleFileUpload);
  elements.uploadBtn.addEventListener('click', () => elements.fileInput.click());

  // Toolbar buttons
  elements.zoomInBtn.addEventListener('click', () => zoom(1.2));
  elements.zoomOutBtn.addEventListener('click', () => zoom(0.8));
  elements.zoomResetBtn.addEventListener('click', () => zoom(1));
  elements.addLayerBtn.addEventListener('click', addLayer);
  elements.saveBtn.addEventListener('click', saveState);
  elements.loadBtn.addEventListener('click', loadState);

  // Grid
  const gridBtn = document.getElementById('gridBtn');
  if (gridBtn) {
    gridBtn.addEventListener('click', () => {
        toggleGrid();
        redrawCanvas();
    });
  }
  elements.gridColorPicker.addEventListener('input', (e) => {
    state.gridColor = e.target.value;
    redrawCanvas();
  });
  // Add change event for first click color selection
  elements.gridColorPicker.addEventListener('change', (e) => {
    state.gridColor = e.target.value;
    redrawCanvas();
  });
  elements.gridSizeInput.addEventListener('input', (e) => {
    state.gridSize = parseInt(e.target.value, 10);
    redrawCanvas();
  });
  elements.backgroundColorPicker.addEventListener('input', (e) => {
    state.backgroundColor = e.target.value;
    redrawCanvas();
  });
  // Add change event for first click color selection
  elements.backgroundColorPicker.addEventListener('change', (e) => {
    state.backgroundColor = e.target.value;
    redrawCanvas();
  });

  // Brush/Eraser size sliders
  elements.brushSizeSlider.addEventListener('input', (e) => {
    state.drawingSize = parseInt(e.target.value, 10);
    elements.brushSizeValue.textContent = e.target.value;
  });
  elements.eraserSizeSlider.addEventListener('input', (e) => {
    state.eraserSize = parseInt(e.target.value, 10);
    elements.eraserSizeValue.textContent = e.target.value;
  });

  elements.brushColorPicker.addEventListener('input', (e) => {
    state.drawingColor = e.target.value;
  });
  // Add change event for first click color selection
  elements.brushColorPicker.addEventListener('change', (e) => {
    state.drawingColor = e.target.value;
    // Remove active class from color swatches when using native picker
    elements.colorPalette.querySelectorAll('.color-swatch').forEach(btn => btn.classList.remove('active'));
  });

  // Color Palette
  elements.colorPalette.addEventListener('click', (e) => {
    if (e.target.classList.contains('color-swatch')) {
      const color = e.target.dataset.color;
      state.drawingColor = color;
      lastSwatchColor = color; // Store for right-click assignment
      
      // Update UI
      elements.colorPalette.querySelectorAll('.color-swatch').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      
      // Sync with input for other code that might use it (optional, but good for compatibility)
      // elements.brushColorPicker.value = color;
      updateStatusBar(`Color: ${color}`);
    }
  });

  // Right-click on color swatch opens browser color picker
  let currentSwatchElement = null;
  elements.colorPalette.addEventListener('contextmenu', (e) => {
    if (e.target.classList.contains('color-swatch')) {
      e.preventDefault();
      currentSwatchElement = e.target;
      const color = e.target.dataset.color;
      elements.swatchColorPicker.value = color;
      elements.swatchColorPicker.click(); // Opens native color picker
    }
  });

  // Handle color selection from hidden picker
  elements.swatchColorPicker.addEventListener('input', (e) => {
    const color = e.target.value;
    state.drawingColor = color;
    lastSwatchColor = color;
    elements.brushColorPicker.value = color;
    
    // Update the swatch that triggered the picker
    if (currentSwatchElement) {
      currentSwatchElement.dataset.color = color;
      currentSwatchElement.style.backgroundColor = color;
      currentSwatchElement.classList.add('active');
      elements.colorPalette.querySelectorAll('.color-swatch').forEach(btn => {
        if (btn !== currentSwatchElement) btn.classList.remove('active');
      });
    }
    
    updateStatusBar(`Color: ${color}`);
  });

  // Main menu toggle
  elements.togglePanelsBtn.addEventListener('click', (e) => {
    elements.mainMenu.classList.toggle('hidden');
    e.stopPropagation();
  });

  // Hide menu if clicking outside
  document.addEventListener('click', (e) => {
      if (!elements.mainMenu.contains(e.target) && !elements.togglePanelsBtn.contains(e.target)) {
          elements.mainMenu.classList.add('hidden');
      }
  });

  // Individual panel toggles via menu checkboxes
  elements.toggleTopToolbarCb.addEventListener('change', (e) => {
    elements.app.classList.toggle('top-toolbar-hidden', !e.target.checked);
  });
  elements.toggleLeftToolbarCb.addEventListener('change', (e) => {
    elements.app.classList.toggle('left-toolbar-hidden', !e.target.checked);
  });
  elements.toggleRightToolbarCb.addEventListener('change', (e) => {
    elements.app.classList.toggle('right-toolbar-hidden', !e.target.checked);
  });
  elements.toggleLayersCb.addEventListener('change', (e) => {
    elements.layersPanel.classList.toggle('hidden', !e.target.checked);
  });


  // Layers panel toggle button (syncs with checkbox)
  elements.toggleLayersBtn.addEventListener('click', () => {
      const isHidden = elements.layersPanel.classList.toggle('hidden');
      elements.toggleLayersCb.checked = !isHidden;
  });

  // Symmetry panel logic
  elements.symmetryBtn.addEventListener('click', (e) => {
    elements.symmetryPanel.classList.toggle('hidden');
    e.stopPropagation();
  });

  // Hide symmetry panel on outside click
  document.addEventListener('click', (e) => {
    if (!elements.symmetryPanel.contains(e.target) && !elements.symmetryBtn.contains(e.target)) {
        elements.symmetryPanel.classList.add('hidden');
    }
  });
  elements.symmetryPanel.addEventListener('click', (e) => e.stopPropagation());

  // Listen to mode changes
  elements.symmetryModeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        state.symmetry.setMode(mode);

        // Update active class on all mode buttons
        elements.symmetryModeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Show/hide radial count input
        elements.radialRayCountContainer.classList.toggle('hidden', mode !== 'radial');

        // Update main symmetry button active state
        elements.symmetryBtn.classList.toggle('active', state.symmetry.isActive());
        
        // Hide panel after selection
        elements.symmetryPanel.classList.add('hidden');
    });
  });

  // Listen to ray count changes
  elements.radialRayCountInput.addEventListener('input', (e) => {
      const count = parseInt(e.target.value, 10);
      state.symmetry.setRays(count);
  });

  // Dev tools
  const devToolsBtn = document.getElementById('devToolsBtn');
  if (devToolsBtn) {
    devToolsBtn.addEventListener('click', showDevTools);
  }

  // Tool buttons
  elements.toolButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.dataset.tool;
      if (!tool) return;

      // Toggle grid-draw tool
      if (tool === 'grid-draw' && state.selectionTool === 'grid-draw') {
        state.selectionTool = 'pencil'; // Switch back to a default tool
        const pencilBtn = document.querySelector('.tool-btn[data-tool="pencil"]');
        if(pencilBtn) updateActiveTool(pencilBtn);
      } else {
        state.selectionTool = tool;
        updateActiveTool(btn);
      }
      updateStatusBar(`Tool: ${state.selectionTool}`);
    });
  });

  // Keyboard
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);

  // Mouse position
  elements.canvas.addEventListener('mousemove', (e) => {
    const pos = getMousePosition(e);
    elements.posStatus.textContent = `X: ${Math.round(pos.x)} Y: ${Math.round(pos.y)}`;
  });
}

function handleCanvasMouseDown(e) {
  const pos = getMousePosition(e);

  // Handle Moving Selection
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
        return;
    }
  }

  // Clear selection if clicking outside
  if (state.selectedObjects.length > 0) {
      state.selectedObjects = [];
      redrawCanvas();
  }

  // Handle Panning (Spacebar or Middle Mouse)
  if (state.spacebarDown || e.button === 1) {
    state.isPanning = true;
    state.panStart = { x: e.clientX, y: e.clientY };
    elements.canvas.style.cursor = 'grabbing';
    return;
  }
  
  // Grid Draw Tool Handling (Left-click to draw, Right-click to erase)
  if (state.selectionTool === 'grid-draw') {
    state.isDrawing = true; // Start drawing state for grid
    const gridSize = state.gridSize;
    const cellX = Math.floor(pos.x / gridSize) * gridSize;
    const cellY = Math.floor(pos.y / gridSize) * gridSize;

    // Store the last grid cell for continuous drawing/erasing
    state.lastGridCell = { x: cellX, y: cellY };

    if (e.button === 0) { // Left-click to fill grid cell
      const existingCellIndex = state.gridCells.findIndex(cell => cell.x === cellX && cell.y === cellY);
      if (existingCellIndex !== -1) {
          state.gridCells[existingCellIndex].color = state.drawingColor;
      } else {
          state.gridCells.push({ x: cellX, y: cellY, color: state.drawingColor });
      }
    } else if (e.button === 2) { // Right-click to erase grid cell
      state.isRightClickErasing = true; // Flag for continuous erasing
      state.gridCells = state.gridCells.filter(cell => !(cell.x === cellX && cell.y === cellY));
    }
    
    redrawCanvas();
    saveStateToUndoStack();
    return;
  }

  // Right-click is ALWAYS eraser for other tools, doesn't change selected tool (only if not grid-draw)
  if (e.button === 2) {
    state.isDrawing = true;
    state.isRightClickErasing = true;
    state.currentPath = [{
        x: pos.x, y: pos.y,
        size: state.eraserSize,
        color: state.backgroundColor
    }];
    redrawCanvas();
    return;
  }
  
  if (e.button !== 0) return; // All other actions are for left-click only

  if (state.selectionTool === 'color-picker') {
    const pixelData = elements.canvas.getContext('2d').getImageData(e.clientX, e.clientY, 1, 1).data;
    const hexColor = "#" + ("000000" + ((pixelData[0] << 16) | (pixelData[1] << 8) | pixelData[2]).toString(16)).slice(-6);
    
    state.drawingColor = hexColor;
    elements.brushColorPicker.value = hexColor;

    // Switch back to pencil tool
    state.selectionTool = 'pencil';
    const pencilBtn = document.querySelector('.tool-btn[data-tool="pencil"]');
    if(pencilBtn) updateActiveTool(pencilBtn);
    updateStatusBar(`Tool: ${state.selectionTool}`);
    return;
  }

  if (state.selectionTool === 'fill') {
    floodFill(pos.x, pos.y, state.drawingColor);
    return;
  }

  if (state.selectionTool === 'pencil' || state.selectionTool === 'eraser') {
    state.isDrawing = true;
    state.currentPath = [{
      x: pos.x,
      y: pos.y,
      size: state.selectionTool === 'pencil' ? state.drawingSize : state.eraserSize,
      color: state.selectionTool === 'pencil' ? state.drawingColor : state.backgroundColor
    }];
    redrawCanvas();
    return;
  }

  // Fallback to selection
  const clickedImage = getImageAtPosition(pos.x, pos.y);
  if (clickedImage) {
    state.selectedImage = clickedImage;
    if (isOnResizeHandle(pos, clickedImage)) {
      state.isResizing = true;
      state.resizeStart = { x: pos.x, y: pos.y, width: clickedImage.width, height: clickedImage.height };
    } else if (isOnRotationHandle(pos, clickedImage)) {
      state.isRotating = true;
      state.rotateStart = { angle: clickedImage.rotation, x: pos.x, y: pos.y };
    } else {
      state.isDragging = true;
      state.dragStart = { x: pos.x - clickedImage.x, y: pos.y - clickedImage.y };
    }
  } else {
    // Start a new selection
    state.isSelecting = true;
    if (state.selectionTool === 'lasso') {
        state.selectionPath = [pos];
    } else {
        state.selectionStart = pos;
        state.selectionEnd = pos;
    }
  }
}

function handleCanvasMouseMove(e) {
  const pos = getMousePosition(e);

  if (state.isDrawing) {
    // Grid Draw continuous
    if (state.selectionTool === 'grid-draw') {
        const gridSize = state.gridSize;
        const cellX = Math.floor(pos.x / gridSize) * gridSize;
        const cellY = Math.floor(pos.y / gridSize) * gridSize;

        if (cellX !== state.lastGridCell.x || cellY !== state.lastGridCell.y) {
            if (e.buttons === 1) { // Left mouse button (fill)
                const existingCellIndex = state.gridCells.findIndex(cell => cell.x === cellX && cell.y === cellY);
                if (existingCellIndex !== -1) {
                    state.gridCells[existingCellIndex].color = state.drawingColor;
                } else {
                    state.gridCells.push({ x: cellX, y: cellY, color: state.drawingColor });
                }
            } else if (e.buttons === 2) { // Right mouse button (erase)
                state.gridCells = state.gridCells.filter(cell => !(cell.x === cellX && cell.y === cellY));
            }
            state.lastGridCell = { x: cellX, y: cellY };
            redrawCanvas();
        }
        return;
    }

    // Pencil/Eraser continuous drawing
    const isErasing = state.selectionTool === 'eraser' || state.isRightClickErasing;
    state.currentPath.push({
      x: pos.x,
      y: pos.y,
      size: isErasing ? state.eraserSize : state.drawingSize,
      color: isErasing ? state.backgroundColor : state.drawingColor
    });
    redrawCanvas();
    return;
  }

  if (state.isMovingSelection) {
    const dx = pos.x - state.dragStart.x;
    const dy = pos.y - state.dragStart.y;

    state.selectedObjects.forEach(selected => {
        if (selected.type === 'image' || selected.type === 'grid-cell') {
            selected.obj.x += dx;
            selected.obj.y += dy;
        } else if (selected.type === 'path') {
            selected.obj.forEach(point => {
                point.x += dx;
                point.y += dy;
            });
        }
    });

    state.dragStart = pos; // Update drag start for next move event
    redrawCanvas();
    return;
  }

  if (state.isDragging && state.selectedImage) {
    state.selectedImage.x = pos.x - state.dragStart.x;
    state.selectedImage.y = pos.y - state.dragStart.y;
    redrawCanvas();
  } else if (state.isResizing && state.selectedImage) {
    const dx = pos.x - state.resizeStart.x;
    const dy = pos.y - state.resizeStart.y;
    if (e.shiftKey) {
      const aspectRatio = state.resizeStart.height / state.resizeStart.width;
      state.selectedImage.width = Math.max(20, state.resizeStart.width + dx);
      state.selectedImage.height = state.selectedImage.width * aspectRatio;
    } else {
      state.selectedImage.width = Math.max(20, state.resizeStart.width + dx);
      state.selectedImage.height = Math.max(20, state.resizeStart.height + dy);
    }
    redrawCanvas();
  } else if (state.isRotating && state.selectedImage) {
    const centerX = state.selectedImage.x + state.selectedImage.width / 2;
    const centerY = state.selectedImage.y + state.selectedImage.height / 2;
    const angle = Math.atan2(pos.y - centerY, pos.x - centerX);
    state.selectedImage.rotation = angle;
    redrawCanvas();
  } else if (state.isPanning) {
    const dx = e.clientX - state.panStart.x;
    const dy = e.clientY - state.panStart.y;
    state.panOffset.x += dx;
    state.panOffset.y += dy;
    state.panStart = { x: e.clientX, y: e.clientY };
    redrawCanvas();
  } else if (state.isSelecting) {
    if (state.selectionTool === 'lasso') {
        state.selectionPath.push(pos);
    } else {
        state.selectionStart = pos;
    }
    redrawCanvas();
  }
}

function handleCanvasMouseUp(e) {
  // Reset right-click erasing flag
  if (e.button === 2 && state.isRightClickErasing) {
    state.isRightClickErasing = false;
  }

  if (state.isMovingSelection) {
    state.isMovingSelection = false;
    saveStateToUndoStack();
  }

  if (state.isDragging || state.isResizing || state.isRotating) {
    saveStateToUndoStack();
  }
  if (state.isPanning) {
    if (state.spacebarDown) {
      elements.canvas.style.cursor = 'grab';
    } else {
      elements.canvas.style.cursor = 'default';
    }
  }
  if (state.isDrawing) {
    state.isDrawing = false;
    if (state.currentPath.length > 1) {
      state.drawingPaths.push(state.currentPath);
      saveStateToUndoStack();
    } else if (state.selectionTool === 'grid-draw' && state.lastGridCell.x !== null) {
      // For grid draw, a single click also counts as an action for undo/redo
      saveStateToUndoStack();
    }
    state.currentPath = [];
    state.lastGridCell = { x: null, y: null }; // Reset last grid cell
  }
  if (state.isSelecting) {
    if (state.selectionTool === 'rect-select') {
        const selectionRect = {
            minX: Math.min(state.selectionStart.x, state.selectionEnd.x),
            minY: Math.min(state.selectionStart.y, state.selectionEnd.y),
            maxX: Math.max(state.selectionStart.x, state.selectionEnd.x),
            maxY: Math.max(state.selectionStart.y, state.selectionEnd.y),
        };

        state.selectedObjects = [];
        // Select images
        state.images.forEach(img => {
            const imgRect = { minX: img.x, minY: img.y, maxX: img.x + img.width, maxY: img.y + img.height };
            if (doRectanglesIntersect(selectionRect, imgRect)) {
                state.selectedObjects.push({ type: 'image', obj: img });
            }
        });
        // Select paths
        state.drawingPaths.forEach(path => {
            const pathRect = getPathBoundingBox(path);
            if (doRectanglesIntersect(selectionRect, pathRect)) {
                state.selectedObjects.push({ type: 'path', obj: path });
            }
        });
        // Select grid cells
        state.gridCells.forEach(cell => {
            const cellRect = { minX: cell.x, minY: cell.y, maxX: cell.x + state.gridSize, maxY: cell.y + state.gridSize };
            if (doRectanglesIntersect(selectionRect, cellRect)) {
                state.selectedObjects.push({ type: 'grid-cell', obj: cell });
            }
        });
    }
    
    state.selectionPath = [];
    state.isSelecting = false;
    redrawCanvas();
  }
  state.isDragging = false;
  state.isResizing = false;
  state.isRotating = false;
  state.isPanning = false;
}

function handleCanvasWheel(e) {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  zoom(delta, e.clientX, e.clientY);
}

function handleFileUpload(e) {
  const files = e.target.files;
  if (files.length > 0) {
    uploadImages(files);
  }
}

function pickColorFromCanvas(e) {
  try {
    const rect = elements.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const pixelData = elements.canvas.getContext('2d').getImageData(x, y, 1, 1).data;
    const hexColor = "#" + ("000000" + ((pixelData[0] << 16) | (pixelData[1] << 8) | pixelData[2]).toString(16)).slice(-6);
    return hexColor;
  } catch (err) {
    updateStatusBar('Cannot pick color from this area');
    return null;
  }
}

function handleKeyDown(e) {
  if (e.key === ' ') {
    e.preventDefault();
    if (!state.spacebarDown) {
      state.spacebarDown = true;
      elements.canvas.style.cursor = 'grab';
    }
  }
  if (e.key === 'Delete' && state.selectedImage) {
    state.images = state.images.filter(img => img !== state.selectedImage);
    state.selectedImage = null;
    saveStateToUndoStack();
    redrawCanvas();
    updateStatusBar('Image deleted');
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    undo();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
    redo();
  }
  if (e.code === 'KeyZ') {
    undo();
  }
  if (e.code === 'KeyX') {
    redo();
  }
}

function handleKeyUp(e) {
  if (e.key === ' ') {
    e.preventDefault();
    state.spacebarDown = false;
    state.isPanning = false;
    elements.canvas.style.cursor = 'default';
  }
}

// IMAGE FUNCTIONS
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
            x: 100, y: 100,
            width: img.width, height: img.height,
            rotation: 0,
            layer: state.activeLayer
          };
          state.images.push(imageData);
          saveStateToUndoStack();
          redrawCanvas();
          updateStatusBar(`Uploaded: ${file.name}`);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });
}

export function getImageFromData(src) {
    const img = new Image();
    img.src = src;
    return img;
}

function getImageAtPosition(x, y) {
  for (let i = state.images.length - 1; i >= 0; i--) {
    const img = state.images[i];
    if (img.layer !== state.activeLayer) continue;
    if (x >= img.x && x <= img.x + img.width && y >= img.y && y <= img.y + img.height) {
      return img;
    }
  }
  return null;
}

function isOnResizeHandle(pos, img) {
  const handleSize = 10;
  const right = img.x + img.width;
  const bottom = img.y + img.height;
  return (pos.x >= right - handleSize && pos.x <= right + handleSize &&
          pos.y >= bottom - handleSize && pos.y <= bottom + handleSize);
}

function isOnRotationHandle(pos, img) {
  const handleSize = 15;
  const centerX = img.x + img.width / 2;
  const centerY = img.y - 20;
  return (pos.x >= centerX - handleSize && pos.x <= centerX + handleSize &&
          pos.y >= centerY - handleSize && pos.y <= centerY + centerY + handleSize);
}

// SELECTION
function startSelection(pos) {
  state.isSelecting = true;
  state.selectionStart = pos;
  state.selectionEnd = pos;
}

function updateSelection(pos) {
  state.selectionEnd = pos;
  redrawCanvas();
}

// MOUSE POSITION
function getMousePosition(e) {
  const rect = elements.canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left - state.panOffset.x) / state.zoomLevel,
    y: (e.clientY - rect.top - state.panOffset.y) / state.zoomLevel
  };
}

// LAYERS
function addLayer() {
  const layerName = `Layer ${state.layers.length + 1}`;
  state.layers.push({ name: layerName, visible: true });
  state.activeLayer = state.layers.length - 1;
  updateLayerList();
  saveStateToUndoStack();
}

// HISTORY
function saveStateToUndoStack() {
  const stateCopy = JSON.parse(JSON.stringify({ images: state.images, activeLayer: state.activeLayer, drawingPaths: state.drawingPaths, gridCells: state.gridCells }));
  state.undoStack.push(stateCopy);
  state.redoStack = [];
  if (state.undoStack.length > 50) {
    state.undoStack.shift();
  }
}

function undo() {
  if (state.undoStack.length > 0) {
    const currentState = { images: state.images, activeLayer: state.activeLayer, drawingPaths: state.drawingPaths, gridCells: state.gridCells };
    state.redoStack.push(currentState);
    const previousState = state.undoStack.pop();
    state.images = previousState.images;
    state.activeLayer = previousState.activeLayer;
    state.drawingPaths = previousState.drawingPaths || [];
    state.gridCells = previousState.gridCells || [];
    redrawCanvas();
    updateStatusBar('Undo');
  }
}

function redo() {
  if (state.redoStack.length > 0) {
    const currentState = { images: state.images, activeLayer: state.activeLayer, drawingPaths: state.drawingPaths, gridCells: state.gridCells };
    state.undoStack.push(currentState);
    const nextState = state.redoStack.pop();
    state.images = nextState.images;
    state.activeLayer = nextState.activeLayer;
    state.drawingPaths = nextState.drawingPaths || [];
    state.gridCells = nextState.gridCells || [];
    redrawCanvas();
    updateStatusBar('Redo');
  }
}

// --- Persistence ---
function saveState() {
  const stateToSave = {
    images: state.images,
    layers: state.layers,
    activeLayer: state.activeLayer,
    drawingPaths: state.drawingPaths,
    gridCells: state.gridCells
  };
  localStorage.setItem('vibeDrawingState', JSON.stringify(stateToSave));
  updateStatusBar('State saved');
}

function loadState() {
  const savedState = localStorage.getItem('vibeDrawingState');
  if (savedState) {
    const parsedState = JSON.parse(savedState);
    state.images = parsedState.images || [];
    state.layers = parsedState.layers || [{ name: 'Layer 1', visible: true }];
    state.activeLayer = parsedState.activeLayer || 0;
    state.drawingPaths = parsedState.drawingPaths || [];
    state.gridCells = parsedState.gridCells || [];
    updateLayerList();
    redrawCanvas();
    updateStatusBar('State loaded');
  }
}

function exportAsImage() {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    state.images.forEach(img => {
        if (img.layer !== state.activeLayer) return;
        minX = Math.min(minX, img.x);
        minY = Math.min(minY, img.y);
        maxX = Math.max(maxX, img.x + img.width);
        maxY = Math.max(maxY, img.y + img.height);
    });

    if (minX === Infinity) {
        updateStatusBar('No content to export');
        return;
    }

    tempCanvas.width = maxX - minX;
    tempCanvas.height = maxY - minY;

    state.images.forEach(img => {
        if (img.layer !== state.activeLayer) return;
        tempCtx.save();
        tempCtx.translate(img.x - minX + img.width / 2, img.y - minY + img.height / 2);
        tempCtx.rotate(img.rotation);
        tempCtx.drawImage(
            getImageFromData(img.src),
            -img.width / 2,
            -img.height / 2,
            img.width,
            img.height
        );
        tempCtx.restore();
    });

    const link = document.createElement('a');
    link.download = 'vibe-drawing-export.png';
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
    updateStatusBar('Exported as image');
}


// --- App Initialization ---
document.addEventListener('DOMContentLoaded', init);