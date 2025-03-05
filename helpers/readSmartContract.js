const axios = require('axios');
const { getOverledgerHeaders } = require('../services/overledgerService');
const { OVERLEDGER_API_CONFIG } = require('../config/overledgerConfig');
const { getContractAddress } = require('../services/contractService');

/**
 * Read a smart contract function from Overledger,
 * but we still let you pass input parameters if needed.
 */
async function readSmartContract(functionName, inputParameters, outputParameters) {
    // If you still want to store the contract address in memory:
    const contractAddress = getContractAddress();

    if (!contractAddress) {
        throw new Error('No contract address is set.');
    }

    const payload = {
        location: OVERLEDGER_API_CONFIG.NETWORK,
        functionName,
        smartContractId: contractAddress, // Use the in-memory contract
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
