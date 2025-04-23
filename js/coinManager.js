class CurrencyManager {
    constructor() {
        this.coinsKey = 'gameCoins';
        this.shardsKey = 'gameShards';
    }

    saveCoins(amount) {
        localStorage.setItem(this.coinsKey, amount.toString());
    }

    saveShards(amount) {
        localStorage.setItem(this.shardsKey, amount.toString());
    }

    loadCoins() {
        const savedCoins = localStorage.getItem(this.coinsKey);
        return savedCoins ? parseInt(savedCoins) : 0;
    }

    loadShards() {
        const savedShards = localStorage.getItem(this.shardsKey);
        return savedShards ? parseInt(savedShards) : 0;
    }

    clearCurrency() {
        localStorage.removeItem(this.coinsKey);
        localStorage.removeItem(this.shardsKey);
    }
}
