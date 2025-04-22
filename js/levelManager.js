class LevelManager {
    constructor(engine) {
        this.engine = engine;
        this.levels = {};
        this.currentLevel = null;
        this.moveDelay = 0;
        this.moveSpeed = 150; // Milliseconds between moves
        this.inventory = {
            keys: 0,
            hasBlueKey: false,
            hasRedKey: false
        };
        
        this.movableBlocks = new Map(); // Store positions of movable blocks
        this.currentLevelName = null;
        this.completionOverlay = document.getElementById('completionOverlay');
        this.levelCompleted = false;  // Add this line
        this.spikes = new Map(); // Store spike states: { pos: string, extended: boolean, nextChange: number }
        this.loadLevels();
        this.lastDamageTime = 0;
        this.damageCooldown = 1000; // 1 second cooldown between damage
        this.failureShowing = false;
        this.failureDelay = 2000; // Time to show failure screen
        this.phrases = [];
        this.loadPhrases();
        this.collectibles = []; // Add this line
        this.customFloors = new Map(); // Store positions of custom floor types
        this.tileRules = {
            'wall': {
                base: true,
                combinable: []
            },
            'floor': {
                base: true,
                combinable: [
                    'bronze_coin', 'silver_coin', 'gold_coin', 'plate',
                    'door_normal', 'door_blue', 'door_red', 'finish',
                    'key_yellow', 'key_blue', 'key_red' // Add keys to combinable items
                ]
            },
            'bronze_coin': {
                base: false,
                requiresBase: ['floor'],
                combinable: []
            },
            'silver_coin': {
                base: false,
                requiresBase: ['floor'],
                combinable: []
            },
            'gold_coin': {
                base: false,
                requiresBase: ['floor'],
                combinable: []
            },
            'plate': {
                base: false,
                requiresBase: ['floor'],
                combinable: []
            },
            'door_normal': {
                base: false,
                requiresBase: ['floor'],
                combinable: []
            },
            'door_blue': {
                base: false,
                requiresBase: ['floor'],
                combinable: []
            },
            'door_red': {
                base: false,
                requiresBase: ['floor'],
                combinable: []
            },
            'finish': {
                base: false,
                requiresBase: ['floor'],
                combinable: []
            },
            'key_yellow': {
                base: false,
                requiresBase: ['floor'],
                combinable: []
            },
            'key_blue': {
                base: false,
                requiresBase: ['floor'],
                combinable: []
            },
            'key_red': {
                base: false,
                requiresBase: ['floor'],
                combinable: []
            },
            'door_mechanism': {
                base: false,
                requiresBase: ['floor'],
                combinable: []
            }
        };
        this.floorTypes = {
            'I': 'plank_floor',
            'S': 'stone_floor',
            '.': 'floor'  // Default floor type
            // Add more floor type mappings here
        };
        this.isMoving = false;
        this.lastMoveTime = 0;
        this.moveAnimationDelay = 150; // Time in ms between frame changes
        this.finishAnimationTime = 0;
        this.finishAnimationInterval = 800; // Time in ms between frame changes
        this.failurePenalty = 50; // Coins lost on failure
        this.failureButtons = [
            { text: 'Retry Level', action: 'retry' },
            { text: 'Return to Menu', action: 'menu' }
        ];
    }

    async loadLevels() {
        try {
            const response = await fetch('./assets/levels/levels.json');
            this.levels = await response.json();
            console.log('Levels loaded successfully');
        } catch (error) {
            console.error('Failed to load levels:', error);
        }
    }

    async loadPhrases() {
        try {
            const response = await fetch('./assets/phrases.txt');
            const text = await response.text();
            this.phrases = text.split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('//'));
            console.log('Phrases loaded:', this.phrases.length);
        } catch (error) {
            console.error('Failed to load phrases:', error);
            this.phrases = ['Great job!']; // Fallback phrase
        }
    }

    getRandomPhrase() {
        if (this.phrases.length === 0) return 'Great job!';
        const randomIndex = Math.floor(Math.random() * this.phrases.length);
        return this.phrases[randomIndex];
    }

    showCompletion() {
        if (!this.engine.inventory) return;
        
        this.levelCompleted = true;
        
        // Calculate coins before resetting keys
        const totalValue = this.calculateCoinsValue();
        
        // Reset keys
        this.engine.inventory = {
            ...this.engine.inventory,
            yellowKeys: 0,
            blueKeys: 0,
            redKeys: 0,
        };
        
        const levelNames = Object.keys(this.levels);
        const currentIndex = levelNames.indexOf(this.currentLevelName);
        const nextLevelName = currentIndex < levelNames.length - 1 
            ? `Level ${currentIndex + 2}`
            : 'Final Level Complete!';
        
        document.getElementById('nextLevelName').textContent = nextLevelName;
        
        // Clear any existing timeout and click handlers
        if (this.completionTimeout) {
            clearInterval(this.completionTimeout);
        }
        
        // Remove old click handler if exists
        const nextButton = document.getElementById('nextButton');
        nextButton.onclick = null;

        // Add new click handler
        nextButton.onclick = () => {
            clearInterval(this.completionTimeout);
            this.hideCompletion();
            if (currentIndex < levelNames.length - 1) {
                const nextLevel = levelNames[currentIndex + 1];
                console.log('Loading next level:', nextLevel);
                this.loadLevel(nextLevel);
            } else {
                console.log('Game completed');
                this.engine.setState('menu');
            }
        };

        // Add menu button handler
        const menuButton = document.getElementById('menuButton');
        menuButton.onclick = () => {
            clearInterval(this.completionTimeout);
            this.hideCompletion();
            this.engine.setState('menu');
        };

        // Show overlay and start countdown
        this.completionOverlay.classList.add('show-completion');
        this.engine.audio.synthesizer.playSoundEffect('win_melody');
        
        let timeLeft = 4;
        const countdownElement = document.getElementById('countdown');
        countdownElement.textContent = timeLeft;
        
        this.completionTimeout = setInterval(() => {
            timeLeft--;
            countdownElement.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(this.completionTimeout);
                nextButton.onclick(); // Simulate button click when timer ends
            }
        }, 1000);

        // Update completion phrase
        document.getElementById('completionPhrase').textContent = this.getRandomPhrase();

        // Add coins to global count with animation
        const coinsCollected = this.engine.getLevelCoins();
        
        document.getElementById('nextLevelName').textContent = nextLevelName;
        document.getElementById('coinsCollected').textContent = `Coins collected: ${coinsCollected}`;
        
        // Show overlay and add coins with animation
        this.completionOverlay.classList.add('show-completion');
        this.engine.audio.synthesizer.playSoundEffect('win_melody');
        this.engine.addCoinsToGlobal(coinsCollected, true);

        // Update coins display before showing overlay
        const levelCoins = this.engine.inventory.levelCoins;
        document.getElementById('coinsCollected').textContent = 
            `Coins collected: ${levelCoins} (Value: ${this.calculateCoinsValue()})`;
        
        // Update coins display
        document.getElementById('coinsCollected').textContent = 
            `Coins collected: ${this.engine.inventory.levelCoins} (Value: ${totalValue})`;
        
        // Add coins to global count
        if (totalValue > 0) {
            this.engine.addCoinsToGlobal(totalValue, true);
        }

        // Update coins display to show value
        document.getElementById('coinsCollected').textContent = 
            `Coins value collected: ${totalValue}`;

        this.engine.markLevelCompleted(this.currentLevelName);
    }

    hideCompletion() {
        if (this.completionTimeout) {
            clearInterval(this.completionTimeout);
            this.completionTimeout = null;
        }
        this.completionOverlay.classList.remove('show-completion');
        this.levelCompleted = false;  // Reset completion flag
    }

    nextLevel() {
        this.hideCompletion();
        
        // Make sure keys are reset when moving to next level
        this.engine.inventory = {
            yellowKeys: 0,
            blueKeys: 0,
            redKeys: 0
        };
        
        const levelNames = Object.keys(this.levels);
        const currentIndex = levelNames.indexOf(this.currentLevelName);
        if (currentIndex < levelNames.length - 1) {
            this.loadLevel(levelNames[currentIndex + 1]);
        } else {
            this.engine.setState('menu');
        }
    }

    restartLevel() {
        this.hideCompletion();
        this.loadLevel(this.currentLevelName);
    }

    parseFloorNotation(tile) {
        if (tile.includes('|')) {
            const [object, floorCode] = tile.split('|');
            const floorType = this.floorTypes[floorCode] || 'floor';
            return { object: object || '.', floor: floorType };
        }
        return { object: tile, floor: 'floor' };
    }

    getFreshLevel(levelName) {
        if (!this.levels[levelName]) {
            console.error('Level not found:', levelName);
            return null;
        }
        // Create a deep copy of the level data
        return JSON.parse(JSON.stringify(this.levels[levelName]));
    }

    loadLevel(levelName) {
        console.log('Loading level:', levelName);
        
        // Get a fresh copy of the level data
        const freshLevel = this.getFreshLevel(levelName);
        if (!freshLevel) return;

        this.currentLevel = freshLevel;
        this.inventory = { keys: 0, hasBlueKey: false, hasRedKey: false };
        this.movableBlocks.clear();
        this.spikes.clear();
        this.collectibles = [];
        this.customFloors.clear();
        this.engine.currentHealth = this.engine.maxHealth;
        
        // Process level data
        for (let y = 0; y < this.currentLevel.length; y++) {
            for (let x = 0; x < this.currentLevel[y].length; x++) {
                const tile = this.currentLevel[y][x];
                const { object, floor } = this.parseFloorNotation(tile);
                
                // Store custom floor if specified
                if (floor !== 'floor') {
                    this.customFloors.set(`${x},${y}`, floor);
                }

                // Update the level array to only contain the object
                this.currentLevel[y][x] = object;

                // Process objects
                if (object === 'c') {
                    this.engine.playerPosition = { x, y };
                    this.currentLevel[y][x] = '.';
                } else if (object === 'b') {
                    this.movableBlocks.set(`${x},${y}`, { x, y });
                } else if (object === 'j') {
                    this.spikes.set(`${x},${y}`, {
                        extended: false,
                        nextChange: Date.now() + Math.random() * 1500 + 1000
                    });
                }

                // Handle collectibles
                switch (object) {
                    case 'C':
                        this.placeCollectible('bronze_coin', x, y);
                        this.currentLevel[y][x] = '.';
                        break;
                    case 'V':
                        this.placeCollectible('silver_coin', x, y);
                        this.currentLevel[y][x] = '.';
                        break;
                    case 'N':
                        this.placeCollectible('gold_coin', x, y);
                        this.currentLevel[y][x] = '.';
                        break;
                }
            }
        }

        this.currentLevelName = levelName;
        console.log('Level loaded successfully');
        this.engine.resetLevelCoins();
    }

    placeCollectible(type, x, y) {
        const collectible = {
            type: type,
            x: x,
            y: y,
            value: type === 'bronze_coin' ? 1 : 
                   type === 'silver_coin' ? 5 : 
                   type === 'gold_coin' ? 10 : 1
        };
        this.collectibles.push(collectible);
    }

    checkCollectibles(playerX, playerY) {
        this.collectibles = this.collectibles.filter(item => {
            if (item.x === playerX && item.y === playerY) {
                // Play coin sound
                this.engine.audio.playSoundEffect('coin');
                
                // Add to level coins count
                this.engine.inventory.levelCoins++;
                
                // Add to global coins based on coin type value
                if (item.type === 'bronze_coin') {
                    this.engine.inventory.coins += 1;
                } else if (item.type === 'silver_coin') {
                    this.engine.inventory.coins += 5;
                } else if (item.type === 'gold_coin') {
                    this.engine.inventory.coins += 10;
                }
                
                return false;
            }
            return true;
        });
    }

    updatePlayer() {
        if (!this.currentLevel || this.levelCompleted) return;  // Add completion check
        
        const now = Date.now();
        if (now - this.moveDelay < this.moveSpeed) return;
        
        const pos = this.engine.playerPosition;
        let newPos = { x: pos.x, y: pos.y };
        let moved = false;

        if (this.engine.isKeyPressed('ArrowUp') || this.engine.isKeyPressed('w') || this.engine.isKeyPressed('W')) {
            newPos.y--;
            moved = true;
        } else if (this.engine.isKeyPressed('ArrowDown') || this.engine.isKeyPressed('s') || this.engine.isKeyPressed('S')) {
            newPos.y++;
            moved = true;
        } else if (this.engine.isKeyPressed('ArrowLeft') || this.engine.isKeyPressed('a') || this.engine.isKeyPressed('A')) {
            newPos.x--;
            moved = true;
        } else if (this.engine.isKeyPressed('ArrowRight') || this.engine.isKeyPressed('d') || this.engine.isKeyPressed('D')) {
            newPos.x++;
            moved = true;
        }

        if (moved) {
            if (this.isValidMove(newPos)) {
                this.isMoving = true;
                this.lastMoveTime = now;
                this.engine.audio.synthesizer.playSoundEffect('move');
                
                // Handle block pushing
                const blockKey = `${newPos.x},${newPos.y}`;
                if (this.movableBlocks.has(blockKey)) {
                    const pushPos = this.getPushPosition(newPos);
                    this.movableBlocks.delete(blockKey);
                    this.movableBlocks.set(`${pushPos.x},${pushPos.y}`, pushPos);
                }

                this.handleInteraction(newPos);
                this.engine.playerPosition = newPos;
                this.moveDelay = now;
                
                // Check pressure plates after movement
                this.checkPressurePlates();
                
                // Check if player moved onto extended spikes
                const spikeState = this.spikes.get(`${newPos.x},${newPos.y}`);
                if (spikeState && spikeState.extended && 
                    now - this.lastDamageTime >= this.damageCooldown) {
                    this.lastDamageTime = now;
                    this.engine.damage();
                }
                
                if (this.currentLevel[newPos.y][newPos.x] === 'f') {
                    this.showCompletion();
                }

                // Check for collectible items
                this.checkCollectibles(newPos.x, newPos.y);
            } else {
                this.engine.audio.synthesizer.playSoundEffect('collision');
            }
        } else {
            this.isMoving = false;
        }
        
        // Add spike update call
        this.updateSpikes();
    }

    isValidMove(pos) {
        if (!this.inBounds(pos)) return false;
        
        const tile = this.currentLevel[pos.y][pos.x];
        
        // Check for walls and locked doors
        if (tile === 'x' || tile === 'D' || tile === 'P' || tile === 'S') return false;  // Added 'D' to block movement
        if (tile === 'L' && !this.engine.hasKey('yellow')) return false;
        if (tile === 'B' && !this.engine.hasKey('blue')) return false;
        if (tile === 'R' && !this.engine.hasKey('red')) return false;

        // Check for movable blocks
        const blockKey = `${pos.x},${pos.y}`;
        if (this.movableBlocks.has(blockKey)) {
            const pushPos = this.getPushPosition(pos);
            return this.canPushBlock(pos, pushPos);
        }

        return true;
    }

    inBounds(pos) {
        return pos.x >= 0 && 
               pos.x < this.currentLevel[0].length &&
               pos.y >= 0 && 
               pos.y < this.currentLevel.length;
    }

    getPushPosition(blockPos) {
        const dx = blockPos.x - this.engine.playerPosition.x;
        const dy = blockPos.y - this.engine.playerPosition.y;
        return { x: blockPos.x + dx, y: blockPos.y + dy };
    }

    canPushBlock(blockPos, pushPos) {
        if (!this.inBounds(pushPos)) return false;
        const targetTile = this.currentLevel[pushPos.y][pushPos.x];
        return targetTile === '.' || targetTile === 'p'; // Can push to empty space or pressure plate
    }

    handleInteraction(pos) {
        const tile = this.currentLevel[pos.y][pos.x];
        
        switch(tile) {
            case 'k':
                this.engine.addKey('yellow');
                this.currentLevel[pos.y][pos.x] = '.';
                break;
            case 'K':
                this.engine.addKey('blue');
                this.currentLevel[pos.y][pos.x] = '.';
                break;
            case 'Y':
                this.engine.addKey('red');
                this.currentLevel[pos.y][pos.x] = '.';
                break;
            case 'L':
            case 'B':
            case 'R':
                const keyColor = tile === 'L' ? 'yellow' : (tile === 'B' ? 'blue' : 'red');
                if (this.engine.hasKey(keyColor)) {
                    this.engine.useKey(keyColor);
                    this.currentLevel[pos.y][pos.x] = '.';
                    this.engine.audio.playSoundEffect('unlock');
                }
                break;
            case 'T':
                this.useTNT(pos);
                this.currentLevel[pos.y][pos.x] = '.';
                break;
        }
    }

    useTNT(pos) {
        const directions = [
            { x: 0, y: -1 }, // Up
            { x: 0, y: 1 },  // Down
            { x: -1, y: 0 }, // Left
            { x: 1, y: 0 }   // Right
        ];

        directions.forEach(dir => {
            const newPos = { x: pos.x + dir.x, y: pos.y + dir.y };
            if (this.inBounds(newPos) && this.currentLevel[newPos.y][newPos.x] === 'x') {
                this.currentLevel[newPos.y][newPos.x] = '.';
            }
        });

        this.engine.audio.playSoundEffect('explosion');
    }

    checkPressurePlates() {
        for (let y = 0; y < this.currentLevel.length; y++) {
            for (let x = 0; x < this.currentLevel[y].length; x++) {
                if (this.currentLevel[y][x] === 'p') {
                    const blockKey = `${x},${y}`;
                    if (this.movableBlocks.has(blockKey)) {
                        // Activate associated door/mechanism
                        this.activateMechanism(x, y);
                    }
                }
            }
        }
    }

    activateMechanism(plateX, plateY) {
        // Find and activate associated door/mechanism
        for (let y = 0; y < this.currentLevel.length; y++) {
            for (let x = 0; x < this.currentLevel[y].length; x++) {
                if (this.currentLevel[y][x] === 'D') {
                    this.currentLevel[y][x] = '.';
                    this.engine.audio.synthesizer.playSoundEffect('mechanism');
                }
            }
        }
    }

    updateSpikes() {
        const now = Date.now();
        if (now - this.lastDamageTime < this.damageCooldown) return;

        this.spikes.forEach((spike, pos) => {
            if (now >= spike.nextChange) {
                spike.extended = !spike.extended;
                spike.nextChange = now + Math.random() * 1500 + 1000;
                
                const [x, y] = pos.split(',').map(Number);
                if (spike.extended && 
                    this.engine.playerPosition.x === x && 
                    this.engine.playerPosition.y === y) {
                    this.lastDamageTime = now;
                    this.engine.damage();
                }
            }
        });
    }

    drawHealthBar() {
        const padding = 10;
        const heartSize = 32;
        const spacing = 5;
        
        for (let i = 0; i < this.engine.maxHealth; i++) {
            const frame = i < this.engine.currentHealth ? 'full' : 'empty';
            this.engine.pixelSprites.drawSprite(
                'heart',
                this.engine.canvas.width - (padding + heartSize) * (i + 1),
                padding,
                heartSize,
                heartSize,
                frame
            );
        }
    }

    drawTile(tileX, tileY, offsetX, offsetY, tileSize) {
        let layers = [];
        const pos = `${tileX},${tileY}`;
        
        // Check for custom floor
        const customFloor = this.customFloors.get(pos);
        layers.push(customFloor || 'floor');

        // Add spikes if present with correct frame based on state
        const spikeState = this.spikes.get(pos);
        if (spikeState) {
            const frame = spikeState.extended ? 'extended' : 'idle';
            layers.push(['spikes', frame]); // Use array format to specify frame
        }

        // Rest of layer handling
        const tile = this.currentLevel[tileY][tileX];

        // Handle walls (they replace floor)
        if (tile === 'x') {
            layers = ['wall'];
        } else if (tile === 'P') {
            layers = ['plank_wall'];
        } else if (tile === 'S') {
            layers = ['stone_wall'];
        } else {
            // Add overlays for other tiles
            switch(tile) {
                case 'L':
                    layers.push('door_normal');
                    break;
                case 'B':
                    layers.push('door_blue');
                    break;
                case 'R':
                    layers.push('door_red');
                    break;
                case 'D':
                    layers.push('door_mechanism');
                    break;
                case 'f':
                    const now = Date.now();
                    const finishFrame = Math.floor(now / this.finishAnimationInterval) % 2 === 0 ? 'idle' : 'glow';
                    layers.push(['finish', finishFrame]);
                    break;
                case 'p':
                    layers.push('plate');
                    break;
                case 'k':
                    layers.push('key_yellow');
                    break;
                case 'K':
                    layers.push('key_blue');
                    break;
                case 'Y':
                    layers.push('key_red');
                    break;
            }

            // Add collectibles
            const collectible = this.collectibles.find(c => c.x === tileX && c.y === tileY);
            if (collectible) {
                layers.push(collectible.type);
            }
        }

        // Draw all layers
        layers.forEach(layer => {
            const [sprite, frame] = Array.isArray(layer) ? layer : [layer, 'idle'];
            this.engine.pixelSprites.drawSprite(
                sprite,
                offsetX + tileX * tileSize,
                offsetY + tileY * tileSize,
                tileSize,
                tileSize,
                frame
            );
        });
    }

    // Helper method to check if two tile types can be combined
    canCombine(baseType, overlayType) {
        const baseRule = this.tileRules[baseType];
        const overlayRule = this.tileRules[overlayType];

        if (!baseRule || !overlayRule) return false;
        if (!baseRule.base) return false;
        if (overlayRule.requiresBase && !overlayRule.requiresBase.includes(baseType)) return false;

        return baseRule.combinable.includes(overlayType);
    }

    // Helper method to get the correct frame for a tile
    getTileFrame(sprite, x, y) {
        // ...existing code...
        if (sprite === 'spikes') {
            const spikeState = this.spikes.get(`${x},${y}`);
            return spikeState.extended ? 'extended' : 'idle'; // Change 'retracted' to 'idle'
        }
        // ...existing code...
    }

    drawLevel() {
        if (!this.currentLevel || !this.engine.inventory) {
            console.error('No level loaded or inventory not initialized');
            return;
        }
        
        this.updatePlayer();
        
        this.engine.clear();
        this.engine.drawRect(0, 0, this.engine.canvas.width, this.engine.canvas.height, '#333');
        
        // Calculate tile size
        const tileWidth = this.engine.canvas.width / this.currentLevel[0].length;
        const tileHeight = this.engine.canvas.height / this.currentLevel.length;
        const tileSize = Math.min(tileWidth, tileHeight);

        // Center the level
        const offsetX = (this.engine.canvas.width - tileSize * this.currentLevel[0].length) / 2;
        const offsetY = (this.engine.canvas.height - tileSize * this.currentLevel.length) / 2;

        // Draw level tiles
        for (let y = 0; y < this.currentLevel.length; y++) {
            for (let x = 0; x < this.currentLevel[y].length; x++) {
                const tileX = offsetX + x * tileSize;
                const tileY = offsetY + y * tileSize;
                this.drawTile(x, y, offsetX, offsetY, tileSize);
            }
        }

        // Draw movable blocks
        for (const [_, block] of this.movableBlocks) {
            const blockX = offsetX + block.x * tileSize;
            const blockY = offsetY + block.y * tileSize;
            this.engine.pixelSprites.drawSprite('block', blockX, blockY, tileSize, tileSize);
        }

        // Draw collectibles with correct offsets
        this.collectibles.forEach(item => {
            const itemX = offsetX + item.x * tileSize;
            const itemY = offsetY + item.y * tileSize;
            this.engine.pixelSprites.drawSprite(
                item.type,
                itemX,
                itemY,
                tileSize,
                tileSize
            );
        });

        // Only draw player if level is not completed
        if (this.engine.playerPosition && !this.levelCompleted) {
            const playerX = offsetX + this.engine.playerPosition.x * tileSize;
            const playerY = offsetY + this.engine.playerPosition.y * tileSize;
            
            // Determine animation frame
            const now = Date.now();
            const frame = this.isMoving && (now - this.lastMoveTime < this.moveAnimationDelay) ? 'move' : 'idle';
            
            // Use currently equipped skin or default
            const spriteName = this.engine.inventory.currentSkin || 'player';
            this.engine.pixelSprites.drawSprite(spriteName.toLowerCase(), playerX, playerY, tileSize, tileSize, frame);
        }

        // Draw inventory
        this.drawInventory();

        // Draw health bar last so it's always on top
        this.drawHealthBar();

        // Draw failure message if active
        if (this.failureShowing) {
            const ctx = this.engine.ctx;
            const centerX = this.engine.canvas.width / 2;
            const centerY = this.engine.canvas.height / 2;
            
            // Draw semi-transparent red background
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.fillRect(0, 0, this.engine.canvas.width, this.engine.canvas.height);
            
            // Draw failure text
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Draw text shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.font = 'bold 52px Arial';
            ctx.fillText('You Failed!', centerX + 2, centerY - 28);
            ctx.font = '24px Arial';
            ctx.fillText('Restarting level...', centerX + 2, centerY + 22);
            
            // Draw main text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 52px Arial';
            ctx.fillText('You Failed!', centerX, centerY - 30);
            ctx.font = '24px Arial';
            ctx.fillText('Restarting level...', centerX, centerY + 20);
            
            ctx.restore();
        }

        // Draw coin counter
        const padding = 10;
        const iconSize = 32;
        const spacing = 10;

        this.engine.ctx.save();
        // Draw level coins
        this.engine.pixelSprites.drawSprite('coin', 
            padding, 
            this.engine.canvas.height - padding - iconSize, 
            iconSize, 
            iconSize, 
            'idle');
        
        this.engine.ctx.textAlign = 'left';
        this.engine.ctx.textBaseline = 'middle';
        this.engine.ctx.fillStyle = '#FFD700';
        this.engine.ctx.font = 'bold 24px Arial';
        this.engine.ctx.fillText(
            `${this.calculateCurrentLevelValue()}`, // Changed from getLevelCoins
            padding + iconSize + spacing,
            this.engine.canvas.height - padding - iconSize/2
        );
        this.engine.ctx.restore();

        // Draw failure screen if active
        if (this.failureShowing) {
            const ctx = this.engine.ctx;
            const centerX = this.engine.canvas.width / 2;
            const centerY = this.engine.canvas.height / 2;
            
            // Draw semi-transparent red background
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.fillRect(0, 0, this.engine.canvas.width, this.engine.canvas.height);
            
            // Draw failure message
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Draw title
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 48px Arial';
            ctx.fillText('You Failed!', centerX, centerY - 100);
            
            // Draw coin penalty
            ctx.font = '24px Arial';
            ctx.fillText(`-${this.failurePenalty} coins`, centerX, centerY - 40);
            
            // Draw buttons
            this.failureButtons.forEach((button, index) => {
                const buttonY = centerY + 40 + (index * 60);
                const hover = this.isButtonHovered(centerX, buttonY);
                
                ctx.fillStyle = hover ? '#8a2be2' : '#4a1a8c';
                ctx.fillRect(centerX - 100, buttonY - 20, 200, 40);
                
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(button.text, centerX, buttonY);
            });
            
            ctx.restore();
        }
    }

    isPlatePressed(x, y) {
        const blockKey = `${x},${y}`;
        return this.movableBlocks.has(blockKey);
    }

    drawInventory() {
        const ctx = this.engine.ctx;
        const padding = 10;
        const iconSize = 32;
        const spacing = 10;
        const textOffset = 40;

        ctx.font = '20px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        let yPos = padding;
        
        if (this.engine.inventory.yellowKeys > 0) {
            this.engine.pixelSprites.drawSprite('key_yellow', padding, yPos, iconSize, iconSize);
            ctx.fillText(`x${this.engine.inventory.yellowKeys}`, padding + textOffset, yPos + iconSize/2);
            yPos += iconSize + spacing;
        }
        
        if (this.engine.inventory.blueKeys > 0) {
            this.engine.pixelSprites.drawSprite('key_blue', padding, yPos, iconSize, iconSize);
            ctx.fillText(`x${this.engine.inventory.blueKeys}`, padding + textOffset, yPos + iconSize/2);
            yPos += iconSize + spacing;
        }
        
        if (this.engine.inventory.redKeys > 0) {
            this.engine.pixelSprites.drawSprite('key_red', padding, yPos, iconSize, iconSize);
            ctx.fillText(`x${this.engine.inventory.redKeys}`, padding + textOffset, yPos + iconSize/2);
        }
    }

    showFailure() {
        if (this.failureShowing) return;
        
        console.log('Showing failure screen');
        this.failureShowing = true;
        this.levelCompleted = true;
        
        // Apply coin penalty
        const currentCoins = this.engine.inventory.coins;
        const penalty = Math.min(currentCoins, this.failurePenalty);
        this.engine.inventory.coins -= penalty;
        this.engine.coinManager.saveCoins(this.engine.inventory.coins);
        
        // Stop player movement immediately
        this.engine.playerPosition = { ...this.engine.playerPosition };
        
        setTimeout(() => {
            console.log('Failure timeout complete, restarting level');
            this.failureShowing = false;
            this.levelCompleted = false;
            this.engine.currentHealth = this.engine.maxHealth;
            this.restartLevel();
        }, this.failureDelay);
    }

    calculateCoinsValue() {
        let totalValue = 0;
        this.collectibles.forEach(coin => {
            if (coin.type === 'bronze_coin') totalValue += 1;
            else if (coin.type === 'silver_coin') totalValue += 5;
            else if (coin.type === 'gold_coin') totalValue += 10;
        });
        return totalValue;
    }

    calculateCurrentLevelValue() {
        let totalValue = 0;
        const uncollectedCoins = this.collectibles;
        uncollectedCoins.forEach(coin => {
            if (coin.type === 'bronze_coin') totalValue += 1;
            else if (coin.type === 'silver_coin') totalValue += 5;
            else if (coin.type === 'gold_coin') totalValue += 10;
        });
        return totalValue;
    }

    isButtonHovered(x, y) {
        const mouseX = this.engine.mousePos.x;
        const mouseY = this.engine.mousePos.y;
        return mouseX >= x - 100 && mouseX <= x + 100 && 
               mouseY >= y - 20 && mouseY <= y + 20;
    }

    handleFailureClick(x, y) {
        if (!this.failureShowing) return;

        const centerX = this.engine.canvas.width / 2;
        this.failureButtons.forEach((button, index) => {
            const buttonY = this.engine.canvas.height / 2 + 40 + (index * 60);
            
            if (this.isButtonHovered(centerX, buttonY)) {
                if (button.action === 'retry') {
                    this.failureShowing = false;
                    this.levelCompleted = false;
                    this.engine.currentHealth = this.engine.maxHealth;
                    this.restartLevel();
                } else if (button.action === 'menu') {
                    this.failureShowing = false;
                    this.levelCompleted = false;
                    this.engine.setState('menu');
                }
            }
        });
    }
}
