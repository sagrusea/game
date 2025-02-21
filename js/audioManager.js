class AudioManager {
    constructor() {
        this.synthesizer = new AudioSynthesizer();
        this.track = null;
        this.isPlaying = false;
        this.isMuted = false;
        this.initialized = false;
    }

    async init() {
        if (!this.initialized) {
            this.synthesizer.init();
            await this.loadBackgroundMusic();
            this.initialized = true;
        }
    }

    async loadBackgroundMusic() {
        this.track = await this.synthesizer.loadTrack('assets/sound/music/bg_1.ass');
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

            // Schedule next note
            setTimeout(() => {
                playSequence((index + 1) % this.track.sequence.length);
            }, event.duration * beatDuration * 1000);
        };

        playSequence();
    }

    stopBackgroundMusic() {
        this.isPlaying = false;
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopBackgroundMusic();
        } else {
            this.playBackgroundMusic();
        }
    }
}
