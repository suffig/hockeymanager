/* ==========================================================
   Eiszeit – gemeinsame Oberflächen-Bausteine
   ========================================================== */

/* Der Speicher hiess frueher anders. Einmalig uebernehmen, damit
   gespeicherte Karrieren und Fortschritte nicht verloren gehen. */
(function umzug(){
  try {
    [['puckero.karrieren',         'eiszeit.karrieren'],
     ['puckero.herausforderungen', 'eiszeit.herausforderungen'],
     ['puckero.thema',             'eiszeit.thema'],
     ['puckero.tagesbestwert',     'eiszeit.tagesbestwert']].forEach(([alt, neu]) => {
      const wert = localStorage.getItem(alt);
      if (wert !== null && localStorage.getItem(neu) === null){
        localStorage.setItem(neu, wert);
        localStorage.removeItem(alt);
      }
    });
  } catch(e){}
})();

const UI = (() => {

  /* Spielernamen kommen aus einem Eingabefeld – im Markup escapen. */
  const esc = t => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* ----------------------------------------------------------------
     Eigenes Icon-Set. Alles selbst gezeichnete Pfade auf 24x24, die
     ueber currentColor die Themenfarbe uebernehmen - dadurch tragen
     sie in allen drei Designs und ersetzen viel Fliesstext.
     ---------------------------------------------------------------- */
  const IKONEN = {
    puck:      '<ellipse cx="12" cy="12" rx="8" ry="3.4"/><path d="M4 12v3.2c0 1.9 3.6 3.4 8 3.4s8-1.5 8-3.4V12" fill="none" stroke-width="1.8"/>',
    schlaeger: '<path d="M5 4v11.5c0 1.4 1.1 2.5 2.5 2.5H19" fill="none" stroke-width="2.2" stroke-linecap="round"/><path d="M15 18h4.5" stroke-width="3.4" stroke-linecap="round"/>',
    tor:       '<path d="M4 19V9a8 8 0 0 1 16 0v10" fill="none" stroke-width="2"/><path d="M4 19h16M8 19v-8M12 19V7.5M16 19v-8" fill="none" stroke-width="1.2"/>',
    pokal:     '<path d="M7 4h10v5a5 5 0 0 1-10 0z" fill="none" stroke-width="1.9"/><path d="M7 6H4.5v1.5A3.5 3.5 0 0 0 8 11M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11" fill="none" stroke-width="1.5"/><path d="M12 14v4M8.5 20h7" fill="none" stroke-width="2" stroke-linecap="round"/>',
    medaille:  '<path d="M8 3l2.5 6M16 3l-2.5 6" fill="none" stroke-width="1.8"/><circle cx="12" cy="15" r="5.5" fill="none" stroke-width="1.9"/><path d="M12 12.5l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3z"/>',
    stern:     '<path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.2L12 16.8 6.4 20l1.4-6.2L3 9.5l6.4-.6z"/>',
    herz:      '<path d="M12 20S3.5 14.6 3.5 9.2A4.7 4.7 0 0 1 12 6.5a4.7 4.7 0 0 1 8.5 2.7C20.5 14.6 12 20 12 20z"/>',
    schild:    '<path d="M12 3l7.5 3v6c0 4.6-3.2 7.6-7.5 9-4.3-1.4-7.5-4.4-7.5-9V6z" fill="none" stroke-width="1.9"/>',
    flug:      '<path d="M3 12h11l-3-5h2.6l5.2 5H21l-2 2h-1.2l-5.2 5H10l3-5H3z"/>',
    transfer:  '<path d="M4 9h13l-3-3M20 15H7l3 3" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    krone:     '<path d="M4 17l-1-9 5 3 4-6 4 6 5-3-1 9z" fill="none" stroke-width="1.9" stroke-linejoin="round"/><path d="M4 20h16" stroke-width="2" stroke-linecap="round"/>',
    ziel:      '<circle cx="12" cy="12" r="8.5" fill="none" stroke-width="1.8"/><circle cx="12" cy="12" r="4.5" fill="none" stroke-width="1.8"/><circle cx="12" cy="12" r="1.4"/>',
    waage:     '<path d="M12 4v15M6 19h12M4 9h16M4 9l-2.5 5h5zM20 9l-2.5 5h5z" fill="none" stroke-width="1.7" stroke-linejoin="round"/>',
    stift:     '<path d="M4 20l1-4L16 5l3 3L8 19z" fill="none" stroke-width="1.8" stroke-linejoin="round"/><path d="M14.5 6.5l3 3" stroke-width="1.6"/>',
    fluestern: '<path d="M4 5h16v10H9l-5 4z" fill="none" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 10h3M13 10h3" stroke-width="1.8" stroke-linecap="round"/>',
    uhr:       '<circle cx="12" cy="12" r="8.5" fill="none" stroke-width="1.8"/><path d="M12 7v5.4l3.4 2" fill="none" stroke-width="1.8" stroke-linecap="round"/>',
    hoch:      '<path d="M12 19V6M6 12l6-6 6 6" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    runter:    '<path d="M12 5v13M6 12l6 6 6-6" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    pflaster:  '<rect x="3.2" y="8.6" width="17.6" height="6.8" rx="3.4" transform="rotate(-35 12 12)" fill="none" stroke-width="1.9"/><path d="M10 11.2l.01 0M13 12.8l.01 0M11 14l.01 0M12.5 10l.01 0" stroke-width="1.9" stroke-linecap="round"/>',
    flamme:    '<path d="M12 3s5 4.2 5 8.6A5 5 0 0 1 7 12c0-1.7.8-3 1.6-4 .2 1.2 1 2 1.9 2 0-3.4 1.5-5.4 1.5-7z"/>',
    gruppe:    '<circle cx="9" cy="8.5" r="3.2" fill="none" stroke-width="1.8"/><path d="M3.5 19c0-3 2.5-4.8 5.5-4.8s5.5 1.8 5.5 4.8" fill="none" stroke-width="1.8"/><path d="M16 6.2a3 3 0 0 1 0 5.6M17 14.6c2.2.5 3.6 2.1 3.6 4.4" fill="none" stroke-width="1.7"/>',
    kalender:  '<rect x="3.5" y="5.5" width="17" height="14" rx="2.2" fill="none" stroke-width="1.8"/><path d="M3.5 10h17M8 3.5v4M16 3.5v4" fill="none" stroke-width="1.8" stroke-linecap="round"/>',
    blitz:     '<path d="M13.5 2L5 13.5h5L9.5 22 19 10h-5.5z"/>',
    haken:     '<path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
    kreuz:     '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke-width="2.4" stroke-linecap="round"/>',
    pfeife:    '<circle cx="8.5" cy="13" r="5.5" fill="none" stroke-width="1.8"/><path d="M13.5 10.5H21v4h-7.5" fill="none" stroke-width="1.8" stroke-linejoin="round"/>',
    auge:      '<path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z" fill="none" stroke-width="1.8"/><circle cx="12" cy="12" r="2.6"/>'
  };

  /* Ein Icon als Inline-SVG. Groesse in Pixeln, Farbe kommt vom Text. */
  function ikone(name, groesse){
    const d = IKONEN[name];
    if (!d) return '';
    const g = groesse || 16;
    return '<svg class="ik" viewBox="0 0 24 24" width="' + g + '" height="' + g +
           '" fill="currentColor" stroke="currentColor" aria-hidden="true" focusable="false">' +
           d + '</svg>';
  }

  /* Icon plus Zahl - ersetzt eine beschriftete Textzeile. */
  function kennzahl(name, wert, titel, klasse){
    return '<span class="kennzahl ' + (klasse || '') + '" title="' + esc(titel || '') + '">' +
           ikone(name, 15) + '<b>' + wert + '</b></span>';
  }

  const NAVLINKS = [
    { href:'index.html#spielen',   n:'Spielen' },
    { href:'herausforderungen.html', n:'Ziele' },
    { href:'guides.html',          n:'Guides' },
    { href:'pokalraum.html',       n:'Pokalraum' },
    { href:'bestenliste.html',     n:'Bestenliste' },
    { href:'konto.html',           n:'Konto' },
    { href:'index.html#faq',       n:'FAQ' }
  ];

  function header(active){
    const links = NAVLINKS.map(l =>
      `<a href="${l.href}"${l.n === active ? ' class="active"' : ''}>${l.n}</a>`).join('');
    return `
<header class="site">
  <div class="wrap">
    <div class="nav" id="mainnav">
      <a class="brand" href="index.html"><span class="puck"></span>EISZEIT</a>
      <button class="menu-btn" aria-label="Menü" onclick="document.getElementById('mainnav').classList.toggle('open')">☰</button>
      <nav>${links}
        <span class="thema-schalter" role="group" aria-label="Design umschalten">
          <button type="button" data-thema-wahl="klassisch">Eis</button>
          <button type="button" data-thema-wahl="verspielt">Bunt</button>
          <button type="button" data-thema-wahl="retro">Retro</button>
        </span>
      </nav>
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
        <a class="brand" href="index.html" style="margin-bottom:12px"><span class="puck"></span>EISZEIT</a>
        <p class="small" style="max-width:34ch">Kostenlose Eishockey-Karrieresimulation im Browser.
        Kein Konto, keine Installation, keine Bezahlschranke.</p>
      </div>
      <div>
        <h4>Spielen</h4>
        <ul>
          <li><a href="index.html#spielen">Eislegende</a></li>
          <li><a href="schnellkarriere.html">Schnellkarriere</a></li>
          <li><a href="taeglich.html">Tageskarriere</a></li>
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
      <span>© ${new Date().getFullYear()} Eiszeit – ein nicht lizenziertes Fanprojekt.</span>
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
    themaBinden();
    kopfhoeheSetzen();
    appVorbereiten();
  }

  /* ---------- Themenumschaltung ---------- */
  /* ----------------------------------------------------------------
     Als App auf dem Startbildschirm

     Der Offlinespeicher macht aus dem Versprechen "funktioniert
     offline" eine Tatsache. Er laeuft nur ueber https oder localhost -
     anderswo meldet der Browser ihn gar nicht erst an, und das Spiel
     laeuft trotzdem.
     ---------------------------------------------------------------- */
  let installEinladung = null;

  function appVorbereiten(){
    if ('serviceWorker' in navigator){
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      });
    }
    themaFarbeSetzen();

    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      installEinladung = e;
      installKnopfZeigen();
    });
    window.addEventListener('appinstalled', () => {
      installEinladung = null;
      const k = document.querySelector('.install-knopf');
      if (k) k.remove();
    });
  }

  /* Die Leistenfarbe des Betriebssystems folgt dem gewaehlten Thema -
     sonst steht ein dunkler Balken ueber der hellen Retro-Fassung. */
  function themaFarbeSetzen(){
    const m = document.querySelector('meta[name="theme-color"]');
    if (!m) return;
    const t = document.documentElement.getAttribute('data-thema');
    m.setAttribute('content',
      t === 'retro' ? '#e9dfcb' : t === 'verspielt' ? '#140f2e' : '#0b1220');
  }

  function installKnopfZeigen(){
    if (document.querySelector('.install-knopf')) return;
    const k = document.createElement('button');
    k.className = 'install-knopf';
    k.type = 'button';
    k.innerHTML = ikone('flug', 15) + '<span>Als App installieren</span>';
    k.onclick = async () => {
      if (!installEinladung) return;
      k.disabled = true;
      installEinladung.prompt();
      const { outcome } = await installEinladung.userChoice;
      installEinladung = null;
      if (outcome === 'accepted') k.remove(); else k.disabled = false;
    };
    document.body.appendChild(k);
  }

  /* Die Kopfleiste bleibt beim Scrollen stehen. Ihre Hoehe geht in die
     Rechnung des mobilen App-Rahmens ein - wird sie nicht gesetzt,
     greift ein Ersatzwert und die Seite ragt um wenige Pixel ueber. */
  function kopfhoeheSetzen(){
    const kopf = document.querySelector('header.site');
    document.documentElement.style.setProperty('--kopfhoehe',
      ((kopf && kopf.offsetHeight) || 56) + 'px');
  }
  if (typeof window !== 'undefined')
    window.addEventListener('resize', () => kopfhoeheSetzen());

  const THEMA_KEY = 'eiszeit.thema';
  /* 'klassisch' ist der Grundzustand ohne Attribut, alle weiteren
     Themen setzen data-thema auf <html>. */
  const THEMEN = ['klassisch', 'verspielt', 'retro'];

  function themaLesen(){
    try {
      const t = localStorage.getItem(THEMA_KEY);
      return THEMEN.includes(t) ? t : 'klassisch';
    } catch(e){ return 'klassisch'; }
  }
  function themaSetzen(wahl){
    const t = THEMEN.includes(wahl) ? wahl : 'klassisch';
    if (t === 'klassisch') document.documentElement.removeAttribute('data-thema');
    else document.documentElement.setAttribute('data-thema', t);
    try { localStorage.setItem(THEMA_KEY, t); } catch(e){}
    themaMarkieren();
    themaFarbeSetzen();
  }
  function themaMarkieren(){
    const jetzt = themaLesen();
    document.querySelectorAll('[data-thema-wahl]').forEach(b =>
      b.classList.toggle('on', b.dataset.themaWahl === jetzt));
  }
  function themaBinden(){
    document.querySelectorAll('[data-thema-wahl]').forEach(b =>
      b.onclick = () => themaSetzen(b.dataset.themaWahl));
    themaMarkieren();
  }

  /* ---------- Bausteine ---------- */
  /* ------------------------------------------------------------------
     Die Farbskala der Werte

     Die Grenzen stehen auf den gemessenen Quantilen aller Einzelwerte
     ueber 56000 Beobachtungen (p25=49, p50=60, p75=69, p90=76,
     p97=81), nicht auf einem Gefuehl. Der erste Entwurf setzte Gold
     bei 88 an - das liegt ueber dem 99. Perzentil, es waere also nie
     erschienen, und beim Draft war umgekehrt alles rot.
     ------------------------------------------------------------------ */
  function wertKlasse(v){
    return v >= 81 ? 'w-elite'      // oberste drei Prozent
         : v >= 72 ? 'w-stark'      // oberstes Fuenftel
         : v >= 61 ? 'w-solide'     // obere Haelfte
         : v >= 46 ? 'w-mittel'
         : 'w-schwach';             // unteres Fuenftel
  }

  function attrRows(player, attrs){
    const list = PUCKERO.attrsOf(player.pos);
    const a = attrs || player.attrs;
    return list.map(x => {
      /* Gerundet, und zwar hier statt im Zustand: seit die Werte durch
         das Talentsystem in Bruchteilen wachsen, stand in der Spalte
         "63.47826086956522" - drei Zeilen breit, und die ganze Seite
         liess sich dadurch nach rechts schieben. */
      const v = Math.round(a[x.k] || 0);
      /* ------------------------------------------------------------
         Farbe nach Wert

         Fuenf Stufen statt zwei. Die Grenzen sind die, die auch die
         Wertungsraenge im Spiel benutzen, damit eine 82 hier dasselbe
         bedeutet wie eine 82 dort.
         ------------------------------------------------------------ */
      const cls = wertKlasse(v);
      return `<div class="attr"><span class="n">${x.n}</span>
        <span class="bar"><i class="${cls}" style="width:${Math.min(100, v)}%"></i></span>
        <span class="v ${cls}">${v}</span></div>`;
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
  function seasonCard(s, isG, blind, neu, kompakt){
    const kl = ['season'];
    if (neu) kl.push('neu');
    if (s.title) kl.push('titel');
    if (s.sternstunde) kl.push('sternstunde');

    /* Icon, Zahl, winzige Beschriftung. Der Klartext steht zusaetzlich im
       title, aber sichtbar bleibt er auch ohne Maus - auf dem Handy gibt
       es kein Hover. */
    /* Reine Zahlen bekommen data-zahl und zaehlen sich beim Erscheinen
       hoch - zusammengesetzte Werte wie "34-12-6" bleiben, wie sie sind. */
    const kachel = (ik, wert, kurz, lang, ton) => {
      const zaehlbar = neu && typeof wert === 'number' && isFinite(wert);
      return `
      <div class="stk ${ton || ''}" title="${esc(lang || kurz)}">
        <span class="stk-ik">${ikone(ik, 15)}</span>
        <b${zaehlbar ? ' data-zahl="' + wert + '">0' : '>' + wert}</b>
        <span class="stk-n">${kurz}</span>
      </div>`;
    };

    /* Die Uebersicht zeigt nur, was man beim Durchblaettern wirklich
       braucht. Alles Weitere steht hinter "Details der Saison" - die
       Zahlen sind dieselben, nur nicht mehr alle auf einmal. */
    const kern = isG
      ? kachel('kalender', s.gp, 'Spiele')
        + kachel('waage', s.wins + '-' + (s.losses || 0) + '-' + (s.otl || 0),
                 'Bilanz', 'Siege – Niederlagen – Verlängerung')
        + kachel('schild', (s.sv * 100).toFixed(1) + '%', 'Fangquote')
        + kachel('haken', s.so, 'Shutouts', 'Spiele ohne Gegentor', s.so > 0 ? 'gut' : '')
      : kachel('kalender', s.gp, 'Spiele')
        + kachel('tor', s.g, 'Tore')
        + kachel('gruppe', s.a, 'Vorlagen')
        + kachel(s.plus >= 0 ? 'hoch' : 'runter',
                 (s.plus > 0 ? '+' : '') + s.plus, '+/-', 'Plus-Minus-Bilanz',
                 s.plus > 0 ? 'gut' : s.plus < 0 ? 'schlecht' : '')
        + kachel('uhr', (s.toi || 0), 'Eiszeit', 'Eiszeit pro Spiel in Minuten');

    const weitere = isG
      ? kachel('tor', s.gaa.toFixed(2), 'Gegentore', 'Gegentorschnitt pro Spiel')
        + kachel('auge', s.saves || 0, 'Paraden')
        + kachel('ziel', s.shotsAgainst || 0, 'Schüsse', 'Schüsse aufs eigene Tor')
      : kachel('stern', s.p, 'Punkte', 'Scorerpunkte', 'stark')
        + kachel('blitz', s.ppg || 0, 'Überzahl', 'Tore in Überzahl')
        + kachel('krone', s.gwg || 0, 'Siegtore', 'Spielentscheidende Tore')
        + kachel('ziel', (s.shots || 0) + ' · ' + (s.shotPct || 0) + '%', 'Schüsse',
                 'Schüsse und Trefferquote')
        + (s.bully ? kachel('puck', s.bully + '%', 'Bully', 'Gewonnene Bullys') : '')
        + kachel('kreuz', s.pim || 0, 'Strafen', 'Strafminuten');

    /* Ohne Klappe stehen weiterhin alle Zahlen nebeneinander. */
    const line = kompakt ? kern : kern + weitere;

    /* ------------------------------------------------------------------
       Nicht jedes Ereignis ist dasselbe

       Sie standen alle als gleiche Zeile da, hoechstens gruen oder rot.
       Dabei ist eine Verletzung etwas anderes als eine Trophaee und die
       wieder etwas anderes als ein Wechsel. Die Art wird am Text
       erkannt - das ist unschoener als ein Feld an der Quelle, aber es
       greift auch fuer alle Ereignisse, die anderswo erzeugt werden,
       ohne dass an fuenfzig Stellen etwas nachgetragen werden muss.
       ------------------------------------------------------------------ */
    const evs = s.events.map((e, i) => {
      const t = e.t || '';
      const art = /verpasst|Operation|Reha|Verletzung|schon wieder/i.test(t) ? 'verletzt'
                : /Cup|Meisterschaft|Trophy|Pokal|Malja|Titel/i.test(t) ? 'trophaee'
                : /Auszeichnung|All-Star|Topscorer|Torjäger|Wertvollster|Bester/i.test(t) ? 'ehrung'
                : /Gold|Silber|Bronze|Weltmeisterschaft|Olympi/i.test(t) ? 'nation'
                : /Wechsel|wechselt|übernimmt|muss gehen|verlängert/i.test(t) ? 'wechsel'
                : /Kapitän|C geht|Vereinslegende|Gesicht des Vereins/i.test(t) ? 'amt'
                : /Draft|Rechte/i.test(t) ? 'draft'
                : /Vater|Kind|Nachwuchs|nicht mehr allein/i.test(t) ? 'leben'
                : '';
      return `<div class="ev ${e.c} ${art ? 'ev-' + art : ''}"
        style="animation-delay:${Math.min(0.5, 0.05 * i)}s">${e.t}</div>`;
    }).join('');
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
        ${s.reihe || s.rolle ? '<span class="pill">' + (s.reihe || s.rolle) + '</span>' : ''}
        ${s.rollenUrteil ? '<span class="pill rolle-' + s.rollenUrteil + '">'
          + (s.rollenIcon || '') + ' ' + (URTEIL[s.rollenUrteil] || {}).n + '</span>' : ''}
        ${s.platz ? '<span class="pill">' + s.platz + '. Platz</span>' : ''}
        ${s.sternstunde ? '<span class="pill" style="color:var(--accent-2);border-color:var(--accent-2)">Sternstunde</span>' : ''}
        ${s.title ? '<span class="pill gold">' + s.title + '</span>' : ''}
      </div>
      ${zeremonie(s)}
      <div class="statgitter">${line}</div>
      ${kompakt ? '<details class="season-mehr"><summary>Details der Saison</summary>'
                  + '<div class="statgitter weitere">' + weitere + '</div>' : ''}
      ${s.ziele ? zielKarte(s.ziele, { klein:true }) : ''}
      ${serienBaum(s)}
      ${s.faktoren ? `<div class="faktoren">
          <span class="fk ${s.faktoren.form > 0 ? 'plus' : s.faktoren.form < 0 ? 'minus' : ''}"
            title="Mehrjähriger Formzustand">Form ${s.faktoren.form > 0 ? '+' : ''}${s.faktoren.form}</span>
          <span class="fk ${s.faktoren.eingewoehnung > 0 ? 'plus' : 'minus'}"
            title="Eingewöhnung beim Klub">Eingewöhnung ${s.faktoren.eingewoehnung > 0 ? '+' : ''}${s.faktoren.eingewoehnung}%</span>
          <span class="fk ${s.faktoren.mitspieler > 0 ? 'plus' : 'minus'}"
            title="Stärke der Mitspieler">Mitspieler ${s.faktoren.mitspieler > 0 ? '+' : ''}${s.faktoren.mitspieler}%</span>
        </div>` : ''}
      ${s.hoehepunkt ? `<div class="hoehepunkt">
          <span class="hp-marke">Spiel der Saison</span>${s.hoehepunkt.t}</div>` : ''}
      ${evs ? '<div class="events">' + evs + '</div>' : ''}
      ${nat}
      ${s.story ? '<div class="story">' + s.story + '</div>' : ''}
      ${kompakt ? '</details>' : ''}
    </div>`;
  }

  /* Nur die Zahlen der letzten Saison, ohne Kopf und Beiwerk.
     Gemessen kostete die volle Karte im Spielbereich 346 Pixel - der
     Streifen kommt mit rund einem Sechstel aus, und die vollstaendige
     Karte steht ohnehin im Bereich "Verlauf". */
  function bilanzStreifen(s, isG){
    if (!s) return '';
    const z = (ik, wert, kurz) =>
      `<span class="bs-wert" title="${esc(kurz)}">${ikone(ik, 13)}<b>${wert}</b></span>`;
    return `<div class="bilanzstreifen">
      <span class="bs-jahr">${s.year}/${String(s.year + 1).slice(2)}</span>
      ${isG
        ? z('kalender', s.gp, 'Spiele')
          + z('waage', s.wins + '-' + (s.losses || 0) + '-' + (s.otl || 0), 'Bilanz')
          + z('schild', (s.sv * 100).toFixed(1) + '%', 'Fangquote')
          + z('haken', s.so, 'Shutouts')
        : z('kalender', s.gp, 'Spiele')
          + z('tor', s.g, 'Tore')
          + z('gruppe', s.a, 'Vorlagen')
          + z(s.plus >= 0 ? 'hoch' : 'runter', (s.plus > 0 ? '+' : '') + s.plus, 'Plus-Minus')
          + z('uhr', s.toi || 0, 'Eiszeit')}
    </div>`;
  }

  /* ----------------------------------------------------------------
     Die Rolle im Verein

     Bisher stand da eine Zeile mit einem Emoji. Dabei ist die Rolle
     das, woran der Trainer dich misst - also gehoert sichtbar dazu,
     wie fest du drin sitzt, wofuer du gebaut bist und in welcher
     Reihe dich das aufs Eis bringt.
     ---------------------------------------------------------------- */
  const ROLLEN_STAND = {
    bewaehrung: { n:'Auf Bewährung', k:'probe' },
    gesetzt:    { n:'Gesetzt',       k:'fest' },
    saeule:     { n:'Säule',         k:'saeule' }
  };
  const URTEIL = {
    uebertroffen: { n:'übertroffen', k:'gut' },
    erfuellt:     { n:'erfüllt',     k:'gut' },
    verfehlt:     { n:'verfehlt',    k:'schlecht' }
  };
  const PASSUNG_TEXT = w =>
    w >= 0.45 ? 'wie gemacht dafür' : w >= 0.12 ? 'passt gut'
  : w >= -0.15 ? 'geht so' : w >= -0.5 ? 'nicht deine Stärke'
  : 'falsch besetzt';

  function rollenKarte(st, letzte){
    if (!st || !st.rolle) return '';
    const stand = ROLLEN_STAND[st.rollenStand] || ROLLEN_STAND.gesetzt;
    /* -4 bis +4 auf eine Leiste. Der Spieler soll sehen, wie nah die
       naechste Beförderung oder die Umstellung ist. */
    const anteil = Math.round((clampZahl(st.rollenPunkte || 0, -4, 4) + 4) / 8 * 100);
    const pass = letzte && letzte.rollenPassung !== undefined ? letzte.rollenPassung : null;
    const urteil = letzte && letzte.rollenUrteil ? URTEIL[letzte.rollenUrteil] : null;

    return `<div class="rollenstand ${stand.k}">
      <div class="rs-kopf">
        <span class="rs-icon">${st.rolle.icon}</span>
        <span class="rs-name">
          <b>${esc(st.rolle.n.replace(/^Als /, ''))}</b>
          <span class="rs-lage">${stand.n}${letzte && letzte.reihe
            ? ' · ' + esc(letzte.reihe) : ''}</span>
        </span>
        ${urteil ? `<span class="rs-urteil ${urteil.k}">${urteil.n}</span>` : ''}
      </div>
      <div class="rs-leiste"><i style="--ziel:${anteil}%;width:${anteil}%"></i>
        <span class="rs-marke" style="left:37.5%"></span></div>
      <div class="rs-fuss">
        <span>${ikone('waage', 12)} ${st.rolle.soll ? esc(st.rolle.soll) : 'Leistung'}</span>
        ${pass !== null ? `<span class="${pass < -0.15 ? 'warnton' : ''}">
          ${ikone('ziel', 12)} ${PASSUNG_TEXT(pass)}</span>` : ''}
      </div>
    </div>`;
  }

  function clampZahl(v, a, b){ return v < a ? a : v > b ? b : v; }

  /* Der Rollenweg: was der Trainer ueber die Jahre aus dir gemacht hat.
     Am Ende einer Laufbahn ist das oft die ehrlichere Geschichte als
     die Vitrine - Aufstieg, Bestaetigung, Umstellung, Abstieg. */
  const ROLLEN_ANFANG = {
    vereinbart: { n:'vereinbart',  k:'' },
    abgelehnt:  { n:'zugewiesen',  k:'schlecht' },
    umgestellt: { n:'umgestellt',  k:'schlecht' }
  };

  /* Der Rollenweg: was der Trainer ueber die Jahre aus dir gemacht hat.
     Am Ende einer Laufbahn ist das oft die ehrlichere Geschichte als die
     Vitrine.

     Der erste Entwurf zeigte jeden Eintrag einzeln - bei sechzehn
     Zeilen ("bestaetigt", "verfehlt", "bestaetigt", ...) las sich das
     wie ein Protokoll, nicht wie eine Laufbahn. Jetzt wird nach
     Abschnitten zusammengefasst: eine Zeile je Rolle, mit dem Zeitraum,
     dem hoechsten erreichten Stand und dem, was schiefging. */
  function rollenWeg(res){
    const lauf = res.rollenLauf || [];
    if (!lauf.length) return '';
    const alle = (PUCKERO_DATA.ROLLEN || []).concat(PUCKERO_DATA.ROLLEN_G || []);
    const finde = k => alle.find(x => x.k === k) || {};
    const RANG = { bewaehrung:0, gesetzt:1, saeule:2 };
    const letztesJahr = (res.seasons || []).length
      ? res.seasons[res.seasons.length - 1].year : null;

    /* Aufeinanderfolgende Eintraege derselben Rolle zu einem Abschnitt. */
    const abschnitte = [];
    lauf.forEach(x => {
      const letzter = abschnitte[abschnitte.length - 1];
      if (letzter && letzter.rolle === x.rolle){
        if (RANG[x.stand] > RANG[letzter.hoechst]) letzter.hoechst = x.stand;
        if (x.grund === 'verfehlt') letzter.verfehlt++;
        if (x.grund === 'uebertroffen') letzter.stark++;
        letzter.bis = x.jahr;
      } else {
        abschnitte.push({ rolle: x.rolle, von: x.jahr, bis: x.jahr,
          anfang: ROLLEN_ANFANG[x.grund] ? x.grund : 'vereinbart',
          statt: x.wunsch || x.von || null,
          hoechst: x.stand, verfehlt: x.grund === 'verfehlt' ? 1 : 0,
          stark: x.grund === 'uebertroffen' ? 1 : 0 });
      }
    });
    abschnitte.forEach((a, i) => {
      a.bis = i + 1 < abschnitte.length ? abschnitte[i + 1].von - 1
            : (letztesJahr || a.bis);
      if (a.bis < a.von) a.bis = a.von;
    });

    const umgestellt = lauf.filter(x => x.grund === 'umgestellt').length;
    const abgelehnt  = lauf.filter(x => x.grund === 'abgelehnt').length;

    return `<div class="card">
      <div class="rw-liste">
        ${abschnitte.map(a => {
          const rolle = finde(a.rolle);
          const st = ROLLEN_STAND[a.hoechst] || ROLLEN_STAND.gesetzt;
          const an = ROLLEN_ANFANG[a.anfang];
          const jahre = a.von === a.bis ? String(a.von)
                      : a.von + '–' + String(a.bis).slice(2);
          return `<div class="rw-zeile ${st.k}">
            <span class="rw-jahr">${jahre}</span>
            <span class="rw-icon">${rolle.icon || '•'}</span>
            <span class="rw-name">
              <b>${esc(rolle.kurz || (rolle.n || a.rolle).replace(/^Als /, ''))}</b>
              ${a.statt ? `<em>statt ${esc(finde(a.statt).kurz
                  || (finde(a.statt).n || a.statt).replace(/^Als /, ''))}</em>` : ''}
            </span>
            <span class="rw-bilanz">
              ${an.k ? `<b class="${an.k}">${an.n}</b>` : ''}
              ${a.stark ? `<span class="gut">${a.stark}× übertroffen</span>` : ''}
              ${a.verfehlt ? `<span class="schlecht">${a.verfehlt}× verfehlt</span>` : ''}
            </span>
            <span class="rw-stand">${st.n}</span>
          </div>`;
        }).join('')}
      </div>
      <p class="small mt mb0">${
        umgestellt === 0 && abgelehnt === 0
          ? 'Du hast jede Rolle bekommen, die du wolltest, und keine wieder verloren.'
        : umgestellt === 0
          ? 'Der Klub hat dir nicht alles zugetraut – aber was du bekommen hast, hast du behalten.'
        : 'Der Trainer hat dich ' + (umgestellt === 1 ? 'einmal'
            : umgestellt === 2 ? 'zweimal' : umgestellt + '-mal')
          + ' umgestellt. Wer seine Rolle verliert, spielt danach in einer '
          + 'anderen Mannschaft, auch wenn das Trikot dasselbe bleibt.'}</p>
    </div>`;
  }

  /* ----------------------------------------------------------------
     Der Bogen einer Laufbahn

     Eine Tabelle sagt, was in einer Saison passiert ist. Sie sagt
     nicht, wie die Laufbahn verlaufen ist - ob jemand frueh oben war
     und lange gehalten hat, ob er spaet aufblühte oder ob es nach
     einem Gipfel steil abwaerts ging. Genau das ist aber das, was
     eine fremde Laufbahn interessant macht.

     Deshalb eine Kurve des Gesamtwerts ueber die Jahre, mit den
     Ligawechseln als Marken und den Titeljahren als Sternen.
     ---------------------------------------------------------------- */
  let bogenZaehler = 0;
  function laufbahnBogen(saisonwerte){
    const w = (saisonwerte || []).filter(s => s.o);
    if (w.length < 3) return '';

    const B = 100, H = 40, rand = 3;
    const werte = w.map(s => s.o);
    const min = Math.max(30, Math.min(...werte) - 4);
    const max = Math.min(99, Math.max(...werte) + 4);
    const x = i => rand + i * (B - rand * 2) / (w.length - 1);
    const y = v => H - rand - (v - min) / Math.max(1, max - min) * (H - rand * 2);

    const linie = w.map((s, i) => x(i).toFixed(1) + ',' + y(s.o).toFixed(1)).join(' ');
    const flaeche = `${rand},${H} ` + linie + ` ${x(w.length - 1).toFixed(1)},${H}`;

    /* Wo die Liga wechselt, steht eine senkrechte Marke. */
    const wechsel = w.map((s, i) => (i > 0 && s.l !== w[i - 1].l)
      ? `<line x1="${x(i).toFixed(1)}" y1="${rand}" x2="${x(i).toFixed(1)}" y2="${H - rand}"
           stroke="currentColor" stroke-width=".4" opacity=".28"
           stroke-dasharray="1.4 1.4"/>` : '').join('');

    const titel = w.map((s, i) => s.ti
      ? `<circle cx="${x(i).toFixed(1)}" cy="${y(s.o).toFixed(1)}" r="1.5"
           fill="var(--gold)"/>` : '').join('');

    const gipfel = werte.indexOf(Math.max(...werte));
    /* Eigene Kennung je Bild: sonst zeigen zwei Boegen auf derselben
       Seite beide auf denselben Verlauf. */
    const farbId = 'bogenfarbe' + (bogenZaehler++);

    return `<div class="bogen mt">
      <div class="bogen-kopf">
        <span>${ikone('hoch', 13)} Der Bogen der Laufbahn</span>
        <span class="bogen-legende">
          <i class="bl-marke"></i> Ligawechsel
          <i class="bl-titel"></i> Titel
        </span>
      </div>
      <svg viewBox="0 0 ${B} ${H}" preserveAspectRatio="none" class="bogen-bild"
           role="img" aria-label="Gesamtwert je Saison von ${w[0].j} bis ${w[w.length-1].j}">
        <defs>
          <linearGradient id="${farbId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--accent)" stop-opacity=".38"/>
            <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
          </linearGradient>
        </defs>
        ${wechsel}
        <polygon class="bogen-flaeche" points="${flaeche}" fill="url(#${farbId})"/>
        <polyline class="bogen-linie" points="${linie}" fill="none" stroke="var(--accent)"
                  stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round"/>
        <g class="bogen-titel">${titel}</g>
        <circle class="bogen-gipfel" cx="${x(gipfel).toFixed(1)}"
                cy="${y(werte[gipfel]).toFixed(1)}" r="1.7"
                fill="none" stroke="var(--text)" stroke-width=".6"/>
      </svg>
      <div class="bogen-fuss">
        <span>${w[0].j} · ${w[0].a} Jahre</span>
        <span>Höchstwert ${werte[gipfel]} mit ${w[gipfel].a}</span>
        <span>${w[w.length - 1].j + 1} · ${w[w.length - 1].a} Jahre</span>
      </div>
    </div>`;
  }

  /* Saisonvorgaben des Klubs – vorher als Auftrag, nachher als Abrechnung. */
  const ZIEL_ICON = { titel:'pokal', runden:'medaille', playoffs:'ziel', platz:'schild',
                      punkte:'hoch', tore:'tor', siege:'haken', spiele:'uhr' };

  function zielKarte(ziele, opt){
    if (!ziele) return '';
    const o = opt || {};
    const abgerechnet = ziele.team.erfuellt !== undefined;

    const zeile = (z, rolle) => {
      const status = !abgerechnet ? '' : z.erfuellt ? 'erfuellt' : 'verfehlt';
      const fortschritt = z.erreicht !== undefined && z.wert
        ? Math.min(100, Math.round(z.erreicht / z.wert * 100)) : null;
      return `<div class="ziel-zeile ${status}">
        <span class="ziel-icon">${ikone(ZIEL_ICON[z.art] || 'puck', 20)}</span>
        <span class="ziel-text">
          <b>${esc(z.n)}</b>
          <span class="small">${rolle}${abgerechnet && z.erreicht !== undefined
            ? ' · erreicht: ' + z.erreicht : ' · ' + esc(z.d || '')}</span>
          ${fortschritt !== null ? `<span class="bar" style="height:5px;margin-top:5px">
             <i class="${fortschritt >= 100 ? 'hi' : ''}" style="width:${fortschritt}%"></i></span>` : ''}
        </span>
        ${abgerechnet ? `<span class="ziel-haken">${z.erfuellt ? '✓' : '✗'}</span>` : ''}
      </div>`;
    };

    /* Was dabei herauskommt - vorher als Einsatz, nachher als Abrechnung.
       Vorher stand hier nur, was verlangt wird, nicht was es einbringt. */
    const wert = (r, m) => `<b class="${r >= 0 ? 'plus' : 'minus'}">${r > 0 ? '+' : ''}${r}</b> Ansehen,
      <b class="${m >= 0 ? 'plus' : 'minus'}">${m > 0 ? '+' : ''}${m}</b> Moral`;

    const e = ziele.einsatz;
    const fuss = abgerechnet
      ? (ziele.bilanz
          ? `<div class="ziel-fuss ${ziele.bilanz.treffer === 2 ? 'gut'
               : ziele.bilanz.treffer === 0 ? 'schlecht' : ''}">
               ${ziele.bilanz.treffer === 2 ? 'Beide erfüllt'
                 : ziele.bilanz.treffer === 1 ? 'Eines erfüllt' : 'Beide verfehlt'} –
               ${wert(ziele.bilanz.ruf, ziele.bilanz.moral)}
             </div>` : '')
      : (e ? `<div class="ziel-fuss">
               <span>Beide: ${wert(e.beide.ruf, e.beide.moral)}</span>
               <span>Eines: ${wert(e.eines.ruf, e.eines.moral)}</span>
               <span>Keines: ${wert(e.keines.ruf, e.keines.moral)}</span>
             </div>` : '');

    return `<div class="zielkarte ${abgerechnet ? 'fertig' : 'offen'} ${o.klein ? 'klein' : ''}">
      <div class="ziel-kopf">${abgerechnet ? 'Saisonziele – Abrechnung' : 'Vorgaben für die kommende Saison'}</div>
      ${zeile(ziele.team, 'Mannschaft')}
      ${zeile(ziele.person, 'Persönlich')}
      ${fuss}
    </div>`;
  }

  /* Der eigene Jahrgang als laufende Rangliste.
     Sie beantwortet die Frage, die sich jeder Profi stellt:
     Wie stehe ich gegen die, die im selben Jahr angefangen haben? */
  function jahrgangTabelle(stand, isG, opt){
    if (!stand || !stand.length) return '';
    const o = opt || {};
    const delta = o.delta || null;
    const feld = isG ? 'Siege' : 'Punkte';
    const eigen = stand.find(x => x.eigen) || {};
    const bew = eigen.bewegung || 0;
    const pfeil = bew > 0 ? `<span class="jg-hoch">▲${bew}</span>`
                : bew < 0 ? `<span class="jg-runter">▼${-bew}</span>` : '';
    const zeigen = o.alle ? stand : kompakt(stand, eigen.platz);

    return `<div class="jahrgang ${o.gross ? 'gross' : ''}">
      <div class="jg-kopf">
        <span>Dein Jahrgang</span>
        <span class="jg-rang">Platz <b>${eigen.platz || '–'}</b><span class="small">/${stand.length}</span> ${pfeil}</span>
      </div>
      <div class="jg-liste">
        ${zeigen.map((x, i) => x === null
          ? '<div class="jg-luecke">···</div>'
          : `<div class="jg-zeile ${x.eigen ? 'eigen' : ''} ${x.aktiv ? '' : 'raus'}"
                  style="animation-delay:${0.05 * i}s">
               <span class="jg-platz ${x.platz <= 3 ? 'podest' : ''}">${x.platz}</span>
               <span class="jg-name">
                 <b>${esc(x.name)}</b>
                 <span class="jg-klub">${x.aktiv ? esc(x.klub) : 'Karriere beendet'}</span>
               </span>
               <span class="jg-pos">${x.pos}</span>
               ${x.titel ? `<span class="jg-titel" title="${x.titel} Meistertitel">🏆${x.titel}</span>` : ''}
               <span class="jg-wert" title="${x.roh !== undefined
                 ? x.roh + ' ' + feld + ' roh · gewichtet nach Ligastärke, Titeln und Auszeichnungen'
                 : ''}">${x.wert}</span>
             </div>`).join('')}
      </div>
      ${delta && (delta.vorn || delta.hinten) ? `<div class="jg-abstand">
        ${delta.vorn ? `<span class="jg-ab vorn" title="Rückstand auf ${esc(delta.vorn.name)}">
          ${ikone('hoch', 13)} <b>${delta.vorn.abstand}</b> auf ${esc(delta.vorn.name.split(' ').slice(-1)[0])}</span>` : ''}
        ${delta.hinten ? `<span class="jg-ab hinten" title="Vorsprung auf ${esc(delta.hinten.name)}">
          ${ikone('runter', 13)} <b>${delta.hinten.abstand}</b> vor ${esc(delta.hinten.name.split(' ').slice(-1)[0])}</span>` : ''}
      </div>` : ''}
      <div class="jg-fuss small">Wertung bis hierher: ${feld} gewichtet nach Ligastärke,
        plus Titel und Auszeichnungen</div>
    </div>`;
  }

  /* Lange Liste auf Spitze, eigene Umgebung und Schlusslicht eindampfen */
  function kompakt(stand, eigenPlatz){
    if (stand.length <= 6) return stand;
    const behalten = new Set([1, 2, 3, stand.length]);
    if (eigenPlatz) [eigenPlatz - 1, eigenPlatz, eigenPlatz + 1].forEach(p => behalten.add(p));
    const raus = [];
    let luecke = false;
    stand.forEach(x => {
      if (behalten.has(x.platz)){ raus.push(x); luecke = false; }
      else if (!luecke){ raus.push(null); luecke = true; }
    });
    return raus;
  }

  /* ----------------------------------------------------------------
     Der Verlauf des Jahrgangsrennens: eine Linie je Spieler, die Zeit
     nach rechts, der Platz nach unten. Selbst gezeichnetes SVG, damit
     es in allen drei Themen ueber currentColor mitfaerbt.
     ---------------------------------------------------------------- */
  function jahrgangVerlauf(res){
    const saisons = (res.seasons || []).filter(s => s.jahrgang && s.jahrgang.length);
    if (saisons.length < 3) return '';

    const namen = saisons[saisons.length - 1].jahrgang.map(x => x.name);
    const anzahl = namen.length;
    const B = 720, H = 300;
    const l = 34, r2 = 168, o = 22, u = 34;          // Raender
    const iw = B - l - r2, ih = H - o - u;

    const xv = i => l + (saisons.length === 1 ? iw / 2 : i * iw / (saisons.length - 1));
    const yv = platz => o + (anzahl === 1 ? ih / 2 : (platz - 1) * ih / (anzahl - 1));

    // Waagerechte Hilfslinien je Platz
    let gitter = '';
    for (let pz = 1; pz <= anzahl; pz++){
      gitter += `<line x1="${l}" y1="${yv(pz)}" x2="${l + iw}" y2="${yv(pz)}"
                   stroke="currentColor" stroke-opacity=".12" stroke-width="1"/>`;
      gitter += `<text x="${l - 9}" y="${yv(pz) + 4}" text-anchor="end"
                   font-size="11" fill="currentColor" fill-opacity=".45">${pz}</text>`;
    }

    // Jahreszahlen unten - nur jede zweite, sonst wird es voll
    let achse = '';
    saisons.forEach((sn, i) => {
      if (i % 2 && i !== saisons.length - 1) return;
      achse += `<text x="${xv(i)}" y="${H - 12}" text-anchor="middle"
                  font-size="11" fill="currentColor" fill-opacity=".45">${sn.age}</text>`;
    });

    const linien = namen.map(name => {
      const punkte = [];
      saisons.forEach((sn, i) => {
        const e = sn.jahrgang.find(x => x.name === name);
        if (e) punkte.push([xv(i), yv(e.platz)]);
      });
      if (punkte.length < 2) return { name, svg:'', eigen:false, endY:0 };
      const letzterEintrag = saisons[saisons.length - 1].jahrgang.find(x => x.name === name);
      const eigen = !!(letzterEintrag && letzterEintrag.eigen);
      const d = punkte.map((pt, i) => (i ? 'L' : 'M') + pt[0].toFixed(1) + ' ' + pt[1].toFixed(1)).join(' ');
      const endY = punkte[punkte.length - 1][1];
      const farbe = eigen ? 'var(--accent)' : 'currentColor';
      const svg = `
        <path d="${d}" fill="none" stroke="${farbe}"
              stroke-opacity="${eigen ? 1 : .34}" stroke-width="${eigen ? 3 : 1.6}"
              stroke-linejoin="round" stroke-linecap="round"/>
        <circle cx="${punkte[punkte.length - 1][0]}" cy="${endY}" r="${eigen ? 4.5 : 3}"
                fill="${farbe}" fill-opacity="${eigen ? 1 : .45}"/>`;
      return { name, svg, eigen, endY, platz: letzterEintrag ? letzterEintrag.platz : 0 };
    }).filter(x => x.svg);

    // Namen rechts, eigener hervorgehoben
    const marken = linien.map(x => `
      <text x="${l + iw + 12}" y="${x.endY + 4}" font-size="${x.eigen ? 12.5 : 11.5}"
            font-weight="${x.eigen ? 700 : 500}"
            fill="${x.eigen ? 'var(--accent)' : 'currentColor'}"
            fill-opacity="${x.eigen ? 1 : .55}">${esc(x.name)}</text>`).join('');

    return `<div class="jgverlauf">
      <div class="jgv-kopf">
        <span>${ikone('flamme', 15)} Verlauf des Jahrgangs</span>
        <span class="small">Platzierung je Saison</span>
      </div>
      <div class="jgv-bild">
        <svg viewBox="0 0 ${B} ${H}" width="100%" preserveAspectRatio="xMidYMid meet"
             role="img" aria-label="Platzierung im Jahrgang über die Jahre">
          ${gitter}${achse}
          ${linien.map(x => x.eigen ? '' : x.svg).join('')}
          ${linien.map(x => x.eigen ? x.svg : '').join('')}
          ${marken}
        </svg>
      </div>
      <div class="jgv-fuss small">Oben ist besser · deine Linie ist hervorgehoben</div>
    </div>`;
  }

  /* Playoffserien als kleiner Weg durch die Runden */
  function serienBaum(s){
    const serien = s.playoffSerien;
    if (!serien || !serien.length) return '';
    const eigene = s.poP !== undefined
      ? s.poP + ' Punkte in ' + s.poSpiele + ' Spielen'
      : (s.poWins !== undefined ? s.poWins + ' Siege, ' + ((s.poSv||0)*100).toFixed(1) + '% Fangquote' : '');
    return `<div class="serien">
      <div class="serien-kopf">
        <span>Playoffs</span>
        ${eigene ? '<span class="small">' + eigene + '</span>' : ''}
      </div>
      <div class="serien-liste">
        ${serien.map((x, i) => `
          <div class="serie ${x.gewonnen ? 'sieg' : 'aus'} ${x.knapp ? 'knapp' : ''}"
               style="animation-delay:${0.09 * i}s">
            <span class="se-runde">${x.runde}</span>
            <span class="se-gegner">${wappenBild(x.gegner, 20)}<span>${x.gegner}</span></span>
            <span class="se-stand">${x.eigene}<i>:</i>${x.fremde}</span>
          </div>`).join('')}
        ${s.title ? `<div class="serie titel"><span class="se-runde">Titel</span>
          <span class="se-gegner"><b>${s.title}</b></span>
          <span class="se-stand">🏆</span></div>` : ''}
      </div>
    </div>`;
  }

  /* Naechster Karrieremeilenstein als Jagdziel */
  const MEILEN_ZIELE = {
    skater: [
      { f:'p',  n:'Karrierepunkte', marken:[100,250,500,750,1000,1250,1500] },
      { f:'g',  n:'Karrieretore',   marken:[50,100,250,400,500,600] },
      { f:'gp', n:'Einsätze',       marken:[200,500,800,1000,1200] }
    ],
    goalie: [
      { f:'wins', n:'Siege',    marken:[50,100,200,300,400] },
      { f:'so',   n:'Shutouts', marken:[10,25,50,75,100] },
      { f:'gp',   n:'Einsätze', marken:[200,500,800,1000] }
    ]
  };

  function meilensteinJagd(st, isG){
    const lauf = st.lauf;
    if (!lauf || !lauf.gp) return '';
    const ziele = (isG ? MEILEN_ZIELE.goalie : MEILEN_ZIELE.skater).map(z => {
      const wert = lauf[z.f] || 0;
      const marke = z.marken.find(m => m > wert);
      if (!marke) return null;
      const vorher = z.marken.filter(m => m <= wert).pop() || 0;
      const anteil = Math.round((wert - vorher) / (marke - vorher) * 100);
      return { n: z.n, wert, marke, anteil, rest: marke - wert };
    }).filter(Boolean);
    if (!ziele.length) return '';
    // Das naechstliegende Ziel zuerst
    ziele.sort((a, b) => b.anteil - a.anteil);
    return `
      <div class="jagd">
        <span class="small" style="display:block;margin-bottom:8px">Nächste Marken</span>
        ${ziele.slice(0, 3).map(z => `
          <div class="jagd-zeile">
            <div class="row between" style="font-size:12px">
              <span>${z.n}</span>
              <span><b>${z.wert}</b> <span class="small">/ ${z.marke}</span></span>
            </div>
            <span class="bar" style="height:6px;margin-top:4px">
              <i class="${z.anteil > 85 ? 'hi' : ''}" style="width:${z.anteil}%"></i></span>
            ${z.anteil > 85 ? `<span class="jagd-nah">nur noch ${z.rest}</span>` : ''}
          </div>`).join('')}
      </div>`;
  }

  /* Auszeichnungen einer Saison als kleine Zeremonie mit echten Pokalen */
  function zeremonie(s){
    const stuecke = [];
    if (s.title) stuecke.push({ k: 'lg_' + s.lg, n: s.title, gross: true });
    (s.awards || []).forEach(a => {
      const A = PUCKERO_DATA.AWARDS[a];
      if (!A) return;
      const istNHL = s.lg === 'NHL';
      stuecke.push({ k: 'aw_' + a + '_' + s.lg, n: istNHL && A.nhl ? A.nhl : A.n });
    });
    if (s.nat && ['Gold','Silber','Bronze'].includes(s.nat.platz)){
      const stufe = s.nat.stufe || 'A';
      const key = stufe === 'A'
        ? (s.nat.art === 'olympia'
            ? (s.nat.platz === 'Gold' ? 'int_olympia' : s.nat.platz === 'Silber' ? 'int_olySilber' : 'int_olyBronze')
            : (s.nat.platz === 'Gold' ? 'int_wm' : s.nat.platz === 'Silber' ? 'int_wmSilber' : 'int_wmBronze'))
        : 'int_' + stufe.toLowerCase() + s.nat.platz;
      stuecke.push({ k: key, n: s.nat.kurz + '-' + s.nat.platz });
    }
    if (!stuecke.length) return '';
    return `<div class="zeremonie">
      ${stuecke.map((x, i) => `
        <span class="zer-stueck ${x.gross ? 'gross' : ''}" style="animation-delay:${0.08 * i + 0.1}s">
          ${pokalBild(x.k, x.gross ? 44 : 34)}
          <span>${x.n}</span>
        </span>`).join('')}
    </div>`;
  }

  /* ---------- Statistikkacheln ---------- */
  /* Zuordnung nach Beschriftung: so bekommen alle bestehenden Aufrufe
     von statBoxen ihr Icon, ohne dass die Aufrufstellen sich aendern. */
  const BOX_IKONE = {
    'Spiele':'kalender', 'Siege':'haken', 'Niederlagen':'kreuz',
    'Fangquote':'schild', 'Gegentorschnitt':'tor', 'Shutouts':'haken',
    'Paraden':'auge', 'Tore':'tor', 'Vorlagen':'gruppe', 'Punkte':'stern',
    'Punkte/Spiel':'hoch', 'Powerplay':'blitz', 'Unterzahl':'schild',
    'Siegtore':'krone', 'Schüsse':'ziel', 'Quote':'ziel', '+/-':'waage',
    'Strafminuten':'kreuz', 'Playoffspiele':'kalender', 'Playoffsiege':'pokal',
    'Playoffpunkte':'pokal', 'Serien gewonnen':'medaille', 'Verdienst':'stern'
  };

  function statBoxen(eintraege){
    return '<div class="statgrid stagger">' + eintraege.map(([n, v, farbe]) => {
      const ik = BOX_IKONE[n];
      return `<div class="statbox">
        ${ik ? '<span class="sb-ik">' + ikone(ik, 14) + '</span>' : ''}
        <b class="${farbe || ''}">${v}</b><span>${n}</span></div>`;
    }).join('') + '</div>';
  }

  /* ----------------------------------------------------------------
     Rueckschau: welche Entscheidungen die Laufbahn geprägt haben.
     Die Erzählstraenge sind das Gedaechtnis der Karriere - hier
     werden sie am Ende noch einmal sichtbar.
     ---------------------------------------------------------------- */
  const STRANG_INFO = {
    rivalitaet:  { n:'Die Rivalität',  ik:'flamme',
                   d:'Du hast den Vergleich mit deinem Jahrgang angenommen.' },
    trainerpakt: { n:'Der Trainer',    ik:'pfeife',
                   d:'Aus einem Konflikt wurde ein Vertrauensverhältnis.' },
    weggefaehrte:{ n:'Der Weggefährte',ik:'gruppe',
                   d:'Du hast dich für einen Mitspieler eingesetzt, als es zählte.' },
    draftpick:   { n:'Der Draftpick',  ik:'ziel',
                   d:'Der Verein, der deine Rechte hielt, hat dich gesehen.' },
    wechsler:    { n:'Der Wechsel',    ik:'flug',
                   d:'Du hast an der Frist den Verein verlassen.' },
    treue:       { n:'Die Treue',      ik:'schild',
                   d:'Du bist geblieben, als du hättest gehen können.' },
    wortfuehrer: { n:'Der Wortführer', ik:'fluestern',
                   d:'Du hast deinen Platz eingefordert – und damit auch die Verantwortung.' },
    ziehvater:   { n:'Der Ziehvater',  ik:'herz',
                   d:'Du hast deinen Nachfolger selbst ausgebildet.' }
  };

  function wendepunkte(res){
    const straenge = (res.freigeschaltet || []).filter(k => STRANG_INFO[k]);
    /* res.entscheidungen enthaelt nur Klubnamen - die tatsaechlichen
       Wahlen mit ihrem Ausgang stehen in res.verlauf. */
    const ents = res.verlauf || [];
    if (!straenge.length && !ents.length) return '';

    const gelungen = ents.filter(e => e.gelungen).length;
    const quote = ents.length ? Math.round(gelungen / ents.length * 100) : 0;
    const namen = res.strangNamen || {};

    /* Die unwahrscheinlichste geglueckte Wahl ist die beste Geschichte. */
    const mutigste = ents.filter(e => e.gelungen)
      .sort((a2, b2) => a2.chance - b2.chance)[0];
    const teuerste = ents.filter(e => !e.gelungen)
      .sort((a2, b2) => b2.chance - a2.chance)[0];

    return `<div class="wendepunkte">
      <div class="wp-kopf">
        <span>${ikone('blitz', 15)} Wendepunkte</span>
        <span class="wp-quote" title="Anteil der geglückten Entscheidungen">
          <b>${gelungen}</b><span class="small">/${ents.length} geglückt · ${quote}%</span>
        </span>
      </div>
      ${straenge.length ? `<div class="wp-kette">
        ${straenge.map((k, i) => {
          const info = STRANG_INFO[k];
          const wer = namen[k] || {};
          const detail = k === 'wechsler' || k === 'treue'
            ? (wer.klub || '')
            : (wer.mitspieler || wer.trainer || '');
          return `<div class="wp-glied" style="animation-delay:${0.07 * i}s">
            <span class="wp-ik">${ikone(info.ik, 18)}</span>
            <span class="wp-text">
              <b>${esc(info.n)}</b>
              <span class="small">${esc(info.d)}</span>
              ${detail ? `<span class="wp-wer">${esc(detail)}</span>` : ''}
            </span>
          </div>`;
        }).join('')}
      </div>` : '<p class="small" style="padding:12px 16px;margin:0">Diese Laufbahn verlief ohne die großen Wendepunkte – kein Zerwürfnis, kein erzwungener Wechsel, keine Rivalität, die über Jahre trug.</p>'}
      ${mutigste || teuerste ? `<div class="wp-marken">
        ${mutigste ? `<div class="wp-marke gut">
          <span class="wp-m-kopf">${ikone('flamme', 13)} Mutigste Entscheidung</span>
          <b>${esc(mutigste.wahl)}</b>
          <span class="small">${mutigste.chance}% Chance · mit ${mutigste.alter} Jahren</span>
        </div>` : ''}
        ${teuerste ? `<div class="wp-marke schlecht">
          <span class="wp-m-kopf">${ikone('kreuz', 13)} Bitterste Niederlage</span>
          <b>${esc(teuerste.wahl)}</b>
          <span class="small">${teuerste.chance}% Chance – und trotzdem daneben · mit ${teuerste.alter} Jahren</span>
        </div>` : ''}
      </div>` : ''}
      ${(res.ehemalige || []).length ? `<div class="wp-stationen">
        <span class="small">${ikone('transfer', 13)} Stationen: </span>
        ${res.ehemalige.map(k => `<span class="wp-klub">${esc(k)}</span>`).join('')}
      </div>` : ''}
    </div>`;
  }

  /* ---------- Nationalmannschaft ---------- */
  /* ------------------------------------------------------------------
     Der Sommer beim Verband

     Eine Zeile im Saisonbericht wurde dem nicht gerecht: das Turnier
     hat eine eigene Statistik, eine eigene Rolle und ein Spiel, an
     dem es sich entschieden hat. Die Karte zeigt genau das - und die
     Medaille ist gross genug, dass man sie nicht uebersieht.
     ------------------------------------------------------------------ */
  const MEDAILLE = { Gold:'\ud83e\udd47', Silber:'\ud83e\udd48', Bronze:'\ud83e\udd49' };

  function turnierKarte(t, natName, isG, kompakt){
    if (!t) return '';
    const med = MEDAILLE[t.platz] || '';
    /* Auf dem Telefon kostet die volle Karte gemessen 182 Pixel und
       zwingt den Saisonbericht ins Scrollen (837 statt 677). Dort
       steht deshalb ein Band, das sich auf Tippen oeffnet - die
       Angabe bleibt vollstaendig, nur nicht dauernd ausgebreitet. */
    if (kompakt){
      const kern = isG ? t.gp + ' Sp · ' + t.wins + ' S'
                       : t.gp + ' Sp · ' + t.p + ' Pkt';
      return `<details class="turnierband ${med ? 'medaille-' + t.platz.toLowerCase() : ''}">
        <summary>
          <span class="tb-med">${med || ikone('pfeife', 15)}</span>
          <span class="tb-wer"><b>${esc(t.kurz || t.n)}</b>
            <span>${esc(natName)} · ${esc(t.platz)}</span></span>
          <span class="tb-kern">${kern}</span>
          <span class="tb-pfeil">${ikone('runter', 14)}</span>
        </summary>
        <div class="tb-auf">${turnierKarte(t, natName, isG, false)}</div>
      </details>`;
    }
    const linie = isG
      ? [[t.gp, 'Spiele'], [t.wins, 'Siege'], [(t.sv || 0).toFixed(3).slice(1), 'Fangquote']]
      : [[t.gp, 'Spiele'], [t.g, 'Tore'], [t.a, 'Vorlagen'], [t.p, 'Punkte']];
    return `<div class="turnierkarte ${med ? 'medaille-' + t.platz.toLowerCase() : ''}">
      <div class="tk-kopf">
        <span class="tk-med">${med || ikone('pfeife', 18)}</span>
        <div class="tk-wer">
          <b>${esc(t.n)}</b>
          <span>${esc(natName)} \u00b7 ${esc(t.platz)}</span>
        </div>
        <span class="tk-rolle">${esc(t.rolle || '')}</span>
      </div>
      ${t.gegner ? `<div class="tk-spiel ${t.gewonnen ? 'gut' : 'schlecht'}">
        <span class="tk-erg">${esc(t.ergebnis)}</span>
        <span class="tk-geg">${t.flagge || ''} ${esc(t.runde)} gegen ${esc(t.gegner)}</span>
      </div>` : ''}
      <div class="tk-linie">
        ${linie.map(([w, n]) => `<div class="tk-wert">
          <b data-zahl="${w}">${w}</b><span>${n}</span></div>`).join('')}
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------------
     Die Wertung, die sich bewegt

     Eine Zahl, die still von 74 auf 77 springt, wird nicht
     wahrgenommen. Hier laeuft sie sichtbar hoch, die Differenz kommt
     als eigenes Zeichen dazu, und darunter stehen die drei Werte, die
     sich am meisten bewegt haben - damit die Verbesserung eine
     Ursache hat und nicht nur ein Ergebnis ist.
     ------------------------------------------------------------------ */
  function staerkeWandel(season, attrNamen){
    if (!season || season.ovrGewinn === undefined) return '';
    const d = season.ovrGewinn;
    const richtung = d > 0 ? 'auf' : d < 0 ? 'ab' : 'gleich';
    const bew = season.attrBewegung || [];

    /* Stillstand braucht keine grosse Buehne. Gemessen kostete das
       volle Feld 130 Pixel, um "Wertung unveraendert" zu sagen - und
       genau dieser Bericht war der einzige, der ueberlief. Wenn sich
       die Gesamtwertung nicht bewegt hat, ist die Nachricht ohnehin
       eine andere: welche Einzelwerte sich trotzdem verschoben haben. */
    if (d === 0){
      if (!bew.length) return '';
      return `<div class="staerke gleich schmal">
        <span class="st-klein">Wertung bleibt bei <b>${season.ovr}</b></span>
        <div class="st-attrs">${bew.map(x => `
          <span class="st-attr ${x.d > 0 ? 'gut' : 'schlecht'}">
            ${esc((attrNamen && attrNamen[x.k]) || x.k)} ${x.d > 0 ? '+' : ''}${x.d}
          </span>`).join('')}</div>
      </div>`;
    }
    return `<div class="staerke ${richtung}">
      <div class="st-zahlen">
        <span class="st-vorher">${season.ovrVorher}</span>
        <span class="st-pfeil">${ikone(d >= 0 ? 'hoch' : 'runter', 15)}</span>
        <b class="st-jetzt" data-zahl="${season.ovr}"
           data-von="${season.ovrVorher}">${season.ovrVorher}</b>
        ${d !== 0 ? `<span class="st-delta">${d > 0 ? '+' : ''}${d}</span>` : ''}
      </div>
      <div class="st-text">${d > 0 ? 'stärker geworden'
        : d < 0 ? 'schwächer geworden' : 'Wertung unverändert'}</div>
      ${bew.length ? `<div class="st-attrs">${bew.map(x => `
        <span class="st-attr ${x.d > 0 ? 'gut' : 'schlecht'}">
          ${esc((attrNamen && attrNamen[x.k]) || x.k)} ${x.d > 0 ? '+' : ''}${x.d}
        </span>`).join('')}</div>` : ''}
    </div>`;
  }

  /* ------------------------------------------------------------------
     Was diese Saison geformt hat

     Seit Moral und das Vertrauen des Trainers wirklich auf die
     Ausbeute wirken, hat der Spieler Stellschrauben - aber er sieht
     sie nicht. Eine Zahl, die etwas bewirkt, von der man nichts
     weiss, ist genauso gut keine.

     Deshalb hier die vier Kraefte nebeneinander, als Balken um eine
     Mittellinie: was nach rechts geht, hat getragen, was nach links
     geht, hat gekostet. Nur die, die tatsaechlich etwas ausgemacht
     haben - unter einem halben Prozent ist es Rauschen.
     ------------------------------------------------------------------ */
  const KRAFT = {
    moral:  { n:'Kopf',     ik:'flamme' },
    stand:  { n:'Vertrauen', ik:'schild' },
    form:   { n:'Form',     ik:'blitz' },
    umfeld: { n:'Umfeld',   ik:'gruppe' }
  };

  function einflussLeiste(e, vorschau){
    if (!e) return '';
    const posten = Object.keys(KRAFT)
      .map(k => ({ k, v: e[k] || 0 }))
      .filter(x => Math.abs(x.v) >= 0.5);
    if (!posten.length) return '';
    /* Gemeinsamer Massstab, damit die Balken untereinander vergleichbar
       sind und nicht jeder fuer sich normiert wird. */
    const gross = Math.max(4, ...posten.map(x => Math.abs(x.v)));
    /* ----------------------------------------------------------------
       Erst der Satz, dann die Zahlen

       Als Karte kostete die Aufstellung 82 Pixel und drueckte den
       Auftakt ins Scrollen - der Knopf "Saison beginnen" lag
       ausserhalb des Bildes. Vier Balken sind aber ohnehin nicht das,
       was jemand vor einer Saison wissen will; er will wissen, ob es
       fuer oder gegen ihn steht. Also steht das als Satz da, und wer
       die Zahlen sehen will, tippt darauf.
       ---------------------------------------------------------------- */
    const netto = posten.reduce((a, x) => a + x.v, 0);
    const beste = posten.slice().sort((a, b) => b.v - a.v)[0];
    const schlechteste = posten.slice().sort((a, b) => a.v - b.v)[0];
    const satz = (() => {
      const gut = beste.v > 0 ? KRAFT[beste.k].n : null;
      const schlecht = schlechteste.v < 0 ? KRAFT[schlechteste.k].n : null;
      if (gut && schlecht) return gut + ' trägt, ' + schlecht + ' kostet';
      if (gut)             return gut + ' trägt dich';
      return schlecht + ' zieht dich runter';
    })();

    const balken = `<div class="kr-liste">
      ${posten.map(x => {
        const anteil = Math.min(50, Math.abs(x.v) / gross * 50);
        return `<div class="kr-zeile ${x.v > 0 ? 'plus' : 'minus'}">
          <span class="kr-n">${ikone(KRAFT[x.k].ik, 12)} ${KRAFT[x.k].n}</span>
          <div class="kr-bahn">
            <i style="${x.v > 0 ? 'left:50%' : 'right:50%'};width:${anteil}%"></i>
          </div>
          <span class="kr-v">${x.v > 0 ? '+' : ''}${x.v.toFixed(1)}%</span>
        </div>`;
      }).join('')}
    </div>`;

    const klasse = netto > 0.6 ? 'plus' : netto < -0.6 ? 'minus' : 'neutral';
    return `<details class="kraefte ${klasse}">
      <summary>
        <span class="kr-ik">${ikone(netto >= 0 ? 'hoch' : 'runter', 14)}</span>
        <span class="kr-satz">${esc(satz)}</span>
        <span class="kr-netto">${netto > 0 ? '+' : ''}${netto.toFixed(1)}%</span>
        <span class="kr-pfeil">${ikone('runter', 13)}</span>
      </summary>
      ${balken}
    </details>`;
  }

  /* ------------------------------------------------------------------
     Was der Koerper mitgemacht hat

     Verschleiss und alte Verletzungen wirken jetzt wirklich - auf das
     Risiko, auf die koerperlichen Werte, auf das Karriereende. Also
     muessen sie auch dastehen. Aber nicht als weitere Karte: als eine
     Zeile, die nur erscheint, wenn es etwas zu sagen gibt.
     ------------------------------------------------------------------ */
  function koerperBand(verschleiss, altlasten){
    const v = verschleiss || 0;
    const alte = Object.entries(altlasten || {})
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1]);
    if (v < 2 && !alte.length) return '';
    const stufe = v >= 6 ? 'schwer' : v >= 3 ? 'mittel' : 'leicht';
    const satz = v >= 6 ? 'Der Körper hat viel mitgemacht'
               : v >= 3 ? 'Der Körper meldet sich'
               : 'Etwas Verschleiß';
    return `<div class="koerper ${stufe}">
      ${ikone('pflaster', 14)}
      <span class="ko-satz">${satz}</span>
      ${alte.length ? `<span class="ko-alt">${esc(alte[0][0])}
        <b>${alte[0][1]}×</b></span>` : ''}
    </div>`;
  }

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

  /* ---------- Eisfeld zur Positionswahl ----------
     Draufsicht auf ein halbes Feld: eigenes Tor unten, Angriffszone oben.
     Jede Position sitzt dort, wo sie auf dem Eis tatsaechlich steht. */
  const FELD_POS = {
    G:  { x:150, y:396, n:'Torhüter',        kurz:'G'  },
    D:  { x:150, y:300, n:'Verteidiger',     kurz:'D'  },
    LW: { x: 62, y:150, n:'Linker Flügel',   kurz:'LW' },
    C:  { x:150, y:176, n:'Center',          kurz:'C'  },
    RW: { x:238, y:150, n:'Rechter Flügel',  kurz:'RW' }
  };

  function eisfeld(gewaehlt){
    const marker = Object.entries(FELD_POS).map(([k, p]) => `
      <g class="feld-pos ${k === gewaehlt ? 'on' : ''}" data-feld-pos="${k}"
         transform="translate(${p.x},${p.y})" role="button" tabindex="0"
         aria-label="${p.n}">
        <circle class="fp-ring" r="30"/>
        <circle class="fp-punkt" r="21"/>
        <text class="fp-kurz" y="2">${p.kurz}</text>
        <text class="fp-name" y="42">${p.n}</text>
      </g>`).join('');

    return `
      <div class="eisfeld-halter">
        <svg class="eisfeld" viewBox="0 0 300 460" role="group" aria-label="Position wählen">
          <defs>
            <linearGradient id="eisflaeche" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0"  stop-color="#dff2ff" stop-opacity=".16"/>
              <stop offset="1"  stop-color="#9fd8ff" stop-opacity=".07"/>
            </linearGradient>
          </defs>

          <!-- Bande -->
          <rect x="10" y="10" width="280" height="440" rx="70" fill="url(#eisflaeche)"
                stroke="rgba(255,255,255,.35)" stroke-width="3"/>

          <!-- Blaue Linie und Mittellinie -->
          <line x1="10" y1="120" x2="290" y2="120" stroke="#4a9fe0" stroke-width="7" opacity=".65"/>
          <line x1="10" y1="248" x2="290" y2="248" stroke="#e2536a" stroke-width="7" opacity=".6"/>
          <line x1="10" y1="330" x2="290" y2="330" stroke="#4a9fe0" stroke-width="7" opacity=".65"/>

          <!-- Bullykreise -->
          <circle cx="150" cy="248" r="42" fill="none" stroke="#e2536a" stroke-width="3" opacity=".5"/>
          <circle cx="150" cy="248" r="4"  fill="#e2536a" opacity=".6"/>
          <circle cx="72"  cy="62"  r="30" fill="none" stroke="#e2536a" stroke-width="2.5" opacity=".4"/>
          <circle cx="228" cy="62"  r="30" fill="none" stroke="#e2536a" stroke-width="2.5" opacity=".4"/>
          <circle cx="72"  cy="392" r="30" fill="none" stroke="#e2536a" stroke-width="2.5" opacity=".4"/>
          <circle cx="228" cy="392" r="30" fill="none" stroke="#e2536a" stroke-width="2.5" opacity=".4"/>

          <!-- Tore -->
          <path d="M126 430 h48 v14 h-48 z" fill="rgba(226,83,106,.35)"
                stroke="#e2536a" stroke-width="2.5"/>
          <path d="M120 430 a30 30 0 0 1 60 0" fill="rgba(120,190,255,.18)"
                stroke="#4a9fe0" stroke-width="2.5"/>
          <path d="M126 16 h48 v14 h-48 z" fill="rgba(226,83,106,.18)"
                stroke="#e2536a" stroke-width="2" opacity=".6"/>

          ${marker}
        </svg>
      </div>`;
  }

  /* Formkurve: der mehrjaehrige Lauf als kleine Grafik */
  function formKurve(st){
    const werte = st.seasons.map(x => x.formzustand || 0);
    if (werte.length < 2) return '';
    const letzte = werte[werte.length - 1];
    const lage = letzte > 0.35 ? ['Höhenflug', 'hoch']
               : letzte < -0.35 ? ['Formkrise', 'tief'] : ['Stabil', 'mittel'];
    const breite = 100 / Math.max(1, werte.length - 1);
    const punkte = werte.map((v, i) =>
      (i * breite).toFixed(1) + ',' + (50 - v * 42).toFixed(1)).join(' ');
    return `
      <div class="formkarte">
        <div class="row between" style="margin-bottom:6px">
          <span class="small">Formverlauf</span>
          <b class="fk-lage ${lage[1]}">${lage[0]}</b>
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="fk-grafik">
          <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,.14)" stroke-width="1"/>
          <polyline points="${punkte}" fill="none" stroke="var(--accent)" stroke-width="3"
            vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>
          <circle cx="100" cy="${(50 - letzte * 42).toFixed(1)}" r="3.5" fill="var(--accent)"
            vector-effect="non-scaling-stroke"/>
        </svg>
      </div>`;
  }

  /* Vergleich mit dem Spieler aus demselben Jahrgang */
  function rivaleKarte(res, bisAlter){
    const rv = res.rivale;
    if (!rv) return '';
    const isG = res.isG;
    const meine = res.seasons.filter(x => !bisAlter || x.age <= bisAlter);
    const seine = rv.seasons.filter(x => !bisAlter || x.age <= bisAlter);
    const summe = (arr, f) => arr.reduce((a, x) => a + (f(x) || 0), 0);
    const meinWert = isG ? summe(meine, x => x.wins) : summe(meine, x => x.p);
    const seinWert = isG ? summe(seine, x => x.wins) : summe(seine, x => x.p);
    const gesamt = Math.max(1, meinWert + seinWert);
    const anteil = Math.round(meinWert / gesamt * 100);
    const nat = PUCKERO.nation(rv.nation) || { flag:'' };
    const label = isG ? 'Siege' : 'Punkte';
    return `
      <div class="rivale">
        <div class="rv-kopf">
          <span class="small">Dein Jahrgang</span>
          <b>${rv.name} ${nat.flag}</b>
        </div>
        <div class="rv-balken">
          <i class="ich" style="width:${anteil}%"><span>${meinWert}</span></i>
          <i class="er" style="width:${100 - anteil}%"><span>${seinWert}</span></i>
        </div>
        <div class="rv-fuss"><span>Du · ${label}</span><span>${rv.name.split(' ')[0]}</span></div>
      </div>`;
  }

  /* Was von der Laufbahn bleibt */
  function vermaechtnisKarte(res){
    const v = res.vermaechtnis || [];
    if (!v.length) return `<p class="small">Kein bleibendes Vermächtnis –
      dafür hätte es Titel oder eine längere Bindung an einen Klub gebraucht.</p>`;
    return '<div class="vermaechtnis stagger">' + v.map(x => `
      <div class="vm-stueck">
        <span class="vm-icon">${x.icon}</span>
        <span><b>${x.n}</b><span class="small">${x.d}</span></span>
      </div>`).join('') + '</div>';
  }

  /* ---------- Konfetti ---------- */
  /* ------------------------------------------------------------------
     Eine Rueckfrage vor dem, was sich nicht zurueckholen laesst

     Es gab keine - "Rest automatisch" spielte auf einen Fehlgriff hin
     die ganze restliche Laufbahn durch. Bewusst kein window.confirm:
     das sieht auf dem Telefon aus wie ein Systemfehler und sagt nicht,
     was genau passieren wird.
     ------------------------------------------------------------------ */
  function frage(opt, beiJa){
    const alt = document.querySelector('.frage-schicht');
    if (alt) alt.remove();
    const w = document.createElement('div');
    w.className = 'frage-schicht';
    w.innerHTML = `<div class="frage-blatt">
      <b class="fr-titel">${esc(opt.titel || 'Sicher?')}</b>
      <p class="fr-text">${esc(opt.text || '')}</p>
      <div class="fr-knoepfe">
        <button class="btn btn-ghost fr-nein">${esc(opt.nein || 'Abbrechen')}</button>
        <button class="btn btn-primary fr-ja">${esc(opt.ja || 'Ja')}</button>
      </div>
    </div>`;
    document.body.appendChild(w);
    requestAnimationFrame(() => w.classList.add('an'));
    const zu = () => { w.classList.remove('an'); setTimeout(() => w.remove(), 200); };
    w.querySelector('.fr-nein').onclick = zu;
    w.querySelector('.fr-ja').onclick = () => { zu(); beiJa && beiJa(); };
    /* Ein Tipp neben das Blatt bricht ab - nicht umgekehrt, damit
       niemand versehentlich zustimmt. */
    w.addEventListener('click', e => { if (e.target === w) zu(); });
  }

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
  function zahlHoch(el, ziel, dauer, von){
    const start0 = von || 0;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      el.textContent = ziel; return;
    }
    /* Nachkommastellen des Ziels beibehalten - sonst werden aus 12,5
       Minuten Eiszeit beim Hochzaehlen dreizehn. */
    const stellen = (String(ziel).split('.')[1] || '').length;
    const start = performance.now(), d = dauer || 900;
    const schritt = jetzt => {
      const t = Math.min(1, (jetzt - start) / d);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = (start0 + (ziel - start0) * eased).toFixed(stellen);
      if (t < 1) requestAnimationFrame(schritt);
      else el.textContent = ziel;
    };
    requestAnimationFrame(schritt);
  }
  function alleZahlenHoch(wurzel){
    (wurzel || document).querySelectorAll('[data-zahl]').forEach(el => {
      const z = parseFloat(el.dataset.zahl);
      /* Eine Wertung faengt nicht bei null an - von 0 auf 77 zu zaehlen
         sieht aus wie ein Aufbau, nicht wie eine Verbesserung. */
      const von = el.dataset.von !== undefined ? parseFloat(el.dataset.von) : 0;
      if (!isNaN(z)) zahlHoch(el, z, undefined, isNaN(von) ? 0 : von);
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

  /* Vitrine: Mannschaftstitel und persoenliche Auszeichnungen getrennt,
     mit Einblendung der Jahre und Vereine beim Ueberfahren. */
  function trophyList(res, nurArt){
    if (!res.trophies.length)
      return '<p class="small">Keine Titel – nicht jede Karriere endet in der Vitrine.</p>';

    const istPerson = t => String(t.k || '').indexOf('aw_') === 0
                        || t.k === 'int_wmMvp' || t.k === 'int_wmAllstar';
    const istNational = t => String(t.k || '').indexOf('int_') === 0
                        && t.k !== 'int_chl' && t.k !== 'int_spengler' && t.k !== 'int_winter';
    const liste = nurArt === 'person'   ? res.trophies.filter(istPerson)
                : nurArt === 'national' ? res.trophies.filter(t => istNational(t) && !istPerson(t))
                : nurArt === 'team'     ? res.trophies.filter(t => !istPerson(t) && !istNational(t))
                : res.trophies;
    if (!liste.length) return '<p class="small">Nichts in dieser Kategorie.</p>';

    return '<div class="vitrine stagger">' + liste.map(t => {
      const jahre = (t.jahre || []).map(j =>
        j.jahr + (j.klub ? ' · ' + j.klub + (j.nat ? ' (Nationalmannschaft)' : '') : ''))
        .join('\n');
      return `
        <div class="pokalkarte">
          <div class="pokalbild">${pokalBild(t.k || '', 46)}</div>
          <div class="pokalname">${t.n}</div>
          ${t.x > 1 ? '<span class="pokalzahl">' + t.x + '×</span>' : ''}
          ${jahre ? `<div class="pokalhover">
              <b>${t.n}</b>
              ${(t.jahre || []).map(j => `<span>${j.jahr}${j.klub ? ' · ' + j.klub : ''}</span>`).join('')}
            </div>` : ''}
        </div>`;
    }).join('') + '</div>';
  }

  /* Bilanz je Verein – Karten wie im Karriereabschluss */
  function klubKarten(res){
    if (!res.klubs || !res.klubs.length) return '';
    const isG = res.isG;
    const karten = res.klubs.map((k, i) => {
      const f = (typeof WAPPEN !== 'undefined') ? WAPPEN.farben(k.n) : ['#1a2540','#38d1ff'];
      const zeile = (n, v) => `<div class="kk-zelle"><span>${n}</span><b>${v}</b></div>`;
      return `
        <div class="klubkarte" style="--kf:${f[0]};--kf2:${f[1]}">
          <span class="kk-nr">${String(i + 1).padStart(2, '0')}</span>
          <div class="kk-schatten">${wappenBild(k.n, 150)}</div>
          <div class="kk-inhalt">
            <div class="kk-wappen">${wappenBild(k.n, 54)}</div>
            <div class="kk-name">${k.n}</div>
            <div class="kk-saisons">${k.saisons} ${k.saisons === 1 ? 'Saison' : 'Saisons'}
              · ${k.vonJahr}–${k.bisJahr + 1}</div>
            <div class="kk-raster">
              ${zeile('Einsätze', k.gp)}
              ${zeile(isG ? 'Siege' : 'Tore', isG ? k.wins : k.g)}
              ${zeile(isG ? 'Shutouts' : 'Vorlagen', isG ? k.so : k.a)}
            </div>
            ${k.titel ? `<div class="kk-titel">${'🏆'.repeat(Math.min(k.titel, 3))}
              ${k.titel > 3 ? '×' + k.titel : ''}</div>` : ''}
          </div>
        </div>`;
    }).join('');

    const t = res.totals;
    const gesamt = `
      <div class="klubkarte gesamt">
        <div class="kk-inhalt">
          <div class="kk-name" style="margin-top:8px">Gesamt</div>
          <div class="kk-saisons">${res.seasons.length} Saisons · ${res.klubs.length} Vereine</div>
          <div class="kk-raster">
            <div class="kk-zelle"><span>Einsätze</span><b>${t.gp}</b></div>
            <div class="kk-zelle"><span>${isG ? 'Siege' : 'Tore'}</span><b>${isG ? t.wins : t.g}</b></div>
            <div class="kk-zelle"><span>${isG ? 'Shutouts' : 'Vorlagen'}</span><b>${isG ? t.so : t.a}</b></div>
          </div>
        </div>
      </div>`;
    return '<div class="klubgitter stagger">' + karten + gesamt + '</div>';
  }

  /* Karrierebilanz nach Ligen */
  function ligaBilanz(res){
    if (!res.ligen || !res.ligen.length) return '';
    const isG = res.isG;
    const ligaTitel = res.trophies.filter(x => String(x.k).indexOf('lg_') === 0)
                                  .reduce((a, x) => a + x.x, 0);
    const kopf = isG
      ? '<tr><th>Liga</th><th>Saisons</th><th>Sp</th><th>S</th><th>Fq%</th><th>SO</th><th>Titel</th><th>Beste GES</th></tr>'
      : '<tr><th>Liga</th><th>Saisons</th><th>Sp</th><th>T</th><th>V</th><th>Pkt</th><th>P/Sp</th><th>Titel</th><th>Beste GES</th></tr>';
    const zeilen = res.ligen.map(l => isG
      ? `<tr><td><span class="lgtag lg-${l.k}">${l.n}</span></td><td>${l.saisons}</td>
           <td>${l.gp}</td><td>${l.wins}</td><td>${((l.sv||0)*100).toFixed(1)}</td>
           <td>${l.so}</td><td>${l.titel || '–'}</td><td>${l.bestOvr}</td></tr>`
      : `<tr><td><span class="lgtag lg-${l.k}">${l.n}</span></td><td>${l.saisons}</td>
           <td>${l.gp}</td><td>${l.g}</td><td>${l.a}</td><td><b>${l.p}</b></td>
           <td>${l.ppg}</td><td>${l.titel || '–'}</td><td>${l.bestOvr}</td></tr>`).join('');
    const t = res.totals;
    const summe = isG
      ? `<tr class="total"><td>Gesamt</td><td>${res.seasons.length}</td><td>${t.gp}</td>
         <td>${t.wins}</td><td>${(t.sv*100).toFixed(1)}</td><td>${t.so}</td>
         <td>${ligaTitel}</td><td>${res.peak}</td></tr>`
      : `<tr class="total"><td>Gesamt</td><td>${res.seasons.length}</td><td>${t.gp}</td>
         <td>${t.g}</td><td>${t.a}</td><td>${t.p}</td><td>${t.ppg100}</td>
         <td>${ligaTitel}</td><td>${res.peak}</td></tr>`;
    return `<div class="table-scroll"><table class="stats ligatab">
      <thead>${kopf}</thead><tbody>${zeilen}${summe}</tbody></table></div>`;
  }

  /* Nationalmannschaft als eigenes Feld */
  function natKarte(res){
    const b = res.laenderBilanz || {};
    const nat = PUCKERO.nation(res.player.nation);
    const isG = res.isG;
    if (!b.turniere) return `
      <div class="natkarte leer">
        <div class="nk-kopf"><span class="nk-flagge">${nat.flag}</span>
          <div><span class="small">Nationalteam</span><b>${nat.n}</b></div></div>
        <p class="small mb0">Nie nominiert. Für eine Einladung hätte es konstant
          bessere Leistungen gebraucht.</p>
      </div>`;
    const stufen = {};
    (res.laender || []).forEach(t => stufen[t.stufe || 'A'] = (stufen[t.stufe || 'A'] || 0) + 1);
    return `
      <div class="natkarte">
        <div class="nk-kopf"><span class="nk-flagge">${nat.flag}</span>
          <div><span class="small">Nationalteam</span><b>${nat.n}</b></div>
          ${res.natDebuet ? `<span class="pill">Debüt ${res.natDebuet.jahr}</span>` : ''}
        </div>
        <div class="nk-raster">
          <div class="kk-zelle"><span>Einsätze</span><b>${b.gp}</b></div>
          <div class="kk-zelle"><span>${isG ? 'Siege' : 'Tore'}</span><b>${isG ? b.wins : b.g}</b></div>
          <div class="kk-zelle"><span>${isG ? 'Shutouts' : 'Vorlagen'}</span><b>${isG ? b.so : b.a}</b></div>
        </div>
        <div class="nk-stufen">
          ${Object.entries(stufen).map(([k, v]) =>
            `<span class="pill">${k === 'A' ? 'A-Team' : k} · ${v}</span>`).join('')}
          <span class="pill gold">${b.medaillen} ${b.medaillen === 1 ? 'Medaille' : 'Medaillen'}</span>
        </div>
      </div>`;
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
      + `Deine Karriere: Eiszeit`;
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
  /* Ein Klick = ein Bild. Ohne diese Sperre erzeugt jede gedrueckt gehaltene
     Eingabetaste und jeder Doppelklick einen weiteren Download. */
  let karteLaeuft = false;

  function karriereKarte(res, knopf){
    if (karteLaeuft) return;
    karteLaeuft = true;
    if (knopf){ knopf.disabled = true; knopf.classList.add('laedt'); }
    const freigeben = () => {
      // kurze Nachlaufzeit, damit Tastenwiederholung nicht sofort neu ausloest
      setTimeout(() => {
        karteLaeuft = false;
        if (knopf){ knopf.disabled = false; knopf.classList.remove('laedt'); }
      }, 900);
    };
    try { karteZeichnen(res, freigeben); }
    catch (e){ freigeben(); toast('Karte konnte nicht erzeugt werden'); }
  }

  function karteZeichnen(res, fertig){
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
    /* Unten sind 175 px fuer Wendepunkt und Seed reserviert, dazwischen
       braucht die Vitrine 92 px. Der Zeilenabstand ergibt sich aus dem,
       was uebrig bleibt - so passt die Karte bei jeder Zeilenzahl. */
    const kopfY = 700;
    const frei = H - 175 - 92 - kopfY - 30;
    const schritt = Math.max(38, Math.min(64, Math.floor(frei / Math.max(1, zeilen.length))));

    let y = kopfY;
    zeilen.forEach(([k, v]) => {
      x.textAlign = 'left';
      x.font = '600 34px Inter, Segoe UI, sans-serif'; x.fillStyle = '#8ea1c4';
      x.fillText(k, 140, y);
      x.textAlign = 'right';
      x.font = '800 34px Inter, Segoe UI, sans-serif'; x.fillStyle = '#e8eefc';
      x.fillText(String(v), W - 140, y);
      x.strokeStyle = 'rgba(255,255,255,.08)'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(140, y + 20); x.lineTo(W - 140, y + 20); x.stroke();
      y += schritt;
    });

    // Vitrine
    x.textAlign = 'center';
    const titel = res.trophies.reduce((s, q) => s + q.x, 0);
    mittig(titel + ' Trophäen in ' + res.seasons.length + ' Saisons', y + 46, 30, '#ffc861', '700');
    const top = res.trophies.slice(0, 3).map(q => q.n + (q.x > 1 ? ' ×' + q.x : '')).join('  ·  ');
    if (top) mittig(top, y + 92, 24, '#8ea1c4', '600');

    /* Ein Wendepunkt macht aus einer Zahlenkarte eine Geschichte.
       Gewaehlt wird die unwahrscheinlichste Wahl, die aufgegangen ist.
       Der Block wird von der Unterkante her gesetzt, damit er nie mit
       der Seed-Zeile kollidiert oder aus der Karte laeuft. */
    const unterkanteVitrine = y + (top ? 92 : 46);
    const wahlen = (res.verlauf || []).filter(v => v.gelungen);
    const platzDa = unterkanteVitrine + 40 < H - 170;

    if (wahlen.length && platzDa){
      const beste = wahlen.slice().sort((a2, b2) => a2.chance - b2.chance)[0];

      x.strokeStyle = 'rgba(255,255,255,.10)'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(200, H - 168); x.lineTo(W - 200, H - 168); x.stroke();

      mittig('WENDEPUNKT', H - 132, 19, '#64769a', '700');

      // Eine Zeile, notfalls gekuerzt - zwei passen hier nicht mehr hin
      let wahl = String(beste.wahl);
      if (wahl.length > 36) wahl = wahl.slice(0, 34).trimEnd() + '…';
      mittig(wahl, H - 92, 32, '#e8eefc', '750');

      mittig(beste.chance + '% Chance · mit ' + beste.alter + ' Jahren',
             H - 56, 22, '#8ea1c4', '600');
    }

    mittig('Seed ' + p.seed, H - 22, 20, '#64769a', '600');

    c.toBlob(b => {
      if (!b){ fertig(); return toast('Karte konnte nicht erzeugt werden'); }
      const url = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'eiszeit-' + String(p.name).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast('Karte gespeichert');
      fertig();
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

  /* ------------------------------------------------------------------
     Das Leben daneben

     Der Strang laeuft jede Saison mit, egal ob ein Ereignis dazu
     kommt - deshalb braucht er eine feste Anzeige und nicht nur
     gelegentliche Meldungen. Drei Zahlen und ein Satz: wo du zu Hause
     bist, wie fest du stehst, wie sehr es dich zurueckzieht.
     ------------------------------------------------------------------ */
  const FAMILIE_TEXT = {
    allein:  { n:'Allein',        ik:'schlaeger' },
    partner: { n:'Zu zweit',      ik:'herz' },
    kinder:  { n:'Familie',       ik:'herz' }
  };

  function lebenKarte(L, opt){
    if (!L) return '';
    const o = opt || {};
    const fam = FAMILIE_TEXT[L.familie] || FAMILIE_TEXT.allein;
    const famText = L.familie === 'kinder'
      ? (L.kinder === 1 ? 'Familie, ein Kind' : 'Familie, ' + L.kinder + ' Kinder')
      : fam.n;

    /* Ein Satz statt drei Zahlen - die Zahlen stehen darunter. */
    const satz = L.heimweh >= 65 ? 'Du willst nach Hause.'
               : L.heimweh >= 40 ? 'Die Heimat zieht.'
               : L.daheim        ? 'Du spielst da, wo du herkommst.'
               : L.wurzeln >= 70 ? 'Hier bist du zu Hause geworden.'
               : L.wurzeln >= 40 ? 'Du hast dich eingelebt.'
               : 'Noch alles neu.';

    const messwert = (n, wert, farbe) => `
      <div class="lb-wert">
        <span class="lb-n">${n}</span>
        <div class="lb-leiste"><i class="${farbe}" style="width:${clampP(wert)}%"></i></div>
      </div>`;

    return `<div class="lebenkarte${o.gross ? ' gross' : ''}">
      <div class="lb-kopf">
        <span class="lb-satz">${satz}</span>
        <span class="lb-fam">${ikone(fam.ik, 13)} ${esc(famText)}</span>
      </div>
      <div class="lb-werte">
        ${messwert('Verwurzelt', L.wurzeln, 'ruhig')}
        ${messwert('Heimweh', L.heimweh, 'warm')}
      </div>
      ${L.partnerMit === false ? `<div class="lb-hinweis">
        ${ikone('flug', 12)} Die Familie lebt nicht dort, wo du spielst.</div>` : ''}
      ${o.vermoegen != null ? `<div class="lb-geld">
        ${ikone('stern', 12)} <b>${o.vermoegen.toFixed(1)} Mio</b> zurückgelegt</div>` : ''}
    </div>`;
  }
  const clampP = v => Math.max(0, Math.min(100, Math.round(v || 0)));

  return {
    lebenKarte, turnierKarte, staerkeWandel, einflussLeiste, koerperBand, wertKlasse, frage,
 header, footer, mount, themaSetzen, themaLesen, attrRows, ovrBadge, seasonCard, statsTable,
           wappenBild, pokalBild,
           trophyList, klubKarten, natKarte, ligaBilanz, shareText, rankLeiste, karriereKarte,
           statBoxen, natTabelle, rivaleKarte, vermaechtnisKarte, zeremonie, formKurve,
           eisfeld, serienBaum, meilensteinJagd, jahrgangTabelle, zielKarte,
           bilanzStreifen, rollenKarte, rollenWeg, laufbahnBogen,
           ikone, kennzahl, IKONEN, wendepunkte, jahrgangVerlauf, STRANG_INFO,
           konfetti, zahlHoch, alleZahlenHoch, toast, copy };
})();

/* Wie PUCKERO und EREIGNISSE auch: als einziges Modul war UI nur ueber
   die Modulkonstante erreichbar und damit von aussen nicht pruefbar. */
if (typeof window !== 'undefined') window.UI = UI;

document.addEventListener('DOMContentLoaded', () => UI.mount(document.body.dataset.nav || ''));
