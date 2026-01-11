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
