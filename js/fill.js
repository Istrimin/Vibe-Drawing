import { state } from './state.js';

export function floodFill(x, y, color) {
  const { gridSize, gridCells } = state;

  // Snap to grid coordinates
  const gridX = Math.floor(x / gridSize) * gridSize;
  const gridY = Math.floor(y / gridSize) * gridSize;

  // Check if there's a grid cell at this position
  const existingCell = gridCells.find(cell => cell.x === gridX && cell.y === gridY);

  if (existingCell !== undefined) {
    // Grid mode fill
    gridFloodFill(x, y, color);
  } else {
    // Simple mode fill - not implemented yet
    alert("The Fill tool for free drawing is not yet implemented.");
    console.log(`Flood fill at ${x}, ${y} with color ${color}`);
  }
}

export function gridFloodFill(startX, startY, fillColor) {
  const { gridSize, gridCells } = state;
  const startXGrid = Math.floor(startX / gridSize) * gridSize;
  const startYGrid = Math.floor(startY / gridSize) * gridSize;

  const targetColor = gridCells.find(cell => cell.x === startXGrid && cell.y === startYGrid)?.color;

  if (targetColor === fillColor) {
    return;
  }

  const queue = [{ x: startXGrid, y: startYGrid }];
  const visited = new Set([`${startXGrid},${startYGrid}`]);

  while (queue.length > 0) {
    const { x, y } = queue.shift();

    const cellIndex = gridCells.findIndex(cell => cell.x === x && cell.y === y);

    if (cellIndex !== -1) {
      if (gridCells[cellIndex].color === targetColor) {
        gridCells[cellIndex].color = fillColor;
      } else {
        continue;
      }
    } else {
        if (targetColor === undefined) {
            gridCells.push({ x, y, color: fillColor });
        } else {
            continue;
        }
    }


    const neighbors = [
      { x: x + gridSize, y: y },
      { x: x - gridSize, y: y },
      { x: x, y: y + gridSize },
      { x: x, y: y - gridSize },
    ];

    for (const neighbor of neighbors) {
      const key = `${neighbor.x},${neighbor.y}`;
      if (!visited.has(key)) {
        const neighborCell = gridCells.find(cell => cell.x === neighbor.x && cell.y === neighbor.y);
        const neighborColor = neighborCell?.color;

        if (neighborColor === targetColor) {
          queue.push(neighbor);
          visited.add(key);
        }
      }
    }
  }
}
