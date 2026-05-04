const scene = document.getElementById("scene");
const character = document.getElementById("character");

const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
};

const player = {
  x: 30,
  y: 64,
  speed: 0.16,
};

const limits = {
  xMin: 8,
  xMax: 92,
  yMin: 24,
  yMax: 82,
};

let animationFrame = null;
let previousTime = performance.now();
let facing = 1;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function setCharacterPosition() {
  character.style.left = `${player.x}%`;
  character.style.top = `${player.y}%`;
}

function renderCharacterTransform() {
  character.style.transform = `translate(-50%, -50%) scaleX(${facing})`;
}

function updateFog() {
  const dx = player.x - 50;
  const dy = player.y - 56;
  const distance = Math.hypot(dx, dy);
  const maxDistance = 38;
  const proximity = clamp(1 - distance / maxDistance, 0, 1);

  const fogAlpha = 0.92 * proximity;
  const clearW = 74 - proximity * 40;
  const clearH = 50 - proximity * 28;

  scene.style.setProperty("--fog-alpha", fogAlpha.toFixed(3));
  scene.style.setProperty("--clear-w", `${clearW.toFixed(2)}%`);
  scene.style.setProperty("--clear-h", `${clearH.toFixed(2)}%`);
}

function updateDirectionVisual(horizontal) {
  if (horizontal !== 0) {
    facing = horizontal > 0 ? 1 : -1;
    renderCharacterTransform();
  }
}

function animate(now) {
  const delta = now - previousTime;
  previousTime = now;

  const step = player.speed * delta;
  let horizontal = 0;
  let vertical = 0;

  if (keys.ArrowUp) vertical -= 1;
  if (keys.ArrowDown) vertical += 1;
  if (keys.ArrowLeft) horizontal -= 1;
  if (keys.ArrowRight) horizontal += 1;

  if (horizontal !== 0 || vertical !== 0) {
    const length = Math.hypot(horizontal, vertical) || 1;
    player.x += (horizontal / length) * step;
    player.y += (vertical / length) * step;
    player.x = clamp(player.x, limits.xMin, limits.xMax);
    player.y = clamp(player.y, limits.yMin, limits.yMax);
    setCharacterPosition();
    updateFog();
    updateDirectionVisual(horizontal);
  }

  animationFrame = requestAnimationFrame(animate);
}

function isArrowKey(key) {
  return key in keys;
}

window.addEventListener("keydown", (event) => {
  if (!isArrowKey(event.key)) return;
  keys[event.key] = true;
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
character.classList.add("is-emerging");
setTimeout(() => {
  character.classList.remove("is-emerging");
  renderCharacterTransform();
}, 1250);
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
