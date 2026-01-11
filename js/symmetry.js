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
}
