/**
 * public/assets/js/general.js
 */

// Global states to track if we have a wallet loaded
// We'll update these after .env is detected or user imports a phrase
let hasLocalWallet = false;
let currentWalletAddress = '';

function logToConsole(message, type = 'info') {
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
}

function getCurrentAuthToken() {
    const tokenTextarea = document.getElementById('currentToken');
    if (!tokenTextarea) return null;
    return tokenTextarea.value.trim() || null;
}

function scrollToConsole() {
    const consoleSection = document.getElementById('console-section');
    if (consoleSection) {
        consoleSection.scrollIntoView({ behavior: 'smooth' });
    }
    const loggerEl = document.getElementById('consologger');
    if (loggerEl) loggerEl.scrollTop = loggerEl.scrollHeight;
}

function showStatus(message, type, elementId = 'transaction-status') {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerHTML = `<p>${message}</p>`;
    el.className = `status-${type}`;
    setTimeout(() => {
        el.innerHTML = '';
        el.className = '';
    }, 5000);
}

function trimBearer(token) {
    if (!token || !token.startsWith('Bearer ')) return token;
    const raw = token.slice(7);
    if (raw.length <= 14) return token;
    return `Bearer ${raw.slice(0, 5)}... ...${raw.slice(-5)}`;
}

function getEtherscanLink(txHash) {
    return `<a href="https://sepolia.etherscan.io/tx/${txHash}" target="_blank">${txHash}</a>`;
}

/**
 * If no token => everything is disabled
 * If token => fetch is enabled
 * If token + wallet => addTodo & toggles are enabled
 */
function updateButtonStates(token) {
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
    if (hasLocalWallet) {
        addTodoBtn?.removeAttribute('disabled');
        logToConsole('Auth token + wallet => addTodo enabled.', 'info');
        // The toggle buttons are dynamic; we'll check them at render time too
    } else {
        addTodoBtn?.setAttribute('disabled', 'disabled');
        logToConsole('No wallet => addTodo disabled.', 'warning');
    }
}

/**
 * Fetch Overledger auth token
 */
function getAuthToken() {
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
}

function copyAuthToken() {
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
}

/**
 * Fetch address balance
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
        const res = await fetch(`/balance/${address}`);
        const data = await res.json();
        if (data.success) {
            if (data.overledgerReq?.headers?.authorization) {
                data.overledgerReq.headers.authorization = trimBearer(
                    data.overledgerReq.headers.authorization
                );
            }
            logToConsole('Reading address balance from Overledger...', 'info');
            logToConsole(
                `Overledger Request:\n${JSON.stringify(data.overledgerReq, null, 2)}`,
                'request'
            );
            logToConsole(
                `Overledger Response:\n${JSON.stringify(data.overledgerRes, null, 2)}`,
                'response'
            );

            const balData = data.overledgerRes.executionAddressBalanceSearchResponse;
            if (balData?.balances?.length) {
                const b = balData.balances[0];
                document.getElementById('balance-result').innerHTML = `
          <div class="balance-display">
            <p><strong>Balance:</strong> ${b.amount} ${b.unit}</p>
            <p><strong>Address:</strong> ${balData.addressId}</p>
            <p><strong>Timestamp:</strong> ${new Date(parseInt(balData.timestamp) * 1000).toLocaleString()}</p>
          </div>
        `;
                showStatus('Balance fetched successfully!', 'success', 'balance-status');
            } else {
                showStatus('Unexpected balance data.', 'error', 'balance-status');
            }
        } else {
            showStatus(`Error: ${data.error}`, 'error', 'balance-status');
            logToConsole(`Error fetching balance: ${data.error}`, 'error');
        }
    } catch (err) {
        showStatus('Error fetching balance.', 'error', 'balance-status');
        logToConsole(err.message, 'error');
    }
    scrollToConsole();
}

/**
 * Fetch all todos
 */
function fetchTodos() {
    showStatus('Fetching todos...', 'loading');
    logToConsole('Reading smart contract data for Todos...', 'info');

    fetch('/todos')
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                showStatus(`Error: ${data.error}`, 'error');
                logToConsole(`Error fetching todos: ${data.error}`, 'error');
                return scrollToConsole();
            }
            data.logs.forEach(logItem => {
                if (logItem.request.headers?.Authorization) {
                    logItem.request.headers.Authorization = trimBearer(
                        logItem.request.headers.Authorization
                    );
                }
                // Additional info logs about Overledger process
                if (logItem.request.url.includes('smart-contracts/read')) {
                    logToConsole('Reading contract data via Overledger...', 'info');
                }
                logToConsole(
                    `Overledger Request:\n${JSON.stringify(logItem.request, null, 2)}`,
                    'request'
                );
                logToConsole(
                    `Overledger Response:\n${JSON.stringify(logItem.response, null, 2)}`,
                    'response'
                );
            });

            renderTodos(data.todos);
            showStatus('Todos fetched successfully!', 'success');
            scrollToConsole();
        })
        .catch(err => {
            showStatus(`Error fetching todos: ${err.message}`, 'error');
            logToConsole(err.stack, 'error');
            scrollToConsole();
        });
}

