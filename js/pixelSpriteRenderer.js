class PixelSpriteRenderer {
    constructor(engine) {
        this.engine = engine;
        this.sprites = new Map();
        this.pixelSize = 1;
    }

    async loadSprite(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load sprite: ${path}`);
            }
            const data = await response.text();
            this.parseSprite(data);
            console.log(`Loaded sprite: ${path}`);
        } catch (error) {
            console.error('Error loading sprite:', error);
            // Create a fallback colored rectangle sprite
            this.sprites.set(path, {
                width: 16,
                height: 16,
                frames: new Map([
                    ['idle', { color: '#FF00FF', duration: 1000 }],
                    ['move', { color: '#FF00FF', duration: 500 }]
                ])
            });
        }
    }

    parseSprite(data) {
        const lines = data.split('\n').map(line => line.trim());
        let currentSprite = null;
        let currentFrame = null;
        let colors = null;
        let pixelData = [];

        lines.forEach(line => {
            if (line.startsWith('sprite')) {
                const name = line.match(/"([^"]+)"/)[1];
                currentSprite = { name, frames: new Map(), colors: new Map() };
                this.sprites.set(name, currentSprite);
            } else if (line.startsWith('colors {')) {
                colors = new Map();
            } else if (line.startsWith('frames {')) {
                // Start frames section
            } else if (line.match(/^[A-Z]:\s*#[0-9A-F]{6}/)) {
                // Parse color definition
                const [symbol, color] = line.split(':').map(s => s.trim());
                currentSprite.colors.set(symbol, color);
            } else if (line.includes('{')) {
                const frameName = line.split('{')[0].trim();
                currentFrame = frameName;
                pixelData = [];
            } else if (line.match(/^[\.A-Z\s]+$/)) {
                // Parse pixel data
                pixelData.push(line.split(' ').filter(c => c));
                if (pixelData.length === 8) { // Assuming 8x8 sprites
                    currentSprite.frames.set(currentFrame, pixelData);
                }
            } else if (line.includes('}')) {
                if (currentFrame && pixelData.length > 0) {
                    currentSprite.frames.set(currentFrame, pixelData);
                    console.log(`Parsed frame: ${currentFrame} for sprite: ${currentSprite.name}`);
                }
                currentFrame = null;
                pixelData = [];
            }
        });

        console.log(`Parsed sprite: ${currentSprite.name}`, currentSprite);
    }

    drawSprite(name, x, y, width, height, frame = 'idle') {
        const sprite = this.sprites.get(name);
        if (!sprite) {
            console.error('Sprite not found:', name);
            return;
        }

        const pixelData = sprite.frames.get(frame);
        if (!pixelData) {
            console.error('Frame not found:', frame, 'in sprite:', name);
            return;
        }

        // Round position and size to prevent sub-pixel rendering
        x = Math.round(x);
        y = Math.round(y);
        width = Math.round(width);
        height = Math.round(height);

        const pixelWidth = Math.ceil(width / pixelData[0].length);
        const pixelHeight = Math.ceil(height / pixelData.length);

        // Disable anti-aliasing for crisp pixels
        this.engine.ctx.imageSmoothingEnabled = false;

        pixelData.forEach((row, py) => {
            row.forEach((pixel, px) => {
                if (pixel !== '.') {
                    const color = sprite.colors.get(pixel);
                    // Add 1 pixel to width and height to prevent gaps
                    this.engine.drawRect(
                        x + px * pixelWidth,
                        y + py * pixelHeight,
                        pixelWidth + 1,
                        pixelHeight + 1,
                        color
                    );
                }
            });
        });
    }
}
