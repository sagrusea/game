class MenuManager {
    constructor(engine) {
        this.engine = engine;
        this.ctx = engine.ctx;  // Get context from engine
        this.canvas = engine.canvas;  // Get canvas from engine
        this.levelManager = null; // Will be set from script.js
        this.menuConfig = {
            title: "Gauntlet of Keys",
            options: ["Start Game", "Instructions", "Options","Shop", "Exit"] // Added "Options"
        };
        this.sfxEnabled = true;
        this.volume = 1.0;
        this.instructionsText = {
            controls: [
                "Controls:",
                "- Arrow keys or WASD to move",
                "- ESC to pause",
                "- M to toggle music",
                "- N to change music track",
                "- B to show current track"
            ],
            goal: [
                { text: "Goal:", sprite: null },
                { text: "- Reach the finish", sprite: "finish", frame: "idle" },
                { text: "- Collect keys to open doors", sprite: "key_yellow", frame: "idle" },
                { text: "- Yellow keys open normal doors", sprite: "door_normal", frame: "idle" },
                { text: "- Blue keys open blue doors", sprite: "key_blue", frame: "idle" },
                { text: "- Push blocks onto plates", sprite: "plate", frame: "idle" },
                { text: "- Avoid walls", sprite: "wall", frame: "idle" },
                { text: "- Avoid spikes", sprite: "spikes", frame: "idle" }
            ],
            info: [
                "Game Info:",
                "- Each level has different challenges",
                "- Blue keys open blue doors",
                "- Yellow keys open regular doors",
                "- Blocks can be pushed onto plates",
                "- Collect coins to buy new skins and upgrades"
            ]
        };
        this.currentInstructionsTab = 'controls';
        this.currentState = 'menu';
        this.lastState = null;
        this.framesSinceStateChange = 0;
        this.stateChangeTime = 0;
        this.selectedOption = 0;
        this.musicVolume = 100;
        this.sfxVolume = 100;
        this.loadSettings();
        this.initOptionsOverlay();
        this.currentLevelPage = 0;
        this.levelsPerPage = 15; // Increased from 9 to 15
        this.totalLevels = 50;  // Increased total levels
        this.levelCosts = {
            level1: 0,      // First level free
            level2: 100,    // Beginner levels
            level3: 200,
            level4: 300,
            level5: 500,
            level6: 750,    // Intermediate levels
            level7: 1000,
            level8: 1250,
            level9: 1500,
            level10: 2000,  // Advanced levels
            level11: 2500,
            level12: 3000,
            level13: 3500,
            level14: 4000,
            level15: 5000   // Add more levels as needed
        };
        this.chapters = {
            'Chapter 1': { startLevel: 1, endLevel: 15, color: '#4a9f4a', cost: 0 },
            'Chapter 2': { startLevel: 16, endLevel: 30, color: '#9f4a4a', cost: 5000 },
            'Chapter 3': { startLevel: 31, endLevel: 45, color: '#4a4a9f', cost: 15000 },
            'Chapter 4': { startLevel: 46, endLevel: 50, color: '#9f9f4a', cost: 30000 }
        };
        this.currentChapter = 'Chapter 1';
        this.chapterTransition = 0;
        this.buttonWidth = 200; // Increased from default
        this.buttonHeight = 50; // Increased from default
        this.version = 'A5_1.1';
    }

    loadSettings() {
        // Load settings from cookies
        const settings = this.getCookies();
        this.musicVolume = parseInt(settings.musicVolume) || 100;
        this.sfxVolume = parseInt(settings.sfxVolume) || 100;
        this.engine.audio.setVolume(this.musicVolume / 100);
        this.engine.audio.setSfxVolume(this.sfxVolume / 100);
        this.engine.audio.setSfxEnabled(settings.sfxEnabled !== 'false');
        if (settings.musicMuted === 'true') {
            this.engine.audio.toggleMute();
        }
    }

    saveSettings() {
        // Save settings to cookies with 30 day expiration
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        const options = `;expires=${expiryDate.toUTCString()};path=/`;
        
        document.cookie = `musicVolume=${this.musicVolume}${options}`;
        document.cookie = `sfxVolume=${this.sfxVolume}${options}`;
        document.cookie = `sfxEnabled=${this.engine.audio.sfxEnabled}${options}`;
        document.cookie = `musicMuted=${this.engine.audio.isMuted}${options}`;
    }

    getCookies() {
        return document.cookie.split(';').reduce((settings, cookie) => {
            const [key, value] = cookie.trim().split('=');
            settings[key] = value;
            return settings;
        }, {});
    }

    initOptionsOverlay() {
        const overlay = document.getElementById('optionsOverlay');
        const volumeValue = document.getElementById('volumeValue');
        const toggleMusic = document.getElementById('toggleMusic');
        const toggleSFX = document.getElementById('toggleSFX');
        
        document.getElementById('volumeUp').addEventListener('click', () => {
            this.musicVolume = Math.min(100, this.musicVolume + 10);
            this.engine.audio.setVolume(this.musicVolume / 100);
            volumeValue.textContent = `${this.musicVolume}%`;
            this.saveSettings();
        });

        document.getElementById('volumeDown').addEventListener('click', () => {
            this.musicVolume = Math.max(0, this.musicVolume - 10);
            this.engine.audio.setVolume(this.musicVolume / 100);
            volumeValue.textContent = `${this.musicVolume}%`;
            this.saveSettings();
        });

        toggleMusic.addEventListener('click', () => {
            this.engine.audio.toggleMute();
            toggleMusic.textContent = this.engine.audio.isMuted ? 'OFF' : 'ON';
            this.saveSettings();
        });

        toggleSFX.addEventListener('click', () => {
            this.engine.audio.setSfxEnabled(!this.engine.audio.sfxEnabled);
            toggleSFX.textContent = this.engine.audio.sfxEnabled ? 'ON' : 'OFF';
            this.saveSettings();
        });

        document.getElementById('closeOptions').addEventListener('click', () => {
            overlay.style.display = 'none';
            this.engine.setState('menu');
        });

        // Add SFX volume controls
        document.getElementById('sfxVolumeUp').addEventListener('click', () => {
            this.sfxVolume = Math.min(100, this.sfxVolume + 10);
            this.engine.audio.setSfxVolume(this.sfxVolume / 100);
            document.getElementById('sfxVolumeValue').textContent = `${this.sfxVolume}%`;
            this.saveSettings();
        });

        document.getElementById('sfxVolumeDown').addEventListener('click', () => {
            this.sfxVolume = Math.max(0, this.sfxVolume - 10);
            this.engine.audio.setSfxVolume(this.sfxVolume / 100);
            document.getElementById('sfxVolumeValue').textContent = `${this.sfxVolume}%`;
            this.saveSettings();
        });

        // Add tab switching
        const tabs = document.querySelectorAll('.tab-button');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.style.display = 'none';
                });
                document.getElementById(`${tab.dataset.tab}Tab`).style.display = 'block';
            });
        });

        // Initialize UI with saved values
        volumeValue.textContent = `${this.musicVolume}%`;
        document.getElementById('sfxVolumeValue').textContent = `${this.sfxVolume}%`;
        toggleMusic.textContent = this.engine.audio.isMuted ? 'OFF' : 'ON';
        toggleSFX.textContent = this.engine.audio.sfxEnabled ? 'ON' : 'OFF';
    }

    onStateChange(oldState, newState) {
        console.log(`Menu handling state change: ${oldState} -> ${newState}`);
        this.framesSinceStateChange = 0;
        this.stateChangeTime = Date.now();
        this.lastDrawnState = null; // Force redraw
        this.hideTooltip(); // Hide tooltip on any state change
    }

    update(deltaTime) {
        this.framesSinceStateChange++;
        
        if (this.currentState !== this.engine.gameState) {
            console.log(`Menu state updating from ${this.currentState} to ${this.engine.gameState}`);
            this.lastState = this.currentState;
            this.currentState = this.engine.gameState;
            this.onStateChange(this.lastState, this.currentState);
        }

        if (this.engine.gameState === 'options') {
            this.handleOptionsInput();
        }
    }

    handleOptionsInput() {
        if (this.engine.keys['ArrowLeft'] || this.engine.keys['ArrowRight']) {
            const option = this.selectedOption;
            if (option === 0) { // Music toggle
                this.engine.audio.toggleMute();
            } else if (option === 1) { // Music volume
                const change = this.engine.keys['ArrowRight'] ? 10 : -10;
                this.musicVolume = Math.max(0, Math.min(100, this.musicVolume + change));
                this.engine.audio.setVolume(this.musicVolume / 100);
            } else if (option === 2) { // SFX toggle
                this.engine.audio.setSfxEnabled(!this.engine.audio.sfxEnabled);
            }
            delete this.engine.keys['ArrowLeft'];
            delete this.engine.keys['ArrowRight'];
        }
    }

    drawButton(text, x, y, width, height) {
        const hover = this.isMouseOver(x, y, width, height);
        
        this.engine.ctx.fillStyle = hover ? '#8a2be2' : '#4a1a8c';
        this.engine.ctx.fillRect(x - width/2, y - height/2, width, height);
        
        this.engine.ctx.fillStyle = '#FFFFFF';
        this.engine.ctx.font = '24px Arial'; // Increased font size
        this.engine.ctx.fillText(text, x, y + 8);
    }

    drawButtonParticles(x, y, width, height) {
        const time = Date.now() / 1000;
        for (let i = 0; i < 5; i++) {
            const px = x + Math.sin(time * 3 + i * 1.5) * (width * 0.7);
            const py = y + Math.cos(time * 2 + i * 1.5) * (height * 0.5);
            this.engine.ctx.fillStyle = `rgba(138, 43, 226, ${0.3 - i * 0.05})`;
            this.engine.drawRect(px - 5, py - 5, 10, 10);
        }
    }

    drawMenu() {
        // Clear debug state changes
        console.log(`Drawing menu state: ${this.engine.gameState}`);

        this.engine.clear();

        // Draw common background
        const gradient = this.engine.ctx.createLinearGradient(0, 0, 0, this.engine.canvas.height);
        gradient.addColorStop(0, '#4a1a8c');
        gradient.addColorStop(1, '#2d1054');
        this.engine.ctx.fillStyle = gradient;
        this.engine.ctx.fillRect(0, 0, this.engine.canvas.width, this.engine.canvas.height);

        // Always draw menu content based on current state
        switch(this.engine.gameState) {
            case 'menu':
                this.drawMainMenu();
                break;
            case 'instructions':
                this.drawInstructions();
                break;
            case 'start':
                this.drawStartPage();
                break;
            case 'options':
                this.drawOptionsMenu();
                break;
            default:
                console.error('Unknown menu state:', this.engine.gameState);
                break;
        }

        // Draw coin counter on top of everything
        this.drawCoinCounter();

        this.lastDrawnState = this.engine.gameState;
    }

    drawCoinCounter() {
        const padding = 10;
        const iconSize = 32;
        const spacing = 10;
        const verticalSpacing = 40;

        // Draw coin counter
        this.engine.ctx.save();
        this.engine.pixelSprites.drawSprite('coin', padding, padding, iconSize, iconSize, 'idle');
        
        this.engine.ctx.textAlign = 'left';
        this.engine.ctx.textBaseline = 'middle';
        this.engine.ctx.fillStyle = '#FFD700';
        this.engine.ctx.font = 'bold 24px Arial';
        this.engine.ctx.fillText(
            `${this.engine.getCoins()}`,
            padding + iconSize + spacing,
            padding + (iconSize / 2)
        );

        // Draw shard counter below coins
        this.engine.pixelSprites.drawSprite('shard', 
            padding, 
            padding + verticalSpacing, 
            iconSize, 
            iconSize, 
            'idle'
        );
        
        this.engine.ctx.fillStyle = '#6EB5FF'; // Light blue for shards
        this.engine.ctx.fillText(
            `${this.engine.getShards()}`,
            padding + iconSize + spacing,
            padding + verticalSpacing + (iconSize / 2)
        );

        this.engine.ctx.restore();
    }

    drawMainMenu() {
        // Clear debug state changes
        console.log(`Drawing menu state: ${this.engine.gameState}`);

        this.engine.clear();

        // Draw common background
        const gradient = this.engine.ctx.createLinearGradient(0, 0, 0, this.engine.canvas.height);
        gradient.addColorStop(0, '#4a1a8c');
        gradient.addColorStop(1, '#2d1054');
        this.engine.ctx.fillStyle = gradient;
        this.engine.ctx.fillRect(0, 0, this.engine.canvas.width, this.engine.canvas.height);

        // Always draw menu content based on current state
        switch(this.engine.gameState) {
            case 'menu':
                this.drawMainMenu();
                break;
            case 'instructions':
                this.drawInstructions();
                break;
            case 'start':
                this.drawStartPage();
                break;
            case 'options':
                this.drawOptionsMenu();
                break;
            default:
                console.error('Unknown menu state:', this.engine.gameState);
                break;
        }

        // Draw coin counter on top of everything
        this.drawCoinCounter();

        this.lastDrawnState = this.engine.gameState;
    }

    drawCoinCounter() {
        const padding = 10;
        const iconSize = 32;
        const spacing = 10;
        const verticalSpacing = 40;

        // Draw coin counter
        this.engine.ctx.save();
        this.engine.pixelSprites.drawSprite('coin', padding, padding, iconSize, iconSize, 'idle');
        
        this.engine.ctx.textAlign = 'left';
        this.engine.ctx.textBaseline = 'middle';
        this.engine.ctx.fillStyle = '#FFD700';
        this.engine.ctx.font = 'bold 24px Arial';
        this.engine.ctx.fillText(
            `${this.engine.getCoins()}`,
            padding + iconSize + spacing,
            padding + (iconSize / 2)
        );

        // Draw shard counter below coins
        this.engine.pixelSprites.drawSprite('shard', 
            padding, 
            padding + verticalSpacing, 
            iconSize, 
            iconSize, 
            'idle'
        );
        
        this.engine.ctx.fillStyle = '#6EB5FF'; // Light blue for shards
        this.engine.ctx.fillText(
            `${this.engine.getShards()}`,
            padding + iconSize + spacing,
            padding + verticalSpacing + (iconSize / 2)
        );

        this.engine.ctx.restore();
    }

    drawMainMenu() {
        console.log('Drawing main menu');
        // Draw animated background pattern
        const time = Date.now() / 1000;
        
        // Draw floating crystals in background
        for (let i = 0; i < 8; i++) {
            const x = Math.sin(time * 0.5 + i * 0.7) * this.engine.canvas.width * 0.3 + this.engine.canvas.width * 0.5;
            const y = Math.cos(time * 0.3 + i * 0.9) * this.engine.canvas.height * 0.3 + this.engine.canvas.height * 0.4;
            const frame = Math.floor(time * 2 + i) % 2 === 0 ? 'idle' : 'glow';
            this.engine.pixelSprites.drawSprite('crystal', x, y, 40, 40, frame);
        }

        // Draw animated torches
        const torchFrame = Math.floor(time * 4) % 2 === 0 ? 'idle' : 'flicker';
        this.engine.pixelSprites.drawSprite('torch', 100, 100, 60, 60, torchFrame);
        this.engine.pixelSprites.drawSprite('torch', this.engine.canvas.width - 100, 100, 60, 60, torchFrame);

        // Draw vines on the sides
        for (let i = 0; i < 5; i++) {
            this.engine.pixelSprites.drawSprite('vines', 50, i * 120 + Math.sin(time + i) * 10, 40, 40);
            this.engine.pixelSprites.drawSprite('vines', this.engine.canvas.width - 50, i * 120 + Math.cos(time + i) * 10, 40, 40);
        }

        // Draw glowing title with shadow effect
        const glowIntensity = (Math.sin(time * 2) + 1) * 0.5;
        this.engine.ctx.shadowColor = `rgba(138, 43, 226, ${glowIntensity})`;
        this.engine.ctx.shadowBlur = 20 + glowIntensity * 10;
        
        // Draw title with wave effect
        const letters = this.menuConfig.title.split('');
        let xPos = this.engine.canvas.width / 2 - (letters.length * 40) / 2;
        letters.forEach((letter, i) => {
            const yOffset = Math.sin(time * 3 + i * 0.2) * 10;
            this.engine.drawText(
                letter,
                xPos + i * 40,
                this.engine.canvas.height * 0.2 + yOffset,
                this.engine.canvas.height * 0.08,
                'white'
            );
        });

        this.engine.ctx.shadowBlur = 0;

        // Draw version in bottom left corner
        this.engine.ctx.save();
        this.engine.ctx.font = '16px Arial';
        this.engine.ctx.textAlign = 'left';
        this.engine.ctx.fillStyle = '#666666';
        this.engine.ctx.fillText(`v.${this.version}`, 10, this.engine.canvas.height - 10);
        this.engine.ctx.restore();

        // Draw menu options as animated buttons
        this.menuConfig.options.forEach((option, index) => {
            const y = this.engine.canvas.height * (0.4 + index * 0.12);
            const wobble = Math.sin(time * 2 + index) * 5;
            this.drawButton(
                option,
                this.engine.canvas.width / 2 + wobble,
                y,
                this.buttonWidth,
                this.buttonHeight
            );
        });
    }

    drawInstructions() {
        console.log('Drawing instructions');

        // Draw tabs
        const tabs = ['controls', 'goal', 'info'];
        const tabWidth = this.engine.canvas.width / tabs.length;
        const tabHeight = 50;

        tabs.forEach((tab, index) => {
            const x = index * tabWidth;
            const isActive = tab === this.currentInstructionsTab;
            
            // Draw tab background
            this.engine.ctx.fillStyle = isActive ? '#6a2a9c' : '#4a1a8c';
            this.engine.drawRect(x, 0, tabWidth, tabHeight);
            
            // Draw tab text
            this.engine.drawText(
                tab.toUpperCase(),
                x + tabWidth/2,
                tabHeight/2,
                this.engine.canvas.height * 0.03,
                isActive ? '#ffffff' : '#b66dff'
            );

            // Draw tab border
            this.engine.ctx.strokeStyle = '#b66dff';
            this.engine.ctx.strokeRect(x, 0, tabWidth, tabHeight);
        });

        // Draw content for current tab
        if (this.currentInstructionsTab === 'goal') {
            const content = this.instructionsText[this.currentInstructionsTab];
            const spriteSize = 40;  // Increased sprite size
            const startY = this.engine.canvas.height * 0.3;
            const lineHeight = 60;  // Increased line height
            const centerX = this.engine.canvas.width / 2;

            content.forEach((item, index) => {
                const y = startY + index * lineHeight;
                
                // Draw text centered as before
                this.engine.ctx.textAlign = 'center';
                this.engine.drawText(
                    item.text,
                    centerX,
                    y,
                    this.engine.canvas.height * 0.04,  // Restored original text size
                    'white'
                );

                // Draw sprite if one is specified, right after the text
                if (item.sprite) {
                    const textWidth = this.engine.ctx.measureText(item.text).width;
                    const spriteX = centerX + (textWidth / 2) + spriteSize;  // Position sprite after text
                    this.engine.pixelSprites.drawSprite(
                        item.sprite,
                        spriteX,
                        y - spriteSize/3,  // Adjusted vertical alignment
                        spriteSize,
                        spriteSize,
                        item.frame || 'idle'
                    );
                }
            });
        } else {
            // Original text-only drawing for other tabs
            const content = this.instructionsText[this.currentInstructionsTab];
            content.forEach((line, index) => {
                this.engine.drawText(
                    line,
                    this.engine.canvas.width / 2,
                    this.engine.canvas.height * (0.3 + index * 0.1),
                    this.engine.canvas.height * 0.04,
                    'white'
                );
            });
        }

        // Draw back button
        this.drawButton(
            "Back to Menu",
            this.engine.canvas.width / 2,
            this.engine.canvas.height * 0.9,
            this.engine.canvas.height * 0.04
        );
    }

    drawStartPage() {
        console.log('Drawing start page');
        const time = Date.now() / 1000;

        // Clear background
        this.engine.ctx.fillStyle = '#1a1a1a';
        this.engine.ctx.fillRect(0, 0, this.engine.canvas.width, this.engine.canvas.height);

        // Draw chapter selection at the top
        this.drawChapterSelector();

        // Get current chapter levels
        const chapter = this.chapters[this.currentChapter];
        const levels = Array.from(
            { length: chapter.endLevel - chapter.startLevel + 1 },
            (_, i) => chapter.startLevel + i
        );

        // Layout calculations
        const columns = 5;
        const rows = Math.ceil(levels.length / columns);
        const cardWidth = 120;
        const cardHeight = 120;
        const spacingX = cardWidth + 40;
        const spacingY = cardHeight + 40;

        // Calculate start position to center the grid
        const startX = (this.engine.canvas.width - (columns - 1) * spacingX) / 2;
        const startY = 150; // Below chapter selector

        // Draw level cards
        levels.forEach((level, i) => {
            const row = Math.floor(i / columns);
            const col = i % columns;
            const x = startX + col * spacingX;
            const y = startY + row * spacingY;
            
            const levelId = `level${level}`;
            const cost = this.levelCosts[levelId] || 0;
            const isPurchased = this.engine.inventory.purchasedLevels?.includes(levelId) || cost === 0;
            
            this.drawLevelCard(x, y, level, cardWidth, cardHeight, chapter.color, isPurchased);
        });

        // Back button at bottom
        this.drawButton(
            "Back",
            this.engine.canvas.width / 2,
            this.engine.canvas.height * 0.92,
            this.engine.canvas.height * 0.04
        );
    }

    drawChapterSelector() {
        const y = 50;
        const spacing = 200;
        const startX = this.engine.canvas.width / 2 - (Object.keys(this.chapters).length - 1) * spacing / 2;

        Object.entries(this.chapters).forEach(([name, data], i) => {
            const x = startX + i * spacing;
            const isSelected = name === this.currentChapter;
            this.drawChapterButton(x, y, name, data, isSelected);
        });
    }

    drawChapterButton(x, y, name, chapter, isSelected) {
        const width = 180;
        const height = 60;
        const hover = this.isMouseOver(x, y, width, height);
        const isUnlocked = this.engine.isChapterUnlocked(name);
        
        this.engine.ctx.save();
        if (isSelected && isUnlocked) {
            this.engine.ctx.shadowColor = chapter.color;
            this.engine.ctx.shadowBlur = 20;
        }
        
        // Draw button background
        const gradient = this.engine.ctx.createLinearGradient(x - width/2, y, x + width/2, y);
        gradient.addColorStop(0, isUnlocked ? `${chapter.color}88` : '#44444488');
        gradient.addColorStop(1, isUnlocked ? `${chapter.color}44` : '#44444444');
        
        this.engine.ctx.fillStyle = gradient;
        this.engine.drawRect(x - width/2, y - height/2, width, height);
        
        // Draw text
        this.engine.ctx.fillStyle = hover && isUnlocked ? '#ffffff' : '#bbbbbb';
        this.engine.ctx.font = 'bold 24px Arial';
        this.engine.ctx.textAlign = 'center';
        this.engine.ctx.fillText(name, x, y - 8);

        // Draw cost for locked chapters
        if (!isUnlocked) {
            this.engine.ctx.font = '16px Arial';
            this.engine.ctx.fillText(`${chapter.cost} coins`, x, y + 16);
        }
        
        this.engine.ctx.restore();
    }

    drawLevelCard(x, y, levelNum, width, height, color, isPurchased) {
        const time = Date.now() / 1000;
        const hover = this.isMouseOver(x, y, width, height);
        const floatOffset = Math.sin(time * 2 + levelNum) * 5;

        // Card and text colors
        const bgColor = isPurchased ? color : '#444444';
        const textColor = isPurchased ? '#ffffff' : '#888888';

        // Draw card shadow
        this.engine.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.engine.ctx.fillRect(x - width/2 + 5, y - height/2 + floatOffset + 5, width, height);

        // Draw card background
        this.engine.ctx.fillStyle = bgColor;
        this.engine.ctx.fillRect(x - width/2, y - height/2 + floatOffset, width, height);

        // Draw level number
        this.engine.ctx.fillStyle = textColor;
        this.engine.ctx.font = 'bold 32px Arial';
        this.engine.ctx.textAlign = 'center';
        this.engine.ctx.fillText(`${levelNum}`, x, y + 10 + floatOffset);

        // Draw cost if not purchased
        if (!isPurchased) {
            const cost = this.levelCosts[`level${levelNum}`] || 0;
            this.engine.ctx.font = '20px Arial';
            this.engine.ctx.fillText(`${cost} coins`, x, y + 40 + floatOffset);
        }
    }

    drawLevelPreview(x, y, levelIndex) {
        // Draw a simple preview icon for each level
        const size = 80;
        const time = Date.now() / 1000;
        
        switch(levelIndex) {
            case 0: // Level 1 - Tutorial style
                this.engine.ctx.strokeStyle = '#b66dff';
                this.engine.ctx.lineWidth = 2;
                this.engine.ctx.beginPath();
                this.engine.ctx.arc(x, y, size/2, 0, Math.PI * 2);
                this.engine.ctx.stroke();
                this.engine.drawText("1", x, y + 10, 40, '#fff');
                break;
                
            case 1: // Level 2 - More complex
                const starPoints = 5;
                const outerRadius = size/2;
                const innerRadius = size/4;
                
                this.engine.ctx.beginPath();
                for(let i = 0; i < starPoints * 2; i++) {
                    const radius = i % 2 === 0 ? outerRadius : innerRadius;
                    const angle = (i * Math.PI) / starPoints;
                    const px = x + Math.cos(angle + time) * radius;
                    const py = y + Math.sin(angle + time) * radius;
                    if(i === 0) this.engine.ctx.moveTo(px, py);
                    else this.engine.ctx.lineTo(px, py);
                }
                this.engine.ctx.closePath();
                this.engine.ctx.strokeStyle = '#b66dff';
                this.engine.ctx.stroke();
                this.engine.drawText("2", x, y + 10, 40, '#fff');
                break;
                
            case 2: // Level 3 - Advanced
                const sides = 6;
                this.engine.ctx.beginPath();
                for(let i = 0; i < sides; i++) {
                    const angle = (i * 2 * Math.PI / sides) + time;
                    const px = x + Math.cos(angle) * size/2;
                    const py = y + Math.sin(angle) * size/2;
                    if(i === 0) this.engine.ctx.moveTo(px, py);
                    else this.engine.ctx.lineTo(px, py);
                }
                this.engine.ctx.closePath();
                this.engine.ctx.strokeStyle = '#b66dff';
                this.engine.ctx.stroke();
                this.engine.drawText("3", x, y + 10, 40, '#fff');
                break;
        }
    }

    isMouseOver(x, y, width, height) {
        return this.engine.mousePos.x > x - width/2 &&
               this.engine.mousePos.x < x + width/2 &&
               this.engine.mousePos.y > y - height/2 &&
               this.engine.mousePos.y < y + height/2;
    }

    async handleOption(option) {
        console.log('Handling option:', option);
        switch(option) {
            case 'Shop':
                console.log('Opening shop...');
                this.engine.setState('shop');
                console.log('Shop state set');
                this.engine.toggleShop();
                break;
            case 'Options':
                document.getElementById('optionsOverlay').style.display = 'flex';
                break;
            case 'Start Game':
                this.engine.setState('start');
                await this.engine.audio.init();
                this.engine.audio.playBackgroundMusic();
                break;
            case 'Instructions':
                this.engine.setState('instructions');
                break;
            case 'Back':
                this.engine.setState('menu');
                break;
            case 'Exit':
                this.engine.audio.stopBackgroundMusic();
                if (confirm('Are you sure you want to exit?')) {
                    window.close();
                }
                break;
        }
    }

    handleClick(x, y) {
        const clickPos = { x, y };
        console.log('Click in state:', this.engine.gameState);
        
        switch(this.engine.gameState) {
            case 'menu':
                this.handleMenuClick(x, y);
                break;
            case 'instructions':
                // Handle tab clicks
                if (y < 50) {
                    const tabWidth = this.engine.canvas.width / 3;
                    const tabIndex = Math.floor(x / tabWidth);
                    const tabs = ['controls', 'goal', 'info'];
                    if (tabIndex >= 0 && tabIndex < tabs.length) {
                        this.currentInstructionsTab = tabs[tabIndex];
                        return;
                    }
                }
                // Handle back button
                if (y > this.engine.canvas.height * 0.85) {
                    this.engine.setState('menu');
                }
                break;
            case 'start':
                this.handleStartPageClick(x, y);
                break;
        }
    }

    handleMenuClick(x, y) {
        this.menuConfig.options.forEach((option, index) => {
            const buttonY = this.engine.canvas.height * (0.4 + index * 0.12);
            if (this.isButtonClicked(x, y, buttonY)) {
                this.handleOption(option);
            }
        });
    }

    handleStartPageClick(x, y) {
        // Handle chapter selection
        const chapterY = 50;
        const spacing = 200;
        const startX = this.engine.canvas.width / 2 - (Object.keys(this.chapters).length - 1) * spacing / 2;

        Object.entries(this.chapters).forEach(([name, chapter], i) => {
            const buttonX = startX + i * spacing;
            if (this.isMouseOver(buttonX, chapterY, 180, 60)) {
                if (this.engine.isChapterUnlocked(name)) {
                    this.currentChapter = name;
                } else if (this.engine.unlockChapter(name, chapter.cost)) {
                    this.currentChapter = name;
                    this.engine.audio.playSoundEffect('unlock');
                } else {
                    this.engine.audio.playSoundEffect('error');
                }
                return;
            }
        });

        // Handle level selection
        const chapter = this.chapters[this.currentChapter];
        const levels = Array.from(
            { length: chapter.endLevel - chapter.startLevel + 1 },
            (_, i) => chapter.startLevel + i
        );

        // Use same layout calculations as in drawStartPage
        const columns = 5;
        const cardWidth = 120;
        const cardHeight = 120;
        const spacingX = cardWidth + 40;
        const spacingY = cardHeight + 40;
        const startLevelX = (this.engine.canvas.width - (columns - 1) * spacingX) / 2;
        const startLevelY = 150;

        levels.forEach((level, i) => {
            const row = Math.floor(i / columns);
            const col = i % columns;
            const levelX = startLevelX + col * spacingX;
            const levelY = startLevelY + row * spacingY;

            if (this.isMouseOver(levelX, levelY, cardWidth, cardHeight)) {
                const levelId = `level${level}`;
                this.handleLevelClick(levelId);
            }
        });

        // Check back button first
        if (this.isMouseOver(
            this.engine.canvas.width / 2,
            this.engine.canvas.height * 0.92,
            200,
            this.engine.canvas.height * 0.04
        )) {
            this.engine.setState('menu');
            return;
        }
    }

    handleLevelClick(levelId) {
        const cost = this.levelCosts[levelId] || 0;
        const isPurchased = this.engine.inventory.purchasedLevels?.includes(levelId) || cost === 0;

        if (!isPurchased && this.engine.inventory.coins >= cost) {
            this.engine.inventory.coins -= cost;
            if (!this.engine.inventory.purchasedLevels) {
                this.engine.inventory.purchasedLevels = [];
            }
            this.engine.inventory.purchasedLevels.push(levelId);
            this.engine.savePurchasedLevels();
            return;
        }

        if (isPurchased) {
            this.engine.setState('playing');
            this.levelManager.loadLevel(levelId);
        }
    }

    // Add helper method for node hit detection
    isNodeClicked(x, y, nodeX, nodeY, radius = 30) {
        const dx = x - nodeX;
        const dy = y - nodeY;
        return dx * dx + dy * dy < radius * radius;
    }

    isNodeHovered(nodeX, nodeY) {
        const mouseX = this.engine.mousePos.x;
        const mouseY = this.engine.mousePos.y;
        const dx = mouseX - nodeX;
        const dy = mouseY - nodeY;
        return dx * dx + dy * dy < 900; // 30px radius squared
    }

    isButtonClicked(x, y, buttonY) {
        const buttonWidth = 200;
        const buttonHeight = this.engine.canvas.height * 0.05;
        const buttonX = this.engine.canvas.width / 2;

        return x >= buttonX - buttonWidth/2 &&
               x <= buttonX + buttonWidth/2 &&
               y >= buttonY - buttonHeight/2 &&
               y <= buttonY + buttonHeight/2;
    }

    isMouseInBounds(mousePos, bounds) {
        return mousePos.x >= bounds.x && 
               mousePos.x <= bounds.x + bounds.width &&
               mousePos.y >= bounds.y && 
               mousePos.y <= bounds.y + bounds.height;
    }

    hideTooltip() {
        const tooltip = document.getElementById('levelTooltip');
        if (tooltip) {
            tooltip.style.opacity = '0';
            tooltip.innerHTML = '';
        }
    }
}
