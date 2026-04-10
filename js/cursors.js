/**
 * Cursor Management Module
 * Handles cursor selection and application
 */
import { state } from './state.js';

// Cursor management state
const cursorState = {
    currentCursor: 'auto',
    customCursor: null,       // User-chosen cursor from panel (persists)
    cursorPanelVisible: false,
    availableCursors: []
};

// DOM elements
let cursorPanel, cursorList, changeCursorBtn, drawingCanvas;

// Initialize cursor system
export function initCursors() {
    // Create cursor panel UI
    createCursorPanelUI();

    // Get DOM elements
    cursorPanel = document.getElementById('cursorPanel');
    cursorList = document.getElementById('cursorList');
    changeCursorBtn = document.getElementById('changeCursorBtn');
    drawingCanvas = document.getElementById('drawingCanvas');

    // Debug: Check if elements were found
    if (!cursorPanel) console.warn('Cursor panel not found');
    if (!cursorList) console.warn('Cursor list not found');
    if (!changeCursorBtn) console.warn('Change cursor button not found');
    if (!drawingCanvas) console.warn('Drawing canvas not found');

    // Load available cursors
    loadCursors();

    // Set up event listeners
    if (changeCursorBtn) {
        changeCursorBtn.addEventListener('click', toggleCursorPanel);
    }

    // Set initial cursor
    if (drawingCanvas) {
        // Restore saved custom cursor
        const savedCursor = localStorage.getItem('vibeDrawingCursor');
        if (savedCursor) {
            cursorState.customCursor = savedCursor;
            cursorState.currentCursor = savedCursor;
            drawingCanvas.style.cursor = savedCursor;
        } else {
            drawingCanvas.style.cursor = cursorState.currentCursor;
        }
    }
}

// Create cursor panel UI elements
function createCursorPanelUI() {
    // Add cursor button to toolbar - make sure we add it to the right toolbar
    const rightToolGroup = document.querySelector('#right-toolbar .tool-group');
    if (rightToolGroup) {
        const cursorBtnHTML = `
            <button class="tool-btn" id="changeCursorBtn" title="Change Cursor (C)">
                <svg width="20" height="20" viewBox="0 0 24 24">
                    <defs>
                        <linearGradient id="cursorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#FFA500;stop-opacity:0.8" />
                        </linearGradient>
                    </defs>
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#cursorGrad)" opacity="0.85"/>
                    <circle cx="12" cy="12" r="2" fill="white" opacity="0.9"/>
                </svg>
            </button>
        `;
        rightToolGroup.insertAdjacentHTML('beforeend', cursorBtnHTML);
    } else {
        console.warn('Could not find right toolbar tool group for cursor button');
    }

    // Create cursor panel
    const canvasContainer = document.querySelector('.canvas-container');
    if (canvasContainer) {
        const cursorPanelHTML = `
            <div id="cursorPanel" class="cursor-panel" style="display: none;">
                <div class="cursor-panel-header">
                    <h3>Select Cursor</h3>
                    <button id="closeCursorPanel" class="close-btn">&times;</button>
                </div>
                <div id="cursorList" class="cursor-grid"></div>
            </div>
        `;
        canvasContainer.insertAdjacentHTML('beforeend', cursorPanelHTML);

        // Add close button event listener
        const closeBtn = document.getElementById('closeCursorPanel');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                cursorPanel.style.display = 'none';
                cursorState.cursorPanelVisible = false;
            });
        }
    } else {
        console.warn('Could not find canvas container for cursor panel');
    }
}

// Load available cursors
function loadCursors() {
    cursorList.innerHTML = '';

    // Add basic cursors
    addCursorOption('Default', 'auto');
    addCursorOption('Crosshair', 'crosshair');
    addCursorOption('Pointer', 'pointer');
    addCursorOption('Move', 'move');
    addCursorOption('Text', 'text');

    // Add separator
    const separator = document.createElement('div');
    separator.className = 'cursor-separator';
    separator.textContent = 'Custom Cursors';
    cursorList.appendChild(separator);

    // Load numbered cursor images (1-44)
    for (let i = 1; i <= 44; i++) {
        const cursorUrl = `cursorsNum/${i}.png`;

        const image = new Image();
        image.src = cursorUrl;
        image.onload = () => {
            addCursorImage(cursorUrl, i);
        };
        image.onerror = () => {
            console.warn(`Cursor image not found: ${cursorUrl}`);
        };
    }

    // Load special cursors
    const specialCursors = [
        { name: 'Pencil', file: 'cursors/pencil.png' },
        { name: 'Eraser', file: 'cursors/eraser.png' },
        { name: 'Pipette', file: 'cursors/pipette.png' }
    ];

    specialCursors.forEach(cursor => {
        const image = new Image();
        image.src = cursor.file;
        image.onload = () => {
            addCursorImage(cursor.file, cursor.name);
        };
        image.onerror = () => {
            console.warn(`Cursor image not found: ${cursor.file}`);
        };
    });
}

// Add a basic cursor option
function addCursorOption(name, cursorValue) {
    const cursorItem = document.createElement('div');
    cursorItem.className = 'cursor-item';
    cursorItem.textContent = name;
    cursorItem.addEventListener('click', () => {
        setCursor(cursorValue);
        cursorPanel.style.display = 'none';
        cursorState.cursorPanelVisible = false;
    });
    cursorList.appendChild(cursorItem);
}

