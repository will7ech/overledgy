/**
 * routes/todo.js
 */
const express = require('express');
const router = express.Router();
const { readSmartContract } = require('../helpers/readSmartContract');
const { writeSmartContract } = require('../helpers/writeSmartContract');
const { isWalletLoaded, getWalletAddress } = require('../services/walletService');

/**
 * Recursively read all the user's todos from Overledger.
 */
async function fetchTodos() {
    // Must have an address
    if (!isWalletLoaded()) {
        // If no wallet is loaded, returns empty
        return { logs: [], todos: [] };
    }
    const address = getWalletAddress().toLowerCase();
    const logs = [];
    const todos = [];

    // 1) getTodoCount(address)
    const countResp = await readSmartContract(
        'getTodoCount',
        [{ type: 'address', value: address }],
        [{ type: 'uint256' }]
    );
    logs.push(countResp);
    const userCount = parseInt(countResp.response.outputParameters?.[0]?.value || '0');

    // 2) For each index => getTodoId => then read the todo struct
    for (let i = 0; i < userCount; i++) {
        const todoIdCall = await readSmartContract(
            'getTodoId',
            [
                { type: 'address', value: address },
                { type: 'uint256', value: i.toString() }
            ],
            [{ type: 'uint256' }]
        );
        logs.push(todoIdCall);

        const todoId = parseInt(todoIdCall.response.outputParameters?.[0]?.value || '0');
        if (todoId > 0) {
            const todoCall = await readSmartContract(
                'todos',
                [{ type: 'uint256', value: todoId.toString() }],
                [
                    { type: 'uint256' },
                    { type: 'string' },
                    { type: 'bool' },
                    { type: 'address' }
                ]
            );
            logs.push(todoCall);

            if (todoCall.response.outputParameters && todoCall.response.outputParameters.length >= 4) {
                const idVal = parseInt(todoCall.response.outputParameters[0].value);
                const contentVal = todoCall.response.outputParameters[1].value;
                const completedVal = todoCall.response.outputParameters[2].value;
                const completed = typeof completedVal === 'boolean'
                    ? completedVal
                    : completedVal === 'true' || completedVal === true;

                todos.push({
                    id: idVal,
                    content: contentVal,
                    completed
                });
            }
        }
    }
    return { logs, todos };
}

/**
 * GET /todos => fetch from chain
 */
router.get('/todos', async (req, res) => {
    try {
        const { logs, todos } = await fetchTodos();
        res.json({ success: true, logs, todos });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /todo/add => call addTodo(string)
 */
router.post('/todo/add', async (req, res) => {
    const { content } = req.body;
    if (!content || !isWalletLoaded()) {
        return res.status(400).json({ error: 'Missing todo content or no wallet loaded.' });
    }
    try {
        const result = await writeSmartContract('addTodo', [
            { type: 'string', value: content }
        ]);
        res.json({
            success: true,
            calls: result.calls,
            transactionId: result.transactionId,
            message: result.eventMessage || 'Todo added successfully!'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /todo/toggle/:id => call toggleTodo(uint256)
 */
router.post('/todo/toggle/:id', async (req, res) => {
    if (!isWalletLoaded()) {
        return res.status(400).json({ error: 'No wallet loaded on server.' });
    }
    const { id } = req.params;
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
        return res.status(400).json({ error: `Invalid todo ID: ${id}` });
    }
    try {
        const result = await writeSmartContract('toggleTodo', [
            { type: 'uint256', value: numericId.toString() }
        ]);
        res.json({
            success: true,
            calls: result.calls,
            transactionId: result.transactionId,
            message: result.eventMessage || `Todo #${numericId} toggled successfully!`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
