let currentUser = { id: 1, name: "Иванов Иван", team: null };
let teams = JSON.parse(localStorage.getItem('teams')) || [];
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

// === Инициализация ===
document.addEventListener('DOMContentLoaded', () => {
    handleInviteFromUrl();
    updateTeamInfo();
    renderTasks();
    renderGantt();
    renderAllTasksTable();
    showSection('dashboard');
});

// === Автоматическое присоединение по параметру ?invite=... ===
function handleInviteFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const inviteId = params.get('invite');
    if (!inviteId || currentUser.team) return;

    const team = teams.find(t => t.id == inviteId);
    if (!team) {
        alert("Команда не найдена. Ссылка недействительна.");
        history.replaceState(null, null, location.pathname);
        return;
    }

    if (team.members.includes(currentUser.id)) {
        currentUser.team = team.id;
        saveData();
        updateTeamInfo();
        alert(`Вы уже в команде "${team.name}"!`);
        history.replaceState(null, null, location.pathname);
        return;
    }

    if (confirm(`Присоединиться к команде "${team.name}"?\nПредмет: ${team.subject}`)) {
        team.members.push(currentUser.id);
        currentUser.team = team.id;
        saveData();
        updateTeamInfo();
        alert(`Добро пожаловать в команду "${team.name}"!`);
        history.replaceState(null, null, location.pathname);
    }
}

// === Присоединиться по вставленной ссылке ===
function joinByManualLink() {
    const input = document.getElementById('manualInviteInput').value.trim();
    if (!input) return alert("Вставьте ссылку-приглашение!");

    let inviteId;
    try {
        const url = new URL(input);
        inviteId = url.searchParams.get('invite');
    } catch (e) {
        const match = input.match(/invite[=:](\d+)/i);
        if (match) inviteId = match[1];
    }

    if (!inviteId) return alert("Проверьте ссылку.");

    history.replaceState(null, null, `${location.pathname}?invite=${inviteId}`);
    handleInviteFromUrl();
    document.getElementById('manualInviteInput').value = '';
}

// === Создание команды ===
function createTeam() {
    const name = document.getElementById('teamName').value.trim();
    const subject = document.getElementById('teamSubjectInput').value.trim();
    if (!name || !subject) return alert("Заполните название команды и предмет!");

    const teamId = Date.now();
    const inviteLink = `${location.origin}${location.pathname}?invite=${teamId}`;

    teams.push({
        id: teamId,
        name,
        subject,
        captain: currentUser.id,
        members: [currentUser.id],
        inviteLink
    });

    currentUser.team = teamId;
    saveData();
    updateTeamInfo();
    closeModal('createTeamModal');

    navigator.clipboard.writeText(inviteLink).then(() => {
        alert(`Команда "${name}" создана!\nСсылка-приглашение скопирована в буфер обмена.`);
    });
}

// === Копирование ссылки-приглашения ===
function copyInviteLink() {
    const input = document.getElementById('inviteLink');
    input.select();
    navigator.clipboard.writeText(input.value);
    alert("Ссылка скопирована!");
}

// === Обновление блока "Ваша команда" ===
function updateTeamInfo() {
    const info = document.getElementById('teamInfo');
    const linkSec = document.getElementById('inviteLinkSection');
    const btn = document.getElementById('createTeamBtn');

    if (!currentUser.team) {
        info.innerHTML = `
            <p style="color:#777; text-align:center; margin-bottom:1rem;">Вы не в команде</p>
            <div id="joinByLinkSection" style="margin-top:1rem; padding:1rem; background:#f8f9fa; border-radius:12px; border:2px dashed #3498db;">
                <label style="display:block; margin-bottom:0.5rem; font-weight:600; color:#2c3e50;">Есть ссылка-приглашение?</label>
                <div class="input-group">
                    <input type="text" id="manualInviteInput" placeholder="Вставьте ссылку сюда..." style="flex:1;">
                    <button onclick="joinByManualLink()">Присоединиться</button>
                </div>
                <small style="color:#7f8c8d; display:block; margin-top:0.5rem;">
                    Например: https://site.com/?invite=1731845678901
                </small>
            </div>`;
        linkSec.style.display = 'none';
        btn.style.display = 'block';
        return;
    }

    const team = teams.find(t => t.id === currentUser.team);
    btn.style.display = 'none';
    linkSec.style.display = 'block';
    document.getElementById('inviteLink').value = team.inviteLink;

    // Минус поле для ввода ссылки,если в команде
    const joinSection = document.getElementById('joinByLinkSection');
    if (joinSection) joinSection.remove();

    info.innerHTML = `
        <h3>${team.name}</h3>
        <p><strong>Предмет: ${team.subject}</p>
        <p><strong>Участников:</strong> ${team.members.length}</p>
    `;
}

