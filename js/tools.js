import { state } from './state.js';
import { redrawCanvas, invalidateGridCellsCache, addToSpatialHash, rebuildSpatialHash } from './canvas.js';
import { floodFill, floodErase } from './fill.js';
import { getCellsBetweenPoints } from './geometry.js';
import { saveState } from './history.js';

export function getGridCellKey(x, y) { 
  return x + "," + y; 
}

export function buildGridCellsSet() {
  state._gridCellsSet = new Set(state.gridCells.map(cell => getGridCellKey(cell.x, cell.y)));
  state._gridCellsMap = new Map();
  for (const cell of state.gridCells) {
    const key = getGridCellKey(cell.x, cell.y);
    state._gridCellsMap.set(key, cell);
  }
  invalidateGridCellsCache();
  rebuildSpatialHash();
}

export function getCellByCoords(x, y) {
  if (!state._gridCellsMap) {
    state._gridCellsMap = new Map();
    for (const cell of state.gridCells) {
      state._gridCellsMap.set(getGridCellKey(cell.x, cell.y), cell);
    }
  }
  return state._gridCellsMap.get(getGridCellKey(x, y));
}

export function updateCellColor(x, y, color) {
  const key = getGridCellKey(x, y);
  if (!state._gridCellsMap) {
    state._gridCellsMap = new Map();
  }
  let cell = state._gridCellsMap.get(key);
  if (cell) {
    cell.color = color;
  } else {
    cell = { x, y, color };
    state._gridCellsMap.set(key, cell);
    state._gridCellsSet.add(key);
    state.gridCells.push(cell);
  }
  return cell;
}

export function clearAllContent(updateStatusBar) {
  state.gridCells = [];
  invalidateGridCellsCache();
  state.images = [];
  state.drawingPaths = [];
  state.currentPath = [];
  state.selectedObjects = [];
  redrawCanvas();
  updateStatusBar('Canvas cleared');
}

export function gridDrawStart(pos, button, updateStatusBar) {
  state.isDrawing = true;
  if (!state._gridCellsSet) buildGridCellsSet();
  saveState();

  const snappedX = Math.floor(pos.x / state.gridSize) * state.gridSize;
  const snappedY = Math.floor(pos.y / state.gridSize) * state.gridSize;

  state.lastGridCell = { x: snappedX, y: snappedY };
  state.lastGridMousePos = { x: pos.x, y: pos.y };

  if (button === 0) {
    drawGridCellArea(snappedX, snappedY, state.drawingColor, true);
  } else if (button === 2) {
    eraseGridCellArea(snappedX, snappedY);
  }

  invalidateGridCellsCache();
  redrawCanvas();
}

export function gridDrawMove(pos, buttons) {
  if (!state.isDrawing || state.selectionTool !== 'grid-draw') return;
  
  if (state.lastGridMousePos && (state.lastGridMousePos.x !== pos.x || state.lastGridMousePos.y !== pos.y)) {
    const cells = getCellsBetweenPoints(
      state.lastGridMousePos.x,
      state.lastGridMousePos.y,
      pos.x,
      pos.y,
      state.gridSize
    );

    for (const cell of cells) {
      if (buttons === 1) {
        drawGridCellArea(cell.x, cell.y, state.drawingColor, false);
      } else if (buttons === 2) {
        eraseGridCellArea(cell.x, cell.y);
      }
    }

    state.lastGridMousePos = { x: pos.x, y: pos.y };
    invalidateGridCellsCache();
    redrawCanvas();
  }
}

