/**
 * Tasks Module — простой список задач
 * Хранит данные в localStorage, без диалогов выбора файлов
 */

const TASKS_STORAGE_KEY = 'vibeDrawingTasks';
const TASKS_FILE_NAME = 'сделать.txt';

let tasksBtn = null;
let tasksPanel = null;
let tasksTextarea = null;
let tasksCloseBtn = null;
let tasksExportBtn = null;
let tasksImportBtn = null;

export function initTasks() {
    tasksBtn = document.getElementById('tasksBtn');
    tasksPanel = document.getElementById('tasksPanel');
    tasksTextarea = document.getElementById('tasksTextarea');
    tasksCloseBtn = document.getElementById('tasksCloseBtn');
    tasksExportBtn = document.getElementById('tasksExportBtn');
    tasksImportBtn = document.getElementById('tasksImportBtn');

    if (!tasksBtn) {
        console.warn('Tasks button not found');
        return;
    }

    // Создаём панель если её нет
    if (!tasksPanel) {
        createTasksPanel();
    }

    // Открытие панели
    tasksBtn.addEventListener('click', () => {
        tasksPanel.style.display = tasksPanel.style.display === 'none' || tasksPanel.style.display === '' ? 'block' : 'none';
        if (tasksPanel.style.display === 'block') {
            loadTasks();
        }
    });

    // Закрытие
    if (tasksCloseBtn) {
        tasksCloseBtn.addEventListener('click', () => {
            tasksPanel.style.display = 'none';
        });
    }

    // Экспорт в файл
    if (tasksExportBtn) {
        tasksExportBtn.addEventListener('click', () => {
            downloadTasksFile();
        });
    }

    // Импорт из файла
    if (tasksImportBtn) {
        tasksImportBtn.addEventListener('click', () => {
            const input = document.getElementById('tasksImportInput');
            if (input) input.click();
        });

        const fileInput = document.getElementById('tasksImportInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    tasksTextarea.value = ev.target.result;
                    saveTasks();
                    fileInput.value = '';
                };
                reader.readAsText(file);
            });
        }
    }

    // Автосохранение при вводе
    if (tasksTextarea) {
        tasksTextarea.addEventListener('input', () => {
            saveTasks();
        });
    }

    // Закрытие по клику вне панели
    if (tasksPanel) {
        tasksPanel.addEventListener('click', (e) => {
            if (e.target === tasksPanel) {
                tasksPanel.style.display = 'none';
            }
        });
    }
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
            <h3>📋 Tasks</h3>
            <div class="tasks-panel-actions">
                <button id="tasksExportBtn" title="Export to file">📤 Export</button>
                <button id="tasksImportBtn" title="Import from file">📥 Import</button>
                <input type="file" id="tasksImportInput" accept=".txt,.md" style="display:none">
                <button id="tasksCloseBtn" class="close-btn" title="Close">&times;</button>
            </div>
        </div>
        <textarea id="tasksTextarea" placeholder="Write your tasks here..." spellcheck="false"></textarea>
    `;

    app.appendChild(tasksPanel);

    // Re-query elements after injection
    tasksTextarea = document.getElementById('tasksTextarea');
    tasksCloseBtn = document.getElementById('tasksCloseBtn');
    tasksExportBtn = document.getElementById('tasksExportBtn');
    tasksImportBtn = document.getElementById('tasksImportBtn');

    // Re-bind events for dynamically created elements
    tasksCloseBtn.addEventListener('click', () => {
        tasksPanel.style.display = 'none';
    });

    tasksExportBtn.addEventListener('click', () => {
        downloadTasksFile();
    });

    tasksImportBtn.addEventListener('click', () => {
        const input = document.getElementById('tasksImportInput');
        if (input) input.click();
    });

    const fileInput = document.getElementById('tasksImportInput');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                tasksTextarea.value = ev.target.result;
                saveTasks();
                fileInput.value = '';
            };
            reader.readAsText(file);
        });
    }

    tasksTextarea.addEventListener('input', () => {
        saveTasks();
    });
}

function loadTasks() {
    try {
        const saved = localStorage.getItem(TASKS_STORAGE_KEY);
        if (saved !== null) {
            tasksTextarea.value = saved;
        } else {
            // Попробуем загрузить с сервера
            fetch('js/' + TASKS_FILE_NAME)
                .then(r => r.ok ? r.text() : null)
                .then(text => {
                    if (text) {
                        tasksTextarea.value = text;
                        saveTasks();
                    } else {
                        tasksTextarea.value = '';
                    }
                })
                .catch(() => {
                    tasksTextarea.value = '';
                });
        }
    } catch (e) {
        console.error('Load tasks error:', e);
        tasksTextarea.value = '';
    }
}

function saveTasks() {
    try {
        localStorage.setItem(TASKS_STORAGE_KEY, tasksTextarea.value);
    } catch (e) {
        console.error('Save tasks error:', e);
    }
}

function downloadTasksFile() {
    const content = tasksTextarea.value;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = TASKS_FILE_NAME;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function getTasksContent() {
    return tasksTextarea ? tasksTextarea.value : '';
}

export function setTasksContent(content) {
    if (tasksTextarea) {
        tasksTextarea.value = content;
        saveTasks();
    }
}
