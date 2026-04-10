import { state, elements, initializeElements } from './state.js';
import { redrawCanvas, setupCanvas, zoom, clearCanvas } from './canvas.js';
import { updateActiveTool, updateStatusBar, toggleGrid, showDevTools } from './ui.js';

import { floodFill } from './fill.js';
import { initCursors, setPipetteCursor, setPencilCursor, setEraserCursor, resetCursor } from './cursors.js';
import { getPathBoundingBox, doRectanglesIntersect, getCellsBetweenPoints } from './geometry.js';
import { undo, redo, saveState, startPlayback, stopPlayback, pausePlayback, resumePlayback, setPlaybackSpeed, scrubToFrame, getPlaybackState, getHistoryLength } from './history.js';
import { scaleBy2x } from './upscale.js';

// Throttled redraw using requestAnimationFrame to prevent excessive redraws
let redrawScheduled = false;
function scheduleRedraw() {
  if (!redrawScheduled) {
    redrawScheduled = true;
    requestAnimationFrame(() => {
      redrawCanvas();
      redrawScheduled = false;
    });
  }
}

// Grid cells lookup Set for O(1) performance
function getGridCellKey(x, y) { return x + "," + y; }
function buildGridCellsSet() {
  state._gridCellsSet = new Set(state.gridCells.map(cell => getGridCellKey(cell.x, cell.y)));
}

// --- Functions that were in script.js ---

// Initialize the application
function init() {
  initializeElements();
  setupCanvas();
  initCursors();
  
  // Center the view FIRST - before setupUI and loadState
  // This ensures symmetry center is correct
  if (state.canvas && state.canvas.width > 0 && state.canvas.height > 0) {
    const centerX = state.canvas.width / 2;
    const centerY = state.canvas.height / 2;
    state.panOffset.x = centerX;
    state.panOffset.y = centerY;
  }

  // Set initial mode BEFORE loadState (so loadState can override if needed)
  state.drawingMode = 'grid';
  state.selectionTool = 'grid-draw';
  state.showGrid = true;

  // Load settings (lightweight, always)
  loadSettings();

  // Load saved state (may override some settings)
  loadState();

  // RE-APPLY grid mode after loadState (ensure it's always grid mode on start)
  state.drawingMode = 'grid';
  state.selectionTool = 'grid-draw';
  state.showGrid = true;
  
  // Update UI for grid mode
  elements.modeToggleBtn.classList.add('active');
  elements.app.classList.add('mode-grid');
  
  const gridBtn = document.getElementById('gridBtn');
  if (gridBtn) {
    gridBtn.setAttribute('data-active', 'true');
    gridBtn.classList.add('active');
  }

  // Activate grid-draw tool button
  const gridDrawBtn = document.querySelector('.tool-btn[data-tool="grid-draw"]');
  if (gridDrawBtn) {
    updateActiveTool(gridDrawBtn);
  }

  setupEventListeners();
  setupUI();

  updateStatusBar('Ready');
  updateColorIndicator();

  // Hide/show tools based on initial mode
  updateToolsForMode();

  // Initialize auto-save
  updateAutoSave();

  redrawCanvas();
}

// Update color indicator in status bar
function updateColorIndicator() {
  const colorStatus = document.getElementById('colorStatus');
  if (colorStatus) {
    colorStatus.style.backgroundColor = state.drawingColor;
  }
}

