import { state, elements } from './state.js';
import { updateStatusBar } from './ui.js';

const MAX_EXPORT_SIZE = 16384;

export function exportImage() {
  if (!state.canvas) return;

  const visibleBounds = getVisibleBounds();

  let exportWidth = Math.round(visibleBounds.width);
  let exportHeight = Math.round(visibleBounds.height);

  // Auto-scale if area is too large
  let scale = 1;
  if (exportWidth > MAX_EXPORT_SIZE || exportHeight > MAX_EXPORT_SIZE) {
    scale = Math.min(MAX_EXPORT_SIZE / exportWidth, MAX_EXPORT_SIZE / exportHeight);
    exportWidth = Math.round(exportWidth * scale);
    exportHeight = Math.round(exportHeight * scale);
  }

  if (exportWidth <= 0 || exportHeight <= 0) {
    updateStatusBar('Nothing to export');
    return;
  }

  const exportCanvas = document.createElement('canvas');
  const exportCtx = exportCanvas.getContext('2d');

  exportCanvas.width = exportWidth;
  exportCanvas.height = exportHeight;

  // Fill background only if option is enabled
  const saveBg = window.shouldSaveBackground && window.shouldSaveBackground();
  if (saveBg) {
    exportCtx.fillStyle = state.backgroundColor;
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  }

  exportCtx.save();
  if (scale !== 1) {
    exportCtx.scale(scale, scale);
  }
  exportCtx.translate(-visibleBounds.minX, -visibleBounds.minY);

  state.gridCells.forEach(cell => {
    if (isCellInBounds(cell, visibleBounds)) {
      exportCtx.fillStyle = cell.color;
      exportCtx.fillRect(cell.x, cell.y, state.gridSize, state.gridSize);
    }
  });

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

  state.images.forEach(img => {
    if (isImageInBounds(img, visibleBounds)) {
      const imgElement = new Image();
      imgElement.src = img.src;
      if (imgElement.complete && imgElement.naturalWidth > 0) {
        exportCtx.save();
        exportCtx.translate(img.x, img.y);
        exportCtx.rotate(img.rotation);
        exportCtx.drawImage(imgElement, -img.width / 2, -img.height / 2, img.width, img.height);
        exportCtx.restore();
      }
    }
  });

  exportCtx.restore();

  const link = document.createElement('a');
  link.download = `vibe-drawing-${Date.now()}.png`;
  link.href = exportCanvas.toDataURL('image/png');
  link.click();

  if (scale < 1) {
    updateStatusBar(`Exported (scaled ${Math.round(scale * 100)}%): ${exportWidth}x${exportHeight}px`);
  } else {
    updateStatusBar(`Exported: ${exportWidth}x${exportHeight}px`);
  }
}

function getVisibleBounds() {
  const viewportWidth = state.canvas.width / state.zoomLevel;
  const viewportHeight = state.canvas.height / state.zoomLevel;
  const viewportX = -state.panOffset.x / state.zoomLevel;
  const viewportY = -state.panOffset.y / state.zoomLevel;
  
  return {
    minX: Math.round(viewportX),
    minY: Math.round(viewportY),
    maxX: Math.round(viewportX + viewportWidth),
    maxY: Math.round(viewportY + viewportHeight),
    width: Math.round(viewportWidth),
    height: Math.round(viewportHeight)
  };
}

function isCellInBounds(cell, bounds) {
  const cellMaxX = cell.x + state.gridSize;
  const cellMaxY = cell.y + state.gridSize;
  return cell.x < bounds.maxX && cellMaxX > bounds.minX && 
         cell.y < bounds.maxY && cellMaxY > bounds.minY;
}

function isImageInBounds(img, bounds) {
  const imgLeft = img.x - img.width / 2;
  const imgRight = img.x + img.width / 2;
  const imgTop = img.y - img.height / 2;
  const imgBottom = img.y + img.height / 2;
  return imgRight > bounds.minX && imgLeft < bounds.maxX && 
         imgBottom > bounds.minY && imgTop < bounds.maxY;
}