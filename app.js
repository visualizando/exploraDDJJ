const ars = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
const ars1 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });
const pct1 = new Intl.NumberFormat('es-AR', { style: 'percent', maximumFractionDigits: 1 });
const money = (v) => `$${ars1.format(v / 1e6)} M`;
const moneyShort = money;
const m2 = (v) => v == null ? '—' : v >= 1e6 ? `${ars1.format(v / 1e6)} M m²` : `${ars.format(v)} m²`;

function scatterDetails() {
  const store = (typeof DATA !== 'undefined') ? DATA : window.__scat;
  const personas = store.scatter_personas.puntos;
  const bienes = store.scatter_bienes.puntos;
  const dev = (p) => Math.abs(Math.log((p.y / p.x) / 1.315488));
  const outP = personas.filter((p) => p.x > 5e6 && Math.min(p.x, p.y) >= 100000 && dev(p) > 0.05).sort((a, b) => dev(b) - dev(a)).slice(0, 8);
  const outB = bienes.filter((p) => p.x > 1e6 && Math.min(p.x, p.y) >= 100000 && p.banda === 'otro').sort((a, b) => dev(b) - dev(a)).slice(0, 8);
  renderScatter('scatter-personas-svg', 'readout-personas', personas, (p) =>
    `<strong>${p.nombre}${rol(p) ? ` · ${rol(p)}` : ''}</strong><span>${p.n24} → ${p.n25} inmuebles · 2024: ${money(p.x)} · 2025: ${money(p.y)} · ratio ${ratioTxt(p)}</span>`,
    { labels: outP });
  renderScatter('scatter-bienes-svg', 'readout-bienes', bienes, (p) =>
    `<strong>${p.nombre}${rol(p) ? ` · ${rol(p)}` : ''} — ${p.tipo}</strong><span>${p.lugar}${p.m2 ? ` · ${p.m2} m²` : ''} · 2024: ${money(p.x)} · 2025: ${money(p.y)} · ratio ${ratioTxt(p)}</span>`,
    { dotR: 3, outR: 4.5, stroke: '#f7f7f4', labels: outB });
  document.querySelector('#out-personas-table tbody').innerHTML = outP.map((p) => `
    <tr><td><strong>${p.nombre}</strong><br><small>${rol(p)}</small></td><td>${p.n24} → ${p.n25}</td>
    <td>${money(p.x)}</td><td>${money(p.y)}</td><td><strong>${ratioTxt(p)}</strong></td></tr>`).join('');
  document.querySelector('#out-bienes-table tbody').innerHTML = outB.map((p) => `
    <tr><td><strong>${p.nombre}</strong><br><small>${p.tipo} · ${p.lugar}</small></td>
    <td>${money(p.x)}</td><td>${money(p.y)}</td><td><strong>${ratioTxt(p)}</strong></td></tr>`).join('');
}

function renderCruce() {
  const store = (typeof DATA !== 'undefined') ? DATA : window.__scat;
  const { personas, cuadrantes } = store.cruce_hipotecas;
  const quads = [
    ['A', 'En ambas fuentes', 'Hipoteca en BCRA y deuda bancaria en DJPI. Consistente.', true],
    ['B', 'Solo en BCRA', 'Hipoteca registrada pero sin deuda bancaria declarada. Para mirar.', false],
    ['C', 'Solo en DJPI', 'Deuda bancaria declarada sin hipoteca BCRA (puede ser otro crédito).', false],
    ['D', 'Sin señales', 'Sin hipoteca ni deuda bancaria en el último cierre.', false],
  ];
  document.getElementById('hip-quads').innerHTML = quads.map(([k, t, d, hot]) => `
    <article class="lead-card${hot ? ' lead-accent' : ''}"><h3>${t}</h3><span>${ars.format(cuadrantes[k] || 0)}</span><p>${d}</p></article>`).join('');
  const estado = { A: 'Coincide', B: 'Solo BCRA', C: 'Solo DJPI', D: '—' };
  document.querySelector('#hip-table tbody').innerHTML = personas.map((p) => `
    <tr><td><strong>${p.nombre}</strong><br><small>${p.detalle || ''}</small></td>
    <td>${p.inmuebles_n} <small>(${money(p.inmuebles_total)})</small></td>
    <td>${p.bcra_tiene ? `<strong>${money(p.bcra_monto)}</strong><br><small>${p.bcra_entidades.join(', ')} · ${p.bcra_fecha}</small>` : '—'}</td>
    <td>${p.djpi_banco.length ? `<strong>${money(p.djpi_banco_total)}</strong><br><small>${p.djpi_banco.slice(0, 2).map((b) => `${b.acreedor.slice(0, 28)} (${money(b.importe)})`).join('<br>')}</small>` : '—'}</td>
    <td><strong>${estado[p.cuadrante]}</strong></td></tr>`).join('');
  const pp = store.cruce_hipotecas.por_partido || [];
  document.querySelector('#party-table tbody').innerHTML = pp.map((e) => {
    const tot = e.declaran + e.no_declaran + e.sin_pdf;
    const seg = (v, color, label) => `<span style="flex-grow:${v};background:${color}" title="${label}: ${v}"></span>`;
    const bar = tot ? `<span class="mini-track" role="img" aria-label="${e.partido}: ${e.declaran} declaran, ${e.no_declaran} no declaran, ${e.sin_pdf} sin PDF">${seg(e.declaran, '#252725', 'Declaran')}${seg(e.no_declaran, '#e4002b', 'No declaran')}${seg(e.sin_pdf, '#c9cdd0', 'Sin PDF')}</span>` : '—';
    return `<tr><td><strong>${e.partido}</strong></td>
    <td>${ars.format(e.legisladores)}</td><td><strong>${ars.format(e.hipoteca)}</strong></td>
    <td>${bar}</td>
    <td><strong>${ars.format(e.declaran)}</strong> <small>(${tot ? pct1.format(e.declaran / tot) : '—'})</small></td>
    <td>${ars.format(e.no_declaran)}</td><td>${ars.format(e.sin_pdf)}</td></tr>`;
  }).join('');
  const tot = store.scatter_totales.puntos;
  const devT = (p) => Math.abs(Math.log((p.y / p.x) / 1.315488));
  const labT = [...tot].sort((a, b) => devT(b) - devT(a)).slice(0, 6);
  renderScatter('scatter-totales-svg', 'readout-totales', tot, (p) =>
    `<strong>${p.nombre}${p.detalle ? ` · ${p.detalle}` : ''}</strong><span>Neto fin 2024: ${money(p.x)} · fin 2025: ${money(p.y)} · ratio ${ratioTxt(p)}</span>`,
    { labels: labT });
}

