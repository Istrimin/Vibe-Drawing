/**
 * Tasks Module — работа с файлом сделать.txt
 * Автоматическое сохранение изменений
 */

let fileHandle = null;
let tasksTextarea = null;
let tasksBtn = null;
let tasksDialog = null;
let autoSaveTimer = null;
const AUTO_SAVE_DELAY = 2000; // 2 секунды после последнего изменения
const TASKS_FILE_NAME = 'сделать.txt';

export function initTasks() {
    tasksTextarea = document.getElementById('tasksTextarea');
    tasksBtn = document.getElementById('tasksBtn');
    tasksDialog = document.getElementById('tasksDialog');

    if (!tasksBtn) {
        console.warn('Tasks button not found');
        return;
    }

    // Открытие диалога
    tasksBtn.addEventListener('click', async () => {
        tasksDialog.classList.remove('hidden');
        await loadTasks();
    });

    // Закрытие
    const closeBtn = document.getElementById('tasksCloseBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            tasksDialog.classList.add('hidden');
            stopAutoSave();
        });
    }

    // Загрузка файла
    const loadBtn = document.getElementById('tasksLoadBtn');
    if (loadBtn) {
        loadBtn.addEventListener('click', async () => {
            await loadTasks();
        });
    }

    // Сохранение файла
    const saveBtn = document.getElementById('tasksSaveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            await saveTasks();
        });
    }

    // Автосохранение при изменении textarea
    if (tasksTextarea) {
        tasksTextarea.addEventListener('input', () => {
            scheduleAutoSave();
        });
    }

    // Закрытие по клику вне диалога
    if (tasksDialog) {
        tasksDialog.addEventListener('click', (e) => {
            if (e.target === tasksDialog) {
                tasksDialog.classList.add('hidden');
                stopAutoSave();
            }
        });
    }
}

async function loadTasks() {
    try {
        // Пробуем File System Access API
        if ('showOpenFilePicker' in window) {
            try {
                [fileHandle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'Text Files',
                        accept: { 'text/*': ['.txt', '.md'] }
                    }],
                    multiple: false
                });
                const file = await fileHandle.getFile();
                const text = await file.text();
                tasksTextarea.value = text;
                tasksTextarea.dataset.filePath = fileHandle.name;
                updateStatus('Файл загружен: ' + fileHandle.name);
                startAutoSave();
                return;
            } catch (e) {
                if (e.name === 'AbortError') return; // пользователь отменил
                console.warn('File picker failed, trying fallback:', e);
            }
        }

        // Fallback: пробуем загрузить с сервера
        const response = await fetch('js/' + TASKS_FILE_NAME);
        if (response.ok) {
            const text = await response.text();
            tasksTextarea.value = text;
            updateStatus('Файл загружен с сервера');
        } else {
            tasksTextarea.value = '📝 Дбавить кнопку открывающуюю этот файл для редактирования прямо в окне.\n\n';
            updateStatus('Создан новый список задач');
        }
    } catch (err) {
        console.error('Load tasks error:', err);
        tasksTextarea.value = 'Ошибка загрузки. Проверьте консоль.';
    }
}

async function saveTasks() {
    const content = tasksTextarea.value;

    try {
        // Если есть fileHandle — сохраняем через него
        if (fileHandle && 'createWritable' in fileHandle) {
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            updateStatus('Сохранено в ' + fileHandle.name);
            return;
        }

        // Fallback: скачивание
        downloadFile(content);
    } catch (err) {
        console.error('Save tasks error:', err);
        downloadFile(content);
    }
}

function downloadFile(content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = TASKS_FILE_NAME;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    updateStatus('Файл скачан (нет доступа к ФС)');
}

function startAutoSave() {
    stopAutoSave();
    autoSaveTimer = setInterval(async () => {
        if (fileHandle && tasksDialog.classList.contains('hidden') === false) {
            try {
                const writable = await fileHandle.createWritable();
                await writable.write(tasksTextarea.value);
                await writable.close();
            } catch (e) {
                console.warn('Auto-save failed:', e);
            }
        }
    }, 60000); // каждую минуту
}

function stopAutoSave() {
    if (autoSaveTimer) {
        clearInterval(autoSaveTimer);
        autoSaveTimer = null;
    }
}

function scheduleAutoSave() {
    // Сохраняем через 2 сек после последнего изменения
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
        if (fileHandle) {
            try {
                const writable = await fileHandle.createWritable();
                await writable.write(tasksTextarea.value);
                await writable.close();
                updateStatus('Автосохранение ✓');
            } catch (e) {
                console.warn('Auto-save failed:', e);
            }
        }
    }, AUTO_SAVE_DELAY);
}

function updateStatus(msg) {
    const status = document.getElementById('toolStatus');
    if (status) {
        status.textContent = '📋 ' + msg;
    }
}

export function getTasksContent() {
    return tasksTextarea ? tasksTextarea.value : '';
}

export function setTasksContent(content) {
    if (tasksTextarea) {
        tasksTextarea.value = content;
        scheduleAutoSave();
    }
}
