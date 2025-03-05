// Render the user's todos in the DOM
window.renderTodos = function(todos) {
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
                    <button class="btn-toggle" data-id="${td.id}">
                        ${td.completed ? 'Undone' : 'Done'}
                    </button>
                </div>
            </div>
        `;
    });
    todoList.innerHTML = html;

    // Attach toggle listeners
    document.querySelectorAll('.btn-toggle').forEach(btn => {
        btn.addEventListener('click', toggleTodo);
    });
};

// Fetch all todos from the server via GET /todos
window.fetchTodos = function() {
    showStatus('Fetching todos...', 'loading');
    logToConsole('Reading smart contract data for Todos...', 'info');

    fetch('/todos')
        .then(res => {
            logToConsole(`Fetch /todos status: ${res.status}`, 'info'); // EXTRA LOG
            return res.json();
        })
        .then(data => {
            if (!data.success) {
                showStatus(`Error: ${data.error}`, 'error');
                logToConsole(`Error fetching todos: ${data.error}`, 'error');
                return scrollToConsole();
            }
            // We have success => log the calls
            if (data.logs && Array.isArray(data.logs)) {
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
            }

            renderTodos(data.todos);
            showStatus('Todos fetched successfully!', 'success');
            scrollToConsole();
        })
        .catch(err => {
            showStatus(`Error fetching todos: ${err.message}`, 'error');
            logToConsole(err.stack, 'error');
            scrollToConsole();
        });
};

// Handle the add-todo form submission
window.handleAddTodo = function(e) {
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
        .then(res => {
            logToConsole(`POST /todo/add status: ${res.status}`, 'info');
            return res.json();
        })
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
                // Add to Transactions (card)
                if (window.addTransactionCard) {
                    window.addTransactionCard(result.transactionId, 'PENDING', 'addTodo');
                }
            }
            e.target.reset();
            scrollToConsole();
        })
        .catch(err => {
            showStatus('Error adding todo.', 'error');
            logToConsole(err.stack, 'error');
            scrollToConsole();
        });
};

// Toggle the completion status of a todo
window.toggleTodo = function(e) {
    const todoId = e.target.dataset.id;
    showStatus(`Preparing Overledger transaction for toggleTodo(${todoId})...`, 'loading');

    fetch(`/todo/toggle/${todoId}`, { method: 'POST' })
        .then(res => {
            logToConsole(`POST /todo/toggle status: ${res.status}`, 'info');
            return res.json();
        })
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
                // Add to Transactions (card)
                if (window.addTransactionCard) {
                    window.addTransactionCard(result.transactionId, 'PENDING', 'toggleTodo');
                }
            }
            scrollToConsole();
        })
        .catch(err => {
            showStatus(`Error toggling todo. ${err.message}`, 'error');
            logToConsole(err.stack, 'error');
            scrollToConsole();
        });
};

// Manually set the to-do list contract address on the server
window.setTodoContractAddress = function() {
    const input = document.getElementById('manualContractAddressInput');
    if (!input) return;
    const address = input.value.trim();
    if (!address) {
        showStatus('Please enter a contract address.', 'error');
        return;
    }
    showStatus('Setting contract address on server...', 'loading');
    fetch('/todo/setContract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractAddress: address })
    })
        .then(res => {
            logToConsole(`POST /todo/setContract status: ${res.status}`, 'info');
            return res.json();
        })
        .then(data => {
            if (!data.success) {
                showStatus(`Error setting contract: ${data.error}`, 'error');
                logToConsole(data.error, 'error');
            } else {
                showStatus(`Contract set to ${data.contractAddress}`, 'success');
                window.updateContractAddressUI(data.contractAddress);

                // Hide the "setContractDiv" and show "todoFeaturesDiv"
                const setDiv = document.getElementById('setContractDiv');
                const featuresDiv = document.getElementById('todoFeaturesDiv');
                if (setDiv && featuresDiv) {
                    setDiv.style.display = 'none';
                    featuresDiv.style.display = '';
                }
            }
            scrollToConsole();
        })
        .catch(err => {
            showStatus(`Error setting contract: ${err.message}`, 'error');
            logToConsole(err.stack, 'error');
            scrollToConsole();
        });
};

// Re-enable the todo UI once we have a known contract address (if we choose to)
window.updateContractAddressUI = function(contractAddress) {
    // Show the contract address in the heading
    const contractAddressSpan = document.getElementById('currentContractAddressSpan');
    if (contractAddressSpan) {
        contractAddressSpan.textContent = contractAddress;
    }
};
