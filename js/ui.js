import { elements, state } from './state.js';
import { redrawCanvas } from './canvas.js';

export function updateActiveTool(activeBtn) {
  elements.toolButtons.forEach(btn => btn.classList.remove('active'));
  activeBtn.classList.add('active');
}

export function updateStatusBar(message) {
  elements.statusBar.textContent = message;
}



export function toggleGrid() {
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

export function showDevTools() {
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

    devPanel.innerHTML = `
      <h3 style="margin-top: 0; color: #5a9fd4; border-bottom: 1px solid #4d4d4d; padding-bottom: 10px;">Developer Tools</h3>
      <div style="margin-top: 10px;">
        <p><strong>State:</strong></p>
        <p>Images: ${state.images.length}</p>
        <p>Drawing paths: ${state.drawingPaths.length}</p>
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
    if (devPanel.style.display === 'none') {
      devPanel.style.display = 'block';
    } else {
      devPanel.style.display = 'none';
    }
  }
}
