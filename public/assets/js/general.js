// Console logging functionality
function logToConsole(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logLine = document.createElement('div');
    logLine.className = 'consologger-line';
    const timestampSpan = document.createElement('span');
    timestampSpan.className = 'log-timestamp';
    timestampSpan.textContent = `[${timestamp}]`;
    logLine.appendChild(timestampSpan);
    const messageSpan = document.createElement('span');
    messageSpan.className = `log-${type}`;
    // Check if message contains HTML links
    if (message.includes('<a href=')) {
        messageSpan.innerHTML = message; // Use innerHTML to render links
    } else {
        messageSpan.textContent = message; // Use textContent for plain text
    }
    logLine.appendChild(messageSpan);
    consologger.appendChild(logLine);
    consologger.scrollTop = consologger.scrollHeight;
}

// Function to scroll to console and show the latest logs
function scrollToConsole() {
    const consoleSection = document.getElementById('console-section');
    consoleSection.scrollIntoView({ behavior: 'smooth' });
    consologger.scrollTop = consologger.scrollHeight;
}

// Helper function to show status messages
function showStatus(message, type, elementId = 'transaction-status') {
    const statusDiv = document.getElementById(elementId);
    statusDiv.innerHTML = `<p>${message}</p>`;
    statusDiv.className = `status-${type}`;
    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusDiv.innerHTML = '';
        statusDiv.className = '';
    }, 5000);
}

// Function to update button states based on token availability
function updateButtonStates(token) {
    const addTodoBtn = document.getElementById('addTodoBtn');
    const fetchTodosBtn = document.getElementById('fetchTodosBtn');
    const fetchBalanceBtn = document.getElementById('fetchBalanceBtn');
    if (token) {
        logToConsole('Enabling buttons - token available', 'info');
        addTodoBtn.removeAttribute('disabled');
        fetchTodosBtn.removeAttribute('disabled');
        fetchBalanceBtn.removeAttribute('disabled');
        // Add console message to help with debugging
        logToConsole('Contract and transaction details:', 'info');
        const contractAddress = document.getElementById('walletAddress').getAttribute('data-contract-address');
        logToConsole(`Contract Address: ${contractAddress}`, 'info');
        // Fetch balance automatically when token is available
        fetchBalance();
    } else {
        logToConsole('Disabling buttons - no token available', 'warning');
        addTodoBtn.setAttribute('disabled', 'disabled');
        fetchTodosBtn.setAttribute('disabled', 'disabled');
        fetchBalanceBtn.setAttribute('disabled', 'disabled');
    }
}

// Function to get formatted Etherscan link for UI display
function getEtherscanLink(txHash) {
    return `<a href="https://sepolia.etherscan.io/tx/${txHash}" target="_blank">${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 6)}</a>`;
}

// Function to fetch balance
async function fetchBalance() {
    showStatus('Fetching address balance...', 'loading', 'balance-status');
    logToConsole('Fetching address balance...', 'info');
    try {
        const response = await fetch('/balance');
        logToConsole(`Fetch balance response status: ${response.status} ${response.statusText}`, 'info');
        const data = await response.json();
        if (data.success && data.balanceResponse) {
            const balanceData = data.balanceResponse.executionAddressBalanceSearchResponse;
            if (balanceData && balanceData.balances && balanceData.balances.length > 0) {
                const balance = balanceData.balances[0];
                const balanceResultDiv = document.getElementById('balance-result');
                balanceResultDiv.innerHTML = `
                    <div class="balance-display">
                        <p><strong>Balance:</strong> ${balance.amount} ${balance.unit}</p>
                        <p><strong>Address:</strong> ${balanceData.addressId}</p>
                        <p><strong>Timestamp:</strong> ${new Date(parseInt(balanceData.timestamp) * 1000).toLocaleString()}</p>
                    </div>
                `;
                showStatus('Balance fetched successfully!', 'success', 'balance-status');
                logToConsole(`Balance: ${balance.amount} ${balance.unit}`, 'success');
            } else {
                showStatus('Balance data structure unexpected', 'error', 'balance-status');
                logToConsole('Unexpected balance response structure', 'error');
            }
            scrollToConsole();
        } else {
            showStatus(`Error fetching balance: ${data.error || 'Unknown error'}`, 'error', 'balance-status');
            logToConsole(`Error fetching balance: ${data.error || 'Unknown error'}`, 'error');
            scrollToConsole();
        }
    } catch (error) {
        console.error('Error fetching balance:', error);
        showStatus('Error fetching balance. Check console for details.', 'error', 'balance-status');
        logToConsole(`Error fetching balance: ${error.message}`, 'error');
        scrollToConsole();
    }
}

