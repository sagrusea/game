class ShopManager {
    constructor(engine) {
        this.engine = engine;
        this.items = [];
        this.categories = [];
        this.selectedCategory = null;
        this.shopOverlay = document.getElementById('shopOverlay');
        this.shopContent = document.getElementById('shopContent');
        this.phrases = {
            welcome: [],
            general: [],
            reject: []
        };
        this.currentPhrase = '';
        this.phaseChangeTime = 0;
        this.loadShopItems();
        this.loadShopkeeperPhrases();
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

    async loadShopkeeperPhrases() {
        try {
            const types = ['welcome', 'general', 'reject'];
            await Promise.all(types.map(async type => {
                const response = await fetch(`./assets/data/shopkeeper_phrases/${type}.txt`);
                const text = await response.text();
                this.phrases[type] = text.split('\n').filter(line => line.trim());
            }));
            this.currentPhrase = this.getRandomPhrase('welcome');
        } catch (error) {
            console.error('Failed to load shopkeeper phrases:', error);
            this.phrases = {
                welcome: ['Welcome to my shop!'],
                general: ['Take a look around.'],
                reject: ['Not enough coins.']
            };
        }
    }

    getRandomPhrase(type = 'general') {
        const phrases = this.phrases[type];
        return phrases[Math.floor(Math.random() * phrases.length)];
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

        // Draw gradient background
        const gradient = this.engine.ctx.createLinearGradient(0, 0, 0, this.engine.canvas.height);
        gradient.addColorStop(0, 'rgba(74, 26, 140, 0.9)');  // #4a1a8c with 0.9 alpha
        gradient.addColorStop(1, 'rgba(45, 16, 84, 0.9)');   // #2d1054 with 0.9 alpha
        this.engine.ctx.fillStyle = gradient;
        this.engine.ctx.fillRect(0, 0, this.engine.canvas.width, this.engine.canvas.height);

        // Draw shopkeeper
        const shopkeeperSize = 128;
        this.engine.pixelSprites.drawSprite(
            'shopkeeper',
            50,
            this.engine.canvas.height / 2 - shopkeeperSize / 2,
            shopkeeperSize,
            shopkeeperSize,
            'idle'
        );

        // Draw speech bubble with current phrase
        this.engine.ctx.save();
        this.engine.ctx.fillStyle = '#fff';
        this.engine.ctx.font = '20px Arial';
        this.engine.ctx.textAlign = 'left';
        this.engine.ctx.fillText(
            this.currentPhrase,
            50 + shopkeeperSize + 20,
            this.engine.canvas.height / 2
        );
        this.engine.ctx.restore();

        // Draw shop title
        this.engine.ctx.save();
        this.engine.ctx.fillStyle = '#fff';
        this.engine.ctx.font = 'bold 32px Arial';
        this.engine.ctx.textAlign = 'center';
        this.engine.ctx.fillText('Shop', this.engine.canvas.width / 2, 50);
        this.engine.ctx.restore();

        // Draw back button
        this.drawBackButton();

        // Draw player's coins
        this.engine.ctx.save();
        this.engine.ctx.fillStyle = '#FFD700';
        this.engine.ctx.font = 'bold 24px Arial';
        this.engine.ctx.textAlign = 'left';
        this.engine.pixelSprites.drawSprite('coin', 20, 80, 32, 32, 'idle');
        this.engine.ctx.fillText(`: ${this.engine.getCoins()}`, 60, 100);
        this.engine.ctx.restore();

        // Layout items in a grid
        const itemsPerRow = 3;
        const itemWidth = 200;
        const itemHeight = 250;
        const startX = (this.engine.canvas.width - (itemWidth * itemsPerRow + 40 * (itemsPerRow - 1))) / 2;
        const startY = 150;

        this.items.forEach((item, index) => {
            const row = Math.floor(index / itemsPerRow);
            const col = index % itemsPerRow;
            const x = startX + col * (itemWidth + 40);
            const y = startY + row * (itemHeight + 20);

            // Item background
            this.engine.ctx.fillStyle = 'rgba(74, 26, 140, 0.7)';
            this.engine.ctx.fillRect(x, y, itemWidth, itemHeight);

            // Draw item sprite
            this.engine.pixelSprites.drawSprite(
                item.sprite || 'coin',
                x + (itemWidth - 64) / 2,
                y + 20,
                64,
                64,
                'idle'
            );

            // Draw item name
            this.engine.ctx.fillStyle = '#FFFFFF';
            this.engine.ctx.font = 'bold 20px Arial';
            this.engine.ctx.textAlign = 'center';
            this.engine.ctx.fillText(item.name, x + itemWidth/2, y + 100);

            // Draw description
            this.engine.ctx.font = '16px Arial';
            this.engine.ctx.fillStyle = '#CCCCCC';
            const description = item.description || 'No description available';
            this.wrapText(this.engine.ctx, description, x + itemWidth/2, y + 130, itemWidth - 20, 20);

            // Draw price with coin icon
            this.engine.pixelSprites.drawSprite('coin', x + itemWidth/2 - 32, y + itemHeight - 50, 24, 24, 'idle');
            this.engine.ctx.fillStyle = '#FFD700';
            this.engine.ctx.fillText(`${item.price}`, x + itemWidth/2 + 20, y + itemHeight - 35);

            // Show "Owned" instead of buy button for owned skins
            if (item.category === "Skins" && 
                this.engine.inventory.skins && 
                this.engine.inventory.skins.includes(item.name)) {
                this.engine.ctx.fillStyle = '#45a049';
                this.engine.ctx.fillText('Owned', x + itemWidth/2, y + itemHeight - 10);
            } else {
                // Draw buy button
                this.drawBuyButton(x + itemWidth/2 - 40, y + itemHeight - 30, 80, 30, this.engine.getCoins() >= item.price);
            }
        });

        // Change phrase occasionally
        if (Date.now() - this.phaseChangeTime > 5000) {
            this.currentPhrase = this.getRandomPhrase();
            this.phaseChangeTime = Date.now();
        }
    }

    drawBackButton() {
        const buttonWidth = 100;
        const buttonHeight = 40;
        const x = this.engine.canvas.width - buttonWidth - 20;
        const y = 20;

        // Draw button background
        this.engine.ctx.save();
        this.engine.ctx.fillStyle = '#4a1a8c';
        this.engine.ctx.fillRect(x, y, buttonWidth, buttonHeight);
        
        // Draw button text
        this.engine.ctx.fillStyle = '#fff';
        this.engine.ctx.font = '20px Arial';
        this.engine.ctx.textAlign = 'center';
        this.engine.ctx.fillText('Back', x + buttonWidth/2, y + buttonHeight/2 + 7);
        this.engine.ctx.restore();
    }

    drawBuyButton(x, y, width, height, canBuy) {
        this.engine.ctx.save();
        
        // Check if mouse is over button
        const isHovered = this.isMouseOverButton(x, y, width, height);
        
        // Adjust colors based on hover state
        const baseColor = canBuy ? '#4CAF50' : '#666666';
        const hoverColor = canBuy ? '#45a049' : '#555555';
        
        this.engine.ctx.fillStyle = isHovered ? hoverColor : baseColor;
        this.engine.ctx.strokeStyle = canBuy ? '#45a049' : '#555555';
        
        // Draw button with hover effect
        this.engine.ctx.beginPath();
        this.engine.ctx.roundRect(x, y, width, height, 5);
        this.engine.ctx.fill();
        this.engine.ctx.stroke();

        // Button text
        this.engine.ctx.fillStyle = '#FFFFFF';
        this.engine.ctx.font = 'bold 16px Arial';
        this.engine.ctx.textAlign = 'center';
        this.engine.ctx.fillText('BUY', x + width/2, y + height/2 + 5);
        this.engine.ctx.restore();
    }

    isMouseOverButton(x, y, width, height) {
        return this.engine.mousePos.x >= x && 
               this.engine.mousePos.x <= x + width &&
               this.engine.mousePos.y >= y && 
               this.engine.mousePos.y <= y + height;
    }

    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';

        for(let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            
            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, y);
                line = words[n] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, y);
    }

    buyItem(item) {
        if (this.engine.getCoins() >= item.price) {
            if (this.engine.spendCoins(item.price)) {
                // Play purchase sound
                this.engine.audio.synthesizer.playSoundEffect('coin_collect');
                
                // Animate coins disappearing
                this.animatePurchase(item);
                
                // Add item to inventory based on category
                if (item.category === "Skins") {
                    if (!this.engine.inventory.skins) {
                        this.engine.inventory.skins = [];
                    }
                    if (!this.engine.inventory.skins.includes(item.name)) {
                        this.engine.inventory.skins.push(item.name);
                    }
                    // Set as current skin if none selected
                    if (!this.engine.inventory.currentSkin) {
                        this.engine.inventory.currentSkin = item.name;
                    }
                } else {
                    switch(item.name) {
                        case 'TNT':
                            this.engine.inventory.tnt = (this.engine.inventory.tnt || 0) + 1;
                            break;
                        case 'Health Potion':
                            this.engine.inventory.healthPotions = (this.engine.inventory.healthPotions || 0) + 1;
                            break;
                        case 'Speed Boost':
                            this.engine.inventory.speedBoosts = (this.engine.inventory.speedBoosts || 0) + 1;
                            break;
                    }
                }
                
                // Show success message
                this.currentPhrase = this.getRandomPhrase('general');
                this.phaseChangeTime = Date.now();

                // Force shop redraw
                this.renderShop();
            }
        } else {
            // Play error sound
            this.engine.audio.synthesizer.playSoundEffect('error');
            
            // Show random "can't afford" message
            this.currentPhrase = this.getRandomPhrase('reject');
            this.phaseChangeTime = Date.now();
        }
    }

    animatePurchase(item) {
        const coins = [];
        const numCoins = Math.min(10, item.price / 10);
        
        // Create flying coins
        for(let i = 0; i < numCoins; i++) {
            coins.push({
                x: 60, // Starting at coin counter position
                y: 100,
                targetX: this.engine.canvas.width / 2,
                targetY: this.engine.canvas.height / 2,
                alpha: 1,
                scale: 1
            });
        }

        // Animate coins
        const animate = () => {
            let stillAnimating = false;
            
            coins.forEach(coin => {
                // Move towards target
                coin.x += (coin.targetX - coin.x) * 0.1;
                coin.y += (coin.targetY - coin.y) * 0.1;
                
                // Fade out
                coin.alpha -= 0.02;
                coin.scale -= 0.02;
                
                if(coin.alpha > 0) {
                    stillAnimating = true;
                    // Draw coin
                    this.engine.ctx.globalAlpha = coin.alpha;
                    this.engine.pixelSprites.drawSprite(
                        'coin',
                        coin.x,
                        coin.y,
                        32 * coin.scale,
                        32 * coin.scale,
                        'idle'
                    );
                    this.engine.ctx.globalAlpha = 1;
                }
            });
            
            if(stillAnimating) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    handleClick(x, y) {
        // Check back button click
        const buttonWidth = 100;
        const buttonHeight = 40;
        const buttonX = this.engine.canvas.width - buttonWidth - 20;
        const buttonY = 20;

        if (x >= buttonX && x <= buttonX + buttonWidth &&
            y >= buttonY && y <= buttonY + buttonHeight) {
            // Clean up shop state
            this.engine.isShopOpen = false;
            this.shopContent.innerHTML = '';
            
            // Transition to menu state
            this.engine.setState('menu');
            
            // Reset any game state that needs clearing
            if (this.engine.levelManager) {
                this.engine.levelManager.currentLevel = null;
            }
            
            // Force a redraw of menu
            if (this.engine.menuManager) {
                this.engine.menuManager.drawMenu();
            }
            return;
        }

        // Check buy button clicks
        const itemsPerRow = 3;
        const itemWidth = 200;
        const itemHeight = 250;
        const startX = (this.engine.canvas.width - (itemWidth * itemsPerRow + 40 * (itemsPerRow - 1))) / 2;
        const startY = 150;

        this.items.forEach((item, index) => {
            const row = Math.floor(index / itemsPerRow);
            const col = index % itemsPerRow;
            const itemX = startX + col * (itemWidth + 40);
            const itemY = startY + row * (itemHeight + 20);

            // Buy button dimensions and position
            const buyButtonWidth = 80;
            const buyButtonHeight = 30;
            const buyButtonX = itemX + itemWidth/2 - 40;
            const buyButtonY = itemY + itemHeight - 30;

            if (x >= buyButtonX && x <= buyButtonX + buyButtonWidth &&
                y >= buyButtonY && y <= buyButtonY + buyButtonHeight) {
                // Try to buy or show "can't afford" message
                this.buyItem(item);
            }
        });
    }

    showMessage(message) {
        console.log(message);
    }
}
