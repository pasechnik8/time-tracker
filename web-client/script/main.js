import * as auth from './auth.js';
import * as api from './api.js';
import * as ui from './ui.js';
import * as tasks from './tasks.js';
import * as team from './team.js';
import * as gantt from './gantt.js';
import * as modals from './modals.js';

// Глобальные переменные (доступны всем модулям через window)
window.currentToken = localStorage.getItem('token');
window.currentUser = null;
window.teams = [];
window.students = [];
window.subjects = [];
window.myTasks = [];
window.teamTasks = [];
window.ganttExpanded = true;
window.ganttFilter = 'all';

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    auth.checkAuth();
    
    // Закрытие модальных окон при клике вне их
    window.onclick = function(event) {
        document.querySelectorAll('.modal').forEach(modal => {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        });
    }
});

// Экспортируем функции в глобальную область видимости
window.login = auth.login;
window.register = auth.register;
window.logout = auth.logout;
window.showRegister = auth.showRegister;
window.showLogin = auth.showLogin;
window.switchToMainApp = auth.switchToMainApp;

window.apiCall = api.apiCall;
window.loadInitialData = api.loadInitialData;

window.showSection = ui.showSection;
window.openModal = modals.openModal;
window.closeModal = modals.closeModal;
window.renderTasks = tasks.renderTasks;
window.renderAllTasksTable = tasks.renderAllTasksTable;
window.renderTeamMembers = team.renderTeamMembers;
window.renderSubjects = ui.renderSubjects;
window.renderGanttChart = gantt.renderGanttChart;
window.toggleGanttView = gantt.toggleGanttView;

window.createTeam = team.createTeam;
window.createTask = tasks.createTask;
window.createSubject = ui.createSubject;
window.joinByManualLink = team.joinByManualLink;
window.openEditTask = tasks.openEditTask;
window.saveTaskEdit = tasks.saveTaskEdit;
window.toggleTaskCompletion = tasks.toggleTaskCompletion;
window.deleteTaskConfirm = tasks.deleteTaskConfirm;
window.copyInviteCode = team.copyInviteCode;

window.showGanttTaskDetails = gantt.showGanttTaskDetails;
window.closeGanttDetails = gantt.closeGanttDetails;
window.viewTaskDetails = tasks.viewTaskDetails;

window.updateUI = ui.updateUI;

window.openEditSubjectModal = ui.openEditSubjectModal;
window.saveSubjectEdit = ui.saveSubjectEdit;
window.deleteSubjectConfirm = ui.deleteSubjectConfirm;
window.deleteSubject = ui.deleteSubject;