// Render todos dynamically in the todo list
function renderTodos(todos) {
    const todoList = document.getElementById('todoList');
    if (todos.length === 0) {
        todoList.innerHTML = '<p>No todos found on the blockchain.</p>';
        logToConsole('No todos found on the blockchain.', 'info');
        return;
    }
    logToConsole(`Rendering ${todos.length} todos from blockchain.`, 'info');
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
                        ${todo.completed ? 'Mark Active' : 'Mark Complete'}
                    </button>
                </div>
            </div>
        `;
    });
    todoList.innerHTML = html;
    // Add event listeners for toggle buttons
    document.querySelectorAll('.btn-toggle').forEach(button => {
        button.addEventListener('click', toggleTodoStatus);
    });
}

// Toggle todo status function
async function toggleTodoStatus(e) {
    const todoId = e.target.dataset.id;
    const currentBtn = e.target;
    showStatus(`Toggling status of todo #${todoId}...`, 'loading');
    logToConsole(`Submitting toggle request for todo #${todoId}...`, 'info');
    try {
        // Disable the button during the request to prevent double clicks
        currentBtn.disabled = true;
        const response = await fetch(`/todo/toggle/${todoId}`, {
            method: 'POST'
        });
        logToConsole(`Toggle response status: ${response.status} ${response.statusText}`, 'info');
        const result = await response.json();
        if (result.success) {
            // Show the smart contract message if available
            if (result.message) {
                showStatus(result.message, 'success');
                logToConsole(`Smart contract message: ${result.message}`, 'success');
            } else {
                showStatus(`Todo #${todoId} status toggled successfully!`, 'success');
            }
            // Add Etherscan link to console if available
            if (result.transactionId) {
                const etherscanDisplay = getEtherscanLink(result.transactionId);
                logToConsole(`Transaction: ${etherscanDisplay}`, 'info');
            }
            logToConsole(`Successfully sent the toggle transaction for todo #${todoId}`, 'success');
            // Scroll to console logger
            scrollToConsole();
            // Re-enable the button
            currentBtn.disabled = false;
            // Fetch updated todos after successful toggle
            fetchTodos();
        } else {
            showStatus(`Error toggling todo: ${result.error}`, 'error');
            logToConsole(`Error toggling todo #${todoId}: ${result.error}`, 'error');
            currentBtn.disabled = false;
            scrollToConsole();
        }
    } catch (error) {
        console.error('Error toggling todo:', error);
        showStatus('Error toggling todo. Check console for details.', 'error');
        logToConsole(`Error toggling todo #${todoId}: ${error.message}`, 'error');
        currentBtn.disabled = false;
        scrollToConsole();
    }
}

// Fetch Todos function
async function fetchTodos() {
    showStatus('Fetching todos from blockchain...', 'loading');
    logToConsole('Fetching todo list from blockchain...', 'info');
    try {
        const response = await fetch('/todos');
        logToConsole(`Fetch todos response status: ${response.status} ${response.statusText}`, 'info');
        const data = await response.json();
        if (data.success && data.todos) {
            logToConsole(`Retrieved ${data.todos.length} todos from the blockchain.`, 'success');
            renderTodos(data.todos);
            showStatus('Todos fetched successfully!', 'success');
            // Scroll to console
            scrollToConsole();
        } else {
            showStatus(`Error fetching todos: ${data.error || 'Unknown error'}`, 'error');
            logToConsole(`Error fetching todos: ${data.error || 'Unknown error'}`, 'error');
            scrollToConsole();
        }
    } catch (error) {
        console.error('Error fetching todos:', error);
        showStatus('Error fetching todos. Check console for details.', 'error');
        logToConsole(`Error fetching todos: ${error.message}`, 'error');
        scrollToConsole();
    }
}

