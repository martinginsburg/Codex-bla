class UBoat {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.angle = 0; // radians
    this.health = 100;
    this.maxHealth = 100;
    this.torpedoes = 10;
    this.maxTorpedoes = 10;
    this.speed = 2;
    this.underwater = false;
    this.diveTimer = 0;
    this.airTime = 8; // seconds underwater
  }

  moveForward() {
    const s = this.underwater ? this.speed * 0.6 : this.speed;
    this.x += Math.cos(this.angle) * s;
    this.y += Math.sin(this.angle) * s;
  }

  moveBackward() {
    const s = this.underwater ? this.speed * 0.4 : this.speed * 0.6;
    this.x -= Math.cos(this.angle) * s;
    this.y -= Math.sin(this.angle) * s;
  }

  rotateLeft() {
    this.angle -= 0.05;
  }

  rotateRight() {
    this.angle += 0.05;
  }

  dive() {
    if (!this.underwater) {
      this.underwater = true;
      this.diveTimer = this.airTime;
    }
  }

  surface() {
    if (this.underwater) {
      this.underwater = false;
    }
  }

  update(delta) {
    if (this.underwater) {
      this.diveTimer -= delta;
      if (this.diveTimer <= 0) {
        this.surface();
      }
    }
  }

  fireTorpedo(targetX, targetY) {
    if (this.torpedoes <= 0) return null;
    this.torpedoes--;
    const dx = targetX - canvas.width / 2;
    const dy = targetY - canvas.height / 2;
    const len = Math.hypot(dx, dy);
    return new Torpedo(this.x, this.y, dx / len, dy / len);
  }

  fireDeckgun() {
    if (this.deckCooldown > 0 || this.underwater) return null;
    this.deckCooldown = 1;
    return new DeckShell(this.x, this.y, Math.cos(this.angle), Math.sin(this.angle));
  }

  takeDamage(dmg) {
    this.health -= dmg;
    if (this.health < 0) this.health = 0;
  }

  repair(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(this.angle);
    ctx.fillStyle = '#003399';
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(-15, -10);
    ctx.lineTo(-15, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

class Torpedo {
  constructor(x, y, dirX, dirY) {
    this.x = x;
    this.y = y;
    this.dirX = dirX;
    this.dirY = dirY;
    this.speed = 4;
    this.dead = false;
  }
  update(delta) {
    this.x += this.dirX * this.speed;
    this.y += this.dirY * this.speed;
  }
  draw(ctx, camX, camY) {
    ctx.save();
    ctx.translate(this.x - camX + canvas.width / 2, this.y - camY + canvas.height / 2);
    ctx.fillStyle = '#0ff';
    ctx.fillRect(-2, -2, 4, 4);
    ctx.restore();
  }
}

class DeckShell {
  constructor(x, y, dirX, dirY) {
    this.x = x;
    this.y = y;
    this.dirX = dirX;
    this.dirY = dirY;
    this.speed = 6;
    this.dead = false;
  }
  update(delta) {
    this.x += this.dirX * this.speed;
    this.y += this.dirY * this.speed;
  }
  draw(ctx, camX, camY) {
    ctx.save();
    ctx.translate(this.x - camX + canvas.width / 2, this.y - camY + canvas.height / 2);
    ctx.fillStyle = '#ff0';
    ctx.fillRect(-2, -2, 4, 4);
    ctx.restore();
  }
}

class ZombieBoat {
  constructor(x, y, speed) {
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.dead = false;
  }
  update(delta, uboat) {
    const dx = uboat.x - this.x;
    const dy = uboat.y - this.y;
    const len = Math.hypot(dx, dy);
    this.x += (dx / len) * this.speed;
    this.y += (dy / len) * this.speed;
    if (!uboat.underwater && len < 20) {
      uboat.takeDamage(10);
      this.dead = true;
    }
  }
  draw(ctx, camX, camY) {
    ctx.save();
    ctx.translate(this.x - camX + canvas.width / 2, this.y - camY + canvas.height / 2);
    ctx.fillStyle = 'red';
    ctx.fillRect(-10, -5, 20, 10);
    ctx.restore();
  }
}

// Game setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let width, height;
function resize() {
  const ratio = 16 / 9;
  width = window.innerWidth;
  height = window.innerHeight;
  if (width / height > ratio) {
    width = height * ratio;
  } else {
    height = width / ratio;
  }
  canvas.width = width;
  canvas.height = height;
}
window.addEventListener('resize', resize);
resize();

const uboat = new UBoat();
uboat.deckCooldown = 0;
const torpedoes = [];
const shells = [];
let zombies = [];
let wave = 1;
let score = 0;
let scrap = 0;
let state = 'playing';

function spawnWave() {
  zombies = [];
  const count = 5 * wave;
  const speed = 1 + 0.2 * (wave - 1);
  for (let i = 0; i < count; i++) {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    switch (side) {
      case 0: x = uboat.x - width / 2 - 100; y = uboat.y + (Math.random() - 0.5) * height; break;
      case 1: x = uboat.x + width / 2 + 100; y = uboat.y + (Math.random() - 0.5) * height; break;
      case 2: x = uboat.x + (Math.random() - 0.5) * width; y = uboat.y - height / 2 - 100; break;
      case 3: x = uboat.x + (Math.random() - 0.5) * width; y = uboat.y + height / 2 + 100; break;
    }
    zombies.push(new ZombieBoat(x, y, speed));
  }
}
spawnWave();

// Input handling
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === ' ') {
    const shell = uboat.fireDeckgun();
    if (shell) shells.push(shell);
  }
  if (e.key.toLowerCase() === 't') {
    uboat.dive();
  }
  if (e.key.toLowerCase() === 'u') {
    uboat.surface();
  }
});
window.addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
});
canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const torp = uboat.fireTorpedo(x, y);
  if (torp) torpedoes.push(torp);
});

