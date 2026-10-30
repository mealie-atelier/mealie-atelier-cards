// Interactions of the public demo site: header state, drawer, scroll reveals, counters,
// parallax, the before/after slider, the scroll stage and the hero timer.
// Everything degrades to a static page when JavaScript or motion is unavailable.
const root = document.documentElement;
const motion = window.matchMedia("(prefers-reduced-motion: no-preference)");
const reduced = () => !motion.matches;
root.classList.add("js");

// Header shadow and reading progress.
const header = document.querySelector(".top");
const progress = document.querySelector(".progress");
function onScroll() {
  const max = root.scrollHeight - innerHeight;
  header?.classList.toggle("scrolled", scrollY > 12);
  if (progress) progress.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
}
addEventListener("scroll", onScroll, { passive: true });
onScroll();

// Mobile drawer with Escape and outside click.
const menu = document.querySelector(".menu-btn");
const drawer = document.getElementById("drawer");
function setDrawer(open) {
  if (!menu || !drawer) return;
  menu.setAttribute("aria-expanded", String(open));
  menu.setAttribute("aria-label", menu.dataset[open ? "closeLabel" : "openLabel"]);
  menu.querySelector("use")?.setAttribute("href", open ? "#i-close" : "#i-menu");
  drawer.hidden = !open;
  header?.classList.toggle("open", open);
  // The open drawer covers the page, so everything behind it leaves the tab order.
  for (const part of document.body.children) {
    if (part === header || part.tagName === "SCRIPT") continue;
    part.inert = open;
  }
}
function drawerFocusables() {
  return [...header.querySelectorAll("a[href], button, input, select, textarea")].filter(
    (element) => !element.closest("[hidden]") && element.getClientRects().length > 0,
  );
}
menu?.addEventListener("click", () => setDrawer(menu.getAttribute("aria-expanded") !== "true"));
drawer?.addEventListener("click", (event) => {
  if (event.target.closest("a")) setDrawer(false);
});
// Keep Tab inside the header while the drawer is open.
addEventListener("keydown", (event) => {
  if (event.key !== "Tab" || !header || menu?.getAttribute("aria-expanded") !== "true") return;
  const items = drawerFocusables();
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (!header.contains(document.activeElement)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu?.getAttribute("aria-expanded") === "true") {
    setDrawer(false);
    menu.focus();
  }
});
matchMedia("(min-width: 1001px)").addEventListener("change", (event) => {
  if (event.matches) setDrawer(false);
});

// Counters count up once when they enter the viewport.
function countUp(element) {
  const target = Number(element.dataset.count);
  if (reduced() || !target) return;
  const start = performance.now();
  const duration = 900;
  const frame = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    element.textContent = String(Math.round(target * (1 - Math.pow(1 - progress, 3))));
    if (progress < 1) requestAnimationFrame(frame);
  };
  element.textContent = "0";
  requestAnimationFrame(frame);
}

// Reveal on scroll. Elements already on screen at load stay visible without a jump.
const revealables = [...document.querySelectorAll(".rv")];
if ("IntersectionObserver" in window && !reduced()) {
  root.classList.add("reveal-ready");
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const target = entry.target;
        observer.unobserve(target);
        // Two frames: the hidden start state has to be painted first, otherwise an element that is on
        // screen at load jumps straight to its end state and the entrance never plays.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            target.classList.add("in");
            target.querySelectorAll("[data-count]").forEach(countUp);
          }),
        );
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );
  revealables.forEach((element) => observer.observe(element));
} else {
  revealables.forEach((element) => element.classList.add("in"));
}

// Gentle parallax on wide screens only.
const layers = [...document.querySelectorAll("[data-speed]")];
let ticking = false;
function parallax() {
  ticking = false;
  const active = !reduced() && innerWidth >= 700;
  for (const layer of layers) {
    if (!active) {
      layer.style.removeProperty("--py");
      continue;
    }
    // The box already includes the current translation, so take it out before measuring.
    const current = Number.parseFloat(layer.style.getPropertyValue("--py")) || 0;
    const box = layer.getBoundingClientRect();
    const raw =
      (box.top - current + box.height / 2 - innerHeight / 2) * Number(layer.dataset.speed);
    const offset = Math.max(-36, Math.min(36, raw));
    layer.style.setProperty("--py", `${offset.toFixed(1)}px`);
  }
}
if (layers.length) {
  addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(parallax);
      }
    },
    { passive: true },
  );
  addEventListener("resize", parallax);
  motion.addEventListener("change", parallax);
  parallax();
}

