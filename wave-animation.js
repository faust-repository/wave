(() => {
  const canvas = document.getElementById("waves");
  if (!canvas) {
    console.error("[Waves] canvas #waves not found");
    return;
  }
  const ctx = canvas.getContext("2d");

  // ====== CONFIG ======
  const cfg = {
    stroke: "#ff3b1a",
    lineWidth: 1.2,
    // altura base de las 3 líneas (0..1 del canvas)
    lines: [
      // Cada línea: y, amplitud, frecuencia, velocidad, fase, alpha
      { y: 0.45, amp: 0.035, freq: 1.15, speed: 0.65, phase: 0.0, alpha: 1.0 },
      { y: 0.52, amp: 0.055, freq: 0.85, speed: 0.45, phase: 1.8, alpha: 0.75 },
      { y: 0.60, amp: 0.085, freq: 0.62, speed: 0.30, phase: 3.1, alpha: 0.55 }
    ],
    // suavidad: menor = más puntos = más suave pero más CPU
    stepPx: 2,
    // extra “organic” (muy sutil)
    drift: 0.15
  };

  let t0 = performance.now();

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawLine(line, time, w, h) {
    const baseY = h * line.y;
    const amp = h * line.amp;

    // freq: cuántas ondas caben en el ancho (aprox)
    // Convertimos a “k” (radianes por pixel)
    const k = (Math.PI * 2 * line.freq) / w;

    ctx.globalAlpha = line.alpha;
    ctx.beginPath();

    // leve drift para que no sea matemático perfecto
    const drift = Math.sin(time * 0.7 + line.phase) * (cfg.drift * amp);

    for (let x = -20; x <= w + 20; x += cfg.stepPx) {
      const y =
        baseY +
        Math.sin(x * k + time * line.speed + line.phase) * amp +
        Math.sin(x * (k * 0.35) + time * (line.speed * 0.6)) * (amp * 0.18) +
        drift;

      if (x === -20) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.stroke();
  }

  function frame(now) {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    if (w < 2 || h < 2) {
      requestAnimationFrame(frame);
      return;
    }

    const t = (now - t0) / 1000;

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = cfg.stroke;
    ctx.lineWidth = cfg.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const line of cfg.lines) drawLine(line, t, w, h);

    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });
  requestAnimationFrame(frame);
})();
