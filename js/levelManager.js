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

    showCompletion() {
        this.levelCompleted = true;  // Set completion flag
        
        // Reset keys immediately on level completion
        this.engine.inventory = {
            yellowKeys: 0,
            blueKeys: 0,
            redKeys: 0
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

    loadLevel(levelName) {
        console.log('Loading level:', levelName); // Debug log
        if (this.levels[levelName]) {
            this.currentLevel = this.levels[levelName];
            this.inventory = { keys: 0, hasBlueKey: false, hasRedKey: false };
            this.movableBlocks.clear();
            this.spikes.clear();
            
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
                    if (this.currentLevel[y][x] === 'j') {
                        this.spikes.set(`${x},${y}`, {
                            extended: false,
                            nextChange: Date.now() + Math.random() * 1500 + 1000
                        });
                    }
                }
            }
            this.currentLevelName = levelName;
            console.log('Level loaded successfully');
        } else {
            console.error('Level not found:', levelName);
        }
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
                if (spikeState && spikeState.extended) {
                    this.restartLevel();
                    return;
                }
                
                if (this.currentLevel[newPos.y][newPos.x] === 'f') {
                    this.showCompletion();
                }
            } else {
                this.engine.audio.synthesizer.playSoundEffect('collision');
            }
        }
        
        // Add spike update call
        this.updateSpikes();
    }

    isValidMove(pos) {
        if (!this.inBounds(pos)) return false;
        
        const tile = this.currentLevel[pos.y][pos.x];
        
        // Check for walls and locked doors
        if (tile === 'x' || tile === 'D') return false;  // Added 'D' to block movement
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

    updateSpikes() {
        const now = Date.now();
        this.spikes.forEach((spike, pos) => {
            if (now >= spike.nextChange) {
                spike.extended = !spike.extended;
                spike.nextChange = now + Math.random() * 1500 + 1000; // Random between 1000-2500ms
                
                // If player is on spikes when they extend, restart level
                const [x, y] = pos.split(',').map(Number);
                if (spike.extended && 
                    this.engine.playerPosition.x === x && 
                    this.engine.playerPosition.y === y) {
                    this.restartLevel();
                }
            }
        });
    }

    drawLevel() {
        if (!this.currentLevel) {
            console.error('No level loaded');
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

                // Draw floor sprite for all tiles
                this.engine.pixelSprites.drawSprite('floor', tileX, tileY, tileSize, tileSize);

                // Draw tile content using pixel sprites
                switch(this.currentLevel[y][x]) {
                    case 'x':
                        this.engine.pixelSprites.drawSprite('wall', tileX, tileY, tileSize, tileSize);
                        break;
                    case 'k':
                        this.engine.pixelSprites.drawSprite('key_yellow', tileX, tileY, tileSize, tileSize);
                        break;
                    case 'K':
                        this.engine.pixelSprites.drawSprite('key_blue', tileX, tileY, tileSize, tileSize);
                        break;
                    case 'Y':
                        this.engine.pixelSprites.drawSprite('key_red', tileX, tileY, tileSize, tileSize);
                        break;
                    case 'L':
                        this.engine.pixelSprites.drawSprite('door_normal', tileX, tileY, tileSize, tileSize);
                        break;
                    case 'B':
                        this.engine.pixelSprites.drawSprite('door_blue', tileX, tileY, tileSize, tileSize);
                        break;
                    case 'R':
                        this.engine.pixelSprites.drawSprite('door_red', tileX, tileY, tileSize, tileSize);
                        break;
                    case 'p':
                        this.engine.pixelSprites.drawSprite('plate', tileX, tileY, tileSize, tileSize, 
                            this.isPlatePressed(x, y) ? 'pressed' : 'idle');
                        break;
                    case 'D':
                        this.engine.pixelSprites.drawSprite('door_mechanism', tileX, tileY, tileSize, tileSize);
                        break;
                    case 'f':
                        const finishFrame = Math.floor(Date.now() / 500) % 2 === 0 ? 'idle' : 'glow';
                        this.engine.pixelSprites.drawSprite('finish', tileX, tileY, tileSize, tileSize, finishFrame);
                        break;
                    case 'j':
                        const spikeState = this.spikes.get(`${x},${y}`);
                        const spikeFrame = spikeState && spikeState.extended ? 'extended' : 'idle';
                        this.engine.pixelSprites.drawSprite('spikes', tileX, tileY, tileSize, tileSize, spikeFrame);
                        break;
                }
            }
        }

        // Draw movable blocks
        for (const [_, block] of this.movableBlocks) {
            const blockX = offsetX + block.x * tileSize;
            const blockY = offsetY + block.y * tileSize;
            this.engine.pixelSprites.drawSprite('block', blockX, blockY, tileSize, tileSize);
        }

        // Only draw player if level is not completed
        if (this.engine.playerPosition && !this.levelCompleted) {
            const playerX = offsetX + this.engine.playerPosition.x * tileSize;
            const playerY = offsetY + this.engine.playerPosition.y * tileSize;
            const frame = this.isMoving ? 'move' : 'idle';
            this.engine.pixelSprites.drawSprite('player', playerX, playerY, tileSize, tileSize, frame);
        }

        // Draw inventory
        this.drawInventory();
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
}
