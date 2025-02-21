class AudioSynthesizer {
    constructor() {
        this.audioContext = null;
        this.oscillators = new Map();
        this.noteToFreq = {
            'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
            'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
            'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77
        };
        this.soundEffects = new Map();
    }

    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    async loadTrack(filepath) {
        try {
            const response = await fetch(filepath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const trackData = await response.text();
            if (!trackData) {
                throw new Error('Track data is empty');
            }
            console.log('Loaded track data:', trackData); // Debug
            return this.parseTrackData(trackData);
        } catch (error) {
            console.error('Failed to load track:', error);
            // Return a default track if loading fails
            return {
                tempo: 120,
                sequence: [
                    { type: 'note', note: 'C4', duration: 1.0 },
                    { type: 'note', note: 'E4', duration: 1.0 }
                ]
            };
        }
    }

    async loadSoundEffects(filepath) {
        try {
            const response = await fetch(filepath);
            const data = await response.text();
            this.parseSoundEffects(data);
        } catch (error) {
            console.error('Failed to load sound effects:', error);
        }
    }

    parseTrackData(data) {
        if (!data) {
            throw new Error('No data to parse');
        }

        const track = {
            tempo: 120,
            sequence: []
        };

        try {
            const lines = data.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('//'));
            
            lines.forEach(line => {
                if (line.includes('tempo:')) {
                    const match = line.match(/tempo:\s*(\d+)/);
                    if (match) {
                        track.tempo = parseInt(match[1]);
                    }
                } else if (line.match(/note\s+\w+\s+[\d.]+/)) {
                    const [_, note, duration] = line.match(/note\s+(\w+)\s+([\d.]+)/);
                    if (this.noteToFreq[note]) { // Only add note if frequency exists
                        track.sequence.push({ 
                            type: 'note', 
                            note, 
                            duration: parseFloat(duration)
                        });
                    }
                } else if (line.match(/bass\s+\w+\s+[\d.]+/)) {
                    const [_, note, duration] = line.match(/bass\s+(\w+)\s+([\d.]+)/);
                    if (this.noteToFreq[note]) { // Only add note if frequency exists
                        track.sequence.push({ 
                            type: 'bass', 
                            note, 
                            duration: parseFloat(duration)
                        });
                    }
                }
            });

            return track;
        } catch (error) {
            console.error('Error parsing track data:', error);
            return track; // Return default track structure
        }
    }

    parseSoundEffects(data) {
        const lines = data.split('\n').map(line => line.trim());
        let currentEffect = null;

        lines.forEach(line => {
            if (line.startsWith('sfx')) {
                const name = line.match(/"([^"]+)"/)[1];
                currentEffect = { name, params: {} };
            } else if (currentEffect && line.includes(':')) {
                const [key, value] = line.split(':').map(s => s.trim());
                currentEffect.params[key] = value;
            } else if (line === '}' && currentEffect) {
                this.soundEffects.set(currentEffect.name, currentEffect.params);
                currentEffect = null;
            }
        });
    }

    playNote(note, duration) {
        if (!this.audioContext) return;
        
        const frequency = this.noteToFreq[note];
        if (!frequency || !isFinite(frequency)) {
            console.error('Invalid note frequency:', note);
            return;
        }

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0.3, now); // Reduced volume
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        oscillator.start(now);
        oscillator.stop(now + duration);
    }

    playSoundEffect(name) {
        if (!this.audioContext) return;
        const effect = this.soundEffects.get(name);
        if (!effect) return;

        if (effect.type === 'note') {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = parseFloat(effect.frequency);
            oscillator.type = effect.wave || 'sine';
            
            const duration = parseFloat(effect.duration);
            const now = this.audioContext.currentTime;
            
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
            
            oscillator.start(now);
            oscillator.stop(now + duration);
        }
    }

    playDrum(type, duration) {
        if (!this.audioContext) return;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        switch(type) {
            case 'kick':
                oscillator.frequency.value = 60;
                break;
            case 'snare':
                oscillator.frequency.value = 200;
                break;
            case 'hihat':
                oscillator.frequency.value = 1000;
                break;
        }
        
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        oscillator.start(now);
        oscillator.stop(now + duration);
    }
}
