import { formatDate, getRoleName, showNotification } from './utils.js';
import { apiCall } from './api.js';

export function updateUI() {
    updateTeamInfo();
    renderTasks();
    renderAllTasksTable();
    renderTeamMembers();
    renderSubjects();
    updateTaskSelects();
    renderGanttChart();
}

export function updateTeamInfo() {
    const info = document.getElementById('teamInfo');
    const linkSec = document.getElementById('inviteLinkSection');
    const btn = document.getElementById('createTeamBtn');

    if (!window.currentUser || !window.currentUser.teamId) {
        if (info) {
            info.innerHTML = `
                <p style="color:#777; text-align:center; margin-bottom:1rem;">Вы не в команде</p>
                <div id="joinByLinkSection" style="margin-top:1rem; padding:1rem; background:#f8f9fa; border-radius:12px; border:2px dashed #3498db;">
                    <label style="display:block; margin-bottom:0.5rem; font-weight:600; color:#2c3e50;">Есть код приглашения?</label>
                    <div class="input-group">
                        <input type="text" id="manualInviteInput" placeholder="Введите код приглашения..." style="flex:1;">
                        <button onclick="joinByManualLink()">Присоединиться</button>
                    </div>
                    <small style="color:#7f8c8d; display:block; margin-top:0.5rem;">
                        Например: ABC123DE
                    </small>
                </div>`;
        }
        if (linkSec) linkSec.style.display = 'none';
        if (btn) btn.style.display = 'block';
        return;
    }

    const team = (window.teams || []).find(t => t.id === window.currentUser.teamId);
    if (!team) return;

    if (btn) btn.style.display = 'none';
    if (linkSec) linkSec.style.display = 'block';

    if (info) {
        info.innerHTML = `
            <h3>${team.name}</h3>
            <p><strong>Описание:</strong> ${team.description || 'Нет описания'}</p>
            <p><strong>Код приглашения:</strong> <code>${team.inviteCode}</code></p>`;
    }

    const inviteInput = document.getElementById('inviteCode');
    if (inviteInput) inviteInput.value = team.inviteCode;
}

export function renderAllTasksTable() {
    const tbody = document.querySelector('#allTasksTable tbody');
    if (!tbody) return;

    // Показываем задачи ВСЕЙ команды
    if (!window.currentUser || !window.currentUser.teamId) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="color:#777; text-align:center; padding:2rem;">
                    <div style="margin-bottom:1rem;">Вы не состоите в команде</div>
                    <button onclick="openModal('createTeamModal')">Создать команду</button>
                    или
                    <button onclick="document.getElementById('manualInviteInput')?.focus()">Присоединиться</button>
                </td>
            </tr>`;
        return;
    }

    if (!window.teamTasks || window.teamTasks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="color:#777; text-align:center;">
                    В вашей команде пока нет задач. 
                    <a href="#" onclick="showSection('dashboard'); openModal('createTaskModal')" style="color:#3498db;">
                        Создайте первую задачу!
                    </a>
                </td>
            </tr>`;
        return;
    }

    // Сортируем по дедлайну (сначала просроченные)
    const sortedTasks = [...window.teamTasks].sort((a, b) => {
        const aDate = a.deadline ? new Date(a.deadline) : new Date(9999, 11, 31);
        const bDate = b.deadline ? new Date(b.deadline) : new Date(9999, 11, 31);
        return aDate - bDate;
    });

    tbody.innerHTML = sortedTasks.map(task => {
        const isMyTask = task.assignedStudentId === window.currentUser.id;
        const assignee = (window.students || []).find(s => s.id === task.assignedStudentId);
        const assigneeName = assignee ? assignee.name : 'Не назначен';
        
        // Находим предмет - сначала из загруженных данных задачи, потом из subjects
        const subject = task.subject || (window.subjects || []).find(s => s.id === task.subjectId);
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
            deadlineText = `<span style="color:#e74c3c">${deadlineText}</span>`;
        }

        // Цвет строки в зависимости от того, чья это задача
        const rowStyle = isMyTask ? 'background: #f0f8ff;' : 
                        isOverdue ? 'background: #ffebee;' : '';

        return `
            <tr style="${rowStyle}">
                <td style="vertical-align:top;">
                    <div style="display:flex; align-items:flex-start; gap:0.5rem;">
                        <!-- Чекбокс для всех задач -->
                        <input type="checkbox" 
                               id="team-task-checkbox-${task.id}" 
                               ${isCompleted ? 'checked' : ''}
                               onchange="toggleTaskCompletion(${task.id})"
                               style="margin-top:0.3rem; accent-color:#3498db; width:18px; height:18px;">
                        <div>
                            <strong>${task.title}</strong>
                            <br><small>${task.description || ''}</small>
                            ${isMyTask ? '<br><small style="color:#3498db;">(Ваша задача)</small>' : ''}
                        </div>
                    </div>
                </td>
                <td>
                    <strong>${subjectName}</strong>
                    ${subject?.description ? `<br><small style="color:#666;">${subject.description}</small>` : ''}
                </td>
                <td>
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        ${isMyTask ? 
                            '<span style="background:#3498db;color:white;padding:2px 6px;border-radius:12px;font-size:0.8rem;">Вы</span>' : 
                            assigneeName
                        }
                        ${assignee && !isMyTask ? 
                            `<br><small style="color:#888;">${assignee.email}</small>` : 
                            ''
                        }
                    </div>
                </td>
                <td>${deadlineText}</td>
                <td><span class="status ${statusClass}">${statusText}</span></td>
                <td style="text-align:center;">
                    ${isCompleted ? 
                        '<span style="color:#27ae60; font-weight:bold;">Выполнено</span>' : 
                        '<span style="color:#e74c3c; font-weight:bold;">Не выполнено</span>'
                    }
                </td>
                <td>
                    <button onclick="${isMyTask ? `openEditTask(${task.id})` : `viewTaskDetails(${task.id})`}" 
                            class="${isMyTask ? 'edit-btn' : 'view-btn'}">
                        ${isMyTask ? 'Редактировать' : 'Просмотр'}
                    </button>
                </td>
            </tr>`;
    }).join('');
}

