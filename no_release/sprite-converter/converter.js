class SpriteConverter {
    constructor() {
        this.fileInput = document.getElementById('fileInput');
        this.spriteNameInput = document.getElementById('spriteName');
        this.spriteWidthInput = document.getElementById('spriteWidth');
        this.spriteHeightInput = document.getElementById('spriteHeight');
        this.convertBtn = document.getElementById('convertBtn');
        this.copyBtn = document.getElementById('copyBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.outputText = document.getElementById('outputText');
        this.originalPreview = document.getElementById('originalPreview');
        this.convertedPreview = document.getElementById('convertedPreview');

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.convertBtn.addEventListener('click', () => this.handleConversion());
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
        this.downloadBtn.addEventListener('click', () => this.downloadAss());
        this.fileInput.addEventListener('change', () => this.handleFileSelect());
    }

    async handleFileSelect() {
        const file = this.fileInput.files[0];
        if (!file) return;

        if (file.name.endsWith('.piskel')) {
            const text = await file.text();
            const piskelData = JSON.parse(text);
            this.spriteWidthInput.value = piskelData.width;
            this.spriteHeightInput.value = piskelData.height;
        } else {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                this.spriteWidthInput.value = img.width;
                this.spriteHeightInput.value = img.height;
                this.drawOriginalPreview(img);
            };
        }
    }

    drawOriginalPreview(img) {
        const canvas = this.originalPreview;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
    }

    async handleConversion() {
        const file = this.fileInput.files[0];
        if (!file) {
            alert('Please select a file first!');
            return;
        }

        const spriteName = this.spriteNameInput.value || 'sprite';
        const width = parseInt(this.spriteWidthInput.value);
        const height = parseInt(this.spriteHeightInput.value);

        if (file.name.endsWith('.piskel')) {
            const text = await file.text();
            const piskelData = JSON.parse(text);
            this.convertPiskel(piskelData, spriteName);
        } else {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => this.convertImage(img, spriteName, width, height);
        }
    }

    convertImage(img, spriteName, width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;
        
        // First pass: collect all colors
        const colorMap = new Map();
        for (let i = 0; i < pixels.length; i += 4) {
            const alpha = pixels[i + 3];
            if (alpha < 128) continue;
            
            const color = this.rgbToHex(pixels[i], pixels[i + 1], pixels[i + 2]);
            if (!colorMap.has(color)) {
                colorMap.set(color, 1);
            } else {
                colorMap.set(color, colorMap.get(color) + 1);
            }
        }

        // Sort colors by usage and quantize similar colors
        const sortedColors = Array.from(colorMap.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([color]) => color);

        // Quantize similar colors
        const quantizedColors = this.quantizeColors(sortedColors);
        
        // Create final color mapping
        const colors = new Map();
        let colorIndex = 65; // ASCII 'A'
        quantizedColors.forEach(color => {
            colors.set(color, String.fromCharCode(colorIndex++));
        });

        // Convert pixels to sprite data
        const spriteData = [];
        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const alpha = pixels[i + 3];
                
                if (alpha < 128) {
                    row.push('.');
                } else {
                    const color = this.rgbToHex(pixels[i], pixels[i + 1], pixels[i + 2]);
                    const quantizedColor = this.findClosestColor(color, quantizedColors);
                    row.push(colors.get(quantizedColor));
                }
            }
            spriteData.push(row.join(' '));
        }

        // Show color palette
        this.showColorPalette(colors);

        const assContent = this.generateAssFormat(spriteName, width, height, colors, spriteData);
        this.outputText.value = assContent;

        // Draw converted preview
        this.drawConvertedPreview(spriteData, colors, width, height);
    }

    quantizeColors(colors) {
        const threshold = 2; // Drastically reduced threshold for more color preservation
        const quantized = [];
        
        for (const color of colors) {
            const rgb1 = this.hexToRgb(color);
            let foundSimilar = false;
            
            // Calculate YUV values for better perceptual comparison
            const yuv1 = this.rgbToYuv(rgb1);
            
            for (const existing of quantized) {
                const rgb2 = this.hexToRgb(existing);
                const yuv2 = this.rgbToYuv(rgb2);
                
                // Use YUV color difference
                const colorDiff = this.yuvDistance(yuv1, yuv2);
                
                if (colorDiff < threshold) {
                    foundSimilar = true;
                    break;
                }
            }
            
            if (!foundSimilar) {
                quantized.push(color);
            }
        }
        
        return quantized;
    }

    rgbToYuv(rgb) {
        // Convert RGB to YUV colorspace for better perceptual comparison
        const y = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
        const u = -0.14713 * rgb.r - 0.28886 * rgb.g + 0.436 * rgb.b;
        const v = 0.615 * rgb.r - 0.51499 * rgb.g - 0.10001 * rgb.b;
        return { y, u, v };
    }

    yuvDistance(yuv1, yuv2) {
        // Weight the luminance (Y) component more heavily
        const yWeight = 1.5;
        const uvWeight = 1.0;
        
        return Math.sqrt(
            yWeight * Math.pow(yuv1.y - yuv2.y, 2) +
            uvWeight * (Math.pow(yuv1.u - yuv2.u, 2) + Math.pow(yuv1.v - yuv2.v, 2))
        );
    }

    // Convert RGB to LAB color space for better color comparison
    rgbToLab(rgb) {
        // Convert RGB to XYZ
        let r = rgb.r / 255;
        let g = rgb.g / 255;
        let b = rgb.b / 255;

        r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

        r *= 100;
        g *= 100;
        b *= 100;

        const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
        const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
        const z = r * 0.0193 + g * 0.1192 + b * 0.9505;

        // Convert XYZ to LAB
        const xn = 95.047;
        const yn = 100.000;
        const zn = 108.883;

        const xx = x / xn;
        const yy = y / yn;
        const zz = z / zn;

        const fx = xx > 0.008856 ? Math.pow(xx, 1/3) : (7.787 * xx) + 16/116;
        const fy = yy > 0.008856 ? Math.pow(yy, 1/3) : (7.787 * yy) + 16/116;
        const fz = zz > 0.008856 ? Math.pow(zz, 1/3) : (7.787 * zz) + 16/116;

        return {
            l: (116 * fy) - 16,
            a: 500 * (fx - fy),
            b: 200 * (fy - fz)
        };
    }

    // Calculate color difference using deltaE formula
    deltaE(lab1, lab2) {
        const deltaL = lab1.l - lab2.l;
        const deltaA = lab1.a - lab2.a;
        const deltaB = lab1.b - lab2.b;
        
        return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
    }

    // Replace the old colorDistance method with this more accurate one
    colorDistance(rgb1, rgb2) {
        const lab1 = this.rgbToLab(rgb1);
        const lab2 = this.rgbToLab(rgb2);
        return this.deltaE(lab1, lab2);
    }

    findClosestColor(color, palette) {
        const rgb1 = this.hexToRgb(color);
        let minDistance = Infinity;
        let closest = color;
        
        for (const paletteColor of palette) {
            const rgb2 = this.hexToRgb(paletteColor);
            const distance = this.colorDistance(rgb1, rgb2);
            
            if (distance < minDistance) {
                minDistance = distance;
                closest = paletteColor;
            }
        }
        
        return closest;
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    showColorPalette(colors) {
        const container = document.createElement('div');
        container.className = 'color-palette';
        
        colors.forEach((char, color) => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.setAttribute('data-color', `${char}: ${color}`);
            container.appendChild(swatch);
        });

        const stats = document.createElement('div');
        stats.className = 'stats';
        stats.textContent = `Total colors: ${colors.size}`;
        
        const previewSection = document.querySelector('.preview-section');
        const existingPalette = document.querySelector('.color-palette');
        const existingStats = document.querySelector('.stats');
        
        if (existingPalette) existingPalette.remove();
        if (existingStats) existingStats.remove();
        
        previewSection.appendChild(container);
        previewSection.appendChild(stats);
    }

    generateAssFormat(spriteName, width, height, colors, spriteData) {
        let output = `sprite "${spriteName}" {\n`;
        output += `    size: ${width}x${height}\n`;
        output += '    colors {\n';
        
        colors.forEach((char, color) => {
            output += `        ${char}: ${color}\n`;
        });
        
        output += '    }\n';
        output += '    frames {\n';
        output += '        idle {\n';
        spriteData.forEach(row => {
            output += `            ${row}\n`;
        });
        output += '        }\n';
        output += '    }\n';
        output += '}\n';

        return output;
    }

    rgbToHex(r, g, b) {
        return '#' + [r, g, b]
            .map(x => x.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase();
    }

    copyToClipboard() {
        this.outputText.select();
        document.execCommand('copy');
        alert('Copied to clipboard!');
    }

    downloadAss() {
        const spriteName = this.spriteNameInput.value || 'sprite';
        const blob = new Blob([this.outputText.value], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${spriteName}.ass`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    drawConvertedPreview(spriteData, colors, width, height) {
        const canvas = this.convertedPreview;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        
        const reverseColors = new Map();
        colors.forEach((char, hex) => reverseColors.set(char, hex));

        for (let y = 0; y < height; y++) {
            const row = spriteData[y].split(' ');
            for (let x = 0; x < width; x++) {
                const char = row[x];
                if (char === '.') {
                    // Draw checkerboard pattern for transparency
                    const isEven = (x + y) % 2 === 0;
                    ctx.fillStyle = isEven ? '#ffffff33' : '#cccccc33';
                    ctx.fillRect(x, y, 1, 1);
                } else {
                    ctx.fillStyle = reverseColors.get(char);
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        }
    }
}

// Initialize the converter
new SpriteConverter();
