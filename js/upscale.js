import { state } from './state.js';
import { redrawCanvas } from './canvas.js';

/**
 * Upscale Module - Scales the drawn content by 2x
 *
 * When clicked, all existing cell coordinates and sizes are multiplied by 2.
 * This allows drawing finer details on top of upscaled content.
 * Undo saves the state before upscale.
 */

function scaleBy2x(saveState) {
  if (state.gridCells.length === 0) {
    return;
  }

  // Save state BEFORE scaling for undo support
  saveState();

  const gridSize = state.gridSize;
  const newCells = [];

  // Each cell becomes 4 cells (2x2 grid) - convert to grid indices first
  for (const cell of state.gridCells) {
    const gridX = Math.round(cell.x / gridSize);
    const gridY = Math.round(cell.y / gridSize);

    // 4 cells: original positions doubled + half-step offset
    const positions = [
      { x: gridX * 2 * gridSize, y: gridY * 2 * gridSize },
      { x: (gridX * 2 + 1) * gridSize, y: gridY * 2 * gridSize },
      { x: gridX * 2 * gridSize, y: (gridY * 2 + 1) * gridSize },
      { x: (gridX * 2 + 1) * gridSize, y: (gridY * 2 + 1) * gridSize }
    ];

    for (const pos of positions) {
      newCells.push({
        x: pos.x,
        y: pos.y,
        color: cell.color
      });
    }
  }

  // Deduplicate cells
  const seen = new Set();
  state.gridCells = newCells.filter(cell => {
    const key = `${cell.x},${cell.y}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  redrawCanvas();
}

export { scaleBy2x };
