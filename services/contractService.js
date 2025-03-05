// Maintain the currently deployed contract address in memory.
let inMemoryContractAddress = null;

/**
 * Set the newly deployed contract address
 */
function setContractAddress(addr) {
    inMemoryContractAddress = addr;
}

/**
 * Get the contract address, or null if none
 */
function getContractAddress() {
    return inMemoryContractAddress;
}

module.exports = {
    setContractAddress,
    getContractAddress
};
