'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

// Estrella fugaz (asteroide especial)
const STAR_SPEED_MULT  = 2.8;  // multiplicador de velocidad respecto al asteroide normal
const STAR_TTL         = 8;    // tiempo de vida en pantalla (s)
const STAR_POINTS      = 250;  // puntos al destruirla
const STAR_LEVEL_CHANCE = 0.75; // probabilidad de que aparezca al iniciar un nivel
const STAR_SPAWN_RATE   = 0.15; // probabilidad por segundo de aparición en partida

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estrella fugaz (asteroide especial) ───────────────────────────────────────
class ShootingStar extends Asteroid {
  constructor(x, y) {
    super(x, y, 1);
    this.vx *= STAR_SPEED_MULT;
    this.vy *= STAR_SPEED_MULT;
    this.ttl = STAR_TTL;
  }

  update(dt) {
    super.update(dt);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  split() {
    return [];
  }

  draw() {
    // Parpadea los últimos 2 segundos de vida
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;

    const vx = this.vx / STAR_SPEED_MULT;
    const vy = this.vy / STAR_SPEED_MULT;

    // Estela roja hacia atrás
    ctx.strokeStyle = 'rgba(255, 64, 64, 0.55)';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - vx * 0.22, this.y - vy * 0.22);
    ctx.stroke();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#ff2222';
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Power-up (Velocidad) ──────────────────────────────────────────────────────
const BOOST_TIME    = 5;    // duración del efecto (s)
const BOOST_CHANCE  = 0.15; // probabilidad de caer al destruir un asteroide
const PICKUP_RADIUS = 9;
const PICKUP_LIFE   = 10;   // tiempo en pantalla antes de desaparecer (s)

// Escudo (power-up)
const SHIELD_HITS  = 3;      // cargas que otorga el power-up
const SHIELD_CHANCE = 0.12;  // probabilidad de drop al destruir un asteroide
const SHIELD_COLOR  = '#4fd8ff';
const SHIELD_RGB    = '79,216,255';
const SHIELD_RING_RADIUS = 22; // radio del anillo alrededor de la nave

class PowerUp {
  constructor(x, y, type = 'boost') {
    this.x      = x;
    this.y      = y;
    this.type   = type;   // 'boost' | 'shield'
    this.ttl    = PICKUP_LIFE;
    this.life   = PICKUP_LIFE;
    this.dead   = false;
  }

  update(dt) {
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadea los últimos 2 segundos de vida
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;

    const t = performance.now() / 1000;
    const pulse = 1 + Math.sin(t * 5) * 0.12;

    const isShield = this.type === 'shield';
    const color = isShield ? SHIELD_COLOR : '#ffb020';
    const label = isShield ? 'E' : 'V';

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.PI / 4);
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.strokeRect(-PICKUP_RADIUS * 0.75, -PICKUP_RADIUS * 0.75, PICKUP_RADIUS * 1.5, PICKUP_RADIUS * 1.5);
    ctx.restore();

    ctx.fillStyle = color;
    ctx.font      = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, this.x, this.y);
    ctx.textBaseline = 'alphabetic';
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedBoostTimer = 0;
    this.shieldHits   = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoostTimer > 0) this.speedBoostTimer -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = this.speedBoostTimer > 0 ? 520 : 260;  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    const boosted    = this.speedBoostTimer > 0;
    ctx.strokeStyle = boosted ? '#ffb020' : '#fff';
    ctx.lineWidth   = boosted ? 2 : 1.5;
    ctx.lineJoin    = 'round';

