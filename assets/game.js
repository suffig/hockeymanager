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
    ident: cfg.ident || { name:'', num:9, nation:'GER', pos:'C', mode:'klassisch',
                          trainingAuto:true },
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
    /* Waehrend gespielt wird, tritt das Beiwerk der Seite zurueck.
       Auf dem Handy lagen sonst Hero, Kacheln und FAQ mit rund
       7000 Pixeln um das Spielfeld herum. */
    const imSpiel = S.phase === 'draft' || S.phase === 'karriere';
    document.documentElement.toggleAttribute('data-spiel', imSpiel);
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
            <label class="field"><span>Position – tipp auf deinen Platz</span></label>
            <div id="f-pos">${UI.eisfeld(i.pos)}</div>
            <p class="small" id="pos-desc">${PUCKERO.pos(i.pos).desc}</p>
          </div>
        </div>

        <div class="grid g2 mt">
          <div>
            <label class="field"><span>Spielmodus</span></label>
            <div class="choice-row" id="f-mode">
              <button class="choice ${i.mode === 'klassisch' ? 'on' : ''}" data-mode="klassisch">Klassisch</button>
              <button class="choice ${i.mode === 'blind' ? 'on' : ''}" data-mode="blind">Purist</button>
            </div>
            <p class="small mt" id="mode-desc"></p>
          </div>
          <div>
            <label class="field"><span>Sommertraining</span></label>
            <div class="choice-row" id="f-training">
              <button class="choice ${i.trainingAuto !== false ? 'on' : ''}" data-training-auto="1">Automatisch</button>
              <button class="choice ${i.trainingAuto === false ? 'on' : ''}" data-training-auto="0">Selbst wählen</button>
            </div>
            <p class="small mt">Automatisch heißt: Dein Trainerstab wählt jeden Sommer den
              Bereich mit dem größten Nachholbedarf. Du kannst das jederzeit in der Karriere umstellen.</p>
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
        ? '<b>Alle Werte sichtbar</b> – du siehst bei jeder Antwort, '
          + 'was sie deinem Spieler bringt.'
        : '<b>Keine Zahlen.</b> Du entscheidest nach Spielstil und Charakter – '
          + 'die Werte siehst du erst am Karriereende.';
    };
    natHint(); modeHint();
    root.querySelector('#f-nation').onchange = natHint;

    const posWaehlen = k => {
      S.ident.pos = k;
      root.querySelectorAll('[data-feld-pos]').forEach(x =>
        x.classList.toggle('on', x.dataset.feldPos === k));
      root.querySelector('#pos-desc').textContent = PUCKERO.pos(k).desc;
    };
    root.querySelectorAll('[data-feld-pos]').forEach(el => {
      el.onclick = () => posWaehlen(el.dataset.feldPos);
      el.onkeydown = e => {
        if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); posWaehlen(el.dataset.feldPos); }
      };
    });
    root.querySelectorAll('[data-training-auto]').forEach(b => b.onclick = () => {
      S.ident.trainingAuto = b.dataset.trainingAuto === '1';
      root.querySelectorAll('[data-training-auto]').forEach(x => x.classList.toggle('on', x === b));
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
    S.runde = 0;
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
    /* Sommertraining kann der Trainerstab uebernehmen – dann faellt
       dieser Zwischenschritt weg und die Saison laeuft fluessig weiter. */
    if (st.training && S.ident.trainingAuto !== false){
      lauf.autoTraining();
      const letzte = lauf.letzteSaison;
      if (letzte){
        const e = letzte.events[letzte.events.length - 1];
        if (e && e.t.indexOf('Sommertraining') === 0) e.c = 'auto';
      }
    }
    const letzte = lauf.letzteSaison;
    const isG = S.player.group === 'goalie';

    root.innerHTML = `
      <div class="panel-head">
        <h3>Karriere</h3>
        <span class="pill">${st.club ? st.club.n : 'ohne Verein'}</span>
        ${letzte ? `<span class="pill">Saison ${st.seasons.length}</span>` : ''}
        <span class="pill gold">${Object.values(st.trophies).reduce((a,x)=>a+x.x,0)} Trophäen</span>
      </div>
      ${mobil()
        ? `<div class="panel-body karriere mobil">
             ${streifen(st, letzte, isG)}
             <main class="k-spalte k-mitte">${mitte(lauf, st, letzte, isG)}</main>
             <details class="m-klapp"><summary>Spielerkarte und Werte</summary>
               <div class="m-inhalt">${spielerkarte(st, letzte, isG)}</div></details>
             <details class="m-klapp"><summary>Jahrgang</summary>
               <div class="m-inhalt">${UI.jahrgangTabelle(st.jahrgangStand, isG,
                 { delta: st.jahrgangDelta })}</div></details>
             <details class="m-klapp"><summary>Karriereverlauf</summary>
               <div class="m-inhalt">${altersraster(st, isG)}</div></details>
           </div>`
        : `<div class="panel-body karriere">
             <aside class="k-spalte k-links">${spielerkarte(st, letzte, isG)}</aside>
             <main class="k-spalte k-mitte">${mitte(lauf, st, letzte, isG)}</main>
             <aside class="k-spalte k-rechts">${UI.jahrgangTabelle(st.jahrgangStand, isG,
               { delta: st.jahrgangDelta })}${altersraster(st, isG)}</aside>
           </div>`}`;

    bindeKarriere(lauf, st);
    zumZug();
  }

  /* Die Menschen um den Spieler herum – sie tauchen in Ereignissen namentlich auf */
  const STRANG_NAMEN = {
    rivalitaet:  'Rivalität',
    trainerpakt: 'Vertrauen zum Trainer',
    weggefaehrte:'Weggefährte'
  };

  function umfeldBlock(st){
    if (!st.club || (!st.trainer && !st.mitspieler)) return '';
    const straenge = (st.freigeschaltet || []).filter(k => STRANG_NAMEN[k]);
    const zeile = (ik, rolle, name, warm) => name ? `
      <div class="uf-zeile" title="${rolle}">
        <span class="uf-ik">${UI.ikone(ik, 15)}</span>
        <span class="uf-punkt ${warm ? 'warm' : ''}"></span>
        <span class="uf-name">${esc(name)}</span>
      </div>` : '';
    return `
      <div class="sk-umfeld">
        ${zeile('pfeife', 'Trainer', st.trainer, straenge.includes('trainerpakt'))}
        ${zeile('gruppe', 'Kabine', st.mitspieler, straenge.includes('weggefaehrte'))}
        ${st.rivale ? zeile('flamme', 'Rivale', st.rivale.name,
                            straenge.includes('rivalitaet')) : ''}
        ${straenge.length ? `<div class="sk-straenge">${straenge
          .map(k => `<span class="sk-strang">${STRANG_NAMEN[k]}</span>`).join('')}</div>` : ''}
      </div>`;
  }

  /* Ein Abschnitt der Ergebnisseite. Auf dem Handy eingeklappt, auf
     grossen Bildschirmen wie bisher als Ueberschrift mit Inhalt. */
  function abschnitt(titel, inhalt, offen){
    if (!inhalt) return '';
    return mobil()
      ? `<details class="m-klapp gross"${offen ? ' open' : ''}>
           <summary>${titel}</summary>
           <div class="m-inhalt">${inhalt}</div>
         </details>`
      : `<h2 class="mt-l" style="margin-top:34px">${titel}</h2>${inhalt}`;
  }

  /* Schmale Bildschirme bekommen einen eigenen Aufbau: die Handlung
     zuerst, alles Nachschlagbare eingeklappt. */
  const mobil = () => window.matchMedia('(max-width: 760px)').matches;

  /* Kopfstreifen statt voller Spielerkarte - bleibt beim Scrollen stehen */
  function streifen(st, letzte, isG){
    const p = S.player, nat = PUCKERO.nation(p.nation);
    const ovr = letzte ? letzte.ovr : PUCKERO.overall(p);
    const l = st.lauf;
    const zahl = (ik, wert, titel) => `<span class="ms-zahl" title="${titel}">
      ${UI.ikone(ik, 13)}<b>${wert}</b></span>`;
    return `
      <div class="m-streifen">
        <div class="ms-kopf">
          <span class="ms-ovr ${ovr >= 90 ? 'gold' : ''}">${blind() ? '?' : ovr}</span>
          <span class="ms-name">
            <b>${esc(p.name)}</b>
            <span>${nat.flag} #${p.num} ${p.pos}${st.club ? ' · ' + esc(st.club.n) : ''}</span>
          </span>
        </div>
        <div class="ms-zahlen">
          ${zahl('uhr', letzte ? letzte.age : 16, 'Alter')}
          ${zahl('herz', Math.round(st.moral), 'Moral')}
          ${isG ? zahl('haken', l.wins, 'Siege') : zahl('tor', l.g, 'Tore')}
          ${isG ? zahl('schild', l.so, 'Shutouts') : zahl('stern', l.p, 'Punkte')}
          ${zahl('pokal', Object.values(st.trophies).reduce((a, x) => a + x.x, 0), 'Trophäen')}
        </div>
      </div>`;
  }

  /* Nach jedem Schritt an die Stelle springen, an der es weitergeht.
     Ohne das lag der Entscheidungsknopf auf dem Handy mehrere
     Bildschirme unterhalb des sichtbaren Bereichs. */
  let ersterAufbau = true;
  function zumZug(){
    if (!mobil()){ ersterAufbau = false; return; }
    /* Zwei Bilder warten: direkt nach dem Setzen von innerHTML stehen die
       Hoehen noch nicht fest, und der Sprung landete daneben. */
    requestAnimationFrame(() => requestAnimationFrame(springen));
  }

  function springen(){
    /* Zur Handlung springen, nicht nur an den Anfang der Spalte: sonst
       verdeckt eine lange Saisonkarte den Entscheidungsknopf. */
    const tat = root.querySelector(
      '.wahlzeile, [data-training], [data-angebot], [data-rolle], ' +
      '[data-kapitaen], [data-jugend], [data-wechsel], #weiter, #bilanz');
    const ziel = tat || root.querySelector('.k-mitte');
    if (!ziel) return;

    const kopf = (document.querySelector('header.site') || {}).offsetHeight || 0;
    const streifen = (root.querySelector('.m-streifen') || {}).offsetHeight || 0;
    const oben = kopf + streifen + 8;
    const r = ziel.getBoundingClientRect();
    const sicht = window.innerHeight;

    // Schon gut sichtbar? Dann nicht unnoetig herumspringen.
    if (r.top >= oben && r.bottom <= sicht){ ersterAufbau = false; return; }

    // Die Handlung auf etwa 55% der Hoehe setzen - darueber bleibt Platz
    // fuer Folge und Saisonzahlen, darunter fuer die restlichen Optionen.
    const wunsch = tat ? Math.max(oben, sicht * 0.55 - r.height) : oben;
    const y = r.top + window.scrollY - wunsch;
    window.scrollTo({ top: Math.max(0, y), behavior: ersterAufbau ? 'auto' : 'smooth' });
    ersterAufbau = false;
  }

  /* Linke Spalte: Spielerkarte, Aktionen, Ligatabelle */
  function spielerkarte(st, letzte, isG){
    const p = S.player, nat = PUCKERO.nation(p.nation);
    const ovr = letzte ? letzte.ovr : PUCKERO.overall(p);
    const wert = letzte ? letzte.marktwert : 0;
    const l = st.lauf;
    const trophaeen = Object.values(st.trophies).reduce((a,x)=>a+x.x,0);

    /* Icon statt Beschriftung: derselbe Inhalt auf halbem Raum.
       Der Klartext bleibt als title-Attribut erhalten. */
    const zeile = (ik, a, b) => `<div class="sk-zelle" title="${a}">
      <span class="sk-ik">${UI.ikone(ik, 15)}</span><b>${b}</b></div>`;
    const stats = isG
      ? zeile('kalender', 'Einsätze', l.gp) + zeile('haken', 'Siege', l.wins)
        + zeile('schild', 'Shutouts', l.so)
      : zeile('kalender', 'Einsätze', l.gp) + zeile('tor', 'Tore', l.g)
        + zeile('gruppe', 'Vorlagen', l.a);

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
          ${zeile('uhr', 'Alter', letzte ? letzte.age : 16)}
          ${zeile('stern', 'Marktwert', wert ? wert.toFixed(1) + ' Mio' : '–')}
        </div>
        <div class="sk-raster">${stats}</div>
        <div class="sk-raster">
          ${zeile('stift', 'Vertrag', st.vertragJahre > 0 ? st.vertragJahre + ' J.' : '–')}
          ${zeile('herz', 'Moral', Math.round(st.moral))}
        </div>
        ${st.klausel ? `<div class="sk-rolle klausel">${UI.ikone('flug', 14)}
          Ausstiegsklausel im Vertrag</div>` : ''}
        ${st.natKapitaen ? `<div class="sk-rolle nat">${UI.ikone('krone', 14)}
          Kapitän der Nationalmannschaft</div>` : ''}
        ${st.rolle ? `<div class="sk-rolle">${st.rolle.icon} ${esc(st.rolle.n)}</div>` : ''}
        ${umfeldBlock(st)}
        ${st.entryDraft ? `<div class="sk-rolle draft">${st.entryDraft.ungezogen
          ? '📋 Im Draft nicht gezogen'
          : '📋 Draft: Runde ' + st.entryDraft.runde + ', Pos. ' + st.entryDraft.pick}</div>` : ''}
        <div class="sk-vitrine">
          <span>Vitrine <b class="gold">${trophaeen}</b></span>
          ${trophaeen ? '' : '<span class="small">🏆 Leere Vitrine</span>'}
        </div>
      </div>

      ${UI.meilensteinJagd(st, S.player.group === 'goalie')}

      <div class="einstellung">
        <span class="small">Sommertraining</span>
        <span class="schalter-klein">
          <button type="button" data-tauto="1" class="${S.ident.trainingAuto !== false ? 'on' : ''}">Auto</button>
          <button type="button" data-tauto="0" class="${S.ident.trainingAuto === false ? 'on' : ''}">Selbst</button>
        </span>
      </div>

      ${UI.formKurve(st)}

      ${st.rivale ? UI.rivaleKarte({ rivale: st.rivale, seasons: st.seasons,
        isG: S.player.group === 'goalie' }, letzte ? letzte.age : 99) : ''}

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

    /* Reihenfolge: erst die Folge der Entscheidung, dann die Zahlen der
       gerade gespielten Saison, danach der naechste Schritt. Vorher sprangen
       Training und Vertragsfragen heraus, ohne dass man das Ergebnis sah. */
    const bilanz = letzte ? UI.seasonCard(letzte, isG, blind(), true, mobil()) : '';

    if (st.jugend)        return kopf + jugendHtml(st.jugend);
    if (st.ereignis)      return kopf + ereignisHtml(st.ereignis);
    if (lauf.wechselfrist) return kopf + wechselfristHtml(lauf.wechselfrist);
    if (lauf.nominierung)  return kopf + bilanz + nominierungHtml(lauf.nominierung);
    if (lauf.verhandlung)  return kopf + verhandlungHtml(lauf.verhandlung);
    if (lauf.sommer)       return kopf + bilanz + sommerHtml(lauf.sommer);
    if (st.ruecktrittsfrage) return kopf + bilanz + ruecktrittHtml(st.ruecktrittsfrage, st);
    if (st.kapitaensfrage)return kopf + bilanz + kapitaenHtml(st.kapitaensfrage);
    if (st.angebote)      return kopf + bilanz + angeboteHtml(st.angebote, st.angebotsGrund);
    if (st.rollenwahl)    return kopf + bilanz + rollenHtml(st.rollenwahl, st.club);
    if (st.training)      return kopf + bilanz + trainingHtml(st.training, st.age);
    if (st.fertig)   return kopf + `
      <div class="card center pad-lg anim">
        <h2 style="margin-bottom:6px">Schluss nach ${st.seasons.length} Saisons</h2>
        <p class="lead" style="margin:0 auto 4px">${esc(st.grund || 'Karriereende')}</p>
        <p class="small">${esc(st.endeText || '')}</p>
        <button class="btn btn-primary mt-l" id="bilanz">Karrierebilanz ansehen →</button>
      </div>`;

    return kopf + `
      ${letzte ? UI.seasonCard(letzte, isG, blind(), true, mobil()) : `
        <div class="card center pad-lg">
          <h3>Bereit für die erste Saison</h3>
          <p class="small mb0">Der Vertrag steht. Jetzt zählt nur noch, was auf dem Eis passiert.</p>
        </div>`}
      ${UI.zielKarte(lauf.kommendeZiele)}
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
  /* Rolle im Team – direkt nach der Vertragsunterschrift */
  function rollenHtml(rollen, klub){
    return `
      <div class="anim">
        <h2 style="margin-bottom:6px">Deine Rolle bei ${esc(klub ? klub.n : 'dem Klub')}</h2>
        <p class="lead" style="font-size:15px">Der Trainer will wissen, wofür er dich einplant.
          Die Absprache gilt für die gesamte Vertragslaufzeit.</p>
        <div class="rollenliste mt-l stagger">
          ${rollen.map((x, i) => `
            <button class="rollenkarte" data-rolle="${i}">
              <span class="rk-icon">${x.icon}</span>
              <span class="rk-text">
                <b>${esc(x.n)}</b>
                <span class="small">${esc(x.d)}</span>
              </span>
              <span class="rk-gehalt">${x.gehalt < 1 ? x.gehalt.toFixed(2) : x.gehalt.toFixed(1)}<span>Mio/Jahr</span></span>
            </button>`).join('')}
        </div>
      </div>`;
  }

  /* Weitermachen oder aufhoeren – wird ab jetzt jedes Jahr gefragt */
  function ruecktrittHtml(f, st){
    const szene = (typeof SZENE !== 'undefined') ? SZENE.bild('kabine') : '';
    const koerper = f.verschleiss >= 3 ? 'Der Körper hat viel mitgemacht.'
                  : f.verschleiss >= 1 ? 'Ein paar Blessuren sitzen tief.'
                  : 'Der Körper fühlt sich noch gut an.';
    return `
      <div class="ereignis anim ruecktritt">
        <div class="ereignis-bild">${szene}</div>
        <div class="ereignis-text">
          <div class="row" style="gap:10px;margin-bottom:10px">
            <span class="pill">${f.alter} Jahre</span>
            <span class="ereignis-tag" style="color:var(--gold)">⚡ Am Ende der Saison</span>
            ${f.zusatzjahre ? `<span class="pill">${f.zusatzjahre}. Zusatzjahr</span>` : ''}
          </div>
          <h2 style="font-family:var(--font);font-size:23px;font-weight:750">
            ${f.zusatzjahre ? 'Noch ein Jahr?' : 'Ist es Zeit aufzuhören?'}</h2>
          <p style="color:var(--muted);margin:0 0 10px">
            Die Beine werden schwerer, die Wege länger. ${koerper}
            Der Klub würde dich behalten, aber niemand würde sich wundern,
            wenn du jetzt Schluss machst.</p>
          <div class="rt-werte">
            <div class="kk-zelle"><span>Gesamtwertung</span><b>${f.ovr}</b></div>
            <div class="kk-zelle"><span>Verschleiß</span><b>${f.verschleiss}</b></div>
            <div class="kk-zelle"><span>Zusatzjahre</span><b>${f.zusatzjahre}</b></div>
          </div>
        </div>
        <div class="ereignis-wahl">
          <button class="wahlzeile" data-weiter="1">
            <span class="wz-text"><b>Noch ein Jahr dranhängen</b>
              <span class="small">Kostet etwa ${f.abbau}% deiner Werte und
                hebt das Verletzungsrisiko um ${f.risiko} Punkte</span></span>
            <span class="wz-balken"><i class="gut" style="width:100%">Weiterspielen</i></span>
            <span class="wz-pfeil">→</span>
          </button>
          <button class="wahlzeile" data-weiter="0">
            <span class="wz-text"><b>Die Schlittschuhe an den Nagel hängen</b>
              <span class="small">Karriereende – die Bilanz wird gezogen</span></span>
            <span class="wz-balken"><i class="schlecht" style="width:100%">Aufhören</i></span>
            <span class="wz-pfeil">→</span>
          </button>
        </div>
      </div>`;
  }

  /* Kapitaensamt */
  function kapitaenHtml(frage){
    const szene = (typeof SZENE !== 'undefined') ? SZENE.bild('kabine') : '';
    return `
      <div class="ereignis anim">
        <div class="ereignis-bild">${szene}</div>
        <div class="ereignis-text">
          <div class="row" style="gap:10px;margin-bottom:10px">
            <span class="pill gold">Kapitänsamt</span>
            <span class="ereignis-tag">⚡ ${esc(frage.klub)}</span>
          </div>
          <h2 style="font-family:var(--font);font-size:23px;font-weight:750">
            Der Trainer will dir das C geben</h2>
          <p style="color:var(--muted);margin:0">Er sagt, die Kabine höre ohnehin auf dich,
            und man wolle das jetzt auch auf dem Trikot sehen. Das Amt bringt Verantwortung
            in den engen Momenten – und die Aufmerksamkeit, wenn es schlecht läuft.</p>
        </div>
        <div class="ereignis-wahl">
          <button class="wahlzeile" data-kapitaen="1">
            <span class="wz-text"><b>Annehmen</b>
              <span class="small">Mehr Moral, mehr Ansehen, stärker in den Playoffs</span></span>
            <span class="wz-balken"><i class="gut" style="width:100%">Verantwortung</i></span>
            <span class="wz-pfeil">→</span>
          </button>
          <button class="wahlzeile" data-kapitaen="0">
            <span class="wz-text"><b>Ablehnen</b>
              <span class="small">Freierer Kopf, bessere eigene Form – aber leichte Enttäuschung</span></span>
            <span class="wz-balken"><i class="schlecht" style="width:100%">Freiheit</i></span>
            <span class="wz-pfeil">→</span>
          </button>
        </div>
      </div>`;
  }

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
            <button class="wahlzeile ${o.wagnis ? 'wagnis' : ''}" data-ereignis="${i}">
              <span class="wz-text">
                <b>${o.wagnis ? '<span class="wz-marke">Wagnis</span> ' : ''}${esc(o.t)}</b>
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

  /* Die Wechselfrist: eigener Auftritt, weil sie mitten in der Saison
     stattfindet und nicht wie ein normales Ereignis aussehen soll. */
  const WF_LAGE = {
    verkaeufer: { n:'Abbau',      ik:'runter', k:'lage-abbau' },
    mittelmass: { n:'Stillstand', ik:'waage',  k:'lage-halt' },
    kaeufer:    { n:'Angriff',    ik:'hoch',   k:'lage-angriff' },
    ligasprung: { n:'Der Anruf',  ik:'flug',   k:'lage-sprung' }
  };

  function wechselfristHtml(w){
    const lage = WF_LAGE[w.art] || WF_LAGE.mittelmass;
    return `
      <div class="wechselfrist anim">
        <div class="wf-kopf ${lage.k}">
          <span class="wf-uhr">${UI.ikone('uhr', 18)} ${esc(w.tag)}</span>
          <span class="wf-lage">${UI.ikone(lage.ik, 15)} ${lage.n}</span>
        </div>
        <div class="wf-text">
          <h2>${esc(w.titel)}</h2>
          <p>${esc(w.text)}</p>
          ${w.stand ? `<div class="wf-stand">
            ${UI.kennzahl('schild', (w.stand.diff > 0 ? '+' : '') + w.stand.diff,
                          'Kaderstaerke gegenueber dem Ligaschnitt')}
            ${w.stand.ziel ? `<span class="wf-ziel">${UI.ikone('transfer', 15)}
              <span>${esc(w.stand.ziel)}${w.stand.liga ? ' · ' + esc(w.stand.liga) : ''}</span></span>` : ''}
          </div>` : ''}
        </div>
        <div class="ereignis-wahl">
          ${w.optionen.map((o, i) => `
            <button class="wahlzeile" data-wechsel="${i}">
              <span class="wz-ikone">${UI.ikone(o.ikone || 'puck', 20)}</span>
              <span class="wz-text">
                <b>${esc(o.t)}</b>
                <span class="small">${esc(o.hinweis || '')}</span>
              </span>
              <span class="wz-balken">
                <i class="gut" style="width:${o.chance}%">${o.chance}%</i>
                <i class="schlecht" style="width:${100 - o.chance}%">${100 - o.chance}%</i>
              </span>
              <span class="wz-pfeil">${UI.ikone('transfer', 16)}</span>
            </button>`).join('')}
        </div>
      </div>`;
  }

  /* Die Anfrage des Verbands. Eigener Auftritt, weil hier nicht der
     Klub spricht, sondern das Land. */
  function nominierungHtml(f){
    return `
      <div class="wechselfrist nominierung anim">
        <div class="wf-kopf lage-verband">
          <span class="wf-uhr">${UI.ikone('pfeife', 18)} ${esc(f.tag)}</span>
          <span class="wf-lage">${UI.ikone('flug', 15)} ${esc(f.stand.nation)}</span>
        </div>
        <div class="wf-text">
          <h2>${esc(f.titel)}</h2>
          <p>${esc(f.text)}</p>
          <div class="wf-stand">
            ${UI.kennzahl('pokal', esc(f.stand.turnier), 'Anstehendes Turnier')}
            ${f.stand.absagen ? UI.kennzahl('kreuz', f.stand.absagen,
                'Bisherige Absagen an den Verband', 'schlecht') : ''}
          </div>
        </div>
        <div class="ereignis-wahl">
          ${f.optionen.map((o, i) => `
            <button class="wahlzeile" data-nominierung="${i}">
              <span class="wz-ikone">${UI.ikone(o.ikone || 'schild', 20)}</span>
              <span class="wz-text">
                <b>${esc(o.t)}</b>
                <span class="small">${esc(o.hinweis || '')}</span>
              </span>
              <span class="wz-balken">
                <i class="gut" style="width:${o.chance}%">${o.chance}%</i>
                <i class="schlecht" style="width:${100 - o.chance}%">${100 - o.chance}%</i>
              </span>
              <span class="wz-pfeil">${UI.ikone('transfer', 16)}</span>
            </button>`).join('')}
        </div>
      </div>`;
  }

  /* Vertragsgespraech: vier Wege, einer davon ohne Forderung.
     Bewusst knapp gehalten - eine Zeile Text je Option reicht. */
  function verhandlungHtml(v){
    return `
      <div class="wechselfrist verhandlung anim">
        <div class="wf-kopf lage-vertrag">
          <span class="wf-uhr">${UI.ikone('stift', 18)} ${esc(v.tag)}</span>
          <span class="wf-lage">${UI.ikone('kalender', 15)} ${v.stand.jahre}${v.stand.jahre === 1 ? ' Jahr' : ' Jahre'}</span>
        </div>
        <div class="wf-text">
          <h2>${esc(v.titel)}</h2>
          <p>${esc(v.text)}</p>
          <div class="wf-stand">
            ${UI.kennzahl('stern', v.stand.gehalt.toFixed(1) + ' Mio', 'Angebotenes Grundgehalt pro Saison')}
            ${UI.kennzahl('kalender', v.stand.jahre, 'Laufzeit in Jahren')}
          </div>
        </div>
        <div class="ereignis-wahl">
          ${v.optionen.map((o, i) => `
            <button class="wahlzeile ${o.chance >= 100 ? 'sicher' : ''}" data-verhandlung="${i}">
              <span class="wz-ikone">${UI.ikone(o.ikone || 'stift', 20)}</span>
              <span class="wz-text">
                <b>${esc(o.t)}</b>
                <span class="small">${esc(o.hinweis || '')}</span>
              </span>
              ${o.chance >= 100
                ? '<span class="wz-sicher">sicher</span>'
                : `<span class="wz-balken">
                     <i class="gut" style="width:${o.chance}%">${o.chance}%</i>
                     <i class="schlecht" style="width:${100 - o.chance}%">${100 - o.chance}%</i>
                   </span>`}
              <span class="wz-pfeil">${UI.ikone('haken', 16)}</span>
            </button>`).join('')}
        </div>
      </div>`;
  }

  /* Die Sommerpause. Gleiche Bauform wie die anderen Entscheidungen,
     damit auf dem Handy nichts neu gelernt werden muss. */
  function sommerHtml(so){
    return `
      <div class="wechselfrist sommerpause anim">
        <div class="wf-kopf lage-sommer">
          <span class="wf-uhr">${UI.ikone('uhr', 18)} ${esc(so.tag)}</span>
          <span class="wf-lage">${UI.ikone('kalender', 15)} ${so.stand.alter} Jahre</span>
        </div>
        <div class="wf-text">
          <h2>${esc(so.titel)}</h2>
          <p>${esc(so.text)}</p>
          ${so.stand.verschleiss ? `<div class="wf-stand">
            ${UI.kennzahl('pflaster', so.stand.verschleiss, 'Angesammelter Verschleiß aus schweren Verletzungen', 'schlecht')}
          </div>` : ''}
        </div>
        <div class="ereignis-wahl">
          ${so.optionen.map((o, i) => `
            <button class="wahlzeile" data-sommer="${i}">
              <span class="wz-ikone">${UI.ikone(o.ikone || 'uhr', 20)}</span>
              <span class="wz-text">
                <b>${esc(o.t)}</b>
                <span class="small">${esc(o.hinweis || '')}</span>
              </span>
              <span class="wz-balken">
                <i class="gut" style="width:${o.chance}%">${o.chance}%</i>
                <i class="schlecht" style="width:${100 - o.chance}%">${100 - o.chance}%</i>
              </span>
              <span class="wz-pfeil">${UI.ikone('transfer', 16)}</span>
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
    root.querySelectorAll('[data-wechsel]').forEach(el => el.onclick = () => {
      lauf.entscheideWechselfrist(+el.dataset.wechsel);
      lauf.playSeason();
      neu();
    });
    root.querySelectorAll('[data-nominierung]').forEach(el => el.onclick = () => {
      lauf.entscheideNominierung(+el.dataset.nominierung);
      lauf.playSeason();
      neu();
    });
    root.querySelectorAll('[data-verhandlung]').forEach(el => el.onclick = () => {
      lauf.entscheideVerhandlung(+el.dataset.verhandlung);
      neu();
    });
    root.querySelectorAll('[data-sommer]').forEach(el => el.onclick = () => {
      lauf.entscheideSommer(+el.dataset.sommer);
      neu();
    });
    root.querySelectorAll('[data-training]').forEach(el => el.onclick = () => {
      lauf.chooseTraining(+el.dataset.training); neu();
    });
    root.querySelectorAll('[data-rolle]').forEach(el => el.onclick = () => {
      lauf.waehleRolle(+el.dataset.rolle); neu();
    });
    root.querySelectorAll('[data-kapitaen]').forEach(el => el.onclick = () => {
      lauf.entscheideKapitaen(el.dataset.kapitaen === '1'); neu();
    });
    root.querySelectorAll('[data-weiter]').forEach(el => el.onclick = () => {
      lauf.entscheideRuecktritt(el.dataset.weiter === '1'); neu();
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

    root.querySelectorAll('[data-tauto]').forEach(b => b.onclick = () => {
      S.ident.trainingAuto = b.dataset.tauto === '1';
      renderKarriere();
    });

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

        <div class="abschluss-kopf">
          <div class="ak-karte">
            <div class="row between" style="align-items:flex-start;gap:14px">
              <div style="min-width:0">
                <div class="small" style="letter-spacing:.1em">KARRIERE ABGESCHLOSSEN</div>
                <h2 style="margin:2px 0 6px;line-height:1">${esc(p.name)}</h2>
                <div class="sk-tags">
                  <span class="pill">#${p.num}</span>
                  <span class="pill">${p.pos}</span>
                  <span class="pill">${nat.flag} ${nat.n}</span>
                  <span class="pill">Rücktritt mit ${res.retireAge}</span>
                  ${res.entryDraft && !res.entryDraft.ungezogen
                    ? `<span class="pill">Draft ${res.entryDraft.runde}.${res.entryDraft.pick}</span>`
                    : (res.entryDraft ? '<span class="pill">Ungedraftet</span>' : '')}
                  ${res.kapitaenSeit ? '<span class="pill gold">Kapitän</span>' : ''}
                </div>
              </div>
              ${UI.ovrBadge(res.peak, gold)}
            </div>
            <div class="ak-raster">
              <div class="kk-zelle"><span>Höchster Marktwert</span><b>${(res.marktwertMax || 0).toFixed(1)} Mio</b></div>
              <div class="kk-zelle"><span>Karriereeinnahmen</span><b>${t.gehalt.toFixed(0)} Mio</b></div>
              <div class="kk-zelle"><span>Einsätze</span><b>${t.gp}</b></div>
              <div class="kk-zelle"><span>${res.isG ? 'Siege' : 'Tore'}</span><b>${res.isG ? t.wins : t.g}</b></div>
              <div class="kk-zelle"><span>${res.isG ? 'Shutouts' : 'Vorlagen'}</span><b>${res.isG ? t.so : t.a}</b></div>
            </div>
            <div class="story" style="margin:12px 0 0">
              <b style="color:var(--text)">${esc(res.grund || 'Karriereende')}.</b>
              ${esc(res.endeText || '')}</div>
          </div>

          ${UI.natKarte(res)}

          <div class="ak-ehrungen">
            <div class="small" style="letter-spacing:.1em;color:var(--gold);margin-bottom:10px">
              INDIVIDUELLE AUSZEICHNUNGEN</div>
            ${(() => {
              const person = res.trophies.filter(x => String(x.k||'').indexOf('aw_') === 0
                || x.k === 'int_wmMvp' || x.k === 'int_wmAllstar');
              return person.length
                ? '<div class="ehrenliste">' + person.map(x =>
                    `<span>${esc(x.n)}${x.x > 1 ? ' <b>×' + x.x + '</b>' : ''}</span>`).join('') + '</div>'
                : '<p class="small mb0">Keine Einzelauszeichnung erreicht.</p>';
            })()}
            <div class="ak-rang">
              <span class="small">Einordnung</span>
              <b class="${gold ? 'gold' : ''}">${res.rank.n}</b>
              <span class="small">${res.legacy} Legendenpunkte</span>
            </div>
          </div>
        </div>

        <h2 class="mt-l" style="margin-top:30px">Was bleibt</h2>
        <div class="grid g2">
          <div class="card">${UI.vermaechtnisKarte(res)}</div>
          <div class="card">
            <h3>Dein Jahrgang im Vergleich</h3>
            ${res.rivale ? `
              ${UI.rivaleKarte(res)}
              <div class="rv-tabelle mt">
                <div><span></span><b>Du</b><b>${esc(res.rivale.name.split(' ')[0])}</b></div>
                <div><span>Bestwert</span><b>${res.peak}</b><b>${res.rivale.peak}</b></div>
                <div><span>Saisons</span><b>${res.seasons.length}</b><b>${res.rivale.seasons.length}</b></div>
                <div><span>${res.isG ? 'Siege' : 'Punkte'}</span>
                  <b>${res.isG ? t.wins : t.p}</b>
                  <b>${res.isG ? res.rivale.totals.wins : res.rivale.totals.p}</b></div>
                <div><span>Legendenpunkte</span><b class="${res.legacy >= res.rivale.legacy ? 'gold' : ''}">${res.legacy}</b>
                  <b class="${res.rivale.legacy > res.legacy ? 'gold' : ''}">${res.rivale.legacy}</b></div>
                <div><span>Einordnung</span><b>${res.rank.n}</b><b>${res.rivale.rank}</b></div>
              </div>
              <p class="small mt mb0">${res.legacy >= res.rivale.legacy
                ? 'Du hast das Duell deines Jahrgangs gewonnen.'
                : 'Er war am Ende der Bessere. Vielleicht beim nächsten Versuch.'}</p>`
              : '<p class="small mb0">Kein Vergleichsspieler – die Karriere begann zu spät.</p>'}
          </div>
        </div>

        ${abschnitt('Bilanz nach Ligen', UI.ligaBilanz(res))}
        ${abschnitt('Stationen', UI.klubKarten(res))}

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
            <h3>Vereinstitel</h3>
            ${UI.trophyList(res, 'team')}
            <h3 class="mt-l">Mit der Nationalmannschaft</h3>
            ${UI.trophyList(res, 'national')}
            <h3 class="mt-l">Persönliche Auszeichnungen</h3>
            ${UI.trophyList(res, 'person')}

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
             ['Playoffspiele', t.poGp], ['Playoffsiege', t.poWins, 'gold'],
             ['Serien gewonnen', t.serienGewonnen + '/' + t.serien],
             ['Verdienst', t.gehalt.toFixed(1) + ' Mio']]
          : [['Spiele', t.gp], ['Tore', t.g], ['Vorlagen', t.a], ['Punkte', t.p, 'gruen'],
             ['Punkte/Spiel', t.ppg100], ['Powerplay', t.ppg], ['Unterzahl', t.shg],
             ['Siegtore', t.gwg, 'gold'], ['Schüsse', t.shots], ['Quote', t.shotPct + '%'],
             ['+/-', (t.plus > 0 ? '+' : '') + t.plus], ['Strafminuten', t.pim],
             ['Playoffspiele', t.poGp], ['Playoffpunkte', t.poP, 'gold'],
             ['Serien gewonnen', t.serienGewonnen + '/' + t.serien],
             ['Verdienst', t.gehalt.toFixed(1) + ' Mio']])}

        ${rekordeHtml(res)}

        ${abschnitt('Was deine Laufbahn geprägt hat', UI.wendepunkte(res), true)}
        ${abschnitt('Länderspiele', '<div class="card">' + UI.natTabelle(res) + '</div>')}

        <div class="row mt-l abschluss-taten">
          <button class="btn btn-primary" id="karte">Karriere-Karte speichern</button>
          <button class="btn btn-ghost" id="share">Als Text teilen</button>
          <button class="btn btn-ghost" id="again">Neue Karriere</button>
          <a class="btn btn-ghost" href="pokalraum.html">Pokalraum</a>
        </div>
        <p class="small mt">Seed dieser Karriere: <code>${esc(p.seed)}</code> –
          damit lässt sich dieselbe Ausgangslage erneut draften.</p>

        ${abschnitt('Karriere auf einen Blick',
            '<div class="bilanzraster">' + bilanzRaster(res) + '</div>')}

        ${res.jahrgangStand ? abschnitt('Dein Jahrgang zum Schluss',
            UI.jahrgangTabelle(res.jahrgangStand, res.isG, { alle:true, gross:true })
            + UI.jahrgangVerlauf(res)) : ''}

        ${abschnitt('Verlauf Saison für Saison (' + res.seasons.length + ')',
            '<div id="timeline">'
            + res.seasons.map(x => UI.seasonCard(x, res.isG, false, false, mobil())).join('')
            + '</div>')}

        ${abschnitt('Statistiktabelle', UI.statsTable(res))}
      </div>`;

    UI.alleZahlenHoch(root);
    if (res.legacy >= 1300) UI.konfetti(120);

    let teilenLaeuft = false;
    root.querySelector('#share').onclick = () => {
      if (teilenLaeuft) return;
      teilenLaeuft = true;
      setTimeout(() => { teilenLaeuft = false; }, 900);
      const txt = UI.shareText(res);
      if (navigator.share) navigator.share({ text: txt }).catch(() => UI.copy(txt, 'Karriere kopiert'));
      else UI.copy(txt, 'Karriere in die Zwischenablage kopiert');
    };
    const karteKnopf = root.querySelector('#karte');
    karteKnopf.onclick = () => UI.karriereKarte(res, karteKnopf);
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
    S.runde = 0;
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
    S.runde = 0;
    S.phase = 'draft';
    render();
  }

  if (!cfg.skipInitial) render();
  return { state: S, render, reset: neustart, quickRun, startDraft };
}

if (typeof window !== 'undefined') window.CareerGame = CareerGame;
