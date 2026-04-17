const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const uiStartScreen = document.getElementById('start-screen');
const uiGameOverScreen = document.getElementById('game-over-screen');
const scoreDisplay = document.getElementById('score');
const finalScoreDisplay = document.getElementById('final-score');
const highScoreDisplay = document.getElementById('high-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const hud = document.getElementById('hud');
const skillBtnZ = document.getElementById('skill-button-z');

// Game State
let gameState = 'START'; // START, PLAYING, GAMEOVER
let score = 0;
let highScore = 0;
let baseSpeed = 8;
let currentSpeed = 8;
let frames = 0;
let hitStopFrames = 0;
let screenShake = 0;

// Resolution & Scaling
const LOGICAL_HEIGHT = 720;
let scale = 1;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    scale = canvas.height / LOGICAL_HEIGHT;
}
window.addEventListener('resize', resize);
resize();

// Player
const player = {
    x: 150,
    y: canvas.height / 2,
    size: 30,
    vy: 0,
    gravity: 0.6,
    jumpForce: -10,
    isDashing: false,
    dashDuration: 20, // frames
    dashTimer: 0,
    color: '#0ff',
    trail: []
};

// Arrays
let walls = [];
let particles = [];

// Input handling
const keys = { space: false, z: false };
let touchStartX = 0;
let touchStartY = 0;

function jump() {
    if (gameState !== 'PLAYING') return;
    player.vy = player.jumpForce;
    createParticles(player.x, player.y + player.size, 5, '#fff', 2);
}

function dash() {
    if (gameState !== 'PLAYING') return;
    if (!player.isDashing) {
        player.isDashing = true;
        player.dashTimer = player.dashDuration;
        player.vy = 0; // stop vertical movement during initial dash
        createParticles(player.x, player.y, 10, '#0ff', 4);
    }
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        jump();
        e.preventDefault();
    }
    if (e.code === 'KeyZ') {
        dash();
    }
});

window.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    if (gameState !== 'PLAYING') return;
    if (e.button === 0) { //  Left click (Anywhere Jump)
        jump();
    } else if (e.button === 2) { // Right click
        dash();
    }
});

// Mobile touch input
window.addEventListener('touchstart', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
}, { passive: true });

window.addEventListener('touchend', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    if (gameState !== 'PLAYING') return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Swipe check: if dragged more than 30px, trigger Dash
    if (distance > 30) {
        dash();
    } else {
        // Otherwise, it's a simple tap: trigger Jump
        jump();
    }
}, { passive: true });

// Prevent context menu
window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (gameState === 'PLAYING') dash();
});

// UI Skill Button Binding
skillBtnZ.addEventListener('touchstart', (e) => {
    e.preventDefault();
    dash();
}, { passive: false });

skillBtnZ.addEventListener('mousedown', (e) => {
    dash();
});

// Particles
function createParticles(x, y, count, color, speed) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * speed * 2,
            vy: (Math.random() - 0.5) * speed * 2,
            life: 1.0,
            decay: Math.random() * 0.05 + 0.02,
            color: color,
            size: Math.random() * 4 + 2
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    for (let p of particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
}

// Walls
function spawnWall() {
    const minHeight = 50;
    const blockHeight = 120; // Height of the breakable segment
    const wallWidth = 60;
    
    // Pick a random Y position for the target block
    const targetY = Math.random() * (canvas.height - blockHeight - 100) + 50;
    
    let wallGroup = {
        x: canvas.width,
        width: wallWidth,
        passed: false,
        blocks: [
            // Top solid block
            { y: 0, height: targetY, type: 'solid' },
            // Target breakable block
            { y: targetY, height: blockHeight, type: 'breakable', broken: false },
            // Bottom solid block
            { y: targetY + blockHeight, height: canvas.height - (targetY + blockHeight), type: 'solid' }
        ]
    };
    
    walls.push(wallGroup);
}

function updateWalls() {
    // Spawn logic
    let spawnRate = Math.max(60, 120 - Math.floor(frames / 100)); // gets faster
    if (frames % spawnRate === 0) {
        spawnWall();
    }

    for (let i = walls.length - 1; i >= 0; i--) {
        let w = walls[i];
        w.x -= currentSpeed;
        
        // Score logic
        if (!w.passed && w.x + w.width < player.x) {
            w.passed = true;
            score += 10;
            scoreDisplay.innerText = score;
        }

        // Collision Logic
        if (w.x < player.x + player.size && w.x + w.width > player.x) {
            for (let b of w.blocks) {
                if (b.type === 'breakable' && b.broken) continue;
                
                // check Y overlap
                if (player.y < b.y + b.height && player.y + player.size > b.y) {
                    // Collision!
                    if (b.type === 'breakable' && player.isDashing) {
                        // Break it!
                        b.broken = true;
                        score += 50;
                        scoreDisplay.innerText = score;
                        screenShake = 20; // 진동 강화
                        hitStopFrames = 8; // 히트스탑 강화
                        createParticles(w.x + w.width/2, b.y + b.height/2, 40, '#0ff', 10);
                    } else {
                        // Dead
                        gameOver();
                    }
                }
            }
        }
        
        // Remove offscreen walls
        if (w.x + w.width < 0) {
            walls.splice(i, 1);
        }
    }
}

