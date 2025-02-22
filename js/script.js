window.onload = function() {
    const canvas = document.getElementById('gameCanvas');
    const engine = new GameEngine(canvas);
    const menuManager = new MenuManager(engine);
    const levelManager = new LevelManager(engine);

    // Set up references
    engine.menuManager = menuManager;
    menuManager.levelManager = levelManager;

    // Start with menu state
    engine.setState('menu');
};
