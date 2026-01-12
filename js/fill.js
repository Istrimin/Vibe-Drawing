import { state } from './state.js';

export function floodFill(x, y, color) {
  const { gridSize, gridCells } = state;

  // Snap to grid coordinates
  const gridX = Math.floor(x / gridSize) * gridSize;
  const gridY = Math.floor(y / gridSize) * gridSize;

  // Check if there's a grid cell at this position
  const existingCell = gridCells.find(cell => cell.x === gridX && cell.y === gridY);

  if (existingCell !== undefined) {
    // Fill connected cells of the same color
    gridFloodFill(x, y, color);
  } else {
    // When clicking on an empty space, fill ALL empty spaces on the canvas with the new color
    // This means filling every grid position that doesn't already have a cell
    fillAllEmptySpaces(color);
  }
}

// Fill all empty spaces on the canvas with the given color
function fillAllEmptySpaces(fillColor) {
  const { gridSize, gridCells } = state;
  
  if (gridCells.length === 0) {
    // If no cells exist, fill a reasonable area around the origin
    fillEmptyCanvas(0, 0, fillColor);
    return;
  }
  
  // Calculate the bounding box of all existing cells
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  for (const cell of gridCells) {
    minX = Math.min(minX, cell.x);
    minY = Math.min(minY, cell.y);
    maxX = Math.max(maxX, cell.x);
    maxY = Math.max(maxY, cell.y);
  }
  
  // Define a canvas area to fill - expand the bounding box somewhat
  const canvasBuffer = 20 * gridSize; // Buffer around existing cells
  const canvasMinX = minX - canvasBuffer;
  const canvasMaxX = maxX + canvasBuffer;
  const canvasMinY = minY - canvasBuffer;
  const canvasMaxY = maxY + canvasBuffer;
  
  // Create a set of existing filled positions for faster lookup
  const filledSet = new Set();
  for (const cell of gridCells) {
    filledSet.add(`${cell.x},${cell.y}`);
  }
  
  // Fill all empty positions within the canvas area
  for (let x = canvasMinX; x <= canvasMaxX; x += gridSize) {
    for (let y = canvasMinY; y <= canvasMaxY; y += gridSize) {
      const key = `${x},${y}`;
      
      // Only add if this position doesn't already have a cell
      if (!filledSet.has(key)) {
        gridCells.push({ x, y, color: fillColor });
      }
    }
  }
}

// Fill canvas when no cells exist yet
function fillEmptyCanvas(centerX, centerY, fillColor) {
  const { gridSize, gridCells } = state;
  
  // Add a moderate number of cells around the click point
  for (let i = -10; i <= 10; i++) {
    for (let j = -10; j <= 10; j++) {
      const x = centerX + i * gridSize;
      const y = centerY + j * gridSize;
      
      // Check if cell already exists to avoid duplicates
      const existingCell = gridCells.find(cell => cell.x === x && cell.y === y);
      if (!existingCell) {
        gridCells.push({ x, y, color: fillColor });
      }
    }
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

export function fillEnclosedArea(startX, startY, fillColor) {
  const { gridSize, gridCells } = state;
  const startXGrid = Math.floor(startX / gridSize) * gridSize;
  const startYGrid = Math.floor(startY / gridSize) * gridSize;

  // Check if start position is already filled
  const existingCell = gridCells.find(cell => cell.x === startXGrid && cell.y === startYGrid);
  if (existingCell) return; // Don't fill if already filled

  const queue = [{ x: startXGrid, y: startYGrid }];
  const visited = new Set([`${startXGrid},${startYGrid}`]);
  const cellsToFill = [{ x: startXGrid, y: startYGrid }];

  // Limit to prevent infinite filling in case of open areas
  const MAX_FILL_CELLS = 10000;

  while (queue.length > 0 && cellsToFill.length < MAX_FILL_CELLS) {
    const { x, y } = queue.shift();

    const neighbors = [
      { x: x + gridSize, y: y },
      { x: x - gridSize, y: y },
      { x: x, y: y + gridSize },
      { x: x, y: y - gridSize },
    ];

    for (const neighbor of neighbors) {
      const key = `${neighbor.x},${neighbor.y}`;
      if (!visited.has(key)) {
        visited.add(key);

        const existingNeighbor = gridCells.find(cell => cell.x === neighbor.x && cell.y === neighbor.y);
        if (!existingNeighbor) {
          // Empty space, can fill
          queue.push(neighbor);
          cellsToFill.push(neighbor);
        }
        // If filled, it's a boundary, don't go through
      }
    }
  }

  // If we hit the limit, don't fill (probably open area)
  if (cellsToFill.length >= MAX_FILL_CELLS) {
    return;
  }

  // Now fill all the cellsToFill
  for (const cell of cellsToFill) {
    gridCells.push({ x: cell.x, y: cell.y, color: fillColor });
  }
}
