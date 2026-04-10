/**
 * Right Toolbar Buttons Module
 * Creates and manages the right toolbar UI elements
 */

export function createRightToolbar() {
    const rightToolbar = document.getElementById('right-toolbar');
    if (!rightToolbar) return;

    // First group - view controls
    const viewGroup = document.createElement('div');
    viewGroup.className = 'tool-group';
    viewGroup.innerHTML = `
        <button class="tool-btn" id="fullscreenBtn" data-tooltip="Fullscreen (F)">
            ${getFullscreenSVG()}
        </button>
        <button class="tool-btn" id="devToolsBtn" data-tooltip="Dev Tools">
            ${getDevToolsSVG()}
        </button>
        <button class="tool-btn" id="autoSaveBtn" data-tooltip="Auto Save">
            ${getAutoSaveSVG()}
        </button>
        <button class="tool-btn" id="zoomInBtn" data-tooltip="Zoom In (+)">
            ${getZoomInSVG()}
        </button>
        <button class="tool-btn" id="zoomOutBtn" data-tooltip="Zoom Out (-)">
            ${getZoomOutSVG()}
        </button>
        <button class="tool-btn" id="fitBtn" data-tooltip="Fit to Screen">
            ${getFitSVG()}
        </button>
    `;
    rightToolbar.appendChild(viewGroup);

    // Second group - grid
    const gridGroup = document.createElement('div');
    gridGroup.className = 'tool-group';
    gridGroup.innerHTML = `
        <button class="tool-btn active" id="gridBtn" data-tooltip="Toggle Grid" data-active="true">
            ${getGridSVG()}
        </button>
        <div class="tool-setting">
            <label for="rightGridBrushSlider">G.B</label>
            <input type="range" id="rightGridBrushSlider" min="1" max="15" step="1" value="1" data-tooltip="Grid Brush Size">
            <span id="rightGridBrushValue">1</span>
        </div>
        <div class="tool-setting">
            <label for="gridSizeInputTop">G.Sz</label>
            <input type="number" id="gridSizeInputRight" min="4" max="64" value="16">
            <span id="gridSizeValueRight">16</span>
        </div>
        <div class="tool-setting">
            <label title="🎨">🎨</label>
            <input type="color" id="gridColorPicker" value="#32CD32" data-tooltip="Grid Color">
        </div>
        <div class="tool-setting">
            <label title="🖌️">🖌️</label>
            <input type="color" id="backgroundColorPicker" value="#1a1a1a" data-tooltip="Background Color">
        </div>
    `;
    rightToolbar.appendChild(gridGroup);

    // Third group - actions
    const actionGroup = document.createElement('div');
    actionGroup.className = 'tool-group';
    actionGroup.innerHTML = `
        <button class="tool-btn" id="clearCanvasBtn" data-tooltip="Clear">
            ${getClearSVG()}
        </button>
        <button class="tool-btn" id="deleteBtn" data-tooltip="Delete (Del)">
            ${getDeleteSVG()}
        </button>
        <button class="tool-btn" id="saveBtn" data-tooltip="Save">
            ${getSaveSVG()}
        </button>
        <button class="tool-btn" id="loadBtn" data-tooltip="Load">
            ${getLoadSVG()}
        </button>
        <button class="tool-btn" id="exportBtn" data-tooltip="Export">
            ${getExportSVG()}
        </button>
    `;
    rightToolbar.appendChild(actionGroup);

    // Grid transform button
    const transformGroup = document.createElement('div');
    transformGroup.className = 'tool-group mode-switch';
    transformGroup.innerHTML = `
        <button id="gridTransformBtn" data-mode="visual-only" title="Grid Transformation: Visual Only">Visual</button>
        <button id="gridTransformPermBtn" data-mode="permanent">Permanent</button>
    `;
    rightToolbar.appendChild(transformGroup);

    // Symmetry line toggle
    const symmetryGroup = document.createElement('div');
    symmetryGroup.className = 'tool-group';
    symmetryGroup.innerHTML = `
        <div class="tool-setting" style="padding: 4px 2px;">
            <label style="font-size: 9px; color: #999;">
                <input type="checkbox" id="showSymmetryLineCb" checked> Sym Line
            </label>
        </div>
    `;
    rightToolbar.appendChild(symmetryGroup);
}

