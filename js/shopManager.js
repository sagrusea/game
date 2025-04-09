class ShopManager {
    constructor(engine) {
        this.engine = engine;
        this.items = [];
        this.categories = [];
        this.selectedCategory = null;
        this.shopOverlay = document.getElementById('shopOverlay');
        this.shopContent = document.getElementById('shopContent');
        this.loadShopItems();
    }

    async loadShopItems() {
        try {
            const response = await fetch('./assets/items/items.json');
            const data = await response.json();
            this.items = data.items;
            this.categories = [...new Set(this.items.map(item => item.category))];
            this.selectedCategory = this.categories[0];
            this.renderShop();
        } catch (error) {
            console.error('Failed to load shop items:', error);
        }
    }

    renderShop() {
        this.shopContent.innerHTML = '';
        const itemsToShow = this.items.filter(item => item.category === this.selectedCategory);

        // Create a temporary canvas for rendering sprites
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        itemsToShow.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'shop-item';

            // Add sprite using canvas
            const spriteCanvas = document.createElement('canvas');
            spriteCanvas.width = 64;
            spriteCanvas.height = 64;
            spriteCanvas.className = 'shop-item-sprite';
            itemElement.appendChild(spriteCanvas);

            // Draw the sprite on the canvas in a requestAnimationFrame to ensure assets are loaded
            requestAnimationFrame(() => {
                this.engine.pixelSprites.drawSprite(item.sprite || 'coin', 0, 0, 64, 64, 'idle', spriteCanvas);
            });

            // Add name
            const name = document.createElement('div');
            name.className = 'shop-item-name';
            name.textContent = item.name;
            itemElement.appendChild(name);

            // Add price
            const price = document.createElement('div');
            price.className = 'shop-item-price';
            price.textContent = `${item.price} coins`;
            itemElement.appendChild(price);

            // Add buy button
            const buyButton = document.createElement('button');
            buyButton.className = 'shop-item-buy';
            buyButton.textContent = 'Buy';
            buyButton.onclick = () => this.buyItem(item);
            itemElement.appendChild(buyButton);

            this.shopContent.appendChild(itemElement);
        });
    }

    drawShop() {
        if (!this.engine.levelManager || !this.engine.inventory) {
            console.error('Shop opened before game initialization');
            return;
        }

        // Draw semi-transparent background
        this.engine.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.engine.ctx.fillRect(0, 0, this.engine.canvas.width, this.engine.canvas.height);

        // Draw shop title
        this.engine.ctx.save();
        this.engine.ctx.fillStyle = '#fff';
        this.engine.ctx.font = 'bold 32px Arial';
        this.engine.ctx.textAlign = 'center';
        this.engine.ctx.fillText('Shop', this.engine.canvas.width / 2, 50);
        this.engine.ctx.restore();

        // Only call renderShop if not already rendered
        if (!this.shopContent.children.length) {
            this.renderShop();
        }
    }

    buyItem(item) {
        if (this.engine.spendCoins(item.price)) {
            console.log(`Bought item: ${item.name}`);
            // Handle item purchase logic here
        } else {
            console.log('Not enough coins');
        }
    }

    handleClick(x, y) {
        // Handle shop item clicks here
    }

    showMessage(message) {
        console.log(message);
    }
}
