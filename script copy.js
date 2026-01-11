/**
 * Vibe Drawing - Complete Implementation
 * A canvas-based drawing/editing application with image management and manipulation
 */

// Global state
const state = {
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
  selectionTool: 'select',
  zoomLevel: 1,
  panOffset: { x: 0, y: 0 },
  isPanning: false,
  panStart: { x: 0, y: 0 },
  activeLayer: 0,
  layers: [{ name: 'Layer 1', visible: true }],
  undoStack: [],
  redoStack: [],
  isDrawing: false,
  drawingPaths: [],
  currentPath: [],
  drawingColor: '#5a9fd4',
  drawingSize: 3,
  eraserSize: 20,
  showGrid: true,
  gridSize: 50,
  gridColor: '#eeeeee'
};

// DOM Elements
const elements = {
  canvas: document.getElementById('drawingCanvas'),
  fileInput: document.getElementById('fileInput'),
  dropZone: document.getElementById('dropZone'),
  toolbar: document.getElementById('toolbar'),
  statusBar: document.getElementById('statusBar'),
  zoomInBtn: document.getElementById('zoomInBtn'),
  zoomOutBtn: document.getElementById('zoomOutBtn'),
  zoomResetBtn: document.getElementById('fitBtn'),
  toolButtons: document.querySelectorAll('.tool-btn'),
  layerList: document.getElementById('layersList'),
  addLayerBtn: document.getElementById('addLayerBtn'),
  saveBtn: document.getElementById('saveBtn'),
  loadBtn: document.getElementById('loadBtn'),
  uploadBtn: document.getElementById('uploadBtn'),
  zoomLevelDisplay: document.getElementById('zoomLevel'),
  toolStatus: document.getElementById('toolStatus'),
  posStatus: document.getElementById('posStatus')
};

// Initialize the application
function init() {
  setupCanvas();
  setupEventListeners();
  setupUI();
  loadState();
  updateStatusBar('Ready');
}

