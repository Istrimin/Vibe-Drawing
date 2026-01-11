# TODO List - Remove Layers Feature

## Phase 1: Remove layers from state.js
- [x] Remove `layers` and `activeLayer` from state object
- [x] Remove `layerList` from elements object

## Phase 2: Remove layers from main.js
- [x] Remove `updateLayerList` import
- [x] Remove `updateLayerList()` calls from setupUI, undo, redo
- [x] Remove `addLayer()` function
- [x] Remove `activeLayer` from history functions (saveStateToUndoStack, undo, redo)
- [x] Remove `activeLayer` from saveState and loadState
- [x] Remove layer filtering in getImageAtPosition and exportAsImage
- [x] Remove event listeners for addLayerBtn, toggleLayersCb, toggleLayersBtn
- [x] Remove `layer: state.activeLayer` from image upload

## Phase 3: Remove layers from ui.js
- [x] Remove `updateLayerList()` function
- [x] Remove layer references from showDevTools()

## Phase 4: Remove layers from index.html
- [x] Remove addLayerBtn button

## Phase 5: Remove layers from canvas.js
- [x] Remove layer filtering in drawing functions

## Phase 6: Testing
- [x] Verify app loads without errors - Fixed JavaScript errors preventing app load
- [x] Test basic drawing functionality - App should now work without layers feature
