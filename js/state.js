import { Symmetry } from './symmetry.js';

// Global state
export const state = {
  canvas: null,
  ctx: null,
  images: [],
  selectedImage: null,
  isDragging: false,
  isResizing: false,
  isRotating: false,
  dragStart: { x: 0, y: 0 },
  resizeStart: { x: 0, y: 0, width: 0, height: 0 },
  rotateStart: { angle: 0, x: 0, y: 0 },
  selectionTool: 'pencil',
  zoomLevel: 1,
  panOffset: { x: 0, y: 0 },
  isPanning: false,
  panStart: { x: 0, y: 0 },
  undoStack: [],
  redoStack: [],
  currentHistoryIndex: -1,
  isDrawing: false,
  drawingPaths: [],
  currentPath: [],
  drawingColor: '#ffffff',
  drawingSize: 3,
  eraserSize: 20,
  showGrid: true,
  gridSize: 50,
  gridType: 'square',
  gridColor: '#006400',
  backgroundColor: '#2d2d2d',
  spacebarDown: false,
  altKeyDown: false,
  previousTool: 'pencil',
  symmetry: new Symmetry(),
  isRightClickErasing: false,
  gridCells: [],
  lastGridCell: { x: null, y: null },
  lastGridMousePos: { x: null, y: null },
  selectionPath: [],
  selectedObjects: [],
  isMovingSelection: false,
  ghostOffset: { x: 0, y: 0 },
  isGhostVisible: false,
  gridTransformationMode: 'permanent', // 'permanent' or 'visual-only'
  showSymmetryLine: true,
  isCopying: false,
  gridBrushSize: 1,
  gridEraserSize: 1,
  gridUpscale: 1, // 1 = normal, 2 = 2x upscaled
  drawingMode: 'grid', // 'grid' or 'normal'
  // Timeline / Playback
  isPlaying: false,
  playbackSpeed: 1, // 0.25, 0.5, 1, 2, 4
  playbackInterval: null,
  currentTimelineFrame: 0
};

// DOM Elements - will be initialized after DOM is ready
export const elements = {};

// Initialize DOM elements after DOM is ready
export function initializeElements() {
  elements.canvas = document.getElementById('drawingCanvas');
  elements.fileInput = document.getElementById('fileInput');
  elements.statusBar = document.getElementById('statusBar');
  elements.zoomInBtn = document.getElementById('zoomInBtn');
  elements.zoomOutBtn = document.getElementById('zoomOutBtn');
  elements.zoomResetBtn = document.getElementById('fitBtn');
  elements.toolButtons = document.querySelectorAll('.tool-btn');
  elements.clearCanvasBtn = document.getElementById('clearCanvasBtn');
  elements.saveBtn = document.getElementById('saveBtn');

  elements.loadBtn = document.getElementById('loadBtn');
  elements.uploadBtn = document.getElementById('uploadBtn');
  elements.zoomLevelDisplay = document.getElementById('zoomLevel');
  elements.toolStatus = document.getElementById('toolStatus');
  elements.posStatus = document.getElementById('posStatus');
  elements.gridColorPicker = document.getElementById('gridColorPicker');
  elements.gridSizeInput = document.getElementById('gridSizeInput');
  elements.backgroundColorPicker = document.getElementById('backgroundColorPicker');
  elements.brushSizeSlider = document.getElementById('brushSizeSlider');
  elements.brushSizeValue = document.getElementById('brushSizeValue');
  elements.brushColorPicker = document.getElementById('brushColorPicker');
  elements.swatchColorPicker = document.getElementById('swatchColorPicker');
  elements.eraserSizeSlider = document.getElementById('eraserSizeSlider');
  elements.eraserSizeValue = document.getElementById('eraserSizeValue');
  elements.gridBrushSizeSlider = document.getElementById('gridBrushSizeSlider');
  elements.gridBrushSizeValue = document.getElementById('gridBrushSizeValue');
  elements.rightGridBrushSlider = document.getElementById('rightGridBrushSlider');
  elements.rightGridBrushValue = document.getElementById('rightGridBrushValue');
  elements.gridUpscaleSelect = document.getElementById('gridUpscaleSelect');
  elements.modeToggleBtn = document.getElementById('modeToggleBtn');
  elements.symmetryBtn = document.getElementById('symmetryBtn');
  elements.gridTransformBtn = document.getElementById('gridTransformBtn');
  elements.colorPalette = document.getElementById('colorPalette');
  elements.app = document.getElementById('app');
  elements.togglePanelsBtn = document.getElementById('toggle-panels-btn');
  elements.mainMenu = document.getElementById('main-menu');
  elements.toggleTopToolbarCb = document.getElementById('toggle-top-toolbar-cb');

  elements.toggleLeftToolbarCb = document.getElementById('toggle-left-toolbar-cb');
  elements.toggleRightToolbarCb = document.getElementById('toggle-right-toolbar-cb');
  elements.symmetryPanel = document.getElementById('symmetry-panel');

  elements.symmetryModeBtns = document.querySelectorAll('.symmetry-mode-btn');
  elements.radialRayCountContainer = document.getElementById('radial-ray-count-container');
  elements.radialRayCountInput = document.getElementById('radial-ray-count');
  // Timeline elements
  elements.timelineControls = document.getElementById('timelineControls');
  elements.timelinePlayBtn = document.getElementById('timelinePlayBtn');
  elements.timelineSlider = document.getElementById('timelineSlider');
  elements.timelineFrame = document.getElementById('timelineFrame');
  elements.timelineSpeedBtn = document.getElementById('timelineSpeedBtn');
}