function grupoColor(g) {
  const u = (g || '').toUpperCase();
  if (u.includes('LIBERTAD')) return '#a78bfa';
  if (u === 'PRO') return '#f59e0b';
  if (/PERON|PATRIA|JUSTICIALISTA|FRENTE DE TODOS/.test(u)) return '#38bdf8';
  if (/RADICAL|^UCR/.test(u)) return '#e4002b';
  if (u.includes('EJECUTIVO')) return '#7c3aed';
  if (u.includes('JUDICIAL')) return '#555955';
  if (u === 'JGM') return '#777c77';
  if (u.includes('JUNTOS')) return '#4a6fa5';
  return '#c9cdd0';
}

function renderExterior() {
  const store = (typeof DATA !== 'undefined') ? DATA : window.__scat;
  const ex = store.exterior;
  const max = Math.max(...ex.paises.map((p) => p.total), 1);
  const seen = {};
  ex.paises.forEach((p) => p.segs.forEach((s) => { seen[s.grupo] = grupoColor(s.grupo); }));
  document.getElementById('ext-legend').innerHTML = Object.entries(seen)
    .map(([g, c]) => `<span style="color:${c}"><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="18" height="18"/></svg></span><span>${g}</span>`).join('');
  document.getElementById('ext-paises').innerHTML = ex.paises.map((p, i) => `
    <div class="rank-row">
      <span class="rank-pos">${i + 1}</span>
      <span class="rank-name">${p.pais}<small>${p.total} inmuebles</small></span>
      <span class="stack-track" role="img" aria-label="${p.pais}: ${p.segs.map((s) => `${s.grupo} ${s.n}`).join(', ')}"><span class="stack-fill" style="inline-size:${(p.total / max) * 100}%">${p.segs.map((s) => `<span class="stack-seg" style="flex-grow:${s.n};background:${grupoColor(s.grupo)}" title="${s.grupo}: ${s.n}"></span>`).join('')}</span></span>
      <span class="rank-total">${p.total}<small>inmuebles</small></span>
    </div>`).join('');
  document.querySelector('#ext-table tbody').innerHTML = ex.top.map((r) => `
    <tr><td><strong>${r.nombre}</strong><br><small>${r.detalle || r.grupo}</small></td>
    <td>${r.tipo}<br><small>${r.lugar}</small></td><td>${r.pais}</td><td><strong>${money(r.importe)}</strong></td></tr>`).join('');
}

function renderQuality() {
  const store = (typeof DATA !== 'undefined') ? DATA : window.__scat;
  const q = store.quality;
  document.querySelector('#q-table tbody').innerHTML = q.peores.map((r) => `
    <tr><td><strong>${r.nombre}</strong><br><small>${r.detalle || ''}</small></td>
    <td>${r.motivos.map((m) => m[0]).join(' · ')}</td></tr>`).join('');
}

function renderErrores() {
  const store = (typeof DATA !== 'undefined') ? DATA : window.__scat;
  const e = store.errores;
  document.getElementById('err-leads').innerHTML = [
    ['Con rectificativas', ars.format(e.con_rectificativa), `El ${pct1.format(e.con_rectificativa / e.personas)} de las ${ars.format(e.personas)} personas rectificó al menos una vez.`],
    ['Presentaciones duplicadas', ars.format(e.grupos_multi), `Grupos persona-año con más de una declaración (${pct1.format(e.grupos_multi / e.grupos_total)}).`],
    ['Bienes valuados en $0', ars.format(e.con_cero), 'Personas con al menos un inmueble declarado a cero.'],
    ['Superficie re-escrita', '134', 'Personas cuyo mismo bien cambió de m² (14,6%).'],
    ['Récord de presentaciones', '4', 'Declaraciones en un mismo año (3 personas empatadas).'],
    ['Superficies para un mismo día', '40', 'Versiones de m² para bienes ingresados la misma fecha.'],
  ].map(([t, v, d], i) => `
    <article class="lead-card${i === 0 ? ' lead-accent' : ''}"><h3>${t}</h3><span>${v}</span><p>${d}</p></article>`).join('');
  const maxL = Math.log10(Math.max(...e.swings.map((s) => s.factor)));
  document.getElementById('chart-swings').innerHTML = e.swings.slice(0, 8).map((s) => `
    <div class="bar-row">
      <span class="bar-label">${s.nombre}</span>
      <div class="bar-track" aria-hidden="true"><span class="bar-fill" style="inline-size:${Math.max(2, (Math.log10(s.factor) / maxL) * 100)}%"></span></div>
      <span class="bar-value"><strong>×${ars.format(Math.round(s.factor))}</strong><small>${s.tipo}</small></span>
    </div>`).join('');
  const fmtM2 = (v) => v >= 1e6 ? `${ars1.format(v / 1e6)} M` : ars.format(v);
  document.querySelector('#err-table tbody').innerHTML = e.swings.map((s) => `
    <tr><td><strong>${s.nombre}</strong><br><small>${s.detalle || ''} · ${s.tipo}</small></td>
    <td>${fmtM2(s.m2_24)} m²</td><td>${fmtM2(s.m2_25)} m²</td><td><strong>×${ars.format(Math.round(s.factor))}</strong></td></tr>`).join('');
}