// Setup canvas
function setupCanvas() {
  state.canvas = elements.canvas;
  state.ctx = state.canvas.getContext('2d');

  // Set initial canvas size
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

// Resize canvas to fit window
function resizeCanvas() {
  const container = document.querySelector('.canvas-container');
  state.canvas.width = container.clientWidth;
  state.canvas.height = container.clientHeight;
  redrawCanvas();
}

// Setup event listeners
function setupEventListeners() {
  // Canvas events
  elements.canvas.addEventListener('mousedown', handleCanvasMouseDown);
  elements.canvas.addEventListener('mousemove', handleCanvasMouseMove);
  elements.canvas.addEventListener('mouseup', handleCanvasMouseUp);
  elements.canvas.addEventListener('mouseleave', handleCanvasMouseUp);
  elements.canvas.addEventListener('wheel', handleCanvasWheel, { passive: false });

  // File input
  elements.fileInput.addEventListener('change', handleFileUpload);

  // Upload button
  elements.uploadBtn.addEventListener('click', () => elements.fileInput.click());

  // Drop zone
  elements.dropZone.addEventListener('dragover', handleDragOver);
  elements.dropZone.addEventListener('drop', handleDrop);
  elements.dropZone.addEventListener('dragleave', handleDragLeave);

  // Toolbar buttons
  elements.zoomInBtn.addEventListener('click', () => zoom(1.2));
  elements.zoomOutBtn.addEventListener('click', () => zoom(0.8));
  elements.zoomResetBtn.addEventListener('click', () => zoom(1));
  elements.addLayerBtn.addEventListener('click', addLayer);
  elements.saveBtn.addEventListener('click', saveState);
  elements.loadBtn.addEventListener('click', loadState);

  // Grid toggle button
  const gridBtn = document.getElementById('gridBtn');
  if (gridBtn) {
    gridBtn.addEventListener('click', toggleGrid);
  }

  // Developer tools button
  const devToolsBtn = document.getElementById('devToolsBtn');
  if (devToolsBtn) {
    devToolsBtn.addEventListener('click', showDevTools);
  }

  // Tool buttons
  elements.toolButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectionTool = btn.dataset.tool;
      updateActiveTool(btn);
      updateStatusBar(`Tool: ${btn.dataset.tool}`);
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

// Setup UI
function setupUI() {
  updateLayerList();
  updateActiveTool(document.querySelector('.tool-btn.active'));
}

// Handle canvas mouse down
function handleCanvasMouseDown(e) {
  const pos = getMousePosition(e);
  console.log(`Mouse down at ${pos.x}, ${pos.y} with tool: ${state.selectionTool}`);

  // Handle drawing tools
  if (state.selectionTool === 'pencil' || state.selectionTool === 'eraser') {
    console.log(`Starting drawing with ${state.selectionTool}`);
    state.isDrawing = true;
    state.currentPath = [{
      x: pos.x,
      y: pos.y,
      size: state.selectionTool === 'pencil' ? state.drawingSize : state.eraserSize,
      color: state.selectionTool === 'pencil' ? state.drawingColor : '#2d2d2d'
    }];
    redrawCanvas();
    return;
  }

  // Check if we're clicking on an image
  const clickedImage = getImageAtPosition(pos.x, pos.y);

  if (clickedImage) {
    state.selectedImage = clickedImage;

    // Check if we're clicking on a resize handle
    if (isOnResizeHandle(pos, clickedImage)) {
      state.isResizing = true;
      state.resizeStart = {
        x: pos.x,
        y: pos.y,
        width: clickedImage.width,
        height: clickedImage.height
      };
    }
    // Check if we're clicking on rotation handle
    else if (isOnRotationHandle(pos, clickedImage)) {
      state.isRotating = true;
      state.rotateStart = {
        angle: clickedImage.rotation,
        x: pos.x,
        y: pos.y
      };
    }
    // Otherwise start dragging
    else {
      state.isDragging = true;
      state.dragStart = {
        x: pos.x - clickedImage.x,
        y: pos.y - clickedImage.y
      };
    }
  }
  // Start selection
  else {
    startSelection(pos);
  }

  // Start panning if middle mouse button
  if (e.button === 1) {
    state.isPanning = true;
    state.panStart = {
      x: e.clientX,
      y: e.clientY
    };
  }
}

// Handle canvas mouse move
function handleCanvasMouseMove(e) {
  const pos = getMousePosition(e);

  // Handle drawing
  if (state.isDrawing) {
    state.currentPath.push({
      x: pos.x,
      y: pos.y,
      size: state.selectionTool === 'pencil' ? state.drawingSize : state.eraserSize,
      color: state.selectionTool === 'pencil' ? state.drawingColor : '#2d2d2d'
    });
    redrawCanvas();
    return;
  }

  if (state.isDragging && state.selectedImage) {
    // Move selected image
    state.selectedImage.x = pos.x - state.dragStart.x;
    state.selectedImage.y = pos.y - state.dragStart.y;
    redrawCanvas();
  }
  else if (state.isResizing && state.selectedImage) {
    // Resize selected image
    const dx = pos.x - state.resizeStart.x;
    const dy = pos.y - state.resizeStart.y;

    // Maintain aspect ratio if shift is pressed
    if (e.shiftKey) {
      const aspectRatio = state.resizeStart.height / state.resizeStart.width;
      state.selectedImage.width = Math.max(20, state.resizeStart.width + dx);
      state.selectedImage.height = state.selectedImage.width * aspectRatio;
    } else {
      state.selectedImage.width = Math.max(20, state.resizeStart.width + dx);
      state.selectedImage.height = Math.max(20, state.resizeStart.height + dy);
    }

    redrawCanvas();
  }
  else if (state.isRotating && state.selectedImage) {
    // Rotate selected image
    const centerX = state.selectedImage.x + state.selectedImage.width / 2;
    const centerY = state.selectedImage.y + state.selectedImage.height / 2;
    const angle = Math.atan2(pos.y - centerY, pos.x - centerX);
    state.selectedImage.rotation = angle;
    redrawCanvas();
  }
  else if (state.isPanning) {
    // Pan the canvas
    const dx = e.clientX - state.panStart.x;
    const dy = e.clientY - state.panStart.y;
    state.panOffset.x += dx;
    state.panOffset.y += dy;
    state.panStart = { x: e.clientX, y: e.clientY };
    redrawCanvas();
  }
  else if (state.isSelecting) {
    // Update selection
    updateSelection(pos);
  }
}

// Handle canvas mouse up
function handleCanvasMouseUp(e) {
  if (state.isDragging || state.isResizing || state.isRotating) {
    saveStateToUndoStack();
  }

  // Handle drawing completion
  if (state.isDrawing) {
    state.isDrawing = false;
    if (state.currentPath.length > 1) {
      state.drawingPaths.push(state.currentPath);
      saveStateToUndoStack();
    }
    state.currentPath = [];
  }

  state.isDragging = false;
  state.isResizing = false;
  state.isRotating = false;
  state.isPanning = false;
  state.isSelecting = false;
}

// Handle canvas wheel (zoom)
function handleCanvasWheel(e) {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  zoom(delta);
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
  elements.dropZone.classList.add('drag-over');
}

// Handle drop
function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  elements.dropZone.classList.remove('drag-over');

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    uploadImages(files);
  }
}