// Before/after slider: native range input for keyboard and screen readers, pointer
// dragging anywhere on the image for mouse and touch.
for (const slider of document.querySelectorAll("[data-ba]")) {
  const input = slider.querySelector('input[type="range"]');
  const template = slider.dataset.valuetext || "{a} / {b}";
  // On phones the two shots are different layouts, so any divider in the middle cuts text in
  // half. There the handle settles on a whole picture (the new interface first) when released.
  const phone = matchMedia("(max-width: 700px)");
  const rest = () => (phone.matches ? 0 : 46);
  const tags = [...document.querySelectorAll("[data-ba-show]")];
  let swept = false;
  const set = (value) => {
    const position = Math.max(0, Math.min(100, Math.round(value)));
    slider.style.setProperty("--pos", `${position}%`);
    input.value = String(position);
    for (const tag of tags) {
      tag.setAttribute(
        "aria-pressed",
        String(position === (tag.dataset.baShow === "before" ? 100 : 0)),
      );
    }
    input.setAttribute(
      "aria-valuetext",
      template.replace("{a}", String(position)).replace("{b}", String(100 - position)),
    );
  };
  const fromPointer = (event) => {
    const box = slider.getBoundingClientRect();
    set(((event.clientX - box.left) / box.width) * 100);
  };
  input.addEventListener("input", () => {
    swept = true;
    set(Number(input.value));
  });
  slider.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    swept = true;
    slider.classList.add("dragging");
    slider.setPointerCapture(event.pointerId);
    fromPointer(event);
    input.focus({ preventScroll: true });
  });
  slider.addEventListener("pointermove", (event) => {
    if (slider.hasPointerCapture(event.pointerId)) fromPointer(event);
  });
  const release = (event) => {
    slider.classList.remove("dragging");
    if (slider.hasPointerCapture(event.pointerId)) slider.releasePointerCapture(event.pointerId);
    if (phone.matches) {
      slider.classList.add("settling");
      set(Number(input.value) < 50 ? 0 : 100);
      setTimeout(() => slider.classList.remove("settling"), 420);
    }
  };
  for (const tag of tags) {
    tag.addEventListener("click", () => {
      swept = true;
      slider.classList.add("settling");
      set(tag.dataset.baShow === "before" ? 100 : 0);
      setTimeout(() => slider.classList.remove("settling"), 420);
    });
  }
  slider.addEventListener("pointerup", release);
  slider.addEventListener("pointercancel", release);
  set(rest());
  phone.addEventListener("change", () => set(rest()));
  // One gentle sweep the first time the slider is seen, so people notice it moves.
  if ("IntersectionObserver" in window && !reduced()) {
    const hint = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        hint.disconnect();
        const start = performance.now();
        const sweep = (now) => {
          if (swept) return;
          const t = Math.min(1, (now - start) / 1600);
          const base = rest();
          set(
            phone.matches
              ? base + Math.sin(t * Math.PI) * 70
              : base + Math.sin(t * Math.PI * 2) * 16 * (1 - t),
          );
          if (t < 1) requestAnimationFrame(sweep);
          else set(base);
        };
        setTimeout(() => requestAnimationFrame(sweep), 350);
      },
      { threshold: 0.5 },
    );
    hint.observe(slider);
  }
}

// Scroll stage: the step closest to the middle of the screen picks the picture.
const story = document.querySelector(".story");
if (story && "IntersectionObserver" in window) {
  const shots = [...story.querySelectorAll(".shot")];
  const dots = [...story.querySelectorAll(".stage-dots i")];
  const steps = [...story.querySelectorAll(".step")];
  const activate = (index) => {
    shots.forEach((shot, i) => shot.classList.toggle("active", i === index));
    dots.forEach((dot, i) => dot.classList.toggle("on", i === index));
    steps.forEach((step, i) => step.classList.toggle("current", i === index));
  };
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) activate(Number(entry.target.dataset.step));
      }
    },
    { rootMargin: "-45% 0px -45% 0px" },
  );
  steps.forEach((step) => observer.observe(step));
  activate(0);
}

// Live demo frame: a calm placeholder until the card has rendered its first view.
const liveFrame = document.querySelector(".live-frame");
const liveCard = liveFrame?.querySelector("mealie-atelier-card");
if (liveFrame && liveCard) {
  const markReady = () => liveFrame.setAttribute("data-ready", "");
  const started = performance.now();
  const poll = () => {
    const rendered = (liveCard.shadowRoot?.querySelectorAll("button").length ?? 0) > 2;
    if (rendered || performance.now() - started > 8000) markReady();
    else requestAnimationFrame(poll);
  };
  poll();
}

// Fullscreen for the live demo: Fullscreen API where available, a viewport overlay on iPhone.
const liveFullscreen = liveFrame?.querySelector(".live-fs");
if (liveFrame && liveCard && liveFullscreen) {
  // Loaded on its own so this script does not wait for a second file before the page reveals.
  import("./live-fullscreen.js").then(({ setupLiveFullscreen }) =>
    setupLiveFullscreen({ frame: liveFrame, button: liveFullscreen, card: liveCard }),
  );
}
