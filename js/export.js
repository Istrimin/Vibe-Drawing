import { state, elements } from './state.js';
import { redrawCanvas } from './canvas.js';

export function exportAsImage(format = 'png') {
  if (!state.canvas) return;

  // Calculate bounding box of all content
  const bounds = getContentBounds();
  
  // Create export canvas
  const exportCanvas = document.createElement('canvas');
  const exportCtx = exportCanvas.getContext('2d');
  
  // Set size with padding
  const padding = 10;
  exportCanvas.width = bounds.width + padding * 2;
  exportCanvas.height = bounds.height + padding * 2;
  
  // Fill background
  exportCtx.fillStyle = state.backgroundColor;
  exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  
  // Translate to bounds
  exportCtx.save();
  exportCtx.translate(-bounds.minX + padding, -bounds.minY + padding);
  
  // Draw grid cells
  state.gridCells.forEach(cell => {
    exportCtx.fillStyle = cell.color;
    exportCtx.fillRect(cell.x, cell.y, state.gridSize, state.gridSize);
  });
  
  // Draw paths
  state.drawingPaths.forEach(path => {
    if (path.length > 0) {
      exportCtx.strokeStyle = path[0].color;
      exportCtx.lineWidth = path[0].size;
      exportCtx.lineCap = 'round';
      exportCtx.lineJoin = 'round';
      exportCtx.beginPath();
      exportCtx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        exportCtx.lineTo(path[i].x, path[i].y);
      }
      exportCtx.stroke();
    }
  });
  
  // Draw images
  state.images.forEach(img => {
    const imgElement = new Image();
    imgElement.src = img.src;
    if (imgElement.complete && imgElement.naturalWidth > 0) {
      exportCtx.save();
      exportCtx.translate(img.x, img.y);
      exportCtx.rotate(img.rotation);
      exportCtx.drawImage(imgElement, -img.width / 2, -img.height / 2, img.width, img.height);
      exportCtx.restore();
    }
  });
  
  exportCtx.restore();
  
  // Download
  const link = document.createElement('a');
  link.download = `vibe-drawing.${format}`;
  link.href = exportCanvas.toDataURL(`image/${format}`);
  link.click();
  
  if (elements.statusBar) {
    elements.statusBar.textContent = `Exported as ${format.toUpperCase()}`;
  }
}

function getContentBounds() {
  let minX = 0, minY = 0, maxX = 0, maxY = 0;
  
  // Grid cells
  state.gridCells.forEach(cell => {
    if (cell.x < minX) minX = cell.x;
    if (cell.y < minY) minY = cell.y;
    if (cell.x + state.gridSize > maxX) maxX = cell.x + state.gridSize;
    if (cell.y + state.gridSize > maxY) maxY = cell.y + state.gridSize;
  });
  
  // Paths
  state.drawingPaths.forEach(path => {
    path.forEach(point => {
      const halfSize = (point.size || 1) / 2;
      if (point.x - halfSize < minX) minX = point.x - halfSize;
      if (point.y - halfSize < minY) minY = point.y - halfSize;
      if (point.x + halfSize > maxX) maxX = point.x + halfSize;
      if (point.y + halfSize > maxY) maxY = point.y + halfSize;
    });
  });
  
  // Images
  state.images.forEach(img => {
    if (img.x - img.width / 2 < minX) minX = img.x - img.width / 2;
    if (img.y - img.height / 2 < minY) minY = img.y - img.height / 2;
    if (img.x + img.width / 2 > maxX) maxX = img.x + img.width / 2;
    if (img.y + img.height / 2 > maxY) maxY = img.y + img.height / 2;
  });
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX || state.canvas.width / state.zoomLevel,
    height: maxY - minY || state.canvas.height / state.zoomLevel
  };
}

export function exportPanelShow() {
  const exportPanel = document.getElementById('export-panel');
  if (exportPanel) {
    exportPanel.classList.toggle('hidden');
  }
}

export function setupExportPanel() {
  const exportPanel = document.getElementById('export-panel');
  if (!exportPanel) return;
  
  const formatButtons = exportPanel.querySelectorAll('.export-format-btn');
  formatButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const format = btn.dataset.format;
      exportAsImage(format);
      exportPanel.classList.add('hidden');
    });
  });
  
  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!exportPanel.contains(e.target) && !elements.exportBtn?.contains(e.target)) {
      exportPanel.classList.add('hidden');
    }
  });
}
