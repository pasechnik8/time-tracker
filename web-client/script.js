// === Данные ===
let currentUser = { id: 1, name: "Иванов Иван", role: null, team: null };
let teams = JSON.parse(localStorage.getItem('teams')) || [];
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let editingTaskId = null;

// === Инициализация ===
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    handleInviteLink();
});

function initApp() {
    updateTeamInfo();
    renderTasks();
    renderGantt();
    renderAllTasksTable();
    showSection('dashboard');
}

// === Ссылки-приглашения ===
function handleInviteLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const invite = urlParams.get('invite');
    if (invite && !currentUser.team) {
        joinTeamByInvite(invite);
    }
}

function generateInviteLink(teamId) {
    return `${window.location.origin}${window.location.pathname}?invite=${teamId}`;
}

// === Команды ===
function createTeam() {
    const name = document.getElementById('teamName').value.trim();
    const subject = document.getElementById('teamSubjectInput').value.trim();

    if (!name || !subject) {
        alert('Заполните название команды и предмет');
        return;
    }

    const teamId = Date.now();
    const team = {
        id: teamId,
        name,
        subject,
        captain: currentUser.id,
        members: [currentUser.id],
        inviteLink: generateInviteLink(teamId)
    };

    teams.push(team);
    currentUser.team = teamId;

    saveData();
    updateTeamInfo();
    closeModal('createTeamModal');

    navigator.clipboard.writeText(team.inviteLink).then(() => {
        alert(`Команда "${name}" создана!\nПредмет: ${subject}\nСсылка скопирована.`);
    });
}

function joinTeamByInvite(inviteId) {
    const team = teams.find(t => t.id == inviteId);
    if (!team) return alert('Команда не найдена');
    if (team.members.includes(currentUser.id)) return alert('Вы уже в команде');

    if (confirm(`Присоединиться к "${team.name}"?`)) {
        team.members.push(currentUser.id);
        currentUser.team = team.id;
        saveData();
        updateTeamInfo();
        alert('Вы в команде!');
    }
}

function updateTeamInfo() {
    const teamInfo = document.getElementById('teamInfo');
    const linkSection = document.getElementById('inviteLinkSection');
    const createBtn = document.getElementById('createTeamBtn');

    if (!currentUser.team) {
        teamInfo.innerHTML = `<p style="color:#777;text-align:center;">Создайте или присоединитесь к команде</p>`;
        linkSection.style.display = 'none';
        createBtn.style.display = 'block';
        return;
    }

    const team = teams.find(t => t.id === currentUser.team);
    createBtn.style.display = 'none';
    linkSection.style.display = 'block';
    document.getElementById('inviteLink').value = team.inviteLink;

    teamInfo.innerHTML = `
        <h3>${team.name}</h3>
        <p><strong>Предмет:</strong> ${team.subject}</p>
        <p><strong>Участников:</strong> ${team.members.length}</p>
    `;
}

function copyInviteLink() {
    const input = document.getElementById('inviteLink');
    input.select();
    navigator.clipboard.writeText(input.value);
    alert('Ссылка скопирована!');
}

// === Задачи ===
function createTask() {
    const name = document.getElementById('taskName').value.trim();
    const role = document.getElementById('taskRoleInput').value.trim();
    const deadline = document.getElementById('taskDeadline').value;
    const dependsOn = document.getElementById('taskDependsOn').value;

    if (!name || !role || !deadline || !currentUser.team) {
        alert('Заполните обязательные поля и будьте в команде');
        return;
    }

    const task = {
        id: Date.now(),
        name,
        role,
        deadline,
        status: 'pending',
        timeSpent: 0,
        teamId: currentUser.team,
        createdBy: currentUser.id,
        dependsOn: dependsOn ? parseInt(dependsOn) : null,
        blocked: dependsOn ? true : false
    };

    tasks.push(task);
    saveData();
    renderTasks();
    renderGantt();
    renderAllTasksTable();
    closeModal('createTaskModal');
}

