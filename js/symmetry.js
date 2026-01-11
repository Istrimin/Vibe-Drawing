export class Symmetry {
    constructor() {
        this.mode = 'off'; // 'off', 'vertical', 'horizontal', 'quad', 'radial'
        this.radialRays = 8;
    }

    setMode(newMode) {
        if (this.mode === newMode) {
            this.mode = 'off'; // Toggle off if clicking the same mode
        } else {
            this.mode = newMode;
        }
    }

    setRays(count) {
        this.radialRays = Math.max(2, count); // Ensure at least 2 rays
    }

    isActive() {
        return this.mode !== 'off';
    }

    /**
     * Creates an array of symmetric paths based on the current mode.
     * @param {Array} path - An array of path points, e.g., [{x, y, ...}]
     * @returns {Array<Array>} An array of paths, including the original and all symmetric versions.
     */
    transformPath(path) {
        if (this.mode === 'off' || !path || path.length === 0) {
            return [path]; // Return the original path in an array
        }

        const transformedPaths = [path];

        switch (this.mode) {
            case 'vertical':
                transformedPaths.push(path.map(p => ({ ...p, x: -p.x })));
                break;
            case 'horizontal':
                transformedPaths.push(path.map(p => ({ ...p, y: -p.y })));
                break;
            case 'quad':
                transformedPaths.push(path.map(p => ({ ...p, x: -p.x })));
                transformedPaths.push(path.map(p => ({ ...p, y: -p.y })));
                transformedPaths.push(path.map(p => ({ ...p, x: -p.x, y: -p.y })));
                break;
            case 'radial':
                const angleIncrement = (2 * Math.PI) / this.radialRays;
                for (let i = 1; i < this.radialRays; i++) {
                    const angle = angleIncrement * i;
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);

                    const rotatedPath = path.map(p => {
                        const newX = p.x * cos - p.y * sin;
                        const newY = p.x * sin + p.y * cos;
                        return { ...p, x: newX, y: newY };
                    });
                    transformedPaths.push(rotatedPath);
                }
                break;
        }

        return transformedPaths;
    }

    /**
     * Creates symmetric grid cells based on the current mode.
     * @param {Array} cells - An array of grid cell objects, e.g., [{x, y, color}, ...]
     * @param {number} gridSize - The size of the grid
     * @returns {Array} An array of all grid cells, including original and symmetric versions.
     */
    transformGridCells(cells, gridSize) {
        if (this.mode === 'off' || !cells || cells.length === 0) {
            return [...cells]; // Return a copy of the original cells
        }

        const transformedCells = [...cells];

        switch (this.mode) {
            case 'vertical':
                cells.forEach(cell => {
                    const mirroredX = -Math.floor(cell.x / gridSize) * gridSize;
                    if (mirroredX !== cell.x) {
                        transformedCells.push({
                            ...cell,
                            x: mirroredX
                        });
                    }
                });
                break;
            case 'horizontal':
                cells.forEach(cell => {
                    const mirroredY = -Math.floor(cell.y / gridSize) * gridSize;
                    if (mirroredY !== cell.y) {
                        transformedCells.push({
                            ...cell,
                            y: mirroredY
                        });
                    }
                });
                break;
            case 'quad':
                cells.forEach(cell => {
                    const mirroredX = -Math.floor(cell.x / gridSize) * gridSize;
                    const mirroredY = -Math.floor(cell.y / gridSize) * gridSize;
                    
                    if (mirroredX !== cell.x) {
                        transformedCells.push({
                            ...cell,
                            x: mirroredX
                        });
                    }
                    if (mirroredY !== cell.y) {
                        transformedCells.push({
                            ...cell,
                            y: mirroredY
                        });
                    }
                    if (mirroredX !== cell.x && mirroredY !== cell.y) {
                        transformedCells.push({
                            ...cell,
                            x: mirroredX,
                            y: mirroredY
                        });
                    }
                });
                break;
            case 'radial':
                const angleIncrement = (2 * Math.PI) / this.radialRays;
                for (let i = 1; i < this.radialRays; i++) {
                    const angle = angleIncrement * i;
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);

                    cells.forEach(cell => {
                        // Convert cell position to center of cell for rotation calculation
                        const centerX = cell.x + gridSize / 2;
                        const centerY = cell.y + gridSize / 2;
                        
                        // Rotate around origin (0,0)
                        const rotatedCenterX = centerX * cos - centerY * sin;
                        const rotatedCenterY = centerX * sin + centerY * cos;
                        
                        // Snap back to grid
                        const snappedX = Math.floor(rotatedCenterX / gridSize) * gridSize;
                        const snappedY = Math.floor(rotatedCenterY / gridSize) * gridSize;
                        
                        // Only add if it's not the same as original position
                        if (snappedX !== cell.x || snappedY !== cell.y) {
                            transformedCells.push({
                                ...cell,
                                x: snappedX,
                                y: snappedY
                            });
                        }
                    });
                }
                break;
        }

        return transformedCells;
    }
}
