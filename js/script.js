window.onload = function() {
    const canvas = document.getElementById('gameCanvas');
    const engine = new GameEngine(canvas);
    const levelManager = new LevelManager(engine);
    engine.setLevelManager(levelManager); // Add this line to connect the components
    const menuManager = new MenuManager(engine);

    // Set up references
    engine.menuManager = menuManager;
    menuManager.levelManager = levelManager;

    // Start with menu state
    engine.setState('menu');
};
