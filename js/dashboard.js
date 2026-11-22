document.addEventListener('DOMContentLoaded', async () => {
  const { h } = ES;
  try {
    const [stats, startups, signals, routes] = await Promise.all(['stats', 'startups', 'signals', 'routes'].map(ES.load));
    signals.sort(ES.byDateDesc);
    const byId = Object.fromEntries(startups.map((s) => [s.id, s]));

    // Ticker
    const items = signals.map((s) => h('a', { href: 'signals.html', class: 'ticker-item' },
      h('span', { class: 'dim' }, ES.fmtDate(s.date)), ' ', h('b', {}, (byId[s.company] ? byId[s.company].name : ES.sectorLabel(s.sector)).toUpperCase()), ' ', s.title));
    const track = document.getElementById('ticker');
    track.append(...items, ...items.map((n) => { const c = n.cloneNode(true); c.setAttribute('aria-hidden', 'true'); c.tabIndex = -1; return c; }));
    track.style.animationDuration = `${Math.max(40, signals.length * 14)}s`;

    // Stat columns
    const statBlock = (s) => h('div', { class: 'stat' },
      h('div', { class: 'stat-value' }, s.value),
      h('p', { class: 'stat-label' }, s.label),
      ES.extLink(s.url, s.source, 'stat-src'));
    document.getElementById('legacy-stats').append(...stats.legacy.map(statBlock));
    document.getElementById('next-stats').append(...stats.next.map(statBlock));

    // Globe
    // Captions for the globe. Fuel hubs come from the routes; startup clusters are counted from the data.
    const near = (a, b, deg) => {
      const r = Math.PI / 180, dot = Math.sin(a[1] * r) * Math.sin(b[1] * r) + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.cos((a[0] - b[0]) * r);
      return dot > Math.cos(deg * r);
    };
    const hubs = [];
    routes.forEach((rt) => {
      const kind = rt.kind === 'lng' ? 'LNG' : rt.kind;
      const hub = hubs.find((x) => near(x.at, rt.from, 12));
      if (hub) { if (!hub.kinds.includes(kind)) hub.kinds.push(kind); }
      else hubs.push({ at: rt.from, name: rt.name.split(' to ')[0], kinds: [kind] });
    });
    const REGIONS = [['US West Coast', -121, 40], ['Texas', -97, 30.5], ['US East Coast', -75, 40.5], ['Europe', 6, 50], ['East Asia', 128, 33], ['Australia', 151, -33]];
    const labels = [
      ...hubs.map((x) => ({ lon: x.at[0], lat: x.at[1], side: 'legacy', text: `${x.name} · ${x.kinds.join(' + ')}` })),
      ...REGIONS.map(([name, lon, lat]) => {
        const n = startups.filter((s) => near([lon, lat], [s.lon, s.lat], 12)).length;
        return n && { lon, lat, side: 'next', text: `${name} · ${n} startup${n === 1 ? '' : 's'}` };
      }).filter(Boolean),
    ];

    const tip = document.getElementById('tip');
    const globe = createGlobe(document.getElementById('globe'), {
      routes, nodes: startups, lon: 82, labels,
      onHover(node, pos) {
        tip.hidden = !node;
        if (!node) return;
        tip.replaceChildren(h('b', {}, node.name), h('span', {}, `${ES.sectorLabel(node.sector)} · ${node.hq}`));
        tip.style.left = `${pos.x}px`; tip.style.top = `${pos.y}px`;
      },
      onPick(node) { location.href = `startups.html#${node.id}`; },
    });

    const slider = document.getElementById('era');
    const readout = document.getElementById('era-readout');
    // The tour: three stops, each with a view of the globe and a plain caption.
    const STOPS = [
      { at: 0, lon: 82, name: 'OLD ENERGY', text: 'Oil, coal and gas are dug up in a few places and shipped across oceans to be burned. The lines are the main routes.' },
      { at: 50, lon: 25, name: 'TODAY', text: `Both systems are running at once. Oil, gas and coal still supply ${stats.legacy[0].value} of the world's energy.` },
      { at: 100, lon: -98, name: 'NEW ENERGY', text: 'Power made close to where it is used. Each glowing point is a startup we track. Tap one to see who it is.' },
    ];
    slider.step = 'any';
    let shown = null;
    const setEra = () => {
      const t = slider.value / 100;
      globe.setEra(t);
      document.documentElement.style.setProperty('--era', t);
      const stop = t < 0.25 ? STOPS[0] : t <= 0.75 ? STOPS[1] : STOPS[2];
      if (stop !== shown) { shown = stop; readout.replaceChildren(h('b', {}, stop.name), ' ', stop.text); }
    };

    // Autoplay: hold on a stop, then glide the slider and turn the globe to the next one.
    const playBtn = document.getElementById('story');
    const HOLD = 5200, MOVE = 3400;
    const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    let playing = false, idx = 0, phase = 'hold', clock = 0, from = 0, last = 0;
    const setPlaying = (on) => {
      playing = on; last = 0;
      playBtn.textContent = on ? '❚❚ Pause tour' : '▶ Play tour';
      globe.setDrift(on ? 0.0003 : 0.0011);
      if (on) { // carry on from wherever the slider is now
        const v = Number(slider.value);
        idx = v < 25 ? 0 : v <= 75 ? 1 : 2; phase = 'hold'; clock = HOLD - 1500;
      }
    };
    const tick = (ms) => {
      requestAnimationFrame(tick);
      if (!playing) return;
      clock += last ? Math.min(100, ms - last) : 0; last = ms;
      if (phase === 'hold' && clock >= HOLD) {
        idx = (idx + 1) % STOPS.length; from = Number(slider.value); phase = 'move'; clock = 0;
        globe.flyTo(STOPS[idx].lon);
      } else if (phase === 'move') {
        const k = Math.min(1, clock / MOVE);
        slider.value = from + (STOPS[idx].at - from) * ease(k); setEra();
        if (k === 1) { phase = 'hold'; clock = 0; }
      }
    };
    const goTo = (i) => { setPlaying(false); slider.value = STOPS[i].at; setEra(); globe.flyTo(STOPS[i].lon); };
    slider.addEventListener('input', () => { setPlaying(false); setEra(); });
    document.querySelectorAll('[data-stop]').forEach((b) => b.addEventListener('click', () => goTo(Number(b.dataset.stop))));
    document.getElementById('globe').addEventListener('pointerdown', () => setPlaying(false));
    playBtn.addEventListener('click', () => setPlaying(!playing));
    slider.value = 0; setEra();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) playBtn.hidden = true;
    else { setPlaying(true); clock = 0; requestAnimationFrame(tick); }

    // Electricity mix bar
    const el = stats.electricity;
    const shade = { legacy: 0, next: 0 };
    const segs = el.mix.map((m) => ({ ...m, cls: `${m.kind}-${++shade[m.kind]}` }));
    document.getElementById('mix-title').textContent = el.title;
    document.getElementById('mix-bar').append(...segs.map((m) =>
      h('div', { class: `seg ${m.cls}`, style: `flex:${m.value}`, title: `${m.label}: ${m.value}%` }, h('span', {}, `${m.value}%`))));
    document.getElementById('mix-legend').append(...segs.map((m) =>
      h('li', {}, h('i', { class: `sw ${m.cls}` }), m.label, h('b', {}, `${m.value}%`))));
    document.getElementById('mix-src').append('Source: ', ES.extLink(el.url, el.source), ' ', el.note);

    // Latest signals
    document.getElementById('latest').append(...signals.slice(0, 5).map((s) => h('li', {},
      h('span', { class: 'when' }, ES.fmtDate(s.date)),
      h('div', {}, ES.extLink(s.url, s.title, 'headline'), h('div', { class: 'meta' }, ES.sectorTag(s.sector), h('span', { class: 'dim' }, s.source))))));

    // Key players (first eight in the data file)
    document.getElementById('players').append(...startups.slice(0, 8).map((s) => h('tr', {},
      h('td', {}, h('a', { href: `startups.html#${s.id}` }, s.name)),
      h('td', {}, ES.sectorTag(s.sector)),
      h('td', { class: 'dim' }, s.hq))));

    // Sector tiles
    document.getElementById('sectors').append(...Object.entries(ES.SECTORS).map(([id, sec]) => {
      const n = startups.filter((s) => s.sector === id).length;
      return h('a', { class: 'tile', href: `startups.html?sector=${id}` },
        h('span', { class: 'tile-n' }, String(n).padStart(2, '0')), h('span', { class: 'tile-l' }, sec.label));
    }));

    // Race teaser: one row per track with its scoreboard numbers.
    ES.load('race').then((race) => {
      document.getElementById('race-mini').append(...race.tracks.map((t) => {
        const at = (k) => t.companies.filter((c) => c.reached >= k).length;
        return h('a', { class: 'race-row', href: `race.html?track=${t.id}` },
          h('span', { class: 'race-name' }, t.title),
          t.tally.map((x, i) => h('span', { class: 'race-stat' }, h('b', { class: i === 0 ? 'hot' : null }, at(x.stage)), x.label)));
      }));
    }).catch(ES.fail);

    document.getElementById('counts').textContent = `${startups.length} startups · ${signals.length} signals`;
  } catch (err) { ES.fail(err); }
});
