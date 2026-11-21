// Shared helpers, header/footer, and the background rain.
const ES = (() => {
  const SECTORS = {
    fusion:     { label: 'Fusion' },
    nuclear:    { label: 'Advanced nuclear' },
    geothermal: { label: 'Geothermal' },
    storage:    { label: 'Storage' },
    grid:       { label: 'Grid' },
    hydrogen:   { label: 'Hydrogen & fuels' },
    industry:   { label: 'Industry & carbon' },
    solar:      { label: 'Solar' },
  };

  // Tiny DOM builder: h('a', { href, class }, 'text', childNode)
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  async function load(name) {
    const res = await fetch(`data/${name}.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Could not load data/${name}.json (${res.status})`);
    return res.json();
  }

  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  // Accepts "2026-11-16" or "2026-11".
  function fmtDate(s) {
    const [y, m, d] = String(s).split('-');
    const mon = MONTHS[Number(m) - 1] || '';
    return d ? `${d} ${mon} ${y}` : `${mon} ${y}`;
  }
  const byDateDesc = (a, b) => String(b.date).padEnd(10, '-99').localeCompare(String(a.date).padEnd(10, '-99'));

  const sectorLabel = (id) => (SECTORS[id] ? SECTORS[id].label : id);
  const sectorTag = (id) => h('span', { class: 'tag' }, sectorLabel(id));
  const extLink = (url, text, cls) => h('a', { href: url, target: '_blank', rel: 'noopener', class: cls }, text, ' ↗');

  function fail(err) {
    console.error(err);
    const main = document.querySelector('main');
    if (main) main.prepend(h('p', { class: 'error' }, `ERR: ${err.message}. If you opened this file directly, run it through the local server instead.`));
  }

  function chrome() {
    const page = document.body.dataset.page;
    const nav = [['dashboard', 'index.html'], ['startups', 'startups.html'], ['signals', 'signals.html']];
    const clock = h('span', { class: 'clock' });
    const tick = () => { clock.textContent = new Date().toISOString().slice(11, 19) + ' UTC'; };
    tick(); setInterval(tick, 1000);

    document.body.prepend(h('header', { class: 'top' },
      h('a', { class: 'brand', href: 'index.html' }, h('span', { class: 'brand-mark' }, '▲'), 'energystartup', h('span', { class: 'dim' }, '.info'), h('span', { class: 'cursor' }, '_')),
      h('nav', {}, nav.map(([name, href]) => h('a', { href, class: name === page ? 'on' : null }, name))),
      h('div', { class: 'status' }, h('span', { class: 'led' }), clock)
    ));

    document.body.append(h('footer', {},
      h('span', {}, 'energystartup.info'),
      h('span', { class: 'dim' }, 'Tracking the companies building the next energy system.'),
      h('span', { class: 'dim' }, 'Figures are cited to their sources. Nothing here is investment advice.')
    ));
  }

  // Faint falling glyphs behind everything. Skipped for reduced-motion users.
  function rain() {
    const canvas = document.getElementById('rain');
    if (!canvas || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    const glyphs = 'アカサタナハマヤラワ0123456789ΔΣΩµ⚡HeLiUThPu'.split('');
    const size = 16;
    let cols = [];
    const resize = () => {
      canvas.width = innerWidth; canvas.height = innerHeight;
      cols = Array.from({ length: Math.ceil(innerWidth / size) }, () => Math.random() * -60);
    };
    resize(); addEventListener('resize', resize);
    setInterval(() => {
      if (document.hidden) return;
      ctx.fillStyle = 'rgba(6, 9, 11, 0.16)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${size - 3}px "JetBrains Mono", monospace`;
      cols.forEach((y, i) => {
        if (i % 2) return; // every other column, to keep it sparse
        ctx.fillStyle = Math.random() < 0.04 ? 'rgba(255, 179, 71, 0.9)' : 'rgba(109, 255, 181, 0.75)';
        ctx.fillText(glyphs[(Math.random() * glyphs.length) | 0], i * size, y * size);
        cols[i] = y * size > canvas.height && Math.random() > 0.975 ? 0 : y + 1;
      });
    }, 70);
  }

  document.addEventListener('DOMContentLoaded', () => { chrome(); rain(); });

  return { SECTORS, h, load, fmtDate, byDateDesc, sectorLabel, sectorTag, extLink, fail };
})();
