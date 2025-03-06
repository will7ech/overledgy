const axios = require('axios');
const { OVERLEDGER_API_CONFIG } = require('../config/overledgerConfig');
const { getOverledgerHeaders, fetchTransactionStatus } = require('../services/overledgerService');
const { getWalletAddress } = require('../services/walletService');
const { signTransaction } = require('./signTransaction');
const { setContractAddress } = require('../services/contractService');

/**
 * Deploy a smart contract using Overledger's prepare -> sign -> execute flow.
 * We'll attempt to fetch the contract address if the status is available right away.
 */
async function deploySmartContract(originalBytecode) {
    // Remove leading "0x" if present, convert to lowercase
    let pureBytecode = originalBytecode.trim().replace(/^0x/i, '').toLowerCase();

    // Check Overledger's expected regex: ^[0-9a-fA-F]{1,50000}$
    if (!/^[0-9a-fA-F]{1,50000}$/.test(pureBytecode)) {
        throw new Error(
            'Bytecode must be hex, up to 50000 chars. Received length=' +
            pureBytecode.length
        );
    }

    // We'll collect Overledger request/response logs for the front end
    const calls = [];

    // 1) PREPARE
    const preparePayload = {
        location: OVERLEDGER_API_CONFIG.NETWORK,
        signingAccountId: getWalletAddress(),
        bytecode: pureBytecode
    };

    const prepareReq = {
        url: `${OVERLEDGER_API_CONFIG.BASE_URL}/api/preparations/deployments/smart-contracts`,
        method: 'POST',
        headers: getOverledgerHeaders(),
        body: preparePayload
    };

    let prepResponseData;
    try {
        const prepResponse = await axios.post(
            prepareReq.url,
            prepareReq.body,
            { headers: prepareReq.headers }
        );
        prepResponseData = prepResponse.data;
        calls.push({ request: prepareReq, response: prepResponseData });
    } catch (err) {
        calls.push({
            request: prepareReq,
            errorResponse: err.response?.data || { message: err.message }
        });
        const msg =
            err.response?.data?.message ||
            err.response?.data?.errors?.[0]?.description ||
            err.response?.data?.details ||
            err.message ||
            'Prepare deployment failed';
        throw new Error(msg);
    }

    const { requestId, nativeData } = prepResponseData;

    // 2) SIGN
    let signedTransaction;
    try {
        signedTransaction = await signTransaction(nativeData);
    } catch (err) {
        throw new Error(`Error signing deployment transaction: ${err.message}`);
    }

    // 3) EXECUTE
    const executeReq = {
        url: `${OVERLEDGER_API_CONFIG.BASE_URL}/api/executions/deployments`,
        method: 'POST',
        headers: getOverledgerHeaders(),
        body: { signedTransaction, requestId }
    };

    let execResponseData;
    try {
        const execResponse = await axios.post(
            executeReq.url,
            executeReq.body,
            { headers: executeReq.headers }
        );
        execResponseData = execResponse.data;
        calls.push({ request: executeReq, response: execResponseData });
    } catch (err) {
        calls.push({
            request: executeReq,
            errorResponse: err.response?.data || { message: err.message }
        });
        const msg =
            err.response?.data?.message ||
            err.response?.data?.errors?.[0]?.description ||
            err.response?.data?.details ||
            err.message ||
            'Execute deployment failed';
        throw new Error(msg);
    }

    // Overledger returns a transaction ID
    const transactionId = execResponseData.transactionId;
    const status = execResponseData?.status?.value || 'UNKNOWN';

    // We'll do one immediate attempt to see if the contract address is known (Even if "PENDING")
    let newAddress = null;
    try {
        const statusResult = await fetchTransactionStatus(transactionId);
        const overledgerStatus = statusResult.response;
        const creates = overledgerStatus?.transaction?.nativeData?.creates;
        if (creates && creates !== 'null') {
            newAddress = creates;
            setContractAddress(newAddress); // store in memory
        }
        // Also log that request/response
        calls.push({
            request: statusResult.request,
            response: overledgerStatus
        });
    } catch (err) {
        // Possibly pending transaction, not an error
        console.warn('Immediate contract address lookup failed/pending =>', err.message);
    }

    return {
        calls,
        transactionId,
        status,
        contractAddress: newAddress
    };
}

module.exports = {
    deploySmartContract
};
