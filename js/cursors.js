/**
 * Cursor Management Module
 * Handles cursor selection and application
 */

// Cursor management state
const cursorState = {
    currentCursor: 'auto',
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
        drawingCanvas.style.cursor = cursorState.currentCursor;
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
                    <path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
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
function setCursor(cursorValue) {
    cursorState.currentCursor = cursorValue;
    if (drawingCanvas) {
        drawingCanvas.style.cursor = cursorValue;
    }
}

// Toggle cursor panel visibility
function toggleCursorPanel() {
    if (cursorPanel.style.display === 'none') {
        cursorPanel.style.display = 'block';
        cursorState.cursorPanelVisible = true;
    } else {
        cursorPanel.style.display = 'none';
        cursorState.cursorPanelVisible = false;
    }
}

// Keyboard shortcut for cursor panel
export function setupCursorKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'c' || e.key === 'C') {
            toggleCursorPanel();
            e.preventDefault();
        }
    });
}

// Get current cursor state
export function getCurrentCursor() {
    return cursorState.currentCursor;
}

// Set pipette cursor for Alt key functionality
export function setPipetteCursor() {
    const pipetteCursor = 'url(cursors/pipette32.png) 0 0, auto';
    setCursor(pipetteCursor);
}

// Set pencil cursor for pencil tool
export function setPencilCursor() {
    const pencilCursor = 'url(cursors/pencil.png) 0 0, auto';
    setCursor(pencilCursor);
}

// Set eraser cursor for eraser tool
export function setEraserCursor() {
    const eraserCursor = 'url(cursors/eraser.png) 0 0, auto';
    setCursor(eraserCursor);
}

// Reset cursor to default (based on current tool)
export function resetCursor() {
    if (drawingCanvas) {
        // Import state dynamically to avoid circular dependency
        import('./state.js').then(({ state }) => {
            // If Alt key is down, we should show pipette cursor
            if (state.altKeyDown) {
                setPipetteCursor();
                return;
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
        case 'color-picker':
            return 'url(cursors/pipette32.png) 0 0, auto';
        default:
            return 'auto';
    }
}
