// js/history.js
import { state } from './state.js';

// Playback state
let playbackInterval = null;
let playbackSpeed = 1; // 1x speed
let playbackCurrentFrame = 0;
let playbackTotalFrames = 0;
let isPlaying = false;
let playbackCallback = null;

export function saveState() {
    // Create a copy of the current state to save in the undo stack
    const currentState = {
        images: JSON.parse(JSON.stringify(state.images)),
        drawingPaths: JSON.parse(JSON.stringify(state.drawingPaths)),
        gridCells: JSON.parse(JSON.stringify(state.gridCells)),
        selectedImage: state.selectedImage,
        selectedObjects: JSON.parse(JSON.stringify(state.selectedObjects)),
        zoomLevel: state.zoomLevel,
        panOffset: { ...state.panOffset },
        // Add other state properties that should be saved
    };
    
    // Remove any future states if we're not at the end of the history
    state.undoStack.splice(state.currentHistoryIndex + 1);
    
    // Add current state to undo stack
    state.undoStack.push(currentState);
    state.currentHistoryIndex = state.undoStack.length - 1;
    
    // Clear redo stack when new action is added
    state.redoStack = [];
    
    // Limit undo stack size
    if (state.undoStack.length > 50) {
        state.undoStack.shift();
        state.currentHistoryIndex = state.undoStack.length - 1;
    }
}

export function undo() {
    if (state.undoStack.length > 0 && state.currentHistoryIndex >= 0) {
        // Save current state to redo stack
        const currentState = {
            images: JSON.parse(JSON.stringify(state.images)),
            drawingPaths: JSON.parse(JSON.stringify(state.drawingPaths)),
            gridCells: JSON.parse(JSON.stringify(state.gridCells)),
            selectedImage: state.selectedImage,
            selectedObjects: JSON.parse(JSON.stringify(state.selectedObjects)),
            zoomLevel: state.zoomLevel,
            panOffset: { ...state.panOffset },
        };
        state.redoStack.push(currentState);
        
        // Move to previous state in undo stack
        state.currentHistoryIndex = Math.max(-1, state.currentHistoryIndex - 1);
        
        // If we're at the beginning (no previous state), reset to empty state
        if (state.currentHistoryIndex === -1) {
            state.images = [];
            state.drawingPaths = [];
            state.gridCells = [];
            state.selectedImage = null;
            state.selectedObjects = [];
            state.zoomLevel = 1;
            state.panOffset = { x: 0, y: 0 };
        } else {
            // Get previous state from undo stack
            const previousState = state.undoStack[state.currentHistoryIndex];
            state.images = JSON.parse(JSON.stringify(previousState.images));
            state.drawingPaths = JSON.parse(JSON.stringify(previousState.drawingPaths));
            state.gridCells = JSON.parse(JSON.stringify(previousState.gridCells));
            state.selectedImage = previousState.selectedImage;
            state.selectedObjects = JSON.parse(JSON.stringify(previousState.selectedObjects));
            state.zoomLevel = previousState.zoomLevel;
            state.panOffset = { ...previousState.panOffset };
        }
        
        // Redraw canvas with new state
        if (window.redrawCanvas) {
            window.redrawCanvas();
        }
    }
}

export function redo() {
    if (state.redoStack.length > 0) {
        // Save current state to undo stack
        const currentState = {
            images: JSON.parse(JSON.stringify(state.images)),
            drawingPaths: JSON.parse(JSON.stringify(state.drawingPaths)),
            gridCells: JSON.parse(JSON.stringify(state.gridCells)),
            selectedImage: state.selectedImage,
            selectedObjects: JSON.parse(JSON.stringify(state.selectedObjects)),
            zoomLevel: state.zoomLevel,
            panOffset: { ...state.panOffset },
        };
        state.undoStack.push(currentState);
        // We're actually going back in history (from redo stack to undo stack), so increment index
        state.currentHistoryIndex = state.undoStack.length - 1;
        
        // Get next state from redo stack
        const nextState = state.redoStack.pop();
        state.images = JSON.parse(JSON.stringify(nextState.images));
        state.drawingPaths = JSON.parse(JSON.stringify(nextState.drawingPaths));
        state.gridCells = JSON.parse(JSON.stringify(nextState.gridCells));
        state.selectedImage = nextState.selectedImage;
        state.selectedObjects = JSON.parse(JSON.stringify(nextState.selectedObjects));
        state.zoomLevel = nextState.zoomLevel;
        state.panOffset = { ...nextState.panOffset };
        
        // Redraw canvas with new state
        if (window.redrawCanvas) {
            window.redrawCanvas();
        }
    }
}