/**
 * Render the user's todos and enable toggling if we have a wallet
 */
function renderTodos(todos) {
    const todoList = document.getElementById('todoList');
    if (!todoList) return;
    if (!todos || todos.length === 0) {
        todoList.innerHTML = '<p>No todos found.</p>';
        return;
    }
    let html = '<h3>Your Todos</h3>';
    todos.forEach(td => {
        html += `
      <div class="todo-item ${td.completed ? 'completed' : ''}">
        <div class="todo-content">
          <span class="todo-text">${td.content}</span>
          <span class="todo-id">ID: ${td.id}</span>
        </div>
        <div class="todo-actions">
          <button class="btn-toggle" data-id="${td.id}" 
            ${(!hasLocalWallet) ? 'disabled' : ''}>
            ${td.completed ? 'Undone' : 'Done'}
          </button>
        </div>
      </div>
    `;
    });
    todoList.innerHTML = html;

    // If we do have a wallet, attach toggle listeners
    if (hasLocalWallet) {
        document.querySelectorAll('.btn-toggle').forEach(btn => {
            btn.addEventListener('click', toggleTodo);
        });
    }
}

/**
 * Add a new todo
 */
function handleAddTodo(e) {
    e.preventDefault();
    const content = e.target.content.value.trim();
    if (!content) {
        showStatus('Please enter a todo item.', 'error');
        return;
    }
    showStatus('Preparing Overledger transaction for addTodo...', 'loading');

    fetch('/todo/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    })
        .then(res => res.json())
        .then(result => {
            if (!result.success) {
                showStatus(`Error adding todo: ${result.error}`, 'error');
                logToConsole(result.error, 'error');
                return scrollToConsole();
            }
            result.calls.forEach(call => {
                if (call.request.headers?.Authorization) {
                    call.request.headers.Authorization = trimBearer(call.request.headers.Authorization);
                }
                if (call.request.url.includes('smart-contracts/write')) {
                    logToConsole('Preparing & writing to smart contract via Overledger...', 'info');
                } else if (call.request.url.includes('executions/transactions')) {
                    logToConsole('Executing signed transaction on Overledger...', 'info');
                }
                logToConsole(
                    `Overledger Request:\n${JSON.stringify(call.request, null, 2)}`,
                    'request'
                );
                logToConsole(
                    `Overledger Response:\n${JSON.stringify(call.response, null, 2)}`,
                    'response'
                );
            });
            showStatus(result.message || 'Todo added successfully!', 'success');
            if (result.transactionId) {
                logToConsole(`Transaction: ${getEtherscanLink(result.transactionId)}`, 'info');
            }
            e.target.reset();
            scrollToConsole();
        })
        .catch(err => {
            showStatus('Error adding todo.', 'error');
            logToConsole(err.stack, 'error');
            scrollToConsole();
        });
}

/**
 * Toggle the completion status of a todo
 */
function toggleTodo(e) {
    const todoId = e.target.dataset.id;
    showStatus(`Preparing Overledger transaction for toggleTodo(${todoId})...`, 'loading');

    fetch(`/todo/toggle/${todoId}`, { method: 'POST' })
        .then(res => res.json())
        .then(result => {
            if (!result.success) {
                showStatus(`Error toggling todo: ${result.error}`, 'error');
                logToConsole(result.error, 'error');
                return scrollToConsole();
            }
            result.calls.forEach(call => {
                if (call.request.headers?.Authorization) {
                    call.request.headers.Authorization = trimBearer(call.request.headers.Authorization);
                }
                if (call.request.url.includes('smart-contracts/write')) {
                    logToConsole('Preparing & writing to smart contract via Overledger...', 'info');
                } else if (call.request.url.includes('executions/transactions')) {
                    logToConsole('Executing signed transaction on Overledger...', 'info');
                }
                logToConsole(
                    `Overledger Request:\n${JSON.stringify(call.request, null, 2)}`,
                    'request'
                );
                logToConsole(
                    `Overledger Response:\n${JSON.stringify(call.response, null, 2)}`,
                    'response'
                );
            });
            showStatus(result.message || `Todo #${todoId} toggled!`, 'success');
            if (result.transactionId) {
                logToConsole(`Transaction: ${getEtherscanLink(result.transactionId)}`, 'info');
            }
            scrollToConsole();
        })
        .catch(err => {
            showStatus(`Error toggling todo. ${err.message}`, 'error');
            logToConsole(err.stack, 'error');
            scrollToConsole();
        });
}

/**
 * Handle toggling the “info” mode in each card
 */
function toggleSectionMode(icon) {
    const card = icon.closest('.card');
    if (!card) return;
    const playMode = card.querySelector('.play-mode');
    const infoMode = card.querySelector('.info-mode');
    const playTitle = card.querySelector('.play-mode-title');
    const infoTitle = card.querySelector('.info-mode-title');

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
 * On DOM load, set up event listeners.
 */
document.addEventListener('DOMContentLoaded', () => {
    logToConsole('Application initialized. Ready to rumble!', 'info');

    // Initially detect if we have .env wallet from server
    // (We pass these from EJS if you like, or do a GET /wallet/status
    // For simplicity, let's do a quick check with partial data:
    // We'll see if the server said "walletDetected" in the body data attribute
    // or we can do a small fetch. We'll do the simpler approach:
    // (If you prefer a fetch, replace it.)
    const loadedSection = document.getElementById('walletLoadedSection');
    const loadedSectionStyle = window.getComputedStyle(loadedSection);
    hasLocalWallet = (loadedSectionStyle.display !== 'none');
    if (hasLocalWallet) {
        const addrSpan = document.getElementById('currentWalletAddress');
        if (addrSpan) {
            currentWalletAddress = addrSpan.textContent.trim();
        }
    }

    // Pre-populate the fetchBalance field with the known wallet address
    if (currentWalletAddress) {
        const balInput = document.getElementById('balanceAddressInput');
        if (balInput && !balInput.value) {
            balInput.value = currentWalletAddress;
        }
    }

    // Auth
    document.getElementById('getAuthTokenBtn')?.addEventListener('click', getAuthToken);
    document.getElementById('copyAuthTokenBtn')?.addEventListener('click', copyAuthToken);

    // Balance
    document.getElementById('balanceForm')?.addEventListener('submit', handleFetchBalance);

    // Todo
    document.getElementById('addTodoForm')?.addEventListener('submit', handleAddTodo);
    document.getElementById('fetchTodosBtn')?.addEventListener('click', fetchTodos);

    // Console
    document.getElementById('clearConsoleBtn')?.addEventListener('click', () => {
        const loggerEl = document.getElementById('consologger');
        if (loggerEl) {
            loggerEl.innerHTML = '';
        }
        logToConsole('Console cleared.', 'info');
    });

    // Wallet import
    const importWalletBtn = document.getElementById('importWalletBtn');
    if (importWalletBtn) {
        importWalletBtn.addEventListener('click', async () => {
            const phraseInput = document.getElementById('recoveryPhraseInput');
            if (!phraseInput) return;
            const phrase = phraseInput.value.trim();
            if (!phrase) {
                showStatus('Please enter a recovery phrase.', 'error', 'wallet-status');
                return;
            }
            showStatus('Importing wallet...', 'loading', 'wallet-status');
            try {
                const res = await fetch('/wallet/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ recoveryPhrase: phrase })
                });
                const data = await res.json();
                if (data.success) {
                    hasLocalWallet = true;
                    currentWalletAddress = data.address;

                    showStatus(`Wallet loaded on server: ${data.address}`, 'success', 'wallet-status');
                    logToConsole(`Wallet loaded. Address: ${data.address}`, 'info');

                    // Hide the import form
                    const noWalletSec = document.getElementById('noWalletSection');
                    if (noWalletSec) noWalletSec.style.display = 'none';

                    // Show the walletLoadedSection
                    const wls = document.getElementById('walletLoadedSection');
                    if (wls) wls.style.display = '';
                    const currAddr = document.getElementById('currentWalletAddress');
                    if (currAddr) {
                        currAddr.textContent = data.address;
                    }

                    // Prepopulate the fetch balance input
                    const balInput = document.getElementById('balanceAddressInput');
                    if (balInput) {
                        balInput.value = data.address;
                    }

                    // Re-check buttons
                    updateButtonStates(getCurrentAuthToken());
                } else {
                    showStatus(`Error: ${data.error}`, 'error', 'wallet-status');
                    logToConsole(data.error, 'error');
                }
            } catch (err) {
                showStatus(`Wallet import failed: ${err.message}`, 'error', 'wallet-status');
                logToConsole(err.stack, 'error');
            }
            scrollToConsole();
        });
    }

    // Mode switch icons
    document.querySelectorAll('.mode-switch-icon').forEach(icon => {
        icon.addEventListener('click', () => toggleSectionMode(icon));
    });

    // If there's already a token on the page
    const existingToken = (document.getElementById('currentToken')?.value || '').trim();
    updateButtonStates(existingToken);
});
