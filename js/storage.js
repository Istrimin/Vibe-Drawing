import { state, elements } from './state.js';
import { redrawCanvas, invalidateGridCellsCache } from './canvas.js';

export function saveSettings() {
  const settings = {
    gridSize: state.gridSize,
    gridType: state.gridType,
    gridColor: state.gridColor,
    backgroundColor: state.backgroundColor,
    showGrid: state.showGrid,
    symmetryMode: state.symmetry.mode,
    radialRays: state.symmetry.radialRays,
    showSymmetryLine: state.showSymmetryLine,
    drawingMode: state.drawingMode,
    autoSaveEnabled: state.autoSaveEnabled
  };
  localStorage.setItem('vibeDrawingSettings', JSON.stringify(settings));
}

export function loadSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem('vibeDrawingSettings'));
    if (settings) {
      state.gridSize = settings.gridSize || 50;
      state.gridType = settings.gridType || 'square';
      state.gridColor = settings.gridColor || '#006400';
      state.backgroundColor = settings.backgroundColor || '#2d2d2d';
      state.showGrid = settings.showGrid !== undefined ? settings.showGrid : true;
      state.showSymmetryLine = settings.showSymmetryLine !== undefined ? settings.showSymmetryLine : true;
      state.drawingMode = settings.drawingMode || 'grid';
      state.autoSaveEnabled = settings.autoSaveEnabled || false;

      if (settings.symmetryMode) {
        state.symmetry.mode = settings.symmetryMode;
      }
      if (settings.radialRays) {
        state.symmetry.radialRays = settings.radialRays;
      }
    }
  } catch (e) {
    console.warn('Failed to load settings:', e);
  }
}

export function saveProjectState(silent = false) {
  const projectState = {
    images: state.images,
    drawingPaths: state.drawingPaths,
    gridCells: state.gridCells,
    selectedImage: state.selectedImage,
    selectedObjects: state.selectedObjects,
    zoomLevel: state.zoomLevel,
    panOffset: state.panOffset,
    selectionTool: state.selectionTool,
    drawingColor: state.drawingColor,
    drawingSize: state.drawingSize,
    eraserSize: state.eraserSize,
    gridSize: state.gridSize,
    gridColor: state.gridColor,
    backgroundColor: state.backgroundColor,
    showGrid: state.showGrid,
    symmetryMode: state.symmetry.mode,
    radialRays: state.symmetry.radialRays,
    showSymmetryLine: state.showSymmetryLine,
    drawingMode: state.drawingMode,
    gridBrushSize: state.gridBrushSize,
    gridEraserSize: state.gridEraserSize
  };

  localStorage.setItem('vibeDrawingState', JSON.stringify(projectState));

  if (!silent) {
    if (elements.statusBar) {
      elements.statusBar.textContent = 'Project saved';
    }
  }
}

export function loadState() {
  try {
    const savedState = JSON.parse(localStorage.getItem('vibeDrawingState'));
    if (savedState) {
      state.images = savedState.images || [];
      state.drawingPaths = savedState.drawingPaths || [];
      state.gridCells = savedState.gridCells || [];
      invalidateGridCellsCache();
      state.selectedImage = savedState.selectedImage || null;
      state.selectedObjects = savedState.selectedObjects || [];
      state.zoomLevel = savedState.zoomLevel || 1;
      state.panOffset = savedState.panOffset || { x: 0, y: 0 };
      state.selectionTool = savedState.selectionTool || 'pencil';
      state.drawingColor = savedState.drawingColor || '#ffffff';
      state.drawingSize = savedState.drawingSize || 3;
      state.eraserSize = savedState.eraserSize || 20;
      state.gridSize = savedState.gridSize || 50;
      state.gridColor = savedState.gridColor || '#006400';
      state.backgroundColor = savedState.backgroundColor || '#2d2d2d';
      state.showGrid = savedState.showGrid !== undefined ? savedState.showGrid : true;
      state.symmetry.mode = savedState.symmetryMode || 'off';
      state.symmetry.radialRays = savedState.radialRays || 8;
      state.showSymmetryLine = savedState.showSymmetryLine !== undefined ? savedState.showSymmetryLine : true;
      state.drawingMode = savedState.drawingMode || 'grid';
      state.gridBrushSize = savedState.gridBrushSize || 1;
      state.gridEraserSize = savedState.gridEraserSize || 1;

      // Update UI elements
      if (elements.brushColorPicker) {
        elements.brushColorPicker.value = state.drawingColor;
      }
      if (elements.gridColorPicker) {
        elements.gridColorPicker.value = state.gridColor;
      }
      if (elements.backgroundColorPicker) {
        elements.backgroundColorPicker.value = state.backgroundColor;
      }
      if (elements.brushSizeSlider) {
        elements.brushSizeSlider.value = state.drawingSize;
        if (elements.brushSizeValue) {
          elements.brushSizeValue.textContent = state.drawingSize;
        }
      }
      if (elements.eraserSizeSlider) {
        elements.eraserSizeSlider.value = state.eraserSize;
        if (elements.eraserSizeValue) {
          elements.eraserSizeValue.textContent = state.eraserSize;
        }
      }
      if (elements.gridBrushSizeSlider) {
        elements.gridBrushSizeSlider.value = state.gridBrushSize;
        if (elements.gridBrushSizeValue) {
          elements.gridBrushSizeValue.textContent = state.gridBrushSize;
        }
      }

      redrawCanvas();
    }
  } catch (e) {
    console.warn('Failed to load state:', e);
  }
}

export function updateAutoSave() {
  // Clear existing interval
  if (state.autoSaveInterval) {
    clearInterval(state.autoSaveInterval);
  }

  // Set up new interval if auto-save is enabled
  if (state.autoSaveEnabled) {
    state.autoSaveInterval = setInterval(() => {
      saveProjectState(true); // Silent save
    }, 60000); // Save every minute
  }
}