// Show/hide tools based on current mode
function updateToolsForMode() {
  const allToolButtons = document.querySelectorAll('#left-toolbar .tool-btn[data-tool]');
  
  // Tools available in Normal mode
  const normalTools = ['pencil', 'select', 'eraser', 'pipette', 'fill', 'rect-select', 'lasso'];
  // Tools available in Grid mode  
  const gridTools = ['grid-draw', 'rect-select', 'lasso', 'pipette', 'fill', 'select'];
  
  const availableTools = state.drawingMode === 'grid' ? gridTools : normalTools;
  
  allToolButtons.forEach(btn => {
    const tool = btn.dataset.tool;
    if (availableTools.includes(tool)) {
      btn.style.display = 'flex';
    } else {
      btn.style.display = 'none';
    }
  });
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
  elements.clearCanvasBtn.addEventListener('click', clearAllContent);
  elements.saveBtn.addEventListener('click', saveProjectState);
  if (elements.saveBtnRight) {
    elements.saveBtnRight.addEventListener('click', saveProjectState);
  }
  elements.loadBtn.addEventListener('click', loadState);

  // Delete button - remove saved state file
  const deleteBtn = document.getElementById('deleteBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      localStorage.removeItem('vibeDrawingState');
      state.gridCells = [];
      state.images = [];
      state.drawingPaths = [];
      state.selectedObjects = [];
      redrawCanvas();
      updateStatusBar('Project deleted');
    });
  }

  // Auto-save button
  if (elements.autoSaveBtn) {
    elements.autoSaveBtn.addEventListener('click', () => {
      elements.autoSaveDialog.classList.remove('hidden');
      // Load current state
      elements.autoSaveCheckbox.checked = state.autoSaveEnabled;
    });
  }

  // Auto-save dialog close
  if (elements.autoSaveDialogClose) {
    elements.autoSaveDialogClose.addEventListener('click', () => {
      elements.autoSaveDialog.classList.add('hidden');
      // Save the setting
      state.autoSaveEnabled = elements.autoSaveCheckbox.checked;
      updateAutoSave();
    });
  }

  // Close dialog when clicking outside
  if (elements.autoSaveDialog) {
    elements.autoSaveDialog.addEventListener('click', (e) => {
      if (e.target === elements.autoSaveDialog) {
        elements.autoSaveDialog.classList.add('hidden');
        state.autoSaveEnabled = elements.autoSaveCheckbox.checked;
        updateAutoSave();
      }
    });
  }

  // Fullscreen button
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    });
  }
  
  // Keyboard shortcut for fullscreen
  document.addEventListener('keydown', (e) => {
    if (e.key === 'f' && !e.ctrlKey && !e.altKey && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  });
  
  // Undo/Redo buttons
  // Update UI after undo/redo to restore tool button and cursor
function updateUndoRedoUI() {
  const toolBtn = document.querySelector(`.tool-btn[data-tool="${state.selectionTool}"]`);
  if (toolBtn) {
    updateActiveTool(toolBtn);
  }
  updateCursorForTool(state.selectionTool);
}

const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      undo();
      updateUndoRedoUI();
      updateStatusBar('Undo');
    });
  }
  if (redoBtn) {
    redoBtn.addEventListener('click', () => {
      redo();
      updateUndoRedoUI();
      updateStatusBar('Redo');
    });
  }

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
  // gridSizeInput removed from right panel, use gridSizeInputTop in top toolbar instead
  // (handler already set up in gridSizeInputTop listener above)

  // Make redrawCanvas available globally for history functions
  window.redrawCanvas = redrawCanvas;
  window.updateUndoRedoUI = updateUndoRedoUI;
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
  elements.gridBrushSizeSlider.addEventListener('input', (e) => {
    state.gridBrushSize = parseInt(e.target.value, 10);
    elements.gridBrushSizeValue.textContent = e.target.value;
  });

  // Grid cell size slider (top panel)
  if (elements.gridSizeInputTop) {
    elements.gridSizeInputTop.addEventListener('input', (e) => {
      state.gridSize = parseInt(e.target.value, 10);
      if (elements.gridSizeValueTop) {
        elements.gridSizeValueTop.textContent = e.target.value;
      }
      redrawCanvas();
    });
  }

  const gridEraserSizeSlider = document.getElementById('gridEraserSizeSlider');
  const gridEraserSizeValue = document.getElementById('gridEraserSizeValue');
  if (gridEraserSizeSlider) {
    gridEraserSizeSlider.addEventListener('input', (e) => {
      state.gridEraserSize = parseInt(e.target.value, 10);
      gridEraserSizeValue.textContent = e.target.value;
    });
  }

  elements.upscaleBtn.addEventListener('click', () => {
    scaleBy2x(saveState);
  });

  // Mode toggle button - single button that switches between Grid and Normal
  elements.modeToggleBtn.addEventListener('click', () => {
    if (state.drawingMode === 'grid') {
      // Switch to Normal mode
      state.drawingMode = 'normal';
      elements.modeToggleBtn.classList.remove('active');
      elements.app.classList.remove('mode-grid');
      updateToolsForMode();
      if (state.previousTool) {
        state.selectionTool = state.previousTool;
        const previousToolBtn = document.querySelector(`.tool-btn[data-tool="${state.previousTool}"]`);
        if(previousToolBtn) updateActiveTool(previousToolBtn);
      }
      updateStatusBar('Mode: Normal');
    } else {
      // Switch to Grid mode
      state.drawingMode = 'grid';
      elements.modeToggleBtn.classList.add('active');
      elements.app.classList.add('mode-grid');
      state.previousTool = state.selectionTool;
      state.selectionTool = 'grid-draw';
      const gridDrawBtn = document.querySelector('.tool-btn[data-tool="grid-draw"]');
      if(gridDrawBtn) updateActiveTool(gridDrawBtn);
      state.showGrid = true;
      document.getElementById('gridBtn').setAttribute('data-active', 'true');
      document.getElementById('gridBtn').classList.add('active');
      updateToolsForMode();
      updateStatusBar('Mode: Grid');
    }
    redrawCanvas();
  });

  // Keyboard shortcuts for mode switching
  document.addEventListener('keydown', (e) => {
    if (e.key === 'q' && !e.ctrlKey && !e.altKey && document.activeElement.tagName !== 'INPUT') {
      // Toggle mode
      if (state.drawingMode !== 'grid') {
        state.drawingMode = 'grid';
        elements.modeToggleBtn.classList.add('active');
        elements.app.classList.add('mode-grid');
        state.previousTool = state.selectionTool;
        state.selectionTool = 'grid-draw';
        const gridDrawBtn = document.querySelector('.tool-btn[data-tool="grid-draw"]');
        if(gridDrawBtn) updateActiveTool(gridDrawBtn);
        state.showGrid = true;
        document.getElementById('gridBtn').setAttribute('data-active', 'true');
        document.getElementById('gridBtn').classList.add('active');
        updateToolsForMode();
        updateStatusBar('Mode: Grid (Q)');
      } else {
        state.drawingMode = 'normal';
        elements.modeToggleBtn.classList.remove('active');
        elements.app.classList.remove('mode-grid');
        updateToolsForMode();
        if (state.previousTool) {
          state.selectionTool = state.previousTool;
          const previousToolBtn = document.querySelector(`.tool-btn[data-tool="${state.previousTool}"]`);
          if(previousToolBtn) updateActiveTool(previousToolBtn);
        }
        updateStatusBar('Mode: Normal');
      }
      redrawCanvas();
    }
  });

  elements.brushColorPicker.addEventListener('input', (e) => {
    state.drawingColor = e.target.value;
    updateColorIndicator();
  });
  // Add change event for first click color selection
  elements.brushColorPicker.addEventListener('change', (e) => {
    state.drawingColor = e.target.value;
    updateColorIndicator();
    // Remove active class from color swatches when using native picker
    elements.colorPalette.querySelectorAll('.color-swatch').forEach(btn => btn.classList.remove('active'));
  });

  // Color Palette
  elements.colorPalette.addEventListener('click', (e) => {
    if (e.target.classList.contains('color-swatch')) {
      const color = e.target.dataset.color;
      state.drawingColor = color;
      updateColorIndicator();
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

        // Save state to persist symmetry mode across sessions
        saveSettings();

        // Visual feedback
        const modeLabel = mode === 'off' ? 'Guide only' : mode.charAt(0).toUpperCase() + mode.slice(1);
        updateStatusBar(`Symmetry: ${modeLabel}`);
    });
  });

  // Listen to ray count changes
  elements.radialRayCountInput.addEventListener('input', (e) => {
      const count = parseInt(e.target.value, 10);
      state.symmetry.setRays(count);
      saveSettings();
  });

  // Listen to symmetry line visibility changes
  if (elements.showSymmetryLineCb) {
    elements.showSymmetryLineCb.addEventListener('change', (e) => {
      state.showSymmetryLine = e.target.checked;
      redrawCanvas();
      saveSettings();
    });
  }

  // Grid button toggle - save state
  if (elements.gridBtn) {
    elements.gridBtn.addEventListener('click', () => {
      saveSettings();
    });
  }

  // Tasks dialog
  if (elements.tasksBtn) {
    elements.tasksBtn.addEventListener('click', () => {
      elements.tasksDialog.classList.remove('hidden');
      loadTasksFile();
    });
  }

  if (elements.tasksCloseBtn) {
    elements.tasksCloseBtn.addEventListener('click', () => {
      elements.tasksDialog.classList.add('hidden');
    });
  }

  if (elements.tasksLoadBtn) {
    elements.tasksLoadBtn.addEventListener('click', () => {
      elements.tasksFileInput.click();
    });
  }

  if (elements.tasksFileInput) {
    elements.tasksFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        elements.tasksTextarea.value = ev.target.result;
        elements.tasksFileInput.value = '';
      };
      reader.readAsText(file);
    });
  }

  if (elements.tasksSaveBtn) {
    elements.tasksSaveBtn.addEventListener('click', () => {
      const content = elements.tasksTextarea.value;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'сделать.txt';
      a.click();
      URL.revokeObjectURL(url);
      updateStatusBar('Tasks file saved');
    });
  }

  // Close tasks dialog when clicking outside
  if (elements.tasksDialog) {
    elements.tasksDialog.addEventListener('click', (e) => {
      if (e.target === elements.tasksDialog) {
        elements.tasksDialog.classList.add('hidden');
      }
    });
  }

  // Load tasks file helper
  function loadTasksFile() {
    // Try to fetch the file from the server if possible
    fetch('js/сделать.txt')
      .then(r => r.ok ? r.text() : null)
      .then(text => {
        if (text) {
          elements.tasksTextarea.value = text;
        } else {
          elements.tasksTextarea.value = 'Click 📂 Load to open сделать.txt\n\nThen edit and click 💾 Save to download.';
        }
      })
      .catch(() => {
        elements.tasksTextarea.value = 'Click 📂 Load to open сделать.txt\n\nThen edit and click 💾 Save to download.';
      });
  }

  // Grid transformation mode button
  if (elements.gridTransformBtn) {
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
  }

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
      if (btn.style.display === 'none') {
        return;
      }

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
  const activeToolBtn = document.querySelector('.tool-btn.active');
  if(activeToolBtn) updateActiveTool(activeToolBtn);

  // Initialize symmetry line checkbox
  if (elements.showSymmetryLineCb) {
    elements.showSymmetryLineCb.checked = state.showSymmetryLine;
  }

  // Initialize grid cell size slider
  if (elements.gridSizeInputTop) {
    elements.gridSizeInputTop.value = state.gridSize;
    if (elements.gridSizeValueTop) {
      elements.gridSizeValueTop.textContent = state.gridSize;
    }
  }

  // Set initial cursor based on default tool (grid-draw is default)
  if (state.selectionTool === 'grid-draw') {
    elements.canvas.style.cursor = 'crosshair';
  } else if (state.selectionTool === 'pencil') {
    setPencilCursor();
  } else if (state.selectionTool === 'eraser') {
    setEraserCursor();
  } else if (state.selectionTool === 'pipette') {
    setPipetteCursor();
  } else {
    resetCursor();
  }

  // Disable context menu on color pickers
  elements.brushColorPicker.oncontextmenu = () => false;
  elements.gridColorPicker.oncontextmenu = () => false;
  elements.backgroundColorPicker.oncontextmenu = () => false;

  // Setup timeline controls
  setupTimelineControls();
}

