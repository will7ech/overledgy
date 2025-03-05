window.getCurrentAuthToken = function() {
    const tokenTextarea = document.getElementById('currentToken');
    if (!tokenTextarea) return null;
    return tokenTextarea.value.trim() || null;
};

window.updateButtonStates = function(token) {
    const addTodoBtn = document.getElementById('addTodoBtn');
    const fetchTodosBtn = document.getElementById('fetchTodosBtn');
    const fetchBalanceBtn = document.getElementById('fetchBalanceBtn');
    const copyTokenBtn = document.getElementById('copyAuthTokenBtn');

    if (!token) {
        // No token => disable all
        addTodoBtn?.setAttribute('disabled', 'disabled');
        fetchTodosBtn?.setAttribute('disabled', 'disabled');
        fetchBalanceBtn?.setAttribute('disabled', 'disabled');
        copyTokenBtn?.setAttribute('disabled', 'disabled');
        logToConsole('No auth token. Buttons disabled.', 'warning');
        return;
    }

    // We do have a token => fetch actions are enabled
    fetchTodosBtn?.removeAttribute('disabled');
    fetchBalanceBtn?.removeAttribute('disabled');
    copyTokenBtn?.removeAttribute('disabled');

    // But addTodo or toggles need a wallet
    if (window.hasLocalWallet) {
        addTodoBtn?.removeAttribute('disabled');
        logToConsole('Auth token + wallet => addTodo enabled.', 'info');
    } else {
        addTodoBtn?.setAttribute('disabled', 'disabled');
        logToConsole('No wallet => addTodo disabled.', 'warning');
    }
};

window.getAuthToken = function() {
    showStatus('Requesting authentication token...', 'loading', 'auth-status');
    fetch('/auth', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.token) {
                const authDisplay = document.getElementById('auth-token-display');
                if (authDisplay) {
                    authDisplay.innerHTML = `
                        <div class="token-container">
                          <label>Current token:</label>
                          <textarea id="currentToken" rows="3" readonly>${data.token}</textarea>
                        </div>
                        <button id="getAuthTokenBtn" class="btn btn-primary">Get Auth Token</button>
                        <button id="copyAuthTokenBtn" class="btn btn-secondary">Copy Token</button>
                        <div id="auth-status"></div>
                    `;
                }
                document.getElementById('getAuthTokenBtn').addEventListener('click', getAuthToken);
                document.getElementById('copyAuthTokenBtn').addEventListener('click', copyAuthToken);

                showStatus('Auth token retrieved!', 'success', 'auth-status');
                logToConsole('New auth token obtained successfully.', 'info');
                updateButtonStates(data.token);
            } else {
                showStatus(`Failed to retrieve token: ${data.error}`, 'error', 'auth-status');
                logToConsole(`Authentication failed: ${data.error}`, 'error');
            }
            scrollToConsole();
        })
        .catch(err => {
            showStatus('Error retrieving auth token.', 'error', 'auth-status');
            logToConsole(`Auth error: ${err.message}`, 'error');
            scrollToConsole();
        });
};

window.copyAuthToken = function() {
    const ta = document.getElementById('currentToken');
    if (!ta || !ta.value) return;
    navigator.clipboard
        .writeText(ta.value)
        .then(() => {
            showStatus('Token copied to clipboard!', 'success', 'auth-status');
            logToConsole('Token copied to clipboard.', 'info');
        })
        .catch(() => {
            showStatus('Failed to copy token.', 'error', 'auth-status');
            logToConsole('Failed to copy token.', 'error');
        });
};
