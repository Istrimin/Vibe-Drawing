# TODO List

- [ ] ## 0. Добавить Timeline (ползунок в статусбаре)
  - **Description**: Использовать существующую систему истории (undoStack) как таймлайн. Добавить ползунок в статусбар для перемотки по кадрам истории.
  - **Implementation**:
    - Использовать существующие `state.undoStack` и `state.redoStack`
    - Добавить UI в статусбар: ползунок для выбора кадра + кнопки play/pause
    - Ползунок показывает общее количество сохранённых состояний
    - Перетаскивание ползунка восстанавливает выбранное состояние
    - Play/Pause циклически переключает кадры с регулируемой скоростью
    - При любом новом действии очистить redoStack и добавить новое состояние
  - **Files to edit**: `index.html`, `js/main.js`, `style.css`

- [ ] ## 1. Добавить линию симметрии
  - **Description**: Add a visual symmetry line (axis) that can be toggled on/off.
  - **Implementation**:
    - Add a checkbox/toggle in the Symmetry Panel.
    - Store `showSymmetryLine` in `state`.
    - Draw the line in `redrawCanvas` using `state.ctx.moveTo/lineTo`.
  - **Files to edit**: `js/main.js`, `js/canvas.js`, `index.html`

- [ ] ## 2. Добавить возможность копирования при удержании Shift
  - **Description**: Allow copying selected objects by holding Shift while dragging.
  - **Implementation**:
    - In `handleCanvasMouseMove`, detect if `Shift` is held down during a move operation.
    - Clone the selected objects, apply the move transformation to the clones, and add them to the state.
  - **Files to edit**: `js/main.js`

- [ ] ## 3. Добавить заливку для режима рисования по гриду
  - **Description**: Implement a bucket fill tool for the grid mode (flood fill algorithm on grid cells).
  - **Implementation**:
    - Create a new tool or modify existing grid-draw tool (e.g., hold Shift + Left Click).
    - Implement a BFS/DFS flood fill algorithm operating on the `state.gridCells` array.
  - **Files to edit**: `js/main.js`, `js/fill.js`

- [ ] ## 4. Сделать регулировку размера кисти в грид-режиме: 1 квадрат, 4, 8, 16, 32 и так далее
  - **Description**: Allow users to change brush size in grid mode.
  - **Sizes**: 1 square, 4, 8, 16, 32, etc.
  - **Implementation**:
    - Add a new UI control (dropdown or slider) for grid brush size.
    - Modify `state` to store `gridBrushSize` (default: 1).
    - Update mouse handlers to fill multiple cells based on brush size.
  - **Files to edit**: `js/main.js`, `js/canvas.js`, `index.html`

- [ ] ## 5. Отдельные настройки для ластика по тому же принципу масштабирования
  - **Description**: Separate eraser settings for grid mode with similar scaling (1, 4, 8, 16, 32).
  - **Implementation**:
    - Add a new UI control for grid eraser size.
    - Modify `state` to store `gridEraserSize` (default: 1).
    - Update grid-draw tool handling to support right-click erasing with configurable size.
  - **Files to edit**: `js/main.js`, `index.html`

- [ ] ## 6. Возможность добавления фигур: круг, квадрат, треугольник
  - **Description**: Allow adding geometric shapes to the canvas.
  - **Implementation**:
    - Add new tool buttons in `index.html`.
    - Implement shape drawing logic (mousedown, mousemove, mouseup).
    - Store shapes as objects in `state.shapes` array.
    - Render shapes in `redrawCanvas`.
  - **Files to edit**: `js/main.js`, `js/canvas.js`, `index.html`, `style.css`

- [ ] ## 7. Заменить стандартные иконки на иконки из папки проекта
  - **Description**: Replace inline SVG icons with icons from the project folder.
  - **Implementation**:
    - Copy necessary icons to an `icons/` directory in the project root.
    - Update `index.html` to use `<img>` tags or CSS background images referencing these files.
  - **Files to edit**: `index.html`, `style.css`

- [ ] ## 8. Пофиксить выделение, чтобы оно не показывало лишнее окно
  - **Description**: Prevent selection handles/windows from showing incorrectly.
  - **Implementation**:
    - Review `drawSelection` and `drawObjectSelection` functions in `js/canvas.js`.
    - Ensure visual feedback is clean and doesn't include unnecessary UI elements.
  - **Files to edit**: `js/canvas.js`, `style.css`

- [ ] ## 9. Добавить настройку стиля отображения квадратов: прозрачность и другие варианты
  - **Description**: Customize the appearance of empty grid squares.
  - **Implementation**:
    - Add UI controls for `gridOpacity` (0-1) and `gridStyle` options.
    - Update `drawGrid` in `js/canvas.js` to use `state.ctx.globalAlpha` for transparency.
  - **Files to edit**: `js/main.js`, `js/canvas.js`, `index.html`

- [ ] ## 10. Возможность выбора текстуры для квадратов
  - **Description**: Allow selecting a texture/image for grid cells.
  - **Implementation**:
    - Add a texture picker in the UI.
    - Store `gridTexture` in `state` (base64 string or URL).
    - Modify `redrawCanvas` to use `createPattern` or `drawImage` for grid cells if a texture is set.
  - **Files to edit**: `js/main.js`, `js/canvas.js`, `index.html`

---

## Priority Order (Order of Implementation)
1. Grid Features (Brush Size, Eraser Size, Fill)
2. Selection Fixes & Copy
3. Symmetry Line & Shapes
4. Grid Customization
5. UI Polish

