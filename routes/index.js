const express = require('express');
const router = express.Router();
const { getOverledgerToken } = require('../services/overledgerService');
const { isWalletLoaded, getWalletAddress } = require('../services/walletService');
const { getContractAddress } = require('../services/contractService');

router.get('/', (req, res) => {
    const token = getOverledgerToken();
    const walletDetected = isWalletLoaded();
    const walletAddress = getWalletAddress() || '';
    const contractAddress = getContractAddress() || null; // in-memory address if deployed

    // Pass an empty array for "todos" initially
    res.render('index', {
        token,
        walletDetected,
        walletAddress,
        contractAddress,
        todos: []
    });
});

module.exports = router;
