# TODO List - Move Selection & Delete Features

## Phase 1: State Updates
- [x] Add `ghostOffset` property to state (for visual preview)
- [x] Add `selectedObjects` to history state snapshots
- [x] Add `isGhostVisible` property to state

## Phase 2: Visual Ghost Preview (Canvas)
- [x] Create `drawGhostPreview()` function in canvas.js
- [x] Call ghost draw in `redrawCanvas()` after main content
- [x] Calculate ghost offset based on current drag position

## Phase 3: Move Mode with Visual Feedback (Main.js)
- [x] Update `handleCanvasMouseDown` - Ctrl key activates move mode
- [x] Update `handleCanvasMouseMove` - Use ghost preview instead of direct movement
- [x] Update `handleCanvasMouseUp` - Apply final position from ghost
- [x] Add cursor change when Ctrl is pressed over selection

## Phase 4: Delete Selected Objects (Main.js)
- [x] Update `handleKeyDown` - Delete key removes all selectedObjects
- [x] Save state to undo stack before deletion
- [x] Handle all object types: images, paths, gridCells

## Phase 5: History Improvements (Main.js)
- [x] Update `saveStateToUndoStack` to include selectedObjects
- [x] Update `undo()` to restore selectedObjects
- [x] Update `redo()` to restore selectedObjects
- [x] Fix `loadState()` to clear selectedObjects on load

## Phase 6: Testing
- [x] Test visual ghost preview during move with Ctrl
- [x] Test Ctrl key activates move mode
- [x] Test Delete removes all selected objects
- [x] Test Undo/Redo for delete operations

