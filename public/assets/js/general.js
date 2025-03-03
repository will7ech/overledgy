/**
 * Minimal helper to colorize console logs.
 * Displays timestamp and message in the consologger area.
 */
function logToConsole(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logLine = document.createElement('div');
    logLine.className = 'consologger-line';

    const timestampSpan = document.createElement('span');
    timestampSpan.className = 'log-timestamp';
    timestampSpan.textContent = `[${timestamp}]`;
    logLine.appendChild(timestampSpan);

    const messageSpan = document.createElement('span');
    if (type === 'request') {
        messageSpan.className = 'log-request';
    } else if (type === 'response') {
        messageSpan.className = 'log-response';
    } else {
        messageSpan.className = `log-${type}`;
    }

    messageSpan.innerHTML = message.replace(/\n/g, '<br/>');
    logLine.appendChild(messageSpan);

    consologger.appendChild(logLine);
    consologger.scrollTop = consologger.scrollHeight;
}

/**
 * Utility to scroll the console into view.
 */
function scrollToConsole() {
    const consoleSection = document.getElementById('console-section');
    consoleSection.scrollIntoView({ behavior: 'smooth' });
    consologger.scrollTop = consologger.scrollHeight;
}

/**
 * Display a temporary status message (e.g., success/error/loading).
 */
function showStatus(message, type, elementId = 'transaction-status') {
    const statusDiv = document.getElementById(elementId);
    statusDiv.innerHTML = `<p>${message}</p>`;
    statusDiv.className = `status-${type}`;
    setTimeout(() => {
        statusDiv.innerHTML = '';
        statusDiv.className = '';
    }, 5000);
}

/**
 * Enable or disable UI buttons based on availability of auth token.
 */
function updateButtonStates(token) {
    const addTodoBtn = document.getElementById('addTodoBtn');
    const fetchTodosBtn = document.getElementById('fetchTodosBtn');
    const fetchBalanceBtn = document.getElementById('fetchBalanceBtn');
    const copyTokenBtn = document.getElementById('copyAuthTokenBtn');

    if (token) {
        addTodoBtn?.removeAttribute('disabled');
        fetchTodosBtn?.removeAttribute('disabled');
        fetchBalanceBtn?.removeAttribute('disabled');
        copyTokenBtn?.removeAttribute('disabled');
        logToConsole('Auth token available. Buttons enabled.', 'info');
    } else {
        addTodoBtn?.setAttribute('disabled', 'disabled');
        fetchTodosBtn?.setAttribute('disabled', 'disabled');
        fetchBalanceBtn?.setAttribute('disabled', 'disabled');
        copyTokenBtn?.setAttribute('disabled', 'disabled');
        logToConsole('No auth token. Buttons disabled.', 'warning');
    }
}

/**
 * Generate an Etherscan link for a given transaction hash.
 */
function getEtherscanLink(txHash) {
    return `<a href="https://sepolia.etherscan.io/tx/${txHash}" target="_blank">${txHash}</a>`;
}

/**
 * Trim the central portion of the Bearer token for cleaner console logs.
 */
function trimBearer(token) {
    if (!token || !token.startsWith('Bearer ')) return token;
    const raw = token.slice(7);
    if (raw.length <= 14) return token;
    return `Bearer ${raw.slice(0, 5)}... ...${raw.slice(-5)}`;
}

/**
 * Copy the current auth token to clipboard.
 */
function copyAuthToken() {
    const tokenTextarea = document.getElementById('currentToken');
    if (tokenTextarea && tokenTextarea.value.trim() !== '') {
        navigator.clipboard
            .writeText(tokenTextarea.value)
            .then(() => {
                showStatus('Token copied to clipboard!', 'success', 'auth-status');
                logToConsole('Token copied to clipboard.', 'info');
            })
            .catch(() => {
                showStatus('Failed to copy token.', 'error', 'auth-status');
                logToConsole('Failed to copy token.', 'error');
            });
    }
}

/**
 * Handle fetching balance for a user-provided address.
 */
