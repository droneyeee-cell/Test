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
      'KeyK',
      'KeyG',
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
    this.vx = options.vx ?? null;
    this.vy = options.vy ?? 0;
    this.damage = options.damage ?? 1;
    this.pierce = options.pierce ?? 0;
    this.life = options.life ?? 0;
    this.elapsed = 0;
    this.hitTargets = new Set();
    this.markedForDeletion = false;
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    if (this.vx !== null) {
      this.x += this.vx * dt;
    } else {
      this.x += this.speed * dt * this.direction;
    }
    if (this.gravity !== 0) {
      this.vy += this.gravity * dt;
    }
    this.y += this.vy * dt;

    if (this.life > 0) {
      this.elapsed += deltaTime;
      if (this.elapsed >= this.life) {
        this.markedForDeletion = true;
      }
    }

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

class Grenade {
  constructor(game, x, y, direction) {
    this.game = game;
    this.size = 18;
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.vx = direction * (320 + Math.random() * 80);
    this.vy = -560;
    this.gravity = 1500;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() * 2 - 1) * 8;
    this.fuse = 680;
    this.bounceDamping = 0.42;
    this.markedForDeletion = false;
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    this.fuse -= deltaTime;
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.rotationSpeed * dt;

    if (this.y + this.size >= this.game.groundY - 4) {
      this.y = this.game.groundY - 4 - this.size;
      if (Math.abs(this.vy) > 120) {
        this.vy *= -this.bounceDamping;
        this.vx *= 0.7;
      } else {
        this.vy = 0;
      }
    }

    if (this.fuse <= 0) {
      this.explode();
    }
  }

  explode() {
    if (this.markedForDeletion) return;
    this.game.spawnExplosion(this.x + this.size / 2, this.y + this.size / 2, {
      radius: 96,
      damage: 4
    });
    this.markedForDeletion = true;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
    ctx.rotate(this.rotation);
    ctx.fillStyle = '#495057';
    ctx.beginPath();
    ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f3722c';
    ctx.fillRect(-3, -this.size / 2 - 6, 6, 12);
    ctx.restore();
  }
}

