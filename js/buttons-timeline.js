import { exportImage } from './export-image.js';

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
        <button class="tool-btn" id="undoBtn" title="Undo (Ctrl+Z)">
            ${getUndoSVG()}
        </button>
        <button class="tool-btn" id="redoBtn" title="Redo (Ctrl+Y)">
            ${getRedoSVG()}
        </button>
        <button class="tool-btn" id="tasksBtn" title="Tasks">
            ${getTasksSVG()}
        </button>
        <button class="tool-btn" id="exportImageBtn" title="Export Image">
            ${getExportImageSVG()}
        </button>
        <button class="timeline-btn" id="timelinePlayBtn" title="Play/Pause">
            ${getPlaySVG()}
        </button>
        <input type="range" id="timelineSlider" min="0" max="0" value="0" class="timeline-slider">
        <span id="timelineFrame">0/0</span>
        <button class="timeline-btn" id="timelineSpeedBtn" title="Playback Speed">
            ${getSpeedSVG()}
        </button>
    `;
    
    // Add click handler for export image button
    setTimeout(() => {
        const exportBtn = document.getElementById('exportImageBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                exportImage();
            });
        }
    }, 0);
}

function getUndoSVG() {
    return `<svg width="14" height="14" viewBox="0 0 24 24">
        <defs>
            <linearGradient id="undoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#ff8585;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#ff5252;stop-opacity:1" />
            </linearGradient>
        </defs>
        <circle cx="9" cy="9" r="6" fill="url(#undoGrad)" opacity="0.2"/>
        <path d="M9 6L5 9L9 12" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M5 9H12C14.5 9 16.5 10.5 17 12.5" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
        <circle cx="5" cy="9" r="1.5" fill="white"/>
    </svg>`;
}

function getRedoSVG() {
    return `<svg width="14" height="14" viewBox="0 0 24 24">
        <defs>
            <linearGradient id="redoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#6ed7cf;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#2ab7a9;stop-opacity:1" />
            </linearGradient>
        </defs>
        <circle cx="15" cy="9" r="6" fill="url(#redoGrad)" opacity="0.2"/>
        <path d="M15 6L19 9L15 12" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M19 9H12C9.5 9 7.5 10.5 7 12.5" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
        <circle cx="19" cy="9" r="1.5" fill="white"/>
    </svg>`;
}

function getTasksSVG() {
    return `<svg width="16" height="16" viewBox="0 0 24 24">
        <defs><linearGradient id="tasksGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" /><stop offset="100%" style="stop-color:#ffb700;stop-opacity:0.9" /></linearGradient></defs>
        <circle cx="12" cy="12" r="10" fill="url(#tasksGrad)" opacity="0.2"/>
        <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="url(#tasksGrad)" stroke-width="1.5"/>
        <line x1="3" y1="9" x2="21" y2="9" stroke="url(#tasksGrad)" stroke-width="1.5"/>
        <circle cx="6" cy="7" r="1" fill="#FFD700"/>
        <circle cx="9" cy="7" r="1" fill="#FF6B6B"/>
        <circle cx="12" cy="7" r="1" fill="#4ECDC4"/>
        <path d="M7 13L9 15L13 11" fill="none" stroke="#4ECDC4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M7 17L9 19L13 15" fill="none" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="15" y1="12" x2="19" y2="12" stroke="#FF6B6B" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
        <line x1="15" y1="16" x2="18" y2="16" stroke="#FF6B6B" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
    </svg>`;
}

function getExportImageSVG() {
    return `<svg width="16" height="16" viewBox="0 0 24 24">
        <defs>
            <linearGradient id="exportImgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#22c55e;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#16a34a;stop-opacity:1" />
            </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="10" fill="url(#exportImgGrad)" opacity="0.2"/>
        <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="white" stroke-width="1.5"/>
        <circle cx="8" cy="10" r="2" fill="white"/>
        <path d="M3 15L8 11L12 14L16 10L21 15" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M21 17V19H3V17" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;
}

function getPlaySVG() {
    return `<svg width="16" height="16" viewBox="0 0 24 24">
        <defs>
            <linearGradient id="playGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
            </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="10" fill="url(#playGrad)" opacity="0.2"/>
        <path d="M9 6L18 12L9 18Z" fill="white" stroke="white" stroke-width="1" stroke-linejoin="round" class="play-icon"/>
        <rect x="8" y="7" width="2.5" height="10" rx="1" fill="white" class="pause-icon" style="display:none"/>
        <rect x="13.5" y="7" width="2.5" height="10" rx="1" fill="white" class="pause-icon" style="display:none"/>
    </svg>`;
}

function getSpeedSVG() {
    return `<svg width="16" height="16" viewBox="0 0 24 24">
        <defs>
            <linearGradient id="speedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#fbbf24;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#f59e0b;stop-opacity:1" />
            </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="10" fill="url(#speedGrad)" opacity="0.2"/>
        <path d="M12 6C8 6 5 9 5 13H8C8 10.5 10 9 12 9C14 9 16 10.5 16 13H19C19 9 16 6 12 6Z" fill="white"/>
        <path d="M12 13L14 10" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="13" r="1.5" fill="white"/>
    </svg>`;
}
