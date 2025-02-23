class GameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gameState = 'menu'; // Possible states: 'menu', 'instructions', 'start', 'playing', 'options'
        this.validStates = ['menu', 'playing', 'instructions', 'start', 'options']; // Added 'options'
        this.playerPosition = { x: 0, y: 0 };
        this.mousePos = { x: 0, y: 0 };
        this.keys = {};
        this.inventory = {
            yellowKeys: 0,
            blueKeys: 0,
            redKeys: 0
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
    }

    async loadSprites() {
        try {
            await Promise.all([
                this.pixelSprites.loadSprite('./assets/sprites/player.ass'),
                this.pixelSprites.loadSprite('./assets/sprites/block.ass'),
                this.pixelSprites.loadSprite('./assets/sprites/keys.ass'),
                this.pixelSprites.loadSprite('./assets/sprites/walls.ass'),
                this.pixelSprites.loadSprite('./assets/sprites/doors.ass'),
                this.pixelSprites.loadSprite('./assets/sprites/floor.ass'),
                this.pixelSprites.loadSprite('./assets/sprites/decorations.ass'),
                this.pixelSprites.loadSprite('./assets/sprites/coin.ass'),
                this.pixelSprites.loadSprite('./assets/sprites/hazards.ass')
            ]);
            console.log('Sprites loaded successfully');
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
               this.mousePos.y > y - height/2 &&
               this.mousePos.y < y + height/2;
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
            console.log(`State changing from ${oldState} to ${newState} at frame ${this.frameCount}`);
            this.gameState = newState;
            
            // Reset inventory when starting a new game
            if (newState === 'playing') {
                this.inventory = {
                    yellowKeys: 0,
                    blueKeys: 0,
                    redKeys: 0
                };
            }
            
            // Force a redraw when state changes
            if (this.menuManager) {
                this.menuManager.onStateChange(oldState, newState);
                // Ensure immediate redraw
                this.menuManager.drawMenu();
            }
        } else {
            console.error('Invalid game state:', newState);
        }
        if (newState === 'menu' && this.isPaused) {
            this.togglePause();
        }
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
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.pauseOverlay.style.display = 'flex';
            // Optionally pause music or other animations
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

    resumeGame() {
        if (this.isPaused) {
            this.togglePause();
        }
    }

    drawPlayer() {
        const playerX = this.playerPosition.x * 32; // Assuming 32x32 tiles
        const playerY = this.playerPosition.y * 32;
        this.pixelSprites.drawSprite('player', playerX, playerY, 32, 32); // Use 'player' as the sprite name
    }

    toggleFPS() {
        this.showFPS = !this.showFPS;
        document.getElementById('toggleFPS').textContent = this.showFPS ? 'ON' : 'OFF';
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
        if (this.gameState === 'playing') {
            this.isShopOpen = !this.isShopOpen;
            if (this.isShopOpen) {
                this.shopManager.showMessage('GREETING');
            }
        }
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

        if (this.gameState === 'playing') {
            this.clear();
            this.levelManager.drawLevel(); // FPS is drawn inside drawLevel
            this.drawFPS(); // Make sure FPS is drawn last
            if (this.isShopOpen) {
                this.shopManager.drawShop();
            }
        }

        // Continue the loop
        if (this.running) {
            requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
        }
    }
}
