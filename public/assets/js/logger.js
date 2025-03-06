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
    if (type === 'request') {
        msgSpan.className = 'log-request';
    } else if (type === 'response') {
        msgSpan.className = 'log-response';
    } else {
        msgSpan.className = `log-${type}`;
    }

    // Replace newlines with <br/> for display
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
