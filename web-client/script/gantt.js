import { formatDate, getRoleName } from './utils.js';
import { openEditTask } from './tasks.js';
import { toggleTaskCompletion } from './tasks.js';

export function renderGanttChart() {
    const container = document.getElementById('ganttContent');
    const timelineContainer = document.getElementById('ganttTimeline');
    if (!container || !timelineContainer) return;

    // Получаем выбранный фильтр
    const ganttFilter = document.getElementById('ganttFilter')?.value || 'all';

    // Фильтруем задачи
    let tasksToShow = [];
    if (ganttFilter === 'my') {
        tasksToShow = [...(window.myTasks || [])];
    } else if (ganttFilter === 'team') {
        tasksToShow = [...(window.teamTasks || [])].filter(t => t.assignedStudentId !== window.currentUser.id);
    } else if (ganttFilter === 'pending') {
        const allTasks = [...(window.myTasks || []), ...(window.teamTasks || [])];
        const uniqueTasks = Array.from(new Map(allTasks.map(t => [t.id, t])).values());
        tasksToShow = uniqueTasks.filter(task => {
            const completed = task.isCompleted || false;
            return !completed;
        });
    } else if (ganttFilter === 'overdue') {
        const allTasks = [...(window.myTasks || []), ...(window.teamTasks || [])];
        const uniqueTasks = Array.from(new Map(allTasks.map(t => [t.id, t])).values());
        tasksToShow = uniqueTasks.filter(task => {
            const completed = task.isCompleted || false;
            const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !completed;
            return isOverdue;
        });
    } else {
        // Все задачи (уникальные, без дубликатов)
        const allTasks = [...(window.myTasks || []), ...(window.teamTasks || [])];
        const uniqueTasks = Array.from(new Map(allTasks.map(t => [t.id, t])).values());
        tasksToShow = uniqueTasks;
    }

    // Сортируем задачи по дедлайну
    tasksToShow.sort((a, b) => {
        const aDate = a.deadline ? new Date(a.deadline) : new Date(9999, 11, 31);
        const bDate = b.deadline ? new Date(b.deadline) : new Date(9999, 11, 31);
        return aDate - bDate;
    });

    if (tasksToShow.length === 0) {
        container.innerHTML = `
            <div class="no-tasks-gantt" style="min-width: 900px;">
                <p>Нет задач для отображения</p>
                <button onclick="showSection('dashboard'); openModal('createTaskModal')">Создать задачу</button>
            </div>`;
        timelineContainer.innerHTML = '';
        return;
    }

    // Рассчитываем временной диапазон
    const { minDate, maxDate, dateRange } = calculateGanttDateRange(tasksToShow);
    
    // Рисуем временную шкалу
    renderGanttTimeline(minDate, maxDate, dateRange, timelineContainer);
    
    // Рисуем задачи
    renderGanttTasks(tasksToShow, minDate, maxDate, dateRange, container);
}

function calculateGanttDateRange(tasks) {
    const now = new Date();
    const taskDates = tasks
        .map(task => task.deadline ? new Date(task.deadline) : null)
        .filter(date => date !== null && !isNaN(date.getTime()));
    
    // Если нет дат, используем текущую дату ± 7 дней
    if (taskDates.length === 0) {
        const minDate = new Date(now);
        minDate.setDate(minDate.getDate() - 7);
        const maxDate = new Date(now);
        maxDate.setDate(maxDate.getDate() + 7);
        const dateRange = maxDate - minDate;
        return { minDate, maxDate, dateRange };
    }
    
    // Добавляем сегодняшнюю дату для контекста
    taskDates.push(now);
    
    let minDate = new Date(Math.min(...taskDates.map(d => d.getTime())));
    let maxDate = new Date(Math.max(...taskDates.map(d => d.getTime())));
    
    // Расширяем диапазон на 20% с каждой стороны
    const range = maxDate - minDate;
    const padding = range * 0.2;
    
    minDate = new Date(minDate.getTime() - padding);
    maxDate = new Date(maxDate.getTime() + padding);
    
    // Убедимся, что минимальная дата не слишком в прошлом
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    minDate = minDate < threeMonthsAgo ? threeMonthsAgo : minDate;
    
    // Если диапазон слишком мал, расширяем до 7 дней
    if (maxDate - minDate < 7 * 24 * 60 * 60 * 1000) {
        minDate = new Date(now.getTime() - 3.5 * 24 * 60 * 60 * 1000);
        maxDate = new Date(now.getTime() + 3.5 * 24 * 60 * 60 * 1000);
    }
    
    const dateRange = maxDate - minDate;
    
    return { minDate, maxDate, dateRange };
}

