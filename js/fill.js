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
    // When clicking on an empty space, first try to fill enclosed area
    // If the area is not enclosed (open), then fill empty spaces
    if (!tryFillEnclosedArea(x, y, color)) {
      // If enclosed fill didn't work (area is open), fill empty spaces within bounds
      fillEmptySpacesWithinBounds(x, y, color);
    }
  }
}

// Function to erase (remove) cells in a flood-fill manner
export function floodErase(x, y) {
  const { gridSize, gridCells } = state;

  // Snap to grid coordinates
  const gridX = Math.floor(x / gridSize) * gridSize;
  const gridY = Math.floor(y / gridSize) * gridSize;

  // Check if there's a grid cell at this position
  const existingCell = gridCells.find(cell => cell.x === gridX && cell.y === gridY);

  if (existingCell !== undefined) {
    // Erase connected cells that have the same color
    gridFloodErase(x, y, existingCell.color);
  } else {
    // When clicking on an empty space, erase ALL cells on the canvas
    // This means removing every grid cell
    eraseAllCells();
  }
}

// Erase all cells on the canvas
function eraseAllCells() {
  const { gridSize, gridCells } = state;
  
  if (gridCells.length === 0) {
    // If no cells exist, nothing to erase
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
  
  // Define a canvas area to erase - expand the bounding box somewhat
  const canvasBuffer = 20 * gridSize; // Buffer around existing cells
  const canvasMinX = minX - canvasBuffer;
  const canvasMaxX = maxX + canvasBuffer;
  const canvasMinY = minY - canvasBuffer;
  const canvasMaxY = maxY + canvasBuffer;
  
  // Create a set of positions that have cells for faster lookup
  const filledSet = new Set();
  for (const cell of gridCells) {
    filledSet.add(`${cell.x},${cell.y}`);
  }
  
  // Filter out all cells within the canvas area to erase them
  const newGridCells = gridCells.filter(cell => {
    // Keep cells that are outside the canvas area we're erasing
    return cell.x < canvasMinX || cell.x > canvasMaxX ||
           cell.y < canvasMinY || cell.y > canvasMaxY;
  });
  
  // Replace the gridCells array with the filtered version
  state.gridCells.splice(0, state.gridCells.length);
  state.gridCells.push(...newGridCells);
}


// Flood erase connected cells of the same color
function gridFloodErase(startX, startY, targetColor) {
 const { gridSize, gridCells } = state;
  const startXGrid = Math.floor(startX / gridSize) * gridSize;
  const startYGrid = Math.floor(startY / gridSize) * gridSize;

  if (targetColor === undefined) {
    return;
  }

  const queue = [{ x: startXGrid, y: startYGrid }];
  const visited = new Set([`${startXGrid},${startYGrid}`]);

  while (queue.length > 0) {
    const { x, y } = queue.shift();

    // Find and remove the cell at this position
    const cellIndex = gridCells.findIndex(cell => cell.x === x && cell.y === y);

    if (cellIndex !== -1) {
      if (gridCells[cellIndex].color === targetColor) {
        // Remove the cell from the array
        gridCells.splice(cellIndex, 1);
      } else {
        continue;
      }
    } else {
      continue;
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

// Try to fill an enclosed area. Returns true if successful (enclosed), false if not (open area).
function tryFillEnclosedArea(startX, startY, fillColor) {
  const { gridSize, gridCells } = state;
  const startXGrid = Math.floor(startX / gridSize) * gridSize;
  const startYGrid = Math.floor(startY / gridSize) * gridSize;

  // Check if start position is already filled
  const existingCell = gridCells.find(cell => cell.x === startXGrid && cell.y === startYGrid);
  if (existingCell) return false; // Can't fill if already filled

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
          // Empty space, can potentially fill
          queue.push(neighbor);
          cellsToFill.push(neighbor);
        }
        // If filled, it's a boundary, don't go through
      }
    }
  }

  // If we hit the limit, the area is probably open (unbounded)
  if (cellsToFill.length >= MAX_FILL_CELLS) {
    return false; // Area is not enclosed
  }

 // Fill all the cellsToFill
  for (const cell of cellsToFill) {
    gridCells.push({ x: cell.x, y: cell.y, color: fillColor });
  }
  
  return true; // Area was enclosed and filled
}

// Fill empty spaces within reasonable bounds (for open areas)
function fillEmptySpacesWithinBounds(startX, startY, fillColor) {
  const { gridSize, gridCells } = state;
  
  // Define a reasonable area around the click point to fill
  const range = 20; // 20 cells in each direction
  const centerX = Math.floor(startX / gridSize) * gridSize;
  const centerY = Math.floor(startY / gridSize) * gridSize;
  
  // Create a set of existing filled positions for faster lookup
  const filledSet = new Set();
  for (const cell of gridCells) {
    filledSet.add(`${cell.x},${cell.y}`);
  }
  
  // Fill empty positions within the defined range
  for (let i = -range; i <= range; i++) {
    for (let j = -range; j <= range; j++) {
      const x = centerX + i * gridSize;
      const y = centerY + j * gridSize;
      const key = `${x},${y}`;
      
      // Only add if this position doesn't already have a cell
      if (!filledSet.has(key)) {
        gridCells.push({ x, y, color: fillColor });
      }
    }
  }
}
