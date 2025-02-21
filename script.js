const canvas = document.getElementById('gameCanvas');
const engine = new GameEngine(canvas);
const levelManager = new LevelManager(engine);
const menuManager = new MenuManager(engine);

// Give menuManager access to levelManager
menuManager.levelManager = levelManager;

async function init() {
    try {
        // Initialize audio
        await engine.audio.loadBackgroundMusic();
        
        // Start the game loop
        function gameLoop() {
            try {
                switch(engine.gameState) {
                    case 'menu':
                    case 'instructions':
                    case 'start':
                        menuManager.drawMenu();
                        break;
                    case 'playing':
                        levelManager.drawLevel();
                        break;
                }
                requestAnimationFrame(gameLoop);
            } catch (error) {
                console.error('Error in game loop:', error);
            }
        }

        gameLoop();
    } catch (error) {
        console.error('Error during initialization:', error);
        // Show error on canvas
        engine.ctx.fillStyle = 'white';
        engine.ctx.font = '24px Arial';
        engine.ctx.textAlign = 'center';
        engine.ctx.fillText('Error loading game. Please refresh.', canvas.width/2, canvas.height/2);
    }
}

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    menuManager.handleClick(x, y);
});

// Start the game when window loads
window.addEventListener('load', init);