// Update cursor based on current tool
function updateCursorForTool(tool) {
  if (tool === 'pencil') {
    setPencilCursor();
  } else if (tool === 'eraser') {
    setEraserCursor();
  } else if (tool === 'pipette') {
    setPipetteCursor();
  } else if (tool === 'grid-draw') {
    elements.canvas.style.cursor = 'crosshair';
  } else {
    resetCursor();
  }
}

// --- TIMELINE FUNCTIONS ---

// Clear all canvas content (grid cells, images, paths) but don't delete saved state
function clearAllContent() {
  state.gridCells = [];
  state.images = [];
  state.drawingPaths = [];
  state.currentPath = [];
  state.selectedObjects = [];
  redrawCanvas();
  updateStatusBar('Canvas cleared');
}

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
      updateCursorForTool(state.selectionTool);
    });
    
    // Slider - stop playback when user starts dragging
    timelineSlider?.addEventListener('mousedown', () => {
      const playbackState = getPlaybackState();
      if (playbackState.isPlaying) {
        stopPlayback();
      }
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

function updateTimelineUI(currentFrame = null, totalFrames = null) {
  // Re-query elements in case they changed
  const timelineSlider = document.getElementById('timelineSlider');
  const timelineFrame = document.getElementById('timelineFrame');
  const timelinePlayBtn = document.getElementById('timelinePlayBtn');

  const playbackState = getPlaybackState();
  const actualTotalFrames = totalFrames !== null ? totalFrames : getHistoryLength();
  const actualCurrentFrame = currentFrame !== null ? currentFrame : (state.currentHistoryIndex + 1); // Since index starts at -1

  // Update slider
  if (timelineSlider) {
    timelineSlider.max = Math.max(0, actualTotalFrames);
    timelineSlider.value = actualCurrentFrame;
    
    // Set data attributes for step indicators and progress
    timelineSlider.setAttribute('data-steps', actualTotalFrames);
    timelineSlider.style.setProperty('--steps', actualTotalFrames);
    
    // Calculate and set progress percentage
    const progressPercentage = actualTotalFrames > 0 ? (actualCurrentFrame / actualTotalFrames) * 100 : 0;
    timelineSlider.style.setProperty('--progress-percentage', progressPercentage + '%');
  }

  // Update frame counter
  if (timelineFrame) {
    timelineFrame.textContent = `${actualCurrentFrame}/${actualTotalFrames}`;
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
    pausePlayback();
  } else {
    // If we've reached the end, restart from the beginning
    if (playbackState.currentFrame >= playbackState.totalFrames) {
      // Reset to beginning
      state.currentHistoryIndex = -1;
      // Update UI to show beginning
      updateTimelineUI();
    }
    startPlayback(updateTimelineUI);
  }
  
  // Update button state
  const timelinePlayBtn = document.getElementById('timelinePlayBtn');
  if (timelinePlayBtn) {
    timelinePlayBtn.textContent = getPlaybackState().isPlaying ? '⏸' : '▶';
    timelinePlayBtn.classList.toggle('playing', getPlaybackState().isPlaying);
  }
  
  // Force UI update to ensure slider reflects current state
  updateTimelineUI();
  updateCursorForTool(state.selectionTool);
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
    // Build fast lookup Set
    if (!state._gridCellsSet) buildGridCellsSet();
    // Save state BEFORE making changes for proper undo
    saveState();

    // Snap position to base grid
    const snappedX = Math.floor(pos.x / state.gridSize) * state.gridSize;
    const snappedY = Math.floor(pos.y / state.gridSize) * state.gridSize;

    state.lastGridCell = { x: snappedX, y: snappedY };
    state.lastGridMousePos = { x: pos.x, y: pos.y };

    if (e.button === 0) { // Left-click to fill grid cell
      const brushSize = state.gridBrushSize;
      const halfSize = Math.floor(brushSize / 2);
      const centerX = state.lastGridCell.x;
      const centerY = state.lastGridCell.y;

      // Draw cells
      for (let dx = -halfSize; dx <= halfSize; dx++) {
        for (let dy = -halfSize; dy <= halfSize; dy++) {
          const cellX = centerX + dx * state.gridSize;
          const cellY = centerY + dy * state.gridSize;
          const cellKey = getGridCellKey(cellX, cellY);
          if (state._gridCellsSet.has(cellKey)) {
            // Update color of existing cell
            const existingCell = state.gridCells.find(cc => cc.x === cellX && cc.y === cellY);
            if (existingCell) existingCell.color = state.drawingColor;
            // When symmetry is active, also update symmetric counterparts
            if (state.symmetry.isActive()) {
              const symmetric = state.symmetry.transformGridCells([{ x: cellX, y: cellY, color: state.drawingColor }], state.gridSize);
              symmetric.shift(); // remove original
              for (const s of symmetric) {
                const symCell = state.gridCells.find(cc => cc.x === s.x && cc.y === s.y);
                if (symCell) symCell.color = state.drawingColor;
              }
            }
          } else {
            const newCell = { x: cellX, y: cellY, color: state.drawingColor };
            state._gridCellsSet.add(cellKey);
            state.gridCells.push(newCell);
            if (state.symmetry.isActive()) {
              const symmetric = state.symmetry.transformGridCells([newCell], state.gridSize);
              symmetric.shift();
              for (const s of symmetric) {
                const sKey = getGridCellKey(s.x, s.y);
                if (!state._gridCellsSet.has(sKey)) {
                  state._gridCellsSet.add(sKey);
                  state.gridCells.push(s);
                }
              }
            }
          }
        }
      }
    } else if (e.button === 2) { // Right-click to erase grid cell
      const eraserSize = state.gridEraserSize;
      const halfSize = Math.floor(eraserSize / 2);
      const centerX = state.lastGridCell.x;
      const centerY = state.lastGridCell.y;

      // Erase cells
      for (let dx = -halfSize; dx <= halfSize; dx++) {
        for (let dy = -halfSize; dy <= halfSize; dy++) {
          const cellX = centerX + dx * state.gridSize;
          const cellY = centerY + dy * state.gridSize;
          // Remove the cell and its symmetric counterparts if symmetry is active
          if (state.symmetry.isActive()) {
            const cellsToRemove = state.symmetry.transformGridCells([{ x: cellX, y: cellY, color: '' }], state.gridSize);
            const toRemoveSet = new Set(cellsToRemove.map(cr => getGridCellKey(cr.x, cr.y)));
            state.gridCells = state.gridCells.filter(cell => {
              const k = getGridCellKey(cell.x, cell.y);
              if (toRemoveSet.has(k)) {
                state._gridCellsSet.delete(k);
                return false;
              }
              return true;
            });
          } else {
            const key = getGridCellKey(cellX, cellY);
            state._gridCellsSet.delete(key);
            state.gridCells = state.gridCells.filter(cell => getGridCellKey(cell.x, cell.y) !== key);
          }
        }
      }
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
    updateColorIndicator();

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
      // Check if it's a right-click (button 2) to erase
      if (e.button === 2) {
        // Right-click to erase (make transparent) the clicked area
        floodErase(pos.x, pos.y);
      } else {
        // Left-click to fill with the selected color
        floodFill(pos.x, pos.y, state.drawingColor);
      }
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

  // Select and Lasso tools
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

  // Select tool (arrow) - start moving selected objects
  if (state.selectionTool === 'select' && state.selectedObjects.length > 0) {
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
  }
}

function handleCanvasMouseMove(e) {
  const pos = getMousePosition(e);

  if (state.isDrawing) {
    // Grid Draw continuous
    if (state.selectionTool === 'grid-draw') {

        // Use interpolation between last mouse position and current position
        // to fill all cells that the mouse passed through
        if (state.lastGridMousePos && (state.lastGridMousePos.x !== pos.x || state.lastGridMousePos.y !== pos.y)) {
            const cells = getCellsBetweenPoints(
                state.lastGridMousePos.x,
                state.lastGridMousePos.y,
                pos.x,
                pos.y,
                state.gridSize
            );

            for (const cell of cells) {
                // Fill a square area around the cell
                if (e.buttons === 1) { // Left mouse button (fill)
                    const brushSize = state.gridBrushSize;
                    const halfSize = Math.floor(brushSize / 2);
                    const centerX = cell.x;
                    const centerY = cell.y;
                    for (let dx = -halfSize; dx <= halfSize; dx++) {
                      for (let dy = -halfSize; dy <= halfSize; dy++) {
                        const filledX = centerX + dx * state.gridSize;
                        const filledY = centerY + dy * state.gridSize;
                        // Fast Set-based lookup
                        const cellKey = getGridCellKey(filledX, filledY);
                        if (state._gridCellsSet.has(cellKey)) {
                          // Update color of existing cell
                          const existingCell = state.gridCells.find(cc => cc.x === filledX && cc.y === filledY);
                          if (existingCell) existingCell.color = state.drawingColor;
                          // When symmetry is active, also update symmetric counterparts
                          if (state.symmetry.isActive()) {
                            const symmetric = state.symmetry.transformGridCells([{ x: filledX, y: filledY, color: state.drawingColor }], state.gridSize);
                            symmetric.shift(); // remove original
                            for (const s of symmetric) {
                              const symCell = state.gridCells.find(cc => cc.x === s.x && cc.y === s.y);
                              if (symCell) symCell.color = state.drawingColor;
                            }
                          }
                        } else {
                          const newCell = { x: filledX, y: filledY, color: state.drawingColor };
                          state._gridCellsSet.add(cellKey);
                          state.gridCells.push(newCell);
                          // Add symmetric cells with fast lookup
                          if (state.symmetry.isActive()) {
                            const symmetric = state.symmetry.transformGridCells([newCell], state.gridSize);
                            symmetric.shift(); // remove original
                            for (const s of symmetric) {
                              const sKey = getGridCellKey(s.x, s.y);
                              if (!state._gridCellsSet.has(sKey)) {
                                state._gridCellsSet.add(sKey);
                                state.gridCells.push(s);
                              }
                            }
                          }
                        }
                      }
                    }
                } else if (e.buttons === 2) { // Right mouse button (erase)
                    // Erase a square area around the cell
                    const eraserSize = state.gridEraserSize;
                    const halfSize = Math.floor(eraserSize / 2);
                    const centerX = cell.x;
                    const centerY = cell.y;
                    for (let dx = -halfSize; dx <= halfSize; dx++) {
                      for (let dy = -halfSize; dy <= halfSize; dy++) {
                        const erasedX = centerX + dx * state.gridSize;
                        const erasedY = centerY + dy * state.gridSize;
                        // Remove the cell and its symmetric counterparts if symmetry is active
                        if (state.symmetry.isActive()) {
                          const cellsToRemove = state.symmetry.transformGridCells([{ x: erasedX, y: erasedY, color: '' }], state.gridSize);
                          const toRemoveSet = new Set(cellsToRemove.map(cr => getGridCellKey(cr.x, cr.y)));
                          state.gridCells = state.gridCells.filter(cell => {
                            const k = getGridCellKey(cell.x, cell.y);
                            if (toRemoveSet.has(k)) {
                              state._gridCellsSet.delete(k);
                              return false;
                            }
                            return true;
                          });
                        } else {
                          const key = getGridCellKey(erasedX, erasedY);
                          state._gridCellsSet.delete(key);
                          state.gridCells = state.gridCells.filter(cell => getGridCellKey(cell.x, cell.y) !== key);
                        }
                      }
                    }
                }
            }

            // Update last cell to the current cell
            state.lastGridCell = { x: Math.floor(pos.x / state.gridSize) * state.gridSize, y: Math.floor(pos.y / state.gridSize) * state.gridSize };
            state.lastGridMousePos = { x: pos.x, y: pos.y };
            scheduleRedraw();
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
    scheduleRedraw();
    return;
  }

  if (state.isMovingSelection) {
    const dx = pos.x - state.dragStart.x;
    const dy = pos.y - state.dragStart.y;

    // Apply grid snapping if in grid-draw mode or if grid snapping is enabled
    let snappedDx = dx;
    let snappedDy = dy;

    if (state.selectionTool === 'grid-draw' || state.showGrid) {
      snappedDx = Math.round(dx / state.gridSize) * state.gridSize;
      snappedDy = Math.round(dy / state.gridSize) * state.gridSize;
    }

    state.ghostOffset = { x: snappedDx, y: snappedDy };
    scheduleRedraw();
    return;
  }

  if (state.isDragging && state.selectedImage) {
    state.selectedImage.x = pos.x - state.dragStart.x;
    state.selectedImage.y = pos.y - state.dragStart.y;
    scheduleRedraw();
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
    scheduleRedraw();
  } else if (state.isRotating && state.selectedImage) {
    const centerX = state.selectedImage.x + state.selectedImage.width / 2;
    const centerY = state.selectedImage.y + state.selectedImage.height / 2;
    const angle = Math.atan2(pos.y - centerY, pos.x - centerX);
    state.selectedImage.rotation = angle;
    scheduleRedraw();
  } else if (state.isPanning) {
    const dx = e.clientX - state.panStart.x;
    const dy = e.clientY - state.panStart.y;
    state.panOffset.x += dx;
    state.panOffset.y += dy;
    state.panStart = { x: e.clientX, y: e.clientY };
    scheduleRedraw();
  } else if (state.isSelecting) {
    if (state.selectionTool === 'lasso') {
        state.selectionPath.push(pos);
    } else {
        state.selectionStart = pos;
    }
    scheduleRedraw();
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
    saveState();
  }

  if (state.isDragging || state.isResizing || state.isRotating) {
    saveState();
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
      if (state.symmetry.isActive()) {
        state.drawingPaths.push(...state.symmetry.transformPath(state.currentPath, state.gridSize));
      } else {
        state.drawingPaths.push(state.currentPath);
      }
      saveState(); // Save state AFTER the new path is added
    } else if (state.selectionTool === 'grid-draw' && state.lastGridCell.x !== null) {
      // For grid draw, a single click also counts as an action for undo/redo
      saveState(); // Save state AFTER the grid cell is added
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
  // Alt key - temporarily activate pipette tool with pipette cursor
  // Disabled to prevent conflicts with system tabs
  /*
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
  */

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
     updateCursorForTool(state.selectionTool);
     return;
   }
 
   // Redo with Ctrl+Y (with Ctrl)
   if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
     e.preventDefault();
     redo();
     updateTimelineUI();
     updateCursorForTool(state.selectionTool);
     return;
   }
 
   // Undo with Z key (without Ctrl) - disabled to prevent conflicts
   if (e.code === 'KeyZ' && !e.ctrlKey && !e.metaKey) {
     e.preventDefault();
     undo();
     updateTimelineUI();
     updateCursorForTool(state.selectionTool);
     return;
   }
 
   // Redo with X key (without Ctrl) - disabled to prevent conflicts
   if (e.code === 'KeyX' && !e.ctrlKey && !e.metaKey) {
     e.preventDefault();
     redo();
     updateTimelineUI();
     updateCursorForTool(state.selectionTool);
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

function getImageFromData(src) {
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
function updateAutoSave() {
  // Clear existing interval
  if (state.autoSaveInterval) {
    clearInterval(state.autoSaveInterval);
    state.autoSaveInterval = null;
  }

  // Set new interval if enabled
  if (state.autoSaveEnabled) {
    state.autoSaveInterval = setInterval(() => {
      saveSettings(); // silent save
    }, 30000); // 30 seconds
    updateStatusBar('Auto-save enabled (every 30s)');
  } else {
    updateStatusBar('Auto-save disabled');
  }
}

// Save only settings (not drawing data) to localStorage
function saveSettings() {
  const settings = {
    drawingMode: state.drawingMode,
    symmetry: {
      mode: state.symmetry.mode,
      radialRays: state.symmetry.radialRays
    },
    showSymmetryLine: state.showSymmetryLine,
    autoSaveEnabled: state.autoSaveEnabled,
    gridType: 'square',
    gridTransformationMode: state.gridTransformationMode
  };
  try {
    localStorage.setItem('vibeDrawingSettings', JSON.stringify(settings));
  } catch(e) {
    console.warn('Failed to save settings:', e);
  }
}

// Save full state (including drawing data) - use for manual save only
function saveProjectState(silent = false) {
  // When symmetry is active, save the expanded grid cells to make them permanent
  let gridCellsToSave = state.gridCells;
  if (state.symmetry.isActive()) {
    gridCellsToSave = state.symmetry.transformGridCells(state.gridCells, state.gridSize);
  }

  const stateToSave = {
    images: state.images,
    drawingPaths: state.drawingPaths,
    gridCells: gridCellsToSave,
    drawingMode: state.drawingMode,
    panOffset: { ...state.panOffset },
    zoomLevel: state.zoomLevel,
    symmetry: {
      mode: state.symmetry.mode,
      radialRays: state.symmetry.radialRays
    },
    showSymmetryLine: state.showSymmetryLine,
    autoSaveEnabled: state.autoSaveEnabled,
    gridType: 'square',
    gridTransformationMode: state.gridTransformationMode
  };
  try {
    localStorage.setItem('vibeDrawingState', JSON.stringify(stateToSave));
    if (!silent) {
      updateStatusBar('State saved');
    }
  } catch(e) {
    console.warn('localStorage quota exceeded:', e);
    updateStatusBar('Save failed - localStorage full');
  }
}

// Load only settings (not drawing data) from localStorage
function loadSettings() {
  const savedSettings = localStorage.getItem('vibeDrawingSettings');
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings);
      if (parsed.drawingMode) state.drawingMode = parsed.drawingMode;
      if (parsed.symmetry) {
        state.symmetry.mode = parsed.symmetry.mode || 'off';
        state.symmetry.radialRays = parsed.symmetry.radialRays || 8;
      }
      if (parsed.showSymmetryLine !== undefined) state.showSymmetryLine = parsed.showSymmetryLine;
      if (parsed.autoSaveEnabled !== undefined) state.autoSaveEnabled = parsed.autoSaveEnabled;
      if (parsed.gridTransformationMode) state.gridTransformationMode = parsed.gridTransformationMode;
    } catch(e) {
      console.warn('Failed to load settings:', e);
    }
  }
}

function loadState() {
  const savedState = localStorage.getItem('vibeDrawingState');
  if (savedState) {
    let parsedState;
    try { parsedState = JSON.parse(savedState); } catch(e) { console.warn('Corrupt saved state, clearing:', e); localStorage.removeItem('vibeDrawingState'); return; }
    state.images = parsedState.images || [];
    state.drawingPaths = parsedState.drawingPaths || [];
    state.gridCells = parsedState.gridCells || [];

    // Restore drawing mode if saved
    if (parsedState.drawingMode) {
      state.drawingMode = parsedState.drawingMode;
    }

    // Restore pan offset and zoom if saved
    if (parsedState.panOffset) {
      state.panOffset = parsedState.panOffset;
    }
    if (parsedState.zoomLevel) {
      state.zoomLevel = parsedState.zoomLevel;
    }

    // Restore symmetry state if it was saved
    if (parsedState.symmetry) {
      console.log('[DEBUG loadState] Restoring symmetry:', parsedState.symmetry);
      state.symmetry.mode = parsedState.symmetry.mode || 'off';
      state.symmetry.radialRays = parsedState.symmetry.radialRays || 8;
      console.log('[DEBUG loadState] Current mode:', state.symmetry.mode, 'isActive:', state.symmetry.isActive());

      // Update UI to reflect the loaded symmetry state
      const activeBtn = document.querySelector(`.symmetry-mode-btn[data-mode="${state.symmetry.mode}"]`);
      if (activeBtn) {
        document.querySelectorAll('.symmetry-mode-btn').forEach(btn => btn.classList.remove('active'));
        activeBtn.classList.add('active');
        console.log('[DEBUG loadState] Activated button:', state.symmetry.mode);
      } else {
        console.log('[DEBUG loadState] Button NOT found for mode:', state.symmetry.mode);
      }
      if (state.symmetry.mode === 'radial') {
        document.getElementById('radial-ray-count').value = state.symmetry.radialRays;
        document.getElementById('radial-ray-count-container').classList.remove('hidden');
      } else {
        document.getElementById('radial-ray-count-container').classList.add('hidden');
      }
      document.getElementById('symmetryBtn').classList.toggle('active', state.symmetry.isActive());
    } else {
      // Initialize symmetry UI to default (off)
      const offBtn = document.querySelector('.symmetry-mode-btn[data-mode="off"]');
      if (offBtn) {
        document.querySelectorAll('.symmetry-mode-btn').forEach(btn => btn.classList.remove('active'));
        offBtn.classList.add('active');
      }
      document.getElementById('radial-ray-count-container').classList.add('hidden');
    }

    // Restore showSymmetryLine if it was saved
    if (parsedState.showSymmetryLine !== undefined) {
      state.showSymmetryLine = parsedState.showSymmetryLine;
      if (elements.showSymmetryLineCb) {
        elements.showSymmetryLineCb.checked = state.showSymmetryLine;
      }
    }

    // Restore auto-save setting if it was saved
    if (parsedState.autoSaveEnabled !== undefined) {
      state.autoSaveEnabled = parsedState.autoSaveEnabled;
      if (elements.autoSaveCheckbox) {
        elements.autoSaveCheckbox.checked = state.autoSaveEnabled;
      }
      updateAutoSave();
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