// === Создание задачи ===
function createTask() {
    const name = document.getElementById('taskName').value.trim();
    const role = document.getElementById('taskRoleInput').value.trim();
    const assignee = document.getElementById('taskAssignee').value.trim() || currentUser.name;
    const deadline = document.getElementById('taskDeadline').value;
    const dependsOn = document.getElementById('taskDependsOn').value || null;

    if (!name || !role || !deadline || !currentUser.team) {
        alert("Заполните все обязательные поля и вступите в команду!");
        return;
    }

    tasks.push({
        id: Date.now(),
        name,
        role,
        assignee,
        deadline,
        status: 'pending',
        teamId: currentUser.team,
        dependsOn: dependsOn ? +dependsOn : null,
        blocked: !!dependsOn
    });

    saveData();
    renderTasks();
    renderGantt();
    renderAllTasksTable();
    closeModal('createTaskModal');
}

// === Статуса задачи ===
function toggleTaskStatus(id) {
    const task = tasks.find(t => t.id === id);
    if (task.blocked) return alert("Сначала заверши задачу-зависимость!");

    task.status = task.status === 'completed' ? 'pending' : 'completed';
    tasks.forEach(t => {
        if (t.dependsOn === id) t.blocked = task.status !== 'completed';
    });

    saveData();
    renderTasks();
    renderGantt();
    renderAllTasksTable();
}

// === Ссылка на зависимую задачу ===
function renderDependencyLink(id) {
    const t = tasks.find(x => x.id === id);
    return t ? `<a href="#" onclick="openEditTask(${id});return false;" class="dep-link">→ ${t.name}</a>`
             : '<span style="color:#e74c3c;">[удалена]</span>';
}

// === Отображение задач на главной ===
function renderTasks() {
    const container = document.getElementById('tasksList');
    const teamTasks = tasks.filter(t => t.teamId === currentUser.team);

    if (!teamTasks.length) {
        container.innerHTML = '<p style="color:#777;text-align:center;">Задач пока нет. Добавь первую!</p>';
        return;
    }

    container.innerHTML = teamTasks.map(t => {
        const blocked = t.blocked && t.status !== 'completed';
        return `
            <div class="task-item ${blocked ? 'blocked' : ''}">
                <label>
                    <input type="checkbox" ${t.status==='completed'?'checked':''} ${blocked?'disabled':''}
                           onchange="toggleTaskStatus(${t.id})">
                    <strong>${t.name}</strong> <small>(${t.role})</small>${blocked ? ' [Заблокировано]' : ''}
                </label>
                <div class="task-meta">
                    <small>${t.assignee}</small>
                    <small>${formatDate(t.deadline)}</small>
                    ${t.dependsOn ? `<div>${renderDependencyLink(t.dependsOn)}</div>` : ''}
                    <button onclick="openEditTask(${t.id})" class="edit-btn">Edit</button>
                </div>
            </div>`;
    }).join('');

    populateTaskDependencies();
}

// === Таблица всех задач ===
function renderAllTasksTable() {
    const tbody = document.querySelector('#allTasksTable tbody');
    const teamTasks = tasks.filter(t => t.teamId === currentUser.team);

    tbody.innerHTML = teamTasks.map(t => {
        const blocked = t.blocked && t.status !== 'completed';
        const status = t.status === 'completed' ? 'Готово' : (blocked ? 'Заблокировано' : 'В работе');
        const cls = t.status === 'completed' ? 'completed' : (blocked ? 'pending' : 'in-progress');

        return `
            <tr>
                <td><strong>${t.name}</strong></td>
                <td>${t.role}</td>
                <td>${t.assignee}</td>
                <td>${formatDate(t.deadline)}</td>
                <td><span class="status ${cls}">${status}</span></td>
                <td>
                    <button onclick="openEditTask(${t.id})" class="edit-btn">Edit</button>
                    <button onclick="deleteTaskConfirm(${t.id})" style="background:#e74c3c;margin-left:5px;">Delete</button>
                </td>
            </tr>`;
    }).join('');
}

// === Заполнение зависимостей в селектах ===
function populateTaskDependencies() {
    const sel = document.getElementById('taskDependsOn');
    sel.innerHTML = '<option value="">Нет зависимости</option>';
    tasks.filter(t => t.teamId === currentUser.team && t.status !== 'completed').forEach(t => {
        sel.add(new Option(`${t.name} (${t.role})`, t.id));
    });
}

