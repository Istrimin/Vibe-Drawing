/**
 * Timeline Buttons Module
 * Creates and manages the timeline controls
 */

export function createTimelineControls() {
    let timelineControls = document.getElementById('timelineControls');
    if (!timelineControls) {
        timelineControls = document.createElement('div');
        timelineControls.id = 'timelineControls';
        timelineControls.className = 'timeline-controls';
        document.getElementById('app').appendChild(timelineControls);
    }

    timelineControls.innerHTML = `
        <button class="tool-btn" id="undoBtn" data-tooltip="Undo (Ctrl+Z)">
            ${getUndoSVG()}
        </button>
        <button class="tool-btn" id="redoBtn" data-tooltip="Redo (Ctrl+Y)">
            ${getRedoSVG()}
        </button>
        <button class="tool-btn" id="tasksBtn" data-tooltip="Tasks">
            ${getTasksSVG()}
        </button>
        <button class="timeline-btn" id="timelinePlayBtn" data-tooltip="Play/Pause">
            ${getPlaySVG()}
        </button>
        <input type="range" id="timelineSlider" min="0" max="0" value="0" class="timeline-slider">
        <span id="timelineFrame">0/0</span>
        <button class="timeline-btn" id="timelineSpeedBtn" data-tooltip="Playback Speed">
            ${getSpeedSVG()}
        </button>
    `;
}

function getUndoSVG() {
    return `<svg width="12" height="12" viewBox="0 0 24 24">
        <path d="M9 14L4 9L9 4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M4 9H14C17.31 9 20 11.69 20 15C20 16.5 19.2 18.2 18 19.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
        <circle cx="6" cy="9" r="1.5" fill="currentColor" opacity="0.8"/>
    </svg>`;
}

function getRedoSVG() {
    return `<svg width="12" height="12" viewBox="0 0 24 24">
        <path d="M15 14L20 9L15 4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M20 9H10C6.69 9 4 11.69 4 15C4 16.5 4.8 18.2 6 19.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
        <circle cx="18" cy="9" r="1.5" fill="currentColor" opacity="0.8"/>
    </svg>`;
}

function getTasksSVG() {
    return `<svg width="16" height="16" viewBox="0 0 24 24">
        <defs><linearGradient id="tasksGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#FF6B6B;stop-opacity:1" /><stop offset="100%" style="stop-color:#EE5A5A;stop-opacity:0.8" /></linearGradient></defs>
        <rect x="2" y="3" width="20" height="18" rx="2" fill="none" stroke="url(#tasksGrad)" stroke-width="1.5"/>
        <line x1="2" y1="7" x2="22" y2="7" stroke="url(#tasksGrad)" stroke-width="1.5"/>
        <circle cx="5" cy="5" r="1" fill="#FF6B6B"/>
        <circle cx="8" cy="5" r="1" fill="#FFD700"/>
        <circle cx="11" cy="5" r="1" fill="#32CD32"/>
        <path d="M6 12L8 14L12 10" fill="none" stroke="#32CD32" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6 17L8 19L12 15" fill="none" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="14" y1="11" x2="19" y2="11" stroke="#FF6B6B" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
        <line x1="14" y1="16" x2="18" y2="16" stroke="#FF6B6B" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
    </svg>`;
}

function getPlaySVG() {
    return `<svg width="14" height="14" viewBox="0 0 24 24">
        <defs><linearGradient id="playGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#7b61ff;stop-opacity:1" /><stop offset="100%" style="stop-color:#5b41ef;stop-opacity:0.9" /></linearGradient></defs>
        <path d="M8 5L19 12L8 19Z" fill="url(#playGrad)" stroke="white" stroke-width="0.8" stroke-linejoin="round" class="play-icon"/>
        <rect x="7" y="6" width="3.5" height="12" rx="1" fill="url(#playGrad)" stroke="white" stroke-width="0.5" class="pause-icon" style="display:none"/>
        <rect x="13.5" y="6" width="3.5" height="12" rx="1" fill="url(#playGrad)" stroke="white" stroke-width="0.5" class="pause-icon" style="display:none"/>
    </svg>`;
}

function getSpeedSVG() {
    return `<svg width="14" height="14" viewBox="0 0 24 24">
        <defs><linearGradient id="speedGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" /><stop offset="100%" style="stop-color:#FFA500;stop-opacity:0.9" /></linearGradient></defs>
        <path d="M12 4C7 4 3 8 3 13H6C6 9.7 8.7 7 12 7C15.3 7 18 9.7 18 13H21C21 8 17 4 12 4Z" fill="url(#speedGrad)" opacity="0.3" stroke="url(#speedGrad)" stroke-width="1.5"/>
        <line x1="12" y1="13" x2="16" y2="7" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="13" r="2" fill="#FFD700" stroke="white" stroke-width="0.5"/>
        <line x1="17" y1="5" x2="19" y2="3" stroke="#FFA500" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
        <line x1="20" y1="8" x2="22" y2="8" stroke="#FFA500" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
    </svg>`;
}
