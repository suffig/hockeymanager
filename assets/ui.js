/* ==========================================================
   Puckero – gemeinsame Oberflächen-Bausteine
   ========================================================== */

const UI = (() => {

  const NAVLINKS = [
    { href:'index.html#spielen',   n:'Spielen' },
    { href:'spiele.html',          n:'Spiele' },
    { href:'herausforderungen.html', n:'Ziele' },
    { href:'guides.html',          n:'Guides' },
    { href:'pokalraum.html',       n:'Pokalraum' },
    { href:'index.html#faq',       n:'FAQ' }
  ];

  function header(active){
    const links = NAVLINKS.map(l =>
      `<a href="${l.href}"${l.n === active ? ' class="active"' : ''}>${l.n}</a>`).join('');
    return `
<header class="site">
  <div class="wrap">
    <div class="nav" id="mainnav">
      <a class="brand" href="index.html"><span class="puck"></span>PUCKERO</a>
      <button class="menu-btn" aria-label="Menü" onclick="document.getElementById('mainnav').classList.toggle('open')">☰</button>
      <nav>${links}</nav>
    </div>
  </div>
</header>`;
  }

  function footer(){
    return `
<footer class="site">
  <div class="wrap">
    <div class="cols">
      <div>
        <a class="brand" href="index.html" style="margin-bottom:12px"><span class="puck"></span>PUCKERO</a>
        <p class="small" style="max-width:34ch">Kostenlose Eishockey-Karrieresimulation im Browser.
        Kein Konto, keine Installation, keine Bezahlschranke.</p>
      </div>
      <div>
        <h4>Spielen</h4>
        <ul>
          <li><a href="index.html#spielen">Eislegende</a></li>
          <li><a href="schnellkarriere.html">Schnellkarriere</a></li>
          <li><a href="taeglich.html">Tageskarriere</a></li>
          <li><a href="spiele.html">Alle Spiele</a></li>
        </ul>
      </div>
      <div>
        <h4>Lernen</h4>
        <ul>
          <li><a href="guides.html">Guides</a></li>
          <li><a href="guides.html#positionen">Attribute je Position</a></li>
          <li><a href="guides.html#wertung">So entsteht die Wertung</a></li>
          <li><a href="index.html#faq">FAQ</a></li>
        </ul>
      </div>
      <div>
        <h4>Sammlung</h4>
        <ul>
          <li><a href="pokalraum.html">Pokalraum</a></li>
          <li><a href="herausforderungen.html">Herausforderungen</a></li>
          <li><a href="pokalraum.html#bestenliste">Bestenliste</a></li>
        </ul>
      </div>
    </div>
    <div class="foot-bottom">
      <span>© ${new Date().getFullYear()} Puckero – ein nicht lizenziertes Fanprojekt.</span>
      <span>Klub-, Liga- und Trophäennamen gehören ihren jeweiligen Inhabern.
        Es besteht keine Verbindung zu Ligen, Verbänden oder Vereinen.</span>
    </div>
  </div>
</footer>`;
  }

  function mount(active){
    const h = document.getElementById('hdr');
    const f = document.getElementById('ftr');
    if (h) h.outerHTML = header(active);
    if (f) f.outerHTML = footer();
  }

  /* ---------- Bausteine ---------- */
  function attrRows(player, attrs){
    const list = PUCKERO.attrsOf(player.pos);
    const a = attrs || player.attrs;
    return list.map(x => {
      const v = a[x.k] || 0;
      const cls = v >= 82 ? 'hi' : (v <= 45 ? 'lo' : '');
      return `<div class="attr"><span class="n">${x.n}</span>
        <span class="bar"><i class="${cls}" style="width:${Math.min(100, v)}%"></i></span>
        <span class="v">${v}</span></div>`;
    }).join('');
  }

  /* Wappen und Pokale kommen aus wappen.js – fehlt die Datei, bleibt es leer */
  function wappenBild(klub, groesse){
    return (typeof WAPPEN !== 'undefined') ? WAPPEN.wappen(klub, groesse || 28) : '';
  }
  function pokalBild(key, groesse){
    return (typeof WAPPEN !== 'undefined') ? WAPPEN.pokal(key, groesse || 34) : '';
  }

  function ovrBadge(v, gold){
    return `<div class="ovr ${gold ? 'gold' : ''}"><b>${v}</b><span>Gesamt</span></div>`;
  }

  /* ---------- Saisonkarte ---------- */
  function seasonCard(s, isG, blind, neu){
    const kl = ['season'];
    if (neu) kl.push('neu');
    if (s.title) kl.push('titel');
    if (s.sternstunde) kl.push('sternstunde');

    const line = isG
      ? `<span>Spiele <b>${s.gp}</b></span>
         <span>Bilanz <b>${s.wins}-${s.losses || 0}-${s.otl || 0}</b></span>
         <span>Fangquote <b>${(s.sv * 100).toFixed(1)}%</b></span>
         <span>Gegentorschnitt <b>${s.gaa.toFixed(2)}</b></span>
         <span>Shutouts <b>${s.so}</b></span>
         <span>Paraden <b>${s.saves || 0}</b></span>`
      : `<span>Spiele <b>${s.gp}</b></span><span>Tore <b>${s.g}</b></span>
         <span>Vorlagen <b>${s.a}</b></span><span>Punkte <b>${s.p}</b></span>
         <span>+/- <b>${s.plus > 0 ? '+' : ''}${s.plus}</b></span>
         <span>PP <b>${s.ppg || 0}</b></span>
         <span>Siegtore <b>${s.gwg || 0}</b></span>
         <span>Schüsse <b>${s.shots || 0}</b> (${s.shotPct || 0}%)</span>
         <span>Eiszeit <b>${s.toi || 0}</b> min</span>
         ${s.bully ? '<span>Bully <b>' + s.bully + '%</b></span>' : ''}
         <span>Strafen <b>${s.pim || 0}</b></span>`;

    const evs = s.events.map(e => `<div class="ev ${e.c}">${e.t}</div>`).join('');
    const nat = s.nat ? `<div class="story" style="border-left-color:var(--gold);background:rgba(255,200,97,.08)">
        ${s.nat.kurz} ${s.nat.jahr} mit der Nationalmannschaft – ${s.nat.platz}
        ${isG ? '(' + s.nat.gp + ' Spiele, ' + s.nat.wins + ' Siege)'
              : '(' + s.nat.gp + ' Spiele, ' + s.nat.p + ' Punkte)'}
      </div>` : '';

    return `<div class="${kl.join(' ')}">
      <div class="season-head">
        <span class="yr">${s.year}/${String(s.year + 1).slice(2)}</span>
        <span class="club klubname">${wappenBild(s.club, 26)}
          ${s.kapitaen ? '<span class="kapitaen-c">C</span> ' : ''}${s.club}</span>
        <span class="lgtag lg-${s.lg}">${s.lgName}</span>
        <span class="pill">${s.age} Jahre</span>
        ${blind ? '' : '<span class="pill">GES ' + s.ovr + '</span>'}
        ${s.rolle ? '<span class="pill">' + s.rolle + '</span>' : ''}
        ${s.platz ? '<span class="pill">' + s.platz + '. Platz</span>' : ''}
        ${s.sternstunde ? '<span class="pill" style="color:var(--accent-2);border-color:var(--accent-2)">Sternstunde</span>' : ''}
        ${s.title ? '<span class="pill gold">' + s.title + '</span>' : ''}
      </div>
      <div class="statline">${line}</div>
      ${evs ? '<div class="events">' + evs + '</div>' : ''}
      ${nat}
      ${s.story ? '<div class="story">' + s.story + '</div>' : ''}
    </div>`;
  }

  /* ---------- Statistikkacheln ---------- */
  function statBoxen(eintraege){
    return '<div class="statgrid stagger">' + eintraege.map(([n, v, farbe]) =>
      `<div class="statbox"><b class="${farbe || ''}">${v}</b><span>${n}</span></div>`).join('') + '</div>';
  }

  /* ---------- Nationalmannschaft ---------- */
  function natTabelle(res){
    const b = res.laenderBilanz || {};
    if (!b.turniere) return `<p class="small">Nie für die Nationalmannschaft nominiert –
      dafür hätte es eine höhere Gesamtwertung gebraucht.</p>`;
    const medaille = p => p === 'Gold' ? '<span class="medaille gold">🥇</span>'
                       : p === 'Silber' ? '<span class="medaille">🥈</span>'
                       : p === 'Bronze' ? '<span class="medaille">🥉</span>' : '';
    const zeilen = res.laender.map(t => `
      <div class="natzeile">
        <span class="jahr">${t.jahr}</span>
        <span>${t.n} ${medaille(t.platz)}
          <span class="small" style="display:block">${t.platz}</span></span>
        <span style="text-align:right">${res.isG
          ? t.gp + ' Sp · ' + t.wins + ' S'
          : t.gp + ' Sp · ' + t.p + ' Pkt'}</span>
      </div>`).join('');
    const kacheln = res.isG
      ? [['Turniere', b.turniere], ['Spiele', b.gp], ['Siege', b.wins],
         ['Shutouts', b.so], ['Medaillen', b.medaillen, 'gold']]
      : [['Turniere', b.turniere], ['Spiele', b.gp], ['Tore', b.g],
         ['Vorlagen', b.a], ['Punkte', b.p], ['Medaillen', b.medaillen, 'gold']];
    return statBoxen(kacheln) + '<div class="mt">' + zeilen + '</div>';
  }

  /* ---------- Konfetti ---------- */
  function konfetti(anzahl){
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const farben = ['#38d1ff','#ffc861','#7c6bff','#3ee08f','#ff6b7a'];
    const box = document.createElement('div');
    box.className = 'konfetti';
    for (let i = 0; i < (anzahl || 60); i++){
      const t = document.createElement('i');
      t.style.left = Math.random() * 100 + '%';
      t.style.background = farben[Math.floor(Math.random() * farben.length)];
      t.style.animationDuration = (1.8 + Math.random() * 1.6) + 's';
      t.style.animationDelay = (Math.random() * 0.5) + 's';
      box.appendChild(t);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 4200);
  }

  /* ---------- Zahlen hochzählen ---------- */
  function zahlHoch(el, ziel, dauer){
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      el.textContent = ziel; return;
    }
    const start = performance.now(), d = dauer || 900;
    const schritt = jetzt => {
      const t = Math.min(1, (jetzt - start) / d);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(ziel * eased);
      if (t < 1) requestAnimationFrame(schritt);
    };
    requestAnimationFrame(schritt);
  }
  function alleZahlenHoch(wurzel){
    (wurzel || document).querySelectorAll('[data-zahl]').forEach(el => {
      const z = parseFloat(el.dataset.zahl);
      if (!isNaN(z)) zahlHoch(el, z);
    });
  }

  function statsTable(res){
    const isG = res.isG;
    const head = isG
      ? `<tr><th>Saison</th><th>Klub</th><th>Liga</th><th>Pl</th><th>Sp</th><th>S</th><th>N</th><th>OT</th>
           <th>Fq%</th><th>GTS</th><th>SO</th><th>Paraden</th></tr>`
      : `<tr><th>Saison</th><th>Klub</th><th>Liga</th><th>Pl</th><th>Sp</th><th>T</th><th>V</th><th>Pkt</th>
           <th>+/-</th><th>PP</th><th>SW</th><th>Sch</th><th>Q%</th><th>ET</th><th>SM</th></tr>`;

    const zeile = s => {
      const kl = s.title ? ' style="color:var(--gold)"' : (s.sternstunde ? ' style="color:var(--accent-2)"' : '');
      const kopf = `<td${kl}>${s.year}/${String(s.year + 1).slice(2)}</td>
                    <td${kl}>${s.kapitaen ? 'C · ' : ''}${s.club}</td>
                    <td><span class="lgtag lg-${s.lg}" style="font-size:10px">${s.lg}</span></td>
                    <td>${s.platz || '–'}</td>`;
      return isG
        ? `<tr>${kopf}<td>${s.gp}</td><td>${s.wins}</td><td>${s.losses || 0}</td><td>${s.otl || 0}</td>
             <td>${(s.sv * 100).toFixed(1)}</td><td>${s.gaa.toFixed(2)}</td><td>${s.so}</td>
             <td>${s.saves || 0}</td></tr>`
        : `<tr>${kopf}<td>${s.gp}</td><td>${s.g}</td><td>${s.a}</td><td><b>${s.p}</b></td>
             <td>${s.plus > 0 ? '+' : ''}${s.plus}</td><td>${s.ppg || 0}</td><td>${s.gwg || 0}</td>
             <td>${s.shots || 0}</td><td>${s.shotPct || 0}</td><td>${s.toi || 0}</td>
             <td>${s.pim || 0}</td></tr>`;
    };
    const rows = res.seasons.map(zeile).join('');
    const t = res.totals;
    const tot = isG
      ? `<tr class="total"><td>Gesamt</td><td>${res.seasons.length} Saisons</td><td></td><td></td><td>${t.gp}</td>
           <td>${t.wins}</td><td>${t.losses}</td><td>${t.otl}</td><td>${(t.sv * 100).toFixed(1)}</td>
           <td>${t.gaa.toFixed(2)}</td><td>${t.so}</td><td>${t.saves}</td></tr>`
      : `<tr class="total"><td>Gesamt</td><td>${res.seasons.length} Saisons</td><td></td><td></td><td>${t.gp}</td>
           <td>${t.g}</td><td>${t.a}</td><td>${t.p}</td><td>${t.plus > 0 ? '+' : ''}${t.plus}</td>
           <td>${t.ppg}</td><td>${t.gwg}</td><td>${t.shots}</td><td>${t.shotPct}</td><td>–</td>
           <td>${t.pim}</td></tr>`;
    return `<div class="table-scroll"><table class="stats">
      <thead>${head}</thead><tbody>${rows}${tot}</tbody></table></div>
      <p class="small mt">Sp Spiele · ${isG ? 'S/N/OT Siege, Niederlagen, nach Verlängerung · Fq% Fangquote · GTS Gegentorschnitt · SO Shutouts'
        : 'T Tore · V Vorlagen · PP Powerplaytore · SW Siegtore · Sch Schüsse · Q% Schussquote · ET Eiszeit je Spiel · SM Strafminuten'}</p>`;
  }

  function trophyList(res){
    if (!res.trophies.length)
      return '<p class="small">Keine Titel – nicht jede Karriere endet in der Vitrine.</p>';
    return '<div class="vitrine stagger">' + res.trophies.map(t => `
      <div class="pokalkarte" title="${t.n}">
        <div class="pokalbild">${pokalBild(t.k || '', 46)}</div>
        <div class="pokalname">${t.n}</div>
        ${t.x > 1 ? '<span class="pokalzahl">' + t.x + '×</span>' : ''}
      </div>`).join('') + '</div>';
  }

  function shareText(res){
    const p = res.player;
    const n = PUCKERO.nation(p.nation);
    const stat = res.isG
      ? `${res.totals.wins} Siege, ${(res.totals.sv * 100).toFixed(1)}% Fangquote`
      : `${res.totals.p} Punkte (${res.totals.g} Tore)`;
    const tit = res.trophies.reduce((s, x) => s + x.x, 0);
    return `${p.name} #${p.num} ${n.flag} – ${PUCKERO.pos(p.pos).n}\n`
      + `${res.seasons.length} Saisons, Bestwert ${res.peak}\n`
      + `${stat}, ${tit} Titel\n`
      + `Legendenpunkte: ${res.legacy} – ${res.rank.n}\n`
      + `Deine Karriere: Puckero`;
  }

  /* Fortschrittsleiste: wie weit bis zum nächsten Rang? */
  function rankLeiste(legacy){
    const stufen = PUCKERO.RANG_SCHWELLEN.slice().reverse();   // aufsteigend
    let naechste = null;
    for (const [name, wert] of stufen){
      if (legacy < wert){ naechste = { name, wert }; break; }
    }
    const max = naechste ? naechste.wert : PUCKERO.RANG_SCHWELLEN[0][1];
    const anteil = Math.min(100, Math.round(legacy / max * 100));
    return `<div class="card mt" style="padding:14px 18px">
      <div class="row between" style="margin-bottom:8px">
        <span class="small">${legacy} Legendenpunkte</span>
        <span class="small">${naechste
          ? (naechste.wert - legacy) + ' bis „' + naechste.name + '“'
          : 'Höchster Rang erreicht'}</span>
      </div>
      <span class="bar" style="height:10px"><i class="${naechste ? '' : 'hi'}"
        style="width:${anteil}%"></i></span>
    </div>`;
  }

  /* ---------- Karriere-Karte als Bild ---------- */
  function karriereKarte(res){
    const p = res.player;
    const W = 1080, H = 1350;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');

    const grund = x.createLinearGradient(0, 0, W, H);
    grund.addColorStop(0, '#0d1830');
    grund.addColorStop(.55, '#070b16');
    grund.addColorStop(1, '#10203c');
    x.fillStyle = grund; x.fillRect(0, 0, W, H);

    // Mittellinie wie auf dem Eis
    x.strokeStyle = 'rgba(255,80,90,.16)'; x.lineWidth = 6;
    x.beginPath(); x.moveTo(W / 2, 0); x.lineTo(W / 2, H); x.stroke();
    x.strokeStyle = 'rgba(56,209,255,.14)';
    x.beginPath(); x.arc(W / 2, H / 2, 300, 0, Math.PI * 2); x.stroke();

    const mittig = (txt, y, groesse, farbe, fett) => {
      x.font = (fett || '700') + ' ' + groesse + 'px Inter, Segoe UI, sans-serif';
      x.fillStyle = farbe; x.textAlign = 'center';
      x.fillText(txt, W / 2, y);
    };

    x.textAlign = 'center';
    x.font = '700 30px Inter, Segoe UI, sans-serif';
    x.fillStyle = '#38d1ff';
    x.fillText('P U C K E R O', W / 2, 96);

    mittig(String(p.name).toUpperCase(), 210, 74, '#e8eefc', '800');
    const nat = PUCKERO.nation(p.nation);
    mittig('#' + p.num + '  ·  ' + PUCKERO.pos(p.pos).n + '  ·  ' + nat.n, 262, 32, '#8ea1c4', '600');

    // Gesamtwertung
    const gold = res.legacy >= 730;
    x.fillStyle = gold ? '#ffc861' : '#38d1ff';
    x.beginPath();
    const rr = (bx, by, bw, bh, rad) => {
      x.moveTo(bx + rad, by);
      x.arcTo(bx + bw, by, bx + bw, by + bh, rad);
      x.arcTo(bx + bw, by + bh, bx, by + bh, rad);
      x.arcTo(bx, by + bh, bx, by, rad);
      x.arcTo(bx, by, bx + bw, by, rad);
    };
    rr(W / 2 - 130, 320, 260, 200, 34); x.fill();
    x.fillStyle = gold ? '#2a1800' : '#04121c';
    x.font = '800 140px Inter, Segoe UI, sans-serif';
    x.fillText(String(res.peak), W / 2, 460);
    x.font = '800 24px Inter, Segoe UI, sans-serif';
    x.fillText('BESTWERT', W / 2, 500);

    mittig(res.rank.n.toUpperCase(), 596, 56, gold ? '#ffc861' : '#e8eefc', '800');
    mittig(res.legacy + ' LEGENDENPUNKTE', 640, 26, '#8ea1c4', '700');

    // Statistikblock
    const t = res.totals;
    const zeilen = res.isG
      ? [['Saisons', res.seasons.length], ['Spiele', t.gp], ['Siege', t.wins],
         ['Fangquote', (t.sv * 100).toFixed(1) + '%'], ['Shutouts', t.so]]
      : [['Saisons', res.seasons.length], ['Spiele', t.gp], ['Tore', t.g],
         ['Vorlagen', t.a], ['Punkte', t.p]];
    let y = 740;
    zeilen.forEach(([k, v]) => {
      x.textAlign = 'left';
      x.font = '600 34px Inter, Segoe UI, sans-serif'; x.fillStyle = '#8ea1c4';
      x.fillText(k, 140, y);
      x.textAlign = 'right';
      x.font = '800 34px Inter, Segoe UI, sans-serif'; x.fillStyle = '#e8eefc';
      x.fillText(String(v), W - 140, y);
      x.strokeStyle = 'rgba(255,255,255,.08)'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(140, y + 20); x.lineTo(W - 140, y + 20); x.stroke();
      y += 68;
    });

    // Vitrine
    x.textAlign = 'center';
    const titel = res.trophies.reduce((s, q) => s + q.x, 0);
    mittig(titel + ' Trophäen in ' + res.seasons.length + ' Saisons', y + 46, 30, '#ffc861', '700');
    const top = res.trophies.slice(0, 3).map(q => q.n + (q.x > 1 ? ' ×' + q.x : '')).join('  ·  ');
    if (top) mittig(top, y + 92, 24, '#8ea1c4', '600');

    mittig('Seed ' + p.seed, H - 70, 22, '#64769a', '600');

    c.toBlob(b => {
      if (!b) return toast('Karte konnte nicht erzeugt werden');
      const url = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'puckero-' + String(p.name).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast('Karte gespeichert');
    }, 'image/png');
  }

  function toast(msg){
    let el = document.querySelector('.toast');
    if (!el){ el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('on'), 2200);
  }

  function copy(text, msg){
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(() => toast(msg || 'Kopiert'))
        .catch(() => fallbackCopy(text, msg));
    } else fallbackCopy(text, msg);
  }
  function fallbackCopy(text, msg){
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast(msg || 'Kopiert'); } catch(e){ toast('Kopieren nicht moeglich'); }
    document.body.removeChild(ta);
  }

  return { header, footer, mount, attrRows, ovrBadge, seasonCard, statsTable,
           wappenBild, pokalBild,
           trophyList, shareText, rankLeiste, karriereKarte, statBoxen, natTabelle,
           konfetti, zahlHoch, alleZahlenHoch, toast, copy };
})();

document.addEventListener('DOMContentLoaded', () => UI.mount(document.body.dataset.nav || ''));
