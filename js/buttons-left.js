/**
 * Left Toolbar Buttons Module
 * Creates and manages the left toolbar (tools) UI elements
 */

export function createLeftToolbar() {
    const leftToolbar = document.getElementById('left-toolbar');
    if (!leftToolbar) return;

    // Mode toggle (Grid/Pencil)
    const modeGroup = document.createElement('div');
    modeGroup.className = 'tool-group';
    modeGroup.innerHTML = `
        <button id="modeToggleBtn" class="mode-toggle-btn active" title="Mode: Grid (Q)">
            <svg class="icon-grid" width="18" height="18" viewBox="0 0 24 24">
                <defs>
                    <linearGradient id="gridGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#9b81ff;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#7b61ff;stop-opacity:0.8" />
                    </linearGradient>
                </defs>
                <rect x="2" y="2" width="8.5" height="8.5" rx="1.5" fill="url(#gridGrad1)" opacity="1" stroke="#7B61FF" stroke-width="0.5"/>
                <rect x="13.5" y="2" width="8.5" height="8.5" rx="1.5" fill="url(#gridGrad1)" opacity="0.85" stroke="#7B61FF" stroke-width="0.5"/>
                <rect x="2" y="13.5" width="8.5" height="8.5" rx="1.5" fill="url(#gridGrad1)" opacity="0.85" stroke="#7B61FF" stroke-width="0.5"/>
                <rect x="13.5" y="13.5" width="8.5" height="8.5" rx="1.5" fill="url(#gridGrad1)" opacity="0.7" stroke="#7B61FF" stroke-width="0.5"/>
                <circle cx="6" cy="6" r="1.5" fill="white" opacity="0.9"/>
                <circle cx="18" cy="6" r="1.5" fill="white" opacity="0.7"/>
                <circle cx="6" cy="18" r="1.5" fill="white" opacity="0.7"/>
                <circle cx="18" cy="18" r="1.5" fill="white" opacity="0.5"/>
                <rect x="3" y="3" width="2" height="2" rx="0.5" fill="white" opacity="0.3"/>
            </svg>
            <svg class="icon-pencil" width="18" height="18" viewBox="0 0 24 24">
                <defs>
                    <linearGradient id="pencilGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#FFA500;stop-opacity:0.9" />
                    </linearGradient>
                </defs>
                <path d="M16.5 2.5L20.5 6.5L8.5 18.5L4 19L4.5 14.5L16.5 2.5Z" fill="url(#pencilGrad2)" stroke="#CC8800" stroke-width="0.5"/>
                <path d="M4.5 14.5L6 17.5L8.5 18.5" fill="#E8C87A" stroke="#CC8800" stroke-width="0.5"/>
                <path d="M4.5 14.5L5.5 16L7 16.5L6 17.5L4.5 14.5Z" fill="#333"/>
                <ellipse cx="18" cy="5" rx="2" ry="1.5" fill="#FF69B4" stroke="#CC5599" stroke-width="0.5" transform="rotate(-45 18 5)"/>
                <path d="M16 4L19 7" stroke="white" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>
            </svg>
        </button>
    `;
    leftToolbar.appendChild(modeGroup);

    // Tools
    const toolsGroup = document.createElement('div');
    toolsGroup.className = 'tool-group tools-main';

    const tools = [
        { id: 'pencil', tooltip: 'Pencil (P)', active: true, svg: getPencilSVG() },
        { id: 'select', tooltip: 'Select (V)', svg: getSelectSVG() },
        { id: 'eraser', tooltip: 'Eraser (E)', svg: getEraserSVG() },
        { id: 'pipette', tooltip: 'Color Picker (I)', svg: getPipetteSVG() },
        { id: 'fill', tooltip: 'Fill (B)', svg: getFillSVG() },
        { id: 'grid-draw', tooltip: 'Grid Draw (G)', svg: getGridDrawSVG() },
        { id: 'rect-select', tooltip: 'Rect Select (R)', svg: getRectSelectSVG() },
        { id: 'lasso', tooltip: 'Lasso (L)', svg: getLassoSVG() }
    ];

    tools.forEach(tool => {
        const btn = document.createElement('button');
        btn.className = 'tool-btn' + (tool.active ? ' active' : '');
        btn.dataset.tool = tool.id;
        btn.title = tool.tooltip;
        btn.innerHTML = tool.svg;
        toolsGroup.appendChild(btn);
    });

    leftToolbar.appendChild(toolsGroup);

    // Secondary tools group
    const secondaryGroup = document.createElement('div');
    secondaryGroup.className = 'tool-group';
    
    const symmetryBtn = document.createElement('button');
    symmetryBtn.className = 'tool-btn';
    symmetryBtn.id = 'symmetryBtn';
    symmetryBtn.title = 'Symmetry (Y)';
    symmetryBtn.innerHTML = getSymmetrySVG();
    
    const uploadBtn = document.createElement('button');
    uploadBtn.className = 'tool-btn';
    uploadBtn.id = 'uploadBtn';
    uploadBtn.title = 'Upload Image';
    uploadBtn.innerHTML = getUploadSVG();
    
    // Create file input but don't add to DOM yet (will be added after initApp)
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'fileInput';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    fileInput.style.display = 'none';
    
    secondaryGroup.appendChild(symmetryBtn);
    secondaryGroup.appendChild(uploadBtn);
    leftToolbar.appendChild(secondaryGroup);
    
    // Store fileInput in window for later use
    window._deferredFileInput = fileInput;
}

