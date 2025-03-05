window.handleFetchBalance = async function(e) {
    e.preventDefault();
    const addressInput = document.getElementById('balanceAddressInput');
    if (!addressInput) return;
    const address = addressInput.value.trim();
    if (!address) {
        showStatus('Please enter an address.', 'error', 'balance-status');
        return;
    }
    showStatus('Fetching address balance...', 'loading', 'balance-status');

    try {
        const res = await fetch(`/balance/${address}`);
        const data = await res.json();
        if (data.success) {
            if (data.overledgerReq?.headers?.authorization) {
                data.overledgerReq.headers.authorization = trimBearer(
                    data.overledgerReq.headers.authorization
                );
            }
            logToConsole('Reading address balance from Overledger...', 'info');
            logToConsole(
                `Overledger Request:\n${JSON.stringify(data.overledgerReq, null, 2)}`,
                'request'
            );
            logToConsole(
                `Overledger Response:\n${JSON.stringify(data.overledgerRes, null, 2)}`,
                'response'
            );

            const balData = data.overledgerRes.executionAddressBalanceSearchResponse;
            if (balData?.balances?.length) {
                const b = balData.balances[0];
                document.getElementById('balance-result').innerHTML = `
                    <div class="balance-display">
                        <p><strong>Balance:</strong> ${b.amount} ${b.unit}</p>
                        <p><strong>Address:</strong> ${balData.addressId}</p>
                        <p><strong>Timestamp:</strong> ${new Date(parseInt(balData.timestamp) * 1000).toLocaleString()}</p>
                    </div>
                `;
                showStatus('Balance fetched successfully!', 'success', 'balance-status');
            } else {
                showStatus('Unexpected balance data.', 'error', 'balance-status');
            }
        } else {
            showStatus(`Error: ${data.error}`, 'error', 'balance-status');
            logToConsole(`Error fetching balance: ${data.error}`, 'error');
        }
    } catch (err) {
        showStatus('Error fetching balance.', 'error', 'balance-status');
        logToConsole(err.message, 'error');
    }
    scrollToConsole();
};
