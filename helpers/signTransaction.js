const { ethers } = require('ethers');
const { getWalletPrivateKey } = require('../services/walletService');
const { OVERLEDGER_API_CONFIG } = require('../config/overledgerConfig');

/**
 * Sign a transaction using the current wallet.
 */
async function signTransaction(nativeData) {
    const pk = getWalletPrivateKey();
    if (!pk) {
        throw new Error('No server wallet loaded; cannot sign transaction.');
    }
    // If `nativeData.data` is a hex string with no `0x`, fix it:
    if (!nativeData.data.startsWith("0x")) {
        nativeData.data = "0x" + nativeData.data;
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
