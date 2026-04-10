import { state, elements, initializeElements } from './state.js';
import { redrawCanvas, setupCanvas, zoom, clearCanvas, invalidateGridCellsCache } from './canvas.js';
import { updateActiveTool, updateStatusBar, toggleGrid, showDevTools } from './ui.js';
import { initCursors, setPipetteCursor, setPencilCursor, setEraserCursor, resetCursor } from './cursors.js';
import { undo, redo, saveState, startPlayback, stopPlayback, pausePlayback, resumePlayback, setPlaybackSpeed, scrubToFrame, getPlaybackState, getHistoryLength } from './history.js';
import { scaleBy2x } from './upscale.js';
import { floodFill } from './fill.js';
import { getPathBoundingBox } from './geometry.js';
import { handleKeyDown, handleKeyUp } from './keyboard.js';
import { getMousePosition, handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasMouseUp, handleCanvasWheel } from './mouse.js';
import { saveSettings, loadSettings, saveProjectState, loadState, updateAutoSave } from './storage.js';
import { exportAsImage, exportPanelShow, setupExportPanel } from './export.js';

// Initialize the application
function init() {
  initializeElements();
  setupCanvas();
  initCursors();

  // Center the view
  if (state.canvas && state.canvas.width > 0 && state.canvas.height > 0) {
    const centerX = state.canvas.width / 2;
    const centerY = state.canvas.height / 2;
    state.panOffset.x = centerX;
    state.panOffset.y = centerY;
  }

  // Set initial mode
  state.drawingMode = 'grid';
  state.selectionTool = 'grid-draw';
  state.showGrid = true;

  // Load settings and state
  loadSettings();
  loadState();

  // Re-apply grid mode
  state.drawingMode = 'grid';
  state.selectionTool = 'grid-draw';
  state.showGrid = true;

  elements.modeToggleBtn.classList.add('active');
  elements.app.classList.add('mode-grid');

  const gridBtn = document.getElementById('gridBtn');
  if (gridBtn) {
    gridBtn.setAttribute('data-active', 'true');
    gridBtn.classList.add('active');
  }

  const gridDrawBtn = document.querySelector('.tool-btn[data-tool="grid-draw"]');
  if (gridDrawBtn) {
    updateActiveTool(gridDrawBtn);
  }

  setupEventListeners();
  setupUI();

  updateStatusBar('Ready');
  updateColorIndicator();
  updateToolsForMode();
  updateAutoSave();

  redrawCanvas();
}

// Update color indicator
function updateColorIndicator() {
  const colorStatus = document.getElementById('colorStatus');
  if (colorStatus) {
    colorStatus.style.backgroundColor = state.drawingColor;
  }
}

// Show/hide tools based on mode
function updateToolsForMode() {
  const allToolButtons = document.querySelectorAll('#left-toolbar .tool-btn[data-tool]');
  const normalTools = ['pencil', 'select', 'eraser', 'pipette', 'fill', 'rect-select', 'lasso'];
  const gridTools = ['grid-draw', 'rect-select', 'lasso', 'pipette', 'fill', 'select'];
  const availableTools = state.drawingMode === 'grid' ? gridTools : normalTools;

  allToolButtons.forEach(btn => {
    const tool = btn.dataset.tool;
    btn.style.display = availableTools.includes(tool) ? 'flex' : 'none';
  });
}

