const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
require('dotenv').config();
const ethers = require('ethers');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

let overledgerToken = null;

/**
 * Overledger API configuration
 */
const OVERLEDGER_API_CONFIG = {
    BASE_URL: 'https://api.overledger.dev',
    AUTH_URL: 'https://auth.overledger.dev/oauth2/token',
    API_VERSION: '3.0.0',
    NETWORK: {
        technology: 'ethereum',
        network: 'ethereum sepolia testnet'
    },
    TODO_LIST_CONTRACT_ADDRESS: process.env.TODO_LIST_CONTRACT_ADDRESS,
    CHAIN_ID: 11155111
};

/**
 * Basic logger for console
 */
function logger(type, message, details = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
    if (details) {
        if (typeof details === 'object') {
            console.log('Details:', JSON.stringify(details, null, 2));
        } else {
            console.log('Details:', details);
        }
    }
}

/**
 * Get Overledger headers with Bearer token
 */
function getOverledgerHeaders() {
    if (!overledgerToken) {
        throw new Error('Overledger auth token is not set. Retrieve the token first.');
    }
    return {
        accept: 'application/json',
        'content-type': 'application/json',
        'API-Version': OVERLEDGER_API_CONFIG.API_VERSION,
        Authorization: `Bearer ${overledgerToken}`
    };
}

/**
 * Sign an EIP-1559 transaction using ethers.js
 */
async function signTransaction(nativeData) {
    const wallet = new ethers.Wallet(process.env.MY_WALLET_PRIVATE_KEY);
    const transaction = {
        to: nativeData.to,
        nonce: nativeData.nonce,
        gasLimit: nativeData.gas,
        maxPriorityFeePerGas: nativeData.maxPriorityFeePerGas,
        maxFeePerGas: nativeData.maxFeePerGas,
        data: nativeData.data,
        value: nativeData.value || '0',
        chainId: nativeData.chainId || OVERLEDGER_API_CONFIG.CHAIN_ID,
        type: 2
    };
    return await wallet.signTransaction(transaction);
}

/**
 * Read from a smart contract via Overledger
 */
async function readSmartContract(functionName, inputParameters, outputParameters) {
    const payload = {
        location: OVERLEDGER_API_CONFIG.NETWORK,
        functionName,
        smartContractId: OVERLEDGER_API_CONFIG.TODO_LIST_CONTRACT_ADDRESS,
        inputParameters,
        outputParameters
    };
    const requestInfo = {
        url: `${OVERLEDGER_API_CONFIG.BASE_URL}/api/smart-contracts/read`,
        method: 'POST',
        headers: getOverledgerHeaders(),
        body: payload
    };

    try {
        const response = await axios.post(requestInfo.url, requestInfo.body, { headers: requestInfo.headers });
        return { request: requestInfo, response: response.data };
    } catch (error) {
        throw new Error(error.message);
    }
}

/**
 * Write to a smart contract via Overledger
 */
async function writeSmartContract(functionName, inputParameters) {
    const validatedParams = inputParameters.map(param => {
        if (!param.type || !param.value) {
            throw new Error(`Invalid parameter structure: ${JSON.stringify(param)}`);
        }
        return {
            type: param.type,
            value: param.value,
            key: param.key || param.name || 'value'
        };
    });

    const preparePayload = {
        location: OVERLEDGER_API_CONFIG.NETWORK,
        functionName,
        inputParameters: validatedParams,
        signingAccountId: process.env.MY_WALLET_ADDRESS,
        smartContractId: OVERLEDGER_API_CONFIG.TODO_LIST_CONTRACT_ADDRESS
    };

    const prepareReqInfo = {
        url: `${OVERLEDGER_API_CONFIG.BASE_URL}/api/preparations/transactions/smart-contracts/write`,
        method: 'POST',
        headers: getOverledgerHeaders(),
        body: preparePayload
    };

    try {
        const prepResponse = await axios.post(prepareReqInfo.url, prepareReqInfo.body, {
            headers: prepareReqInfo.headers
        });
        const { requestId, nativeData } = prepResponse.data;

        const signedTransaction = await signTransaction(nativeData);

        const executeReqInfo = {
            url: `${OVERLEDGER_API_CONFIG.BASE_URL}/api/executions/transactions`,
            method: 'POST',
            headers: getOverledgerHeaders(),
            body: { signedTransaction, requestId }
        };
        const execResponse = await axios.post(executeReqInfo.url, executeReqInfo.body, {
            headers: executeReqInfo.headers
        });

        let eventMessage = '';
        if (execResponse.data.events && execResponse.data.events.length > 0) {
            execResponse.data.events.forEach(event => {
                if (event.eventName === 'TodoCreated' || event.eventName === 'TodoUpdated') {
                    const msgParam = event.eventParameters.find(p => p.key === 'message');
                    if (msgParam) eventMessage = msgParam.value;
                }
            });
        }

        return {
            calls: [
                { request: prepareReqInfo, response: prepResponse.data },
                { request: executeReqInfo, response: execResponse.data }
            ],
            eventMessage,
            transactionId: execResponse.data.transactionId
        };
    } catch (error) {
        throw new Error(error.message);
    }
}

