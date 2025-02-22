class AudioManager {
    constructor() {
        this.synthesizer = new AudioSynthesizer();
        this.track = null;
        this.isPlaying = false;
        this.isMuted = false;
        this.initialized = false;
        this.currentTrack = 0;
        this.tracks = [
            'assets/sound/music/bg_1.ass',
            'assets/sound/music/bg_2.ass',
            'assets/sound/music/bg_3.ass'
        ];
        this.volume = 1.0;
        this.sfxEnabled = true;
        this.currentSequenceTimeout = null; // Add this line to track the current sequence timeout
        this.sfxVolume = 1.0;
    }

    async init() {
        if (!this.initialized) {
            this.synthesizer.init();
            await this.loadBackgroundMusic();
            this.initialized = true;
        }
    }

    async loadBackgroundMusic() {
        this.track = await this.synthesizer.loadTrack(this.tracks[this.currentTrack]);
        await this.synthesizer.loadSoundEffects('assets/sound/sfx/effects.ass');
    }

    async playBackgroundMusic() {
        if (!this.initialized) {
            await this.init();
        }
        if (!this.track || this.isPlaying) return;
        
        this.isPlaying = true;
        const beatDuration = 60 / this.track.tempo;

        const playSequence = async (index = 0) => {
            if (!this.isPlaying || this.isMuted) return;

            const event = this.track.sequence[index];
            if (event.type === 'note' || event.type === 'bass') {
                this.synthesizer.playNote(event.note, event.duration * beatDuration);
            } else if (event.type === 'drum') {
                this.synthesizer.playDrum(event.drumType, event.duration * beatDuration);
            }

            // Store the timeout so we can clear it later
            this.currentSequenceTimeout = setTimeout(() => {
                playSequence((index + 1) % this.track.sequence.length);
            }, event.duration * beatDuration * 1000);
        };

        playSequence();
    }

    stopBackgroundMusic() {
        this.isPlaying = false;
        // Clear the current sequence timeout
        if (this.currentSequenceTimeout) {
            clearTimeout(this.currentSequenceTimeout);
            this.currentSequenceTimeout = null;
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopBackgroundMusic();
        } else {
            this.playBackgroundMusic();
        }
    }

    setVolume(volume) {
        this.volume = volume;
        this.synthesizer.setVolume(volume);
    }

    setSfxEnabled(enabled) {
        this.sfxEnabled = enabled;
    }

    setSfxVolume(volume) {
        this.sfxVolume = volume;
    }

    playSoundEffect(name) {
        if (this.sfxEnabled && this.synthesizer) {
            this.synthesizer.playSoundEffect(name, this.sfxVolume);
        }
    }

    async nextTrack() {
        // Stop current track completely
        this.stopBackgroundMusic();
        
        // Switch to next track
        this.currentTrack = (this.currentTrack + 1) % this.tracks.length;
        await this.loadBackgroundMusic();
        
        // Start new track if we were playing before
        if (!this.isMuted) {
            this.playBackgroundMusic();
        }
    }
}