// Handle drag leave
function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  elements.dropZone.classList.remove('drag-over');
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

// Start selection
function startSelection(pos) {
  state.isSelecting = true;
  state.selectionStart = pos;
  state.selectionEnd = pos;
}

// Update selection
function updateSelection(pos) {
  state.selectionEnd = pos;
  redrawCanvas();
}

// Get mouse position relative to canvas
function getMousePosition(e) {
  const rect = elements.canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left - state.panOffset.x) / state.zoomLevel,
    y: (e.clientY - rect.top - state.panOffset.y) / state.zoomLevel
  };
}

// Get image at position
function getImageAtPosition(x, y) {
  for (let i = state.images.length - 1; i >= 0; i--) {
    const img = state.images[i];
    if (img.layer !== state.activeLayer) continue;

    // Check if point is within image bounds
    if (x >= img.x && x <= img.x + img.width &&
        y >= img.y && y <= img.y + img.height) {
      return img;
    }
  }
  return null;
}

// Check if position is on resize handle
function isOnResizeHandle(pos, img) {
  const handleSize = 10;
  const right = img.x + img.width;
  const bottom = img.y + img.height;

  // Check bottom-right corner
  return (pos.x >= right - handleSize && pos.x <= right + handleSize &&
          pos.y >= bottom - handleSize && pos.y <= bottom + handleSize);
}

// Check if position is on rotation handle
function isOnRotationHandle(pos, img) {
  const handleSize = 15;
  const centerX = img.x + img.width / 2;
  const centerY = img.y - 20; // Above the image

  return (pos.x >= centerX - handleSize && pos.x <= centerX + handleSize &&
          pos.y >= centerY - handleSize && pos.y <= centerY + handleSize);
}

// Zoom function
function zoom(factor) {
  const oldZoom = state.zoomLevel;
  state.zoomLevel = Math.max(0.1, Math.min(10, state.zoomLevel * factor));

  // Adjust pan offset to zoom around center
  const rect = elements.canvas.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  state.panOffset.x = centerX - (centerX - state.panOffset.x) * (state.zoomLevel / oldZoom);
  state.panOffset.y = centerY - (centerY - state.panOffset.y) * (state.zoomLevel / oldZoom);

  redrawCanvas();
  updateStatusBar(`Zoom: ${Math.round(state.zoomLevel * 100)}%`);
}

// Add new layer
function addLayer() {
  const layerName = `Layer ${state.layers.length + 1}`;
  state.layers.push({ name: layerName, visible: true });
  state.activeLayer = state.layers.length - 1;
  updateLayerList();
  saveStateToUndoStack();
}

