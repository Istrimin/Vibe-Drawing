/**
 * Tasks Module — менеджер задач в стиле Jupyter notebook
 * Хранит данные в localStorage как массив объектов
 */

const TASKS_STORAGE_KEY = 'vibeDrawingTasks';
const COMPLETED_TASKS_KEY = 'vibeDrawingCompletedTasks';
const EDIT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

let tasksBtn = null;
let tasksPanel = null;
let tasksContainer = null;
let addTaskInput = null;
let tasksCloseBtn = null;

let tasks = [];
let completedTasks = [];
let showCompleted = false;

export function initTasks() {
    tasksBtn = document.getElementById('tasksBtn');
    tasksPanel = document.getElementById('tasksPanel');
    tasksContainer = document.getElementById('tasksContainer');
    addTaskInput = document.getElementById('addTaskInput');

    if (!tasksBtn) {
        console.warn('Tasks button not found');
        return;
    }

    if (!tasksPanel) {
        createTasksPanel();
    }

    // Close button - just close panel, don't move tasks
    const closeButton = tasksPanel.querySelector('#tasksCloseBtn');
    closeButton.addEventListener('click', () => {
        tasksPanel.style.display = 'none';
    });

    tasksBtn.addEventListener('click', () => {
        tasksPanel.style.display = tasksPanel.style.display === 'none' || tasksPanel.style.display === '' ? 'block' : 'none';
        if (tasksPanel.style.display === 'block') {
            loadTasks();
        }
    });
}

function createTasksPanel() {
    const app = document.getElementById('app');
    if (!app) return;

    tasksPanel = document.createElement('div');
    tasksPanel.id = 'tasksPanel';
    tasksPanel.className = 'tasks-panel';
    tasksPanel.style.display = 'none';

    tasksPanel.innerHTML = `
        <div class="tasks-panel-header">
            <h3>📋 Tasks <span class="tasks-count">(${tasks.length})</span></h3>
            <div class="tasks-header-actions">
                <button id="tasksShowCompletedBtn" title="Show completed">✓ ${completedTasks.length}</button>
                <button id="tasksSortBtn" title="Sort by date">↕️ Sort</button>
                <button id="tasksCloseBtn" class="close-btn" title="Close">&times;</button>
            </div>
        </div>
        <div class="tasks-add-row">
            <input type="text" id="addTaskInput" placeholder="New task..." spellcheck="false">
            <button id="addTaskBtn">+ Add</button>
        </div>
        <div id="tasksContainer" class="tasks-container"></div>
    `;

    app.appendChild(tasksPanel);

    const addTaskBtn = document.getElementById('addTaskBtn');
    const input = document.getElementById('addTaskInput');
    const sortBtn = document.getElementById('tasksSortBtn');
    const closeBtn = document.getElementById('tasksCloseBtn');
    const showCompletedBtn = document.getElementById('tasksShowCompletedBtn');

    addTaskBtn.addEventListener('click', () => addTask(input.value));
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask(input.value);
    });
    sortBtn.addEventListener('click', () => {
        tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        saveTasks();
        renderTasks();
    });
    showCompletedBtn.addEventListener('click', () => {
        showCompleted = !showCompleted;
        showCompletedBtn.textContent = showCompleted ? `← Back (${tasks.length})` : `✓ ${completedTasks.length}`;
        renderTasks();
    });
    // Close handled in initTasks
}

function addTask(text) {
    if (!text.trim()) return;

    const task = {
        id: Date.now(),
        text: text.trim(),
        createdAt: new Date().toISOString()
    };

    tasks.push(task);
    saveTasks();
    renderTasks();

    const input = document.getElementById('addTaskInput');
    if (input) input.value = '';
}

