/* ==========================================================
   Eiszeit – Spielablauf: Identität → Draft → Karriere → Bilanz
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
    zuege: [],               // jeder Zug, damit sich die Laufbahn nachspielen laesst
    karten: [],              // die gewaehlten Draftkarten, in ihrer Reihenfolge
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
    /* Auch Identitaet und Moduswahl gehoeren zum Spielen - dort stand
       sonst weiter die ganze Landingpage darum herum (gemessen 8302 px). */
    const imSpiel = S.phase === 'ident' || S.phase === 'start'
                 || S.phase === 'draft' || S.phase === 'karriere'
                 || S.phase === 'ergebnis';
    document.documentElement.toggleAttribute('data-spiel', imSpiel);
    /* Wird beim Zeichnen der App-Huelle gesetzt - hier nur geloescht,
       damit keine andere Ansicht mit gesperrtem Scrollen zurueckbleibt. */
    document.documentElement.removeAttribute('data-vollbild');
    if (S.phase === 'ident')    return renderIdent();
    if (S.phase === 'draft')    return renderDraft();
    if (S.phase === 'start')    return renderStart();
    if (S.phase === 'karriere') return renderKarriere();
    return renderResult();
  }

  /* ================================================================
     Eine laufende Karriere ueberlebt das Schliessen des Tabs

     Gespeichert wurden bisher nur abgeschlossene Laufbahnen. Wer auf
     dem Telefon die App wechselte und den Tab verlor, verlor
     fuenfzehn Minuten Spiel - der schmerzhafteste Fehlerfall, den
     dieses Spiel hat.

     Gesichert wird nicht der Zustand, sondern die Zuege. Der Zustand
     einer Laufbahn haengt an Verweisen auf Klubs, Rollen, Rivalen und
     Erzaehlstraenge; ihn zu verpacken und wieder aufzubauen waere bei
     jeder spaeteren Aenderung an den Feldern neu kaputt. Die Zuege
     dagegen sind ein Dutzend Zahlen, und weil das Spiel bei gleichem
     Seed und gleichen Entscheidungen immer denselben Verlauf nimmt,
     ergibt ihr Nachspielen exakt dieselbe Laufbahn.
     ================================================================ */
  const STAND_KEY = 'eiszeit.laufendeKarriere';

  /* Alles, was den Verlauf veraendert. runToEnd fehlt mit Absicht: es
     beendet die Laufbahn, und danach wird der Stand ohnehin geloescht. */
  const ZUG_METHODEN = [
    'waehleJugend', 'chooseTraining', 'autoTraining', 'waehleRolle', 'autoRolle',
    'chooseEreignis', 'entscheideWechselfrist', 'entscheideNominierung',
    'entscheideVerhandlung', 'entscheideSommer', 'entscheideKapitaen',
    'entscheideRuecktritt', 'choose', 'schliesseBericht', 'playSeason'
  ];

  function mitProtokoll(lauf){
    /* Ueber die Prototypkette, damit die Getter (ereignis, bericht,
       vorschau ...) unveraendert durchgereicht werden. */
    const huelle = Object.create(lauf);
    ZUG_METHODEN.forEach(name => {
      if (typeof lauf[name] !== 'function') return;
      huelle[name] = function(){
        const args = Array.prototype.slice.call(arguments);
        const erg = lauf[name].apply(lauf, args);
        S.zuege.push(args.length ? [name, args[0]] : [name]);
        standSichern();
        return erg;
      };
    });
    return huelle;
  }

  function standSichern(){
    if (!S.player || !S.lauf || cfg.keinStand) return;
    try {
      if (S.lauf.fertig){ localStorage.removeItem(STAND_KEY); return; }
      const st = S.lauf.st || {};
      localStorage.setItem(STAND_KEY, JSON.stringify({
        v: 1, t: Date.now(),
        ident: S.ident, seed: S.seed,
        karten: S.karten || [],
        zuege: S.zuege,
        /* Nur fuer die Anzeige des Angebots - so muss dafuer nicht die
           ganze Laufbahn nachgespielt werden. */
        kurz: { name: S.player.name, pos: S.player.pos,
                jahr: st.year, alter: st.age,
                klub: st.club ? st.club.n : null,
                saisons: (st.seasons || []).length }
      }));
    } catch(e){ /* voller Speicher: dann eben ohne Sicherung */ }
  }

  function standLoeschen(){
    try { localStorage.removeItem(STAND_KEY); } catch(e){}
  }

  function standLesen(){
    if (cfg.keinStand) return null;
    try {
      const roh = JSON.parse(localStorage.getItem(STAND_KEY) || 'null');
      if (!roh || roh.v !== 1 || !roh.ident || !roh.seed) return null;
      if (!Array.isArray(roh.karten) || !Array.isArray(roh.zuege)) return null;
      return roh;
    } catch(e){ return null; }
  }

  /* Nachspielen. Schlaegt irgendetwas fehl, wird der Stand verworfen
     und ganz normal neu begonnen - ein kaputter Stand darf das Spiel
     nicht blockieren. */
  function standFortsetzen(stand){
    try {
      S.ident = Object.assign({}, S.ident, stand.ident);
      S.seed = stand.seed;
      S.player = PUCKERO.newPlayer({ ...S.ident, seed: S.seed });
      S.karten = [];
      stand.karten.forEach((id, runde) => {
        const frage = PUCKERO.draftFrage(S.player, runde);
        const karte = frage && frage.karten.find(k => k.id === id);
        if (!karte) throw new Error('Draftkarte fehlt: ' + id);
        PUCKERO.applyKarte(S.player, karte);
        S.karten.push(id);
      });
      S.runde = S.karten.length;

      const roh = PUCKERO.createCareer(S.player);
      S.zuege = [];
      stand.zuege.forEach(z => {
        const fn = roh[z[0]];
        if (typeof fn !== 'function') throw new Error('Unbekannter Zug: ' + z[0]);
        fn.call(roh, z[1]);
        S.zuege.push(z);
      });
      /* Nachspielen ergibt nur dann dieselbe Laufbahn, wenn die Engine
         sich seit dem Sichern nicht geaendert hat. Genau das passiert
         aber bei jeder Verbesserung. Deshalb wird verglichen: stimmt
         der Stand nach dem Nachspielen nicht mit dem ueberein, der
         gesichert wurde, ist er wertlos und wird verworfen - lieber
         ein ehrlicher Neuanfang als eine stillschweigend andere
         Laufbahn. */
      const jetzt = roh.st || {};
      const k = stand.kurz;
      if (k && (k.jahr !== jetzt.year || k.alter !== jetzt.age
                || k.saisons !== (jetzt.seasons || []).length
                || k.klub !== (jetzt.club ? jetzt.club.n : null))){
        throw new Error('Stand passt nicht mehr zur aktuellen Fassung');
      }

      S.lauf = mitProtokoll(roh);
      S.phase = S.lauf.fertig ? 'ergebnis' : 'karriere';
      if (S.lauf.fertig){ standLoeschen(); return false; }
      return true;
    } catch(e){
      standLoeschen();
      S.player = null; S.lauf = null; S.zuege = []; S.karten = [];
      S.phase = 'ident';
      return false;
    }
  }

  /* ------------------------------------------------------------------
     Eine Eigenschaft mit ihrer Wirkung

     Sie stand als Name mit Zeichen da, die Erklaerung nur im
     Titelattribut - auf dem Telefon also gar nicht. Dabei ist gerade
     das die Frage, die man beim Draft hat: was bringt mir das? Jetzt
     steht die Wirkung darunter, und wer eine Eigenschaft zweimal
     zugesagt bekommen hat, sieht das auch.
     ------------------------------------------------------------------ */
  const EIG_WORT = {
    moralStart:'Startmoral', rufStart:'Ansehen zu Beginn',
    training:'Trainingsertrag', ereignis:'Entscheidungen',
    heimbonus:'Heimatliga', natBonus:'Nationalteam',
    lernkurve:'Lernkurve', grenze:'Talentgrenze',
    robust:'Robustheit', langlebig:'Haltbarkeit',
    jung:'Frühreife', playoff:'Playoff-Stärke'
  };

  function eigChip(id, stufe){
    const e = DRAFT.EIGENSCHAFTEN[id];
    if (!e) return '';
    const n = stufe || ((S.player && S.player.eigStufe) ? S.player.eigStufe[id] : 1) || 1;
    const wirkung = Object.entries(e.w || {})
      .map(([k, v]) => (EIG_WORT[k] || k) + ' ' + (v > 0 ? '+' : '') + v)
      .join(' · ');
    return `<span class="eig ${n > 1 ? 'verstaerkt' : ''}" title="${esc(e.d)}">
      <span class="eig-kopf">${e.icon} ${esc(e.n)}${n > 1
        ? '<b class="eig-stufe">×' + n + '</b>' : ''}</span>
      ${wirkung ? '<span class="eig-w">' + esc(wirkung) + '</span>' : ''}
    </span>`;
  }

  /* Der Streifen, der die Saison ueberbrueckt. */
  function saisonLaeuft(v, fertig){
    const w = document.createElement('div');
    w.className = 'saisonlauf';
    w.innerHTML = `
      <div class="sl-blatt">
        <div class="sl-wappen">${UI.wappenBild(v.klub, 56)}</div>
        <b class="sl-klub">${esc(v.klub)}</b>
        <span class="sl-jahr">Saison ${v.jahr}/${String(v.jahr + 1).slice(2)}</span>
        <div class="sl-bahn"><i></i></div>
        <span class="sl-hinweis">Antippen zum Überspringen</span>
      </div>`;
    document.body.appendChild(w);
    requestAnimationFrame(() => w.classList.add('an'));
    let erledigt = false;
    const schliessen = () => {
      if (erledigt) return;
      erledigt = true;
      clearTimeout(uhr);
      w.classList.remove('an');
      setTimeout(() => w.remove(), 180);
      fertig();
    };
    const uhr = setTimeout(schliessen, 900);
    /* Der Klick, der den Streifen oeffnet, erreicht ihn selbst noch -
       gemessen war er nach rund hundert Millisekunden wieder weg,
       statt nach neunhundert. Die erste Viertelsekunde nimmt er
       deshalb keine Klicks an. */
    const auf = Date.now();
    w.addEventListener('click', () => {
      if (Date.now() - auf < 250) return;
      schliessen();
    });
  }

  /* ---------- Identität ---------- */
  function renderIdent(){
    const i = S.ident;
    const stand = standLesen();
    root.innerHTML = `
      <div class="panel-head">
        <h3>Wer bist du auf dem Eis?</h3>
        <span class="pill">Schritt 1 von 3</span>
      </div>
      <div class="panel-body">
        ${stand && stand.kurz ? `
          <div class="fortsetzen anim">
            <div class="fs-text">
              <span class="fs-marke">${UI.ikone('uhr', 13)} Angefangene Karriere</span>
              <b>${esc(stand.kurz.name || 'Ohne Namen')}</b>
              <span class="small mb0">${stand.kurz.klub ? esc(stand.kurz.klub) + ' · ' : ''}${
                stand.kurz.alter ? stand.kurz.alter + ' Jahre · ' : ''}${
                stand.kurz.saisons || 0} ${stand.kurz.saisons === 1 ? 'Saison' : 'Saisons'} gespielt</span>
            </div>
            <div class="fs-tasten">
              <button class="btn btn-primary btn-sm" id="fs-weiter">Fortsetzen</button>
              <button class="btn btn-ghost btn-sm" id="fs-weg">Verwerfen</button>
            </div>
          </div>` : ''}

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
    bindeFortsetzen();
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
    S.runde = 0; S.zuege = []; S.karten = [];
    standLoeschen();
    S.phase = 'draft';
    render(); scrollTop();
  }

  /* ---------- Charakterdraft: fuenf Fragen ---------- */
  function renderDraft(){
    const frage = PUCKERO.draftFrage(S.player, S.runde);
    if (!frage){
      S.lauf = mitProtokoll(PUCKERO.createCareer(S.player));
      S.zuege = []; S.phase = 'start'; standSichern();
      return render();
    }

    const runden = DRAFT.RUNDEN;
    const dots = Array.from({ length: runden },
      (_, n) => `<span class="dot ${n <= S.runde ? 'on' : ''}"></span>`).join('');
    /* Dieselbe Rechnung wie die erste Saison - eine Laufbahn beginnt
       mit achtzehn. Vorher stand hier der nackte Mittelwert, und die
       Zahl sprang beim ersten Saisonbericht. */
    const ovr = PUCKERO.wertungMitAlter(S.player, 18);

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
                return eigChip(id);
              }).join('')}</div></div>` : ''}
          </div>
        </div>
      </div>`;

    root.querySelectorAll('[data-karte]').forEach(el => el.onclick = () => {
      const k = frage.karten.find(x => x.id === el.dataset.karte);
      PUCKERO.applyKarte(S.player, k);
      S.karten.push(k.id);
      S.runde++;
      if (S.runde >= DRAFT.RUNDEN){
        S.lauf = mitProtokoll(PUCKERO.createCareer(S.player));
        S.zuege = [];
        S.phase = 'start';
        standSichern();
      }
      render(); scrollTop();
    });
    root.querySelector('#restart').onclick = bestaetigtNeustart;
  }

  function bindeFortsetzen(){
    const w = root.querySelector('#fs-weiter');
    if (w) w.onclick = () => {
      const stand = standLesen();
      if (stand && standFortsetzen(stand)) render();
      else render();
      scrollTop();
    };
    const weg = root.querySelector('#fs-weg');
    if (weg) weg.onclick = () => { standLoeschen(); render(); };
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
    /* Dieselbe Rechnung wie die erste Saison - eine Laufbahn beginnt
       mit achtzehn. Vorher stand hier der nackte Mittelwert, und die
       Zahl sprang beim ersten Saisonbericht. */
    const ovr = PUCKERO.wertungMitAlter(S.player, 18);
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
              return eigChip(id);
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
        ? `<div class="panel-body karriere mobil app">
             ${streifen(st, letzte, isG)}
             <div class="app-inhalt">
               <section class="app-tab" data-tab="spielen">
                 <main class="k-mitte">${mitte(lauf, st, letzte, isG, true)}</main>
               </section>
               <section class="app-tab" data-tab="verlauf">
                 ${st.seasons.length
                   ? UI.laufbahnBogen(st.seasons.filter(x => x.gp).map(x => ({
                       j: x.year, a: x.age, l: x.lg, o: x.ovr, ti: x.title || null })))
                     + st.seasons.slice().reverse()
                       .map(x => UI.seasonCard(x, isG, blind(), false, true)).join('')
                   : '<p class="small">Noch keine Saison gespielt.</p>'}
               </section>
               <section class="app-tab" data-tab="jahrgang">
                 ${UI.jahrgangTabelle(st.jahrgangStand, isG, { delta: st.jahrgangDelta })
                   || '<p class="small">Der Jahrgang steht erst nach dem Draft fest.</p>'}
                 ${altersraster(st, isG)}
               </section>
               <section class="app-tab" data-tab="profil">
                 ${spielerkarte(st, letzte, isG)}
               </section>
             </div>
             ${appNav()}
           </div>`
        : `<div class="panel-body karriere">
             <aside class="k-spalte k-links">${spielerkarte(st, letzte, isG)}</aside>
             <main class="k-spalte k-mitte">${mitte(lauf, st, letzte, isG)}</main>
             <aside class="k-spalte k-rechts">${UI.jahrgangTabelle(st.jahrgangStand, isG,
               { delta: st.jahrgangDelta })}${altersraster(st, isG)}</aside>
           </div>`}`;

    bindeKarriere(lauf, st);

    if (mobil()){
      /* Jetzt uebernimmt die App-Huelle den Bildschirm - erst ab hier
         darf die Seite ihr eigenes Scrollen abgeben. Auf der
         Tageskarriere steht ueber dem Spielfeld noch das Tagesprofil;
         dort war die Seite 1482 Pixel hoch, das Fenster 740, und
         gescrollt werden konnte trotzdem nicht. */
      document.documentElement.setAttribute('data-vollbild', '');
      root.querySelectorAll('[data-apptab]').forEach(el =>
        el.onclick = () => tabZeigen(el.dataset.apptab));
      tabZeigen(appTab);
      einpassen();
      /* Eine frische Folge einblenden - aber nur einmal je Entscheidung. */
      if (st.letzteFolge && st.letzteFolge !== zuletztGezeigt){
        zuletztGezeigt = st.letzteFolge;
        folgeZeigen(st.letzteFolge);
      }
    }
    /* Ausserhalb der Handy-Abfrage: die Zahlen sollen auf jedem Geraet
       laufen, nicht nur auf dem Telefon. */
    beleben(lauf, st);
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

  /* ----------------------------------------------------------------
     Untere Leiste. Alles Nachschlagbare verlaesst den Spielbereich,
     damit "Spielen" auf einen Bildschirm passt und nichts wegscrollt.
     ---------------------------------------------------------------- */
  const APP_TABS = [
    { k:'spielen',  n:'Spielen',  ik:'puck' },
    { k:'verlauf',  n:'Verlauf',  ik:'kalender' },
    { k:'jahrgang', n:'Jahrgang', ik:'flamme' },
    { k:'profil',   n:'Profil',   ik:'gruppe' }
  ];
  let appTab = 'spielen';

  /* Die Bilanz am Karriereende bekommt dieselbe Huelle wie das Spiel,
     nur mit eigenen Bereichen - deshalb nimmt appNav die Liste jetzt
     entgegen, statt sie fest zu kennen. */
  const ERG_TABS = [
    { k:'bilanz',  n:'Bilanz',   ik:'pokal' },
    { k:'zahlen',  n:'Zahlen',   ik:'waage' },
    { k:'vitrine', n:'Vitrine',  ik:'medaille' },
    { k:'weg',     n:'Der Weg',  ik:'transfer' }
  ];
  let ergTab = 'bilanz';

  function appNav(tabs, aktiv){
    const liste = tabs || APP_TABS;
    const an = aktiv || appTab;
    return `<nav class="app-nav">
      ${liste.map(t => `
        <button class="app-nav-knopf ${t.k === an ? 'an' : ''}" data-apptab="${t.k}">
          ${UI.ikone(t.ik, 19)}<span>${t.n}</span>
        </button>`).join('')}
    </nav>`;
  }

  function tabZeigen(k){
    appTab = k;
    root.querySelectorAll('.app-tab').forEach(el =>
      el.classList.toggle('an', el.dataset.tab === k));
    root.querySelectorAll('[data-apptab]').forEach(el =>
      el.classList.toggle('an', el.dataset.apptab === k));
    const inhalt = root.querySelector('.app-inhalt');
    if (inhalt) inhalt.scrollTop = 0;
  }

  /* ----------------------------------------------------------------
     Die Folge einer Entscheidung als Einblendung. Frueher stand sie
     im Fluss und scrollte beim Sprung zur naechsten Entscheidung aus
     dem Bild - gemessen war sie danach nicht mehr sichtbar.
     ---------------------------------------------------------------- */
  let folgeOffen = null;

  /* ----------------------------------------------------------------
     Auf den Schirm passen

     Ereignistexte sind unterschiedlich lang - der laengste braucht
     zweihundertachtzig Pixel, der kuerzeste hundertzwanzig. Feste
     Groessen passen deshalb mal und mal nicht: gemessen lief der
     Ereignisbildschirm in drei von fuenfundzwanzig Faellen ueber, um
     bis zu siebenundfuenfzig Pixel.

     Jeden Text einzeln zu kuerzen erledigt immer nur den einen. Also
     misst die Ansicht sich selbst und gibt in der Reihenfolge nach,
     in der am wenigsten verloren geht: erst die Szene, die nichts
     erzaehlt, was nicht auch im Text steht, dann der Text - und zwar
     nur so weit, bis es passt, und nie unter achtzig Prozent.
     ---------------------------------------------------------------- */
  /* ----------------------------------------------------------------
     Beleben

     Zahlen, die einfach dastehen, liest man ueber. Zahlen, die
     hochlaufen, schaut man an. Das gilt vor allem im Bericht: dort
     steht das Ergebnis einer ganzen Saison, und es soll sich wie ein
     Ergebnis anfuehlen und nicht wie eine Tabellenzeile.

     Alles hier haelt sich an prefers-reduced-motion - das erledigt
     zahlHoch selbst, und die CSS-Regeln stehen unter derselben Abfrage.
     ---------------------------------------------------------------- */
  let gefeiert = null;
  function beleben(lauf, st){
    const b = lauf.bericht;
    if (b){
      UI.alleZahlenHoch(root);
      /* Ein Titel wird einmal gefeiert, nicht bei jedem Neuzeichnen. */
      const s = b.saison;
      if (s && s.title && gefeiert !== s.year){
        gefeiert = s.year;
        setTimeout(() => UI.konfetti(60), 320);
      }
    }
    /* Die Vertrauensleiste der Rolle waechst von null auf ihren Wert. */
    root.querySelectorAll('.rs-leiste i[style*="--ziel"], .an-leiste i[style*="--ziel"]').forEach(el => {
      const ziel = el.style.getPropertyValue('--ziel');
      el.style.width = '0%';
      requestAnimationFrame(() => requestAnimationFrame(() => { el.style.width = ziel; }));
    });
  }

  function einpassen(){
    if (!mobil()) return;
    const k = root.querySelector('.app-inhalt');
    if (!k) return;
    const passt = () => k.scrollHeight - k.clientHeight <= 2;
    if (passt()) return;

    /* Der Reihe nach nachgeben, beginnend bei dem, was am wenigsten
       traegt. Jede Stufe wird gemessen, nicht geraten: sobald es
       passt, hoert es auf. */
    const stufen = [
      /* Der erklaerende Vorspann. Er hilft beim ersten Mal und steht
         danach im Weg. */
      () => { const l = k.querySelector('.rollenwahl-kopf .lead, .jugendwahl-kopf .lead');
              if (l) l.style.display = 'none'; },
      /* Die Szene erzaehlt nichts, was nicht auch im Text steht. */
      () => { const b = k.querySelector('.ereignis-bild');
              if (b) b.style.maxHeight = '32px'; },
      () => { const b = k.querySelector('.ereignis-bild');
              if (b) b.style.display = 'none'; },
      /* Beschreibungen in Listen - die Marken darunter tragen das
         Wesentliche. */
      /* .jk-land traegt inzwischen nur noch den Trendchip - die
         Teamstaerke steht in .jk-staerke und bleibt stehen. Sie war
         eine Zeit lang mit ausgeblendet, und damit fehlte auf dem
         Angebotsbildschirm ausgerechnet die Angabe, nach der man
         entscheidet. */
      () => k.querySelectorAll('.rk-text > .small, .jk-land').forEach(x => x.style.display = 'none'),
      /* Der Kopfstreifen mit Wert, Moral und Verein. Waehrend einer
         Entscheidung traegt er nichts bei, was nicht auch im
         Profil-Tab steht - und er kostet zweiundachtzig Pixel. */
      () => { const m = root.querySelector('.m-streifen');
              if (m) m.style.display = 'none'; },
      /* Der Saisonstreifen mit Spielen, Toren, Vorlagen. Er gehoert zur
         letzten Saison, nicht zur anstehenden Entscheidung. */
      () => { const b = root.querySelector('.bilanzstreifen');
              if (b) b.style.display = 'none'; },
      /* Die aufklappbare Liste frueherer Saisons - dieselben Karten
         stehen im Verlauf-Tab.

         Hier stand einmal '.auftakt > details, .bericht details'. Das
         traf jedes aufklappbare Element und hat spaeter stumm auch
         die Kraefteleiste und das Turnierband verschluckt - beide
         waren als <details> gebaut, und beide verschwanden ohne
         Fehlermeldung. Was weggelassen werden darf, traegt deshalb
         jetzt eine eigene Auszeichnung, statt am Tag zu haengen. */
      () => k.querySelectorAll('.verzichtbar').forEach(x => x.style.display = 'none'),
      /* Die Erlaeuterung unter jedem Saisonziel. Was verlangt wird,
         steht in der Zeile darueber; hier steht nur das Warum. */
      () => k.querySelectorAll('.ziel-text > .small').forEach(x => x.style.display = 'none'),
      /* Der Ausklapphinweis unter der Saisonkarte. Dieselben Zahlen
         stehen vollstaendig im Verlauf-Tab. Er kommt vor der
         Zeremonie dran: eine Meisterfeier ist der Lohn der Saison und
         wird nicht wegoptimiert. */
      () => k.querySelectorAll('.bericht .season-mehr').forEach(x => x.style.display = 'none'),
      /* Die Einzelwerte unter der Wertungsentwicklung. Dass sie sich
         bewegt hat, steht in der Zahl darueber; welche Werte genau,
         steht auch im Profil-Tab. */
      () => k.querySelectorAll('.staerke .st-attrs').forEach(x => x.style.display = 'none'),
      /* Die Lebenskarte auf ihren Satz eindampfen. Der Satz sagt das
         Wesentliche ("Hier bist du zu Hause geworden"); die beiden
         Balken darunter sind die Begruendung und koennen warten -
         sie stehen ohnehin in der Abschlussbilanz. */
      () => k.querySelectorAll('.lebenkarte .lb-werte, .lebenkarte .lb-geld')
             .forEach(x => x.style.display = 'none'),
      /* Die Einschaetzung der eigenen Anlage auf Kopf und Balken
         eindampfen. Der Prozentsatz und der Balken tragen die
         Aussage; der Satz darunter erlaeutert sie nur, und im
         Profil-Tab steht er ohnehin.

         Diese Stufe fehlte lange, und das fiel nicht auf, weil die
         drei letzten Stufen nur auf Ereignistexte zielen - im Auftakt
         gibt es keine, also lief die Staffel dort ins Leere und
         endete mit bis zu 49 Pixeln Rest. */
      () => k.querySelectorAll('.anlage .an-text, .anlage .an-fuss')
             .forEach(x => x.style.display = 'none'),
      /* Zuletzt der Text selbst, in kleinen Schritten. */
      () => setzeText(k, 0.92),
      () => setzeText(k, 0.86),
      () => setzeText(k, 0.80)
    ];

    for (const stufe of stufen){
      stufe();
      if (passt()) return;
    }
  }

  function setzeText(k, faktor){
    const t = k.querySelector('.ereignis-text, .wf-text');
    if (t) t.style.setProperty('--txt', faktor);
  }

  function folgeZeigen(folge){
    if (!folge || !mobil()) return;
    folgeSchliessen();
    const w = document.createElement('div');
    w.className = 'folge-schicht';
    /* Ein knapper Treffer soll sich anders anfuehlen als ein sicherer.
       Bei 25 Prozent gewonnen ist ein anderer Moment als bei 85. */
    const knapp = folge.gelungen && folge.chance !== undefined && folge.chance <= 35;
    const pech  = !folge.gelungen && folge.chance !== undefined && folge.chance >= 70;

    w.innerHTML = `
      <div class="folge-blatt ${folge.gelungen ? 'gut' : 'schlecht'} ${knapp ? 'knapp' : ''}">
        <div class="fb-kopf">
          <span class="fb-marke">
            <span class="fb-ik">${UI.ikone(folge.gelungen ? 'haken' : 'kreuz', 16)}</span>
            ${knapp ? 'Gegen die Chance' : pech ? 'Trotz der Chance'
                    : folge.gelungen ? 'Gelungen' : 'Misslungen'}</span>
          ${folge.chance !== undefined
            ? `<span class="fb-chance">${folge.chance}%</span>` : ''}
        </div>

        ${folge.chance !== undefined ? `
          <div class="fb-wurf ${folge.gelungen ? 'traf' : 'daneben'}"
               title="Der Wurf musste unter ${folge.chance} liegen">
            <span class="fb-bahn"><i style="width:${folge.chance}%"></i></span>
            ${folge.wurf !== undefined ? `
              <span class="fb-einschlag" style="left:${Math.min(98, folge.wurf)}%"></span>
              <span class="fb-nadel" style="left:${Math.min(98, folge.wurf)}%"></span>` : ''}
          </div>` : ''}

        ${folge.wahl ? `<div class="fb-wahl">${esc(folge.wahl)}</div>` : ''}
        ${folge.text ? `<p class="fb-text">${esc(folge.text)}</p>` : ''}
        ${(() => {
          if (!folge.oeffnet) return '';
          const st = (UI.STRANG_INFO || {})[folge.oeffnet] || {};
          return `<div class="fb-faden">
            ${UI.ikone(st.ik || 'flamme', 14)}
            <span>Ein Strang öffnet sich: <b>${esc(st.n || 'ein neuer Faden')}</b>.
              Davon wirst du später wieder hören.</span>
          </div>`;
        })()}
        ${(folge.wirkungen || []).length ? `<div class="fb-wirkungen">
          ${folge.wirkungen.map((x, i) =>
            `<span class="fk ${x.gut ? 'plus' : 'minus'}" style="animation-delay:${0.26 + i * 0.07}s">${esc(x.t)}</span>`).join('')}
        </div>` : ''}
        <button class="btn btn-primary fb-weiter">Weiter</button>
      </div>`;
    document.body.appendChild(w);
    folgeOffen = w;
    w.addEventListener('click', () => weiterNachFolge());
    requestAnimationFrame(() => {
      w.classList.add('an');
      /* Die Nadel faehrt erst nach dem Aufblenden an ihre Stelle -
         so sieht man, wo der Wurf gelandet ist. */
      const nadel = w.querySelector('.fb-nadel');
      if (nadel) setTimeout(() => nadel.classList.add('an'), 90);
      /* ----------------------------------------------------------------
         Der Einschlag

         Die Nadel fuhr an ihre Stelle und blieb dort stehen - der
         Moment, um den es bei einer Entscheidung geht, verpuffte
         also. Jetzt schlaegt sie ein: innerhalb der Zone gruen und
         auf dem Balken, ausserhalb rot und daneben. Erst wenn die
         Fahrt vorbei ist, sonst schlaegt es dort ein, wo die Nadel
         gerade vorbeikommt, statt dort, wo sie landet. */
      const einschlag = w.querySelector('.fb-einschlag');
      if (einschlag) setTimeout(() => einschlag.classList.add('an'), 90 + 560);
      if (knapp && typeof UI.konfetti === 'function') setTimeout(() => UI.konfetti(28), 260);
    });
  }

  /* ----------------------------------------------------------------
     Was nach einer Entscheidung passiert

     Vorher lief hier sofort playSeason(): eine Wahl an der
     Wechselfrist spielte im selben Klick die ganze Saison durch, und
     die Einblendung mit dem Ausgang landete oben auf dem Saisonbericht.
     Man sah also das Ergebnis, bevor man wusste, wie die eigene
     Entscheidung ausgegangen war.

     Jetzt gilt: solange eine Einblendung offen ist, wartet der Ablauf.
     Weiter geht es, wenn sie weggetippt wird - dort steht der naechste
     Schritt. Auf dem Schreibtisch gibt es keine Einblendung, dort geht
     es unmittelbar weiter.
     ---------------------------------------------------------------- */
  function nachEntscheidung(lauf){
    if (mobil() && lauf.st && lauf.st.letzteFolge){ renderKarriere(); return; }
    lauf.playSeason();
    renderKarriere();
  }

  function weiterNachFolge(){
    folgeSchliessen();
    if (!S.lauf) return;
    S.lauf.st.letzteFolge = null;
    S.lauf.playSeason();
    renderKarriere();
  }

  function folgeSchliessen(){
    if (!folgeOffen) return;
    folgeOffen.remove();
    folgeOffen = null;
  }

  /* Kopfstreifen statt voller Spielerkarte - bleibt beim Scrollen stehen */
  function streifen(st, letzte, isG){
    const p = S.player, nat = PUCKERO.nation(p.nation);
    /* Vor der ersten Saison gibt es keine gespielte Wertung. Hier stand
       PUCKERO.overall(p) - der nackte Mittelwert der Werte, ohne
       Alterskurve. Gemessen lag der elf Punkte neben dem, was die
       erste Saison dann anzeigte. wertungMitAlter rechnet dasselbe wie
       die Saison. */
    const ovr = letzte ? letzte.ovr : PUCKERO.wertungMitAlter(p, st.age);
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
  let zuletztGezeigt = null;   // welche Folge schon eingeblendet wurde
  /* Frueher wurde nach jeder Entscheidung zur Handlung gescrollt, weil
     die Seite mehrere Bildschirme hoch war. Im App-Aufbau ist der
     Spielbereich auf Bildschirmhoehe begrenzt - es gibt nichts mehr zu
     springen, nur der Bereich selbst scrollt. */
  function zumZug(){
    ersterAufbau = false;
    if (!mobil()) return;
    const inhalt = root.querySelector('.app-inhalt');
    if (inhalt && appTab === 'spielen') inhalt.scrollTop = 0;
  }

  /* Linke Spalte: Spielerkarte, Aktionen, Ligatabelle */
  function spielerkarte(st, letzte, isG){
    const p = S.player, nat = PUCKERO.nation(p.nation);
    /* Vor der ersten Saison gibt es keine gespielte Wertung. Hier stand
       PUCKERO.overall(p) - der nackte Mittelwert der Werte, ohne
       Alterskurve. Gemessen lag der elf Punkte neben dem, was die
       erste Saison dann anzeigte. wertungMitAlter rechnet dasselbe wie
       die Saison. */
    const ovr = letzte ? letzte.ovr : PUCKERO.wertungMitAlter(p, st.age);
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
        ${UI.rollenKarte(st, letzte)}
        ${umfeldBlock(st)}
        ${st.entryDraft ? `<div class="sk-rolle draft" title="${st.entryDraft.ungezogen
            ? 'Im Entry Draft nicht gezogen'
            : 'Gesamtposition ' + st.entryDraft.gesamt + ' von 224'}">${st.entryDraft.ungezogen
          ? '📋 Im Draft nicht gezogen'
          : '📋 Draft Nr. ' + st.entryDraft.gesamt
            + ' (R' + st.entryDraft.runde + ')'}</div>` : ''}
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
  function mitte(lauf, st, letzte, isG, alsApp){
    /* Im App-Aufbau wandert die Folge in die Einblendung, sonst stuende
       sie doppelt da. */
    const kopf = alsApp ? '' : folgeHtml(st.letzteFolge);

    /* Reihenfolge: erst die Folge der Entscheidung, dann die Zahlen der
       gerade gespielten Saison, danach der naechste Schritt. Vorher sprangen
       Training und Vertragsfragen heraus, ohne dass man das Ergebnis sah. */
    /* Im App-Aufbau reicht der Zahlenstreifen: die vollstaendige Karte
       steht im Bereich "Verlauf", und beides uebereinander sprengt den
       Bildschirm (gemessen 951 statt 578 Pixel). */
    const bilanz = !letzte ? ''
      : alsApp ? UI.bilanzStreifen(letzte, isG)
      : UI.seasonCard(letzte, isG, blind(), true, mobil());

    if (lauf.bericht)     return kopf + berichtHtml(lauf.bericht, isG);
    if (st.jugend)        return kopf + jugendHtml(st.jugend);
    if (st.ereignis)      return kopf + ereignisHtml(st.ereignis);
    if (lauf.wechselfrist) return kopf + wechselfristHtml(lauf.wechselfrist);
    if (lauf.nominierung)  return kopf + bilanz + nominierungHtml(lauf.nominierung);
    if (lauf.verhandlung)  return kopf + verhandlungHtml(lauf.verhandlung);
    if (lauf.sommer)       return kopf + bilanz + sommerHtml(lauf.sommer);
    if (st.ruecktrittsfrage) return kopf + bilanz + ruecktrittHtml(st.ruecktrittsfrage, st);
    if (st.kapitaensfrage)return kopf + bilanz + kapitaenHtml(st.kapitaensfrage);
    if (st.angebote)      return kopf + bilanz
                               + angeboteHtml(st.angebote, st.angebotsGrund,
                                              st.angebotsBelege, st.keineVerlaengerung);
    if (st.rollenwahl)    return kopf + (alsApp ? '' : bilanz)
                               + rollenHtml(st.rollenwahl, st.club);
    if (st.training)      return kopf + bilanz + trainingHtml(st.training, st.age);
    if (st.fertig)   return kopf + `
      <div class="card center pad-lg anim">
        <h2 style="margin-bottom:6px">Schluss nach ${st.seasons.length} Saisons</h2>
        <p class="lead" style="margin:0 auto 4px">${esc(st.grund || 'Karriereende')}</p>
        <p class="small">${esc(st.endeText || '')}</p>
        <button class="btn btn-primary mt-l" id="bilanz">Karrierebilanz ansehen →</button>
      </div>`;

    return kopf + auftaktHtml(lauf.vorschau, st, isG);
  }

  /* ----------------------------------------------------------------
     Der Saisonauftakt

     Vorher war die Ruheansicht beides zugleich: die Bilanz der
     vergangenen Saison und die Vorgaben der kommenden, im selben
     Bild. Und weil Sommer, Training und Vertrag dazwischenlagen, sah
     man das Ergebnis einer Saison erst nach drei weiteren
     Entscheidungen. Jetzt trennt sich das: der Bericht kommt sofort
     nach der Saison, der Auftakt davor. Hier steht nur, was man vor
     dem Anpfiff wissen will.
     ---------------------------------------------------------------- */
  function auftaktHtml(v, st, isG){
    if (!v) return `
      <div class="card center pad-lg anim">
        <h2 style="margin-bottom:6px">Bereit für die erste Saison</h2>
        <p class="small mb0">Der Vertrag steht. Jetzt zählt nur noch, was auf dem Eis passiert.</p>
        <div class="row mt-l" style="justify-content:center">
          <button class="btn btn-primary" id="weiter">Saison beginnen →</button>
        </div>
      </div>`;

    const jahre = v.vertragJahre;
    const vertrag = jahre <= 0 ? { t:'Vertrag läuft aus', k:'auslauf' }
                  : jahre === 1 ? { t:'Letztes Vertragsjahr', k:'auslauf' }
                  : { t: 'Vertrag läuft noch ' + jahre + ' Jahre', k:'' };

    return `
      <div class="auftakt anim staffel">
        <div class="au-kopf">
          <div class="au-wappen">${UI.wappenBild(v.klub, 46)}</div>
          <div class="au-wer">
            <span class="au-jahr">Saison ${v.jahr}/${String(v.jahr + 1).slice(2)}</span>
            <b class="klubname">${esc(v.klub)}</b>
            <span class="au-liga">${esc(v.ligaName)} · ${esc(v.erwartung)}
              ${v.kapitaen ? '<span class="kapitaen-c">C</span>' : ''}</span>
            ${v.trend ? trendChip(v.trend) : ''}
          </div>
          <div class="au-alter"><b>${v.alter}</b><span>Jahre</span></div>
        </div>

        ${v.einschaetzung ? `<div class="anlage ${v.einschaetzung.sicher ? 'fest' : ''}">
          <div class="an-kopf">
            <span>${UI.ikone('auge', 13)} ${v.einschaetzung.sicher
              ? 'So weit reicht es' : 'So weit könnte es reichen'}</span>
            <b>${v.einschaetzung.ausgeschoepft}%</b>
          </div>
          <div class="an-text">${esc(v.einschaetzung.text)}</div>
          <div class="an-leiste"><i style="--ziel:${v.einschaetzung.ausgeschoepft}%
            ;width:${v.einschaetzung.ausgeschoepft}%"></i></div>
          <div class="an-fuss">der eigenen Anlage ausgeschöpft</div>
        </div>` : ''}

        ${v.bonus ? `<div class="klauselband">
          <span class="kb-ik">${UI.ikone('ziel', 15)}</span>
          <div class="kb-text">
            <b>Bonusklausel: ${esc(v.bonus.n)}</b>
            <span>${esc(v.bonus.d)}</span>
          </div>
          <span class="kb-rest">${v.bonus.jahre === 1
            ? 'letzte Chance' : 'noch ' + v.bonus.jahre + ' Jahre'}</span>
        </div>` : ''}

        <div class="au-fakten">
          <span class="au-fakt ${vertrag.k}">${UI.ikone('stift', 14)} ${vertrag.t}</span>
          ${v.sperre ? `<span class="au-fakt warn">${UI.ikone('schild', 14)}
            Wechselsperre</span>` : ''}
          ${v.klausel ? `<span class="au-fakt gut">${UI.ikone('flug', 14)}
            Ausstiegsklausel</span>` : ''}
          <span class="au-fakt ${v.klubRang === 'legende' ? 'legende'
              : v.klubRang === 'gesicht' ? 'gut' : ''}">
            ${UI.ikone(v.klubRang === 'legende' ? 'krone' : 'kalender', 14)}
            ${v.klubRang === 'zugang'
              ? (v.klubJahre === 0 ? 'Erstes Jahr hier' : v.klubJahre + '. Jahr hier')
              : esc(v.klubRangName) + ' · ' + (v.klubJahre + 1) + '. Jahr'}</span>
          ${v.rolle ? `<span class="au-fakt">${v.rolle.icon}
            ${esc(v.rolle.kurz || v.rolle.n.replace(/^Als /, ''))}</span>` : ''}
        </div>

        ${UI.zielKarte(v.ziele)}
        ${blind() ? '' : UI.einflussLeiste(v.einfluesse, true)}
        ${UI.koerperBand(v.verschleiss, v.altlasten)}
        ${v.draftRechte ? `<div class="draftband">
          ${UI.ikone('ziel', 14)}
          <div class="db-text">
            <b>${esc(v.draftRechte.klub)} hält deine Rechte</b>
            <span>${v.draftRechte.liga === 'KHL' ? 'KHL-Draft' : 'Entry Draft'},
              Runde ${v.draftRechte.runde} · noch bis ${v.draftRechte.bis}</span>
          </div>
        </div>` : ''}
        ${UI.lebenKarte(v.leben)}

        <div class="row mt-l">
          <button class="btn btn-primary" id="weiter">Saison beginnen →</button>
          <button class="btn btn-ghost" id="rest">Rest automatisch</button>
        </div>

        ${st.seasons.length ? `
          <details class="mt-l verzichtbar">
            <summary class="small" style="cursor:pointer;color:var(--accent)">
              Frühere Saisons (${st.seasons.length})</summary>
            <div class="mt">${st.seasons.slice().reverse()
              .map(x => UI.seasonCard(x, isG, blind())).join('')}</div>
          </details>` : ''}
      </div>`;
  }

  /* ----------------------------------------------------------------
     Was fuer eine Saison das war

     Der Bericht sagte nur, dass gespielt wurde. Aber eine Saison ist
     nicht wie die andere: es gibt das Jahr, in dem alles zusammenkam,
     und das Jahr, das man abhaken will. Wer nur Zahlen sieht, muss
     sich das selbst zusammenreimen - und auf dem Telefon, wo der
     Bericht zwischen zwei Entscheidungen liegt, tut das niemand.

     Die Reihenfolge ist die der Bedeutung: ein Titel schlaegt alles,
     danach kommt der persoenliche Bestwert, dann die Auszeichnungen,
     dann das, was der Klub verlangt hatte.
     ---------------------------------------------------------------- */
  function saisonUrteil(s, alle, isG){
    const punkte = isG ? (s.wins || 0) : (s.p || 0);
    const frueher = alle.filter(x => x !== s && x.gp);
    const bestesBisher = frueher.length
      ? Math.max(...frueher.map(x => isG ? (x.wins || 0) : (x.p || 0))) : -1;
    const zieleErfuellt = s.ziele
      ? (s.ziele.team.erfuellt ? 1 : 0) + (s.ziele.person.erfuellt ? 1 : 0) : null;

    if (s.title)          return { t: s.title + '!', d:'Der Titel. Mehr geht in einem Jahr nicht.', k:'gross' };
    if (s.awards && s.awards.length >= 2)
      return { t:'Ein Jahr voller Ehrungen', d: s.awards.length + ' Auszeichnungen in einer Saison.', k:'gross' };
    if (s.sternstunde)    return { t:'Sternstunde', d:'Ein Jahr, in dem dir einfach alles gelang.', k:'gross' };
    if (punkte > bestesBisher && frueher.length >= 2)
      return { t:'Deine beste Saison bisher', d: punkte + (isG ? ' Siege' : ' Scorerpunkte') + ' – so viele wie nie.', k:'gut' };
    if (s.awards && s.awards.length === 1)
      return { t: s.awards.length + ' Auszeichnung', d:'Der Rest der Liga hat es gemerkt.', k:'gut' };
    if (s.verletzung && s.verletzung.spiele >= 20)
      return { t:'Ein Jahr auf der Tribüne', d: s.verletzung.n + ' – ' + s.verletzung.spiele + ' Spiele verpasst.', k:'schlecht' };
    if (zieleErfuellt === 2)  return { t:'Beide Vorgaben erfüllt', d:'Der Klub hat bekommen, was er wollte.', k:'gut' };
    if (zieleErfuellt === 0)  return { t:'Nichts davon erreicht', d:'Weder die Mannschaft noch du.', k:'schlecht' };
    if (s.rollenUrteil === 'uebertroffen')
      return { t:'Über der Erwartung', d:'Deine Rolle hast du mehr als ausgefüllt.', k:'gut' };
    if (s.rollenUrteil === 'verfehlt')
      return { t:'Unter der Erwartung', d:'Der Trainer hatte mehr eingeplant.', k:'schlecht' };
    if (s.playoffs)       return { t:'Playoffs erreicht', d:'Solide Arbeit, das Jahr zählt.', k:'' };
    return { t:'Eine Saison wie viele', d:'Nichts, worüber man in zehn Jahren noch spricht.', k:'' };
  }

  /* Der Bericht: wie die Saison gelaufen ist, sofort danach. */
  /* Die Einzelwerte heissen im Zustand kurz - fuer die Anzeige der
     Entwicklung brauchen sie ihre ausgeschriebenen Namen. */
  const ATTR_NAMEN = (() => {
    const m = {};
    const D = window.PUCKERO_DATA || {};
    Object.values(D.ATTRS || {}).forEach(liste =>
      (liste || []).forEach(a => { m[a.k] = a.n; }));
    return m;
  })();
  const natName = () => {
    const D = window.PUCKERO_DATA || {};
    const n = (D.NATIONS || []).find(x => x.k === (S.ident && S.ident.nation));
    return n ? n.n : '';
  };

  function berichtHtml(b, isG){
    const alle = (S.lauf && S.lauf.st.seasons) || [];
    const u = saisonUrteil(b.saison, alle, isG);
    return `
      <div class="bericht anim staffel">
        <div class="be-urteil ${u.k}">
          <span class="be-jahr">Saison ${b.jahr}/${String(b.jahr + 1).slice(2)}</span>
          <b>${esc(u.t)}</b>
          <span class="be-dazu">${esc(u.d)}</span>
        </div>
        ${blind() ? '' : UI.staerkeWandel(b.saison, ATTR_NAMEN)}
        ${UI.seasonCard(b.saison, isG, blind(), true, mobil())}
        ${b.saison.nat ? UI.turnierKarte(b.saison.nat, natName(), isG, mobil()) : ''}
        <div class="row mt-l">
          <button class="btn btn-primary" id="bericht-weiter">Weiter →</button>
        </div>
      </div>`;
  }

  /* Ausgang und Auswirkungen der letzten Entscheidung */
  function folgeHtml(folge){
    if (!folge) return '';
    return `
      <div class="folge ${folge.gelungen ? 'gut' : 'schlecht'} anim">
        <div class="folge-kopf">
          <span>${folge.gelungen ? '✓ Gelungen' : '✕ Misslungen'}</span>
          ${folge.wurf !== undefined
            ? `<span class="wurf">Wurf ${folge.wurf} gegen ${folge.chance}%</span>`
            : (folge.chance !== undefined
                ? `<span class="wurf">${folge.chance}% Chance</span>` : '')}
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
  /* Wohin ein Klub sich bewegt. Ein Titelkandidat im Zerfall ist ein
     anderes Angebot als ein Aufbauteam im Aufwind - vorher stand beides
     als dieselbe Zahl da. */
  const TREND = {
    auf:    { n:'im Aufwind',  ik:'hoch',  k:'tr-auf' },
    ab:     { n:'im Umbruch',  ik:'runter',k:'tr-ab' },
    stabil: { n:'gefestigt',   ik:'waage', k:'' }
  };
  const trendChip = t => {
    const x = TREND[t]; if (!x) return '';
    return `<span class="klubtrend ${x.k}">${UI.ikone(x.ik, 12)} ${x.n}</span>`;
  };

  const ZUSAGE = {
    sicher:     { n:'Zugesagt',      k:'zu-sicher' },
    bewaehrung: { n:'Auf Bewährung', k:'zu-probe' },
    abgelehnt:  { n:'Zu hoch gegriffen', k:'zu-nein' }
  };
  const PASSUNG = w =>
    w >= 0.45 ? { n:'wie gemacht',   k:'gut' }
  : w >= 0.12 ? { n:'passt gut',     k:'gut' }
  : w >= -0.15? { n:'geht so',       k:'' }
  : w >= -0.5 ? { n:'passt kaum',    k:'schwach' }
  :             { n:'falsch besetzt',k:'schwach' };

  function rollenHtml(rollen, klub){
    const rang = rollen.length ? rollen[0].rang : 0;
    const einschaetzung = ['einen Ergänzungsspieler', 'einen festen Teil des Kaders',
                           'eine wichtige Stütze', 'einen Träger der Mannschaft'][rang] || '';
    return `
      <div class="anim">
        <div class="rollenwahl-kopf">
          <h2 style="margin-bottom:6px">Deine Rolle bei ${esc(klub ? klub.n : 'dem Klub')}</h2>
          <p class="lead" style="font-size:15px">Der Klub sieht in dir <b>${einschaetzung}</b>.
            Was du forderst, muss er mittragen.</p>
        </div>
        <div class="rollenliste mt-l stagger">
          ${rollen.map((x, i) => {
            const z = ZUSAGE[x.zusage] || ZUSAGE.sicher;
            const p = PASSUNG(x.passung || 0);
            return `
            <button class="rollenkarte ${z.k}" data-rolle="${i}">
              <span class="rk-icon">${x.icon}</span>
              <span class="rk-text">
                <b>${esc(x.n)}</b>
                <span class="small">${esc(x.d)}</span>
                <span class="rk-marken">
                  <span class="rk-zusage ${z.k}">${z.n}</span>
                  <span class="rk-passung ${p.k}">${UI.ikone('ziel', 11)} ${p.n}</span>
                  <span class="rk-soll">${UI.ikone('waage', 11)} ${esc(x.soll || '')}</span>
                </span>
              </span>
              <span class="rk-gehalt">${x.gehalt < 1 ? x.gehalt.toFixed(2) : x.gehalt.toFixed(1)}<span>Mio/Jahr</span></span>
            </button>`; }).join('')}
        </div>
      </div>`;
  }

  /* Weitermachen oder aufhoeren – wird ab jetzt jedes Jahr gefragt */
  /* ------------------------------------------------------------------
     Warum die Frage gerade jetzt kommt

     Familie, Heimweh und der Ruecktritt nach einem Titel beendeten die
     Laufbahn frueher ohne Rueckfrage - man las eine Zeile und war
     Rentner. Jetzt sind es Fragen, und dann muessen sie auch sagen,
     woher sie kommen: "Ist es Zeit aufzuhoeren?" passt nicht, wenn der
     Anlass ein Kind ist oder ein gerade gewonnener Titel.
     ------------------------------------------------------------------ */
  const ANLASS = {
    familie: { titel: 'Zu Hause wird gefragt',
      text: 'Es ist keine schlechte Saison gewesen, und der Klub würde verlängern. '
          + 'Aber zu Hause zählt inzwischen jemand die Abende mit, an denen du nicht da bist – '
          + 'und diesmal wird es ausgesprochen.' },
    heimkehr: { titel: 'Nach Hause – oder weiter?',
      text: 'Die Jahre in der Fremde haben sich gelohnt, und sie haben etwas gekostet. '
          + 'Jetzt liegt der Gedanke näher als je zuvor: aufhören und heimfahren, '
          + 'statt noch eine Saison anzuhängen, wo niemand deinen Namen richtig ausspricht.' },
    hoehepunkt: { titel: 'Auf dem Gipfel aufhören?',
      text: 'Der Pokal steht noch in der Kabine, und du bist der Mann, der ihn geholt hat. '
          + 'Manche gehen genau jetzt und bleiben so in Erinnerung. '
          + 'Andere kommen wieder und versuchen es noch einmal.' }
  };

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
          <h2 style="font-family:var(--font);font-size:calc(23px * var(--txt, 1));font-weight:750">
            ${f.altersgrenze ? 'Dein Körper hat sein Alter erreicht'
              : ANLASS[f.grund] ? ANLASS[f.grund].titel
              : (f.zusatzjahre ? 'Noch ein Jahr?' : 'Ist es Zeit aufzuhören?')}</h2>
          <p style="color:var(--muted);margin:0 0 10px">
            ${f.altersgrenze
              ? 'Die Zahlen stimmen noch, und der Klub würde verlängern. '
                + koerper + ' Was du ab jetzt spielst, spielst du gegen die Uhr: '
                + 'jedes weitere Jahr kostet mehr Substanz als das davor.'
              : ANLASS[f.grund] ? ANLASS[f.grund].text
              : 'Die Beine werden schwerer, die Wege länger. ' + koerper
                + ' Der Klub würde dich behalten, aber niemand würde sich wundern, '
                + 'wenn du jetzt Schluss machst.'}</p>
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
          <h2 style="font-family:var(--font);font-size:calc(23px * var(--txt, 1));font-weight:750">
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
        <div class="jugendwahl-kopf">
          <h2 style="margin-bottom:6px">Angebote aus dem Nachwuchs</h2>
          <p class="lead" style="font-size:15px">Wähle den Startpunkt deiner Laufbahn:
            viel Eiszeit bringt Entwicklung, ein großer Name bringt Aufmerksamkeit.</p>
        </div>
        <div class="grid g3 mt-l stagger jugendliste">
          ${angebote.map((a, i) => `
            <button class="jugendkarte" data-jugend="${i}">
              <div class="jk-liga"><span class="jk-vertrag">Vertrag bei · </span>${esc(a.lgName)}</div>
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

  /* Woher dieses Ereignis kommt. Ohne den Verweis wirkte ein
     Folgeereignis wie ein beliebiges neues - dabei ist es die Antwort
     auf eine Entscheidung, die Jahre zurueckliegt. */
  function herkunftHtml(h){
    if (!h || !h.wahl) return '';
    const wann = h.herJahre > 1 ? 'vor ' + h.herJahre + ' Jahren'
               : h.herJahre === 1 ? 'im Jahr davor'
               : 'in dieser Saison';
    const st = (UI.STRANG_INFO || {})[h.strang] || {};
    return `<div class="herkunft">
      <span class="hk-marke">${UI.ikone(st.ik || 'transfer', 13)}
        ${esc(st.n || 'Folge einer Entscheidung')}</span>
      <span class="hk-text">${wann}${h.klub ? ' bei ' + esc(h.klub) : ''}:
        <b>„${esc(h.wahl)}“</b></span>
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
          ${herkunftHtml(e.herkunft)}
          <h2 style="font-family:var(--font);font-size:calc(23px * var(--txt, 1));font-weight:750;letter-spacing:-.01em">
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
                <i class="gut" style="width:${o.chance}%">${o.chance >= 22 ? o.chance + '%' : ''}</i>
                <i class="schlecht" style="width:${100 - o.chance}%">${100 - o.chance >= 22 ? (100 - o.chance) + '%' : ''}</i>
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
            <button class="wahlzeile ${o.wagnis ? 'wagnis' : ''}" data-wechsel="${i}">
              <span class="wz-ikone">${UI.ikone(o.ikone || 'puck', 20)}</span>
              <span class="wz-text">
                <b>${o.wagnis ? '<span class="wz-marke">Wagnis</span> ' : ''}${esc(o.t)}</b>
                <span class="small">${esc(o.hinweis || '')}</span>
              </span>
              <span class="wz-balken">
                <i class="gut" style="width:${o.chance}%">${o.chance >= 22 ? o.chance + '%' : ''}</i>
                <i class="schlecht" style="width:${100 - o.chance}%">${100 - o.chance >= 22 ? (100 - o.chance) + '%' : ''}</i>
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
                <i class="gut" style="width:${o.chance}%">${o.chance >= 22 ? o.chance + '%' : ''}</i>
                <i class="schlecht" style="width:${100 - o.chance}%">${100 - o.chance >= 22 ? (100 - o.chance) + '%' : ''}</i>
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
                     <i class="gut" style="width:${o.chance}%">${o.chance >= 22 ? o.chance + '%' : ''}</i>
                     <i class="schlecht" style="width:${100 - o.chance}%">${100 - o.chance >= 22 ? (100 - o.chance) + '%' : ''}</i>
                   </span>`}
              <span class="wz-pfeil">${UI.ikone('haken', 16)}</span>
            </button>`).join('')}
        </div>
      </div>`;
  }

  /* Die Sommerpause. Gleiche Bauform wie die anderen Entscheidungen,
     damit auf dem Handy nichts neu gelernt werden muss. */
  function sommerHtml(so){
    /* Die Reha ist keine Sommerpause, sondern ihr Gegenteil - sie
       bekommt einen eigenen Kopf und ihre eigene Farbe. */
    const reha = so.art === 'reha';
    return `
      <div class="wechselfrist sommerpause ${reha ? 'reha' : ''} anim">
        <div class="wf-kopf ${reha ? 'lage-reha' : 'lage-sommer'}">
          <span class="wf-uhr">${UI.ikone(reha ? 'pflaster' : 'uhr', 18)} ${esc(so.tag)}</span>
          <span class="wf-lage">${UI.ikone('kalender', 15)} ${so.stand.alter} Jahre</span>
        </div>
        <div class="wf-text">
          <h2>${esc(so.titel)}</h2>
          <p>${esc(so.text)}</p>
          ${(reha || so.stand.verschleiss) ? `<div class="wf-stand">
            ${reha ? UI.kennzahl('kalender', so.stand.spiele, 'Verpasste Spiele in der vergangenen Saison', 'schlecht') : ''}
            ${so.stand.verschleiss ? UI.kennzahl('pflaster', so.stand.verschleiss, 'Angesammelter Verschleiß aus schweren Verletzungen', 'schlecht') : ''}
          </div>` : ''}
        </div>
        <div class="ereignis-wahl">
          ${so.optionen.map((o, i) => `
            <button class="wahlzeile ${o.wagnis ? 'wagnis' : ''}" data-sommer="${i}">
              <span class="wz-ikone">${UI.ikone(o.ikone || 'uhr', 20)}</span>
              <span class="wz-text">
                <b>${o.wagnis ? '<span class="wz-marke">Wagnis</span> ' : ''}${esc(o.t)}</b>
                <span class="small">${esc(o.hinweis || '')}</span>
              </span>
              <span class="wz-balken">
                <i class="gut" style="width:${o.chance}%">${o.chance >= 22 ? o.chance + '%' : ''}</i>
                <i class="schlecht" style="width:${100 - o.chance}%">${100 - o.chance >= 22 ? (100 - o.chance) + '%' : ''}</i>
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

  /* ------------------------------------------------------------------
     Was "Teamstaerke 88" bedeutet

     Nichts, solange man nicht weiss, wo der Schnitt der Liga liegt -
     und der ist in jeder Liga ein anderer. Deshalb der Abstand dazu,
     in Worten, wie ihn auch der Saisonauftakt benutzt.
     ------------------------------------------------------------------ */
  function staerkeChip(a){
    const d = a.staerkeRel;
    if (d === undefined) return 'Teamstärke <b>' + a.staerke + '</b>';
    const wort = d >= 6 ? 'Titelkandidat' : d >= 0 ? 'Playoff-Team'
               : d >= -6 ? 'Mittelfeld' : 'Aufbauteam';
    const farbe = d >= 6 ? 'var(--gold)' : d >= 0 ? 'var(--green)'
                : d >= -6 ? 'var(--muted)' : 'var(--red)';
    return `<b style="color:${farbe}">${wort}</b>
      <span class="jk-abstand">${d > 0 ? '+' : ''}${d} zum Ligaschnitt</span>`;
  }

  function angeboteHtml(angebote, grund, belege, keine){
    /* Nur noch die eigene Wertung. Daneben stand eine Zeile mit der
       Passung je Liga ("DEL ✓", "SHL -3"), gerechnet aus einer anderen
       Bezugsgroesse als der Zahl im Kopf der Seite - nebeneinander
       gelesen sah das aus wie ein Widerspruch. */
    const eigene = angebote.length ? angebote[0].eigeneWertung : null;
    return `
      <div class="anim">
        <h2 style="margin-bottom:6px">Angebote für die kommende Saison</h2>
        ${eigene != null ? `<div class="eigenwert">
          <span class="ew-n">Deine Wertung</span>
          <b class="ew-v ${UI.wertKlasse(eigene)}" data-zahl="${eigene}">0</b>
        </div>` : ''}
        ${keine ? `<div class="absage">
          ${UI.ikone('fluestern', 15)}
          <div class="ab-text">
            <b>${esc(keine.klub)} verlängert nicht</b>
            <span>${esc(keine.grund)}</span>
          </div>
        </div>` : ''}
        <p class="lead" style="font-size:15px">${esc(grund || 'Dein Vertrag läuft aus.')}</p>
        ${(belege && belege.length) ? `<div class="belege staffel">
          ${belege.map(x => `<div class="beleg ${x.gut === true ? 'gut'
              : x.gut === false ? 'schlecht' : ''}">
            ${UI.ikone(x.ik, 14)}<span>${esc(x.t)}</span>
          </div>`).join('')}
        </div>` : ''}
        <p class="small mt">Ein starker Klub bringt Titel, ein schwächerer mehr Eiszeit.</p>
        <div class="grid g3 mt-l stagger">
          ${angebote.map((a, i) => `
            <button class="jugendkarte" data-angebot="${i}">
              <div class="jk-liga">${a.bleibt ? 'Verbleib · ' : a.draftRecht
                ? 'Draftrechte · ' : ''}${esc(a.lgName)}</div>
              <div class="jk-wappen">${UI.wappenBild(a.club.n, 58)}</div>
              <div class="jk-name">${esc(a.club.n)}</div>
              ${a.klubRang && a.klubRang !== 'zugang'
                ? `<div class="jk-rang">${UI.ikone('krone', 11)} ${a.klubRang === 'legende'
                    ? 'Deine Vereinslegende' : 'Gesicht des Vereins'}</div>` : ''}
              <div class="jk-staerke">${staerkeChip(a)}</div>
              <div class="jk-land">${a.trend ? trendChip(a.trend) : ''}</div>
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
      nachEntscheidung(lauf);
    });
    root.querySelectorAll('[data-wechsel]').forEach(el => el.onclick = () => {
      lauf.entscheideWechselfrist(+el.dataset.wechsel);
      nachEntscheidung(lauf);
    });
    root.querySelectorAll('[data-nominierung]').forEach(el => el.onclick = () => {
      lauf.entscheideNominierung(+el.dataset.nominierung);
      nachEntscheidung(lauf);
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

    /* ----------------------------------------------------------------
       Die Saison braucht einen Moment

       Man tippte auf "Saison beginnen", und das Ergebnis stand da -
       zweiundfuenfzig Spiele in null Millisekunden. Der Klick, um den
       sich das ganze Spiel dreht, fuehlte sich dadurch an wie das
       Umblaettern einer Seite.

       Jetzt laeuft ein kurzer Streifen durch: der Verein, das Jahr,
       und eine Leiste, die sich fuellt. Neunhundert Millisekunden,
       abbrechbar durch Antippen - lang genug, dass etwas passiert
       ist, kurz genug, dass es beim zehnten Mal nicht stoert.
       ---------------------------------------------------------------- */
    const w = root.querySelector('#weiter');
    if (w) w.onclick = () => {
      st.letzteFolge = null;
      const v = lauf.vorschau;
      const weiter = () => { lauf.playSeason(); renderKarriere(); };
      if (!mobil() || !v || UI.wenigerBewegung()) return weiter();
      saisonLaeuft(v, weiter);
    };
    const bw = root.querySelector('#bericht-weiter');
    if (bw) bw.onclick = () => { lauf.schliesseBericht(); neu(); };
    /* ----------------------------------------------------------------
       "Rest automatisch" ist nicht rueckgaengig zu machen

       Ein Fehlgriff auf diesen Knopf spielt die ganze restliche
       Laufbahn in einem Zug durch - jede Entscheidung faellt der
       Berater, und zurueck geht es nicht. Fuer so etwas gehoert eine
       Rueckfrage davor, und zwar eine, die sagt, was genau passiert.
       ---------------------------------------------------------------- */
    const rest = root.querySelector('#rest');
    if (rest) rest.onclick = () => {
      const jahre = Math.max(1, (lauf.maxAge || 40) - st.age);
      UI.frage({
        titel: 'Den Rest automatisch spielen?',
        text: 'Von hier an entscheidet der Berater alles allein – Verträge, '
            + 'Ereignisse, Wechsel. Das können noch bis zu ' + jahre
            + (jahre === 1 ? ' Jahr' : ' Jahre') + ' sein, und rückgängig '
            + 'machen lässt es sich nicht.',
        ja: 'Ja, durchlaufen lassen',
        nein: 'Weiter selbst entscheiden'
      }, () => beendeKarriere(lauf.runToEnd()));
    };
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

  /* ------------------------------------------------------------------
     In die Bestenliste, auch ohne Konto

     Wer ein freigegebenes Profil hat, steht ohnehin drin - dort
     traegt die Engine beim Abschluss selbst ein. Alle anderen bekommen
     hier die Wahl, und geben statt eines Profils einen Namen an.
     ------------------------------------------------------------------ */
  function bestenlisteKnopf(){
    if (typeof KONTO === 'undefined' || !KONTO.konfiguriert()) return '';
    if (KONTO.zustand().frei) return '';        // steht schon drin
    if (S.eingetragen) return '<span class="pill gold">In der Bestenliste</span>';
    return '<button class="btn btn-ghost" id="bestenliste-eintrag">'
         + 'In die Bestenliste eintragen</button>';
  }

  function bestenlisteEintragen(){
    const satz = (PUCKERO.loadCareers() || [])[0];
    if (!satz){ UI.toast('Keine abgeschlossene Laufbahn gefunden'); return; }
    UI.nameFrage({
      titel: 'Unter welchem Namen?',
      text: 'Die Laufbahn erscheint damit in der weltweiten Bestenliste. '
          + 'Der Name steht öffentlich daneben – nimm keinen, der dich verrät.',
      platzhalter: 'z. B. Puckliebhaber',
      wert: KONTO.gastnameLesen(),
      ja: 'Eintragen', nein: 'Doch nicht'
    }, async (name, melden) => {
      const pruef = KONTO.gastnamePruefen(name);
      if (!pruef.ok){ melden(pruef.grund); return false; }
      const erg = await KONTO.alsGastEintragen(satz, name);
      if (!erg.ok){ melden(erg.grund); return false; }
      S.eingetragen = true;
      UI.toast('Eingetragen als ' + erg.name);
      renderResult();
      return true;
    });
  }

  /* ---------- Ergebnis ---------- */
  function renderResult(){
    const res = S.result;
    const p = res.player;
    const nat = PUCKERO.nation(p.nation);
    const gold = res.legacy >= 1300;
    const t = res.totals;
    const bs = res.besteSaison;

    /* ----------------------------------------------------------------
       Die Bilanz war fuenfzehntausend Pixel lang - neunzehn
       Bildschirme am Stueck auf einem Telefon, und das ausgerechnet im
       Moment, in dem eine Laufbahn ihren Sinn bekommt. Auf schmalen
       Geraeten liegt sie jetzt in vier Bereichen: was daraus geworden
       ist, die Zahlen, die Vitrine und der Weg dorthin.
       ---------------------------------------------------------------- */
    const alsApp = mobil();
    const auf = (k) => alsApp ? `<section class="app-tab ${k === ergTab ? 'an' : ''}" data-tab="${k}">` : '';
    const zu  = () => alsApp ? '</section>' : '';

    root.innerHTML = `
      <div class="panel-head">
        <h3>Karriereende</h3>
        <span class="pill ${gold ? 'gold' : ''}">${res.rank.n}</span>
        <span class="pill">${res.legacy} Legendenpunkte</span>
      </div>
      <div class="panel-body ${alsApp ? 'karriere mobil app ergebnis-app' : ''}">
      ${alsApp ? '<div class="app-inhalt">' : ''}
      ${auf('bilanz')}
        ${UI.trikot(res)}
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
                    ? `<span class="pill">Draft Nr. ${res.entryDraft.gesamt}
                        · R${res.entryDraft.runde} · ${esc(res.entryDraft.klub || '')}</span>`
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

        ${UI.laufbahnBogen((res.seasons || []).filter(s => s.gp).map(s => ({
          j: s.year, a: s.age, l: s.lg, o: s.ovr, ti: s.title || null })))}

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

        ${zu()}
        ${auf('zahlen')}
        ${alsApp ? '' : '<div class="grid g2 mt-l">'}
          <div class="card ${alsApp ? 'mt' : ''}">
            <h3>Werte auf dem Höhepunkt</h3>
            <p class="small">Potenzial mal Altersform, gemessen in deiner stärksten Saison.</p>
            <div class="attrs" style="grid-template-columns:1fr">${UI.attrRows(p, res.peakAttrs)}</div>
          </div>
          ${alsApp ? zu() + auf('vitrine') : ''}
          ${(res.klubEhrungen && res.klubEhrungen.length) ? `
            <div class="card ${alsApp ? 'mt' : ''}">
              <h3>Was du deinen Vereinen bedeutet hast</h3>
              <div class="ehrungen">
                ${res.klubEhrungen.map(k => `
                  <div class="ehrung ${k.rang}">
                    <div class="eh-wappen">${UI.wappenBild(k.n, 40)}</div>
                    <div class="eh-text">
                      <b>${esc(k.n)}</b>
                      <span>${esc(k.rangName)} · ${k.saisons}
                        ${k.saisons === 1 ? 'Saison' : 'Saisons'}${k.titel
                          ? ' · ' + k.titel + (k.titel === 1 ? ' Titel' : ' Titel') : ''}</span>
                    </div>
                    ${k.rang === 'legende'
                      ? `<span class="eh-nummer">#${res.player.num}</span>` : ''}
                  </div>`).join('')}
              </div>
              ${res.klubEhrungen.some(k => k.rang === 'legende') ? `
                <p class="small mt mb0">Deine Nummer wird nicht mehr vergeben.</p>` : ''}
            </div>` : ''}

          ${res.leben ? `<div class="card ${alsApp ? 'mt' : ''}">
            <h3>Das Leben daneben</h3>
            ${UI.lebenKarte(Object.assign({}, res.leben,
                { daheim: res.leben.heimatjahre > res.leben.fremdjahre }),
                { gross:true, vermoegen: res.leben.vermoegen })}
            <p class="small mt">${res.leben.heimatjahre} ${res.leben.heimatjahre === 1
              ? 'Saison' : 'Saisons'} in der Heimat, ${res.leben.fremdjahre} in der Fremde.</p>
          </div>` : ''}

          <div class="card ${alsApp ? 'mt' : ''}">
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
        ${alsApp ? '' : '</div>'}

        ${abschnitt('Länderspiele', '<div class="card">' + UI.natTabelle(res) + '</div>')}
        ${alsApp ? zu() + auf('zahlen2') : ''}

        <h2 class="mt-l" style="margin-top:38px">Karrierebilanz</h2>
        ${(() => {
          /* Die Zahlen bekommen dieselbe Farbskala wie die Einzelwerte:
             eine Karrieresumme sagt einem Neuling nichts, solange er
             nicht weiss, wo sie im Feld steht. Gefaerbt wird nur, was
             eine gemessene Verteilung hat - Strafminuten oder Quote
             sind keine Bestenliste. */
          const f = (feld, wert) => UI.bilanzKlasse(feld, wert);
          return UI.statBoxen(res.isG
          ? [['Spiele', t.gp, f('gp', t.gp)], ['Siege', t.wins, f('wins', t.wins)],
             ['Niederlagen', t.losses],
             ['Fangquote', (t.sv * 100).toFixed(1) + '%'], ['Gegentore/Sp', t.gaa.toFixed(2)],
             ['Shutouts', t.so, f('so', t.so)], ['Paraden', t.saves],
             ['Playoffspiele', t.poGp, f('poGp', t.poGp)],
             ['Playoffsiege', t.poWins, 'gold'],
             ['Serien', t.serienGewonnen + '/' + t.serien],
             ['Verdienst', t.gehalt.toFixed(1) + ' Mio']]
          : [['Spiele', t.gp, f('gp', t.gp)], ['Tore', t.g, f('g', t.g)],
             ['Vorlagen', t.a, f('a', t.a)], ['Punkte', t.p, f('p', t.p)],
             ['Punkte/Spiel', t.ppg100], ['Powerplay', t.ppg], ['Unterzahl', t.shg],
             ['Siegtore', t.gwg, f('gwg', t.gwg)], ['Schüsse', t.shots],
             ['Quote', t.shotPct + '%'],
             ['+/-', (t.plus > 0 ? '+' : '') + t.plus], ['Strafminuten', t.pim],
             ['Playoffspiele', t.poGp, f('poGp', t.poGp)],
             ['Playoffpunkte', t.poP, f('poP', t.poP)],
             ['Serien', t.serienGewonnen + '/' + t.serien],
             ['Verdienst', t.gehalt.toFixed(1) + ' Mio']]);
        })()}

        ${rekordeHtml(res)}

        ${abschnitt('Bilanz nach Ligen', UI.ligaBilanz(res))}
        ${abschnitt('Karriere auf einen Blick',
            '<div class="bilanzraster">' + bilanzRaster(res) + '</div>')}
        ${abschnitt('Statistiktabelle', UI.statsTable(res))}
        ${zu()}

        ${auf('weg')}
        ${abschnitt('Stationen', UI.klubKarten(res))}
        ${UI.rollenWeg(res) ? abschnitt('Deine Rolle über die Jahre', UI.rollenWeg(res), true) : ''}
        ${abschnitt('Was deine Laufbahn geprägt hat', UI.wendepunkte(res), true)}
        ${res.jahrgangStand ? abschnitt('Dein Jahrgang zum Schluss',
            UI.jahrgangTabelle(res.jahrgangStand, res.isG, { alle:true, gross:true })
            + UI.jahrgangVerlauf(res)) : ''}
        ${abschnitt('Verlauf Saison für Saison (' + res.seasons.length + ')',
            '<div id="timeline">'
            + res.seasons.map(x => UI.seasonCard(x, res.isG, false, false, mobil())).join('')
            + '</div>')}
        ${zu()}
        ${alsApp ? '</div>' : ''}

        <div class="row mt-l abschluss-taten">
          ${bestenlisteKnopf()}
          <button class="btn btn-primary" id="karte">Karriere-Karte speichern</button>
          <button class="btn btn-ghost" id="share">Als Text teilen</button>
          <button class="btn btn-ghost" id="again">Neue Karriere</button>
          <a class="btn btn-ghost" href="pokalraum.html">Pokalraum</a>
        </div>
        ${alsApp ? appNav(ERG_TABS, ergTab) : `
          <p class="small mt">Seed dieser Karriere: <code>${esc(p.seed)}</code> –
            damit lässt sich dieselbe Ausgangslage erneut draften.</p>`}
      </div>`;

    UI.alleZahlenHoch(root);
    if (res.legacy >= 1300) UI.konfetti(120);

    if (alsApp){
      /* Auch die Bilanz uebernimmt jetzt den Bildschirm. Beide Marken
         hier und nicht in render(): die Schnellkarriere und die
         Tageskarriere zeichnen ihr Ergebnis auf eigenem Weg und
         kaemen sonst nie dazu. */
      document.documentElement.setAttribute('data-vollbild', '');
      document.documentElement.setAttribute('data-spiel', '');
      root.querySelectorAll('[data-apptab]').forEach(el => el.onclick = () => {
        ergTab = el.dataset.apptab;
        /* "zahlen2" traegt den zweiten Teil desselben Bereichs. */
        root.querySelectorAll('.app-tab').forEach(x => x.classList.toggle('an',
          x.dataset.tab === ergTab || (ergTab === 'zahlen' && x.dataset.tab === 'zahlen2')));
        root.querySelectorAll('[data-apptab]').forEach(x =>
          x.classList.toggle('an', x.dataset.apptab === ergTab));
        const inhalt = root.querySelector('.app-inhalt');
        if (inhalt) inhalt.scrollTop = 0;
      });
      /* Beim ersten Zeichnen denselben Zustand herstellen */
      root.querySelectorAll('.app-tab').forEach(x => x.classList.toggle('an',
        x.dataset.tab === ergTab || (ergTab === 'zahlen' && x.dataset.tab === 'zahlen2')));
    }

    let teilenLaeuft = false;
    /* Der Knopf steht auf dem Ergebnisbildschirm, also gehoert er auch
       hierher gebunden - im Binder der laufenden Karriere fand er
       nichts und blieb wirkungslos. */
    const be = root.querySelector('#bestenliste-eintrag');
    if (be) be.onclick = bestenlisteEintragen;

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
    standLoeschen();
    render(); scrollTop();
    if (cfg.onFinish) cfg.onFinish(res);
  }

  function bestaetigtNeustart(){
    const weit = S.phase === 'karriere' && S.lauf && S.lauf.st.seasons.length > 2;
    if (weit && !confirm('Diese Karriere wirklich abbrechen? Der bisherige Verlauf geht verloren.')) return;
    neustart(true);
  }

  function neustart(seedVerwerfen){
    standLoeschen();
    if (cfg.onAgain){ cfg.onAgain(); return; }
    S.phase = 'ident';
    S.player = null; S.lauf = null; S.result = null;
    S.runde = 0; S.zuege = []; S.karten = [];
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
    standLoeschen();
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
