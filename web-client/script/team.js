import { apiCall } from './api.js';
import { loadInitialData } from './api.js';
import { closeModal } from './modals.js';
import { showNotification } from './utils.js';

export async function createTeam() {
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
        await apiCall(`/Teams/${newTeam.id}/join/${window.currentUser.id}`, { 
            method: 'POST' 
        });

        // Обновляем студента
        await apiCall(`/Students/${window.currentUser.id}`, {
            method: 'PUT',
            body: JSON.stringify({
                ...window.currentUser,
                teamId: newTeam.id
            })
        });

        window.currentUser.teamId = newTeam.id;
        
        // Перезагружаем данные
        await loadInitialData();
        closeModal('createTeamModal');
        
        alert(`Команда "${name}" создана!`);
    } catch (error) {
        console.error('Create team error:', error);
        alert(`Ошибка: ${error.message}`);
    }
}

export async function joinByManualLink() {
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
            await apiCall(`/Teams/${teamInfo.id}/join/${window.currentUser.id}`, { 
                method: 'POST' 
            });

            // Обновляем текущего пользователя
            window.currentUser.teamId = teamInfo.id;
            await loadInitialData();
            
            alert(`Вы присоединились к команде "${teamInfo.name}"!`);
            
            if (inputEl) inputEl.value = '';
        }
    } catch (error) {
        console.error('Join team error:', error);
        alert("Ошибка при присоединении к команде");
    }
}

export function copyInviteCode() {
    const team = (window.teams || []).find(t => t.id === window.currentUser.teamId);
    if (!team) return;
    
    navigator.clipboard.writeText(team.inviteCode);
    showNotification(`Код "${team.inviteCode}" скопирован!`, 'success');
}