function getFullscreenSVG() {
    return `<svg width="16" height="16" viewBox="0 0 24 24">
        <defs><linearGradient id="fullscreenGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#4169E1;stop-opacity:1" /><stop offset="100%" style="stop-color:#1E3A8A;stop-opacity:0.8" /></linearGradient></defs>
        <path d="M3 7V3H7" fill="none" stroke="url(#fullscreenGrad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M17 3H21V7" fill="none" stroke="url(#fullscreenGrad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M21 17V21H17" fill="none" stroke="url(#fullscreenGrad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M7 21H3V17" fill="none" stroke="url(#fullscreenGrad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="6" y="6" width="12" height="12" rx="1.5" fill="url(#fullscreenGrad)" opacity="0.2" stroke="#4169E1" stroke-width="1.2"/>
        <path d="M8 8L16 16" stroke="white" stroke-width="0.8" opacity="0.2" stroke-linecap="round"/>
    </svg>`;
}

function getDevToolsSVG() {
    return `<svg width="16" height="16" viewBox="0 0 24 24">
        <defs><linearGradient id="devToolsGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#FF6B6B;stop-opacity:1" /><stop offset="100%" style="stop-color:#EE5A5A;stop-opacity:0.8" /></linearGradient></defs>
        <rect x="2" y="3" width="20" height="18" rx="2" fill="none" stroke="url(#devToolsGrad)" stroke-width="1.5"/>
        <line x1="2" y1="7" x2="22" y2="7" stroke="url(#devToolsGrad)" stroke-width="1.5"/>
        <circle cx="5" cy="5" r="1" fill="#FF6B6B"/>
        <circle cx="8" cy="5" r="1" fill="#FFD700"/>
        <circle cx="11" cy="5" r="1" fill="#32CD32"/>
        <path d="M7 11L5 14L7 17" fill="none" stroke="#FF6B6B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M17 11L19 14L17 17" fill="none" stroke="#FF6B6B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="11" y1="18" x2="13" y2="10" stroke="#FFD700" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`;
}