// Setup all event listeners
function setupEventListeners() {
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
  elements.fitBtn.addEventListener('click', () => zoom(1 / state.zoomLevel));
  elements.clearCanvasBtn.addEventListener('click', () => {
    state.gridCells = [];
    invalidateGridCellsCache();
    state.images = [];
    state.drawingPaths = [];
    state.selectedObjects = [];
    redrawCanvas();
    updateStatusBar('Canvas cleared');
  });
  elements.saveBtn.addEventListener('click', () => saveProjectState(false));
  elements.loadBtn.addEventListener('click', loadState);

  // Delete button
  const deleteBtn = document.getElementById('deleteBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      localStorage.removeItem('vibeDrawingState');
      state.gridCells = [];
      invalidateGridCellsCache();
      state.images = [];
      state.drawingPaths = [];
      state.selectedObjects = [];
      redrawCanvas();
      updateStatusBar('Project deleted');
    });
  }

  // Fullscreen
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

  // Dev Tools
  const devToolsBtn = document.getElementById('devToolsBtn');
  if (devToolsBtn) {
    devToolsBtn.addEventListener('click', showDevTools);
  }

  // Change Cursor
  const changeCursorBtn = document.getElementById('changeCursorBtn');
  if (changeCursorBtn) {
    changeCursorBtn.addEventListener('click', () => {
      const cursorPanel = document.getElementById('cursorPanel');
      if (cursorPanel) {
        cursorPanel.style.display = cursorPanel.style.display === 'none' ? 'block' : 'none';
      }
    });
  }

  // Auto Save
  const autoSaveBtn = document.getElementById('autoSaveBtn');
  if (autoSaveBtn) {
    autoSaveBtn.addEventListener('click', () => {
      elements.autoSaveDialog.classList.remove('hidden');
      elements.autoSaveCheckbox.checked = state.autoSaveEnabled;
    });
  }

  if (elements.autoSaveDialogClose) {
    elements.autoSaveDialogClose.addEventListener('click', () => {
      elements.autoSaveDialog.classList.add('hidden');
      state.autoSaveEnabled = elements.autoSaveCheckbox.checked;
      updateAutoSave();
      saveSettings();
    });
  }

  // Undo/Redo
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
  elements.backgroundColorPicker.addEventListener('input', (e) => {
    state.backgroundColor = e.target.value;
    redrawCanvas();
  });

  // Sliders
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

  const gridEraserSizeSlider = document.getElementById('gridEraserSizeSlider');
  if (gridEraserSizeSlider) {
    gridEraserSizeSlider.addEventListener('input', (e) => {
      state.gridEraserSize = parseInt(e.target.value, 10);
      document.getElementById('gridEraserSizeValue').textContent = e.target.value;
    });
  }

  // Upscale
  elements.upscaleBtn.addEventListener('click', () => {
    scaleBy2x(saveState);
  });

  // Mode toggle
  elements.modeToggleBtn.addEventListener('click', toggleMode);

  // Color picker
  elements.brushColorPicker.addEventListener('input', (e) => {
    state.drawingColor = e.target.value;
    updateColorIndicator();
  });

  // Color palette
  elements.colorPalette.addEventListener('click', (e) => {
    if (e.target.classList.contains('color-swatch')) {
      state.drawingColor = e.target.dataset.color;
      updateColorIndicator();
      elements.colorPalette.querySelectorAll('.color-swatch').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      updateStatusBar(`Color: ${state.drawingColor}`);
    }
  });

  // Right-click on color swatch
  elements.colorPalette.addEventListener('contextmenu', (e) => {
    if (e.target.classList.contains('color-swatch')) {
      e.preventDefault();
      elements.swatchColorPicker.value = e.target.dataset.color;
      elements.swatchColorPicker.click();
    }
  });

  elements.swatchColorPicker.addEventListener('input', (e) => {
    state.drawingColor = e.target.value;
    elements.brushColorPicker.value = e.target.value;
    updateColorIndicator();
  });

  // Menu toggle
  elements.togglePanelsBtn.addEventListener('click', (e) => {
    elements.mainMenu.classList.toggle('hidden');
    e.stopPropagation();
  });

  document.addEventListener('click', (e) => {
    if (!elements.mainMenu.contains(e.target) && !elements.togglePanelsBtn.contains(e.target)) {
      elements.mainMenu.classList.add('hidden');
    }
  });

  // Panel toggles
  elements.toggleTopToolbarCb.addEventListener('change', (e) => {
    elements.app.classList.toggle('top-toolbar-hidden', !e.target.checked);
  });
  elements.toggleLeftToolbarCb.addEventListener('change', (e) => {
    elements.app.classList.toggle('left-toolbar-hidden', !e.target.checked);
  });
  elements.toggleRightToolbarCb.addEventListener('change', (e) => {
    elements.app.classList.toggle('right-toolbar-hidden', !e.target.checked);
  });

  // Symmetry
  elements.symmetryBtn.addEventListener('click', (e) => {
    elements.symmetryPanel.classList.toggle('hidden');
    e.stopPropagation();
  });

  document.addEventListener('click', (e) => {
    if (!elements.symmetryPanel.contains(e.target) && !elements.symmetryBtn.contains(e.target)) {
      elements.symmetryPanel.classList.add('hidden');
    }
  });
  elements.symmetryPanel.addEventListener('click', (e) => e.stopPropagation());

  elements.symmetryModeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      state.symmetry.setMode(mode);
      elements.symmetryModeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      elements.radialRayCountContainer.classList.toggle('hidden', mode !== 'radial');
      elements.symmetryBtn.classList.toggle('active', state.symmetry.isActive());
      elements.symmetryPanel.classList.add('hidden');
      saveSettings();
      updateStatusBar(`Symmetry: ${mode === 'off' ? 'Guide only' : mode.charAt(0).toUpperCase() + mode.slice(1)}`);
    });
  });

  elements.radialRayCountInput.addEventListener('input', (e) => {
    state.symmetry.setRays(parseInt(e.target.value, 10));
    saveSettings();
  });

  if (elements.showSymmetryLineCb) {
    elements.showSymmetryLineCb.addEventListener('change', (e) => {
      state.showSymmetryLine = e.target.checked;
      redrawCanvas();
      saveSettings();
    });
  }

  // Tasks
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

  if (elements.tasksDialog) {
    elements.tasksDialog.addEventListener('click', (e) => {
      if (e.target === elements.tasksDialog) {
        elements.tasksDialog.classList.add('hidden');
      }
    });
  }

  // Export
  if (elements.exportBtn) {
    elements.exportBtn.addEventListener('click', exportPanelShow);
  }
  setupExportPanel();

  // Keyboard
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);

  window.addEventListener('focus', () => {
    if (state.altKeyDown) {
      state.altKeyDown = false;
      resetCursor();
    }
  });

  // Timeline
  setupTimelineControls();
}

