const axios = require('axios');
const { OVERLEDGER_API_CONFIG } = require('../config/overledgerConfig');

// In-memory Overledger token
let overledgerToken = null;

/**
 * Return Overledger headers with the current Bearer token (for v3 endpoints).
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
 * Return Overledger headers for v2 or similar endpoints that do not require 'API-Version'.
 */
function getOverledgerHeadersForV2() {
    if (!overledgerToken) {
        throw new Error('Overledger auth token is not set. Retrieve the token first.');
    }
    return {
        accept: 'application/json',
        'content-type': 'application/json',
        Authorization: `Bearer ${overledgerToken}`
    };
}

/**
 * Getter/setter for Overledger token.
 */
function setOverledgerToken(token) {
    overledgerToken = token;
}
function getOverledgerToken() {
    return overledgerToken;
}

/**
 * Fetch balance of a given address from Overledger.
 */
async function fetchAddressBalance(address) {
    const requestInfo = {
        url: `${OVERLEDGER_API_CONFIG.BASE_URL}/v2/autoexecution/search/address/balance/${address}`,
        method: 'POST',
        headers: getOverledgerHeadersForV2(),
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
        return {
            request: requestInfo,
            response: response.data
        };
    } catch (err) {
        if (err.response && err.response.data) {
            console.error('fetchAddressBalance Overledger error =>', err.response.data);
        } else {
            console.error('fetchAddressBalance error =>', err.message);
        }
        const msg = err.response?.data
            ? JSON.stringify(err.response.data)
            : err.message;
        throw new Error(msg);
    }
}

/**
 * [NEW] Fetch transaction status from Overledger, given a transactionId.
 */
async function fetchTransactionStatus(transactionId) {
    const requestInfo = {
        url: `${OVERLEDGER_API_CONFIG.BASE_URL}/v2/autoexecution/search/transaction?transactionId=${transactionId}`,
        method: 'POST',
        headers: getOverledgerHeadersForV2(),
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
        return {
            request: requestInfo,
            response: response.data
        };
    } catch (err) {
        if (err.response?.data) {
            console.error('fetchTransactionStatus Overledger error =>', err.response.data);
        } else {
            console.error('fetchTransactionStatus error =>', err.message);
        }
        const msg = err.response?.data
            ? JSON.stringify(err.response.data)
            : err.message;
        throw new Error(msg);
    }
}

module.exports = {
    getOverledgerHeaders,
    getOverledgerHeadersForV2,
    setOverledgerToken,
    getOverledgerToken,
    fetchAddressBalance,
    fetchTransactionStatus
};