async function handleFetchBalance(e) {
    e.preventDefault();
    const addressInput = document.getElementById('balanceAddressInput');
    if (!addressInput) return;
    const address = addressInput.value.trim();
    if (!address) {
        showStatus('Please enter an address.', 'error', 'balance-status');
        return;
    }

    showStatus('Fetching address balance...', 'loading', 'balance-status');
    try {
        const response = await fetch(`/balance/${address}`);
        const data = await response.json();

        if (data.success && data.overledgerReq && data.overledgerRes) {
            if (data.overledgerReq.headers && data.overledgerReq.headers.authorization) {
                data.overledgerReq.headers.authorization = trimBearer(data.overledgerReq.headers.authorization);
            }
            logToConsole(`Overledger Request:\n${JSON.stringify(data.overledgerReq, null, 2)}`, 'request');
            logToConsole(`Overledger Response:\n${JSON.stringify(data.overledgerRes, null, 2)}`, 'response');

            const balanceData = data.overledgerRes.executionAddressBalanceSearchResponse;
            if (balanceData && balanceData.balances && balanceData.balances.length > 0) {
                const balance = balanceData.balances[0];
                document.getElementById('balance-result').innerHTML = `
          <div class="balance-display">
            <p><strong>Balance:</strong> ${balance.amount} ${balance.unit}</p>
            <p><strong>Address:</strong> ${balanceData.addressId}</p>
            <p><strong>Timestamp:</strong> ${new Date(parseInt(balanceData.timestamp) * 1000).toLocaleString()}</p>
          </div>
        `;
                showStatus('Balance fetched successfully!', 'success', 'balance-status');
            } else {
                showStatus('Unexpected balance data structure.', 'error', 'balance-status');
            }
        } else {
            showStatus(`Error fetching balance: ${data.error || 'Unknown error'}`, 'error', 'balance-status');
            logToConsole(`Error fetching balance: ${data.error}`, 'error');
        }
        scrollToConsole();
    } catch (error) {
        showStatus('Error fetching balance. Check console for details.', 'error', 'balance-status');
        logToConsole(`Error fetching balance: ${error.message}`, 'error');
        scrollToConsole();
    }
}

/**
 * Render a list of todo items in the DOM.
 */
function renderTodos(todos) {
    const todoList = document.getElementById('todoList');
    if (todos.length === 0) {
        todoList.innerHTML = '<p>No todos found.</p>';
        return;
    }
    let html = '<h3>Your Todos</h3>';
    todos.forEach(todo => {
        html += `
      <div class="todo-item ${todo.completed ? 'completed' : ''}">
        <div class="todo-content">
          <span class="todo-text">${todo.content}</span>
          <span class="todo-id">ID: ${todo.id}</span>
        </div>
        <div class="todo-actions">
          <button class="btn-toggle" data-id="${todo.id}">
            ${todo.completed ? 'Undone' : 'Done'}
          </button>
        </div>
      </div>
    `;
    });
    todoList.innerHTML = html;
    document.querySelectorAll('.btn-toggle').forEach(button => {
        button.addEventListener('click', toggleTodoStatus);
    });
}

/**
 * Toggle the completion status of a todo item.
 */
