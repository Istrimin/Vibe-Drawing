import { state } from './state.js';
import { redrawCanvas } from './canvas.js';
import { updateStatusBar } from './ui.js';

// Options panel state
const defaultOptions = {
  saveBackground: false,
};

let optionsPanel = null;

export function initOptions() {
  // Create options button (added to top toolbar)
  const topToolbar = document.getElementById('top-toolbar');
  if (topToolbar) {
    const btn = document.createElement('button');
    btn.id = 'optionsBtn';
    btn.className = 'tool-btn';
    btn.title = 'Options';
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    `;
    topToolbar.insertBefore(btn, topToolbar.firstChild);
    btn.addEventListener('click', toggleOptionsPanel);
  }

  // Create options panel
  const canvasContainer = document.querySelector('.canvas-container');
  if (canvasContainer) {
    optionsPanel = document.createElement('div');
    optionsPanel.id = 'optionsPanel';
    optionsPanel.className = 'options-panel';
    optionsPanel.innerHTML = `
      <div class="options-panel-header">
        <h3>Options</h3>
        <button id="closeOptionsPanel" class="close-btn">&times;</button>
      </div>
      <div class="options-list">
        <label class="option-item">
          <input type="checkbox" id="saveBackgroundOpt">
          <span>Save background color</span>
        </label>
      </div>
    `;
    canvasContainer.appendChild(optionsPanel);

    // Close button
    optionsPanel.querySelector('#closeOptionsPanel').addEventListener('click', () => {
      optionsPanel.style.display = 'none';
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (optionsPanel.style.display === 'block' &&
          !optionsPanel.contains(e.target) &&
          e.target.id !== 'optionsBtn' &&
          !e.target.closest('#optionsBtn')) {
        optionsPanel.style.display = 'none';
      }
    });

    // Load saved options
    loadOptions();

    // Save on change
    const saveBackgroundOpt = optionsPanel.querySelector('#saveBackgroundOpt');
    saveBackgroundOpt.addEventListener('change', () => {
      state.saveBackground = saveBackgroundOpt.checked;
      saveOptions();
      updateStatusBar(`Save background: ${state.saveBackground ? 'ON' : 'OFF'}`);
    });
  }
}

function toggleOptionsPanel() {
  if (!optionsPanel) return;
  if (optionsPanel.style.display === 'block') {
    optionsPanel.style.display = 'none';
  } else {
    optionsPanel.style.display = 'block';
    // Update checkbox from current state
    const cb = optionsPanel.querySelector('#saveBackgroundOpt');
    if (cb) cb.checked = state.saveBackground;
  }
}

function loadOptions() {
  const saved = localStorage.getItem('vibeDrawingOptions');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state.saveBackground = parsed.saveBackground !== undefined ? parsed.saveBackground : defaultOptions.saveBackground;
    } catch(e) {
      state.saveBackground = defaultOptions.saveBackground;
    }
  } else {
    state.saveBackground = defaultOptions.saveBackground;
  }
}

function saveOptions() {
  const opts = {
    saveBackground: state.saveBackground,
  };
  try {
    localStorage.setItem('vibeDrawingOptions', JSON.stringify(opts));
  } catch(e) {}
}

export function shouldSaveBackground() {
  return state.saveBackground === true;
}
