const express = require('express');
const router = express.Router();
const axios = require('axios');
const { OVERLEDGER_API_CONFIG } = require('../config/overledgerConfig');
const { setOverledgerToken } = require('../services/overledgerService');

router.post('/auth', async (req, res) => {
    const { OVERLEDGER_API_KEY, OVERLEDGER_API_SECRET } = process.env;
    if (!OVERLEDGER_API_KEY || !OVERLEDGER_API_SECRET) {
        return res.status(400).json({ error: 'Missing Overledger API credentials in .env' });
    }

    const basicAuth = Buffer.from(`${OVERLEDGER_API_KEY}:${OVERLEDGER_API_SECRET}`).toString('base64');

    try {
        const bodyData = new URLSearchParams({ grant_type: 'client_credentials' }).toString();
        const response = await axios.post(OVERLEDGER_API_CONFIG.AUTH_URL, bodyData, {
            headers: {
                accept: 'application/json',
                'content-type': 'application/x-www-form-urlencoded',
                authorization: `Basic ${basicAuth}`
            }
        });
        setOverledgerToken(response.data.access_token);
        res.json({ success: true, token: response.data.access_token });
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve auth token' });
    }
});

module.exports = router;
