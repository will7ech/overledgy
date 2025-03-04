/**
 * routes/index.js
 */
const express = require('express');
const router = express.Router();
const { getOverledgerToken } = require('../services/overledgerService');
const { isWalletLoaded, getWalletAddress } = require('../services/walletService');

router.get('/', (req, res) => {
    const token = getOverledgerToken();
    const walletDetected = isWalletLoaded();
    const walletAddress = getWalletAddress() || '';

    // We pass an empty array for "todos" initially; user can fetch on the front end
    res.render('index', {
        token,
        walletDetected,
        walletAddress,
        todos: []
    });
});

module.exports = router;