async function toggleTodoStatus(e) {
    const todoId = e.target.dataset.id;
    const currentBtn = e.target;
    showStatus(`Toggling status of todo #${todoId}...`, 'loading');
    currentBtn.disabled = true;

    try {
        const response = await fetch(`/todo/toggle/${todoId}`, { method: 'POST' });
        const result = await response.json();

        if (result.success && result.calls) {
            result.calls.forEach(call => {
                if (call.request.headers && call.request.headers.Authorization) {
                    call.request.headers.Authorization = trimBearer(call.request.headers.Authorization);
                }
                // Additional info logs about Overledger process
                if (call.request.url.includes('smart-contracts/read')) {
                    logToConsole('Reading data from Overledger smart contract...', 'info');
                } else if (call.request.url.includes('preparations/transactions/smart-contracts/write')) {
                    logToConsole('Preparing transaction to write to smart contract...', 'info');
                } else if (call.request.url.includes('executions/transactions')) {
                    logToConsole('Submitting signed transaction to Overledger...', 'info');
                }

                logToConsole(`Overledger Request:\n${JSON.stringify(call.request, null, 2)}`, 'request');
                logToConsole(`Overledger Response:\n${JSON.stringify(call.response, null, 2)}`, 'response');
            });
            if (result.message) {
                showStatus(result.message, 'success');
                logToConsole(`Smart contract message: ${result.message}`, 'info');
            } else {
                showStatus(`Todo #${todoId} toggled successfully!`, 'success');
            }
            if (result.transactionId) {
                logToConsole(`Transaction: ${getEtherscanLink(result.transactionId)}`, 'info');
            }
        } else {
            showStatus(`Error toggling todo: ${result.error}`, 'error');
            logToConsole(`Error toggling todo: ${result.error}`, 'error');
        }
        currentBtn.disabled = false;
        scrollToConsole();
    } catch (error) {
        showStatus('Error toggling todo. Check console for details.', 'error');
        logToConsole(`Error toggling todo #${todoId}: ${error.message}`, 'error');
        currentBtn.disabled = false;
        scrollToConsole();
    }
}

/**
 * Fetch all todos from the blockchain via Overledger.
 */
async function fetchTodos() {
    showStatus('Fetching todos...', 'loading');
    try {
        const response = await fetch('/todos');
        const data = await response.json();

        if (data.success && data.logs && data.todos) {
            data.logs.forEach(logItem => {
                if (logItem.request.headers && logItem.request.headers.Authorization) {
                    logItem.request.headers.Authorization = trimBearer(logItem.request.headers.Authorization);
                }
                if (logItem.request.url.includes('smart-contracts/read')) {
                    logToConsole('Reading data from Overledger smart contract...', 'info');
                }
                logToConsole(`Overledger Request:\n${JSON.stringify(logItem.request, null, 2)}`, 'request');
                logToConsole(`Overledger Response:\n${JSON.stringify(logItem.response, null, 2)}`, 'response');
            });
            renderTodos(data.todos);
            showStatus('Todos fetched successfully!', 'success');
        } else {
            showStatus(`Error fetching todos: ${data.error || 'Unknown error'}`, 'error');
            logToConsole(`Error fetching todos: ${data.error}`, 'error');
        }
        scrollToConsole();
    } catch (error) {
        showStatus('Error fetching todos. Check console for details.', 'error');
        logToConsole(`Error fetching todos: ${error.message}`, 'error');
        scrollToConsole();
    }
}

/**
 * Handle adding a new todo item.
 */
