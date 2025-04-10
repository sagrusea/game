class Player {
    constructor(engine) {
        // ...existing code...
        this.skin = 'default'; // Add default skin
        // ...existing code...
    }

    setSkin(skinId) {
        this.skin = skinId;
    }

    getCurrentSkin() {
        return this.skin || 'default';
    }
}