window.logToConsole = function(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const loggerEl = document.getElementById('consologger');
    if (!loggerEl) return;

    const line = document.createElement('div');
    line.className = 'consologger-line';

    const tsSpan = document.createElement('span');
    tsSpan.className = 'log-timestamp';
    tsSpan.textContent = `[${timestamp}]`;
    line.appendChild(tsSpan);

    const msgSpan = document.createElement('span');
    msgSpan.className = `log-${type}`;
    if (type === 'request') msgSpan.className = 'log-request';
    if (type === 'response') msgSpan.className = 'log-response';
    msgSpan.innerHTML = (message || '').replace(/\n/g, '<br/>');

    line.appendChild(msgSpan);
    loggerEl.appendChild(line);
    loggerEl.scrollTop = loggerEl.scrollHeight;
};

window.scrollToConsole = function() {
    const consoleSection = document.getElementById('console-section');
    if (consoleSection) {
        consoleSection.scrollIntoView({ behavior: 'smooth' });
    }
    const loggerEl = document.getElementById('consologger');
    if (loggerEl) loggerEl.scrollTop = loggerEl.scrollHeight;
};

// Ensure the Clear button remains in the DOM
document.addEventListener('DOMContentLoaded', () => {
    const clearConsoleBtn = document.getElementById('clearConsoleBtn');
    if (clearConsoleBtn) {
        clearConsoleBtn.addEventListener('click', () => {
            const loggerEl = document.getElementById('consologger');
            if (loggerEl) {
                // Remove only the .consologger-line items
                const lines = loggerEl.querySelectorAll('.consologger-line');
                lines.forEach(line => line.remove());
            }
            logToConsole('Console cleared.', 'info');
            scrollToConsole();
        });
    }
});
