const INSTALL_COPY = {
  de: {
    label: "App installieren",
    title: "Dein Küchenstudio. Immer griffbereit.",
    intro: "Lege Mealie Atelier auf deinen Home-Bildschirm und öffne es wie eine App.",
    note: "Die Installation ändert nichts an deinem Mealie-Konto oder deiner privaten Server-Adresse.",
    action: "Jetzt installieren",
    later: "Später",
    close: "Schließen",
    ios: [
      "Öffne diese Seite in Safari oder ab iOS 16.4 in einem beliebigen Browser.",
      "Tippe auf Teilen und wähle „Zum Home-Bildschirm“ aus. Falls nötig: „Mehr“ öffnen.",
      "Lass „Als Web-App öffnen“ aktiviert und tippe auf „Hinzufügen“.",
    ],
    prompt: [
      "Tippe auf „Jetzt installieren“ und bestätige den Dialog deines Browsers.",
      "Atelier erscheint danach wie eine eigene App auf deinem Gerät.",
    ],
    menu: [
      "Öffne das Browser-Menü und wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“.",
      "Bestätige den Dialog. Der genaue Menüname hängt von Browser und Gerät ab.",
    ],
    desktop: [
      "Nutze „App installieren“ in der Adressleiste oder im Browser-Menü.",
      "Bestätige den Dialog, um Atelier in einem eigenen Fenster zu öffnen.",
    ],
    introDesktop: "Öffne Mealie Atelier wie eine App in einem eigenen Fenster.",
    safariDesktop: [
      "Wähle in Safari „Ablage“ > „Zum Dock hinzufügen“. Das braucht macOS Sonoma oder neuer.",
      "Bestätige den Namen. Atelier öffnet danach in einem eigenen Fenster.",
    ],
    introUnsupported: "Dieser Browser kann Mealie Atelier am Computer nicht als App installieren.",
    firefoxDesktop: [
      "Firefox installiert Web-Apps am Computer nicht.",
      "Öffne Mealie Atelier in Chrome, Edge oder Safari, um es als App zu installieren, oder speichere die Seite als Lesezeichen.",
    ],
  },
  en: {
    label: "Install app",
    title: "Your kitchen studio, always close.",
    intro: "Add Mealie Atelier to your Home Screen and open it like an app.",
    note: "Installing does not change your Mealie account or private server address.",
    action: "Install now",
    later: "Later",
    close: "Close",
    ios: [
      "Open this page in Safari, or in any browser on iOS 16.4 or later.",
      "Tap Share, then choose “Add to Home Screen”. Open “More” if needed.",
      "Keep “Open as Web App” enabled and tap “Add”.",
    ],
    prompt: [
      "Tap “Install now” and confirm your browser’s prompt.",
      "Atelier will then open like its own app on your device.",
    ],
    menu: [
      "Open your browser menu and choose “Install app” or “Add to Home Screen”.",
      "Confirm the prompt. The exact wording depends on your browser and device.",
    ],
    desktop: [
      "Use “Install app” in the address bar or browser menu.",
      "Confirm the prompt to open Atelier in its own window.",
    ],
    introDesktop: "Open Mealie Atelier like an app in its own window.",
    safariDesktop: [
      "In Safari, choose “File” > “Add to Dock”. This needs macOS Sonoma or later.",
      "Confirm the name. Atelier then opens in its own window.",
    ],
    introUnsupported: "This browser cannot install Mealie Atelier as an app on a computer.",
    firefoxDesktop: [
      "Firefox does not install web apps on a computer.",
      "Open Mealie Atelier in Chrome, Edge or Safari to install it as an app, or bookmark the page.",
    ],
  },
};

export function getInstallContext(navigatorRef = {}, windowRef = {}) {
  const userAgent = navigatorRef.userAgent || "";
  const platform = navigatorRef.platform || "";
  const isAppleMobile =
    /iPhone|iPad|iPod/i.test(userAgent) ||
    (platform === "MacIntel" && (navigatorRef.maxTouchPoints || 0) > 1);
  const isStandalone = Boolean(
    navigatorRef.standalone ||
      windowRef.matchMedia?.("(display-mode: standalone)")?.matches ||
      windowRef.matchMedia?.("(display-mode: fullscreen)")?.matches,
  );
  const isDesktop = !isAppleMobile && !/Android/i.test(userAgent);
  const isFirefoxDesktop = isDesktop && /Firefox/i.test(userAgent);
  const isSafariDesktop =
    isDesktop &&
    /Macintosh|Mac OS X/i.test(userAgent) &&
    /Safari\//i.test(userAgent) &&
    !/Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS/i.test(userAgent) &&
    (navigatorRef.maxTouchPoints || 0) <= 1;
  return {
    isAppleMobile,
    isStandalone,
    isIOSBrowserWithoutPrompt: isAppleMobile && !isStandalone,
    isDesktop,
    isFirefoxDesktop,
    isSafariDesktop,
  };
}

