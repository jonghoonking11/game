/**
 * Neon Breaker: Extreme
 * Core Game Logic - v5 (Dual Control: Mouse & Keyboard)
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');
const finalScoreEl = document.getElementById('final-score');
const startMenu = document.getElementById('start-menu');
const gameOverMenu = document.getElementById('game-over-menu');
const notifBar = document.getElementById('notif-bar');

// Buttons
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Game Constants
const CONFIG = {
    initialBallSpeed: 4,
    speedIncrease: 0.15,
    maxSpeed: 12,
    initialPaddleWidth: 120,
    minPaddleWidth: 50,
    paddleSpeed: 10, // Keyboard speed
    brickRows: 5,
    brickCols: 8,
    brickPadding: 10,
    brickOffsetTop: 80,
    brickOffsetLeft: 30,
    colors: ['#00f3ff', '#ff007f', '#fefe00', '#ff3131', '#00ff41']
};

// Game State
let gameState = 'MENU';
let score = 0;
let lives = 3;
let level = 1;

let paddle = {
    x: 0,
    y: 0,
    width: CONFIG.initialPaddleWidth,
    height: 15,
    color: '#00f3ff'
};

let ball = {
    x: 0,
    y: 0,
    dx: CONFIG.initialBallSpeed,
    dy: -CONFIG.initialBallSpeed,
    radius: 8,
    speed: CONFIG.initialBallSpeed,
    trail: []
};

let bricks = [];
let particles = [];

// Input state
const keys = { left: false, right: false };

// ─────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────
function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Keyboard (Robust implementation using e.code)
    window.addEventListener('keydown', (e) => {
        const code = e.code;
        if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'Space'].includes(code)) {
            e.preventDefault();
        }
        
        if (code === 'ArrowLeft' || code === 'KeyA') keys.left = true;
        if (code === 'ArrowRight' || code === 'KeyD') keys.right = true;
        
        // Debug log (can be seen in F12 Console)
        console.log(`Key Down: ${code}`);
    });

    window.addEventListener('keyup', (e) => {
        const code = e.code;
        if (code === 'ArrowLeft' || code === 'KeyA') keys.left = false;
        if (code === 'ArrowRight' || code === 'KeyD') keys.right = false;
    });

    // Mouse movement
    window.addEventListener('mousemove', (e) => {
        // Only follow mouse if keys are NOT being pressed (to avoid fighting)
        if (keys.left || keys.right) return;
        if (gameState !== 'PLAYING') return;
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        paddle.x = mouseX - paddle.width / 2;
        clampPaddle();
    });

    // Touch movement
    window.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (gameState !== 'PLAYING') return;
        const rect = canvas.getBoundingClientRect();
        const touchX = e.touches[0].clientX - rect.left;
        paddle.x = touchX - paddle.width / 2;
        clampPaddle();
    }, { passive: false });

    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);

    requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    const container = document.getElementById('game-container');
    if (!container) return;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    paddle.y = canvas.height - 40;
    paddle.x = (canvas.width - paddle.width) / 2;
}

function clampPaddle() {
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;
}

function initBricks() {
    bricks = [];
    const brickWidth = (canvas.width - CONFIG.brickOffsetLeft * 2 - (CONFIG.brickCols - 1) * CONFIG.brickPadding) / CONFIG.brickCols;
    const brickHeight = 25;

    for (let c = 0; c < CONFIG.brickCols; c++) {
        bricks[c] = [];
        for (let r = 0; r < CONFIG.brickRows; r++) {
            bricks[c][r] = {
                x: c * (brickWidth + CONFIG.brickPadding) + CONFIG.brickOffsetLeft,
                y: r * (brickHeight + CONFIG.brickPadding) + CONFIG.brickOffsetTop,
                w: brickWidth,
                h: brickHeight,
                status: 1,
                color: CONFIG.colors[r % CONFIG.colors.length],
                points: (CONFIG.brickRows - r) * 10
            };
        }
    }
}

function startGame() {
    score = 0;
    lives = 3;
    level = 1;
    ball.speed = CONFIG.initialBallSpeed;
    paddle.width = CONFIG.initialPaddleWidth;

    updateUI();
    initBricks();
    resetBall();

    gameState = 'PLAYING';
    startMenu.classList.remove('active');
    gameOverMenu.classList.remove('active');
    
    // Ensure canvas has focus for keyboard
    canvas.setAttribute('tabindex', '0');
    canvas.focus();
}

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = paddle.y - ball.radius - 10;
    ball.dx = ball.speed * (Math.random() > 0.5 ? 1 : -1);
    ball.dy = -ball.speed;
    ball.trail = [];
}

// ─────────────────────────────────────────────
// Loops
// ─────────────────────────────────────────────

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameState === 'PLAYING') {
        update();
    }
    draw();
    requestAnimationFrame(gameLoop);
}

function update() {
    // ── Keyboard Movement ──
    if (keys.left) paddle.x -= CONFIG.paddleSpeed;
    if (keys.right) paddle.x += CONFIG.paddleSpeed;
    clampPaddle();

    // ── Ball Movement ──
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Trail
    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > 10) ball.trail.shift();

    // Wall Collision
    if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
        ball.dx = -ball.dx;
        createParticles(ball.x, ball.y, '#fff', 5);
    }
    if (ball.y - ball.radius < 0) {
        ball.dy = -ball.dy;
        createParticles(ball.x, ball.y, '#fff', 5);
    }

    // Paddle Collision
    if (
        ball.y + ball.radius > paddle.y &&
        ball.y - ball.radius < paddle.y + paddle.height &&
        ball.x > paddle.x &&
        ball.x < paddle.x + paddle.width
    ) {
        let hitPos = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
        ball.dx = hitPos * ball.speed;
        ball.dy = -Math.abs(ball.dy);

        ball.speed = Math.min(ball.speed + CONFIG.speedIncrease, CONFIG.maxSpeed);
        const angle = Math.atan2(ball.dy, ball.dx);
        ball.dx = Math.cos(angle) * ball.speed;
        ball.dy = Math.sin(angle) * ball.speed;

        createParticles(ball.x, ball.y, paddle.color, 10);
    }

    // Floor Collision
    if (ball.y + ball.radius > canvas.height) {
        lives--;
        updateUI();
        if (lives <= 0) endGame();
        else resetBall();
    }

    // Brick Collision
    let allSmashed = true;
    for (let c = 0; c < CONFIG.brickCols; c++) {
        for (let r = 0; r < CONFIG.brickRows; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                allSmashed = false;
                if (ball.x > b.x && ball.x < b.x + b.w && ball.y > b.y && ball.y < b.y + b.h) {
                    ball.dy = -ball.dy;
                    b.status = 0;
                    score += b.points;
                    ball.speed = Math.min(ball.speed + 0.1, CONFIG.maxSpeed);
                    updateUI();
                    createParticles(b.x + b.w/2, b.y + b.h/2, b.color, 15);
                }
            }
        }
    }
    if (allSmashed) nextLevel();

    // Particles Update
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.02;
        if (p.alpha <= 0) particles.splice(i, 1);
    }
}

function nextLevel() {
    level++;
    ball.speed += 1;
    paddle.width = Math.max(paddle.width - 10, CONFIG.minPaddleWidth);
    updateUI();
    initBricks();
    resetBall();
    showNotification('LEVEL UP! SPEED++ PADDLE--');
}

function endGame() {
    gameState = 'GAME_OVER';
    finalScoreEl.innerText = score;
    gameOverMenu.classList.add('active');
}

function updateUI() {
    scoreEl.innerText = score;
    livesEl.innerText = '❤'.repeat(lives);
    levelEl.innerText = level;
}

function showNotification(text) {
    notifBar.innerText = text;
    notifBar.style.opacity = '1';
    setTimeout(() => { notifBar.style.opacity = '0'; }, 2000);
}

// ─────────────────────────────────────────────
// Drawing
// ─────────────────────────────────────────────

function draw() {
    // Particles
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    // Paddle
    ctx.shadowBlur = 15;
    ctx.shadowColor = paddle.color;
    ctx.fillStyle = paddle.color;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.shadowBlur = 0;

    // Bricks
    for (let c = 0; c < CONFIG.brickCols; c++) {
        for (let r = 0; r < CONFIG.brickRows; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                ctx.fillStyle = b.color;
                ctx.shadowBlur = 10;
                ctx.shadowColor = b.color;
                ctx.fillRect(b.x, b.y, b.w, b.h);
                ctx.shadowBlur = 0;
            }
        }
    }

    // Ball Trail
    ball.trail.forEach((pos, i) => {
        ctx.globalAlpha = (i / ball.trail.length) * 0.5;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, ball.radius * (i / ball.trail.length), 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Ball
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#fff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // --- VISUAL INPUT DEBUGGER ---
    if (gameState === 'PLAYING') {
        ctx.save();
        ctx.font = '12px monospace';
        ctx.fillStyle = keys.left ? '#00ff00' : 'rgba(255,255,255,0.2)';
        ctx.fillText(keys.left ? '[LEFT ACTIVE]' : '[left off]', 10, canvas.height - 10);
        ctx.fillStyle = keys.right ? '#00ff00' : 'rgba(255,255,255,0.2)';
        ctx.fillText(keys.right ? '[RIGHT ACTIVE]' : '[right off]', 110, canvas.height - 10);
        ctx.restore();
    }
}

function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            size: Math.random() * 4,
            color,
            alpha: 1
        });
    }
}

// Start
init();
