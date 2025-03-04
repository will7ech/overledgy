/**
 * Read a smart contract function
 */
const axios = require('axios');
const { getOverledgerHeaders } = require('../services/overledgerService');
const { OVERLEDGER_API_CONFIG } = require('../config/overledgerConfig');

async function readSmartContract(functionName, inputParameters, outputParameters) {
    const payload = {
        location: OVERLEDGER_API_CONFIG.NETWORK,
        functionName,
        smartContractId: OVERLEDGER_API_CONFIG.TODO_LIST_CONTRACT_ADDRESS,
        inputParameters,
        outputParameters
    };

    const req = {
        url: `${OVERLEDGER_API_CONFIG.BASE_URL}/api/smart-contracts/read`,
        method: 'POST',
        headers: getOverledgerHeaders(),
        body: payload
    };

    const response = await axios.post(req.url, req.body, { headers: req.headers });
    return { request: req, response: response.data };
}

module.exports = { readSmartContract };