function renderFamilia() {
  const store = (typeof DATA !== 'undefined') ? DATA : window.__scat;
  const f = store.familia;
  const sh = (v, n) => n ? pct1.format(v / n) : '—';
  document.querySelector('#fam-table tbody').innerHTML = (f.grupos || []).map((g) => `
    <tr><td><strong>${g.grupo}</strong></td>
    <td>${ars.format(g.n_total)}</td><td>${ars.format(g.n)}</td>
    <td><strong>${sh(g.conyuge, g.n)}</strong><br><small>${ars.format(g.conyuge)}</small></td>
    <td><strong>${sh(g.hijos, g.n)}</strong><br><small>${ars.format(g.hijos)}</small></td>
    <td><strong>${sh(g.nada, g.n)}</strong><br><small>${ars.format(g.nada)}</small></td></tr>`).join('');
  document.getElementById('fam-stats').innerHTML = [    ['Declaran cónyuge o conviviente', pct1.format(f.con_conyuge / f.personas), `${ars.format(f.con_conyuge)} de ${ars.format(f.personas)} legisladores.`],
    ['Declaran hijos', pct1.format(1 - f.hijos_dist[0].share), `Promedio ${String(f.promedio_hijos).replace('.', ',')} entre quienes tienen.`],
    ['Sin familiares', pct1.format(f.sin_familiares / f.personas), `${ars.format(f.sin_familiares)} no informan grupo familiar.`],
  ].map(([label, value, detail]) => `<article class="stat-card"><h3>${label}</h3><strong>${value}</strong><span>${detail}</span></article>`).join('');
  barChart(document.getElementById('chart-hijos'), f.hijos_dist, (r) => ars.format(r.count));
  const hs = f.hijos_stack || [];
  if (hs.length) {
    const maxH = Math.max(...hs.map((r) => r.total), 1);
    const BCOL = { LLA: '#a78bfa', PRO: '#f59e0b', PJ: '#38bdf8', UCR: '#e4002b' };
    document.getElementById('chart-hijos').innerHTML = hs.map((r) => `
    <div class="bar-row" style="grid-template-columns:11rem minmax(4rem,1fr) 3.5rem">
      <span class="bar-label">${r.label}</span>
      <span class="stack-track" role="img" aria-label="${r.label}: ${r.segs.map((s) => `${s.bloque} ${s.n}`).join(', ')}"><span class="stack-fill" style="inline-size:${(r.total / maxH) * 100}%">${r.segs.map((s) => `<span class="stack-seg" style="flex-grow:${s.n};background:${BCOL[s.bloque] || '#9aa0a6'}" title="${s.bloque}: ${s.n}"></span>`).join('')}</span></span>
      <span class="bar-value"><strong>${ars.format(r.total)}</strong></span>
    </div>`).join('');
  }
  const pctBar = (elId, rows) => {
    document.getElementById(elId).innerHTML = rows.map((r) => `
    <div class="bar-row" style="grid-template-columns:11rem minmax(4rem,1fr) 3.5rem">
      <span class="bar-label">${r.label}</span>
      <span class="stack-track" role="img" aria-label="${r.label}: ${r.si} sí, ${r.no} no"><span class="stack-fill" style="inline-size:100%"><span class="stack-seg" style="flex-grow:${r.si};background:${r.color}" title="Sí: ${r.si}"></span><span class="stack-seg" style="flex-grow:${r.no};background:#e9eae6" title="No: ${r.no}"></span></span></span>
      <span class="bar-value"><strong>${pct1.format(r.si / (r.si + r.no))}</strong></span>
    </div>`).join('');
  };
  const BCOL2 = { LLA: '#a78bfa', PRO: '#f59e0b', PJ: '#38bdf8', UCR: '#e4002b', Otros: '#9aa0a6' };
  const crow = (p, siFn) => ({ label: p.bloque === 'PJ' ? 'Peronismo' : p.bloque, si: siFn(p), no: p.n - siFn(p), color: BCOL2[p.bloque] || '#9aa0a6' });
  pctBar('chart-hijos-partido', (f.por_partido || []).map((p) => crow(p, (x) => x.hijos)));
  pctBar('chart-fam-partido', (f.por_partido || []).map((p) => crow(p, (x) => x.alguno)));
}

async function load(name) {
  const r = await fetch(`./data/${name}.json`);
  if (!r.ok) throw new Error(name);
  return r.json();
}