// Handle Add Todo Form Submission
async function handleAddTodo(e) {
    e.preventDefault();
    const content = e.target.content.value;
    if (!content.trim()) {
        showStatus('Please enter a todo item', 'error');
        logToConsole('Attempted to add empty todo item.', 'warning');
        return;
    }
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    showStatus('Submitting transaction to blockchain...', 'loading');
    logToConsole(`Adding new todo: "${content}"...`, 'info');
    try {
        const response = await fetch('/todo/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        logToConsole(`Add todo response status: ${response.status} ${response.statusText}`, 'info');
        const result = await response.json();
        if (result.success) {
            // Show the smart contract message if available
            if (result.message) {
                showStatus(result.message, 'success');
                logToConsole(`Smart contract message: ${result.message}`, 'success');
            } else {
                showStatus('Todo added successfully!', 'success');
            }
            // Add Etherscan link to console if available
            if (result.transactionId) {
                const etherscanDisplay = getEtherscanLink(result.transactionId);
                logToConsole(`Transaction: ${etherscanDisplay}`, 'info');
            }
            logToConsole(`Successfully sent the add todo transaction`, 'success');
            e.target.reset();
            // Scroll to console
            scrollToConsole();
            // Enable the submit button again
            submitBtn.disabled = false;
            // Fetch updated todos
            fetchTodos();
        } else {
            showStatus(`Error adding todo: ${result.error}`, 'error');
            logToConsole(`Error adding todo: ${result.error}`, 'error');
            submitBtn.disabled = false;
            scrollToConsole();
        }
    } catch (error) {
        console.error('Error adding todo:', error);
        showStatus('Error adding todo. Check console for details.', 'error');
        logToConsole(`Error adding todo: ${error.message}`, 'error');
        submitBtn.disabled = false;
        scrollToConsole();
    }
}

// Get Auth Token function
async function getAuthToken() {
    logToConsole('Requesting authentication token from Overledger...', 'info');
    showStatus('Requesting authentication token...', 'loading', 'auth-status');
    try {
        const response = await fetch('/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        logToConsole(`Response status: ${response.status} ${response.statusText}`, 'info');
        const data = await response.json();
        if (data.success && data.token) {
            // Update token display in the UI
            const tokenDisplay = document.getElementById('auth-token-display');
            tokenDisplay.innerHTML = `
                <div class="token-container">
                    <p>Current token:</p>
                    <textarea rows="3" readonly>${data.token}</textarea>
                </div>
                <button id="getAuthTokenBtn" class="btn btn-primary">Get Auth Token</button>
                <div id="auth-status"></div>
            `;
            // Re-attach event listener to the new button
            document.getElementById('getAuthTokenBtn').addEventListener('click', getAuthToken);
            showStatus('Auth token retrieved successfully!', 'success', 'auth-status');
            logToConsole('Authentication successful.', 'success');
            // Update button states with the new token
            updateButtonStates(data.token);
            scrollToConsole();
        } else {
            showStatus(`Failed to retrieve token: ${data.error || 'Unknown error'}`, 'error', 'auth-status');
            logToConsole(`Authentication failed: ${data.error || 'Unknown error'}`, 'error');
            scrollToConsole();
        }
    } catch (error) {
        console.error('Error fetching auth token:', error);
        showStatus('Error retrieving auth token. Check console for details.', 'error', 'auth-status');
        logToConsole(`Authentication error: ${error.message}`, 'error');
        scrollToConsole();
    }
}

// Initialize app and set up event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Get a reference to the console element
    const consologger = document.getElementById('consologger');

    // Initialize app
    logToConsole('Application initialized successfully.', 'success');

    // Check if we have an initial token from server-side rendering
    const initialToken = document.getElementById('currentToken')?.value;
    if (initialToken) {
        logToConsole('Auth token available. Ready to interact with blockchain.', 'info');
        updateButtonStates(initialToken);
    } else {
        logToConsole('No auth token found. Please get an auth token before using the app.', 'warning');
    }

    // Set up event listeners
    document.getElementById('getAuthTokenBtn')?.addEventListener('click', getAuthToken);
    document.getElementById('fetchBalanceBtn')?.addEventListener('click', fetchBalance);
    document.getElementById('fetchTodosBtn')?.addEventListener('click', fetchTodos);
    document.getElementById('addTodoForm')?.addEventListener('submit', handleAddTodo);
    document.getElementById('clearConsoleBtn')?.addEventListener('click', () => {
        consologger.innerHTML = '';
        logToConsole('Console cleared.', 'info');
    });

    // Add event listeners for any existing toggle buttons
    document.querySelectorAll('.btn-toggle').forEach(button => {
        button.addEventListener('click', toggleTodoStatus);
    });
});