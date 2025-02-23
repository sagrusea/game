class ShopManager {
    constructor(engine) {
        this.engine = engine;
        this.categories = [];  // Initialize empty categories array
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
        this.loadShopItems();  // Load items when created
        this.shopkeeperPos = { x: 150, y: 150 }; // Position for shopkeeper
        this.shopkeeperSize = 120; // Size of shopkeeper sprite
        this.messageBox = {
            width: 300,
            height: 80,
            padding: 10
        };
        this.backgroundItems = [
            { sprite: 'torch', x: 100, y: 100, size: 60 },
            { sprite: 'torch', x: -1, y: 100, size: 60 },
            { sprite: 'crystal', x: 80, y: 300, size: 40 },
            { sprite: 'crystal', x: -1, y: 500, size: 40 },
            { sprite: 'vines', x: 50, y: 200, size: 40 },
            { sprite: 'vines', x: -1, y: 400, size: 40 }
        ];
        this.lastUpdateTime = Date.now();
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

    async loadShopItems() {
        try {
            const response = await fetch('./assets/shop/shop.json');
            const data = await response.json();
            this.categories = data.categories;
            console.log('Shop items loaded:', this.categories);
        } catch (error) {
            console.error('Failed to load shop items:', error);
            this.categories = [];
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
        // Ensure levelManager and inventory exist
        if (!this.engine.levelManager || !this.engine.levelManager.inventory) {
            console.error('Cannot purchase item - inventory not initialized');
            return false;
        }

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
        const time = Date.now() / 1000;

        // Draw gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#2d1054');
        gradient.addColorStop(1, '#1a0a33');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Draw decorative patterns
        this.drawPatterns(ctx, width, height, time);

        // Draw animated background items
        this.drawBackgroundItems(time);

        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, width, height);

        // Draw magic particles
        this.drawParticles(time);

        // Draw shopkeeper
        this.engine.pixelSprites.drawSprite(
            'shopkeeper',
            this.shopkeeperPos.x,
            this.shopkeeperPos.y,
            this.shopkeeperSize,
            this.shopkeeperSize,
            this.shopkeeperState
        );

        // Draw message box if there's a message
        if (this.currentMessage) {
            this.drawMessageBox();
        }

        // Draw shop title
        ctx.font = 'bold 48px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText('Shop', width / 2, 60);

        // Draw coins - with safe access to inventory
        const coins = (this.engine.levelManager?.inventory?.coins || 0);
        ctx.font = '24px Arial';
        ctx.fillText(`Coins: ${coins}`, width / 2, 100);

        // Only draw categories if they exist
        if (this.categories && this.categories.length > 0) {
            let startY = 150;
            this.categories.forEach((category, index) => {
                // Category header
                ctx.font = 'bold 32px Arial';
                ctx.fillStyle = '#b66dff';
                ctx.fillText(category.name, width / 2, startY);

                // Draw items in this category
                startY = this.drawCategoryItems(category, startY + 50);
                startY += 40; // Space between categories
            });
        } else {
            // Draw loading message or error state
            ctx.font = '24px Arial';
            ctx.fillStyle = '#fff';
            ctx.fillText('Loading shop items...', width / 2, height / 2);
        }

        // Draw back button
        this.drawBackButton();
    }

    drawPatterns(ctx, width, height, time) {
        // Draw hexagonal pattern
        ctx.strokeStyle = 'rgba(138, 43, 226, 0.1)';
        ctx.lineWidth = 2;
        const hexSize = 100;
        const rows = Math.ceil(height / (hexSize * 1.5));
        const cols = Math.ceil(width / (hexSize * 2));

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = col * hexSize * 2 + (row % 2) * hexSize;
                const y = row * hexSize * 1.5;
                this.drawHexagon(ctx, x, y, hexSize + Math.sin(time + row + col) * 5);
            }
        }
    }

    drawHexagon(ctx, x, y, size) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = i * Math.PI / 3;
            const px = x + size * Math.cos(angle);
            const py = y + size * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
    }

    drawBackgroundItems(time) {
        this.backgroundItems.forEach(item => {
            const x = item.x === -1 ? this.engine.canvas.width - item.size : item.x;
            const y = item.y + Math.sin(time + item.y * 0.01) * 5;
            let frame = 'idle';
            
            if (item.sprite === 'torch') {
                frame = Math.floor(time * 4) % 2 === 0 ? 'idle' : 'flicker';
            } else if (item.sprite === 'crystal') {
                frame = Math.floor(time * 4) % 2 === 0 ? 'idle' : 'glow';
            }

            this.engine.pixelSprites.drawSprite(
                item.sprite,
                x,
                y,
                item.size,
                item.size,
                frame
            );
        });
    }

    drawParticles(time) {
        const ctx = this.engine.ctx;
        ctx.save();
        ctx.fillStyle = 'rgba(138, 43, 226, 0.3)';
        
        for (let i = 0; i < 50; i++) {
            const x = (Math.sin(time + i) * 0.5 + 0.5) * this.engine.canvas.width;
            const y = (Math.cos(time * 0.5 + i * 0.1) * 0.5 + 0.5) * this.engine.canvas.height;
            const size = 2 + Math.sin(time + i) * 2;
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    drawMessageBox() {
        const ctx = this.engine.ctx;
        const x = this.shopkeeperPos.x + this.shopkeeperSize;
        const y = this.shopkeeperPos.y;
        const { width, height, padding } = this.messageBox;

        // Draw message box background with gradient
        const gradient = ctx.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, '#4a1a8c');
        gradient.addColorStop(1, '#6a2a9c');
        
        ctx.fillStyle = gradient;
        ctx.strokeStyle = '#b66dff';
        ctx.lineWidth = 2;

        // Draw box with rounded corners
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 10);
        ctx.fill();
        ctx.stroke();

        // Draw message text
        ctx.font = '16px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Word wrap the message
        const words = this.currentMessage.split(' ');
        let line = '';
        let lineY = y + padding + 10;
        const maxWidth = width - padding * 2;

        words.forEach(word => {
            const testLine = line + word + ' ';
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth) {
                ctx.fillText(line, x + padding, lineY);
                line = word + ' ';
                lineY += 20;
            } else {
                line = testLine;
            }
        });
        ctx.fillText(line, x + padding, lineY);
    }

    drawCategoryItems(category, startY) {
        const ctx = this.engine.ctx;
        const width = this.engine.canvas.width;
        const itemWidth = 280;
        const itemHeight = 120;
        const itemsPerRow = 3;
        const padding = 20;
        const startX = (width - (itemWidth * itemsPerRow + padding * (itemsPerRow - 1))) / 2;

        category.items.forEach((item, index) => {
            const row = Math.floor(index / itemsPerRow);
            const col = index % itemsPerRow;
            const x = startX + col * (itemWidth + padding);
            const y = startY + row * (itemHeight + padding);

            // Item background
            const isAffordable = this.engine.levelManager.inventory.coins >= item.price;
            const gradient = ctx.createLinearGradient(x, y, x, y + itemHeight);
            gradient.addColorStop(0, isAffordable ? '#4a1a8c' : '#333');
            gradient.addColorStop(1, isAffordable ? '#6a2a9c' : '#444');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, itemWidth, itemHeight);
            ctx.strokeStyle = isAffordable ? '#b66dff' : '#666';
            ctx.strokeRect(x, y, itemWidth, itemHeight);

            // Item name
            ctx.font = 'bold 20px Arial';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'left';
            ctx.fillText(item.name, x + 10, y + 30);

            // Item description
            ctx.font = '16px Arial';
            ctx.fillStyle = '#ccc';
            ctx.fillText(item.description, x + 10, y + 55);

            // Price
            ctx.font = 'bold 20px Arial';
            ctx.fillStyle = isAffordable ? '#4CAF50' : '#666';
            ctx.fillText(`${item.price} coins`, x + 10, y + itemHeight - 20);

            // Buy button if affordable
            if (isAffordable) {
                const buttonWidth = 80;
                const buttonHeight = 30;
                const buttonX = x + itemWidth - buttonWidth - 10;
                const buttonY = y + itemHeight - buttonHeight - 10;

                // Button background
                ctx.fillStyle = '#4CAF50';
                ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

                // Button text
                ctx.font = '18px Arial';
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.fillText('Buy', buttonX + buttonWidth/2, buttonY + 20);
            }
        });

        return startY + Math.ceil(category.items.length / itemsPerRow) * (itemHeight + padding);
    }

    drawBackButton() {
        const ctx = this.engine.ctx;
        const buttonWidth = 100;
        const buttonHeight = 40;
        const x = this.engine.canvas.width - buttonWidth - 20;
        const y = 20;

        // Button background
        ctx.fillStyle = '#6a2a9c';
        ctx.fillRect(x, y, buttonWidth, buttonHeight);
        ctx.strokeStyle = '#b66dff';
        ctx.strokeRect(x, y, buttonWidth, buttonHeight);

        // Button text
        ctx.font = '20px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText('Back', x + buttonWidth/2, y + 28);

        this.backButtonBounds = { x, y, width: buttonWidth, height: buttonHeight };
    }

    handleClick(x, y) {
        // Handle back button
        if (this.backButtonBounds && 
            x >= this.backButtonBounds.x && 
            x <= this.backButtonBounds.x + this.backButtonBounds.width &&
            y >= this.backButtonBounds.y && 
            y <= this.backButtonBounds.y + this.backButtonBounds.height) {
            // Close shop and return to menu
            this.engine.isShopOpen = false;
            this.engine.setState('menu');
            return;
        }

        // Handle item clicks
        const itemWidth = 280;
        const itemHeight = 120;
        const itemsPerRow = 3;
        const padding = 20;
        const startX = (this.engine.canvas.width - (itemWidth * itemsPerRow + padding * (itemsPerRow - 1))) / 2;
        let startY = 150;

        this.categories.forEach(category => {
            startY += 50; // Category header height
            const items = category.items;
            const rows = Math.ceil(items.length / itemsPerRow);

            for (let i = 0; i < items.length; i++) {
                const row = Math.floor(i / itemsPerRow);
                const col = i % itemsPerRow;
                const itemX = startX + col * (itemWidth + padding);
                const itemY = startY + row * (itemHeight + padding);

                // Check if click is on buy button
                const buttonWidth = 80;
                const buttonHeight = 30;
                const buttonX = itemX + itemWidth - buttonWidth - 10;
                const buttonY = itemY + itemHeight - buttonHeight - 10;

                if (x >= buttonX && x <= buttonX + buttonWidth &&
                    y >= buttonY && y <= buttonY + buttonHeight) {
                    this.purchaseItem(items[i]);
                    return;
                }
            }
            startY += rows * (itemHeight + padding);
            startY += 40; // Space between categories
        });
    }
}