function drawWalls() {
    for (let w of walls) {
        for (let b of w.blocks) {
            if (b.type === 'breakable' && b.broken) continue;

            ctx.fillStyle = b.type === 'solid' ? '#800' : '#0ff';
            ctx.shadowBlur = b.type === 'solid' ? 0 : 15;
            ctx.shadowColor = b.type === 'solid' ? 'transparent' : '#0ff';
            
            ctx.fillRect(w.x, b.y, w.width, b.height);
            
            // outline
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(w.x, b.y, w.width, b.height);
            
            // Inner Target indicator for breakable
            if (b.type === 'breakable') {
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.fillRect(w.x + 20, b.y + 20, w.width - 40, b.height - 40);
            }
        }
    }
}

// Game Loop
function gameOver() {
    gameState = 'GAMEOVER';
    screenShake = 20;
    createParticles(player.x, player.y, 50, '#f0f', 10);
    
    if (score > highScore) highScore = score;
    finalScoreDisplay.innerText = score;
    highScoreDisplay.innerText = highScore;
    
    setTimeout(() => {
        uiGameOverScreen.classList.remove('hidden');
        hud.classList.add('hidden'); // 게임오버 시 버튼 숨김
    }, 500);
}

function resetGame() {
    player.x = 150;
    player.y = canvas.height / 2;
    player.vy = 0;
    player.isDashing = false;
    player.dashTimer = 0;
    player.trail = [];
    walls = [];
    particles = [];
    score = 0;
    frames = 0;
    currentSpeed = baseSpeed;
    scoreDisplay.innerText = score;
    gameState = 'PLAYING';
    
    uiStartScreen.classList.add('hidden');
    uiGameOverScreen.classList.add('hidden');
    hud.classList.remove('hidden'); // 게임 시작 시 버튼 표시
}

function update() {
    if (gameState === 'PLAYING') {
        // Hitstop logic
        if (hitStopFrames > 0) {
            hitStopFrames--;
            return; // skip physics this frame
        }

        frames++;
        
        // Difficulty increase
        if (frames % 300 === 0) currentSpeed += 0.5;

        // Player physics
        player.vy += player.gravity;
        player.y += player.vy;
        
        // Dash logic
        if (player.dashTimer > 0) {
            player.dashTimer--;
            player.color = '#fff'; // turning white while dashing
            player.gravity = 0; // suspend gravity
            player.vy = 0;
            
            // create dash trail
            if (frames % 2 === 0) {
                player.trail.push({x: player.x, y: player.y, alpha: 0.8});
            }
            skillBtnZ.classList.add('active'); // 버튼 활성화 효과
        } else {
            player.isDashing = false;
            player.color = '#0ff';
            player.gravity = 0.6;
            skillBtnZ.classList.remove('active');
        }

        // Fade trail
        for (let t of player.trail) {
            t.alpha -= 0.05;
        }
        player.trail = player.trail.filter(t => t.alpha > 0);

        // Bounds check (floor/ceiling)
        if (player.y < 0) {
            player.y = 0;
            player.vy = 0;
        }
        if (player.y + player.size > canvas.height) {
            player.y = canvas.height - player.size;
            player.vy = 0;
            jump(); // auto jump on floor to make it easier, or game over?
            // Let's make hitting floor game over for hardcore!
            gameOver(); 
        }

        updateWalls();
    }
    
    updateParticles();
}

function draw() {
    // Clear screen with dark trailing effect
    ctx.fillStyle = 'rgba(5, 5, 16, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    
    // Apply logical scaling
    ctx.scale(scale, scale);
    
    // Screenshake
    if (screenShake > 0) {
        const dx = (Math.random() - 0.5) * screenShake;
        const dy = (Math.random() - 0.5) * screenShake;
        ctx.translate(dx, dy);
        screenShake *= 0.9;
        if (screenShake < 0.5) screenShake = 0;
    }

    drawWalls();
    
    // Draw trail
    for (let t of player.trail) {
        ctx.globalAlpha = t.alpha;
        ctx.fillStyle = '#0ff';
        ctx.fillRect(t.x, t.y, player.size, player.size);
    }
    ctx.globalAlpha = 1.0;

    // Draw Player
    if (gameState !== 'GAMEOVER' || particles.length > 0) { // don't draw player if dead
        if (gameState !== 'GAMEOVER') {
            ctx.fillStyle = player.color;
            ctx.shadowBlur = player.isDashing ? 30 : 15;
            ctx.shadowColor = player.color;
            ctx.fillRect(player.x, player.y, player.size, player.size);
            ctx.shadowBlur = 0;

            // 스킬(대시) 사용 시 'Z' 표시
            if (player.isDashing) {
                ctx.save();
                ctx.fillStyle = '#fff';
                ctx.font = '900 24px Outfit';
                ctx.textAlign = 'center';
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#0ff';
                ctx.fillText('Z', player.x + player.size / 2, player.y - 15);
                ctx.restore();
            }
        }
    }
    
    drawParticles();

    ctx.restore();
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// Init Game Actions
startBtn.addEventListener('click', resetGame);
restartBtn.addEventListener('click', resetGame);

// Start render loop
loop();
