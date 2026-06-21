const MODES = {
  focus: { label: "Foco", minutes: 25, message: "Hora de se concentrar" },
  break: { label: "Intervalo", minutes: 5, message: "Respire e recarregue" },
};

const CIRCUMFERENCE = 2 * Math.PI * 77;

const elements = {
  card: document.querySelector("#timerCard"),
  content: document.querySelector("#timerContent"),
  playButton: document.querySelector("#playButton"),
  playIcon: document.querySelector("#playIcon"),
  timeDisplay: document.querySelector("#timeDisplay"),
  decrease: document.querySelector("#decreaseButton"),
  increase: document.querySelector("#increaseButton"),
  progress: document.querySelector("#progressCircle"),
  modeButtons: [...document.querySelectorAll(".mode-button")],
  menuButton: document.querySelector("#menuButton"),
  menu: document.querySelector("#menu"),
  notificationsButton: document.querySelector("#notificationsButton"),
  notificationsLabel: document.querySelector("#notificationsLabel"),
  hideTimerButton: document.querySelector("#hideTimerButton"),
  restoreButton: document.querySelector("#restoreButton"),
  sizeButton: document.querySelector("#sizeButton"),
  sizeOptions: document.querySelector("#sizeOptions"),
  moveButton: document.querySelector("#moveButton"),
  aboutButton: document.querySelector("#aboutButton"),
  aboutDialog: document.querySelector("#aboutDialog"),
  dialogClose: document.querySelector("#dialogClose"),
  dialogAction: document.querySelector("#dialogAction"),
  sessionLabel: document.querySelector("#sessionLabel"),
  sessionCount: document.querySelector("#sessionCount"),
  toast: document.querySelector("#toast"),
};

let mode = "focus";
let totalSeconds = MODES.focus.minutes * 60;
let remainingSeconds = totalSeconds;
let running = false;
let timerId = null;
let completedSessions = Number(localStorage.getItem("tempo-sessions") || 0);
let toastTimer = null;
let moving = false;
let dragOffset = { x: 0, y: 0 };

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function render() {
  elements.timeDisplay.textContent = formatTime(remainingSeconds);
  document.title = `${formatTime(remainingSeconds)} - ${MODES[mode].label}`;

  const elapsed = totalSeconds ? (totalSeconds - remainingSeconds) / totalSeconds : 0;
  elements.progress.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - elapsed));

  elements.playIcon.classList.toggle("is-pause", running);
  elements.playButton.setAttribute("aria-label", running ? "Pausar temporizador" : "Iniciar temporizador");
  elements.sessionLabel.textContent = running
    ? mode === "focus"
      ? "Foco em andamento"
      : "Intervalo em andamento"
    : MODES[mode].message;
  elements.sessionCount.textContent = `${completedSessions} ${completedSessions === 1 ? "sessão" : "sessões"}`;
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2400);
}

function pause() {
  running = false;
  clearInterval(timerId);
  timerId = null;
  render();
}

function tick() {
  if (remainingSeconds > 0) {
    remainingSeconds -= 1;
    render();
    return;
  }

  pause();
  if (mode === "focus") {
    completedSessions += 1;
    localStorage.setItem("tempo-sessions", String(completedSessions));
  }

  const title = mode === "focus" ? "Foco concluído" : "Intervalo concluído";
  const body = mode === "focus" ? "Bom trabalho. Agora faça uma pausa." : "Vamos voltar ao foco?";
  showToast(body);

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
  }

  render();
}

function start() {
  if (remainingSeconds === 0) {
    remainingSeconds = totalSeconds;
  }
  running = true;
  timerId = setInterval(tick, 1000);
  render();
}

function toggleTimer() {
  running ? pause() : start();
}

function setMode(nextMode) {
  if (!MODES[nextMode] || nextMode === mode) return;
  pause();
  mode = nextMode;
  totalSeconds = MODES[mode].minutes * 60;
  remainingSeconds = totalSeconds;

  elements.modeButtons.forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  render();
}

function adjustTime(minutes) {
  pause();
  const nextSeconds = Math.max(60, Math.min(90 * 60, totalSeconds + minutes * 60));
  totalSeconds = nextSeconds;
  remainingSeconds = nextSeconds;
  render();
}

function toggleMenu(force) {
  const shouldOpen = typeof force === "boolean" ? force : elements.menu.hidden;
  elements.menu.hidden = !shouldOpen;
  elements.menuButton.setAttribute("aria-expanded", String(shouldOpen));
  if (!shouldOpen) {
    elements.sizeOptions.hidden = true;
    elements.sizeButton.setAttribute("aria-expanded", "false");
  }
}

