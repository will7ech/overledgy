document.addEventListener('DOMContentLoaded', () => {
    logToConsole('Application initialized. Ready to rumble!', 'info');

    // Detect if a wallet is loaded (server .env or user import)
    const loadedSection = document.getElementById('walletLoadedSection');
    const loadedSectionStyle = window.getComputedStyle(loadedSection);
    window.hasLocalWallet = (loadedSectionStyle.display !== 'none');

    if (window.hasLocalWallet) {
        const addrSpan = document.getElementById('currentWalletAddress');
        if (addrSpan) {
            window.currentWalletAddress = addrSpan.textContent.trim();
        }
    }

    // Pre-populate the fetchBalance field with known wallet address
    if (window.currentWalletAddress) {
        const balInput = document.getElementById('balanceAddressInput');
        if (balInput && !balInput.value) {
            balInput.value = window.currentWalletAddress;
        }
    }

    // Auth
    document.getElementById('getAuthTokenBtn')?.addEventListener('click', getAuthToken);
    document.getElementById('copyAuthTokenBtn')?.addEventListener('click', copyAuthToken);

    // Balance
    document.getElementById('balanceForm')?.addEventListener('submit', handleFetchBalance);

    // Todo
    document.getElementById('addTodoForm')?.addEventListener('submit', handleAddTodo);
    document.getElementById('fetchTodosBtn')?.addEventListener('click', fetchTodos);

    // Console clear button
    document.getElementById('clearConsoleBtn')?.addEventListener('click', () => {
        const loggerEl = document.getElementById('consologger');
        if (loggerEl) {
            loggerEl.innerHTML = '';
        }
        logToConsole('Console cleared.', 'info');
    });

    // Wallet import
    const importWalletBtn = document.getElementById('importWalletBtn');
    if (importWalletBtn) {
        importWalletBtn.addEventListener('click', async () => {
            const phraseInput = document.getElementById('recoveryPhraseInput');
            if (!phraseInput) return;
            const phrase = phraseInput.value.trim();
            if (!phrase) {
                showStatus('Please enter a recovery phrase.', 'error', 'wallet-status');
                return;
            }
            showStatus('Importing wallet...', 'loading', 'wallet-status');
            try {
                const res = await fetch('/wallet/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ recoveryPhrase: phrase })
                });
                const data = await res.json();
                if (data.success) {
                    window.hasLocalWallet = true;
                    window.currentWalletAddress = data.address;

                    showStatus(`Wallet loaded on server: ${data.address}`, 'success', 'wallet-status');
                    logToConsole(`Wallet loaded. Address: ${data.address}`, 'info');

                    // Hide import form
                    const noWalletSec = document.getElementById('noWalletSection');
                    if (noWalletSec) noWalletSec.style.display = 'none';

                    // Show the walletLoadedSection
                    const wls = document.getElementById('walletLoadedSection');
                    if (wls) wls.style.display = '';
                    const currAddr = document.getElementById('currentWalletAddress');
                    if (currAddr) {
                        currAddr.textContent = data.address;
                    }

                    // Prepopulate fetchBalance
                    const balInput = document.getElementById('balanceAddressInput');
                    if (balInput) {
                        balInput.value = data.address;
                    }

                    // Re-check buttons
                    updateButtonStates(getCurrentAuthToken());
                } else {
                    showStatus(`Error: ${data.error}`, 'error', 'wallet-status');
                    logToConsole(data.error, 'error');
                }
            } catch (err) {
                showStatus(`Wallet import failed: ${err.message}`, 'error', 'wallet-status');
                logToConsole(err.stack, 'error');
            }
            scrollToConsole();
        });
    }

    // Mode switch icons
    document.querySelectorAll('.mode-switch-icon').forEach(icon => {
        icon.addEventListener('click', () => toggleSectionMode(icon));
    });

    // If there's already a token in the page
    const existingToken = (document.getElementById('currentToken')?.value || '').trim();
    updateButtonStates(existingToken);
});
