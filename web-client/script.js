const API_BASE = 'http://localhost:5000/api';

let currentUser = { id: 1, name: "Иванов Иван", teamId: null };
let teams = [];
let tasks = [];
let students = [];

// === API функция (универсальная) ===
async function apiCall(endpoint, options = {}) {
    try {
        const fetchOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            },
            ...options
        };

        const response = await fetch(`${API_BASE}${endpoint}`, fetchOptions);

        // Если статус 204 No Content — возвращаем null
        if (response.status === 204) return null;

        // Попробуем парсить JSON, но если контент не JSON — бросим ошибку
        const text = await response.text();
        if (!text) return null;
        try {
            return JSON.parse(text);
        } catch (e) {
            // не JSON
            return text;
        }
    } catch (error) {
        console.error('API Error:', error);
        alert(`Ошибка: ${error.message}`);
        throw error;
    }
}

// === Загрузка данных при запуске ===
async function loadInitialData() {
    try {
        [teams, tasks, students] = await Promise.all([
            apiCall('/Teams'),
            apiCall('/Tasks'),
            apiCall('/Students')
        ]);

        // Находим текущего пользователя в базе
        const dbUser = (students || []).find(s => s.id === currentUser.id);
        if (dbUser) {
            currentUser.teamId = dbUser.teamId;
            currentUser.name = dbUser.name;
        }

        await updateTeamInfo();
        renderTasks();
        renderGantt();
        renderAllTasksTable();
        showSection('dashboard');
    } catch (error) {
        console.error('Failed to load initial data:', error);
    }
}

// === Инициализация ===
document.addEventListener('DOMContentLoaded', () => {
    handleInviteFromUrl();
    loadInitialData();
});

async function handleInviteFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('invite');
    if (!inviteCode || currentUser.teamId) return;

    try {
        const allTeams = await apiCall('/Teams');
        const team = (allTeams || []).find(t => t.inviteCode === inviteCode);

        if (!team) {
            alert("Команда не найдена. Ссылка недействительна.");
            history.replaceState(null, null, location.pathname);
            return;
        }

        const userTeams = allTeams.filter(t => t.members && t.members.some(m => m.id === currentUser.id));
        if (userTeams.length > 0) {
            currentUser.teamId = userTeams[0].id;
            updateTeamInfo();
            alert(`Вы уже в команде "${userTeams[0].name}"!`);
            history.replaceState(null, null, location.pathname);
            return;
        }

        if (confirm(`Присоединиться к команде "${team.name}"?`)) {
            await apiCall(`/Teams/${team.id}/join/${currentUser.id}`, { method: 'POST' });
            currentUser.teamId = team.id;

            await apiCall(`/Students/${currentUser.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    ...currentUser,
                    teamId: team.id
                })
            });

            await loadInitialData();
            alert(`Добро пожаловать в команду "${team.name}"!`);
            history.replaceState(null, null, location.pathname);
        }
    } catch (error) {
        console.error('Join team error:', error);
    }
}

// === Присоединиться по вставленной ссылке ===
async function joinByManualLink() {
    const inputEl = document.getElementById('manualInviteInput');
    const input = inputEl ? inputEl.value.trim() : '';
    if (!input) return alert("Вставьте ссылку-приглашение!");

    let inviteCode;
    try {
        const url = new URL(input);
        inviteCode = url.searchParams.get('invite');
    } catch (e) {
        const match = input.match(/invite[=:]([A-Z0-9]+)/i);
        if (match) inviteCode = match[1];
    }

    if (!inviteCode) return alert("Проверьте ссылку.");

    history.replaceState(null, null, `${location.pathname}?invite=${inviteCode}`);
    await handleInviteFromUrl();
    if (inputEl) inputEl.value = '';
}

async function createTeam() {
    const name = document.getElementById('teamName').value.trim();
    const subject = document.getElementById('teamSubjectInput').value.trim();
    if (!name || !subject) return alert("Заполните название команды и предмет!");

    try {
        const newTeam = await apiCall('/Teams', {
            method: 'POST',
            body: JSON.stringify({
                name: name,
                description: `Команда по предмету: ${subject}`,
                defaultRole: 1 // Developer
            })
        });

        if (!newTeam) throw new Error('Не удалось создать команду');

        await apiCall(`/Teams/${newTeam.id}/join/${currentUser.id}`, { method: 'POST' });

        currentUser.teamId = newTeam.id;
        await apiCall(`/Students/${currentUser.id}`, {
            method: 'PUT',
            body: JSON.stringify({
                ...currentUser,
                teamId: newTeam.id
            })
        });

        await loadInitialData();
        closeModal('createTeamModal');

        alert(`Команда "${name}" создана!\nКод приглашения: ${newTeam.inviteCode}`);
    } catch (error) {
        console.error('Create team error:', error);
    }
}

// === Копирование кода приглашения ===
function copyInviteLink() {
    const team = (teams || []).find(t => t.id === currentUser.teamId);
    if (!team) return;

    const inviteLink = `${location.origin}${location.pathname}?invite=${team.inviteCode}`;
    navigator.clipboard.writeText(inviteLink);
    alert("Ссылка скопирована!");
}

// === Обновление блока "Ваша команда" ===
async function updateTeamInfo() {
    const info = document.getElementById('teamInfo');
    const linkSec = document.getElementById('inviteLinkSection');
    const btn = document.getElementById('createTeamBtn');

    if (!currentUser.teamId) {
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
                        Например: ABC123DEF
                    </small>
                </div>`;
        }
        if (linkSec) linkSec.style.display = 'none';
        if (btn) btn.style.display = 'block';
        return;
    }

    // Получаем актуальные данные команды с сервера
    const team = await apiCall(`/Teams/${currentUser.teamId}`);
    if (!team) return;

    if (btn) btn.style.display = 'none';
    if (linkSec) linkSec.style.display = 'block';

    const inviteLink = `${location.origin}${location.pathname}?invite=${team.inviteCode}`;
    const inviteInput = document.getElementById('inviteLink');
    if (inviteInput) inviteInput.value = inviteLink;

    const joinSection = document.getElementById('joinByLinkSection');
    if (joinSection) joinSection.remove();

    // Получаем список участников
    const membersList = team.members && team.members.length
        ? `<ul>${team.members.map(m => `<li>${m.name} (${m.email || '-'})</li>`).join('')}</ul>`
        : '<p style="color:#777;">Нет участников</p>';

    if (info) {
        info.innerHTML = `
        <h3>${team.name}</h3>
        <p><strong>Описание:</strong> ${team.description}</p>
        <p><strong>Код приглашения:</strong> ${team.inviteCode}</p>
        <p><strong>Участники (${team.members?.length || 0}):</strong></p>
        ${membersList}`;
    }
}

