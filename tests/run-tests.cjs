const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createContext2DStub() {
  const target = {};
  return new Proxy(target, {
    get(obj, prop) {
      if (!(prop in obj)) {
        obj[prop] = () => {};
      }
      return obj[prop];
    },
    set(obj, prop, value) {
      obj[prop] = value;
      return true;
    }
  });
}

function createCanvasStub() {
  const context2D = createContext2DStub();
  return {
    width: 960,
    height: 540,
    getContext: () => context2D,
    addEventListener: () => {}
  };
}

function createClassList(initial = []) {
  const set = new Set(initial);
  return {
    add(value) {
      set.add(value);
    },
    remove(value) {
      set.delete(value);
    },
    contains(value) {
      return set.has(value);
    }
  };
}

function createOverlay({ hidden = false } = {}) {
  return {
    classList: createClassList(hidden ? ['hidden'] : []),
    style: {},
    textContent: '',
    addEventListener: () => {}
  };
}

function createButtonStub() {
  return {
    listeners: {},
    addEventListener(type, handler) {
      if (!this.listeners[type]) {
        this.listeners[type] = [];
      }
      this.listeners[type].push(handler);
    },
    dispatch(type, event = {}) {
      (this.listeners[type] || []).forEach((handler) => handler(event));
    }
  };
}

function createOverlayGroup() {
  return {
    startOverlay: createOverlay(),
    gameOverOverlay: createOverlay({ hidden: true }),
    finalScore: { textContent: '' },
    retryButton: createButtonStub()
  };
}

function initializeContext() {
  const canvas = createCanvasStub();
  const overlays = createOverlayGroup();
  const elementMap = {
    gameCanvas: canvas,
    startOverlay: overlays.startOverlay,
    gameOverOverlay: overlays.gameOverOverlay,
    finalScore: overlays.finalScore,
    retryButton: overlays.retryButton
  };

  const sandbox = {
    console,
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval,
    Math
  };

  sandbox.window = {
    listeners: {},
    addEventListener(type, handler) {
      if (!this.listeners[type]) {
        this.listeners[type] = [];
      }
      this.listeners[type].push(handler);
    },
    removeEventListener(type, handler) {
      if (!this.listeners[type]) return;
      this.listeners[type] = this.listeners[type].filter((fn) => fn !== handler);
    }
  };

  sandbox.document = {
    getElementById(id) {
      if (!(id in elementMap)) {
        throw new Error(`Unknown element requested: ${id}`);
      }
      return elementMap[id];
    }
  };

  sandbox.window.document = sandbox.document;
  sandbox.performance = { now: () => 0 };
  sandbox.requestAnimationFrame = (cb) => {
    sandbox.lastAnimationFrame = cb;
    return 1;
  };
  sandbox.cancelAnimationFrame = () => {};

  const context = vm.createContext(sandbox);
  const scriptPath = path.join(__dirname, '..', 'game.js');
  const scriptContent = fs.readFileSync(scriptPath, 'utf8');
  vm.runInContext(scriptContent, context);
  vm.runInContext(
    'this.__gameExports = { InputHandler, Projectile, Particle, Player, Enemy, Game };',
    context
  );

  return { context, exports: context.__gameExports };
}

const initResult = initializeContext();
const { context } = initResult;

const { Game, Enemy } = initResult.exports;

if (!Game || !Enemy) {
  throw new Error('Failed to load game classes from game.js');
}

function createGameInstance() {
  const canvas = createCanvasStub();
  const overlays = createOverlayGroup();
  const game = new Game(canvas, overlays);
  return { game, overlays, canvas };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const tests = [
  {
    name: 'Game start should hide overlays and enter playing state',
    run() {
      const { game, overlays } = createGameInstance();
      overlays.startOverlay.classList.remove('hidden');
      overlays.gameOverOverlay.classList.add('hidden');
      game.start();
      assert(game.gameState === 'playing', 'Game state should be playing after start');
      assert(overlays.startOverlay.classList.contains('hidden'), 'Start overlay should be hidden');
      assert(overlays.gameOverOverlay.classList.contains('hidden'), 'Game over overlay should be hidden');
    }
  },
  {
    name: 'Taking lethal damage should trigger game over overlay',
    run() {
      const { game, overlays } = createGameInstance();
      game.start();
      game.score = 420;
      game.lives = 1;
      game.takeDamage(1);
      assert(game.lives === 0, 'Lives should drop to zero');
      assert(game.gameState === 'gameover', 'Game state should switch to gameover');
      assert(!overlays.gameOverOverlay.classList.contains('hidden'), 'Game over overlay should be visible');
      assert(overlays.finalScore.textContent.includes('得分：420'), 'Final score text should include latest score');
    }
  },
  {
    name: 'spawnProjectile should append a projectile and move it over time',
    run() {
      const { game } = createGameInstance();
      const initialCount = game.projectiles.length;
      const projectile = game.spawnProjectile(100, 100, 1);
      assert(game.projectiles.length === initialCount + 1, 'Projectile array length should increase');
      projectile.update(100);
      assert(projectile.x > 100, 'Projectile should move forward when updated');
    }
  },
  {
    name: 'Player shoot should add projectile with correct direction and cooldown',
    run() {
      const { game } = createGameInstance();
      const player = game.player;
      player.shootCooldown = 0;
      player.facing = -1;
      const before = game.projectiles.length;
      player.shoot();
      assert(game.projectiles.length === before + 1, 'Projectile should be added when shooting');
      assert(player.shootCooldown === player.shootInterval, 'Shoot cooldown should reset after firing');
      const lastProjectile = game.projectiles[game.projectiles.length - 1];
      assert(lastProjectile.direction === -1, 'Projectile direction should match player facing');
    }
  },
  {
    name: 'Enemy takeDamage should award score when defeated',
    run() {
      const { game } = createGameInstance();
      const enemy = new Enemy(game, 'grunt');
      const startingScore = game.score;
      enemy.takeDamage(2);
      assert(enemy.markedForDeletion, 'Enemy should be marked for deletion after lethal damage');
      assert(game.score > startingScore, 'Score should increase after defeating an enemy');
    }
  }
];

let failed = 0;

for (const test of tests) {
  try {
    test.run();
    console.log(`✅ ${test.name}`);
  } catch (error) {
    failed += 1;
    console.error(`❌ ${test.name}`);
    console.error(error.message);
  }
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('\nAll tests passed.');
}
