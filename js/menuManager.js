class MenuManager {
    constructor(engine) {
        this.engine = engine;
        this.levelManager = null; // Will be set from script.js
        this.menuConfig = {
            title: "Escape Game",
            options: ["Start Game", "Instructions", "Toggle Music", "Exit"]
        };
        this.instructionsText = [
            "How to Play:",
            "- Use arrow keys or WASD to move",
            "- Avoid obstacles (X)",
            "- Reach the finish (F)",
            "- Press ESC to pause",
            "- Press M to toggle music",
            "",
            "Click anywhere to return"
        ];
    }

    drawButton(text, x, y, size) {
        const padding = 20;
        const width = this.engine.ctx.measureText(text).width + padding * 2;
        const height = size + padding;
        const isHovered = this.engine.isMouseOver(x, y, width, height);

        // Draw button background
        this.engine.drawRect(
            x - width/2,
            y - height/2,
            width,
            height,
            isHovered ? '#800080' : '#600060'
        );

        // Draw button text
        this.engine.drawText(text, x, y + size/4, size, 'white');
    }

    drawMenu() {
        this.engine.clear();
        this.engine.drawRect(0, 0, this.engine.canvas.width, this.engine.canvas.height, 'purple');

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
        }
    }

    drawMainMenu() {
        // Draw title
        this.engine.drawText(
            this.menuConfig.title,
            this.engine.canvas.width / 2,
            this.engine.canvas.height * 0.2,
            this.engine.canvas.height * 0.1,
            'white'
        );

        // Draw menu options as buttons
        this.menuConfig.options.forEach((option, index) => {
            this.drawButton(
                option,
                this.engine.canvas.width / 2,
                this.engine.canvas.height * (0.4 + index * 0.1),
                this.engine.canvas.height * 0.05
            );
        });
    }

    drawInstructions() {
        this.instructionsText.forEach((line, index) => {
            this.engine.drawText(
                line,
                this.engine.canvas.width / 2,
                this.engine.canvas.height * (0.2 + index * 0.1),
                this.engine.canvas.height * 0.04,
                'white'
            );
        });
    }

    drawStartPage() {
        this.engine.drawText(
            "Select Level",
            this.engine.canvas.width / 2,
            this.engine.canvas.height * 0.2,
            this.engine.canvas.height * 0.08,
            'white'
        );

        // Draw level buttons
        ["Level 1", "Level 2", "Level 3"].forEach((level, index) => {
            this.drawButton(
                level,
                this.engine.canvas.width / 2,
                this.engine.canvas.height * (0.4 + index * 0.1),
                this.engine.canvas.height * 0.05
            );
        });

        // Back button
        this.drawButton(
            "Back",
            this.engine.canvas.width / 2,
            this.engine.canvas.height * 0.8,
            this.engine.canvas.height * 0.04
        );
    }

    handleClick(x, y) {
        switch(this.engine.gameState) {
            case 'menu':
                this.handleMenuClick(x, y);
                break;
            case 'instructions':
                this.engine.gameState = 'menu';
                break;
            case 'start':
                this.handleStartPageClick(x, y);
                break;
        }
    }

    handleMenuClick(x, y) {
        this.menuConfig.options.forEach((option, index) => {
            const buttonY = this.engine.canvas.height * (0.4 + index * 0.1);
            if (this.engine.isMouseOver(
                this.engine.canvas.width / 2,
                buttonY,
                200,
                this.engine.canvas.height * 0.05
            )) {
                this.handleOption(option);
            }
        });
    }

    handleStartPageClick(x, y) {
        // Handle level selection
        ["Level 1", "Level 2", "Level 3"].forEach((level, index) => {
            const buttonY = this.engine.canvas.height * (0.4 + index * 0.1);
            if (this.engine.isMouseOver(
                this.engine.canvas.width / 2,
                buttonY,
                200,
                this.engine.canvas.height * 0.05
            )) {
                console.log(`Starting level ${index + 1}`);
                this.levelManager.loadLevel(`level${index + 1}`);
                this.engine.gameState = 'playing';
            }
        });

        // Handle back button
        if (this.engine.isMouseOver(
            this.engine.canvas.width / 2,
            this.engine.canvas.height * 0.8,
            200,
            this.engine.canvas.height * 0.04
        )) {
            this.engine.gameState = 'menu';
        }
    }

    async handleOption(option) {
        console.log('Handling option:', option); // Debug log
        switch(option) {
            case 'Start Game':
                this.engine.gameState = 'start';
                await this.engine.audio.init();
                this.engine.audio.playBackgroundMusic();
                break;
            case 'Instructions':
                this.engine.gameState = 'instructions';
                break;
            case 'Toggle Music':
                this.engine.audio.toggleMute();
                break;
            case 'Exit':
                this.engine.audio.stopBackgroundMusic();
                if (confirm('Are you sure you want to exit?')) {
                    window.close();
                }
                break;
        }
    }
}
