(function () {
  "use strict";

  const root = document.getElementById("lb-os");
  const boot = document.getElementById("lb-boot");
  const bootStatus = document.getElementById("lb-boot-status");
  const bootProgress = boot?.querySelector(".lb-boot-progress");
  const bootSegments = Array.from(bootProgress?.querySelectorAll("span") || []);
  const bootSkip = document.getElementById("lb-boot-skip");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let audioContext = null;
  let bootFinished = false;
  let progressIndex = 0;
  let bootTimer = null;

  const bootMessages = [
    "Contrôle des composants...",
    "Réveil du fer à souder...",
    "Montage du lecteur Atelier (C:)...",
    "Réglage du tube cathodique...",
    "Chargement des archives rétro...",
    "Bureau prêt. Bonne bidouille !"
  ];

  function isMuted() {
    try {
      return window.localStorage.getItem("lb-os-muted") === "true";
    } catch (error) {
      return false;
    }
  }

  function getAudioContext() {
    if (audioContext) return audioContext;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
    return audioContext;
  }

  function playTone(frequency, duration, volume, delay, wave) {
    if (isMuted()) return;
    const context = getAudioContext();
    if (!context) return;

    const startAt = context.currentTime + (delay || 0);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = wave || "square";
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume || .025, startAt + .006);
    gain.gain.exponentialRampToValueAtTime(.0001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + .02);
  }

  function playSound(name) {
    if (isMuted()) return;
    const context = getAudioContext();
    if (!context) return;
    if (context.state === "suspended") context.resume().catch(() => {});

    if (name === "start") {
      playTone(261.6, .11, .022, 0, "triangle");
      playTone(392, .13, .022, .09, "triangle");
      playTone(523.3, .19, .026, .18, "triangle");
    } else if (name === "open") {
      playTone(330, .045, .018, 0, "square");
      playTone(494, .065, .015, .035, "square");
    } else if (name === "toggle") {
      playTone(620, .055, .018, 0, "square");
    } else if (name === "error") {
      playTone(165, .09, .022, 0, "sawtooth");
      playTone(130, .12, .018, .09, "sawtooth");
    } else {
      playTone(860, .026, .013, 0, "square");
      playTone(540, .022, .009, .018, "square");
    }
  }

  function revealIcons() {
    root?.querySelectorAll(".lb-icon").forEach((icon, index) => {
      icon.style.setProperty("--lb-icon-order", String(index));
      icon.classList.add("lb-retro-icon-in");
    });
  }

  function finishBoot(fromGesture) {
    if (bootFinished) return;
    bootFinished = true;
    if (bootTimer) window.clearInterval(bootTimer);

    bootSegments.forEach((segment) => segment.classList.add("lb-is-loaded"));
    bootProgress?.setAttribute("aria-valuenow", "100");
    if (bootStatus) bootStatus.textContent = bootMessages[bootMessages.length - 1];
    if (fromGesture) playSound("start");

    document.body.classList.remove("lb-booting");
    document.body.classList.add("lb-boot-complete");
    root?.removeAttribute("aria-hidden");
    boot?.setAttribute("aria-hidden", "true");
    boot?.classList.add("lb-boot-done");
    revealIcons();

    window.setTimeout(() => {
      if (boot) boot.hidden = true;
      document.getElementById("lb-start-button")?.focus({ preventScroll: true });
    }, reduceMotion ? 20 : 300);
  }

  function advanceBoot() {
    if (bootFinished) return;
    if (progressIndex < bootSegments.length) {
      bootSegments[progressIndex].classList.add("lb-is-loaded");
      progressIndex += 1;
      const percent = Math.round((progressIndex / bootSegments.length) * 100);
      bootProgress?.setAttribute("aria-valuenow", String(percent));
      const messageIndex = Math.min(
        bootMessages.length - 2,
        Math.floor((progressIndex / bootSegments.length) * (bootMessages.length - 1))
      );
      if (bootStatus) bootStatus.textContent = bootMessages[messageIndex];
      return;
    }
    finishBoot(false);
  }

  function markNewWindows() {
    const layer = document.getElementById("lb-window-layer");
    if (!layer) return;
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement) || !node.matches(".lb-window")) return;
          node.classList.add("lb-retro-spawn");
          window.setTimeout(() => node.classList.remove("lb-retro-spawn"), 220);
          playSound("open");
        });
      });
    });
    observer.observe(layer, { childList: true });
  }

  function bindInterfaceSounds() {
    document.addEventListener("pointerdown", (event) => {
      if (boot && !boot.hidden && event.target !== bootSkip) return;
      const control = event.target.closest("button, [role='button'], input, select, textarea, a[href]");
      if (!control || control.matches(":disabled, [aria-disabled='true']")) return;
      playSound("click");
    }, { passive: true });

    document.addEventListener("keydown", (event) => {
      if (event.repeat || !["Enter", " "].includes(event.key)) return;
      if (event.target.closest("button, [role='button'], input[type='checkbox'], input[type='radio'], a[href]")) {
        playSound("click");
      }
    });

    document.getElementById("lb-volume-button")?.addEventListener("click", () => {
      window.setTimeout(() => {
        if (!isMuted()) playSound("toggle");
      }, 0);
    });
  }

  bootSkip?.addEventListener("click", () => finishBoot(true));
  bootSkip?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") finishBoot(true);
  });

  const interval = reduceMotion ? 45 : 190;
  bootTimer = window.setInterval(advanceBoot, interval);
  window.setTimeout(() => finishBoot(false), reduceMotion ? 650 : 2900);

  bindInterfaceSounds();
  markNewWindows();

  window.LABidouilleAudio = Object.freeze({
    play: playSound,
    isMuted
  });
})();
