import { Player } from './player.js';
import { Level } from './level.js';
import { AudioController } from './audio.js';

// Setup Canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let width, height;

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resize);
resize();

// UI Elements
const uiAttempt = document.getElementById('attempt-count');
const uiScore = document.getElementById('score-display');
const uiBest = document.getElementById('best-score');
const startScreen = document.getElementById('start-screen');
const pauseMenu = document.getElementById('pause-menu');
const msgOverlay = document.getElementById('message-overlay');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const restartBtn = document.getElementById('restart-btn');
const msgBtn = document.getElementById('msg-btn');
const volumeSlider = document.getElementById('volume-slider');

// Game State
const STATE = {
    MENU: 0,
    PLAYING: 1,
    PAUSED: 2,
    GAMEOVER: 3,
    WIN: 4
};

let currentState = STATE.MENU;
let groundY = height * 0.75;
let audio = new AudioController();

// Entities
let player;
let level;
let particles = [];
let cameraX = 0;
let shakeTime = 0;

// Stats
let attempts = 1;
let bestScore = 0;
let startTime = 0;

// Initialization
async function init() {
    // Load Assets
    await audio.loadAsset('bgm', 'bgm.mp3');
    await audio.loadAsset('jump', 'jump.mp3');
    await audio.loadAsset('death', 'death.mp3');
    await audio.loadAsset('win', 'win.mp3');
    
    // Enable button
    startBtn.innerText = "START GAME";
    startBtn.onclick = startGame;
}

function resetGame(fullReset = false) {
    if (fullReset) {
        attempts = 1;
        bestScore = 0;
    } else {
        attempts++;
    }
    
    // Re-calc ground based on current height
    groundY = height * 0.7;
    
    player = new Player(100, groundY, "#ff9900");
    level = new Level(groundY);
    cameraX = 0;
    particles = [];
    shakeTime = 0;
    
    updateUI();
}

function startGame() {
    audio.resumeContext();
    startScreen.classList.remove('visible');
    startScreen.classList.add('hidden');
    msgOverlay.classList.remove('visible');
    msgOverlay.classList.add('hidden');
    
    resetGame(true); // Full reset first time
    currentState = STATE.PLAYING;
    startTime = Date.now();
    
    audio.playBgm();
    requestAnimationFrame(loop);
}

function die() {
    currentState = STATE.GAMEOVER;
    audio.stopBgm();
    audio.playSfx('death');
    shakeTime = 20;
    createExplosion(player.x, player.y, player.color, 30);
    
    setTimeout(() => {
        // Quick restart logic
        resetGame(false);
        currentState = STATE.PLAYING;
        audio.playBgm();
    }, 1000);
}

// win() removed for infinite mode

// Input Handling
function handleInput(e) {
    if (e.type === 'keydown' && e.code !== 'Space') return;
    if (e.type === 'touchstart') e.preventDefault(); // Prevent scroll
    
    if (currentState === STATE.PLAYING) {
        if (player.jump()) {
            audio.playSfx('jump');
            createParticles(player.x, player.y + player.size, 5);
        }
    }
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') togglePause();
    handleInput(e);
});
window.addEventListener('mousedown', handleInput);
window.addEventListener('touchstart', handleInput, {passive: false});

// Pause Logic
pauseBtn.onclick = togglePause;
resumeBtn.onclick = togglePause;
restartBtn.onclick = () => {
    togglePause();
    resetGame(true); // Hard reset
    audio.stopBgm();
    audio.playBgm();
};

function togglePause(e) {
    if (e) e.stopPropagation(); // prevent jumping when clicking pause
    
    if (currentState === STATE.PLAYING) {
        currentState = STATE.PAUSED;
        pauseMenu.classList.remove('hidden');
        pauseMenu.classList.add('visible');
        audio.masterGain.gain.value = 0.1; // dim volume
    } else if (currentState === STATE.PAUSED) {
        currentState = STATE.PLAYING;
        pauseMenu.classList.remove('visible');
        pauseMenu.classList.add('hidden');
        audio.masterGain.gain.value = volumeSlider.value;
    }
}

volumeSlider.oninput = (e) => {
    audio.setVolume(e.target.value);
};

// Particles
function createParticles(x, y, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            life: 1.0,
            color: "#fff"
        });
    }
}

function createExplosion(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x + 15,
            y: y + 15,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            life: 1.0,
            color: color
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawParticles(cameraX) {
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - cameraX, p.y, 4, 4);
    });
    ctx.globalAlpha = 1;
}

// Stats & UI Update
function updateUI() {
    uiAttempt.innerText = attempts;
    
    if (!player) return;
    
    // Calculate score based on distance
    let score = Math.floor(player.x / 100);
    if (score < 0) score = 0;
    
    uiScore.innerText = score;
    
    if (score > bestScore) {
        bestScore = score;
        uiBest.innerText = bestScore;
    }
}

// Main Loop
function loop() {
    if (currentState === STATE.PLAYING || currentState === STATE.GAMEOVER || currentState === STATE.WIN) {
        // Clear Screen
        ctx.fillStyle = "#050505";
        ctx.fillRect(0, 0, width, height);
        
        // Draw grid background pulsing
        const beat = (Date.now() / 428) % 1; // Approx 140bpm
        const pulse = Math.sin(beat * Math.PI) * 0.1 + 0.1;
        
        ctx.strokeStyle = `rgba(0, 243, 255, ${pulse})`;
        ctx.lineWidth = 1;
        const gridSize = 100;
        const offset = -(cameraX * 0.5) % gridSize; // Parallax
        
        ctx.beginPath();
        for (let x = offset; x < width; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        for (let y = 0; y < height; y += gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();

        // Shake effect
        ctx.save();
        if (shakeTime > 0) {
            const dx = (Math.random() - 0.5) * shakeTime;
            const dy = (Math.random() - 0.5) * shakeTime;
            ctx.translate(dx, dy);
            shakeTime *= 0.9;
            if (shakeTime < 0.5) shakeTime = 0;
        }

        // Camera Logic
        cameraX = player.x - width * 0.2; // Keep player at 20% of screen

        // Updates
        if (currentState === STATE.PLAYING) {
            
            // Speed progression
            let score = Math.floor(player.x / 100);
            
            // Increase speed slightly every 100m
            // Base 4.5. Cap at 13.0
            // Slower ramp up for infinite play
            let targetSpeed = 4.5 + (score * 0.04);
            if (targetSpeed > 13.0) targetSpeed = 13.0;
            player.speed = targetSpeed;

            // Generate level
            level.update(cameraX, width, score);

            player.update();
            updateParticles();
            
            if (level.checkCollision(player)) {
                die();
            }
            
            updateUI();
        } else if (currentState === STATE.GAMEOVER) {
            updateParticles(); // Keep particles moving
        } else if (currentState === STATE.WIN) {
            updateParticles();
        }

        // Draw World
        level.draw(ctx, cameraX, width);
        player.draw(ctx, cameraX);
        drawParticles(cameraX);

        ctx.restore();
    }
    
    requestAnimationFrame(loop);
}

// Start Init
init();