class MusicMaker {
    constructor() {
        this.synth = new AudioSynthesizer();
        this.synth.init();
        this.isPlaying = false;
        this.currentColumn = 0;
        this.grid = [];
        this.notes = ['C5', 'B4', 'A4', 'G4', 'F4', 'E4', 'D4', 'C4'];
        this.tempo = 120;
        
        this.initializeGrid();
        this.setupEventListeners();
    }

    initializeGrid() {
        const musicGrid = document.getElementById('musicGrid');
        this.notes.forEach(note => {
            const rowContainer = document.createElement('div');
            rowContainer.className = 'row-container';
            
            const label = document.createElement('div');
            label.className = 'note-row-label';
            label.textContent = note;
            rowContainer.appendChild(label);

            const row = document.createElement('div');
            row.className = 'music-grid';
            
            const gridRow = [];
            for (let i = 0; i < 16; i++) {
                const cell = document.createElement('div');
                cell.className = 'note-cell';
                cell.addEventListener('click', () => this.toggleCell(cell, note, i));
                row.appendChild(cell);
                gridRow.push({ cell, active: false });
            }
            
            rowContainer.appendChild(row);
            musicGrid.appendChild(rowContainer);
            this.grid.push(gridRow);
        });
    }

    setupEventListeners() {
        document.getElementById('playButton').addEventListener('click', () => this.togglePlay());
        document.getElementById('clearButton').addEventListener('click', () => this.clearGrid());
        document.getElementById('saveButton').addEventListener('click', () => this.saveTrack());
        document.getElementById('tempoInput').addEventListener('change', (e) => {
            this.tempo = parseInt(e.target.value);
        });
    }

    toggleCell(cell, note, column) {
        const row = this.notes.indexOf(note);
        const isActive = this.grid[row][column].active;
        this.grid[row][column].active = !isActive;
        cell.classList.toggle('active');
        
        if (!isActive) {
            this.synth.playNote(note, 0.1, document.getElementById('instrumentSelect').value);
        }
    }

    async play() {
        const beatDuration = 60 / this.tempo;
        
        while (this.isPlaying) {
            // Clear previous column
            this.grid.forEach(row => {
                row[this.currentColumn].cell.style.backgroundColor = '';
            });
            
            // Move to next column
            this.currentColumn = (this.currentColumn + 1) % 16;
            
            // Play active notes in current column
            this.grid.forEach((row, i) => {
                if (row[this.currentColumn].active) {
                    const instrument = document.getElementById('instrumentSelect').value;
                    this.synth.playNote(this.notes[i], beatDuration, instrument);
                }
                row[this.currentColumn].cell.style.backgroundColor = '#6a2a9c';
            });
            
            await new Promise(resolve => setTimeout(resolve, beatDuration * 1000));
        }
        
        // Clear highlight when stopped
        this.grid.forEach(row => {
            row[this.currentColumn].cell.style.backgroundColor = '';
        });
    }

    togglePlay() {
        this.isPlaying = !this.isPlaying;
        if (this.isPlaying) {
            this.play();
        }
    }

    clearGrid() {
        this.grid.forEach(row => {
            row.forEach(cell => {
                cell.active = false;
                cell.cell.classList.remove('active');
            });
        });
    }

    saveTrack() {
        let trackData = `track "custom" {\n    tempo: ${this.tempo}\n    loop: true\n\n    sequence {\n`;
        
        // Scan through columns
        for (let col = 0; col < 16; col++) {
            // Check each row for active notes
            this.grid.forEach((row, i) => {
                if (row[col].active) {
                    const instrument = document.getElementById('instrumentSelect').value;
                    trackData += `        instrument ${instrument}\n`;
                    trackData += `        note ${this.notes[i]} 0.25\n`;
                }
            });
        }
        
        trackData += '    }\n}\n';
        
        // Create download link
        const blob = new Blob([trackData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'custom_track.ass';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Initialize when page loads
window.addEventListener('load', () => {
    new MusicMaker();
});
