const API_BASE = 'http://localhost:5000/api';

let currentToken = localStorage.getItem('token');
let currentUser = null;
let teams = [];
let students = [];
let subjects = [];
let myTasks = [];
let teamTasks = [];

// === API функция (с авторизацией) ===
async function apiCall(endpoint, options = {}) {
    try {
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        // Добавляем токен авторизации, если есть
        if (currentToken) {
            headers['Authorization'] = `Bearer ${currentToken}`;
        }

        const fetchOptions = {
            headers,
            ...options
        };

        const response = await fetch(`${API_BASE}${endpoint}`, fetchOptions);

        // Если статус 401 - неавторизован
        if (response.status === 401) {
            logout();
            return null;
        }

        // Если статус 204 No Content — возвращаем null
        if (response.status === 204) return null;

        // Попробуем парсить JSON
        const text = await response.text();
        if (!text) return null;
        
        try {
            return JSON.parse(text);
        } catch (e) {
            return text;
        }
    } catch (error) {
        console.error('API Error:', error);
        showAuthMessage(`Ошибка: ${error.message}`, 'error');
        throw error;
    }
}

// === Авторизация ===
async function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    if (!email || !password) {
        showAuthMessage('Введите email и пароль', 'error');
        return;
    }

    try {
        const response = await apiCall('/Auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (response && response.token) {
            // Сохраняем токен и данные пользователя
            currentToken = response.token;
            currentUser = response.student;
            localStorage.setItem('token', currentToken);
            
            // Переключаемся на основное приложение
            switchToMainApp();
            showAuthMessage('Вход выполнен успешно!', 'success');
        } else {
            showAuthMessage('Неверный email или пароль', 'error');
        }
    } catch (error) {
        showAuthMessage('Ошибка входа', 'error');
    }
}

async function register() {
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value.trim();
    const role = document.getElementById('registerRole').value;
    
    if (!name || !email || !password) {
        showAuthMessage('Заполните все поля', 'error');
        return;
    }

    if (password.length < 6) {
        showAuthMessage('Пароль должен быть не менее 6 символов', 'error');
        return;
    }

    try {
        const response = await apiCall('/Auth/register', {
            method: 'POST',
            body: JSON.stringify({ 
                name, 
                email, 
                password, 
                currentRole: parseInt(role) 
            })
        });

        if (response && response.token) {
            // Сохраняем токен и данные пользователя
            currentToken = response.token;
            currentUser = response.student;
            localStorage.setItem('token', currentToken);
            
            // Переключаемся на основное приложение
            switchToMainApp();
            showAuthMessage('Регистрация успешна!', 'success');
        } else {
            showAuthMessage('Ошибка регистрации', 'error');
        }
    } catch (error) {
        showAuthMessage('Этот email уже используется', 'error');
    }
}

function logout() {
    currentToken = null;
    currentUser = null;
    localStorage.removeItem('token');
    switchToAuthScreen();
}

// === Переключение экранов ===
function switchToAuthScreen() {
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
    clearAuthFields();
}

function switchToMainApp() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    
    // Показываем имя пользователя
    if (currentUser) {
        document.getElementById('userName').textContent = `Привет, ${currentUser.name}`;
    }
    
    // Загружаем данные
    loadInitialData();
}

function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('authMessage').innerHTML = '';
}

function showLogin() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('authMessage').innerHTML = '';
}

function clearAuthFields() {
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('registerName').value = '';
    document.getElementById('registerEmail').value = '';
    document.getElementById('registerPassword').value = '';
    document.getElementById('authMessage').innerHTML = '';
}

function showAuthMessage(message, type = 'error') {
    const messageEl = document.getElementById('authMessage');
    messageEl.innerHTML = message;
    messageEl.className = `auth-message ${type}`;
}

// === Проверка авторизации при загрузке ===
async function checkAuth() {
    if (currentToken) {
        try {
            // Пробуем получить профиль пользователя
            const profile = await apiCall('/Auth/profile');
            if (profile) {
                currentUser = profile;
                switchToMainApp();
            } else {
                logout();
            }
        } catch (error) {
            logout();
        }
    } else {
        switchToAuthScreen();
    }
}

// === Загрузка данных при запуске ===
async function loadInitialData() {
    if (!currentUser) return;
    
    try {
        // Загружаем данные параллельно
        [teams, students, subjects] = await Promise.all([
            apiCall('/Teams'),
            apiCall('/Students'),
            apiCall('/Subjects')
        ]);

        myTasks = await apiCall(`/Tasks/student/${currentUser.id}`) || [];

        // Загружаем задачи команды
        if (currentUser.teamId) {
            teamTasks = await apiCall(`/Teams/${currentUser.teamId}/all-tasks`) || [];
        } else {
            teamTasks = [];
        }

        // Загружаем статусы выполнения для задач
        await loadTaskStatuses();

        updateUI();
    } catch (error) {
        console.error('Failed to load initial data:', error);
    }
}