async function requestNotifications() {
  if (!("Notification" in window)) {
    showToast("Este navegador não oferece notificações.");
    return;
  }

  const permission = await Notification.requestPermission();
  elements.notificationsLabel.textContent =
    permission === "granted" ? "Notificações ativadas" : "Ativar notificações";
  showToast(permission === "granted" ? "Notificações ativadas." : "Permissão não concedida.");
  toggleMenu(false);
}

function setSize(size) {
  elements.card.classList.remove("size-compact", "size-large");
  if (size !== "default") elements.card.classList.add(`size-${size}`);
  localStorage.setItem("tempo-size", size);
  showToast(`Tamanho ${size === "default" ? "padrão" : size}.`);
  toggleMenu(false);
}

function beginMove() {
  if (window.matchMedia("(max-width: 520px)").matches) {
    showToast("O cartão já ocupa a tela no celular.");
    toggleMenu(false);
    return;
  }
  moving = true;
  elements.card.classList.add("is-moving");
  showToast("Arraste o cartão para reposicionar.");
  toggleMenu(false);
}

function stopMove() {
  moving = false;
  elements.card.classList.remove("is-moving");
}

elements.playButton.addEventListener("click", toggleTimer);
elements.timeDisplay.addEventListener("click", () => {
  pause();
  remainingSeconds = totalSeconds;
  render();
  showToast("Temporizador reiniciado.");
});
elements.decrease.addEventListener("click", () => adjustTime(-5));
elements.increase.addEventListener("click", () => adjustTime(5));
elements.modeButtons.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));

elements.menuButton.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleMenu();
});
elements.menu.addEventListener("click", (event) => event.stopPropagation());
document.addEventListener("click", () => toggleMenu(false));
document.addEventListener("keydown", (event) => {
  if (event.code === "Space" && !event.target.closest("button")) {
    event.preventDefault();
    toggleTimer();
  }
  if (event.key === "Escape") {
    toggleMenu(false);
    stopMove();
  }
});

elements.notificationsButton.addEventListener("click", requestNotifications);
elements.hideTimerButton.addEventListener("click", () => {
  elements.content.hidden = true;
  elements.restoreButton.hidden = false;
  toggleMenu(false);
});
elements.restoreButton.addEventListener("click", () => {
  elements.content.hidden = false;
  elements.restoreButton.hidden = true;
});
elements.sizeButton.addEventListener("click", () => {
  elements.sizeOptions.hidden = !elements.sizeOptions.hidden;
  elements.sizeButton.setAttribute("aria-expanded", String(!elements.sizeOptions.hidden));
});
elements.sizeOptions.querySelectorAll("button").forEach((button) => {
  button.addEventListener("click", () => setSize(button.dataset.size));
});
elements.moveButton.addEventListener("click", beginMove);

elements.card.addEventListener("pointerdown", (event) => {
  if (!moving || event.target.closest("button, .menu")) return;
  const rect = elements.card.getBoundingClientRect();
  dragOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  elements.card.setPointerCapture(event.pointerId);
});
elements.card.addEventListener("pointermove", (event) => {
  if (!moving || !elements.card.hasPointerCapture(event.pointerId)) return;
  const x = Math.max(8, Math.min(window.innerWidth - elements.card.offsetWidth - 8, event.clientX - dragOffset.x));
  const y = Math.max(8, Math.min(window.innerHeight - elements.card.offsetHeight - 8, event.clientY - dragOffset.y));
  elements.card.style.position = "fixed";
  elements.card.style.left = `${x}px`;
  elements.card.style.top = `${y}px`;
  elements.card.style.margin = "0";
});
elements.card.addEventListener("pointerup", (event) => {
  if (elements.card.hasPointerCapture(event.pointerId)) {
    elements.card.releasePointerCapture(event.pointerId);
    stopMove();
  }
});

elements.aboutButton.addEventListener("click", () => {
  toggleMenu(false);
  elements.aboutDialog.showModal();
});
elements.dialogClose.addEventListener("click", () => elements.aboutDialog.close());
elements.dialogAction.addEventListener("click", () => elements.aboutDialog.close());
elements.aboutDialog.addEventListener("click", (event) => {
  if (event.target === elements.aboutDialog) elements.aboutDialog.close();
});

const savedSize = localStorage.getItem("tempo-size");
if (["compact", "large"].includes(savedSize)) elements.card.classList.add(`size-${savedSize}`);
if ("Notification" in window && Notification.permission === "granted") {
  elements.notificationsLabel.textContent = "Notificações ativadas";
}

elements.progress.style.strokeDasharray = String(CIRCUMFERENCE);
render();
