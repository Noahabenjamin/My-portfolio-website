const scene = document.getElementById("scene");
const world = document.getElementById("world");
const character = document.getElementById("character");
const characterModel = document.getElementById("characterModel");
const arrowHint = document.getElementById("arrowHint");
const portalWorld = document.getElementById("portalWorld");
const portalChar = document.getElementById("portalChar");
const portalModel = document.getElementById("portalModel");
const cobbleFloor = document.getElementById("cobbleFloor");

// ─── 3-D Baymax body-part HTML generator ───
// Each body part is a 3-D box with 6 faces. Head also gets eyes & face-line on
// the front face plus side-eyes on the left/right faces so Baymax's face stays
// readable from any angle.

function box(extra = "") {
  return `
    <span class="face f-front">${extra}</span>
    <span class="face f-back"></span>
    <span class="face f-right"></span>
    <span class="face f-left"></span>
    <span class="face f-top"></span>
    <span class="face f-bottom"></span>
  `;
}

function headBox() {
  return `
    <span class="face f-front">
      <span class="face-line"></span>
      <span class="eye eye-left"></span>
      <span class="eye eye-right"></span>
    </span>
    <span class="face f-back"></span>
    <span class="face f-right">
      <span class="side-eye"></span>
      <span class="side-line"></span>
    </span>
    <span class="face f-left">
      <span class="side-eye"></span>
      <span class="side-line"></span>
    </span>
    <span class="face f-top"></span>
    <span class="face f-bottom"></span>
  `;
}

function buildBaymax(target) {
  target.innerHTML = `
    <span class="head body-part">${headBox()}</span>
    <span class="torso body-part">${box()}</span>
    <span class="arm arm-left body-part">${box()}<span class="hand body-part">${box()}</span></span>
    <span class="arm arm-right body-part">${box()}<span class="hand body-part">${box()}</span></span>
    <span class="leg leg-left body-part">${box()}<span class="foot body-part">${box()}</span></span>
    <span class="leg leg-right body-part">${box()}<span class="foot body-part">${box()}</span></span>
  `;
}

buildBaymax(characterModel);
buildBaymax(portalModel);

// ─── Player & game state ───

const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
};

const player = {
  x: 50,
  y: 58,
  speed: 0.024,
};

const intro = {
  active: true,
  startedAt: null,
  emergeMs: 1400,
  crawlMs: 2600,
  from: { x: 3, y: 84 },
  to: { x: 16, y: 64 },
};

const limits = {
  xMin: 0,
  xMax: 100,
  yMin: 0,
  yMax: 100,
};

const HOLE_X = 50;
const HOLE_Y = 56;
const FALL_RADIUS = 6;

let animationFrame = null;
let previousTime = performance.now();
let facingAngle = 0;
let arrowHintHidden = false;
let isFalling = false;
let portalReady = false;        // true once portal scene is fully visible & key-dismissable

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function setCharacterPosition() {
  character.style.left = `${player.x}%`;
  character.style.top = `${player.y}%`;
}

function renderCharacterTransform() {
  character.style.setProperty("--facing", `${facingAngle.toFixed(1)}deg`);
}

function updateCharacterTilt(horizontal, vertical) {
  const pitch = vertical * 4.2;
  const roll = horizontal * 2.4;
  character.style.setProperty("--pitch", `${pitch.toFixed(2)}deg`);
  character.style.setProperty("--roll", `${roll.toFixed(2)}deg`);
}

function updateFog() {
  const dx = player.x - HOLE_X;
  const dy = (player.y - HOLE_Y) * 0.66;
  const distance = Math.hypot(dx, dy);
  const maxDistance = 38;
  const proximity = clamp(1 - distance / maxDistance, 0, 1);

  const fogAlpha = 0.92 * proximity;
  const clearW = 74 - proximity * 40;
  const clearH = 58 - proximity * 24;

  scene.style.setProperty("--fog-alpha", fogAlpha.toFixed(3));
  scene.style.setProperty("--clear-w", `${clearW.toFixed(2)}%`);
  scene.style.setProperty("--clear-h", `${clearH.toFixed(2)}%`);
}

function setFacingClasses(horizontal, vertical) {
  character.classList.remove("facing-front", "facing-back", "facing-side", "left", "right");

  if (Math.abs(vertical) >= Math.abs(horizontal)) {
    if (vertical > 0) {
      character.classList.add("facing-front");
    } else {
      character.classList.add("facing-back");
    }
    return;
  }

  character.classList.add("facing-side");
  if (horizontal > 0) {
    character.classList.add("right");
  } else {
    character.classList.add("left");
  }
}

function updateDirectionVisual(horizontal, vertical) {
  if (horizontal === 0 && vertical === 0) return;
  facingAngle = (Math.atan2(horizontal, -vertical) * 180) / Math.PI;
  renderCharacterTransform();
  setFacingClasses(horizontal, vertical);
}

