import { apiCall, loadInitialData } from './api.js';
import { updateUI } from './ui.js';

export async function login() {
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
            window.currentToken = response.token;
            window.currentUser = response.student;
            localStorage.setItem('token', window.currentToken);
            
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

export async function register() {
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
            window.currentToken = response.token;
            window.currentUser = response.student;
            localStorage.setItem('token', window.currentToken);
            
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

export function logout() {
    window.currentToken = null;
    window.currentUser = null;
    localStorage.removeItem('token');
    switchToAuthScreen();
}

export function switchToAuthScreen() {
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
    clearAuthFields();
}

export function switchToMainApp() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    
    // Показываем имя пользователя
    if (window.currentUser) {
        document.getElementById('userName').textContent = `Привет, ${window.currentUser.name}`;
    }
    
    // Загружаем данные
    loadInitialData();
}

export function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('authMessage').innerHTML = '';
}

export function showLogin() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('authMessage').innerHTML = '';
}

export async function checkAuth() {
    if (window.currentToken) {
        try {
            // Пробуем получить профиль пользователя
            const profile = await apiCall('/Auth/profile');
            if (profile) {
                window.currentUser = profile;
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