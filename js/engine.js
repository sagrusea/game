class GameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gameState = 'menu'; // Possible states: 'menu', 'instructions', 'start', 'playing'
        this.playerPosition = { x: 0, y: 0 };
        this.mousePos = { x: 0, y: 0 };
        this.keys = {};
        this.setFullscreen();
        this.audio = new AudioManager();
        this.sprites = new SpriteManager(this);
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
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        // Initialize audio with user interaction
        canvas.addEventListener('click', async () => {
            await this.audio.init();
            this.audio.playBackgroundMusic();
        }, { once: true });
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
}