function getPencilSVG() {
    return `
    <svg width="18" height="18" viewBox="0 0 24 24">
        <defs>
            <linearGradient id="pencilBody" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#FFA500;stop-opacity:0.9" />
            </linearGradient>
        </defs>
        <path d="M16.5 2.5L20.5 6.5L8.5 18.5L4 19L4.5 14.5L16.5 2.5Z" fill="url(#pencilBody)" stroke="#CC8800" stroke-width="0.5"/>
        <path d="M4.5 14.5L6 17.5L8.5 18.5" fill="#E8C87A" stroke="#CC8800" stroke-width="0.5"/>
        <path d="M4.5 14.5L5.5 16L7 16.5L6 17.5L4.5 14.5Z" fill="#333"/>
        <rect x="5" y="13" width="5" height="2.5" rx="0.5" fill="#C0C0C0" stroke="#999" stroke-width="0.4" transform="rotate(-45 7.5 14.25)"/>
        <ellipse cx="18" cy="5" rx="2" ry="1.5" fill="#FF69B4" stroke="#CC5599" stroke-width="0.5" transform="rotate(-45 18 5)"/>
        <path d="M16 4L19 7" stroke="white" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>
    </svg>`;
}

function getSelectSVG() {
    return `
    <svg width="18" height="18" viewBox="0 0 24 24">
        <defs><linearGradient id="selectGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#00BFFF;stop-opacity:1" /><stop offset="100%" style="stop-color:#1E90FF;stop-opacity:0.8" /></linearGradient></defs>
        <path d="M6 3L6 20L10 15L15 21L17.5 19L12.5 13L19 13L6 3Z" fill="url(#selectGrad)" stroke="#1060C0" stroke-width="0.5"/>
        <path d="M7.5 6L15 12" stroke="white" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
        <rect x="15" y="15" width="5" height="5" rx="0.5" fill="none" stroke="#00BFFF" stroke-width="1" stroke-dasharray="1,1" opacity="0.7"/>
    </svg>`;
}

function getEraserSVG() {
    return `
    <svg width="18" height="18" viewBox="0 0 24 24">
        <defs><linearGradient id="eraserGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#FF69B4;stop-opacity:1" /><stop offset="100%" style="stop-color:#FF1493;stop-opacity:0.8" /></linearGradient></defs>
        <path d="M5 10L14 3L20 9L11 18L5 18Z" fill="url(#eraserGrad)" stroke="#CC4499" stroke-width="0.5"/>
        <path d="M7 10L14 4L18 8" fill="none" stroke="white" stroke-width="1.2" stroke-linecap="round" opacity="0.4"/>
        <path d="M8 14L13 18L11 18L6 14" fill="#FFB6D9" stroke="#CC4499" stroke-width="0.4"/>
        <circle cx="15" cy="15" r="0.6" fill="#FF69B4" opacity="0.7"/>
        <circle cx="17" cy="13" r="0.5" fill="#FF69B4" opacity="0.5"/>
        <circle cx="16" cy="17" r="0.4" fill="#FF69B4" opacity="0.6"/>
        <line x1="3" y1="20" x2="8" y2="20" stroke="#FF69B4" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
        <line x1="4" y1="21.5" x2="7" y2="21.5" stroke="#FF69B4" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
    </svg>`;
}