function barChart(el, rows, valueFmt) {
  const max = Math.max(...rows.map((r) => r.share), 1e-9);
  el.innerHTML = rows.map((r) => `
    <div class="bar-row">
      <span class="bar-label">${r.label}</span>
      <div class="bar-track" aria-hidden="true"><span class="bar-fill" style="inline-size:${Math.max(1.5, (r.share / max) * 100)}%"></span></div>
      <span class="bar-value"><strong>${valueFmt(r)}</strong><small>${pct1.format(r.share)}</small></span>
    </div>`).join('');
}

const BLOQUE_COLOR = { LLA: '#a78bfa', PRO: '#f59e0b', PJ: '#38bdf8', UCR: '#e4002b', PEN: '#7c3aed' };
const BLOQUE_LABEL = { LLA: 'La Libertad Avanza', PRO: 'PRO', PJ: 'Peronismo', UCR: 'UCR', PEN: 'Poder Ejecutivo' };
const BLOQUE_DARK_TEXT = { LLA: true, PRO: true, PJ: true, UCR: false, PEN: false };

function packLayout(items) {
  // items: [{r}] ordenados desc. Posiciones tangentes candidatas, elige la más cercana al centro sin solape.
  const placed = [];
  const overlap = (x, y, r) => placed.some((p) => {
    const dr = r + p.r - 0.5, dx = x - p.x, dy = y - p.y;
    return dr > 0 && dr * dr > dx * dx + dy * dy;
  });
  const tangent = (a, b, r, s) => {
    const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
    if (!d2) return { x: a.x + a.r + r, y: a.y };
    const d = Math.sqrt(d2);
    const x = (Math.pow(a.r + r, 2) - Math.pow(b.r + r, 2) + d2) / (2 * d);
    const y = Math.sqrt(Math.max(0, Math.pow(a.r + r, 2) - x * x));
    return { x: a.x + (dx * x + s * dy * y) / d, y: a.y + (dy * x - s * dx * y) / d };
  };
  items.forEach((it, idx) => {
    const r = it.r;
    if (idx === 0) { it.x = 0; it.y = 0; }
    else if (idx === 1) { it.x = placed[0].r + r; it.y = 0; }
    else {
      let best = null, bestD = Infinity;
      for (let i = 0; i < placed.length; i++) {
        for (let j = i + 1; j < placed.length; j++) {
          for (const s of [1, -1]) {
            const c = tangent(placed[i], placed[j], r, s);
            if (overlap(c.x, c.y, r)) continue;
            const d = c.x * c.x + c.y * c.y;
            if (d < bestD) { bestD = d; best = c; }
          }
        }
      }
      if (!best) best = { x: 0, y: -(placed[0].r + r + 2) };
      it.x = best.x; it.y = best.y;
    }
    placed.push(it);
  });
  return placed;
}

function renderPackPersonas() {
  const store = (typeof DATA !== 'undefined') ? DATA : window.__scat;
  const items = store.pack_personas.map((d) => ({ ...d, r: Math.sqrt(Math.max(d.total, 1) / Math.PI) }));
  packLayout(items);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  items.forEach((n) => { x0 = Math.min(x0, n.x - n.r); x1 = Math.max(x1, n.x + n.r); y0 = Math.min(y0, n.y - n.r); y1 = Math.max(y1, n.y + n.r); });
  const W = 960, H = 620, pad = 8;
  const k = Math.min((W - pad * 2) / (x1 - x0), (H - pad * 2) / (y1 - y0));
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.getElementById('pack-personas-svg');
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const [kk, v] of Object.entries(attrs)) n.setAttribute(kk, v);
    (parent || svg).appendChild(n); return n;
  };
  const X = (x) => pad + (x - x0) * k, Y = (y) => pad + (y - y0) * k;
  const short = (s, len) => s.length > len ? `${s.slice(0, len - 1)}…` : s;
  const splitName = (s) => {
    const w = s.split(' ').filter(Boolean);
    if (w.length < 2) return [s];
    return [w.slice(0, -1).join(' '), w[w.length - 1]];
  };
  items.forEach((n) => {
    const cx = X(n.x), cy = Y(n.y), rr = Math.max(n.r * k, 1.5);
    const g = el('g', {});
    const c = el('circle', { class: 'pack-node', cx: cx.toFixed(1), cy: cy.toFixed(1), r: rr.toFixed(1), fill: BLOQUE_COLOR[n.bloque] || '#9aa0a6' }, g);
    const dark = BLOQUE_DARK_TEXT[n.bloque] !== false;
    const ink = dark ? '#171817' : '#ffffff';
    const title = el('title', {}, c);
    title.textContent = `${n.nombre} — ${n.detalle} · ${n.inmuebles} inmuebles · total ${money(n.total)}`;
    if (rr >= 30) {
      const fs1 = Math.min(14, rr * 0.22), fs2 = Math.min(10.5, rr * 0.155);
      const [nl1, nl2] = splitName(n.nombre);
      const bud = Math.max(4, Math.floor((rr * 1.9) / (fs1 * 0.55)));
      const y0t = cy - fs1 * 1.35;
      const l1 = el('text', { x: cx, y: y0t, 'font-size': fs1, 'font-weight': 700, fill: ink }, g);
      l1.textContent = short(nl1, bud);
      if (nl2) {
        const l2 = el('text', { x: cx, y: y0t + fs1 * 1.12, 'font-size': fs1, 'font-weight': 700, fill: ink }, g);
        l2.textContent = short(nl2, bud);
      }
      const t2 = el('text', { x: cx, y: y0t + fs1 * 1.12 + fs2 * 1.3, 'font-size': fs2, fill: ink, opacity: 0.85 }, g);
      t2.textContent = short(n.detalle.split(' · ')[0] || n.detalle, Math.floor(rr / 3.4));
      const t3 = el('text', { x: cx, y: y0t + fs1 * 1.12 + fs2 * 2.45, 'font-size': fs2, fill: ink, opacity: 0.85 }, g);
      t3.textContent = `${n.inmuebles} inm. · ${money(n.total)}`;
    } else if (rr >= 14) {
      const t = el('text', { x: cx, y: cy + 3.5, 'font-size': 10, 'font-weight': 650, fill: ink }, g);
      t.textContent = short(n.nombre.split(' ').slice(-2).join(' '), Math.floor(rr / 3.2));
    }
  });
}

