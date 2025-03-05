window.transactionList = [];

// Add a new card to the Transactions container
window.addTransactionCard = function(txId, status, txType) {
    const container = document.getElementById('transactionsContainer');
    if (!container) return;

    const now = new Date().toLocaleTimeString();

    // Create a card
    const card = document.createElement('div');
    card.className = 'transaction-card';

    // Time
    const timeEl = document.createElement('p');
    timeEl.className = 'transaction-time';
    timeEl.textContent = `Time: ${now}`;
    card.appendChild(timeEl);

    // Type
    const typeEl = document.createElement('p');
    typeEl.className = 'transaction-type';
    typeEl.textContent = `Type: ${txType || 'N/A'}`;
    card.appendChild(typeEl);

    // Tx ID
    const txEl = document.createElement('p');
    txEl.className = 'transaction-id';
    txEl.textContent = `Transaction ID: ${txId}`;
    card.appendChild(txEl);

    // Status
    const statusEl = document.createElement('p');
    statusEl.className = 'transaction-status';
    statusEl.textContent = `Status: ${status || 'UNKNOWN'}`;
    card.appendChild(statusEl);

    // Update button
    const btnUpdate = document.createElement('button');
    btnUpdate.textContent = 'Update Status';
    btnUpdate.className = 'btn btn-secondary transaction-update-btn';
    btnUpdate.addEventListener('click', async () => {
        await updateTransactionStatus(card, txId);
    });
    card.appendChild(btnUpdate);

    container.appendChild(card);

    // Keep track in transactionList array
    window.transactionList.push({ time: now, txId, status, type: txType });
};

async function updateTransactionStatus(card, txId) {
    if (!txId) return;
    showStatus(`Checking status of ${txId}`, 'loading');

    try {
        const res = await fetch('/transaction/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactionId: txId })
        });
        const data = await res.json();
        if (!data.success) {
            showStatus(data.error || 'Error updating transaction status.', 'error');
            logToConsole(data.error, 'error');
            scrollToConsole();
            return;
        }

        // Log request/response
        if (data.overledgerReq?.headers?.Authorization) {
            data.overledgerReq.headers.Authorization = trimBearer(
                data.overledgerReq.headers.Authorization
            );
        }
        logToConsole(
            `Overledger Request:\n${JSON.stringify(data.overledgerReq, null, 2)}`,
            'request'
        );
        logToConsole(
            `Overledger Response:\n${JSON.stringify(data.overledgerRes, null, 2)}`,
            'response'
        );

        const newStatus = data.overledgerRes?.status?.value || 'UNKNOWN';

        // Update the status text in the card
        const statusEl = card.querySelector('.transaction-status');
        if (statusEl) {
            statusEl.textContent = `Status: ${newStatus}`;
        }

        // If we see a 'creates' field => it's a deployed contract
        const creates = data.overledgerRes?.transaction?.nativeData?.creates;
        if (creates && creates !== 'null') {
            // Update the UI contract address
            window.updateContractAddressUI(creates);
        }

        showStatus(`Transaction status updated to ${newStatus}`, 'success');
    } catch (err) {
        showStatus(`Error updating transaction status: ${err.message}`, 'error');
        logToConsole(err.stack, 'error');
    }
    scrollToConsole();
}
