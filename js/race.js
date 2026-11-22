// The race page: one trajectory per company, from launch to the grid.
document.addEventListener('DOMContentLoaded', async () => {
  const { h } = ES;
  try {
    const [race, startups] = await Promise.all([ES.load('race'), ES.load('startups')]);
    const known = new Set(startups.map((s) => s.id));
    const tabs = document.getElementById('tracks');
    const pick = new URLSearchParams(location.search).get('track');
    let track = race.tracks.find((t) => t.id === pick) || race.tracks[0];

    tabs.append(...race.tracks.map((t) => h('button', { type: 'button', 'data-track': t.id, onclick: () => { track = t; history.replaceState(null, '', `?track=${t.id}`); render(); } }, t.title)));
    document.getElementById('asof').textContent = `Statuses checked ${ES.fmtDate(race.asOf)}`;

    function render() {
      const t = track, n = t.stages.length;
      tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.track === t.id));
      const head = document.getElementById('race-head');
      head.replaceChildren(t.headlineStart, ' ', h('em', {}, t.headlineEnd));
      document.getElementById('race-intro').textContent = t.intro;

      const at = (k) => t.companies.filter((c) => c.reached >= k).length;
      document.getElementById('tally').replaceChildren(...t.tally.map((x, i) =>
        h('div', {}, h('b', { class: i === 0 ? 'hot' : null }, at(x.stage)), h('span', {}, x.label))));
      const note = document.getElementById('race-note');
      note.replaceChildren(t.note, ' ', t.noteUrl ? ES.extLink(t.noteUrl, 'Source') : null);

      const pos = (i) => (i / (n - 1)) * 100;
      const lanes = document.getElementById('lanes');
      lanes.replaceChildren(h('div', { class: 'stage-labels', 'aria-hidden': 'true' }, h('span', {}),
        h('div', { class: 'ticks' }, t.stages.map((s, i) => h('span', { style: `left:${pos(i)}%` }, s))), h('span', {}, 'Stated next goal')));

      const order = t.companies.map((c, i) => [c, i]).sort((a, b) => b[0].reached - a[0].reached || a[1] - b[1]).map(([c]) => c);
      order.forEach((c) => {
        // The craft sits a third of the way past its last waypoint, heading for the next one.
        const craft = c.reached === 0 ? 0 : Math.min(100, pos(c.reached - 1) + (c.reached < n ? 35 / (n - 1) : 0));
        const stageNow = c.reached ? t.stages[c.reached - 1] : 'Not started';
        const detail = h('div', { class: 'lane-detail', hidden: true },
          h('ul', {}, t.stages.map((s, i) => {
            const m = c.milestones.find((x) => x.stage === i + 1);
            const done = i < c.reached;
            return h('li', { class: done ? 'hit' : null },
              h('span', { class: 'mk' }, done ? '◆' : '◇'),
              h('span', { class: 'st' }, s),
              m ? h('span', {}, h('span', { class: 'dim' }, `${ES.fmtDate(m.date)} · `), m.text, ' ', ES.extLink(m.url, m.source, 'src'))
                : h('span', { class: 'dim' }, done ? '' : 'Not yet'));
          })),
          h('p', {}, h('b', {}, 'Next: '), `${c.target} (${c.targetYear}). `, c.targetUrl ? ES.extLink(c.targetUrl, c.targetSource || 'Source', 'src') : null),
          c.note ? h('p', { class: 'dim' }, c.note) : null);

        const lane = h('div', { class: 'lane', role: 'button', tabindex: 0, 'aria-expanded': 'false' },
          h('div', { class: 'co' },
            h('b', {}, c.name),
            h('span', {}, `${c.project} · ${c.location}`),
            h('span', { class: 'now' }, `${c.reached}/${n} · ${stageNow}`)),
          h('div', { class: 'track', 'aria-label': `${c.name}: ${c.reached} of ${n} stages, latest ${stageNow}` },
            h('div', { class: 'rail' }),
            c.reached ? h('div', { class: 'burn', style: `width:${craft}%` }) : null,
            t.stages.map((s, i) => h('div', { class: `wp ${i < c.reached ? 'hit' : ''}`, style: `left:${pos(i)}%`, title: s })),
            h('div', { class: 'craft', style: `left:${craft}%` })),
          h('div', { class: 'target' }, `${c.target} `, h('i', {}, c.targetYear)));

        const toggle = () => { detail.hidden = !detail.hidden; lane.setAttribute('aria-expanded', String(!detail.hidden)); lane.classList.toggle('open', !detail.hidden); };
        lane.addEventListener('click', toggle);
        lane.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
        if (c.startup && known.has(c.startup)) detail.append(h('p', {}, h('a', { href: `startups.html#${c.startup}`, class: 'mint' }, `${c.name} on the startups board →`)));
        lanes.append(lane, detail);
      });
    }
    render();
  } catch (err) { ES.fail(err); }
});