function renderPack() {
  const store = (typeof DATA !== 'undefined') ? DATA : window.__scat;
  const items = store.pack_inmuebles.map((d) => ({ ...d, r: Math.sqrt(Math.max(d.importe, 1) / Math.PI) }));
  const maxR = items[0].r;
  packLayout(items);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  items.forEach((n) => { x0 = Math.min(x0, n.x - n.r); x1 = Math.max(x1, n.x + n.r); y0 = Math.min(y0, n.y - n.r); y1 = Math.max(y1, n.y + n.r); });
  const W = 960, H = 620, pad = 8;
  const k = Math.min((W - pad * 2) / (x1 - x0), (H - pad * 2) / (y1 - y0));
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.getElementById('pack-svg');
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const [kk, v] of Object.entries(attrs)) n.setAttribute(kk, v);
    (parent || svg).appendChild(n); return n;
  };
  const X = (x) => pad + (x - x0) * k, Y = (y) => pad + (y - y0) * k;
  items.forEach((n) => {
    const cx = X(n.x), cy = Y(n.y), rr = Math.max(n.r * k, 1.5);
    const g = el('g', {});
    const c = el('circle', { class: 'pack-node', cx: cx.toFixed(1), cy: cy.toFixed(1), r: rr.toFixed(1), fill: BLOQUE_COLOR[n.bloque] || '#9aa0a6' }, g);
    const dark = BLOQUE_DARK_TEXT[n.bloque] !== false;
    const ink = dark ? '#171817' : '#ffffff';
    const title = el('title', {}, c);
    title.textContent = `${n.nombre} — ${n.detalle} · ${n.tipo} en ${n.localidad}${n.provincia ? `, ${n.provincia}` : ''}${n.pais ? ` (${n.pais})` : ''} · ${n.superficie_m2 ? `${n.superficie_m2} m² · ` : ''}ingreso ${n.fecha_ingreso} · tit. ${n.titularidad_pct ?? '—'}% · ${money(n.importe)}`;
    const short = (s, len) => s.length > len ? `${s.slice(0, len - 1)}…` : s;
    const splitName = (s) => {
      const w = s.split(' ').filter(Boolean);
      if (w.length < 2) return [s];
      return [w.slice(0, -1).join(' '), w[w.length - 1]];
    };
    if (rr >= 32) {
      const fs1 = Math.min(14, rr * 0.22), fs2 = Math.min(10.5, rr * 0.155);
      const [nl1, nl2] = splitName(n.nombre);
      const bud = Math.max(4, Math.floor((rr * 1.9) / (fs1 * 0.55)));
      const y0 = cy - fs1 * 1.35;
      const l1 = el('text', { x: cx, y: y0, 'font-size': fs1, 'font-weight': 700, fill: ink }, g);
      l1.textContent = short(nl1, bud);
      if (nl2) {
        const l2 = el('text', { x: cx, y: y0 + fs1 * 1.12, 'font-size': fs1, 'font-weight': 700, fill: ink }, g);
        l2.textContent = short(nl2, bud);
      }
      const t2 = el('text', { x: cx, y: y0 + fs1 * 1.12 + fs2 * 1.3, 'font-size': fs2, fill: ink, opacity: 0.85 }, g);
      t2.textContent = short(`${n.detalle.split(' · ')[0]} · ${n.bloque_label}`, Math.floor(rr / 3.4));
      const t3 = el('text', { x: cx, y: y0 + fs1 * 1.12 + fs2 * 2.45, 'font-size': fs2, fill: ink, opacity: 0.85 }, g);
      const sup = parseFloat(n.superficie_m2);
      t3.textContent = short(n.tipo + (sup ? ` · ${ars.format(sup)} m²` : ''), Math.floor(rr / 3.1));
    } else if (rr >= 15) {
      const t = el('text', { x: cx, y: cy + 3.5, 'font-size': 10, 'font-weight': 650, fill: ink }, g);
      t.textContent = short(n.nombre.split(' ').slice(-2).join(' '), Math.floor(rr / 3.2));
    }
  });
}
function tickLabel(v) {
  if (v >= 1e9) return `$${ars1.format(v / 1e9)} mil M`;
  if (v >= 1e6) return `$${ars1.format(v / 1e6)} M`;
  return `$${ars.format(v)}`;
}

const BAND_COLOR = { linea315: '#e4002b', plano: '#252725', linea405: '#c68a00', otro: '#b80022', alta: '#8b9095' };

