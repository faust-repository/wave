(() => {
  const canvas = document.getElementById("waves");
  if (!canvas) { console.error("[Waves] canvas #waves not found"); return; }
  const ctx = canvas.getContext("2d");

  const cfg = {
    stroke: "#ff3b1a",
    lineWidth: 1.15,     // mismo grosor en todas
    stepPx: 2,
    // zona donde viven las ondas (en la imagen es una franja, aquí lo centramos)
    bandCenter: 0.50,    // 0..1
    bandSpread: 0.12,    // separacion vertical entre lineas (0..1)
    // frecuencia base compartida -> hace que se crucen entre sí
    baseFreq: 1.35,      // “cuántas ondas” a lo ancho aprox
    baseSpeed: 0.55      // velocidad base
  };

  // 3 líneas: MISMO freq base, distinta fase/amplitud/speedMultiplier
  const lines = [
    { offset: -1, amp: 0.070, phase: 0.0,  speedMul: 1.00, alpha: 0.95 },
    { offset:  0, amp: 0.050, phase: 2.15, speedMul: 0.78, alpha: 0.85 },
    { offset:  1, amp: 0.085, phase: 4.10, speedMul: 0.62, alpha: 0.75 }
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
    // y base por línea (todas en una franja como tu imagen)
    const mid = h * cfg.bandCenter;
    const y0 = mid + (line.offset * h * cfg.bandSpread);

    const A = h * line.amp;
    const k = (Math.PI * 2 * cfg.baseFreq) / w; // freq compartida => cruces
    const speed = cfg.baseSpeed * line.speedMul;

    // “respiración” muy sutil para que se note movimiento orgánico
    const breath = 1 + 0.10 * Math.sin(t * 0.55 + line.phase);
    const A2 = A * breath;

    ctx.globalAlpha = line.alpha;
    ctx.beginPath();

    for (let x = -30; x <= w + 30; x += cfg.stepPx) {
      // onda principal (misma freq para todos)
      const s1 = Math.sin(x * k + t * speed + line.phase);

      // pequeña modulación secundaria (para que no sea matemático perfecto)
      const s2 = Math.sin(x * (k * 0.45) - t * (speed * 0.65) + line.phase * 0.7);

      const y = y0 + s1 * A2 + s2 * (A2 * 0.18);

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

    // orden: así se superponen como en la imagen (una encima de otra)
    drawOne(lines[0], t, w, h);
    drawOne(lines[1], t, w, h);
    drawOne(lines[2], t, w, h);

    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });
  requestAnimationFrame(frame);
})();
