import { state, elements } from './state.js';
import { setupCanvas, redrawCanvas, zoom, clearCanvas } from './canvas.js';
import { updateActiveTool, updateStatusBar, toggleGrid, showDevTools } from './ui.js';

import { floodFill } from './fill.js';
import { initCursors, setupCursorKeyboardShortcuts, setPipetteCursor, setPencilCursor, setEraserCursor, resetCursor } from './cursors.js';
import { getPathBoundingBox, doRectanglesIntersect, getCellsBetweenPoints } from './geometry.js';
import { undo, redo, saveState, startPlayback, stopPlayback, pausePlayback, resumePlayback, setPlaybackSpeed, scrubToFrame, getPlaybackState, getHistoryLength } from './history.js';

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

// Setup event listeners
function setupEventListeners() {
  // Canvas events
  elements.canvas.addEventListener('mousedown', handleCanvasMouseDown);
  elements.canvas.addEventListener('mousemove', handleCanvasMouseMove);
  elements.canvas.addEventListener('mouseup', handleCanvasMouseUp);
  elements.canvas.addEventListener('mouseleave', (e) => {
    handleCanvasMouseUp(e);
    // Also reset cursor on mouseleave
    if (!state.spacebarDown) {
      resetCursor();
    }
  });
  elements.canvas.addEventListener('wheel', handleCanvasWheel, { passive: false });
  elements.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // File input
  elements.fileInput.addEventListener('change', handleFileUpload);
  elements.uploadBtn.addEventListener('click', () => elements.fileInput.click());

  // Toolbar buttons
  elements.zoomInBtn.addEventListener('click', () => zoom(1.2));
  elements.zoomOutBtn.addEventListener('click', () => zoom(0.8));
  elements.zoomResetBtn.addEventListener('click', () => zoom(1));
  elements.clearCanvasBtn.addEventListener('click', clearCanvas);
  elements.saveBtn.addEventListener('click', saveProjectState);
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
  
  // Make redrawCanvas available globally for history functions
  window.redrawCanvas = redrawCanvas;
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
      // Update UI
      elements.colorPalette.querySelectorAll('.color-swatch').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');

      updateStatusBar(`Color: ${color}`);
    }
  });

  // Right-click on color swatch opens browser color picker
  elements.colorPalette.addEventListener('contextmenu', (e) => {
    if (e.target.classList.contains('color-swatch')) {
      e.preventDefault();
      elements.swatchColorPicker.value = e.target.dataset.color;
      elements.swatchColorPicker.click(); // Opens native color picker
    }
  });

  // Handle color selection from hidden picker
  elements.swatchColorPicker.addEventListener('input', (e) => {
    const color = e.target.value;
    state.drawingColor = color;
    elements.brushColorPicker.value = color;

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

  // Grid transformation mode button
  elements.gridTransformBtn.addEventListener('click', () => {
    if (state.gridTransformationMode === 'permanent') {
      state.gridTransformationMode = 'visual-only';
      elements.gridTransformBtn.setAttribute('data-mode', 'visual-only');
      elements.gridTransformBtn.title = 'Grid Transformation: Visual Only (Grid type changes only affect view)';
      updateStatusBar('Grid mode: Visual only (no permanent changes)');
    } else {
      state.gridTransformationMode = 'permanent';
      elements.gridTransformBtn.setAttribute('data-mode', 'permanent');
      elements.gridTransformBtn.title = 'Grid Transformation: Permanent (Grid type changes affect saved data)';
      updateStatusBar('Grid mode: Permanent (saved with data)');
    }
    redrawCanvas();
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

      // Set cursor based on tool
      if (state.selectionTool === 'pencil') {
        setPencilCursor();
      } else if (state.selectionTool === 'eraser') {
        setEraserCursor();
      } else if (state.selectionTool === 'pipette') {
        setPipetteCursor();
      } else if (state.selectionTool === 'grid-draw') {
        elements.canvas.style.cursor = 'crosshair';
      }

      updateStatusBar(`Tool: ${state.selectionTool}`);
    });
  });

  // Keyboard
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);

  // Reset altKeyDown when window regains focus (fixes issue with native color picker)
  window.addEventListener('focus', () => {
    if (state.altKeyDown) {
      state.altKeyDown = false;
      // Restore cursor based on current tool
      if (state.selectionTool === 'pencil') {
        setPencilCursor();
      } else if (state.selectionTool === 'eraser') {
        setEraserCursor();
      } else if (state.selectionTool === 'pipette') {
        setPipetteCursor();
      } else if (state.selectionTool === 'grid-draw') {
        elements.canvas.style.cursor = 'crosshair';
      } else {
        resetCursor();
      }
      updateStatusBar(`Tool: ${state.selectionTool}`);
    }
  });

  // Mouse position
  elements.canvas.addEventListener('mousemove', (e) => {
    const pos = getMousePosition(e);
    elements.posStatus.textContent = `X: ${Math.round(pos.x)} Y: ${Math.round(pos.y)}`;
  });
}

