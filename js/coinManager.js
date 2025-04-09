class CoinManager {
    constructor() {
        this.storageKey = 'gameCoins';
    }

    saveCoins(amount) {
        localStorage.setItem(this.storageKey, amount.toString());
    }

    loadCoins() {
        const savedCoins = localStorage.getItem(this.storageKey);
        return savedCoins ? parseInt(savedCoins) : 0;
    }

    clearCoins() {
        localStorage.removeItem(this.storageKey);
    }
}