function renderGanttTimeline(minDate, maxDate, dateRange, container) {
    const days = Math.ceil(dateRange / (24 * 60 * 60 * 1000));
    const today = new Date();
    
    let timelineHTML = '';
    const step = days > 30 ? 7 : days > 10 ? 3 : 1; // Автоматически определяем шаг
    
    for (let i = 0; i <= days; i += step) {
        const currentDate = new Date(minDate.getTime() + i * 24 * 60 * 60 * 1000);
        const isToday = currentDate.toDateString() === today.toDateString();
        
        timelineHTML += `
            <div class="gantt-date-marker ${isToday ? 'today' : ''}" style="left: ${(i / days) * 100}%">
                <div class="gantt-date-label">${formatGanttDate(currentDate)}</div>
                ${isToday ? '<div class="gantt-today-line"></div>' : ''}
            </div>
        `;
    }
    
    container.innerHTML = timelineHTML;
}

function renderGanttTasks(tasks, minDate, maxDate, dateRange, container) {
    const today = new Date();
    const now = new Date();
    
    const tasksHTML = tasks.map(task => {
        const assignee = (window.students || []).find(s => s.id === task.assignedStudentId);
        const isMyTask = task.assignedStudentId === window.currentUser.id;
        const subject = (window.subjects || []).find(s => s.id === task.subjectId);
        const completed = task.isCompleted || false;
        
        // Определяем цвет задачи
        let taskColor = getTaskColor(task, completed);
        
        // Позиция на диаграмме
        let left = 0;
        let width = 0;
        let deadlineInfo = '';
        
        if (task.deadline) {
            const deadlineDate = new Date(task.deadline);
            if (!isNaN(deadlineDate.getTime())) {
                // Позиционируем задачу относительно дедлайна
                const daysFromStart = (deadlineDate - minDate) / (24 * 60 * 60 * 1000);
                left = Math.max(0, Math.min(100, (daysFromStart / (dateRange / (24 * 60 * 60 * 1000))) * 100));
                
                // Фиксированная ширина для визуализации
                width = 6; // 6% от ширины диаграммы
                
                // Если дедлайн в прошлом и задача не выполнена, показываем полосу просрочки
                if (deadlineDate < now && !completed) {
                    const daysFromStartNow = (now - minDate) / (24 * 60 * 60 * 1000);
                    const nowLeft = Math.max(0, Math.min(100, (daysFromStartNow / (dateRange / (24 * 60 * 60 * 1000))) * 100));
                    
                    if (nowLeft > left) {
                        // Показываем просроченную часть
                        return `
                            <div class="gantt-task-row" onclick="showGanttTaskDetails(${task.id})">
                                <div class="gantt-task-info">
                                    <div class="gantt-task-title">
                                        <span class="task-color-dot" style="background: ${taskColor};"></span>
                                        ${task.title}
                                        ${isMyTask ? '<span class="my-task-badge">Вы</span>' : ''}
                                        <span class="status-badge overdue">Просрочено</span>
                                    </div>
                                    <div class="gantt-task-meta">
                                        ${subject ? `<span>${subject.name}</span>` : ''}
                                        ${assignee && !isMyTask ? `<span>${assignee.name}</span>` : ''}
                                        ${assignee && !isMyTask ? `<span>${getRoleName(assignee.currentRole)}</span>` : ''}
                                    </div>
                                </div>
                                <div class="gantt-task-bar-container">
                                    <div class="gantt-task-bar overdue-bar" style="left: ${left}%; width: ${nowLeft - left}%; background: #e74c3c;">
                                        <div class="task-progress" style="width: 0%;"></div>
                                    </div>
                                    <div class="gantt-task-deadline" style="left: ${left}%;">
                                        <div class="deadline-marker"></div>
                                        <div class="deadline-label">${formatDate(task.deadline)}</div>
                                    </div>
                                    <div class="gantt-task-duration overdue-duration">
                                        Просрочено на ${Math.ceil((now - deadlineDate) / (24 * 60 * 60 * 1000))} д.
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                }
                
                deadlineInfo = `
                    <div class="gantt-task-deadline" style="left: ${left}%;">
                        <div class="deadline-marker"></div>
                        <div class="deadline-label">${formatDate(task.deadline)}</div>
                    </div>
                `;
            }
        }
        
        // Статус задачи
        let statusBadge = '';
        if (completed) {
            statusBadge = '<span class="status-badge completed">Выполнено</span>';
            taskColor = '#27ae60';
        } else if (task.deadline && new Date(task.deadline) < today) {
            statusBadge = '<span class="status-badge overdue">Просрочено</span>';
            taskColor = '#e74c3c';
        } else {
            statusBadge = '<span class="status-badge pending">В работе</span>';
        }
        
        return `
            <div class="gantt-task-row" onclick="showGanttTaskDetails(${task.id})">
                <div class="gantt-task-info">
                    <div class="gantt-task-title">
                        <span class="task-color-dot" style="background: ${taskColor};"></span>
                        ${task.title}
                        ${isMyTask ? '<span class="my-task-badge">Вы</span>' : ''}
                        ${statusBadge}
                    </div>
                    <div class="gantt-task-meta">
                        ${subject ? `<span>${subject.name}</span>` : ''}
                        ${assignee && !isMyTask ? `<span>${assignee.name}</span>` : ''}
                        ${assignee && !isMyTask ? `<span>${getRoleName(assignee.currentRole)}</span>` : ''}
                    </div>
                </div>
                <div class="gantt-task-bar-container">
                    ${deadlineInfo}
                    <div class="gantt-task-bar" style="left: ${Math.max(0, left - width/2)}%; width: ${width}%; background: ${taskColor};">
                        <div class="task-progress" style="width: ${completed ? 100 : 50}%;"></div>
                    </div>
                    <div class="gantt-task-duration">
                        ${task.deadline ? `До ${formatDate(task.deadline)}` : 'Без срока'}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = tasksHTML;
}

function getTaskColor(task, completed) {
    if (completed) return '#27ae60';
    
    const now = new Date();
    const deadline = task.deadline ? new Date(task.deadline) : null;
    
    if (deadline && deadline < now) {
        return '#e74c3c'; // Просрочено
    }
    
    if (deadline) {
        const daysLeft = Math.ceil((deadline - now) / (24 * 60 * 60 * 1000));
        if (daysLeft <= 1) return '#f39c12'; // Срочно (1 день или меньше)
        if (daysLeft <= 3) return '#f1c40f'; // Скоро (2-3 дня)
        return '#3498db'; // Есть время
    }
    
    return '#95a5a6'; // Без срока
}

function formatGanttDate(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Сегодня';
    if (date.toDateString() === yesterday.toDateString()) return 'Вчера';
    if (date.toDateString() === tomorrow.toDateString()) return 'Завтра';
    
    return date.toLocaleDateString('ru-RU', { 
        month: 'short', 
        day: 'numeric',
        weekday: 'short'
    });
}

export function showGanttTaskDetails(taskId) {
    const task = [...(window.myTasks || []), ...(window.teamTasks || [])].find(t => t.id === taskId);
    if (!task) return;
    
    const assignee = (window.students || []).find(s => s.id === task.assignedStudentId);
    const subject = (window.subjects || []).find(s => s.id === task.subjectId);
    const completed = task.isCompleted || false;
    const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !completed;
    
    const details = document.getElementById('ganttTaskDetails');
    const detailsPanel = document.getElementById('ganttDetails');
    
    if (!details || !detailsPanel) return;
    
    details.innerHTML = `
        <div style="margin-bottom: 1rem;">
            <h4 style="margin: 0 0 0.5rem 0; color: #2c3e50;">${task.title}</h4>
            <p style="color: #666; background: #f8f9fa; padding: 0.75rem; border-radius: 6px;">${task.description || 'Нет описания'}</p>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div>
                <strong>Статус:</strong><br>
                <span class="status ${completed ? 'completed' : isOverdue ? 'overdue' : 'in-progress'}" style="display: inline-block; margin-top: 0.25rem;">
                    ${completed ? 'Выполнено' : isOverdue ? 'Просрочено' : 'В работе'}
                </span>
            </div>
            <div>
                <strong>Дедлайн:</strong><br>
                <span style="color: ${isOverdue ? '#e74c3c' : '#2c3e50'}; font-weight: ${isOverdue ? '600' : 'normal'}">
                    ${formatDate(task.deadline) || 'Не установлен'}
                </span>
            </div>
            <div>
                <strong>Ответственный:</strong><br>
                ${assignee ? assignee.name : 'Не назначен'}
                ${assignee ? `<br><small style="color: #7f8c8d;">${getRoleName(assignee.currentRole)}</small>` : ''}
            </div>
            <div>
                <strong>Предмет:</strong><br>
                ${subject ? subject.name : 'Не указан'}
            </div>
        </div>
        
        <div style="display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap;">
            <button onclick="openEditTask(${task.id}); closeGanttDetails()">Редактировать</button>
            <button onclick="toggleTaskCompletion(${task.id}); closeGanttDetails(); setTimeout(renderGanttChart, 100)" 
                    class="${completed ? 'secondary' : ''}">
                ${completed ? 'Вернуть в работу' : 'Отметить выполненной'}
            </button>
        </div>
    `;
    
    detailsPanel.style.display = 'block';
}

export function closeGanttDetails() {
    const detailsPanel = document.getElementById('ganttDetails');
    if (detailsPanel) detailsPanel.style.display = 'none';
}

export function toggleGanttView() {
    const ganttExpanded = !window.ganttExpanded;
    window.ganttExpanded = ganttExpanded;
    
    const container = document.getElementById('ganttChart');
    const toggleBtn = document.getElementById('ganttViewToggle');
    
    if (container && toggleBtn) {
        if (ganttExpanded) {
            container.style.maxHeight = 'none';
            toggleBtn.textContent = 'Свернуть';
        } else {
            container.style.maxHeight = '300px';
            toggleBtn.textContent = 'Развернуть';
        }
    }
}