// Setup UI
function setupUI() {
  updateActiveTool(document.querySelector('.tool-btn.active'));



  // Set initial cursor based on default tool
  if (state.selectionTool === 'pencil') {
    setPencilCursor();
  } else if (state.selectionTool === 'eraser') {
    setEraserCursor();
  } else if (state.selectionTool === 'pipette') {
    setPipetteCursor();
  } else if (state.selectionTool === 'grid-draw') {
    elements.canvas.style.cursor = 'crosshair';
  }

  // Disable context menu on color pickers
  elements.brushColorPicker.oncontextmenu = () => false;
  elements.gridColorPicker.oncontextmenu = () => false;
  elements.backgroundColorPicker.oncontextmenu = () => false;

  // Setup timeline controls
  setupTimelineControls();
}

// --- TIMELINE FUNCTIONS ---
function setupTimelineControls() {
  // Delay initialization to ensure DOM is ready
  setTimeout(() => {
    // Re-query timeline elements in case they weren't ready during initial load
    const timelineControls = document.getElementById('timelineControls');
    const timelinePlayBtn = document.getElementById('timelinePlayBtn');
    const timelineSpeedBtn = document.getElementById('timelineSpeedBtn');
    const timelineSlider = document.getElementById('timelineSlider');
    const timelineFrame = document.getElementById('timelineFrame');
    
    if (!timelineControls) return;

    // Show timeline controls always
    timelineControls.style.display = 'flex';
    updateTimelineUI();

    // Play/Pause button
    timelinePlayBtn?.addEventListener('click', togglePlayback);

    // Speed button - cycle through speeds
    timelineSpeedBtn?.addEventListener('click', cyclePlaybackSpeed);

    // Slider - seek to frame
    timelineSlider?.addEventListener('input', (e) => {
      const frame = parseInt(e.target.value, 10);
      // Adjust frame index to match our history index (starts from 0)
      state.currentHistoryIndex = frame - 1;
      // Update the state to the selected frame
      if (frame === 0) {
        // Reset to empty state
        state.images = [];
        state.drawingPaths = [];
        state.gridCells = [];
        state.selectedImage = null;
        state.selectedObjects = [];
        state.zoomLevel = 1;
        state.panOffset = { x: 0, y: 0 };
      } else if (frame <= state.undoStack.length) {
        const frameState = state.undoStack[frame - 1];
        if (frameState) {
          state.images = JSON.parse(JSON.stringify(frameState.images));
          state.drawingPaths = JSON.parse(JSON.stringify(frameState.drawingPaths));
          state.gridCells = JSON.parse(JSON.stringify(frameState.gridCells));
          state.selectedImage = frameState.selectedImage;
          state.selectedObjects = JSON.parse(JSON.stringify(frameState.selectedObjects));
          state.zoomLevel = frameState.zoomLevel;
          state.panOffset = { ...frameState.panOffset };
        }
      }
      
      if (window.redrawCanvas) {
        window.redrawCanvas();
      }
      updateTimelineUI();
    });

    // Slider - stop playback when user starts dragging
    timelineSlider?.addEventListener('mousedown', () => {
      const playbackState = getPlaybackState();
      if (playbackState.isPlaying) {
        stopPlayback();
      }
    });
  }, 0);
}

