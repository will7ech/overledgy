/**
 * routes/balance.js
 * Route to fetch an address balance via Overledger.
 */
const express = require('express');
const router = express.Router();
const { fetchAddressBalance } = require('../services/overledgerService');

router.get('/balance/:address', async (req, res) => {
    const { address } = req.params;
    try {
        const balResult = await fetchAddressBalance(address);
        res.json({
            success: true,
            overledgerReq: balResult.request,
            overledgerRes: balResult.response
        });
    } catch (error) {
        // Log error to server console
        console.error('Balance route error =>', error);

        // Return the raw message
        res.status(500).json({
            error: error.message || 'Failed to fetch address balance'
        });
    }
});

module.exports = router;
