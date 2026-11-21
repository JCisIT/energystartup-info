// Drives startups.html and signals.html: sector chips, search, and the list itself.
document.addEventListener('DOMContentLoaded', async () => {
  const { h } = ES;
  const page = document.body.dataset.page;
  try {
    const startups = await ES.load('startups');
    const byId = Object.fromEntries(startups.map((s) => [s.id, s]));
    const rows = page === 'signals' ? (await ES.load('signals')).sort(ES.byDateDesc) : startups;

    const list = document.getElementById('list');
    const chips = document.getElementById('chips');
    const search = document.getElementById('search');
    const count = document.getElementById('count');
    let sector = new URLSearchParams(location.search).get('sector') || 'all';
    if (sector !== 'all' && !ES.SECTORS[sector]) sector = 'all';

    const card = (s) => h('article', { class: 'card', id: s.id },
      h('header', {}, h('h2', {}, s.name), ES.sectorTag(s.sector)),
      h('p', { class: 'hq' }, s.hq),
      h('p', {}, s.thesis),
      s.url ? ES.extLink(s.url, s.url.replace(/^https?:\/\/(www\.)?/, ''), 'site') : null);

    const signal = (s) => h('article', { class: 'signal' },
      h('div', { class: 'when' }, ES.fmtDate(s.date)),
      h('div', {},
        h('h2', {}, ES.extLink(s.url, s.title)),
        h('p', {}, s.summary),
        h('div', { class: 'meta' }, ES.sectorTag(s.sector),
          byId[s.company] ? h('a', { href: `startups.html#${s.company}` }, byId[s.company].name) : null,
          h('span', { class: 'dim' }, `via ${s.source}`))));

    function render() {
      const q = search.value.trim().toLowerCase();
      const shown = rows.filter((r) => (sector === 'all' || r.sector === sector) &&
        (!q || [r.name, r.title, r.thesis, r.summary, r.hq, r.source, byId[r.company] && byId[r.company].name].some((t) => t && t.toLowerCase().includes(q))));
      list.replaceChildren(...shown.map(page === 'signals' ? signal : card));
      if (!shown.length) list.append(h('p', { class: 'dim' }, 'Nothing matches that filter.'));
      count.textContent = `${shown.length} of ${rows.length}`;
      chips.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.sector === sector));
    }

    const used = new Set(rows.map((r) => r.sector));
    chips.append(...[['all', { label: 'All' }], ...Object.entries(ES.SECTORS).filter(([id]) => used.has(id))].map(([id, sec]) =>
      h('button', { type: 'button', 'data-sector': id, onclick: () => { sector = id; render(); } }, sec.label)));
    search.addEventListener('input', render);
    render();

    // Arriving from the globe or a signal: scroll to that company and flash it.
    const target = location.hash && document.getElementById(location.hash.slice(1));
    if (target) { target.classList.add('flash'); target.scrollIntoView({ block: 'center' }); }
  } catch (err) { ES.fail(err); }
});
