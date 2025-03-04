/**
 * routes/balance.js
 */
const express = require('express');
const router = express.Router();
const { fetchAddressBalance } = require('../services/overledgerService');

router.get('/balance/:address', async (req, res) => {
    const { address } = req.params;
    try {
        const bal = await fetchAddressBalance(address);
        res.json({ success: true, overledgerReq: bal.request, overledgerRes: bal.response });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to fetch balance' });
    }
});

module.exports = router;
