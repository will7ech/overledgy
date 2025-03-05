const express = require('express');
const router = express.Router();
const { fetchTransactionStatus } = require('../services/overledgerService');

router.post('/transaction/status', async (req, res) => {
    const { transactionId } = req.body;
    if (!transactionId || typeof transactionId !== 'string') {
        return res.status(400).json({ error: 'Invalid or missing transactionId.' });
    }

    try {
        const result = await fetchTransactionStatus(transactionId.trim());
        res.json({
            success: true,
            overledgerReq: result.request,
            overledgerRes: result.response
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