class Explosion {
  constructor(game, x, y, options = {}) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.elapsed = 0;
    this.duration = options.duration ?? 520;
    this.maxRadius = options.maxRadius ?? 120;
    this.radius = options.radius ?? 90;
    this.damage = options.damage ?? 4;
    this.damageDelay = options.damageDelay ?? 80;
    this.damaged = false;
    this.markedForDeletion = false;
  }

  update(deltaTime) {
    this.elapsed += deltaTime;
    if (!this.damaged && this.elapsed >= this.damageDelay) {
      this.damaged = true;
      this.game.damageEnemiesInRadius(this.x, this.y, this.radius, this.damage);
    }
    if (this.elapsed >= this.duration) {
      this.markedForDeletion = true;
    }
  }

  draw(ctx) {
    const progress = Math.min(this.elapsed / this.duration, 1);
    const radius = this.maxRadius * Math.sin(progress * Math.PI);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gradient = ctx.createRadialGradient(this.x, this.y, radius * 0.3, this.x, this.y, radius);
    gradient.addColorStop(0, 'rgba(255, 248, 174, 0.9)');
    gradient.addColorStop(0.5, 'rgba(255, 150, 54, 0.6)');
    gradient.addColorStop(1, 'rgba(235, 69, 90, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(radius, 10), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

const POWER_UP_CONFIG = {
  heavy: {
    label: 'H',
    color: '#f4a261',
    accent: '#ffe8a3',
    duration: 9000
  },
  spread: {
    label: 'S',
    color: '#4895ef',
    accent: '#a9d6ff',
    duration: 9000
  },
  laser: {
    label: 'L',
    color: '#f72585',
    accent: '#ff9f9f',
    duration: 7200
  },
  grenade: {
    label: 'G',
    color: '#52b788',
    accent: '#95d5b2',
    grenades: 2,
    score: 50
  },
  life: {
    label: '+1',
    color: '#ff6b6b',
    accent: '#ffe5ec',
    score: 200
  }
};

class PowerUp {
  constructor(game, x, y, type = 'heavy') {
    this.game = game;
    this.type = type in POWER_UP_CONFIG ? type : 'heavy';
    this.config = POWER_UP_CONFIG[this.type];
    this.width = 34;
    this.height = 28;
    this.x = x;
    this.y = y;
    this.vy = -220;
    this.gravity = 900;
    this.timer = 0;
    this.markedForDeletion = false;
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    this.timer += deltaTime;
    this.vy += this.gravity * dt;
    this.y += this.vy * dt;
    if (this.y + this.height >= this.game.groundY - 8) {
      this.y = this.game.groundY - 8 - this.height;
      if (Math.abs(this.vy) > 80) {
        this.vy *= -0.36;
      } else {
        this.vy = 0;
      }
    }
  }

  draw(ctx) {
    ctx.save();
    const bob = Math.sin((this.timer / 1000) * Math.PI * 2) * 4;
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2 + bob);
    ctx.fillStyle = this.config.color;
    const radius = 8;
    ctx.beginPath();
    ctx.moveTo(-this.width / 2 + radius, -this.height / 2);
    ctx.lineTo(this.width / 2 - radius, -this.height / 2);
    ctx.quadraticCurveTo(this.width / 2, -this.height / 2, this.width / 2, -this.height / 2 + radius);
    ctx.lineTo(this.width / 2, this.height / 2 - radius);
    ctx.quadraticCurveTo(this.width / 2, this.height / 2, this.width / 2 - radius, this.height / 2);
    ctx.lineTo(-this.width / 2 + radius, this.height / 2);
    ctx.quadraticCurveTo(-this.width / 2, this.height / 2, -this.width / 2, this.height / 2 - radius);
    ctx.lineTo(-this.width / 2, -this.height / 2 + radius);
    ctx.quadraticCurveTo(-this.width / 2, -this.height / 2, -this.width / 2 + radius, -this.height / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = this.config.accent;
    ctx.font = 'bold 16px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.config.label, 0, 1);
    ctx.restore();
  }
}

class Hostage {
  constructor(game, x, y) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.width = 44;
    this.height = 60;
    this.rescued = false;
    this.speed = 0;
    this.bobTimer = 0;
    this.direction = -1;
    this.markedForDeletion = false;
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    this.bobTimer += deltaTime;
    if (this.rescued) {
      this.x += this.direction * (180 + Math.sin(this.bobTimer / 160) * 20) * dt;
      if (this.x + this.width < -50) {
        this.markedForDeletion = true;
      }
    }
  }

  rescue() {
    if (this.rescued) return;
    this.rescued = true;
    this.speed = 200;
    this.game.addParticles(this.x + this.width / 2, this.y + this.height / 2, 16, '#ffd166');
  }

  draw(ctx) {
    ctx.save();
    const bob = Math.sin((this.bobTimer / 1000) * Math.PI * 2) * (this.rescued ? 6 : 4);
    ctx.translate(this.x, this.y + bob);
    ctx.fillStyle = '#f4a261';
    ctx.fillRect(10, 0, 24, 24);
    ctx.fillStyle = '#ffb703';
    ctx.fillRect(12, 24, 20, this.height - 32);
    ctx.fillStyle = '#e76f51';
    ctx.fillRect(0, this.height - 18, this.width, 18);
    ctx.fillStyle = '#2a9d8f';
    ctx.fillRect(4, 22, 12, this.height - 32);
    if (!this.rescued) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 3;
      for (let i = -2; i <= this.width + 2; i += 10) {
        ctx.beginPath();
        ctx.moveTo(i, -6);
        ctx.lineTo(i, this.height + 6);
        ctx.stroke();
      }
    }
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
    this.defaultShootInterval = 180;
    this.shootInterval = this.defaultShootInterval;
    this.shootCooldown = 0;
    this.idleTimer = 0;
    this.hitFlash = 0;
    this.weaponType = 'pistol';
    this.weaponTimer = 0;
    this.weaponDuration = 0;
    this.weaponLabel = '手槍';
    this.grenades = 0;
    this.maxGrenades = 8;
    this.grenadeCooldown = 0;
    this.grenadeDelay = 420;
    this.grenadeHold = false;
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
    if (typeof this.game.maxGrenades === 'number') {
      this.maxGrenades = this.game.maxGrenades;
    }
    this.weaponType = 'pistol';
    this.weaponLabel = '手槍';
    this.shootInterval = this.defaultShootInterval;
    this.weaponTimer = 0;
    this.weaponDuration = 0;
    this.grenades = Math.min(this.maxGrenades, this.game.startingGrenades ?? 4);
    this.grenadeCooldown = 0;
    this.grenadeHold = false;
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

    if (this.weaponTimer > 0) {
      this.weaponTimer = Math.max(0, this.weaponTimer - deltaTime);
      if (this.weaponTimer === 0 && this.weaponType !== 'pistol') {
        this.setWeapon('pistol', 0);
      }
    }

    if (this.grenadeCooldown > 0) {
      this.grenadeCooldown = Math.max(0, this.grenadeCooldown - deltaTime);
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

    const wantsGrenade = input.isDown('KeyK') || input.isDown('KeyG');
    if (wantsGrenade) {
      if (!this.grenadeHold && this.grenadeCooldown === 0) {
        this.throwGrenade();
      }
      this.grenadeHold = true;
    } else {
      this.grenadeHold = false;
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
    const facing = this.facing;
    const muzzleX = projectileX;
    const muzzleY = projectileY;

    const spawnDefault = () => {
      this.game.spawnProjectile(muzzleX, muzzleY, facing, {
        width: 20,
        height: 6,
        speed: 760,
        color: '#ffe066',
        shadow: '#fff3b0'
      });
      this.game.addParticles(muzzleX + (facing === 1 ? 0 : 6), muzzleY + 2, 4, '#ffef9f');
    };

    if (this.weaponType === 'heavy') {
      const offsets = [-6, 4];
      offsets.forEach((offset) => {
        this.game.spawnProjectile(muzzleX, muzzleY + offset, facing, {
          width: 20,
          height: 6,
          speed: 900,
          color: '#ffe066',
          shadow: '#ffd166'
        });
      });
      this.game.addParticles(muzzleX, muzzleY, 6, '#ffdd99');
    } else if (this.weaponType === 'spread') {
      const baseSpeed = 760;
      const angles = [-0.25, 0, 0.25];
      angles.forEach((angle) => {
        const vx = Math.cos(angle) * baseSpeed * facing;
        const vy = Math.sin(angle) * baseSpeed;
        this.game.spawnProjectile(muzzleX, muzzleY, facing, {
          width: 18,
          height: 6,
          speed: Math.abs(vx),
          vx,
          vy,
          color: '#ffe8a3',
          shadow: '#ffd166'
        });
      });
      this.game.addParticles(muzzleX, muzzleY, 8, '#ffe8a3');
    } else if (this.weaponType === 'laser') {
      this.game.spawnProjectile(muzzleX, muzzleY - 4, facing, {
        width: 26,
        height: 8,
        speed: 1200,
        color: '#b5179e',
        shadow: '#f72585',
        damage: 3,
        pierce: 2,
        life: 520
      });
      this.game.addParticles(muzzleX, muzzleY, 10, '#f72585');
    } else {
      spawnDefault();
    }
    this.shootCooldown = this.shootInterval;
  }

  setWeapon(type, duration = 0) {
    const valid = new Set(['pistol', 'heavy', 'spread', 'laser']);
    const weaponType = valid.has(type) ? type : 'pistol';
    const labels = {
      pistol: '手槍',
      heavy: '重機槍',
      spread: '散彈槍',
      laser: '雷射砲'
    };
    this.weaponType = weaponType;
    this.weaponLabel = labels[weaponType] ?? '手槍';
    switch (weaponType) {
      case 'heavy':
        this.shootInterval = 90;
        break;
      case 'spread':
        this.shootInterval = 240;
        break;
      case 'laser':
        this.shootInterval = 320;
        break;
      default:
        this.shootInterval = this.defaultShootInterval;
        break;
    }
    this.weaponDuration = duration;
    this.weaponTimer = weaponType === 'pistol' ? 0 : duration;
    if (this.shootCooldown > this.shootInterval) {
      this.shootCooldown = this.shootInterval;
    }
  }

  addGrenades(amount) {
    this.grenades = Math.max(0, Math.min(this.maxGrenades, this.grenades + amount));
  }

  throwGrenade() {
    if (this.grenades <= 0) return false;
    const startX = this.x + (this.facing === 1 ? this.width - 8 : -12);
    const startY = this.y + this.height * 0.4;
    this.game.spawnGrenade(startX, startY, this.facing);
    this.game.addParticles(startX, startY, 6, '#ff9f1c');
    this.addGrenades(-1);
    this.grenadeCooldown = this.grenadeDelay;
    return true;
  }

  collectPowerUp(powerUp) {
    if (!powerUp || powerUp.markedForDeletion) return;
    const { type, config } = powerUp;
    if (type === 'grenade') {
      this.addGrenades(config.grenades ?? 2);
    } else if (type === 'life') {
      this.game.gainLife(1);
    } else {
      this.setWeapon(type, config.duration ?? 0);
    }
    if (config.score) {
      this.game.addScore(config.score);
    }
    this.game.addParticles(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2, 12, '#fff3b0');
    powerUp.markedForDeletion = true;
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
    this.id = this.game.nextEnemyId++;
    this.shootVariance = 500;
    this.x = this.game.width + Math.random() * 80;
    this.elapsed = 0;
    if (type === 'heavy') {
      this.width = 68;
      this.height = 78;
      this.speed = 90;
      this.health = 4;
      this.shootDelay = 1700;
      this.color = '#bb3e03';
      this.weaponColor = '#f2cc8f';
      this.scoreValue = 250;
      this.y = this.game.groundY - this.height;
    } else if (type === 'chopper') {
      this.width = 96;
      this.height = 48;
      this.speed = 160;
      this.health = 6;
      this.shootDelay = 1500;
      this.shootVariance = 700;
      this.color = '#1d3557';
      this.weaponColor = '#a8dadc';
      this.scoreValue = 320;
      this.baseY = this.game.groundY - this.height - (120 + Math.random() * 80);
      this.amplitude = 22 + Math.random() * 18;
      this.bobSpeed = 1.4 + Math.random() * 0.7;
      this.bobPhase = Math.random() * Math.PI * 2;
      this.y = this.baseY;
    } else {
      this.width = 54;
      this.height = 62;
      this.speed = 140;
      this.health = 2;
      this.shootDelay = 1400;
      this.color = '#e36414';
      this.weaponColor = '#e9c46a';
      this.scoreValue = 120;
      this.y = this.game.groundY - this.height;
    }
    this.shootTimer = 800 + Math.random() * 1200;
    this.hitFlash = 0;
    this.markedForDeletion = false;
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    this.elapsed += dt;
    this.x -= this.speed * dt;
    this.shootTimer -= deltaTime;

    if (this.hitFlash > 0) {
      this.hitFlash = Math.max(0, this.hitFlash - deltaTime);
    }

    if (this.type === 'chopper') {
      this.y = this.baseY + Math.sin(this.elapsed * this.bobSpeed + this.bobPhase) * this.amplitude;
      if (this.x + this.width < -120) {
        this.markedForDeletion = true;
        if (this.game.gameState === 'playing') {
          this.game.takeDamage(1);
        }
      }
    } else if (this.x + this.width < -80) {
      this.markedForDeletion = true;
      if (this.game.gameState === 'playing') {
        this.game.takeDamage(1);
      }
    }

    if (this.game.gameState === 'playing' && this.shootTimer <= 0 && this.x < this.game.width - 100) {
      this.shoot();
      this.shootTimer = this.shootDelay + Math.random() * this.shootVariance;
    }
  }

  shoot() {
    if (this.type === 'chopper') {
      const projectile = this.game.spawnProjectile(this.x + this.width / 2 - 8, this.y + this.height - 6, -1, {
        fromEnemy: true,
        width: 14,
        height: 14,
        speed: 80,
        color: '#ffba08',
        shadow: '#ffd166',
        damage: 2
      });
      projectile.vx = -160;
      projectile.vy = 60;
      projectile.gravity = 680;
    } else {
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
  }

  takeDamage(amount) {
    if (this.markedForDeletion) return;
    this.health -= amount;
    this.hitFlash = 200;
    if (this.health <= 0) {
      this.markedForDeletion = true;
      this.game.addScore(this.scoreValue);
      this.game.addParticles(this.x + this.width / 2, this.y + this.height / 2, this.type === 'heavy' ? 20 : 12, '#ffb703');
      this.game.trySpawnDrop(this.x + this.width / 2, this.y + this.height / 2, this.type);
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

    if (this.type === 'chopper') {
      ctx.fillStyle = '#a8dadc';
      ctx.fillRect(this.width / 2 - 4, -20, 8, 24);
      ctx.fillRect(-20, -20, this.width + 40, 6);
      ctx.fillStyle = this.color;
      ctx.fillRect(6, 14, this.width - 12, this.height - 12);
      ctx.fillStyle = '#457b9d';
      ctx.fillRect(0, 22, this.width, this.height - 20);
      ctx.fillStyle = '#ffe8a3';
      ctx.fillRect(14, 20, 32, 18);
      ctx.fillStyle = '#1b4332';
      ctx.fillRect(this.width - 20, 26, 14, 16);
      ctx.fillStyle = '#d9d9d9';
      ctx.fillRect(10, this.height - 10, this.width - 20, 10);
    } else {
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
    }

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
    this.startingGrenades = 4;
    this.maxGrenades = 8;
    this.maxLives = 5;
    this.nextEnemyId = 1;
    this.player = new Player(this);
    this.projectiles = [];
    this.enemies = [];
    this.particles = [];
    this.grenades = [];
    this.explosions = [];
    this.powerUps = [];
    this.hostages = [];
    this.clouds = this.createClouds();
    this.score = 0;
    this.bestScore = 0;
    this.startingLives = 3;
    this.lives = this.startingLives;
    this.spawnTimer = 0;
    this.spawnInterval = 1600;
    this.hostageTimer = 0;
    this.hostageInterval = 9000;
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
    this.grenades = [];
    this.explosions = [];
    this.powerUps = [];
    this.hostages = [];
    this.clouds = this.createClouds();
    this.score = 0;
    this.lives = Math.min(this.maxLives, this.startingLives);
    this.spawnTimer = 0;
    this.spawnInterval = 1500;
    this.hostageTimer = 0;
    this.hostageInterval = 8000 + Math.random() * 2000;
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

  spawnGrenade(x, y, direction) {
    if (this.grenades.length > 12) {
      this.grenades.shift();
    }
    const grenade = new Grenade(this, x, y, direction);
    this.grenades.push(grenade);
    return grenade;
  }

  spawnExplosion(x, y, options = {}) {
    const explosion = new Explosion(this, x, y, options);
    this.explosions.push(explosion);
    this.addParticles(x, y, 18, '#ffb703');
    return explosion;
  }

  damageEnemiesInRadius(x, y, radius, damage) {
    this.enemies.forEach((enemy) => {
      if (enemy.markedForDeletion) return;
      const cx = enemy.x + enemy.width / 2;
      const cy = enemy.y + enemy.height / 2;
      const distance = Math.hypot(cx - x, cy - y);
      if (distance <= radius) {
        enemy.takeDamage(damage);
      }
    });
  }

  addParticles(x, y, count = 8, color = '#ffd166') {
    for (let i = 0; i < count; i += 1) {
      if (this.particles.length > 220) {
        this.particles.shift();
      }
      this.particles.push(new Particle(this, x, y, color));
    }
  }

  trySpawnDrop(x, y, enemyType) {
    const dropRoll = Math.random();
    const baseChance = enemyType === 'heavy' ? 0.35 : enemyType === 'chopper' ? 0.4 : 0.22;
    if (dropRoll < baseChance) {
      const normalized = dropRoll / baseChance;
      let type = 'heavy';
      if (normalized < 0.2) {
        type = 'grenade';
      } else if (normalized < 0.45) {
        type = 'spread';
      } else if (normalized < 0.7) {
        type = 'heavy';
      } else if (normalized < 0.88) {
        type = 'laser';
      } else {
        type = 'life';
      }
      const spawnX = x - 17;
      const spawnY = Math.max(40, y - 36);
      this.powerUps.push(new PowerUp(this, spawnX, spawnY, type));
    } else if (dropRoll > 0.82 && this.hostages.length < 2) {
      this.spawnHostage(x + (Math.random() * 120 - 60));
    }
  }

  spawnHostage(x = this.width + 80) {
    let spawnX = x;
    if (spawnX < this.width * 0.6) {
      spawnX = this.width + 80;
    }
    const hostage = new Hostage(this, spawnX, this.groundY - 60);
    hostage.y = this.groundY - hostage.height;
    this.hostages.push(hostage);
    return hostage;
  }

  rescueHostage(hostage) {
    if (!hostage || hostage.rescued) return;
    hostage.rescue();
    this.addScore(240);
    this.player.addGrenades(2);
    if (this.lives < this.maxLives) {
      this.gainLife(1);
    } else {
      this.addScore(80);
    }
  }

  addEnemy() {
    const heavyChance = Math.min(0.25, 0.1 + this.score / 2000);
    const chopperChance = Math.min(0.18, 0.05 + this.score / 3500);
    const roll = Math.random();
    let type = 'grunt';
    if (roll < chopperChance) {
      type = 'chopper';
    } else if (roll < chopperChance + heavyChance) {
      type = 'heavy';
    }
    this.enemies.push(new Enemy(this, type));
  }

  addScore(points) {
    this.score += points;
    this.bestScore = Math.max(this.bestScore, this.score);
  }

  gainLife(amount = 1) {
    const previous = this.lives;
    this.lives = Math.min(this.maxLives, this.lives + amount);
    if (this.lives > previous) {
      this.addParticles(this.player.x + this.player.width / 2, this.player.y + 10, 14, '#ffcad4');
    }
  }

  takeDamage(amount = 1) {
    if (this.damageCooldown > 0) return;
    this.lives = Math.max(0, this.lives - amount);
    this.damageCooldown = 900;
    this.flashTimer = 260;
    this.player.takeHit();
    this.player.setWeapon('pistol', 0);
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

    this.grenades.forEach((grenade) => grenade.update(deltaTime));
    this.grenades = this.grenades.filter((grenade) => !grenade.markedForDeletion);

    this.explosions.forEach((explosion) => explosion.update(deltaTime));
    this.explosions = this.explosions.filter((explosion) => !explosion.markedForDeletion);

    this.powerUps.forEach((powerUp) => powerUp.update(deltaTime));
    this.powerUps = this.powerUps.filter((powerUp) => !powerUp.markedForDeletion);

    this.hostages.forEach((hostage) => hostage.update(deltaTime));
    this.hostages = this.hostages.filter((hostage) => !hostage.markedForDeletion);

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

    this.hostageTimer += deltaTime;
    if (this.hostageTimer >= this.hostageInterval) {
      this.spawnHostage();
      this.hostageTimer = 0;
      this.hostageInterval = 7000 + Math.random() * 4000;
    }

    this.enemies.forEach((enemy) => enemy.update(deltaTime));

    this.player.update(deltaTime, true);

    this.powerUps.forEach((powerUp) => {
      if (!powerUp.markedForDeletion && this.checkCollision({
        x: powerUp.x,
        y: powerUp.y,
        width: powerUp.width,
        height: powerUp.height
      }, this.player)) {
        this.player.collectPowerUp(powerUp);
      }
    });

    this.hostages.forEach((hostage) => {
      if (!hostage.rescued && this.checkCollision({
        x: hostage.x,
        y: hostage.y,
        width: hostage.width,
        height: hostage.height
      }, this.player)) {
        this.rescueHostage(hostage);
      }
    });

    this.projectiles.forEach((projectile) => {
      if (projectile.fromEnemy) {
        if (!projectile.markedForDeletion && projectile.collides(this.player)) {
          projectile.markedForDeletion = true;
          this.takeDamage(projectile.damage);
        }
      } else {
        this.enemies.forEach((enemy) => {
          if (enemy.markedForDeletion || projectile.markedForDeletion) return;
          if (projectile.hitTargets.has(enemy.id)) return;
          if (projectile.collides(enemy)) {
            projectile.hitTargets.add(enemy.id);
            enemy.takeDamage(projectile.damage);
            if (projectile.pierce > 0) {
              projectile.pierce -= 1;
            } else {
              projectile.markedForDeletion = true;
            }
          }
        });
      }
    });

    this.grenades.forEach((grenade) => {
      if (grenade.markedForDeletion) return;
      this.enemies.forEach((enemy) => {
        if (enemy.markedForDeletion || grenade.markedForDeletion) return;
        const hitbox = { x: grenade.x, y: grenade.y, width: grenade.size, height: grenade.size };
        if (this.checkCollision(hitbox, enemy)) {
          grenade.explode();
        }
      });
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
    ctx.globalAlpha = 0.88;
    const panelWidth = 280;
    const panelHeight = 140;
    ctx.fillStyle = 'rgba(6, 12, 20, 0.7)';
    ctx.fillRect(16, 16, panelWidth, panelHeight);
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#f1faee';
    ctx.font = '22px "Noto Sans TC", sans-serif';
    ctx.fillText(`得分 ${this.score}`, 32, 48);
    ctx.fillStyle = '#a8dadc';
    ctx.font = '16px "Noto Sans TC", sans-serif';
    ctx.fillText(`最佳 ${this.bestScore}`, 32, 72);

    ctx.fillStyle = '#ffe066';
    ctx.fillText(`武器 ${this.player.weaponLabel}`, 32, 98);
    ctx.fillStyle = '#ffb4a2';
    ctx.fillText(`手榴彈 x${this.player.grenades}`, 32, 122);

    if (this.player.weaponType !== 'pistol' && this.player.weaponDuration > 0) {
      const ratio = Math.max(0, Math.min(1, this.player.weaponTimer / this.player.weaponDuration));
      ctx.fillStyle = 'rgba(255, 224, 102, 0.28)';
      ctx.fillRect(32, 130, 180, 6);
      ctx.fillStyle = '#ffe066';
      ctx.fillRect(32, 130, 180 * ratio, 6);
    }

    for (let i = 0; i < this.maxLives; i += 1) {
      const x = 180 + i * 26;
      const y = 56;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(0.95, 0.95);
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
      ctx.fillText('F/J 射擊 · K/G 手榴彈 · 救援戰俘換獎勵', 24, this.height - 24);
    }

    ctx.restore();
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackground(ctx);
    this.drawClouds(ctx);
    this.drawGround(ctx);

    this.powerUps.forEach((powerUp) => powerUp.draw(ctx));
    this.hostages.forEach((hostage) => hostage.draw(ctx));
    this.enemies.forEach((enemy) => enemy.draw(ctx));
    this.player.draw(ctx);
    this.grenades.forEach((grenade) => grenade.draw(ctx));
    this.projectiles.forEach((projectile) => projectile.draw(ctx));
    this.explosions.forEach((explosion) => explosion.draw(ctx));
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
