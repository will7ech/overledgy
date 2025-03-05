window.showStatus = function(message, type, elementId = 'transaction-status') {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerHTML = `<p>${message}</p>`;
    el.className = `status-${type}`;
    setTimeout(() => {
        el.innerHTML = '';
        el.className = '';
    }, 5000);
};

window.trimBearer = function(token) {
    if (!token || !token.startsWith('Bearer ')) return token;
    const raw = token.slice(7);
    if (raw.length <= 14) return token;
    return `Bearer ${raw.slice(0, 5)}... ...${raw.slice(-5)}`;
};

window.getEtherscanLink = function(txHash) {
    return `<a href="https://sepolia.etherscan.io/tx/${txHash}" target="_blank">${txHash}</a>`;
};

window.toggleSectionMode = function(icon) {
    const card = icon.closest('.card');
    if (!card) return;
    const playMode = card.querySelector('.play-mode');
    const infoMode = card.querySelector('.info-mode');
    const playTitle = card.querySelector('.play-mode-title');
    const infoTitle = card.querySelector('.info-mode-title');

    if (playMode.classList.contains('open')) {
        playMode.classList.remove('open');
        infoMode.classList.add('open');
        playTitle.style.display = 'none';
        infoTitle.style.display = 'block';
        icon.src = '/assets/images/icon-pizza.png';
    } else {
        playMode.classList.add('open');
        infoMode.classList.remove('open');
        playTitle.style.display = 'block';
        infoTitle.style.display = 'none';
        icon.src = '/assets/images/icon-question.png';
    }
};
