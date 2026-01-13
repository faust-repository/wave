
(() => {
  const canvas = document.getElementById("waves");
  if (!canvas) return;

  // Evita doble init en Webflow
  if (canvas.dataset.init === "1") return;
  canvas.dataset.init = "1";

  const ctx = canvas.getContext("2d", { alpha: true });

  // ====== Ajustes (tócalos si quieres) ======
  const SETTINGS = {
    lines: 3,
    // Ondulación base (muy sutil)
    baseAmp: 6,           // px
    baseSpeed: 0.35,      // movimiento global
    baseFreq: 0.010,      // frecuencia de onda (más bajo = ondas más largas)
    // Cuando el cursor pasa cerca (amplificación fuerte)
    hoverAmp: 75,         // px extra (esto hace la onda "pronunciada")
    hoverRadius: 180,     // px de influencia del cursor
    hoverSmooth: 0.10,    // suavizado de la energía
    // Propagación entre líneas (concepto comunidad)
    coupling: 0.28,       // 0..1
    // Render
    samples: 220,         // puntos por línea (más = más suave, más CPU)
    lineWidth: 2,
    // Estética
    color: "rgba(255,255,255,0.85)",
    bg: "transparent",
    // Motion
    breatheAmp: 0.35,     // "respiración" lenta de amplitud
  };

  // ====== Helpers ======
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function clamp01(v){ return Math.max(0, Math.min(1, v)); }
  function lerp(a,b,t){ return a + (b-a)*t; }

  // Cursor state (en coords del canvas)
  let pointer = { x: 0, y: 0, inside: false };
  canvas.addEventListener("mousemove", (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
    pointer.inside = true;
  }, { passive: true });

  canvas.addEventListener("mouseleave", () => {
    pointer.inside = false;
  }, { passive: true });

  window.addEventListener("resize", resize, { passive: true });
  resize();

  // Energía por línea (se acopla entre ellas)
  const energy = new Array(SETTINGS.lines).fill(0); // 0..1
  const energyVel = new Array(SETTINGS.lines).fill(0);

  // Fase independiente por línea (para que no sean clones)
  const phase = Array.from({ length: SETTINGS.lines }, (_, i) => Math.random() * Math.PI * 2 + i * 0.8);
  const freqJitter = Array.from({ length: SETTINGS.lines }, (_, i) => 0.85 + Math.random() * 0.4);

  let t0 = performance.now();

  function frame(now) {
    const dt = Math.min(0.033, (now - t0) / 1000);
    t0 = now;

    const rect = canvas.getBoundingClientRect();
    const W = Math.max(1, rect.width);
    const H = Math.max(1, rect.height);

    // Background
    if (SETTINGS.bg !== "transparent") {
      ctx.fillStyle = SETTINGS.bg;
      ctx.fillRect(0, 0, W, H);
    } else {
      ctx.clearRect(0, 0, W, H);
    }

    // Posiciones verticales de las 3 líneas
    const topPad = H * 0.28;
    const gap = (H - topPad * 2) / (SETTINGS.lines - 1 || 1);

    // Cursor influence → targetEnergy por línea (según distancia a esa línea)
    const target = new Array(SETTINGS.lines).fill(0);

    for (let i = 0; i < SETTINGS.lines; i++) {
      const yLine = topPad + gap * i;
      if (!pointer.inside) { target[i] = 0; continue; }

      const dy = Math.abs(pointer.y - yLine);
      const dx = Math.abs(pointer.x - W * 0.5);

      // Distancia ponderada: queremos que influya por cercanía vertical
      const dist = Math.sqrt(dy * dy + (dx * 0.35) * (dx * 0.35));
      const n = 1 - Math.min(1, dist / SETTINGS.hoverRadius);
      // curva suave (más "premium" que lineal)
      target[i] = n * n;
    }

    // Suavizado + coupling (propagación entre líneas)
    for (let i = 0; i < SETTINGS.lines; i++) {
      // coupling simple con vecinos
      const left = i > 0 ? energy[i - 1] : energy[i];
      const right = i < SETTINGS.lines - 1 ? energy[i + 1] : energy[i];
      const neighborMean = (left + right) * 0.5;

      const coupledTarget = lerp(target[i], neighborMean, SETTINGS.coupling);
      // spring suave para que "entre" y "salga" bonito
      const accel = (coupledTarget - energy[i]) * 8.0;
      energyVel[i] += accel * dt;
      energyVel[i] *= 0.86; // damping
      energy[i] += energyVel[i];

      // clamp
      energy[i] = clamp01(energy[i]);
    }

    // Dibujo
    ctx.strokeStyle = SETTINGS.color;
    ctx.lineWidth = SETTINGS.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // respiración global
    const breathe = 0.65 + 0.35 * Math.sin(now * 0.00055);

    for (let i = 0; i < SETTINGS.lines; i++) {
      const yLine = topPad + gap * i;

      // amplitud base + amplificación por energía (fuerte)
      const amp = SETTINGS.baseAmp * (1 + SETTINGS.breatheAmp * breathe) + SETTINGS.hoverAmp * energy[i];

      // frecuencia: base con jitter por línea
      const freq = SETTINGS.baseFreq * freqJitter[i];

      // velocidad/fase
      phase[i] += dt * SETTINGS.baseSpeed * (1.0 + energy[i] * 0.9);

      ctx.beginPath();

      for (let s = 0; s <= SETTINGS.samples; s++) {
        const x = (s / SETTINGS.samples) * W;

        // Modulación extra localizada cerca del cursor (onda se “levanta” donde pasas)
        let localBoost = 1;
        if (pointer.inside) {
          const d = Math.abs(x - pointer.x);
          const m = 1 - Math.min(1, d / (SETTINGS.hoverRadius * 1.15));
          localBoost = 1 + 0.9 * (m * m) * energy[i];
        }

        // Onda principal (limpia)
        const y =
          yLine +
          Math.sin(x * freq + phase[i]) * amp * localBoost;

        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.stroke();
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();

