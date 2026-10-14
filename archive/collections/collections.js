/* ===================== COLLECTIONS: Orion (grammar) and the Clockwork Engine (vocabulary) =====================
   Each topic is tied, in a fixed order, to one star or cog. Reaching five stars on a topic lights it for good
   (store.lit). store.shown remembers what the player has already seen light up, so opening the picture
   animates only the new pieces: the piece pops in, then any line, bar or panel it completes is drawn in. */
const GEAR_M = 3.2;
const ORION = {
  vb: [0, 0, 300, 400],
  names: ['Meissa','Betelgeuse','Bellatrix','Alnitak','Alnilam','Mintaka','Saiph','Rigel','Nair al Saif','Hatysa','Pi3','Pi5'],
  pts: [[150,44,4],[92,84,7],[208,92,6],[112,226,5,'l'],[152,206,6],[192,186,5],[92,330,5],[212,346,7],[152,258,4],[152,288,4],[262,126,4],[272,188,4]],
  edges: [[0,1],[0,2],[1,3],[2,5],[3,4],[4,5],[3,6],[5,7],[4,8],[8,9],[2,10],[10,11]],
  faces: [[0,1,2],[1,2,5,3],[3,5,7,6],[2,10,11]]
};
const ENGINE = (() => {
  const spec = [[18,0,0],[12,0,300],[20,1,240],[14,2,225],[16,3,195],[10,4,135],[18,5,75],[12,6,135],[22,7,150],[14,8,255],[16,9,285],[12,10,255]];
  const pos = [], R = spec.map(g => g[0] * GEAR_M / 2);
  spec.forEach(([N, p, a], i) => { if (!i){ pos.push([70, 90]); return; } const d = R[p] + R[i], r = a * Math.PI / 180; pos.push([pos[p][0] + d * Math.cos(r), pos[p][1] + d * Math.sin(r)]); });
  const tip = i => R[i] + 0.85 * GEAR_M, pad = 14;
  const x0 = Math.min(...pos.map((q, i) => q[0] - tip(i))) - pad, x1 = Math.max(...pos.map((q, i) => q[0] + tip(i))) + pad;
  const y0 = Math.min(...pos.map((q, i) => q[1] - tip(i))) - pad, y1 = Math.max(...pos.map((q, i) => q[1] + tip(i))) + pad;
  return { vb: [x0, y0, x1 - x0, y1 - y0], N: spec.map(g => g[0]), R, pos, par: spec.map(g => g[1]),
    edges: spec.slice(1).map((g, i) => [g[1], i + 1]), faces: [[0,1,2],[3,4,5],[6,7,8],[9,10,11]] };
})();
const CONST_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18l4-7 5 3 5-9" opacity=".7"/><circle cx="5" cy="18" r="1.8" fill="currentColor"/><circle cx="9" cy="11" r="1.8" fill="currentColor"/><circle cx="14" cy="14" r="1.8" fill="currentColor"/><circle cx="19" cy="5" r="1.8" fill="currentColor"/></svg>';
const CDEF = {
  G: { name:'Orion', sub:'The Hunter', unit:'star', icon: CONST_ICON, label:'See the Orion constellation',
       found: n => n > 1 ? `★ ${n} new stars lit in Orion – take a look` : '★ A new star is lit in Orion – take a look',
       hint:'Reach five stars on a grammar point to light its star for good.' },
  V: { name:'The Clockwork Engine', sub:'A machine that runs on vocabulary', unit:'cog', icon: GEAR_SVG, label:'See the Clockwork Engine',
       found: n => n > 1 ? `⚙ ${n} new cogs fitted in the engine – take a look` : '⚙ A new cog is fitted in the engine – take a look',
       hint:'Reach five stars on a vocabulary topic to fit its cog for good.' }
};
const litCount = s => secPoints(s).filter(p => store.lit[p.id]).length;
const pendingCount = s => secPoints(s).filter(p => store.lit[p.id] && !store.shown[p.id]).length;
function syncLit(){ ALLP.forEach(p => { if (mastery(p.id) >= 5 && !store.lit[p.id]) store.lit[p.id] = Date.now(); }); }

