const API_BASE = 'http://localhost:5000/api';

export async function apiCall(endpoint, options = {}) {
    try {
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        // Добавляем токен авторизации, если есть
        if (window.currentToken) {
            headers['Authorization'] = `Bearer ${window.currentToken}`;
        }

        const fetchOptions = {
            headers,
            ...options
        };

        const response = await fetch(`${API_BASE}${endpoint}`, fetchOptions);

        // Если статус 401 - неавторизован
        if (response.status === 401) {
            if (window.logout) window.logout();
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
        if (window.showAuthMessage) {
            window.showAuthMessage(`Ошибка: ${error.message}`, 'error');
        }
        throw error;
    }
}

export async function loadInitialData() {
    if (!window.currentUser) return;
    
    try {
        // Загружаем данные параллельно
        [window.teams, window.students, window.subjects] = await Promise.all([
            apiCall('/Teams'),
            apiCall('/Students'),
            apiCall('/Subjects')
        ]);

        window.myTasks = await apiCall(`/Tasks/student/${window.currentUser.id}`) || [];

        // Загружаем задачи команды
        if (window.currentUser.teamId) {
            window.teamTasks = await apiCall(`/Teams/${window.currentUser.teamId}/all-tasks`) || [];
        } else {
            window.teamTasks = [];
        }

        if (window.updateUI) window.updateUI();
    } catch (error) {
        console.error('Failed to load initial data:', error);
    }
}