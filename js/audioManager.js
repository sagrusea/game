class AudioManager {
    constructor() {
        this.synthesizer = new AudioSynthesizer();
        this.track = null;
        this.isPlaying = false;
        this.isMuted = false;
        this.initialized = false;
        this.currentTrack = 0;
        this.musicState = 'menu'; // Add music state tracking
        this.tracks = [
            'assets/sound/music/menu.mp3',
            'assets/sound/music/Dungeons_whispers.mp3',
            'assets/sound/music/Travelers_tune.mp3'  // Add shop music track
        ];
        this.audioElement = new Audio();
        this.audioElement.loop = true;
        this.volume = 1.0;
        this.sfxEnabled = true;
        this.currentSequenceTimeout = null; // Add this line to track the current sequence timeout
        this.sfxVolume = 1.0;
        this.musicEnabled = true; // Add new state flag
    }

    async init() {
        if (!this.initialized) {
            this.synthesizer.init();
            await this.loadBackgroundMusic();
            this.initialized = true;
        }
    }

    async loadBackgroundMusic() {
        this.audioElement.src = this.tracks[this.currentTrack];
        this.audioElement.volume = this.volume;
        await this.synthesizer.loadSoundEffects('assets/sound/sfx/effects.ass');
    }

    async playBackgroundMusic() {
        if (!this.initialized || !this.musicEnabled) {
            return;
        }
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        this.audioElement.play();
    }

    stopBackgroundMusic() {
        this.isPlaying = false;
        this.audioElement.pause();
    }

    toggleMute() {
        this.musicEnabled = !this.musicEnabled;
        if (!this.musicEnabled) {
            this.stopBackgroundMusic();
        } else if (!this.isLevelMusic) { // Only restart if it's menu music
            this.playBackgroundMusic();
        }
    }

    setVolume(volume) {
        this.volume = volume;
        this.audioElement.volume = volume;
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
        this.stopBackgroundMusic();
        this.currentTrack = (this.currentTrack + 1) % this.tracks.length;
        await this.loadBackgroundMusic();
        if (!this.isMuted) {
            this.playBackgroundMusic();
        }
    }

    stopLevelMusic() {
        this.isLevelMusic = false;
        if (this.musicEnabled) { // Only restart menu music if music is enabled
            this.playBackgroundMusic();
        }
    }

    startLevelMusic() {
        this.isLevelMusic = true;
        this.stopBackgroundMusic();
    }

    async startShopMusic() {
        this.musicState = 'shop';
        this.currentTrack = 2;
        await this.switchMusic();
    }

    async stopShopMusic() {
        this.musicState = 'menu';
        this.currentTrack = 0;
        await this.switchMusic();
    }

    async switchMusic() {
        if (this.musicEnabled) {
            this.stopBackgroundMusic();
            await this.loadBackgroundMusic();
            await this.audioElement.play().catch(err => console.log('Error playing music:', err));
            this.isPlaying = true;
        }
    }
}
