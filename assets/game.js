/* ==========================================================
   Puckero – Spielablauf: Identität → Draft → Karriere → Bilanz
   Genutzt von index.html, schnellkarriere.html und taeglich.html
   ========================================================== */

function CareerGame(root, cfg){
  cfg = cfg || {};
  const D = PUCKERO_DATA;

  const S = {
    phase: 'ident',          // ident | draft | start | karriere | ergebnis
    runde: 0,                // Draftrunde 0..7
    skipStufe: 0,            // wie oft die aktuelle Runde neu gemischt wurde
    skipsUebrig: PUCKERO.MAX_SKIPS,
    ident: cfg.ident || { name:'', num:9, nation:'GER', pos:'C', mode:'klassisch' },
    seed: cfg.seed || cfg.startSeed || null,
    player: null,
    lauf: null,              // laufende Karriere (createCareer)
    result: null,
    neueZiele: []
  };

  /* ---------------- Hilfen ---------------- */
  function esc(s){
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }
  function neuerSeed(){
    return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function zufallsname(){
    const r = PUCKERO.rng(String(Math.random()));
    return PUCKERO.pick(r, D.FIRST) + ' ' + PUCKERO.pick(r, D.LAST);
  }
  function blind(){ return S.player && S.player.mode === 'blind'; }
  function scrollTop(){
    const y = root.getBoundingClientRect().top + window.scrollY - 76;
    if (window.scrollY > y + 40) window.scrollTo({ top: y, behavior: 'smooth' });
  }

  /* ---------------- Rendern ---------------- */
  function render(){
    if (S.phase === 'ident')    return renderIdent();
    if (S.phase === 'draft')    return renderDraft();
    if (S.phase === 'start')    return renderStart();
    if (S.phase === 'karriere') return renderKarriere();
    return renderResult();
  }

  /* ---------- Identität ---------- */
  function renderIdent(){
    const i = S.ident;
    root.innerHTML = `
      <div class="panel-head">
        <h3>Wer bist du auf dem Eis?</h3>
        <span class="pill">Schritt 1 von 3</span>
      </div>
      <div class="panel-body">
        <div class="grid g2">
          <div>
            <label class="field"><span>Name</span>
              <input type="text" id="f-name" maxlength="24" placeholder="z. B. Nils Bergström" value="${esc(i.name)}"></label>
            <label class="field"><span>Rückennummer</span>
              <input type="number" id="f-num" min="1" max="99" value="${i.num}"></label>
            <label class="field"><span>Nation</span>
              <select id="f-nation">${D.NATIONS.map(n =>
                `<option value="${n.k}" ${n.k === i.nation ? 'selected' : ''}>${n.flag} ${n.n}</option>`).join('')}</select></label>
            <p class="small" id="nat-hint"></p>
          </div>
          <div>
            <label class="field"><span>Position</span></label>
            <div class="choice-row" id="f-pos">
              ${D.POSITIONS.map(p =>
                `<button class="choice ${p.k === i.pos ? 'on' : ''}" data-pos="${p.k}">${p.n}</button>`).join('')}
            </div>
            <p class="small mt" id="pos-desc">${PUCKERO.pos(i.pos).desc}</p>

            <label class="field mt"><span>Spielmodus</span></label>
            <div class="choice-row" id="f-mode">
              <button class="choice ${i.mode === 'klassisch' ? 'on' : ''}" data-mode="klassisch">Klassisch</button>
              <button class="choice ${i.mode === 'blind' ? 'on' : ''}" data-mode="blind">Purist</button>
            </div>
            <p class="small mt" id="mode-desc"></p>
          </div>
        </div>

        <details class="mt" ${S.seed ? 'open' : ''} style="border-top:1px solid var(--line-soft);padding-top:14px">
          <summary class="small" style="cursor:pointer;color:var(--accent)">Karriere mit bekanntem Seed nachspielen</summary>
          <div class="row mt" style="align-items:flex-end">
            <label class="field" style="flex:1;min-width:220px;margin:0"><span>Seed</span>
              <input type="text" id="f-seed" placeholder="z. B. pl4x9k2m1" value="${esc(S.seed || '')}"></label>
            <span class="small" style="max-width:38ch">Gleicher Seed und gleiche Entscheidungen ergeben
              exakt dieselbe Laufbahn. Leer lassen für eine neue Karriere.</span>
          </div>
        </details>

        <div class="row mt-l">
          <button class="btn btn-primary" id="go-draft">Zum Draft →</button>
          <button class="btn btn-ghost btn-sm" id="rand-ident">Zufällige Identität</button>
        </div>
      </div>`;

    const natHint = () => {
      const n = PUCKERO.nation(root.querySelector('#f-nation').value);
      const boni = Object.entries(n.bonus).map(([k, v]) => {
        const a = D.ATTRS.skater.concat(D.ATTRS.goalie).find(x => x.k === k);
        return (a ? a.n : k) + ' +' + v;
      }).join(', ');
      root.querySelector('#nat-hint').textContent =
        'Startbonus: ' + boni + ' · Stärke der Nationalmannschaft: ' + n.wm + '/100';
    };
    const modeHint = () => {
      root.querySelector('#mode-desc').innerHTML = S.ident.mode === 'klassisch'
        ? 'Alle Werte sichtbar, dazu <b>' + PUCKERO.MAX_SKIPS + ' Neumischungen</b> im Draft.'
        : 'Keine Zahlen, keine Neumischung. Du entscheidest nach Spielstil – '
          + 'die Werte siehst du erst am Karriereende.';
    };
    natHint(); modeHint();
    root.querySelector('#f-nation').onchange = natHint;

    root.querySelectorAll('#f-pos .choice').forEach(b => b.onclick = () => {
      S.ident.pos = b.dataset.pos;
      root.querySelectorAll('#f-pos .choice').forEach(x => x.classList.toggle('on', x === b));
      root.querySelector('#pos-desc').textContent = PUCKERO.pos(b.dataset.pos).desc;
    });
    root.querySelectorAll('#f-mode .choice').forEach(b => b.onclick = () => {
      S.ident.mode = b.dataset.mode;
      root.querySelectorAll('#f-mode .choice').forEach(x => x.classList.toggle('on', x === b));
      modeHint();
    });
    root.querySelector('#rand-ident').onclick = () => {
      const r = PUCKERO.rng(String(Math.random()));
      Object.assign(S.ident, PUCKERO.randomIdentity(r));
      renderIdent();
    };
    root.querySelector('#go-draft').onclick = starteDraft;
    root.querySelector('#f-name').addEventListener('keydown', e => {
      if (e.key === 'Enter') starteDraft();
    });
  }

  function starteDraft(){
    const name = root.querySelector('#f-name').value.trim();
    const num = parseInt(root.querySelector('#f-num').value, 10);
    const seedFeld = root.querySelector('#f-seed');
    S.ident.name = name || zufallsname();
    S.ident.num = (num >= 1 && num <= 99) ? num : 9;
    S.ident.nation = root.querySelector('#f-nation').value;
    S.seed = cfg.seed || (seedFeld && seedFeld.value.trim()) || neuerSeed();
    S.player = PUCKERO.newPlayer({ ...S.ident, seed: S.seed });
    S.runde = 0; S.skipStufe = 0;
    S.phase = 'draft';
    render(); scrollTop();
  }

  /* ---------- Charakterdraft: fuenf Fragen ---------- */
  function renderDraft(){
    const frage = PUCKERO.draftFrage(S.player, S.runde);
    if (!frage){ S.lauf = PUCKERO.createCareer(S.player); S.phase = 'start'; return render(); }

    const runden = DRAFT.RUNDEN;
    const dots = Array.from({ length: runden },
      (_, n) => `<span class="dot ${n <= S.runde ? 'on' : ''}"></span>`).join('');
    const ovr = PUCKERO.overall(S.player);

    root.innerHTML = `
      <div class="panel-head">
        <h3>Frage ${S.runde + 1} von ${runden}</h3>
        <div class="step-dots">${dots}</div>
      </div>
      <div class="panel-body">
        <div class="row between" style="align-items:flex-start;gap:26px">
          <div style="flex:1;min-width:280px">
            <h2 style="font-family:var(--font);font-size:24px;font-weight:750;margin-bottom:4px">
              ${esc(frage.frage)}</h2>
            <p class="lead" style="font-size:15px">${esc(frage.text)}</p>

            <div class="grid ${frage.karten.length > 3 ? 'g2' : 'g3'} mt-l stagger">
              ${frage.karten.map(k => charakterKarte(k)).join('')}
            </div>

            <div class="row mt-l">
              ${S.skipsUebrig > 0 && frage.karten.length > 3
                ? '' : ''}
              <button class="btn btn-ghost btn-sm" id="restart">Neu starten</button>
            </div>
          </div>

          <div class="card" style="width:274px;flex:none">
            <div class="row" style="gap:14px">
              ${blind() ? '<div class="ovr" style="background:var(--ice-600);color:var(--muted)"><b>?</b><span>Gesamt</span></div>'
                        : UI.ovrBadge(ovr)}
              <div>
                <div style="font-weight:750">${esc(S.player.name)}</div>
                <div class="small">#${S.player.num} · ${PUCKERO.pos(S.player.pos).n}
                  · ${PUCKERO.nation(S.player.nation).flag}</div>
              </div>
            </div>
            <div class="attrs mt" style="grid-template-columns:1fr">
              ${blind() ? '<p class="small">Im Puristenmodus bleiben die Werte bis zum Karriereende verborgen.</p>'
                        : UI.attrRows(S.player)}
            </div>
            ${S.player.eigenschaften.length ? `<div class="mt">
              <h4 class="small" style="letter-spacing:.1em;margin:0 0 8px">EIGENSCHAFTEN</h4>
              <div class="eig-liste">${S.player.eigenschaften.map(id => {
                const e = DRAFT.EIGENSCHAFTEN[id];
                return e ? `<span class="eig" title="${esc(e.d)}">${e.icon} ${esc(e.n)}</span>` : '';
              }).join('')}</div></div>` : ''}
          </div>
        </div>
      </div>`;

    root.querySelectorAll('[data-karte]').forEach(el => el.onclick = () => {
      const k = frage.karten.find(x => x.id === el.dataset.karte);
      PUCKERO.applyKarte(S.player, k);
      S.runde++;
      if (S.runde >= DRAFT.RUNDEN){
        S.lauf = PUCKERO.createCareer(S.player);
        S.phase = 'start';
      }
      render(); scrollTop();
    });
    root.querySelector('#restart').onclick = bestaetigtNeustart;
  }

  function charakterKarte(k){
    const gruppe = S.player.group;
    const relevant = Object.entries(k.b || {})
      .filter(([key]) => S.player.attrs[key] !== undefined)
      .sort((a, b) => b[1] - a[1]);
    const werte = relevant.map(([key, v]) => {
      const meta = D.ATTRS.skater.concat(D.ATTRS.goalie).find(x => x.k === key);
      return `<div class="b"><span>${meta ? meta.n : key}</span>
        <b class="${v < 0 ? 'neg' : ''}">${v > 0 ? '+' : ''}${v}</b></div>`;
    }).join('');
    const eigs = (k.eig || []).map(id => {
      const e = DRAFT.EIGENSCHAFTEN[id];
      return e ? `<div class="kk-eig"><b>${e.icon} ${esc(e.n)}</b>
        <span>${esc(e.d)}</span></div>` : '';
    }).join('');

    return `<button class="legend-card charakterkarte" data-karte="${k.id}">
      <span class="lc-tag">${esc(k.tag)}</span>
      <div class="lc-name">${esc(k.n)}</div>
      <p class="small" style="margin:8px 0 12px;color:var(--muted)">${esc(k.desc)}</p>
      ${eigs}
      ${blind() ? '<div class="small mt" style="color:var(--dim)">Werte verborgen</div>'
                : '<div class="lc-boosts mt">' + werte + '</div>'}
    </button>`;
  }

  /* ---------- Karrierestart ---------- */
  function renderStart(){
    const ovr = PUCKERO.overall(S.player);
    const nat = PUCKERO.nation(S.player.nation);
    root.innerHTML = `
      <div class="panel-head">
        <h3>Der Spieler steht</h3>
        <span class="pill">Schritt 3 von 3</span>
      </div>
      <div class="panel-body">
        <div class="row" style="gap:20px;align-items:flex-start">
          ${blind() ? '<div class="ovr" style="background:var(--ice-600);color:var(--muted)"><b>?</b><span>Gesamt</span></div>'
                    : UI.ovrBadge(ovr)}
          <div style="flex:1;min-width:240px">
            <h2 style="margin-bottom:4px">${esc(S.player.name)}
              <span style="color:var(--dim)">#${S.player.num}</span></h2>
            <p class="small">${nat.flag} ${nat.n} · ${PUCKERO.pos(S.player.pos).n}
              · 18 Jahre · Juniorenliga</p>
            <div class="eig-liste mt">${(S.player.eigenschaften || []).map(id => {
              const e = DRAFT.EIGENSCHAFTEN[id];
              return e ? `<span class="eig" title="${esc(e.d)}">${e.icon} ${esc(e.n)}</span>` : '';
            }).join('')}</div>
            <p class="small mt">${S.player.picks.map(x => esc(x.n)).join(' · ')}</p>
          </div>
        </div>

        <div class="grid g2 mt-l">
          <button class="tile" id="schritt" style="text-align:left;cursor:pointer;font-family:var(--font)">
            <div class="ico">🎬</div><h3>Saison für Saison</h3>
            <p>Du gehst Jahr für Jahr durch die Laufbahn und entscheidest bei jedem
              Vertragsende selbst, wohin es geht.</p>
            <span class="time">Empfohlen</span>
          </button>
          <button class="tile" id="komplett" style="text-align:left;cursor:pointer;font-family:var(--font)">
            <div class="ico">⏩</div><h3>Bis zum Rücktritt</h3>
            <p>Die gesamte Laufbahn läuft automatisch durch. Angebote entscheidet
              der Berater nach Prestige und Heimatnähe.</p>
            <span class="time">Schnell</span>
          </button>
        </div>

        <div class="row mt-l">
          <button class="btn btn-ghost btn-sm" id="restart">Neu starten</button>
          <span class="small">Seed: <code>${esc(S.seed)}</code></span>
        </div>
      </div>`;

    root.querySelector('#schritt').onclick = () => {
      S.phase = 'karriere';
      S.lauf.playSeason();
      render(); scrollTop();
    };
    root.querySelector('#komplett').onclick = () => beendeKarriere(S.lauf.runToEnd());
    root.querySelector('#restart').onclick = bestaetigtNeustart;
  }

  /* ---------- Karriere: drei Spalten ---------- */
  function renderKarriere(){
    const lauf = S.lauf, st = lauf.st;
    const letzte = lauf.letzteSaison;
    const isG = S.player.group === 'goalie';

    root.innerHTML = `
      <div class="panel-head">
        <h3>Karriere</h3>
        <span class="pill">${st.club ? st.club.n : 'ohne Verein'}</span>
        ${letzte ? `<span class="pill">Saison ${st.seasons.length}</span>` : ''}
        <span class="pill gold">${Object.values(st.trophies).reduce((a,x)=>a+x.x,0)} Trophäen</span>
      </div>
      <div class="panel-body karriere">
        <aside class="k-spalte k-links">${spielerkarte(st, letzte, isG)}</aside>
        <main class="k-spalte k-mitte">${mitte(lauf, st, letzte, isG)}</main>
        <aside class="k-spalte k-rechts">${altersraster(st, isG)}</aside>
      </div>`;

    bindeKarriere(lauf, st);
  }

  /* Linke Spalte: Spielerkarte, Aktionen, Ligatabelle */
  function spielerkarte(st, letzte, isG){
    const p = S.player, nat = PUCKERO.nation(p.nation);
    const ovr = letzte ? letzte.ovr : PUCKERO.overall(p);
    const wert = letzte ? letzte.marktwert : 0;
    const l = st.lauf;
    const trophaeen = Object.values(st.trophies).reduce((a,x)=>a+x.x,0);

    const zeile = (a, b) => `<div class="sk-zelle"><span>${a}</span><b>${b}</b></div>`;
    const stats = isG
      ? zeile('Einsätze', l.gp) + zeile('Siege', l.wins) + zeile('Shutouts', l.so)
      : zeile('Einsätze', l.gp) + zeile('Tore', l.g) + zeile('Vorlagen', l.a);

    return `
      <div class="spielerkarte anim">
        <div class="sk-kopf">
          <div class="ovr ${ovr >= 90 ? 'gold' : ''}"><b>${blind() ? '?' : ovr}</b><span>OVR</span></div>
          <div style="min-width:0">
            <div class="sk-tags">
              <span class="pill">${nat.flag} ${p.nation}</span>
              <span class="pill">#${p.num} ${p.pos}</span>
            </div>
            <div class="sk-name">${esc(p.name)}</div>
            <div class="sk-klub">${st.club ? UI.wappenBild(st.club.n, 22) + esc(st.club.n)
                                           : '<span class="small">Warten auf den ersten Vertrag</span>'}</div>
          </div>
        </div>
        <div class="sk-raster">
          ${zeile('Alter', letzte ? letzte.age : 16)}
          ${zeile('Marktwert', wert ? wert.toFixed(1) + ' Mio' : '–')}
        </div>
        <div class="sk-raster">${stats}</div>
        <div class="sk-raster">
          ${zeile('Vertrag', st.vertragJahre > 0 ? st.vertragJahre + ' J.' : '–')}
          ${zeile('Moral', Math.round(st.moral))}
        </div>
        <div class="sk-vitrine">
          <span>Vitrine <b class="gold">${trophaeen}</b></span>
          ${trophaeen ? '' : '<span class="small">🏆 Leere Vitrine</span>'}
        </div>
      </div>

      <button class="btn btn-ghost btn-sm mt" id="restart" style="width:100%">↺ Karriere neu starten</button>

      ${st.tabelle && st.tabelle.length ? `
        <div class="card mt ligatabelle">
          <div class="row between" style="margin-bottom:8px">
            <b class="small" style="letter-spacing:.08em">${letzte ? letzte.lgName : ''}</b>
            <b class="small" style="color:var(--accent)">${letzte && letzte.platz ? letzte.platz + '.' : ''}</b>
          </div>
          ${st.tabelle.slice(0, 6).map(t => `
            <div class="lt-zeile ${t.eigen ? 'eigen' : ''}">
              <span class="lt-platz">${t.platz}</span>
              <span class="lt-klub">${UI.wappenBild(t.n, 18)}${esc(t.n)}</span>
              <span class="lt-punkte">${t.punkte}</span>
            </div>`).join('')}
        </div>` : ''}`;
  }

  /* Mittlere Spalte: was gerade ansteht.
     Die Folge der letzten Entscheidung steht immer obenauf – sie darf
     nicht von Training oder Angeboten verdeckt werden. */
  function mitte(lauf, st, letzte, isG){
    const kopf = folgeHtml(st.letzteFolge);

    if (st.jugend)   return kopf + jugendHtml(st.jugend);
    if (st.ereignis) return ereignisHtml(st.ereignis);
    if (st.angebote) return kopf + angeboteHtml(st.angebote, st.angebotsGrund);
    if (st.training) return kopf + trainingHtml(st.training, st.age);
    if (st.fertig)   return kopf + `
      <div class="card center pad-lg anim">
        <h2 style="margin-bottom:6px">Schluss nach ${st.seasons.length} Saisons</h2>
        <p class="lead" style="margin:0 auto 4px">${esc(st.grund || 'Karriereende')}</p>
        <p class="small">${esc(st.endeText || '')}</p>
        <button class="btn btn-primary mt-l" id="bilanz">Karrierebilanz ansehen →</button>
      </div>`;

    return kopf + `
      ${letzte ? UI.seasonCard(letzte, isG, blind(), true) : `
        <div class="card center pad-lg">
          <h3>Bereit für die erste Saison</h3>
          <p class="small mb0">Der Vertrag steht. Jetzt zählt nur noch, was auf dem Eis passiert.</p>
        </div>`}
      <div class="row mt-l">
        <button class="btn btn-primary" id="weiter">Nächste Saison →</button>
        <button class="btn btn-ghost" id="rest">Rest automatisch</button>
      </div>
      ${st.seasons.length > 1 ? `
        <details class="mt-l">
          <summary class="small" style="cursor:pointer;color:var(--accent)">
            Frühere Saisons (${st.seasons.length - 1})</summary>
          <div class="mt">${st.seasons.slice(0, -1).reverse()
            .map(x => UI.seasonCard(x, isG, blind())).join('')}</div>
        </details>` : ''}`;
  }

  /* Ausgang und Auswirkungen der letzten Entscheidung */
  function folgeHtml(folge){
    if (!folge) return '';
    return `
      <div class="folge ${folge.gelungen ? 'gut' : 'schlecht'} anim">
        <div class="folge-kopf">
          <span>${folge.gelungen ? '✓ Gelungen' : '✕ Misslungen'}</span>
          <span class="wurf">Wurf ${folge.wurf} gegen ${folge.chance}%</span>
        </div>
        <div class="small" style="margin-bottom:6px">${esc(folge.tag || '')} · ${esc(folge.wahl)}</div>
        <p style="margin:0 0 10px">${esc(folge.text)}</p>
        <div class="wirkungen">${(folge.wirkungen || []).map(w =>
          `<span class="wirkung ${w.gut ? 'gut' : 'schlecht'}">${esc(w.t)}</span>`).join('')}</div>
      </div>`;
  }

  /* Rechte Spalte: Karriere nach Altersjahren */
  function altersraster(st, isG){
    const proJahr = {};
    st.seasons.forEach(x => proJahr[x.age] = x);
    // Nur den Zeitraum zeigen, der zur Laufbahn passt
    const gespielt = st.seasons.map(x => x.age);
    const von = gespielt.length ? Math.min(...gespielt) : 18;
    const bis = st.fertig ? Math.max(...gespielt, von)
                          : Math.min(40, Math.max(von + 6, (st.age || von) + 4));
    const zeilen = [];
    for (let a = von; a <= bis; a++){
      const x = proJahr[a];
      zeilen.push(x
        ? `<div class="ar-zeile ${x.title ? 'titel' : ''}">
             <span class="ar-alter">${a}</span>
             <span class="ar-klub">${UI.wappenBild(x.club, 18)}<span>${esc(x.club)}</span></span>
             <span class="ar-ovr ${x.sternstunde ? 'stern' : ''}">${blind() ? '?' : x.ovr}</span>
             <span>${x.gp}</span>
             <span>${isG ? x.wins : x.g}</span>
             <span>${isG ? x.so : x.a}</span>
           </div>`
        : `<div class="ar-zeile leer"><span class="ar-alter">${a}</span>
             <span class="ar-klub">—</span><span>—</span><span>—</span><span>—</span><span>—</span></div>`);
    }
    const nb = st.laenderBilanz || {};
    const nat = PUCKERO.nation(S.player.nation);
    return `
      <div class="altersraster">
        <div class="ar-kopf">
          <span>Alter</span><span>Verein</span><span>OVR</span>
          <span>Sp</span><span>${isG ? 'S' : 'T'}</span><span>${isG ? 'SO' : 'V'}</span>
        </div>
        <div class="ar-koerper">${zeilen.join('')}</div>
        <div class="ar-zeile national">
          <span class="ar-alter">${nat.flag}</span>
          <span class="ar-klub"><span>Nationalteam</span></span>
          <span>${nb.turniere || 0}</span><span>${nb.gp || 0}</span>
          <span>${isG ? (nb.wins || 0) : (nb.g || 0)}</span>
          <span>${isG ? (nb.so || 0) : (nb.a || 0)}</span>
        </div>
      </div>`;
  }

  /* ---------- Bausteine der mittleren Spalte ---------- */
  function jugendHtml(angebote){
    return `
      <div class="anim">
        <h2 style="margin-bottom:6px">Angebote aus dem Nachwuchs</h2>
        <p class="lead" style="font-size:15px">Drei Vereine wollen dich in ihre Nachwuchsabteilung holen.
          Wähle den Startpunkt deiner Laufbahn – viel Eiszeit bringt Entwicklung,
          ein großer Name bringt Aufmerksamkeit.</p>
        <div class="grid g3 mt-l stagger">
          ${angebote.map((a, i) => `
            <button class="jugendkarte" data-jugend="${i}">
              <div class="jk-liga">Vertrag bei · ${esc(a.lgName)}</div>
              <div class="jk-wappen">${UI.wappenBild(a.club.n, 62)}</div>
              <div class="jk-name">${esc(a.club.n)}</div>
              <div class="jk-land">${esc(a.land)}
                <span class="sterne">${'★'.repeat(a.sterne)}<span class="leer">${'★'.repeat(5 - a.sterne)}</span></span>
              </div>
              <div class="jk-minuten">${esc(a.rolle)} · ~${a.minuten} Min</div>
            </button>`).join('')}
        </div>
      </div>`;
  }

  function ereignisHtml(e){
    const szene = (typeof SZENE !== 'undefined') ? SZENE.bild(e.szene) : '';
    return `
      <div class="ereignis anim">
        <div class="ereignis-bild">${szene}</div>
        <div class="ereignis-text">
          <div class="row" style="gap:10px;margin-bottom:10px">
            <span class="pill">Spieltag ${e.spieltag || 1}</span>
            <span class="ereignis-tag">⚡ ${esc(e.tag)}</span>
          </div>
          <h2 style="font-family:var(--font);font-size:23px;font-weight:750;letter-spacing:-.01em">
            ${esc(e.titel)}</h2>
          <p style="color:var(--muted);margin:0">${esc(e.text)}</p>
        </div>
        <div class="ereignis-wahl">
          ${e.optionen.map((o, i) => `
            <button class="wahlzeile" data-ereignis="${i}">
              <span class="wz-text">
                <b>${esc(o.t)}</b>
                <span class="small">${esc(o.hinweis || '')}${o.bonus
                  ? ' · +' + o.bonus + '% durch Eigenschaft' : ''}</span>
              </span>
              <span class="wz-balken">
                <i class="gut" style="width:${o.chance}%">${o.chance}%</i>
                <i class="schlecht" style="width:${100 - o.chance}%">${100 - o.chance}%</i>
              </span>
              <span class="wz-pfeil">→</span>
            </button>`).join('')}
        </div>
      </div>`;
  }

  function trainingHtml(optionen, alter){
    return `
      <div class="anim">
        <h2 style="margin-bottom:6px">Sommerpause</h2>
        <p class="lead" style="font-size:15px">Mit ${alter} Jahren bringt jede Einheit
          ${optionen[0].wert > 2 ? 'noch spürbaren Fortschritt' : 'kaum noch Fortschritt'}.
          Angeboten wird, wo bei dir am meisten Luft nach oben ist.</p>
        <div class="grid g3 mt-l stagger">
          ${optionen.map((o, i) => `
            <button class="legend-card" data-training="${i}" style="text-align:left">
              <span class="lc-tag">${o.art === 'attr' ? 'Technik' : 'Körper &amp; Kopf'}</span>
              <div class="lc-name" style="font-size:20px">${esc(o.titel)}</div>
              <p class="small" style="margin:8px 0 0;color:var(--muted)">${esc(o.text)}</p>
            </button>`).join('')}
        </div>
      </div>`;
  }

  function angeboteHtml(angebote, grund){
    return `
      <div class="anim">
        <h2 style="margin-bottom:6px">Angebote für die kommende Saison</h2>
        <p class="lead" style="font-size:15px">${esc(grund || 'Dein Vertrag läuft aus.')}
          Ein starker Klub bringt Titel, ein schwächerer mehr Eiszeit.</p>
        <div class="grid g3 mt-l stagger">
          ${angebote.map((a, i) => `
            <button class="jugendkarte" data-angebot="${i}">
              <div class="jk-liga">${a.bleibt ? 'Verbleib' : a.rolle} · ${esc(a.lgName)}</div>
              <div class="jk-wappen">${UI.wappenBild(a.club.n, 58)}</div>
              <div class="jk-name">${esc(a.club.n)}</div>
              <div class="jk-land">Teamstärke <b style="color:var(--accent)">${a.staerke}</b></div>
              <div class="jk-minuten">${a.gehalt.toFixed(1)} Mio/Jahr · ${a.jahre}
                ${a.jahre === 1 ? 'Jahr' : 'Jahre'}</div>
            </button>`).join('')}
        </div>
      </div>`;
  }

  /* ---------- Ereignisbindung ---------- */
  function bindeKarriere(lauf, st){
    const neu = () => renderKarriere();

    root.querySelectorAll('[data-jugend]').forEach(el => el.onclick = () => {
      lauf.waehleJugend(+el.dataset.jugend); neu();
    });
    root.querySelectorAll('[data-ereignis]').forEach(el => el.onclick = () => {
      lauf.chooseEreignis(+el.dataset.ereignis);
      lauf.playSeason();
      neu();
    });
    root.querySelectorAll('[data-training]').forEach(el => el.onclick = () => {
      lauf.chooseTraining(+el.dataset.training); neu();
    });
    root.querySelectorAll('[data-angebot]').forEach(el => el.onclick = () => {
      lauf.choose(+el.dataset.angebot); neu();
    });

    const w = root.querySelector('#weiter');
    if (w) w.onclick = () => { st.letzteFolge = null; lauf.playSeason(); neu(); };
    const rest = root.querySelector('#rest');
    if (rest) rest.onclick = () => beendeKarriere(lauf.runToEnd());
    const b = root.querySelector('#bilanz');
    if (b) b.onclick = () => beendeKarriere(lauf.result());
    const rs = root.querySelector('#restart');
    if (rs) rs.onclick = bestaetigtNeustart;

    const letzte = lauf.letzteSaison;
    if (letzte && letzte.title && letzte !== S.letzteGefeierte){
      S.letzteGefeierte = letzte;
      UI.konfetti(70);
    }
    UI.alleZahlenHoch(root);
  }

  /* ---------- Ergebnis ---------- */
  function renderResult(){
    const res = S.result;
    const p = res.player;
    const nat = PUCKERO.nation(p.nation);
    const gold = res.legacy >= 1300;
    const t = res.totals;
    const bs = res.besteSaison;

    root.innerHTML = `
      <div class="panel-head">
        <h3>Karriereende</h3>
        <span class="pill ${gold ? 'gold' : ''}">${res.rank.n}</span>
        <span class="pill">${res.legacy} Legendenpunkte</span>
      </div>
      <div class="panel-body">

        <div class="row" style="gap:20px;align-items:flex-start">
          ${UI.ovrBadge(res.peak, gold)}
          <div style="flex:1;min-width:240px">
            <h2 style="margin-bottom:4px">${esc(p.name)} <span style="color:var(--dim)">#${p.num}</span></h2>
            <p class="small" style="margin-bottom:10px">
              ${nat.flag} ${nat.n} · ${PUCKERO.pos(p.pos).n} ·
              ${res.seasons.length} Saisons · Rücktritt mit ${res.retireAge}
              ${res.kapitaenSeit ? ' · Kapitän von ' + esc(res.kapitaenSeit) : ''}</p>
            <p style="color:var(--muted);margin:0 0 10px">${res.rank.d}</p>
            <div class="story" style="margin:0"><b style="color:var(--text)">${esc(res.grund || 'Karriereende')}.</b>
              ${esc(res.endeText || '')}</div>
          </div>
        </div>

        ${UI.rankLeiste(res.legacy)}

        ${(S.neueZiele && S.neueZiele.length) ? `
          <div class="card mt" style="border-color:rgba(255,200,97,.35)">
            <h3 style="color:var(--gold);margin-bottom:10px">Neue Herausforderungen geschafft</h3>
            <div class="trophy-list">${S.neueZiele.map(id => {
              const h = PUCKERO_DATA.HERAUSFORDERUNGEN.find(x => x.id === id);
              return h ? '<span class="trophy">' + h.icon + ' ' + h.n + '</span>' : '';
            }).join('')}</div>
            <p class="small mt mb0"><a href="herausforderungen.html">Alle Herausforderungen ansehen</a></p>
          </div>` : ''}

        <div class="grid g2 mt-l">
          <div class="card">
            <h3>Werte auf dem Höhepunkt</h3>
            <p class="small">Potenzial mal Altersform, gemessen in deiner stärksten Saison.</p>
            <div class="attrs" style="grid-template-columns:1fr">${UI.attrRows(p, res.peakAttrs)}</div>
          </div>
          <div class="card">
            <h3>Vitrine</h3>
            ${UI.trophyList(res)}

            ${bs ? `<h3 class="mt-l">Beste Saison</h3>
              <p class="small mb0">${bs.year}/${String(bs.year + 1).slice(2)} bei ${esc(bs.club)} –
                ${res.isG ? bs.wins + ' Siege bei ' + (bs.sv * 100).toFixed(1) + '% Fangquote'
                          : bs.p + ' Punkte in ' + bs.gp + ' Spielen'}</p>` : ''}

            <h3 class="mt-l">Charakter</h3>
            <div class="eig-liste">${(p.eigenschaften || []).map(id => {
              const e = DRAFT.EIGENSCHAFTEN[id];
              return e ? `<span class="eig" title="${esc(e.d)}">${e.icon} ${esc(e.n)}</span>` : '';
            }).join('')}</div>
            <p class="small mt">${p.picks.map(x => esc(x.n)).join(' · ')}</p>
          </div>
        </div>

        <h2 class="mt-l" style="margin-top:38px">Karrierebilanz</h2>
        ${UI.statBoxen(res.isG
          ? [['Spiele', t.gp], ['Siege', t.wins], ['Niederlagen', t.losses],
             ['Fangquote', (t.sv * 100).toFixed(1) + '%'], ['Gegentorschnitt', t.gaa.toFixed(2)],
             ['Shutouts', t.so, 'gold'], ['Paraden', t.saves],
             ['Verdienst', t.gehalt.toFixed(1) + ' Mio']]
          : [['Spiele', t.gp], ['Tore', t.g], ['Vorlagen', t.a], ['Punkte', t.p, 'gruen'],
             ['Punkte/Spiel', t.ppg100], ['Powerplay', t.ppg], ['Unterzahl', t.shg],
             ['Siegtore', t.gwg, 'gold'], ['Schüsse', t.shots], ['Quote', t.shotPct + '%'],
             ['+/-', (t.plus > 0 ? '+' : '') + t.plus], ['Strafminuten', t.pim],
             ['Verdienst', t.gehalt.toFixed(1) + ' Mio']])}

        ${rekordeHtml(res)}

        <h2 class="mt-l" style="margin-top:38px">${nat.flag} Nationalmannschaft ${esc(nat.n)}</h2>
        <div class="card">${UI.natTabelle(res)}</div>

        <div class="row mt-l">
          <button class="btn btn-primary" id="karte">Karriere-Karte speichern</button>
          <button class="btn btn-ghost" id="share">Als Text teilen</button>
          <button class="btn btn-ghost" id="again">Neue Karriere</button>
          <a class="btn btn-ghost" href="pokalraum.html">Pokalraum</a>
        </div>
        <p class="small mt">Seed dieser Karriere: <code>${esc(p.seed)}</code> –
          damit lässt sich dieselbe Ausgangslage erneut draften.</p>

        <h2 class="mt-l" style="margin-top:38px">Karriere auf einen Blick</h2>
        <div class="bilanzraster">${bilanzRaster(res)}</div>

        <h2 class="mt-l" style="margin-top:38px">Verlauf</h2>
        <div id="timeline">${res.seasons.map(s => UI.seasonCard(s, res.isG)).join('')}</div>

        <h2 class="mt-l">Statistiktabelle</h2>
        ${UI.statsTable(res)}
      </div>`;

    UI.alleZahlenHoch(root);
    if (res.legacy >= 1300) UI.konfetti(120);

    root.querySelector('#share').onclick = () => {
      const txt = UI.shareText(res);
      if (navigator.share) navigator.share({ text: txt }).catch(() => UI.copy(txt, 'Karriere kopiert'));
      else UI.copy(txt, 'Karriere in die Zwischenablage kopiert');
    };
    root.querySelector('#karte').onclick = () => UI.karriereKarte(res);
    root.querySelector('#again').onclick = () => neustart(true);
  }

  /* Altersraster fuer die Abschlussbilanz */
  function bilanzRaster(res){
    const isG = res.isG;
    const zeilen = res.seasons.map(x => `
      <div class="ar-zeile ${x.title ? 'titel' : ''}">
        <span class="ar-alter">${x.age}</span>
        <span class="ar-klub">${UI.wappenBild(x.club, 18)}<span>${esc(x.club)}</span></span>
        <span class="lgtag lg-${x.lg}" style="font-size:9px">${x.lg}</span>
        <span class="ar-ovr ${x.sternstunde ? 'stern' : ''}">${x.ovr}</span>
        <span>${x.platz || '–'}</span>
        <span>${x.gp}</span>
        <span>${isG ? x.wins : x.g}</span>
        <span>${isG ? x.so : x.a}</span>
      </div>`).join('');
    return `
      <div class="altersraster breit">
        <div class="ar-kopf">
          <span>Alter</span><span>Verein</span><span>Liga</span><span>OVR</span>
          <span>Pl</span><span>Sp</span><span>${isG ? 'S' : 'T'}</span><span>${isG ? 'SO' : 'V'}</span>
        </div>
        <div class="ar-koerper offen">${zeilen}</div>
      </div>`;
  }

  function rekordeHtml(res){
    const rk = res.rekorde || {};
    const zeile = (titel, sn, wert) => sn
      ? `<div class="row between" style="padding:9px 0;border-bottom:1px solid var(--line-soft)">
           <span class="small">${titel}</span>
           <span><b>${wert}</b> <span class="small">${sn.year}/${String(sn.year + 1).slice(2)}
             bei ${esc(sn.club)}</span></span>
         </div>` : '';
    const inhalt = res.isG
      ? zeile('Meiste Siege', rk.wins, (rk.wins || {}).wins)
        + zeile('Meiste Shutouts', rk.so, (rk.so || {}).so)
        + zeile('Meiste Einsätze', rk.gp, (rk.gp || {}).gp)
      : zeile('Meiste Tore', rk.g, (rk.g || {}).g)
        + zeile('Meiste Vorlagen', rk.a, (rk.a || {}).a)
        + zeile('Meiste Punkte', rk.p, (rk.p || {}).p)
        + zeile('Bester Plus/Minus', rk.plus, (rk.plus || {}).plus);
    return inhalt ? `<div class="card mt"><h3>Karrierebestwerte</h3>${inhalt}</div>` : '';
  }

  /* ---------------- Steuerung ---------------- */
  function beendeKarriere(res){
    S.result = res;
    S.neueZiele = PUCKERO.saveCareer(res) || [];
    S.phase = 'ergebnis';
    render(); scrollTop();
    if (cfg.onFinish) cfg.onFinish(res);
  }

  function bestaetigtNeustart(){
    const weit = S.phase === 'karriere' && S.lauf && S.lauf.st.seasons.length > 2;
    if (weit && !confirm('Diese Karriere wirklich abbrechen? Der bisherige Verlauf geht verloren.')) return;
    neustart(true);
  }

  function neustart(seedVerwerfen){
    if (cfg.onAgain){ cfg.onAgain(); return; }
    S.phase = 'ident';
    S.player = null; S.lauf = null; S.result = null;
    S.runde = 0; S.skipStufe = 0;
    if (seedVerwerfen && !cfg.seed) S.seed = null;
    render(); scrollTop();
  }

  /* Komplettdurchlauf ohne Draft – für die Schnellkarriere */
  function quickRun(seed, ident){
    S.seed = seed;
    S.ident = ident;
    S.player = PUCKERO.autoDraft(PUCKERO.newPlayer({ ...ident, seed }));
    S.result = PUCKERO.simulate(S.player);
    S.neueZiele = PUCKERO.saveCareer(S.result) || [];
    S.phase = 'ergebnis';
    renderResult();
    if (cfg.onFinish) cfg.onFinish(S.result);
  }

  /* Draft mit fester Identität – für die Tageskarriere */
  function startDraft(seed, ident){
    S.seed = seed;
    S.ident = ident;
    S.player = PUCKERO.newPlayer({ ...ident, seed });
    S.runde = 0; S.skipStufe = 0;
    S.skipsUebrig = ident.mode === 'blind' ? 0 : PUCKERO.MAX_SKIPS;
    S.phase = 'draft';
    render();
  }

  if (!cfg.skipInitial) render();
  return { state: S, render, reset: neustart, quickRun, startDraft };
}

if (typeof window !== 'undefined') window.CareerGame = CareerGame;
