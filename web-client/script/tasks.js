import { apiCall } from './api.js';
import { formatDate } from './utils.js';
import { updateTaskSelects } from './ui.js';
import { openModal, closeModal } from './modals.js';
import { showNotification } from './utils.js';
import { updateUI } from './ui.js';

export function renderTasks() {
    const container = document.getElementById('tasksList');
    if (!container) return;

    // Показываем ТОЛЬКО СВОИ задачи
    if (!window.myTasks || window.myTasks.length === 0) {
        container.innerHTML = '<p style="color:#777;text-align:center;">У вас пока нет задач. Добавьте первую!</p>';
        return;
    }

    // Сортируем по дедлайну (сначала просроченные)
    const sortedTasks = [...window.myTasks].sort((a, b) => {
        const aDate = a.deadline ? new Date(a.deadline) : new Date(9999, 11, 31);
        const bDate = b.deadline ? new Date(b.deadline) : new Date(9999, 11, 31);
        return aDate - bDate;
    });

    container.innerHTML = sortedTasks.map(task => {
        // Находим предмет по subjectId
        const subject = (window.subjects || []).find(s => s.id === task.subjectId);
        const subjectName = subject ? subject.name : 'Не указан';
        
        // Определяем статус задачи
        const isCompleted = task.isCompleted || false;
        const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !isCompleted;
        
        let statusText = 'В работе';
        let statusClass = 'in-progress';
        
        if (isCompleted) {
            statusText = 'Выполнено';
            statusClass = 'completed';
        } else if (isOverdue) {
            statusText = 'Просрочено';
            statusClass = 'overdue';
        }

        // Форматируем дедлайн
        let deadlineText = formatDate(task.deadline);
        if (isOverdue) {
            deadlineText = `<span style="color:#e74c3c;">${deadlineText} (просрочено)</span>`;
        }

        return `
            <div class="task-item ${isOverdue ? 'overdue-task' : ''}" style="${isOverdue ? 'border-left: 4px solid #e74c3c;' : ''}">
                <div style="display:flex; align-items:flex-start; gap:1rem; width:100%;">
                    <!-- Чекбокс выполнения -->
                    <div style="margin-top:0.3rem;">
                        <input type="checkbox" 
                               id="task-checkbox-${task.id}" 
                               ${isCompleted ? 'checked' : ''}
                               onchange="toggleTaskCompletion(${task.id})"
                               style="width:20px; height:20px; cursor:pointer; accent-color:#3498db;">
                    </div>
                    
                    <div style="flex:1;">
                        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
                            <strong>${task.title}</strong>
                            <span class="status ${statusClass}" style="font-size:0.8rem; padding:0.2rem 0.6rem;">${statusText}</span>
                        </div>
                        <p style="margin:0.25rem 0; color:#666;">${task.description || ''}</p>
                        <div style="display:flex; gap:1rem; align-items:center; margin-top:0.5rem; flex-wrap:wrap;">
                            <div>
                                <small style="color:#888;">
                                    <strong>Предмет:</strong> ${subjectName}
                                </small>
                            </div>
                            <div>
                                <small style="color:#888;">
                                    <strong>Дедлайн:</strong> ${deadlineText}
                                </small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="task-meta">
                        <button onclick="openEditTask(${task.id})" class="edit-btn">Редактировать</button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

export async function toggleTaskCompletion(taskId) {
    try {
        const response = await apiCall(`/Tasks/${taskId}/toggle`, {
            method: 'POST'
        });

        if (response) {
            // Обновляем статус задачи во всех массивах
            updateTaskStatus(taskId, response.isCompleted);
            
            // Перерисовываем интерфейс
            if (window.renderTasks) window.renderTasks();
            if (window.renderAllTasksTable) window.renderAllTasksTable();
            if (window.renderGanttChart) window.renderGanttChart();
            
            // Показываем уведомление
            showNotification(response.isCompleted ? 
                'Задача выполнена' : 
                'Задача снова в работе', 
                'success');
        }
    } catch (error) {
        console.error('Toggle completion error:', error);
        showNotification('Ошибка при обновлении статуса', 'error');
        
        // Возвращаем чекбокс в исходное состояние
        const checkbox = document.getElementById(`task-checkbox-${taskId}`) || 
                         document.getElementById(`team-task-checkbox-${taskId}`);
        if (checkbox) {
            checkbox.checked = !checkbox.checked;
        }
    }
}

export function updateTaskStatus(taskId, isCompleted) {
    // Обновляем в myTasks
    const myTask = window.myTasks?.find(t => t.id === taskId);
    if (myTask) {
        myTask.isCompleted = isCompleted;
        myTask.completedAt = isCompleted ? new Date().toISOString() : null;
    }
    
    // Обновляем в teamTasks
    const teamTask = window.teamTasks?.find(t => t.id === taskId);
    if (teamTask) {
        teamTask.isCompleted = isCompleted;
        teamTask.completedAt = isCompleted ? new Date().toISOString() : null;
    }
}

export async function createTask() {
    const name = document.getElementById('taskName').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const subjectId = document.getElementById('taskSubject').value;
    const assigneeId = document.getElementById('taskAssignee').value;
    const deadline = document.getElementById('taskDeadline').value;

    if (!name || !deadline || !subjectId) {
        alert("Заполните название, дедлайн и выберите предмет!");
        return;
    }

    try {
        // Определяем ответственного
        const assignedStudentId = assigneeId ? parseInt(assigneeId) : window.currentUser.id;

        const newTask = await apiCall('/Tasks', {
            method: 'POST',
            body: JSON.stringify({
                title: name,
                description: description,
                deadline: new Date(deadline).toISOString(),
                subjectId: parseInt(subjectId),
                assignedStudentId: assignedStudentId
            })
        });

        await loadInitialData();
        closeModal('createTaskModal');
        alert('Задача создана!');
    } catch (error) {
        console.error('Create task error:', error);
        alert(`Ошибка: ${error.message}`);
    }
}

export function openEditTask(id) {
    // Ищем задачу сначала в своих задачах, потом в задачах команды
    let task = (window.myTasks || []).find(x => x.id === id);
    if (!task) {
        task = (window.teamTasks || []).find(x => x.id === id);
    }
    
    if (!task) return;

    document.getElementById('editTaskId').value = task.id;
    document.getElementById('editTaskName').value = task.title;
    document.getElementById('editTaskDescription').value = task.description || '';
    
    // Заполняем выпадающий список предметов
    const editSubjectSelect = document.getElementById('editTaskSubject');
    if (editSubjectSelect) {
        editSubjectSelect.innerHTML = '<option value="">Выберите предмет</option>' +
            (window.subjects || []).map(s => `<option value="${s.id}" ${s.id === task.subjectId ? 'selected' : ''}>${s.name}</option>`).join('');
    }
    
    // Заполняем выпадающий список ответственных
    const editAssigneeSelect = document.getElementById('editTaskAssignee');
    if (editAssigneeSelect) {
        editAssigneeSelect.innerHTML = '<option value="">Не назначать</option>' +
            '<option value="' + window.currentUser.id + '" ' + (task.assignedStudentId === window.currentUser.id ? 'selected' : '') + '>Вы</option>';
        
        if (window.currentUser.teamId) {
            const teamStudents = (window.students || []).filter(s => 
                s.teamId === window.currentUser.teamId && s.id !== window.currentUser.id);
            teamStudents.forEach(s => {
                editAssigneeSelect.innerHTML += `<option value="${s.id}" ${s.id === task.assignedStudentId ? 'selected' : ''}>${s.name}</option>`;
            });
        }
    }
    
    // Устанавливаем дедлайн
    const dl = task.deadline ? new Date(task.deadline) : null;
    if (dl) {
        const local = new Date(dl.getTime() - dl.getTimezoneOffset() * 60000).toISOString().slice(0,16);
        document.getElementById('editTaskDeadline').value = local;
    } else {
        document.getElementById('editTaskDeadline').value = '';
    }

    openModal('editTaskModal');
}

export async function saveTaskEdit() {
    try {
        const id = parseInt(document.getElementById('editTaskId').value, 10);
        const title = document.getElementById('editTaskName').value.trim();
        const description = document.getElementById('editTaskDescription').value.trim();
        const subjectId = document.getElementById('editTaskSubject').value;
        const assigneeId = document.getElementById('editTaskAssignee').value;
        const deadline = document.getElementById('editTaskDeadline').value;

        // Находим задачу в API
        const task = await apiCall(`/Tasks/${id}`);
        if (!task) return alert('Задача не найдена');

        await apiCall(`/Tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                ...task,
                title: title,
                description: description,
                subjectId: subjectId ? parseInt(subjectId) : null,
                assignedStudentId: assigneeId ? parseInt(assigneeId) : null,
                deadline: deadline ? new Date(deadline).toISOString() : null
            })
        });

        // Перезагружаем ВСЕ данные
        await loadInitialData();
        closeModal('editTaskModal');
        alert('Задача обновлена!');
    } catch (error) {
        console.error('Save task edit error:', error);
        alert(`Ошибка: ${error.message}`);
    }
}

export async function deleteTaskConfirm() {
    const taskId = document.getElementById('editTaskId').value;
    if (!taskId) return;
    
    if (confirm('Вы уверены, что хотите удалить эту задачу? Это действие нельзя отменить.')) {
        try {
            await apiCall(`/Tasks/${taskId}`, {
                method: 'DELETE'
            });
            
            await loadInitialData();
            closeModal('editTaskModal');
            showNotification('Задача удалена', 'success');
        } catch (error) {
            console.error('Delete task error:', error);
            alert('Ошибка при удалении задачи');
        }
    }
}

export function viewTaskDetails(taskId) {
    if (window.showGanttTaskDetails) {
        window.showGanttTaskDetails(taskId);
    }
}