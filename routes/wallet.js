/**
 * routes/wallet.js
 */
const express = require('express');
const router = express.Router();
const { importWalletFromPhrase, isWalletLoaded, getWalletAddress } = require('../services/walletService');

router.post('/wallet/import', (req, res) => {
    const { recoveryPhrase } = req.body;
    if (!recoveryPhrase) {
        return res.status(400).json({ error: 'No recovery phrase provided.' });
    }
    try {
        const wallet = importWalletFromPhrase(recoveryPhrase);
        return res.json({ success: true, address: wallet.address });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.get('/wallet/status', (req, res) => {
    if (!isWalletLoaded()) {
        return res.json({ loaded: false });
    }
    return res.json({ loaded: true, address: getWalletAddress() });
});

module.exports = router;
