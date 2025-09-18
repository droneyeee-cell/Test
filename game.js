class InputHandler {
  constructor() {
    this.keys = new Set();
    this.allowed = new Set([
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'KeyA',
      'KeyD',
      'KeyW',
      'KeyS',
      'KeyF',
      'KeyJ',
      'Space'
    ]);
    window.addEventListener('keydown', (event) => this.handleKeyDown(event));
    window.addEventListener('keyup', (event) => this.handleKeyUp(event));
  }

  handleKeyDown(event) {
    if (this.allowed.has(event.code)) {
      event.preventDefault();
    }
    this.keys.add(event.code);
  }

  handleKeyUp(event) {
    this.keys.delete(event.code);
  }

  isDown(code) {
    return this.keys.has(code);
  }
}

class Projectile {
  constructor(game, x, y, direction, options = {}) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.width = options.width ?? 18;
    this.height = options.height ?? 6;
    this.speed = options.speed ?? 700;
    this.direction = direction;
    this.color = options.color ?? '#ffe066';
    this.shadow = options.shadow ?? '#ffd166';
    this.fromEnemy = options.fromEnemy ?? false;
    this.gravity = options.gravity ?? 0;
    this.vy = options.vy ?? 0;
    this.damage = options.damage ?? 1;
    this.markedForDeletion = false;
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    this.x += this.speed * dt * this.direction;
    if (this.gravity !== 0) {
      this.vy += this.gravity * dt;
    }
    this.y += this.vy * dt;

    if (
      this.x > this.game.width + 60 ||
      this.x + this.width < -60 ||
      this.y > this.game.height + 60 ||
      this.y + this.height < -60
    ) {
      this.markedForDeletion = true;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.shadow;
    ctx.shadowBlur = 12;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.restore();
  }

  collides(target) {
    return (
      this.x < target.x + target.width &&
      this.x + this.width > target.x &&
      this.y < target.y + target.height &&
      this.y + this.height > target.y
    );
  }
}