function updateTimelineUI() {
  // Re-query elements in case they changed
  const timelineSlider = document.getElementById('timelineSlider');
  const timelineFrame = document.getElementById('timelineFrame');
  const timelinePlayBtn = document.getElementById('timelinePlayBtn');

  const playbackState = getPlaybackState();
  const totalFrames = getHistoryLength();
  const currentFrame = state.currentHistoryIndex + 1; // Since index starts at -1

  // Update slider
  if (timelineSlider) {
    timelineSlider.max = Math.max(0, totalFrames);
    timelineSlider.value = currentFrame;
  }

  // Update frame counter
  if (timelineFrame) {
    timelineFrame.textContent = `${currentFrame}/${totalFrames}`;
  }

  // Update play button state
  if (timelinePlayBtn) {
    timelinePlayBtn.textContent = playbackState.isPlaying ? '⏸' : '▶';
    timelinePlayBtn.classList.toggle('playing', playbackState.isPlaying);
  }

  // Update speed button - find it separately
  const timelineSpeedBtn = document.getElementById('timelineSpeedBtn');
  if (timelineSpeedBtn) {
    timelineSpeedBtn.textContent = playbackState.speed + 'x';
  }
}

function togglePlayback() {
  const playbackState = getPlaybackState();
  if (playbackState.isPlaying) {
    stopPlayback();
  } else {
    startPlayback(updateTimelineUI);
  }
  
  // Update button state
  const timelinePlayBtn = document.getElementById('timelinePlayBtn');
  if (timelinePlayBtn) {
    timelinePlayBtn.textContent = getPlaybackState().isPlaying ? '⏸' : '▶';
    timelinePlayBtn.classList.toggle('playing', getPlaybackState().isPlaying);
  }
}

function cyclePlaybackSpeed() {
  const speeds = [0.25, 0.5, 1, 2, 4];
  const currentState = getPlaybackState();
  const currentIndex = speeds.indexOf(currentState.speed);
  const nextIndex = (currentIndex + 1) % speeds.length;
  const newSpeed = speeds[nextIndex];

  setPlaybackSpeed(newSpeed);
  updateTimelineUI();
}