function gearPath(N, R){
  const m = GEAR_M, rr = R - 1.15 * m, ra = R + 0.85 * m, P = 2 * Math.PI / N, f = v => v.toFixed(1);
  const xy = (a, r) => f(Math.cos(a) * r) + ' ' + f(Math.sin(a) * r);
  const hole = (x, y, r) => `M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
  let d = '';
  for (let k = 0; k < N; k++){
    const c = k * P;
    d += (k ? 'L' : 'M') + xy(c - 0.32 * P, rr) + 'L' + xy(c - 0.16 * P, ra) + 'L' + xy(c + 0.16 * P, ra) + 'L' + xy(c + 0.32 * P, rr) + `A${f(rr)} ${f(rr)} 0 0 1 ` + xy(c + 0.68 * P, rr);
  }
  d += 'Z' + hole(0, 0, R * 0.16);
  if (N >= 14) for (let k = 0; k < 5; k++){ const a = k / 5 * Math.PI * 2; d += hole(Math.cos(a) * R * 0.56, Math.sin(a) * R * 0.56, R * 0.13); }
  return d;
}
function gearAngles(a0){
  const E = ENGINE, ang = [a0];
  for (let k = 1; k < E.N.length; k++){
    const p = E.par[k], th = Math.atan2(E.pos[k][1] - E.pos[p][1], E.pos[k][0] - E.pos[p][0]);
    ang[k] = th + Math.PI - Math.PI / E.N[k] + (th - ang[p]) * E.N[p] / E.N[k];
  }
  return ang;
}

const Col = (() => {
  let timers = [], raf = 0, sec = 'G', lit = [], svgEl = null;
  const calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const f1 = v => v.toFixed(1);

  function buildSvg(s, pts){
    let sd = 7; const seed = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const D = s === 'G' ? ORION : ENGINE, vb = D.vb, ctr = i => s === 'G' ? [D.pts[i][0], D.pts[i][1]] : D.pos[i];
    let h = `<svg viewBox="${vb.map(f1).join(' ')}" role="img" aria-label="${esc(CDEF[s].name)}: ${litCount(s)} of 12 ${CDEF[s].unit}s lit">`;
    h += `<defs><radialGradient id="cGlow"><stop offset="0" stop-color="#e9efff" stop-opacity=".85"/><stop offset=".4" stop-color="#cfd9f5" stop-opacity=".25"/><stop offset="1" stop-color="#cfd9f5" stop-opacity="0"/></radialGradient>
      <linearGradient id="cBrass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd98f"/><stop offset=".55" stop-color="#d9a14a"/><stop offset="1" stop-color="#9a6a26"/></linearGradient></defs>`;
    if (s === 'G'){
      for (let i = 0; i < 46; i++) h += `<circle cx="${f1(seed() * 300)}" cy="${f1(seed() * 400)}" r="${f1(0.4 + seed() * 0.9)}" fill="#cfd9f5" opacity="${f1(0.15 + seed() * 0.35)}"/>`;
    } else h += `<rect x="${f1(vb[0] + 4)}" y="${f1(vb[1] + 4)}" width="${f1(vb[2] - 8)}" height="${f1(vb[3] - 8)}" rx="16" fill="none" stroke="#e9a94b" stroke-opacity=".18" stroke-dasharray="3 5"/>`;
    // panels / faces (filled in when all their pieces are lit)
    D.faces.forEach((fc, k) => {
      const poly = fc.map(i => ctr(i).map(f1).join(',')).join(' '), on = fc.every(i => pts[i]);
      h += s === 'G' ? `<polygon class="c-face${on ? ' on' : ''}" data-f="${k}" points="${poly}" fill="rgba(205,216,245,.11)"/>`
        : `<polygon class="c-face${on ? ' on' : ''}" data-f="${k}" points="${poly}" fill="rgba(120,78,30,.5)" stroke="rgba(120,78,30,.5)" stroke-width="22" stroke-linejoin="round"/>`;
    });
    // lines / axle bars
    D.edges.forEach(([a, b], k) => {
      const A = ctr(a), B = ctr(b), on = pts[a] && pts[b];
      if (s === 'G') h += `<line class="c-ghost" x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}"/>`;
      h += `<line class="c-edge ${s === 'G' ? 'star' : 'bar'}${on ? ' on' : ''}" data-e="${k}" pathLength="1" x1="${f1(A[0])}" y1="${f1(A[1])}" x2="${f1(B[0])}" y2="${f1(B[1])}"/>`;
    });
    // stars or cogs
    const ang = s === 'V' ? gearAngles(0) : [];
    for (let i = 0; i < 12; i++){
      const p = secPoints(s)[i], on = pts[i], c = ctr(i);
      if (s === 'G'){
        const r = D.pts[i][2];
        h += `<g class="c-node${on ? ' lit' : ''}" data-i="${i}" transform="translate(${c[0]} ${c[1]})">
          <g class="ghost"><circle r="2.6" fill="#cfd9f5" opacity=".4"/><text x="8" y="-7" class="c-code">${p.code}</text></g>
          <g class="full"><circle class="ring" r="12" fill="none" stroke="#e9efff" stroke-width="1.2"/><circle r="${r * 3.4}" fill="url(#cGlow)"/>
            <path d="M0 ${-r * 2.4}L0 ${r * 2.4}M${-r * 2.4} 0L${r * 2.4} 0" stroke="#dfe7fb" stroke-width=".9" stroke-linecap="round" opacity=".8"/>
            <circle r="${r * 0.8}" fill="#f6f9ff"/><text x="${D.pts[i][3] === 'l' ? -(r * 1.6 + 3) : r * 1.6 + 3}" y="${r * 0.5 + 2}" class="c-name"${D.pts[i][3] === 'l' ? ' text-anchor="end"' : ''}>${esc(D.names[i])}</text></g></g>`;
      } else {
        const N = D.N[i], R = D.R[i];
        h += `<g class="c-node${on ? ' lit' : ''}" data-i="${i}" transform="translate(${f1(c[0])} ${f1(c[1])})">
          <g class="ghost"><g transform="rotate(${f1(ang[i] * 180 / Math.PI)})"><path d="${gearPath(N, R)}" fill="none" stroke="#e9a94b" stroke-opacity=".3" stroke-dasharray="2 3" fill-rule="evenodd"/></g><text y="3" text-anchor="middle" class="c-code">${p.code}</text></g>
          <g class="full"><circle class="ring" r="${f1(R * 0.6)}" fill="none" stroke="#ffd98f" stroke-width="1.5"/><g class="gr" transform="rotate(${f1(ang[i] * 180 / Math.PI)})"><path d="${gearPath(N, R)}" fill="url(#cBrass)" stroke="#6b4518" stroke-width=".8" fill-rule="evenodd"/></g></g></g>`;
      }
    }
    return h + '</svg>';
  }

  function clear(){ timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf); raf = 0; }
  function spin(t0){
    const tick = t => {
      if (!svgEl || !svgEl.isConnected || !$('#collection').classList.contains('active')){ raf = 0; return; }
      const ang = gearAngles(calm ? 0 : (t - t0) * 0.0004);
      svgEl.querySelectorAll('.c-node.lit .gr').forEach(g => { const i = +g.closest('.c-node').dataset.i; g.setAttribute('transform', `rotate(${(ang[i] * 180 / Math.PI).toFixed(1)})`); });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  function open(){
    clear(); sec = SEC;
    const D = sec === 'G' ? ORION : ENGINE, C = CDEF[sec], pp = secPoints(sec);
    lit = pp.map(p => !!store.lit[p.id] && !!store.shown[p.id]);
    const fresh = pp.map((p, i) => i).filter(i => store.lit[pp[i].id] && !store.shown[pp[i].id]).sort((a, b) => store.lit[pp[a].id] - store.lit[pp[b].id] || a - b);
    $('#collection').innerHTML = `
      <div class="back-row"><button class="btn ghost small back-btn" data-act="home">${BACK}Back</button><div class="eyebrow">${sec === 'G' ? 'Constellation' : 'Machine'}</div></div>
      <div class="panel col-panel col-${sec}">
        <h2>${esc(C.name)}</h2><div class="muted">${esc(C.sub)}</div>
        <div class="col-art"></div>
        <div class="col-count"><b>${litCount(sec)}</b> / 12 ${C.unit}s lit</div>
        <div class="muted small">${C.hint} Once lit, a ${C.unit} stays lit.</div>
      </div>`;
    const art = $('#collection .col-art'); art.innerHTML = buildSvg(sec, lit); svgEl = art.firstElementChild;
    fresh.forEach(i => { store.shown[pp[i].id] = 1; }); if (fresh.length) save();
    fresh.forEach((i, n) => {
      const at = 700 + n * 1500;
      timers.push(setTimeout(() => {
        lit[i] = true;
        const nd = svgEl.querySelector(`.c-node[data-i="${i}"]`); nd.classList.add('lit', 'pop'); Sfx.correct();
        timers.push(setTimeout(() => D.edges.forEach(([a, b], k) => { if ((a === i || b === i) && lit[a] && lit[b]) svgEl.querySelector(`.c-edge[data-e="${k}"]`).classList.add('on'); }), 450));
        timers.push(setTimeout(() => D.faces.forEach((fc, k) => { if (fc.includes(i) && fc.every(j => lit[j])){ svgEl.querySelector(`.c-face[data-f="${k}"]`).classList.add('on'); Sfx.finish(); } }), 1000));
      }, at));
    });
    if (sec === 'V') spin(performance.now());
  }
  return { open, clear };
})();

