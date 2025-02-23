class MenuManager {
    constructor(game) {
        // ...existing code...
        this.shopManager = new ShopManager(game);
    }

    handleShop() {
        const shopMenu = this.loadMenu('shop');
        this.currentMenu = 'shop';
        
        // Add coin balance to the menu
        shopMenu.title = `Shop (Coins: ${this.shopManager.getCoinBalance()})`;
        
        this.renderMenu(shopMenu);
        this.game.audio.play('menu_select');
    }

    handleMenuSelection(option) {
        switch(this.currentMenu) {
            // ...existing code...
            case 'main':
                switch(option) {
                    // ...existing code...
                    case 'Shop':
                        this.handleShop();
                        break;
                    // ...existing code...
                }
                break;
            case 'shop':
                if (option === 'Back') {
                    this.showMainMenu();
                }
                break;
            // ...existing code...
        }
    }
}
