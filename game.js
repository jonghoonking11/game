/**
 * Neon Void: Zero Gravity
 * Core Game Engine (Hardcore Version)
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    async play(type) {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') await this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        const now = this.ctx.currentTime;

        switch(type) {
            case 'wall':
                osc.type = 'square';
                osc.frequency.setValueAtTime(150, now);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
                break;
            case 'paddle':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            case 'brick':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800 + Math.random() * 200, now);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            case 'levelup':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.4);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                osc.start(now);
                osc.stop(now + 0.4);
                break;
            case 'warning':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.setValueAtTime(330, now + 0.1);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
                break;
            case 'gameover':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.linearRampToValueAtTime(50, now + 1);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 1);
                osc.start(now);
                osc.stop(now + 1);
                break;
        }
    }
}

class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    add(v) { this.x += v.x; this.y += v.y; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; return this; }
    mult(n) { this.x *= n; this.y *= n; return this; }
    mag() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    normalize() {
        let m = this.mag();
        if (m > 0) this.mult(1 / m);
        return this;
    }
    clone() { return new Vector(this.x, this.y); }
}

class Particle {
    constructor(x, y, color) {
        this.pos = new Vector(x, y);
        this.vel = new Vector((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
        this.acc = new Vector(0, 0.2);
        this.life = 1.0;
        this.decay = 0.02 + Math.random() * 0.03;
        this.color = color;
    }
    update() {
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        this.life -= this.decay;
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.pos.x, this.pos.y, 3, 3);
        ctx.restore();
    }
}

class Ball {
    constructor(x, y, radius, speed) {
        this.pos = new Vector(x, y);
        this.vel = new Vector(Math.random() > 0.5 ? 1 : -1, -1).normalize().mult(speed);
        this.radius = radius;
        this.speed = speed;
        this.trail = [];
    }

    update() {
        this.trail.push(this.pos.clone());
        if (this.trail.length > 8) this.trail.shift();
        this.pos.add(this.vel);
    }

    draw(ctx) {
        // Trail
        this.trail.forEach((p, i) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, this.radius * (i / this.trail.length), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 243, 255, ${0.1 * (i / this.trail.length)})`;
            ctx.fill();
        });

        // Main Ball
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00f3ff';
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

class Brick {
    constructor(x, y, w, h, level = 1) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.health = level; // Armor mechanics
        this.active = true;
        this.color = this.getColor(level);
    }

    getColor(level) {
        const colors = ['#00f3ff', '#ff00ff', '#39ff14', '#ff3131', '#fefe00'];
        return colors[(level - 1) % colors.length];
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 5;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x, this.y, this.w, this.h);
        
        if (this.health > 1) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x + 2, this.y + 2, this.w - 4, this.h - 4);
        }
        ctx.shadowBlur = 0;
    }
}

class GravityWell {
    constructor(x, y, radius, strength) {
        this.pos = new Vector(x, y);
        this.radius = radius;
        this.strength = strength;
        this.angle = 0;
    }
    draw(ctx) {
        this.angle += 0.1;
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 0, 255, ${0.2 + Math.sin(this.angle) * 0.1})`;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.restore();
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.sound = new SoundEngine();
        this.setupElements();
        this.init();
        this.bindEvents();
    }

    setupElements() {
        this.hud = {
            energyBar: document.getElementById('energy-bar'),
            score: document.getElementById('score'),
            level: document.getElementById('level'),
            wrapper: document.getElementById('game-wrapper')
        };
        this.screens = {
            start: document.getElementById('menu-start'),
            gameOver: document.getElementById('menu-gameover')
        };
        this.btnStart = document.getElementById('btn-start');
        this.btnRetry = document.getElementById('btn-retry');
        this.finalScore = document.getElementById('final-score');
    }

    init() {
        // Define objects FIRST
        this.gameState = 'START';
        this.energy = 100;
        this.score = 0;
        this.level = 1;
        this.bricks = [];
        this.particles = [];
        this.gravityWells = [];
        this.paddle = { x: 0, y: 0, w: 120, h: 12 };
        this.ball = null;
        this.keys = { left: false, right: false };
        this.lastWarningTime = 0;

        // Then call resize and logic
        this.resize();
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        this.btnStart.onclick = () => this.start();
        this.btnRetry.onclick = () => this.start();
        
        requestAnimationFrame((t) => this.loop(t));
    }

    resize() {
        const container = document.getElementById('game-wrapper');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.paddle.y = this.canvas.height - 60;
    }

    start() {
        this.sound.init(); // Init AudioContext on interaction
        this.init();
        this.gameState = 'PLAYING';
        this.screens.start.classList.remove('active');
        this.screens.gameOver.classList.remove('active');
        this.createLevel();
        this.ball = new Ball(this.canvas.width / 2, this.paddle.y - 20, 8, 6);
        this.lastWarningTime = 0;
    }

    createLevel() {
        const rows = 3 + this.level;
        const cols = 8;
        const pad = 10;
        const offsetTop = 100;
        const brickW = (this.canvas.width - 60 - (cols - 1) * pad) / cols;
        const brickH = 20;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const hp = (r === 0 && this.level > 2) ? 2 : 1;
                this.bricks.push(new Brick(30 + c * (brickW + pad), offsetTop + r * (brickH + pad), brickW, brickH, hp));
            }
        }

        // Add Gravity Well for level 2+
        if (this.level >= 2) {
            this.gravityWells.push(new GravityWell(
                this.canvas.width * (0.2 + Math.random() * 0.6),
                this.canvas.height * (0.3 + Math.random() * 0.2),
                50 + Math.random() * 50,
                0.2
            ));
        }
    }

    handleMouseMove(e) {
        if (this.gameState !== 'PLAYING') return;
        const rect = this.canvas.getBoundingClientRect();
        this.paddle.x = (e.clientX - rect.left) - this.paddle.w / 2;
        this.clampPaddle();
    }

    handleKeyDown(e) {
        if (e.code === 'ArrowLeft') this.keys.left = true;
        if (e.code === 'ArrowRight') this.keys.right = true;
    }
    handleKeyUp(e) {
        if (e.code === 'ArrowLeft') this.keys.left = false;
        if (e.code === 'ArrowRight') this.keys.right = false;
    }

    clampPaddle() {
        if (this.paddle.x < 0) this.paddle.x = 0;
        if (this.paddle.x + this.paddle.w > this.canvas.width) this.paddle.x = this.canvas.width - this.paddle.w;
    }

    loop(t) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.gameState === 'PLAYING') {
            this.update();
        }

        this.draw();
        requestAnimationFrame((t) => this.loop(t));
    }

    update() {
        // ENERGY DRAIN (Punishing mechanics)
        const drainRate = 0.05 + (this.level * 0.02);
        this.energy -= drainRate;

        if (this.keys.left) this.paddle.x -= 10;
        if (this.keys.right) this.paddle.x += 10;
        this.clampPaddle();

        if (this.ball) {
            this.ball.update();

            // Gravity Wells
            this.gravityWells.forEach(well => {
                const diff = well.pos.clone().sub(this.ball.pos);
                const dist = diff.mag();
                if (dist < well.radius * 2) {
                    const force = diff.normalize().mult(well.strength);
                    this.ball.vel.add(force).normalize().mult(this.ball.speed);
                }
            });

            // Wall Collisions
            if (this.ball.pos.x < this.ball.radius || this.ball.pos.x > this.canvas.width - this.ball.radius) {
                this.ball.vel.x *= -1;
                this.sound.play('wall');
                this.shake();
            }
            if (this.ball.pos.y < this.ball.radius) {
                this.ball.vel.y *= -1;
                this.sound.play('wall');
                this.shake();
            }

            // Paddle Collision
            if (this.ball.pos.y + this.ball.radius > this.paddle.y && 
                this.ball.pos.y < this.paddle.y + this.paddle.h &&
                this.ball.pos.x > this.paddle.x && 
                this.ball.pos.x < this.paddle.x + this.paddle.w) {
                
                const hitPos = (this.ball.pos.x - (this.paddle.x + this.paddle.w / 2)) / (this.paddle.w / 2);
                this.ball.vel.x = hitPos * this.ball.speed;
                this.ball.vel.y = -Math.abs(this.ball.vel.y);
                this.ball.vel.normalize().mult(this.ball.speed);
                this.sound.play('paddle');
                this.createBurst(this.ball.pos.x, this.ball.pos.y, '#fff', 5);
            }

            // Death
            if (this.ball.pos.y > this.canvas.height) {
                this.energy -= 25;
                if (this.energy > 0) this.resetBall();
            }

            // Bricks Collision
            this.bricks.forEach(b => {
                if (!b.active) return;
                if (this.ball.pos.x > b.x && this.ball.pos.x < b.x + b.w && 
                    this.ball.pos.y > b.y && this.ball.pos.y < b.y + b.h) {
                    
                    this.ball.vel.y *= -1;
                    b.health--;
                    if (b.health <= 0) {
                        b.active = false;
                        this.score += 100 * this.level;
                        this.energy = Math.min(100, this.energy + 5);
                    }
                    this.sound.play('brick');
                    this.createBurst(b.x + b.w/2, b.y + b.h/2, b.color, 15);
                    this.ball.speed += 0.05;
                    this.shake();
                }
            });

            if (this.bricks.every(b => !b.active)) {
                this.level++;
                this.sound.play('levelup');
                this.createLevel();
                this.resetBall();
                this.energy = Math.min(100, this.energy + 30);
            }
        }

        // Particle Update
        this.particles.forEach((p, i) => {
            p.update();
            if (p.life <= 0) this.particles.splice(i, 1);
        });

        if (this.energy <= 0) this.gameOver();

        // Warning sound for low energy
        if (this.energy < 30 && performance.now() - this.lastWarningTime > 1000) {
            this.sound.play('warning');
            this.lastWarningTime = performance.now();
        }

        this.updateHUD();
    }

    updateHUD() {
        this.hud.energyBar.style.width = `${this.energy}%`;
        this.hud.energyBar.style.backgroundColor = this.energy < 30 ? '#ff3131' : '#00f3ff';
        this.hud.score.innerText = String(Math.floor(this.score)).padStart(6, '0');
        this.hud.level.innerText = String(this.level).padStart(2, '0');
        
        if (this.energy < 30) {
            this.hud.wrapper.classList.add('energy-critical');
        } else {
            this.hud.wrapper.classList.remove('energy-critical');
        }
    }

    createBurst(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    shake() {
        this.hud.wrapper.style.transform = `translate(${(Math.random()-0.5)*5}px, ${(Math.random()-0.5)*5}px)`;
        setTimeout(() => this.hud.wrapper.style.transform = '', 50);
    }

    gameOver() {
        this.gameState = 'OVER';
        this.sound.play('gameover');
        this.finalScore.innerText = this.score;
        this.screens.gameOver.classList.add('active');
    }

    draw() {
        this.gravityWells.forEach(w => w.draw(this.ctx));
        this.bricks.forEach(b => b.draw(this.ctx));
        if (this.ball) this.ball.draw(this.ctx);
        
        // Paddle
        this.ctx.fillStyle = this.energy < 30 ? '#ff3131' : '#00f3ff';
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = this.ctx.fillStyle;
        this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h);
        this.ctx.shadowBlur = 0;

        this.particles.forEach(p => p.draw(this.ctx));
    }

    resetBall() {
        this.ball = new Ball(this.canvas.width / 2, this.paddle.y - 20, 8, 6 + this.level);
    }
}

// Start Game
window.onload = () => {
    new Game();
};
