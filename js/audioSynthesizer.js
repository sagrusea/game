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
        this.volume = 1.0;
        this.instruments = {
            piano: { type: 'sine', attack: 0.02, decay: 0.1, sustain: 0.7, release: 0.1 },
            bass: { type: 'triangle', attack: 0.05, decay: 0.2, sustain: 0.8, release: 0.2 },
            lead: { type: 'square', attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.1 },
            pad: { type: 'sine', attack: 0.3, decay: 0.3, sustain: 0.8, release: 0.5 },
            pluck: { type: 'sawtooth', attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.1 }
        };
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

    setVolume(volume) {
        this.volume = volume;
    }

    playNote(note, duration, instrument = 'piano') {
        if (!this.audioContext) return;
        
        const frequency = this.noteToFreq[note];
        if (!frequency) return;

        const instSettings = this.instruments[instrument] || this.instruments.piano;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        // Add filter for tone shaping
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = instrument === 'bass' ? 500 : 2000;

        // Connect nodes
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = instSettings.type;
        oscillator.frequency.value = frequency;

        const now = this.audioContext.currentTime;
        const { attack, decay, sustain, release } = instSettings;
        
        // ADSR envelope
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(this.volume, now + attack);
        gainNode.gain.linearRampToValueAtTime(sustain * this.volume, now + attack + decay);
        gainNode.gain.setValueAtTime(sustain * this.volume, now + duration - release);
        gainNode.gain.linearRampToValueAtTime(0, now + duration);

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
            
            gainNode.gain.setValueAtTime(0.3 * this.volume, now);
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
        gainNode.gain.setValueAtTime(0.5 * this.volume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        oscillator.start(now);
        oscillator.stop(now + duration);
    }
}