    // Anillo del escudo (parpadea cuando queda 1 sola carga)
    if (this.shieldHits > 0) {
      const last = this.shieldHits === 1;
      if (!(last && Math.floor(performance.now() / 100) % 2 === 0)) {
        const t = performance.now() / 1000;
        ctx.strokeStyle = SHIELD_COLOR;
        ctx.globalAlpha = last ? 0.45 : 0.8;
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, SHIELD_RING_RADIUS + Math.sin(t * 4) * 1.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo( 20,  0);   // nariz
    ctx.lineTo(-12, -9);   // ala izquierda
    ctx.lineTo( -7,  0);   // muesca trasera
    ctx.lineTo(-12,  9);   // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = boosted ? 'rgba(255, 170, 60, 0.95)' : 'rgba(255, 130, 0, 0.85)';
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y, color = null, speedMin = 30, speedMax = 130, lifeMin = 0.4, lifeMax = 1.1) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(speedMin, speedMax);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(lifeMin, lifeMax);
    this.ttl  = this.life;
    this.dead = false;
    this.color = color;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    const c = this.color === null
      ? `255,255,255`
      : this.color;
    ctx.strokeStyle = `rgba(${c},${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// Onda expansiva (anillo que crece y se desvanece)
class Shockwave {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.life = 0.45;
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const t = 1 - this.ttl / this.life;
    const alpha = (this.ttl / this.life).toFixed(2);
    ctx.strokeStyle = `rgba(255,80,60,${alpha})`;
    ctx.lineWidth = Math.max(0.5, 3 * (1 - t));
    ctx.beginPath();
    ctx.arc(this.x, this.y, 8 + t * 70, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerups;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function spawnShootingStar() {
  const SAFE_DIST = 130;
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
  asteroids.push(new ShootingStar(x, y));
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerups  = [];
  // El power-up de velocidad y las cargas de escudo persisten entre niveles
  const boost  = ship.speedBoostTimer;
  const shield = ship.shieldHits;
  ship.reset();
  ship.speedBoostTimer = boost;
  ship.shieldHits = shield;
  spawnAsteroids(3 + level);
  if (Math.random() < STAR_LEVEL_CHANCE) spawnShootingStar();
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

// Explosión vistosa de la estrella fugaz: partículas rojas, chispas doradas y onda expansiva
function explodeStar(x, y) {
  for (let i = 0; i < 14; i++)
    particles.push(new Particle(x, y, '255,70,60', 60, 220, 0.5, 1.2));
  for (let i = 0; i < 12; i++)
    particles.push(new Particle(x, y, rand(0, 1) < 0.5 ? '255,170,60' : '255,230,120', 130, 330, 0.25, 0.55));
  particles.push(new Shockwave(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  ship.speedBoostTimer = 0;
  ship.shieldHits = 0;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// Destruir un asteroide (por bala o por bloqueo del escudo): punto, explosión, split y drops
function destroyAsteroid(a) {
  a.dead = true;
  score += a instanceof ShootingStar ? STAR_POINTS : POINTS[a.size];
  if (a instanceof ShootingStar) {
    explodeStar(a.x, a.y);
  } else {
    explode(a.x, a.y, a.size * 5);
    // Posible drop de power-ups
    if (Math.random() < BOOST_CHANCE)
      powerups.push(new PowerUp(a.x, a.y, 'boost'));
    if (Math.random() < SHIELD_CHANCE)
      powerups.push(new PowerUp(a.x, a.y, 'shield'));
  }
  return a.split();
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerups.forEach(pu => pu.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerups  = powerups.filter(pu => !pu.dead);

  // Nave vs pickup (activación del power-up)
  for (const pu of powerups) {
    if (dist(ship, pu) < ship.radius + PICKUP_RADIUS) {
      pu.dead = true;
      if (pu.type === 'shield') ship.shieldHits = SHIELD_HITS; // renueva al máximo, no acumula
      else ship.speedBoostTimer = BOOST_TIME;
      explode(pu.x, pu.y, 6);
    }
  }
  powerups = powerups.filter(pu => !pu.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        newAsteroids.push(...destroyAsteroid(a));
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    const blocked = [];
    for (const a of asteroids) {
      if (!a.dead && dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (ship.shieldHits > 0) {
          // El escudo absorbe el choque: consume una carga y destruye el asteroide
          ship.shieldHits--;
          for (let i = 0; i < 8; i++)
            particles.push(new Particle(a.x, a.y, SHIELD_RGB, 60, 200, 0.3, 0.7));
          blocked.push(...destroyAsteroid(a));
        } else {
          killShip();
        }
        break;
      }
    }
    asteroids = asteroids.filter(a => !a.dead).concat(blocked);
  }

  // Aparición aleatoria de estrella fugaz (solo si no hay ninguna activa)
  if (!asteroids.some(a => a instanceof ShootingStar) && Math.random() < STAR_SPAWN_RATE * dt)
    spawnShootingStar();

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Contador del power-up de velocidad
  if (ship.speedBoostTimer > 0) {
    ctx.fillStyle = '#ffb020';
    ctx.textAlign = 'left';
    ctx.fillText(`VELOCIDAD x2  ${ship.speedBoostTimer.toFixed(1)}s`, 14, 48);
  }

  // Contador de cargas del escudo
  if (ship.shieldHits > 0) {
    ctx.fillStyle = SHIELD_COLOR;
    ctx.textAlign = 'left';
    ctx.fillText(`ESCUDO x${ship.shieldHits}`, 14, ship.speedBoostTimer > 0 ? 70 : 48);
  }
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  powerups.forEach(pu => pu.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
