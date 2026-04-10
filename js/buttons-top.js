/**
 * Top Toolbar Buttons Module
 * Creates and manages the top toolbar UI elements
 */

export function createTopToolbar() {
    const topToolbar = document.getElementById('top-toolbar');
    if (!topToolbar) return;

    // Brush size
    const brushSetting = createSetting('brushSizeSlider', 'Brush', 1, 100, 3);
    topToolbar.appendChild(brushSetting);

    // Color picker
    const colorSetting = document.createElement('div');
    colorSetting.className = 'tool-setting-horizontal';
    colorSetting.innerHTML = `
        <label for="brushColorPicker">Color</label>
        <input type="color" id="brushColorPicker" value="#ffffff" data-tooltip="Brush Color">
        <div id="colorPalette" class="color-palette-container"></div>
        <input type="color" id="swatchColorPicker" style="position: absolute; visibility: hidden; width: 0; height: 0;" data-tooltip="">
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
        swatch.dataset.tooltip = c.tooltip;
        swatch.style.backgroundColor = c.color;
        palette.appendChild(swatch);
    });

    // Eraser size
    const eraserSetting = createSetting('eraserSizeSlider', 'Eraser', 1, 200, 20);
    topToolbar.appendChild(eraserSetting);

    // Grid eraser
    const gridEraser = createSetting('gridEraserSizeSlider', 'G.Eraser', 1, 32, 1);
    gridEraser.classList.add('setting-grid');
    topToolbar.appendChild(gridEraser);

    // Grid brush
    const gridBrush = createSetting('gridBrushSizeSlider', 'G.Brush', 1, 32, 1);
    gridBrush.classList.add('setting-grid');
    topToolbar.appendChild(gridBrush);

    // Grid size (top)
    const gridSizeSetting = document.createElement('div');
    gridSizeSetting.className = 'tool-setting-horizontal setting-grid';
    gridSizeSetting.innerHTML = `
        <label for="gridSizeInputTop">G.Size</label>
        <input type="number" id="gridSizeInputTop" min="4" max="64" value="16">
        <span id="gridSizeValueTop">16</span>
    `;
    topToolbar.appendChild(gridSizeSetting);

    // 2x upscale
    const upscale = document.createElement('div');
    upscale.className = 'tool-setting-horizontal setting-grid';
    upscale.innerHTML = `<button id="upscaleBtn" data-tooltip="Увеличить рисунок в 2 раза">2x</button>`;
    topToolbar.appendChild(upscale);
}

function createSetting(id, label, min, max, value) {
    const setting = document.createElement('div');
    setting.className = 'tool-setting-horizontal setting-normal';
    setting.innerHTML = `
        <label for="${id}">${label}</label>
        <input type="range" id="${id}" min="${min}" max="${max}" value="${value}">
        <span id="${id.replace('Slider', 'Value')}">${value}</span>
    `;
    return setting;
}