export function renderTeamMembers() {
    const container = document.getElementById('teamMembersList');
    if (!container) return;

    if (!window.currentUser || !window.currentUser.teamId) {
        container.innerHTML = '<p style="color:#777;">Вы не состоите в команде</p>';
        return;
    }

    const teamMembers = (window.students || []).filter(s => s.teamId === window.currentUser.teamId);
    
    if (!teamMembers.length) {
        container.innerHTML = '<p style="color:#777;">Нет участников</p>';
        return;
    }

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem;">
            ${teamMembers.map(member => `
                <div style="background: #f8f9fa; padding: 1rem; border-radius: 12px; border-left: 4px solid #3498db;">
                    <strong style="font-size: 1.1rem;">${member.name}</strong>
                    ${member.id === window.currentUser.id ? ' <small>(Вы)</small>' : ''}
                    <div style="margin-top: 0.5rem;">
                        <small style="background: #e3f2fd; padding: 0.2rem 0.5rem; border-radius: 20px;">
                            ${getRoleName(member.currentRole)}
                        </small>
                    </div>
                    <div style="margin-top: 0.5rem; color: #666; font-size: 0.9rem;">
                        <div>📧 ${member.email || 'Нет email'}</div>
                    </div>
                </div>
            `).join('')}
        </div>`;
}

export function renderSubjects() {
    const container = document.getElementById('subjectsList');
    if (!container) return;
    
    if (!window.subjects || window.subjects.length === 0) {
        container.innerHTML = '<p style="color:#777;">Нет предметов. Добавьте первый!</p>';
        return;
    }
    
    // Считаем задачи для каждого предмета
    container.innerHTML = window.subjects.map(subject => {
        // Используем tasks из загруженных данных предмета
        const tasksCount = subject.tasks ? subject.tasks.length : 0;
        
        return `
            <div class="subject-card" style="margin-bottom:1rem; padding:1rem; background:#f8f9fa; border-radius:12px; border-left:4px solid #3498db;">
                <h3 style="margin:0 0 0.5rem 0;">${subject.name}</h3>
                <p style="margin:0; color:#555;">${subject.description || 'Нет описания'}</p>
                <p style="margin-top:0.5rem; font-size:0.9rem; color:#666;">
                    Задач: <strong>${tasksCount}</strong>
                </p>
            </div>`;
    }).join('');
}

export function updateTaskSelects() {
    // Заполняем список предметов
    const subjectSelect = document.getElementById('taskSubject');
    const editSubjectSelect = document.getElementById('editTaskSubject');
    
    if (subjectSelect) {
        subjectSelect.innerHTML = '<option value="">Выберите предмет</option>' +
            (window.subjects || []).map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }
    
    if (editSubjectSelect) {
        editSubjectSelect.innerHTML = '<option value="">Выберите предмет</option>' +
            (window.subjects || []).map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }
    
    // Заполняем список студентов команды (для назначения задач)
    const assigneeSelect = document.getElementById('taskAssignee');
    const editAssigneeSelect = document.getElementById('editTaskAssignee');
    
    if (assigneeSelect) {
        assigneeSelect.innerHTML = '<option value="">Не назначать</option>' +
            '<option value="' + window.currentUser.id + '">Вы</option>';
        
        if (window.currentUser.teamId) {
            const teamStudents = (window.students || []).filter(s => 
                s.teamId === window.currentUser.teamId && s.id !== window.currentUser.id);
            teamStudents.forEach(s => {
                assigneeSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
            });
        }
    }
    
    if (editAssigneeSelect) {
        editAssigneeSelect.innerHTML = '<option value="">Не назначать</option>' +
            '<option value="' + window.currentUser.id + '"' + '>Вы</option>';
        
        if (window.currentUser.teamId) {
            const teamStudents = (window.students || []).filter(s => 
                s.teamId === window.currentUser.teamId && s.id !== window.currentUser.id);
            teamStudents.forEach(s => {
                editAssigneeSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
            });
        }
    }
}

export async function createSubject() {
    const name = document.getElementById('subjectName').value.trim();
    const description = document.getElementById('subjectDescription').value.trim();
    
    if (!name) {
        alert("Введите название предмета!");
        return;
    }
    
    try {
        const newSubject = await apiCall('/Subjects', {
            method: 'POST',
            body: JSON.stringify({
                name: name,
                description: description
            })
        });
        
        await window.loadInitialData();
        closeModal('createSubjectModal');
        alert(`Предмет "${name}" создан!`);
    } catch (error) {
        console.error('Create subject error:', error);
        alert(`Ошибка: ${error.message}`);
    }
}

export function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    document.querySelectorAll('nav ul li a').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('nav ul li a').forEach(a => {
        if (a.getAttribute('onclick')?.includes(id)) a.classList.add('active');
    });
}