function toggleTaskStatus(id) {
    const task = tasks.find(t => t.id === id);
    if (task.blocked) {
        alert('Задача заблокирована: сначала завершите зависимую задачу!');
        return;
    }

    task.status = task.status === 'completed' ? 'pending' : 'completed';

    tasks.forEach(t => {
        if (t.dependsOn === id && task.status === 'completed') {
            t.blocked = false;
        }
    });

    saveData();
    renderTasks();
    renderGantt();
    renderAllTasksTable();
}

// === Редактирование и удаление ===
function openEditTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task || task.teamId !== currentUser.team) return;

    editingTaskId = id;

    document.getElementById('editTaskId').value = id;
    document.getElementById('editTaskName').value = task.name;
    document.getElementById('editTaskRoleInput').value = task.role;
    document.getElementById('editTaskDeadline').value = task.deadline.replace(' ', 'T');
    document.getElementById('editTaskDependsOn').value = task.dependsOn || '';

    populateEditTaskDependencies(id);
    openModal('editTaskModal');
}

function populateEditTaskDependencies(excludeId) {
    const sel = document.getElementById('editTaskDependsOn');
    sel.innerHTML = '<option value="">Нет зависимости</option>';

    const teamTasks = tasks.filter(t => t.teamId === currentUser.team && t.id !== excludeId && t.status !== 'completed');
    teamTasks.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `${t.name} (${t.role})`;
        sel.appendChild(opt);
    });
}

function saveTaskEdit() {
    const id = parseInt(document.getElementById('editTaskId').value);
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newName = document.getElementById('editTaskName').value.trim();
    const newRole = document.getElementById('editTaskRoleInput').value.trim();
    const newDeadline = document.getElementById('editTaskDeadline').value;
    const newDependsOn = document.getElementById('editTaskDependsOn').value;

    if (!newName || !newRole || !newDeadline) {
        alert('Заполните все обязательные поля');
        return;
    }

    if (newDependsOn) {
        const depTask = tasks.find(t => t.id == newDependsOn);
        if (depTask.status === 'completed') {
            alert('Нельзя зависеть от завершённой задачи');
            return;
        }
    }

    task.name = newName;
    task.role = newRole;
    task.deadline = newDeadline;
    task.dependsOn = newDependsOn ? parseInt(newDependsOn) : null;
    task.blocked = task.dependsOn ? (tasks.find(t => t.id === task.dependsOn)?.status !== 'completed') : false;

    saveData();
    renderTasks();
    renderGantt();
    renderAllTasksTable();
    closeModal('editTaskModal');
}

function deleteTaskConfirm() {
    const id = parseInt(document.getElementById('editTaskId').value);
    const task = tasks.find(t => t.id === id);
    const dependents = tasks.filter(t => t.dependsOn === id);

    let message = `Удалить задачу "${task.name}"?`;
    if (dependents.length > 0) {
        message += `\n\nВнимание: от неё зависят ${dependents.length} задач(и). Зависимости будут удалены.`;
    }

    if (confirm(message)) {
        tasks.forEach(t => {
            if (t.dependsOn === id) {
                t.dependsOn = null;
                t.blocked = false;
            }
        });

        tasks = tasks.filter(t => t.id !== id);
        saveData();
        renderTasks();
        renderGantt();
        renderAllTasksTable();
        closeModal('editTaskModal');
    }
}

// === Отображение задач ===
function renderTasks() {
    const container = document.getElementById('tasksList');
    const teamTasks = tasks.filter(t => t.teamId === currentUser.team);

    if (teamTasks.length === 0) {
        container.innerHTML = '<p style="color:#777;text-align:center;">Нет задач</p>';
        return;
    }

    container.innerHTML = teamTasks.map(t => {
        const isBlocked = t.blocked && t.status !== 'completed';
        const blockedStyle = isBlocked ? 'opacity:0.6; pointer-events:none;' : '';
        const lockIcon = isBlocked ? ' [Locked]' : '';

        return `
            <div class="flex align-center justify-between mb-1" style="padding:0.5rem; background:#f8f9fa; border-radius:8px; ${blockedStyle} position:relative;">
                <label style="cursor:${isBlocked?'not-allowed':'pointer'}; flex:1;">
                    <input type="checkbox" ${t.status==='completed'?'checked':''} ${isBlocked?'disabled':''} onchange="toggleTaskStatus(${t.id})">
                    <strong>${t.name}</strong> (${t.role})${lockIcon}
                    ${t.dependsOn ? `<br><small style="color:#e74c3c;">→ Зависит от: ${getTaskName(t.dependsOn)}</small>` : ''}
                </label>
                <div class="flex gap-05">
                    <button onclick="openEditTask(${t.id})" style="background:#f39c12; padding:0.25rem 0.5rem; font-size:0.8rem;">Edit</button>
                </div>
            </div>
        `;
    }).join('');

    populateTaskDependencies();
}

