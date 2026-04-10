/**
 * Top Toolbar Buttons Module
 * Creates and manages the top toolbar UI elements
 */

export function createTopToolbar() {
    const topToolbar = document.getElementById('top-toolbar');
    if (!topToolbar) return;

    // Brush size (normal mode only)
    const brushSetting = document.createElement('div');
    brushSetting.className = 'tool-setting-horizontal setting-normal';
    brushSetting.innerHTML = `
        <label for="brushSizeSlider">✏️</label>
        <input type="range" id="brushSizeSlider" min="1" max="100" value="3">
        <span id="brushSizeValue">3</span>
    `;
    topToolbar.appendChild(brushSetting);

    // Color picker (always visible)
    const colorSetting = document.createElement('div');
    colorSetting.className = 'tool-setting-horizontal no-mode';
    colorSetting.innerHTML = `
        <label for="brushColorPicker">Color</label>
        <input type="color" id="brushColorPicker" value="#ffffff" title="Brush Color">
        <div id="colorPalette" class="color-palette-container"></div>
        <input type="color" id="swatchColorPicker" style="position: absolute; visibility: hidden; width: 0; height: 0;" title="">
    `;
    topToolbar.appendChild(colorSetting);

    // Create color swatches
    const palette = colorSetting.querySelector('#colorPalette');
    const colors = [
        { color: '#ffffff', tooltip: 'White' },
        { color: '#ff0000', tooltip: 'Red' },
        { color: '#ffa500', tooltip: 'Orange' },
        { color: '#ffff00', tooltip: 'Yellow' },
        { color: '#008000', tooltip: 'Green' },
        { color: '#00ffff', tooltip: 'Cyan' },
        { color: '#0000ff', tooltip: 'Blue' },
        { color: '#800080', tooltip: 'Purple' },
        { color: '#ffc0cb', tooltip: 'Pink' },
        { color: '#000000', tooltip: 'Black' }
    ];
    colors.forEach((c, i) => {
        const swatch = document.createElement('button');
        swatch.className = 'color-swatch' + (i === 0 ? ' active' : '');
        swatch.dataset.color = c.color;
        swatch.title = c.tooltip;
        swatch.style.backgroundColor = c.color;
        palette.appendChild(swatch);
    });

    // Eraser size (normal mode only)
    const eraserSetting = document.createElement('div');
    eraserSetting.className = 'tool-setting-horizontal setting-normal';
    eraserSetting.innerHTML = `
        <label for="eraserSizeSlider">🧹</label>
        <input type="range" id="eraserSizeSlider" min="1" max="200" value="20">
        <span id="eraserSizeValue">20</span>
    `;
    topToolbar.appendChild(eraserSetting);

    // Grid eraser
    const gridEraser = document.createElement('div');
    gridEraser.className = 'tool-setting-horizontal setting-grid';
    gridEraser.innerHTML = `
        <label for="gridEraserSizeSlider">🧽</label>
        <input type="range" id="gridEraserSizeSlider" min="1" max="32" step="1" value="1">
        <span id="gridEraserSizeValue">1</span>
    `;
    topToolbar.appendChild(gridEraser);

    // Grid brush
    const gridBrush = document.createElement('div');
    gridBrush.className = 'tool-setting-horizontal setting-grid';
    gridBrush.innerHTML = `
        <label for="gridBrushSizeSlider">🖌️</label>
        <input type="range" id="gridBrushSizeSlider" min="1" max="32" step="1" value="1">
        <span id="gridBrushSizeValue">1</span>
    `;
    topToolbar.appendChild(gridBrush);

    // Grid size (top)
    const gridSizeSetting = document.createElement('div');
    gridSizeSetting.className = 'tool-setting-horizontal setting-grid';
    gridSizeSetting.innerHTML = `
        <label for="gridSizeInputTop">📐</label>
        <input type="number" id="gridSizeInputTop" min="4" max="64" value="16">
        <span id="gridSizeValueTop">16</span>
    `;
    topToolbar.appendChild(gridSizeSetting);

    // 2x upscale
    const upscale = document.createElement('div');
    upscale.className = 'tool-setting-horizontal setting-grid';
    upscale.innerHTML = `<button id="upscaleBtn" title="Увеличить рисунок в 2 раза">2x</button>`;
    topToolbar.appendChild(upscale);
}
