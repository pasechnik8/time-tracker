export function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.style.display = 'block';
}

export function closeModal(id) {
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