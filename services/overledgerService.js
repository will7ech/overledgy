/**
 * overledgerService.js
 * Provides shared service methods: getOverledgerHeaders, fetchAddressBalance, etc.
 */
const axios = require('axios');
const { OVERLEDGER_API_CONFIG } = require('../config/overledgerConfig');

// In-memory Overledger token
let overledgerToken = null;

/**
 * Return Overledger headers with the current Bearer token.
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
 * At the moment, Overledger docs show mixed versions, and for V2, it should go without the API version header
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
 * Now with extra error logging.
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
        // Attempt the Overledger call
        const response = await axios.post(
            requestInfo.url,
            JSON.stringify(requestInfo.body),
            { headers: requestInfo.headers }
        );

        // Return both request + response data
        return {
            request: requestInfo,
            response: response.data
        };
    } catch (err) {
        // Log the full Overledger error data to the server console
        // so you can see the real cause (e.g., invalid address, etc.).
        if (err.response && err.response.data) {
            console.error('fetchAddressBalance Overledger error =>', err.response.data);
        } else {
            console.error('fetchAddressBalance error =>', err.message);
        }

        // Re-throw a more descriptive error for the route to handle
        // We can embed Overledger's error message or entire data
        const msg = err.response?.data
            ? JSON.stringify(err.response.data)
            : err.message;

        throw new Error(msg);
    }
}

module.exports = {
    getOverledgerHeaders,
    setOverledgerToken,
    getOverledgerToken,
    fetchAddressBalance
};
