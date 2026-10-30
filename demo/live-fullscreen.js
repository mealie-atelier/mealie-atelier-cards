// Fullscreen for the live demo frame. Where the browser can fullscreen an element (desktop, Android,
// iPad) the Fullscreen API is used on the frame. iPhone Safari cannot, so the same frame becomes a
// fixed overlay that fills the dynamic viewport. Both paths share one button, one state and one
// focus rule: focus moves to the button inside the frame and returns to where it came from.

export function setupLiveFullscreen({ frame, button, card, doc = document }) {
  const root = doc.documentElement;
  const label = button.querySelector("[data-live-fs-label]");
  const iconUse = button.querySelector("use");
  let mode = null; // null | "native" | "overlay"
  let opener = null;
  let inerted = [];
  let wasInert = [];
  let observer = null;

  const fullscreenElement = () => doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
  const request = () => frame.requestFullscreen ?? frame.webkitRequestFullscreen;
  const nativeAllowed = () =>
    typeof request() === "function" &&
    doc.fullscreenEnabled !== false &&
    doc.webkitFullscreenEnabled !== false;

  // The card owns Escape while one of its own dialogs is open.
  // That covers the modal sheets (role="dialog") and the native confirm and prompt dialogs
  // (<dialog class="at-premium-dialog">, opened with showModal and without a role attribute).
  const cardDialogOpen = () =>
    Boolean(card?.shadowRoot?.querySelector?.('[role="dialog"], dialog[open]'));

  function lockPage() {
    root.classList.add("live-fs-lock");
    inerted = [];
    wasInert = [];
    let node = frame;
    while (node?.parentElement) {
      for (const sibling of node.parentElement.children) {
        if (sibling === node || sibling.tagName === "SCRIPT") continue;
        inerted.push(sibling);
        wasInert.push(Boolean(sibling.inert));
        sibling.inert = true;
      }
      if (node.parentElement === doc.body) break;
      node = node.parentElement;
    }
  }
  function unlockPage() {
    root.classList.remove("live-fs-lock");
    inerted.forEach((element, index) => {
      element.inert = wasInert[index];
    });
    inerted = [];
    wasInert = [];
  }

  function render() {
    const active = mode !== null;
    // Fullscreen is the card's panel layout: no frame, no rounded corners, the full height.
    if (card && card.layout !== (active ? "panel" : undefined))
      card.layout = active ? "panel" : undefined;
    if (mode) frame.setAttribute("data-fullscreen", mode);
    else frame.removeAttribute("data-fullscreen");
    if (mode === "overlay") {
      frame.setAttribute("role", "dialog");
      frame.setAttribute("aria-modal", "true");
      frame.setAttribute("aria-label", button.dataset.dialogLabel);
    } else {
      frame.removeAttribute("role");
      frame.removeAttribute("aria-modal");
      frame.removeAttribute("aria-label");
    }
    // One state, one announcement: the name changes between "open" and "exit" and there is no
    // pressed state, so a screen reader never says "exit fullscreen, toggle button, pressed".
    button.setAttribute("aria-label", button.dataset[active ? "exitAria" : "enterAria"]);
    if (label) label.textContent = button.dataset[active ? "exitLabel" : "enterLabel"];
    iconUse?.setAttribute("href", active ? "#i-shrink" : "#i-expand");
    trackHeight(active);
  }

  // The card's panel shell is as tall as the viewport minus --header-height. The card itself is a flex
  // child that takes what the bar leaves, so its own height is known: --header-height is whatever
  // makes the shell exactly that tall (100vh - h). No fixed bar height, no safe area arithmetic.
  function trackHeight(active) {
    const view = doc.defaultView;
    if (!card?.style || !view) return;
    const apply = () => {
      const height = card.clientHeight;
      if (height > 0) card.style.setProperty("--header-height", `calc(100vh - ${height}px)`);
    };
    if (active && !observer && typeof view.ResizeObserver === "function") {
      observer = new view.ResizeObserver(apply);
      observer.observe(card);
    }
    if (active) apply();
    else {
      observer?.disconnect();
      observer = null;
      card.style.removeProperty("--header-height");
    }
  }

  function focusButton() {
    button.focus({ preventScroll: true });
  }
  function restoreFocus() {
    const target = opener?.isConnected === false ? button : (opener ?? button);
    opener = null;
    target.focus({ preventScroll: true });
  }

  function openOverlay() {
    if (mode) return;
    mode = "overlay";
    lockPage();
    render();
    focusButton();
  }

  // The browser reports entering and leaving (including its own Escape), so state follows it.
  function onNativeChange() {
    const active = fullscreenElement() === frame;
    if (active && mode !== "native") {
      mode = "native";
      render();
      focusButton();
    } else if (!active && mode === "native") {
      mode = null;
      render();
      restoreFocus();
    }
  }
  function onNativeError() {
    if (!mode) openOverlay();
  }

  async function enter() {
    if (mode) return;
    opener = doc.activeElement ?? button;
    if (!nativeAllowed()) return openOverlay();
    try {
      await request().call(frame);
    } catch {
      openOverlay();
    }
  }
  async function exit() {
    if (mode === "native") {
      const leave = doc.exitFullscreen ?? doc.webkitExitFullscreen;
      try {
        await leave?.call(doc);
      } catch {
        // The change event still decides the state.
      }
      onNativeChange();
    } else if (mode === "overlay") {
      mode = null;
      unlockPage();
      render();
      restoreFocus();
    }
  }

  button.addEventListener("click", () => (mode ? exit() : enter()));
  doc.addEventListener("fullscreenchange", onNativeChange);
  doc.addEventListener("webkitfullscreenchange", onNativeChange);
  doc.addEventListener("fullscreenerror", onNativeError);
  doc.addEventListener("webkitfullscreenerror", onNativeError);
  doc.addEventListener("keydown", (event) => {
    if (mode !== "overlay" || event.key !== "Escape") return;
    if (event.defaultPrevented || cardDialogOpen()) return;
    event.preventDefault();
    exit();
  });
  render();
  // The static markup keeps the button hidden: it only shows once it is wired up.
  button.hidden = false;
  return { enter, exit, mode: () => mode };
}
