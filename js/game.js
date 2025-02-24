class Game {
    constructor() {
        this.renderer = new GameRenderer(800, 600, 32); // Adjust size as needed
        this.container.appendChild(this.renderer.canvas);
        this.cameraX = 0;
        this.cameraY = 0;
        // Cache sprites on init
        this.initSprites();
        this.targetZoom = GameConfig.zoom.normal;
        this.currentZoom = GameConfig.zoom.normal;
    }

    initSprites() {
        // Cache all game sprites
        const sprites = ['wall', 'floor', 'player', 'key', 'door', /* etc */];
        for (const sprite of sprites) {
            this.renderer.cacheSprite(sprite, this.sprites[sprite]);
        }
    }

    loadLevel(levelNumber) {
        // ...existing code...

        // Special handling for level 8
        if (levelNumber === 8) {
            this.renderer.setSize(
                Math.min(window.innerWidth, 1024),
                Math.min(window.innerHeight, 768)
            );
            
            // Adjust camera bounds for level 8
            this.maxCameraX = (this.currentLevel[0].length * this.tileSize) - this.renderer.canvas.width;
            this.maxCameraY = (this.currentLevel.length * this.tileSize) - this.renderer.canvas.height;
        }

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

        // Calculate level dimensions with zoom
        this.levelWidth = this.currentLevel[0].length * this.tileSize;
        this.levelHeight = this.currentLevel.length * this.tileSize;
    }

    update() {
        // Calculate view dimensions with zoom
        const viewWidth = this.renderer.canvas.width / this.currentZoom;
        const viewHeight = this.renderer.canvas.height / this.currentZoom;

        // Center camera on player
        this.targetCameraX = (this.player.x * this.tileSize) - (viewWidth / 2);
        this.targetCameraY = (this.player.y * this.tileSize) - (viewHeight / 2);

        // Smooth camera movement
        this.cameraX += (this.targetCameraX - this.cameraX) * 0.1;
        this.cameraY += (this.targetCameraY - this.cameraY) * 0.1;

        // Clamp camera to level bounds
        const maxX = (this.levelWidth) - viewWidth;
        const maxY = (this.levelHeight) - viewHeight;
        this.cameraX = Math.max(0, Math.min(this.cameraX, maxX));
        this.cameraY = Math.max(0, Math.min(this.cameraY, maxY));
    }

    render() {
        // Replace old rendering code with new optimized version
        this.renderer.render(this.currentLevel, this.entities, this.cameraX, this.cameraY);
        requestAnimationFrame(() => this.render());
    }
}
