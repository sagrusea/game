class ShopManager {
    constructor(game) {
        this.game = game;
        this.items = [];
        this.coins = 0;
    }

    getAvailableItems() {
        return this.items;
    }

    getCoinBalance() {
        return this.coins;
    }

    purchase(itemId) {
        // To be implemented
    }
}
