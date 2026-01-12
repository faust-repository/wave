(() => {
  const canvas = document.getElementById("waves");
  if (!canvas) {
    console.error("[Waves] canvas #waves not found");
    return;
  }

  const ctx = canvas.getContext("2d");

  // ----- Settings -----
  const cfg = {
    height: 220,          // debe coincidir con tu CSS (o lo calcula por rect)
    lineWidth: 1.2,
    // color naranja limpio (ajústalo si quieres)
    stroke: "#ff3b1a",
    // movimiento
    speed: 0.55,          // velocidad general
    // composición
    baseY: 0.52,          // altura central (0..1)
    // ondas: amplitud, frecuencia, offset
    waves: [
      { amp: 0.18, freq: 1.05, phase: 0.0, alpha: 1.0 },
      { amp: 0.12, freq: 0.85, phase: 1.7, alpha: 0.85 },
      { amp: 0.09, freq: 1.35, phase: 3.2, alpha: 0.65 }
    ],
    // “suavidad” del trazo (resolución)
    step: 2
  };

  let rafId = null;
  let t0 = performance.now();

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawWave(w, time, width, height) {
    const midY = height * cfg.baseY;
    const amp = height * w.amp;
    const k = (Math.PI * 2 * w.freq) / width; // frecuencia por px

    ctx.globalAlpha = w.alpha;
    ctx.beginPath();

    // empieza un pelín fuera para que no se note el corte
    for (let x = -20; x <= width + 20; x += cfg.step) {
      const y = midY + Math.sin(x * k + time + w.phase) * amp;
      if (x === -20) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.stroke();
  }

  function frame(now) {
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // si el canvas es “0x0” (por display none), no pintes
    if (width < 2 || height < 2) {
      rafId = requestAnimationFrame(frame);
      return;
    }

    const time = ((now - t0) / 1000) * cfg.speed;

    // limpiar (transparente: no pinta fondo)
    ctx.clearRect(0, 0, width, height);

    ctx.lineWidth = cfg.lineWidth;
    ctx.strokeStyle = cfg.stroke;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // 3 ondas
    for (const w of cfg.waves) drawWave(w, time, width, height);

    rafId = requestAnimationFrame(frame);
  }

  // init
  resize();
  window.addEventListener("resize", resize, { passive: true });

  rafId = requestAnimationFrame(frame);
})();