/**
 * Fetch todos from the smart contract
 */
async function fetchTodos() {
    const walletAddress = process.env.MY_WALLET_ADDRESS.toLowerCase();
    const logs = [];
    let todos = [];

    try {
        const readCount = await readSmartContract(
            'getTodoCount',
            [{ value: walletAddress, type: 'address' }],
            [{ type: 'uint256' }]
        );
        logs.push(readCount);

        const userCount = parseInt(readCount.response.outputParameters?.[0]?.value || '0');

        for (let i = 0; i < userCount; i++) {
            const todoIdCall = await readSmartContract(
                'getTodoId',
                [
                    { value: walletAddress, type: 'address' },
                    { value: i.toString(), type: 'uint256' }
                ],
                [{ type: 'uint256' }]
            );
            logs.push(todoIdCall);

            const todoId = parseInt(todoIdCall.response.outputParameters?.[0]?.value || '0');
            if (todoId > 0) {
                const todoCall = await readSmartContract(
                    'todos',
                    [{ value: todoId.toString(), type: 'uint256' }],
                    [
                        { type: 'uint256' },
                        { type: 'string' },
                        { type: 'bool' },
                        { type: 'address' }
                    ]
                );
                logs.push(todoCall);

                if (
                    todoCall.response.outputParameters &&
                    todoCall.response.outputParameters.length >= 3
                ) {
                    const completedVal = todoCall.response.outputParameters[2].value;
                    const completed =
                        typeof completedVal === 'boolean'
                            ? completedVal
                            : (completedVal === 'true' || completedVal === true);

                    todos.push({
                        id: parseInt(todoCall.response.outputParameters[0].value),
                        content: todoCall.response.outputParameters[1].value,
                        completed
                    });
                }
            }
        }
        return { logs, todos };
    } catch {
        return { logs, todos: [] };
    }
}

/**
 * Fetch balance of a given address
 */
async function fetchAddressBalance(address) {
    const reqHeaders = {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${overledgerToken}`
    };

    const requestInfo = {
        url: `${OVERLEDGER_API_CONFIG.BASE_URL}/v2/autoexecution/search/address/balance/${address}`,
        method: 'POST',
        headers: reqHeaders,
        body: {
            location: { technology: 'ethereum', network: 'ethereum sepolia testnet' }
        }
    };

    try {
        const response = await axios.post(
            requestInfo.url,
            JSON.stringify(requestInfo.body),
            { headers: requestInfo.headers }
        );
        return { request: requestInfo, response: response.data };
    } catch (error) {
        throw new Error(error.message);
    }
}

/**
 * Render index page
 */
app.get('/', (req, res) => {
    res.render('index', {
        todos: [],
        token: overledgerToken,
        OVERLEDGER_API_CONFIG,
        walletAddress: process.env.MY_WALLET_ADDRESS
    });
});

/**
 * Get todos
 */
app.get('/todos', async (req, res) => {
    try {
        const { logs, todos } = await fetchTodos();
        res.json({ success: true, logs, todos });
    } catch {
        res.status(500).json({ error: 'Failed to fetch todos' });
    }
});

/**
 * Add a new todo
 */
app.post('/todo/add', async (req, res) => {
    const { content } = req.body;
    try {
        const result = await writeSmartContract('addTodo', [
            { value: content, type: 'string' }
        ]);
        res.json({
            success: true,
            calls: result.calls,
            transactionId: result.transactionId,
            message: result.eventMessage || 'Todo added successfully!'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Toggle todo completion
 */
app.post('/todo/toggle/:id', async (req, res) => {
    const { id } = req.params;
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
        return res.status(400).json({ error: `Invalid todo ID: ${id}` });
    }
    try {
        const result = await writeSmartContract('toggleTodo', [
            { value: numericId.toString(), type: 'uint256' }
        ]);
        res.json({
            success: true,
            calls: result.calls,
            transactionId: result.transactionId,
            message: result.eventMessage || `Todo #${numericId} toggled successfully!`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Fetch balance for a given address
 */
app.get('/balance/:address', async (req, res) => {
    const { address } = req.params;
    try {
        const balResult = await fetchAddressBalance(address);
        res.json({
            success: true,
            overledgerReq: balResult.request,
            overledgerRes: balResult.response
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch address balance' });
    }
});

/**
 * Retrieve OAuth token
 */
app.post('/auth', async (req, res) => {
    const { OVERLEDGER_API_KEY, OVERLEDGER_API_SECRET } = process.env;
    const basicAuth = Buffer.from(`${OVERLEDGER_API_KEY}:${OVERLEDGER_API_SECRET}`).toString('base64');
    try {
        const bodyData = new URLSearchParams({ grant_type: 'client_credentials' }).toString();
        const response = await axios.post(OVERLEDGER_API_CONFIG.AUTH_URL, bodyData, {
            headers: {
                accept: 'application/json',
                'content-type': 'application/x-www-form-urlencoded',
                authorization: `Basic ${basicAuth}`
            }
        });
        overledgerToken = response.data.access_token;
        res.json({ success: true, token: overledgerToken });
    } catch {
        res.status(500).json({ error: 'Failed to retrieve auth token' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT);