// Update layer list
function updateLayerList() {
  elements.layerList.innerHTML = '';
  state.layers.forEach((layer, index) => {
    const layerItem = document.createElement('div');
    layerItem.className = `layer-item ${index === state.activeLayer ? 'active' : ''}`;
    layerItem.innerHTML = `
      <span>${layer.name}</span>
      <input type="checkbox" ${layer.visible ? 'checked' : ''} data-index="${index}">
    `;
    layerItem.addEventListener('click', () => {
      state.activeLayer = index;
      updateLayerList();
      redrawCanvas();
    });

    const checkbox = layerItem.querySelector('input');
    checkbox.addEventListener('change', (e) => {
      layer.visible = e.target.checked;
      redrawCanvas();
    });

    elements.layerList.appendChild(layerItem);
  });
}

// Save state to local storage
function saveState() {
  const stateToSave = {
    images: state.images,
    layers: state.layers,
    activeLayer: state.activeLayer
  };
  localStorage.setItem('vibeDrawingState', JSON.stringify(stateToSave));
  updateStatusBar('State saved');
}

// Load state from local storage
function loadState() {
  const savedState = localStorage.getItem('vibeDrawingState');
  if (savedState) {
    const parsedState = JSON.parse(savedState);
    state.images = parsedState.images || [];
    state.layers = parsedState.layers || [{ name: 'Layer 1', visible: true }];
    state.activeLayer = parsedState.activeLayer || 0;
    updateLayerList();
    redrawCanvas();
    updateStatusBar('State loaded');
  }
}

// Export as image
function exportAsImage() {
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');

  // Set canvas size to fit all content
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

  // Draw all images
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

  // Create download link
  const link = document.createElement('a');
  link.download = 'vibe-drawing-export.png';
  link.href = tempCanvas.toDataURL('image/png');
  link.click();
  updateStatusBar('Exported as image');
}

// Get image from data URL
function getImageFromData(src) {
  const img = new Image();
  img.src = src;
  return img;
}

// Save state to undo stack
function saveStateToUndoStack() {
  const stateCopy = JSON.parse(JSON.stringify({
    images: state.images,
    activeLayer: state.activeLayer
  }));
  state.undoStack.push(stateCopy);
  state.redoStack = []; // Clear redo stack on new action

  // Limit undo stack size
  if (state.undoStack.length > 50) {
    state.undoStack.shift();
  }
}

// Redraw entire canvas
function redrawCanvas() {
  // Clear canvas
  state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);

  // Apply zoom and pan
  state.ctx.save();
  state.ctx.translate(state.panOffset.x, state.panOffset.y);
  state.ctx.scale(state.zoomLevel, state.zoomLevel);

  // Draw grid
  drawGrid();

  // Draw all images
  state.images.forEach(img => {
    if (!state.layers[img.layer]?.visible) return;

    state.ctx.save();
    state.ctx.translate(img.x + img.width / 2, img.y + img.height / 2);
    state.ctx.rotate(img.rotation);

    // Draw image
    const imageObj = new Image();
    imageObj.src = img.src;
    state.ctx.drawImage(imageObj, -img.width / 2, -img.height / 2, img.width, img.height);

    // Draw selection if this is the selected image
    if (state.selectedImage === img) {
      drawSelection(img);
    }

    state.ctx.restore();
  });

  // Draw all completed paths
  state.drawingPaths.forEach(path => {
    if (path.length > 1) {
      drawPath(path);
    }
  });

  // Draw current path being drawn
  if (state.currentPath.length > 1) {
    drawPath(state.currentPath);
  }

  // Draw selection rectangle if selecting
  if (state.isSelecting) {
    drawSelectionRectangle();
  }

  state.ctx.restore();
}

// Draw a path
function drawPath(path) {
  state.ctx.beginPath();
  state.ctx.moveTo(path[0].x, path[0].y);

  for (let i = 1; i < path.length; i++) {
    const point = path[i];
    state.ctx.lineTo(point.x, point.y);
  }

  state.ctx.strokeStyle = path[0].color;
  state.ctx.lineWidth = path[0].size;
  state.ctx.lineCap = 'round';
  state.ctx.lineJoin = 'round';
  state.ctx.stroke();
}

