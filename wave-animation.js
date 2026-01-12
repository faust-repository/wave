(() => {
  const canvas = document.getElementById("waves");
  if (!canvas) { console.error("[Waves] canvas #waves not found"); return; }
  const ctx = canvas.getContext("2d");

  const cfg = {
    stroke: "#ff3b1a",
    lineWidth: 1.15,
    stepPx: 2,

    // TODAS las ondas comparten el mismo carril (para cruzarse)
    centerY: 0.52,         // 0..1
    // micro separación (muy pequeña) para que no se vean siempre “encima”
    microOffsetPx: 10,     // px

    // Frecuencia base compartida: esto hace que se reencuentren y se crucen
    baseFreq: 1.15,        // ondas a lo ancho aprox (sube si quieres más cruces)
    baseSpeed: 0.60,       // velocidad general

    // “Respiración” (amplitud que crece y decrece)
    breatheSpeed: 0.45,    // velocidad de respiración
    breatheAmount: 0.35,   // 0..1 cuánto cambia la amplitud
  };

  // 3 líneas: misma base, distintos phase/speedMul/ampBase
  const lines = [
    { ampBase: 0.085, phase: 0.0,  speedMul: 1.00, alpha: 0.95, mo: -1 },
    { ampBase: 0.060, phase: 2.10, speedMul: 0.82, alpha: 0.85, mo:  0 },
    { ampBase: 0.095, phase: 4.15, speedMul: 0.65, alpha: 0.75, mo:  1 },
  ];

  let t0 = performance.now();

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = Math.max(1, Math.floor(rect.width  * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawOne(line, t, w, h) {
    const yBase = h * cfg.centerY + line.mo * cfg.microOffsetPx;

    // Amplitud base en px
    const A0 = h * line.ampBase;

    // Amplitud que “respira” (crece/decrece)
    const breathe = 1 + Math.sin(t * cfg.breatheSpeed + line.phase) * cfg.breatheAmount;
    const A = A0 * breathe;

    // k = radianes por pixel (misma freq para todos => cruces)
    const k = (Math.PI * 2 * cfg.baseFreq) / w;

    // velocidad individual
    const speed = cfg.baseSpeed * line.speedMul;

    // modulación adicional para más organicidad (sin romper el cruce)
    const k2 = k * 0.55;
    const k3 = k * 0.22;

    ctx.globalAlpha = line.alpha;
    ctx.beginPath();

    for (let x = -30; x <= w + 30; x += cfg.stepPx) {
      // Onda principal (compartida)
      const s1 = Math.sin(x * k + t * speed + line.phase);

      // “curvatura” secundaria (hace que sea menos matemática)
      const s2 = Math.sin(x * k2 - t * speed * 0.65 + line.phase * 0.7) * 0.22;

      // micro drift (muy suave)
      const s3 = Math.sin(x * k3 + t * speed * 0.35 + 1.3) * 0.10;

      const y = yBase + (s1 + s2 + s3) * A;

      if (x === -30) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.stroke();
  }

  function frame(now) {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    if (w < 2 || h < 2) { requestAnimationFrame(frame); return; }

    const t = (now - t0) / 1000;

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = cfg.stroke;
    ctx.lineWidth = cfg.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Orden: pinta “una encima de otra”
    drawOne(lines[0], t, w, h);
    drawOne(lines[1], t, w, h);
    drawOne(lines[2], t, w, h);

    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });
  requestAnimationFrame(frame);
})();
