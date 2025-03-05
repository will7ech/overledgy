const express = require('express');
const router = express.Router();
const { readSmartContract } = require('../helpers/readSmartContract');
const { writeSmartContract } = require('../helpers/writeSmartContract');
const { isWalletLoaded, getWalletAddress } = require('../services/walletService');
const { setContractAddress, getContractAddress } = require('../services/contractService');

// Recursively read all the user's todos from Overledger
async function fetchTodos() {
    const logs = [];
    const todos = [];

    // 1) If no wallet => no address => return empty
    if (!isWalletLoaded()) {
        return { logs, todos };
    }
    const address = getWalletAddress().toLowerCase();

    // 2) getTodoCount(address)
    const countResp = await readSmartContract(
        'getTodoCount',
        [{ type: 'address', value: address }],
        [{ type: 'uint256' }]
    );
    logs.push(countResp);
    const userCount = parseInt(countResp.response.outputParameters?.[0]?.value || '0');

    // 3) For each index => getTodoId(address, i) => then read the actual struct
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
            // If your contract's struct has 4 fields, do so:
            const todoCall = await readSmartContract(
                'todos',
                [{ type: 'uint256', value: todoId.toString() }],
                [
                    { type: 'uint256' }, // id
                    { type: 'string' },  // content
                    { type: 'bool' },    // completed
                    { type: 'address' }  // owner
                ]
            );
            logs.push(todoCall);

            if (todoCall.response.outputParameters?.length >= 4) {
                const idVal = parseInt(todoCall.response.outputParameters[0].value);
                const contentVal = todoCall.response.outputParameters[1].value;
                const completedVal = todoCall.response.outputParameters[2].value;
                const completed = (completedVal === true || completedVal === 'true');

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

/**
 * POST /todo/setContract
 * Manually override the contract address stored on the server
 */
router.post('/todo/setContract', (req, res) => {
    const { contractAddress } = req.body;
    if (!contractAddress) {
        return res.status(400).json({ error: 'Missing contract address.' });
    }
    setContractAddress(contractAddress);
    return res.json({ success: true, contractAddress });
});


module.exports = router;
