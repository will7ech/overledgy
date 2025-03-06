window.transactionList = [];

/**
 * Add a new card to the Transactions container.
 *
 * @param {string} txId     - The transaction hash/ID.
 * @param {string} status   - The initial status (e.g. 'PENDING' or 'SUCCESSFUL').
 * @param {string} localAction - A custom label describing our app's action (e.g. 'addTodo').
 */
window.addTransactionCard = function(txId, status, localAction) {
    const container = document.getElementById('transactionsContainer');
    if (!container) return;

    // Remove placeholder if it's still there
    const placeholder = document.getElementById('transaction-placeholder');
    if (placeholder) {
        placeholder.remove();
    }

    const now = new Date().toLocaleTimeString();

    // Create the card
    const card = document.createElement('div');
    card.className = 'transaction-card';

    // Time
    const timeEl = document.createElement('p');
    timeEl.className = 'transaction-time';
    timeEl.innerHTML = `<strong>Time</strong>: ${now}`;
    card.appendChild(timeEl);

    // Local "Action"
    const actionEl = document.createElement('p');
    actionEl.className = 'transaction-action';
    actionEl.innerHTML = `<strong>Action</strong>: ${localAction || 'N/A'}`;
    card.appendChild(actionEl);

    // Overledger Type - initially hidden until we know it
    const olTypeEl = document.createElement('p');
    olTypeEl.className = 'transaction-oltype';
    olTypeEl.style.display = 'none'; // hidden at first
    card.appendChild(olTypeEl);

    // Transaction ID
    const txEl = document.createElement('p');
    txEl.className = 'transaction-id';
    txEl.innerHTML = `<strong>Transaction ID</strong>: ${getEtherscanLink(txId)}`;
    card.appendChild(txEl);

    // Status
    const statusEl = document.createElement('p');
    statusEl.className = 'transaction-status';
    statusEl.innerHTML = `<strong>Status</strong>: ${status || 'UNKNOWN'}`;
    card.appendChild(statusEl);

    // Smart Contract Address row - hidden until we discover it
    const scAddrEl = document.createElement('p');
    scAddrEl.className = 'transaction-sc-addr';
    scAddrEl.style.display = 'none';
    card.appendChild(scAddrEl);

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
            // If the transaction is not fully successful, re-enable the button
            const currentStatus = card.querySelector('.transaction-status')?.textContent || '';
            if (!currentStatus.includes('SUCCESSFUL')) {
                btnUpdate.disabled = false;
                btnUpdate.textContent = originalText;
            }
        }
    });
    card.appendChild(btnUpdate);

    container.appendChild(card);

    // Keep track in an array if needed
    window.transactionList.push({
        time: now,
        txId,
        status,
        localAction
    });
};

/**
 * Called when the user clicks "Update Status" on a transaction card.
 * We fetch Overledger's transaction info and update the card accordingly.
 */
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

        // Log the Overledger request/response
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

        // The Overledger Type is found at executionTransactionSearchResponse.type
        const overledgerType = data.overledgerRes?.executionTransactionSearchResponse?.type || null;

        // The actual Overledger status is in .status.value
        const newStatus =
            data.overledgerRes?.executionTransactionSearchResponse?.status?.value || 'UNKNOWN';

        // Update the status text
        const statusEl = card.querySelector('.transaction-status');
        if (statusEl) {
            statusEl.innerHTML = `<strong>Status</strong>: ${newStatus}`;
        }

        // If Overledger type is known, display it
        if (overledgerType) {
            const typeEl = card.querySelector('.transaction-oltype');
            if (typeEl) {
                typeEl.innerHTML = `<strong>Type</strong>: ${overledgerType}`;
                typeEl.style.display = 'block';
            }
        }

        // If the status is SUCCESSFUL, visually mark the card and remove the update button
        if (newStatus === 'SUCCESSFUL') {
            card.classList.add('transaction-successful');
            const updateBtn = card.querySelector('.transaction-update-btn');
            if (updateBtn) {
                updateBtn.remove();
            }
        }

        // Now check if it's a CONTRACT_CREATION & we discovered a contract address
        if (overledgerType === 'CONTRACT_CREATION') {
            // Try nativeData.creates first
            let createdAddr =
                data.overledgerRes?.executionTransactionSearchResponse?.transaction?.nativeData
                    ?.creates;

            if (!createdAddr || createdAddr === 'null') {
                // Fallback: check the transaction destination's smartContractId
                const destinations =
                    data.overledgerRes?.executionTransactionSearchResponse?.transaction?.destination;
                if (Array.isArray(destinations) && destinations.length > 0) {
                    const sc = destinations[0].smartContract;
                    if (sc && sc.smartContractId) {
                        createdAddr = sc.smartContractId;
                    }
                }
            }

            if (createdAddr && createdAddr !== 'null') {
                // Show the Smart Contract Address line
                const scAddrEl = card.querySelector('.transaction-sc-addr');
                if (scAddrEl) {
                    scAddrEl.innerHTML = `<strong>Smart Contract Address</strong>: ${createdAddr}`;
                    scAddrEl.style.display = 'block';
                }

                // If we haven't set a contract for the to-do list, auto-populate
                const currentAddrSpan = document.getElementById('currentContractAddressSpan');
                const currentAddrText = currentAddrSpan ? currentAddrSpan.textContent.trim() : '';
                if (!currentAddrText || currentAddrText === 'none') {
                    const setContractInput = document.getElementById('manualContractAddressInput');
                    if (setContractInput) {
                        setContractInput.value = createdAddr;
                    }
                    logToConsole(
                        `Detected a newly created smart contract address (${createdAddr}), putting it into the input field.`,
                        'info'
                    );
                } else {
                    logToConsole(
                        `Detected a newly created smart contract address. We already have an active contract, but here's the new address: ${createdAddr}`,
                        'info'
                    );
                }
            }
        }

        showStatus(`Transaction status updated to ${newStatus}`, 'success');
    } catch (err) {
        showStatus(`Error updating transaction status: ${err.message}`, 'error');
        logToConsole(err.stack, 'error');
    }
    scrollToConsole();
}
