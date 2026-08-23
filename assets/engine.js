/* ==========================================================
   Puckero – Karriere-Engine
   Deterministisch: gleicher Seed + gleiche Entscheidungen = gleiche Karriere
   ========================================================== */

const PUCKERO = (() => {
  const D = PUCKERO_DATA;

  /* ---------------- Zufall ---------------- */
  function hashSeed(str){
    let h = 2166136261 >>> 0;
    for (let i = 0; i < String(str).length; i++){
      h ^= String(str).charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function rng(seed){
    let a = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed);
    return function(){
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const ri = (r, min, max) => Math.floor(r() * (max - min + 1)) + min;
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const round1 = v => Math.round(v * 10) / 10;

  function shuffle(r, arr){
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--){
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---------------- Lookups ---------------- */
  const pos    = k => D.POSITIONS.find(p => p.k === k);
  const nation = k => D.NATIONS.find(n => n.k === k);
  const league = k => D.LEAGUES.find(l => l.k === k);
  const clubsOf = k => D.CLUBS.filter(c => c.lg === k);

  const _lgAvg = {};
  function lgAvgStr(k){
    if (_lgAvg[k] === undefined){
      const c = clubsOf(k);
      _lgAvg[k] = c.reduce((s, x) => s + x.str, 0) / (c.length || 1);
    }
    return _lgAvg[k];
  }
  const attrsOf = posKey => D.ATTRS[pos(posKey).group];

  /* Mindestwertung, ab der eine Liga einen Vertrag anbietet */
  const LG_MIN = { NHL:86, KHL:79, SHL:77, NL:75, LII:74, DEL:72, CZE:71, AHL:60, JUN:0 };
  /* Unter diesem Wert findet niemand mehr einen Profivertrag */
  const VERTRAG_MIN = 56;
  /* Heimatliga je Nation */
  const HOME_LG = { CAN:'AHL', USA:'AHL', SWE:'SHL', FIN:'LII', RUS:'KHL', CZE:'CZE',
                    SVK:'CZE', GER:'DEL', SUI:'NL', AUT:'DEL', LAT:'DEL', DEN:'DEL', NOR:'SHL' };

  /* ---------------- Spieler anlegen ---------------- */
  function newPlayer(opt){
    const r = rng(opt.seed);
    const nat = nation(opt.nation);
    const attrs = {};
    attrsOf(opt.pos).forEach(a => { attrs[a.k] = ri(r, 42, 56); });
    Object.entries(nat.bonus || {}).forEach(([k, v]) => {
      if (attrs[k] !== undefined) attrs[k] = clamp(attrs[k] + v, 1, 99);
    });
    return {
      name: opt.name, num: opt.num, nation: opt.nation, pos: opt.pos,
      mode: opt.mode || 'klassisch',
      seed: opt.seed,
      attrs,
      traits: { robust:0, langlebig:0, jung:0, playoff:0 },
      eigenschaften: [],
      wirkung: { moralStart:0, rufStart:0, training:0, ereignis:0,
                 heimbonus:0, natBonus:0, lernkurve:0 },
      picks: [],
      skips: 0,
      group: pos(opt.pos).group
    };
  }

  /* ---------------- Draft ---------------- */
  const DRAFT_ROUNDS = 8;
  /* So oft darf im klassischen Modus eine Runde neu gemischt werden */
  const MAX_SKIPS = 3;

  /* ---------------- Charakterdraft ----------------
     Fuenf Fragen, jede Antwort verschiebt Werte und gibt Eigenschaften. */
  function draftFrage(player, runde){
    if (typeof DRAFT === 'undefined') return null;
    const alle = DRAFT.fragen(pos(player.pos).group);
    return alle[runde] || null;
  }

  function wirkungNeu(player){
    const w = { moralStart:0, rufStart:0, training:0, ereignis:0,
                heimbonus:0, natBonus:0, lernkurve:0 };
    player.traits = { robust:0, langlebig:0, jung:0, playoff:0 };
    if (typeof DRAFT === 'undefined'){ player.wirkung = w; return player; }
    (player.eigenschaften || []).forEach(id => {
      const e = DRAFT.EIGENSCHAFTEN[id];
      if (!e) return;
      Object.entries(e.w).forEach(([k, v]) => {
        if (player.traits[k] !== undefined) player.traits[k] += v;
        else w[k] = (w[k] || 0) + v;
      });
    });
    player.wirkung = w;
    return player;
  }

  function applyKarte(player, karte){
    Object.entries(karte.b || {}).forEach(([k, v]) => {
      if (player.attrs[k] === undefined) return;   // Wert gilt nicht fuer diese Position
      player.attrs[k] = clamp(player.attrs[k] + v, 1, 99);
    });
    player.eigenschaften = player.eigenschaften || [];
    (karte.eig || []).forEach(id => {
      if (!player.eigenschaften.includes(id)) player.eigenschaften.push(id);
    });
    wirkungNeu(player);
    player.picks.push({ id: karte.id, n: karte.n, tag: karte.tag, eig: karte.eig || [] });
    return player;
  }

  function karteWert(player, karte){
    const w = pos(player.pos).w;
    let s = 0;
    Object.entries(karte.b || {}).forEach(([k, v]) => {
      if (w[k] !== undefined) s += v * w[k];
    });
    return s;
  }

  /* Automatischer Charakterdraft fuer Schnellkarriere und Markt */
  function autoDraft(player, seedSuffix){
    if (typeof DRAFT === 'undefined') return player;
    const r = rng(player.seed + ':autochar' + (seedSuffix || ''));
    for (let i = 0; i < DRAFT.RUNDEN; i++){
      const f = draftFrage(player, i);
      if (!f) break;
      const bewertet = f.karten.map(k => ({ k, s: karteWert(player, k) + r() * 26 }));
      bewertet.sort((a, b) => b.s - a.s);
      applyKarte(player, bewertet[0].k);
    }
    return player;
  }

  /* ---------------- Gesamtwertung ---------------- */
  function overall(player, attrs){
    const a = attrs || player.attrs;
    const w = pos(player.pos).w;
    let sum = 0, wsum = 0;
    Object.entries(w).forEach(([k, weight]) => {
      if (a[k] === undefined) return;
      sum += a[k] * weight; wsum += weight;
    });
    return Math.round(clamp(sum / wsum, 1, 99));
  }

  /* ---------------- Alterskurve ---------------- */
  function formFactor(age, traits, lernkurve, scheitel){
    const t = traits || {};
    const lk = (lernkurve || 0) * 0.004;
    // Jeder Spieler hat seinen eigenen Scheitelpunkt – manche bluehen mit 24 auf,
    // andere erst mit 31. Das macht Laufbahnen spuerbar unterschiedlich.
    const peak = (scheitel || 27) - (t.jung || 0) * 0.06 + (t.langlebig || 0) * 0.05;
    const early = 1 - Math.pow(clamp(peak - age, 0, 20) / 11, 2) * 0.55
                    + (t.jung || 0) * 0.004 * clamp(peak - age, 0, 20);
    const late  = 1 - Math.pow(clamp(age - peak, 0, 25) / 11, 1.9) * 0.62
                    + (t.langlebig || 0) * 0.004 * clamp(age - peak, 0, 25);
    const basis = age <= peak ? early + lk * clamp(peak - age, 0, 12) : late;
    return clamp(basis, 0.26, 1.02);
  }

  function devAttrs(base, form){
    const out = {};
    Object.entries(base).forEach(([k, v]) => {
      out[k] = clamp(Math.round(v * form * 1.28), 1, 99);
    });
    return out;
  }

  /* ---------------- Sommertraining ----------------
     Nach jeder Saison darf der Spieler an einem Bereich arbeiten.
     Junge Spieler machen grosse Spruenge, aeltere halten nur noch. */
  function trainingsGewinn(age){
    if (age <= 22) return 6;   // junge Spieler entwickeln sich sprunghaft
    if (age <= 27) return 4;
    if (age <= 31) return 2;
    return 1;                  // spaete Jahre sind reines Halten
  }

  function trainingsOptionen(player, age, seed, zusatz){
    const r = rng(seed);
    const w = pos(player.pos).w;
    const gewinn = trainingsGewinn(age) + (zusatz || 0);
    // Angeboten wird, wo Training am meisten bringt: Positionsgewicht mal
    // verbleibendem Spielraum. Bereits ausgereizte Werte fallen heraus.
    const liste = attrsOf(player.pos)
      .filter(a => player.attrs[a.k] < 95)
      .map(a => ({ a, gewicht: (w[a.k] || 0.8) * (99 - player.attrs[a.k]) * (0.75 + r() * 0.5) }))
      .sort((x, y) => y.gewicht - x.gewicht);

    const optionen = liste.slice(0, 2).map(x => ({
      art: 'attr', k: x.a.k, n: x.a.n,
      titel: x.a.n + ' schulen',
      text: '+' + gewinn + ' auf ' + x.a.n + '. Wirkt sofort und dauerhaft.',
      wert: gewinn
    }));

    // Dritte Karte: Koerper oder Kopf statt Technik
    const extra = shuffle(r, [
      { art:'robust', titel:'Athletiktraining',
        text:'Weniger Verletzungen und kürzere Ausfälle.', wert: 5 },
      { art:'langlebig', titel:'Regeneration',
        text:'Der Körper hält länger durch – die Karriere endet später.', wert: 5 },
      { art:'playoff', titel:'Mentaltraining',
        text:'Mehr Nervenstärke in der K.-o.-Phase.', wert: 6 }
    ])[0];
    optionen.push(extra);
    return optionen;
  }

  function trainingAnwenden(player, option){
    if (option.art === 'attr'){
      player.attrs[option.k] = clamp(player.attrs[option.k] + option.wert, 1, 99);
    } else {
      player.traits[option.art] = (player.traits[option.art] || 0) + option.wert;
    }
    return player;
  }

  /* Wahrscheinlichkeit, nach dieser Saison aufzuhoeren.
     Ein Ausnahmespieler mit 88 hoert mit 31 nicht auf – wer dagegen
     das Niveau nicht mehr haelt, verschwindet auch mit 29 leise. */
  function ruecktrittsChance(age, ovr, langlebig, verschleiss){
    const grenze = 32 + (langlebig || 0) * 0.14 - (verschleiss || 0) * 0.5;
    if (age < grenze) return 0;
    let c = 0.06 + (age - grenze) * 0.15;
    if (ovr >= 88)      c *= 0.25;   // Jahrhundertspieler machen weiter
    else if (ovr >= 82) c *= 0.45;
    else if (ovr >= 74) c *= 0.85;
    else if (ovr < 66)  c *= 2.0;    // wer nicht mehr mithaelt, hoert auf
    return clamp(c, 0, 0.9);
  }

  /* Marktwert in Millionen Euro – waechst ueberproportional mit der Wertung */
  function marktwert(ovr, age){
    const basis = Math.pow(Math.max(0, ovr - 52) / 10, 2.5) * 0.9;
    const alter = age <= 21 ? 1.15 : age <= 27 ? 1.0 : age <= 31 ? 0.72 : 0.38;
    return Math.round(basis * alter * 10) / 10;
  }

  /* ---------------- Meilensteine ---------------- */
  const MEILEN = {
    gp:   [200, 500, 800, 1000],
    p:    [100, 250, 500, 750, 1000],
    g:    [50, 100, 250, 500],
    wins: [50, 100, 200, 300],
    so:   [10, 25, 50]
  };
  const MEILEN_TEXT = {
    gp: 'Spiel', p: 'Karrierepunkt', g: 'Karrieretor', wins: 'Sieg', so: 'Shutout'
  };

  /* ==========================================================
     Karriere als Schrittfolge – erlaubt Saison-fuer-Saison-Spiel
     ========================================================== */
  /* Verhindert, dass die Laufbahn eines Rivalen selbst wieder einen
     Rivalen erzeugt – das waere eine Endlosrekursion. */
  let rivaleWirdErzeugt = false;

  function createCareer(player){
    const r = rng(player.seed + ':career');
    const P = pos(player.pos);
    const nat = nation(player.nation);
    const isG = P.group === 'goalie';
    const homeLg = HOME_LG[player.nation] || 'AHL';

    const st = {
      age: 18,
      year: 2026,
      club: null,             // wird durch die Nachwuchswahl gesetzt
      ruf: clamp(40 + ((player.wirkung || {}).rufStart || 0), 20, 70),
      peak: 0,
      peakAttrs: null,
      seasons: [],
      trophies: {},
      lauf: { gp:0, g:0, a:0, p:0, wins:0, so:0, pim:0, gehalt:0 },
      entscheidungen: [],
      verlauf: [],             // jede getroffene Wahl mit ihrem Ausgang
      hatteSternstunde: false,
      moral: clamp(60 + ((player.wirkung || {}).moralStart || 0), 15, 95),
      ereignis: null,         // offenes Karriereereignis
      ereignisGeprueft: false,
      erlebt: [],             // bereits gezeigte Ereignisse
      formBonus: 0,           // Nachwirkung einer Entscheidung
      risikoBonus: 0,
      jugend: null,           // Angebote aus dem Nachwuchs
      tabelle: [],            // Ligatabelle der laufenden Saison
      kapitaenSeit: null,     // Klub, bei dem das C getragen wird
      klubJahre: 0,           // Saisons beim aktuellen Klub
      laender: [],            // Turniere der Nationalmannschaft
      natDebuet: null,        // erste Nominierung
      entryDraft: null,       // Ergebnis des Entry Drafts
      rolle: null,            // gewaehlte Rolle im aktuellen Vertrag
      rollenwahl: null,       // offene Rollenfrage
      kapitaensfrage: null,   // offenes Angebot fuer das C
      kapitaenGefragt: false,
      rivale: null,           // staerkster Spieler desselben Jahrgangs
      jahrgang: [],           // die ganze Draftklasse, einmal vorausberechnet
      jahrgangStand: null,    // Rangliste des laufenden Jahres
      jahrgangEreignis: null, // Ueberholvorgang der laufenden Saison
      jahrgangDelta: null,    // Abstand nach vorn und hinten
      ehemalige: [],          // frueher Klubs - Stoff fuer spaetere Wiedersehen
      wechselfrist: null,     // offene Entscheidung an der Transferfrist
      wechselGeprueft: false,
      ziele: null,            // Vorgaben des Klubs fuer die laufende Saison
      zielBilanz: { erfuellt: 0, verfehlt: 0 },
      trainer: null,          // Name des aktuellen Trainers
      mitspieler: null,       // engster Weggefaehrte im Team
      freigeschaltet: [],     // durch Entscheidungen geoeffnete Stränge
      strangNamen: {},        // wer zu welchem Strang gehoert (Kontinuitaet)
      formzustand: 0,         // mehrjaehriger Lauf: -1 Krise ... +1 Hoehenflug
      scheitel: 0,            // individueller Hoehepunkt des Koerpers
      ruecktrittsfrage: null, // offene Frage: weitermachen oder aufhoeren?
      zusatzjahre: 0,         // Jahre, die bewusst drangehaengt wurden
      laenderBilanz: { gp:0, g:0, a:0, p:0, wins:0, so:0, turniere:0, medaillen:0 },
      vertragJahre: 2,        // Restlaufzeit des aktuellen Vertrags
      fertig: false,
      grund: null,
      angebote: null,
      angebotsGrund: null,
      training: null
    };

    // Individueller Scheitelpunkt: Torhueter reifen spaeter als Stuermer
    st.scheitel = clamp((isG ? 29 : 27) + ri(r, -3, 4) + (r() - 0.5) * 1.5, 23, 33);
    st.jugend = null;   // wird direkt nach der Initialisierung gefuellt

    // Nur noch eine aeussere Grenze – wann wirklich Schluss ist,
    // entscheidet sich Jahr fuer Jahr an der Leistung.
    const maxAge = clamp(38 + Math.round((player.traits.langlebig || 0) * 0.12)
                            - Math.round((player.traits.jung || 0) * 0.14)
                            + ri(r, -1, 3), 33, 43);

    /* 'wer' benennt, mit wem der Titel geholt wurde. Ohne Angabe ist es
       der aktuelle Verein - Turniertitel gehoeren aber der Nationalmannschaft. */
    const addTrophy = (key, label, ptsVal, icon, wer) => {
      if (!st.trophies[key])
        st.trophies[key] = { k: key, n: label, x: 0, pts: ptsVal, icon: icon || '🏆', jahre: [] };
      st.trophies[key].x++;
      st.trophies[key].jahre.push({
        jahr: st.year,
        klub: wer || (st.club ? st.club.n : ''),
        nat: !!wer
      });
    };

    /* ---- Angebote aus dem Nachwuchs (Karrierestart) ---- */
    function macheJugendangebote(){
      const heim = HOME_LG[player.nation] || 'AHL';
      const kandidaten = shuffle(r, clubsOf('JUN')).slice(0, 2);
      // Ein Angebot aus dem Unterbau der Heimat, damit die Wahl etwas bedeutet
      const unten = D.LEAGUES.filter(l => l.prestige >= 8 && l.prestige <= 22);
      const heimLiga = unten.find(l => l.land === (nation(player.nation) || {}).n) || pick(r, unten);
      const dritter = pick(r, clubsOf(heimLiga.k));
      const alle = kandidaten.concat(dritter ? [dritter] : []);

      return alle.map(c => {
        const lg = league(c.lg);
        const schnitt = lgAvgStr(c.lg);
        // Je stärker der Klub, desto weniger Eiszeit bekommt ein Sechzehnjähriger
        const minuten = Math.round(clamp(1200 - (c.str - schnitt) * 38 - lg.level * 6,
                                         180, 1250) / 10) * 10;
        return {
          club: c, lgKey: c.lg, lgName: lg.n, land: lg.land,
          staerke: c.str,
          sterne: clamp(Math.round((lg.prestige / 8) + (c.str - schnitt) / 6), 1, 5),
          minuten,
          rolle: minuten > 900 ? 'Sofort Stammkraft'
               : minuten > 600 ? 'Regelmäßig im Kader' : 'Erst einmal Geduld'
        };
      });
    }

    function waehleJugend(index){
      if (!st.jugend) return false;
      const a = st.jugend[clamp(index, 0, st.jugend.length - 1)];
      st.club = a.club;
      umfeldBenennen();
      st.jugend = null;
      st.vertragJahre = 2;
      st.entscheidungen.push(a.club.n);
      return true;
    }

    /* ---- Ligatabelle der laufenden Saison ---- */
    function baueTabelle(clubLg, eigenerKlub, einfluss){
      const spiele = clubLg === 'NHL' ? 82 : 52;
      const teams = clubsOf(clubLg).map(c => {
        const kraft = c.str + (c.n === eigenerKlub ? einfluss : 0) + (r() - 0.5) * 13;
        const punkte = Math.round(clamp((kraft - 45) / 50, 0.15, 0.85) * spiele * 2);
        return { n: c.n, punkte, eigen: c.n === eigenerKlub };
      });
      teams.sort((a, b) => b.punkte - a.punkte);
      teams.forEach((t, i) => t.platz = i + 1);
      return teams;
    }

    /* ---- Karriereereignisse ---- */
    /* ---------------------------------------------------------------
       Die Wechselfrist: mitten in der Saison entscheidet sich, ob dein
       Klub angreift oder abbaut – und ob du dabei bleiben willst.
       Ein zweiter Entscheidungspunkt pro Jahr, der die Saison kippen kann.
       --------------------------------------------------------------- */
    function pruefeWechselfrist(){
      if (!st.club || st.age < 20 || st.klubJahre < 1) return null;
      if (league(st.club.lg).prestige < 8) return null;
      if (r() > 0.34) return null;                     // nicht jede Saison

      const schnitt = lgAvgStr(st.club.lg);
      const diff = st.club.str - schnitt;
      const stark = clubsOf(st.club.lg)
        .filter(c => c.n !== st.club.n && c.str > schnitt + 5);

      /* Der seltenste und groesste Moment: ein Anruf aus einer staerkeren
         Liga, mitten in der laufenden Saison. Gemessen wird an derselben
         Huerde wie im regulaeren Angebotssystem (LG_MIN), damit niemand
         aus dem Nichts in die NHL springt - nur zwei Punkte milder,
         weil ein Klub im Januar auch mal ein Risiko eingeht. */
      const eigeneLiga = league(st.club.lg);
      const formJetzt = formFactor(st.age, player.traits,
                                   (player.wirkung || {}).lernkurve, st.scheitel);
      const ovrJetzt = overall(player, devAttrs(player.attrs, formJetzt));

      const hoeher = D.LEAGUES.filter(l =>
        l.prestige > eigeneLiga.prestige + 12 &&
        LG_MIN[l.k] !== undefined && ovrJetzt >= LG_MIN[l.k] - 2 &&
        clubsOf(l.k).length);

      if (hoeher.length && st.age <= 33 && r() < 0.55){
        const zielLiga = pick(r, hoeher);
        const kandidaten = clubsOf(zielLiga.k);
        const neuerKlub = pick(r, kandidaten);
        return {
          art: 'ligasprung', ikone: 'flug', tag: 'Wechselfrist',
          titel: 'Ein Anruf aus der ' + zielLiga.n,
          text: neuerKlub.n + ' hat kurzfristig einen Ausfall zu ersetzen und will dich – '
              + 'sofort, mitten in der Saison. Du müsstest innerhalb von zwei Tagen dort sein, '
              + 'in einer Kabine, in der dich niemand kennt, mit einem Vertrag bis Saisonende. '
              + 'Danach entscheidet sich alles neu.',
          stand: { klub: st.club.n, diff: Math.round(diff), ziel: neuerKlub.n,
                   liga: zielLiga.n },
          optionen: [
            { t: 'Sofort zusagen', ikone: 'flug', chance: 58,
              hinweis: 'Zu ' + neuerKlub.n + ' – die Chance kommt vielleicht nie wieder',
              zielKlub: neuerKlub, folgt: 'wechsler',
              gut: { moral: 12, ruf: 14, attr: { nerven: 4 },
                     text: 'Zwei Tage später stehst du auf dem Eis, das du bisher nur im Fernsehen gesehen hast – und du gehörst dahin.' },
              schlecht: { moral: -12, ruf: -6, form: -0.08,
                     text: 'Es geht zu schnell. Du kommst nie richtig an, sitzt mehr auf der Bank als du spielst.' } },
            { t: 'Garantien für die Eiszeit verlangen', ikone: 'stift', chance: 42,
              hinweis: 'Mutig gegenüber einem größeren Klub',
              zielKlub: neuerKlub, folgt: 'wechsler',
              gut: { moral: 10, ruf: 16, trait: { playoff: 6 },
                     text: 'Sie sagen zu. Wer so verhandelt, kommt nicht als Notlösung, sondern als Verstärkung.' },
              schlecht: { moral: -8,
                     text: 'Man legt auf und nimmt den Nächsten auf der Liste. Das war deine Chance.' } },
            { t: 'Die Saison hier zu Ende bringen', ikone: 'schild', chance: 74,
              hinweis: 'Im Sommer reden alle wieder', folgt: 'treue',
              gut: { moral: 9, ruf: 6, form: 0.06,
                     text: 'Du bleibst, spielst groß auf – und im Sommer liegen drei Angebote statt einem auf dem Tisch.' },
              schlecht: { moral: -9,
                     text: 'Der Anruf kommt nie wieder. Manche Türen öffnen sich genau einmal.' } }
          ]
        };
      }
      if (!stark.length) return null;
      const ziel = pick(r, stark);
      const ctx = ereignisKontext();

      /* Schwellen an der gemessenen Verteilung der Kaderstaerken geeicht
         (Median 7.9, 10%-Quantil 1.9, 85%-Quantil 9.9): sonst waere fast
         jeder Klub ein Kaeufer und ein Wechsel praktisch unmoeglich. */
      if (diff < 4.5){
        return {
          art: 'verkaeufer', ikone: 'transfer', tag: 'Wechselfrist',
          titel: st.club.n + ' baut ab',
          text: 'Zwei Leistungsträger sind schon weg, die Saison ist sportlich gelaufen. '
              + 'Dein Berater sagt, ' + ziel.n + ' hätte Interesse – dort geht es um etwas. '
              + 'Die Frist läuft heute Abend um sechs ab.',
          stand: { klub: st.club.n, diff: Math.round(diff), ziel: ziel.n },
          optionen: [
            { t: 'Den Wechsel durchsetzen', ikone: 'flug', chance: 62,
              hinweis: 'Zu ' + ziel.n + ' – dort zählt nur der Titel',
              zielKlub: ziel, folgt: 'wechsler',
              gut: { moral: 6, ruf: 4,
                     text: 'Um 17:41 ist es durch. Am nächsten Abend stehst du in einem fremden Trikot auf fremdem Eis.' },
              schlecht: { moral: -9, ruf: -5,
                     text: 'Der Klub blockt ab. Jetzt weiß die Kabine, dass du weg wolltest – und du bist trotzdem noch da.' } },
            { t: 'Bleiben und das Ding durchziehen', ikone: 'schild', chance: 78,
              hinweis: 'Loyalität, die man dir anrechnet', folgt: 'treue',
              gut: { moral: 8, ruf: 6, attr: { nerven: 3 },
                     text: 'Du sagst öffentlich, dass du bleibst. Die Halle singt beim nächsten Heimspiel deinen Namen.' },
              schlecht: { form: -0.05,
                     text: 'Es bleibt eine lange, zähe Rückrunde ohne jedes Ziel.' } },
            { t: 'Dich still anbieten lassen', ikone: 'fluestern', chance: 45,
              hinweis: 'Riskant, aber ohne Gesichtsverlust',
              zielKlub: ziel,
              gut: { moral: 5, ruf: 7,
                     text: 'Niemand erfährt, wer den ersten Schritt gemacht hat. Der Wechsel wirkt wie ein Zufall.' },
              schlecht: { ruf: -7,
                     text: 'Ein Journalist hat es doch erfahren. Am Morgen steht dein Name über einer Geschichte, die du nicht wolltest.' } }
          ]
        };
      }

      if (diff < 9.2){
        return {
          art: 'mittelmass', ikone: 'waage', tag: 'Wechselfrist',
          titel: st.club.n + ' hält still',
          text: 'Andere Klubs verstärken sich, bei euch passiert nichts. '
              + 'Die Saison kann noch in beide Richtungen kippen. '
              + ziel.n + ' hat bei deinem Berater angefragt, wie fest du gebunden bist.',
          stand: { klub: st.club.n, diff: Math.round(diff), ziel: ziel.n },
          optionen: [
            { t: 'Den Wechsel zum Verfolger suchen', ikone: 'flug', chance: 48,
              hinweis: 'Zu ' + ziel.n + ' – mehr Chance auf Titel, weniger Sicherheit',
              zielKlub: ziel, folgt: 'wechsler',
              gut: { moral: 7, ruf: 5,
                     text: 'Zwei Tage später trainierst du woanders. Es fühlt sich sofort größer an.' },
              schlecht: { moral: -8, ruf: -4,
                     text: 'Die Ablöse ist zu hoch, der Wechsel platzt in der letzten Stunde.' } },
            { t: 'Eine Vertragsverlängerung verlangen', ikone: 'stift', chance: 58,
              hinweis: 'Sicherheit gegen Beweglichkeit',
              gut: { ruf: 6, moral: 8,
                     text: 'Der Klub verlängert und macht dich zum Gesicht der nächsten Jahre.' },
              schlecht: { moral: -6,
                     text: 'Man vertagt die Sache auf den Sommer. Bis dahin bleibst du in der Schwebe.' } },
            { t: 'Nichts tun und weiterspielen', ikone: 'puck', chance: 72,
              hinweis: 'Der ruhigste Weg',
              gut: { form: 0.05, attr: { konstanz: 3 },
                     text: 'Ohne Nebengeräusche spielst du deine beständigste Rückrunde.' },
              schlecht: { moral: -4,
                     text: 'Die Saison verläuft im Nichts, und die Anfrage kommt nie wieder.' } }
          ]
        };
      }

      return {
        art: 'kaeufer', ikone: 'ziel', tag: 'Wechselfrist',
        titel: st.club.n + ' rüstet auf',
        text: 'Der Klub hat heute zwei erfahrene Spieler geholt. Das heißt: Es geht um den Titel – '
            + 'und es heißt auch, dass die Reihen neu gemischt werden. '
            + ctx.trainer + ' bittet dich noch vor dem Training zu sich.',
        stand: { klub: st.club.n, diff: Math.round(diff), ziel: null },
        optionen: [
          { t: 'Platz in der ersten Reihe einfordern', ikone: 'krone', chance: 55,
            hinweis: 'Mehr Eiszeit, mehr Verantwortung', folgt: 'wortfuehrer',
            gut: { ruf: 8, moral: 6, trait: { playoff: 5 }, form: 0.06,
                   text: 'Er stellt dich neben die Neuzugänge. Ab jetzt spielst du die wichtigen Minuten.' },
            schlecht: { moral: -8,
                   text: 'Du bekommst, was du dir verdienst – sagt er. Die Neuen spielen, du schaust zu.' } },
          { t: 'Dich in den Dienst der Mannschaft stellen', ikone: 'herz', chance: 80,
            hinweis: 'Weniger Rampenlicht, mehr Rückhalt',
            gut: { moral: 10, attr: { defensive: 3 },
                   text: 'Du übernimmst die undankbaren Aufgaben. In der Kabine steigt dein Wert deutlich.' },
            schlecht: { ruf: -4,
                   text: 'Deine Zahlen sacken ab – und Zahlen sind das, was am Ende zitiert wird.' } },
          { t: 'Abwarten und über das Eis antworten', ikone: 'puck', chance: 65,
            hinweis: 'Keine Forderung, kein Risiko',
            gut: { form: 0.07, attr: { konstanz: 3, praezision: 3 },
                   text: 'Kein Wort, nur Leistung. Nach vier Wochen ist die Sache von selbst geklärt.' },
            schlecht: { moral: -5,
                   text: 'Wer nichts fordert, bekommt nichts. Die Rolle bleibt, wie sie war.' } }
        ]
      };
    }

    function entscheideWechselfrist(index){
      const w = st.wechselfrist;
      if (!w) return null;
      const o = w.optionen[clamp(index, 0, w.optionen.length - 1)];
      const gelungen = r() * 100 < o.chance;
      const e = gelungen ? o.gut : o.schlecht;
      const ctx = ereignisKontext();

      const folge = { gelungen, text: einsetzen(e.text || '', ctx), chance: o.chance,
                      wahl: o.t, titel: w.titel, tag: w.tag, wirkungen: [] };
      const merke = (t, gut) => folge.wirkungen.push({ t, gut });
      const attrName = k => {
        const x = D.ATTRS.skater.concat(D.ATTRS.goalie).find(y => y.k === k);
        return x ? x.n : k;
      };

      if (e.attr) Object.entries(e.attr).forEach(([k, v]) => {
        if (player.attrs[k] === undefined) return;
        player.attrs[k] = clamp(player.attrs[k] + v, 1, 99);
        merke('+' + v + ' ' + attrName(k), true);
      });
      if (e.trait) Object.entries(e.trait).forEach(([k, v]) =>
        player.traits[k] = (player.traits[k] || 0) + v);
      if (e.ruf){   st.ruf = clamp(st.ruf + e.ruf, 20, 99);
                    merke((e.ruf > 0 ? '+' : '') + e.ruf + ' Ansehen', e.ruf > 0); }
      if (e.moral){ st.moral = clamp(st.moral + e.moral, 10, 100);
                    merke((e.moral > 0 ? '+' : '') + e.moral + ' Moral', e.moral > 0); }
      if (e.form){  st.formBonus += e.form;
                    merke((e.form > 0 ? '+' : '') + Math.round(e.form * 100) + '% Form', e.form > 0); }

      /* Ein geglückter Wechsel bringt dich sofort zum neuen Klub */
      if (gelungen && o.zielKlub){
        st.wechselVon = st.club.n;
        if (!st.ehemalige.includes(st.club.n)) st.ehemalige.push(st.club.n);
        st.club = o.zielKlub;
        st.klubJahre = 0;
        st.kapitaenSeit = null;
        umfeldBenennen();
        merke('Wechsel zu ' + o.zielKlub.n, true);
      }
      if (!folge.wirkungen.length) merke('Keine bleibende Wirkung', true);

      /* Was hier entschieden wird, holt dich spaeter wieder ein. */
      if (gelungen && o.folgt && !st.freigeschaltet.includes(o.folgt)){
        st.freigeschaltet.push(o.folgt);
        st.strangNamen[o.folgt] = { trainer: st.trainer, mitspieler: st.mitspieler,
                                    klub: w.stand ? w.stand.klub : null };
      }

      st.verlauf.push({
        jahr: st.year, alter: st.age, art: 'wechselfrist',
        tag: w.tag, titel: w.titel,
        wahl: o.t, gelungen, chance: o.chance, wagnis: false
      });
      st.letzteFolge = folge;
      st.offeneNotiz = { t: 'Wechselfrist: ' + o.t + (gelungen ? ' – gelungen' : ' – misslungen'),
                         c: gelungen ? 'good' : 'bad' };
      st.wechselfrist = null;
      return folge;
    }

    /* ---------------------------------------------------------------
       Saisonziele: Der Klub formuliert vor jeder Saison eine Erwartung
       an die Mannschaft und eine an dich persoenlich. Beide werden am
       Ende abgerechnet – das gibt jedem Jahr einen eigenen Einsatz.
       --------------------------------------------------------------- */
    function setzeSaisonZiel(club){
      /* Die Schwellen sind an der gemessenen Verteilung der Kaderstaerken
         geeicht: Titel fordert nur die Spitze, sonst waere jede Saison
         eine Enttaeuschung. */
      const diff = club.str - lgAvgStr(club.lg);
      let team;
      if (diff > 10.8)      team = { art:'titel',    n:'Den Titel holen',
                                     d:'Alles andere gilt hier als verpasste Saison.' };
      else if (diff > 8.6)  team = { art:'runden',   n:'Mindestens zwei Playoffrunden',
                                     d:'Der Kader ist zu stark für ein frühes Aus.' };
      else if (diff > 2.2)  team = { art:'playoffs', n:'Die Playoffs erreichen',
                                     d:'Dafür wurde der Kader zusammengestellt.' };
      else                  team = { art:'platz',    n:'Nicht Letzter werden',
                                     d:'Ein realistisches Ziel für diesen Kader.' };

      const letzte = st.seasons[st.seasons.length - 1];
      let person;

      if (!letzte || !letzte.gp){
        /* Erste Profisaison: niemand erwartet Zahlen, nur Einsatzzeit. */
        person = { art:'spiele', wert: 20, n:'20 Einsätze sammeln',
                   d:'Im ersten Jahr zählt, dass du überhaupt spielst.' };
        return { team, person };
      }

      /* Ein Ligawechsel verschiebt das Mass: In der NHL sind 70 Punkte
         etwas anderes als in der zweiten Liga. */
      const skala = k => Math.pow((league(k) || {}).level || 20, 0.45);
      const ligaFaktor = clamp(skala(letzte.lg) / skala(club.lg), 0.5, 1.6);
      const faktor = (st.age < 24 ? 1.14 : st.age > 32 ? 0.9 : 1.03) * ligaFaktor;

      if (isG){
        const ziel = clamp(Math.round((letzte.wins || 10) * faktor), 6, 46);
        person = { art:'siege', wert: ziel, n: ziel + ' Siege', d:'Daran misst dich der Torwarttrainer.' };
      } else if (player.pos !== 'D' && st.seasons.length % 3 === 1){
        const tore = clamp(Math.round((letzte.g || 5) * faktor), 4, 60);
        person = { art:'tore', wert: tore, n: tore + ' Tore', d:'Der Trainer will Abschlüsse sehen.' };
      } else {
        const ziel = clamp(Math.round((letzte.p || 12) * faktor), 8, 115);
        person = { art:'punkte', wert: ziel, n: ziel + ' Scorerpunkte', d:'Deine Vorgabe für die Saison.' };
      }
      return { team, person };
    }

    function werteSaisonZiel(season){
      const z = season.ziele;
      if (!z) return;
      const serien = season.playoffSerien || [];
      const gewonnen = serien.filter(x => x.gewonnen).length;
      const letzterPlatz = st.tabelle.length ? st.tabelle.length : 0;

      z.team.erfuellt =
        z.team.art === 'titel'    ? !!season.title :
        z.team.art === 'runden'   ? gewonnen >= 2 :
        z.team.art === 'playoffs' ? !!season.playoffs :
        !(season.platz && letzterPlatz && season.platz === letzterPlatz);

      const erreicht = z.person.art === 'siege'  ? (season.wins || 0)
                     : z.person.art === 'tore'   ? (season.g || 0)
                     : z.person.art === 'spiele' ? (season.gp || 0)
                     : (season.p || 0);
      z.person.erreicht = erreicht;
      z.person.erfuellt = erreicht >= z.person.wert;

      const treffer = (z.team.erfuellt ? 1 : 0) + (z.person.erfuellt ? 1 : 0);
      st.zielBilanz.erfuellt += treffer;
      st.zielBilanz.verfehlt += 2 - treffer;

      if (treffer === 2){
        st.ruf = clamp(st.ruf + 5, 20, 99);
        st.moral = clamp(st.moral + 8, 10, 100);
        season.events.push({ t: 'Beide Saisonziele erfüllt', c: 'good' });
      } else if (treffer === 1){
        st.ruf = clamp(st.ruf + 2, 20, 99);
        st.moral = clamp(st.moral + 2, 10, 100);
        season.events.push({ t: z.team.erfuellt ? 'Teamziel erreicht, persönliche Vorgabe verfehlt'
                                                : 'Persönliche Vorgabe erfüllt, Teamziel verfehlt', c: '' });
      } else {
        st.ruf = clamp(st.ruf - 4, 20, 99);
        st.moral = clamp(st.moral - 7, 10, 100);
        season.events.push({ t: 'Beide Saisonziele verfehlt', c: 'bad' });
      }
    }

    /* ---------------------------------------------------------------
       Der Jahrgang: sieben Spieler, die im selben Jahr gezogen wurden.
       Ihre Laufbahnen werden einmal vorausberechnet – danach laesst sich
       fuer jedes Alter ablesen, wo man im Vergleich steht. Sie duerfen
       dabei selbst keinen Jahrgang bekommen (Endlosschleife).
       --------------------------------------------------------------- */
    const JAHRGANG_GROESSE = 7;

    function erzeugeJahrgang(season){
      const gruppe = P.group;
      const posAuswahl = gruppe === 'goalie' ? ['G'] : ['C', 'LW', 'RW', 'D'];
      const mitglieder = [];

      for (let i = 0; i < JAHRGANG_GROESSE; i++){
        const rSeed = player.seed + ':jahrgang:' + i;
        const rr = rng(rSeed);
        const ident = {
          name: pick(rr, D.FIRST) + ' ' + pick(rr, D.LAST),
          num: ri(rr, 1, 97),
          nation: pick(rr, D.NATIONS).k,
          pos: pick(rr, posAuswahl), mode: 'klassisch'
        };
        if (ident.name === player.name) ident.name = pick(rr, D.FIRST) + ' ' + pick(rr, D.LAST);
        /* Die Guete streut bewusst weit: ein Jahrgang hat Ausnahmetalente,
           solide Profis und Spieler, die es nie ganz schaffen. */
        const guete = 0.2 + (i / JAHRGANG_GROESSE) * 0.55 + rr() * 0.6;
        const rPlayer = newPlayer(Object.assign({ seed: rSeed }, ident));
        for (let rd = 0; rd < DRAFT.RUNDEN; rd++){
          const f = draftFrage(rPlayer, rd);
          if (!f) break;
          const bewertet = f.karten.map(k => ({ k, s: karteWert(rPlayer, k) * guete + rr() * 30 }));
          bewertet.sort((x, y) => y.s - x.s);
          applyKarte(rPlayer, bewertet[0].k);
        }
        const res = simulate(rPlayer);
        mitglieder.push({
          name: ident.name, nation: ident.nation, num: ident.num, pos: ident.pos,
          seasons: res.seasons, legacy: res.legacy, peak: res.peak,
          rank: res.rank.n, totals: res.totals, klubs: res.klubs
        });
      }

      mitglieder.sort((x, y) => y.legacy - x.legacy);
      st.jahrgang = mitglieder;
      // Der Beste des Jahrgangs ist der, an dem die Geschichten haengen
      const bester = mitglieder[0];
      st.rivale = bester;
      season.events.push({ t: 'Im selben Jahrgang gezogen: ' + bester.name
                              + ' – an ihm wirst du gemessen werden', c: '' });
    }

    /* Wo stehst du in deinem Jahrgang – gemessen am selben Alter? */
    function jahrgangStand(){
      if (!st.jahrgang.length) return null;
      const isTor = isG;
      const bisAlter = st.age;
      const summe = (seasons, feld) => seasons
        .filter(x => x.age <= bisAlter)
        .reduce((a, x) => a + (x[feld] || 0), 0);
      const feld = isTor ? 'wins' : 'p';

      /* Rohe Punkte taugen nicht als Vergleich: 900 Punkte in der zweiten
         Liga sind weniger wert als 700 in der NHL. Deshalb wird jede Saison
         mit der Staerke ihrer Liga gewichtet, Titel und Auszeichnungen
         kommen obendrauf. Die Wurzel daempft den Abstand, sonst waere
         alles unterhalb der Topligen bedeutungslos. */
      const ligaGewicht = k => {
        const l = league(k);
        return Math.sqrt(Math.max(6, (l && l.level) || 20) / 100);
      };

      const wertung = seasons => Math.round(seasons
        .filter(x => x.age <= bisAlter)
        .reduce((a, x) => a
          + (isTor ? (x.wins || 0) : (x.p || 0)) * ligaGewicht(x.lg)
          + (x.title ? 10 : 0)
          + ((x.awards || []).length * 4), 0));

      const eintrag = (name, nat, seasons, pos2, eigen) => {
        const gespielt = seasons.filter(x => x.age <= bisAlter);
        const letzte = gespielt[gespielt.length - 1];
        const nochAktiv = seasons.some(x => x.age >= bisAlter);
        return {
          name, nation: nat, pos: pos2, eigen,
          wert: wertung(seasons),
          roh: summe(seasons, feld),
          gp: summe(seasons, 'gp'),
          titel: gespielt.filter(x => x.title).length,
          ovr: letzte ? letzte.ovr : 0,
          klub: letzte ? letzte.club : '–',
          lg: letzte ? letzte.lg : null,
          aktiv: nochAktiv
        };
      };

      const liste = st.jahrgang.map(m => eintrag(m.name, m.nation, m.seasons, m.pos, false));
      liste.push(eintrag(player.name, player.nation, st.seasons, player.pos, true));
      liste.sort((a, b) => b.wert - a.wert || b.titel - a.titel || b.ovr - a.ovr);
      liste.forEach((x, i) => x.platz = i + 1);

      const vorher = st.jahrgangStand;
      const alterPlatz = vorher ? (vorher.find(x => x.name === player.name) || {}).platz : null;
      const jetzt = liste.find(x => x.eigen);
      if (jetzt && alterPlatz) jetzt.bewegung = alterPlatz - jetzt.platz;

      /* Wer wurde ueberholt, wer hat ueberholt? Das macht aus einer
         Tabelle ein Rennen. Verglichen werden die Plaetze mit dem Vorjahr. */
      st.jahrgangEreignis = null;
      if (vorher && jetzt && alterPlatz){
        const frueher = {};
        vorher.forEach(x => frueher[x.name] = x.platz);
        const ueberholt = liste.filter(x =>
          !x.eigen && frueher[x.name] !== undefined &&
          frueher[x.name] < alterPlatz && x.platz > jetzt.platz);
        const verloren = liste.filter(x =>
          !x.eigen && frueher[x.name] !== undefined &&
          frueher[x.name] > alterPlatz && x.platz < jetzt.platz);
        if (ueberholt.length)
          st.jahrgangEreignis = { art:'vorbei', namen: ueberholt.map(x => x.name),
                                  platz: jetzt.platz };
        else if (verloren.length)
          st.jahrgangEreignis = { art:'verloren', namen: verloren.map(x => x.name),
                                  platz: jetzt.platz };
      }

      /* Abstand nach vorn und nach hinten - der Stoff fuer die Spannung */
      if (jetzt){
        const i = liste.indexOf(jetzt);
        const vor = liste[i - 1], hinter = liste[i + 1];
        st.jahrgangDelta = {
          vorn:   vor    ? { name: vor.name,    abstand: vor.wert - jetzt.wert } : null,
          hinten: hinter ? { name: hinter.name, abstand: jetzt.wert - hinter.wert } : null,
          platz: jetzt.platz, von: liste.length, wert: jetzt.wert
        };
      }

      st.jahrgangStand = liste;
      return liste;
    }

    /* Baustelle fuer die Textbausteine: alles, was in einem Ereignis
       vorkommen kann, wird hier mit echten Namen gefuellt. */
    function ereignisKontext(){
      const lg = st.club ? league(st.club.lg) : null;
      const gegnerPool = st.club ? clubsOf(st.club.lg).filter(c => c.n !== st.club.n) : [];
      const gegner = gegnerPool.length ? pick(r, gegnerPool).n : 'dem Tabellenführer';
      const tabelle = st.tabelle || [];
      const spitze = tabelle.length ? tabelle[0].n : gegner;
      return {
        name: player.name,
        vorname: String(player.name).split(' ')[0],
        nachname: String(player.name).split(' ').slice(-1)[0],
        nummer: player.num,
        position: pos(player.pos).n,
        klub: st.club ? st.club.n : 'deinem Verein',
        liga: lg ? lg.n : 'der Liga',
        titel: lg ? lg.title : 'die Meisterschaft',
        nation: nation(player.nation).n,
        gegner, spitze,
        ehemaliger: st.ehemalige.length
          ? st.ehemalige[st.ehemalige.length - 1] : 'deinem alten Klub',
        trainer: st.trainer || 'der Trainer',
        mitspieler: st.mitspieler || 'ein Mitspieler',
        rivale: st.rivale ? st.rivale.name : 'ein Spieler deines Jahrgangs',
        alter: st.age,
        jahre: st.klubJahre
      };
    }

    function einsetzen(text, ctx){
      return String(text).replace(/\{(\w+)\}/g, (treffer, k) =>
        ctx[k] !== undefined ? ctx[k] : treffer);
    }

    function waehleEreignis(letzteSaison){
      if (!window.EREIGNISSE || st.club === null) return null;
      if (league(st.club.lg).prestige < 8) return null;
      if (r() > 0.7) return null;                        // nicht jede Saison
      // Wiederholbare Ereignisse duerfen erneut kommen, nur nicht direkt hintereinander
      const zuletzt = st.erlebt[st.erlebt.length - 1];
      const offen = EREIGNISSE.LISTE.filter(e => {
        const schonDa = st.erlebt.includes(e.id);
        if (schonDa && !e.mehrfach) return false;
        if (e.id === zuletzt) return false;
        // Folgeereignisse brauchen eine fruehere Entscheidung
        if (e.benoetigt && !st.freigeschaltet.includes(e.benoetigt)) return false;
        // Positionsgebundene Ereignisse
        if (e.nurPos && !e.nurPos.includes(player.pos)) return false;
        // Charaktergebundene Ereignisse
        if (e.nurEig && !(player.eigenschaften || []).includes(e.nurEig)) return false;
        return !e.bedingung || e.bedingung(st, letzteSaison);
      });
      if (!offen.length) return null;
      /* Nicht jedes Ereignis ist gleich wichtig: Was aus einer frueheren
         Entscheidung erwaechst oder zum Charakter passt, kommt bevorzugt.
         Sonst gehen genau die persoenlichen Momente im grossen Pool unter. */
      const gewicht = x => {
        let w = 1;
        if (x.gewicht)   w *= x.gewicht; // vom Autor gesetzter Vorrang
        if (x.benoetigt) w *= 8;        // Folge einer eigenen Entscheidung
        if (x.nurEig)    w *= 3.5;      // passt zum Charakter
        if (x.nurPos)    w *= 2.5;      // passt zur Position
        if (st.erlebt.includes(x.id)) w *= 0.35;   // Wiederholung seltener
        return w;
      };
      const summe = offen.reduce((a2, x) => a2 + gewicht(x), 0);
      let ziel = r() * summe, e = offen[offen.length - 1];
      for (const kandidat of offen){
        ziel -= gewicht(kandidat);
        if (ziel <= 0){ e = kandidat; break; }
      }
      st.erlebt.push(e.id);
      // Erfolg pro Option vorab auswürfeln, damit die Anzeige ehrlich bleibt
      const ctx = ereignisKontext();
      /* Ein Folgeereignis erzählt von denselben Menschen wie das Original –
         auch wenn der Spieler das Team längst gewechselt hat. */
      if (e.benoetigt && st.strangNamen[e.benoetigt]){
        const alt = st.strangNamen[e.benoetigt];
        ctx.trainer    = alt.trainer    || ctx.trainer;
        ctx.mitspieler = alt.mitspieler || ctx.mitspieler;
        ctx.damalsKlub = alt.klub       || ctx.klub;
      } else ctx.damalsKlub = ctx.klub;
      /* Optionen, die nicht zum Charakter passen, fallen weg –
         dafuer kommen charaktergebundene hinzu. */
      const passend = e.optionen.filter(o => {
        if (o.nurEig && !(player.eigenschaften || []).includes(o.nurEig)) return false;
        if (o.nurPos && !o.nurPos.includes(player.pos)) return false;
        if (o.nurWenn && !o.nurWenn(st)) return false;
        return true;
      });
      return {
        id: e.id, kat: e.kat, szene: e.szene, tag: einsetzen(e.tag, ctx),
        titel: einsetzen(e.titel, ctx), text: einsetzen(e.text, ctx),
        spieltag: ri(r, 3, league(st.club.lg).k === 'NHL' ? 78 : 48),
        optionen: passend.map(o => {
          const bonus = (player.wirkung || {}).ereignis || 0;
          return {
            t: einsetzen(o.t, ctx),
            chance: clamp(o.chance + bonus, 5, 95), grundChance: o.chance, bonus,
            hinweis: einsetzen(o.hinweis || '', ctx), wagnis: !!o.wagnis,
            nurEig: o.nurEig || null, folgt: o.folgt || null,
            _ctx: ctx, _gut: o.gut, _schlecht: o.schlecht, _wurf: r() * 100
          };
        })
      };
    }

    function chooseEreignis(index){
      if (!st.ereignis) return null;
      const o = st.ereignis.optionen[clamp(index, 0, st.ereignis.optionen.length - 1)];
      const gelungen = o._wurf < o.chance;
      const w = gelungen ? o._gut : o._schlecht;
      if (o.folgt && !st.freigeschaltet.includes(o.folgt)){
        st.freigeschaltet.push(o.folgt);
        // Namen festhalten, damit das Folgeereignis dieselben Personen meint
        const c = o._ctx || {};
        st.strangNamen[o.folgt] = { trainer: c.trainer, mitspieler: c.mitspieler, klub: c.klub };
      }
      const folge = { gelungen,
                      text: einsetzen((w && w.text) || '', o._ctx || {}), chance: o.chance,
                      wurf: Math.round(o._wurf), wahl: o.t, wirkungen: [] };

      const merke = (t, gut) => folge.wirkungen.push({ t, gut });
      if (w){
        const attrName = k => {
          const a = D.ATTRS.skater.concat(D.ATTRS.goalie).find(x => x.k === k);
          return a ? a.n : k;
        };
        Object.entries(w.attr || {}).forEach(([k, v]) => {
          if (player.attrs[k] !== undefined)
            merke((v > 0 ? '+' : '') + v + ' ' + attrName(k), v > 0);
        });
        Object.entries(w.trait || {}).forEach(([k, v]) => {
          const n = { robust:'Robustheit', langlebig:'Haltbarkeit',
                      jung:'Frühreife', playoff:'Playoff-Stärke' }[k] || k;
          merke((v > 0 ? '+' : '') + v + ' ' + n, v > 0);
        });
        if (w.ruf)    merke((w.ruf > 0 ? '+' : '') + w.ruf + ' Ansehen', w.ruf > 0);
        if (w.moral)  merke((w.moral > 0 ? '+' : '') + w.moral + ' Moral', w.moral > 0);
        if (w.form)   merke((w.form > 0 ? '+' : '') + Math.round(w.form * 100) + '% Form', w.form > 0);
        if (w.risiko) merke('+' + w.risiko + ' Verletzungsrisiko', false);
      }
      if (!folge.wirkungen.length) merke('Keine bleibende Wirkung', true);

      if (w){
        if (w.attr) Object.entries(w.attr).forEach(([k, v]) => {
          if (player.attrs[k] !== undefined) player.attrs[k] = clamp(player.attrs[k] + v, 1, 99);
        });
        if (w.trait) Object.entries(w.trait).forEach(([k, v]) =>
          player.traits[k] = (player.traits[k] || 0) + v);
        if (w.ruf) st.ruf = clamp(st.ruf + w.ruf, 20, 99);
        if (w.moral) st.moral = clamp(st.moral + w.moral, 10, 100);
        if (w.form) st.formBonus += w.form;
        if (w.risiko) st.risikoBonus += w.risiko / 100;
      }
      st.verlauf.push({
        jahr: st.year, alter: st.age, art: 'ereignis',
        tag: st.ereignis.tag, titel: st.ereignis.titel,
        wahl: o.t, gelungen, chance: o.chance, wagnis: !!o.wagnis
      });
      st.letzteFolge = Object.assign({ titel: st.ereignis.titel, tag: st.ereignis.tag }, folge);
      // Merken, damit die Entscheidung spaeter im Karriereverlauf auftaucht
      st.offeneNotiz = { t: st.ereignis.tag + ': ' + o.t + (gelungen ? ' – gelungen' : ' – misslungen'),
                         c: gelungen ? 'good' : 'bad' };
      st.ereignis = null;
      return folge;
    }

    /* ---- eine Saison ausspielen ---- */
    function playSeason(){
      if (st.fertig || st.angebote || st.training || st.ereignis || st.jugend
          || st.rollenwahl || st.kapitaensfrage || st.ruecktrittsfrage
          || st.wechselfrist) return null;

      // Vor der Saison kann ein Karriereereignis dazwischenkommen
      if (!st.ereignisGeprueft){
        st.ereignisGeprueft = true;
        const e = waehleEreignis(st.seasons[st.seasons.length - 1]);
        if (e){ st.ereignis = e; return null; }
      }

      // Die Wechselfrist mitten in der Saison
      if (!st.wechselGeprueft){
        st.wechselGeprueft = true;
        const w = pruefeWechselfrist();
        if (w){ st.wechselfrist = w; return null; }
      }

      const club = st.club;
      const lg = league(club.lg);
      const form = formFactor(st.age, player.traits, (player.wirkung || {}).lernkurve, st.scheitel);
      const dev = devAttrs(player.attrs, form);
      const ovr = overall(player, dev);
      if (ovr > st.peak){ st.peak = ovr; st.peakAttrs = dev; }

      const season = { year: st.year, age: st.age, club: club.n, lg: club.lg,
                       lgName: lg.n, ovr, events: [], awards: [] };
      if (st.offeneNotiz){ season.events.push(st.offeneNotiz); st.offeneNotiz = null; }

      /* Was der Klub in dieser Saison von dir und der Mannschaft erwartet */
      st.ziele = setzeSaisonZiel(club);
      season.ziele = st.ziele;

      /* Verletzungen */
      const robust = 1 + (player.traits.robust || 0) * 0.02;
      const rollenRisiko = (st.rolle && st.rolle.w && st.rolle.w.risiko) || 0;
      const injRisk = clamp(0.19 + (st.age - 28) * 0.02 - (player.traits.robust || 0) * 0.011
                            + st.risikoBonus + rollenRisiko, 0.04, 0.6);
      let missed = 0;
      if (r() < injRisk){
        const V = pick(r, D.VERLETZUNGEN);
        missed = Math.round(clamp(ri(r, V.min, V.max) / robust, 2, 55));
        if (V.schwere >= 1) st.verletzungsjahre = (st.verletzungsjahre || 0) + V.schwere;
        season.verletzung = { n: V.n, spiele: missed, schwere: V.schwere };
        season.events.push({ t: V.n + ' – ' + missed + ' Spiele verpasst', c: 'bad' });
      }
      const fullGp = lg.k === 'NHL' ? 82 : (lg.k === 'JUN' ? 60 : 52);

      /* Sternstunde: einmal im Leben läuft einfach alles */
      const primeJahre = st.age >= 24 && st.age <= 31;
      season.sternstunde = primeJahre && !st.hatteSternstunde && r() < 0.16;
      if (season.sternstunde){
        st.hatteSternstunde = true;
        season.events.push({ t: 'Sternstunde: Diese Saison gelingt dir einfach alles', c: 'good' });
      }

      if (season.sternstunde){
        season.ovr = clamp(season.ovr + 3, 1, 99);
        if (season.ovr > st.peak){ st.peak = season.ovr; st.peakAttrs = dev; }
      }

      /* ---- Mehrjaehriger Formzustand ----
         Laeufe und Krisen halten ueber Saisons an, statt jedes Jahr neu zu wuerfeln.
         Konstante Spieler schwanken weniger. */
      const konstanzWert = isG ? (dev.konstanz || 50) : (dev.nerven || 50);
      const traegheit = 0.45 + konstanzWert / 260;             // 0.64 bis 0.83
      const stoss = (r() - 0.5) * 2 * (1.25 - konstanzWert / 130);
      st.formzustand = clamp(st.formzustand * traegheit + stoss * 0.5, -1, 1);
      season.formzustand = Math.round(st.formzustand * 100) / 100;

      /* ---- Eingewoehnung beim Klub ----
         Das erste Jahr an einem neuen Ort kostet, ab dem dritten zahlt es sich aus. */
      const eingewoehnung = st.klubJahre === 0 ? -0.055
                          : st.klubJahre === 1 ? 0.01
                          : Math.min(0.055, 0.02 + st.klubJahre * 0.008);

      /* ---- Mitspieler ----
         In einer starken Mannschaft faellt es leichter zu punkten. */
      const mitspieler = clamp((club.str - lgAvgStr(club.lg)) * 0.006, -0.06, 0.07);

      /* Klassenunterschied zur Liga */
      const tagesform = 0.97 + r() * 0.04
                      + st.formzustand * 0.055
                      + eingewoehnung + mitspieler
                      + (season.sternstunde ? 0.10 : 0) + st.formBonus;
      const kante = clamp((ovr * tagesform - lg.level * 0.58) / 32, -0.35, 1.7);
      season.kante = Math.round(kante * 100) / 100;
      season.faktoren = {
        form: Math.round(st.formzustand * 100) / 100,
        eingewoehnung: Math.round(eingewoehnung * 1000) / 10,
        mitspieler: Math.round(mitspieler * 1000) / 10
      };

      if (isG){
        const rg = (st.rolle && st.rolle.w) || {};
        const anteil = clamp(0.34 + kante * 0.46 + (rg.anteil || 0) * 1.6, 0.14, 0.96);
        const gp = Math.max(6, Math.min(fullGp - missed, Math.round((fullGp - missed) * anteil)));
        season.gp = gp;
        season.sv = clamp(0.885 + kante * 0.045 + (r() - 0.5) * 0.007, 0.868, 0.948);
        season.gaa = clamp(3.40 - kante * 1.55 + (r() - 0.5) * 0.30, 1.42, 4.3);
        season.so = Math.max(0, Math.round((season.sv - 0.902) * 130 * (gp / 50) + (r() - 0.65)));
        season.wins = Math.round(gp * clamp(0.32 + kante * 0.22 + (club.str - 74) * 0.007, 0.18, 0.78));
        season.otl = Math.round((gp - season.wins) * (0.15 + r() * 0.12));
        season.losses = Math.max(0, gp - season.wins - season.otl);
        // Schüsse und Paraden aus Fangquote und Gegentorschnitt ableiten
        season.ga = Math.max(0, Math.round(season.gaa * gp));
        season.shotsAgainst = Math.round(season.ga / Math.max(0.02, 1 - season.sv));
        season.saves = season.shotsAgainst - season.ga;
        season.toi = Math.round(58 + r() * 3);
        season.rolle = anteil >= 0.62 ? 'Stammtorhüter'
                     : anteil >= 0.42 ? 'Geteiltes Tor' : 'Ersatztorhüter';
        if (anteil < 0.42) season.events.push({ t: 'Meist nur Ersatz – wenig Eiszeit', c: '' });
      } else {
        const rw = (st.rolle && st.rolle.w) || {};
        const gp = Math.max(8, fullGp - missed);
        const posFactor = P.k === 'D' ? 0.62 : (P.k === 'C' ? 1.15 : 1.0);
        // Die Rolle wirkt jetzt multiplikativ – die Wahl ist deutlich spuerbar.
        const rollenFaktor = 1 + (rw.punkte || 0) * 1.9;
        const streuung = 0.90 + r() * 0.20 * (1.3 - konstanzWert / 140);
        const ppg = clamp(kante * posFactor * rollenFaktor * streuung, 0.02, 2.4);
        const punkte = Math.round(ppg * gp);
        const gShare = P.goalRate / (P.goalRate + P.assistRate);
        const tore = Math.round(punkte * gShare * (0.82 + r() * 0.36));
        season.gp = gp;
        season.g = Math.min(tore, punkte);
        season.a = punkte - season.g;
        season.p = punkte;
        season.plus = Math.round((kante * 16 + (club.str - 76) * 0.5) * (0.6 + r() * 0.8)
                                 + (rw.plus || 0));
        season.pim = Math.round(ri(r, 8, 12 + Math.round((dev.zweikampf || 50) / 2))
                                * (rw.strafen || 1));
        // Spezialteams, Schüsse und Eiszeit
        season.ppg = Math.round(season.g * (0.22 + r() * 0.20));
        season.shg = Math.round(season.g * (dev.defensive > 70 ? 0.05 : 0.02) * (r() < 0.5 ? 0 : 2));
        season.gwg = Math.round(season.g * (0.10 + r() * 0.09));
        const quote = clamp(0.055 + (dev.praezision || 50) / 900 + (r() - 0.5) * 0.02, 0.04, 0.20);
        season.shots = Math.max(season.g, Math.round(season.g / quote));
        season.shotPct = season.shots ? Math.round(season.g / season.shots * 1000) / 10 : 0;
        season.toi = Math.round(clamp(10 + kante * 7 + (P.k === 'D' ? 2.5 : 0)
                                      + (rw.eiszeit || 0), 8, 27) * 10) / 10;
        if (P.k === 'C') season.bully = Math.round(clamp(44 + (dev.zweikampf || 50) * 0.12
                                          + (r() - 0.5) * 5, 38, 62) * 10) / 10;
        season.rolle = kante > 1.0 ? 'Erste Reihe' : kante > 0.6 ? 'Zweite Reihe'
                     : kante > 0.25 ? 'Dritte Reihe' : 'Vierte Reihe';
      }

      /* Teamerfolg */
      const einfluss = clamp((ovr - 80) * (isG ? 0.38 : 0.34), -7, 14);
      const moralBonus = (st.moral - 60) * 0.10;
      const teamPower = club.str + einfluss + moralBonus + (r() - 0.5) * 15;
      season.moral = Math.round(st.moral);
      st.tabelle = baueTabelle(club.lg, club.n, einfluss + moralBonus);
      season.tabelle = st.tabelle.slice(0, 6);
      season.platz = (st.tabelle.find(t => t.eigen) || {}).platz || null;
      const ligaSchnitt = lgAvgStr(club.lg);
      const poBoost = (player.traits.playoff || 0) * 0.42;
      season.playoffs = teamPower > ligaSchnitt + 2;

      if (season.playoffs){
        /* ---- Playoffs als Serienfolge ----
           Jede Runde ein echter Gegner, ein echtes Ergebnis. Das macht den
           Weg zum Titel nachvollziehbar statt zu einem einzelnen Wuerfelwurf. */
        const rundenNamen = lg.k === 'NHL'
          ? ['Erste Runde', 'Viertelfinale', 'Halbfinale', 'Finale']
          : ['Viertelfinale', 'Halbfinale', 'Finale'];
        const gegnerPool = shuffle(r, clubsOf(club.lg).filter(c => c.n !== club.n));
        const serien = [];
        let weiter = true, poSpiele = 0;

        for (let i = 0; i < rundenNamen.length && weiter; i++){
          // Spaetere Runden bringen staerkere Gegner
          const stufe = i / Math.max(1, rundenNamen.length - 1);
          const kandidaten = gegnerPool.slice().sort((a, b) => b.str - a.str);
          const index = clamp(Math.round(kandidaten.length * (0.62 - stufe * 0.55))
                              + ri(r, -2, 2), 0, kandidaten.length - 1);
          const gegner = kandidaten[index];
          gegnerPool.splice(gegnerPool.indexOf(gegner), 1);

          const chance = clamp(0.42 + (teamPower - gegner.str) * 0.018 + poBoost / 300, 0.14, 0.72);
          const gewonnen = r() < chance;
          const eigene = gewonnen ? 4 : ri(r, 1, 3);
          const fremde = gewonnen ? ri(r, 1, 3) : 4;
          const spiele = eigene + fremde;
          poSpiele += spiele;

          serien.push({ runde: rundenNamen[i], gegner: gegner.n,
                        eigene, fremde, gewonnen,
                        knapp: Math.abs(eigene - fremde) <= 1 });
          weiter = gewonnen;
        }

        season.playoffSerien = serien;
        season.poSpiele = poSpiele;

        /* Eigene Ausbeute in den Playoffs – dort wird enger gedeckt */
        if (isG){
          season.poWins = serien.filter(x => x.gewonnen).length * 4
                        + (weiter ? 0 : ri(r, 0, 3));
          season.poSv = clamp(season.sv + (r() - 0.45) * 0.016 + poBoost / 900, 0.86, 0.955);
        } else {
          const poRate = (season.p / Math.max(1, season.gp)) * (0.80 + r() * 0.45)
                       + poBoost / 500;
          season.poP = Math.max(0, Math.round(poRate * poSpiele));
          season.poG = Math.round(season.poP * (P.goalRate / (P.goalRate + P.assistRate)));
          season.poA = season.poP - season.poG;
        }

        if (weiter){
          season.title = lg.title;
          addTrophy('lg_' + lg.k, lg.title, lg.prestige, '🏆');
          season.events.push({ t: lg.title + ' gewonnen', c: 'good' });
          const poStark = isG ? (season.poSv > 0.925) : (season.poP >= poSpiele);
          if (r() < (poStark ? 0.45 : 0.18) + poBoost / 140) season.awards.push('playoffMvp');
          if (!isG && season.poP >= poSpiele * 1.1 && r() < 0.4) season.awards.push('poTop');
          st.ruf += 4;
        } else {
          const letzte = serien[serien.length - 1];
          season.events.push({
            t: 'Playoffs: ' + letzte.runde + ' gegen ' + letzte.gegner
               + ' mit ' + letzte.eigene + ':' + letzte.fremde + ' verloren',
            c: letzte.knapp ? 'bad' : '' });
        }
      } else if (lg.k !== 'JUN'){
        season.events.push({ t: 'Playoffs verpasst', c: '' });
      }

      /* Einzelehrungen */
      if (lg.prestige >= 44){
        if (isG){
          if (season.sv > 0.928 && kante > 1.00) season.awards.push('bestG');
          if (season.sv > 0.936 && kante > 1.25 && r() < 0.4) season.awards.push('mvp');
          if (season.gaa < 2.20 && kante > 0.95 && r() < 0.5) season.awards.push('torwartDuo');
        } else {
          const ppg = season.p / season.gp;
          if (ppg > 1.12 && kante > 0.9) season.awards.push('topscorer');
          if (season.g / season.gp > 0.55 && kante > 0.85) season.awards.push('torjaeger');
          if (season.a / season.gp > 0.72 && kante > 0.85) season.awards.push('vorlagen');
          if (P.k === 'D' && ppg > 0.62 && kante > 0.85) season.awards.push('bestD');
          if (kante > 1.05 && ppg > 1.15 && r() < 0.5) season.awards.push('mvp');
          // Selke: defensivstarker Stürmer mit ordentlicher Offensive
          const selkeBonus = (st.rolle && st.rolle.w && st.rolle.w.selke) || 0;
          if (P.k !== 'D' && (dev.defensive || 0) > 74 && kante > 0.75 && r() < 0.4 + selkeBonus)
            season.awards.push('selke');
          if (season.plus >= 28 && kante > 0.8 && r() < 0.55) season.awards.push('plusminus');
          if (missed === 0 && season.gp === fullGp && r() < 0.5) season.awards.push('ironman');
        }
        if (kante > 0.62 && r() < 0.45) season.awards.push('allstar');
        if (kante > 1.15 && r() < 0.55) season.awards.push('allstar1');
        if (st.seasons.filter(s => league(s.lg).prestige >= 44).length === 0 && kante > 0.42)
          season.awards.push('rookie');
        if (missed > 16 && kante > 0.8 && r() < 0.35) season.awards.push('comeback');
      }
      /* Auszeichnungen tragen je Liga andere Namen –
         eine Hart Trophy gibt es nur in der NHL. */
      season.awards = [...new Set(season.awards)];
      const istNHL = club.lg === 'NHL';
      season.awards.forEach(a => {
        const A = D.AWARDS[a];
        const name = istNHL && A.nhl ? A.nhl : A.n + ' (' + lg.n + ')';
        addTrophy('aw_' + a + '_' + lg.k, name, A.pts, A.icon);
        season.events.push({ t: name, c: 'good' });
      });

      /* Europapokal und Traditionsturniere */
      const CHL_LIGEN = ['SHL','LII','NL','DEL','CZE'];
      if (CHL_LIGEN.includes(club.lg)){
        const chance = clamp((club.str - ligaSchnitt) / 42 + 0.04, 0.015, 0.28);
        if (r() < chance){
          addTrophy('int_chl', D.INTL.chl.n, D.INTL.chl.pts, D.INTL.chl.icon);
          season.events.push({ t: 'Champions Hockey League gewonnen', c: 'good' });
        }
      }
      if (club.lg === 'NL' && r() < 0.10){
        addTrophy('int_spengler', D.INTL.spengler.n, D.INTL.spengler.pts, D.INTL.spengler.icon);
        season.events.push({ t: 'Spengler Cup gewonnen', c: 'good' });
      }
      if (club.lg === 'NHL' && r() < 0.07){
        addTrophy('int_winter', D.INTL.winter.n, D.INTL.winter.pts, D.INTL.winter.icon);
        season.events.push({ t: 'Winter Classic unter freiem Himmel gewonnen', c: '' });
      }

      /* ---- Nationalmannschaft ----
         Keine Selbstverstaendlichkeit: Erst die Leistung entscheidet, ob der
         Verband anruft. Junge Spieler laufen ueber U18 und U20. */
      const natBonus = (player.wirkung || {}).natBonus || 0;
      const stufe = (() => {
        if (lg.k === 'JUN' && st.age > 20) return null;
        // Juniorenstufen
        if (st.age <= 18 && ovr >= 56 + (100 - nat.wm) * 0.10 - natBonus * 0.3) return 'U18';
        if (st.age <= 20 && ovr >= 64 + (100 - nat.wm) * 0.14 - natBonus * 0.3) return 'U20';
        // A-Nationalmannschaft: Wertung UND eine ueberzeugende Saison
        const schwelle = 78 + (100 - nat.wm) * 0.26 - natBonus * 0.45;
        const ueberzeugt = kante > 0.55 || season.awards.length > 0 || st.ruf > 86;
        return (ovr >= schwelle && ueberzeugt) ? 'A' : null;
      })();

      if (!stufe){
        if (st.age >= 21 && st.age <= 33 && lg.prestige >= 44 && !st.natDebuet)
          season.events.push({ t: 'Keine Nominierung für ' + nat.n, c: '' });
      } else {
        const olympia = stufe === 'A' && st.year % 4 === 0;
        const T = stufe === 'U18' ? D.TURNIERE.u18
                : stufe === 'U20' ? D.TURNIERE.u20
                : olympia ? D.TURNIERE.olympia : D.TURNIERE.wm;

        // Bei tiefem Playoff-Lauf verpasst man die A-WM
        const dabei = stufe !== 'A' || olympia || !season.title;
        if (dabei){
          if (!st.natDebuet){
            st.natDebuet = { jahr: st.year + 1, stufe };
            season.events.push({ t: 'Erste Nominierung: ' + T.n + ' mit ' + nat.n, c: 'good' });
          }
          const jugend = stufe !== 'A';
          const natPower = nat.wm + clamp((ovr - (jugend ? 68 : 82)) * 0.5, -8, 9) + (r() - 0.5) * 22;
          const spiele = T.spiele - (r() < 0.2 ? ri(r, 1, 2) : 0);

          const turnier = { jahr: st.year + 1, art: stufe.toLowerCase(), stufe,
                            n: T.n, kurz: T.kurz, gp: spiele };
          if (isG){
            turnier.sv = clamp(season.sv + (r() - 0.5) * 0.014, 0.855, 0.960);
            turnier.wins = Math.round(spiele * clamp(0.35 + (natPower - 80) / 60, 0.15, 0.85));
            turnier.so = r() < 0.25 ? 1 : 0;
          } else {
            const schnitt = (season.p / Math.max(1, season.gp)) * (0.85 + r() * 0.55);
            turnier.p = Math.max(0, Math.round(schnitt * spiele));
            turnier.g = Math.round(turnier.p * (P.goalRate / (P.goalRate + P.assistRate)));
            turnier.a = turnier.p - turnier.g;
          }

          const wurf = r() * 100;
          let platz = 'Vorrunde', medaille = null;
          const gold = jugend ? 88 : 93, silber = jugend ? 80 : 86, bronze = jugend ? 74 : 80;
          if (natPower > gold && wurf < 30){
            platz = 'Gold';
            medaille = stufe === 'U18' ? 'u18Gold' : stufe === 'U20' ? 'u20Gold'
                     : olympia ? 'olympia' : 'wm';
          } else if (natPower > silber && wurf < 55){
            platz = 'Silber';
            medaille = stufe === 'U18' ? 'u18Silber' : stufe === 'U20' ? 'u20Silber'
                     : olympia ? 'olySilber' : 'wmSilber';
          } else if (natPower > bronze && wurf < 75){
            platz = 'Bronze';
            medaille = stufe === 'U18' ? 'u18Bronze' : stufe === 'U20' ? 'u20Bronze'
                     : olympia ? 'olyBronze' : 'wmBronze';
          } else if (wurf < 88){ platz = 'Viertelfinale'; }
          turnier.platz = platz;

          if (medaille){
            const M = D.INTL[medaille];
            addTrophy('int_' + medaille, M.n, M.pts, M.icon, nat.n);
            st.laenderBilanz.medaillen++;
            season.events.push({ t: M.n + ' mit ' + nat.n, c: platz === 'Gold' ? 'good' : '' });
          } else {
            season.events.push({ t: T.n + ' mit ' + nat.n + ': ' + platz, c: '' });
          }

          if (stufe === 'A'){
            if (!isG && turnier.p >= spiele && r() < 0.35){
              addTrophy('int_wmAllstar', D.INTL.wmAllstar.n, D.INTL.wmAllstar.pts, D.INTL.wmAllstar.icon, nat.n);
              season.events.push({ t: T.kurz + '-All-Star-Team', c: 'good' });
            }
            if (platz === 'Gold' && kante > 1.0 && r() < 0.4){
              addTrophy('int_wmMvp', D.INTL.wmMvp.n, D.INTL.wmMvp.pts, D.INTL.wmMvp.icon, nat.n);
              season.events.push({ t: 'Wertvollster Spieler des Turniers', c: 'good' });
            }
          }

          st.laender.push(turnier);
          st.laenderBilanz.turniere++;
          const vorherGp = st.laenderBilanz.gp;
          st.laenderBilanz.gp += turnier.gp;
          if (stufe === 'A'){
            [25, 50, 100, 150].forEach(m => {
              if (vorherGp < m && st.laenderBilanz.gp >= m)
                season.events.push({ t: 'Meilenstein: ' + m + '. Länderspiel für ' + nat.n, c: 'good' });
            });
          }
          if (stufe === 'A') st.laenderBilanz.aSpiele = (st.laenderBilanz.aSpiele || 0) + turnier.gp;
          if (isG){ st.laenderBilanz.wins += turnier.wins || 0; st.laenderBilanz.so += turnier.so || 0; }
          else {
            st.laenderBilanz.g += turnier.g || 0;
            st.laenderBilanz.a += turnier.a || 0;
            st.laenderBilanz.p += turnier.p || 0;
          }
          season.nat = turnier;
        }
      }

      /* ---- Hoehepunkt der Saison ---- */
      (() => {
        const gegner = clubsOf(club.lg).filter(c => c.n !== club.n);
        if (!gegner.length) return;
        const g = pick(r, gegner);
        const liste = isG ? D.HOEHEPUNKTE.goalie : D.HOEHEPUNKTE.skater;
        // Massstab: wie stark war die Saison im Verhaeltnis zur Liga?
        const stufe = clamp(Math.round(kante * 3.4 + (r() - 0.4) * 1.6), 0, 5);
        const vorlage = liste.find(x => x.ab <= stufe) || liste[liste.length - 1];
        season.hoehepunkt = { t: vorlage.t.replace('{gegner}', g.n), gegner: g.n, stufe };
      })();

      /* ---- Kapitaensamt: wird angeboten, nicht verordnet ---- */
      if (!st.kapitaenSeit && !st.kapitaenGefragt && st.klubJahre >= 2 && st.age >= 25
          && kante > 0.65 && lg.k !== 'JUN' && r() < 0.55){
        st.kapitaensfrage = { klub: club.n, jahr: st.year };
      }
      if (st.kapitaenSeit === club.n) season.kapitaen = true;

      /* ---- Erzaehlung der Saison ---- */
      if (st.klubJahre === 0 && lg.k !== 'JUN') season.story = pick(r, D.STORY.ankunft);
      else if (kante > 1.1 && r() < 0.55)       season.story = pick(r, D.STORY.gut);
      else if (kante < 0.3 && r() < 0.55)       season.story = pick(r, D.STORY.schlecht);
      else if (r() < 0.35)                      season.story = pick(r, D.STORY.neutral);
      st.klubJahre++;

      season.salary = round1(clamp((ovr - 58) * 0.5, 0.05, 15) * lg.salary + 0.05);
      season.marktwert = marktwert(ovr, st.age);
      st.formBonus *= 0.5;          // Nachwirkung klingt ab
      st.risikoBonus *= 0.5;
      st.moral = clamp(st.moral + (season.title ? 6 : (season.playoffs ? 2 : -3)), 10, 100);
      st.ereignisGeprueft = false;  // im nächsten Jahr wieder möglich
      st.wechselGeprueft = false;

      /* Laufende Summen + Meilensteine */
      const vorher = { ...st.lauf };
      st.lauf.gp += season.gp || 0;
      st.lauf.g  += season.g || 0;
      st.lauf.a  += season.a || 0;
      st.lauf.p  += season.p || 0;
      st.lauf.wins += season.wins || 0;
      st.lauf.so += season.so || 0;
      st.lauf.pim += season.pim || 0;
      st.lauf.gehalt = round1(st.lauf.gehalt + season.salary);
      Object.entries(MEILEN).forEach(([k, marken]) => {
        marken.forEach(m => {
          if (vorher[k] < m && st.lauf[k] >= m)
            season.events.push({ t: 'Meilenstein: ' + m + '. ' + MEILEN_TEXT[k] +
                                   (k === 'so' || k === 'wins' ? '' : ''), c: 'good' });
        });
      });

      if (st.wechselVon){ season.wechselVon = st.wechselVon; st.wechselVon = null; }
      werteSaisonZiel(season);
      st.seasons.push(season);
      st.ruf = st.ruf * 0.5 + (ovr + season.awards.length * 3 + (season.title ? 4 : 0)) * 0.5;

      /* Entry Draft: einmalig im Sommer nach der Saison mit 18 */
      if (!st.entryDraft && st.age === 18){
        const potenzial = overall(player, devAttrs(player.attrs,
          formFactor(st.scheitel, player.traits, (player.wirkung || {}).lernkurve, st.scheitel)));
        const wert = potenzial + (season.p || season.wins || 0) * 0.10 + (r() - 0.5) * 12;
        let runde = 0, pick2 = 0, klub = null;
        if (wert > 70){
          runde = wert > 88 ? 1 : wert > 82 ? ri(r, 1, 2) : wert > 76 ? ri(r, 2, 4) : ri(r, 4, 7);
          pick2 = ri(r, 1, 32);
          const nhl = clubsOf('NHL').slice().sort((a, b) => a.str - b.str);
          klub = nhl[clamp(Math.round((pick2 - 1) * (nhl.length / 32)), 0, nhl.length - 1)];
          st.ruf = clamp(st.ruf + (runde === 1 ? 10 : runde <= 3 ? 5 : 2), 20, 95);
          season.events.push({ t: 'Entry Draft: Runde ' + runde + ', Position ' + pick2
                                 + ' – ' + klub.n, c: 'good' });
        } else {
          season.events.push({ t: 'Im Entry Draft nicht gezogen', c: 'bad' });
        }
        st.entryDraft = { runde, pick: pick2, klub: klub ? klub.n : null, ungezogen: !runde };

        /* Ein Spieler desselben Jahrgangs, an dem du dich messen wirst.
           Seine Laufbahn wird einmal vorausberechnet – dabei darf er selbst
           keinen weiteren Rivalen bekommen. */
        if (!rivaleWirdErzeugt){
          rivaleWirdErzeugt = true;
          try { erzeugeJahrgang(season); }
          finally { rivaleWirdErzeugt = false; }
        }
      }

      /* Stand im eigenen Jahrgang – erst ab dem Draft vergleichbar */
      if (st.jahrgang.length){
        season.jahrgang = jahrgangStand();
        season.jahrgangDelta = st.jahrgangDelta;
        const je = st.jahrgangEreignis;
        if (je){
          const wen = je.namen.slice(0, 2).join(' und ');
          season.events.push(je.art === 'vorbei'
            ? { t: 'Im Jahrgang an ' + wen + ' vorbeigezogen – jetzt Platz ' + je.platz, c: 'good' }
            : { t: wen + ' hat dich im Jahrgang überholt – zurück auf Platz ' + je.platz, c: 'bad' });
        }
      }

      /* Sommerpause: erst Training, danach die Vertragsfrage */
      st.age++; st.year++;
      if (st.age > maxAge){ ende('ruhestand', 'mit ' + (st.age - 1)); return season; }
      st.training = trainingsOptionen(player, st.age, player.seed + ':train:' + st.age,
                                      (player.wirkung || {}).training || 0);
      return season;
    }

    /* ---- Sommertraining wählen ---- */
    function chooseTraining(index){
      if (!st.training) return false;
      const opt = st.training[clamp(index, 0, st.training.length - 1)];
      trainingAnwenden(player, opt);
      const letzte = st.seasons[st.seasons.length - 1];
      letzte.events.push({ t: 'Sommertraining: ' + opt.titel, c: '' });
      st.training = null;
      vertragspruefung(letzte);
      return true;
    }

    function autoTraining(){
      if (!st.training) return false;
      const w = pos(player.pos).w;
      const bewertet = st.training.map((o, i) => ({
        i, s: o.art === 'attr' ? o.wert * (w[o.k] || 1) * 2.2 : o.wert * 1.2 + r() * 3
      })).sort((a, b) => b.s - a.s);
      return chooseTraining(bewertet[0].i);
    }

    /* ---- Läuft der Vertrag weiter oder kommen Angebote? ---- */
    function vertragspruefung(season){
      const naechsterOvr = overall(player, devAttrs(player.attrs, formFactor(st.age, player.traits, (player.wirkung || {}).lernkurve, st.scheitel)));
      const bewertung = Math.max(naechsterOvr, st.ruf * 0.5 + naechsterOvr * 0.5);
      if (st.age >= 25 && bewertung < VERTRAG_MIN){ ende('vertraglos'); return; }

      /* Hoert der Spieler freiwillig auf? */
      const verschleiss = st.verletzungsjahre || 0;
      const chance = ruecktrittsChance(st.age, naechsterOvr, player.traits.langlebig, verschleiss);
      if (r() < chance){
        /* Ab hier entscheidest du selbst – und wirst danach jedes Jahr neu gefragt. */
        st.ruecktrittsfrage = {
          alter: st.age,
          ovr: naechsterOvr,
          verschleiss,
          zusatzjahre: st.zusatzjahre,
          grund: verschleiss >= 3 && st.age < 33 ? 'verschleiss' : 'ruhestand',
          // Was ein weiteres Jahr kostet
          abbau: Math.round((3 + st.zusatzjahre * 1.6 + verschleiss * 0.8) * 10) / 10,
          risiko: Math.round((6 + st.zusatzjahre * 3 + verschleiss * 2))
        };
        return;
      }

      /* Weitere Wege, wie eine Laufbahn endet */
      const letzte = st.seasons[st.seasons.length - 1];
      const verletzungsRisiko = clamp(0.015 + (st.age - 28) * 0.007
                                      - (player.traits.robust || 0) * 0.0012, 0, 0.10);
      if (st.age >= 26 && r() < verletzungsRisiko){ ende('verletzung'); return; }
      if (letzte && letzte.title && st.age >= 33 && r() < 0.22){ ende('hoehepunkt'); return; }
      if (st.age >= 34 && r() < 0.06){ ende('familie'); return; }
      if (st.age >= 34 && st.club.lg !== HOME_LG[player.nation]
          && bewertung < LG_MIN[st.club.lg] + 2 && r() < 0.12){ ende('heimkehr'); return; }

      /* Wann kommt der Spieler überhaupt auf den Markt? */
      st.vertragJahre--;
      const aktuelleLiga = league(st.club.lg);
      const zuSchwach = bewertung < LG_MIN[st.club.lg] - 6;
      const zuGross = D.LEAGUES.some(l =>
        l.k !== 'JUN' && l.prestige >= aktuelleLiga.prestige + 30 && bewertung >= LG_MIN[l.k]);
      const juniorEnde = st.club.lg === 'JUN' && st.age > 20;

      let grund = null;
      if (juniorEnde)         grund = 'Die Juniorenzeit ist vorbei.';
      else if (zuSchwach)     grund = 'Der Klub löst den Vertrag auf – die Leistung reicht nicht mehr.';
      else if (zuGross)       grund = 'Ein größerer Klub klopft an und kauft dich aus dem Vertrag.';
      else if (st.vertragJahre <= 0) grund = 'Dein Vertrag läuft aus.';

      if (!grund){
        season.events.push({ t: 'Vertrag läuft noch ' + st.vertragJahre +
          (st.vertragJahre === 1 ? ' Jahr' : ' Jahre'), c: '' });
        return;
      }
      st.angebotsGrund = grund;
      st.angebote = macheAngebote(bewertung);
    }

    /* Angebote erzeugen, ohne die uebrigen Pruefungen zu wiederholen */
    function vertragsangebote(bewertung, season){
      st.vertragJahre = 0;
      st.angebotsGrund = 'Nach der Rücktrittsentscheidung wird neu verhandelt.';
      st.angebote = macheAngebote(bewertung);
    }

    function ende(schluessel, zusatz){
      const E = D.ENDEN[schluessel] || D.ENDEN.ruhestand;
      st.fertig = true;
      st.endeArt = schluessel;
      st.grund = E.n + (zusatz ? ' – ' + zusatz : '');
      st.endeText = E.t;
      st.angebote = null;
      st.training = null;
      const letzte = st.seasons[st.seasons.length - 1];
      if (letzte) letzte.events.push({ t: E.n, c: schluessel === 'verletzung' ? 'bad' : '' });
    }

    /* ---- Transferangebote zusammenstellen ---- */
    function macheAngebote(bewertung){
      const aktuell = st.club;
      let moeglicheLigen = D.LEAGUES.filter(l => {
        if (l.k === 'JUN') return st.age <= 20;
        const bonus = l.k === homeLg ? 4 + ((player.wirkung || {}).heimbonus || 0) * 0.4 : 0;
        return bewertung >= LG_MIN[l.k] - bonus;
      });
      if (!moeglicheLigen.length) moeglicheLigen = [league(st.age <= 20 ? 'JUN' : 'AHL')];

      const angebote = [];
      const nimm = (club, bleibt) => {
        if (angebote.some(a => a.club.n === club.n)) return;
        const lg = league(club.lg);
        const schnitt = lgAvgStr(club.lg);
        const rolle = club.str >= schnitt + 6 ? 'Titelkandidat'
                    : club.str >= schnitt ? 'Playoff-Team'
                    : club.str >= schnitt - 6 ? 'Mittelfeld' : 'Aufbauteam';
        // Laufzeit: junge und starke Spieler bekommen längere Vertraege
        let jahre;
        if (st.age >= 34)      jahre = 1;
        else if (st.age >= 31) jahre = ri(r, 1, 2);
        else if (st.age <= 21) jahre = ri(r, 2, 3);
        else                   jahre = ri(r, 2, 4);
        angebote.push({
          club, lgKey: club.lg, lgName: lg.n, bleibt: !!bleibt, rolle,
          staerke: club.str, jahre,
          gehalt: round1(clamp((bewertung - 58) * 0.5, 0.05, 15) * lg.salary * (bleibt ? 1.05 : 1) + 0.05),
          prestige: lg.prestige
        });
      };

      // 1. Verbleib, sofern die aktuelle Liga noch reicht
      const bleibtMoeglich = moeglicheLigen.some(l => l.k === aktuell.lg) && r() < 0.85;
      if (bleibtMoeglich) nimm(aktuell, true);

      // 2. Zwei bis drei Angebote aus den erreichbaren Ligen
      const gewichtet = moeglicheLigen.map(l => ({
        l, s: l.prestige + (l.k === homeLg ? 24 : 0) + (l.k === aktuell.lg ? 10 : 0) + r() * 30
      })).sort((a, b) => b.s - a.s);

      for (const g of gewichtet){
        if (angebote.length >= 3) break;
        const pool = clubsOf(g.l.k).filter(c => c.n !== aktuell.n);
        if (!pool.length) continue;
        const sortiert = pool.slice().sort((a, b) => b.str - a.str);
        const spanne = clamp((bewertung - LG_MIN[g.l.k]) / 18, 0.2, 1);
        const band = sortiert.slice(0, Math.max(1, Math.round(sortiert.length * spanne)));
        nimm(pick(r, band), false);
      }
      if (!angebote.length) nimm(aktuell, true);
      return angebote;
    }

    /* Trainer und engster Mitspieler beim aktuellen Klub */
    function umfeldBenennen(){
      const rr = rng(player.seed + ':umfeld:' + (st.club ? st.club.n : '') + ':' + st.year);
      st.trainer = pick(rr, D.FIRST) + ' ' + pick(rr, D.LAST);
      let m = pick(rr, D.FIRST) + ' ' + pick(rr, D.LAST);
      let versuch = 0;
      while (m === player.name && versuch++ < 5) m = pick(rr, D.FIRST) + ' ' + pick(rr, D.LAST);
      st.mitspieler = m;
    }

    /* ---- Angebot annehmen ---- */
    function choose(index){
      if (!st.angebote) return false;
      const a = st.angebote[clamp(index, 0, st.angebote.length - 1)];
      const letzte = st.seasons[st.seasons.length - 1];
      const dauer = a.jahre + (a.jahre === 1 ? ' Jahr' : ' Jahre');
      if (!a.bleibt){
        const vorher = league(st.club.lg), nachher = league(a.club.lg);
        const wort = nachher.prestige > vorher.prestige ? 'Aufstieg zu '
                   : (nachher.prestige < vorher.prestige ? 'Wechsel nach unten zu ' : 'Wechsel zu ');
        letzte.events.push({ t: wort + a.club.n + ' (' + nachher.n + ', ' + dauer + ')', c: '' });
      } else {
        letzte.events.push({ t: 'Vertrag bei ' + a.club.n + ' um ' + dauer + ' verlängert', c: '' });
      }
      if (!a.bleibt){
        if (st.club && st.club.n !== a.club.n && !st.ehemalige.includes(st.club.n))
          st.ehemalige.push(st.club.n);
        st.klubJahre = 0;
        if (st.kapitaenSeit !== a.club.n) st.kapitaenSeit = null;
        st.club = a.club;          // fuer die Namensvergabe schon setzen
        umfeldBenennen();
      }
      st.entscheidungen.push(a.club.n);
      st.vertragJahre = a.jahre;
      // Die Rolle wird bei einem Wechsel neu verhandelt – bei einer Verlaengerung
      // bleibt sie bestehen, sofern schon eine festgelegt wurde.
      if (!a.bleibt || !st.rolle){
        st.rollenwahl = (isG ? D.ROLLEN_G : D.ROLLEN).map(x => Object.assign({}, x, {
          gehalt: Math.round(a.gehalt * (x.w.gehalt || 1) * 100) / 100
        }));
      }
      st.angebote = null;
      st.angebotsGrund = null;
      return true;
    }

    /* ---- Weitermachen oder aufhoeren? ---- */
    function entscheideRuecktritt(weiter){
      if (!st.ruecktrittsfrage) return false;
      const f = st.ruecktrittsfrage;
      st.ruecktrittsfrage = null;
      if (!weiter){ ende(f.grund, 'mit ' + (st.age - 1)); return true; }

      /* Ein weiteres Jahr fordert seinen Preis: Der Koerper baut ab,
         das Verletzungsrisiko steigt, die Angebote werden duenner. */
      st.zusatzjahre++;
      const abzug = f.abbau / 100;
      Object.keys(player.attrs).forEach(k => {
        player.attrs[k] = clamp(Math.round(player.attrs[k] * (1 - abzug)), 1, 99);
      });
      st.risikoBonus += f.risiko / 100;
      const letzte = st.seasons[st.seasons.length - 1];
      if (letzte) letzte.events.push({
        t: 'Ein weiteres Jahr drangehängt (' + st.zusatzjahre + '.)', c: '' });

      /* Danach normal weiter mit der Vertragsfrage */
      const naechsterOvr = overall(player, devAttrs(player.attrs,
        formFactor(st.age, player.traits, (player.wirkung || {}).lernkurve, st.scheitel)));
      const bewertung = Math.max(naechsterOvr, st.ruf * 0.5 + naechsterOvr * 0.5);
      if (bewertung < VERTRAG_MIN){ ende('vertraglos'); return true; }
      vertragsangebote(bewertung, letzte);
      return true;
    }

    /* ---- Rolle im Team festlegen ---- */
    function waehleRolle(index){
      if (!st.rollenwahl) return false;
      const gewaehlt = st.rollenwahl[clamp(index, 0, st.rollenwahl.length - 1)];
      st.rolle = gewaehlt;
      const letzte = st.seasons[st.seasons.length - 1];
      if (letzte) letzte.events.push({ t: 'Rolle im Team: ' + gewaehlt.n, c: '' });
      if (gewaehlt.w && gewaehlt.w.moral) st.moral = clamp(st.moral + gewaehlt.w.moral, 10, 100);
      if (gewaehlt.w && gewaehlt.w.playoff)
        player.traits.playoff = (player.traits.playoff || 0) + gewaehlt.w.playoff;
      st.rollenwahl = null;
      return true;
    }
    function autoRolle(){
      if (!st.rollenwahl) return false;
      const bewertet = st.rollenwahl.map((x, i) => ({ i,
        s: (x.w.punkte || 0) * 60 + (x.w.plus || 0) * 0.6 + (x.w.anteil || 0) * 90
           - (x.w.risiko || 0) * 120 + r() * 8 })).sort((a, b) => b.s - a.s);
      return waehleRolle(bewertet[0].i);
    }

    /* ---- Kapitaensamt annehmen oder ablehnen ---- */
    function entscheideKapitaen(annehmen){
      if (!st.kapitaensfrage) return false;
      const k = st.kapitaensfrage;
      const letzte = st.seasons[st.seasons.length - 1];
      st.kapitaenGefragt = true;
      if (annehmen){
        st.kapitaenSeit = k.klub;
        st.moral = clamp(st.moral + 8, 10, 100);
        st.ruf = clamp(st.ruf + 4, 20, 99);
        player.traits.playoff = (player.traits.playoff || 0) + 4;
        if (letzte){
          letzte.kapitaen = true;
          letzte.events.push({ t: 'Kapitän von ' + k.klub, c: 'good' });
          letzte.story = pick(r, D.STORY.kapitaen);
        }
      } else if (letzte){
        letzte.events.push({ t: 'Kapitänsamt abgelehnt', c: '' });
        st.moral = clamp(st.moral - 3, 10, 100);
        st.formBonus += 0.04;
      }
      st.kapitaensfrage = null;
      return true;
    }

    /* ---- Angebot automatisch waehlen ---- */
    function autoChoose(){
      if (!st.angebote) return false;
      const bewertet = st.angebote.map((a, i) => ({
        i, s: a.prestige + (a.lgKey === homeLg ? 20 : 0) + (a.bleibt ? 16 : 0)
              + (a.staerke - 70) * 0.6 + r() * 22
      })).sort((a, b) => b.s - a.s);
      return choose(bewertet[0].i);
    }

    /* Der Berater haengt nur an, wenn es sich sportlich noch lohnt */
    function autoWeiter(){
      const f = st.ruecktrittsfrage;
      if (!f) return false;
      return f.ovr >= 78 && f.zusatzjahre < 3 && f.verschleiss < 3 && r() < 0.6;
    }

    function runToEnd(maxSchritte){
      let n = 0;
      while (!st.fertig && n++ < (maxSchritte || 120)){
        if (st.jugend) waehleJugend(0);
        if (st.ereignis) chooseEreignis(0);
        if (st.wechselfrist) entscheideWechselfrist(0);
        if (st.kapitaensfrage) entscheideKapitaen(true);
        if (st.ruecktrittsfrage) entscheideRuecktritt(autoWeiter());
        playSeason();
        if (st.training) autoTraining();
        if (st.angebote) autoChoose();
        if (st.rollenwahl) autoRolle();
      }
      return result();
    }

    /* ---- Endergebnis ---- */
    function result(){
      const seasons = st.seasons;
      const totals = seasons.reduce((t, s) => {
        t.gp += s.gp || 0;
        t.pim += s.pim || 0;
        t.gehalt += s.salary || 0;
        t.poGp += s.poSpiele || 0;
        t.poP += s.poP || 0; t.poG += s.poG || 0; t.poA += s.poA || 0;
        t.poWins += s.poWins || 0;
        t.serien += (s.playoffSerien || []).length;
        t.serienGewonnen += (s.playoffSerien || []).filter(x => x.gewonnen).length;
        if (isG){
          t.wins += s.wins || 0; t.so += s.so || 0;
          t.losses += s.losses || 0; t.otl += s.otl || 0;
          t.saves += s.saves || 0; t.shotsAgainst += s.shotsAgainst || 0; t.ga += s.ga || 0;
          t.svSum += (s.sv || 0) * (s.gp || 0); t.gaaSum += (s.gaa || 0) * (s.gp || 0);
        } else {
          t.g += s.g || 0; t.a += s.a || 0; t.p += s.p || 0;
          t.ppg += s.ppg || 0; t.shg += s.shg || 0; t.gwg += s.gwg || 0;
          t.shots += s.shots || 0; t.plus += s.plus || 0;
        }
        return t;
      }, { gp:0, g:0, a:0, p:0, wins:0, so:0, pim:0, gehalt:0, svSum:0, gaaSum:0,
           losses:0, otl:0, saves:0, shotsAgainst:0, ga:0,
           ppg:0, shg:0, gwg:0, shots:0, plus:0,
           poGp:0, poP:0, poG:0, poA:0, poWins:0, serien:0, serienGewonnen:0 });
      totals.shotPct = totals.shots ? Math.round(totals.g / totals.shots * 1000) / 10 : 0;
      totals.ppg100 = totals.gp ? Math.round(totals.p / totals.gp * 100) / 100 : 0;

      /* Karrierebestwerte je Kategorie */
      const bestwert = (feld) => seasons.reduce((b, s) =>
        (s[feld] || 0) > (b ? b[feld] : -1) ? s : b, null);
      const rekorde = isG
        ? { wins: bestwert('wins'), so: bestwert('so'), gp: bestwert('gp') }
        : { g: bestwert('g'), a: bestwert('a'), p: bestwert('p'), plus: bestwert('plus') };
      if (isG && totals.gp){ totals.sv = totals.svSum / totals.gp; totals.gaa = totals.gaaSum / totals.gp; }
      totals.gehalt = round1(totals.gehalt);

      /* Bilanz je Verein – in der Reihenfolge der Karriere */
      const klubs = [];
      seasons.forEach(x => {
        let k = klubs.find(y => y.n === x.club);
        if (!k){
          k = { n: x.club, lg: x.lg, lgName: x.lgName, saisons: 0, gp: 0, g: 0, a: 0, p: 0,
                wins: 0, so: 0, titel: 0, vonJahr: x.year, bisJahr: x.year };
          klubs.push(k);
        }
        k.saisons++; k.bisJahr = x.year;
        k.gp += x.gp || 0;
        if (isG){ k.wins += x.wins || 0; k.so += x.so || 0; }
        else { k.g += x.g || 0; k.a += x.a || 0; k.p += x.p || 0; }
        if (x.title) k.titel++;
      });

      /* Bilanz je Liga – zeigt, wo eine Laufbahn wirklich stattgefunden hat */
      const ligen = [];
      seasons.forEach(x => {
        let l = ligen.find(y => y.k === x.lg);
        if (!l){
          l = { k: x.lg, n: x.lgName, saisons: 0, gp: 0, g: 0, a: 0, p: 0,
                wins: 0, so: 0, pim: 0, titel: 0, ehrungen: 0,
                svSum: 0, gaaSum: 0, bestOvr: 0, vonJahr: x.year, bisJahr: x.year };
          ligen.push(l);
        }
        l.saisons++; l.bisJahr = x.year;
        l.gp += x.gp || 0;
        l.pim += x.pim || 0;
        l.bestOvr = Math.max(l.bestOvr, x.ovr || 0);
        l.ehrungen += (x.awards || []).length;
        if (x.title) l.titel++;
        if (isG){
          l.wins += x.wins || 0; l.so += x.so || 0;
          l.svSum += (x.sv || 0) * (x.gp || 0); l.gaaSum += (x.gaa || 0) * (x.gp || 0);
        } else { l.g += x.g || 0; l.a += x.a || 0; l.p += x.p || 0; }
      });
      ligen.forEach(l => {
        if (isG && l.gp){ l.sv = l.svSum / l.gp; l.gaa = l.gaaSum / l.gp; }
        l.ppg = l.gp ? Math.round((isG ? l.wins : l.p) / l.gp * 100) / 100 : 0;
        l.prestige = league(l.k) ? league(l.k).prestige : 0;
      });
      ligen.sort((a, b) => b.prestige - a.prestige);

      const trophyList = Object.values(st.trophies).sort((a, b) => b.pts * b.x - a.pts * a.x);
      const trophyPts = trophyList.reduce((s, t) => s + t.pts * t.x, 0);
      const profi = seasons.filter(s => league(s.lg).prestige >= 14);
      const prodPts = isG
        ? profi.reduce((s, x) => s + (x.wins || 0), 0) * 0.20 + profi.reduce((s, x) => s + (x.so || 0), 0) * 1.2
        : profi.reduce((s, x) => s + (x.p || 0), 0) * 0.15;
      const legacy = Math.round(trophyPts + prodPts + Math.max(0, st.peak - 60) * 3.2 + profi.length * 2);

      /* Was von dieser Laufbahn bleibt */
      const vermaechtnis = [];
      const nimm = id => {
        const v = D.VERMAECHTNIS.find(x => x.id === id);
        if (v && !vermaechtnis.some(x => x.id === id)) vermaechtnis.push(v);
      };
      const hauptklub = klubs.slice().sort((a, b) => b.saisons - a.saisons)[0];
      if (legacy >= 1700) nimm('statue');
      if (legacy >= 1300) nimm('hof');
      if (hauptklub && hauptklub.saisons >= 7 && (hauptklub.titel > 0 || legacy >= 1050)) nimm('nummer');
      if (st.kapitaenSeit && legacy >= 870) nimm('kapitaen');
      if (legacy >= 870 && st.peak >= 84) nimm('legende');
      if (seasons.length >= 14 && legacy >= 700) nimm('trainer');
      if (hauptklub && hauptklub.saisons >= 9) nimm('nachwuchs');
      // Juniorenjahre zaehlen nicht als beste Saison – zu schwache Gegner
      const bewertbar = seasons.filter(s => s.lg !== 'JUN');
      const besteSaison = (bewertbar.length ? bewertbar : seasons).slice().sort((a, b) =>
        (isG ? (b.wins || 0) - (a.wins || 0) : (b.p || 0) - (a.p || 0)))[0] || null;

      return {
        player, seasons, totals, isG,
        trophies: trophyList,
        peak: st.peak, peakAttrs: st.peakAttrs || player.attrs,
        besteSaison, rekorde, klubs, ligen, vermaechtnis,
        rivale: st.rivale,
        jahrgang: st.jahrgang,
        jahrgangStand: st.jahrgangStand,
        jahrgangDelta: st.jahrgangDelta,
        ziele: st.ziele,
        ehemalige: st.ehemalige,
        zielBilanz: st.zielBilanz,
        hauptklub: klubs.slice().sort((a, b) => b.saisons - a.saisons)[0] || null,
        entscheidungen: st.entscheidungen,
        verlauf: st.verlauf,
        retireAge: Math.max(18, st.age - 1),
        grund: st.grund,
        endeArt: st.endeArt,
        endeText: st.endeText,
        laender: st.laender,
        laenderBilanz: st.laenderBilanz,
        natDebuet: st.natDebuet,
        entryDraft: st.entryDraft,
        rolle: st.rolle,
        trainer: st.trainer,
        mitspieler: st.mitspieler,
        freigeschaltet: st.freigeschaltet,
        strangNamen: st.strangNamen,
        zusatzjahre: st.zusatzjahre,
        scheitel: Math.round(st.scheitel),
        kapitaenSeit: st.kapitaenSeit,
        moral: Math.round(st.moral),
        erlebt: st.erlebt,
        marktwertMax: Math.max(0, ...st.seasons.map(x => x.marktwert || 0)),
        legacy,
        rank: legacyRank(legacy)
      };
    }

    st.jugend = macheJugendangebote();

    return {
      st,
      get fertig(){ return st.fertig; },
      get angebote(){ return st.angebote; },
      get training(){ return st.training; },
      get ereignis(){ return st.ereignis; },
      get wechselfrist(){ return st.wechselfrist; },
      /* Die Vorgaben fuer die naechste Saison – sichtbar, bevor gespielt wird */
      get kommendeZiele(){
        if (st.fertig || !st.club) return null;
        return setzeSaisonZiel(st.club);
      },
      get jugend(){ return st.jugend; },
      get rollenwahl(){ return st.rollenwahl; },
      get kapitaensfrage(){ return st.kapitaensfrage; },
      get ruecktrittsfrage(){ return st.ruecktrittsfrage; },
      get letzteSaison(){ return st.seasons[st.seasons.length - 1] || null; },
      maxAge,
      playSeason, choose, autoChoose, chooseTraining, autoTraining,
      entscheideWechselfrist,
      waehleJugend, chooseEreignis, waehleRolle, autoRolle, entscheideKapitaen,
      entscheideRuecktritt, autoWeiter,
      runToEnd, result
    };
  }

  /* Komplettdurchlauf ohne Eingriff – fuer Schnellkarriere, Markt und Tests */
  function simulate(player){
    return createCareer(player).runToEnd();
  }

  /* ---------------- Einordnung ---------------- */
  function legacyRank(v){
    if (v >= 1700) return { n:'Unsterblich', c:'gold', d:'Ein Name, den man in hundert Jahren noch kennt.' };
    if (v >= 1300) return { n:'Hall of Fame', c:'gold', d:'Trikot unter dem Hallendach, Platz in der Ruhmeshalle.' };
    if (v >= 1050) return { n:'Franchise-Ikone', c:'', d:'Ein Klub hat eine Ära nach dir benannt.' };
    if (v >= 870) return { n:'Topstar', c:'', d:'Jahrelang erste Reihe, erste Wahl, erste Schlagzeile.' };
    if (v >= 700) return { n:'Leistungsträger', c:'', d:'Solide Karriere in starken Ligen.' };
    if (v >= 540) return { n:'Profi', c:'', d:'Ein ehrliches Eishockeyleben.' };
    return { n:'Journeyman', c:'', d:'Viele Busfahrten, wenig Rampenlicht.' };
  }
  const RANG_SCHWELLEN = [
    ['Unsterblich', 1700], ['Hall of Fame', 1300], ['Franchise-Ikone', 1050],
    ['Topstar', 870], ['Leistungsträger', 700], ['Profi', 540]
  ];

  /* ---------------- Herausforderungen ---------------- */
  const HKEY = 'puckero.herausforderungen';
  function ladeHerausforderungen(){
    try { return JSON.parse(localStorage.getItem(HKEY) || '{}'); }
    catch(e){ return {}; }
  }
  function pruefeHerausforderungen(res){
    return (D.HERAUSFORDERUNGEN || []).filter(h => {
      try { return !!h.pruef(res); } catch(e){ return false; }
    }).map(h => h.id);
  }
  /* Speichert neu erreichte Ziele und gibt genau diese zurueck */
  function werteHerausforderungen(res){
    const erfuellt = pruefeHerausforderungen(res);
    const stand = ladeHerausforderungen();
    const neue = erfuellt.filter(id => !stand[id]);
    if (neue.length){
      neue.forEach(id => stand[id] = { t: Date.now(), name: res.player.name });
      try { localStorage.setItem(HKEY, JSON.stringify(stand)); } catch(e){}
    }
    return neue;
  }
  function clearHerausforderungen(){ try { localStorage.removeItem(HKEY); } catch(e){} }

  /* ---------------- Speicher ---------------- */
  const KEY = 'puckero.karrieren';
  function saveCareer(result){
    try{
      const list = loadCareers();
      list.unshift({
        t: Date.now(),
        name: result.player.name,
        pos: result.player.pos,
        nation: result.player.nation,
        num: result.player.num,
        peak: result.peak,
        legacy: result.legacy,
        rank: result.rank.n,
        seasons: result.seasons.length,
        titles: result.trophies.reduce((s, x) => s + x.x, 0),
        p: result.isG ? result.totals.wins : result.totals.p,
        isG: result.isG,
        seed: result.player.seed
      });
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, 60)));
    } catch(e){ /* Speicher nicht verfügbar */ }
    return werteHerausforderungen(result);
  }
  function loadCareers(){
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch(e){ return []; }
  }
  function clearCareers(){ try { localStorage.removeItem(KEY); } catch(e){} }

  /* ---------------- Zufallsspieler ---------------- */
  function randomIdentity(r){
    return {
      name: pick(r, D.FIRST) + ' ' + pick(r, D.LAST),
      num: ri(r, 1, 97),
      nation: pick(r, D.NATIONS).k,
      pos: pick(r, D.POSITIONS).k
    };
  }

  return {
    rng, hashSeed, ri, pick, shuffle, clamp, round1,
    pos, nation, league, clubsOf, attrsOf, lgAvgStr,
    newPlayer, autoDraft,
    draftFrage, applyKarte, karteWert, wirkungNeu,
    overall, formFactor, devAttrs,
    createCareer, simulate, legacyRank, RANG_SCHWELLEN, marktwert,
    saveCareer, loadCareers, clearCareers, randomIdentity,
    ladeHerausforderungen, pruefeHerausforderungen, werteHerausforderungen, clearHerausforderungen,
    trainingsOptionen, trainingAnwenden,
    DRAFT_ROUNDS, MAX_SKIPS, LG_MIN, HOME_LG, D
  };
})();

if (typeof window !== 'undefined') window.PUCKERO = PUCKERO;
