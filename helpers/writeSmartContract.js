const axios = require('axios');
const { OVERLEDGER_API_CONFIG } = require('../config/overledgerConfig');
const { getOverledgerHeaders } = require('../services/overledgerService');
const { getWalletAddress } = require('../services/walletService');
const { signTransaction } = require('./signTransaction');
const { getContractAddress } = require('../services/contractService');

/**
 * Writes data to the smart contract
 */
async function writeSmartContract(functionName, inputParameters) {
    const contractAddress = getContractAddress();
    if (!contractAddress) {
        throw new Error('No contract is deployed yet. Cannot write.');
    }

    // Overledger expects inputParameters = [{ type, value }, ...]
    const validatedParams = inputParameters.map(p => ({
        type: p.type,
        value: p.value
    }));

    // 1) PREPARE
    const preparePayload = {
        location: OVERLEDGER_API_CONFIG.NETWORK,
        functionName,
        inputParameters: validatedParams,
        signingAccountId: getWalletAddress(),
        smartContractId: contractAddress
    };

    const prepareReq = {
        url: `${OVERLEDGER_API_CONFIG.BASE_URL}/api/preparations/transactions/smart-contracts/write`,
        method: 'POST',
        headers: getOverledgerHeaders(),
        body: preparePayload
    };

    let prepResponse;
    try {
        prepResponse = await axios.post(prepareReq.url, prepareReq.body, { headers: prepareReq.headers });
    } catch (err) {
        throw new Error(err.response?.data?.message || err.message || 'Prepare request failed');
    }

    const { requestId, nativeData } = prepResponse.data;

    // 2) SIGN
    let signedTransaction;
    try {
        signedTransaction = await signTransaction(nativeData);
    } catch (err) {
        throw new Error(`Error signing transaction: ${err.message}`);
    }

    // 3) EXECUTE
    const executeReq = {
        url: `${OVERLEDGER_API_CONFIG.BASE_URL}/api/executions/transactions`,
        method: 'POST',
        headers: getOverledgerHeaders(),
        body: { signedTransaction, requestId }
    };

    let execResponse;
    try {
        execResponse = await axios.post(executeReq.url, executeReq.body, { headers: executeReq.headers });
    } catch (err) {
        throw new Error(err.response?.data?.message || err.message || 'Execute request failed');
    }

    // Extract optional event message from Overledger's "events"
    let eventMessage = '';
    if (execResponse.data.events && execResponse.data.events.length > 0) {
        execResponse.data.events.forEach(evt => {
            if (evt.eventName === 'TodoCreated' || evt.eventName === 'TodoUpdated') {
                const msgParam = evt.eventParameters.find(p => p.key === 'message');
                if (msgParam) {
                    eventMessage = msgParam.value;
                }
            }
        });
    }

    return {
        calls: [
            { request: prepareReq, response: prepResponse.data },
            { request: executeReq, response: execResponse.data }
        ],
        eventMessage,
        transactionId: execResponse.data.transactionId
    };
}

module.exports = {
    writeSmartContract
};
