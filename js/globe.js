// Translucent dotted globe on a 2D canvas.
// Legacy fuel routes run in amber; tracked startups glow in mint.
// setEra(0..1) fades one system out and the other in.
// lon sets the longitude facing the viewer at start; spin: false holds it there.
// labels: [{ lon, lat, text, side: 'legacy' | 'next' }] are captions that appear at each end of the era.
function createGlobe(canvas, { routes, nodes, onHover, onPick, lon = 62, spin = true, labels = [] }) {
  const LAND_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json';
  // Colours come from the stylesheet so a palette change only touches CSS.
  const css = getComputedStyle(document.documentElement);
  const trip = (name) => css.getPropertyValue(name).split(',').map(Number);
  const COLORS = { oil: trip('--g-oil'), coal: trip('--g-coal'), lng: trip('--g-lng'), link: trip('--g-node') };
  const OLD = trip('--g-old'), NEW = trip('--g-new'), BG = trip('--g-bg');
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const D2R = Math.PI / 180;

  let W = 0, H = 0, R = 0, cx = 0, cy = 0;
  let rot = -lon * D2R, tilt = 0.32, era = 0.5;
  let dragging = false, lastX = 0, lastY = 0, idleUntil = 0, hovered = null;
  let land = [];
  let target = null, drift = 0.0011;

  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const vec = (lon, lat) => {
    const l = lon * D2R, p = lat * D2R;
    return [Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l)];
  };

  // Rotate about the vertical axis, tilt toward the viewer, project orthographically.
  let cr = 1, sr = 0, ct = 1, st = 0;
  function project(v, out) {
    const x = v[0] * cr + v[2] * sr;
    const z1 = -v[0] * sr + v[2] * cr;
    out[0] = cx + x * R;
    out[1] = cy - (v[1] * ct - z1 * st) * R;
    out[2] = v[1] * st + z1 * ct;
    return out;
  }

  // Great-circle arc lifted off the surface, higher for longer hops.
  function arc(a, b, steps) {
    const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
    const ang = Math.acos(dot), sin = Math.sin(ang) || 1;
    const lift = 0.05 + 0.3 * (ang / Math.PI);
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const s = i / steps;
      const ka = Math.sin((1 - s) * ang) / sin, kb = Math.sin(s * ang) / sin;
      const r = 1 + lift * Math.sin(Math.PI * s);
      pts.push([(a[0] * ka + b[0] * kb) * r, (a[1] * ka + b[1] * kb) * r, (a[2] * ka + b[2] * kb) * r]);
    }
    return pts;
  }

  const makeLine = (kind, a, b, steps, i) => ({
    kind, pts: arc(a, b, steps), scr: Array.from({ length: steps + 1 }, () => [0, 0, 0]),
    phase: (i * 0.37) % 1, speed: 0.1 + ((i * 7) % 5) * 0.012,
  });

  const fuel = routes.map((r, i) => makeLine(r.kind, vec(...r.from), vec(...r.to), 56, i));

  const points = nodes.map((n) => ({ ...n, v: vec(n.lon, n.lat), scr: [0, 0, 0] }));
  // Link each startup to its two nearest neighbours to suggest a network.
  const links = [];
  const seen = new Set();
  points.forEach((p, i) => {
    points.map((q, j) => ({ j, d: p.v[0] * q.v[0] + p.v[1] * q.v[1] + p.v[2] * q.v[2] }))
      .filter((o) => o.j !== i).sort((a, b) => b.d - a.d).slice(0, 2)
      .forEach(({ j }) => {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (seen.has(key)) return;
        seen.add(key);
        links.push(makeLine('link', p.v, points[j].v, 20, links.length));
      });
  });

  const marks = labels.map((l) => ({ ...l, text: l.text.toUpperCase(), v: vec(l.lon, l.lat), color: l.side === 'legacy' ? COLORS.oil : COLORS.link }));

  // Graticule: meridians and parallels every 30 degrees.
  const grat = [];
  for (let lon = -180; lon < 180; lon += 30) {
    const line = []; for (let lat = -84; lat <= 84; lat += 6) line.push(vec(lon, lat)); grat.push(line);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const line = []; for (let lon = -180; lon <= 180; lon += 6) line.push(vec(lon, lat)); grat.push(line);
  }

  // Land: decode the TopoJSON, paint it flat, then keep evenly spread sphere points that hit land.
  async function loadLand() {
    const topo = await (await fetch(LAND_URL)).json();
    const [kx, ky] = topo.transform.scale, [tx, ty] = topo.transform.translate;
    const arcs = topo.arcs.map((a) => { let x = 0, y = 0; return a.map(([dx, dy]) => [(x += dx) * kx + tx, (y += dy) * ky + ty]); });
    const mw = 1024, mh = 512;
    const off = document.createElement('canvas'); off.width = mw; off.height = mh;
    const o = off.getContext('2d', { willReadFrequently: true });
    o.beginPath();
    const ring = (ids) => {
      let first = true;
      ids.forEach((id) => {
        const a = id < 0 ? arcs[~id].slice().reverse() : arcs[id];
        a.forEach(([lon, lat]) => {
          const x = ((lon + 180) / 360) * mw, y = ((90 - lat) / 180) * mh;
          if (first) { o.moveTo(x, y); first = false; } else o.lineTo(x, y);
        });
      });
      o.closePath();
    };
    const geoms = topo.objects.land.geometries || [topo.objects.land];
    geoms.forEach((g) => (g.type === 'Polygon' ? [g.arcs] : g.arcs).forEach((poly) => poly.forEach(ring)));
    o.fill('evenodd');
    const px = o.getImageData(0, 0, mw, mh).data;

    const N = 15000, golden = Math.PI * (3 - Math.sqrt(5)), out = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - (2 * (i + 0.5)) / N, r = Math.sqrt(1 - y * y), th = i * golden;
      const v = [Math.cos(th) * r, y, Math.sin(th) * r];
      const lon = Math.atan2(v[0], v[2]) / D2R, lat = Math.asin(y) / D2R;
      const ix = Math.min(mw - 1, ((lon + 180) / 360 * mw) | 0), iy = Math.min(mh - 1, ((90 - lat) / 180 * mh) | 0);
      if (px[(iy * mw + ix) * 4 + 3] > 128) out.push(v);
    }
    land = out;
  }
  loadLand().catch((e) => console.warn('Globe land data unavailable; drawing grid only.', e));

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const box = canvas.getBoundingClientRect();
    W = box.width; H = box.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W / 2; cy = H / 2; R = Math.min(W, H) * 0.4;
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  // Stroke the front-facing or back-facing runs of a projected line.
  function strokeSide(scr, front) {
    ctx.beginPath();
    let pen = false;
    for (let i = 0; i < scr.length; i++) {
      if ((scr[i][2] > 0) === front) { pen ? ctx.lineTo(scr[i][0], scr[i][1]) : ctx.moveTo(scr[i][0], scr[i][1]); pen = true; }
      else pen = false;
    }
    ctx.stroke();
  }

  function drawLine(line, gain, time) {
    if (gain < 0.02) return;
    const c = COLORS[line.kind], scr = line.scr, n = scr.length;
    for (let i = 0; i < n; i++) project(line.pts[i], scr[i]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(c, 0.26 * gain); strokeSide(scr, true);
    ctx.strokeStyle = rgba(c, 0.07 * gain); strokeSide(scr, false);
    // A pulse travelling from origin to destination, with a fading tail.
    const head = ((time * line.speed + line.phase) % 1) * (n - 1);
    const tail = Math.max(5, n * 0.2);
    for (let k = 0; k < tail; k++) {
      const i = Math.floor(head - k);
      if (i < 1) break;
      const side = scr[i][2] > 0 ? 1 : 0.22;
      ctx.strokeStyle = rgba(c, (1 - k / tail) * gain * side);
      ctx.lineWidth = 2.2 - (k / tail) * 1.2;
      ctx.beginPath(); ctx.moveTo(scr[i - 1][0], scr[i - 1][1]); ctx.lineTo(scr[i][0], scr[i][1]); ctx.stroke();
    }
  }

  const tmp = [0, 0, 0];
  function frame(ms) {
    requestAnimationFrame(frame);
    if (document.hidden || !W) return;
    const time = reduce ? 3 : ms / 1000;
    if (target !== null && !dragging) {
      // Ease toward the requested longitude by the shortest way round.
      let d = (target - rot) % (2 * Math.PI);
      if (d > Math.PI) d -= 2 * Math.PI; else if (d < -Math.PI) d += 2 * Math.PI;
      rot += d * 0.035;
      if (Math.abs(d) < 0.002) target = null;
    } else if (spin && !reduce && !dragging && ms > idleUntil) rot += drift;
    cr = Math.cos(rot); sr = Math.sin(rot); ct = Math.cos(tilt); st = Math.sin(tilt);

    const legacy = 1 - 0.9 * era, next = 0.1 + 0.9 * era;
    const tone = mix(OLD, NEW, era);

    ctx.clearRect(0, 0, W, H);

    // Halo and translucent body.
    let g = ctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.32);
    g.addColorStop(0, rgba(tone, 0.2)); g.addColorStop(1, rgba(tone, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.32, 0, 7); ctx.fill();
    g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    g.addColorStop(0, rgba(mix(BG, tone, 0.2), 0.5)); g.addColorStop(1, rgba(BG, 0.82));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();

    // Far side first, so it reads as seen through glass.
    ctx.fillStyle = rgba(tone, 0.16);
    for (let i = 0; i < land.length; i++) { project(land[i], tmp); if (tmp[2] <= 0) ctx.fillRect(tmp[0] - 0.6, tmp[1] - 0.6, 1.2, 1.2); }

    ctx.lineWidth = 1; ctx.strokeStyle = rgba(tone, 0.09);
    grat.forEach((line) => {
      ctx.beginPath(); let pen = false;
      line.forEach((v) => { project(v, tmp); if (tmp[2] > 0) { pen ? ctx.lineTo(tmp[0], tmp[1]) : ctx.moveTo(tmp[0], tmp[1]); pen = true; } else pen = false; });
      ctx.stroke();
    });

    ctx.fillStyle = rgba(tone, 0.82);
    for (let i = 0; i < land.length; i++) {
      project(land[i], tmp);
      if (tmp[2] > 0) { const s = 0.9 + tmp[2] * 0.8; ctx.fillRect(tmp[0] - s / 2, tmp[1] - s / 2, s, s); }
    }

    ctx.strokeStyle = rgba(tone, 0.5); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();

    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    fuel.forEach((l) => drawLine(l, legacy, time));
    links.forEach((l) => drawLine(l, next * 0.8, time));

    // Startup nodes.
    const c = COLORS.link;
    points.forEach((p, i) => {
      project(p.v, p.scr);
      const front = p.scr[2] > 0, a = (front ? 1 : 0.18) * next;
      const hot = p === hovered;
      ctx.fillStyle = rgba(hot ? [255, 255, 255] : c, a);
      ctx.beginPath(); ctx.arc(p.scr[0], p.scr[1], hot ? 3.4 : 1.4 + next * 1.2, 0, 7); ctx.fill();
      if (!front) return;
      const pulse = (time * 0.45 + i * 0.137) % 1;
      ctx.strokeStyle = rgba(c, (1 - pulse) * 0.55 * next); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p.scr[0], p.scr[1], 2 + pulse * (5 + next * 9), 0, 7); ctx.stroke();
    });
    ctx.globalCompositeOperation = 'source-over';

    // Captions: fuel hubs at the legacy end, startup clusters at the next end.
    ctx.font = '500 10px "JetBrains Mono", monospace';
    ctx.textBaseline = 'middle';
    marks.forEach((m) => {
      project(m.v, tmp);
      const gain = m.side === 'legacy' ? legacy : next;
      const a = Math.max(0, Math.min(1, (gain - 0.6) * 2.5)) * Math.max(0, Math.min(1, (tmp[2] - 0.2) * 4));
      if (a <= 0.02) return;
      const right = tmp[0] >= cx, dir = right ? 1 : -1;
      const x = tmp[0], y = tmp[1], ex = x + dir * 14, ey = y - 12;
      ctx.strokeStyle = rgba(m.color, a * 0.8); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.lineTo(ex + dir * 6, ey); ctx.stroke();
      const w = ctx.measureText(m.text).width;
      // Keep the caption inside the canvas on narrow screens.
      const tx = right ? Math.min(ex + 10, W - w - 6) : Math.max(ex - 10, w + 6);
      ctx.fillStyle = rgba(BG, a * 0.8);
      ctx.fillRect(right ? tx - 4 : tx - w - 4, ey - 8, w + 8, 16);
      ctx.textAlign = right ? 'left' : 'right';
      ctx.fillStyle = rgba(m.side === 'legacy' ? [236, 231, 226] : COLORS.link, a);
      ctx.fillText(m.text, tx, ey);
    });
  }
  requestAnimationFrame(frame);

  // Drag to spin; hover and click startup nodes.
  function nearest(e) {
    const box = canvas.getBoundingClientRect(), x = e.clientX - box.left, y = e.clientY - box.top;
    let best = null, bd = 14 * 14;
    points.forEach((p) => {
      if (p.scr[2] <= 0) return;
      const d = (p.scr[0] - x) ** 2 + (p.scr[1] - y) ** 2;
      if (d < bd) { bd = d; best = p; }
    });
    return best;
  }
  let moved = 0;
  canvas.addEventListener('pointerdown', (e) => { target = null; dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (dragging) {
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      rot += dx / R; tilt = Math.max(-1.1, Math.min(1.1, tilt + dy / R));
      lastX = e.clientX; lastY = e.clientY;
      return;
    }
    const hit = nearest(e);
    if (hit !== hovered) {
      hovered = hit; canvas.style.cursor = hit ? 'pointer' : 'grab';
      if (onHover) onHover(hit, hit && { x: hit.scr[0], y: hit.scr[1] });
    }
  });
  const release = (e) => {
    if (!dragging) return;
    dragging = false; idleUntil = performance.now() + 2500;
    if (moved < 5 && onPick) { const hit = nearest(e); if (hit) onPick(hit); }
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', () => { dragging = false; });
  canvas.addEventListener('pointerleave', () => { if (hovered) { hovered = null; if (onHover) onHover(null); } });

  return {
    setEra(t) { era = Math.max(0, Math.min(1, t)); },
    // Turn the globe so this longitude faces the viewer.
    flyTo(deg) { if (reduce) rot = -deg * D2R; else target = -deg * D2R; },
    setDrift(v) { drift = v; },
  };
}
