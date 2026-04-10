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

  // Scale all cell coordinates and sizes by 2x
  state.gridCells = state.gridCells.map(cell => ({
    x: cell.x * 2,
    y: cell.y * 2,
    color: cell.color
  }));

  redrawCanvas();
}

export { scaleBy2x };
