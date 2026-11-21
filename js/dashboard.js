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
    const tip = document.getElementById('tip');
    const globe = createGlobe(document.getElementById('globe'), {
      routes, nodes: startups,
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
    const ERA_TEXT = [
      [0.34, 'LEGACY', 'Hydrocarbons dug up in a few places and shipped across oceans to be burned.'],
      [0.67, 'NOW', 'Both systems are running at once. The old one still carries most of the load.'],
      [2, 'NEXT', 'Electrons, heat and atoms, made closer to where they are used.'],
    ];
    const setEra = () => {
      const t = slider.value / 100;
      globe.setEra(t);
      document.documentElement.style.setProperty('--era', t);
      const [, name, text] = ERA_TEXT.find(([max]) => t < max);
      readout.replaceChildren(h('b', {}, name), ' ', text);
    };
    slider.addEventListener('input', setEra);
    document.querySelectorAll('[data-era]').forEach((b) => b.addEventListener('click', () => { slider.value = b.dataset.era; setEra(); }));
    setEra();

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

    document.getElementById('counts').textContent = `${startups.length} startups · ${signals.length} signals`;
  } catch (err) { ES.fail(err); }
});
