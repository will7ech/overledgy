// Import required stuff
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
require('dotenv').config();
const ethers = require('ethers');
// Express app configuration
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// Global variable to store the Overledger OAuth token
let overledgerToken = null;
// Overledger API configuration
const OVERLEDGER_API_CONFIG = {
    BASE_URL: 'https://api.overledger.dev/api',
    AUTH_URL: 'https://auth.overledger.dev/oauth2/token',
    API_VERSION: '3.0.0',
    NETWORK: {
        technology: 'ethereum',
        network: 'ethereum sepolia testnet'
    },
    TODO_LIST_CONTRACT_ADDRESS: process.env.TODO_LIST_CONTRACT_ADDRESS,
    CHAIN_ID: 11155111 // Sepolia chainId
};
// Logger function for a fancy console output
function logger(type, message, details = null) {
    const timestamp = new Date().toISOString();
    let logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    console.log(logEntry);
    if (details) {
        if (typeof details === 'object') {
            console.log('Details:', JSON.stringify(details, null, 2));
        } else {
            console.log('Details:', details);
        }
    }
    return { timestamp, type, message, details };
}
// Helper function to get Overledger API headers
function getOverledgerHeaders() {
    if (!overledgerToken) {
        throw new Error('Overledger auth token is not set. Please retrieve the token first.');
    }
    logger('debug', 'Preparing API headers with auth token');
    return {
        accept: 'application/json',
        'content-type': 'application/json',
        'API-Version': OVERLEDGER_API_CONFIG.API_VERSION,
        Authorization: `Bearer ${overledgerToken}`
    };
}
// Helper function to sign transactions using ethers.js
async function signTransaction(nativeData) {
    try {
        logger('info', 'Signing transaction', { to: nativeData.to, nonce: nativeData.nonce });
        // Create a wallet instance using the private key
        const wallet = new ethers.Wallet(process.env.MY_WALLET_PRIVATE_KEY);
        logger('debug', `Wallet address: ${wallet.address}`);
        // Use the gas parameters provided by Overledger
        const transaction = {
            to: nativeData.to,
            nonce: nativeData.nonce,
            gasLimit: nativeData.gas,
            maxPriorityFeePerGas: nativeData.maxPriorityFeePerGas,
            maxFeePerGas: nativeData.maxFeePerGas,
            data: nativeData.data,
            value: nativeData.value || "0",
            chainId: nativeData.chainId || OVERLEDGER_API_CONFIG.CHAIN_ID,
            type: 2 // EIP-1559 transaction type
        };
        logger('info', 'Using Overledger provided gas parameters', {
            gasLimit: nativeData.gas,
            maxPriorityFeePerGas: nativeData.maxPriorityFeePerGas,
            maxFeePerGas: nativeData.maxFeePerGas
        });
        // Sign the transaction
        const signedTx = await wallet.signTransaction(transaction);
        logger('success', 'Transaction signed successfully');
        return signedTx;
    } catch (error) {
        logger('error', 'Error signing transaction', error.message);
        throw new Error(`Failed to sign transaction: ${error.message}`);
    }
}
// Helper function to read smart contract data
async function readSmartContract(functionName, inputParameters = [], outputParameters) {
    logger('info', `Reading smart contract - Function: ${functionName}`, { inputParameters });
    logger('debug', `Output parameters:`, outputParameters);
    const payload = {
        location: OVERLEDGER_API_CONFIG.NETWORK,
        functionName,
        smartContractId: OVERLEDGER_API_CONFIG.TODO_LIST_CONTRACT_ADDRESS,
        inputParameters,
        outputParameters
    };
    logger('info', `Sending payload to Overledger:`, payload);
    try {
        logger('info', `Making API call to ${OVERLEDGER_API_CONFIG.BASE_URL}/smart-contracts/read`);
        const response = await axios.post(
            `${OVERLEDGER_API_CONFIG.BASE_URL}/smart-contracts/read`,
            payload,
            { headers: getOverledgerHeaders() }
        );
        logger('success', `Successfully read smart contract - Function: ${functionName}`);
        logger('info', `Response status: ${response.status}`);
        logger('info', `Response data:`, response.data);
        return response.data;
    } catch (error) {
        logger('error', `Error reading smart contract - Function: ${functionName}`);
        if (error.response) {
            logger('error', `Response status: ${error.response.status}`);
            logger('error', `Response data:`, error.response.data);
        }
        throw new Error(`Failed to read smart contract: ${error.message}`);
    }
}
// Helper function to write to smart contract
async function writeSmartContract(functionName, inputParameters) {
    logger('info', `Writing to smart contract - Function: ${functionName}`, { inputParameters });
    // Validate input parameters - ensure they have all required fields
    const validatedParams = inputParameters.map(param => {
        // Make sure type, value, and key are all set correctly
        if (!param.type || !param.value) {
            logger('error', 'Invalid parameter structure', param);
            throw new Error(`Invalid parameter structure: ${JSON.stringify(param)}`);
        }
        // Ensure proper formatting of parameters
        let formattedParam = {
            type: param.type,
            value: param.value,
            key: param.key || param.name || 'value' // Fallback if key is missing
        };
        logger('debug', 'Formatted parameter', formattedParam);
        return formattedParam;
    });
    const payload = {
        location: OVERLEDGER_API_CONFIG.NETWORK,
        functionName,
        inputParameters: validatedParams,
        signingAccountId: process.env.MY_WALLET_ADDRESS,
        smartContractId: OVERLEDGER_API_CONFIG.TODO_LIST_CONTRACT_ADDRESS
    };
    logger('info', `Preparing transaction with payload:`, payload);
    try {
        // Prepare transaction
        logger('info', `Making API call to ${OVERLEDGER_API_CONFIG.BASE_URL}/preparations/transactions/smart-contracts/write`);
        const prepareResponse = await axios.post(
            `${OVERLEDGER_API_CONFIG.BASE_URL}/preparations/transactions/smart-contracts/write`,
            payload,
            { headers: getOverledgerHeaders() }
        );
        logger('info', `Preparation response status: ${prepareResponse.status}`);
        logger('info', `Preparation response data:`, prepareResponse.data);
        const { requestId, nativeData } = prepareResponse.data;
        logger('success', `Transaction prepared successfully with requestId: ${requestId}`);
        // Sign transaction
        logger('info', 'Signing transaction with native data:', nativeData);
        const signedTransaction = await signTransaction(nativeData);
        logger('info', 'Signed transaction successfully');
        // Execute transaction
        logger('info', `Executing transaction with requestId: ${requestId}`);
        logger('info', `Making API call to ${OVERLEDGER_API_CONFIG.BASE_URL}/executions/transactions`);
        const executeResponse = await axios.post(
            `${OVERLEDGER_API_CONFIG.BASE_URL}/executions/transactions`,
            { signedTransaction, requestId },
            { headers: getOverledgerHeaders() }
        );
        logger('info', `Execution response status: ${executeResponse.status}`);
        logger('info', `Execution response data:`, executeResponse.data);
        // Log transaction hash
        const txHash = executeResponse.data.transactionId;
        if (txHash) {
            logger('success', `Transaction hash: ${txHash}`);
        }
        // Extract event messages
        let eventMessage = '';
        if (executeResponse.data.events && executeResponse.data.events.length > 0) {
            executeResponse.data.events.forEach((event, index) => {
                if (event.eventName === 'TodoCreated' || event.eventName === 'TodoUpdated') {
                    logger('success', `Event ${index + 1}: ${event.eventName}`);
                    // Extract the message from event parameters if it exists
                    const messageParam = event.eventParameters.find(param => param.key === 'message');
                    if (messageParam) {
                        eventMessage = messageParam.value;
                        logger('success', `Smart Contract Message: ${eventMessage}`);
                    }
                    // Log all parameters for better understanding
                    event.eventParameters.forEach(param => {
                        logger('info', `  - ${param.key}: ${param.value}`);
                    });
                }
            });
        }
        logger('success', `Transaction executed successfully (${functionName})`, executeResponse.data);
        // Return response with transaction data
        return {
            ...executeResponse.data,
            eventMessage
        };
    } catch (error) {
        logger('error', `Error writing to smart contract - Function: ${functionName}`);
        if (error.response) {
            logger('error', `Response status: ${error.response.status}`);
            logger('error', `Response data:`, error.response.data);
        }
        throw new Error(`Failed to write to smart contract: ${error.message}`);
    }
}
// Helper function to fetch todos from the blockchain via Overledger
async function fetchTodos() {
    logger('info', 'Fetching todos from blockchain');
    const walletAddress = process.env.MY_WALLET_ADDRESS.toLowerCase();
    try {
        // Use the explicit getTodoCount function with the wallet address
        logger('info', 'Reading todo count for address:', walletAddress);
        const userCountResponse = await readSmartContract(
            'getTodoCount',
            [{ value: walletAddress, type: 'address', key: 'owner' }],
            [{ type: 'uint256', key: 'count' }]
        );
        // Extract user todo count
        const userCount = parseInt(userCountResponse.outputParameters?.[0]?.value || '0');
        logger('info', `User has ${userCount} todos`);
        let todos = [];
        // For each user todo, get its ID and then fetch the todo details
        for (let i = 0; i < userCount; i++) {
            logger('info', `Getting todo ID for index ${i}`);
            const todoIdResponse = await readSmartContract(
                'getTodoId',
                [
                    { value: walletAddress, type: 'address', key: 'owner' },
                    { value: i.toString(), type: 'uint256', key: 'index' }
                ],
                [{ type: 'uint256', key: 'id' }]
            );
            const todoId = parseInt(todoIdResponse.outputParameters?.[0]?.value || '0');
            logger('info', `Got todo ID: ${todoId}`);
            if (todoId > 0) {
                logger('info', `Fetching todo #${todoId}`);
                const todoResponse = await readSmartContract(
                    'todos',
                    [{ value: todoId.toString(), type: 'uint256', key: 'id' }],
                    [
                        { type: 'uint256', key: 'id' },
                        { type: 'string', key: 'content' },
                        { type: 'bool', key: 'completed' },
                        { type: 'address', key: 'owner' }
                    ]
                );
                // Properly extract todo values from the response
                if (todoResponse.outputParameters && todoResponse.outputParameters.length >= 3) {
                    // Extract the boolean value
                    const completedValue = todoResponse.outputParameters[2].value;
                    // Convert to actual boolean
                    const completed = typeof completedValue === 'boolean'
                        ? completedValue
                        : (completedValue === 'true' || completedValue === true);
                    const todo = {
                        id: parseInt(todoResponse.outputParameters[0].value),
                        content: todoResponse.outputParameters[1].value,
                        completed: completed
                    };
                    logger('info', `Retrieved todo #${todo.id}`, todo);
                    todos.push(todo);
                }
            }
        }
        logger('success', `Successfully fetched ${todos.length} todos`);
        return todos;
    } catch (error) {
        logger('error', 'Error fetching todos', error.message);
        if (error.response) {
            logger('error', 'Response status:', error.response.status);
            logger('error', 'Response data:', error.response.data);
        }
        return [];
    }
}
// Helper function to fetch address balance
async function fetchAddressBalance(address) {
    logger('info', `Fetching balance for address: ${address}`);
    try {
        const options = {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                authorization: `Bearer ${overledgerToken}`
            },
            data: JSON.stringify({
                location: {
                    technology: 'ethereum',
                    network: 'ethereum sepolia testnet'
                }
            })
        };
        const response = await axios.post(
            `https://api.overledger.dev/v2/autoexecution/search/address/balance/${address}`,
            options.data,
            { headers: options.headers }
        );
        logger('success', 'Successfully fetched address balance', response.data);
        return response.data;
    } catch (error) {
        logger('error', 'Error fetching address balance', error.response?.data || error.message);
        throw new Error(`Failed to fetch address balance: ${error.message}`);
    }
}
// ---------- Routes ---------- //
// Index view (Todo App)
app.get('/', async (req, res) => {
    logger('info', 'Accessing main todo page');
    try {
        const todos = overledgerToken ? await fetchTodos() : [];
        logger('info', 'Rendering index page', { todoCount: todos.length });
        // Pass contract config and address to the template
        res.render('index', {
            todos,
            token: overledgerToken,
            OVERLEDGER_API_CONFIG,
            walletAddress: process.env.MY_WALLET_ADDRESS
        });
    } catch (error) {
        logger('error', 'Error rendering index page', error.message);
        res.render('index', {
            todos: [],
            token: overledgerToken,
            error: 'Failed to load todos',
            OVERLEDGER_API_CONFIG,
            walletAddress: process.env.MY_WALLET_ADDRESS
        });
    }
});
// Fetch todos endpoint
app.get('/todos', async (req, res) => {
    logger('info', 'API request: Fetch todos');
    try {
        const todos = await fetchTodos();
        logger('success', 'Successfully fetched todos', { count: todos.length });
        res.json({ success: true, todos });
    } catch (error) {
        logger('error', 'Error fetching todos from blockchain', error.message);
        res.status(500).json({ error: 'Failed to fetch todos' });
    }
});
// Add todo endpoint
app.post('/todo/add', async (req, res) => {
    const { content } = req.body;
    logger('info', 'API request: Add todo', { content });
    try {
        const response = await writeSmartContract('addTodo', [
            { value: content, type: 'string', key: 'content' }
        ]);
        logger('success', 'Todo added successfully', response);
        res.json({
            success: true,
            transactionId: response.transactionId,
            message: response.eventMessage || 'Todo added successfully!'
        });
    } catch (error) {
        logger('error', 'Error adding todo', error.message);
        res.status(500).json({ error: error.message });
    }
});
// Toggle todo completion endpoint
app.post('/todo/toggle/:id', async (req, res) => {
    const { id } = req.params;
    logger('info', 'API request: Toggle todo', { id });
    try {
        // Make sure we're passing the ID properly - ensure it's a proper numeric value
        const numericId = parseInt(id, 10);
        if (isNaN(numericId)) {
            throw new Error(`Invalid todo ID: ${id}`);
        }
        logger('info', `Toggling todo #${numericId}`);
        // Execute the toggle function
        const response = await writeSmartContract('toggleTodo', [
            { type: 'uint256', value: numericId.toString(), key: 'id' }
        ]);
        logger('success', `Todo #${numericId} toggle transaction completed`, response);
        res.json({
            success: true,
            transactionId: response.transactionId,
            message: response.eventMessage || `Todo #${numericId} status toggled successfully!`
        });
    } catch (error) {
        logger('error', `Error toggling todo #${id}`, error.message);
        res.status(500).json({ error: error.message });
    }
});
// Fetch address balance endpoint
app.get('/balance', async (req, res) => {
    logger('info', 'API request: Fetch address balance');
    try {
        const address = process.env.MY_WALLET_ADDRESS;
        const balanceResponse = await fetchAddressBalance(address);
        logger('success', 'Successfully fetched address balance', balanceResponse);
        res.json({ success: true, balanceResponse });
    } catch (error) {
        logger('error', 'Error fetching address balance', error.message);
        res.status(500).json({ error: 'Failed to fetch address balance' });
    }
});
// OAuth token retrieval endpoint
app.post('/auth', async (req, res) => {
    logger('info', 'API request: Retrieve OAuth token');
    const { OVERLEDGER_API_KEY, OVERLEDGER_API_SECRET } = process.env;
    const basicAuth = Buffer.from(`${OVERLEDGER_API_KEY}:${OVERLEDGER_API_SECRET}`).toString('base64');
    try {
        const bodyData = new URLSearchParams({ grant_type: 'client_credentials' }).toString();
        logger('info', 'Requesting OAuth token from Overledger');
        const response = await axios.post(OVERLEDGER_API_CONFIG.AUTH_URL, bodyData, {
            headers: {
                accept: 'application/json',
                'content-type': 'application/x-www-form-urlencoded',
                authorization: `Basic ${basicAuth}`
            }
        });
        overledgerToken = response.data.access_token;
        logger('success', 'OAuth token retrieved successfully');
        res.json({ success: true, token: overledgerToken });
    } catch (error) {
        logger('error', 'Error retrieving auth token', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to retrieve auth token' });
    }
});
// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger('info', `Server is running on port ${PORT}`);
    logger('info', `Contract address: ${OVERLEDGER_API_CONFIG.TODO_LIST_CONTRACT_ADDRESS}`);
    logger('info', `Signing account: ${process.env.MY_WALLET_ADDRESS}`);
});