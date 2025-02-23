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

        // Check if level exceeds threshold
        const isLargeLevel = 
            this.currentLevel[0].length > GameConfig.levelSizeThreshold.width ||
            this.currentLevel.length > GameConfig.levelSizeThreshold.height;

        if (isLargeLevel) {
            this.targetZoom = GameConfig.zoom.follow;
            this.renderer.setZoom(this.targetZoom);
        } else {
            this.targetZoom = GameConfig.zoom.normal;
            this.renderer.setZoom(this.targetZoom);
        }
    }

    update() {
        // Update camera position to follow player
        this.cameraX = this.player.x - (this.renderer.canvas.width / 2);
        this.cameraY = this.player.y - (this.renderer.canvas.height / 2);
        
        // Clamp camera to level bounds
        this.cameraX = Math.max(0, Math.min(this.cameraX, this.levelWidth - this.renderer.canvas.width));
        this.cameraY = Math.max(0, Math.min(this.cameraY, this.levelHeight - this.renderer.canvas.height));
        
        // Smoother camera movement for large levels
        const isLargeLevel = this.currentLevel[0].length > 20;
        if (isLargeLevel) {
            this.cameraX += (this.targetCameraX - this.cameraX) * 0.1;
            this.cameraY += (this.targetCameraY - this.cameraY) * 0.1;
        }

        // Update camera position with zoom factor
        const viewWidth = this.renderer.canvas.width / this.currentZoom;
        const viewHeight = this.renderer.canvas.height / this.currentZoom;

        this.targetCameraX = this.player.x - (viewWidth / 2);