function isEditable(task) {
    const age = Date.now() - new Date(task.createdAt).getTime();
    return age < EDIT_TIMEOUT_MS;
}

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task || !isEditable(task)) return;

    const cell = document.querySelector(`.task-cell[data-id="${id}"] .task-cell-content`);
    if (!cell) return;

    const currentText = task.text;
    cell.innerHTML = `<input type="text" class="task-edit-input" value="${escapeHtml(currentText)}">`;
    
    const input = cell.querySelector('.task-edit-input');
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);

    const saveEdit = () => {
        const newText = input.value.trim();
        if (newText && newText !== currentText) {
            task.text = newText;
            saveTasks();
        }
        renderTasks();
    };

    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
        }
        if (e.key === 'Escape') {
            input.value = currentText;
            input.blur();
        }
    });
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
}

function completeTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    completedTasks.push({
        ...task,
        completedAt: new Date().toISOString()
    });
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    saveCompletedTasks();
    renderTasks();
}

function formatDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function renderTasks() {
    const container = document.getElementById('tasksContainer');
    if (!container) return;

    // Update header count
    const countSpan = tasksPanel.querySelector('.tasks-count');
    if (countSpan) {
        countSpan.textContent = showCompleted ? ` (${completedTasks.length} completed)` : `(${tasks.length})`;
    }

    const displayTasks = showCompleted ? completedTasks : tasks;

    if (displayTasks.length === 0) {
        container.innerHTML = `<div class="tasks-empty">${showCompleted ? 'No completed tasks yet' : 'No tasks yet'}</div>`;
        return;
    }

    if (showCompleted) {
        container.innerHTML = completedTasks.map(task => `
            <div class="task-cell completed" data-id="${task.id}">
                <div class="task-cell-header">
                    <span class="task-date">${formatDate(task.createdAt)} → ${formatDate(task.completedAt)}</span>
                    <button class="task-delete-btn" data-id="${task.id}" title="Delete">✕</button>
                </div>
                <div class="task-cell-content">${escapeHtml(task.text)}</div>
            </div>
        `).join('');
        
        container.querySelectorAll('.task-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteCompletedTask(parseInt(btn.dataset.id)));
        });
    } else {
        container.innerHTML = tasks.map(task => {
            const editable = isEditable(task);
            return `
            <div class="task-cell" data-id="${task.id}">
                <div class="task-cell-header">
                    <span class="task-date">${formatDate(task.createdAt)}</span>
                    ${editable ? '<span class="task-editable-hint">editable</span>' : ''}
                    <button class="task-complete-btn" data-id="${task.id}" title="Complete">✓</button>
                </div>
                <div class="task-cell-content ${editable ? 'editable' : ''}">${escapeHtml(task.text)}</div>
            </div>
        `}).join('');

        container.querySelectorAll('.task-cell-content.editable').forEach(el => {
            el.addEventListener('click', () => {
                const id = parseInt(el.closest('.task-cell').dataset.id);
                editTask(id);
            });
        });

        container.querySelectorAll('.task-complete-btn').forEach(btn => {
            btn.addEventListener('click', () => completeTask(parseInt(btn.dataset.id)));
        });
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function loadTasks() {
    try {
        const saved = localStorage.getItem(TASKS_STORAGE_KEY);
        if (saved) {
            tasks = JSON.parse(saved);
        } else {
            tasks = [];
        }
        loadCompletedTasks();
        renderTasks();
    } catch (e) {
        console.error('Load tasks error:', e);
        tasks = [];
        renderTasks();
    }
}

function saveTasks() {
    try {
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
        console.error('Save tasks error:', e);
    }
}

function saveCompletedTasks() {
    try {
        localStorage.setItem(COMPLETED_TASKS_KEY, JSON.stringify(completedTasks));
    } catch (e) {
        console.error('Save completed tasks error:', e);
    }
}

function loadCompletedTasks() {
    try {
        const saved = localStorage.getItem(COMPLETED_TASKS_KEY);
        if (saved) {
            completedTasks = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Load completed tasks error:', e);
    }
}

export function getTasksContent() {
    return tasks.map(t => t.text).join('\n');
}

export function setTasksContent(content) {
    // Not used in new format
}