// Playback functions
export function startPlayback(callback) {
    if (state.undoStack.length === 0 || isPlaying) return;

    playbackCallback = callback;
    playbackTotalFrames = state.undoStack.length;
    playbackCurrentFrame = 0;
    isPlaying = true;

    // Start from the beginning
    playbackInterval = setInterval(() => {
        if (playbackCurrentFrame >= playbackTotalFrames) {
            stopPlayback();
            return;
        }

        // Load the current frame from undo stack
        const frameState = state.undoStack[playbackCurrentFrame];
        if (frameState) {
            state.images = JSON.parse(JSON.stringify(frameState.images));
            state.drawingPaths = JSON.parse(JSON.stringify(frameState.drawingPaths));
            state.gridCells = JSON.parse(JSON.stringify(frameState.gridCells));
            state.selectedImage = frameState.selectedImage;
            state.selectedObjects = JSON.parse(JSON.stringify(frameState.selectedObjects));
            state.zoomLevel = frameState.zoomLevel;
            state.panOffset = { ...frameState.panOffset };

            // Redraw canvas with new state
            if (window.redrawCanvas) {
                window.redrawCanvas();
            }

            // Update playback state
            playbackCurrentFrame++;

            // Call callback to update UI
            if (playbackCallback) {
                playbackCallback(playbackCurrentFrame, playbackTotalFrames);
            }
        }
    }, 1000 / playbackSpeed); // Frame rate based on speed
}

export function stopPlayback() {
    if (playbackInterval) {
        clearInterval(playbackInterval);
        playbackInterval = null;
    }
    isPlaying = false;
    playbackCurrentFrame = 0;
    if (playbackCallback) {
        playbackCallback(0, playbackTotalFrames);
    }
}

export function pausePlayback() {
    if (playbackInterval) {
        clearInterval(playbackInterval);
        playbackInterval = null;
    }
    isPlaying = false;
}

export function resumePlayback() {
    if (isPlaying || playbackCurrentFrame >= playbackTotalFrames) return;
    isPlaying = true;

    playbackInterval = setInterval(() => {
        if (playbackCurrentFrame >= playbackTotalFrames) {
            stopPlayback();
            return;
        }

        // Load the current frame from undo stack
        const frameState = state.undoStack[playbackCurrentFrame];
        if (frameState) {
            state.images = JSON.parse(JSON.stringify(frameState.images));
            state.drawingPaths = JSON.parse(JSON.stringify(frameState.drawingPaths));
            state.gridCells = JSON.parse(JSON.stringify(frameState.gridCells));
            state.selectedImage = frameState.selectedImage;
            state.selectedObjects = JSON.parse(JSON.stringify(frameState.selectedObjects));
            state.zoomLevel = frameState.zoomLevel;
            state.panOffset = { ...frameState.panOffset };

            // Redraw canvas with new state
            if (window.redrawCanvas) {
                window.redrawCanvas();
            }

            playbackCurrentFrame++;

            if (playbackCallback) {
                playbackCallback(playbackCurrentFrame, playbackTotalFrames);
            }
        }
    }, 1000 / playbackSpeed);
}

export function setPlaybackSpeed(speed) {
    playbackSpeed = Math.max(0.25, Math.min(4, speed)); // Clamp between 0.25x and 4x

    // Restart interval with new speed if playing
    if (isPlaying) {
        pausePlayback();
        resumePlayback();
    }
}

export function scrubToFrame(frameIndex) {
    if (frameIndex < 0 || frameIndex >= state.undoStack.length) return;

    playbackCurrentFrame = frameIndex;

    // Load the selected frame from undo stack
    const frameState = state.undoStack[frameIndex];
    if (frameState) {
        state.images = JSON.parse(JSON.stringify(frameState.images));
        state.drawingPaths = JSON.parse(JSON.stringify(frameState.drawingPaths));
        state.gridCells = JSON.parse(JSON.stringify(frameState.gridCells));
        state.selectedImage = frameState.selectedImage;
        state.selectedObjects = JSON.parse(JSON.stringify(frameState.selectedObjects));
        state.zoomLevel = frameState.zoomLevel;
        state.panOffset = { ...frameState.panOffset };

        // Redraw canvas with new state
        if (window.redrawCanvas) {
            window.redrawCanvas();
        }

        if (playbackCallback) {
            playbackCallback(playbackCurrentFrame, playbackTotalFrames);
        }
    }
}

// Getters for playback state
export function getPlaybackState() {
    return {
        isPlaying,
        currentFrame: playbackCurrentFrame,
        totalFrames: playbackTotalFrames,
        speed: playbackSpeed
    };
}

export function getHistoryLength() {
    return state.undoStack.length;
}

// Initialize current history index
if (state.currentHistoryIndex === undefined) {
    state.currentHistoryIndex = -1;
}
