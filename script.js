const scene = document.getElementById("scene");
const character = document.getElementById("character");
const arrowHint = document.getElementById("arrowHint");

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
  emergeMs: 1200,
  crawlMs: 2400,
  from: { x: 50, y: 58 },
  to: { x: 16, y: 64 },
};

const limits = {
  xMin: 0,
  xMax: 100,
  yMin: 0,
  yMax: 100,
};

let animationFrame = null;
let previousTime = performance.now();
let facingAngle = 0;
let arrowHintHidden = false;

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
  const dx = player.x - 50;
  const dy = (player.y - 56) * 0.66;
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
      character.classList.add("facing-side", "left");
      facingAngle = -90;
      renderCharacterTransform();
      updateCharacterTilt(-1, 0);
    } else if (elapsed < crawlEnd) {
      character.classList.remove("is-emerging");
      character.classList.add("is-intro-crawl", "is-walking");
      character.classList.remove("facing-front", "facing-back", "facing-side", "left", "right");
      character.classList.add("facing-side", "left");
      const u = easeInOutCubic((elapsed - emergeEnd) / intro.crawlMs);
      player.x = intro.from.x + (intro.to.x - intro.from.x) * u;
      player.y = intro.from.y + (intro.to.y - intro.from.y) * u;
      facingAngle = -90;
      renderCharacterTransform();
      updateCharacterTilt(-1, 0);
    } else {
      intro.active = false;
      character.classList.remove("is-emerging", "is-intro-crawl", "is-walking", "facing-side", "left");
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

  animationFrame = requestAnimationFrame(animate);
}

function isArrowKey(key) {
  return key in keys;
}

window.addEventListener("keydown", (event) => {
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
