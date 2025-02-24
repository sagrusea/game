class GameRenderer {
    constructor(width, height, tileSize) {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.tileSize = tileSize;
        this.zoom = 1;
        this.setSize(width, height);
        this.spriteCache = new Map();
    }

    setSize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx.imageSmoothingEnabled = false;
        this.viewportWidth = Math.ceil(width / (this.tileSize * this.zoom));
        this.viewportHeight = Math.ceil(height / (this.tileSize * this.zoom));
    }

    setZoom(zoom) {
        this.zoom = zoom;
        this.setSize(this.canvas.width, this.canvas.height);
    }

    clear() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    cacheSprite(key, spriteData) {
        const offscreen = document.createElement('canvas');
        const spriteSize = this.tileSize * 2; // Double size for better scaling
        offscreen.width = spriteSize;
        offscreen.height = spriteSize;
        const ctx = offscreen.getContext('2d', { alpha: true });
        ctx.imageSmoothingEnabled = false;

        // Draw sprite at double size
        // ... sprite drawing logic here ...

        this.spriteCache.set(key, offscreen);
    }

    render(levelData, entities, cameraX, cameraY) {
        this.clear();
        
        this.ctx.save();
        
        // Apply zoom and camera transform
        this.ctx.scale(this.zoom, this.zoom);
        this.ctx.translate(-Math.floor(cameraX), -Math.floor(cameraY));

        // Calculate visible area
        const startX = Math.floor(cameraX / this.tileSize);
        const startY = Math.floor(cameraY / this.tileSize);
        const endX = startX + Math.ceil(this.canvas.width / (this.tileSize * this.zoom)) + 1;
        const endY = startY + Math.ceil(this.canvas.height / (this.tileSize * this.zoom)) + 1;

        // Draw only visible tiles
        for (let y = startY; y < endY; y++) {
            if (y < 0 || y >= levelData.length) continue;
            for (let x = startX; x < endX; x++) {
                if (x < 0 || x >= levelData[0].length) continue;
                const tile = levelData[y][x];
                const sprite = this.spriteCache.get(tile);
                if (sprite) {
                    this.ctx.drawImage(sprite,
                        x * this.tileSize,
                        y * this.tileSize,
                        this.tileSize,
                        this.tileSize
                    );
                }
            }
        }

        // Draw entities
        for (const entity of entities) {
            const sprite = this.spriteCache.get(entity.type);
            if (sprite) {
                this.ctx.drawImage(sprite,
                    entity.x * this.tileSize,
                    entity.y * this.tileSize,
                    this.tileSize,
                    this.tileSize
                );
            }
        }

        this.ctx.restore();
    }

    getVisibleTiles(levelData, cameraX, cameraY) {
        const startX = Math.max(0, Math.floor(cameraX / this.tileSize));
        const startY = Math.max(0, Math.floor(cameraY / this.tileSize));
        const endX = Math.min(levelData[0].length, startX + this.viewportWidth + 1);
        const endY = Math.min(levelData.length, startY + this.viewportHeight + 1);

        return {
            startX, startY, endX, endY,
            offsetX: -(cameraX % this.tileSize),
            offsetY: -(cameraY % this.tileSize)
        };
    }

    isVisible(entity, visible) {
        const ex = Math.floor(entity.x / this.tileSize);
        const ey = Math.floor(entity.y / this.tileSize);
        return ex >= visible.startX - 1 && 
               ex <= visible.endX + 1 && 
               ey >= visible.startY - 1 && 
               ey <= visible.endY + 1;
    }
}
