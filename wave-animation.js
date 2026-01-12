(() => {
  const canvas = document.getElementById("waves");
  if (!canvas) { console.error("[Waves] canvas #waves not found"); return; }
  const ctx = canvas.getContext("2d");

  const cfg = {
    stroke: "#ff3b1a",
    lineWidth: 1.2,
    stepPx: 2,

    centerY: 0.52,         // carril central (0..1)
    microOffsetPx: 8,      // separación mínima entre líneas

    // Cruces (misma frecuencia base)
    baseFreq: 0.95,        // más bajo => ondas MÁS abiertas
    baseSpeed: 0.62,

    // Respiración global (crecen/decrecen en el tiempo)
    breatheSpeed: 0.55,
    breatheAmount: 0.85,   // MUY pronunciado (0..1+)

    // Envolvente a lo largo del ancho (x):
    // hace que “a medida que avanzan” se encojan y se hagan grandes
    envelopeTravelSpeed: 0.22, // velocidad con la que viaja la envolvente
    envelopeSharpness: 2.0,    // más alto => cambios más marcados
    envelopeMin: 0.25,         // amplitud mínima relativa
    envelopeMax: 1.55          // amplitud máxima relativa
  };

  const lines = [
    { ampBase: 0.16, phase: 0.0,  speedMul: 1.00, alpha: 0.95, mo: -1 },
    { ampBase: 0.12, phase: 2.1,  speedMul: 0.82, alpha: 0.85, mo:  0 },
    { ampBase: 0.18, phase: 4.15, speedMul: 0.65, alpha: 0.75, mo:  1 },
  ];

  let t0 = performance.now();

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = Math.max(1, Math.floor(rect.width  * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Envolvente suave que viaja por X: devuelve factor [envelopeMin..envelopeMax]
  function envelope(xNorm, t, phase) {
    // xNorm: 0..1
    // onda lenta que “se mueve” horizontalmente
    const v = Math.sin((xNorm * Math.PI * 2) - t * cfg.envelopeTravelSpeed + phase * 0.5);
    // “hacerla más marcada” sin perder suavidad
    const shaped = Math.sign(v) * Math.pow(Math.abs(v), 1 / cfg.envelopeSharpness);
    // map a rango deseado
    const m = (shaped * 0.5 + 0.5); // 0..1
    return cfg.envelopeMin + m * (cfg.envelopeMax - cfg.envelopeMin);
  }

  function drawOne(line, t, w, h) {
    const yBase = h * cfg.centerY + line.mo * cfg.microOffsetPx;

    // amplitud base en px (grande)
    const A0 = h * line.ampBase;

    // respiración temporal (muy visible)
    const breathe = 1 + Math.sin(t * cfg.breatheSpeed + line.phase) * cfg.breatheAmount;

    // frecuencia base compartida => se cruzan
    const k = (Math.PI * 2 * cfg.baseFreq) / w;
    const speed = cfg.baseSpeed * line.speedMul;

    // secundarios para organicidad (pero sin romper el look)
    const k2 = k * 0.52;
    const k3 = k * 0.18;

    ctx.globalAlpha = line.alpha;
    ctx.beginPath();

    for (let x = -30; x <= w + 30; x += cfg.stepPx) {
      const xNorm = (x + 30) / (w + 60); // 0..1 aprox

      // envolvente por X (lo que pediste: al avanzar se encoge y crece)
      const env = envelope(xNorm, t, line.phase);

      // amplitud final
      const A = A0 * breathe * env;

      // ondas (suaves)
      const s1 = Math.sin(x * k  + t * speed + line.phase);
      const s2 = Math.sin(x * k2 - t * speed * 0.62 + line.phase * 0.7) * 0.22;
      const s3 = Math.sin(x * k3 + t * speed * 0.30 + 1.3) * 0.10;

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

    drawOne(lines[0], t, w, h);
    drawOne(lines[1], t, w, h);
    drawOne(lines[2], t, w, h);

    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });
  requestAnimationFrame(frame);
})();