class Particle {
  constructor(game, x, y, color = '#ffd166') {
    this.game = game;
    this.x = x;
    this.y = y;
    this.radius = 4 + Math.random() * 6;
    this.color = color;
    this.vx = (Math.random() * 2 - 1) * 180;
    this.vy = (Math.random() * -1 - 0.2) * 220;
    this.gravity = 520;
    this.life = 420 + Math.random() * 380;
    this.remaining = this.life;
    this.markedForDeletion = false;
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    this.remaining -= deltaTime;
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.remaining <= 0) {
      this.markedForDeletion = true;
    }
  }

  draw(ctx) {
    ctx.save();
    const alpha = Math.max(this.remaining / this.life, 0);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Player {
  constructor(game) {
    this.game = game;
    this.width = 52;
    this.height = 70;
    this.speed = 280;
    this.jumpStrength = -520;
    this.gravity = 1500;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.shootInterval = 180;
    this.shootCooldown = 0;
    this.idleTimer = 0;
    this.hitFlash = 0;
    this.reset();
  }

  reset() {
    this.x = 120;
    this.y = this.game.groundY - this.height;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.shootCooldown = 0;
    this.hitFlash = 0;
  }

  onGround() {
    return this.y >= this.game.groundY - this.height - 0.5;
  }

  update(deltaTime, active) {
    const dt = deltaTime / 1000;
    this.idleTimer += dt;

    if (this.hitFlash > 0) {
      this.hitFlash = Math.max(0, this.hitFlash - deltaTime);
    }

    if (!active) {
      this.vx = 0;
      if (!this.onGround()) {
        this.vy += this.gravity * dt;
        this.y += this.vy * dt;
        if (this.onGround()) {
          this.y = this.game.groundY - this.height;
          this.vy = 0;
        }
      }
      return;
    }

    const input = this.game.input;
    let moving = 0;
    if (input.isDown('ArrowLeft') || input.isDown('KeyA')) {
      this.vx = -this.speed;
      moving = -1;
    } else if (input.isDown('ArrowRight') || input.isDown('KeyD')) {
      this.vx = this.speed;
      moving = 1;
    } else {
      this.vx = 0;
    }

    if (
      (input.isDown('ArrowUp') || input.isDown('KeyW') || input.isDown('Space')) &&
      this.onGround()
    ) {
      this.vy = this.jumpStrength;
    }

    if (moving !== 0) {
      this.facing = moving;
    }

    if (this.shootCooldown > 0) {
      this.shootCooldown = Math.max(0, this.shootCooldown - deltaTime);
    }

    if (input.isDown('KeyF') || input.isDown('KeyJ')) {
      this.shoot();
    }

    this.x += this.vx * dt;
    this.x = Math.max(40, Math.min(this.x, this.game.width - this.width - 40));

    this.vy += this.gravity * dt;
    this.y += this.vy * dt;
    if (this.y + this.height >= this.game.groundY) {
      this.y = this.game.groundY - this.height;
      this.vy = 0;
    }
  }

  shoot() {
    if (this.shootCooldown > 0) return;
    const offsetX = this.facing === 1 ? this.width - 12 : -6;
    const projectileX = this.x + offsetX;
    const projectileY = this.y + this.height * 0.45;
    this.game.spawnProjectile(projectileX, projectileY, this.facing, {
      width: 20,
      height: 6,
      speed: 760,
      color: '#ffe066',
      shadow: '#fff3b0'
    });
    this.game.addParticles(
      projectileX + (this.facing === 1 ? 0 : 6),
      projectileY + 2,
      4,
      '#ffef9f'
    );
    this.shootCooldown = this.shootInterval;
  }

  takeHit() {
    this.hitFlash = 220;
    this.vy = -280;
    this.vx = -this.facing * 160;
  }

  draw(ctx) {
    ctx.save();
    const bob = Math.sin(this.idleTimer * (this.game.gameState === 'playing' ? 12 : 4)) *
      (this.game.gameState === 'playing' ? 1.8 : 3.5);
    ctx.translate(this.x, this.y + bob);

    if (this.hitFlash > 0) {
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin((this.hitFlash / 220) * Math.PI);
    }

    // legs
    ctx.fillStyle = '#1b4332';
    ctx.fillRect(4, this.height - 20, this.width - 8, 20);

    // body
    ctx.fillStyle = '#2d6a4f';
    ctx.fillRect(6, 22, this.width - 12, this.height - 42);

    // backpack
    ctx.fillStyle = '#264653';
    ctx.fillRect(0, 32, 12, 32);

    // headband
    ctx.fillStyle = '#e63946';
    ctx.fillRect(12, 12, this.width - 20, 10);

    // head
    ctx.fillStyle = '#f4a261';
    ctx.beginPath();
    ctx.ellipse(this.width / 2, 20, this.width / 4, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // weapon
    ctx.save();
    ctx.translate(this.width / 2, this.height / 2);
    ctx.scale(this.facing, 1);
    ctx.fillStyle = '#3d405b';
    ctx.fillRect(6, -8, 32, 10);
    ctx.fillStyle = '#adb5bd';
    ctx.fillRect(38, -4, 12, 4);
    ctx.restore();

    ctx.restore();
  }
}

class Enemy {
  constructor(game, type = 'grunt') {
    this.game = game;
    this.type = type;
    this.width = type === 'heavy' ? 68 : 54;
    this.height = type === 'heavy' ? 78 : 62;
    this.speed = type === 'heavy' ? 90 : 140;
    this.health = type === 'heavy' ? 4 : 2;
    this.shootDelay = type === 'heavy' ? 1700 : 1400;
    this.shootVariance = 500;
    this.color = type === 'heavy' ? '#bb3e03' : '#e36414';
    this.weaponColor = type === 'heavy' ? '#f2cc8f' : '#e9c46a';
    this.x = this.game.width + Math.random() * 80;
    this.y = this.game.groundY - this.height;
    this.shootTimer = 800 + Math.random() * 1200;
    this.hitFlash = 0;
    this.markedForDeletion = false;
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    this.x -= this.speed * dt;
    this.shootTimer -= deltaTime;

    if (this.hitFlash > 0) {
      this.hitFlash = Math.max(0, this.hitFlash - deltaTime);
    }

    if (this.x + this.width < -80) {
      this.markedForDeletion = true;
      if (this.game.gameState === 'playing') {
        this.game.takeDamage(1);
      }
    }

    if (this.game.gameState === 'playing' && this.shootTimer <= 0 && this.x < this.game.width - 120) {
      this.shoot();
      this.shootTimer = this.shootDelay + Math.random() * this.shootVariance;
    }
  }

  shoot() {
    const projectile = this.game.spawnProjectile(this.x + 6, this.y + this.height * 0.6, -1, {
      fromEnemy: true,
      width: 16,
      height: 6,
      speed: this.type === 'heavy' ? 420 : 360,
      color: '#ff8c66',
      shadow: '#ffad90',
      damage: this.type === 'heavy' ? 2 : 1
    });
    projectile.vy = -60;
    projectile.gravity = 240;
  }

  takeDamage(amount) {
    if (this.markedForDeletion) return;
    this.health -= amount;
    this.hitFlash = 200;
    if (this.health <= 0) {
      this.markedForDeletion = true;
      this.game.addScore(this.type === 'heavy' ? 250 : 120);
      this.game.addParticles(this.x + this.width / 2, this.y + this.height / 2, this.type === 'heavy' ? 20 : 12, '#ffb703');
    } else {
      this.game.addParticles(this.x + this.width / 2, this.y + this.height / 2, 6, '#fb8500');
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.hitFlash > 0) {
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin((this.hitFlash / 200) * Math.PI * 2);
    }

    ctx.fillStyle = this.color;
    ctx.fillRect(4, 16, this.width - 8, this.height - 26);

    ctx.fillStyle = '#432818';
    ctx.fillRect(0, this.height - 18, this.width, 18);

    ctx.fillStyle = '#f4a261';
    ctx.beginPath();
    ctx.ellipse(this.width / 2, 12, this.width / 4, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.weaponColor;
    ctx.fillRect(-6, this.height / 2 - 6, 26, 10);
    ctx.fillStyle = '#2b2d42';
    ctx.fillRect(18, this.height / 2 - 4, 16, 6);

    ctx.restore();
  }
}

class Game {
  constructor(canvas, overlays) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.groundHeight = 110;
    this.groundY = this.height - this.groundHeight;
    this.input = new InputHandler();
    this.player = new Player(this);
    this.projectiles = [];
    this.enemies = [];
    this.particles = [];
    this.clouds = this.createClouds();
    this.score = 0;
    this.bestScore = 0;
    this.lives = 3;
    this.maxLives = 3;
    this.spawnTimer = 0;
    this.spawnInterval = 1600;
    this.damageCooldown = 0;
    this.flashTimer = 0;
    this.elapsed = 0;
    this.gameState = 'start';
    this.overlays = overlays;
  }

  createClouds() {
    return Array.from({ length: 5 }, () => ({
      x: Math.random() * this.width,
      y: 60 + Math.random() * (this.groundY - 200),
      speed: 18 + Math.random() * 24,
      scale: 0.6 + Math.random() * 0.8
    }));
  }

  reset() {
    this.player.reset();
    this.projectiles = [];
    this.enemies = [];
    this.particles = [];
    this.clouds = this.createClouds();
    this.score = 0;
    this.lives = this.maxLives;
    this.spawnTimer = 0;
    this.spawnInterval = 1500;
    this.damageCooldown = 0;
    this.flashTimer = 0;
  }

  start() {
    this.reset();
    this.gameState = 'playing';
    this.hideOverlay(this.overlays.startOverlay);
    this.hideOverlay(this.overlays.gameOverOverlay);
  }

  endGame() {
    if (this.gameState === 'gameover') return;
    this.gameState = 'gameover';
    this.bestScore = Math.max(this.bestScore, this.score);
    if (this.overlays.finalScore) {
      this.overlays.finalScore.textContent = `得分：${this.score}　最佳：${this.bestScore}`;
    }
    this.showOverlay(this.overlays.gameOverOverlay);
  }

  showOverlay(element) {
    if (!element) return;
    element.classList.remove('hidden');
  }

  hideOverlay(element) {
    if (!element) return;
    element.classList.add('hidden');
  }

  spawnProjectile(x, y, direction, options = {}) {
    if (this.projectiles.length > 140) {
      this.projectiles.shift();
    }
    const projectile = new Projectile(this, x, y, direction, options);
    this.projectiles.push(projectile);
    return projectile;
  }

  addParticles(x, y, count = 8, color = '#ffd166') {
    for (let i = 0; i < count; i += 1) {
      if (this.particles.length > 220) {
        this.particles.shift();
      }
      this.particles.push(new Particle(this, x, y, color));
    }
  }

  addEnemy() {
    const heavyChance = Math.min(0.25, 0.1 + this.score / 2000);
    const type = Math.random() < heavyChance ? 'heavy' : 'grunt';
    this.enemies.push(new Enemy(this, type));
  }

  addScore(points) {
    this.score += points;
    this.bestScore = Math.max(this.bestScore, this.score);
  }

  takeDamage(amount = 1) {
    if (this.damageCooldown > 0) return;
    this.lives = Math.max(0, this.lives - amount);
    this.damageCooldown = 900;
    this.flashTimer = 260;
    this.player.takeHit();
    this.addParticles(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, 10, '#f94144');
    if (this.lives <= 0) {
      this.endGame();
    }
  }

  checkCollision(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  updateClouds(deltaTime) {
    const dt = deltaTime / 1000;
    this.clouds.forEach((cloud) => {
      cloud.x -= cloud.speed * dt;
      if (cloud.x < -160 * cloud.scale) {
        cloud.x = this.width + Math.random() * 140;
        cloud.y = 60 + Math.random() * (this.groundY - 200);
        cloud.speed = 18 + Math.random() * 24;
      }
    });
  }

  update(deltaTime) {
    this.elapsed += deltaTime / 1000;
    this.updateClouds(deltaTime);

    this.projectiles.forEach((projectile) => projectile.update(deltaTime));
    this.projectiles = this.projectiles.filter((projectile) => !projectile.markedForDeletion);

    this.particles.forEach((particle) => particle.update(deltaTime));
    this.particles = this.particles.filter((particle) => !particle.markedForDeletion);

    if (this.damageCooldown > 0) {
      this.damageCooldown = Math.max(0, this.damageCooldown - deltaTime);
    }

    if (this.flashTimer > 0) {
      this.flashTimer = Math.max(0, this.flashTimer - deltaTime);
    }

    if (this.gameState !== 'playing') {
      this.player.update(deltaTime, false);
      return;
    }

    this.spawnTimer += deltaTime;
    const dynamicInterval = Math.max(600, this.spawnInterval - this.score * 0.8);
    if (this.spawnTimer >= dynamicInterval) {
      this.addEnemy();
      this.spawnTimer = 0;
    }

    this.enemies.forEach((enemy) => enemy.update(deltaTime));

    this.player.update(deltaTime, true);

    this.projectiles.forEach((projectile) => {
      if (projectile.fromEnemy) {
        if (!projectile.markedForDeletion && projectile.collides(this.player)) {
          projectile.markedForDeletion = true;
          this.takeDamage(projectile.damage);
        }
      } else {
        this.enemies.forEach((enemy) => {
          if (!enemy.markedForDeletion && projectile.collides(enemy)) {
            projectile.markedForDeletion = true;
            enemy.takeDamage(projectile.damage);
          }
        });
      }
    });

    this.enemies.forEach((enemy) => {
      if (!enemy.markedForDeletion && this.checkCollision(enemy, this.player)) {
        enemy.markedForDeletion = true;
        this.takeDamage(1);
      }
    });

    this.enemies = this.enemies.filter((enemy) => !enemy.markedForDeletion);
    this.projectiles = this.projectiles.filter((projectile) => !projectile.markedForDeletion);
  }

  drawBackground(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0b1d2d');
    gradient.addColorStop(0.5, '#142b3e');
    gradient.addColorStop(1, '#0d1720');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = '#102b44';
    ctx.beginPath();
    ctx.moveTo(0, this.groundY - 120);
    ctx.lineTo(160, this.groundY - 200);
    ctx.lineTo(340, this.groundY - 120);
    ctx.lineTo(520, this.groundY - 210);
    ctx.lineTo(720, this.groundY - 130);
    ctx.lineTo(this.width, this.groundY - 210);
    ctx.lineTo(this.width, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#16324f';
    ctx.beginPath();
    ctx.moveTo(0, this.groundY - 70);
    ctx.lineTo(140, this.groundY - 120);
    ctx.lineTo(340, this.groundY - 60);
    ctx.lineTo(520, this.groundY - 140);
    ctx.lineTo(720, this.groundY - 80);
    ctx.lineTo(this.width, this.groundY - 130);
    ctx.lineTo(this.width, this.groundY - 30);
    ctx.lineTo(0, this.groundY - 30);
    ctx.closePath();
    ctx.fill();
  }

  drawClouds(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.clouds.forEach((cloud) => {
      ctx.save();
      ctx.translate(cloud.x, cloud.y);
      ctx.scale(cloud.scale, cloud.scale);
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.arc(26, -8, 24, 0, Math.PI * 2);
      ctx.arc(52, 2, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  }

  drawGround(ctx) {
    ctx.fillStyle = '#1d3a2f';
    ctx.fillRect(0, this.groundY, this.width, this.groundHeight);

    ctx.fillStyle = '#274d3d';
    for (let i = 0; i < this.width; i += 42) {
      const height = 12 + Math.sin((i / 50 + this.elapsed) * 2) * 6;
      ctx.fillRect(i, this.groundY - height, 24, height);
    }

    ctx.fillStyle = '#6c757d';
    for (let i = 0; i < this.width; i += 120) {
      ctx.beginPath();
      ctx.ellipse(i + 60, this.groundY + 36, 34, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawHud(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = 'rgba(6, 12, 20, 0.65)';
    ctx.fillRect(16, 16, 220, 90);
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#f1faee';
    ctx.font = '22px "Noto Sans TC", sans-serif';
    ctx.fillText(`得分 ${this.score}`, 32, 52);
    ctx.fillStyle = '#a8dadc';
    ctx.font = '16px "Noto Sans TC", sans-serif';
    ctx.fillText(`最佳 ${this.bestScore}`, 32, 78);

    for (let i = 0; i < this.maxLives; i += 1) {
      const x = 150 + i * 28;
      const y = 64;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1.1, 1.1);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-10, -10, -26, 6, 0, 22);
      ctx.bezierCurveTo(26, 6, 10, -10, 0, 0);
      ctx.fillStyle = i < this.lives ? '#ff5d73' : 'rgba(255, 93, 115, 0.25)';
      ctx.fill();
      ctx.restore();
    }

    if (this.gameState === 'playing') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '14px "Noto Sans TC", sans-serif';
      ctx.fillText('F 或 J 射擊 · 空白鍵跳躍', 24, this.height - 24);
    }

    ctx.restore();
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackground(ctx);
    this.drawClouds(ctx);
    this.drawGround(ctx);

    this.enemies.forEach((enemy) => enemy.draw(ctx));
    this.player.draw(ctx);
    this.projectiles.forEach((projectile) => projectile.draw(ctx));
    this.particles.forEach((particle) => particle.draw(ctx));

    this.drawHud(ctx);

    if (this.flashTimer > 0) {
      ctx.save();
      const alpha = Math.max(0, this.flashTimer / 260);
      ctx.fillStyle = `rgba(255, 82, 82, ${alpha * 0.35})`;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }
  }
}

const canvas = document.getElementById('gameCanvas');
const startOverlay = document.getElementById('startOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const finalScore = document.getElementById('finalScore');
const retryButton = document.getElementById('retryButton');

const game = new Game(canvas, {
  startOverlay,
  gameOverOverlay,
  finalScore
});

function animate(timestamp) {
  if (!game.lastTime) {
    game.lastTime = timestamp;
  }
  const deltaTime = timestamp - game.lastTime;
  game.lastTime = timestamp;
  game.update(deltaTime);
  game.draw();
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

window.addEventListener('keydown', (event) => {
  if (event.code === 'Enter') {
    if (game.gameState === 'start') {
      game.start();
    } else if (game.gameState === 'gameover') {
      game.start();
    }
  }
});

retryButton.addEventListener('click', () => {
  game.start();
});