// === Загрузка статусов выполнения задач ===
async function loadTaskStatuses() {
    // Загружаем статусы для моих задач
    if (myTasks && myTasks.length > 0) {
        for (let task of myTasks) {
            try {
                const status = await apiCall(`/Results/status/${task.id}`);
                if (status !== undefined && status !== null) {
                    if (!task.results) task.results = [];
                    task.results[0] = { isCompleted: status };
                }
            } catch (error) {
                console.error(`Error loading status for task ${task.id}:`, error);
                if (!task.results) task.results = [];
                task.results[0] = { isCompleted: false };
            }
        }
    }
    
    // Загружаем статусы для задач команды
    if (teamTasks && teamTasks.length > 0) {
        for (let task of teamTasks) {
            try {
                const status = await apiCall(`/Results/status/${task.id}`);
                if (status !== undefined && status !== null) {
                    if (!task.results) task.results = [];
                    task.results[0] = { isCompleted: status };
                }
            } catch (error) {
                console.error(`Error loading status for task ${task.id}:`, error);
                if (!task.results) task.results = [];
                task.results[0] = { isCompleted: false };
            }
        }
    }
}

// === Обновление всего UI ===
function updateUI() {
    updateTeamInfo();
    renderTasks();
    renderAllTasksTable();
    renderTeamMembers();
    renderSubjects();
    updateTaskSelects();
}

// === Обновление информации о команде ===
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
                        Например: ABC123DE
                    </small>
                </div>`;
        }
        if (linkSec) linkSec.style.display = 'none';
        if (btn) btn.style.display = 'block';
        return;
    }

    const team = (teams || []).find(t => t.id === currentUser.teamId);
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

// === Отображение МОИХ задач на главной ===
function renderTasks() {
    const container = document.getElementById('tasksList');
    if (!container) return;

    // Показываем ТОЛЬКО СВОИ задачи
    if (!myTasks || myTasks.length === 0) {
        container.innerHTML = '<p style="color:#777;text-align:center;">У вас пока нет задач. Добавьте первую!</p>';
        return;
    }

    // Сортируем по дедлайну (сначала просроченные)
    const sortedTasks = [...myTasks].sort((a, b) => {
        const aDate = a.deadline ? new Date(a.deadline) : new Date(9999, 11, 31);
        const bDate = b.deadline ? new Date(b.deadline) : new Date(9999, 11, 31);
        return aDate - bDate;
    });

    container.innerHTML = sortedTasks.map(task => {
        // Находим предмет по subjectId
        const subject = (subjects || []).find(s => s.id === task.subjectId);
        const subjectName = subject ? subject.name : 'Не указан';
        
        // Определяем статус задачи
        const completedResults = task.results?.filter(r => r.isCompleted) || [];
        const isCompleted = completedResults.length > 0;
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

// === Таблица ВСЕХ задач команды ===
function renderAllTasksTable() {
    const tbody = document.querySelector('#allTasksTable tbody');
    if (!tbody) return;

    // Показываем задачи ВСЕЙ команды
    if (!currentUser.teamId) {
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

    if (!teamTasks || teamTasks.length === 0) {
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
    const sortedTasks = [...teamTasks].sort((a, b) => {
        const aDate = a.deadline ? new Date(a.deadline) : new Date(9999, 11, 31);
        const bDate = b.deadline ? new Date(b.deadline) : new Date(9999, 11, 31);
        return aDate - bDate;
    });

    tbody.innerHTML = sortedTasks.map(task => {
        const isMyTask = task.assignedStudentId === currentUser.id;
        const assignee = (students || []).find(s => s.id === task.assignedStudentId);
        const assigneeName = assignee ? assignee.name : 'Не назначен';
        
        // Находим предмет - сначала из загруженных данных задачи, потом из subjects
        const subject = task.subject || (subjects || []).find(s => s.id === task.subjectId);
        const subjectName = subject ? subject.name : 'Не указан';
        
        // Определяем статус задачи
        const completedResults = task.results?.filter(r => r.isCompleted) || [];
        const isCompleted = completedResults.length > 0;
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

// === Отображение участников команды ===
function renderTeamMembers() {
    const container = document.getElementById('teamMembersList');
    if (!container) return;

    if (!currentUser.teamId) {
        container.innerHTML = '<p style="color:#777;">Вы не состоите в команде</p>';
        return;
    }

    const teamMembers = (students || []).filter(s => s.teamId === currentUser.teamId);
    
    if (!teamMembers.length) {
        container.innerHTML = '<p style="color:#777;">Нет участников</p>';
        return;
    }

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem;">
            ${teamMembers.map(member => `
                <div style="background: #f8f9fa; padding: 1rem; border-radius: 12px; border-left: 4px solid #3498db;">
                    <strong style="font-size: 1.1rem;">${member.name}</strong>
                    ${member.id === currentUser.id ? ' <small>(Вы)</small>' : ''}
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