function renderScatter(svgId, readoutId, points, detail, opts = {}) {
  const dotR = opts.dotR ?? 4.2, outR = opts.outR ?? 6;
  const stroke = opts.stroke ?? 'rgb(255 255 255 / 72%)';
  const svg = document.getElementById(svgId);
  const readout = document.getElementById(readoutId);
  const NS = 'http://www.w3.org/2000/svg';
  const W = 960, H = 560, M = { top: 24, right: 24, bottom: 76, left: 104 };
  const PW = W - M.left - M.right, PH = H - M.top - M.bottom;
  const pts = points.filter((p) => p.x > 0 && p.y > 0 && p.banda !== 'plano' && Math.min(p.x, p.y) >= 100000);
  const lo = Math.max(5, Math.floor(Math.log10(Math.min(...pts.map((p) => Math.min(p.x, p.y)))) - 0.15));
  const hi = Math.ceil(Math.log10(Math.max(...pts.map((p) => Math.max(p.x, p.y)))) + 0.15);
  const X = (v) => M.left + ((Math.log10(v) - lo) / (hi - lo)) * PW;
  const Y = (v) => M.top + PH - ((Math.log10(v) - lo) / (hi - lo)) * PH;
  const el = (tag, attrs) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    svg.appendChild(n); return n;
  };
  el('rect', { class: 'scatter-frame', x: M.left, y: M.top, width: PW, height: PH });
  for (let t = lo; t <= hi; t++) {
    const v = 10 ** t;
    el('line', { class: 'scatter-grid', x1: X(v), x2: X(v), y1: M.top, y2: M.top + PH });
    const tx = el('text', { class: 'scatter-tick', x: X(v), y: M.top + PH + 24, 'text-anchor': 'middle' });
    tx.textContent = tickLabel(v);
    el('line', { class: 'scatter-grid', x1: M.left, x2: M.left + PW, y1: Y(v), y2: Y(v) });
    const ty = el('text', { class: 'scatter-tick', x: M.left - 12, y: Y(v) + 4, 'text-anchor': 'end' });
    ty.textContent = tickLabel(v);
  }
  const t1 = el('text', { class: 'scatter-axis-title', x: M.left + PW / 2, y: H - 18, 'text-anchor': 'middle' });
  t1.textContent = 'Valor de cierre 2024 (ARS)';
  const t2 = el('text', { class: 'scatter-axis-title', transform: `translate(26 ${M.top + PH / 2}) rotate(-90)`, 'text-anchor': 'middle' });
  t2.textContent = 'Valor de cierre 2025 (ARS)';
  const line = (ratio, cls) => {
    const x0 = 10 ** lo, x1 = 10 ** hi;
    el('line', { class: `scatter-ref ${cls}`, x1: X(x0), y1: Y(x0 * ratio), x2: X(x1), y2: Y(x1 * ratio) });
  };
  line(1, 'scatter-ref-id');
  line(1.315488, 'scatter-ref-line');
  const g = el('g', { class: 'scatter-points' });
  const show = (p) => { readout.innerHTML = detail(p); };
  for (const p of pts) {
    const out = p.banda === 'otro' || p.banda === 'alta';
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', X(p.x)); c.setAttribute('cy', Y(p.y));
    c.setAttribute('r', out ? outR : dotR);
    c.setAttribute('fill', BLOQUE_COLOR[p.bloque] || '#9aa0a6');
    c.setAttribute('stroke', stroke);
    if (out) c.setAttribute('class', 'out');
    c.addEventListener('mouseenter', () => show(p));
    c.addEventListener('click', () => show(p));
    g.appendChild(c);
  }
  (opts.labels || []).forEach((p) => {
    if (p.x <= 0 || p.y <= 0) return;
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', X(p.x) + 8); t.setAttribute('y', Y(p.y) - 8);
    t.setAttribute('class', 'scatter-label');
    t.textContent = (p.nombre || '').split(' ')[0];
    svg.appendChild(t);
  });
}

function rol(o) { return o.detalle || o.cargo || ''; }
function ratioTxt(p) { return `${(p.y / p.x).toFixed(2).replace('.', ',')}×`; }
function countFmt(r) { return ars.format(r.count); }

