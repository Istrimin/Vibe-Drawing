# New Symmetry and Grid Features

## Symmetry in Grid Mode
- Symmetry now works with grid cells when using the grid-draw tool
- All symmetry modes (vertical, horizontal, quad, radial) apply to grid cells
- Grid cells are duplicated according to the selected symmetry pattern
- Works seamlessly with the existing symmetry panel controls

## Permanent Symmetry on Save
- When saving with symmetry active, the symmetrical copies become permanent
- Symmetry state is preserved when loading saved projects
- Undo/redo also maintains symmetry state and expanded cells
- Loading preserves the symmetry mode that was active during saving

## Grid Snapping for Object Movement
- When moving selected objects (using Ctrl+drag), objects now snap to the grid
- Snapping applies when grid is visible or when using grid-draw tool
- Objects align perfectly to grid boundaries for precise placement
- Both individual grid cells and other objects (images, paths) snap to grid

## How to Use
1. **Enable Symmetry**: Click the symmetry button (Y) and select a mode
2. **Draw on Grid**: Use the grid-draw tool to place cells while symmetry is active
3. **Save with Symmetry**: When you save with symmetry on, all symmetrical copies become permanent
4. **Move with Snapping**: Hold Ctrl and drag selected objects to move them with grid snapping
5. **Adjust Grid**: Change grid size in the right toolbar to control snapping precision

## Technical Implementation
- Added `transformGridCells()` method to Symmetry class
- Modified canvas rendering to apply symmetry to grid cells
- Enhanced save/load functionality to preserve symmetrical cells when symmetry is active
- Enhanced undo/redo to maintain symmetry state and expanded cells
- Enhanced mouse move handling to include grid snapping logic
- Snapping applies to both grid-draw mode and general object movement
