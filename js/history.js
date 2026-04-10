// js/history.js
import { state } from './state.js';

let playbackInterval = null;
let playbackSpeed = 1;
let playbackCurrentFrame = 0;
let playbackTotalFrames = 0;
let isPlaying = false;
let playbackCallback = null;

export function saveState() {
    const currentState = {
        images: JSON.parse(JSON.stringify(state.images)),
        drawingPaths: JSON.parse(JSON.stringify(state.drawingPaths)),
        gridCells: JSON.parse(JSON.stringify(state.gridCells)),
        selectedImage: state.selectedImage,
        selectedObjects: JSON.parse(JSON.stringify(state.selectedObjects)),
        selectionTool: state.selectionTool,
        showSymmetryLine: state.showSymmetryLine,
    };

    state.undoStack.splice(state.currentHistoryIndex + 1);
    state.undoStack.push(currentState);
    state.currentHistoryIndex = state.undoStack.length - 1;
    state.redoStack = [];

    const timelineFrame = document.getElementById('timelineFrame');
    if (timelineFrame) {
        timelineFrame.textContent = `${state.currentHistoryIndex + 1}/${state.undoStack.length}`;
    }

    // Update undo/redo count badges
    const undoCount = document.getElementById('undoCount');
    const redoCount = document.getElementById('redoCount');
    if (undoCount) undoCount.textContent = state.currentHistoryIndex + 1;
    if (redoCount) redoCount.textContent = state.redoStack.length;
}

export function undo() {
    if (state.undoStack.length > 0 && state.currentHistoryIndex >= 0) {
        const currentState = {
            images: JSON.parse(JSON.stringify(state.images)),
            drawingPaths: JSON.parse(JSON.stringify(state.drawingPaths)),
            gridCells: JSON.parse(JSON.stringify(state.gridCells)),
            selectedImage: state.selectedImage,
            selectedObjects: JSON.parse(JSON.stringify(state.selectedObjects)),
            selectionTool: state.selectionTool,
        };
        state.redoStack.push(currentState);
        state.currentHistoryIndex = Math.max(-1, state.currentHistoryIndex - 1);

        if (state.currentHistoryIndex === -1) {
            state.images = [];
            state.drawingPaths = [];
            state.gridCells = [];
            state._gridCellsSet = null;
            state.selectedImage = null;
            state.selectedObjects = [];
        } else {
            const previousState = state.undoStack[state.currentHistoryIndex];
            state.images = JSON.parse(JSON.stringify(previousState.images));
            state.drawingPaths = JSON.parse(JSON.stringify(previousState.drawingPaths));
            state.gridCells = JSON.parse(JSON.stringify(previousState.gridCells));
            state._gridCellsSet = null;
            state.selectedImage = previousState.selectedImage;
            state.selectedObjects = JSON.parse(JSON.stringify(previousState.selectedObjects));
            state.selectionTool = previousState.selectionTool;
        }

        if (window.redrawCanvas) window.redrawCanvas();
    }
}

export function redo() {
    if (state.redoStack.length > 0) {
        const currentState = {
            images: JSON.parse(JSON.stringify(state.images)),
            drawingPaths: JSON.parse(JSON.stringify(state.drawingPaths)),
            gridCells: JSON.parse(JSON.stringify(state.gridCells)),
            selectedImage: state.selectedImage,
            selectedObjects: JSON.parse(JSON.stringify(state.selectedObjects)),
            selectionTool: state.selectionTool,
        };
        state.undoStack.push(currentState);
        state.currentHistoryIndex = state.undoStack.length - 1;

        const nextState = state.redoStack.pop();
        state.images = JSON.parse(JSON.stringify(nextState.images));
        state.drawingPaths = JSON.parse(JSON.stringify(nextState.drawingPaths));
        state.gridCells = JSON.parse(JSON.stringify(nextState.gridCells));
        state._gridCellsSet = null;
        state.selectedImage = nextState.selectedImage;
        state.selectedObjects = JSON.parse(JSON.stringify(nextState.selectedObjects));
        state.selectionTool = nextState.selectionTool;

        if (window.redrawCanvas) window.redrawCanvas();
    }
}