const svgIcon = (paths) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const TIPO_STYLE = [
  [/DEPARTAMENTO/, 'Departamento', '#e4002b', false, '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3"/>'],
  [/COCHERA/, 'Cochera', '#8b9095', false, '<rect x="3" y="9" width="18" height="7" rx="2"/><circle cx="7.5" cy="18" r="1.6"/><circle cx="16.5" cy="18" r="1.6"/><path d="M6 9l2-4h8l2 4"/>'],
  [/^CASA$/, 'Casa', '#252725', false, '<path d="M3 11.5 12 3l9 8.5"/><path d="M5 10v10h5v-6h4v6h5V10"/>'],
  [/LOTE/, 'Lote de terreno', '#c68a00', false, '<rect x="4" y="4" width="16" height="16" rx="1" stroke-dasharray="4 3"/><path d="M4 16l5-5M10 20l6-6"/>'],
  [/RURAL/, 'Rural', '#5a7d5a', false, '<path d="M12 21v-8"/><path d="M12 13c0-4 3-7 8-7 0 4-3 7-8 7z"/><path d="M12 13c0-4-3-7-8-7 0 4 3 7 8 7z"/>'],
  [/LOCAL/, 'Local', '#4a6fa5', false, '<path d="M4 9l1.2-5h13.6L20 9"/><path d="M4 9h16v2.5a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0V9z"/><path d="M5.5 14.5V21h13v-6.5"/>'],
  [/COUNTRY|QUINTA/, 'Country / quinta', '#777c77', false, '<circle cx="17" cy="6" r="2.6"/><path d="M17 8.6V12"/><path d="M2.5 12.5 9 6.5l6.5 6"/><path d="M4.5 11.5V19h9v-7.5"/>'],
  [/MEJORA|CONSTRUCCION/, 'Mejoras', '#b08968', false, '<rect x="3" y="6" width="18" height="12" rx="1"/><path d="M3 12h18M9 6v6M15 12v6"/>'],
];
function tipoStyle(t) {
  const u = (t || '').toUpperCase();
  for (const [re, label, color, dark, paths] of TIPO_STYLE) {
    if (re.test(u)) return { label, color, dark, icon: svgIcon(paths) };
  }
  return { label: t, color: '#c9cdd0', dark: true, icon: svgIcon('<path d="M12 2.5 21 7.5v9l-9 5-9-5v-9z"/><path d="M12 12.5 21 7.5M12 12.5 3 7.5M12 12.5v9"/>') };
}

let rankSort = 'monto';
function renderRanking() {
  const store = (typeof DATA !== 'undefined') ? DATA : window.__scat;
  const rows = store.ranking_nuevas.map((r) => ({
    ...r, total: (r.altas || []).reduce((s, a) => s + (a.importe || 0), 0),
  }));
  const maxTotal = Math.max(...rows.map((r) => r.total), 1);
  const sorted = [...rows].sort((a, b) => rankSort === 'monto'
    ? b.total - a.total : (b.nuevas - a.nuevas) || (b.total - a.total));
  const seen = {};
  rows.forEach((r) => (r.altas || []).forEach((a) => {
    const s = tipoStyle(a.tipo);
    seen[s.label] = seen[s.label] || { ...s, n: 0 };
    seen[s.label].n += 1;
  }));
  document.getElementById('rank-legend').innerHTML = Object.values(seen)
    .sort((a, b) => b.n - a.n)
    .map((c) => `<span style="color:${c.color}">${c.icon}</span><span>${c.label.toLowerCase()}</span>`)
    .join('');
  document.getElementById('rank-nuevas').innerHTML = sorted.map((r, i) => {
    const altas = r.altas || [];
    const segs = altas.map((a) => {
      const s = tipoStyle(a.tipo);
      const share = r.total ? (a.importe || 0) / r.total : 0;
      const showIcon = share > 0.12;
      return `<span class="stack-seg" style="flex-grow:${Math.max(a.importe || 0, 1)};background:${s.color};color:${s.dark ? '#252725' : '#fff'}" title="${a.tipo} en ${a.localidad || '—'} — ${money(a.importe || 0)}">${showIcon ? s.icon : ''}</span>`;
    }).join('');
    return `<div class="rank-row">
      <span class="rank-pos">${i + 1}</span>
      <span class="rank-name">${r.nombre}<span class="rank-badge">+${r.nuevas}</span><small>${rol(r) ? `${rol(r)} · ` : ''}${r.n24} → ${r.n25} inmuebles</small></span>
      <span class="stack-track" role="img" aria-label="Altas por ${money(r.total)}: ${altas.map((a) => `${a.tipo} ${money(a.importe || 0)}`).join(', ')}"><span class="stack-fill" style="inline-size:${(r.total / maxTotal) * 100}%">${segs}</span></span>
      <span class="rank-total">${money(r.total)}<small>en altas</small></span>
    </div>`;
  }).join('');
  document.querySelectorAll('.rank-sort button').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.sort === rankSort));
    if (!b.dataset.bound) {
      b.dataset.bound = '1';
      b.addEventListener('click', () => { rankSort = b.dataset.sort; renderRanking(); });
    }
  });
}

