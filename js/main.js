import { state, elements, initializeElements } from './state.js';
import { redrawCanvas, setupCanvas, zoom, clearCanvas } from './canvas.js';
import { updateActiveTool, updateStatusBar, toggleGrid, showDevTools, initTooltips } from './ui.js';

import { floodFill } from './fill.js';
import { initCursors, setPipetteCursor, setPencilCursor, setEraserCursor, resetCursor } from './cursors.js';
import { getPathBoundingBox, doRectanglesIntersect, getCellsBetweenPoints } from './geometry.js';
import { undo, redo, saveState, startPlayback, stopPlayback, pausePlayback, resumePlayback, setPlaybackSpeed, scrubToFrame, getPlaybackState, getHistoryLength } from './history.js';
import { scaleBy2x } from './upscale.js';
import { initTasks } from './tasks.js';
import { setupExportPanel } from './export.js';
import { createTopToolbar } from './buttons-top.js';
import { createLeftToolbar } from './buttons-left.js';
import { createRightToolbar } from './buttons-right.js';
import { createTimelineControls } from './buttons-timeline.js';
import { uploadImages, getImageFromData, getImageAtPosition, isOnResizeHandle, isOnRotationHandle, startSelection, updateSelection, updateImageSelectionRect } from './image-utils.js';
import { clearAllContent, updateCursorForTool } from './canvas-tools.js';
import { handleCanvasMouseDown, handleCanvasMouseMove } from './mouse-handlers.js';

// --- Functions that were in script.js ---

// Initialize the application
function init() {
  // Create UI buttons from JS modules (instead of HTML)
  createTopToolbar();
  createLeftToolbar();
  createRightToolbar();
  createTimelineControls();

  initializeElements();
  setupCanvas();
  initCursors();

  // Re-query toolButtons after dynamic buttons are created
  elements.toolButtons = document.querySelectorAll('.tool-btn');

  // Init tooltips after all buttons are created (including dynamic ones)
  initTooltips();

  // Keep view at origin (0,0) with zoom 1 by default
  state.panOffset.x = 0;
  state.panOffset.y = 0;
  state.zoomLevel = 1;

  // Set initial mode BEFORE loadState (so loadState can override if needed)
  state.drawingMode = 'grid';
  state.selectionTool = 'grid-draw';
  state.showGrid = true;

  // Load settings (lightweight, always)
  loadSettings();

  // Check if this is first launch (no saved state)
  const isFirstLaunch = !localStorage.getItem('vibeDrawingState');

  // Load saved state (may override some settings)
  loadState();

  // On first launch, ensure zoom=1 and pan at origin (1 grid cell = 1 pixel)
  if (isFirstLaunch) {
    state.zoomLevel = 1;
    state.panOffset.x = 0;
    state.panOffset.y = 0;
  }

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

  // Initialize modules
  initTasks();
  setupExportPanel();

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
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      undo();
      updateStatusBar('Undo');
    });
  }
  if (redoBtn) {
    redoBtn.addEventListener('click', () => {
      redo();
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
    // Update the first swatch to show the new color and make it active
    const swatches = elements.colorPalette.querySelectorAll('.color-swatch');
    swatches.forEach(btn => btn.classList.remove('active'));
    if (swatches.length > 0) {
      swatches[0].style.backgroundColor = e.target.value;
      swatches[0].dataset.color = e.target.value;
      swatches[0].classList.add('active');
    }
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
      // Update native color picker to match swatch
      elements.brushColorPicker.value = color;

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

  // Export button
  if (elements.exportBtn) {
    elements.exportBtn.addEventListener('click', () => {
      const exportPanel = document.getElementById('export-panel');
      if (exportPanel) {
        exportPanel.classList.toggle('hidden');
      }
    });
  }

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

    // Ensure play icon is visible initially
    const playIcon = timelinePlayBtn?.querySelector('.play-icon');
    const pauseIcons = timelinePlayBtn?.querySelectorAll('.pause-icon');
    if (playIcon && pauseIcons?.length) {
      playIcon.style.display = 'block';
      pauseIcons.forEach(icon => { icon.style.display = 'none'; });
    }

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
      } else if (frame <= state.undoStack.length) {
        const frameState = state.undoStack[frame - 1];
        if (frameState) {
          state.images = JSON.parse(JSON.stringify(frameState.images));
          state.drawingPaths = JSON.parse(JSON.stringify(frameState.drawingPaths));
          state.gridCells = JSON.parse(JSON.stringify(frameState.gridCells));
          state.selectedImage = frameState.selectedImage;
          state.selectedObjects = JSON.parse(JSON.stringify(frameState.selectedObjects));
          // Don't restore zoom/pan - keep user's current view
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

  // Update undo/redo count badges
  const undoCount = document.getElementById('undoCount');
  const redoCount = document.getElementById('redoCount');
  if (undoCount) undoCount.textContent = state.currentHistoryIndex + 1;
  if (redoCount) redoCount.textContent = state.redoStack.length;
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
    const isPlaying = getPlaybackState().isPlaying;
    timelinePlayBtn.classList.toggle('playing', isPlaying);

    // Toggle play/pause icons
    const playIcon = timelinePlayBtn.querySelector('.play-icon');
    const pauseIcons = timelinePlayBtn.querySelectorAll('.pause-icon');
    if (playIcon && pauseIcons.length) {
      playIcon.style.display = isPlaying ? 'none' : 'block';
      pauseIcons.forEach(icon => {
        icon.style.display = isPlaying ? 'block' : 'none';
      });
    }
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

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', init);