// Draw grid
function drawGrid() {
  if (!state.showGrid) return;

  const gridSize = state.gridSize;
  const gridColor = state.gridColor;

  state.ctx.strokeStyle = gridColor;
  state.ctx.lineWidth = 0.5;

  // Calculate visible area considering zoom and pan
  const visibleWidth = state.canvas.width / state.zoomLevel;
  const visibleHeight = state.canvas.height / state.zoomLevel;
  const startX = -state.panOffset.x / state.zoomLevel;
  const startY = -state.panOffset.y / state.zoomLevel;
  const endX = startX + visibleWidth;
  const endY = startY + visibleHeight;

  // Draw vertical lines - infinite in both directions
  const firstVerticalLine = Math.floor(startX / gridSize) * gridSize;
  const lastVerticalLine = Math.ceil(endX / gridSize) * gridSize;

  for (let x = firstVerticalLine; x <= lastVerticalLine; x += gridSize) {
    state.ctx.beginPath();
    state.ctx.moveTo(x, startY);
    state.ctx.lineTo(x, endY);
    state.ctx.stroke();
  }

  // Draw horizontal lines - infinite in both directions
  const firstHorizontalLine = Math.floor(startY / gridSize) * gridSize;
  const lastHorizontalLine = Math.ceil(endY / gridSize) * gridSize;

  for (let y = firstHorizontalLine; y <= lastHorizontalLine; y += gridSize) {
    state.ctx.beginPath();
    state.ctx.moveTo(startX, y);
    state.ctx.lineTo(endX, y);
    state.ctx.stroke();
  }
}

// Toggle grid visibility
function toggleGrid() {
  state.showGrid = !state.showGrid;
  const gridBtn = document.getElementById('gridBtn');
  if (gridBtn) {
    gridBtn.setAttribute('data-active', state.showGrid);
    if (state.showGrid) {
      gridBtn.classList.add('active');
      updateStatusBar('Grid enabled');
    } else {
      gridBtn.classList.remove('active');
      updateStatusBar('Grid disabled');
    }
  }
  redrawCanvas();
}