async function handleAddTodo(e) {
    e.preventDefault();
    const content = e.target.content.value;
    if (!content.trim()) {
        showStatus('Please enter a todo item', 'error');
        logToConsole('Attempted to add an empty todo.', 'warning');
        return;
    }
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    showStatus('Submitting new todo...', 'loading');

    try {
        const response = await fetch('/todo/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        const result = await response.json();

        if (result.success && result.calls) {
            result.calls.forEach(call => {
                if (call.request.headers && call.request.headers.Authorization) {
                    call.request.headers.Authorization = trimBearer(call.request.headers.Authorization);
                }
                if (call.request.url.includes('smart-contracts/read')) {
                    logToConsole('Reading data from Overledger smart contract...', 'info');
                } else if (call.request.url.includes('preparations/transactions/smart-contracts/write')) {
                    logToConsole('Preparing transaction to write to smart contract...', 'info');
                } else if (call.request.url.includes('executions/transactions')) {
                    logToConsole('Submitting signed transaction to Overledger...', 'info');
                }
                logToConsole(`Overledger Request:\n${JSON.stringify(call.request, null, 2)}`, 'request');
                logToConsole(`Overledger Response:\n${JSON.stringify(call.response, null, 2)}`, 'response');
            });
            if (result.message) {
                showStatus(result.message, 'success');
            } else {
                showStatus('Todo added successfully!', 'success');
            }
            if (result.transactionId) {
                logToConsole(`Transaction: ${getEtherscanLink(result.transactionId)}`, 'info');
            }
        } else {
            showStatus(`Error adding todo: ${result.error}`, 'error');
            logToConsole(`Error adding todo: ${result.error}`, 'error');
        }
        submitBtn.disabled = false;
        scrollToConsole();
    } catch (error) {
        showStatus('Error adding todo. Check console for details.', 'error');
        logToConsole(`Error adding todo: ${error.message}`, 'error');
        submitBtn.disabled = false;
        scrollToConsole();
    }
}

/**
 * Retrieve the Overledger auth token.
 */
async function getAuthToken() {
    showStatus('Requesting authentication token...', 'loading', 'auth-status');
    try {
        const response = await fetch('/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        if (data.success && data.token) {
            const tokenDisplay = document.getElementById('auth-token-display');
            tokenDisplay.innerHTML = `
        <div class="token-container">
          <label>Current token:</label>
          <textarea id="currentToken" rows="3" readonly>${data.token}</textarea>
        </div>
        <button id="getAuthTokenBtn" class="btn btn-primary">Get Auth Token</button>
        <button id="copyAuthTokenBtn" class="btn btn-secondary">Copy Token</button>
        <div id="auth-status"></div>
      `;
            document.getElementById('getAuthTokenBtn').addEventListener('click', getAuthToken);
            document.getElementById('copyAuthTokenBtn').addEventListener('click', copyAuthToken);

            showStatus('Auth token retrieved!', 'success', 'auth-status');
            logToConsole('New auth token obtained successfully.', 'info');
            updateButtonStates(data.token);
        } else {
            showStatus(`Failed to retrieve token: ${data.error || 'Unknown error'}`, 'error', 'auth-status');
            logToConsole(`Authentication failed: ${data.error}`, 'error');
        }
        scrollToConsole();
    } catch (error) {
        showStatus('Error retrieving auth token. Check console for details.', 'error', 'auth-status');
        logToConsole(`Auth error: ${error.message}`, 'error');
        scrollToConsole();
    }
}

/**
 * Toggle between 'play' and 'info' modes in each section.
 */
function toggleSectionMode(icon) {
    const section = icon.closest('.card');
    if (!section) return;

    const playMode = section.querySelector('.play-mode');
    const infoMode = section.querySelector('.info-mode');
    const playTitle = section.querySelector('.play-mode-title');
    const infoTitle = section.querySelector('.info-mode-title');

    if (!playMode || !infoMode || !playTitle || !infoTitle) return;

    if (playMode.classList.contains('open')) {
        playMode.classList.remove('open');
        infoMode.classList.add('open');
        playTitle.style.display = 'none';
        infoTitle.style.display = 'block';
        icon.src = '/assets/images/icon-pizza.png';
    } else {
        playMode.classList.add('open');
        infoMode.classList.remove('open');
        playTitle.style.display = 'block';
        infoTitle.style.display = 'none';
        icon.src = '/assets/images/icon-question.png';
    }
}

/**
 * Initialize the application and set up event listeners.
 */
document.addEventListener('DOMContentLoaded', function() {
    const consologgerElement = document.getElementById('consologger');
    document.getElementById('getAuthTokenBtn')?.addEventListener('click', getAuthToken);
    document.getElementById('addTodoForm')?.addEventListener('submit', handleAddTodo);
    document.getElementById('clearConsoleBtn')?.addEventListener('click', () => {
        consologgerElement.innerHTML = '';
        logToConsole('Console cleared.', 'info');
    });
    document.getElementById('balanceForm')?.addEventListener('submit', handleFetchBalance);
    document.getElementById('fetchTodosBtn')?.addEventListener('click', fetchTodos);
    document.getElementById('copyAuthTokenBtn')?.addEventListener('click', copyAuthToken);

    document.querySelectorAll('.btn-toggle').forEach(button => {
        button.addEventListener('click', toggleTodoStatus);
    });

    const switchIcons = document.querySelectorAll('.mode-switch-icon');
    switchIcons.forEach(icon => {
        icon.addEventListener('click', () => toggleSectionMode(icon));
    });

    logToConsole('Application initialized. Ready to rumble!', 'info');
});
