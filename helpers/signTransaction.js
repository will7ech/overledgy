/**
 * Signs a transaction with currently loaded server details
 */
const { ethers } = require('ethers');
const { getWalletPrivateKey } = require('../services/walletService');
const { OVERLEDGER_API_CONFIG } = require('../config/overledgerConfig');

async function signTransaction(nativeData) {
    const pk = getWalletPrivateKey();
    if (!pk) {
        throw new Error('No server wallet loaded; cannot sign transaction.');
    }
    const wallet = new ethers.Wallet(pk);
    const tx = {
        to: nativeData.to,
        nonce: nativeData.nonce,
        gasLimit: nativeData.gas,
        maxPriorityFeePerGas: nativeData.maxPriorityFeePerGas,
        maxFeePerGas: nativeData.maxFeePerGas,
        data: nativeData.data,
        value: nativeData.value || '0',
        chainId: nativeData.chainId || OVERLEDGER_API_CONFIG.CHAIN_ID,
        type: 2
    };
    return await wallet.signTransaction(tx);
}

module.exports = { signTransaction };