// Main loop
let last = 0;
function loop(ts) {
  const delta = (ts - last) / 1000;
  last = ts;
  update(delta);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function update(delta) {
  if (state !== 'playing') return;

  if (keys['w'] || keys['arrowup']) uboat.moveForward();
  if (keys['s'] || keys['arrowdown']) uboat.moveBackward();
  if (keys['a'] || keys['arrowleft']) uboat.rotateLeft();
  if (keys['d'] || keys['arrowright']) uboat.rotateRight();

  uboat.update(delta);
  if (uboat.deckCooldown > 0) uboat.deckCooldown -= delta;

  torpedoes.forEach(t => t.update(delta));
  shells.forEach(s => s.update(delta));
  zombies.forEach(z => z.update(delta, uboat));

  // Collision detection
  zombies.forEach(z => {
    torpedoes.forEach(t => {
      const dist = Math.hypot(z.x - t.x, z.y - t.y);
      if (dist < 15) {
        z.dead = true;
        t.dead = true;
        score += 100;
        scrap += 1;
      }
    });
    shells.forEach(s => {
      const dist = Math.hypot(z.x - s.x, z.y - s.y);
      if (dist < 15) {
        z.dead = true;
        s.dead = true;
        score += 50;
        scrap += 1;
      }
    });
  });

  // Remove dead
  for (let arr of [torpedoes, shells, zombies]) {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i].dead) arr.splice(i, 1);
    }
  }

  document.getElementById('health').textContent = `LP: ${uboat.health}/${uboat.maxHealth}`;
  document.getElementById('torpedos').textContent = `${uboat.torpedoes}/${uboat.maxTorpedoes}`;
  document.getElementById('scrap').textContent = `Schrott: ${scrap}`;
  document.getElementById('waveInfo').textContent = `Welle ${wave} - Punkte: ${score}`;

  if (zombies.length === 0) {
    wave++;
    uboat.repair(20);
    uboat.torpedoes = uboat.maxTorpedoes;
    spawnWave();
  }

  if (uboat.health <= 0) {
    state = 'gameover';
    alert('Game Over');
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // background
  ctx.fillStyle = '#00224c';
  ctx.fillRect(0,0,canvas.width, canvas.height);

  const camX = uboat.x;
  const camY = uboat.y;

  zombies.forEach(z => z.draw(ctx, camX, camY));
  torpedoes.forEach(t => t.draw(ctx, camX, camY));
  shells.forEach(s => s.draw(ctx, camX, camY));

  uboat.draw(ctx);
}
