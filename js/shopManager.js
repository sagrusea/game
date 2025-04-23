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
        this.currentPage = 0;
        this.itemsPerPage = 3;
        this.currentCategory = 0;
        this.categoryPages = new Map(); // Store current page for each category
    }

    async loadShopItems() {
        try {
            const response = await fetch('./assets/items/items.json');
            const data = await response.json();
            // Filter for items that include 'C' in their shopType
            this.items = data.items.filter(item => 
                item.shopType.split(',').includes('C')
            );
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
        this.engine.ctx.fillText('The Traveler’s Trove', this.engine.canvas.width / 2, 50);
        this.engine.ctx.restore();

        // Draw back button
        this.drawBackButton();



        // Layout constants
        const itemsPerRow = 3;
        const itemWidth = 200;
        const itemHeight = 250;
        const categorySpacing = 50; // Space between categories
        const startX = (this.engine.canvas.width - (itemWidth * itemsPerRow + 40 * (itemsPerRow - 1))) / 2;
        const startY = 150;

        // Draw categories
        this.categories.forEach((category, categoryIndex) => {
            // Initialize category page if not exists
            if (!this.categoryPages.has(category)) {
                this.categoryPages.set(category, 0);
            }

            const categoryY = startY + categoryIndex * (itemHeight + categorySpacing);
            
            // Draw category header with arrows
            this.drawCategoryHeader(category, startX, categoryY - 10);
            
            // Get items and handle pagination
            const categoryItems = this.items.filter(item => item.category === category);
            const currentPage = this.categoryPages.get(category);
            const totalPages = Math.ceil(categoryItems.length / itemsPerRow);
            const pageItems = categoryItems.slice(currentPage * itemsPerRow, (currentPage + 1) * itemsPerRow);

            // Draw items for current page
            pageItems.forEach((item, index) => {
                const x = startX + index * (itemWidth + 40);
                const y = categoryY;

                // Draw item card
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

                // Draw price with correct currency icon and color
                const currencySprite = item.priceType === 'shard' ? 'shard' : 'coin';
                const priceColor = item.priceType === 'shard' ? '#6EB5FF' : '#FFD700';
                
                this.engine.pixelSprites.drawSprite(
                    currencySprite, 
                    x + itemWidth/2 - 32, 
                    y + itemHeight - 50, 
                    24, 
                    24, 
                    'idle'
                );
                
                this.engine.ctx.fillStyle = priceColor;
                this.engine.ctx.fillText(
                    `${item.price}`, 
                    x + itemWidth/2 + 20, 
                    y + itemHeight - 35
                );

                // For skins, show equip button if owned
                if (item.category === "Skins" && 
                    this.engine.inventory.skins && 
                    this.engine.inventory.skins.includes(item.name)) {
                    
                    const isEquipped = this.engine.inventory.currentSkin === item.name;
                    const buttonColor = isEquipped ? '#666666' : '#45a049';
                    const buttonText = isEquipped ? 'Equipped' : 'Equip';
                    
                    this.drawEquipButton(
                        x + itemWidth/2 - 40, 
                        y + itemHeight - 30, 
                        80, 
                        30, 
                        buttonColor,
                        buttonText
                    );
                } else {
                    // Update buy button condition
                    const canAfford = item.priceType === 'shard' ? 
                        this.engine.getShards() >= item.price :
                        this.engine.getCoins() >= item.price;
                    
                    this.drawBuyButton(x + itemWidth/2 - 40, y + itemHeight - 30, 80, 30, canAfford);
                }
            });

            // Draw category pagination arrows
            if (totalPages > 1) {
                this.drawCategoryArrows(category, startX, categoryY, itemWidth * itemsPerRow + 80);
            }
        });

        // Change phrase occasionally
        if (Date.now() - this.phaseChangeTime > 5000) {
            this.currentPhrase = this.getRandomPhrase();
            this.phaseChangeTime = Date.now();
        }

        // Draw currency counters
        const padding = 10;
        const iconSize = 32;
        const spacing = 10;
        const verticalSpacing = 40;

        // Draw coin counter
        this.engine.ctx.save();
        this.engine.pixelSprites.drawSprite('coin', padding, padding, iconSize, iconSize, 'idle');
        
        this.engine.ctx.textAlign = 'left';
        this.engine.ctx.textBaseline = 'middle';
        this.engine.ctx.fillStyle = '#FFD700';
        this.engine.ctx.font = 'bold 24px Arial';
        this.engine.ctx.fillText(
            `${this.engine.getCoins()}`,
            padding + iconSize + spacing,
            padding + (iconSize / 2)
        );

        // Draw shards with centered text alignment
        this.engine.pixelSprites.drawSprite('shard', padding, padding + verticalSpacing, iconSize, iconSize, 'idle');
        this.engine.ctx.fillStyle = '#6EB5FF';
        this.engine.ctx.fillText(
            `${this.engine.getShards()}`,
            padding + iconSize + spacing, // Adjusted x position for center alignment
            padding + verticalSpacing + iconSize/2
        );

        this.engine.ctx.restore();
    }

    drawPaginationControls(totalPages) {
        const buttonWidth = 80;
        const buttonHeight = 30;
        const spacing = 20;
        const totalWidth = (buttonWidth * 2) + spacing;
        const startX = (this.engine.canvas.width - totalWidth) / 2;
        const y = this.engine.canvas.height - buttonHeight - 20;

        // Draw page indicator
        this.engine.ctx.save();
        this.engine.ctx.fillStyle = '#FFFFFF';
        this.engine.ctx.font = '20px Arial';
        this.engine.ctx.textAlign = 'center';
        this.engine.ctx.fillText(`Page ${this.currentPage + 1}/${totalPages}`, this.engine.canvas.width / 2, y - 20);

        // Previous button
        if (this.currentPage > 0) {
            this.drawShopButton('Previous', startX, y, buttonWidth, buttonHeight);
        }

        // Next button
        if (this.currentPage < totalPages - 1) {
            this.drawShopButton('Next', startX + buttonWidth + spacing, y, buttonWidth, buttonHeight);
        }
        this.engine.ctx.restore();
    }

    drawShopButton(text, x, y, width, height) {
        const isHovered = this.isMouseOverButton(x, y, width, height);
        
        this.engine.ctx.fillStyle = isHovered ? '#3d1574' : '#2d1054';
        this.engine.ctx.strokeStyle = '#8a2be2';
        this.engine.ctx.lineWidth = 2;
        
        this.engine.ctx.beginPath();
        this.engine.ctx.roundRect(x, y, width, height, 5);
        this.engine.ctx.fill();
        this.engine.ctx.stroke();

        this.engine.ctx.fillStyle = '#FFFFFF';
        this.engine.ctx.font = '16px Arial';
        this.engine.ctx.textAlign = 'center';
        this.engine.ctx.fillText(text, x + width/2, y + height/2 + 5);
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

    drawDefaultSkinButton(x, y, width, height) {
        this.engine.ctx.save();
        const isDefault = !this.engine.inventory.currentSkin;
        const color = isDefault ? '#666666' : '#4a1a8c';
        
        this.engine.ctx.fillStyle = color;
        this.engine.ctx.strokeStyle = '#333333';
        this.engine.ctx.beginPath();
        this.engine.ctx.roundRect(x, y, width, height, 5);
        this.engine.ctx.fill();
        this.engine.ctx.stroke();

        this.engine.ctx.fillStyle = '#FFFFFF';
        this.engine.ctx.font = '16px Arial';
        this.engine.ctx.textAlign = 'center';
        this.engine.ctx.fillText(isDefault ? 'Default (Equipped)' : 'Default Skin', x + width/2, y + height/2 + 5);
        this.engine.ctx.restore();
    }

    drawEquipButton(x, y, width, height, color, text) {
        this.engine.ctx.save();
        this.engine.ctx.fillStyle = color;
        this.engine.ctx.strokeStyle = '#333333';
        this.engine.ctx.beginPath();
        this.engine.ctx.roundRect(x, y, width, height, 5);
        this.engine.ctx.fill();
        this.engine.ctx.stroke();

        this.engine.ctx.fillStyle = '#FFFFFF';
        this.engine.ctx.font = '16px Arial';
        this.engine.ctx.textAlign = 'center';
        this.engine.ctx.fillText(text, x + width/2, y + height/2 + 5);
        this.engine.ctx.restore();
    }

    drawCategorySelector() {
        const y = 100;
        const arrowWidth = 30;
        const spacing = 20;
        const categoryWidth = 150;
        const centerX = this.engine.canvas.width / 2;
        
        // Draw category name
        this.engine.ctx.save();
        this.engine.ctx.fillStyle = '#FFFFFF';
        this.engine.ctx.font = 'bold 24px Arial';
        this.engine.ctx.textAlign = 'center';
        this.engine.ctx.fillText(this.categories[this.currentCategory], centerX, y);

        // Draw left arrow if not first category
        if (this.currentCategory > 0) {
            this.drawArrow(centerX - categoryWidth/2 - spacing, y - 12, 'left');
        }

        // Draw right arrow if not last category
        if (this.currentCategory < this.categories.length - 1) {
            this.drawArrow(centerX + categoryWidth/2 + spacing, y - 12, 'right');
        }
        this.engine.ctx.restore();
    }

    drawArrow(x, y, direction) {
        this.engine.ctx.save();
        this.engine.ctx.fillStyle = '#FFFFFF';
        this.engine.ctx.beginPath();
        if (direction === 'left') {
            this.engine.ctx.moveTo(x + 20, y);
            this.engine.ctx.lineTo(x, y + 12);
            this.engine.ctx.lineTo(x + 20, y + 24);
        } else {
            this.engine.ctx.moveTo(x, y);
            this.engine.ctx.lineTo(x + 20, y + 12);
            this.engine.ctx.lineTo(x, y + 24);
        }
        this.engine.ctx.fill();
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
        // Add debug logging
        console.log('Attempting to buy:', item);
        console.log('Current coins:', this.engine.getCoins());
        console.log('Item price:', item.price);

        const currentBalance = item.priceType === 'shard' ? 
            this.engine.getShards() : 
            this.engine.getCoins();

        if (currentBalance >= item.price) {
            const success = item.priceType === 'shard' ?
                this.engine.spendShards(item.price) :
                this.engine.spendCoins(item.price);

            if (success) {
                console.log('Purchase successful');
                
                // Play purchase sound
                this.engine.audio.synthesizer.playSoundEffect('coin_collect');
                
                // Animate coins disappearing
                this.animatePurchase(item);
                
                // Add item to inventory based on category
                if (item.category === "Skins") {
                    this.engine.addSkin(item.name);
                    this.engine.setCurrentSkin(item.name);
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
        // Layout constants - need to match drawShop
        const itemsPerRow = 3;
        const itemWidth = 200;
        const itemHeight = 250;
        const categorySpacing = 50;
        const startX = (this.engine.canvas.width - (itemWidth * itemsPerRow + 40 * (itemsPerRow - 1))) / 2;
        const startY = 150;

        // Back button check
        if (x >= this.engine.canvas.width - 120 && x <= this.engine.canvas.width - 20 &&
            y >= 20 && y <= 60) {
            this.engine.isShopOpen = false;
            this.engine.setState('menu'); // This will now trigger proper music transition
            return;
        }

        // Check category arrows and items
        this.categories.forEach((category, categoryIndex) => {
            const categoryY = startY + categoryIndex * (itemHeight + categorySpacing);
            const currentPage = this.categoryPages.get(category);
            const categoryItems = this.items.filter(item => item.category === category);
            const totalPages = Math.ceil(categoryItems.length / itemsPerRow);
            const rowWidth = itemWidth * itemsPerRow + 80;

            // Get visible items for this category
            const pageItems = categoryItems.slice(
                currentPage * itemsPerRow, 
                (currentPage + 1) * itemsPerRow
            );

            // Check items in this category
            pageItems.forEach((item, index) => {
                const itemX = startX + index * (itemWidth + 40);
                const itemY = categoryY;
                const buttonX = itemX + itemWidth/2 - 40;
                const buttonY = itemY + itemHeight - 30;

                // Check if click is within item card area
                if (x >= itemX && x <= itemX + itemWidth &&
                    y >= itemY && y <= itemY + itemHeight) {
                    
                    // Check if click is on buy/equip button
                    if (x >= buttonX && x <= buttonX + 80 &&
                        y >= buttonY && y <= buttonY + 30) {
                        if (item.category === "Skins" && 
                            this.engine.inventory.skins && 
                            this.engine.inventory.skins.includes(item.name)) {
                            this.engine.setCurrentSkin(
                                this.engine.inventory.currentSkin === item.name ? null : item.name
                            );
                        } else {
                            this.buyItem(item);
                        }
                    }
                }
            });

            // Check category arrows - more precise click detection
            if (totalPages > 1) {
                // Left arrow
                if (currentPage > 0 && 
                    x >= startX - 40 && x <= startX && 
                    y >= categoryY + 80 && y <= categoryY + 120) {
                    this.categoryPages.set(category, currentPage - 1);
                    return;
                }

                // Right arrow
                if (currentPage < totalPages - 1 && 
                    x >= startX + rowWidth + 10 && x <= startX + rowWidth + 50 && 
                    y >= categoryY + 80 && y <= categoryY + 120) {
                    this.categoryPages.set(category, currentPage + 1);
                    return;
                }
            }
        });
    }

    drawCategoryHeader(category, x, y) {
        this.engine.ctx.save();
        this.engine.ctx.fillStyle = '#FFFFFF';
        this.engine.ctx.font = 'bold 24px Arial';
        this.engine.ctx.textAlign = 'left';
        this.engine.ctx.fillText(category, x, y);
        this.engine.ctx.restore();
    }

    drawCategoryArrows(category, startX, y, width) {
        const currentPage = this.categoryPages.get(category);
        const categoryItems = this.items.filter(item => item.category === category);
        const totalPages = Math.ceil(categoryItems.length / 3);

        // Left arrow
        if (currentPage > 0) {
            this.drawArrow(startX - 40, y + 100, 'left');
        }

        // Right arrow
        if (currentPage < totalPages - 1) {
            this.drawArrow(startX + width + 10, y + 100, 'right');
        }

        // Page indicator
        this.engine.ctx.save();
        this.engine.ctx.fillStyle = '#FFFFFF';
        this.engine.ctx.font = '16px Arial';
        this.engine.ctx.textAlign = 'center';
        this.engine.ctx.fillText(`${currentPage + 1}/${totalPages}`, startX + width/2, y + 180);
        this.engine.ctx.restore();
    }

    showMessage(message) {
        console.log(message);
    }

    resetState() {
        this.currentPage = 0;
        this.currentCategory = 0;
        this.categoryPages.clear();
    }
}
