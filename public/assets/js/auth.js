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
    const deployContractBtn = document.getElementById('deployContractBtn');
    const getAuthBtn = document.getElementById('getAuthTokenBtn');

    // If there's no token at all, disable everything that needs auth.
    if (!token) {
        addTodoBtn?.setAttribute('disabled', 'disabled');
        fetchTodosBtn?.setAttribute('disabled', 'disabled');
        fetchBalanceBtn?.setAttribute('disabled', 'disabled');
        copyTokenBtn?.setAttribute('disabled', 'disabled');
        deployContractBtn?.setAttribute('disabled', 'disabled');
        // The "Get Auth Token" button remains enabled so the user can still fetch a new token
        getAuthBtn?.removeAttribute('disabled');

        logToConsole('No auth token. Buttons disabled.', 'warning');
        return;
    }

    // We do have a token => enable these.
    copyTokenBtn?.removeAttribute('disabled');
    fetchBalanceBtn?.removeAttribute('disabled');

    // For adding todos, fetching todos, or deploying a contract, we need both wallet & token.
    if (window.hasLocalWallet) {
        addTodoBtn?.removeAttribute('disabled');
        fetchTodosBtn?.removeAttribute('disabled');
        deployContractBtn?.removeAttribute('disabled');
        logToConsole('Auth token + wallet => addTodo, fetchTodos, deploy enabled.', 'info');
    } else {
        addTodoBtn?.setAttribute('disabled', 'disabled');
        fetchTodosBtn?.setAttribute('disabled', 'disabled');
        deployContractBtn?.setAttribute('disabled', 'disabled');
        logToConsole('No wallet => some actions disabled.', 'warning');
    }
};

window.getAuthToken = function() {
    const getAuthBtn = document.getElementById('getAuthTokenBtn');
    if (getAuthBtn) {
        // Disable and show "Getting..."
        const originalText = getAuthBtn.textContent;
        getAuthBtn.disabled = true;
        getAuthBtn.textContent = 'Getting...';

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
                                <textarea id="currentToken" class="light-textarea-content" rows="3" readonly>${data.token}</textarea>
                            </div>
                            <button id="getAuthTokenBtn" class="btn btn-primary">Get Auth Token</button>
                            <button id="copyAuthTokenBtn" class="btn btn-secondary">Copy Token</button>
                            <div id="auth-status"></div>
                        `;
                    }
                    // Re-attach listeners
                    document.getElementById('getAuthTokenBtn').addEventListener('click', getAuthToken);
                    document.getElementById('copyAuthTokenBtn').addEventListener('click', copyAuthToken);

                    showStatus('Auth token retrieved!', 'success', 'auth-status');
                    logToConsole('New auth token obtained successfully.', 'info');

                    // Update button states with the new token
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
            })
            .finally(() => {
                // Re-enable & revert text
                getAuthBtn.disabled = false;
                getAuthBtn.textContent = originalText;
            });
    }
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
