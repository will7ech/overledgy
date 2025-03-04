/**
 * Setup some basic configuration for Overledger
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

module.exports = { OVERLEDGER_API_CONFIG };
