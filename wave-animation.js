(() => {
  const canvas = document.getElementById("waves");
  if (!canvas) return;

  // Evita doble init en Webflow
  if (canvas.dataset.init === "1") return;
  canvas.dataset.init = "1";

  const ctx = canvas.getContext("2d", { alpha: true });

  // ====== RESONANCE SETTINGS ======
  const SETTINGS = {
    lines: 3,

    // Latente (casi plano)
    baseAmp: 2.0,            // px (muy sutil)
    baseSpeed: 0.18,         // lento
    baseFreq: 0.0085,        // ondas largas (limpias)

    // Resonancia al hover
    hoverAmp: 55,            // px extra (amplificación fuerte pero elegante)
    hoverRadius: 240,        // radio de influencia (más grande = más “campo”)
    hoverSmooth: 0.08,       // suavizado de energía (más bajo = más suave / lento)

    // Comunidad (la señal afecta a varias)
    coupling: 0.34,          // 0..1

    // Render
    samples: 240,
    lineWidth: 1.6,

    // Estética
    color: "rgba(255,59,26,0.95)", // naranja/rojo como tu ejemplo (cámbialo)
    bg: "transparent",

    // Respiración global (muy lenta)
    breatheAmp: 0.20,        // afecta solo a baseAmp (no rompe la forma)
    breatheSpeed: 0.00035,   // frecuencia en "ms" del now (más bajo = más lento)

    // Para que se crucen y estén más unidas
    bandCenter: 0.52,        // 0..1 (posición vertical del carril)
    microOffset: 10,         // px separación mínima entre las 3 (bájalo si quieres más cruces)

    // Levantar localmente cerca del cursor (resonancia localizada)
    localLift: 1.25,         // 1..2 (cuánto se levanta en la zona del cursor)
    localFalloff: 1.15       // >1 hace caída más suave
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

  // Cursor state (coords canvas)
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

  // Energía por línea (0..1) + velocidad (spring)
  const energy = new Array(SETTINGS.lines).fill(0);
  const energyVel = new Array(SETTINGS.lines).fill(0);

  // Fase independiente por línea (para que no sean clones)
  const phase = Array.from({ length: SETTINGS.lines }, (_, i) => Math.random() * Math.PI * 2 + i * 1.2);

  // ligeras variaciones (muy pequeñas) para que se crucen y no sean idénticas
  const freqJitter = Array.from({ length: SETTINGS.lines }, () => 0.96 + Math.random() * 0.08);
  const speedJitter = Array.from({ length: SETTINGS.lines }, () => 0.92 + Math.random() * 0.10);

  let tPrev = performance.now();

  function frame(now) {
    const dt = Math.min(0.033, (now - tPrev) / 1000);
    tPrev = now;

    const rect = canvas.getBoundingClientRect();
    const W = Math.max(1, rect.width);
    const H = Math.max(1, rect.height);

    // Fondo
    if (SETTINGS.bg !== "transparent") {
      ctx.fillStyle = SETTINGS.bg;
      ctx.fillRect(0, 0, W, H);
    } else {
      ctx.clearRect(0, 0, W, H);
    }

    // 3 líneas casi en el mismo carril (para cruces)
    const yMid = H * SETTINGS.bandCenter;
    const yLines = [
      yMid - SETTINGS.microOffset,
      yMid,
      yMid + SETTINGS.microOffset
    ];

    // Target energy por línea (según distancia vertical al carril)
    const target = new Array(SETTINGS.lines).fill(0);

    for (let i = 0; i < SETTINGS.lines; i++) {
      if (!pointer.inside) { target[i] = 0; continue; }

      const dy = Math.abs(pointer.y - yLines[i]);
      const dx = Math.abs(pointer.x - W * 0.5);

      // Distancia ponderada (importa más la cercanía vertical)
      const dist = Math.sqrt(dy * dy + (dx * 0.35) * (dx * 0.35));
      const n = 1 - Math.min(1, dist / SETTINGS.hoverRadius);

      // curva suave premium
      target[i] = n * n;
    }

    // Suavizado + coupling entre líneas (propagación)
    for (let i = 0; i < SETTINGS.lines; i++) {
      const left = i > 0 ? energy[i - 1] : energy[i];
      const right = i < SETTINGS.lines - 1 ? energy[i + 1] : energy[i];
      const neighborMean = (left + right) * 0.5;

      const coupledTarget = lerp(target[i], neighborMean, SETTINGS.coupling);

      // Spring suave (evita nerviosismo)
      const accel = (coupledTarget - energy[i]) * (6.0 * SETTINGS.hoverSmooth);
      energyVel[i] += accel;
      energyVel[i] *= 0.86; // damping
      energy[i] += energyVel[i];

      energy[i] = clamp01(energy[i]);
    }

    // Estilo de dibujo
    ctx.strokeStyle = SETTINGS.color;
    ctx.lineWidth = SETTINGS.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // respiración global suave (solo afecta baseAmp)
    const breathe = 0.85 + 0.15 * Math.sin(now * SETTINGS.breatheSpeed);

    for (let i = 0; i < SETTINGS.lines; i++) {
      const yLine = yLines[i];

      // Amplitud: latente + resonancia
      const amp =
        (SETTINGS.baseAmp * (1 + SETTINGS.breatheAmp * breathe)) +
        (SETTINGS.hoverAmp * energy[i]);

      // Frecuencia (limpia) + jitter mínimo
      const freq = SETTINGS.baseFreq * freqJitter[i];

      // Avance de fase: lento; si hay energía, acelera un poco (se siente “resonancia”)
      phase[i] += dt * SETTINGS.baseSpeed * speedJitter[i] * (1.0 + energy[i] * 0.65);

      ctx.beginPath();

      for (let s = 0; s <= SETTINGS.samples; s++) {
        const x = (s / SETTINGS.samples) * W;

        // Resonancia localizada cerca del cursor (pero limpia)
        let localBoost = 1;
        if (pointer.inside) {
          const d = Math.abs(x - pointer.x);
          const m = 1 - Math.min(1, d / (SETTINGS.hoverRadius * SETTINGS.localFalloff));
          localBoost = 1 + (SETTINGS.localLift - 1) * (m * m) * energy[i];
        }

        // Onda limpia (solo seno)
        const y = yLine + Math.sin(x * freq + phase[i]) * amp * localBoost;

        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.stroke();
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();


