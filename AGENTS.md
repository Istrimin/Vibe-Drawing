# AGENTS.md - Vibe-Drawing

## Project Type
Single-page HTML5 canvas drawing app. No build system, no tests, no linter. Run by opening `index.html` in a browser.

## Entry Point
`index.html` loads `js/main.js` as an ES6 module (`<script type="module" src="js/main.js" defer>`).

## Key Directories
- `js/` - Application JavaScript modules
- `cursors/` - Custom cursor images
- `cursorsNum/` - Numbered cursor images (1-44)

## Development
Simply open `index.html` in a browser. No dev server, no build commands needed.

## Architecture Notes
- **State management**: `js/state.js` exports `state` object and `initializeElements()`
- **Canvas rendering**: `js/canvas.js` - `redrawCanvas()` is the central redraw function
- **History/Timeline**: Uses `state.undoStack`/`state.redoStack` as timeline (see `js/history.js`)
- **Grid mode**: Separate drawing mode with configurable brush sizes (1, 4, 8, 16, 32...)
- **Symmetry modes**: vertical, horizontal, quad, radial (stored in `state.symmetryMode`)

## UI Structure
- Top toolbar: brush size, color picker, eraser size, grid brush size
- Left toolbar: tool buttons (pencil, select, eraser, pipette, fill, grid-draw, rect-select, lasso, symmetry)
- Right toolbar: zoom, grid toggle, save/load/export, clear canvas
- Timeline controls at bottom: play/pause slider for history frames

## Common Issues (from TODO.md)
- Timeline last action not always remembered
- Selection handles sometimes show extra UI
- Grid fill not yet implemented