function getAutoSaveSVG() {
    return `<svg width="16" height="16" viewBox="0 0 24 24">
        <defs><linearGradient id="autoSaveGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#4CAF50;stop-opacity:1" /><stop offset="100%" style="stop-color:#45a049;stop-opacity:0.8" /></linearGradient></defs>
        <rect x="4" y="3" width="16" height="18" rx="2" fill="url(#autoSaveGrad)" opacity="0.3" stroke="#4CAF50" stroke-width="1.3"/>
        <rect x="7" y="3" width="10" height="6" rx="1" fill="#888" stroke="#666" stroke-width="0.5"/>
        <rect x="9" y="4" width="6" height="3" rx="0.5" fill="#AAA"/>
        <rect x="7" y="13" width="10" height="6" rx="0.5" fill="#4CAF50" opacity="0.3"/>
        <path d="M9 16L11 18L15 13" fill="none" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
}

function getZoomInSVG() {
    return `<svg width="16" height="16" viewBox="0 0 24 24">
        <defs><linearGradient id="zoomInGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" /><stop offset="100%" style="stop-color:#FFA500;stop-opacity:0.8" /></linearGradient></defs>
        <circle cx="10" cy="10" r="6.5" fill="none" stroke="url(#zoomInGrad)" stroke-width="2" opacity="0.8"/>
        <line x1="7" y1="10" x2="13" y2="10" stroke="#FFD700" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="10" y1="7" x2="10" y2="13" stroke="#FFD700" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="14.5" y1="14.5" x2="21" y2="21" stroke="#FFA500" stroke-width="3" stroke-linecap="round"/>
        <path d="M7 7C8 8 9 8.5 10 8.5" stroke="white" stroke-width="1" stroke-linecap="round" opacity="0.4" fill="none"/>
    </svg>`;
}

function getZoomOutSVG() {
    return `<svg width="16" height="16" viewBox="0 0 24 24">
        <defs><linearGradient id="zoomOutGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#FF6347;stop-opacity:1" /><stop offset="100%" style="stop-color:#FF4500;stop-opacity:0.8" /></linearGradient></defs>
        <circle cx="10" cy="10" r="6.5" fill="none" stroke="url(#zoomOutGrad)" stroke-width="2" opacity="0.8"/>
        <line x1="7" y1="10" x2="13" y2="10" stroke="#FF6347" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="14.5" y1="14.5" x2="21" y2="21" stroke="#FF4500" stroke-width="3" stroke-linecap="round"/>
        <path d="M7 7C8 8 9 8.5 10 8.5" stroke="white" stroke-width="1" stroke-linecap="round" opacity="0.4" fill="none"/>
    </svg>`;
}

function getFitSVG() {
    return `<svg width="16" height="16" viewBox="0 0 24 24">
        <defs><linearGradient id="fitGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#20B2AA;stop-opacity:1" /><stop offset="100%" style="stop-color:#008B8B;stop-opacity:0.8" /></linearGradient></defs>
        <path d="M3 7V3H7" fill="none" stroke="url(#fitGrad)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M17 3H21V7" fill="none" stroke="url(#fitGrad)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M21 17V21H17" fill="none" stroke="url(#fitGrad)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M7 21H3V17" fill="none" stroke="url(#fitGrad)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="7" y="7" width="10" height="10" rx="1" fill="url(#fitGrad)" opacity="0.25" stroke="#20B2AA" stroke-width="1.2"/>
        <path d="M8 15L10.5 11L12 13L14 10L16 15" fill="none" stroke="#20B2AA" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>
        <circle cx="14.5" cy="9" r="1" fill="#20B2AA" opacity="0.5"/>
    </svg>`;
}

function getGridSVG() {
    return `<svg width="18" height="18" viewBox="0 0 24 24">
        <defs><linearGradient id="gridBtnGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#00FF7F;stop-opacity:1" /><stop offset="100%" style="stop-color:#00FA9A;stop-opacity:0.7" /></linearGradient></defs>
        <line x1="2" y1="6" x2="22" y2="6" stroke="url(#gridBtnGrad)" stroke-width="1.2" opacity="0.6"/>
        <line x1="2" y1="12" x2="22" y2="12" stroke="url(#gridBtnGrad)" stroke-width="1.5" opacity="0.8"/>
        <line x1="2" y1="18" x2="22" y2="18" stroke="url(#gridBtnGrad)" stroke-width="1.2" opacity="0.6"/>
        <line x1="6" y1="2" x2="6" y2="22" stroke="url(#gridBtnGrad)" stroke-width="1.2" opacity="0.6"/>
        <line x1="12" y1="2" x2="12" y2="22" stroke="url(#gridBtnGrad)" stroke-width="1.5" opacity="0.8"/>
        <line x1="18" y1="2" x2="18" y2="22" stroke="url(#gridBtnGrad)" stroke-width="1.2" opacity="0.6"/>
        <circle cx="12" cy="12" r="1.5" fill="#00FF7F"/>
        <circle cx="12" cy="12" r="0.8" fill="white" opacity="0.6"/>
        <circle cx="6" cy="6" r="1" fill="#00FF7F" opacity="0.5"/>
        <circle cx="18" cy="6" r="1" fill="#00FF7F" opacity="0.5"/>
        <circle cx="6" cy="18" r="1" fill="#00FF7F" opacity="0.5"/>
        <circle cx="18" cy="18" r="1" fill="#00FF7F" opacity="0.5"/>
        <rect x="2" y="2" width="20" height="20" rx="2" fill="none" stroke="#00FF7F" stroke-width="1" opacity="0.4"/>
    </svg>`;
}

function getClearSVG() {
    return `<svg width="16" height="16" viewBox="0 0 24 24">
        <path d="M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M6 6L18 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`;
}

function getDeleteSVG() {
    return `<svg width="16" height="16" viewBox="0 0 24 24">
        <path d="M3 6H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M8 6V4C8 3 9 2 10 2H14C15 2 16 3 16 4V6" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="M5 6L6 22H18L19 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;
}

function getSaveSVG() {
    return `<svg width="16" height="16" viewBox="0 0 24 24">
        <path d="M19 21H5C4 21 3 20 3 19V5C3 4 4 3 5 3H16L21 8V19C21 20 20 21 19 21Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M17 21V13H7V21" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="M7 3V8H15" fill="none" stroke="currentColor" stroke-width="2"/>
    </svg>`;
}

function getLoadSVG() {
    return `<svg width="16" height="16" viewBox="0 0 24 24">
        <path d="M3 15V21H21V15" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="M12 3L12 14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M8 10L12 14L16 10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
}

function getExportSVG() {
    return `<svg width="16" height="16" viewBox="0 0 24 24">
        <path d="M14 2H6C5 2 4 3 4 4V20C4 21 5 22 6 22H18C19 22 20 21 20 20V8L14 2Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M14 2V8H20" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="M12 12V18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 15L12 18L15 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
}