function renderAllTasksTable() {
    const tbody = document.querySelector('#allTasksTable tbody');
    const teamTasks = tasks.filter(t => t.teamId === currentUser.team);

    if (teamTasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#777;">Нет задач</td></tr>';
        return;
    }

    tbody.innerHTML = teamTasks.map(t => {
        const isBlocked = t.blocked && t.status !== 'completed';
        const statusText = t.status === 'completed' ? 'Завершено' : (isBlocked ? 'Заблокировано' : 'В работе');
        const statusClass = t.status === 'completed' ? 'status completed' : (isBlocked ? 'status pending' : 'status in-progress');

        return `
            <tr>
                <td><strong>${t.name}</strong></td>
                <td>${t.role}</td>
                <td>${formatDate(t.deadline)}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td>
                    <button onclick="openEditTask(${t.id})" style="background:#f39c12; padding:0.3rem 0.6rem; font-size:0.8rem;">Edit</button>
                </td>
            </tr>
        `;
    }).join('');
}

function getTaskName(id) {
    const task = tasks.find(t => t.id === id);
    return task ? task.name : '???';
}

function populateTaskDependencies() {
    const sel = document.getElementById('taskDependsOn');
    sel.innerHTML = '<option value="">Нет зависимости</option>';

    const teamTasks = tasks.filter(t => t.teamId === currentUser.team && t.status !== 'completed');
    teamTasks.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `${t.name} (${t.role})`;
        sel.appendChild(opt);
    });
}

// === Гантт ===
function renderGantt() {
    const container = document.getElementById('ganttChart');
    const teamTasks = tasks.filter(t => t.teamId === currentUser.team && t.status !== 'completed' && !t.blocked);

    if (teamTasks.length === 0) {
        container.innerHTML = '<p style="color:#777;text-align:center;">Нет активных задач</p>';
        return;
    }

    container.innerHTML = teamTasks.map(t => {
        const now = new Date();
        const deadline = new Date(t.deadline);
        const total = deadline - now;
        const percent = total > 0 ? 0 : Math.min(Math.abs(total) / (7 * 24 * 60 * 60 * 1000) * 100, 100);

        return `
            <div class="gantt-bar">
                <div class="gantt-bar-fill" style="width:${percent}%"></div>
                <div class="gantt-label">${t.name}</div>
                <div class="gantt-time">${total > 0 ? 'Осталось ' + formatTimeLeft(total) : 'Просрочено'}</div>
            </div>
        `;
    }).join('');
}

function formatTimeLeft(ms) {
    const days = Math.floor(ms / (24*60*60*1000));
    const hours = Math.floor((ms % (24*60*60*1000)) / (60*60*1000));
    return days > 0 ? `${days} дн` : `${hours} ч`;
}

// === Утилиты ===
function formatDate(d) {
    const date = new Date(d);
    return date.toLocaleDateString('ru') + ' ' + date.toLocaleTimeString('ru', {hour:'2-digit', minute:'2-digit'});
}

function saveData() {
    localStorage.setItem('teams', JSON.stringify(teams));
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
}

function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
    document.querySelector(`nav a[onclick="showSection('${id}')"]`).classList.add('active');

    if (id === 'dashboard') {
        renderTasks();
        renderGantt();
    }
    if (id === 'tasks') {
        renderAllTasksTable();
    }
}

function openModal(id) {
    document.getElementById(id).style.display = 'block';
    if (id === 'createTaskModal') {
        populateTaskDependencies();
    }
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }
window.onclick = e => { if (e.target.classList.contains('modal')) e.target.style.display = 'none'; };