function toggleMode() {
  if (state.drawingMode === 'grid') {
    state.drawingMode = 'normal';
    elements.modeToggleBtn.classList.remove('active');
    elements.app.classList.remove('mode-grid');
    updateToolsForMode();
    if (state.previousTool) {
      state.selectionTool = state.previousTool;
      const btn = document.querySelector(`.tool-btn[data-tool="${state.previousTool}"]`);
      if (btn) updateActiveTool(btn);
    }
    updateStatusBar('Mode: Normal');
  } else {
    state.drawingMode = 'grid';
    elements.modeToggleBtn.classList.add('active');
    elements.app.classList.add('mode-grid');
    state.previousTool = state.selectionTool;
    state.selectionTool = 'grid-draw';
    const gridDrawBtn = document.querySelector('.tool-btn[data-tool="grid-draw"]');
    if (gridDrawBtn) updateActiveTool(gridDrawBtn);
    state.showGrid = true;
    document.getElementById('gridBtn').setAttribute('data-active', 'true');
    document.getElementById('gridBtn').classList.add('active');
    updateToolsForMode();
    updateStatusBar('Mode: Grid');
  }
  redrawCanvas();
}

function updateUndoRedoUI() {
  const toolBtn = document.querySelector(`.tool-btn[data-tool="${state.selectionTool}"]`);
  if (toolBtn) {
    updateActiveTool(toolBtn);
  }
  updateCursorForTool(state.selectionTool);
}

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

