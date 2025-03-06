document.addEventListener('DOMContentLoaded', () => {
    const deployForm = document.getElementById('deployContractForm');
    if (!deployForm) return;

    deployForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const bytecode = document.getElementById('bytecodeInput')?.value.trim();
        const deployBtn = document.getElementById('deployContractBtn');
        if (!bytecode || !deployBtn) {
            showStatus('Please provide contract bytecode.', 'error', 'deploy-status');
            return;
        }

        // Disable & show "Deploying..."
        const originalText = deployBtn.textContent;
        deployBtn.disabled = true;
        deployBtn.textContent = 'Deploying...';
        showStatus('Preparing contract deployment...', 'loading', 'deploy-status');

        try {
            const res = await fetch('/deploy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bytecode })
            });
            const data = await res.json();

            // Log status code if not 200
            logToConsole(`Response status: ${res.status}`, 'info');

            if (!res.ok || !data.success) {
                // If there's an error, we might still have partial logs
                if (data.calls) {
                    data.calls.forEach(call => {
                        if (call.request?.headers?.Authorization) {
                            call.request.headers.Authorization = trimBearer(
                                call.request.headers.Authorization
                            );
                        }
                        logToConsole(
                            `Overledger Request:\n${JSON.stringify(call.request, null, 2)}`,
                            'request'
                        );
                        if (call.errorResponse) {
                            logToConsole(
                                `Overledger Error Response:\n${JSON.stringify(call.errorResponse, null, 2)}`,
                                'error'
                            );
                        } else {
                            logToConsole(
                                `Overledger Response:\n${JSON.stringify(call.response, null, 2)}`,
                                'response'
                            );
                        }
                    });
                }
                showStatus(`Error deploying contract: ${data.error || 'Unknown'}`, 'error', 'deploy-status');
                logToConsole(data.error || 'Deploy error', 'error');
                return;
            }

            // We have success & full logs
            data.calls.forEach(call => {
                if (call.request.headers?.Authorization) {
                    call.request.headers.Authorization = trimBearer(call.request.headers.Authorization);
                }

                if (call.request.url.includes('deployments/smart-contracts')) {
                    logToConsole('Preparing contract deployment via Overledger...', 'info');
                } else if (call.request.url.includes('executions/deployments')) {
                    logToConsole('Executing signed deployment on Overledger...', 'info');
                } else if (call.request.url.includes('search/transaction')) {
                    logToConsole('Checking deployment status from Overledger...', 'info');
                }

                if (call.errorResponse) {
                    logToConsole(
                        `Overledger Error Response:\n${JSON.stringify(call.errorResponse, null, 2)}`,
                        'error'
                    );
                } else {
                    logToConsole(
                        `Overledger Response:\n${JSON.stringify(call.response, null, 2)}`,
                        'response'
                    );
                }
            });

            // Add to Transactions (card)
            if (window.addTransactionCard && data.transactionId) {
                window.addTransactionCard(data.transactionId, data.status, 'deploySmartContract');
            }

            // Show status & handle contract address
            if (data.contractAddress) {
                // We already have an address from the server
                showStatus(`Contract deployed @ ${data.contractAddress}`, 'success', 'deploy-status');
                logToConsole(`Deployed at: ${data.contractAddress}`, 'info');
                window.updateContractAddressUI(data.contractAddress);
            } else {
                // No contractAddress returned from the server
                showStatus(`Contract deployment TX: ${data.transactionId}`, 'success', 'deploy-status');
                logToConsole(`Deployment Tx: ${getEtherscanLink(data.transactionId)}`, 'info');

                // Try to find "creates" from the Overledger calls
                let foundCreates = null;
                data.calls.forEach(call => {
                    const c = call.response?.executionTransactionSearchResponse
                        ?.transaction?.nativeData?.creates;
                    if (!foundCreates && c && c !== 'null') {
                        foundCreates = c;
                    }
                });

                if (foundCreates) {
                    // Check if we have already set a contract in the UI
                    const currentAddrSpan = document.getElementById('currentContractAddressSpan');
                    const currentAddrText = currentAddrSpan
                        ? currentAddrSpan.textContent.trim()
                        : '';

                    if (!currentAddrText || currentAddrText === 'none') {
                        // If not set, paste the new contract into the input field
                        const setContractInput = document.getElementById('manualContractAddressInput');
                        if (setContractInput) {
                            setContractInput.value = foundCreates;
                        }
                        logToConsole(`The contract address is ${foundCreates} and was pasted into the contract address input field.`, 'info');
                    } else {
                        // Already have an active contract
                        logToConsole(`You already set an active contract for the todo list. If needed, here's the newly deployed address: ${foundCreates}`, 'info');
                    }
                } else {
                    // We really don't have a known contract address yet
                    logToConsole('Contract address not yet known. Check transaction status later.', 'warning');
                }
            }

            // Reset form
            deployForm.reset();
        } catch (err) {
            showStatus('Error deploying contract.', 'error', 'deploy-status');
            logToConsole(err.stack, 'error');
        } finally {
            // Re-enable and revert text
            deployBtn.disabled = false;
            deployBtn.textContent = originalText;
            scrollToConsole();
        }
    });
});
