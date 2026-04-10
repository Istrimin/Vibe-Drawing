import { state } from './state.js';
import { redrawCanvas } from './canvas.js';
import { updateStatusBar } from './ui.js';

/**
 * Upscale Module - Scales the drawn content by 2x
 *
 * Each grid cell becomes a 2x2 block of cells (same visual size, but 4x cell count).
 * The drawing visually doubles in size.
 */

function scaleBy2x(saveState) {
  if (state.gridCells.length === 0) {
    return;
  }

  // Save state BEFORE scaling for undo support
  saveState();

  const cellSize = state.cellSize;

  // Calculate center of content before upscale
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const cell of state.gridCells) {
    if (cell.x < minX) minX = cell.x;
    if (cell.y < minY) minY = cell.y;
    if (cell.x > maxX) maxX = cell.x;
    if (cell.y > maxY) maxY = cell.y;
  }
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const newCells = [];
  const seen = new Set();

  // Each cell becomes a 2x2 block
  for (const cell of state.gridCells) {
    const gx = Math.round(cell.x / cellSize);
    const gy = Math.round(cell.y / cellSize);

    // 2x2 block at double resolution
    for (let dx = 0; dx < 2; dx++) {
      for (let dy = 0; dy < 2; dy++) {
        const nx = (gx * 2 + dx) * cellSize;
        const ny = (gy * 2 + dy) * cellSize;
        const key = `${nx},${ny}`;
        if (!seen.has(key)) {
          seen.add(key);
          newCells.push({ x: nx, y: ny, color: cell.color });
        }
      }
    }
  }

  // Calculate new center after upscale
  let newMinX = Infinity, newMinY = Infinity, newMaxX = -Infinity, newMaxY = -Infinity;
  for (const cell of newCells) {
    if (cell.x < newMinX) newMinX = cell.x;
    if (cell.y < newMinY) newMinY = cell.y;
    if (cell.x > newMaxX) newMaxX = cell.x;
    if (cell.y > newMaxY) newMaxY = cell.y;
  }
  const newCenterX = (newMinX + newMaxX) / 2;
  const newCenterY = (newMinY + newMaxY) / 2;

  // Shift all cells so center stays the same
  const offsetX = Math.round(centerX - newCenterX);
  const offsetY = Math.round(centerY - newCenterY);
  for (const cell of newCells) {
    cell.x += offsetX;
    cell.y += offsetY;
  }

  state.gridCells = newCells;

  redrawCanvas();
  updateStatusBar(`Upscaled 2x (${newCells.length} cells)`);
}

export { scaleBy2x };