function handleCanvasMouseDown(e) {
  const pos = getMousePosition(e);

  // Handle Moving Selection with Ctrl key - now with visual ghost preview
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
        // Save state BEFORE moving for proper undo
        saveState();
        return;
    }
  }

  // Clear selection if clicking outside (and not holding Ctrl)
  if (state.selectedObjects.length > 0 && !e.ctrlKey) {
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
    // Save state BEFORE making changes for proper undo
    saveState();
    const gridSize = state.gridSize;

    state.lastGridCell = { x: Math.floor(pos.x / gridSize) * gridSize, y: Math.floor(pos.y / gridSize) * gridSize };
    state.lastGridMousePos = { x: pos.x, y: pos.y };

    if (e.button === 0) { // Left-click to fill grid cell
      const cellX = state.lastGridCell.x;
      const cellY = state.lastGridCell.y;
      const existingCellIndex = state.gridCells.findIndex(cell => cell.x === cellX && cell.y === cellY);
      if (existingCellIndex !== -1) {
          state.gridCells[existingCellIndex].color = state.drawingColor;
      } else {
          state.gridCells.push({ x: cellX, y: cellY, color: state.drawingColor });
      }
    } else if (e.button === 2) { // Right-click to erase grid cell
      state.isRightClickErasing = true; // Flag for continuous erasing
      const cellX = state.lastGridCell.x;
      const cellY = state.lastGridCell.y;
      state.gridCells = state.gridCells.filter(cell => !(cell.x === cellX && cell.y === cellY));
    }

    redrawCanvas();
    return;
  }

  // Right-click is ALWAYS eraser for other tools, doesn't change selected tool (only if not grid-draw)
  if (e.button === 2) {
    state.isDrawing = true;
    state.isRightClickErasing = true;
    // Save state BEFORE making changes for proper undo
    saveState();
    state.currentPath = [{
        x: pos.x, y: pos.y,
        size: state.eraserSize,
        color: state.backgroundColor
    }];
    redrawCanvas();
    return;
  }

  if (e.button !== 0) return; // All other actions are for left-click only

  if (state.selectionTool === 'pipette') {
    // getMousePosition returns world coordinates (with pan/zoom applied)
    // But getImageData needs canvas coordinates (before transform)
    // Convert: canvasX = worldX * zoomLevel + panOffset.x
    const canvasX = pos.x * state.zoomLevel + state.panOffset.x;
    const canvasY = pos.y * state.zoomLevel + state.panOffset.y;

    const pixelData = elements.canvas.getContext('2d').getImageData(canvasX, canvasY, 1, 1).data;
    const hexColor = "#" + ("000000" + ((pixelData[0] << 16) | (pixelData[1] << 8) | pixelData[2]).toString(16)).slice(-6);

    state.drawingColor = hexColor;
    elements.brushColorPicker.value = hexColor;

    // Only switch back to pencil if NOT holding Alt key
    if (!state.altKeyDown) {
      state.selectionTool = 'pencil';
      const pencilBtn = document.querySelector('.tool-btn[data-tool="pencil"]');
      if(pencilBtn) updateActiveTool(pencilBtn);
      setPencilCursor();
      updateStatusBar(`Tool: ${state.selectionTool}`);
    } else {
      updateStatusBar(`Color: ${hexColor} (Alt)`);
    }
    return;
  }

  if (state.selectionTool === 'fill') {
    // Save state BEFORE making changes for proper undo
    saveState();
    floodFill(pos.x, pos.y, state.drawingColor);
    redrawCanvas();
    return;
  }

  if (state.selectionTool === 'pencil' || state.selectionTool === 'eraser') {
    // Save state BEFORE making changes for proper undo
    saveState();
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
      // Save state BEFORE resizing for proper undo
      saveState();
    } else if (isOnRotationHandle(pos, clickedImage)) {
      state.isRotating = true;
      state.rotateStart = { angle: clickedImage.rotation, x: pos.x, y: pos.y };
      // Save state BEFORE rotating for proper undo
      saveState();
    } else {
      state.isDragging = true;
      state.dragStart = { x: pos.x - clickedImage.x, y: pos.y - clickedImage.y };
      // Save state BEFORE moving for proper undo
      saveState();
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

        // Use interpolation between last mouse position and current position
        // to fill all cells that the mouse passed through
        if (state.lastGridMousePos && (state.lastGridMousePos.x !== pos.x || state.lastGridMousePos.y !== pos.y)) {
            const cells = getCellsBetweenPoints(
                state.lastGridMousePos.x,
                state.lastGridMousePos.y,
                pos.x,
                pos.y,
                gridSize
            );

            for (const cell of cells) {
                if (e.buttons === 1) { // Left mouse button (fill)
                    const existingCellIndex = state.gridCells.findIndex(c => c.x === cell.x && c.y === cell.y);
                    if (existingCellIndex !== -1) {
                        state.gridCells[existingCellIndex].color = state.drawingColor;
                    } else {
                        state.gridCells.push({ x: cell.x, y: cell.y, color: state.drawingColor });
                    }
                } else if (e.buttons === 2) { // Right mouse button (erase)
                    state.gridCells = state.gridCells.filter(c => !(c.x === cell.x && c.y === cell.y));
                }
            }

            // Update last cell to the current cell
            state.lastGridCell = { x: Math.floor(pos.x / gridSize) * gridSize, y: Math.floor(pos.y / gridSize) * gridSize };
            state.lastGridMousePos = { x: pos.x, y: pos.y };
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

    // Apply grid snapping if in grid-draw mode or if grid snapping is enabled
    let snappedDx = dx;
    let snappedDy = dy;

    if (state.selectionTool === 'grid-draw' || state.showGrid) {
      // Snap to grid by rounding to nearest grid size
      snappedDx = Math.round(dx / state.gridSize) * state.gridSize;
      snappedDy = Math.round(dy / state.gridSize) * state.gridSize;
    }

    // Update ghost offset for visual preview instead of moving objects directly
    state.ghostOffset = { x: snappedDx, y: snappedDy };
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

  // Reset lastGridMousePos to prevent continuation on next draw
  state.lastGridMousePos = null;

  if (state.isMovingSelection) {
    state.isMovingSelection = false;

    // Apply the ghost offset to actual objects
    if (state.ghostOffset && (state.ghostOffset.x !== 0 || state.ghostOffset.y !== 0)) {
      state.selectedObjects.forEach(selected => {
        if (selected.type === 'image' || selected.type === 'grid-cell') {
          selected.obj.x += state.ghostOffset.x;
          selected.obj.y += state.ghostOffset.y;
        } else if (selected.type === 'path') {
          selected.obj.forEach(point => {
            point.x += state.ghostOffset.x;
            point.y += state.ghostOffset.y;
          });
        }
      });
    }

    // Hide ghost
    state.isGhostVisible = false;
    state.ghostOffset = { x: 0, y: 0 };

    // Redraw canvas to show objects in new positions
    redrawCanvas();
  }

  if (state.isDragging || state.isResizing || state.isRotating) {
    // State already saved in mousedown
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
      // State already saved in mousedown
    } else if (state.selectionTool === 'grid-draw' && state.lastGridCell.x !== null) {
      // For grid draw, a single click also counts as an action for undo/redo
      // State already saved in mousedown
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
    // Convert screen coordinates to canvas coordinates
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Convert to world coordinates using getMousePosition logic
    const worldX = (screenX - state.panOffset.x) / state.zoomLevel;
    const worldY = (screenY - state.panOffset.y) / state.zoomLevel;

    // Convert back to canvas coordinates for getImageData
    const canvasX = worldX * state.zoomLevel + state.panOffset.x;
    const canvasY = worldY * state.zoomLevel + state.panOffset.y;

    const pixelData = elements.canvas.getContext('2d').getImageData(canvasX, canvasY, 1, 1).data;
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

  // Alt key - temporarily activate pipette tool with pipette cursor
  if (e.key === 'Alt' && !state.altKeyDown) {
    e.preventDefault();
    state.altKeyDown = true;
    // Store current tool if not already in pipette mode
    if (state.selectionTool !== 'pipette') {
      state.previousTool = state.selectionTool;
      state.selectionTool = 'pipette';
    }
    // Set pipette cursor
    setPipetteCursor();
    updateStatusBar('Tool: Color Picker (Alt)');
  }

  if (e.key === 'Delete' && state.selectedImage) {
    state.images = state.images.filter(img => img !== state.selectedImage);
    state.selectedImage = null;
    saveState();
    redrawCanvas();
    updateStatusBar('Image deleted');
  }

  // Delete selected objects (rect-select/lasso selections)
  if (e.key === 'Delete' && state.selectedObjects.length > 0) {
    // Save state BEFORE making changes for proper undo
    saveState();

    // Remove all selected objects
    state.selectedObjects.forEach(selected => {
      if (selected.type === 'image') {
        state.images = state.images.filter(img => img !== selected.obj);
      } else if (selected.type === 'path') {
        state.drawingPaths = state.drawingPaths.filter(path => path !== selected.obj);
      } else if (selected.type === 'grid-cell') {
        state.gridCells = state.gridCells.filter(cell => cell !== selected.obj);
      }
    });

    state.selectedObjects = [];
    redrawCanvas();
    updateStatusBar('Selected objects deleted');
  }

   // Undo with Ctrl+Z (with Ctrl)
   if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
     e.preventDefault();
     undo();
     updateTimelineUI();
     return;
   }
 
   // Redo with Ctrl+Y (with Ctrl)
   if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
     e.preventDefault();
     redo();
     updateTimelineUI();
     return;
   }
 
   // Undo with Z key (without Ctrl)
   if (e.code === 'KeyZ' && !e.ctrlKey && !e.metaKey) {
     e.preventDefault();
     undo();
     updateTimelineUI();
     return;
   }
 
   // Redo with X key (without Ctrl)
   if (e.code === 'KeyX' && !e.ctrlKey && !e.metaKey) {
     e.preventDefault();
     redo();
     updateTimelineUI();
     return;
   }
}

