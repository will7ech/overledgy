const { Wallet } = require('ethers');

let inMemoryPrivateKey = null;
let inMemoryAddress = null;

/**
 * Loads a wallet from .env if MY_WALLET_PRIVATE_KEY and MY_WALLET_ADDRESS exist
 */
function loadEnvWalletIfAvailable() {
    if (process.env.MY_WALLET_PRIVATE_KEY && process.env.MY_WALLET_ADDRESS) {
        inMemoryPrivateKey = process.env.MY_WALLET_PRIVATE_KEY;
        inMemoryAddress = process.env.MY_WALLET_ADDRESS;
    }
}

/**
 * Imports a wallet from a recovery phrase and stores it in memory
 */
function importWalletFromPhrase(recoveryPhrase) {
    const wallet = Wallet.fromPhrase(recoveryPhrase);
    inMemoryPrivateKey = wallet.privateKey;
    inMemoryAddress = wallet.address;
    return wallet;
}

/**
 * True if we have a wallet loaded in memory
 */
function isWalletLoaded() {
    return !!inMemoryPrivateKey && !!inMemoryAddress;
}

/**
 * Returns the loaded wallet's private key, if any
 */
function getWalletPrivateKey() {
    return inMemoryPrivateKey;
}

/**
 * Returns the loaded wallet's address, if any
 */
function getWalletAddress() {
    return inMemoryAddress;
}

module.exports = {
    loadEnvWalletIfAvailable,
    importWalletFromPhrase,
    isWalletLoaded,
    getWalletPrivateKey,
    getWalletAddress
};