function drawGridCellArea(centerX, centerY, color, saveSymmetric) {
  const brushSize = state.gridBrushSize;
  const halfSize = Math.floor(brushSize / 2);

  for (let dx = -halfSize; dx <= halfSize; dx++) {
    for (let dy = -halfSize; dy <= halfSize; dy++) {
      const cellX = centerX + dx * state.gridSize;
      const cellY = centerY + dy * state.gridSize;
      const cellKey = getGridCellKey(cellX, cellY);
      
      if (state._gridCellsSet.has(cellKey)) {
        const existingCell = state.gridCells.find(cc => cc.x === cellX && cc.y === cellY);
        if (existingCell) existingCell.color = color;
        if (saveSymmetric && state.symmetry.isActive()) {
          const symmetric = state.symmetry.transformGridCells([{ x: cellX, y: cellY, color }], state.gridSize);
          symmetric.shift();
          for (const s of symmetric) {
            updateCellColor(s.x, s.y, color);
          }
        }
      } else {
        const newCell = { x: cellX, y: cellY, color };
        state._gridCellsSet.add(cellKey);
        state.gridCells.push(newCell);
        if (state._gridCellsMap) state._gridCellsMap.set(cellKey, newCell);
        addToSpatialHash(cellX, cellY, newCell);
        if (saveSymmetric && state.symmetry.isActive()) {
          const symmetric = state.symmetry.transformGridCells([newCell], state.gridSize);
          symmetric.shift();
          for (const s of symmetric) {
            const sKey = getGridCellKey(s.x, s.y);
            if (!state._gridCellsSet.has(sKey)) {
              state._gridCellsSet.add(sKey);
              state.gridCells.push(s);
              if (state._gridCellsMap) state._gridCellsMap.set(sKey, s);
              addToSpatialHash(s.x, s.y, s);
            }
          }
        }
      }
    }
  }
}

function eraseGridCellArea(centerX, centerY) {
  const eraserSize = state.gridEraserSize;
  const halfSize = Math.floor(eraserSize / 2);

  const keysToRemove = new Set();
  for (let dx = -halfSize; dx <= halfSize; dx++) {
    for (let dy = -halfSize; dy <= halfSize; dy++) {
      const cellX = centerX + dx * state.gridSize;
      const cellY = centerY + dy * state.gridSize;

      if (state.symmetry.isActive()) {
        const cellsToRemove = state.symmetry.transformGridCells([{ x: cellX, y: cellY, color: '' }], state.gridSize);
        for (const cr of cellsToRemove) {
          keysToRemove.add(getGridCellKey(cr.x, cr.y));
        }
      } else {
        keysToRemove.add(getGridCellKey(cellX, cellY));
      }
    }
  }

  if (keysToRemove.size > 0) {
    state.gridCells = state.gridCells.filter(cell => {
      const k = getGridCellKey(cell.x, cell.y);
      if (keysToRemove.has(k)) {
        state._gridCellsSet.delete(k);
        if (state._gridCellsMap) state._gridCellsMap.delete(k);
        return false;
      }
      return true;
    });
    rebuildSpatialHash();
  }
}

export function pencilDrawStart(pos) {
  state.isDrawing = true;
  saveState();
  state.currentPath = [{
    x: pos.x,
    y: pos.y,
    size: state.drawingSize,
    color: state.drawingColor
  }];
  redrawCanvas();
}

export function pencilDrawMove(pos, buttons) {
  if (!state.isDrawing || state.selectionTool !== 'pencil') return;
  
  if (buttons === 1) {
    state.currentPath.push({
      x: pos.x,
      y: pos.y,
      size: state.drawingSize,
      color: state.drawingColor
    });
    redrawCanvas();
  }
}

export function eraserDrawStart(pos) {
  state.isDrawing = true;
  saveState();
  state.currentPath = [{
    x: pos.x,
    y: pos.y,
    size: state.eraserSize,
    color: state.backgroundColor
  }];
  redrawCanvas();
}

export function eraserDrawMove(pos, buttons) {
  if (!state.isDrawing || state.selectionTool !== 'eraser') return;
  
  if (buttons === 1) {
    state.currentPath.push({
      x: pos.x,
      y: pos.y,
      size: state.eraserSize,
      color: state.backgroundColor
    });
    redrawCanvas();
  }
}

export function fillTool(pos, button) {
  saveState();
  if (button === 2) {
    floodErase(pos.x, pos.y);
  } else {
    floodFill(pos.x, pos.y, state.drawingColor);
  }
  redrawCanvas();
}
