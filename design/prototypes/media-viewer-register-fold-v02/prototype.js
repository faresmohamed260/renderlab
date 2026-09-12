const body = document.body;
const conceptButtons = [...document.querySelectorAll("[data-concept-button]")];
const viewButtons = [...document.querySelectorAll("[data-view-button]")];
const modeButtons = [...document.querySelectorAll("[data-panel]")];
const spineButtons = [...document.querySelectorAll("[data-spine-panel]")];
const compareButton = document.querySelector("#compare-trigger");
const spineCompareButton = document.querySelector("[data-spine-compare]");
const detailPanel = document.querySelector("#detail-panel");
const detailSections = [...detailPanel.querySelectorAll("[data-panel-content]")];
const sourceFrame = document.querySelector("#source-frame");
const resultFrame = document.querySelector("#result-frame");
const title = document.querySelector("#viewer-title");

let activePanel = null;
let compareOpen = false;

function setPressed(buttons, predicate) {
  for (const button of buttons) {
    const active = predicate(button);
    button.classList.toggle("active", active);
    if (button.hasAttribute("aria-pressed")) {
      button.setAttribute("aria-pressed", String(active));
    }
  }
}

function closePanel() {
  activePanel = null;
  body.dataset.details = "off";
  detailPanel.dataset.open = "false";
  detailPanel.setAttribute("aria-hidden", "true");
  for (const section of detailSections) section.hidden = true;
  for (const button of modeButtons) button.setAttribute("aria-expanded", "false");
  for (const button of spineButtons) button.classList.remove("active");
}

function openPanel(name) {
  if (activePanel === name) {
    closePanel();
    return;
  }
  activePanel = name;
  body.dataset.details = "on";
  detailPanel.dataset.open = "true";
  detailPanel.setAttribute("aria-hidden", "false");
  for (const section of detailSections) {
    section.hidden = section.dataset.panelContent !== name;
  }
  for (const button of modeButtons) {
    button.setAttribute("aria-expanded", String(button.dataset.panel === name));
  }
  for (const button of spineButtons) {
    button.classList.toggle("active", button.dataset.spinePanel === name);
  }
}

function setCompare(open) {
  compareOpen = Boolean(open);
  body.dataset.compare = compareOpen ? "on" : "off";
  compareButton.setAttribute("aria-pressed", String(compareOpen));
  spineCompareButton.classList.toggle("active", compareOpen);
  sourceFrame.setAttribute("aria-hidden", String(!compareOpen));
  compareButton.textContent = compareOpen ? "Close comparison" : "Compare source";
}

function setConcept(name) {
  body.dataset.concept = name;
  setPressed(conceptButtons, (button) => button.dataset.conceptButton === name);
  closePanel();
  resultFrame.style.removeProperty("--viewer-rx");
  resultFrame.style.removeProperty("--viewer-ry");
}

function setView(name) {
  body.dataset.view = name;
  setPressed(viewButtons, (button) => button.dataset.viewButton === name);
  title.textContent = name === "video" ? "Amber corridor" : "Alpine study";
}

for (const button of conceptButtons) {
  button.addEventListener("click", () => setConcept(button.dataset.conceptButton));
}

for (const button of viewButtons) {
  button.addEventListener("click", () => setView(button.dataset.viewButton));
}

for (const button of modeButtons) {
  if (button.dataset.panel) button.addEventListener("click", () => openPanel(button.dataset.panel));
}

for (const button of spineButtons) {
  button.addEventListener("click", () => openPanel(button.dataset.spinePanel));
}

compareButton.addEventListener("click", () => setCompare(!compareOpen));
spineCompareButton.addEventListener("click", () => setCompare(!compareOpen));

const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function resetTilt() {
  body.dataset.tilt = "off";
  resultFrame.style.setProperty("--viewer-rx", "0deg");
  resultFrame.style.setProperty("--viewer-ry", "0deg");
}

resultFrame.addEventListener("pointermove", (event) => {
  if (!finePointer.matches || reducedMotion.matches || compareOpen || event.pointerType === "touch") return;
  const rect = resultFrame.getBoundingClientRect();
  const nx = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
  const ny = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
  const rx = (-ny * 0.85).toFixed(2);
  const ry = (nx * 1.05).toFixed(2);
  body.dataset.tilt = "on";
  resultFrame.style.setProperty("--viewer-rx", `${rx}deg`);
  resultFrame.style.setProperty("--viewer-ry", `${ry}deg`);
});

resultFrame.addEventListener("pointerleave", resetTilt);

reducedMotion.addEventListener?.("change", (event) => {
  if (event.matches) resetTilt();
});

closePanel();
setCompare(false);
setConcept("fold");
setView("image");

window.viewerPrototype = {
  setConcept,
  setView,
  setCompare,
  openPanel,
  closePanel,
  getState() {
    return {
      concept: body.dataset.concept,
      view: body.dataset.view,
      details: body.dataset.details,
      compare: body.dataset.compare,
      activePanel,
    };
  },
};