async function createTask() {
    const name = document.getElementById('taskName').value.trim();
    const role = document.getElementById('taskRoleInput').value.trim();
    const assignee = document.getElementById('taskAssignee').value.trim() || currentUser.name;
    const deadline = document.getElementById('taskDeadline').value;

    if (!name || !role || !deadline || !currentUser.teamId) {
        alert("Заполните все обязательные поля и вступите в команду!");
        return;
    }

    try {
        let assignedStudentId = currentUser.id;
        if (assignee !== currentUser.name) {
            const assignedStudent = (students || []).find(s => s.name === assignee);
            if (assignedStudent) {
                assignedStudentId = assignedStudent.id;
            } else {
                const newStudent = await apiCall('/Students', {
                    method: 'POST',
                    body: JSON.stringify({
                        name: assignee,
                        email: `${assignee.toLowerCase().replace(' ', '.')}@edu.ru`,
                        teamId: currentUser.teamId,
                        currentRole: 1 // Developer
                    })
                });
                assignedStudentId = newStudent.id;
                students.push(newStudent);
            }
        }

        const newTask = await apiCall('/Tasks', {
            method: 'POST',
            body: JSON.stringify({
                title: name,
                description: `Роль: ${role}`,
                status: 0, // Pending
                subjectId: 1,
                assignedStudentId: assignedStudentId,
                teamId: currentUser.teamId,
                deadline: new Date(deadline).toISOString()
            })
        });

        await loadInitialData();
        closeModal('createTaskModal');
    } catch (error) {
        console.error('Create task error:', error);
    }
}

