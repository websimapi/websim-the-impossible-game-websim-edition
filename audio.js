export class AudioController {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = 0.5;

        this.buffers = {};
        this.bgmSource = null;
        this.bgmStartedAt = 0;
        this.isPlaying = false;
    }

    async loadAsset(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
            this.buffers[name] = audioBuffer;
        } catch (e) {
            console.error(`Failed to load audio: ${name}`, e);
        }
    }

    playSfx(name) {
        if (!this.buffers[name]) return;
        const source = this.ctx.createBufferSource();
        source.buffer = this.buffers[name];
        source.connect(this.masterGain);
        source.start(0);
    }

    playBgm(loop = true) {
        this.stopBgm(); // Ensure clean stop
        if (!this.buffers['bgm']) return;

        this.bgmSource = this.ctx.createBufferSource();
        this.bgmSource.buffer = this.buffers['bgm'];
        this.bgmSource.loop = loop;
        this.bgmSource.connect(this.masterGain);
        this.bgmSource.start(0);
        this.isPlaying = true;
    }

    stopBgm() {
        if (this.bgmSource) {
            try {
                this.bgmSource.stop();
            } catch(e) {} // Ignore if already stopped
            this.bgmSource = null;
        }
        this.isPlaying = false;
    }

    setVolume(val) {
        this.masterGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.1);
    }

    resumeContext() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
}