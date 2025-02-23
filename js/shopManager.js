class ShopManager {
    constructor(engine) {
        this.engine = engine;
        this.shopItems = [
            { id: 'skin_1', name: 'Hero Skin 1', price: 50, type: 'skin', description: 'ITEM_SKIN_1' },
            { id: 'skin_2', name: 'Golden Hero', price: 100, type: 'skin', description: 'ITEM_SKIN_2' },
            { id: 'speed_1', name: 'Speed Boost', price: 75, type: 'upgrade', description: 'ITEM_SPEED_1' },
            { id: 'key_1', name: 'Spare Key', price: 30, type: 'consumable', description: 'ITEM_KEY_1' }
        ];
        this.messages = {
            enterance: [],
            buy: [],
            no_money: [],
            random: [],
            random2: []
        };
        this.currentMessage = '';
        this.messageTimeout = null;
        this.shopkeeperState = 'idle';
        this.loadMessages();
    }

    async loadMessages() {
        try {
            const response = await fetch('./assets/message.txt');
            const text = await response.text();
            
            let currentCategory = '';
            let collecting = false;
            let messages = [];

            text.split('\n').forEach(line => {
                line = line.trim();
                if (line.includes(':')) {
                    if (collecting) {
                        this.messages[currentCategory] = messages;
                        messages = [];
                    }
                    currentCategory = line.split(':')[0].trim();
                    collecting = true;
                } else if (collecting && line && line !== '{' && line !== '}' && line !== ',') {
                    // Remove quotes and commas from messages
                    messages.push(line.replace(/["']/g, '').replace(/,$/, '').trim());
                }
            });

            // Add the last category
            if (collecting) {
                this.messages[currentCategory] = messages;
            }
        } catch (error) {
            console.error('Failed to load shop messages:', error);
        }
    }

    showMessage(type) {
        const messageArray = this.messages[type] || this.messages.random;
        const randomMessage = messageArray[Math.floor(Math.random() * messageArray.length)];
        this.currentMessage = randomMessage;
        this.shopkeeperState = 'talk';

        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }

        this.messageTimeout = setTimeout(() => {
            this.shopkeeperState = 'idle';
            // Show random messages occasionally
            if (Math.random() < 0.3) {  // 30% chance
                this.showMessage(Math.random() < 0.5 ? 'random' : 'random2');
            }
        }, 3000);
    }

    purchaseItem(item) {
        if (this.engine.levelManager.inventory.coins >= item.price) {
            this.engine.levelManager.inventory.coins -= item.price;
            this.handleItemEffect(item);
            this.showMessage('buy');
            this.engine.audio.synthesizer.playSoundEffect('purchase');
            return true;
        } else {
            this.showMessage('no_money');
            return false;
        }
    }

    handleItemEffect(item) {
        switch(item.type) {
            case 'skin':
                // Apply skin change
                break;
            case 'upgrade':
                if (item.id === 'speed_1') {
                    this.engine.levelManager.moveSpeed = Math.max(100, this.engine.levelManager.moveSpeed - 25);
                }
                break;
            case 'consumable':
                if (item.id === 'key_1') {
                    this.engine.levelManager.inventory.keys++;
                }
                break;
        }
    }

    drawShop() {
        const ctx = this.engine.ctx;
        const width = this.engine.canvas.width;
        const height = this.engine.canvas.height;

        // Draw shop background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, width, height);

        // Draw shopkeeper
        const shopkeeperSize = 100;
        this.engine.pixelSprites.drawSprite(
            'shopkeeper',
            width / 2,
            150,
            shopkeeperSize,
            shopkeeperSize,
            this.shopkeeperState
        );

        // Draw message
        if (this.currentMessage) {
            ctx.font = '24px Arial';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText(this.currentMessage, width / 2, 250);
        }

        // Draw items
        const itemWidth = 200;
        const itemHeight = 100;
        const padding = 20;
        const startY = 300;

        this.shopItems.forEach((item, index) => {
            const x = width / 2 - itemWidth / 2;
            const y = startY + (itemHeight + padding) * index;

            // Draw item background
            ctx.fillStyle = '#4a1a8c';
            ctx.fillRect(x, y, itemWidth, itemHeight);
            ctx.strokeStyle = '#b66dff';
            ctx.strokeRect(x, y, itemWidth, itemHeight);

            // Draw item info
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'left';
            ctx.font = '20px Arial';
            ctx.fillText(item.name, x + 10, y + 30);
            ctx.fillText(`${item.price} coins`, x + 10, y + 60);

            // Draw buy button if affordable
            if (this.engine.levelManager.inventory.coins >= item.price) {
                ctx.fillStyle = '#4CAF50';
                const buttonWidth = 60;
                const buttonX = x + itemWidth - buttonWidth - 10;
                const buttonY = y + itemHeight - 40;
                ctx.fillRect(buttonX, buttonY, buttonWidth, 30);
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.fillText('Buy', buttonX + buttonWidth/2, buttonY + 20);
            }
        });
    }

    handleClick(x, y) {
        const startY = 300;
        const itemWidth = 200;
        const itemHeight = 100;
        const padding = 20;
        const centerX = this.engine.canvas.width / 2 - itemWidth / 2;

        this.shopItems.forEach((item, index) => {
            const itemY = startY + (itemHeight + padding) * index;
            const buttonX = centerX + itemWidth - 70;
            const buttonY = itemY + itemHeight - 40;

            if (x >= buttonX && x <= buttonX + 60 &&
                y >= buttonY && y <= buttonY + 30) {
                this.purchaseItem(item);
            }
        });
    }
}