(async () => {
  let resumen, top, personas, tipos, provincias, paises, rangos, comp;
  if (typeof DATA !== 'undefined') {
    ({ resumen, top2025: top, top_personas: personas, tipos, provincias, paises, rangos, comparacion: comp } = DATA);
  } else {
    [resumen, top, personas, tipos, provincias, paises, rangos, comp] = await Promise.all(
      ['resumen', 'top2025', 'top_personas', 'tipos', 'provincias', 'paises', 'rangos', 'comparacion'].map(load));
    const [scP, scB, rk] = await Promise.all(['scatter_personas', 'scatter_bienes', 'ranking_nuevas'].map(load));
    const [cr, scT] = await Promise.all(['cruce_hipotecas', 'scatter_totales'].map(load));
    const [pk] = await Promise.all(['pack_inmuebles'].map(load));
    const [pkp] = await Promise.all(['pack_personas'].map(load));
    const [exq, qu] = await Promise.all(['exterior', 'quality'].map(load));
    const [er] = await Promise.all(['errores'].map(load));
    const [fam] = await Promise.all(['familia'].map(load));
    window.__scat = { scatter_personas: scP, scatter_bienes: scB, ranking_nuevas: rk, cruce_hipotecas: cr, scatter_totales: scT, pack_inmuebles: pk, pack_personas: pkp, exterior: exq, quality: qu, errores: er, familia: fam };
  }

  document.getElementById('source-line').textContent =
    `${ars.format(resumen.filas)} inmuebles · ${ars.format(resumen.declaraciones)} declaraciones · ${ars.format(resumen.personas_consultadas)} personas · sept. 2026`;

  document.getElementById('stats').innerHTML = [
    ['Inmuebles registrados', ars.format(resumen.filas), `${ars.format(resumen.cuits_con_inmuebles)} personas con al menos uno.`],
    ['Declaraciones procesadas', ars.format(resumen.declaraciones), `Años 2012–2025 · ${ars.format(resumen.personas_consultadas)} personas consultadas.`],
    ['Bienes en el exterior', ars.format(resumen.filas_exterior), `El ${pct1.format(resumen.filas_exterior / resumen.filas)} del total de filas.`],
    ['Cierres 2025', ars.format(resumen.cierre_2025), `Contra ${ars.format(resumen.cierre_2024)} cierres 2024 comparables.`],
    ['¿De qué poderes vienen?', '4', `Legisladores ${resumen.consultados_poder.legisladores} · Políticos ${resumen.consultados_poder.politicos} · Judicial ${resumen.consultados_poder.judicial} · JGM ${resumen.consultados_poder.jgm}.`],
    ['Fuerzas políticas', ars.format(resumen.partidos), 'Partidos y alianzas entre legisladores.'],
    ['Valuación total 2025', `$${ars1.format(resumen.valuacion_total_2025 / 1e9)} mil M`, `Suma declarada por ${ars.format(resumen.personas_cierre_2025)} personas con cierre 2025.`],
  ].map(([label, value, detail]) => `<article class="stat-card"><h3>${label}</h3><strong>${value}</strong><span>${detail}</span></article>`).join('');

  document.querySelector('#top-table tbody').innerHTML = top.map((r) => `
    <tr><td><strong>${r.nombre}</strong><br><small>${rol(r) ? `${rol(r)} · ` : ''}${r.tipo} · ${r.titularidad_pct ?? '—'}% titularidad</small></td>
    <td>${r.destino}</td><td>${r.localidad}${r.provincia && r.provincia !== r.localidad ? `, ${r.provincia}` : ''}${r.pais ? ` (${r.pais})` : ''}</td>
    <td>${m2(r.superficie_m2)}</td><td>${r.fecha_ingreso}</td><td><strong>${money(r.importe)}</strong></td></tr>`).join('');

  const leads = [
    ['+31,55%', 'cinco inmuebles del país', 'Henke ×2, Caputo, Cúneo Libarona, Kirchner ×2. Factor exacto 1,315488: actualización fiscal uniforme.'],
    ['+40,52%', 'dos bienes del exterior', 'Pascual (La Barra) y Lucero (Washington DC). Coherente con actualización cambiaria.'],
    ['+39,26% · 0%', 'dos casos distintos', 'Romero (Punta del Este) sube 39,26%; Figueroa Casas (Los Molles) no varía.'],
  ];
  document.getElementById('evo-leads').innerHTML = leads.map(([v, t, d], i) => `
    <article class="lead-card${i === 0 ? ' lead-accent' : ''}"><h3>${t}</h3><span>${v}</span><p>${d}</p></article>`).join('');

  document.querySelector('#evo-table tbody').innerHTML = comp.map((r) => {
    const v = parseFloat(String(r.variacion_pct).replace(',', '.'));
    return `<tr${v === 31.5488 ? ' class="hl"' : ''}><td><strong>${r.titular}</strong><br><small>${rol(r) ? `${rol(r)} · ` : ''}${r.inmueble}</small></td>
    <td>$${ars.format(parseFloat(r.valor_cierre_2024_ars) / 1e6)} M</td>
    <td>$${ars.format(parseFloat(r.valor_cierre_2025_ars) / 1e6)} M</td>
    <td><strong>+${v.toFixed(2).replace('.', ',')}%</strong></td></tr>`;
  }).join('');

  document.getElementById('n-cierre').textContent = ars.format(resumen.cierre_2025);
  barChart(document.getElementById('chart-tipos'), tipos, countFmt);
  barChart(document.getElementById('chart-rangos'), rangos, countFmt);
  barChart(document.getElementById('chart-provincias'), provincias, countFmt);
  barChart(document.getElementById('chart-paises'), paises, countFmt);

  const maxP = Math.max(...personas.map((p) => p.total));
  document.getElementById('chart-personas').innerHTML = personas.map((p) => `
    <div class="bar-row">
      <span class="bar-label">${p.nombre}</span>
      <div class="bar-track" aria-hidden="true"><span class="bar-fill" style="inline-size:${Math.max(1.5, (p.total / maxP) * 100)}%;background:${BLOQUE_COLOR[p.bloque] || '#9aa0a6'}" title="${p.bloque || 'Otros'}"></span></div>
      <span class="bar-value"><strong>${moneyShort(p.total)}</strong></span>
      <span class="prop-squares" style="color:${BLOQUE_COLOR[p.bloque] || '#9aa0a6'}" role="img" aria-label="${p.inmuebles} inmuebles">${'<i></i>'.repeat(p.inmuebles)}</span>
      <span class="prop-count">${p.inmuebles} inm.</span>
    </div>`).join('');

  scatterDetails();
  renderRanking();
  renderCruce();
  renderPack();
  renderPackPersonas();
  renderExterior();
  renderQuality();
  renderErrores();
  renderFamilia();
})().catch(() => {
  document.getElementById('source-line').textContent = 'No se pudieron cargar los datos.';
});
