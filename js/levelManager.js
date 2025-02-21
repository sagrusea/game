class LevelManager {
    constructor(engine) {
        this.engine = engine;
        this.levels = {
            level1: [
                ['c', '.', '.', 'x', '.', '.', '.', 'k', '.', '.', 'L', '.', '.', 'f'],
                ['.', 'x', '.', '.', '.', 'x', '.', 'x', '.', 'x', '.', '.', 'x', '.'],
                ['.', '.', '.', 'x', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'],
                ['x', '.', '.', '.', '.', 'x', '.', 'x', '.', 'x', '.', '.', 'x', '.'],
                ['.', 'x', '.', 'x', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.']
            ],
            level2: [
                ['c', '.', '.', '.', 'B', '.', '.', '.', '.', 'x', '.', '.', '.', '.'],
                ['.', 'x', 'x', '.', 'x', '.', 'x', 'x', '.', '.', '.', 'x', 'x', '.'],
                ['.', '.', '.', '.', '.', '.', '.', '.', '.', 'x', '.', '.', '.', '.'],
                ['x', 'x', '.', 'x', '.', 'x', '.', 'x', '.', '.', '.', 'x', '.', '.'],
                ['.', '.', '.', '.', '.', '.', '.', '.', '.', 'x', '.', '.', '.', '.'],
                ['.', 'x', 'x', '.', 'x', '.', 'x', '.', '.', '.', '.', 'x', 'x', '.'],
                ['K', '.', '.', '.', '.', '.', '.', '.', '.', 'x', '.', '.', '.', 'f']
            ],
            level3: [
                ['c', '.', '.', '.', 'b', '.', '.', 'p', '.', '.', '.', '.', 'D', 'f'],
                ['.', 'x', 'x', '.', '.', '.', 'x', 'x', 'x', '.', 'x', 'x', 'x', '.'],
                ['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'],
                ['x', '.', 'x', '.', 'x', '.', 'x', '.', 'x', '.', 'x', '.', 'x', '.'],
                ['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'],
                ['.', 'x', '.', 'x', '.', 'x', '.', 'x', '.', 'x', '.', 'x', '.', '.'],
                ['k', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', 'L']
            ],
            level4: [
                ['c', '.', '.', '.', 'K', '.', '.', '.', '.', '.', '.', '.', '.', '.'],
                ['.', 'x', 'x', 'x', 'x', 'x', '.', 'x', 'x', 'x', 'x', 'x', '.', '.'],
                ['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'],
                ['x', 'x', '.', 'x', '.', 'x', 'B', 'x', '.', 'x', '.', 'x', 'x', '.'],
                ['.', '.', '.', '.', 'b', '.', '.', '.', 'p', '.', '.', '.', '.', '.'],
                ['.', 'x', 'x', '.', 'x', '.', 'x', '.', 'x', '.', 'x', 'x', '.', '.'],
                ['.', '.', '.', '.', '.', '.', 'D', '.', '.', '.', '.', '.', '.', 'f']
            ]
        };
        this.currentLevel = null;
        this.moveDelay = 0;
        this.moveSpeed = 150; // Milliseconds between moves
        this.inventory = {
            keys: 0,
            hasBlueKey: false,
            hasRedKey: false
        };
        
        this.movableBlocks = new Map(); // Store positions of movable blocks
    }

    loadLevel(levelName) {
        console.log('Loading level:', levelName); // Debug log
        if (this.levels[levelName]) {
            this.currentLevel = this.levels[levelName];
            this.inventory = { keys: 0, hasBlueKey: false, hasRedKey: false };
            this.movableBlocks.clear();
            
            // Find starting position (first 'c' in the level)
            for (let y = 0; y < this.currentLevel.length; y++) {
                for (let x = 0; x < this.currentLevel[y].length; x++) {
                    if (this.currentLevel[y][x] === 'c') {
                        this.engine.playerPosition = { x, y };
                        // Replace 'c' with '.' after finding player start
                        this.currentLevel[y][x] = '.';
                    }
                    if (this.currentLevel[y][x] === 'b') {
                        this.movableBlocks.set(`${x},${y}`, { x, y });
                    }
                }
            }
            console.log('Level loaded successfully');
        } else {
            console.error('Level not found:', levelName);
        }
    }

    updatePlayer() {
        if (!this.currentLevel) return;
        
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
                
                if (this.currentLevel[newPos.y][newPos.x] === 'f') {
                    this.engine.audio.synthesizer.playSoundEffect('victory');
                    setTimeout(() => {
                        alert('Level Complete!');
                        this.engine.gameState = 'start';
                    }, 500);
                }
            } else {
                this.engine.audio.synthesizer.playSoundEffect('collision');
            }
        }
    }

    isValidMove(pos) {
        if (!this.inBounds(pos)) return false;
        
        const tile = this.currentLevel[pos.y][pos.x];
        
        // Check for walls and locked doors
        if (tile === 'x') return false;
        if (tile === 'L' && !this.inventory.keys) return false;
        if (tile === 'B' && !this.inventory.hasBlueKey) return false;
        if (tile === 'R' && !this.inventory.hasRedKey) return false;

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
                this.inventory.keys++;
                this.currentLevel[pos.y][pos.x] = '.';
                this.engine.audio.synthesizer.playSoundEffect('collect');
                break;
            case 'K':
                this.inventory.hasBlueKey = true;
                this.currentLevel[pos.y][pos.x] = '.';
                this.engine.audio.synthesizer.playSoundEffect('collect');
                break;
            case 'Y':
                this.inventory.hasRedKey = true;
                this.currentLevel[pos.y][pos.x] = '.';
                this.engine.audio.synthesizer.playSoundEffect('collect');
                break;
            case 'L':
                if (this.inventory.keys > 0) {
                    this.inventory.keys--;
                    this.currentLevel[pos.y][pos.x] = '.';
                    this.engine.audio.synthesizer.playSoundEffect('unlock');
                }
                break;
            case 'B':
            case 'R':
                if ((tile === 'B' && this.inventory.hasBlueKey) ||
                    (tile === 'R' && this.inventory.hasRedKey)) {
                    this.currentLevel[pos.y][pos.x] = '.';
                    this.engine.audio.synthesizer.playSoundEffect('unlock');
                }
                break;
        }
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

    drawLevel() {
        if (!this.currentLevel) {
            console.error('No level loaded');
            return;
        }
        
        this.updatePlayer();
        
        this.engine.clear();
        this.engine.drawRect(0, 0, this.engine.canvas.width, this.engine.canvas.height, '#333');
        
        // Calculate tile size based on canvas and level size
        const tileWidth = this.engine.canvas.width / this.currentLevel[0].length;
        const tileHeight = this.engine.canvas.height / this.currentLevel.length;
        const tileSize = Math.min(tileWidth, tileHeight);

        // Center the level
        const offsetX = (this.engine.canvas.width - tileSize * this.currentLevel[0].length) / 2;
        const offsetY = (this.engine.canvas.height - tileSize * this.currentLevel.length) / 2;

        // Draw tiles with sprites
        for (let y = 0; y < this.currentLevel.length; y++) {
            for (let x = 0; x < this.currentLevel[y].length; x++) {
                const tileX = offsetX + x * tileSize;
                const tileY = offsetY + y * tileSize;

                // Draw floor sprite for all tiles
                this.engine.sprites.drawSprite('floor', tileX, tileY, tileSize, tileSize);

                // Draw tile content
                switch(this.currentLevel[y][x]) {
                    case 'x':
                        break;
                    case 'L': // Normal lock
                        this.engine.drawRect(tileX, tileY, tileSize, tileSize, '#886600');
                        break;
                    case 'B': // Blue door
                        this.engine.drawRect(tileX, tileY, tileSize, tileSize, '#000066');
                        break;
                    case 'R': // Red door
                        this.engine.drawRect(tileX, tileY, tileSize, tileSize, '#660000');
                        break;
                    case 'p': // Pressure plate
                        this.engine.drawRect(tileX + tileSize/4, tileY + tileSize/4, 
                                          tileSize/2, tileSize/4, '#444');
                        break;
                    case 'D': // Door (for mechanisms)
                        this.engine.drawRect(tileX, tileY, tileSize, tileSize, '#444');
                        break;
                }

                // Draw player
                if (x === this.engine.playerPosition.x && y === this.engine.playerPosition.y) {
                    this.engine.drawRect(tileX, tileY, tileSize, tileSize, 'red');
                }
            }
        }

        // Draw movable blocks
        for (const [_, block] of this.movableBlocks) {
            const tileX = offsetX + block.x * tileSize;
            const tileY = offsetY + block.y * tileSize;
            this.engine.drawRect(tileX, tileY, tileSize, tileSize, '#8B4513');
        }

        // Draw player
        if (this.engine.playerPosition) {
            const playerX = offsetX + this.engine.playerPosition.x * tileSize;
            const playerY = offsetY + this.engine.playerPosition.y * tileSize;
            this.engine.drawRect(playerX, playerY, tileSize, tileSize, 'red');
        }

        // Draw inventory
        this.drawInventory();
    }

    drawInventory() {
        const padding = 20;
        const iconSize = 30;
        
        // Draw keys count
        this.engine.drawText(`Keys: ${this.inventory.keys}`, 
                           padding + iconSize, padding + iconSize/2, 20, 'white');
        
        // Draw special keys
        if (this.inventory.hasBlueKey) {
            this.engine.drawRect(padding, padding + iconSize, iconSize, iconSize, 'blue');
        }
        if (this.inventory.hasRedKey) {
            this.engine.drawRect(padding, padding + iconSize * 2, iconSize, iconSize, 'red');
        }
    }
}
