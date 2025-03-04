/**
 * overledgerService.js
 */
const axios = require('axios');
const { OVERLEDGER_API_CONFIG } = require('../config/overledgerConfig');

let overledgerToken = null;

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

function setOverledgerToken(token) {
    overledgerToken = token;
}
function getOverledgerToken() {
    return overledgerToken;
}

/**
 * Basic address balance fetch
 */
async function fetchAddressBalance(address) {
    const req = {
        url: `${OVERLEDGER_API_CONFIG.BASE_URL}/v2/autoexecution/search/address/balance/${address}`,
        method: 'POST',
        headers: getOverledgerHeaders(),
        body: {
            location: { technology: 'ethereum', network: 'ethereum sepolia testnet' }
        }
    };
    const response = await axios.post(req.url, JSON.stringify(req.body), { headers: req.headers });
    return { request: req, response: response.data };
}

module.exports = {
    getOverledgerHeaders,
    setOverledgerToken,
    getOverledgerToken,
    fetchAddressBalance
};
