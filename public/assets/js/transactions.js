window.transactionList = [];

// Add a new card to the Transactions container
window.addTransactionCard = function(txId, status, txType) {
    const container = document.getElementById('transactionsContainer');
    if (!container) return;

    // Remove placeholder if it's still there
    const placeholder = document.getElementById('transaction-placeholder');
    if (placeholder) {
        placeholder.remove();
    }

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

    // Tx ID (make it a link to Etherscan)
    const txEl = document.createElement('p');
    txEl.className = 'transaction-id';
    txEl.innerHTML = `Transaction ID: ${getEtherscanLink(txId)}`;
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
        // Disable & set text to "Checking..."
        const originalText = btnUpdate.textContent;
        btnUpdate.disabled = true;
        btnUpdate.textContent = 'Checking...';

        try {
            await updateTransactionStatus(card, txId);
        } finally {
            // Re-enable & revert text only if status is not SUCCESSFUL
            const currentStatus = card.querySelector('.transaction-status')?.textContent || '';
            if (!currentStatus.includes('SUCCESSFUL')) {
                btnUpdate.disabled = false;
                btnUpdate.textContent = originalText;
            }
        }
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

        // The actual status is in executionTransactionSearchResponse.status.value
        const newStatus =
            data.overledgerRes?.executionTransactionSearchResponse?.status?.value || 'UNKNOWN';

        // Update the status text in the card
        const statusEl = card.querySelector('.transaction-status');
        if (statusEl) {
            statusEl.textContent = `Status: ${newStatus}`;
        }

        // If the status is SUCCESSFUL, add a special classname & remove the update button
        if (newStatus === 'SUCCESSFUL') {
            card.classList.add('transaction-successful');
            const updateBtn = card.querySelector('.transaction-update-btn');
            if (updateBtn) {
                updateBtn.remove();
            }
        }

        // If we see a 'creates' field => it's a deployed contract
        const creates =
            data.overledgerRes?.executionTransactionSearchResponse?.transaction?.nativeData?.creates;
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
