const express = require('express');
const router = express.Router();
const { deploySmartContract } = require('../helpers/deploySmartContract');
const { isWalletLoaded } = require('../services/walletService');

router.post('/deploy', async (req, res) => {
    if (!isWalletLoaded()) {
        return res.status(400).json({ error: 'No wallet loaded on server.' });
    }
    const { bytecode } = req.body;
    if (!bytecode || typeof bytecode !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid bytecode.' });
    }

    try {
        const result = await deploySmartContract(bytecode);
        res.json({
            success: true,
            calls: result.calls,
            transactionId: result.transactionId,
            status: result.status,
            contractAddress: result.contractAddress
        });
    } catch (err) {
        // Return partial calls if available from the error
        // But since we attach them in the deploySmartContract, let's just do a minimal approach:
        res.status(500).json({
            error: err.message || 'Deployment failed.'
        });
    }
});

module.exports = router;
