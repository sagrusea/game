class GameRenderer {
    constructor(width, height, tileSize) {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.tileSize = tileSize;
        this.setSize(width, height);
        this.spriteCache = new Map();
        this.viewportWidth = Math.ceil(width / tileSize);
        this.viewportHeight = Math.ceil(height / tileSize);
        this.zoom = 1;
        this.baseScale = Math.min(
            Math.floor(width / (this.viewportWidth * this.tileSize)),
            Math.floor(height / (this.viewportHeight * this.tileSize))
        );
    }

    setSize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx.imageSmoothingEnabled = false;
        // Add pixel-perfect scaling
        this.scale = Math.min(
            Math.floor(width / (this.viewportWidth * this.tileSize)),
            Math.floor(height / (this.viewportHeight * this.tileSize))
        );
    }

    setZoom(zoomLevel) {
        this.zoom = zoomLevel;
        this.updateViewport();
    }

    updateViewport() {
        this.effectiveTileSize = this.tileSize * this.zoom;
        this.viewportWidth = Math.ceil(this.canvas.width / this.effectiveTileSize);
        this.viewportHeight = Math.ceil(this.canvas.height / this.effectiveTileSize);
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

    render(levelData, entities, cameraX, cameraY) {
        this.clear();

        // Special handling for large levels (like level 8)
        const isLargeLevel = levelData[0].length > 20;
        if (isLargeLevel) {
            this.renderLargeLevel(levelData, entities, cameraX, cameraY);
            return;
        }

        const visible = this.getVisibleTiles(levelData, cameraX, cameraY);

        // Batch render background tiles
        this.ctx.save();
        this.ctx.translate(visible.offsetX, visible.offsetY);
        
        for (let y = visible.startY; y < visible.endY; y++) {
            for (let x = visible.startX; x < visible.endX; x++) {
                const tile = levelData[y][x];
                const sprite = this.spriteCache.get(tile);
                if (sprite) {
                    this.ctx.drawImage(sprite, 
                        x * this.tileSize, 
                        y * this.tileSize, 
                        this.tileSize, 
                        this.tileSize);
                }
            }
        }

        // Batch render entities
        for (const entity of entities) {
            if (this.isVisible(entity, visible)) {
                const sprite = this.spriteCache.get(entity.type);
                if (sprite) {
                    this.ctx.drawImage(sprite,
                        entity.x - cameraX,
                        entity.y - cameraY,
                        this.tileSize,
                        this.tileSize);
                }
            }
        }

        this.ctx.restore();
    }

    renderLargeLevel(levelData, entities, cameraX, cameraY) {
        const visible = this.getVisibleTiles(levelData, cameraX, cameraY);
        const tileBuffer = document.createElement('canvas');
        tileBuffer.width = this.viewportWidth * this.effectiveTileSize;
        tileBuffer.height = this.viewportHeight * this.effectiveTileSize;
        const bufferCtx = tileBuffer.getContext('2d');
        bufferCtx.imageSmoothingEnabled = false;

        // Scale the context based on zoom
        bufferCtx.scale(this.zoom, this.zoom);

        // Render tiles to buffer
        for (let y = visible.startY; y < visible.endY; y++) {
            for (let x = visible.startX; x < visible.endX; x++) {
                const tile = levelData[y][x];
                const sprite = this.spriteCache.get(tile);
                if (sprite) {
                    bufferCtx.drawImage(sprite,
                        (x - visible.startX) * this.tileSize,
                        (y - visible.startY) * this.tileSize,
                        this.tileSize,
                        this.tileSize
                    );
                }
            }
        }

        // Render entities to buffer
        const visibleEntities = entities.filter(e => this.isVisible(e, visible));
        visibleEntities.forEach(entity => {
            const sprite = this.spriteCache.get(entity.type);
            if (sprite) {
                bufferCtx.drawImage(sprite,
                    entity.x - (visible.startX * this.tileSize) - (cameraX % this.tileSize),
                    entity.y - (visible.startY * this.tileSize) - (cameraY % this.tileSize),
                    this.tileSize,
                    this.tileSize
                );
            }
        });

        // Draw buffer to main canvas with proper scaling
        this.ctx.save();
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.drawImage(
            tileBuffer,
            0, 0,
            tileBuffer.width, tileBuffer.height,
            0, 0,
            this.canvas.width, this.canvas.height
        );
        this.ctx.restore();
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
