class GameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gameState = 'menu'; // Possible states: 'menu', 'instructions', 'start', 'playing', 'options'
        this.validStates = ['menu', 'playing', 'instructions', 'start', 'options', 'shop', 'paused']; // Added 'options'
        this.playerPosition = { x: 0, y: 0 };
        this.mousePos = { x: 0, y: 0 };
        this.keys = {};
        this.inventory = {
            yellowKeys: 0,
            blueKeys: 0,
            redKeys: 0,
            coins: 0,  // Global coins
            levelCoins: 0,  // Coins collected in current level
            skins: this.loadSavedSkins(),
            currentSkin: localStorage.getItem('currentSkin')
        };
        this.setFullscreen();
        this.audio = new AudioManager();
        this.sprites = new SpriteManager(this);
        this.pixelSprites = new PixelSpriteRenderer(this);
        this.trackDisplayTimeout = null;
        this.trackDisplay = document.getElementById('trackDisplay');
        this.isPaused = false;
        this.pauseOverlay = document.getElementById('pauseOverlay');
        this.showFPS = false;
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        this.currentFPS = 0;
        this.fpsUpdateInterval = 1000; // Update every second
        this.lastFPSUpdate = performance.now();
        this.shopManager = new ShopManager(this);
        this.isShopOpen = false;
        this.maxHealth = 3;
        this.currentHealth = 3;
        this.levelManager = null; // Add this line
        this.tileSize = 32;
        this.cameraX = 0;
        this.cameraY = 0;
        this.zoom = 1;
        this.completedLevels = new Set(); // Add this line
        this.levelSession = null; // Add session state tracking
        this.isLoading = true;
        this.loadingProgress = 0;
        this.totalAssets = 14; // Total number of assets to load
        this.MIN_LOADING_TIME = 1000; // Minimum loading screen time in ms
        this.loadStartTime = Date.now();
        
        // Initialize LevelManager
        this.levelManager = new LevelManager(this);
        this.levelManager.collectibles = []; // Move it here after initialization

        this.coinManager = new CoinManager();
        this.inventory.coins = this.coinManager.loadCoins();
        
        window.addEventListener('resize', () => this.setFullscreen());
        
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            this.mousePos = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        });
        
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (e.key === 'm' || e.key === 'M') {
                this.audio.toggleMute();
            }
            if (e.key === 'n' || e.key === 'N') {
                this.audio.nextTrack();
            }
            if (e.key === 'b' || e.key === 'B') {
                this.showCurrentTrack();
            }
            if ((e.key === 'p' || e.key === 'P' || e.key === 'Escape') && 
                this.gameState === 'playing') {
                this.togglePause();
            }
            if (e.key === 'Tab') {  // Changed from 'S' to 'Tab'
                e.preventDefault();   // Prevent Tab from changing focus
                this.toggleShop();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        // Initialize audio with user interaction
        canvas.addEventListener('click', async () => {
            await this.audio.init();
            this.audio.playBackgroundMusic();
        }, { once: true });

        canvas.addEventListener('click', (e) => {
            if (this.isShopOpen) {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                this.shopManager.handleClick(x, y);
            }
        });

        // Load sprite files
        this.loadSprites();

        this.lastTime = 0;
        this.running = true;
        this.frameCount = 0;
        
        // Start the game loop
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));

        // Add console command listener
        window.giveMoney = (amount) => {
            const coins = parseInt(amount);
            if (isNaN(coins)) {
                console.log('Invalid amount');
                return;
            }
            this.addCoins(coins);
            return this.inventory.coins;
        };

        // Add pause button handlers
        document.getElementById('resumeButton').onclick = () => this.resumeGame();
        document.getElementById('pauseMenuButton').onclick = () => {
            this.isPaused = false;
            this.pauseOverlay.style.display = 'none';
            this.setState('menu');
        };

        // Add reset progress handler
        document.getElementById('resetProgress').onclick = () => this.resetProgress();
    }

    async loadSprites() {
        const loadingProgress = document.getElementById('loadingProgress');
        let loaded = 0;
        
        try {
            const sprites = [
                'player', 'items', 'Items', 'block', 'keys', 'walls',
                'doors', 'floor', 'decorations', 'coin', 'hazards',
                'shopkeeper', 'tnt', 'Collectibles', 'potions'
            ];

            for (const sprite of sprites) {
                await this.pixelSprites.loadSprite(`./assets/sprites/${sprite}.ass`);
                loaded++;
                loadingProgress.style.width = `${(loaded / this.totalAssets) * 100}%`;
            }

            // Calculate remaining time to meet minimum duration
            const elapsed = Date.now() - this.loadStartTime;
            const remaining = Math.max(0, this.MIN_LOADING_TIME - elapsed);
            
            // Wait for remaining time if needed
            if (remaining > 0) {
                await new Promise(resolve => setTimeout(resolve, remaining));
            }

            document.getElementById('loadingScreen').style.display = 'none';
            this.isLoading = false;
        } catch (error) {
            console.error('Failed to load sprites:', error);
        }
    }

    setFullscreen() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawText(text, x, y, size, color) {
        this.ctx.fillStyle = color;
        this.ctx.font = `${size}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text, x, y);
    }

    isMouseOver(x, y, width, height) {
        return this.mousePos.x > x - width/2 &&
               this.mousePos.x < x + width/2 &&
               this.mousePos.y > y - height/2;
    }

    isKeyPressed(key) {
        return this.keys[key] || false;
    }

    drawRect(x, y, width, height, color) {
        if (!this.ctx) {
            console.error('No context available');
            return;
        }
        this.ctx.fillStyle = color;
        this.ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(width), Math.floor(height));
    }

    setState(newState) {
        if (this.validStates.includes(newState)) {
            const oldState = this.gameState;
            this.gameState = newState;
            
            if (oldState === 'shop') {
                this.isShopOpen = false;
                this.shopManager.resetState();
            }
            
            if (newState === 'playing') {
                this.resetGameState();
            } else if (newState === 'menu') {
                // Full reset when returning to menu
                this.levelSession = null;
                if (this.levelManager) {
                    this.levelManager.currentLevel = null;
                    this.levelManager.currentLevelName = null;
                    this.levelManager.collectibles = [];
                }
                this.playerPosition = { x: 0, y: 0 };
            }
            
            // Force menu redraw
            if (this.menuManager) {
                this.menuManager.onStateChange(oldState, newState);
                this.menuManager.drawMenu();
            }
        }
    }

    resetGameState() {
        // Preserve global coins and skin data
        const currentCoins = this.inventory.coins;
        const currentSkins = this.inventory.skins || [];
        const equippedSkin = this.inventory.currentSkin;
        
        // Reset inventory and session
        this.inventory = {
            yellowKeys: 0,
            blueKeys: 0,
            redKeys: 0,
            coins: currentCoins,
            levelCoins: 0,
            skins: currentSkins,
            currentSkin: equippedSkin
        };
        this.levelSession = null;

        // Force fresh level load
        if (this.levelManager) {
            const levelToReload = this.levelManager.currentLevelName;
            this.levelManager.currentLevel = null;
            this.levelManager.collectibles = [];
            this.levelManager.movableBlocks = new Map();
            this.levelManager.customFloors = new Map();
            
            if (levelToReload) {
                this.levelManager.loadLevel(levelToReload);
            }
        }

        // Reset player state
        this.playerPosition = { x: 0, y: 0 };
        this.currentHealth = this.maxHealth;
    }

    showCurrentTrack() {
        if (!this.audio.showTrackName) return;
        
        if (this.trackDisplayTimeout) {
            clearTimeout(this.trackDisplayTimeout);
        }

        const trackName = this.audio.getCurrentTrackName();
        this.trackDisplay.textContent = trackName;
        this.trackDisplay.classList.add('show');

        this.trackDisplayTimeout = setTimeout(() => {
            this.trackDisplay.classList.remove('show');
        }, 3000); // Hide after 3 seconds
    }

    togglePause() {
        if (this.gameState === 'playing' || this.gameState === 'paused') {
            this.isPaused = !this.isPaused;
            this.gameState = this.isPaused ? 'paused' : 'playing';
            
            if (this.isPaused) {
                this.pauseOverlay.style.display = 'flex';
                if (this.audio) {
                    this.audio.stopBackgroundMusic();
                }
            } else {
                this.pauseOverlay.style.display = 'none';
                if (this.audio) {
                    this.audio.playBackgroundMusic();
                }
            }
        }
    }

    resumeGame() {
        this.isPaused = false;
        this.gameState = 'playing';
        this.pauseOverlay.style.display = 'none';
        if (this.audio) {
            this.audio.playBackgroundMusic();
        }
    }

    drawPlayer() {
        const playerX = this.playerPosition.x * 32;
        const playerY = this.playerPosition.y * 32;
        
        // Use exact sprite names as defined in sprite files
        let spriteName = 'player';
        if (this.inventory.currentSkin === 'Ninja') {
            spriteName = 'ninja';
        }
        
        console.log('Drawing player with sprite:', spriteName);
        this.pixelSprites.drawSprite(spriteName, playerX, playerY, 32, 32, 'idle');
    }

    toggleFPS() {
        this.showFPS = !this.showFPS;
        // Update button text and save setting
        const fpsButton = document.getElementById('toggleFPS');
        if (fpsButton) {
            fpsButton.textContent = this.showFPS ? 'ON' : 'OFF';
        }
    }

    updateFPS(timestamp) {
        this.frameCount++;
        
        const elapsed = timestamp - this.lastFPSUpdate;
        if (elapsed >= this.fpsUpdateInterval) {
            this.currentFPS = Math.round((this.frameCount * 1000) / elapsed);
            this.frameCount = 0;
            this.lastFPSUpdate = timestamp;
        }
    }

    drawFPS() {
        if (this.showFPS) {
            this.ctx.save();
            this.ctx.fillStyle = '#00FF00';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(`FPS: ${this.currentFPS}`, 10, 10);
            this.ctx.restore();
        }
    }

    toggleShop() {
        this.isShopOpen = !this.isShopOpen;
        if (this.isShopOpen) {
            // Don't create a new level manager if we're just opening the shop
            this.shopManager.showMessage('entrance');
            console.error(!this.shopManager.categories || this.shopManager.categories.length === 0);
            if (!this.shopManager.categories || this.shopManager.categories.length === 0) {
                console.error('No shop categories found!');
                this.shopManager.loadShopItems();
            }
        }
        // Don't change state when closing shop
    }

    addKey(color) {
        console.log(`Adding ${color} key`); // Debug log
        switch(color.toLowerCase()) {
            case 'yellow':
                this.inventory.yellowKeys++;
                break;
            case 'blue':
                this.inventory.blueKeys++;
                break;
            case 'red':
                this.inventory.redKeys++;
                break;
        }
        this.audio.playSoundEffect('collect');
    }

    useKey(color) {
        console.log(`Using ${color} key`); // Debug log
        switch(color.toLowerCase()) {
            case 'yellow':
                if (this.inventory.yellowKeys > 0) {
                    this.inventory.yellowKeys--;
                    return true;
                }
                break;
            case 'blue':
                if (this.inventory.blueKeys > 0) {
                    this.inventory.blueKeys--;
                    return true;
                }
                break;
            case 'red':
                if (this.inventory.redKeys > 0) {
                    this.inventory.redKeys--;
                    return true;
                }
                break;
        }
        return false;
    }

    hasKey(color) {
        switch(color.toLowerCase()) {
            case 'yellow': return this.inventory.yellowKeys > 0;
            case 'blue': return this.inventory.blueKeys > 0;
            case 'red': return this.inventory.redKeys > 0;
            default: return false;
        }
    }

    setLevelManager(levelManager) {
        this.levelManager = levelManager;
        // Set initial zoom based on level size
        this.updateZoom();
    }

    updateZoom() {
        if (!this.levelManager || !this.levelManager.currentLevel) return;
        
        // Check if level is large
        const level = this.levelManager.currentLevel;
        const isLargeLevel = level[0].length > 15 || level.length > 15;
        
        // Set zoom level
        this.zoom = isLargeLevel ? 2 : 1;
        this.renderer.setZoom(this.zoom);

        // Update viewport calculations
        this.viewportWidth = Math.ceil(this.canvas.width / (this.tileSize * this.zoom));
        this.viewportHeight = Math.ceil(this.canvas.height / (this.tileSize * this.zoom));
    }

    damage() {
        if (this.currentHealth <= 0) return; // Prevent damage when already dead
        
        this.currentHealth--;
        console.log('Health after damage:', this.currentHealth);
        
        if (this.currentHealth <= 0) {
            this.currentHealth = 0; // Ensure health doesn't go below 0
            if (this.levelManager) {
                this.levelManager.showFailure();
                this.audio.synthesizer.playSoundEffect('failure');
            }
        } else {
            this.audio.synthesizer.playSoundEffect('collision');
        }
    }

    heal() {
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + 1);
    }

    gameLoop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.updateFPS(timestamp);

        if (this.menuManager) {
            this.menuManager.update(deltaTime);
            
            if (['menu', 'instructions', 'options', 'start'].includes(this.gameState)) {
                this.menuManager.drawMenu();
                this.drawFPS(); // Draw FPS on menu screens
            }
        }

        if (this.gameState === 'shop' && this.levelManager) { // Add safety check
            this.clear();
            this.drawFPS(); // Make sure FPS is drawn last
            if (this.isShopOpen) {
                this.shopManager.drawShop();
            }
        }

        if (this.gameState === 'playing' && !this.isPaused) {
            if (this.levelManager) {
                this.levelManager.drawLevel();
            }
        }

        // Continue the loop
        if (this.running) {
            requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
        }
    }

    loadLevel(levelNumber) {
        // ...existing code...

        // Set zoom based on level size
        const isLargeLevel = this.currentLevel[0].length > 15 || this.currentLevel.length > 15;
        if (isLargeLevel) {
            this.renderer.setZoom(2); // Zoom IN for large levels (focused on player)
            this.currentZoom = 2;
            this.targetZoom = 2;
        } else {
            this.renderer.setZoom(1);
            this.currentZoom = 1;
            this.targetZoom = 1;
        }

        // Calculate level dimensions
        this.levelWidth = this.currentLevel[0].length * this.tileSize;
        this.levelHeight = this.currentLevel.length * this.tileSize;
    }

    update() {
        if (!this.levelManager || !this.playerPosition) return;

        // Calculate camera position with zoom
        const viewWidth = this.canvas.width / this.zoom;
        const viewHeight = this.canvas.height / this.zoom;

        // Center camera on player
        const targetX = (this.playerPosition.x * this.tileSize) - (viewWidth / 2);
        const targetY = (this.playerPosition.y * this.tileSize) - (viewHeight / 2);

        // Smooth camera movement
        this.cameraX += (targetX - this.cameraX) * 0.1;
        this.cameraY += (targetY - this.cameraY) * 0.1;

        // Calculate level boundaries
        const levelWidth = this.levelManager.currentLevel[0].length * this.tileSize;
        const levelHeight = this.levelManager.currentLevel.length * this.tileSize;

        // Clamp camera to level bounds
        this.cameraX = Math.max(0, Math.min(this.cameraX, levelWidth - viewWidth));
        this.cameraY = Math.max(0, Math.min(this.cameraY, levelHeight - viewHeight));

        if (this.levelManager) {
            this.levelManager.checkCollectibles(this.playerPosition.x, this.playerPosition.y);
        }
    }

    render() {
        // ...existing code...
        this.renderer.render(this.currentLevel, this.entities, this.cameraX, this.cameraY);
        // ...existing code...
    }

    getCoins() {
        return this.inventory.coins;
    }

    getLevelCoins() {
        return this.inventory.levelCoins;
    }

    addLevelCoin() {
        this.inventory.levelCoins++;
        this.audio.playSoundEffect('coin_collect');
    }

    addCoinsToGlobal(amount, animate = false) {
        if (!this.inventory) {
            this.inventory = {
                yellowKeys: 0,
                blueKeys: 0,
                redKeys: 0,
                coins: 0,
                levelCoins: 0
            };
        }

        if (animate) {
            // Animate coins being added one by one
            let added = 0;
            const interval = setInterval(() => {
                if (added < amount) {
                    this.inventory.coins++;
                    this.audio.playSoundEffect('coin_add');
                    added++;
                } else {
                    clearInterval(interval);
                    this.coinManager.saveCoins(this.inventory.coins);
                }
            }, 100); // Add a coin every 100ms
        } else {
            this.inventory.coins += amount;
            this.coinManager.saveCoins(this.inventory.coins);
        }
    }

    resetLevelCoins() {
        this.inventory.levelCoins = 0;
    }

    spendCoins(amount) {
        if (this.inventory.coins >= amount) {
            this.inventory.coins -= amount;
            this.coinManager.saveCoins(this.inventory.coins);
            return true;
        }
        return false;
    }

    drawLevel() {
        // ...existing code...

        // Draw coin counters
        const padding = 10;
        const iconSize = 32;
        const spacing = 10;

        // Draw global coins at the top
        this.ctx.save();
        this.pixelSprites.drawSprite('coin', 
            padding, 
            padding, 
            iconSize, 
            iconSize, 
            'idle');
        
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillText(
            `${this.inventory.coins}`,
            padding + iconSize + spacing,
            padding + iconSize/2
        );

        // Draw level coins at the bottom
        this.pixelSprites.drawSprite('coin', 
            padding, 
            this.canvas.height - padding - iconSize, 
            iconSize, 
            iconSize, 
            'idle');
        
        this.ctx.fillText(
            `${this.inventory.levelCoins}`,
            padding + iconSize + spacing,
            this.canvas.height - padding - iconSize/2
        );
        this.ctx.restore();

        // ...existing code...
    }

    loadSavedCoins() {
        try {
            const savedCoins = localStorage.getItem('gameCoins');
            if (savedCoins) {
                this.inventory.coins = parseInt(savedCoins) || 0;
            }
        } catch (error) {
            console.error('Error loading saved coins:', error);
            this.inventory.coins = 0;
        }
    }

    markLevelCompleted(levelName) {
        this.completedLevels.add(levelName);
    }

    addCoins(amount) {
        if (!this.inventory.coins) {
            this.inventory.coins = 0;
        }
        this.inventory.coins += amount;
        // Save coins immediately
        this.coinManager.saveCoins(this.inventory.coins);
        // Force menu redraw to show new amount
        if (this.menuManager) {
            this.menuManager.drawMenu();
        }
    }

    loadSavedSkins() {
        try {
            const savedSkins = localStorage.getItem('ownedSkins');
            const skins = savedSkins ? JSON.parse(savedSkins) : [];
            console.log('Loaded saved skins:', skins);
            return skins;
        } catch (error) {
            console.error('Error loading saved skins:', error);
            return [];
        }
    }

    saveSkins() {
        localStorage.setItem('ownedSkins', JSON.stringify(this.inventory.skins));
        localStorage.setItem('currentSkin', this.inventory.currentSkin || '');
    }

    setCurrentSkin(skinName) {
        console.log('Setting skin:', skinName);
        this.inventory.currentSkin = skinName;
        localStorage.setItem('currentSkin', skinName);
        this.saveSkins();
        console.log('Saved skin data:', {
            inventory: this.inventory.currentSkin,
            localStorage: localStorage.getItem('currentSkin')
        });
    }

    addSkin(skinName) {
        if (!this.inventory.skins.includes(skinName)) {
            this.inventory.skins.push(skinName);
            this.saveSkins();
        }
    }

    resetProgress() {
        if (confirm('Are you sure you want to reset all progress? This cannot be undone!')) {
            // Clear all game data
            localStorage.clear();
            
            // Reset inventory
            this.inventory = {
                yellowKeys: 0,
                blueKeys: 0,
                redKeys: 0,
                coins: 0,
                levelCoins: 0,
                skins: [],
                currentSkin: null
            };
            
            // Reset completed levels
            this.completedLevels = new Set();
            
            // Return to menu
            this.setState('menu');
            
            // Hide options
            document.getElementById('optionsOverlay').style.display = 'none';
        }
    }
}