function getPipetteSVG() {
    return `
    <svg width="18" height="18" viewBox="0 0 24 24">
        <defs><linearGradient id="pipetteGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#C0C0C0;stop-opacity:1" /><stop offset="100%" style="stop-color:#808080;stop-opacity:0.8" /></linearGradient></defs>
        <path d="M14 4L18 8L10 16H6V12L14 4Z" fill="url(#pipetteGrad)" stroke="#888" stroke-width="0.5"/>
        <path d="M14.5 5L17 7.5" stroke="white" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
        <circle cx="18.5" cy="5.5" r="2.5" fill="#666" stroke="#555" stroke-width="0.5"/>
        <circle cx="19" cy="5" r="1" fill="#888" opacity="0.5"/>
        <rect x="3" y="18" width="4" height="4" rx="0.5" fill="#FF4444" stroke="#CC3333" stroke-width="0.3"/>
        <rect x="8" y="18" width="4" height="4" rx="0.5" fill="#44BB44" stroke="#339933" stroke-width="0.3"/>
        <rect x="13" y="18" width="4" height="4" rx="0.5" fill="#4488FF" stroke="#3366CC" stroke-width="0.3"/>
        <rect x="3.5" y="18.5" width="1.5" height="1.5" rx="0.3" fill="white" opacity="0.3"/>
        <rect x="8.5" y="18.5" width="1.5" height="1.5" rx="0.3" fill="white" opacity="0.3"/>
        <rect x="13.5" y="18.5" width="1.5" height="1.5" rx="0.3" fill="white" opacity="0.3"/>
    </svg>`;
}

function getFillSVG() {
    return `
    <svg width="18" height="18" viewBox="0 0 24 24">
        <defs><linearGradient id="bucketGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#00CED1;stop-opacity:1" /><stop offset="100%" style="stop-color:#00868B;stop-opacity:0.8" /></linearGradient></defs>
        <path d="M7 5L17 5L15 18L9 18Z" fill="url(#bucketGrad)" stroke="#008B8B" stroke-width="0.5"/>
        <path d="M7 8C7 8 5 10 5 13C5 16 7 18 7 18" fill="none" stroke="#00CED1" stroke-width="1.8" stroke-linecap="round"/>
        <rect x="6" y="4" width="12" height="2" rx="1" fill="#00CED1" stroke="#008B8B" stroke-width="0.4"/>
        <path d="M15 7L19 11L18 15L14 12Z" fill="#00FFFF" opacity="0.8"/>
        <circle cx="19" cy="17" r="1" fill="#00FFFF" opacity="0.7"/>
        <circle cx="17" cy="19" r="0.7" fill="#00FFFF" opacity="0.5"/>
        <path d="M9 7L10 16" stroke="white" stroke-width="1" stroke-linecap="round" opacity="0.3"/>
    </svg>`;
}

function getGridDrawSVG() {
    return `
    <svg width="18" height="18" viewBox="0 0 24 24">
        <defs><linearGradient id="gridDrawGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#32CD32;stop-opacity:1" /><stop offset="100%" style="stop-color:#228B22;stop-opacity:0.7" /></linearGradient></defs>
        <rect x="2" y="2" width="20" height="20" rx="2" fill="none" stroke="#32CD32" stroke-width="1" opacity="0.3"/>
        <line x1="8" y1="2" x2="8" y2="22" stroke="#32CD32" stroke-width="0.8" opacity="0.4"/>
        <line x1="14" y1="2" x2="14" y2="22" stroke="#32CD32" stroke-width="0.8" opacity="0.4"/>
        <line x1="2" y1="8" x2="22" y2="8" stroke="#32CD32" stroke-width="0.8" opacity="0.4"/>
        <line x1="2" y1="14" x2="22" y2="14" stroke="#32CD32" stroke-width="0.8" opacity="0.4"/>
        <rect x="9" y="9" width="4" height="4" rx="0.5" fill="url(#gridDrawGrad)" opacity="0.9"/>
        <rect x="9" y="9" width="4" height="4" rx="0.5" fill="none" stroke="#32CD32" stroke-width="0.8"/>
        <path d="M16 14L19 11L21 13L18 16Z" fill="#FFD700" stroke="#CC8800" stroke-width="0.4"/>
        <path d="M16 14L16.5 15L17.5 15.5L17 14.5Z" fill="#333"/>
        <circle cx="8" cy="8" r="1" fill="#32CD32" opacity="0.8"/>
        <circle cx="14" cy="14" r="1" fill="#32CD32" opacity="0.8"/>
    </svg>`;
}

function getRectSelectSVG() {
    return `
    <svg width="18" height="18" viewBox="0 0 24 24">
        <defs><linearGradient id="rectSelectGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#FF8C00;stop-opacity:1" /><stop offset="100%" style="stop-color:#FF6347;stop-opacity:0.8" /></linearGradient></defs>
        <rect x="4" y="4" width="16" height="16" rx="1" fill="url(#rectSelectGrad)" opacity="0.2" stroke="#FF8C00" stroke-width="1.5" stroke-dasharray="2,1.5"/>
        <rect x="2.5" y="2.5" width="3" height="3" rx="0.5" fill="#FF8C00" stroke="white" stroke-width="0.5"/>
        <rect x="18.5" y="2.5" width="3" height="3" rx="0.5" fill="#FF8C00" stroke="white" stroke-width="0.5"/>
        <rect x="2.5" y="18.5" width="3" height="3" rx="0.5" fill="#FF8C00" stroke="white" stroke-width="0.5"/>
        <rect x="18.5" y="18.5" width="3" height="3" rx="0.5" fill="#FF8C00" stroke="white" stroke-width="0.5"/>
        <rect x="10" y="2.5" width="4" height="2.5" rx="0.5" fill="#FF8C00" opacity="0.8"/>
        <rect x="10" y="19" width="4" height="2.5" rx="0.5" fill="#FF8C00" opacity="0.8"/>
        <rect x="2.5" y="10" width="2.5" height="4" rx="0.5" fill="#FF8C00" opacity="0.8"/>
        <rect x="19" y="10" width="2.5" height="4" rx="0.5" fill="#FF8C00" opacity="0.8"/>
        <rect x="6" y="6" width="12" height="12" rx="0.5" fill="none" stroke="white" stroke-width="0.5" opacity="0.2"/>
    </svg>`;
}