// === Отображение предметов ===
function renderSubjects() {
    const container = document.getElementById('subjectsList');
    if (!container) return;
    
    if (!subjects || subjects.length === 0) {
        container.innerHTML = '<p style="color:#777;">Нет предметов. Добавьте первый!</p>';
        return;
    }
    
    // Считаем задачи для каждого предмета
    container.innerHTML = subjects.map(subject => {
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

// === Обновление select'ов в формах ===
function updateTaskSelects() {
    // Заполняем список предметов
    const subjectSelect = document.getElementById('taskSubject');
    const editSubjectSelect = document.getElementById('editTaskSubject');
    
    if (subjectSelect) {
        subjectSelect.innerHTML = '<option value="">Выберите предмет</option>' +
            (subjects || []).map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }
    
    if (editSubjectSelect) {
        editSubjectSelect.innerHTML = '<option value="">Выберите предмет</option>' +
            (subjects || []).map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }
    
    // Заполняем список студентов команды (для назначения задач)
    const assigneeSelect = document.getElementById('taskAssignee');
    const editAssigneeSelect = document.getElementById('editTaskAssignee');
    
    if (assigneeSelect) {
        assigneeSelect.innerHTML = '<option value="">Не назначать</option>' +
            '<option value="' + currentUser.id + '">Вы</option>';
        
        if (currentUser.teamId) {
            const teamStudents = (students || []).filter(s => 
                s.teamId === currentUser.teamId && s.id !== currentUser.id);
            teamStudents.forEach(s => {
                assigneeSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
            });
        }
    }
    
    if (editAssigneeSelect) {
        editAssigneeSelect.innerHTML = '<option value="">Не назначать</option>' +
            '<option value="' + currentUser.id + '">Вы</option>';
        
        if (currentUser.teamId) {
            const teamStudents = (students || []).filter(s => 
                s.teamId === currentUser.teamId && s.id !== currentUser.id);
            teamStudents.forEach(s => {
                editAssigneeSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
            });
        }
    }
}

// === Создание команды ===
async function createTeam() {
    const name = document.getElementById('teamName').value.trim();
    const description = document.getElementById('teamDescription').value.trim();
    
    if (!name) {
        alert("Введите название команды!");
        return;
    }

    try {
        const newTeam = await apiCall('/Teams', {
            method: 'POST',
            body: JSON.stringify({
                name: name,
                description: description
            })
        });

        // Добавляем текущего пользователя в команду
        await apiCall(`/Teams/${newTeam.id}/join/${currentUser.id}`, { 
            method: 'POST' 
        });

        // Обновляем студента
        await apiCall(`/Students/${currentUser.id}`, {
            method: 'PUT',
            body: JSON.stringify({
                ...currentUser,
                teamId: newTeam.id
            })
        });

        currentUser.teamId = newTeam.id;
        
        // Перезагружаем данные
        await loadInitialData();
        closeModal('createTeamModal');
        
        alert(`Команда "${name}" создана!`);
    } catch (error) {
        console.error('Create team error:', error);
        alert(`Ошибка: ${error.message}`);
    }
}

// === Создание задачи ===
async function createTask() {
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
        const assignedStudentId = assigneeId ? parseInt(assigneeId) : currentUser.id;

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

// === Создание предмета ===
async function createSubject() {
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
        
        await loadInitialData();
        closeModal('createSubjectModal');
        alert(`Предмет "${name}" создан!`);
    } catch (error) {
        console.error('Create subject error:', error);
        alert(`Ошибка: ${error.message}`);
    }
}

// === Присоединение по коду ===
async function joinByManualLink() {
    const inputEl = document.getElementById('manualInviteInput');
    const inviteCode = inputEl ? inputEl.value.trim().toUpperCase() : '';
    
    if (!inviteCode) {
        alert("Введите код приглашения!");
        return;
    }

    try {
        // Получаем информацию о команде
        const teamInfo = await apiCall(`/Teams/invite/${inviteCode}`);
        if (!teamInfo) {
            alert("Команда не найдена. Проверьте код.");
            return;
        }

        if (confirm(`Присоединиться к команде "${teamInfo.name}"?`)) {
            // Присоединяемся
            await apiCall(`/Teams/${teamInfo.id}/join/${currentUser.id}`, { 
                method: 'POST' 
            });

            // Обновляем текущего пользователя
            currentUser.teamId = teamInfo.id;
            await loadInitialData();
            
            alert(`Вы присоединились к команде "${teamInfo.name}"!`);
            
            if (inputEl) inputEl.value = '';
        }
    } catch (error) {
        console.error('Join team error:', error);
        alert("Ошибка при присоединении к команде");
    }
}

// === Редактирование задачи ===
function openEditTask(id) {
    // Ищем задачу сначала в своих задачах, потом в задачах команды
    let task = (myTasks || []).find(x => x.id === id);
    if (!task) {
        task = (teamTasks || []).find(x => x.id === id);
    }
    
    if (!task) return;

    document.getElementById('editTaskId').value = task.id;
    document.getElementById('editTaskName').value = task.title;
    document.getElementById('editTaskDescription').value = task.description || '';
    
    // Заполняем выпадающий список предметов
    const editSubjectSelect = document.getElementById('editTaskSubject');
    if (editSubjectSelect) {
        editSubjectSelect.innerHTML = '<option value="">Выберите предмет</option>' +
            (subjects || []).map(s => `<option value="${s.id}" ${s.id === task.subjectId ? 'selected' : ''}>${s.name}</option>`).join('');
    }
    
    // Заполняем выпадающий список ответственных
    const editAssigneeSelect = document.getElementById('editTaskAssignee');
    if (editAssigneeSelect) {
        editAssigneeSelect.innerHTML = '<option value="">Не назначать</option>' +
            '<option value="' + currentUser.id + '" ' + (task.assignedStudentId === currentUser.id ? 'selected' : '') + '>Вы</option>';
        
        if (currentUser.teamId) {
            const teamStudents = (students || []).filter(s => 
                s.teamId === currentUser.teamId && s.id !== currentUser.id);
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

async function saveTaskEdit() {
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

// === Чекбокс для выполнения задач ===
async function toggleTaskCompletion(taskId) {
    try {
        const response = await apiCall(`/Results/toggle/${taskId}`, {
            method: 'POST'
        });

        if (response) {
            // Обновляем статус задачи во всех массивах
            updateTaskStatus(taskId, response.isCompleted);
            
            // Перерисовываем интерфейс
            renderTasks();
            renderAllTasksTable();
            
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

// === Обновление статуса задачи в массивах ===
function updateTaskStatus(taskId, isCompleted) {
    // Обновляем в myTasks
    const myTask = myTasks?.find(t => t.id === taskId);
    if (myTask) {
        if (!myTask.results) myTask.results = [];
        if (myTask.results.length === 0) {
            myTask.results.push({ isCompleted: isCompleted });
        } else {
            myTask.results[0].isCompleted = isCompleted;
        }
    }
    
    // Обновляем в teamTasks
    const teamTask = teamTasks?.find(t => t.id === taskId);
    if (teamTask) {
        if (!teamTask.results) teamTask.results = [];
        if (teamTask.results.length === 0) {
            teamTask.results.push({ isCompleted: isCompleted });
        } else {
            teamTask.results[0].isCompleted = isCompleted;
        }
    }
}

// === Вспомогательные функции ===
function getRoleName(roleValue) {
    const roles = {
        0: 'Тимлид',
        1: 'Разработчик',
        2: 'Дизайнер',
        3: 'Тестировщик',
        4: 'Аналитик'
    };
    return roles[roleValue] || 'Участник';
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function copyInviteCode() {
    const team = (teams || []).find(t => t.id === currentUser.teamId);
    if (!team) return;
    
    navigator.clipboard.writeText(team.inviteCode);
    alert(`Код "${team.inviteCode}" скопирован!`);
}

function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.style.display = 'block';
}

function closeModal(id) {
    const m = document.getElementById(id);
    if (m) {
        m.style.display = 'none';
        // Очищаем поля формы
        const inputs = m.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if (input.type !== 'button' && input.type !== 'submit') {
                input.value = '';
            }
        });
    }
}

function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    document.querySelectorAll('nav ul li a').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('nav ul li a').forEach(a => {
        if (a.getAttribute('onclick')?.includes(id)) a.classList.add('active');
    });
}

// === Показ уведомлений ===
function showNotification(message, type = 'info') {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-weight: 500;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// === Просмотр деталей задачи ===
function viewTaskDetails(taskId) {
    // Можно реализовать позже
    alert('Просмотр деталей задачи #' + taskId);
}

// === Удаление задачи ===
function deleteTaskConfirm() {
    if (confirm('Вы уверены, что хотите удалить эту задачу?')) {
        // Можно реализовать позже
        alert('Функция удаления будет реализована позже');
    }
}

// === Инициализация ===
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});