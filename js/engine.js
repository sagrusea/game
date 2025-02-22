class GameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gameState = 'menu'; // Possible states: 'menu', 'instructions', 'start', 'playing', 'options'
        this.validStates = ['menu', 'playing', 'instructions', 'start', 'options']; // Added 'options'
        this.playerPosition = { x: 0, y: 0 };
        this.mousePos = { x: 0, y: 0 };
        this.keys = {};
        this.setFullscreen();
        this.audio = new AudioManager();
        this.sprites = new SpriteManager(this);
        this.pixelSprites = new PixelSpriteRenderer(this);
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
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        // Initialize audio with user interaction
        canvas.addEventListener('click', async () => {
            await this.audio.init();
            this.audio.playBackgroundMusic();
        }, { once: true });

        // Load sprite files
        this.loadSprites();

        this.lastTime = 0;
        this.running = true;
        this.frameCount = 0;
        
        // Start the game loop
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    async loadSprites() {
        await Promise.all([
            this.pixelSprites.loadSprite('assets/sprites/player.ass'),
            this.pixelSprites.loadSprite('assets/sprites/block.ass'),
            this.pixelSprites.loadSprite('assets/sprites/keys.ass'),
            this.pixelSprites.loadSprite('assets/sprites/walls.ass'),
            this.pixelSprites.loadSprite('assets/sprites/doors.ass'),
            this.pixelSprites.loadSprite('assets/sprites/floor.ass'),
            this.pixelSprites.loadSprite('assets/sprites/decorations.ass')
        ]);
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
            
            // Force a redraw when state changes
            if (this.menuManager) {
                this.menuManager.onStateChange(oldState, newState);
                // Ensure immediate redraw
                this.menuManager.drawMenu();
            }
        } else {
            console.error('Invalid game state:', newState);
        }
    }

    gameLoop(timestamp) {
        this.frameCount++;
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // Debug output every 60 frames
        if (this.frameCount % 60 === 0) {
            console.log('Game loop frame:', this.frameCount);
            console.log('Current state:', this.gameState);
        }

        // Update and draw based on game state
        if (this.menuManager) {
            this.menuManager.update(deltaTime);
            
            // Only draw menu if in a menu state
            if (['menu', 'instructions', 'options', 'start'].includes(this.gameState)) {
                this.menuManager.drawMenu();
            }
        }

        // Continue the loop
        if (this.running) {
            requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
        }
    }
}
