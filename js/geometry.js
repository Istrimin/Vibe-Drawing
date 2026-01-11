// js/geometry.js

/**
 * Calculates the bounding box of a path.
 * @param {Array} path - An array of points {x, y}.
 * @returns {Object} A bounding box object { minX, minY, maxX, maxY }.
 */
export function getPathBoundingBox(path) {
    if (!path || path.length === 0) {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    let minX = path[0].x;
    let minY = path[0].y;
    let maxX = path[0].x;
    let maxY = path[0].y;

    for (let i = 1; i < path.length; i++) {
        minX = Math.min(minX, path[i].x);
        minY = Math.min(minY, path[i].y);
        maxX = Math.max(maxX, path[i].x);
        maxY = Math.max(maxY, path[i].y);
    }

    // Account for brush size
    const size = path[0].size / 2 || 1;
    return { minX: minX - size, minY: minY - size, maxX: maxX + size, maxY: maxY + size };
}

/**
 * Checks if two rectangles intersect.
 * @param {Object} rect1 - Bounding box { minX, minY, maxX, maxY }.
 * @param {Object} rect2 - Bounding box { minX, minY, maxX, maxY }.
 * @returns {boolean} True if they intersect.
 */
export function doRectanglesIntersect(rect1, rect2) {
    return (
        rect1.minX <= rect2.maxX &&
        rect1.maxX >= rect2.minX &&
        rect1.minY <= rect2.maxY &&
        rect1.maxY >= rect2.minY
    );
}

/**
 * Bresenham's line algorithm - returns all grid cells that a line passes through.
 * @param {number} x0 - Start X coordinate (world space)
 * @param {number} y0 - Start Y coordinate (world space)
 * @param {number} x1 - End X coordinate (world space)
 * @param {number} y1 - End Y coordinate (world space)
 * @param {number} gridSize - Size of grid cells
 * @returns {Array} Array of objects {x, y} representing cell positions
 */
export function getCellsBetweenPoints(x0, y0, x1, y1, gridSize) {
    const cells = [];

    // Convert world coordinates to cell coordinates
    const cellX0 = Math.floor(x0 / gridSize) * gridSize;
    const cellY0 = Math.floor(y0 / gridSize) * gridSize;
    const cellX1 = Math.floor(x1 / gridSize) * gridSize;
    const cellY1 = Math.floor(y1 / gridSize) * gridSize;

    // If same cell, return just that cell
    if (cellX0 === cellX1 && cellY0 === cellY1) {
        return [{ x: cellX0, y: cellY0 }];
    }

    // Use Bresenham's algorithm on cell indices
    let cx0 = Math.round(cellX0 / gridSize);
    let cy0 = Math.round(cellY0 / gridSize);
    let cx1 = Math.round(cellX1 / gridSize);
    let cy1 = Math.round(cellY1 / gridSize);

    const dx = Math.abs(cx1 - cx0);
    const dy = Math.abs(cy1 - cy0);
    const sx = cx0 < cx1 ? 1 : -1;
    const sy = cy0 < cy1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
        cells.push({ x: cx0 * gridSize, y: cy0 * gridSize });

        if (cx0 === cx1 && cy0 === cy1) break;

        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            cx0 += sx;
        }
        if (e2 < dx) {
            err += dx;
            cy0 += sy;
        }
    }

    return cells;
}