export function getInstallCopy(language = "de", context = {}) {
  const copy = INSTALL_COPY[language.toLowerCase().startsWith("en") ? "en" : "de"];
  const steps = context.isIOSBrowserWithoutPrompt
    ? copy.ios
    : context.canPrompt
      ? copy.prompt
      : context.isFirefoxDesktop
        ? copy.firefoxDesktop
        : context.isSafariDesktop
          ? copy.safariDesktop
          : context.isDesktop
            ? copy.desktop
            : copy.menu;
  // "Home Screen" only makes sense on a phone or tablet.
  const intro = context.isFirefoxDesktop
    ? copy.introUnsupported
    : context.isDesktop
      ? copy.introDesktop
      : copy.intro;
  return { ...copy, intro, steps };
}

export function initPwaInstall({
  documentRef = globalThis.document,
  navigatorRef = globalThis.navigator,
  windowRef = globalThis.window,
} = {}) {
  const trigger = documentRef?.querySelector("#pwa-install-trigger");
  const dialog = documentRef?.querySelector("#pwa-install-dialog");
  if (!trigger || !dialog || typeof dialog.showModal !== "function") return null;

  const closeButtons = dialog.querySelectorAll("[data-install-close]");
  const stepsList = dialog.querySelector("[data-install-steps]");
  const primaryAction = dialog.querySelector("[data-install-action]");
  const copyNodes = {
    label: trigger.querySelector("[data-install-label]"),
    title: dialog.querySelector("[data-install-title]"),
    intro: dialog.querySelector("[data-install-intro]"),
    note: dialog.querySelector("[data-install-note]"),
    later: dialog.querySelector("[data-install-later]"),
  };
  const context = getInstallContext(navigatorRef, windowRef);
  let language = navigatorRef.language || documentRef.documentElement.lang || "de";
  let deferredPrompt = null;
  let copy = getInstallCopy(language, context);

  if (context.isStandalone) {
    trigger.hidden = true;
    return { context, dispose() {} };
  }

  const render = () => {
    copy = getInstallCopy(language, { ...context, canPrompt: Boolean(deferredPrompt) });
    for (const [key, node] of Object.entries(copyNodes)) {
      if (node) node.textContent = copy[key];
    }
    for (const button of closeButtons) {
      // The visible "Later" text is the accessible name of the secondary button (WCAG 2.5.3).
      if (button.hasAttribute("data-install-later")) continue;
      button.setAttribute("aria-label", copy.close);
    }
    stepsList?.replaceChildren(
      ...copy.steps.map((step) => {
        const item = documentRef.createElement("li");
        item.textContent = step;
        return item;
      }),
    );
    if (primaryAction) {
      primaryAction.hidden = !deferredPrompt;
      primaryAction.textContent = copy.action;
    }
    trigger.hidden = false;
  };

  const handleInstallAvailable = (event) => {
    event.preventDefault();
    deferredPrompt = event;
    render();
  };
  const handleAppInstalled = () => {
    deferredPrompt = null;
    trigger.hidden = true;
    if (dialog.open) dialog.close();
  };
  const openDialog = () => {
    render();
    dialog.showModal();
    dialog.querySelector("[data-install-action]:not([hidden])")?.focus();
  };
  const closeDialog = () => dialog.close();
  const install = async () => {
    if (!deferredPrompt) return;
    const promptEvent = deferredPrompt;
    deferredPrompt = null;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice?.outcome === "accepted") {
      trigger.hidden = true;
      dialog.close();
    } else {
      render();
    }
  };

  render();
  windowRef.addEventListener("beforeinstallprompt", handleInstallAvailable);
  windowRef.addEventListener("appinstalled", handleAppInstalled);
  trigger.addEventListener("click", openDialog);
  closeButtons.forEach((button) => button.addEventListener("click", closeDialog));
  primaryAction?.addEventListener("click", install);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
  });

  return {
    context,
    refresh(nextLanguage = language) {
      language = nextLanguage;
      render();
    },
    dispose() {
      windowRef.removeEventListener("beforeinstallprompt", handleInstallAvailable);
      windowRef.removeEventListener("appinstalled", handleAppInstalled);
      trigger.removeEventListener("click", openDialog);
      closeButtons.forEach((button) => button.removeEventListener("click", closeDialog));
      primaryAction?.removeEventListener("click", install);
    },
  };
}
