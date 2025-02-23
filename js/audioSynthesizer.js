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
            piano: { 
                type: 'sine',
                attack: 0.02,
                decay: 0.1,
                sustain: 0.7,
                release: 0.1,
                filterType: 'lowpass',
                filterFreq: 2000,
                detune: 0
            },
            bass: { 
                type: 'triangle',
                attack: 0.05,
                decay: 0.2,
                sustain: 0.8,
                release: 0.2,
                filterType: 'lowpass',
                filterFreq: 500,
                detune: 0
            },
            lead: { 
                type: 'sawtooth',
                attack: 0.01,
                decay: 0.1,
                sustain: 0.6,
                release: 0.1,
                filterType: 'highpass',
                filterFreq: 1000,
                detune: 5
            },
            pad: { 
                type: 'sine',
                attack: 0.3,
                decay: 0.3,
                sustain: 0.8,
                release: 0.5,
                filterType: 'lowpass',
                filterFreq: 800,
                detune: 10,
                chorus: true
            },
            pluck: { type: 'sawtooth', attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.1 },
            bell: { type: 'sine', attack: 0.01, decay: 0.5, sustain: 0.0, release: 0.1 },
            flute: { type: 'sine', attack: 0.1, decay: 0.1, sustain: 0.8, release: 0.2 },
            strings: { 
                type: 'sawtooth',
                attack: 0.2,
                decay: 0.2,
                sustain: 0.9,
                release: 0.3,
                filterType: 'lowpass',
                filterFreq: 1200,
                detune: 12,
                harmonics: [
                    { interval: 0, volume: 1.0 },    // Root note
                    { interval: 7, volume: 0.5 },    // Fifth
                    { interval: 12, volume: 0.3 }    // Octave
                ]
            },
            synth: { type: 'square', attack: 0.02, decay: 0.3, sustain: 0.6, release: 0.2 },
            organ: { 
                type: 'square',
                attack: 0.05,
                decay: 0.0,
                sustain: 1.0,
                release: 0.1,
                filterType: 'bandpass',
                filterFreq: 2000,
                detune: 3,
                harmonics: [
                    { interval: 0, volume: 1.0 },    // Root note
                    { interval: 12, volume: 0.7 },   // Octave
                    { interval: 19, volume: 0.4 },   // Twelfth
                    { interval: 24, volume: 0.2 }    // Double octave
                ]
            }
        };
    }

    async init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Ensure context is resumed on first user interaction
            if (this.audioContext.state === 'suspended') {
                await new Promise(resolve => {
                    const resumeOnInteraction = async () => {
                        await this.audioContext.resume();
                        document.removeEventListener('click', resumeOnInteraction);
                        document.removeEventListener('keydown', resumeOnInteraction);
                        resolve();
                    };
                    document.addEventListener('click', resumeOnInteraction);
                    document.addEventListener('keydown', resumeOnInteraction);
                });
            }
        }
        return this.audioContext;
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
        const track = {
            name: '',
            tempo: 120,
            sequence: []
        };

        try {
            // Remove comments and empty lines
            const lines = data.split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('//'));

            let inSequence = false;
            let currentInstrument = 'piano';

            lines.forEach(line => {
                // Track name
                if (line.includes('track')) {
                    const nameMatch = line.match(/track\s*"([^"]+)"/);
                    if (nameMatch) {
                        track.name = nameMatch[1];
                    }
                }
                // Tempo
                else if (line.includes('tempo:')) {
                    const tempoMatch = line.match(/tempo:\s*(\d+)/);
                    if (tempoMatch) {
                        track.tempo = parseInt(tempoMatch[1]);
                    }
                }
                // Start of sequence
                else if (line.includes('sequence {')) {
                    inSequence = true;
                }
                // End of sequence
                else if (line === '}') {
                    inSequence = false;
                }
                // Instrument selection
                else if (line.startsWith('instrument')) {
                    const instMatch = line.match(/instrument\s+(\w+)/);
                    if (instMatch) {
                        currentInstrument = instMatch[1];
                    }
                }
                // Note definition
                else if (inSequence && (line.startsWith('note') || line.startsWith('bass'))) {
                    const [type, note, duration] = line.split(/\s+/);
                    if (this.noteToFreq[note]) {
                        track.sequence.push({
                            type: type === 'bass' ? 'bass' : 'note',
                            instrument: currentInstrument,
                            note: note,
                            duration: parseFloat(duration)
                        });
                    }
                }
            });

            console.log('Parsed track:', track); // Debug output
            return track;
        } catch (error) {
            console.error('Error parsing track data:', error);
            return track;
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

    playNote(note, duration, instrument = 'piano', startTime = null) {
        if (!this.audioContext) return;
        
        const frequency = this.noteToFreq[note];
        if (!frequency) return;
        
        const now = startTime || this.audioContext.currentTime;

        const instSettings = this.instruments[instrument] || this.instruments.piano;

        // Create master gain node
        const masterGain = this.audioContext.createGain();
        masterGain.connect(this.audioContext.destination);

        // Handle harmonics if defined
        const oscillators = [];
        if (instSettings.harmonics) {
            instSettings.harmonics.forEach(harmonic => {
                const oscillatorPair = this.createOscillatorPair(
                    frequency * Math.pow(2, harmonic.interval / 12),
                    instSettings,
                    masterGain,
                    harmonic.volume
                );
                oscillators.push(...oscillatorPair);
            });
        } else {
            // Default behavior with two oscillators
            const mainOscillators = this.createOscillatorPair(frequency, instSettings, masterGain, 1.0);
            oscillators.push(...mainOscillators);
        }

        // ADSR envelope with safe values
        const safeVolume = Math.min(Math.max(0, this.volume), 1);
        const safeSustain = Math.min(Math.max(0, instSettings.sustain || 0.7), 1);
        const attack = Math.max(0.001, instSettings.attack || 0.02);
        const decay = Math.max(0.001, instSettings.decay || 0.1);
        const release = Math.max(0.001, instSettings.release || 0.1);
        
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(safeVolume, now + attack);
        masterGain.gain.linearRampToValueAtTime(safeSustain * safeVolume, now + attack + decay);
        masterGain.gain.setValueAtTime(safeSustain * safeVolume, now + duration - release);
        masterGain.gain.linearRampToValueAtTime(0, now + duration);

        // Add chorus effect if specified
        if (instSettings.chorus) {
            this.addChorusEffect(oscillators, now, duration);
        }

        // Start and stop all oscillators
        oscillators.forEach(osc => {
            osc.start(now);
            osc.stop(now + duration);
        });
    }

    createOscillatorPair(frequency, instSettings, outputNode, volumeMult = 1.0) {
        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        // Create filter
        const filter = this.audioContext.createBiquadFilter();
        filter.type = instSettings.filterType || 'lowpass';
        filter.frequency.value = Math.min(Math.max(0, instSettings.filterFreq || 2000), 20000);

        // Connect nodes
        oscillator1.connect(filter);
        oscillator2.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(outputNode);
        
        // Set oscillator properties
        oscillator1.type = instSettings.type || 'sine';
        oscillator2.type = instSettings.type || 'sine';
        oscillator1.frequency.value = frequency;
        oscillator2.frequency.value = frequency;
        
        // Apply detune
        const detune = isFinite(instSettings.detune) ? instSettings.detune : 0;
        oscillator2.detune.value = Math.min(Math.max(-100, detune), 100);

        // Set harmonic volume
        gainNode.gain.value = volumeMult;

        return [oscillator1, oscillator2];
    }

    addChorusEffect(oscillators, now, duration) {
        const chorus = this.audioContext.createOscillator();
        const chorusGain = this.audioContext.createGain();
        chorus.frequency.value = 3;
        chorusGain.gain.value = 0.002;
        chorus.connect(chorusGain);
        
        oscillators.forEach(osc => {
            chorusGain.connect(osc.frequency);
        });
        
        chorus.start(now);
        chorus.stop(now + duration);
    }

    playSoundEffect(name) {
        if (!this.audioContext) return;
        const effect = this.soundEffects.get(name);
        if (!effect) return;

        const now = this.audioContext.currentTime;

        if (effect.type === 'note') {
            // Single note effect
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = parseFloat(effect.frequency);
            oscillator.type = effect.wave || 'sine';
            
            const duration = parseFloat(effect.duration);
            
            gainNode.gain.setValueAtTime(0.3 * this.volume, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
            
            oscillator.start(now);
            oscillator.stop(now + duration);
        } else if (effect.sequence) {
            // Sequence of notes
            let timeOffset = 0;
            effect.sequence.forEach(noteEvent => {
                if (noteEvent.type === 'note') {
                    this.playNote(
                        noteEvent.note,
                        parseFloat(noteEvent.duration),
                        'piano',
                        now + timeOffset
                    );
                    timeOffset += parseFloat(noteEvent.duration);
                }
            });
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