// === Переключение статуса задачи ===
async function toggleTaskStatus(id) {
    try {
        const task = (tasks || []).find(t => t.id === id);
        if (!task) return;

        const newStatus = task.status === 2 ? 0 : 2;

        await apiCall(`/Tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                ...task,
                status: newStatus
            })
        });

        await loadInitialData();
    } catch (error) {
        console.error('Toggle task status error:', error);
    }
}

// === Отображение задач на главной ===
function renderTasks() {
    const container = document.getElementById('tasksList');
    const teamTasks = (tasks || []).filter(t => t.teamId === currentUser.teamId);

    if (!teamTasks.length) {
        container.innerHTML = '<p style="color:#777;text-align:center;">Задач пока нет. Добавь первую!</p>';
        return;
    }

    container.innerHTML = teamTasks.map(t => {
        const statusText = t.status === 2 ? 'Готово' : (t.status === 1 ? 'В работе' : 'Ожидание');
        const statusClass = t.status === 2 ? 'completed' : (t.status === 1 ? 'in-progress' : 'pending');

        const assignee = (students || []).find(s => s.id === t.assignedStudentId)?.name || 'Не назначен';

        return `
            <div class="task-item">
                <label>
                    <input type="checkbox" ${t.status === 2 ? 'checked' : ''} onchange="toggleTaskStatus(${t.id})">
                    <strong>${t.title}</strong> <small>${t.description}</small>
                </label>
                <div class="task-meta">
                    <small>${assignee}</small>
                    <small>${formatDate(t.deadline)}</small>
                    <span class="status ${statusClass}">${statusText}</span>
                    <button onclick="openEditTask(${t.id})" class="edit-btn">Edit</button>
                </div>
            </div>`;
    }).join('');
}

// === Таблица всех задач ===
function renderAllTasksTable() {
    const tbody = document.querySelector('#allTasksTable tbody');
    if (!tbody) return;

    const teamTasks = (tasks || []).filter(t => t.teamId === currentUser.teamId);

    if (!teamTasks.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="color:#777; text-align:center;">Нет задач</td></tr>`;
        return;
    }

    tbody.innerHTML = teamTasks.map(t => {
        const statusText = t.status === 2 ? 'Готово' : (t.status === 1 ? 'В работе' : 'Ожидание');
        const statusClass = t.status === 2 ? 'completed' : (t.status === 1 ? 'in-progress' : 'pending');
        const assignee = (students || []).find(s => s.id === t.assignedStudentId)?.name || 'Не назначен';

        return `
            <tr>
                <td><strong>${t.title}</strong><br><small>${t.description}</small></td>
                <td>${t.description.replace('Роль: ', '')}</td>
                <td>${assignee}</td>
                <td>${formatDate(t.deadline)}</td>
                <td><span class="status ${statusClass}">${statusText}</span></td>
                <td>
                    <button onclick="openEditTask(${t.id})" class="edit-btn">Edit</button>
                    <button onclick="deleteTaskConfirm(${t.id})" style="background:#e74c3c;margin-left:5px;">Delete</button>
                </td>
            </tr>`;
    }).join('');
}

function openEditTask(id) {
    const t = (tasks || []).find(x => x.id === id);
    if (!t) return;

    document.getElementById('editTaskId').value = t.id;
    document.getElementById('editTaskName').value = t.title;
    document.getElementById('editTaskRoleInput').value = t.description.replace('Роль: ', '');
    document.getElementById('editTaskAssignee').value = (students || []).find(s => s.id === t.assignedStudentId)?.name || '';
    const dl = t.deadline ? new Date(t.deadline) : null;
    if (dl) {
        const local = new Date(dl.getTime() - dl.getTimezoneOffset() * 60000).toISOString().slice(0,16);
        document.getElementById('editTaskDeadline').value = local;
    } else {
        document.getElementById('editTaskDeadline').value = '';
    }

    openModal('editTaskModal');
}

async function saveTaskEdit() {
    try {
        const id = parseInt(document.getElementById('editTaskId').value, 10);
        const title = document.getElementById('editTaskName').value.trim();
        const role = document.getElementById('editTaskRoleInput').value.trim();
        const assignee = document.getElementById('editTaskAssignee').value.trim();
        const deadline = document.getElementById('editTaskDeadline').value;

        const task = (tasks || []).find(t => t.id === id);
        if (!task) return alert('Задача не найдена');

        let assignedStudentId = task.assignedStudentId || currentUser.id;
        if (assignee && assignee !== currentUser.name) {
            const assignedStudent = (students || []).find(s => s.name === assignee);
            if (assignedStudent) {
                assignedStudentId = assignedStudent.id;
            } else {
                const newStudent = await apiCall('/Students', {
                    method: 'POST',
                    body: JSON.stringify({
                        name: assignee,
                        email: `${assignee.toLowerCase().replace(' ', '.')}@edu.ru`,
                        teamId: currentUser.teamId,
                        currentRole: 1
                    })
                });
                assignedStudentId = newStudent.id;
                students.push(newStudent);
            }
        }

        await apiCall(`/Tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                ...task,
                title: title,
                description: `Роль: ${role}`,
                assignedStudentId: assignedStudentId,
                deadline: deadline ? new Date(deadline).toISOString() : null
            })
        });

        await loadInitialData();
        closeModal('editTaskModal');
    } catch (error) {
        console.error('Save task edit error:', error);
    }
}

async function deleteTaskConfirm(idFromButton) {
    let id = idFromButton;
    if (!id) {
        id = parseInt(document.getElementById('editTaskId').value, 10);
    }
    if (!id) return;

    if (!confirm('Удалить задачу?')) return;

    try {
        await apiCall(`/Tasks/${id}`, { method: 'DELETE' });
        await loadInitialData();
        closeModal('editTaskModal');
    } catch (error) {
        console.error('Delete task error:', error);
    }
}

function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.style.display = 'block';
}
function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.style.display = 'none';
}
function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    document.querySelectorAll('nav ul li a').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('nav ul li a').forEach(a => {
        if (a.getAttribute('onclick')?.includes(id)) a.classList.add('active');
    });
}
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString();
}

function renderGantt() {
    const el = document.getElementById('ganttChart');
    if (!el) return;
    el.innerHTML = '<p style="color:#777;">Диаграммы Ганта пока нет — тут будет график.</p>';
}