function hideArrowHint() {
  if (arrowHintHidden || !arrowHint) return;
  arrowHintHidden = true;
  arrowHint.classList.add("hidden");
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ─── Fall sequence: camera dive → portal scene → confused float → drop to cobble ───

function startFalling() {
  isFalling = true;
  Object.keys(keys).forEach((k) => { keys[k] = false; });
  character.classList.remove("is-walking");

  // 1. World camera dives into the hole (1.5s) — rotates 40° → 92° + scale 9x
  world.classList.add("diving");

  // 2. Character spirals/shrinks into hole (1.5s, in parallel)
  character.classList.add("is-falling");

  // 3. Once camera dive nearly complete, reveal portal scene
  setTimeout(() => {
    portalWorld.classList.add("active");
    portalWorld.setAttribute("aria-hidden", "false");
    portalChar.classList.add("confused");
  }, 1300);

  // 4. After confused float (3.4s), drop to cobble floor
  setTimeout(() => {
    cobbleFloor.classList.add("show");
  }, 1300 + 2800);

  setTimeout(() => {
    portalChar.classList.remove("confused");
    portalChar.classList.add("dropping");
  }, 1300 + 3400);

  // 5. After landing, allow keypress to dismiss
  setTimeout(() => {
    portalReady = true;
  }, 1300 + 3400 + 1400);
}

function returnFromPortal() {
  if (!portalReady) return;
  portalReady = false;

  portalWorld.classList.remove("active");
  portalWorld.setAttribute("aria-hidden", "true");

  setTimeout(() => {
    // Reset world camera
    world.classList.remove("diving");

    // Reset character
    character.classList.remove("is-falling");
    portalChar.classList.remove("confused", "dropping");
    cobbleFloor.classList.remove("show");

    player.x = 16;
    player.y = 64;
    setCharacterPosition();
    updateFog();

    character.classList.remove("facing-front", "facing-back", "facing-side", "left", "right");
    character.classList.add("facing-front");
    facingAngle = 0;
    renderCharacterTransform();
    updateCharacterTilt(0, 0);

    isFalling = false;
  }, 600);
}

function animate(now) {
  const delta = now - previousTime;
  previousTime = now;

  if (intro.active) {
    if (intro.startedAt === null) intro.startedAt = now;
    const elapsed = now - intro.startedAt;
    const emergeEnd = intro.emergeMs;
    const crawlEnd = emergeEnd + intro.crawlMs;

    if (elapsed < emergeEnd) {
      player.x = intro.from.x;
      player.y = intro.from.y;
      character.classList.add("is-emerging", "is-intro-crawl");
      character.classList.remove("is-walking");
      character.classList.remove("facing-front", "facing-back", "facing-side", "left", "right");
      character.classList.add("facing-side", "right");
      facingAngle = 90;
      renderCharacterTransform();
      updateCharacterTilt(1, 0);
    } else if (elapsed < crawlEnd) {
      character.classList.remove("is-emerging");
      character.classList.add("is-intro-crawl", "is-walking");
      character.classList.remove("facing-front", "facing-back", "facing-side", "left", "right");
      character.classList.add("facing-side", "right");
      const u = easeInOutCubic((elapsed - emergeEnd) / intro.crawlMs);
      player.x = intro.from.x + (intro.to.x - intro.from.x) * u;
      player.y = intro.from.y + (intro.to.y - intro.from.y) * u;
      facingAngle = 90;
      renderCharacterTransform();
      updateCharacterTilt(1, 0);
    } else {
      intro.active = false;
      character.classList.remove("is-emerging", "is-intro-crawl", "is-walking", "facing-side", "left", "right");
      character.classList.add("facing-front");
      facingAngle = 0;
      renderCharacterTransform();
      updateCharacterTilt(0, 0);
    }

    setCharacterPosition();
    updateFog();
    animationFrame = requestAnimationFrame(animate);
    return;
  }

  if (isFalling) {
    animationFrame = requestAnimationFrame(animate);
    return;
  }

  const step = player.speed * delta;
  let horizontal = 0;
  let vertical = 0;

  if (keys.ArrowUp) vertical -= 1;
  if (keys.ArrowDown) vertical += 1;
  if (keys.ArrowLeft) horizontal -= 1;
  if (keys.ArrowRight) horizontal += 1;

  if (horizontal !== 0 || vertical !== 0) {
    const length = Math.hypot(horizontal, vertical) || 1;
    const xUnit = horizontal / length;
    const yUnit = vertical / length;
    player.x += xUnit * step;
    player.y += yUnit * step;
    player.x = clamp(player.x, limits.xMin, limits.xMax);
    player.y = clamp(player.y, limits.yMin, limits.yMax);
    setCharacterPosition();
    updateFog();
    updateDirectionVisual(horizontal, vertical);
    updateCharacterTilt(xUnit, yUnit);
    character.classList.add("is-walking");
  } else {
    character.classList.remove("is-walking");
    updateCharacterTilt(0, 0);
  }

  // Hole collision check
  const dx = player.x - HOLE_X;
  const dy = (player.y - HOLE_Y) * 0.66;
  if (Math.hypot(dx, dy) < FALL_RADIUS) {
    startFalling();
  }

  animationFrame = requestAnimationFrame(animate);
}

function isArrowKey(key) {
  return key in keys;
}

window.addEventListener("keydown", (event) => {
  if (isFalling) {
    if (portalReady) {
      returnFromPortal();
    }
    event.preventDefault();
    return;
  }
  if (!isArrowKey(event.key)) return;
  keys[event.key] = true;
  hideArrowHint();
  event.preventDefault();
});

window.addEventListener("keyup", (event) => {
  if (!isArrowKey(event.key)) return;
  keys[event.key] = false;
  event.preventDefault();
});

window.addEventListener("blur", () => {
  Object.keys(keys).forEach((key) => {
    keys[key] = false;
  });
});

setCharacterPosition();
updateFog();
scene.focus();
window.addEventListener("pointerdown", () => scene.focus());
window.addEventListener("keydown", () => scene.focus());
renderCharacterTransform();
animationFrame = requestAnimationFrame(animate);

window.addEventListener("beforeunload", () => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }
});