// Add a cursor image option
function addCursorImage(cursorUrl, name) {
    const cursorItem = document.createElement('div');
    cursorItem.className = 'cursor-item';

    const originalImg = new Image();
    originalImg.crossOrigin = "Anonymous"; // Handle potential CORS issues if ever loading from external URLs
    originalImg.src = cursorUrl;

    originalImg.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = 32; // A standard, safe cursor size
        canvas.width = size;
        canvas.height = size;

        // Draw the loaded image onto the canvas to resize it
        ctx.drawImage(originalImg, 0, 0, size, size);

        // Get the resized image as a data URL
        const resizedCursorUrl = canvas.toDataURL('image/png');

        // Create the preview image for the panel
        const cursorPreviewImg = document.createElement('img');
        cursorPreviewImg.src = resizedCursorUrl;
        cursorPreviewImg.alt = typeof name === 'string' ? name : `cursor${name}`;
        cursorPreviewImg.className = 'cursor-preview';

        // Add click event to set the resized cursor
        cursorPreviewImg.addEventListener('click', () => {
            // Set hotspot to top-left corner for consistency
            setCursor(`url(${resizedCursorUrl}) 0 0, auto`); 
            if (cursorPanel) {
                cursorPanel.style.display = 'none';
            }
            cursorState.cursorPanelVisible = false;
        });

        cursorItem.appendChild(cursorPreviewImg);
        cursorList.appendChild(cursorItem);
    };

    originalImg.onerror = () => {
        console.warn(`Could not load and process cursor image: ${cursorUrl}`);
        // Add a placeholder to show that loading failed
        cursorItem.textContent = `Error: ${name}`;
        cursorItem.title = `Failed to load ${cursorUrl}`;
        cursorList.appendChild(cursorItem);
    };
}

// Set the current cursor
function setCursor(cursorValue, save = true) {
    cursorState.currentCursor = cursorValue;
    if (drawingCanvas) {
        drawingCanvas.style.cursor = cursorValue;
    }
    // Persist cursor choice only when explicitly requested
    if (save) {
        try { localStorage.setItem('vibeDrawingCursor', cursorValue); } catch(e) {}
    }
}

// Set pipette cursor for Alt key functionality (don't save)
export function setPipetteCursor() {
    if (cursorState.customCursor) {
        setCursor(cursorState.customCursor, false);
    } else {
        const pipetteCursor = 'url(cursors/pipette32.png) 0 0, auto';
        setCursor(pipetteCursor, false);
    }
}

// Set pencil cursor for pencil tool (don't save)
export function setPencilCursor() {
    if (cursorState.customCursor) {
        setCursor(cursorState.customCursor, false);
    } else {
        const pencilCursor = 'url(cursors/pencil.png) 0 0, auto';
        setCursor(pencilCursor, false);
    }
}

// Set eraser cursor for eraser tool (don't save)
export function setEraserCursor() {
    if (cursorState.customCursor) {
        setCursor(cursorState.customCursor, false);
    } else {
        const eraserCursor = 'url(cursors/eraser.png) 0 0, auto';
        setCursor(eraserCursor, false);
    }
}

// Set grid-draw cursor (uses custom cursor if set)
export function setGridDrawCursor() {
    if (cursorState.customCursor) {
        setCursor(cursorState.customCursor, false);
    } else {
        if (drawingCanvas) drawingCanvas.style.cursor = 'crosshair';
    }
}

// Toggle cursor panel visibility
export function toggleCursorPanel() {
    if (cursorPanel.style.display === 'none') {
        cursorPanel.style.display = 'block';
        cursorState.cursorPanelVisible = true;
    } else {
        cursorPanel.style.display = 'none';
        cursorState.cursorPanelVisible = false;
    }
}

// Get current cursor state
export function getCurrentCursor() {
    return cursorState.currentCursor;
}

// Get custom cursor (for persistence check)
export function getCustomCursor() {
    return cursorState.customCursor;
}

// Clear custom cursor and reset to default
export function clearCustomCursor() {
    cursorState.customCursor = null;
    localStorage.removeItem('vibeDrawingCursor');
    drawingCanvas.style.cursor = 'auto';
}

// Reset cursor to default (based on current tool)
export function resetCursor() {
    if (drawingCanvas) {
        // Import state dynamically to avoid circular dependency
        import('./state.js').then(({ state }) => {
            // If Alt key is down, show pipette cursor (never custom)
            if (state.altKeyDown) {
                setPipetteCursor();
                return;
            }

            // If user has a custom cursor, use it for drawing tools
            if (cursorState.customCursor) {
                const drawingTools = ['pencil', 'grid-draw', 'eraser'];
                if (drawingTools.includes(state.selectionTool)) {
                    drawingCanvas.style.cursor = cursorState.customCursor;
                    return;
                }
            }

            // Get cursor based on current tool
            const toolCursor = getCursorForTool(state.selectionTool);

            // Only set cursor if we have a specific tool cursor, otherwise use default
            if (toolCursor !== 'auto') {
                drawingCanvas.style.cursor = toolCursor;
            } else {
                drawingCanvas.style.cursor = cursorState.currentCursor;
            }
        }).catch(err => {
            console.warn('Could not import state:', err);
            drawingCanvas.style.cursor = 'auto';
        });
    }
}

// Get cursor value for a specific tool
export function getCursorForTool(tool) {
    switch(tool) {
        case 'pencil':
            return 'url(cursors/pencil.png) 0 0, auto';
        case 'eraser':
            return 'url(cursors/eraser.png) 0 0, auto';
        case 'pipette':
            return 'url(cursors/pipette32.png) 0 0, auto';
        default:
            return 'auto';
    }
}