function setupTimelineControls() {
  setTimeout(() => {
    const timelinePlayBtn = document.getElementById('timelinePlayBtn');
    const timelineSpeedBtn = document.getElementById('timelineSpeedBtn');
    const timelineSlider = document.getElementById('timelineSlider');
    
    if (!document.getElementById('timelineControls')) return;

    updateTimelineUI();

    timelinePlayBtn?.addEventListener('click', togglePlayback);
    timelineSpeedBtn?.addEventListener('click', cyclePlaybackSpeed);

    timelineSlider?.addEventListener('input', (e) => {
      const frame = parseInt(e.target.value, 10);
      if (getPlaybackState().isPlaying) stopPlayback();
      scrubToFrame(frame - 1);
      updateTimelineUI();
      updateCursorForTool(state.selectionTool);
    });

    timelineSlider?.addEventListener('mousedown', () => {
      if (getPlaybackState().isPlaying) stopPlayback();
    });
  }, 0);
}

function updateTimelineUI() {
  const timelineSlider = document.getElementById('timelineSlider');
  const timelineFrame = document.getElementById('timelineFrame');
  const timelinePlayBtn = document.getElementById('timelinePlayBtn');
  const timelineSpeedBtn = document.getElementById('timelineSpeedBtn');

  const playbackState = getPlaybackState();
  const totalFrames = getHistoryLength();
  const currentFrame = state.currentHistoryIndex + 1;

  if (timelineSlider) {
    timelineSlider.max = Math.max(0, totalFrames);
    timelineSlider.value = currentFrame;
  }

  if (timelineFrame) {
    timelineFrame.textContent = `${currentFrame}/${totalFrames}`;
  }

  if (timelinePlayBtn) {
    timelinePlayBtn.textContent = playbackState.isPlaying ? '⏸' : '▶';
    timelinePlayBtn.classList.toggle('playing', playbackState.isPlaying);
  }

  if (timelineSpeedBtn) {
    timelineSpeedBtn.textContent = playbackState.speed + 'x';
  }
}

function togglePlayback() {
  const playbackState = getPlaybackState();
  if (playbackState.isPlaying) {
    pausePlayback();
  } else {
    if (playbackState.currentFrame >= playbackState.totalFrames) {
      state.currentHistoryIndex = -1;
      updateTimelineUI();
    }
    startPlayback(updateTimelineUI);
  }
  updateTimelineUI();
  updateCursorForTool(state.selectionTool);
}

function cyclePlaybackSpeed() {
  const speeds = [0.25, 0.5, 1, 2, 4];
  const currentState = getPlaybackState();
  const currentIndex = speeds.indexOf(currentState.speed);
  const nextIndex = (currentIndex + 1) % speeds.length;
  setPlaybackSpeed(speeds[nextIndex]);
  updateTimelineUI();
}

function handleFileUpload(e) {
  const files = e.target.files;
  if (files.length > 0) {
    uploadImages(files);
  }
}

function uploadImages(files) {
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        state.images.push({
          src: e.target.result,
          x: 0,
          y: 0,
          width: img.width,
          height: img.height,
          rotation: 0
        });
        saveState();
        redrawCanvas();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function loadTasksFile() {
  fetch('сделать.txt')
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

// Setup UI
function setupUI() {
  const activeToolBtn = document.querySelector('.tool-btn.active');
  if (activeToolBtn) updateActiveTool(activeToolBtn);

  if (elements.showSymmetryLineCb) {
    elements.showSymmetryLineCb.checked = state.showSymmetryLine;
  }

  if (elements.gridSizeInputTop) {
    elements.gridSizeInputTop.value = state.gridSize;
    if (elements.gridSizeValueTop) {
      elements.gridSizeValueTop.textContent = state.gridSize;
    }
  }

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

  elements.brushColorPicker.oncontextmenu = () => false;
  elements.gridColorPicker.oncontextmenu = () => false;
  elements.backgroundColorPicker.oncontextmenu = () => false;
}

// Make functions globally available
window.redrawCanvas = redrawCanvas;
window.updateUndoRedoUI = updateUndoRedoUI;
window.saveState = saveState;
window.updateTimelineUI = updateTimelineUI;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);