// Show developer tools
function showDevTools() {
  // Create or toggle developer tools panel
  let devPanel = document.getElementById('devToolsPanel');
  if (!devPanel) {
    devPanel = document.createElement('div');
    devPanel.id = 'devToolsPanel';
    devPanel.style.position = 'absolute';
    devPanel.style.bottom = '40px';
    devPanel.style.right = '20px';
    devPanel.style.backgroundColor = '#3d3d3d';
    devPanel.style.border = '1px solid #5a9fd4';
    devPanel.style.padding = '15px';
    devPanel.style.borderRadius = '8px';
    devPanel.style.zIndex = '2000';
    devPanel.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
    devPanel.style.maxWidth = '300px';

    // Add developer tools content
    devPanel.innerHTML = `
      <h3 style="margin-top: 0; color: #5a9fd4; border-bottom: 1px solid #4d4d4d; padding-bottom: 10px;">Developer Tools</h3>
      <div style="margin-top: 10px;">
        <p><strong>State:</strong></p>
        <p>Images: ${state.images.length}</p>
        <p>Drawing paths: ${state.drawingPaths.length}</p>
        <p>Layers: ${state.layers.length}</p>
        <p>Active layer: ${state.activeLayer + 1}</p>
        <p>Zoom: ${Math.round(state.zoomLevel * 100)}%</p>
        <p>Pan: X: ${Math.round(state.panOffset.x)}, Y: ${Math.round(state.panOffset.y)}</p>
        <p>Grid: ${state.showGrid ? 'Visible' : 'Hidden'}</p>
        <p>Current tool: ${state.selectionTool}</p>
      </div>
      <div style="margin-top: 15px;">
        <button id="closeDevTools" style="padding: 8px 12px; background-color: #5a9fd4; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
        <button id="exportState" style="padding: 8px 12px; background-color: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 8px;">Export State</button>
      </div>
    `;

    document.getElementById('app').appendChild(devPanel);

    // Add event listeners for dev panel buttons
    document.getElementById('closeDevTools').addEventListener('click', () => {
      document.getElementById('app').removeChild(devPanel);
    });

    document.getElementById('exportState').addEventListener('click', () => {
      const stateData = {
        images: state.images,
        drawingPaths: state.drawingPaths,
        layers: state.layers,
        activeLayer: state.activeLayer,
        zoomLevel: state.zoomLevel,
        panOffset: state.panOffset,
        showGrid: state.showGrid
      };

      const dataStr = JSON.stringify(stateData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

      const exportLink = document.createElement('a');
      exportLink.setAttribute('href', dataUri);
      exportLink.setAttribute('download', 'vibe-drawing-state.json');
      document.body.appendChild(exportLink);
      exportLink.click();
      document.body.removeChild(exportLink);

      updateStatusBar('State exported to JSON');
    });
  } else {
    // Toggle visibility if panel already exists
    if (devPanel.style.display === 'none') {
      devPanel.style.display = 'block';
    } else {
      devPanel.style.display = 'none';
    }
  }
}

// Draw selection rectangle
function drawSelectionRectangle() {
  const start = state.selectionStart;
  const end = state.selectionEnd;

  state.ctx.strokeStyle = '#0095ff';
  state.ctx.lineWidth = 1;
  state.ctx.setLineDash([5, 5]);

  state.ctx.beginPath();
  state.ctx.rect(
    Math.min(start.x, end.x),
    Math.min(start.y, end.y),
    Math.abs(end.x - start.x),
    Math.abs(end.y - start.y)
  );
  state.ctx.stroke();
  state.ctx.setLineDash([]);
}

// Draw selection handles for selected image
function drawSelection(img) {
  // Draw border
  state.ctx.strokeStyle = '#0095ff';
  state.ctx.lineWidth = 2;
  state.ctx.setLineDash([5, 5]);
  state.ctx.strokeRect(-img.width / 2, -img.height / 2, img.width, img.height);
  state.ctx.setLineDash([]);

  // Draw resize handle (bottom-right)
  const handleSize = 10;
  state.ctx.fillStyle = '#0095ff';
  state.ctx.fillRect(
    img.width / 2 - handleSize / 2,
    img.height / 2 - handleSize / 2,
    handleSize,
    handleSize
  );

  // Draw rotation handle (top-center)
  state.ctx.fillStyle = '#ff0095';
  state.ctx.beginPath();
  state.ctx.arc(0, -img.height / 2 - 20, 8, 0, Math.PI * 2);
  state.ctx.fill();
}

// Update active tool
function updateActiveTool(activeBtn) {
  elements.toolButtons.forEach(btn => btn.classList.remove('active'));
  activeBtn.classList.add('active');
}

// Update status bar
function updateStatusBar(message) {
  elements.statusBar.textContent = message;
}

// Handle keyboard shortcuts
function handleKeyDown(e) {
  // Delete selected image
  if (e.key === 'Delete' && state.selectedImage) {
    state.images = state.images.filter(img => img !== state.selectedImage);
    state.selectedImage = null;
    saveStateToUndoStack();
    redrawCanvas();
    updateStatusBar('Image deleted');
  }

  // Undo
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    undo();
  }

  // Redo
  if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
    redo();
  }
}

// Undo functionality
function undo() {
  if (state.undoStack.length > 0) {
    const currentState = {
      images: state.images,
      activeLayer: state.activeLayer
    };
    state.redoStack.push(currentState);

    const previousState = state.undoStack.pop();
    state.images = previousState.images;
    state.activeLayer = previousState.activeLayer;

    redrawCanvas();
    updateStatusBar('Undo');
  }
}

// Redo functionality
function redo() {
  if (state.redoStack.length > 0) {
    const currentState = {
      images: state.images,
      activeLayer: state.activeLayer
    };
    state.undoStack.push(currentState);

    const nextState = state.redoStack.pop();
    state.images = nextState.images;
    state.activeLayer = nextState.activeLayer;

    redrawCanvas();
    updateStatusBar('Redo');
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);