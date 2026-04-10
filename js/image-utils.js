import { state } from './state.js';
import { saveState } from './history.js';
import { redrawCanvas } from './canvas.js';
import { updateStatusBar } from './ui.js';

// Maximum allowed dimension for imported images (in pixels)
const MAX_IMPORT_DIMENSION = 4096;

export function getGridCellKey(x, y) { return x + "," + y; }
export function buildGridCellsSet() {
  state._gridCellsSet = new Set(state.gridCells.map(cell => getGridCellKey(cell.x, cell.y)));
}

export function uploadImages(files) {
  Array.from(files).forEach(file => {
    if (file.type.startsWith('image/')) {
      // Check file size (warn if > 10MB)
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 10) {
        console.warn(`Large file: ${file.name} (${fileSizeMB.toFixed(1)}MB). This may cause performance issues.`);
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // Check image dimensions and auto-scale if needed
          if (width > MAX_IMPORT_DIMENSION || height > MAX_IMPORT_DIMENSION) {
            const scale = MAX_IMPORT_DIMENSION / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
            console.log(`Image scaled down to ${width}x${height}`);
          }

          const imageData = {
            id: Date.now(),
            src: e.target.result,
            x: 100, y: 100,
            width,
            height,
            rotation: 0
          };

          state.images.push(imageData);
          saveState();
          redrawCanvas();
          updateStatusBar(`Uploaded: ${file.name}`);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });
}

export function getImageFromData(src) {
  const img = new Image();
  img.src = src;
  return img;
}

export function getImageAtPosition(x, y) {
  for (let i = state.images.length - 1; i >= 0; i--) {
    const img = state.images[i];
    if (x >= img.x && x <= img.x + img.width && y >= img.y && y <= img.y + img.height) {
      return img;
    }
  }
  return null;
}

export function isOnResizeHandle(pos, img) {
  const handleSize = 10;
  const right = img.x + img.width;
  const bottom = img.y + img.height;
  return (pos.x >= right - handleSize && pos.x <= right + handleSize &&
          pos.y >= bottom - handleSize && pos.y <= bottom + handleSize);
}

export function isOnRotationHandle(pos, img) {
  const handleSize = 10;
  const centerX = img.x + img.width / 2;
  const centerY = img.y + img.height / 2;
  const handleX = centerX;
  const handleY = img.y - 30;
  return (pos.x >= handleX - handleSize && pos.x <= handleX + handleSize &&
          pos.y >= handleY - handleSize && pos.y <= handleY + handleSize);
}

export function startSelection(pos) {
  state.selectionStart = { ...pos };
  state.selectionEnd = { ...pos };
}

export function updateSelection(pos) {
  state.selectionEnd = { ...pos };
}

export function updateImageSelectionRect() {
  if (!state.selectionStart || !state.selectionEnd) return null;
  
  const minX = Math.min(state.selectionStart.x, state.selectionEnd.x);
  const minY = Math.min(state.selectionStart.y, state.selectionEnd.y);
  const maxX = Math.max(state.selectionStart.x, state.selectionEnd.x);
  const maxY = Math.max(state.selectionStart.y, state.selectionEnd.y);
  
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}