function handleKeyUp(e) {
  if (e.key === ' ') {
    e.preventDefault();
    state.spacebarDown = false;
    state.isPanning = false;
    elements.canvas.style.cursor = 'default';
  }

  // Alt key release - restore previous tool and cursor
  if (e.key === 'Alt') {
    e.preventDefault();
    state.altKeyDown = false;
    // Restore previous tool
    state.selectionTool = state.previousTool;
    // Restore cursor based on the tool being restored
    if (state.selectionTool === 'pencil') {
      setPencilCursor();
    } else if (state.selectionTool === 'eraser') {
      setEraserCursor();
    } else if (state.selectionTool === 'pipette') {
      setPipetteCursor();
    } else if (state.selectionTool === 'grid-draw') {
      elements.canvas.style.cursor = 'crosshair';
    } else {
      // For other tools, reset cursor
      resetCursor();
    }
    updateStatusBar(`Tool: ${state.selectionTool}`);
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
            rotation: 0
          };
          state.images.push(imageData);
          saveState();
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

// --- Persistence ---
function saveProjectState() {
  // When symmetry is active, save the expanded grid cells to make them permanent
  let gridCellsToSave = state.gridCells;
  if (state.symmetry.isActive()) {
    gridCellsToSave = state.symmetry.transformGridCells(state.gridCells, state.gridSize);
  }

  const stateToSave = {
    images: state.images,
    drawingPaths: state.drawingPaths,
    gridCells: gridCellsToSave,
    // Also save the current symmetry state
    symmetry: {
      mode: state.symmetry.mode,
      radialRays: state.symmetry.radialRays
    },
    // Save grid type and other grid settings
    gridType: 'square',
    gridTransformationMode: state.gridTransformationMode
  };
  localStorage.setItem('vibeDrawingState', JSON.stringify(stateToSave));
  updateStatusBar('State saved');
}

function loadState() {
  const savedState = localStorage.getItem('vibeDrawingState');
  if (savedState) {
    const parsedState = JSON.parse(savedState);
    state.images = parsedState.images || [];
    state.drawingPaths = parsedState.drawingPaths || [];
    state.gridCells = parsedState.gridCells || [];

    // Restore symmetry state if it was saved
    if (parsedState.symmetry) {
      state.symmetry.mode = parsedState.symmetry.mode || 'off';
      state.symmetry.radialRays = parsedState.symmetry.radialRays || 8;

      // Update UI to reflect the loaded symmetry state
      const activeBtn = document.querySelector(`.symmetry-mode-btn[data-mode="${state.symmetry.mode}"]`);
      if (activeBtn) {
        document.querySelectorAll('.symmetry-mode-btn').forEach(btn => btn.classList.remove('active'));
        activeBtn.classList.add('active');
      }
      if (state.symmetry.mode === 'radial') {
        document.getElementById('radial-ray-count').value = state.symmetry.radialRays;
        document.getElementById('radial-ray-count-container').classList.remove('hidden');
      } else {
        document.getElementById('radial-ray-count-container').classList.add('hidden');
      }
      document.getElementById('symmetryBtn').classList.toggle('active', state.symmetry.isActive());
    }

    // Restore grid type if it was saved
    if (parsedState.gridType) {
      state.gridType = parsedState.gridType;
    }

    // Restore grid transformation mode if it was saved
    if (parsedState.gridTransformationMode) {
      state.gridTransformationMode = parsedState.gridTransformationMode;

      // Update UI to reflect the loaded grid transformation mode
      if (elements.gridTransformBtn) {
        elements.gridTransformBtn.setAttribute('data-mode', state.gridTransformationMode);

        if (state.gridTransformationMode === 'visual-only') {
          elements.gridTransformBtn.title = 'Grid Transformation: Visual Only (Grid type changes only affect view)';
        } else {
          elements.gridTransformBtn.title = 'Grid Transformation: Permanent (Grid type changes affect saved data)';
        }
      }
    }

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
