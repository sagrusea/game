const canvas = document.getElementById('gameCanvas');
const engine = new GameEngine(canvas);
engine.loadSavedCoins();
engine.loadPurchasedLevels(); // Add this line to load purchased levels
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
                    case 'shop':
                        
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

document.getElementById('toggleTrackDisplay').addEventListener('click', function() {
    const button = this;
    if (button.textContent === 'ON') {
        button.textContent = 'OFF';
        engine.audio.setShowTrackName(false);
    } else {
        button.textContent = 'ON';
        engine.audio.setShowTrackName(true);
    }
});

// Initialize options menu functionality
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all tabs
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        // Add active class to clicked tab
        button.classList.add('active');
        // Hide all tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });
        // Show selected tab content
        const tabId = button.getAttribute('data-tab');
        document.getElementById(tabId + 'Tab').style.display = 'block';
    });
});

// Close options menu
document.getElementById('closeOptions').addEventListener('click', () => {
    document.getElementById('optionsOverlay').style.display = 'none';
});

// Track display toggle
document.getElementById('toggleTrackDisplay').addEventListener('click', function() {
    const isEnabled = this.textContent === 'ON';
    this.textContent = isEnabled ? 'OFF' : 'ON';
    engine.audio.setShowTrackName(!isEnabled);
});

// Auto-switch controls
document.getElementById('toggleAutoSwitch').addEventListener('click', function() {
    const isEnabled = this.textContent === 'ON';
    this.textContent = isEnabled ? 'OFF' : 'ON';
    engine.audio.setAutoSwitch(!isEnabled);
});

let currentInterval = 3;
const intervalValue = document.getElementById('intervalValue');

document.getElementById('intervalUp').addEventListener('click', function() {
    if (currentInterval < 10) {
        currentInterval++;
        intervalValue.textContent = currentInterval + 'min';
        engine.audio.setSwitchInterval(currentInterval);
    }
});

document.getElementById('intervalDown').addEventListener('click', function() {
    if (currentInterval > 1) {
        currentInterval--;
        intervalValue.textContent = currentInterval + 'min';
        engine.audio.setSwitchInterval(currentInterval);
    }
});

// Initialize track display element
const trackDisplay = document.getElementById('trackDisplay');
if (!trackDisplay) {
    console.error('Track display element not found!');
}

// Start the game when window loads
window.addEventListener('load', init);