export function startPlayback(callback) {
    if (state.undoStack.length === 0 || isPlaying) return;
    playbackCallback = callback;
    playbackTotalFrames = state.undoStack.length;
    playbackCurrentFrame = 0;
    isPlaying = true;

    playbackInterval = setInterval(() => {
        if (playbackCurrentFrame >= playbackTotalFrames) { stopPlayback(); return; }
        const frameState = state.undoStack[playbackCurrentFrame];
        if (frameState) {
            state.images = JSON.parse(JSON.stringify(frameState.images));
            state.drawingPaths = JSON.parse(JSON.stringify(frameState.drawingPaths));
            state.gridCells = JSON.parse(JSON.stringify(frameState.gridCells));
            state.selectedImage = frameState.selectedImage;
            state.selectedObjects = JSON.parse(JSON.stringify(frameState.selectedObjects));
            state.selectionTool = frameState.selectionTool;
            if (window.redrawCanvas) window.redrawCanvas();
            playbackCurrentFrame++;
            if (playbackCallback) playbackCallback(playbackCurrentFrame, playbackTotalFrames);
        }
    }, 1000 / playbackSpeed);
}

export function stopPlayback() {
    if (playbackInterval) { clearInterval(playbackInterval); playbackInterval = null; }
    isPlaying = false;
    playbackCurrentFrame = 0;
    if (playbackCallback) playbackCallback(0, playbackTotalFrames);
}

export function pausePlayback() {
    if (playbackInterval) { clearInterval(playbackInterval); playbackInterval = null; }
    isPlaying = false;
}

export function resumePlayback() {
    if (isPlaying || playbackCurrentFrame >= playbackTotalFrames) return;
    isPlaying = true;
    playbackInterval = setInterval(() => {
        if (playbackCurrentFrame >= playbackTotalFrames) { stopPlayback(); return; }
        const frameState = state.undoStack[playbackCurrentFrame];
        if (frameState) {
            state.images = JSON.parse(JSON.stringify(frameState.images));
            state.drawingPaths = JSON.parse(JSON.stringify(frameState.drawingPaths));
            state.gridCells = JSON.parse(JSON.stringify(frameState.gridCells));
            state.selectedImage = frameState.selectedImage;
            state.selectedObjects = JSON.parse(JSON.stringify(frameState.selectedObjects));
            state.selectionTool = frameState.selectionTool;
            if (window.redrawCanvas) window.redrawCanvas();
            playbackCurrentFrame++;
            if (playbackCallback) playbackCallback(playbackCurrentFrame, playbackTotalFrames);
        }
    }, 1000 / playbackSpeed);
}

export function setPlaybackSpeed(speed) {
    playbackSpeed = Math.max(0.25, Math.min(4, speed));
    if (isPlaying) { pausePlayback(); resumePlayback(); }
}

export function scrubToFrame(frameIndex) {
    if (frameIndex < 0 || frameIndex >= state.undoStack.length) return;
    playbackCurrentFrame = frameIndex;
    playbackTotalFrames = state.undoStack.length;
    const frameState = state.undoStack[frameIndex];
    if (frameState) {
        state.images = JSON.parse(JSON.stringify(frameState.images));
        state.drawingPaths = JSON.parse(JSON.stringify(frameState.drawingPaths));
        state.gridCells = JSON.parse(JSON.stringify(frameState.gridCells));
        state.selectedImage = frameState.selectedImage;
        state.selectedObjects = JSON.parse(JSON.stringify(frameState.selectedObjects));
        state.selectionTool = frameState.selectionTool;
        if (window.redrawCanvas) window.redrawCanvas();
        if (playbackCallback) playbackCallback(playbackCurrentFrame, playbackTotalFrames);
    }
}

export function getPlaybackState() {
    return { isPlaying, currentFrame: playbackCurrentFrame, totalFrames: playbackTotalFrames, speed: playbackSpeed };
}

export function getHistoryLength() {
    return state.undoStack.length;
}

if (state.currentHistoryIndex === undefined) { state.currentHistoryIndex = -1; }
