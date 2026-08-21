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

  function draftOptions(player, round, skipStufe){
    const r = rng(player.seed + ':draft:' + round + ':' + (skipStufe || 0));
    const taken = new Set(player.picks.map(x => x.id));
    const pool = D.LEGENDS.filter(l => l.pos.includes(player.pos) && !taken.has(l.id));
    return shuffle(r, pool).slice(0, 3);
  }

  function applyPick(player, legend){
    const growth = {};
    Object.entries(legend.b).forEach(([k, v]) => {
      if (player.attrs[k] === undefined) return;
      const before = player.attrs[k];
      player.attrs[k] = clamp(before + v, 1, 99);
      growth[k] = player.attrs[k] - before;
    });
    Object.entries(legend.extra || {}).forEach(([k, v]) => {
      player.traits[k] = (player.traits[k] || 0) + v;
    });
    player.picks.push({ id: legend.id, n: legend.n, tag: legend.tag, growth });
    return player;
  }

  function pickValue(player, legend){
    const w = pos(player.pos).w;
    let s = 0;
    Object.entries(legend.b).forEach(([k, v]) => {
      if (w[k] !== undefined) s += v * w[k];
    });
    return s;
  }

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
  function formFactor(age, traits, lernkurve){
    const t = traits || {};
    const lk = (lernkurve || 0) * 0.004;
    const peak = 27 - (t.jung || 0) * 0.06 + (t.langlebig || 0) * 0.05;
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
      out[k] = clamp(Math.round(v * form * 1.25), 1, 99);
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
      laenderBilanz: { gp:0, g:0, a:0, p:0, wins:0, so:0, turniere:0, medaillen:0 },
      vertragJahre: 2,        // Restlaufzeit des aktuellen Vertrags
      fertig: false,
      grund: null,
      angebote: null,
      angebotsGrund: null,
      training: null
    };

    st.jugend = null;   // wird direkt nach der Initialisierung gefuellt

    const maxAge = clamp(32
                      + Math.round((player.traits.langlebig || 0) * 0.15)
                      - Math.round((player.traits.jung || 0) * 0.16)
                      + ri(r, -3, 4), 24, 38);

    const addTrophy = (key, label, ptsVal, icon) => {
      if (!st.trophies[key]) st.trophies[key] = { k: key, n: label, x: 0, pts: ptsVal, icon: icon || '🏆' };
      st.trophies[key].x++;
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
        return !e.bedingung || e.bedingung(st, letzteSaison);
      });
      if (!offen.length) return null;
      const e = pick(r, offen);
      st.erlebt.push(e.id);
      // Erfolg pro Option vorab auswürfeln, damit die Anzeige ehrlich bleibt
      return {
        id: e.id, kat: e.kat, szene: e.szene, tag: e.tag, titel: e.titel, text: e.text,
        spieltag: ri(r, 3, league(st.club.lg).k === 'NHL' ? 78 : 48),
        optionen: e.optionen.map(o => {
          const bonus = (player.wirkung || {}).ereignis || 0;
          return {
            t: o.t, chance: clamp(o.chance + bonus, 5, 95), grundChance: o.chance, bonus,
            hinweis: o.hinweis, _gut: o.gut, _schlecht: o.schlecht, _wurf: r() * 100
          };
        })
      };
    }

    function chooseEreignis(index){
      if (!st.ereignis) return null;
      const o = st.ereignis.optionen[clamp(index, 0, st.ereignis.optionen.length - 1)];
      const gelungen = o._wurf < o.chance;
      const w = gelungen ? o._gut : o._schlecht;
      const folge = { gelungen, text: (w && w.text) || '', chance: o.chance,
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
      st.letzteFolge = Object.assign({ titel: st.ereignis.titel, tag: st.ereignis.tag }, folge);
      // Merken, damit die Entscheidung spaeter im Karriereverlauf auftaucht
      st.offeneNotiz = { t: st.ereignis.tag + ': ' + o.t + (gelungen ? ' – gelungen' : ' – misslungen'),
                         c: gelungen ? 'good' : 'bad' };
      st.ereignis = null;
      return folge;
    }

    /* ---- eine Saison ausspielen ---- */
    function playSeason(){
      if (st.fertig || st.angebote || st.training || st.ereignis || st.jugend) return null;

      // Vor der Saison kann ein Karriereereignis dazwischenkommen
      if (!st.ereignisGeprueft){
        st.ereignisGeprueft = true;
        const e = waehleEreignis(st.seasons[st.seasons.length - 1]);
        if (e){ st.ereignis = e; return null; }
      }

      const club = st.club;
      const lg = league(club.lg);
      const form = formFactor(st.age, player.traits, (player.wirkung || {}).lernkurve);
      const dev = devAttrs(player.attrs, form);
      const ovr = overall(player, dev);
      if (ovr > st.peak){ st.peak = ovr; st.peakAttrs = dev; }

      const season = { year: st.year, age: st.age, club: club.n, lg: club.lg,
                       lgName: lg.n, ovr, events: [], awards: [] };
      if (st.offeneNotiz){ season.events.push(st.offeneNotiz); st.offeneNotiz = null; }

      /* Verletzungen */
      const robust = 1 + (player.traits.robust || 0) * 0.02;
      const injRisk = clamp(0.19 + (st.age - 28) * 0.02 - (player.traits.robust || 0) * 0.011
                            + st.risikoBonus, 0.05, 0.6);
      let missed = 0;
      if (r() < injRisk){
        missed = ri(r, 4, Math.round(28 / robust));
        season.events.push({ t: 'Verletzung: ' + missed + ' Spiele verpasst', c: 'bad' });
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

      /* Klassenunterschied zur Liga */
      const tagesform = 0.97 + r() * 0.07 + (season.sternstunde ? 0.10 : 0) + st.formBonus;
      const kante = clamp((ovr * tagesform - lg.level * 0.58) / 32, -0.35, 1.7);
      season.kante = Math.round(kante * 100) / 100;

      if (isG){
        const anteil = clamp(0.34 + kante * 0.46, 0.18, 0.92);
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
        const gp = Math.max(8, fullGp - missed);
        const posFactor = P.k === 'D' ? 0.62 : (P.k === 'C' ? 1.15 : 1.0);
        const ppg = clamp(kante * posFactor * (0.88 + r() * 0.24), 0.02, 2.3);
        const punkte = Math.round(ppg * gp);
        const gShare = P.goalRate / (P.goalRate + P.assistRate);
        const tore = Math.round(punkte * gShare * (0.82 + r() * 0.36));
        season.gp = gp;
        season.g = Math.min(tore, punkte);
        season.a = punkte - season.g;
        season.p = punkte;
        season.plus = Math.round((kante * 16 + (club.str - 76) * 0.5) * (0.6 + r() * 0.8));
        season.pim = ri(r, 8, 12 + Math.round((dev.zweikampf || 50) / 2));
        // Spezialteams, Schüsse und Eiszeit
        season.ppg = Math.round(season.g * (0.22 + r() * 0.20));
        season.shg = Math.round(season.g * (dev.defensive > 70 ? 0.05 : 0.02) * (r() < 0.5 ? 0 : 2));
        season.gwg = Math.round(season.g * (0.10 + r() * 0.09));
        const quote = clamp(0.055 + (dev.praezision || 50) / 900 + (r() - 0.5) * 0.02, 0.04, 0.20);
        season.shots = Math.max(season.g, Math.round(season.g / quote));
        season.shotPct = season.shots ? Math.round(season.g / season.shots * 1000) / 10 : 0;
        season.toi = Math.round(clamp(10 + kante * 7 + (P.k === 'D' ? 2.5 : 0), 8, 26) * 10) / 10;
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
      season.playoffs = teamPower > ligaSchnitt - 1;

      if (season.playoffs){
        const titelChance = clamp((teamPower - ligaSchnitt - 6) / 30 + poBoost / 130, 0.015, 0.38);
        if (r() < titelChance){
          season.title = lg.title;
          addTrophy('lg_' + lg.k, lg.title, lg.prestige, '🏆');
          season.events.push({ t: lg.title + ' gewonnen', c: 'good' });
          if (r() < 0.28 + poBoost / 120) season.awards.push('playoffMvp');
          st.ruf += 4;
        } else {
          const runden = ['erste Runde','Viertelfinale','Halbfinale','Finale'];
          const weit = clamp(Math.floor((teamPower - ligaSchnitt) / 5), 0, 3);
          season.events.push({ t: 'Playoffs: aus im ' + runden[weit], c: '' });
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
          if (P.k !== 'D' && (dev.defensive || 0) > 74 && kante > 0.75 && r() < 0.4)
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
            addTrophy('int_' + medaille, M.n, M.pts, M.icon);
            st.laenderBilanz.medaillen++;
            season.events.push({ t: M.n + ' mit ' + nat.n, c: platz === 'Gold' ? 'good' : '' });
          } else {
            season.events.push({ t: T.n + ' mit ' + nat.n + ': ' + platz, c: '' });
          }

          if (stufe === 'A'){
            if (!isG && turnier.p >= spiele && r() < 0.35){
              addTrophy('int_wmAllstar', D.INTL.wmAllstar.n, D.INTL.wmAllstar.pts, D.INTL.wmAllstar.icon);
              season.events.push({ t: T.kurz + '-All-Star-Team', c: 'good' });
            }
            if (platz === 'Gold' && kante > 1.0 && r() < 0.4){
              addTrophy('int_wmMvp', D.INTL.wmMvp.n, D.INTL.wmMvp.pts, D.INTL.wmMvp.icon);
              season.events.push({ t: 'Wertvollster Spieler des Turniers', c: 'good' });
            }
          }

          st.laender.push(turnier);
          st.laenderBilanz.turniere++;
          st.laenderBilanz.gp += turnier.gp;
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

      season.salary = round1(clamp((ovr - 58) * 0.5, 0.05, 15) * lg.salary + 0.05);
      season.marktwert = marktwert(ovr, st.age);
      st.formBonus *= 0.5;          // Nachwirkung klingt ab
      st.risikoBonus *= 0.5;
      st.moral = clamp(st.moral + (season.title ? 6 : (season.playoffs ? 2 : -3)), 10, 100);
      st.ereignisGeprueft = false;  // im nächsten Jahr wieder möglich

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

      st.seasons.push(season);
      st.ruf = st.ruf * 0.5 + (ovr + season.awards.length * 3 + (season.title ? 4 : 0)) * 0.5;

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
      const naechsterOvr = overall(player, devAttrs(player.attrs, formFactor(st.age, player.traits, (player.wirkung || {}).lernkurve)));
      const bewertung = Math.max(naechsterOvr, st.ruf * 0.5 + naechsterOvr * 0.5);
      if (st.age >= 25 && bewertung < VERTRAG_MIN){ ende('vertraglos'); return; }

      /* Weitere Wege, wie eine Laufbahn endet */
      const letzte = st.seasons[st.seasons.length - 1];
      const verletzungsRisiko = clamp(0.015 + (st.age - 28) * 0.007
                                      - (player.traits.robust || 0) * 0.0012, 0, 0.10);
      if (st.age >= 26 && r() < verletzungsRisiko){ ende('verletzung'); return; }
      if (letzte && letzte.title && st.age >= 30 && r() < 0.20){ ende('hoehepunkt'); return; }
      if (st.age >= 33 && r() < 0.07){ ende('familie'); return; }
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
        st.club = a.club;
      } else {
        letzte.events.push({ t: 'Vertrag bei ' + a.club.n + ' um ' + dauer + ' verlängert', c: '' });
      }
      if (!a.bleibt){ st.klubJahre = 0; if (st.kapitaenSeit !== a.club.n) st.kapitaenSeit = null; }
      st.entscheidungen.push(a.club.n);
      st.vertragJahre = a.jahre;
      st.angebote = null;
      st.angebotsGrund = null;
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

    function runToEnd(maxSchritte){
      let n = 0;
      while (!st.fertig && n++ < (maxSchritte || 120)){
        if (st.jugend) waehleJugend(0);
        if (st.ereignis) chooseEreignis(0);
        playSeason();
        if (st.training) autoTraining();
        if (st.angebote) autoChoose();
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
           ppg:0, shg:0, gwg:0, shots:0, plus:0 });
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

      const trophyList = Object.values(st.trophies).sort((a, b) => b.pts * b.x - a.pts * a.x);
      const trophyPts = trophyList.reduce((s, t) => s + t.pts * t.x, 0);
      const profi = seasons.filter(s => league(s.lg).prestige >= 14);
      const prodPts = isG
        ? profi.reduce((s, x) => s + (x.wins || 0), 0) * 0.20 + profi.reduce((s, x) => s + (x.so || 0), 0) * 1.2
        : profi.reduce((s, x) => s + (x.p || 0), 0) * 0.15;
      const legacy = Math.round(trophyPts + prodPts + Math.max(0, st.peak - 60) * 3.2 + profi.length * 2);
      // Juniorenjahre zaehlen nicht als beste Saison – zu schwache Gegner
      const bewertbar = seasons.filter(s => s.lg !== 'JUN');
      const besteSaison = (bewertbar.length ? bewertbar : seasons).slice().sort((a, b) =>
        (isG ? (b.wins || 0) - (a.wins || 0) : (b.p || 0) - (a.p || 0)))[0] || null;

      return {
        player, seasons, totals, isG,
        trophies: trophyList,
        peak: st.peak, peakAttrs: st.peakAttrs || player.attrs,
        besteSaison, rekorde,
        entscheidungen: st.entscheidungen,
        retireAge: Math.max(18, st.age - 1),
        grund: st.grund,
        endeArt: st.endeArt,
        endeText: st.endeText,
        laender: st.laender,
        laenderBilanz: st.laenderBilanz,
        natDebuet: st.natDebuet,
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
      get jugend(){ return st.jugend; },
      get letzteSaison(){ return st.seasons[st.seasons.length - 1] || null; },
      maxAge,
      playSeason, choose, autoChoose, chooseTraining, autoTraining,
      waehleJugend, chooseEreignis, runToEnd, result
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
    newPlayer, draftOptions, applyPick, pickValue, autoDraft,
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