// === Открытие редактирования задачи ===
function openEditTask(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;

    document.getElementById('editTaskId').value = t.id;
    document.getElementById('editTaskName').value = t.name;
    document.getElementById('editTaskRoleInput').value = t.role;
    document.getElementById('editTaskAssignee').value = t.assignee;
    document.getElementById('editTaskDeadline').value = t.deadline.replace(' ', 'T');
    document.getElementById('editTaskDependsOn').value = t.dependsOn || '';

    const sel = document.getElementById('editTaskDependsOn');
    sel.innerHTML = '<option value="">Нет зависимости</option>';
    tasks.filter(x => x.teamId === currentUser.team && x.id !== id && x.status !== 'completed').forEach(x => {
        sel.add(new Option(`${x.name} (${x.role})`, x.id));
    });

    openModal('editTaskModal');
}

// === Сохранение изменений задачи ===
function saveTaskEdit() {
    const id = +document.getElementById('editTaskId').value;
    const t = tasks.find(x => x.id === id);
    const newName = document.getElementById('editTaskName').value.trim();
    const newRole = document.getElementById('editTaskRoleInput').value.trim();
    const newAssignee = document.getElementById('editTaskAssignee').value.trim() || currentUser.name;
    const newDeadline = document.getElementById('editTaskDeadline').value;
    const newDependsOn = document.getElementById('editTaskDependsOn').value || null;

    if (!newName || !newRole || !newDeadline) return alert("Заполните все обязательные поля!");

    t.name = newName;
    t.role = newRole;
    t.assignee = newAssignee;
    t.deadline = newDeadline;
    t.dependsOn = newDependsOn ? +newDependsOn : null;
    t.blocked = t.dependsOn ? (tasks.find(x => x.id === t.dependsOn)?.status !== 'completed') : false;

    saveData();
    renderTasks();
    renderGantt();
    renderAllTasksTable();
    closeModal('editTaskModal');
}

// === Удаление задачи с подтверждением ===
function deleteTaskConfirm(id = null) {
    const taskId = id || +document.getElementById('editTaskId').value;
    const task = tasks.find(t => t.id === taskId);
    const depsCount = tasks.filter(t => t.dependsOn === taskId).length;

    if (confirm(`Удалить задачу «${task.name}»?\n${depsCount ? `От неё зависят ${depsCount} задач(и). Зависимости будут сняты.` : ''}`)) {
        tasks = tasks.filter(t => t.id !== taskId);
        tasks.forEach(t => {
            if (t.dependsOn === taskId) {
                t.dependsOn = null;
                t.blocked = false;
            }
        });
        saveData();
        renderTasks();
        renderGantt();
        renderAllTasksTable();
        closeModal('editTaskModal');
    }
}

// === Обратная диаграмма Ганта ===
function renderGantt() {
    const container = document.getElementById('ganttChart');
    const active = tasks.filter(t => t.teamId === currentUser.team && t.status !== 'completed' && !t.blocked);

    if (!active.length) {
        container.innerHTML = '<p style="color:#777;text-align:center;">Нет активных задач</p>';
        return;
    }

    container.innerHTML = active.map(t => {
        const now = Date.now();
        const dl = new Date(t.deadline).getTime();
        const percent = dl < now ? Math.min(Math.abs((now - dl) / (7 * 86400000)) * 100, 100) : 0;

        return `
            <div class="gantt-bar">
                <div class="gantt-bar-fill" style="width:${percent}%"></div>
                <div class="gantt-label">${t.name}</div>
                <div class="gantt-time">${dl > now ? 'Осталось ' + formatTimeLeft(dl - now) : 'Просрочено'}</div>
            </div>`;
    }).join('');
}

function formatTimeLeft(ms) {
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    return days > 0 ? `${days} дн` : `${hours} ч`;
}

// === Утилиты ===
function formatDate(d) {
    return new Date(d).toLocaleString('ru', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
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

    if (id === 'dashboard') { renderTasks(); renderGantt(); }
    if (id === 'tasks') renderAllTasksTable();
}

function openModal(id) {
    document.getElementById(id).style.display = 'block';
    if (id === 'createTaskModal' || id === 'editTaskModal') {
        populateTaskDependencies();
    }
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

window.onclick = e => {
    if (e.target.classList.contains('modal')) e.target.style.display = 'none';
};