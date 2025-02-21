class SpriteManager {
    constructor(engine) {
        this.engine = engine;
        this.sprites = new Map();
        this.loadSprites();
    }

    async loadSprites() {
        const spriteList = {
            player: 'assets/sprites/player.png',
            wall: 'assets/sprites/wall.png',
            floor: 'assets/sprites/floor.png',
            key_yellow: 'assets/sprites/key_yellow.png',
            key_blue: 'assets/sprites/key_blue.png',
            key_red: 'assets/sprites/key_red.png',
            door_yellow: 'assets/sprites/door_yellow.png',
            door_blue: 'assets/sprites/door_blue.png',
            door_red: 'assets/sprites/door_red.png',
            block: 'assets/sprites/block.png',
            plate: 'assets/sprites/plate.png',
            finish: 'assets/sprites/finish.png'
        };

        for (const [name, path] of Object.entries(spriteList)) {
            const img = new Image();
            img.src = path;
            await new Promise(resolve => img.onload = resolve);
            this.sprites.set(name, img);
        }
    }

    drawSprite(name, x, y, width, height) {
        const sprite = this.sprites.get(name);
        if (sprite) {
            this.engine.ctx.drawImage(sprite, x, y, width, height);
        }
    }
}