function getLassoSVG() {
    return `
    <svg width="18" height="18" viewBox="0 0 24 24">
        <defs><linearGradient id="lassoGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#FF69B4;stop-opacity:1" /><stop offset="100%" style="stop-color:#FF1493;stop-opacity:0.8" /></linearGradient></defs>
        <path d="M12 4C9 4 5 7 5 12C5 17 9 20 12 20C16 20 20 17 20 12C20 8 17 5 14 4" fill="none" stroke="url(#lassoGrad)" stroke-width="2" stroke-linecap="round" stroke-dasharray="2.5,2"/>
        <circle cx="14" cy="4" r="2" fill="#FF69B4" stroke="white" stroke-width="0.5"/>
        <circle cx="10" cy="10" r="1.2" fill="#FF69B4" opacity="0.7"/>
        <circle cx="14" cy="12" r="1" fill="#FF69B4" opacity="0.6"/>
        <circle cx="11" cy="15" r="0.8" fill="#FF69B4" opacity="0.5"/>
        <path d="M8 8C10 9 13 8 16 10" fill="none" stroke="white" stroke-width="0.8" stroke-linecap="round" opacity="0.3"/>
    </svg>`;
}

function getSymmetrySVG() {
    return `
    <svg width="18" height="18" viewBox="0 0 24 24">
        <defs><linearGradient id="symmetryGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#9370DB;stop-opacity:1" /><stop offset="100%" style="stop-color:#8A2BE2;stop-opacity:0.8" /></linearGradient></defs>
        <line x1="12" y1="1" x2="12" y2="23" stroke="#9370DB" stroke-width="1.5" stroke-dasharray="2,2" opacity="0.6"/>
        <path d="M10 5C7 3 3 6 4 10C5 14 9 13 11 11" fill="url(#symmetryGrad)" opacity="0.8" stroke="#7B52B8" stroke-width="0.5"/>
        <path d="M10 13C8 15 5 19 7 21C9 23 12 19 11 17" fill="url(#symmetryGrad)" opacity="0.7" stroke="#7B52B8" stroke-width="0.5"/>
        <path d="M14 5C17 3 21 6 20 10C19 14 15 13 13 11" fill="url(#symmetryGrad)" opacity="0.8" stroke="#7B52B8" stroke-width="0.5"/>
        <path d="M14 13C16 15 19 19 17 21C15 23 12 19 13 17" fill="url(#symmetryGrad)" opacity="0.7" stroke="#7B52B8" stroke-width="0.5"/>
        <circle cx="7" cy="8" r="1" fill="white" opacity="0.5"/>
        <circle cx="17" cy="8" r="1" fill="white" opacity="0.5"/>
        <circle cx="8" cy="16" r="0.8" fill="white" opacity="0.4"/>
        <circle cx="16" cy="16" r="0.8" fill="white" opacity="0.4"/>
    </svg>`;
}

function getUploadSVG() {
    return `
    <svg width="18" height="18" viewBox="0 0 24 24">
        <defs><linearGradient id="uploadGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#3CB371;stop-opacity:1" /><stop offset="100%" style="stop-color:#2E8B57;stop-opacity:0.8" /></linearGradient></defs>
        <path d="M3 6L3 20H21V6H3Z" fill="url(#uploadGrad)" opacity="0.3" stroke="#3CB371" stroke-width="1.2"/>
        <path d="M3 6L3 5C3 4 4 3 5 3H10L12 5H19C20 5 21 6 21 7V8" fill="none" stroke="#3CB371" stroke-width="1.2"/>
        <path d="M12 10V17" stroke="#3CB371" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M8 14L12 10L16 14" fill="none" stroke="#3CB371" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="7" y="12" width="4" height="3" rx="0.5" fill="#3CB371" opacity="0.4"/>
        <circle cx="8.5" cy="13" r="0.5" fill="white" opacity="0.5"/>
    </svg>`;
}
