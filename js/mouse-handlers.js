import { state, elements } from './state.js';
import { redrawCanvas } from './canvas.js';
import { updateActiveTool, updateStatusBar } from './ui.js';
import { floodFill } from './fill.js';
import { setPencilCursor, setEraserCursor, setPipetteCursor, setGridDrawCursor, resetCursor } from './cursors.js';
import { getPathBoundingBox, doRectanglesIntersect, getCellsBetweenPoints } from './geometry.js';
import { saveState } from './history.js';
import { getImageAtPosition, isOnResizeHandle, isOnRotationHandle, getGridCellKey, buildGridCellsSet } from './image-utils.js';
import { updateCursorForTool } from './canvas-tools.js';

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

export function handleCanvasMouseDown(e) {
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

export function handleCanvasMouseMove(e) {
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

// MOUSE POSITION
function getMousePosition(e) {
  const rect = elements.canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left - state.panOffset.x) / state.zoomLevel,
    y: (e.clientY - rect.top - state.panOffset.y) / state.zoomLevel
  };
}

function floodErase(x, y) {
  // For now, just call floodFill with background color
  floodFill(x, y, state.backgroundColor);
}
