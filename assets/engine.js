/* ==========================================================
   Eiszeit – Karriere-Engine
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

  /* ------------------------------------------------------------------
     Was ein Spieler verdient

     Vorher stand hier eine Gerade: (Wertung - 58) mal 0,5, gedeckelt
     bei 15. In der NHL (Ligafaktor 1,0) hiess das 11 Millionen fuer
     eine Wertung von 80 und den Deckel ab 88. Gemessen verdiente das
     untere Viertel aller NHL-Spieler 12,1 Millionen und der Median
     14,1 - also praktisch jeder das Hoechstgehalt. Dieselbe Krankheit
     wie bei der Fangquote: eine Gerade, die oben an die Wand laeuft.

     In Wirklichkeit steigen Gehaelter nicht gerade, sondern steil erst
     ganz oben: ein Ergaenzungsspieler bekommt eine Million, ein guter
     Zweitreihenspieler drei bis vier, ein Erstreihenspieler sechs bis
     sieben, und nur eine Handvoll kommt ueber zwoelf. Diese Kurve
     bildet das ab - mit dem Ergebnis, dass sich Wertungspunkte oben
     lohnen und unten das Ueberleben sichern.

     Die Formel steht an genau EINER Stelle, weil sie an zwei
     gebraucht wird: fuer das Angebot vor der Saison und fuer die
     Auszahlung danach. Zwei Kopien waeren zwei Gelegenheiten
     auseinanderzulaufen - und genau das war die Beanstandung
     "Wertung bei Vertragsangeboten stimmt nicht".
     ------------------------------------------------------------------ */
  function gehaltBasis(wertung, lg){
    if (!lg) return 0;
    /* Gemessen an der Eintrittshuerde der Liga, nicht an einer festen
       Zahl. Der Grund steht in LG_MIN: die NHL verlangt eine Wertung
       von 86. Die alte Gerade (Wertung minus 58, mal 0,5) war damit
       schon beim schwaechsten NHL-Spieler bei 14 von hoechstens 15 -
       deshalb verdiente dort praktisch jeder das Hoechstgehalt. Wer
       gerade so in eine Liga passt, bekommt jetzt deren Grundgehalt;
       was darueber liegt, zahlt sich steigend aus. */
    const basis = lg.jugend ? 55 : (LG_MIN[lg.k] !== undefined ? LG_MIN[lg.k] : 58);
    /* Vierzehn Punkte ueber der Huerde waren zu breit: der Spitzenwert
       einer Laufbahn liegt im Median bei 80 und im obersten Zehntel
       bei 90, in der NHL bewegt sich also fast alles zwischen 86 und
       96. Mit zehn Punkten Spanne trifft die Kurve dieses Fenster -
       Grundgehalt an der Huerde, Hoechstgehalt bei rund 96. */
    const spanne = clamp((wertung - basis) / 10, 0, 1.05);
    return lg.salary * (3.5 + Math.pow(spanne, 2) * 10.5);
  }

  /* Der gemessene Median der Moral ueber alle Laufbahnen. Er ist der
     Nullpunkt fuer alles, was von der Moral abhaengt - so wirkt sie
     als Unterschied zwischen Spielern und nicht als Zuschlag oder
     Steuer fuer alle. Aendert sich die Moralrechnung, gehoert diese
     Zahl neu gemessen (scratchpad/spirale.js). */
  const MORAL_MITTE = 71;

  /* Mindestwertung, ab der eine Liga einen Vertrag anbietet */
  const LG_MIN = { NHL:86, KHL:79, SHL:77, NL:75, LII:74, DEL:72, CZE:71, AHL:60 };
  /* Jede Jugendliga fordert nichts - frueher stand dafuer ein einzelnes
     JUN:0 hier. Wird das vergessen, ist LG_MIN[k] undefined, und die
     Rechnung damit ergibt NaN statt eines Fehlers: die Auswahl liefert
     dann stillschweigend einen leeren Klub. Deshalb aus den Ligendaten
     abgeleitet und nicht von Hand gepflegt. */
  D.LEAGUES.filter(l => l.jugend).forEach(l => { LG_MIN[l.k] = 0; });
  /* Unter diesem Wert findet niemand mehr einen Profivertrag */
  const VERTRAG_MIN = 56;
  /* Heimatliga je Nation */
  const HOME_LG = { CAN:'AHL', USA:'AHL', SWE:'SHL', FIN:'LII', RUS:'KHL', CZE:'CZE',
                    SVK:'CZE', GER:'DEL', SUI:'NL', AUT:'DEL', LAT:'DEL', DEN:'DEL', NOR:'SHL' };

  /* ------------------------------------------------------------------
     Juniorenliga je Nation

     Es gab eine einzige, in der die London Knights gegen die
     Jungadler Mannheim spielten. Jetzt spielt jeder dort, wo er
     herkommt. Die kleinen Nationen haengen an dem System, in das ihre
     Jugendlichen tatsaechlich gehen - dasselbe Muster, nach dem oben
     schon die Heimatligen zugeordnet sind.
     ------------------------------------------------------------------ */
  const HOME_JUN = { CAN:'JCHL', USA:'JUSA', SWE:'JSWE', FIN:'JFIN', RUS:'JRUS',
                     CZE:'JCZE', SVK:'JCZE', GER:'JGER', SUI:'JSUI',
                     AUT:'JGER', LAT:'JRUS', DEN:'JSWE', NOR:'JSWE' };

  /* Ob eine Liga eine Jugendliga ist, stand frueher an einem Dutzend
     Stellen als lg.k === 'JUN'. Das geht jetzt ueber die Markierung
     in den Ligendaten, damit acht Ligen dasselbe bedeuten koennen. */
  const JUGEND = new Set(D.LEAGUES.filter(l => l.jugend).map(l => l.k));
  const istJugend = k => JUGEND.has(k);

  /* ------------------------------------------------------------------
     Zu Hause ist ein Land, nicht eine einzige Liga

     HOME_LG nennt je Nation genau eine Liga - fuer einen Deutschen die
     DEL. Damit galt die DEL2 als Ausland und die eigene Jugendliga
     auch: ein Achtzehnjaehriger aus Mannheim sammelte Heimweh,
     waehrend er in Mannheim spielte. Zu Hause ist man ueberall dort,
     wo das Land stimmt.
     ------------------------------------------------------------------ */
  function istHeimatLiga(lgKey, nationKey){
    const nat = D.NATIONS.find(n => n.k === nationKey);
    const lg = D.LEAGUES.find(l => l.k === lgKey);
    if (!nat || !lg) return false;
    if (lg.land === nat.n) return true;
    /* Kanada und die USA teilen sich denselben Unterbau - fuer beide
       ist "Nordamerika" das eigene Land. */
    if (lg.land === 'Nordamerika') return nationKey === 'CAN' || nationKey === 'USA';
    /* Die KHL steht unter "Osteuropa", weil sie ueber Grenzen hinweg
       spielt. Fuer einen Russen ist sie trotzdem die Heimatliga - die
       Mehrzahl der Klubs steht in Russland, und ohne diese Zeile galt
       ausgerechnet die KHL fuer ihn als Ausland, waehrend die VHL als
       Heimat zaehlte. Riga spielt ebenfalls dort, und fuer Lettland
       ist es die einzige Liga im Spiel ueberhaupt. */
    if (lg.land === 'Osteuropa') return nationKey === 'RUS' || nationKey === 'LAT';
    return false;
  }

  /* ------------------------------------------------------------------
     Gibt es fuer diese Nation ueberhaupt eine Heimatliga?

     Norwegen hat im Spiel keine einzige. Ein Norweger sammelte deshalb
     in jeder Saison seines Lebens Heimweh, ohne dass es je einen Ort
     gegeben haette, an dem es faellt - eine Anzeige, die nur in eine
     Richtung geht, misst nichts. Wo es keine Heimat gibt, ruht das
     Heimweh, statt sich blind aufzutuermen.
     ------------------------------------------------------------------ */
  const HAT_HEIMAT = {};
  function hatHeimatLiga(nationKey){
    if (HAT_HEIMAT[nationKey] === undefined)
      HAT_HEIMAT[nationKey] = D.LEAGUES.some(l => istHeimatLiga(l.k, nationKey));
    return HAT_HEIMAT[nationKey];
  }

  /* ---------------- Spieler anlegen ---------------- */
  /* ----------------------------------------------------------------
     Talent hat eine Decke

     Fuenf Stufen, so verteilt, wie es sich in einem Draftjahrgang
     zutraegt: die meisten kommen nie ueber die zweite Klasse hinaus,
     einer von zwanzig traegt spaeter eine Liga.
     ---------------------------------------------------------------- */
  /* Die unterste Stufe lag bei 64 bis 74. Wer sie zog, kam gemessen
     auf einen Hoehepunkt um 70 und konnte daran nichts aendern - er
     schoepfte seine Anlage zu ueber neunzig Prozent aus und blieb
     trotzdem Mittelmass. Das ist die Laufbahn, die sich anfuehlt, als
     wuerde Entwicklung nichts bringen. Der Boden liegt jetzt hoeher;
     ein schwacher Jahrgang bleibt schwach, aber nicht chancenlos. */
  const GRENZEN = [
    { bis: 0.20, von: 69, spanne: 10 },   // reicht selten fuer die erste Klasse
    { bis: 0.54, von: 76, spanne:  8 },   // solider Profi
    { bis: 0.82, von: 82, spanne:  6 },   // Stammkraft ganz oben
    { bis: 0.95, von: 88, spanne:  5 },   // Star
    { bis: 1.01, von: 93, spanne:  5 }    // Ausnahmespieler
  ];

  function zieheGrenze(r){
    const w = r();
    const stufe = GRENZEN.find(g => w < g.bis) || GRENZEN[1];
    return Math.round(stufe.von + r() * stufe.spanne);
  }

  /* Ein Attribut anheben - aber nur so weit, wie die Grenze es
     zulaesst. Dicht darunter bleibt von einem Sommer Training fast
     nichts mehr uebrig; das ist der Punkt, an dem eine Laufbahn ihre
     Form annimmt. Abzuege gelten immer voll. */
  /* ------------------------------------------------------------------
     Ein Wert, den es auf dieser Position nicht gibt

     Ereignisse sind fuer alle geschrieben: "Jeden Morgen wiederkommen"
     bringt Praezision, "Reingehen und es ausdiskutieren" bringt
     Uebersicht. Ein Torhueter hat weder das eine noch das andere - die
     Zusage prallte ab, waehrend die Oberflaeche sie trotzdem anzeigte.
     Gemessen betraf das 35 Stellen in 101 Ereignissen.

     Statt fuenfunddreissig Bloecke einzeln zu flicken, wird hier
     uebersetzt: dieselbe Arbeit, in der Waehrung der eigenen Position.
     Wer frueher aufsteht, wird als Stuermer praeziser und als Torhueter
     sicherer mit der Fanghand.
     ------------------------------------------------------------------ */
  const ATTR_UEBERSETZUNG = {
    /* Feldspieler -> Torhueter */
    antritt:'beweglich', skating:'beweglich', schuss:'stockhand',
    praezision:'fanghand', puck:'puckspiel', pass:'puckspiel',
    uebersicht:'lesen', zweikampf:'stellung', defensive:'stellung',
    /* Torhueter -> Feldspieler */
    reflexe:'antritt', stellung:'defensive', fanghand:'praezision',
    stockhand:'schuss', rebound:'praezision', puckspiel:'puck',
    beweglich:'skating', konstanz:'uebersicht', lesen:'uebersicht'
  };
  /* Welchen Wert dieser Spieler dafuer hat - oder null, wenn es auch
     nach der Uebersetzung keinen gibt. */
  function attrFuer(player, k){
    if (player.attrs[k] !== undefined) return k;
    const ersatz = ATTR_UEBERSETZUNG[k];
    return (ersatz && player.attrs[ersatz] !== undefined) ? ersatz : null;
  }

  function attrHeben(player, k0, v){
    const k = attrFuer(player, k0);
    if (!k) return;
    if (v <= 0){ player.attrs[k] = clamp(player.attrs[k] + v, 1, 99); return; }
    player.attrs[k] = clamp(
      player.attrs[k] + v * wachstumsAnteil(player) * talentTempo(player), 1, 99);
  }

  /* Wer mehr Anlage hat, lernt auch schneller.

     Ohne das war die Grenze nur nach unten wirksam: die Begabten
     hatten mehr Raum, aber dieselbe Zahl an Sommern, um ihn zu
     fuellen - und kamen deshalb kaum hoeher heraus als die Soliden.
     Gemessen lagen Gipfelwerte im Mittel bei 78 und im obersten
     Zehntel bei 84, egal wie hoch die Decke lag. */
  function talentTempo(player){
    return clamp(0.72 + ((player.potenzial || 80) - 70) / 34, 0.6, 1.7);
  }

  /* 1 = voll, 0 = ausgewachsen. Die letzten zehn Basispunkte vor der
     Grenze kosten ueberproportional viel. */
  function wachstumsAnteil(player){
    /* 1,28 aus devAttrs mal dem Scheitel der Alterskurve (1,02). */
    const grenze = (player.potenzial || 99) / 1.31;
    const jetzt = overall(player, player.attrs);
    const naehe = clamp((jetzt - (grenze - 10)) / 10, 0, 1);
    return clamp(1 - naehe * naehe * 0.94, 0.06, 1);
  }

  function newPlayer(opt){
    const r = rng(opt.seed);
    const nat = nation(opt.nation);
    const attrs = {};
    /* Weiter unten als frueher (42 bis 56): der Abstand zur eigenen
       Grenze ist der Weg, den die Laufbahn zurueckzulegen hat. */
    attrsOf(opt.pos).forEach(a => { attrs[a.k] = ri(r, 33, 46); });
    Object.entries(nat.bonus || {}).forEach(([k, v]) => {
      if (attrs[k] !== undefined) attrs[k] = clamp(attrs[k] + v, 1, 99);
    });
    return {
      name: opt.name, num: opt.num, nation: opt.nation, pos: opt.pos,
      mode: opt.mode || 'klassisch',
      seed: opt.seed,
      /* Die Grenze, an die dieser Koerper heranwachsen kann.

         Ohne sie wuchs jeder gleich weit: gemessen ueber 500
         Laufbahnen lagen achtzig Prozent aller Gipfelwerte zwischen 80
         und 91, und sechsundsiebzig Prozent endeten in der NHL. Das
         Ziel war praktisch immer dasselbe.

         Die Verteilung ist bewusst schief - die meisten Junioren
         werden solide Profis, wenige werden Stars, ganz wenige
         Ausnahmespieler. Die Grenze bleibt verborgen; spuerbar wird
         sie daran, dass die Spruenge kleiner werden. */
      potenzial: zieheGrenze(r),
      /* ----------------------------------------------------------------
         Der Scheitelpunkt des Koerpers gehoert zum Spieler

         Er wurde bisher erst in createCareer gewuerfelt. Die
         Charaktererstellung konnte die Wertung deshalb nicht so
         ausrechnen, wie das Spiel sie spaeter zeigt - sie zeigte den
         nackten Mittelwert der Werte, das Spiel den mit der
         Alterskurve. Jetzt steht er von Anfang an fest, und beide
         Stellen rechnen dieselbe Zahl. Torhueter reifen spaeter.
         ---------------------------------------------------------------- */
      scheitel: clamp((pos(opt.pos).group === 'goalie' ? 29 : 27)
                      + ri(r, -3, 4) + (r() - 0.5) * 1.5, 23, 33),
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

  /* ---------------- Charakterdraft ----------------
     Fuenf Fragen, jede Antwort verschiebt Werte und gibt Eigenschaften. */
  function draftFrage(player, runde){
    if (typeof DRAFT === 'undefined') return null;
    /* Die bisher gewaehlten Karten mitgeben - erst damit kann der
       Draft ausschliessen, was einer frueheren Wahl widerspricht. */
    const alle = DRAFT.fragen(pos(player.pos).group, player.seed,
                              player.nation, player.picks);
    return alle[runde] || null;
  }

  function wirkungNeu(player){
    const w = { moralStart:0, rufStart:0, training:0, ereignis:0,
                heimbonus:0, natBonus:0, lernkurve:0, grenze:0 };
    player.traits = { robust:0, langlebig:0, jung:0, playoff:0 };
    if (typeof DRAFT === 'undefined'){ player.wirkung = w; return player; }
    /* ----------------------------------------------------------------
       Eine Eigenschaft zum zweiten Mal

       Die Vorraete im Draft sind klein (neun bis zehn Karten je
       Frage), und dieselbe Eigenschaft steht auf mehreren davon.
       Gemessen waehlten 41,6 Prozent der Spieler zwei Karten, die
       dieselbe Eigenschaft zusagen - und die zweite verfiel still,
       weil die Liste nur eindeutige Eintraege fuehrt. Die Karte
       versprach also etwas, das sie nicht lieferte.

       Jetzt wird sie eingeloest, aber nicht voll: beim zweiten Mal
       zur Haelfte, beim dritten zu einem Viertel. So bleibt die
       Zusage gueltig, ohne dass sich ein Wert verdoppelt.
       ---------------------------------------------------------------- */
    const stufen = player.eigStufe || {};
    (player.eigenschaften || []).forEach(id => {
      const e = DRAFT.EIGENSCHAFTEN[id];
      if (!e) return;
      const wieOft = Math.max(1, stufen[id] || 1);
      let anteil = 0;
      for (let i = 0; i < wieOft; i++) anteil += Math.pow(0.5, i);
      Object.entries(e.w).forEach(([k, v]) => {
        const wert = Math.round(v * anteil * 10) / 10;
        if (player.traits[k] !== undefined) player.traits[k] += wert;
        else w[k] = (w[k] || 0) + wert;
      });
    });
    player.wirkung = w;
    /* Die Grenze ist die wichtigste verborgene Zahl einer Laufbahn.
       Ein Teil davon ist Veranlagung, ein Teil ist, was im Draft aus
       dem Spieler gemacht wurde - sonst waere der erste und
       folgenreichste Zug des Spiels reines Wuerfeln. */
    if (player.grundGrenze === undefined) player.grundGrenze = player.potenzial;
    player.potenzial = clamp(Math.round(player.grundGrenze + (w.grenze || 0)), 58, 99);
    return player;
  }

  function applyKarte(player, karte){
    Object.entries(karte.b || {}).forEach(([k, v]) => {
      attrHeben(player, k, v);   // Werte, die es auf dieser Position nicht gibt, prallen ab
    });
    player.eigenschaften = player.eigenschaften || [];
    player.eigStufe = player.eigStufe || {};
    const verstaerkt = [];
    (karte.eig || []).forEach(id => {
      if (!player.eigenschaften.includes(id)) player.eigenschaften.push(id);
      else verstaerkt.push(id);
      /* Wie oft sie zugesagt wurde - danach richtet sich die Staerke. */
      player.eigStufe[id] = (player.eigStufe[id] || 0) + 1;
    });
    wirkungNeu(player);
    player.picks.push({ id: karte.id, n: karte.n, tag: karte.tag,
                        eig: karte.eig || [], verstaerkt });
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

  /* ------------------------------------------------------------------
     Die Wertung, wie sie im Spiel steht

     overall() liefert den nackten Mittelwert der Werte. Was das Spiel
     anzeigt, ist der Wert nach der Alterskurve - gemessen lagen die
     beiden im Schnitt elf Punkte auseinander, und die
     Charaktererstellung zeigte deshalb eine andere Zahl als die erste
     Saison. Diese Funktion rechnet, was die Saison rechnet.
     ------------------------------------------------------------------ */
  function wertungMitAlter(player, age){
    const form = formFactor(age != null ? age : 16, player.traits,
                            (player.wirkung || {}).lernkurve, player.scheitel);
    return overall(player, devAttrs(player.attrs, form));
  }

  /* ---------------- Alterskurve ---------------- */
  function formFactor(age, traits, lernkurve, scheitel){
    const t = traits || {};
    const lk = (lernkurve || 0) * 0.004;
    // Jeder Spieler hat seinen eigenen Scheitelpunkt – manche bluehen mit 24 auf,
    // andere erst mit 31. Das macht Laufbahnen spuerbar unterschiedlich.
    /* Der eigentliche Hebel der Eigenschaft: wer frueh reif ist,
       erreicht seinen Scheitel frueher. Verstaerkt, weil der direkte
       Zuschlag auf die Form jetzt gedeckelt ist. */
    const peak = (scheitel || 27) - (t.jung || 0) * 0.12 + (t.langlebig || 0) * 0.05;
    /* Frueher trug allein diese Kurve den Aufstieg: mit achtzehn stand
       ein Spieler bei 0,63 und mit siebenundzwanzig bei 1,0, ganz
       gleich, was er dazwischen tat. Damit waren zweiundneunzig Prozent
       der Anlage schon am ersten Tag ausgeschoepft und Training wie
       Ereignisse aenderten kaum etwas. Jetzt ist die Kurve flach - der
       Weg nach oben fuehrt ueber die Arbeit an den Werten. */
    /* ----------------------------------------------------------------
       Der Abstand zum Scheitel wird bei elf Jahren gekappt

       Die Kurve ist absichtlich flach: elf Jahre vor dem Scheitel steht
       ein Spieler bei 0,78, am Scheitel bei 1,0. Der Abstand lief aber
       bis zwanzig Jahre weiter, und quadratisch. Wessen Koerper erst
       mit dreiunddreissig seinen Scheitel hat - bei Torhuetern der
       Regelfall, ihre Spanne beginnt bei 29 -, der stand mit achtzehn
       bei 0,27 und wurde als ein Viertel seines spaeteren Selbst
       bewertet. Gemessen stuerzte jede zehnte Laufbahn so von einer
       Wertung um 50 auf 17 ab, ueberwiegend Torhueter.

       Elf Jahre sind die Spanne, auf die der Rest der Kurve geeicht
       ist. Weiter zurueck macht niemanden schwaecher - ein
       Achtzehnjaehriger ist ein Achtzehnjaehriger, ganz gleich, wann
       sein Koerper fertig sein wird.
       ---------------------------------------------------------------- */
    const vorSprung = clamp(peak - age, 0, 11);
    /* Der Frueh- beziehungsweise Spaetreife-Zuschlag ist gedeckelt.
       "jung" reicht von -6 bis +18; mal 0,004 mal elf Jahre ergab das
       zwischen -0,26 und +0,79 - die ganze Alterskurve spannt aber nur
       0,22. Ein Spaetzuender wurde damit mit achtzehn auf 0,58 gedrueckt
       und ein Fruehreifer sass sofort am Deckel. Die Eigenschaft
       verschiebt den Scheitelpunkt ohnehin schon (siehe peak); hier
       moduliert sie nur noch. */
    const reife = clamp((t.jung || 0) * 0.004 * vorSprung, -0.08, 0.08);
    const early = 1 - Math.pow(vorSprung / 11, 2) * 0.22 + reife;
    /* ------------------------------------------------------------------
       Haltbarkeit bremst den Abbau, sie hebt ihn nicht auf

       Derselbe Fehler wie beim Zuschlag fuer Fruehreife, nur am anderen
       Ende der Laufbahn: "langlebig" reicht bis 16, mal 0,004 mal bis
       zu 25 Jahren Abstand ergab das bis zu +1,6 - mehr als die ganze
       Abbaukurve (0,62). Wer die Eigenschaft hatte, verlor gar nichts
       mehr. Gemessen verloren 46 Prozent aller Spieler zwischen
       achtundzwanzig und sechsunddreissig hoechstens zwei Punkte.

       Jetzt gedeckelt: ein zaeher Koerper haelt laenger durch, aber
       auch er wird aelter.
       ------------------------------------------------------------------ */
    const nachSprung = clamp(age - peak, 0, 25);
    const zaeh = clamp((t.langlebig || 0) * 0.004 * nachSprung, -0.12, 0.16);
    const late  = 1 - Math.pow(nachSprung / 11, 1.9) * 0.62 + zaeh;
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
    /* Angehoben, seit die Alterskurve flach ist: was der Spieler im
       Sommer tut, ist jetzt der Hauptantrieb seiner Entwicklung. */
    /* Angehoben, nachdem der Startwert richtig gemessen wird: vorher
       stuerzte jede zehnte Laufbahn beim ersten Saisonbericht auf ein
       Drittel ab, und der Zuwachs bis zum Gipfel sah dadurch groesser
       aus, als er war. Mit sauberem Startwert lagen 20 Prozent aller
       Laufbahnen unter zwoelf Punkten Zuwachs - gemessen mit den alten
       Werten waren es 12. */
    /* ------------------------------------------------------------------
       Die Jugendjahre zaehlen weniger

       Seit die Laufbahn mit sechzehn beginnt, liegen zwei zusaetzliche
       Sommer vor dem Draft. Mit dem vollen Satz stieg der Gipfelwert
       gemessen von 80,9 auf 83,3 und der Anteil "Unsterblich" von 5,3
       auf 15,8 Prozent - das Spiel wurde zufaellig dreimal leichter,
       ohne dass jemand das wollte. Ein Sechzehnjaehriger in seiner
       Jugendliga arbeitet auch, aber nicht im Profibetrieb.
       ------------------------------------------------------------------ */
    if (age <= 17) return 7;
    if (age <= 22) return 13;  // junge Spieler entwickeln sich sprunghaft
    if (age <= 27) return 8;
    if (age <= 31) return 4;
    return 2;                  // spaete Jahre sind reines Halten
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
      attrHeben(player, option.k, option.wert);
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
    const heimJugend = HOME_JUN[player.nation] || 'JCHL';

    const st = {
      /* ----------------------------------------------------------------
         Eine Laufbahn beginnt mit sechzehn

         Vorher mit achtzehn - und der Draft faellt ins Fenster 18 bis
         20, lag also gleich in der ersten Saison. In Wirklichkeit
         spielt ein Junge zwei Jahre in seiner Jugendliga, bevor sein
         Jahrgang ueberhaupt draftberechtigt ist. Jetzt sind es zwei
         Saisons Vorlauf, und der Draftabend kommt in der dritten.
         ---------------------------------------------------------------- */
      age: 16,
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
      nominierung: null,      // offene Frage des Verbands
      natGeprueft: false,
      natZusage: true,        // stehst du zur Verfuegung?
      natRolle: null,         // 'fuehrung', wenn du sie eingefordert hast
      natAbsagen: 0,          // wie oft du abgesagt hast
      natGefragt: false,      // offene Zusage, die noch beantwortet werden muss
      natKapitaen: false,     // Kapitaen der Nationalmannschaft
      entryDraft: null,       // Ergebnis des Entry Drafts
      draftRechte: null,      // wer deine Rechte haelt, und wie lange
      draftRuf: false,        // hat der Klub schon angerufen?
      bericht: null,          // Rueckblick direkt nach der Saison
      rolle: null,            // gewaehlte Rolle im aktuellen Vertrag
      rollenwahl: null,       // offene Rollenfrage
      rollenStand: null,      // wie fest du darin sitzt
      rollenPunkte: 0,        // Guthaben beim Trainer, -4 bis +4
      rollenJahre: 0,         // Saisons in dieser Rolle
      rollenVorOvr: null,     // Wert der Vorsaison, fuer die Aufbaurolle
      startVerpasst: 0,       // Spiele, die die Reha den Saisonstart kostet
      gesperrteSpiele: 0,     // Spiele, die eine Sperre kostet
      natGesperrtBis: 0,      // bis zu diesem Jahr nominiert der Verband nicht
      /* ----------------------------------------------------------------
         Die Grundstimmung

         Solange die Moral nur addiert und abgezogen wurde, staute sie
         sich: gemessen landeten 273 von 400 Laufbahnen am Ende
         zwischen 90 und 100, waehrend am unteren Rand Tiefphasen von
         elf Saisons standen. Beides ist dasselbe Problem - ein Wert
         ohne Rueckstellkraft bleibt liegen, wo ihn der letzte Stoss
         hingeschoben hat.

         Jetzt hat jeder einen eigenen Ruhepunkt, zu dem er
         zurueckfindet. Er haengt an den Nerven (beim Torhueter an der
         Konstanz): wer die Ruhe weghat, faellt nach einem schlechten
         Jahr nicht so tief und braucht die Euphorie nicht. Damit ist
         die Moral keine Punktesammlung mehr, sondern ein Zustand mit
         Traegheit - und der Unterschied zwischen zwei Spielern liegt
         nicht nur darin, was ihnen zugestossen ist, sondern auch
         darin, wie sie es wegstecken.
         ---------------------------------------------------------------- */
      grundstimmung: 72,

      /* ----------------------------------------------------------------
         Leben neben dem Eis

         Familie und Heimkehr gab es schon - aber nur als Wuerfel im
         letzten Moment: mit 34 beendete r() < 0.06 die Laufbahn "aus
         familiaeren Gruenden", ohne dass es je eine Familie gegeben
         haette. Das war kein Leben, das war ein Zufallsgenerator mit
         einer ruehrenden Beschriftung.

         Jetzt laeuft daneben ein zweiter Strang mit vier Zahlen, die
         sich aus dem ergeben, was auf dem Eis entschieden wird:

           heimweh    steigt mit jeder Saison in der Fremde, faellt
                      daheim - und macht ein Angebot aus der Heimat
                      spaeter zu mehr als einer Randnotiz
           wurzeln    waechst beim Bleiben, faellt beim Wechsel; hohe
                      Wurzeln geben Moral und machen einen Wechsel teuer
           familie    allein -> Partner -> Kinder; wer eine Familie hat,
                      wechselt schwerer und hoert frueher auf
           vermoegen  was von den Gehaeltern uebrig bleibt

         Alle vier wirken auf Dinge, die es schon gibt: Moral, die
         Anziehungskraft von Angeboten, die Kosten eines Wechsels und
         das Karriereende.
         ---------------------------------------------------------------- */
      /* Die Heimatliga steht im Zustand, damit Ereignisbedingungen
         danach fragen koennen - sie sehen nur st, nicht die Huelle. */
      heimLiga: homeLg,
      leben: {
        heimweh: 0,           // 0-100
        wurzeln: 20,          // 0-100
        familie: 'allein',    // allein | partner | kinder
        kinder: 0,
        partnerMit: true,     // zieht der Partner mit, oder blieb er daheim?
        vermoegen: 0,         // Mio, summiert ueber die Laufbahn
        heimatjahre: 0,       // Saisons in der Heimatliga
        fremdjahre: 0
      },
      trainerJahre: 0,        // wie lange derselbe Mann schon an der Bande steht
      trainerNeu: false,      // in dieser Saison hat der Klub gewechselt
      trainerVorher: null,    // wer vorher da war
      rollenLauf: [],         // jede Aenderung, mit Grund
      verhandlung: null,      // offene Vertragsverhandlung
      klausel: false,         // Ausstiegsklausel im laufenden Vertrag
      sperre: false,          // Wechselsperre - der Klub laesst dich nicht gehen
      bonus: null,            // laufende Bonusklausel im aktuellen Vertrag
      bonusBilanz: { erfuellt: 0, verfehlt: 0 },
      gehaltFaktor: 1,        // ausgehandelter Aufschlag auf das Grundgehalt
      sommer: null,           // offene Entscheidung fuer die Sommerpause
      kapitaensfrage: null,   // offenes Angebot fuer das C
      kapitaenGefragt: false,
      kapitaenSperre: 0,      // Saisons, in denen das C nicht neu vergeben wird
      rivale: null,           // staerkster Spieler desselben Jahrgangs
      jahrgang: [],           // die ganze Draftklasse, einmal vorausberechnet
      jahrgangStand: null,    // Rangliste des laufenden Jahres
      jahrgangEreignis: null, // Ueberholvorgang der laufenden Saison
      jahrgangDelta: null,    // Abstand nach vorn und hinten
      ehemalige: [],          // frueher Klubs - Stoff fuer spaetere Wiedersehen
      /* ----------------------------------------------------------------
         Was du einem Verein bedeutest

         Die Bilanz je Verein wurde bisher erst am Karriereende
         zusammengerechnet - waehrend der Laufbahn wusste das Spiel
         nicht, ob jemand im dritten oder im dreizehnten Jahr bei
         seinem Klub steht. Damit fehlte das, was einen Spieler an
         einen Ort bindet: dass er dort jemand geworden ist.

         Gefuehrt wird deshalb mit: Saisons, Titel, Jahre mit dem C,
         Jahre als Saeule. Daraus ergibt sich ein Rang, und der hat
         Folgen, solange man dort spielt.
         ---------------------------------------------------------------- */
      klubKonto: {},
      /* Welche Vereine zuletzt im Angebot standen. Eine Liga hat sechs
         bis sechzehn Vereine, und das passende Band davon ist noch
         kleiner - gemessen nannte fast jedes dritte Angebot einen
         Verein, den man in dieser Laufbahn schon gesehen hatte. Wer
         gerade dran war, rutscht deshalb nach hinten. Ausgeschlossen
         wird niemand: dass ein Verein es zwei Jahre spaeter noch
         einmal versucht, ist gerade das Realistische. */
      zuletztAngeboten: [],
      /* ----------------------------------------------------------------
         Was der Koerper behaelt

         Verschleiss sammelte sich an und wirkte nur auf zwei Dinge:
         ob im Sommer eine Frage kommt und wie wahrscheinlich der
         Ruecktritt wird. Auf das Verletzungsrisiko selbst wirkte er
         nicht - ein verschlissener Koerper brach also nicht leichter
         als ein frischer. Gemessen sah es zwar so aus (bei den Aelteren
         21 gegen 38 Prozent), aber das war Selektion: wer wenig robust
         ist, verletzt sich oefter und sammelt dabei Verschleiss.

         Dazu kommt, was in echten Laufbahnen das Muster ist: es ist
         selten eine neue Verletzung. Es ist dasselbe Knie.
         ---------------------------------------------------------------- */
      grenzeVerschoben: 0,    // wie weit die Anlage sich bewegt hat
      verletzungsjahre: 0,    // aufgelaufener Verschleiss
      altlasten: {},          // Verletzung -> wie oft sie schon da war
      /* ----------------------------------------------------------------
         Der Jahrgang als Massstab

         Er wurde beim Draft vollstaendig ausgespielt und danach
         angezeigt - ein Vergleich, den man sich ansehen konnte, aber
         keine Kraft. Dabei ist er das Naheliegendste, was einen
         Spieler antreibt: nicht die Tabelle, sondern der eine, der
         mit ihm gezogen wurde und gerade vorbeigezogen ist.

         Seit die Moral wirklich auf die Ausbeute wirkt, laesst sich
         das verbinden: der Platz im Jahrgang bewegt die Moral, und
         die Moral bewegt das Spiel. Damit ist der Rivale kein
         Schaubild mehr, sondern ein Teil der Rechnung.
         ---------------------------------------------------------------- */
      wechselfrist: null,     // offene Entscheidung an der Transferfrist
      wechselGeprueft: false,
      ziele: null,            // Vorgaben des Klubs fuer die laufende Saison
      zielBilanz: { erfuellt: 0, verfehlt: 0 },
      trainer: null,          // Name des aktuellen Trainers
      mitspieler: null,       // engster Weggefaehrte im Team
      torwartrivale: null,    // der zweite Mann im Tor, nur fuer Torhueter
      freigeschaltet: [],     // durch Entscheidungen geoeffnete Stränge
      strangNamen: {},        // wer zu welchem Strang gehoert (Kontinuitaet)
      formzustand: 0,         // mehrjaehriger Lauf: -1 Krise ... +1 Hoehenflug
      scheitel: 0,            // individueller Hoehepunkt des Koerpers
      ruecktrittsfrage: null, // offene Frage: weitermachen oder aufhoeren?
      zusatzjahre: 0,         // Jahre, die bewusst drangehaengt wurden
      altersgrenze: false,    // maxAge ueberschritten - entschieden wird in vertragspruefung
      laenderBilanz: { gp:0, g:0, a:0, p:0, wins:0, so:0, turniere:0, medaillen:0 },
      vertragJahre: 2,        // Restlaufzeit des aktuellen Vertrags
      fertig: false,
      grund: null,
      angebote: null,
      ovrLetzte: null,       // Wertung der Vorsaison, fuer die Entwicklung
      attrsLetzte: null,
      offeneNotizen: [],      // Meldungen, die die naechste Saison zeigt
      angebotsGrund: null,
      angebotsBelege: null,
      /* ----------------------------------------------------------------
         Der Draht zum Berater

         Er kam bisher nur im Text vor: "Dein Berater sagt, eine
         Forderung sei drin." Jetzt ist er eine Groesse, die Ereignisse
         heben und senken - und wer einen guten Draht hat, kann sich
         einmal je Angebotsrunde neue Angebote einholen lassen.
         ---------------------------------------------------------------- */
      beraterDraht: 30,        // 0-100
      beraterGenutzt: false,   // in dieser Angebotsrunde schon nachgefragt?
      angebotsBasis: null,     // womit die aktuellen Angebote entstanden sind
      /* Warum der eigene Verein diesmal kein Angebot gemacht hat. */
      keineVerlaengerung: null,
      kauftRaus: false,        // ein groesserer Klub kauft dich aus dem Vertrag
      training: null
    };

    /* Individueller Scheitelpunkt: Torhueter reifen spaeter als Stuermer.
       Er steht jetzt am Spieler (siehe newPlayer) - gewuerfelt wird nur
       noch fuer Laufbahnen, die vor dieser Aenderung gespeichert
       wurden. Der Wurf bleibt an derselben Stelle im Zufallsstrom,
       damit sich gespeicherte Laufbahnen unveraendert nachspielen. */
    const scheitelAlt = clamp((isG ? 29 : 27) + ri(r, -3, 4) + (r() - 0.5) * 1.5, 23, 33);
    st.scheitel = player.scheitel != null ? player.scheitel : scheitelAlt;
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
      /* ------------------------------------------------------------------
         Wer als Kind ausgewandert ist, lernt woanders Eishockey

         Die Angebote kamen alle aus der Heimatjugend plus einem Verein
         aus dem heimischen Unterbau - auch fuer den, dessen
         Herkunftskarte "Neue Sprache, neue Halle, neue Regeln" sagt.
         Die Karte erzaehlte eine Auswanderung, das Spiel schickte ihn
         nach Hause.
         ------------------------------------------------------------------ */
      const ausgewandert = (player.picks || []).some(x => x.id === 'h_ausland');
      const fremdeJugend = D.LEAGUES.filter(l => l.jugend && l.k !== heimJugend
                                            && clubsOf(l.k).length);
      const quelle = ausgewandert && fremdeJugend.length
        ? shuffle(r, fremdeJugend).slice(0, 2).map(l => pick(r, clubsOf(l.k)))
        : shuffle(r, clubsOf(heimJugend)).slice(0, 2);
      const kandidaten = quelle.filter(Boolean);
      // Ein Angebot aus dem Unterbau - daheim, oder eben auch nicht
      const unten = D.LEAGUES.filter(l => l.prestige >= 8 && l.prestige <= 22);
      const heimatLand = (nation(player.nation) || {}).n;
      const heimLiga = ausgewandert
        ? (pick(r, unten.filter(l => l.land !== heimatLand)) || pick(r, unten))
        : (unten.find(l => l.land === heimatLand) || pick(r, unten));
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
    /* Der Ruhepunkt aus Nerven bzw. Konstanz, plus ein Eigenanteil,
       damit zwei gleich veranlagte Spieler nicht dieselbe Stimmung
       haben. Die Spanne bleibt eng - es geht um eine Neigung, nicht
       um ein zweites Talent. */
    (() => {
      const ruhe = isG ? (player.attrs.konstanz || 50) : (player.attrs.nerven || 50);
      const eigen = rng(player.seed + ':stimmung')();
      st.grundstimmung = Math.round(clamp(58 + (ruhe - 50) * 0.34 + eigen * 12, 52, 88));
      st.moral = st.grundstimmung;
    })();
      st.entscheidungen.push(a.club.n);
      return true;
    }

    /* ---- Ligatabelle der laufenden Saison ---- */
    function baueTabelle(clubLg, eigenerKlub, einfluss){
      const spiele = clubLg === 'NHL' ? 82 : 52;
      const teams = clubsOf(clubLg).map(c => {
        const kraft = klubStaerke(c) + (c.n === eigenerKlub ? einfluss : 0) + (r() - 0.5) * 13;
        const punkte = Math.round(clamp((kraft - 45) / 50, 0.15, 0.85) * spiele * 2);
        return { n: c.n, punkte, eigen: c.n === eigenerKlub };
      });
      teams.sort((a, b) => b.punkte - a.punkte);
      teams.forEach((t, i) => t.platz = i + 1);
      return teams;
    }

    /* ---- Karriereereignisse ---- */
    /* ---------------------------------------------------------------
       Die Sommerpause. Bisher lief sie automatisch durch. Jetzt ist sie
       eine Wahl - aber nur, wenn wirklich etwas auf dem Spiel steht,
       damit sie nicht jedes Jahr einen Klick kostet.
       --------------------------------------------------------------- */
    /* ----------------------------------------------------------------
       Die Reha

       Ein Fuenftel aller Saisons endete mit einer Verletzung, und der
       Spieler konnte nichts dazu tun: eine Zeile Text, ein paar
       verpasste Spiele, fertig. Dabei ist genau das die Stelle, an der
       Laufbahnen kippen - wer zu frueh zurueckkommt, verkuerzt sie,
       wer sich Zeit laesst, verliert ein halbes Jahr.

       Die drei Wege sind keine Wette gegeneinander, sondern ein Tausch:
       Zeit gegen Haltbarkeit. Deshalb sind die Aussichten hoch - was
       ungewiss ist, ist nicht das Ob, sondern was der Koerper daraus
       macht.
       ---------------------------------------------------------------- */
    function macheReha(v){
      const schwer = v.schwere >= 2 || v.spiele >= 24;
      return {
        art: 'reha', ikone: 'pflaster', tag: 'Nach der Verletzung',
        titel: v.n + ' – wie kommst du zurück?',
        text: 'Der Sommer gehört der Schulter, dem Knie, dem Rücken. '
            + v.spiele + ' Spiele hast du verpasst. Die Ärzte geben dir drei Wege, '
            + 'und alle drei haben ihren Preis.',
        /* Dieselbe Form wie die Sommerpause - sonst steht im Kopf
           "undefined Jahre". */
        stand: { alter: st.age, klub: st.club ? st.club.n : null,
                 verletzung: v.n, spiele: v.spiele,
                 verschleiss: st.verletzungsjahre || 0 },
        optionen: [
          { t: 'Nichts überstürzen', ikone: 'herz', chance: 88,
            hinweis: 'Der Saisonstart fällt aus, dafür hält der Körper',
            wirkung: 'geduld',
            gut: { trait: { robust: schwer ? 8 : 5 },
                   text: 'Du steigst erst im Oktober ein – und spürst das Knie danach kein einziges Mal.' },
            schlecht: { moral: -5,
                   text: 'Die Wochen ziehen sich. Als du zurückkommst, läuft die Mannschaft ohne dich.' } },

          { t: 'Dem Plan folgen', ikone: 'kalender', chance: 78,
            hinweis: 'Was die Ärzte sagen, nicht mehr und nicht weniger',
            wirkung: 'plan',
            gut: { form: 0.05, moral: 4,
                   text: 'Woche für Woche wie im Buch. Zum Auftakt bist du da, als wäre nichts gewesen.' },
            schlecht: { form: -0.04,
                   text: 'Der Plan geht auf, das Gefühl nicht. Es dauert bis Weihnachten.' } },

          { t: 'Vor dem Auftakt zurück sein', ikone: 'flamme', chance: 52,
            hinweis: 'Schneller als vernünftig – der Trainer wird es merken',
            wirkung: 'eile', wagnis: true,
            gut: { ruf: 7, moral: 8, form: 0.07, rolle: 1,
                   text: 'Beim ersten Spiel stehst du auf dem Eis. In der Kabine spricht man darüber.' },
            schlecht: { risiko: 11, form: -0.09, verschleiss: 1,
                   text: 'Zu früh. Es hält vier Wochen, dann meldet sich dieselbe Stelle wieder.' } }
        ]
      };
    }

    function macheSommer(){
      const verschleiss = st.verletzungsjahre || 0;
      /* Nach einer schweren Verletzung ist die Sommerpause keine Frage
         des Zufalls mehr - da steht etwas an. */
      const letzte = st.seasons[st.seasons.length - 1];
      const v = letzte && letzte.verletzung;
      if (v && v.spiele >= 9) return macheReha(v);

      const lohnt = st.age >= 26 || verschleiss >= 2;
      if (!lohnt || r() > 0.5) return null;

      const muede = verschleiss >= 2;
      const optionen = [
        { t: 'Durchtrainieren', ikone: 'flamme', chance: 72,
          hinweis: 'Härter als der Rest der Liga',
          wirkung: 'hart',
          gut: { text: 'Zwölf Wochen ohne einen freien Tag. Im September merkt man es sofort.' },
          schlecht: { risiko: 8, moral: -4,
            text: 'Du überziehst. Der Rücken meldet sich schon vor dem ersten Spiel.' } },

        { t: 'Wirklich abschalten', ikone: 'herz', chance: 80,
          hinweis: 'Sechs Wochen kein Eis',
          wirkung: 'ruhe',
          gut: { form: 0.08, moral: 8,
            text: 'Zum ersten Mal seit Jahren fehlt dir das Eis wieder – und das ist ein gutes Zeichen.' },
          schlecht: { text: 'Die Pause tut gut, mehr aber auch nicht.' } },

        { t: 'Auftritte und Werbung annehmen', ikone: 'auge', chance: 66,
          hinweis: 'Dein Name wird größer, deine Beine nicht',
          wirkung: 'presse',
          gut: { ruf: 10, text: 'Drei Wochen Termine. Danach kennen dich Leute, die kein Eishockey schauen.' },
          schlecht: { form: -0.05, moral: -4,
            text: 'Zu viele Termine, zu wenig Ruhe. Du startest platt in die Vorbereitung.' } }
      ];

      if (muede){
        optionen.push({
          t: 'Den Eingriff machen lassen', ikone: 'pflaster', chance: 62,
          hinweis: 'Kostet den Start der Saison, räumt aber auf',
          wirkung: 'operation',
          gut: { text: 'Der Sommer ist weg, die Schmerzen auch. Du fühlst dich Jahre jünger.' },
          schlecht: { risiko: 6, moral: -6,
            text: 'Die Heilung zieht sich. Du kommst zu spät und zu vorsichtig zurück.' }
        });
      }

      return {
        art: 'sommer', ikone: 'uhr', tag: 'Sommerpause',
        titel: muede ? 'Ein Sommer, in dem der Körper mitredet'
                     : 'Zwölf Wochen ohne Pflichtspiel',
        text: muede
          ? 'Die letzten Jahre stecken dir in den Gelenken. Der Mannschaftsarzt sagt, '
            + 'es gäbe einen Eingriff, der vieles aufräumt – und dich den Saisonstart kostet.'
          : 'Kein Spiel, kein Trainer, keine Vorgabe. Was du in diesen Wochen tust, '
            + 'sieht niemand – merken wird man es trotzdem.',
        stand: { alter: st.age, verschleiss },
        optionen
      };
    }

    function entscheideSommer(index){
      const so = st.sommer;
      if (!so) return null;
      const o = so.optionen[clamp(index, 0, so.optionen.length - 1)];
      const wurf = r() * 100;
      const gelungen = wurf < o.chance;
      const e = gelungen ? o.gut : o.schlecht;

      const folge = { gelungen, wurf: Math.round(wurf), text: e.text || '', chance: o.chance,
                      wahl: o.t, titel: so.titel, tag: so.tag, wirkungen: [] };
      const merke = (t, gut) => folge.wirkungen.push({ t, gut });

      if (gelungen){
        if (o.wirkung === 'hart'){
          st.sommerBonus = 3;                    // staerkeres Training in diesem Jahr
          merke('Training wirkt stärker', true);
        }
        if (o.wirkung === 'ruhe'){
          st.verletzungsjahre = Math.max(0, (st.verletzungsjahre || 0) - 1);
          merke('Verschleiß abgebaut', true);
        }
        if (o.wirkung === 'operation'){
          st.verletzungsjahre = 0;
          st.risikoBonus = Math.max(0, st.risikoBonus - 0.05);
          merke('Verschleiß bereinigt', true);
        }
      }
      /* Geduld kostet Spiele, egal wie es ausgeht - das ist der Preis,
         nicht das Risiko. Deshalb steht es ausserhalb der Abfrage. */
      if (o.wirkung === 'geduld'){
        st.startVerpasst = (st.startVerpasst || 0) + (gelungen ? 7 : 11);
        st.verletzungsjahre = Math.max(0, (st.verletzungsjahre || 0) - 1);
        merke('Saisonstart verpasst', false);
        merke('Verschleiß abgebaut', true);
      }
      if (e.ruf){    st.ruf = clamp(st.ruf + e.ruf, 20, 99);
                     merke((e.ruf > 0 ? '+' : '') + e.ruf + ' Ansehen', e.ruf > 0); }
      if (e.moral){  moralAendern(e.moral);
                     merke((e.moral > 0 ? '+' : '') + e.moral + ' Moral', e.moral > 0); }
      if (e.form){   st.formBonus += e.form;
                     merke((e.form > 0 ? '+' : '') + Math.round(e.form * 100) + '% Form', e.form > 0); }
      if (e.risiko){ st.risikoBonus += e.risiko / 100;
                     merke(e.risiko > 0 ? '+' + e.risiko + ' Verletzungsrisiko'
                       : Math.abs(e.risiko) + ' weniger Verletzungsrisiko',
                       e.risiko < 0); }
      if (e.trait) Object.entries(e.trait).forEach(([k, v]) => {
        player.traits[k] = (player.traits[k] || 0) + v;
        const n = { robust:'Robustheit', langlebig:'Haltbarkeit',
                    jung:'Frühreife', playoff:'Playoff-Stärke' }[k] || k;
        merke((v > 0 ? '+' : '') + v + ' ' + n, v > 0);
      });
      if (e.verschleiss){
        st.verletzungsjahre = (st.verletzungsjahre || 0) + e.verschleiss;
        merke('Der Körper trägt es mit', false);
      }
      if (e.rolle) rollenGutschrift(e.rolle);
      wirkeLeben(e.leben, merke);
      if (!folge.wirkungen.length) merke('Ein Sommer wie jeder andere', gelungen);

      st.verlauf.push({
        jahr: st.year, alter: st.age, art: 'sommer',
        tag: so.tag, titel: so.titel, wahl: o.t, gelungen, chance: o.chance,
        wagnis: !!o.wagnis
      });
      st.letzteFolge = folge;
      st.sommer = null;
      return folge;
    }

    /* ---------------------------------------------------------------
       Die Nationalmannschaft: Bisher lief sie voellig ohne dein Zutun.
       Jetzt fragt der Verband vor der Saison, ob du im Fruehjahr zur
       Verfuegung stehst - mit echten Folgen fuer beide Seiten.
       --------------------------------------------------------------- */
    function pruefeNominierung(){
      if (!st.natDebuet || !st.club) return null;      // erst nach dem Debuet
      /* Wer den Verband oeffentlich angegriffen oder abgesagt hat, wird
         nicht gefragt - das stand bisher nur im Text des Ausgangs. */
      if (st.natGesperrtBis && st.year < st.natGesperrtBis) return null;
      /* Das Altersfenster war enger als das der Nominierung selbst:
         gefragt wurde von 22 bis 35, nominiert werden konnte jeder
         ueber 20. Gemessen standen deshalb Spieler mit 37 bis 41 beim
         Turnier, ohne je gefragt worden zu sein - und einen
         Achtunddreissigjaehrigen mit Wertung 93 laedt ein Verband sehr
         wohl noch ein. Die untere Grenze folgt der Stufenwahl: bis
         zwanzig geht man ueber die Junioren. */
      if (st.age < 21) return null;
      /* ------------------------------------------------------------------
         Wer nominiert wird, wird auch gefragt

         Hier stand ein Muenzwurf: in 55 Prozent der Jahre kam die
         Anfrage gar nicht erst. Ob man aber im Sommer beim Turnier
         steht, entschied davon unabhaengig die Leistung - gemessen
         fanden 67 Prozent aller A-Turniere statt, ohne dass der
         Verband je gefragt haette. Man stand einfach da.

         Die Anfrage ist die einzige Stelle, an der man ueber sein
         Nationaltrikot entscheidet. Sie faellt jetzt nicht mehr aus;
         wer nicht will, sagt ab, und das merkt sich der Verband
         (siehe verbandFragtAn).
         ------------------------------------------------------------------ */
      if (!verbandFragtAn()) return null;              // wer absagt, wird seltener gefragt

      /* ----------------------------------------------------------------
         Gefragt wird nur, wer auch in Frage kommt

         Der Verband fragte unabhaengig davon, ob er den Spieler
         nachher ueberhaupt nominieren wuerde - gemessen fuehrten nur
         22 Prozent aller Zusagen zu einem Turnier, der Rest endete mit
         einer Erklaerung, warum es doch nichts wurde. Das ist keine
         Anfrage, das ist eine Umfrage.

         Die Schwelle ist dieselbe, an der spaeter auch wirklich
         ausgewaehlt wird - mit etwas Spielraum nach unten, weil
         zwischen Anfrage und Turnier noch eine Saison liegt und sich
         ein Spieler darin auch steigern kann.
         ---------------------------------------------------------------- */
      const letzteS = st.seasons[st.seasons.length - 1];
      const natB = (nation(player.nation) || {}).wm || 70;
      const wertJetzt = letzteS ? letzteS.ovr : 0;
      /* Die Schwelle liegt bewusst unter der spaeteren Nominierungs-
         schwelle. Zwei Gruende: die Anfrage kennt nur die letzte Saison,
         die Nominierung die laufende - wer sich verbessert, faellt sonst
         durch die Frage und steht trotzdem beim Turnier. Und der
         Verbandsbonus einer Eigenschaft senkt die Nominierungsschwelle,
         die Frage kannte ihn gar nicht. Gemessen fanden 22 Prozent
         aller A-Turniere ohne vorherige Frage statt. */
      const natBonusFrage = (player.wirkung || {}).natBonus || 0;
      if (wertJetzt < 78 + (100 - natB) * 0.26 - 11 - natBonusFrage * 0.45) return null;

      /* ----------------------------------------------------------------
         Der Verband fragt nur fuer die A-Mannschaft

         Die Frage kannte keine Altersstufen, die Auswertung schon -
         und dort werden U18 und U20 zuerst geprueft, mit deutlich
         tieferer Huerde als die A-Mannschaft. Wer mit zwanzig die
         A-Huerde naehme, naeme die U20-Huerde erst recht - gefragt
         wuerde nach Olympia, gefahren zur U20-WM. Gemessen tritt das
         heute nie ein, weil die A-Huerde so hoch liegt; die Sperre
         haelt die beiden Stellen aber in derselben Reihenfolge, falls
         an einer von beiden je geschraubt wird.

         Fuer die Junioren fragt niemand - man wird nominiert und faehrt.
         Das ist auch realistisch: eine U20-Einladung schlaegt man nicht
         aus. Wer ueber zwanzig noch in einer Jugendliga spielt, kommt
         fuer die A-Mannschaft ohnehin nicht in Frage.
         ---------------------------------------------------------------- */
      if (st.age <= 20) return null;
      if (istJugend(st.club.lg)) return null;

      const nat = nation(player.nation);
      const ctx = ereignisKontext();
      const olympia = (st.year + 1) % 4 === 0;
      const T = olympia ? D.TURNIERE.olympia : D.TURNIERE.wm;
      /* Gemessen liegt das Ansehen bei der Anfrage im Median bei 95 und
         95 Prozent haben mindestens 80 - als Filter taugt es allein nicht.
         Das C bekommt nur, wer obendrein Turniererfahrung und das Alter
         dafuer hat und es nicht schon traegt. */
      /* Wer zweimal abgesagt hat, bekommt das C nicht - dafuer muss
         man dagewesen sein. */
      const angesehen = st.ruf >= 97 && !st.natKapitaen && st.age >= 27
                     && st.laenderBilanz.turniere >= 3 && st.natAbsagen === 0;

      const optionen = [
        { t: 'Zusagen', ikone: 'schild', chance: 88,
          hinweis: 'Das Trikot deines Landes, im Zweifel ohne Diskussion',
          zusage: true,
          gut: { ruf: 5, moral: 6,
                 text: 'Du meldest dich ohne Zögern. Beim Verband weiß man, woran man bei dir ist.' },
          schlecht: { risiko: 5,
                 text: 'Du sagst zu, aber die Saison steckt dir in den Knochen. Der Sommer wird kurz.' } },

        { t: 'Absagen und den Sommer nutzen', ikone: 'herz', chance: 70,
          /* Der Hinweis versprach schon immer, der Verband merke es
             sich - nur tat er es nicht. Jetzt steht dahinter, was es
             wirklich heisst. */
          hinweis: st.natAbsagen >= 1
            ? 'Die zweite Absage – danach fragen sie eine Weile nicht mehr'
            : 'Erholung für den Klub – der Verband merkt es sich',
          zusage: false,
          gut: { form: 0.09, moral: 5,
                 text: 'Sechs Wochen ohne Eis. Du startest frischer in die neue Saison als seit Jahren.' },
          schlecht: { ruf: -9, moral: -5,
                 text: 'Die Absage wird öffentlich zerredet. In deinem Land nimmt man dir das übel.' } }
      ];

      if (angesehen){
        optionen.push({
          t: 'Zusagen und die Führung übernehmen', ikone: 'krone', chance: 52,
          hinweis: 'Das C von ' + nat.n + ' – oder ein peinlicher Korb',
          zusage: true, fuehrung: true,
          gut: { ruf: 13, moral: 9, attr: { nerven: 4 },
                 text: 'Sie geben dir das C. Ein Land im Rücken fühlt sich anders an als ein Verein.' },
          schlecht: { ruf: -7, moral: -6,
                 text: 'Man dankt für das Angebot und vergibt es an einen anderen. Das spricht sich herum.' }
        });
      }

      return {
        art: 'nominierung', ikone: 'pfeife', tag: 'Verbandsanfrage',
        titel: nat.n + ' fragt für die ' + T.n + ' an',
        text: 'Der Verband will früh wissen, ob im Frühjahr mit dir zu rechnen ist. '
            + 'Das Turnier liegt direkt hinter der Saison – wer hinfährt, hat keinen Sommer. '
            + (st.natAbsagen ? 'Beim letzten Mal hast du abgesagt; das steht im Raum. '
                             : 'Bisher warst du immer da. ')
            + (ctx.klub ? esc0(ctx.klub) + ' sieht solche Reisen ohnehin ungern.' : ''),
        stand: { klub: st.club.n, nation: nat.n, turnier: T.n, absagen: st.natAbsagen },
        optionen
      };
    }

    /* ----------------------------------------------------------------
       Ob der Verband ueberhaupt noch anruft

       Absagen wurden gezaehlt und im Text erwaehnt ("Beim letzten Mal
       hast du abgesagt; das steht im Raum") - Folgen hatten sie
       keine. Man konnte jedes Jahr absagen und wurde jedes Jahr
       wieder gefragt. Jetzt zieht sich der Verband zurueck, und zwar
       vorruebergehend: nach ein paar Jahren ist Gras darueber
       gewachsen, wenn man in der Zwischenzeit geliefert hat.
       ---------------------------------------------------------------- */
    function verbandFragtAn(){
      if (!st.natAbsagen) return true;
      /* Je Absage sinkt die Wahrscheinlichkeit, aber nie auf null -
         eine starke Saison holt einen zurueck ins Aufgebot. */
      const zurueckhaltung = Math.min(0.75, st.natAbsagen * 0.30);
      const gutGespielt = st.ruf >= 92 ? 0.25 : 0;
      return r() > (zurueckhaltung - gutGespielt);
    }

    /* Kleine Absicherung: In Ereignistexten steht nichts als Markup. */
    function esc0(t){ return String(t == null ? '' : t); }

    function entscheideNominierung(index){
      const f = st.nominierung;
      if (!f) return null;
      const o = f.optionen[clamp(index, 0, f.optionen.length - 1)];
      const wurf = r() * 100;
      const gelungen = wurf < o.chance;
      const e = gelungen ? o.gut : o.schlecht;
      const ctx = ereignisKontext();

      const folge = { gelungen, wurf: Math.round(wurf), text: einsetzen(e.text || '', ctx), chance: o.chance,
                      wahl: o.t, titel: f.titel, tag: f.tag, wirkungen: [] };
      const merke = (t, gut) => folge.wirkungen.push({ t, gut });

      if (e.attr) Object.entries(e.attr).forEach(([k, v]) => {
        attrHeben(player, k, v);
        merke('+' + v + ' ' + k, true);
      });
      if (e.ruf){   st.ruf = clamp(st.ruf + e.ruf, 20, 99);
                    merke((e.ruf > 0 ? '+' : '') + e.ruf + ' Ansehen', e.ruf > 0); }
      if (e.moral){ moralAendern(e.moral);
                    merke((e.moral > 0 ? '+' : '') + e.moral + ' Moral', e.moral > 0); }
      if (e.form){  st.formBonus += e.form;
                    merke('+' + Math.round(e.form * 100) + '% Form', true); }
      if (e.risiko){ st.risikoBonus += e.risiko / 100;
                    merke(e.risiko > 0 ? '+' + e.risiko + ' Verletzungsrisiko'
                      : Math.abs(e.risiko) + ' weniger Verletzungsrisiko',
                      e.risiko < 0); }

      wirkeLeben(e.leben, merke);

      st.natZusage = !!o.zusage;
      /* Damit die Saison weiss, dass eine Zusage vorliegt, die
         eingeloest oder erklaert werden muss. */
      st.natGefragt = !!o.zusage;
      if (!o.zusage){ st.natAbsagen++; merke('Absage an den Verband', false); }
      if (o.fuehrung && gelungen){
        st.natKapitaen = true;
        merke('Kapitän der Nationalmannschaft', true);
      }
      st.natRolle = (o.fuehrung && gelungen) ? 'fuehrung' : null;

      if (!folge.wirkungen.length) merke('Keine bleibende Wirkung', true);

      st.verlauf.push({
        jahr: st.year, alter: st.age, art: 'nominierung',
        tag: f.tag, titel: f.titel, wahl: o.t, gelungen, chance: o.chance, wagnis: false
      });
      st.letzteFolge = folge;
      notizMerken({ t: 'Verband: ' + o.t + (gelungen ? ' – gelungen' : ' – misslungen'),
                    c: gelungen ? 'good' : 'bad' });
      st.nominierung = null;
      return folge;
    }

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
      const diff = klubStaerke(st.club) - schnitt;
      const stark = clubsOf(st.club.lg)
        .filter(c => c.n !== st.club.n && klubStaerke(c) > schnitt + 5);

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
            { t: 'Den Wechsel durchsetzen', ikone: 'flug',
              chance: st.sperre ? 18 : st.klausel ? 92 : 62,
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
            gut: { ruf: 8, moral: 6, trait: { playoff: 5 }, form: 0.06, rolle: 2,
                   text: 'Er stellt dich neben die Neuzugänge. Ab jetzt spielst du die wichtigen Minuten.' },
            schlecht: { moral: -8, rolle: -2,
                   text: 'Du bekommst, was du dir verdienst – sagt er. Die Neuen spielen, du schaust zu.' } },
          { t: 'Dich in den Dienst der Mannschaft stellen', ikone: 'herz', chance: 80,
            hinweis: 'Weniger Rampenlicht, mehr Rückhalt',
            gut: { moral: 10, attr: { defensive: 3 }, rolle: 1,
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
      const wurf = r() * 100;
      const gelungen = wurf < o.chance;
      const e = gelungen ? o.gut : o.schlecht;
      const ctx = ereignisKontext();

      const folge = { gelungen, wurf: Math.round(wurf), text: einsetzen(e.text || '', ctx), chance: o.chance,
                      wahl: o.t, titel: w.titel, tag: w.tag, wirkungen: [] };
      const merke = (t, gut) => folge.wirkungen.push({ t, gut });
      const attrName = k => {
        const x = D.ATTRS.skater.concat(D.ATTRS.goalie).find(y => y.k === k);
        return x ? x.n : k;
      };

      if (e.attr) Object.entries(e.attr).forEach(([k, v]) => {
        attrHeben(player, k, v);
        /* Den uebersetzten Namen zeigen - sonst steht "Uebersicht" da
           und gestiegen ist das Spielverstaendnis des Torhueters. */
        const echt = attrFuer(player, k);
        if (echt) merke('+' + v + ' ' + attrName(echt), true);
      });
      if (e.trait) Object.entries(e.trait).forEach(([k, v]) =>
        player.traits[k] = (player.traits[k] || 0) + v);
      if (e.ruf){   st.ruf = clamp(st.ruf + e.ruf, 20, 99);
                    merke((e.ruf > 0 ? '+' : '') + e.ruf + ' Ansehen', e.ruf > 0); }
      if (e.moral){ moralAendern(e.moral);
                    merke((e.moral > 0 ? '+' : '') + e.moral + ' Moral', e.moral > 0); }
      if (e.form){  st.formBonus += e.form;
                    merke((e.form > 0 ? '+' : '') + Math.round(e.form * 100) + '% Form', e.form > 0); }

      wirkeLeben(e.leben, merke);
      /* Und dasselbe noch einmal fuer die Rolle: acht Ereignisse
         versprachen Rollenpunkte, aber e.rolle wurde ausschliesslich
         im Sommerhandler ausgewertet - in einem gewoehnlichen Ereignis
         verpuffte die Zusage. Dieselbe Luecke wie bei Moral und
         Verschleiss, nur an einer dritten Stelle. */
      if (e.rolle) rollenGutschrift(e.rolle);
      /* Verschleiss war bislang nur im Sommerhandler vorgesehen - in
         einem gewoehnlichen Ereignis waere er stumm verpufft, so wie
         schon einmal die Moral. Beide Wege koennen den Koerper
         belasten, also kennen ihn auch beide. */
      if (e.verschleiss){
        st.verletzungsjahre = (st.verletzungsjahre || 0) + e.verschleiss;
        merke('Der Körper trägt es mit', false);
      }

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
                                    klub: w.stand ? w.stand.klub : null,
                                    /* Woher der Faden kommt - damit das
                                       Folgeereignis darauf verweisen kann. */
                                    jahr: st.year, alter: st.age,
                                    wahl: o.t, tag: w.tag };
      }

      st.verlauf.push({
        jahr: st.year, alter: st.age, art: 'wechselfrist',
        tag: w.tag, titel: w.titel,
        wahl: o.t, gelungen, chance: o.chance, wagnis: false
      });
      st.letzteFolge = folge;
      notizMerken({ t: 'Wechselfrist: ' + o.t + (gelungen ? ' – gelungen' : ' – misslungen'),
                    c: gelungen ? 'good' : 'bad' });
      st.wechselfrist = null;
      return folge;
    }

    /* ---------------------------------------------------------------
       Saisonziele: Der Klub formuliert vor jeder Saison eine Erwartung
       an die Mannschaft und eine an dich persoenlich. Beide werden am
       Ende abgerechnet – das gibt jedem Jahr einen eigenen Einsatz.
       --------------------------------------------------------------- */
    /* ----------------------------------------------------------------
       Klubs verändern sich

       Bisher war die Staerke eines Klubs eine feste Zahl aus der
       Datendatei: Florida stand 2026 bei 91 und 2045 immer noch. Kein
       Klub baute je um, keiner zerfiel, keiner stieg auf. Damit war
       "Titelkandidat" eine Eigenschaft statt eines Zustands - und die
       Frage, ob man einen Verein verlaesst, hatte nie einen Grund
       ausser dem eigenen Ehrgeiz.

       Jeder Klub hat jetzt seinen eigenen Zyklus: sechs bis zehn
       Jahre von der Spitze in den Umbruch und zurueck, mit einem
       Ausschlag von fuenf bis zehn Punkten. Gerechnet wird das aus
       Klubname und Jahr, ohne gespeicherten Zustand - dieselbe
       Laufbahn ergibt damit immer dieselbe Liga, und zwei Laufbahnen
       treffen andere Verhaeltnisse an.
       ---------------------------------------------------------------- */
    const _zyklus = {};
    function klubZyklus(name){
      if (_zyklus[name]) return _zyklus[name];
      const h = hashSeed(player.seed + ':klub:' + name);
      const z = {
        phase: (h % 997) / 997 * Math.PI * 2,
        laenge: 6 + (h >> 4) % 5,          // 6 bis 10 Jahre
        weite: 5 + (h >> 9) % 6            // 5 bis 10 Punkte
      };
      _zyklus[name] = z;
      return z;
    }

    /* Die Staerke eines Klubs in einem bestimmten Jahr. */
    function klubStaerke(club, jahr){
      if (!club) return 76;
      const z = klubZyklus(club.n);
      const t = ((jahr === undefined ? st.year : jahr) - 2026) / z.laenge * Math.PI * 2;
      return clamp(club.str + Math.sin(z.phase + t) * z.weite, 42, 97);
    }

    /* Wohin es geht - fuer die Anzeige, damit man vor einer
       Unterschrift sieht, ob ein Klub aufsteigt oder zerfaellt. */
    function klubTrend(club, jahr){
      const j = jahr === undefined ? st.year : jahr;
      const d = klubStaerke(club, j + 2) - klubStaerke(club, j);
      return d > 2.5 ? 'auf' : d < -2.5 ? 'ab' : 'stabil';
    }

    /* Der Ligaschnitt schwankt mit - sonst waere ein Klub in einem
       schwachen Jahrgang der ganzen Liga automatisch Titelkandidat. */
    function ligaSchnittJetzt(lgKey, jahr){
      const alle = clubsOf(lgKey);
      if (!alle.length) return 76;
      return alle.reduce((a, c) => a + klubStaerke(c, jahr), 0) / alle.length;
    }

    /* ---------------------------------------------------------------
       Die Rolle im Verein

       Frueher war die Rolle eine Einstellung: einmal angeklickt, bis
       zum Vertragsende unveraenderlich, und der Klub sagte zu allem ja.
       Jetzt ist sie eine Abmachung mit drei Teilen.

       Erstens der Anspruch: eine grosse Rolle bekommt nur, wen der Klub
       gross genug einschaetzt. Wer knapp darunter liegt, bekommt sie
       auf Bewaehrung - wer weit darunter liegt, gar nicht.

       Zweitens die Passung: wofuer du gebaut bist. Ein Scorer ohne
       Praezision liefert nicht, egal was im Vertrag steht.

       Drittens die Bewaehrung: nach jeder Saison schaut der Trainer
       nach, ob die Abmachung gehalten hat. Wer liefert, wird zur
       Saeule; wer zweimal danebenliegt, verliert die Rolle mitten im
       Vertrag.
       --------------------------------------------------------------- */

    /* Wie hoch der Klub dich einschaetzt: 0 bis 3. Es zaehlt nicht der
       nackte Wert, sondern der Abstand zur Mannschaft, die dich holt -
       derselbe Spieler ist beim Aufsteiger eine Saeule und beim
       Spitzenklub der vierte Stuermer. */
    function klubRang(club, ovr){
      const abstand = ovr - (club ? klubStaerke(club) : 76);
      const rufTeil = (st.ruf - 70) / 22;
      const jung = st.age <= 20 ? -0.6 : 0;
      const punkte = abstand / 3.4 + rufTeil + jung
                   + (st.kapitaenSeit === (club && club.n) ? 0.8 : 0);
      return clamp(Math.round(punkte), 0, 3);
    }

    /* Wofuer du gebaut bist: -1 (falsch besetzt) bis +1 (wie gemacht).

       Gemessen wird gegen den eigenen Durchschnitt, nicht gegen eine
       feste Zahl. Der erste Versuch nahm den Ligaschnitt als Messlatte -
       dann galt jeder Neunzehnjaehrige fuer jede Rolle als falsch
       besetzt, und die Anzeige sagte nur noch "du bist jung". Die Frage
       ist aber nicht, ob du gut bist - das steht im Anspruch -, sondern
       worin du besser bist als in allem anderen. */
    function rollenPassung(rolle, dev){
      if (!rolle || !rolle.attr || !rolle.attr.length) return 0;
      const werte = rolle.attr.map(k => dev[k]).filter(v => typeof v === 'number');
      const alle = Object.values(dev).filter(v => typeof v === 'number');
      if (!werte.length || !alle.length) return 0;
      const schnitt = werte.reduce((a, b) => a + b, 0) / werte.length;
      const eigen   = alle.reduce((a, b) => a + b, 0) / alle.length;
      return clamp((schnitt - eigen) / 11, -1, 1);
    }

    /* Was ausserhalb der Saisonbilanz auf die Rolle einzahlt: eine
       durchgesetzte Forderung, ein verpatzter Auftritt, ein Wort in der
       Kabine. Der Stand zieht sofort nach - sonst merkte man die
       Wirkung erst ein Jahr spaeter. */
    function rollenGutschrift(n){
      if (!st.rolle || !n) return;
      st.rollenPunkte = clamp(st.rollenPunkte + n, -4, 4);
      st.rollenStand = st.rollenPunkte >= 3 ? 'saeule'
                     : st.rollenPunkte <= -1 ? 'bewaehrung' : 'gesetzt';
    }

    /* Ohne die Notbremse steht hier ein harter Absturz, sobald ein
       Browser eine alte data.js neben einer neuen engine.js liegen hat -
       genau das ist beim Entwickeln passiert. */
    /* ----------------------------------------------------------------
       Die eine Stelle, an der sich die Moral aendert

       Sie wurde an neunzehn Stellen direkt addiert, und in der Summe
       gab das Spiel zu viel: gemessen landeten 182 von 400 Laufbahnen
       ueber neunzig, obwohl der Ruhepunkt im Schnitt bei siebzig
       liegt. Jedes einzelne Ereignis nachzurechnen waere die falsche
       Antwort - es gibt fuenfundneunzig davon.

       Stattdessen greift hier ein abnehmender Ertrag: je weiter der
       Wert schon in die Richtung gewandert ist, in die der Stoss
       zeigt, desto weniger bringt er. Von 90 auf 98 ist ein weiter
       Weg, von 60 auf 68 ein kurzer - so, wie sich auch eine gute
       Nachricht bei jemandem anfuehlt, dem es ohnehin blendend geht.
       Nach unten gilt dasselbe.
       ---------------------------------------------------------------- */
    function moralAendern(d){
      if (!d) return 0;
      const m = st.moral;
      /* Wie viel Luft in der Richtung des Stosses noch ist, von 0 bis 1 */
      const luft = d > 0 ? (100 - m) / 45 : (m - 10) / 45;
      const wirksam = d * clamp(luft, 0.25, 1);
      const neu = clamp(Math.round(m + wirksam), 10, 100);
      const echt = neu - m;
      st.moral = neu;
      return echt;
    }

    /* ----------------------------------------------------------------
       Vom Zugang zur Legende

       Vier Stufen, und die Schwellen sind an der gemessenen Verteilung
       geeicht statt geraten (scratchpad/legende_pruef.js). Titel wiegen
       schwerer als Jahre, aber Jahre allein reichen auch: wer zwoelf
       Saisons bei einem Verein bleibt, ohne je etwas zu gewinnen, ist
       dort trotzdem eine Figur.
       ---------------------------------------------------------------- */
    const KLUBRANG = [
      { k:'legende',   n:'Vereinslegende', ab: 22 },
      { k:'gesicht',   n:'Gesicht des Vereins', ab: 13 },
      { k:'stammkraft',n:'Stammkraft',     ab: 6 },
      { k:'zugang',    n:'Zugang',         ab: 0 }
    ];

    function klubKonto(name){
      if (!name) return null;
      if (!st.klubKonto[name])
        st.klubKonto[name] = { saisons: 0, titel: 0, kapitaen: 0, saeule: 0,
                               punkte: 0, rang: 'zugang' };
      return st.klubKonto[name];
    }

    function klubPunkte(k){
      return k.saisons * 1.6 + k.titel * 5 + k.kapitaen * 1.4 + k.saeule * 0.9;
    }

    function klubRangVon(punkte){
      return (KLUBRANG.find(x => punkte >= x.ab) || KLUBRANG[KLUBRANG.length - 1]).k;
    }

    /* Wie fest der aktuelle Verein zu dir steht - 0 bis 1. Wird an
       mehreren Stellen gebraucht, deshalb eine Zahl statt vier
       Abfragen auf den Rang. */
    function klubBindung(){
      if (!st.club) return 0;
      const k = st.klubKonto[st.club.n];
      if (!k) return 0;
      return k.rang === 'legende' ? 1 : k.rang === 'gesicht' ? 0.6
           : k.rang === 'stammkraft' ? 0.25 : 0;
    }

    /* Eine Meldung fuer die naechste Saisonbilanz vormerken. */
    function notizMerken(n){
      if (!n) return;
      st.offeneNotizen = st.offeneNotizen || [];
      st.offeneNotizen.push(n);
    }

    function standFaktor(){
      const S = (D.ROLLENSTAND || {})[st.rollenStand || 'gesetzt'];
      return S ? S.f : 1;
    }

    /* Was der Trainer erwartet.

       Der erste Entwurf mass jede Rolle gegen die Form derselben Saison.
       Damit sank die Latte mit dem Spieler: wer nachliess, senkte
       zugleich die Erwartung und galt weiter als erfuellt. Bei den
       Scorern kam so 91 Prozent "erfuellt" heraus, das Urteil war
       praktisch beschlossen. Ausserdem hatte jede Rolle ihr eigenes
       Mass - Punkte, Plus-Minus, Fangquote -, und dieselben Schwellen
       bedeuteten je Rolle etwas anderes: 42 Prozent verfehlt beim
       Anker, 11 Prozent beim Stammtorhueter.

       Jetzt gilt beides einheitlich. Die Latte wird beim Vertrag
       festgelegt, aus Werten ohne Zufall, und bleibt liegen. Und jedes
       Mass wird auf dieselbe Skala gebracht:

           quote = 1 + (ist - soll) / spanne

       Die Spannen stammen aus den gemessenen Streuungen, damit ein
       normales Jahr in allen Rollen gleich weit ausschlaegt. Wer
       besser wird, uebertrifft; wer nachlaesst, altert oder in eine
       staerkere Liga geht, verfehlt - genau das soll die Rolle
       spuerbar machen. */
    /* Die Latte: was dein Koennen hergibt, wenn nichts dazwischenkommt.
       Dieselbe Rechnung wie in der Saison, nur ohne Tagesform.

       Die kleinen Zuschlaege sind keine Willkuer, sondern gemessene
       Korrekturen: ohne sie sagte die Vorhersage bei den Strafminuten
       neun zu wenig und beim Einsatzanteil vier Prozentpunkte zu wenig
       voraus, und die Rolle galt reihenweise als uebertroffen. */
    function latteFuer(club, ovr, dev){
      const lg = league(club ? club.lg : heimJugend);
      const w = (st.rolle && st.rolle.w) || {};
      const kante = clamp((ovr - lg.level * 0.58) / 32, -0.35, 1.7);
      const pf = P.k === 'D' ? 0.62 : (P.k === 'C' ? 1.15 : 1.0);
      return {
        ppg:    clamp(kante * pf * (1 + (w.punkte || 0) * 1.9), 0.02, 2.4) * 1.04,
        plus:   kante * 16 + ((club ? klubStaerke(club) : 76) - 76) * 0.5 + (w.plus || 0) + 0.3,
        /* Strafminuten kommen aus ri(8, 12 + Zweikampf/2) - der
           Mittelwert haengt also am Zweikampfwert, nicht an einer 20. */
        pim:    (10 + (dev.zweikampf || 50) / 4) * (w.strafen || 1),
        anteil: clamp(0.50 + (w.anteil || 0) * 1.6 + kante * 0.08, 0.12, 0.96),
        sv:     clamp(0.8755 + kante * 0.029, 0.860, 0.940) + 0.002
      };
    }

    /* Nach der Saison: hat die Abmachung gehalten? */
    function werteRolle(season, kante, posFactor, isG, dev){
      if (!st.rolle) return;
      const rolle = st.rolle;
      /* Die Latte wird jede Saison neu aus dem Koennen gerechnet, nicht
         aus der gespielten Form. Wuerde sie beim Vertrag festgelegt und
         liegen bleiben, ueberrennt sie der normale Leistungszuwachs:
         gemessen kamen dabei 68 Prozent "uebertroffen" heraus. Wuerde
         sie dagegen aus der gespielten Form kommen, sinkt sie mit dem
         Spieler mit und das Urteil waere schon beschlossen - so kamen
         beim Scorer 91 Prozent "erfuellt" heraus. Dazwischen liegt die
         Frage, um die es geht: hast du aus deinem Koennen etwas
         gemacht? */
      const L = latteFuer(st.club, season.ovr, dev);
      const vollGp = season.vollGp || season.gp || 1;

      /* Ein Mass auf die gemeinsame Skala bringen. Die Spannen stammen
         aus den gemessenen Quartilen der Abweichung, damit ein normales
         Jahr in jeder Rolle gleich weit ausschlaegt - vorher bedeuteten
         dieselben Schwellen je Rolle etwas voellig anderes. */
      const norm = (ist, soll, spanne) => 1 + (ist - soll) / spanne;
      let quote;

      if (isG){
        /* Der Einsatzanteil haengt stark am Zweikampf mit dem zweiten
           Mann - das ist Erzaehlung, aber als Massstab zu grob: mit
           enger Spanne wurde daraus ein Muenzwurf in drei Richtungen
           (34/33/32). Deshalb weite Spanne und mehr Gewicht auf die
           Fangquote, die der Torwart selbst in der Hand hat. */
        const qA = norm(season.gp / vollGp, L.anteil, 0.50);
        /* Die Spanne folgt der Skala: sie wurde von 0.045 auf 0.029
           je Punkt "kante" gestaucht, also auch hier. */
        const qS = norm(season.sv, L.sv, 0.011);
        /* Ein Aufbautorwart liefert keine Zahlen, sondern Fortschritt.
           Vorher stand hier ein Feld, das es nie gab - jeder
           Aufbautorwart verfehlte damit jede einzelne Saison.

           Wie viel Fortschritt normal ist, haengt am Alter: gemessen
           sechs Punkte mit zwanzig, zwei mit achtundzwanzig, keiner mit
           dreissig. Ohne diese Staffel waere die Rolle mit jungen
           Torhuetern ein Freifahrtschein - und mit alten unmoeglich. */
        const sollWachstum = clamp(5.4 - Math.max(0, st.age - 24) * 1.05, 0, 5.4);
        const qW = norm(season.ovr - (st.rollenVorOvr === null
                                      ? season.ovr - sollWachstum
                                      : st.rollenVorOvr), sollWachstum, 10);
        quote = rolle.k === 'stamm'   ? qA * 0.45 + qS * 0.55
              : rolle.k === 'teilung' ? qS * 0.70 + qA * 0.30
              :                         qW;
      } else {
        const ppg = season.p / Math.max(1, season.gp);
        const qP = norm(ppg, L.ppg, Math.max(0.30, L.ppg * 0.85));
        const qB = norm(season.plus, L.plus, 30);
        /* Strafminuten streuen so breit, dass sie fuer sich genommen
           kaum etwas aussagen - deshalb tragen sie nur ein Drittel. */
        const qH = norm(season.pim, L.pim, 90);
        quote = rolle.k === 'offensiv' ? qP
              : rolle.k === 'zweiweg'  ? qP * 0.55 + qB * 0.45
              : rolle.k === 'defensiv' ? qB
              :                          qB * 0.65 + qH * 0.35;
      }
      st.rollenVorOvr = season.ovr;

      /* Verletzungen zaehlen halb: wer nicht spielen konnte, hat nicht
         versagt - aber der Trainer plant trotzdem um. */
      if (season.gp / vollGp < 0.75) quote = quote * 0.5 + 0.5;

      const urteil = quote >= 1.15 ? 'uebertroffen' : quote >= 0.86 ? 'erfuellt' : 'verfehlt';
      season.rollenUrteil  = urteil;
      season.rollenQuote   = Math.round(quote * 100) / 100;
      season.rollenStand   = st.rollenStand;
      season.rollenName    = rolle.n;
      season.rollenIcon    = rolle.icon;
      season.rollenKey     = rolle.k;
      season.rollenPassung = Math.round(rollenPassung(rolle, dev) * 100) / 100;

      st.rollenPunkte = clamp(st.rollenPunkte
        + (urteil === 'uebertroffen' ? 2 : urteil === 'erfuellt' ? 1 : -2), -4, 4);
      st.rollenJahre++;

      const vorher = st.rollenStand;
      if (st.rollenPunkte >= 3)       st.rollenStand = 'saeule';
      else if (st.rollenPunkte <= -1) st.rollenStand = 'bewaehrung';
      else                            st.rollenStand = 'gesetzt';

      if (st.rollenStand !== vorher){
        season.events.push({
          t: st.rollenStand === 'saeule'
             ? rolle.n.replace(/^Als /, 'Als ') + ': der Trainer baut die Mannschaft um dich'
             : st.rollenStand === 'bewaehrung'
             ? 'Deine Rolle steht zur Debatte'
             : 'Deine Rolle ist gefestigt',
          c: st.rollenStand === 'bewaehrung' ? 'bad' : 'good' });
        moralAendern((st.rollenStand === 'saeule' ? 5
                                   : st.rollenStand === 'bewaehrung' ? -5 : 2));
        st.rollenLauf.push({ jahr: st.year, rolle: rolle.k, stand: st.rollenStand,
                             grund: urteil });
      }

      /* Zweimal danebengelegen: der Trainer stellt dich um. Das ist der
         Punkt, an dem die Rolle wirklich weh tut - mitten im Vertrag. */
      if (st.rollenPunkte <= -4){
        const alle = isG ? D.ROLLEN_G : D.ROLLEN;
        const rang = klubRang(st.club, season.ovr);
        const offen = alle.filter(x => x.k !== rolle.k && x.anspruch <= rang);
        const neu = (offen.length ? offen : alle.filter(x => x.k !== rolle.k))
          .slice().sort((a, b) => rollenPassung(b, dev) - rollenPassung(a, dev))[0];
        season.events.push({ t: 'Der Trainer stellt dich um: ' + neu.n.replace(/^Als /, ''),
                             c: 'bad' });
        season.rollenVerlust = { von: rolle.n, zu: neu.n };
        st.rolle = Object.assign({}, neu, { gehalt: rolle.gehalt });
        st.rollenStand = 'bewaehrung';
        st.rollenPunkte = 0;
        st.rollenJahre = 0;
        st.rollenVorOvr = season.ovr;
        moralAendern(-(9));
        st.rollenLauf.push({ jahr: st.year, rolle: neu.k, stand: 'bewaehrung',
                             grund: 'umgestellt', von: rolle.k });
      }
    }

    /* Was vor der Saison auf dem Tisch liegt. Ohne Zufall - der
       Auftakt darf nichts vorwegnehmen, was erst die Saison entscheidet. */
    function macheAuftakt(){
      if (!st.club) return null;
      const lg = league(st.club.lg);
      const schnitt = ligaSchnittJetzt(st.club.lg);
      const staerke = klubStaerke(st.club);
      return {
        jahr: st.year, alter: st.age,
        klub: st.club.n, liga: st.club.lg, ligaName: lg.n,
        staerke: Math.round(staerke - schnitt),
        erwartung: staerke >= schnitt + 6 ? 'Titelkandidat'
                 : staerke >= schnitt ? 'Playoff-Team'
                 : staerke >= schnitt - 6 ? 'Mittelfeld' : 'Aufbauteam',
        /* Wohin der Klub sich bewegt - das ist die Zahl, die vor einer
           Unterschrift fehlt: ein Titelkandidat im Zerfall ist ein
           anderes Angebot als ein Aufbauteam im Aufwind. */
        trend: klubTrend(st.club),
        /* Die Restlaufzeit stand bisher nur als Randnotiz in der
           Saisonbilanz - dabei haengt an ihr, ob man sich einen
           schwachen Jahrgang leisten kann. */
        vertragJahre: st.vertragJahre,
        letztesJahr: st.vertragJahre <= 1,
        /* Eine Klausel, die man waehrend der Saison vergisst, ist keine
           Entscheidung gewesen - sie steht deshalb im Auftakt. */
        bonus: st.bonus ? Object.assign({}, st.bonus) : null,
        leben: { heimweh: Math.round(st.leben.heimweh),
                 wurzeln: Math.round(st.leben.wurzeln),
                 familie: st.leben.familie, kinder: st.leben.kinder,
                 partnerMit: st.leben.partnerMit,
                 daheim: st.club && st.club.lg === homeLg },
        sperre: !!st.sperre,
        klausel: !!st.klausel,
        rolle: st.rolle ? { n: st.rolle.n, kurz: st.rolle.kurz, icon: st.rolle.icon,
                            soll: st.rolle.soll } : null,
        rollenStand: st.rollenStand,
        klubJahre: st.klubJahre,
        klubRang: (st.klubKonto[st.club.n] || {}).rang || 'zugang',
        /* Solange jemand die Rechte haelt, gehoert das in den Auftakt -
           es ist die Tuer, die einem offensteht, ohne dass man etwas
           dafuer tut. */
        draftRechte: (st.draftRechte && st.year <= st.draftRechte.bis
                   && st.club && st.draftRechte.klub !== st.club.n)
          ? { klub: st.draftRechte.klub, liga: st.draftRechte.liga,
              bis: st.draftRechte.bis, runde: st.draftRechte.runde } : null,
        entryDraft: st.entryDraft,
        verschleiss: st.verletzungsjahre || 0,
        altlasten: Object.assign({}, st.altlasten),
        klubRangName: (KLUBRANG.find(x =>
          x.k === ((st.klubKonto[st.club.n] || {}).rang || 'zugang')) || {}).n,
        kapitaen: st.kapitaenSeit === st.club.n,
        einschaetzung: einschaetzung(),
        trainer: st.trainer || null,
        trainerJahre: st.trainerJahre,
        trainerNeu: !!st.trainerNeu,
        ziele: setzeSaisonZiel(st.club),
        /* ------------------------------------------------------------
           Dieselben Kraefte, aber vorher

           Als Rueckblick im Saisonbericht war die Aufstellung eine
           Obduktion: richtig, aber zu spaet. Hier steht sie vor der
           Saison, wo sich noch etwas daran aendern laesst - durch
           Training, die Rollenwahl, eine Entscheidung im Sommer.

           Gerechnet wird mit denselben Formeln wie in der Saison
           selbst; nur der Zufallsanteil und die Sternstunde fehlen,
           weil die niemand vorhersehen kann.
           ------------------------------------------------------------ */
        einfluesse: kraefteVorschau()
      };
    }

    /* Die Kraefte vor der Saison. Bewusst dieselben Ausdruecke wie in
       simulate() - stehen sie zweimal verschieden da, zeigt die
       Vorschau etwas anderes, als danach passiert. */
    function kraefteVorschau(){
      if (!st.club) return null;
      const moralAbstand = (clamp(st.moral, 10, 100) - MORAL_MITTE) / 28;
      const moral = Math.sign(moralAbstand) * Math.sqrt(Math.abs(moralAbstand)) * 0.035;
      const stand = st.rollenStand === 'saeule' ? 0.030
                  : st.rollenStand === 'bewaehrung' ? -0.045 : 0;
      const eingewoehnung = st.klubJahre === 0 ? -0.055
                          : st.klubJahre === 1 ? 0.01
                          : Math.min(0.055, 0.02 + st.klubJahre * 0.008);
      const mitspieler = clamp(
        (klubStaerke(st.club) - ligaSchnittJetzt(st.club.lg)) * 0.006, -0.06, 0.07);
      const bindung = klubBindung() * 0.022;
      return {
        moral:  Math.round(moral * 1000) / 10,
        stand:  Math.round(stand * 1000) / 10,
        form:   Math.round(st.formzustand * 0.055 * 1000) / 10,
        umfeld: Math.round((eingewoehnung + mitspieler + bindung) * 1000) / 10
      };
    }

    function schliesseBericht(){
      if (!st.bericht) return false;
      st.bericht = null;
      return true;
    }

    function setzeSaisonZiel(club){
      /* Die Schwellen sind an der gemessenen Verteilung der Kaderstaerken
         geeicht: Titel fordert nur die Spitze, sonst waere jede Saison
         eine Enttaeuschung. */
      const diff = klubStaerke(club) - ligaSchnittJetzt(club.lg);
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

      /* ----------------------------------------------------------------
         Die Vorgabe darf einem Ausreisser nicht hinterherlaufen

         Sie kam allein aus der letzten Saison. Nach einem
         Ausnahmejahr - Sternstunde, erste Reihe, alles passt - stand
         damit im Jahr darauf eine Zahl, die auch der Spieler selbst
         nur einmal erreicht hatte. Genau das sind die "manchmal zu
         hohen Ziele": im Schnitt werden 57 Prozent erfuellt, aber
         nach einem Ausreisser praktisch keines.

         Deshalb zaehlt jetzt der eigene Schnitt der letzten drei
         Saisons mit. Ein einzelnes starkes Jahr hebt die Latte, aber
         es setzt sie nicht allein. */
      const letzteDrei = st.seasons.slice(-3).filter(x => x.gp);
      const basis = (feld) => {
        if (!letzteDrei.length) return 0;
        const zuletzt = letzte[feld] || 0;
        const schnitt = letzteDrei.reduce((a, x) => a + (x[feld] || 0), 0) / letzteDrei.length;
        return zuletzt * 0.6 + schnitt * 0.4;
      };

      if (!letzte || !letzte.gp){
        /* ----------------------------------------------------------------
           Erste Profisaison: niemand erwartet Zahlen, nur Einsatzzeit.

           Hier stand eine feste 20 - unabhaengig davon, ob die Saison
           52 oder 82 Spiele hat. Gemessen kam ein Neuling im Schnitt
           auf 54,7 Einsaetze und erfuellte die Vorgabe in 97 Prozent
           der Faelle. Das ist kein Ziel, das ist eine Zeile. Jetzt
           haengt sie an der Laenge der Saison.
           ---------------------------------------------------------------- */
        const vollGp = club.lg === 'NHL' ? 82 : (istJugend(club.lg) ? 60 : 52);
        const soll = Math.round(vollGp * 0.72);
        person = { art:'spiele', wert: soll, n: soll + ' Einsätze sammeln',
                   d:'Im ersten Jahr zählt, dass du überhaupt spielst.' };
        return { team, person,
               einsatz: { beide: { ruf: 5, moral: 8 },
                          eines: { ruf: 2, moral: 2 },
                          keines: { ruf: -4, moral: -7 } } };
      }

      /* Ein Ligawechsel verschiebt das Mass: In der NHL sind 70 Punkte
         etwas anderes als in der zweiten Liga. */
      const skala = k => Math.pow((league(k) || {}).level || 20, 0.45);
      const ligaFaktor = clamp(skala(letzte.lg) / skala(club.lg), 0.5, 1.6);
      /* ----------------------------------------------------------------
         Geld erzeugt Erwartung

         Der ausgehandelte Aufschlag wurde an genau einer Stelle
         gelesen: er stand in der Gehaltszeile der Saisonbilanz. Damit
         war jede Verhandlung folgenlos - mehr Geld herauszuholen
         kostete nichts und brachte nichts ausser einer groesseren
         Zahl. In Wahrheit ist es andersherum: wer teuer ist, an dem
         wird anders gemessen. */
      const teuer = clamp(((st.gehaltFaktor || 1) - 1) * 0.30, 0, 0.12)
      /* Ein Erstrundenpick wird die ersten Jahre daran gemessen, dass
         er einer war - danach zaehlt nur noch, was er spielt. */
        + ((st.entryDraft && st.entryDraft.runde === 1 && st.age <= 24) ? 0.05 : 0);
      /* Etwas milder als zuvor (1,14 / 1,03 statt jetzt 1,09 / 0,99):
         gemessen wurden die Scorervorgaben in 49 Prozent der Saisons
         erfuellt, was fuer eine Vorgabe, an der auch Moral und Ansehen
         haengen, zu streng ist. */
      const faktor = (st.age < 24 ? 1.09 : st.age > 32 ? 0.88 : 0.99)
                   * ligaFaktor * (1 + teuer);

      if (isG){
        const ziel = clamp(Math.round((basis('wins') || 10) * faktor), 6, 46);
        person = { art:'siege', wert: ziel, n: ziel + ' Siege', d:'Daran misst dich der Torwarttrainer.' };
      } else if (player.pos !== 'D' && st.seasons.length % 3 === 1){
        const tore = clamp(Math.round((basis('g') || 5) * faktor), 4, 60);
        person = { art:'tore', wert: tore, n: tore + ' Tore',
                   d: teuer > 0.03 ? 'Für das Gehalt erwartet man Abschlüsse.'
                                   : 'Der Trainer will Abschlüsse sehen.' };
      } else {
        const ziel = clamp(Math.round((basis('p') || 12) * faktor), 8, 115);
        person = { art:'punkte', wert: ziel, n: ziel + ' Scorerpunkte',
                   d: teuer > 0.03 ? 'Wer so verdient, muss liefern.'
                                   : 'Deine Vorgabe für die Saison.' };
      }
      return { team, person,
               einsatz: { beide: { ruf: 5, moral: 8 },
                          eines: { ruf: 2, moral: 2 },
                          keines: { ruf: -4, moral: -7 } } };
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

      /* Die Folgen stehen als Tabelle da, damit die Oberflaeche schon vor
         der Saison zeigen kann, was auf dem Spiel steht. */
      const FOLGEN = { 2: { ruf: 5, moral: 8 }, 1: { ruf: 2, moral: 2 },
                       0: { ruf: -4, moral: -7 } };
      const f = FOLGEN[treffer];
      st.ruf = clamp(st.ruf + f.ruf, 20, 99);
      moralAendern(f.moral);
      z.bilanz = { treffer, ruf: f.ruf, moral: f.moral };

      season.events.push(
        treffer === 2 ? { t: 'Beide Saisonziele erfüllt', c: 'good' }
      : treffer === 1 ? { t: z.team.erfuellt ? 'Teamziel erreicht, persönliche Vorgabe verfehlt'
                                             : 'Persönliche Vorgabe erfüllt, Teamziel verfehlt', c: '' }
      :                 { t: 'Beide Saisonziele verfehlt', c: 'bad' });
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
        torwartrivale: (st.torwartrivale || {}).name || 'der zweite Torhüter',
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

      /* Ereignisse mit einem einzigen Saisonfenster - der neue Trainer
         ist im Jahr darauf kein neuer Trainer mehr - gehen nicht in die
         Lotterie. Gemessen kamen sie sonst bei zwei Trainerwechseln je
         Laufbahn auf 0,20 Feuerungen, also in einem von zehn Faellen.
         Jetzt kommen sie zuerst; die uebliche Frage, ob ueberhaupt ein
         Ereignis stattfindet, gilt fuer sie nicht. */
      const dringend = offen.filter(x => x.dringend);
      if (dringend.length && r() < 0.45){
        const e0 = dringend.length === 1 ? dringend[0] : pick(r, dringend);
        return baueEreignis(e0, letzteSaison);
      }

      /* ------------------------------------------------------------------
         Wie oft ueberhaupt etwas passiert

         Bei 0,7 blieb fast jede dritte Saison ohne ein einziges
         Ereignis, und eine Laufbahn sah gemessen nur zehn verschiedene
         von 101 geschriebenen - ein Zehntel des Inhalts. Ereignisse
         sind aber die Stellen, an denen man etwas entscheidet; eine
         Saison ohne eines ist eine Saison, in der man zusieht.
         ------------------------------------------------------------------ */
      if (r() > 0.85) return null;                       // nicht jede Saison

      /* Nicht jedes Ereignis ist gleich wichtig: Was aus einer frueheren
         Entscheidung erwaechst oder zum Charakter passt, kommt bevorzugt.
         Sonst gehen genau die persoenlichen Momente im grossen Pool unter. */
      const gewicht = x => {
        let w = 1;
        if (x.gewicht)   w *= x.gewicht; // vom Autor gesetzter Vorrang
        if (x.benoetigt){
          /* Eine Folge einer eigenen Entscheidung - und je laenger der
             Strang offen liegt, desto faelliger wird sie. Ohne das
             blieb er oft bis zum Karriereende unbeantwortet, obwohl
             das Spiel beim Oeffnen "davon wirst du spaeter hoeren"
             versprochen hat. */
          const auf = st.strangNamen[x.benoetigt];
          const wartet = (auf && auf.jahr) ? clamp(st.year - auf.jahr, 0, 6) : 0;
          w *= 8 + wartet * 2.5;
        }
        if (x.nurEig)    w *= 3.5;      // passt zum Charakter
        /* Der Aufschlag gilt engen Positionsereignissen - einem Bully
           fuer Center, einem Penalty fuer Torhueter. Ein Ereignis, das
           nur die Torhueter ausschliesst, nennt vier von fuenf
           Positionen und ist damit kein Sonderfall; es bekaeme sonst
           denselben Aufschlag und wuerde die Mischung verzerren. */
        if (x.nurPos && x.nurPos.length <= 2) w *= 2.5;
        /* Ereignisse, aus denen ein Erzaehlstrang erwachsen kann, sind
           der Anfang von allem, was spaeter zurueckkommt. Ohne Vorrang
           lagen sie gemessen nur 3,2-mal je Laufbahn ueberhaupt vor,
           und jede vierte Laufbahn hat die Erzaehlebene nie gesehen. */
        if (!x.benoetigt && (x.optionen || []).some(o => o.folgt)) w *= 1.9;
        /* Manche Ereignisse haben nur ein einziges Saisonfenster - der
           neue Trainer ist im Jahr danach kein neuer Trainer mehr.
           Ohne Vorrang gehen sie darin unter: gemessen kam "Der Neue"
           bei zwei Trainerwechseln je Laufbahn auf 0,06 Feuerungen. */
        if (x.dringend) w *= 12;
        if (st.erlebt.includes(x.id)) w *= 0.35;   // Wiederholung seltener
        /* Kein einzelnes Ereignis soll das Feld beherrschen. Ohne
           Deckel multiplizieren sich Vorrang, Charakterbindung und
           Strangoeffnung zu einem Gewicht, bei dem ein Ereignis in
           jeder sechzehnten Saison kam - und andere in keiner. Nur
           Folgeereignisse duerfen darueber: sie sind die Antwort auf
           eine eigene Entscheidung und muessen kommen. */
        /* Kein einzelnes Ereignis soll das Feld beherrschen - auch
           kein faelliges Folgeereignis. Ohne den zweiten Deckel stieg
           eines davon auf sechs Prozent aller Feuerungen. */
        w = Math.min(w, (x.benoetigt || x.dringend) ? 22 : 4.2);
        return w;
      };
      const summe = offen.reduce((a2, x) => a2 + gewicht(x), 0);
      let ziel = r() * summe, e = offen[offen.length - 1];
      for (const kandidat of offen){
        ziel -= gewicht(kandidat);
        if (ziel <= 0){ e = kandidat; break; }
      }
      return baueEreignis(e, letzteSaison);
    }

    /* Aus einer Vorlage ein fertiges Ereignis machen. Frueher stand das
       am Ende der Auswahl; jetzt brauchen es zwei Wege dorthin. */
    function baueEreignis(e, letzteSaison){
      st.erlebt.push(e.id);
      // Erfolg pro Option vorab auswürfeln, damit die Anzeige ehrlich bleibt
      const ctx = ereignisKontext();
      /* Ein Folgeereignis erzählt von denselben Menschen wie das Original –
         auch wenn der Spieler das Team längst gewechselt hat. */
      let herkunft = null;
      if (e.benoetigt && st.strangNamen[e.benoetigt]){
        const alt = st.strangNamen[e.benoetigt];
        ctx.trainer    = alt.trainer    || ctx.trainer;
        ctx.mitspieler = alt.mitspieler || ctx.mitspieler;
        ctx.damalsKlub = alt.klub       || ctx.klub;
        /* Der Rueckverweis: welche Entscheidung diesen Faden geoeffnet
           hat und wie lange das her ist. */
        if (alt.wahl) herkunft = {
          strang: e.benoetigt, wahl: alt.wahl, tag: alt.tag,
          jahr: alt.jahr, alter: alt.alter, klub: alt.klub,
          herJahre: alt.alter ? st.age - alt.alter : null
        };
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
        id: e.id, kat: e.kat, szene: e.szene, tag: einsetzen(e.tag, ctx), herkunft,
        titel: einsetzen(e.titel, ctx), text: einsetzen(e.text, ctx),
        spieltag: ri(r, 3, league(st.club.lg).k === 'NHL' ? 78 : 48),
        optionen: passend.map(o => {
          const bonus = (player.wirkung || {}).ereignis || 0;
          return {
            t: einsetzen(o.t, ctx),
            /* Gerundet: seit eine doppelt zugesagte Eigenschaft zur
               Haelfte wirkt, sind die Boni gebrochen - und eine
               Erfolgschance von 67,5 Prozent liest sich wie ein
               Fehler. */
            chance: Math.round(clamp(o.chance + bonus, 5, 95)),
            grundChance: o.chance, bonus: Math.round(bonus * 10) / 10,
            hinweis: einsetzen(o.hinweis || '', ctx), wagnis: !!o.wagnis,
            nurEig: o.nurEig || null, folgt: o.folgt || null,
            _ctx: ctx, _gut: o.gut, _schlecht: o.schlecht, _wurf: r() * 100
          };
        })
      };
    }

    /* Eine Wirkung vervielfachen, ohne das Original anzutasten - die
       Ereignisliste wird fuer jede weitere Laufbahn unveraendert
       gebraucht. Texte, Faeden und Schalter bleiben, nur die Zahlen
       wachsen. */
    /* Obergrenzen je Feld. Ohne sie kam bei einem Wagnis mit sechzehn
       Prozent Chance ein Ansehensgewinn von 46 heraus - die Skala
       reicht von 20 bis 99, ein einziger Abend haette also die halbe
       Laufbahn ersetzt. Grosszuegig, aber nicht masslos: mehr als das
       Doppelte einer guten normalen Belohnung soll auch ein Wagnis
       nicht bringen. */
    const WAGNIS_DECKEL = { moral: 22, ruf: 20, rolle: 4, berater: 24,
                            form: 0.18, attr: 8, trait: 8 };
    function skaliereWirkung(w, faktor){
      if (!w || faktor === 1) return w;
      const raus = Object.assign({}, w);
      const deckeln = (v, d) => v > 0 ? Math.min(v, d) : v;
      ['moral', 'ruf', 'rolle', 'berater'].forEach(k => {
        if (typeof raus[k] === 'number')
          raus[k] = deckeln(Math.round(raus[k] * faktor), WAGNIS_DECKEL[k]);
      });
      /* Risiko und Verschleiss sind selbst dann Nachteile, wenn etwas
         gelingt - sie folgen der Milde beim Scheitern, wachsen aber
         nicht mit dem Lohn. */
      if (faktor < 1){
        ['risiko', 'verschleiss'].forEach(k => {
          if (typeof raus[k] === 'number') raus[k] = Math.round(raus[k] * faktor);
        });
      }
      if (typeof raus.form === 'number')
        raus.form = deckeln(Math.round(raus.form * faktor * 100) / 100, WAGNIS_DECKEL.form);
      ['attr', 'trait'].forEach(feld => {
        if (!raus[feld]) return;
        const neu = {};
        Object.entries(raus[feld]).forEach(([k, v]) => {
          neu[k] = deckeln(Math.round(v * faktor), WAGNIS_DECKEL[feld]);
        });
        raus[feld] = neu;
      });
      return raus;
    }

    function chooseEreignis(index){
      if (!st.ereignis) return null;
      const o = st.ereignis.optionen[clamp(index, 0, st.ereignis.optionen.length - 1)];
      const gelungen = o._wurf < o.chance;
      /* ------------------------------------------------------------------
         Ein Wagnis muss sich lohnen koennen

         Gemessen ueber alle 262 Optionen war der Erwartungswert nach
         Chancestufe:

           80-100 %   +5,6      Gewinn  +7,2   Verlust  -1,6
           65-79  %   +6,9      Gewinn +11,1   Verlust  -3,4
           50-64  %   +7,1      Gewinn +16,9   Verlust  -5,7
           35-49  %   +2,6      Gewinn +17,0   Verlust  -8,6
           unter 35   -8,7      Gewinn +32,0   Verlust -18,6

         Der Gewinn stieg also, aber laengst nicht genug fuer den
         Verlust: ein grosses Wagnis war rechnerisch ein Fehler. Und
         gespielt zeigte sich dasselbe - "mutig" lag auf jedem
         Perzentil unter "sicher", auch beim Spitzenwert. Risiko ohne
         Aufwaertsschwanz ist kein Risiko, sondern eine Falle, und wer
         sie durchschaut, waehlt vierzehn Optionen nie wieder.

         Deshalb faellt der Ertrag hier hoeher aus, je unwahr-
         scheinlicher der Erfolg war. Der Verlust bleibt unangetastet:
         ein Wagnis soll dieselbe Erwartung haben wie vorsichtiges
         Spiel, aber eine viel groessere Spanne. Es steht an dieser
         einen Stelle statt in vierzehn handgeschriebenen Bloecken -
         so gilt die Regel auch fuer jedes Ereignis, das noch dazukommt,
         und die angezeigten Wirkungen stimmen mit den wirklichen
         ueberein, weil beide dasselbe w benutzen.
         ------------------------------------------------------------------ */
      /* Der Zuschlag setzt erst unter 50 Prozent ein. Darueber war der
         Erwartungswert gemessen schon gesund (50-64 % war mit +7,1 die
         beste Stufe ueberhaupt) - dort noch etwas draufzulegen haette
         nur das Ungleichgewicht umgedreht. */
      /* Zwei Hebel, weil einer nicht reicht. Nur die Gewinne zu heben
         haette bei sechzehn Prozent Chance einen Ansehensgewinn von 46
         gebraucht - die Skala reicht von 20 bis 99, ein Abend haette
         die halbe Laufbahn ersetzt. Mit vernuenftigen Deckeln blieb der
         Erwartungswert dagegen bei -6.

         Also faellt auch der Preis des Scheiterns milder aus, je
         unwahrscheinlicher der Versuch war. Das ist nicht nur Rechnung:
         wer einen aussichtslosen Zug versucht und scheitert, wird in
         einer Kabine anders angesehen als einer, der eine sichere
         Sache verpatzt. */
      const wagnisLohn = gelungen
        ? clamp(1 + (50 - (o.chance || 50)) / 22, 1, 2.8)
        : clamp(1 - (48 - (o.chance || 48)) / 62, 0.52, 1);
      const w = skaliereWirkung(gelungen ? o._gut : o._schlecht, wagnisLohn);
      /* Vor dem Ablegen pruefen: danach steht der Faden schon in der
         Liste und die Abfrage waere immer falsch. */
      const oeffnetFaden = (o.folgt && !st.freigeschaltet.includes(o.folgt)) ? o.folgt : null;
      if (oeffnetFaden){
        st.freigeschaltet.push(o.folgt);
        // Namen festhalten, damit das Folgeereignis dieselben Personen meint
        const c = o._ctx || {};
        st.strangNamen[o.folgt] = { trainer: c.trainer, mitspieler: c.mitspieler, klub: c.klub,
                                    jahr: st.year, alter: st.age,
                                    wahl: o.t, tag: st.ereignis.tag };
      }
      const folge = { gelungen, oeffnet: oeffnetFaden,
                      text: einsetzen((w && w.text) || '', o._ctx || {}), chance: o.chance,
                      wurf: Math.round(o._wurf), wahl: o.t, wirkungen: [] };

      const merke = (t, gut) => folge.wirkungen.push({ t, gut });
      if (w){
        const attrName = k => {
          const a = D.ATTRS.skater.concat(D.ATTRS.goalie).find(x => x.k === k);
          return a ? a.n : k;
        };
        Object.entries(w.attr || {}).forEach(([k, v]) => {
          /* Vorher wurde ein Wert, den diese Position nicht hat, gar
             nicht angezeigt - und auch nicht vergeben. Jetzt wird er
             uebersetzt, also steht auch der uebersetzte Name da. */
          const echt = attrFuer(player, k);
          if (echt) merke((v > 0 ? '+' : '') + v + ' ' + attrName(echt), v > 0);
        });
        Object.entries(w.trait || {}).forEach(([k, v]) => {
          const n = { robust:'Robustheit', langlebig:'Haltbarkeit',
                      jung:'Frühreife', playoff:'Playoff-Stärke' }[k] || k;
          merke((v > 0 ? '+' : '') + v + ' ' + n, v > 0);
        });
        if (w.ruf)    merke((w.ruf > 0 ? '+' : '') + w.ruf + ' Ansehen', w.ruf > 0);
        if (w.moral)  merke((w.moral > 0 ? '+' : '') + w.moral + ' Moral', w.moral > 0);
        if (w.rolle && st.rolle)
          merke(w.rolle > 0 ? 'Der Trainer plant fester mit dir'
                            : 'Deine Rolle wackelt', w.rolle > 0);
        if (w.form)   merke((w.form > 0 ? '+' : '') + Math.round(w.form * 100) + '% Form', w.form > 0);
        /* Ein negatives Risiko ist eine Entlastung - vorher stand dort
           "+-6 Verletzungsrisiko" und es galt als schlechte Nachricht. */
        if (w.risiko) merke(w.risiko > 0
          ? '+' + w.risiko + ' Verletzungsrisiko'
          : Math.abs(w.risiko) + ' weniger Verletzungsrisiko', w.risiko < 0);
        if (w.berater) merke(w.berater > 0
          ? 'Besserer Draht zu deinem Berater' : 'Dein Berater ist verstimmt',
          w.berater > 0);
        if (w.spiele) merke(w.spiele + (w.spiele === 1 ? ' Spiel' : ' Spiele')
          + ' Sperre', false);
        if (w.gehalt) merke((w.gehalt > 0 ? '+' : '') + Math.round(w.gehalt * 100)
          + '% Gehalt', w.gehalt > 0);
        if (w.natSperre) merke(w.natSperre >= 99
          ? 'Der Verband nominiert dich nicht mehr'
          : 'Vom Verband gestrichen (' + w.natSperre
            + (w.natSperre === 1 ? ' Jahr' : ' Jahre') + ')', false);
      }
      if (!folge.wirkungen.length) merke('Keine bleibende Wirkung', true);

      if (w){
        if (w.attr) Object.entries(w.attr).forEach(([k, v]) => {
          attrHeben(player, k, v);
        });
        if (w.trait) Object.entries(w.trait).forEach(([k, v]) =>
          player.traits[k] = (player.traits[k] || 0) + v);
        if (w.ruf) st.ruf = clamp(st.ruf + w.ruf, 20, 99);
        if (w.moral) moralAendern(w.moral);
        if (w.rolle) rollenGutschrift(w.rolle);
        if (w.form) st.formBonus += w.form;
        if (w.risiko) st.risikoBonus += w.risiko / 100;
        if (w.berater) st.beraterDraht = clamp(st.beraterDraht + w.berater, 0, 100);
        if (w.spiele) st.gesperrteSpiele = (st.gesperrteSpiele || 0) + w.spiele;
        /* "bessert deinen Vertrag nach" - das stand im Text und
           passierte nicht. gehaltFaktor ist die Groesse, die auch die
           Verhandlung bewegt. */
        if (w.gehalt) st.gehaltFaktor = clamp((st.gehaltFaktor || 1) + w.gehalt, 0.7, 1.9);
        /* ------------------------------------------------------------
           Ein Wechsel mitten in der Vorbereitung

           "Der Wechsel klappt. Du spielst ploetzlich zwei Ligen
           hoeher" - und man spielte weiter dort, wo man war. Die
           Engine kann Vereinswechsel, die Wechselfrist nutzt sie;
           Ereignisse konnten sie nur nicht ausloesen. Das Ereignis
           faellt vor der Saison, der Wechsel gilt also fuer die
           kommende.
           ------------------------------------------------------------ */
        if (w.aufstieg && st.club){
          const jetzt = league(st.club.lg);
          const hoeher = D.LEAGUES
            .filter(l => !l.jugend && l.prestige > jetzt.prestige && clubsOf(l.k).length)
            .sort((a, b) => a.prestige - b.prestige);
          const ziel = hoeher[clamp(w.aufstieg - 1, 0, hoeher.length - 1)];
          if (ziel){
            const pool = clubsOf(ziel.k).filter(c => c.n !== st.club.n);
            if (pool.length){
              if (!st.ehemalige.includes(st.club.n)) st.ehemalige.push(st.club.n);
              st.wechselVon = st.club.n;
              st.club = pick(r, pool);
              st.klubJahre = 0;
              st.kapitaenSeit = null;
              st.vertragJahre = 2;
              umfeldBenennen();
              merke('Wechsel zu ' + st.club.n + ' (' + ziel.n + ')', true);
            }
          }
        }
        /* natSperre in Jahren; 99 heisst "nie wieder". Der Text sagte
           das bisher, und der Verband rief trotzdem im naechsten
           Sommer an. */
        if (w.natSperre) st.natGesperrtBis = Math.max(st.natGesperrtBis || 0,
          st.year + (w.natSperre >= 99 ? 99 : w.natSperre));
      }
      st.verlauf.push({
        jahr: st.year, alter: st.age, art: 'ereignis',
        tag: st.ereignis.tag, titel: st.ereignis.titel,
        wahl: o.t, gelungen, chance: o.chance, wagnis: !!o.wagnis
      });
      st.letzteFolge = Object.assign({ titel: st.ereignis.titel, tag: st.ereignis.tag }, folge);
      // Merken, damit die Entscheidung spaeter im Karriereverlauf auftaucht
      notizMerken({ t: st.ereignis.tag + ': ' + o.t + (gelungen ? ' – gelungen' : ' – misslungen'),
                    c: gelungen ? 'good' : 'bad' });
      st.ereignis = null;
      return folge;
    }

    /* ---- eine Saison ausspielen ----

       Das Jahr laeuft jetzt in der Reihenfolge ab, in der es auch
       stattfindet. Vorher sah der Spieler das Ergebnis einer Saison
       erst, nachdem er Sommer, Training und Vertrag hinter sich hatte -
       eine Runde zu spaet, und dazwischen entschied er ueber Dinge,
       deren Grundlage er noch gar nicht kannte.

         Auftakt      was der Klub erwartet, wie lange der Vertrag noch
                      laeuft, in welcher Rolle du antrittst
         Verband      fragt vor der Saison an
         Ereignis     passiert waehrend der Vorbereitung
         Wechselfrist mitten in der Saison
         -> gespielt
         Bericht      wie es gelaufen ist, sofort danach
         Sommer, Training, Vertrag, Rolle - die Pause danach
    */
    function playSeason(){
      if (st.fertig || st.angebote || st.training || st.ereignis || st.jugend
          || st.rollenwahl || st.kapitaensfrage || st.ruecktrittsfrage
          || st.wechselfrist || st.nominierung || st.verhandlung
          || st.sommer || st.bericht) return null;

      // Der Verband fragt vor der Saison, ob du zur Verfuegung stehst
      if (!st.natGeprueft){
        st.natGeprueft = true;
        const f = pruefeNominierung();
        if (f){ st.nominierung = f; return null; }
      }

      // Waehrend der Vorbereitung kann ein Karriereereignis dazwischenkommen
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

      /* ----------------------------------------------------------------
         Wie stark bist du geworden?

         Die Wertung stand als Zahl im Kopf und aenderte sich still. Ob
         eine Saison einen weitergebracht hat, war damit genau das, was
         man nicht sehen konnte - obwohl es die eigentliche Frage einer
         Laufbahn ist. Jetzt traegt jede Saison, wo sie angefangen hat,
         und welche Werte sich am meisten bewegt haben.
         ---------------------------------------------------------------- */
      /* In der ersten Saison gibt es nichts zu vergleichen - der Wert
         zu Beginn ist der Wert. Ohne diese Unterscheidung meldete die
         Anzeige dort "Wertung unveraendert", was nach Stillstand
         aussieht, obwohl noch gar nichts passiert sein kann. */
      const ersteSaison = st.ovrLetzte == null;
      const ovrVorher = ersteSaison ? ovr : st.ovrLetzte;
      const attrsVorher = st.attrsLetzte || Object.assign({}, player.attrs);

      const season = { year: st.year, age: st.age, club: club.n, lg: club.lg,
                       lgName: lg.n, ovr, events: [], awards: [],
                       ovrVorher: ersteSaison ? undefined : ovrVorher,
                       ovrGewinn: ersteSaison ? undefined : ovr - ovrVorher };
      /* Frueher ein einziger Platz, den vier Stellen beschrieben:
         Verband, Wechselfrist, Ereignis und der Verein, der die
         Draftrechte haelt. Wer zuletzt schrieb, gewann - gemessen
         erschien die Draftmeldung nur zwoelfmal bei
         dreiundvierzig Angeboten, der Rest wurde ueberschrieben.
         Jetzt sammeln sie sich und werden alle gezeigt. */
      (st.offeneNotizen || []).forEach(n => season.events.push(n));
      st.offeneNotizen = [];

      /* ------------------------------------------------------------------
         Was aus dem Vorjahr noch nachwirkt

         Eine Entscheidung wirkte im Moment sichtbar - der Ausgang stand
         auf dem Blatt - und danach still weiter: eine Formdelle, ein
         erhoehtes Verletzungsrisiko, ein wackliger Stand beim Trainer.
         Die naechste Saison begann, als waere nichts gewesen, obwohl
         genau diese Reste die Saison praegten. Jetzt stehen sie oben im
         Bericht, damit die Verbindung zwischen Entscheidung und Folge
         sichtbar bleibt.
         ------------------------------------------------------------------ */
      if (st.formBonus <= -0.05)
        season.events.push({ t: 'Aus dem Vorjahr: du kommst schwer in Tritt', c: 'bad' });
      else if (st.formBonus >= 0.05)
        season.events.push({ t: 'Aus dem Vorjahr: du bist im Lauf', c: 'good' });
      if (st.risikoBonus >= 0.05)
        season.events.push({ t: 'Aus dem Vorjahr: erhöhtes Verletzungsrisiko', c: 'bad' });
      if (st.rollenStand === 'bewaehrung')
        season.events.push({ t: 'Du gehst auf Bewährung in die Saison – '
          + 'weniger Eiszeit, weniger Punkte', c: 'bad' });
      if ((st.verletzungsjahre || 0) >= 3)
        season.events.push({ t: 'Der Körper trägt ' + st.verletzungsjahre
          + ' Jahre Verschleiß mit', c: 'bad' });

      /* Was der Klub in dieser Saison von dir und der Mannschaft erwartet */
      st.ziele = setzeSaisonZiel(club);
      season.ziele = st.ziele;

      /* Verletzungen */
      const robust = 1 + (player.traits.robust || 0) * 0.02;
      const rollenRisiko = (st.rolle && st.rolle.w && st.rolle.w.risiko) || 0;
      /* Der Verschleiss traegt jetzt selbst bei, nicht nur ueber die
         Anlage. Bewusst gedeckelt: sonst wird aus drei Verletzungen
         eine Gewissheit fuer die vierte, und die Laufbahn kippt. */
      const verschleissRisiko = Math.min(0.11, (st.verletzungsjahre || 0) * 0.016);
      const injRisk = clamp(0.19 + (st.age - 28) * 0.02 - (player.traits.robust || 0) * 0.011
                            + st.risikoBonus + rollenRisiko + verschleissRisiko, 0.04, 0.6);
      let missed = 0;
      /* Was aus der Reha uebrig blieb: der Saisonstart fehlt. */
      if (st.startVerpasst){
        missed += st.startVerpasst;
        season.events.push({ t: 'Erst im Saisonverlauf eingestiegen – '
          + st.startVerpasst + ' Spiele verpasst', c: '' });
        st.startVerpasst = 0;
      }
      /* ------------------------------------------------------------------
         Eine Sperre kostet Spiele

         Der Ausgangstext sagte "wirst fuer drei Spiele gesperrt", und die
         Wirkung bestand aus Ansehen und Verletzungsrisiko - kein einziges
         Spiel fehlte. Die Engine kann verpasste Spiele, Ereignisse
         konnten sie nur nicht ausloesen.
         ------------------------------------------------------------------ */
      if (st.gesperrteSpiele){
        missed += st.gesperrteSpiele;
        season.events.push({ t: st.gesperrteSpiele
          + (st.gesperrteSpiele === 1 ? ' Spiel Sperre' : ' Spiele Sperre'), c: 'bad' });
        st.gesperrteSpiele = 0;
      }
      if (r() < injRisk){
        /* Eine alte Verletzung ist wahrscheinlicher als eine neue -
           und sie kostet mehr, weil dieselbe Stelle nicht zweimal
           gleich gut heilt. */
        const alteNamen = Object.keys(st.altlasten);
        const rueckfallChance = Math.min(0.55, alteNamen.length * 0.22);
        let V, rueckfall = false;
        if (alteNamen.length && r() < rueckfallChance){
          const name = pick(r, alteNamen);
          V = D.VERLETZUNGEN.find(x => x.n === name) || pick(r, D.VERLETZUNGEN);
          rueckfall = true;
        } else {
          V = pick(r, D.VERLETZUNGEN);
        }
        const wieOft = st.altlasten[V.n] || 0;
        const zaeher = 1 + wieOft * 0.28;         // jedes Mal laenger
        missed = Math.round(clamp(ri(r, V.min, V.max) * zaeher / robust, 2, 62));
        if (V.schwere >= 1)
          st.verletzungsjahre = (st.verletzungsjahre || 0) + V.schwere + (rueckfall ? 1 : 0);
        st.altlasten[V.n] = wieOft + 1;
        season.verletzung = { n: V.n, spiele: missed, schwere: V.schwere,
                              rueckfall, malNr: wieOft + 1 };
        season.events.push({
          t: (rueckfall ? V.n + ' – schon wieder' : V.n)
             + ' – ' + missed + ' Spiele verpasst', c: 'bad' });
      }
      const fullGp = lg.k === 'NHL' ? 82 : (istJugend(lg.k) ? 60 : 52);

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
      const mitspieler = clamp((klubStaerke(club) - ligaSchnittJetzt(club.lg)) * 0.006, -0.06, 0.07);

      /* ---- Kopf und Umfeld ----
         Gemessen ueber 3700 Saisons hatte die Moral auf die Ausbeute
         keinen Einfluss - 0,940 Punkte je Spiel bei hoher, 0,965 bei
         tiefer Moral, also wenn ueberhaupt verkehrt herum. Neunzehn
         Stellen im Spiel schrieben einen Wert, der nirgends ankam:
         jedes "+8 Moral" nach einer Entscheidung war eine Zusage, die
         nicht eingeloest wurde.

         Der Zusammenhang ist bewusst gedaempft. Eine Wurzelkennlinie
         statt einer geraden haelt die Mitte flach und laesst nur die
         Raender wirken - sonst entsteht aus schwacher Saison, gefallener
         Moral und noch schwaecherer Saison eine Abwaertsspirale, aus
         der niemand mehr herausfindet. */
      const moralAbstand = (clamp(st.moral, 10, 100) - MORAL_MITTE) / 28;
      const moralWirkung = Math.sign(moralAbstand)
                         * Math.sqrt(Math.abs(moralAbstand)) * 0.035;

      /* ---- Das Vertrauen des Trainers ----
         Der Rollenstand multiplizierte bisher nur die Zuschlaege der
         jeweiligen Rolle. Wer eine unauffaellige Rolle hatte, bei dem
         wirkte er praktisch nicht: Saeule 0,976, gesetzt 0,940,
         Bewaehrung 0,961 - nicht einmal der Reihe nach. Wer auf
         Bewaehrung steht, spielt aber in der vierten Reihe, egal was
         auf dem Papier steht. */
      const standWirkung = st.rollenStand === 'saeule' ? 0.030
                         : st.rollenStand === 'bewaehrung' ? -0.045 : 0;

      /* ---- Was der Verein von dir haelt ----
         Bewusst kleiner als die Eingewoehnung, die lange Treue schon
         belohnt - sonst zaehlt dasselbe Jahr zweimal. Es geht um den
         Unterschied zwischen einem, der lange da ist, und einem, den
         die Halle beim Namen ruft. */
      const bindung = klubBindung();
      const bindungsWirkung = bindung * 0.022;

      /* Klassenunterschied zur Liga */
      const tagesform = 0.97 + r() * 0.04
                      + st.formzustand * 0.055
                      + eingewoehnung + mitspieler
                      + moralWirkung + standWirkung + bindungsWirkung
                      + (season.sternstunde ? 0.10 : 0) + st.formBonus;
      season.einfluesse = {
        moral: Math.round(moralWirkung * 1000) / 10,
        stand: Math.round(standWirkung * 1000) / 10,
        form:  Math.round(st.formzustand * 0.055 * 1000) / 10,
        umfeld: Math.round((eingewoehnung + mitspieler + bindungsWirkung) * 1000) / 10
      };
      const kante = clamp((ovr * tagesform - lg.level * 0.58) / 32, -0.35, 1.7);
      season.kante = Math.round(kante * 100) / 100;
      season.faktoren = {
        form: Math.round(st.formzustand * 100) / 100,
        eingewoehnung: Math.round(eingewoehnung * 1000) / 10,
        mitspieler: Math.round(mitspieler * 1000) / 10
      };

      /* Wie fest du in der Rolle sitzt und wie gut sie zu dir passt -
         beides skaliert, was die Abmachung ueberhaupt bewirkt. */
      const rStand = standFaktor();
      const rPass  = rollenPassung(st.rolle, dev);
      let posFactor = 1;
      season.vollGp = fullGp;

      if (isG){
        const rg = (st.rolle && st.rolle.w) || {};
        /* Frueher haing der Einsatzanteil allein an der eigenen Form -
           entsprechend war man in 91 Prozent der Saisons Stammtorhueter.
           Jetzt entscheidet der Abstand zum zweiten Mann. */
        const tr = st.torwartrivale;
        /* ------------------------------------------------------------
           Wie gut du selbst bist, entscheidet den Zweikampf mit

           Der Zweikampf hing an zwei Dingen: einem Wuerfel und der
           Staerke des Klubs. Die eigene Wertung kam nicht vor - der
           Kommentar bei der Erzeugung des Rivalen behauptete zwar, er
           werde "relativ zu dir" gewuerfelt, die Formel dort kennt
           deine Wertung aber gar nicht.

           Gemessen war die Rolle deshalb fast unabhaengig von der
           Leistung: wer zwoelf Punkte ueber der Eintrittshuerde seiner
           Liga lag, sass in 21 Prozent der Saisons auf der Bank -
           genauso oft wie einer unterhalb der Huerde. Mit 82 in der DEL
           Ersatzmann zu sein ist Unsinn; dort ist das Weltklasse.

           Jetzt zaehlt der Abstand zur Huerde der eigenen Liga. Der
           Rivale bleibt ein echter Gegner - in der NHL, wo die Huerde
           bei 86 liegt, muss man sich das Tor weiter verdienen.
           ------------------------------------------------------------ */
        const huerde = LG_MIN[st.club.lg] !== undefined ? LG_MIN[st.club.lg] : 58;
        const eigenerStand = clamp((ovr - huerde) / 12, -0.6, 1.0);
        const duell = (tr ? clamp(tr.abstand, -0.7, 0.7) * 0.50 : 0)
                    + eigenerStand * 0.40;
        const anteil = clamp(0.50 + duell + kante * 0.08
                             + (rg.anteil || 0) * 1.6 * rStand
                             + rPass * 0.07, 0.12, 0.96);
        if (tr){
          season.torwartduell = { name: tr.name, abstand: tr.abstand, alter: tr.alter };
          /* Er entwickelt sich weiter: jung holt auf, alt faellt zurueck. */
          tr.alter++;
          tr.abstand = round1(clamp(tr.abstand + (tr.alter < 28 ? -0.07 : 0.06)
                                    + (r() - 0.5) * 0.20, -0.9, 0.9));
        }
        const gp = Math.max(6, Math.min(fullGp - missed, Math.round((fullGp - missed) * anteil)));
        season.gp = gp;
        /* ------------------------------------------------------------
           Die Fangquote auf echtem Massstab

           Gemessen lagen 33 Prozent aller Torhuetersaisons exakt auf
           der Obergrenze 0.948, der Median bei 0.9387 - hoeher als die
           beste NHL-Saison, die je gespielt wurde (Hasek, 0.937). Die
           Verteilung war oben abgeschnitten und damit keine mehr: drei
           von zehn Saisons waren zahlengleich.

           Neue Skala, an der Wirklichkeit ausgerichtet: Ligaschnitt
           liegt bei etwa 0.905, ein guter Stammtorwart bei 0.915, eine
           herausragende Saison bei 0.930. Die Steigung folgt der
           gemessenen Verteilung von "kante" (Median 1.19), damit der
           Mittelwert dort landet, wo ein Stammtorwart hingehoert.
           ------------------------------------------------------------ */
        season.sv = clamp(0.8755 + kante * 0.029 + rPass * 0.006
                          + (r() - 0.5) * 0.007, 0.860, 0.940);
        season.gaa = clamp(3.40 - kante * 1.55 + (r() - 0.5) * 0.30, 1.42, 4.3);
        /* Nullpunkt und Steigung folgen der neuen Skala: bei 0.910
           sind es rund drei Zunullspiele, bei 0.930 acht. */
        season.so = Math.max(0, Math.round((season.sv - 0.895) * 190 * (gp / 50) + (r() - 0.65)));
        season.wins = Math.round(gp * clamp(0.32 + kante * 0.22
                                            + (klubStaerke(club) - 74) * 0.007, 0.18, 0.78));
        season.otl = Math.round((gp - season.wins) * (0.15 + r() * 0.12));
        season.losses = Math.max(0, gp - season.wins - season.otl);
        // Schüsse und Paraden aus Fangquote und Gegentorschnitt ableiten
        season.ga = Math.max(0, Math.round(season.gaa * gp));
        season.shotsAgainst = Math.round(season.ga / Math.max(0.02, 1 - season.sv));
        season.saves = season.shotsAgainst - season.ga;
        season.toi = Math.round(58 + r() * 3);
        season.reihe = anteil >= 0.62 ? 'Stammtorhüter'
                     : anteil >= 0.42 ? 'Geteiltes Tor' : 'Ersatztorhüter';
        season.rolle = season.reihe;   // Altbestand: gespeicherte Karrieren
        const tw = st.torwartrivale;
        if (tw){
          if (anteil >= 0.72)
            season.events.push({ t: tw.name + ' kam kaum zum Zug – das Tor gehört dir', c: 'good' });
          else if (anteil < 0.42)
            season.events.push({ t: tw.name + ' hat dir das Tor abgenommen', c: 'bad' });
          else
            season.events.push({ t: 'Das Tor geteilt mit ' + tw.name, c: '' });
        } else if (anteil < 0.42){
          season.events.push({ t: 'Meist nur Ersatz – wenig Eiszeit', c: '' });
        }
      } else {
        const rw = (st.rolle && st.rolle.w) || {};
        const gp = Math.max(8, fullGp - missed);
        posFactor = P.k === 'D' ? 0.62 : (P.k === 'C' ? 1.15 : 1.0);
        /* Die Rolle wirkt multiplikativ - und zwar nur so weit, wie du
           drin sitzt. Auf Bewaehrung bekommst du die Minuten nicht, die
           der Vertrag verspricht. Die Passung kommt oben drauf: wer
           dafuer gebaut ist, holt mehr aus derselben Abmachung. */
        const rollenFaktor = 1 + (rw.punkte || 0) * 1.9 * rStand + rPass * 0.13;
        const streuung = 0.90 + r() * 0.20 * (1.3 - konstanzWert / 140);
        /* ------------------------------------------------------------
           Mehr Eiszeit heisst mehr Gelegenheiten

           Die Ausbeute hing an kante, Position, Rolle und Streuung -
           die Eiszeit kam nicht vor. Eine Rolle, die zwei Minuten mehr
           bringt, brachte damit keinen einzigen Punkt mehr, und eine
           Bewaehrungssaison kostete Minuten, aber keine Ausbeute. Zwei
           Zahlen, die nebeneinander standen und nichts miteinander zu
           tun hatten.

           Gerechnet wird nur mit dem Teil der Eiszeit, der NICHT aus
           der eigenen Form kommt - Rolle und Rollenstand. Die Form
           steckt schon in kante; sie zweimal zu zaehlen wuerde die
           Ausbeute nur weiter spreizen, ohne dass eine Entscheidung
           daran haengt.
           ------------------------------------------------------------ */
        const standMinutenVorab = st.rollenStand === 'saeule' ? 1.7
                                : st.rollenStand === 'bewaehrung' ? -2.4 : 0;
        const extraMinuten = (rw.eiszeit || 0) * rStand + standMinutenVorab;
        /* Um den ueblichen Wert zentriert, sonst ist der Faktor kein
           Faktor, sondern ein Dauerzuschlag: eine gewoehnliche Rolle
           bringt rund anderthalb Zusatzminuten, und ungeeicht stieg
           die Ausbeute in starken Ligen dadurch im Median von 91 auf
           125 Punkte. Jetzt liegt der Nullpunkt dort, wo die meisten
           stehen - wer mehr Eiszeit holt, gewinnt, wer auf Bewaehrung
           spielt, verliert. */
        const eiszeitFaktor = clamp(1 + (extraMinuten - 1.5) * 0.05, 0.80, 1.20);
        const ppg = clamp(kante * posFactor * rollenFaktor * streuung * eiszeitFaktor,
                          0.02, 2.4);
        const punkte = Math.round(ppg * gp);
        const gShare = P.goalRate / (P.goalRate + P.assistRate);
        const tore = Math.round(punkte * gShare * (0.82 + r() * 0.36));
        season.gp = gp;
        season.g = Math.min(tore, punkte);
        season.a = punkte - season.g;
        season.p = punkte;
        season.plus = Math.round((kante * 16 + (club.str - 76) * 0.5) * (0.6 + r() * 0.8)
                                 + (rw.plus || 0) * rStand + rPass * 4);
        season.pim = Math.round(ri(r, 8, 12 + Math.round((dev.zweikampf || 50) / 2))
                                * (rw.strafen || 1));
        // Spezialteams, Schüsse und Eiszeit
        season.ppg = Math.round(season.g * (0.22 + r() * 0.20));
        season.shg = Math.round(season.g * (dev.defensive > 70 ? 0.05 : 0.02) * (r() < 0.5 ? 0 : 2));
        season.gwg = Math.round(season.g * (0.10 + r() * 0.09));
        const quote = clamp(0.055 + (dev.praezision || 50) / 900 + (r() - 0.5) * 0.02, 0.04, 0.20);
        season.shots = Math.max(season.g, Math.round(season.g / quote));
        season.shotPct = season.shots ? Math.round(season.g / season.shots * 1000) / 10 : 0;
        /* Der Stand kommt hier zusaetzlich als eigener Betrag dazu,
           nicht nur als Faktor auf den Rollenzuschlag - sonst haengt
           das Vertrauen des Trainers daran, welche Rolle man gewaehlt
           hat, statt an ihm. */
        /* Dieselben Zusatzminuten, die oben schon in die Ausbeute
           eingegangen sind - eine Groesse, zwei Verwendungen. */
        season.toi = Math.round(clamp(10 + kante * 7 + (P.k === 'D' ? 2.5 : 0)
                                      + extraMinuten, 8, 27) * 10) / 10;
        if (P.k === 'C') season.bully = Math.round(clamp(44 + (dev.zweikampf || 50) * 0.12
                                          + (r() - 0.5) * 5, 38, 62) * 10) / 10;
        /* ------------------------------------------------------------
           Die Reihe folgt der Eiszeit

           Sie wurde vorher aus einer eigenen Formel gebildet, die
           anders gewichtete als die Eiszeit und den direkten Einfluss
           des Rollenstands gar nicht kannte. Damit konnte eine
           schlechte Entscheidung die Eiszeit um zweieinhalb Minuten
           druecken und der Spieler stand trotzdem in der ersten Reihe -
           zwei Zahlen, die sich widersprachen.

           In Wahrheit ist die Reihe nichts anderes als die Eiszeit:
           wer oben spielt, spielt mehr. Also wird sie daraus
           abgeleitet. Verteidiger sind der Massstab nach oben
           verschoben, weil ein Paar mehr Minuten bekommt als eine
           Sturmreihe.
           ------------------------------------------------------------ */
        const grenzen = P.k === 'D' ? [22.5, 19.0, 15.5] : [19.0, 16.0, 13.0];
        season.reihe = season.toi >= grenzen[0] ? 'Erste Reihe'
                     : season.toi >= grenzen[1] ? 'Zweite Reihe'
                     : season.toi >= grenzen[2] ? 'Dritte Reihe' : 'Vierte Reihe';
        season.rolle = season.reihe;   // Altbestand: gespeicherte Karrieren
      }

      /* Teamerfolg */
      /* ----------------------------------------------------------------
         Was ein Einzelner ausmacht

         Seit die Angebote nach Passung statt nach Ligaspitze verteilt
         werden, spielt man bei einem Verein des eigenen Niveaus statt
         automatisch bei einem der staerksten - realistischer, aber die
         Titelquote fiel dadurch von 8,5 auf 4,7 Prozent. Die Antwort
         ist nicht, die alte Bevorzugung zurueckzuholen, sondern dem
         Spieler das Gewicht zu geben, das ein herausragender Mann
         wirklich hat: er hebt eine mittlere Mannschaft. Der Nullpunkt
         liegt jetzt tiefer und der Ausschlag nach oben ist groesser. */
      const einfluss = clamp((ovr - 77) * (isG ? 0.52 : 0.46), -7, 19);
      /* Der Nullpunkt gehoert auf das gemessene Mittel, sonst ist der
         "Ausschlag" in Wahrheit ein Dauerzuschlag. Genau das war er:
         der Kommentar nannte 86 als Mittel, im Code stand 70, und
         gemessen lag die Moral bei 81 - fast jeder bekam also
         staendig etwas obendrauf, und die Zahl sagte nichts ueber die
         Kabine aus. Seit die Moral einen Ruhepunkt hat, liegt ihr
         Median bei 71; darauf ist beides jetzt geeicht. */
      const moralBonus = clamp((st.moral - MORAL_MITTE) * 0.20, -9, 6);
      /* Wer das C traegt, hebt die Mannschaft - nicht nur die Vitrine. */
      const kapitaensBonus = st.kapitaenSeit === club.n ? 2.2 : 0;
      const teamPower = klubStaerke(club) + einfluss + moralBonus + kapitaensBonus
                      + (r() - 0.5) * 15;
      season.moral = Math.round(st.moral);
      st.tabelle = baueTabelle(club.lg, club.n, einfluss + moralBonus + kapitaensBonus);
      season.tabelle = st.tabelle.slice(0, 6);
      season.platz = (st.tabelle.find(t => t.eigen) || {}).platz || null;
      const ligaSchnitt = lgAvgStr(club.lg);
      const poBoost = (player.traits.playoff || 0) * 0.42;
      /* Diese Schwelle wandert mit, sooft sich aendert, bei welchen
         Vereinen ein Spieler landet - sie misst ja nicht das Spiel,
         sondern eicht es. Zuletzt: seit die Angebote nach Passung
         statt nach Ligaspitze verteilt werden, spielt man bei einem
         Verein des eigenen Niveaus, und die Quote fiel von 59,6 auf
         38,2 Prozent. Mit -1,6 statt +0,6 liegt sie wieder bei 59,1. */
      season.playoffs = teamPower > ligaSchnitt - 1.6;

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
          const kandidaten = gegnerPool.slice()
            .sort((a, b) => klubStaerke(b) - klubStaerke(a));
          const index = clamp(Math.round(kandidaten.length * (0.62 - stufe * 0.55))
                              + ri(r, -2, 2), 0, kandidaten.length - 1);
          const gegner = kandidaten[index];
          gegnerPool.splice(gegnerPool.indexOf(gegner), 1);

          const chance = clamp(0.42 + (teamPower - klubStaerke(gegner)) * 0.018
                               + poBoost / 300, 0.14, 0.72);
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
          season.poSv = clamp(season.sv + (r() - 0.45) * 0.016 + poBoost / 900, 0.855, 0.950);
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
          /* Der wertvollste Spieler der Playoffs muss in den Playoffs
             etwas getan haben. Die 18 Prozent galten vorher auch fuer
             den, der nichts beigetragen hat - gemessen wurde ein
             Playoff-MVP mit null Punkten aus 39 Spielen gekuert. Wer
             gar nichts liefert, kann den Titel nicht bekommen; die
             mittlere Stufe bleibt fuer den, der dabei war und
             ordentlich gespielt hat. */
          const poStark = isG ? (season.poSv > 0.925) : (season.poP >= poSpiele);
          const poDabei = isG ? ((season.poSv || 0) >= 0.905)
                              : (season.poP >= poSpiele * 0.5);
          if ((poStark || poDabei)
              && r() < (poStark ? 0.45 : 0.18) + poBoost / 140)
            season.awards.push('playoffMvp');
          if (!isG && season.poP >= poSpiele * 1.1 && r() < 0.4) season.awards.push('poTop');
          st.ruf += 4;
        } else {
          const letzte = serien[serien.length - 1];
          season.events.push({
            t: 'Playoffs: ' + letzte.runde + ' gegen ' + letzte.gegner
               + ' mit ' + letzte.eigene + ':' + letzte.fremde + ' verloren',
            c: letzte.knapp ? 'bad' : '' });
        }
      } else if (!istJugend(lg.k)){
        season.events.push({ t: 'Playoffs verpasst', c: '' });
      }

      /* Einzelehrungen */
      if (lg.prestige >= 44){
        if (isG){
          /* Auch fuer Torhueter: eine Fangquotenwertung verlangt in
             jeder echten Liga eine Mindestzahl an Spielen. Nur das
             Torwartduo darf darunter bleiben - es ist gerade die
             Auszeichnung fuer zwei, die sich die Saison teilen. */
          const genugImTor = season.gp >= fullGp * 0.55;
          if (genugImTor){
            if (season.sv > 0.925 && kante > 1.00) season.awards.push('bestG');
            if (season.sv > 0.933 && kante > 1.25 && r() < 0.4) season.awards.push('mvp');
          }
          if (season.gaa < 2.20 && kante > 0.95 && r() < 0.5) season.awards.push('torwartDuo');
        } else {
          const ppg = season.p / season.gp;
          /* ------------------------------------------------------------
             Eine Trophaee gewinnt man ueber die Saison, nicht ueber
             den Schnitt

             Alle diese Bedingungen rechneten in Punkten je Spiel. Wer
             die halbe Saison verletzt war und in fuenfundzwanzig
             Spielen dreissig Punkte machte, wurde damit Topscorer -
             eine Torjaegerkanone bekommt aber, wer am Ende die meisten
             Tore hat, nicht den besten Schnitt. Deshalb eine
             Mindestbeteiligung; die Grenze liegt bei zwei Dritteln,
             wie sie auch echte Ligen fuer ihre Wertungen ziehen. */
          const genugGespielt = season.gp >= fullGp * 0.66;
          if (genugGespielt){
            if (ppg > 1.12 && kante > 0.9) season.awards.push('topscorer');
            if (season.g / season.gp > 0.55 && kante > 0.85) season.awards.push('torjaeger');
            if (season.a / season.gp > 0.72 && kante > 0.85) season.awards.push('vorlagen');
            if (P.k === 'D' && ppg > 0.62 && kante > 0.85) season.awards.push('bestD');
            if (kante > 1.05 && ppg > 1.15 && r() < 0.5) season.awards.push('mvp');
          }
          // Selke: defensivstarker Stürmer mit ordentlicher Offensive
          const selkeBonus = (st.rolle && st.rolle.w && st.rolle.w.selke) || 0;
          if (P.k !== 'D' && (dev.defensive || 0) > 74 && kante > 0.75 && r() < 0.4 + selkeBonus)
            season.awards.push('selke');
          if (genugGespielt && season.plus >= 28 && kante > 0.8 && r() < 0.55)
            season.awards.push('plusminus');
          /* Die Fairplay-Auszeichnung war angelegt, hatte ein Wappen -
             und wurde nirgends vergeben. Sie geht an den, der ohne
             Strafbank auskommt und trotzdem trifft. */
          if (season.pim <= 16 && ppg > 0.70 && kante > 0.75 && r() < 0.45)
            season.awards.push('fairplay');
          if (missed === 0 && season.gp === fullGp && r() < 0.5) season.awards.push('ironman');
        }
        /* ------------------------------------------------------------
           Ein All-Star-Team waehlt man aus den Besten der Liga

           Gemessen kam jede fuenfte Berufung bei weniger als zwei
           Dritteln der Saison zustande - dieselbe Luecke wie bei den
           Scorerwertungen, nur an anderer Stelle. Die Beteiligung
           allein reicht aber nicht: die Bedingung hing sonst nur an
           kante, und kante misst die Abweichung von der EIGENEN
           Rollenerwartung. Ein Viertreihenspieler, der seine niedrige
           Erwartung uebertrifft, wurde damit All-Star - gemessen in
           der KHL mit 16 Punkten aus 45 Spielen und in der SHL mit 21
           aus 52. Ein All-Star-Team waehlt man aber nicht aus denen,
           die ihre eigene Erwartung schlagen.

           Dazu also eine absolute Untergrenze. Gemessen liegt die
           Ausbeute ueber alle Ligastufen nahezu gleich (Stuermer im
           Median 0.96 bis 1.12, Verteidiger 0.60 bis 0.71 Punkte je
           Spiel), eine Staffelung nach Liga braucht es deshalb nicht.
           Fuer Torhueter zaehlt die Fangquote auf der neuen Skala.
           ------------------------------------------------------------ */
        const ppgAllstar = season.gp ? (season.p || 0) / season.gp : 0;
        const traegtDieLiga = isG ? ((season.sv || 0) >= 0.915)
                            : P.k === 'D' ? ppgAllstar >= 0.50
                            : ppgAllstar >= 0.75;
        const dabeiGewesen = season.gp >= fullGp * 0.6 && traegtDieLiga;
        if (dabeiGewesen && kante > 0.62 && r() < 0.45) season.awards.push('allstar');
        if (dabeiGewesen && kante > 1.15 && r() < 0.55) season.awards.push('allstar1');
        if (dabeiGewesen
            && st.seasons.filter(s => league(s.lg).prestige >= 44).length === 0
            && kante > 0.42)
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
        if (istJugend(lg.k) && st.age > 20) return null;
        // Juniorenstufen
        if (st.age <= 18 && ovr >= 56 + (100 - nat.wm) * 0.10 - natBonus * 0.3) return 'U18';
        if (st.age <= 20 && ovr >= 64 + (100 - nat.wm) * 0.14 - natBonus * 0.3) return 'U20';
        // A-Nationalmannschaft: Wertung UND eine ueberzeugende Saison
        /* Eine Verbandssperre verhindert die Nominierung selbst - sonst
           wuerde nur die Frage ausfallen und man stuende trotzdem beim
           Turnier, genau der Fehler, den wir eben abgestellt haben. */
        if (st.natGesperrtBis && st.year < st.natGesperrtBis) return null;
        const schwelle = 78 + (100 - nat.wm) * 0.26 - natBonus * 0.45;
        const ueberzeugt = kante > 0.55 || season.awards.length > 0 || st.ruf > 86;
        return (ovr >= schwelle && ueberzeugt) ? 'A' : null;
      })();

      if (!stufe){
        /* Wer gefragt wurde und zugesagt hat, muss erfahren, was
           daraus geworden ist - immer. Gemessen blieben sonst 20
           Prozent aller Zusagen ohne jede Rueckmeldung: der Spieler
           sagte zu, und dann kam einfach nichts. Die alte Bedingung
           (Alter 21-35, Liga mit Ansehen) liess Junge und alle in
           schwaecheren Ligen durchs Raster fallen. */
        if (st.natGefragt){
          season.events.push({ t: 'Trotz deiner Zusage nicht nominiert – '
            + nat.n + ' fährt ohne dich', c: 'bad' });
        } else if (st.age >= 21 && st.age <= 33 && lg.prestige >= 44){
          season.events.push({ t: st.natDebuet
            ? 'Diesmal ohne dich: keine Nominierung für ' + nat.n
            : 'Keine Nominierung für ' + nat.n, c: st.natDebuet ? 'bad' : '' });
        }
      } else {
        /* Das Turnier findet nach der Saison statt, also im Jahr
           darauf - die Anfrage rechnet deshalb mit st.year + 1. Hier
           stand st.year, und damit konnten beide Formeln nie
           gleichzeitig stimmen: der Verband fragte nach Olympia, und
           gefahren wurde zur WM. */
        const olympia = stufe === 'A' && (st.year + 1) % 4 === 0;
        const T = stufe === 'U18' ? D.TURNIERE.u18
                : stufe === 'U20' ? D.TURNIERE.u20
                : olympia ? D.TURNIERE.olympia : D.TURNIERE.wm;

        // Bei tiefem Playoff-Lauf verpasst man die A-WM.
        // Und wer abgesagt hat, faehrt nicht mit.
        const abgesagt = stufe === 'A' && !st.natZusage;
        if (abgesagt){
          season.events.push({ t: 'Für ' + T.n + ' abgesagt – der Sommer gehört dir', c: '' });
          st.natZusage = true;          // die Absage gilt nur fuer dieses Jahr
        }
        /* Ein tiefer Playoff-Lauf kostet die WM - das ist realistisch,
           stand aber nirgends. Wer zugesagt hat und dann nicht faehrt,
           bekam gar keine Rueckmeldung: kein Turnier, keine Zeile,
           nichts. Das ist der haeufigste Grund, warum die
           Nationalmannschaft sich anfuehlt, als passiere dort nichts. */
        const titelSperrt = stufe === 'A' && !olympia && !!season.title;
        if (titelSperrt){
          season.events.push({ t: 'Der Titellauf kostet dich die ' + T.kurz
            + ' – das Turnier läuft ohne dich', c: '' });
        }
        const dabei = !abgesagt && !titelSperrt;
        if (dabei){
          if (!st.natDebuet){
            st.natDebuet = { jahr: st.year + 1, stufe };
            season.events.push({ t: 'Erste Nominierung: ' + T.n + ' mit ' + nat.n, c: 'good' });
          }
          const jugend = stufe !== 'A';
          /* Wer die Fuehrung uebernommen hat, zieht die Mannschaft mit. */
          const fuehrungsBonus = st.natKapitaen ? 4 : 0;
          const natPower = nat.wm + clamp((ovr - (jugend ? 68 : 82)) * 0.5, -8, 9)
                         + fuehrungsBonus + (r() - 0.5) * 22;
          const spiele = T.spiele - (r() < 0.2 ? ri(r, 1, 2) : 0);

          const turnier = { jahr: st.year + 1, art: stufe.toLowerCase(), stufe,
                            n: T.n, kurz: T.kurz, gp: spiele };
          if (isG){
            turnier.sv = clamp(season.sv + (r() - 0.5) * 0.014, 0.850, 0.950);
            turnier.wins = Math.round(spiele * clamp(0.35 + (natPower - 80) / 60, 0.15, 0.85));
            turnier.so = r() < 0.25 ? 1 : 0;
          } else {
            /* ------------------------------------------------------------
               Ein Turnier ist schwerer als die Liga

               Der Faktor lag im Mittel bei 1,12 - man traf also bei
               einer Weltmeisterschaft besser als beim eigenen Verein.
               Gemessen ergab das 9,4 Punkte in 7,9 Spielen fuer einen
               Goldgewinner, und selbst nach einem Vorrundenaus noch
               6,4. Gegen die besten Mannschaften der Welt spielt man
               aber nicht ueber, sondern unter dem Ligaschnitt.
               ------------------------------------------------------------ */
            const schnitt = (season.p / Math.max(1, season.gp)) * (0.50 + r() * 0.45);
            turnier.p = Math.max(0, Math.round(schnitt * spiele));
            turnier.g = Math.round(turnier.p * (P.goalRate / (P.goalRate + P.assistRate)));
            turnier.a = turnier.p - turnier.g;
          }

          /* ------------------------------------------------------------
             Was der eigene Beitrag ausmacht

             Der Platz haengt bisher nur an der Staerke der Nation und
             einem Wurf - die eigene Leistung im Turnier ging gar nicht
             ein. Deshalb konnte man in zehn Spielen einunddreissig
             Punkte machen und trotzdem in der Vorrunde ausscheiden.
             Das gibt es, aber nicht als Regelfall: ein Turnier, in dem
             ein Spieler so aufdreht, gewinnt seine Mannschaft meistens
             ein paar Spiele mehr.

             Gemessen wird an dem, was in diesem Turnier ueblich ist,
             und der Ausschlag ist gedeckelt, damit ein einzelner Mann
             kein Land traegt.

             Der Nullpunkt lag bei einem Punkt je Spiel - geeicht auf
             die Zeit, in der ein Turnier besser lief als die Liga.
             Seit die Ausbeute auf ein realistisches Mass gesenkt ist,
             liegt der Schnitt bei 0,65, und gegen die alte Eins
             gemessen bekam praktisch jeder Abzug: die Goldquote fiel
             von 379 auf 241 Turniere. Neuer Nullpunkt, steilere
             Kennlinie, damit der Ausschlag derselbe bleibt. */
          const eigenerBeitrag = (() => {
            if (isG) return clamp(((turnier.sv || 0.9) - 0.908) * 380, -6, 9);
            const proSpiel = (turnier.p || 0) / Math.max(1, spiele);
            return clamp((proSpiel - 0.65) * 14, -6, 9);
          })();
          const wurf = r() * 100 - eigenerBeitrag * 2.2;
          let platz = 'Vorrunde', medaille = null;
          const gold = jugend ? 88 : 93, silber = jugend ? 80 : 86, bronze = jugend ? 74 : 80;
          const natPowerGesamt = natPower + eigenerBeitrag;
          turnier.beitrag = Math.round(eigenerBeitrag * 10) / 10;
          if (natPowerGesamt > gold && wurf < 30){
            platz = 'Gold';
            medaille = stufe === 'U18' ? 'u18Gold' : stufe === 'U20' ? 'u20Gold'
                     : olympia ? 'olympia' : 'wm';
          } else if (natPowerGesamt > silber && wurf < 55){
            platz = 'Silber';
            medaille = stufe === 'U18' ? 'u18Silber' : stufe === 'U20' ? 'u20Silber'
                     : olympia ? 'olySilber' : 'wmSilber';
          } else if (natPowerGesamt > bronze && wurf < 75){
            platz = 'Bronze';
            medaille = stufe === 'U18' ? 'u18Bronze' : stufe === 'U20' ? 'u20Bronze'
                     : olympia ? 'olyBronze' : 'wmBronze';
          } else if (wurf < 88){ platz = 'Viertelfinale'; }
          turnier.platz = platz;

          /* ------------------------------------------------------------
             Wie viele Spiele es wirklich waren

             Die Spielzahl stand vor der Auslosung fest und war deshalb
             dieselbe, ob man Gold holte oder in der Vorrunde
             ausschied - gemessen 7,9 gegen 8,0. Wer nach der
             Gruppenphase heimfaehrt, hat die Halbfinals aber nicht
             gespielt. Der Beitrag oben rechnet mit einer Rate je Spiel
             und bleibt davon unberuehrt; die Zaehlwerte skalieren mit.
             ------------------------------------------------------------ */
          const fehlendeRunden = platz === 'Vorrunde' ? 3
                               : platz === 'Viertelfinale' ? 2 : 0;
          const gpEcht = Math.max(3, spiele - fehlendeRunden);
          const anteilGespielt = spiele > 0 ? gpEcht / spiele : 1;
          turnier.gp = gpEcht;
          if (isG){
            turnier.wins = Math.round((turnier.wins || 0) * anteilGespielt);
            /* Ein Zunullspiel in der Vorrunde bleibt moeglich, wird aber
               seltener, wenn weniger gespielt wurde. */
            if (fehlendeRunden && turnier.so) turnier.so = r() < anteilGespielt ? 1 : 0;
          } else {
            turnier.p = Math.round((turnier.p || 0) * anteilGespielt);
            turnier.g = Math.round(turnier.p * (P.goalRate / (P.goalRate + P.assistRate)));
            turnier.a = turnier.p - turnier.g;
          }

          /* ------------------------------------------------------------
             Was man dort eigentlich macht

             Das Turnier war bisher eine Zeile: "Weltmeisterschaft mit
             Deutschland: Bronze". Simuliert wurde deutlich mehr - eine
             eigene Statistik, eine Rolle, ein Verlauf -, nur zu sehen
             war davon nichts. Jetzt traegt das Turnier, gegen wen es
             sich entschieden hat, wie es ausging und welche Rolle man
             in der Mannschaft hatte.
             ------------------------------------------------------------ */
          const RUNDE = { 'Gold':'im Finale', 'Silber':'im Finale',
                          'Bronze':'im Spiel um Platz drei',
                          'Viertelfinale':'im Viertelfinale',
                          'Vorrunde':'in der Vorrunde' };
          /* Der Gegner ist keiner der schwachen - wer um Medaillen
             spielt, trifft oben auf jemanden, der auch dort hingehoert. */
          const gegnerPool = D.NATIONS.filter(n => n.k !== player.nation
            && n.wm >= (platz === 'Vorrunde' ? 54 : 72));
          const gegner = gegnerPool.length ? pick(r, gegnerPool) : null;
          const gewonnen = platz === 'Gold' || platz === 'Bronze';
          /* Immer das eigene Ergebnis zuerst. Beim ersten Anlauf stand
             bei einer Niederlage der Gegner vorn - "Silber, 5:3" las
             sich damit wie ein gewonnenes Finale. */
          const eigene = gewonnen ? ri(r, 2, 5) : ri(r, 0, 3);
          const fremde = gewonnen ? ri(r, 0, eigene - 1) : eigene + ri(r, 1, 2);
          const knapp = Math.abs(eigene - fremde) === 1;
          turnier.gegner = gegner ? gegner.n : null;
          turnier.flagge = gegner ? gegner.flag : '';
          turnier.runde = RUNDE[platz] || 'im Turnier';
          turnier.ergebnis = eigene + ':' + fremde
                           + (knapp && r() < 0.45 ? ' n. V.' : '');
          turnier.gewonnen = gewonnen;

          /* Die eigene Rolle im Team - sie ergibt sich aus dem Abstand
             zwischen der eigenen Wertung und dem Niveau der Nation. */
          /* ------------------------------------------------------------
             Wer nominiert wird, ist kein Ergaenzungsspieler

             Erst stand hier eine feste 82 fuer jede Nation, dann ein
             Niveau aus der Staerke des Landes - gemessen waren
             trotzdem 53 Prozent aller Nominierten "Ergaenzungsspieler",
             also die Mehrheit. Das kann nicht stimmen: wer ueberhaupt
             einberufen wird, gehoert zu den Besten seines Landes.

             Der Massstab ist deshalb genau die Schwelle, ab der man
             nominiert wird. Wer sie knapp nimmt, faehrt als Ergaenzung
             mit; wer deutlich darueber liegt, spielt in der ersten
             Reihe. Damit misst sich der Spieler an denen, die
             tatsaechlich neben ihm stehen.
             ------------------------------------------------------------ */
          const niveau = jugend
            ? (stufe === 'U18' ? 56 + (100 - nat.wm) * 0.10
                               : 64 + (100 - nat.wm) * 0.14) - natBonus * 0.3
            : 78 + (100 - nat.wm) * 0.26 - natBonus * 0.45;
          const abstand = ovr - niveau;
          turnier.rolle = st.natKapitaen ? 'Kapitän'
                        : abstand >= 6  ? 'Erste Reihe'
                        : abstand >= 2  ? 'Stammkraft'
                        : 'Ergänzungsspieler';
          turnier.niveau = Math.round(niveau);

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
        st.natGefragt = false;
      }
      st.natGefragt = false;

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
      /* Das C bekommt niemand, dessen Rolle gerade zur Debatte steht -
         die Mannschaft folgt keinem, den der Trainer selbst infrage
         stellt. Wer seine Rolle traegt, wird eher gefragt. */
      if (st.kapitaenSperre > 0) st.kapitaenSperre--;
      if (!st.kapitaenSeit && !st.kapitaenGefragt && !st.kapitaenSperre
          && st.klubJahre >= (klubBindung() >= 0.6 ? 1 : 2) && st.age >= 25
          && kante > 0.65 && !istJugend(lg.k) && st.rollenStand !== 'bewaehrung'
          && r() < (st.rollenStand === 'saeule' ? 0.72 : 0.50)){
        st.kapitaensfrage = { klub: club.n, jahr: st.year };
      }
      if (st.kapitaenSeit === club.n) season.kapitaen = true;

      /* ---- Erzaehlung der Saison ---- */
      if (st.klubJahre === 0 && !istJugend(lg.k)) season.story = pick(r, D.STORY.ankunft);
      else if (kante > 1.1 && r() < 0.55)       season.story = pick(r, D.STORY.gut);
      else if (kante < 0.3 && r() < 0.55)       season.story = pick(r, D.STORY.schlecht);
      else if (r() < 0.35)                      season.story = pick(r, D.STORY.neutral);
      st.klubJahre++;

      season.salary = round1((gehaltBasis(ovr, lg) + 0.05)
                             * (st.gehaltFaktor || 1));
      season.marktwert = marktwert(ovr, st.age);
      st.formBonus *= 0.5;          // Nachwirkung klingt ab
      st.risikoBonus *= 0.5;
      moralAendern((season.title ? 6 : (season.playoffs ? 2 : -3)));
      /* Die groessten Veraenderungen an den Einzelwerten - erst hier,
         nachdem Training, Ereignisse und Alterung gewirkt haben. */
      const bewegt = [];
      Object.keys(player.attrs).forEach(k => {
        const d = Math.round(player.attrs[k] - (attrsVorher[k] || player.attrs[k]));
        if (d) bewegt.push({ k, d });
      });
      bewegt.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
      season.attrBewegung = bewegt.slice(0, 3);
      st.attrsLetzte = Object.assign({}, player.attrs);
      st.ovrLetzte = ovr;

      /* Rueckstellkraft: ein Viertel des Abstands je Saison. Sie wirkt
         nach beiden Seiten - sie holt aus dem Loch heraus und nimmt
         der Dauereuphorie die Spitze. */
      st.moral = clamp(Math.round(st.moral + (st.grundstimmung - st.moral) * 0.25),
                       10, 100);

      /* ----------------------------------------------------------------
         Das C ist keine Lebensstellung

         Es war eines: einmal vergeben, blieb es bis zum naechsten
         Vereinswechsel, ganz gleich was danach kam. Ein Kapitaen
         konnte zwei Jahre lang in der vierten Reihe stehen und trug
         die Binde weiter - und ein neuer Trainer, der sonst alles
         umwirft, ruehrte sie nicht an.

         Jetzt haengt sie an denselben Groessen wie alles andere: am
         Vertrauen des Trainers, an der Verfassung, an dem, was man
         dem Verein bedeutet. Eine Vereinslegende behaelt sie auch in
         einem schlechten Jahr; wer auf Bewaehrung steht, nicht.
         ---------------------------------------------------------------- */
      if (st.kapitaenSeit === (st.club && st.club.n)){
        const bindung = klubBindung();
        const schwach = st.rollenStand === 'bewaehrung';
        /* Der erste Entwurf traf einen Kapitaen fast nie: sieben
           Verluste in 2065 Kapitaenssaisons. Kein Wunder - wer die
           Binde bekommt, steht selten auf Bewaehrung und hat selten
           schlechte Moral. Was einen Kapitaen wirklich kostet, ist
           etwas anderes: eine Mannschaft, die ihre Ziele verfehlt,
           und ein Anfuehrer, der selbst nachlaesst. */
        const zielVerfehlt = season.ziele && season.ziele.team
                          && season.ziele.team.erfuellt === false;
        const nachgelassen = season.ovrGewinn !== undefined && season.ovrGewinn <= -2;
        /* Der Schutz durch die Vereinsbindung wirkt multiplikativ.
           Abgezogen loeschte er die Grundgefahr rechnerisch aus - eine
           Stammkraft kam auf 0,025 minus 0,06, also null, und damit war
           die Binde fuer fast jeden wieder eine Lebensstellung. Eine
           Legende soll sie schwer verlieren, nicht unmoeglich. */
        const gefahr = 0.05                              // nichts haelt ewig
          + (schwach ? 0.34 : 0)
          + (st.moral < 50 ? 0.14 : 0)
          + (st.trainerNeu ? 0.16 : 0)
          + (zielVerfehlt ? 0.09 : 0)
          + (nachgelassen ? 0.09 : 0)
          + (season.gp && season.gp < (season.vollGp || 52) * 0.55 ? 0.14 : 0);
        const risiko = clamp(gefahr * (1 - bindung * 0.55), 0, 0.55);
        if (risiko > 0 && r() < risiko){
          st.kapitaenSeit = null;
          /* Nicht sofort wieder fragen. Ohne Sperrfrist stand im Jahr
             darauf die Frage "willst du das C?" auf dem Schirm, obwohl
             man es gerade erst abgegeben hatte - und der Verlust selbst
             ging als eine Zeile unter vielen unter. Ein Verein gibt die
             Binde nicht im Jahr darauf zurueck. */
          st.kapitaenSperre = 3;
          st.kapitaenGefragt = false;
          season.events.push({ t: 'Das C geht an einen anderen', c: 'bad' });
          /* Als Folge gemeldet, damit es die Oberflaeche als eigenen
             Moment zeigt statt als Zeile unter zwanzig anderen. */
          st.letzteFolge = {
            gelungen: false, text: schwach
              ? 'Der Trainer nimmt dir die Binde. Er sagt, du sollst dich um dein '
                + 'eigenes Spiel kümmern – das sei gerade genug.'
              : 'Vor der Saison hängt ein anderes Trikot mit dem C im Spind. '
                + 'Man hat es dir vorher gesagt, aber gefragt hat dich niemand.',
            tag: 'Kabine', wahl: 'Das Kapitänsamt abgegeben',
            wirkungen: [{ t: 'Kein Kapitän mehr', gut: false },
                        { t: '-8 Moral', gut: false },
                        { t: '-3 Ansehen', gut: false }]
          };
          moralAendern(-8);
          st.ruf = clamp(st.ruf - 3, 20, 99);
          st.verlauf.push({ jahr: st.year, alter: st.age, art: 'kapitaen',
            tag: 'Kabine', titel: 'Die Binde abgegeben',
            wahl: schwach ? 'Der Trainer traut es dir nicht mehr zu'
                          : 'Ein anderer übernimmt',
            gelungen: false, chance: null, wagnis: false });
        }
      }

      /* ---- Was der Koerper wieder hergibt ----
         Ohne Gegenbewegung waere Verschleiss eine Einbahnstrasse und
         jede lange Laufbahn endete zwangslaeufig als Wrack. Ein Jahr
         ohne Verletzung holt ein Stueck zurueck - beim Jungen mehr
         als beim Alten. */
      if (!season.verletzung && (st.verletzungsjahre || 0) > 0){
        const heilt = st.age <= 27 ? 0.9 : st.age <= 31 ? 0.55 : 0.3;
        if (r() < heilt) st.verletzungsjahre--;
      }

      /* ---- Was er behaelt ----
         Ein verschlissener Koerper verliert dort zuerst, wo es weh
         tut: Antritt, Skating, Zweikampf. Nicht viel je Saison, aber
         es summiert sich - und macht den Unterschied zwischen einem,
         der mit 34 noch laeuft, und einem, der nur noch steht. */
      if ((st.verletzungsjahre || 0) >= 3 && st.age >= 27){
        const koerperlich = isG ? ['reflexe', 'stellung']
                                : ['antritt', 'skating', 'zweikampf'];
        const abbau = -Math.min(1.6, (st.verletzungsjahre - 2) * 0.35);
        koerperlich.forEach(k => attrHeben(player, k, abbau));
      }

      /* ================================================================
         Die Decke ist nicht in Stein gemeisselt

         player.potenzial wurde einmal beim Draft gesetzt und danach
         nie wieder angefasst. Wer eine Zweiundsiebzig gezogen hatte,
         kam auf zweiundsiebzig - egal was er in fuenfzehn Saisons tat.
         Gemessen schoepfen die Laufbahnen ihre Anlage im Median zu 93
         Prozent aus; sie scheitern also nicht an sich selbst, sondern
         an einer Zahl, die vor dem ersten Spiel feststand. Genau das
         fuehlt sich an wie "Entwicklung zu schwach": man tut alles
         richtig und kommt trotzdem nicht weiter.

         In Wahrheit weiss mit achtzehn niemand, wo ein Spieler landet.
         Wer Jahr um Jahr liefert, verschiebt, was man ihm zutraut -
         und wer sich haengen laesst, auch. Die Decke bewegt sich
         deshalb mit, aber langsam und begrenzt: hoechstens sechs
         Punkte in beide Richtungen ueber eine ganze Laufbahn, und nur
         solange noch Wachstum drin ist. Der Wuerfel vom Draft bleibt
         damit der groesste Teil der Geschichte - nur nicht mehr die
         ganze.
         ================================================================ */
      (() => {
        if (st.age > 28) return;                 // danach waechst nichts mehr
        const grundlage = player.grundGrenze || player.potenzial || 80;
        st.grenzeVerschoben = st.grenzeVerschoben || 0;

        /* Was zaehlt: die Vorgabe erfuellt, Auszeichnungen, eine Saison
           deutlich ueber dem Ligamass - und das Gegenteil davon. */
        const zielErfuellt = season.ziele && season.ziele.person
                          && season.ziele.person.erfuellt === true;
        const zielVerfehlt = season.ziele && season.ziele.person
                          && season.ziele.person.erfuellt === false;
        const stark = (season.kante || 0) > 0.95;
        const schwach = (season.kante || 0) < 0.25;

        /* Der erste Entwurf war ein Zuschlag fuer alle: gemessen
           verschob sich die Decke im Median um +4,5 Punkte, und
           erfolgreiche Laufbahnen unterschieden sich mit 4,22 gegen
           4,14 praktisch nicht von erfolglosen. Die positiven Posten
           trafen einfach oefter zu als die negativen - Vorgaben werden
           in 59 Prozent der Saisons erfuellt.

           Jetzt liegt der Nullpunkt dort, wo eine durchschnittliche
           Saison liegt: die Vorgabe zu erfuellen haelt die Decke, sie
           zu verfehlen senkt sie. Nach oben geht es nur ueber das,
           was ueber dem Erwarteten liegt. */
        /* Zwei Anlaeufe mit Saisonergebnissen sind gescheitert, und
           zwar aus einem strukturellen Grund: wer sich gut entwickelt,
           wechselt in eine staerkere Liga, wo Vorgaben und Klassen-
           unterschied wieder schwerer werden. Erfolg hebt damit seine
           eigenen Messlatte an, und die Verschiebung unterschied
           erfolgreiche von erfolglosen Laufbahnen um 0,2 Punkte -
           also gar nicht.

           Was der Spieler dagegen wirklich steuert und was nicht
           mitwandert, ist die Arbeit: Sommertraining, Rollenvertrauen,
           ein Koerper, der mitmacht. Daran haengt die Decke jetzt. */
        let schritt = -0.12;                       // Stillstand kostet
        if (st.sommerBonus) schritt += 0.34;       // im Sommer gearbeitet
        if (st.rollenStand === 'saeule') schritt += 0.26;
        if (st.rollenStand === 'bewaehrung') schritt -= 0.26;
        if ((season.awards || []).length) schritt += 0.22;
        if ((st.verletzungsjahre || 0) >= 3) schritt -= 0.22;
        /* Wer viel verpasst hat, kann in dieser Saison nichts belegen. */
        if (season.gp && season.gp < (season.vollGp || 52) * 0.5) schritt *= 0.4;
        /* Lernwillige verschieben mehr - das ist genau das, wofuer die
           Eigenschaft da ist. */
        schritt *= 1 + ((player.wirkung || {}).lernkurve || 0) * 0.05;

        if (!schritt) return;
        const vorher = st.grenzeVerschoben;
        st.grenzeVerschoben = clamp(st.grenzeVerschoben + schritt, -6, 6);
        const neuePot = clamp(Math.round(grundlage + ((player.wirkung || {}).grenze || 0)
                                         + st.grenzeVerschoben), 58, 99);
        if (neuePot !== player.potenzial){
          const rauf = neuePot > player.potenzial;
          player.potenzial = neuePot;
          /* Nur die vollen Punkte melden, sonst steht es jedes Jahr da. */
          if (Math.round(vorher) !== Math.round(st.grenzeVerschoben)){
            season.events.push({ t: rauf
              ? 'Die Scouts trauen dir inzwischen mehr zu'
              : 'In den Berichten steht, dein Zenit sei erreicht',
              c: rauf ? 'good' : 'bad' });
          }
        }
        season.potenzial = player.potenzial;
      })();

      /* Die Vereinsbilanz fortschreiben - vor allem anderen, damit
         alles Folgende schon den neuen Rang sieht. */
      (() => {
        const k = klubKonto(st.club && st.club.n);
        if (!k) return;
        k.saisons++;
        if (season.title) k.titel++;
        if (st.kapitaenSeit === st.club.n) k.kapitaen++;
        if (st.rollenStand === 'saeule') k.saeule++;
        k.punkte = Math.round(klubPunkte(k) * 10) / 10;
        const vorher = k.rang;
        k.rang = klubRangVon(k.punkte);
        if (k.rang !== vorher && k.rang !== 'zugang'){
          const R = KLUBRANG.find(x => x.k === k.rang);
          season.events.push({ t: 'Bei ' + st.club.n + ': ' + R.n, c: 'good' });
          moralAendern(k.rang === 'legende' ? 9 : k.rang === 'gesicht' ? 6 : 3);
          if (k.rang === 'legende')
            st.verlauf.push({ jahr: st.year, alter: st.age, art: 'legende',
              tag: 'Verein', titel: 'Vereinslegende bei ' + st.club.n,
              wahl: k.saisons + ' Saisons', gelungen: true, chance: null, wagnis: false });
        }
        season.klubRang = k.rang;
        season.klubPunkte = k.punkte;
      })();

      /* ----------------------------------------------------------------
         Der Vergleich mit dir selbst

         Die Farbskala sagt, wo eine Zahl im Feld steht. Was sie nicht
         sagt: ob es fuer einen selbst mehr oder weniger war als im
         Jahr davor - und das ist die Frage, die man beim Lesen einer
         Saisonkarte zuerst hat. Deshalb traegt jede Saison die Werte
         der vorigen mit; nur die Zahlen, kein Verweis, damit
         gespeicherte Laufbahnen davon nicht schwerer werden.
         ---------------------------------------------------------------- */
      (() => {
        const v = st.seasons[st.seasons.length - 2];
        if (!v || !v.gp) return;
        season.vorher = isG
          ? { gp: v.gp, wins: v.wins, so: v.so, sv: v.sv }
          : { gp: v.gp, g: v.g, a: v.a, p: v.p, plus: v.plus, toi: v.toi };
      })();

      werteLeben(season);
      werteKlausel(season);

      /* ----------------------------------------------------------------
         Der Trainer wechselt

         Er war bisher unsterblich: derselbe Mann von der ersten bis zur
         letzten Saison bei einem Klub. In Wahrheit ist er der erste,
         den ein Verein entlaesst, wenn es nicht laeuft - und fuer einen
         Spieler ist das einer der groessten Einschnitte, die es gibt.
         Alles, was er sich beim alten aufgebaut hat, faengt von vorne
         an: der neue Mann kennt ihn nicht.
         ---------------------------------------------------------------- */
      st.trainerNeu = false;
      if (st.club && !istJugend(lg.k)){
        st.trainerJahre++;
        const zielVerfehlt = season.ziele && season.ziele.team
                          && season.ziele.team.erfuellt === false;
        const schwach = klubStaerke(club) < ligaSchnittJetzt(club.lg) - 3;
        /* Geeicht auf rund ein Fuenftel der Saisons: ein Trainer haelt
           damit im Mittel gut vier Jahre, und ein Spieler erlebt in
           einer Laufbahn zwei bis drei Wechsel. Mit dem ersten Ansatz
           waren es 7,6 Prozent - einer je dreizehn Saisons, und damit
           blieb der Mann an der Bande faktisch doch unsterblich. */
        const risiko = clamp(0.11
          + (zielVerfehlt ? 0.24 : 0)
          + (schwach ? 0.12 : 0)
          + (season.playoffs ? -0.07 : 0.10)
          + (st.trainerJahre >= 4 ? 0.10 : 0), 0.03, 0.62);
        if (r() < risiko){
          st.trainerVorher = st.trainer;
          const rr2 = rng(player.seed + ':trainer:' + club.n + ':' + st.year);
          st.trainer = pick(rr2, D.FIRST) + ' ' + pick(rr2, D.LAST);
          st.trainerJahre = 0;
          st.trainerNeu = true;
          season.events.push({ t: st.trainerVorher + ' muss gehen – '
            + st.trainer + ' übernimmt', c: 'bad' });
          /* Der Neue kennt dich nicht. Wer Saeule war, ist erst einmal
             wieder gesetzt; wer schon wackelte, steht ganz unten. */
          if (st.rolle){
            /* Wer beim Verein eine Figur ist, faellt nicht auf null
               zurueck - der Neue kennt zwar ihn nicht, aber die
               Kabine und die Halle kennen ihn. */
            const halt = klubBindung();
            st.rollenStand = st.rollenStand === 'bewaehrung' ? 'bewaehrung'
                           : halt >= 1 ? 'saeule' : 'gesetzt';
            st.rollenPunkte = st.rollenStand === 'bewaehrung' ? -1
                            : st.rollenStand === 'saeule' ? 3 : (halt >= 0.6 ? 1 : 0);
            st.rollenLauf.push({ jahr: st.year, rolle: st.rolle.k,
                                 stand: st.rollenStand, grund: 'neuerTrainer' });
          }
          /* Ein Kapitaen bleibt Kapitaen - aber nicht selbstverstaendlich. */
          moralAendern(-(6));
        }
      }

      /* Alles, was einmal je Saison passiert, wieder freigeben */
      st.ereignisGeprueft = false;
      st.wechselGeprueft = false;
      st.natGeprueft = false;

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
      werteRolle(season, kante, posFactor, isG, dev);
      werteSaisonZiel(season);
      st.seasons.push(season);
      st.ruf = st.ruf * 0.5 + (ovr + season.awards.length * 3 + (season.title ? 4 : 0)) * 0.5;

      /* Entry Draft: einmalig im Sommer nach der Saison mit 18 */
      /* ==================================================================
         Der Entry Draft, so wie er wirklich ablaeuft

         Vorher war er eine Handvoll Wuerfel: Runde und Position wurden
         unabhaengig voneinander gezogen, ein Spitzentalent konnte also
         "Runde 1, Position 30" sein und ein Grenzfall "Runde 6,
         Position 2". In Wahrheit gibt es nur eine Zahl - die
         Gesamtposition -, und die Runde ergibt sich aus ihr.

         Dazu drei Dinge, die vorher ganz fehlten:

           Nachruecken   Wer mit achtzehn nicht gezogen wird, ist nicht
                         erledigt. Mit neunzehn und zwanzig steht er
                         wieder auf der Liste, und wer sich in der
                         Zwischenzeit entwickelt hat, wird doch noch
                         geholt - nur spaeter, weil ein Jahrgang immer
                         die Frischen bevorzugt.
           Reihenfolge   Der Schlechteste zieht zuerst. Sie kommt jetzt
                         aus der Tabelle des laufenden Jahres, nicht
                         aus einer festen Zahl - der Verein, der einen
                         zieht, ist also einer, der gerade unten steht.
           Lotterie      Um die ersten Plaetze wird gelost. Der
                         Schlechteste bekommt nicht automatisch die
                         Eins.

         Und wer durchfaellt, ist Free Agent - das ist kein Nichts,
         sondern ein anderer Weg.
         ================================================================== */
      const draftAlter = st.age >= 18 && st.age <= 20;
      const nochOffen = !st.entryDraft || st.entryDraft.ungezogen;
      if (draftAlter && nochOffen){
        /* Was die Sichter sehen, ist die Anlage - nicht der
           Achtzehnjaehrige von heute. */
        const potenzial = (player.potenzial || 80) * 0.7
          + overall(player, devAttrs(player.attrs,
              formFactor(st.scheitel, player.traits,
                         (player.wirkung || {}).lernkurve, st.scheitel))) * 0.3;
        /* Ein Nachruecker ist bekannt und hat einen Jahrgang vor sich;
           er faellt in der Achtung, gewinnt aber durch das, was er
           inzwischen gespielt hat. */
        const nachrueckAbzug = (st.age - 18) * 2.2;
        const wert = potenzial + (season.p || season.wins || 0) * 0.10
                   - nachrueckAbzug + (r() - 0.5) * 12;

        let runde = 0, pick2 = 0, gesamt = 0, klub = null, liga = 'NHL';
        if (wert > 79){
          /* ---- Eine Zahl: die Gesamtposition ----
             Sieben Runden zu zweiunddreissig, also 224 Plaetze. Wo man
             landet, haengt daran, wie weit man ueber der Schwelle
             liegt - mit reichlich Streuung, denn kein Draft geht so
             aus, wie die Listen es vorhersagen. */
          /* ------------------------------------------------------------
             Die Spanne war zu eng und klemmte oben ab

             Seit die Laufbahn mit sechzehn beginnt, steht am Draftabend
             ein Achtzehnjaehriger mit zwei Sommern Training; die
             Gipfelprojektion, die zu dreissig Prozent in den Wert
             eingeht, liegt entsprechend hoeher. Bei einem Teiler von 18
             erreichte jeder ueber 97 den Anschlag und landete damit
             ganz vorne - gemessen sprangen die Erstrundenpicks von 14
             auf 29 Prozent. Ein Erstrundenpick, den fast jeder Dritte
             bekommt, ist keiner mehr. Mit 22 braucht die erste Runde
             wieder das oberste Achtel der Jahrgangsbewertung.
             ------------------------------------------------------------ */
          const spanne = clamp((wert - 79) / 22, 0, 1);
          const mitte = 224 - Math.pow(spanne, 0.75) * 220;
          gesamt = clamp(Math.round(mitte + (r() - 0.5) * 46), 1, 224);

          /* ---- Die Lotterie ----
             Um die ersten Plaetze wird gelost; wer knapp dahinter
             steht, kann nach vorn rutschen. */
          if (gesamt <= 12 && r() < 0.35) gesamt = ri(r, 1, Math.max(1, gesamt));

          runde = Math.ceil(gesamt / 32);
          pick2 = ((gesamt - 1) % 32) + 1;

          const khlNah = { RUS: 0.62, LAT: 0.40, SVK: 0.20, CZE: 0.16, FIN: 0.10,
                           SWE: 0.08, GER: 0.08, AUT: 0.10, DEN: 0.06, NOR: 0.06,
                           SUI: 0.06, CAN: 0.02, USA: 0.02 };
          const khlChance = (khlNah[player.nation] || 0.05) + (runde >= 4 ? 0.12 : 0);
          liga = r() < khlChance ? 'KHL' : 'NHL';

          /* ---- Der Schlechteste zieht zuerst ----
             Aus der Tabelle des laufenden Jahres, nicht aus einer
             festen Zahl: der Verein, der dich zieht, ist einer, der
             gerade unten steht. In spaeteren Runden wiederholt sich
             dieselbe Reihenfolge. */
          const pool = clubsOf(liga).slice()
            .sort((a, b) => klubStaerke(a) - klubStaerke(b));
          const platzInRunde = Math.round((pick2 - 1) * (pool.length / 32));
          klub = pool[clamp(platzInRunde, 0, pool.length - 1)];

          st.ruf = clamp(st.ruf + (gesamt <= 10 ? 12 : runde === 1 ? 9
                                 : runde <= 3 ? 5 : 2), 20, 95);
          season.events.push({
            t: (liga === 'KHL' ? 'KHL-Draft' : 'Entry Draft') + ': Nr. ' + gesamt
               + ' gesamt (Runde ' + runde + ', Pick ' + pick2 + ') – ' + klub.n
               + (st.age > 18 ? ' – nachgerückt mit ' + st.age : ''),
            c: 'good' });
        } else if (st.age < 20){
          season.events.push({ t: 'Im Entry Draft nicht gezogen – '
            + 'nächstes Jahr stehst du wieder auf der Liste', c: 'bad' });
        } else {
          season.events.push({ t: 'Auch mit zwanzig nicht gezogen – '
            + 'ab jetzt bist du Free Agent', c: 'bad' });
        }
        st.entryDraft = { runde, pick: pick2, gesamt, klub: klub ? klub.n : null,
                          liga, ungezogen: !runde, alter: st.age,
                          endgueltig: !runde && st.age >= 20 };

        /* ------------------------------------------------------------
           Der Draft als Moment

           Er stand als eine Zeile unter zwanzig anderen im
           Saisonbericht und als kleiner Chip im Kopf - fuer den
           wichtigsten Tag im Leben eines Achtzehnjaehrigen zu wenig.
           Als Folge gemeldet bekommt er dieselbe Buehne wie jede
           andere Entscheidung mit Gewicht.
           ------------------------------------------------------------ */
        st.letzteFolge = {
          gelungen: !!runde,
          /* Eigene Buehne statt des gruenen "Gelungen"-Blattes: der
             Draft ist keine Entscheidung, die glueckt oder misslingt,
             sondern ein Abend, an dem ein Name faellt. */
          draft: { runde, pick: pick2, gesamt, klub: klub ? klub.n : null,
                   liga, gezogen: !!runde },
          tag: liga === 'KHL' ? 'KHL-Draft' : 'Entry Draft',
          wahl: runde
            ? 'Nr. ' + gesamt + ' – ' + klub.n
            : (st.age >= 20 ? 'Nicht gezogen' : 'Diesmal nicht gezogen'),
          text: runde
            ? (gesamt <= 10
                ? 'Dein Name faellt so frueh, dass die Halle noch nicht ruhig ist. '
                  + klub.n + ' holt dich an Position ' + gesamt + '.'
                : runde === 1
                ? 'Erste Runde. ' + klub.n + ' ruft deinen Namen als Nummer '
                  + gesamt + ' auf, und ab da ist der Abend ein anderer.'
                : 'Es dauert. Runde ' + runde + ', Position ' + pick2 + ', '
                  + 'insgesamt die Nummer ' + gesamt + ' – und dann steht '
                  + klub.n + ' da und meint dich.')
            : (st.age >= 20
                ? 'Die letzte Runde geht zu Ende, und dein Name faellt nicht. '
                  + 'Ab jetzt bist du frei – das ist kein Nichts, aber es ist '
                  + 'ein anderer Weg.'
                : 'Sieben Runden, und keine davon war deine. '
                  + 'Naechstes Jahr stehst du wieder auf der Liste.'),
          wirkungen: runde
            ? [{ t: 'Runde ' + runde + ', Pick ' + pick2, gut: true },
               { t: klub.n + ' hält deine Rechte bis ' + (st.year + 4), gut: true },
               { t: '+' + (gesamt <= 10 ? 12 : runde === 1 ? 9 : runde <= 3 ? 5 : 2)
                    + ' Ansehen', gut: true }]
            : [{ t: st.age >= 20 ? 'Free Agent' : 'Naechstes Jahr wieder', gut: false }]
        };
        if (klub){
          st.draftRechte = { klub: klub.n, liga, runde, bis: st.year + 4 };
        }

        /* Ein Spieler desselben Jahrgangs, an dem du dich messen wirst.
           Seine Laufbahn wird einmal vorausberechnet – dabei darf er selbst
           keinen weiteren Rivalen bekommen.

           Seit der Draft auch mit neunzehn und zwanzig stattfindet,
           laeuft dieser Block bis zu dreimal - der Jahrgang darf aber
           nur einmal entstehen, sonst bekommt man mit zwanzig einen
           neuen Rivalen und die ganze Vergleichsgeschichte faengt von
           vorne an. */
        if (!rivaleWirdErzeugt && !st.jahrgang.length){
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

          /* ------------------------------------------------------------
             Und was es mit einem macht

             Das Rennen wurde ausgewertet, angezeigt und danach fallen
             gelassen: ueberholt zu werden kostete nichts. Dabei ist
             der eine, der mit einem gezogen wurde, der naechstliegende
             Massstab, den ein Spieler hat - naeher als jede Tabelle.

             Seit die Moral wirklich auf die Ausbeute wirkt, laesst
             sich das verbinden, ohne eine neue Groesse zu erfinden:
             das Rennen bewegt die Moral, und die Moral bewegt das
             Spiel. Die Spitze des Jahrgangs steht ausserdem in den
             Zeitungen, nicht nur im eigenen Kopf.
             ------------------------------------------------------------ */
          const wieViele = Math.min(3, je.namen.length);
          moralAendern(je.art === 'vorbei' ? 2 + wieViele * 2 : -(2 + wieViele * 2));
          if (je.art === 'vorbei' && je.platz === 1){
            st.ruf = clamp(st.ruf + 3, 20, 99);
            season.events.push({ t: 'Bester deines Jahrgangs', c: 'good' });
          }
        }
      }

      /* Sommerpause: erst Training, danach die Vertragsfrage */
      /* Der Rueckblick kommt sofort - erst danach die Sommerpause. */
      st.bericht = { jahr: season.year, saison: season };

      st.age++; st.year++;
      /* ----------------------------------------------------------------
         Die Altersgrenze wird nur vermerkt, entschieden wird spaeter

         Hier stand ein harter Schnitt: ueberschreitet das Alter maxAge,
         ist Schluss - ohne ein Wort. maxAge kann bei 33 liegen, und
         gemessen wurde bei einer letzten Wertung von 88 oder mehr nur
         in 27 Prozent der Faelle ueberhaupt gefragt. Mit sechsunddreissig,
         Staerke 90 und einer starken Saison einfach aufzuhoeren, ohne
         gefragt zu werden, ist der ploetzlichste denkbare Abschied.

         Die Entscheidung faellt jetzt in vertragspruefung(), zusammen
         mit den anderen Ruecktrittsfragen. Sie hier zu stellen ging
         nicht: die Funktion kehrt danach zurueck, und Sommer, Training
         und Vertragspruefung waeren uebersprungen worden - der Vertrag
         lief dann nie ab, und gemessen spielten Leute bis 104.
         ---------------------------------------------------------------- */
      if (st.age > maxAge) st.altersgrenze = true;
      st.sommer = macheSommer();
      st.training = trainingsOptionen(player, st.age, player.seed + ':train:' + st.age,
                                      ((player.wirkung || {}).training || 0) + (st.sommerBonus || 0));
      st.sommerBonus = 0;
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
      /* Der Stand im eigenen Jahrgang schlaegt auf den Marktwert durch:
         Wer seine Klasse anfuehrt, wird anders gehandelt als das Schlusslicht. */
      const jgWert = (() => {
        const d = st.jahrgangDelta;
        if (!d || !d.von) return 0;
        const anteil = (d.von - d.platz) / (d.von - 1);   // 1 = Spitze, 0 = letzter
        return round1((anteil - 0.5) * 4);
      })();
      /* Ansehen oeffnet Tueren, ersetzt aber kein Koennen.

         Vorher ging es zur Haelfte in die Bewertung ein - und weil das
         Ansehen bis ueber hundert steigt, galt ein Spieler mit 78
         Gesamtwert als 89 und stand damit in der NHL. Gemessen
         erreichten so sechsundfuenfzig Prozent aller Laufbahnen die
         beste Liga der Welt, unabhaengig davon, was der Koerper
         hergab. Jetzt hebt ein grosser Name um hoechstens acht Punkte -
         genug fuer eine Tuer, zu wenig fuer eine erfundene Karriere. */
      const rufHilfe = clamp((st.ruf - naechsterOvr) * 0.35, -6, 8);
      const bewertung = naechsterOvr + rufHilfe + jgWert;
      if (st.age >= 25 && bewertung < VERTRAG_MIN){ ende('vertraglos'); return; }

      /* Hoert der Spieler freiwillig auf? */
      const verschleiss = st.verletzungsjahre || 0;
      /* Aufhoeren ist eine Frage des Kontostands, nicht nur des
         Koerpers. Wer dreissig Millionen liegen hat, kann mit
         dreiunddreissig gehen; wer nach zwoelf Jahren in der zweiten
         Liga bei zwei steht, spielt weiter, solange ihn jemand nimmt.
         Der Massstab ist bewusst das, was fuenf Jahre Leben kosten
         wuerden - keine absolute Zahl, sondern der Abstand dazu. */
      /* Der Nullpunkt liegt auf dem gemessenen Median. Er lag bei 8,
         als in der DEL noch drei Millionen gezahlt wurden; seit die
         Gehaelter stimmen, liegt der Median bei 3,6 - mit der alten
         Schwelle waere praktisch jeder Spieler ausserhalb der NHL
         dauerhaft "knapp bei Kasse" gewesen. */
      /* Die Schwellen stammten aus der Zeit, in der ein NHL-Spieler 14
         Millionen im Jahr verdiente. Nach der Gehaltsreform liegt das
         Vermoegen waehrend einer Laufbahn im Median bei 0,9 Millionen
         und im obersten Zehntel bei 7,1 - gegen eine Schwelle von 4
         gemessen war praktisch jeder mittellos, und die Zahl trennte
         nichts mehr. Neu geeicht auf die gemessene Verteilung. */
      const rueckhalt = clamp((st.leben.vermoegen - 1) / 8, -0.6, 1);
      const chance = clamp(
        ruecktrittsChance(st.age, naechsterOvr, player.traits.langlebig, verschleiss)
        * (1 + rueckhalt * 0.35), 0, 0.95);
      /* Wer noch zwei Jahre Vertrag hat, wird nicht gefragt, ob er
         aufhoert - er ist gebunden. Sonst stand die Ruecktrittsfrage
         auf dem Schirm und danach musste man einen neuen Vertrag
         unterschreiben, was sich gegenseitig ausschliesst. */
      /* ----------------------------------------------------------------
         Die Altersgrenze: fragen, solange jemand noch traegt

         Ein laufender Vertrag schuetzt wie ueberall - der Klub hat sich
         gebunden. Wer die Huerde seiner Liga noch klar nimmt, wird
         gefragt statt beendet; das Anhaengen kostet hier mehr als
         sonst, weil der Koerper ohnehin ueber seiner Zeit ist.
         ---------------------------------------------------------------- */
      /* Ohne Vertragsbedingung. Ein laufender Vertrag schuetzt vor der
         FREIWILLIGEN Frage - Familie, Heimkehr, Hoehepunkt -, denn wer
         unterschrieben hat, hoert nicht mittendrin auf. Die
         Altersgrenze ist etwas anderes: sie ist eine Frage des
         Koerpers, und die stellt sich unabhaengig davon, was auf dem
         Papier steht.

         Die Bedingung war ausserdem nicht zu erfuellen: gemessen wurde
         ein Spieler jedes Jahr von einem groesseren Klub herausgekauft
         und unterschrieb neu, sein Vertrag stand bei der Pruefung also
         immer auf zwei Jahren. Er spielte bis dreiundneunzig. */
      if (st.altersgrenze){
        const huerdeEnde = st.club && LG_MIN[st.club.lg] !== undefined
                         ? LG_MIN[st.club.lg] : 58;
        if (bewertung >= huerdeEnde + 2 && st.zusatzjahre < 4){
          st.ruecktrittsfrage = {
            alter: st.age, ovr: naechsterOvr, verschleiss,
            zusatzjahre: st.zusatzjahre, grund: 'ruhestand', altersgrenze: true,
            vermoegen: st.leben.vermoegen,
            abgesichert: st.leben.vermoegen >= 5,
            abbau: Math.round((5 + st.zusatzjahre * 2.2 + verschleiss * 0.8) * 10) / 10,
            risiko: Math.round((10 + st.zusatzjahre * 4 + verschleiss * 2))
          };
          return;
        }
        ende('ruhestand', 'mit ' + (st.age - 1));
        return;
      }

      if (st.vertragJahre <= 1 && r() < chance){
        /* Ab hier entscheidest du selbst – und wirst danach jedes Jahr neu gefragt. */
        st.ruecktrittsfrage = {
          alter: st.age,
          ovr: naechsterOvr,
          verschleiss,
          zusatzjahre: st.zusatzjahre,
          grund: verschleiss >= 3 && st.age < 33 ? 'verschleiss' : 'ruhestand',
          /* Damit die Frage ehrlich ist: sie soll sagen, ob man es
             sich leisten kann. */
          vermoegen: st.leben.vermoegen,
          abgesichert: st.leben.vermoegen >= 5,
          // Was ein weiteres Jahr kostet
          abbau: Math.round((3 + st.zusatzjahre * 1.6 + verschleiss * 0.8) * 10) / 10,
          risiko: Math.round((6 + st.zusatzjahre * 3 + verschleiss * 2))
        };
        return;
      }

      /* Weitere Wege, wie eine Laufbahn endet */
      const letzte = st.seasons[st.seasons.length - 1];
      /* ----------------------------------------------------------------
         Ein Karriereende aus dem Nichts

         Gemessen endeten 13,3 Prozent aller Laufbahnen verletzungs-
         bedingt, und bei 34 von 53 gab es in den beiden Saisons davor
         ueberhaupt keine Verletzung. Das las sich wie ein Urteil ohne
         Verhandlung: ein Wuerfel beendete die Laufbahn, und nichts im
         Spiel hatte darauf hingedeutet.

         Jetzt braucht es eine Vorgeschichte. Wer gerade schwer
         getroffen wurde oder einen Koerper mit Altlasten hat, ist
         gefaehrdet; wer zwei gesunde Jahre hinter sich hat, nicht.
         ---------------------------------------------------------------- */
      const letzteSaison = st.seasons[st.seasons.length - 1];
      const frischVerletzt = letzteSaison && letzteSaison.verletzung
                           && letzteSaison.verletzung.schwere >= 1;
      const schwerFrisch = letzteSaison && letzteSaison.verletzung
                         && letzteSaison.verletzung.spiele >= 20;
      const vorgeschichte = (st.verletzungsjahre || 0) >= 3;
      const verletzungsRisiko = (frischVerletzt || vorgeschichte)
        ? clamp(0.010 + (st.age - 28) * 0.006
                + (schwerFrisch ? 0.045 : 0)
                + (st.verletzungsjahre || 0) * 0.012
                - (player.traits.robust || 0) * 0.0012, 0, 0.16)
        : 0;
      if (st.age >= 26 && verletzungsRisiko && r() < verletzungsRisiko){
        ende('verletzung'); return;
      }
      /* ================================================================
         Kein Karriereende ohne Frage - und keines mitten im Vertrag

         Zwei Dinge stimmten hier nicht.

         Erstens beendeten drei Wege die Laufbahn ohne jede Rueckfrage:
         Familie, Heimkehr und der Ruecktritt auf dem Hoehepunkt. Man
         las eine Zeile und war Rentner. Zum Aufhoeren gehoert aber die
         Entscheidung dazu, sonst ist es kein Ruecktritt, sondern ein
         Wuerfel.

         Zweitens standen all diese Pruefungen vor der Frage, ob der
         Vertrag ueberhaupt auslaeuft. Ein Spieler mit drei Jahren
         Restlaufzeit wurde also gefragt, ob er aufhoeren will, und
         musste anschliessend einen neuen Vertrag unterschreiben. Wer
         gebunden ist, hoert nicht mitten in der Saison auf - er
         entscheidet das, wenn der Vertrag auslaeuft.

         Der Koerper ist die Ausnahme: eine schwere Verletzung fragt
         nicht nach der Restlaufzeit.
         ================================================================ */
      const vertragLaeuft = st.vertragJahre > 1;
      const L = st.leben;

      /* Wie gut ist er noch? Ein Spieler auf dem Hoehepunkt hoert
         nicht "aus familiaeren Gruenden" auf - dafuer ist der Zug, in
         dem er sitzt, zu stark. Der Abstand zur Ligagrenze ist das
         ehrlichste Mass dafuer. */
      const nochGefragt = clamp(
        (naechsterOvr - (LG_MIN[st.club.lg] || 60)) / 12, 0, 1.4);
      const zugkraft = 1 / (1 + nochGefragt * 1.6);

      if (!vertragLaeuft){
        const familienDruck = ((L.familie === 'kinder' ? 0.06 + L.kinder * 0.025 : 0)
                            + (L.familie === 'partner' ? 0.02 : 0)
                            + (L.partnerMit ? 0 : 0.05)) * zugkraft;
        const heimDruck = (!istHeimatLiga(st.club.lg, player.nation)
                        && bewertung < LG_MIN[st.club.lg] + 2)
                        ? L.heimweh * 0.0045 * zugkraft : 0;
        const hoehepunktDruck = (letzte && letzte.title && st.age >= 33)
                              ? 0.22 * zugkraft : 0;

        /* Der staerkste Grund gewinnt - und wird zur Frage, nicht zum
           Urteil. */
        const gruende = [
          { k: 'familie',    p: st.age >= 32 ? familienDruck : 0 },
          { k: 'heimkehr',   p: st.age >= 31 ? heimDruck : 0 },
          { k: 'hoehepunkt', p: hoehepunktDruck }
        ].filter(x => x.p > 0);
        for (const g of gruende){
          if (r() < g.p){
            st.ruecktrittsfrage = {
              alter: st.age, ovr: naechsterOvr, verschleiss,
              zusatzjahre: st.zusatzjahre,
              vermoegen: L.vermoegen, abgesichert: L.vermoegen >= 5,
              grund: g.k,
              abbau: Math.round((3 + st.zusatzjahre * 1.6 + verschleiss * 0.8) * 10) / 10,
              risiko: Math.round((6 + st.zusatzjahre * 3 + verschleiss * 2))
            };
            return;
          }
        }
      }

      /* Wann kommt der Spieler überhaupt auf den Markt? */
      st.vertragJahre--;
      const aktuelleLiga = league(st.club.lg);
      /* Ein Verein wirft seine Legende nicht raus, weil sie ein Jahr
         schwach war - er gibt ihr die Saison, die er einem Zugang
         nicht gibt. */
      const zuSchwach = bewertung < LG_MIN[st.club.lg] - 6 - klubBindung() * 5;
      const zuGross = D.LEAGUES.some(l =>
        !istJugend(l.k) && l.prestige >= aktuelleLiga.prestige + 30 && bewertung >= LG_MIN[l.k]);
      const juniorEnde = istJugend(st.club.lg) && st.age > 20;

      let grund = null;
      if (juniorEnde)         grund = 'Die Juniorenzeit ist vorbei.';
      else if (zuSchwach){
        /* Die Begruendung nannte keine Zahl und stand deshalb manchmal
           neben einer starken Saison - gemessen in sieben Prozent der
           Faelle, darunter Titelgewinner. Der Klub hat trotzdem recht:
           die Wertung liegt unter dem, was die Liga verlangt. Wenn er
           das sagt, soll er auch sagen, um wie viel. */
        const fehlt = Math.max(1, Math.round((LG_MIN[st.club.lg] || 60) - bewertung));
        grund = 'Der Klub löst den Vertrag auf – für die ' + aktuelleLiga.n
              + ' fehlen dir ' + fehlt + (fehlt === 1 ? ' Punkt.' : ' Punkte.');
      }
      else if (zuGross)       grund = 'Ein größerer Klub klopft an und kauft dich aus dem Vertrag.';
      else if (st.vertragJahre <= 0) grund = 'Dein Vertrag läuft aus.';
      /* macheAngebote braucht das: wer herausgekauft wird, bekommt kein
         Angebot mehr vom eigenen Verein. */
      st.kauftRaus = !!zuGross && !zuSchwach && !juniorEnde;

      if (!grund){
        season.events.push({ t: 'Vertrag läuft noch ' + st.vertragJahre +
          (st.vertragJahre === 1 ? ' Jahr' : ' Jahre'), c: '' });
        return;
      }
      st.angebotsGrund = grund;
      st.angebotsBelege = belegeFuerAngebot(bewertung, grund, zuSchwach, zuGross, juniorEnde);
      /* Womit die Angebote entstanden sind - der Berater braucht das,
         wenn er noch einmal herumtelefonieren soll. */
      st.angebotsBasis = { bewertung, eigenWert: naechsterOvr };
      st.beraterGenutzt = false;
      st.angebote = macheAngebote(bewertung, naechsterOvr);
    }

    /* ----------------------------------------------------------------
       Warum es so gekommen ist

       Ein Satz sagte, dass der Vertrag nicht verlaengert wird - aber
       nicht, woran es lag. Das ist die haeufigste Stelle, an der
       jemand das Spiel nicht versteht: die Wertung war zwei Punkte zu
       niedrig, das Saisonziel zweimal verfehlt, der Klub im Umbruch,
       und all das war nirgends zu sehen. Die Belege ziehen deshalb
       genau die Zahlen heraus, an denen die Entscheidung haengt.
       ---------------------------------------------------------------- */
    function belegeFuerAngebot(bewertung, grund, zuSchwach, zuGross, juniorEnde){
      const b = [];
      /* ------------------------------------------------------------------
         Die Wertung steht oben - hier nur die Huerde

         Der Beleg nannte "Wertung 74 - DEL verlangt 72", der Kopf der
         Seite aber die Wertung der gespielten Saison. Zwei verschiedene
         Zahlen, beide "Wertung" genannt, uebereinander auf demselben
         Schirm. Der Beleg traegt jetzt das, was der Kopf nicht hat: was
         die Liga fordert und wie weit man davon entfernt ist - und er
         rechnet dafuer mit derselben Zahl, die oben steht.
         ------------------------------------------------------------------ */
      const letzteSaison = st.seasons[st.seasons.length - 1];
      const wert = Math.round(letzteSaison ? letzteSaison.ovr : bewertung);
      const noetig = LG_MIN[st.club.lg];

      if (juniorEnde){
        b.push({ ik:'kalender', t:'Mit ' + st.age + ' ist die Juniorenzeit vorbei',
                 gut:null });
        return b;
      }

      /* Eine Jugendliga fordert nichts - "verlangt 0 (60 darueber)"
         waere zwar richtig gerechnet und trotzdem Unsinn. Dort zaehlt
         nicht die Schwelle, sondern was der naechste Schritt fordert. */
      if (noetig) {
        const ab = wert - noetig;
        b.push({ ik:'waage',
                 t: 'Die ' + league(st.club.lg).n + ' verlangt ' + noetig
                    + (ab >= 0 ? ' – du liegst ' + ab + ' darüber'
                               : ' – dir fehlen ' + Math.abs(ab)),
                 gut: ab >= 0 });
      } else {
        /* Die naechsterreichbare Profiliga als Massstab. */
        const naechste = D.LEAGUES
          .filter(l => !l.jugend && LG_MIN[l.k] !== undefined)
          .sort((x, y) => LG_MIN[x.k] - LG_MIN[y.k])
          .find(l => LG_MIN[l.k] > wert);
        b.push({ ik:'waage',
                 t: naechste
                    ? 'Für die ' + naechste.n + ' fehlen dir '
                      + (LG_MIN[naechste.k] - wert)
                    : 'Reif für den Profibereich',
                 gut: !naechste });
      }

      /* Die letzten beiden Saisons: erfuellt oder verfehlt? */
      const letzten = st.seasons.slice(-2).filter(x => x.ziele);
      const verfehlt = letzten.filter(x =>
        x.ziele.person && x.ziele.person.erfuellt === false).length;
      if (letzten.length){
        b.push({ ik:'ziel',
                 t: verfehlt === 0 ? 'Deine Vorgabe zuletzt erfüllt'
                  : verfehlt === letzten.length && letzten.length > 1
                    ? 'Vorgabe zweimal in Folge verfehlt'
                    : 'Vorgabe zuletzt verfehlt',
                 gut: verfehlt === 0 });
      }

      /* Der Klub selbst - ein Abbau trifft auch gute Spieler. */
      const trend = klubTrend(st.club);
      if (trend && trend.k !== 'stabil'){
        b.push({ ik: trend.k === 'auf' ? 'hoch' : 'runter',
                 t: trend.k === 'auf' ? st.club.n + ' baut auf'
                                      : st.club.n + ' steht im Umbruch',
                 gut: trend.k === 'auf' });
      }

      if (st.rollenStand === 'bewaehrung'){
        b.push({ ik:'schild', t:'Beim Trainer nur noch auf Bewährung', gut:false });
      }
      if (st.trainerNeu){
        b.push({ ik:'pfeife', t:'Der Trainer hat gewechselt', gut:false });
      }
      if (st.sperre){
        b.push({ ik:'schild', t:'Die Wechselsperre läuft mit dem Vertrag aus', gut:null });
      }
      if (zuGross){
        b.push({ ik:'krone', t:'Ein größerer Klub kauft dich heraus', gut:true });
      }
      if (!zuSchwach && !zuGross && st.vertragJahre <= 0){
        b.push({ ik:'stift', t:'Der Vertrag lief nach ' + (st.klubJahre + 1)
                 + (st.klubJahre + 1 === 1 ? ' Jahr' : ' Jahren') + ' aus', gut:null });
      }
      return b;
    }

    /* Angebote erzeugen, ohne die uebrigen Pruefungen zu wiederholen */
    function vertragsangebote(bewertung, season){
      const eigenWert = overall(player, devAttrs(player.attrs,
        formFactor(st.age, player.traits, (player.wirkung || {}).lernkurve, st.scheitel)));
      st.vertragJahre = 0;
      st.angebotsGrund = 'Nach der Rücktrittsentscheidung wird neu verhandelt.';
      st.angebotsBelege = belegeFuerAngebot(bewertung, st.angebotsGrund, false, false, false);
      st.angebotsBasis = { bewertung, eigenWert };
      st.beraterGenutzt = false;
      st.angebote = macheAngebote(bewertung, eigenWert);
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
    /* eigenWert ist die reine Gesamtwertung des Spielers, bewertung
       die Marktbewertung (mit Ansehen und Jahrgangsstand). Beide
       werden gebraucht: die eine entscheidet, die andere wird
       angezeigt - und sie zu verwechseln war genau der Fehler. */
    function macheAngebote(bewertung, eigenWert){
      const aktuell = st.club;
      let moeglicheLigen = D.LEAGUES.filter(l => {
                /* Nur die eigene Juniorenliga - ein Deutscher bekommt kein
           Angebot aus der kanadischen CHL. */
        if (istJugend(l.k)) return l.k === heimJugend && st.age <= 20;
        /* Wer lange fort war, greift auch nach unten - Heimweh macht
           eine Liga erreichbar, die die Wertung sonst ausschliesst. */
        const bonus = l.k === homeLg
          ? 4 + ((player.wirkung || {}).heimbonus || 0) * 0.4 + st.leben.heimweh * 0.05 : 0;
        /* ------------------------------------------------------------
           Ein Klub kaempft um seinen Kapitaen

           Gemessen bekamen 35 Prozent aller Kapitaene keine
           Verlaengerung - immer mit derselben Begruendung, die Liga sei
           zu hoch geworden. Ein Verein wirft aber nicht den Mann
           raus, dem er das C gegeben hat, weil er zwei Punkte unter
           der Norm liegt. Der eigene Verein raeumt deshalb Spielraum
           ein, gestaffelt nach dem, was man ihm bedeutet.
           ------------------------------------------------------------ */
        const traegt = l.k === aktuell.lg
          ? (st.kapitaenSeit === aktuell.n ? 6
             : st.rollenStand === 'saeule' ? 4 : 0) + klubBindung() * 4
          : 0;
        return bewertung >= LG_MIN[l.k] - bonus - traegt;
      });
      if (!moeglicheLigen.length) moeglicheLigen = [league(st.age <= 20 ? heimJugend : 'AHL')];

      const angebote = [];
      const nimm = (club, bleibt) => {
        /* Ohne diese Zeile landet ein leerer Klub im Angebot und faellt
           erst drei Aufrufe spaeter als Fehler auf. */
        if (!club) return;
        if (angebote.some(a => a.club.n === club.n)) return;
        const lg = league(club.lg);
        const schnitt = ligaSchnittJetzt(club.lg);
        const staerke = klubStaerke(club);
        const rolle = staerke >= schnitt + 6 ? 'Titelkandidat'
                    : staerke >= schnitt ? 'Playoff-Team'
                    : staerke >= schnitt - 6 ? 'Mittelfeld' : 'Aufbauteam';
        // Laufzeit: junge und starke Spieler bekommen längere Vertraege
        let jahre;
        if (st.age >= 34)      jahre = 1;
        else if (st.age >= 31) jahre = ri(r, 1, 2);
        else if (st.age <= 21) jahre = ri(r, 2, 3);
        else                   jahre = ri(r, 2, 4);
        /* Einer Legende bietet der Verein laenger an - auch spaet. */
        if (bleibt && klubBindung() >= 0.6) jahre = Math.min(5, jahre + 1);
        angebote.push({
          club, lgKey: club.lg, lgName: lg.n, bleibt: !!bleibt, rolle,
          /* Das Land gehoert dazu: "Extraliga" sagt einem Deutschen
             nichts, "Tschechien" schon. */
          land: lg.land, daheim: istHeimatLiga(club.lg, player.nation),
          /* "Teamstaerke 88" sagte nichts: die Zahl hat nur Bedeutung
             im Verhaeltnis zum Schnitt der Liga, und der ist je Liga
             ein anderer. Deshalb der Abstand dazu - wie im Auftakt
             auch - und die eigene Wertung daneben, damit man sieht,
             worauf man sich einlaesst. */
          staerke: Math.round(staerke),
          staerkeRel: Math.round(staerke - schnitt),
          ligaSchnitt: Math.round(schnitt),
          /* Was die Liga verlangt und was du mitbringst */
          /* Hier stand die Marktbewertung - also die eigene Wertung
             plus Ansehensbonus und Jahrgangswert. Sie lag damit
             regelmaessig ueber dem, was waehrend der Saison als
             Gesamtwertung angezeigt wird, und das las sich wie ein
             Fehler. Es sind zwei verschiedene Zahlen, also stehen sie
             jetzt auch als zwei da. */
          /* Genau die Zahl, die im Kopf der Seite steht - die Wertung
             der zuletzt gespielten Saison. Hier stand die Vorausschau
             auf die kommende Saison, und die weicht davon ab; nebenein-
             ander gelesen sah das aus wie ein Fehler. */
          eigeneWertung: Math.round(
            (st.seasons[st.seasons.length - 1] || {}).ovr
            || (eigenWert != null ? eigenWert : bewertung)),
          marktwertung: Math.round(bewertung),
          /* Der Aufschlag ergibt sich aus der Differenz - Ansehen und
             Jahrgangsstand einzeln stehen hier nicht zur Verfuegung
             und werden auch nicht getrennt gebraucht. */
          marktAufschlag: eigenWert != null
            ? Math.round((bewertung - eigenWert) * 10) / 10 : 0,
          ligaMin: LG_MIN[club.lg],
          passung: LG_MIN[club.lg] === undefined ? null
                 : Math.round(bewertung - LG_MIN[club.lg]),
          trend: klubTrend(club), jahre,
          gehalt: round1(gehaltBasis(bewertung, lg)
                         * (bleibt ? 1.05 + klubBindung() * 0.16 : 1) + 0.05),
          bindung: bleibt ? klubBindung() : 0,
          klubRang: bleibt && st.klubKonto[club.n] ? st.klubKonto[club.n].rang : null,
          prestige: lg.prestige
        });
      };

      /* Der Verein, der die Rechte haelt, meldet sich - sobald es
         halbwegs passt und solange die Frist laeuft. Er nimmt eine
         Wertung in Kauf, die sonst nicht reichen wuerde: bei einem
         Erstrundenpick acht Punkte, bei einem Spaeten drei. */
      const dr = st.draftRechte;
      if (dr && st.year <= dr.bis && aktuell.n !== dr.klub){
        const geduld = dr.runde === 1 ? 8 : dr.runde <= 3 ? 5 : 3;
        if (bewertung >= LG_MIN[dr.liga] - geduld){
          const rechteKlub = clubsOf(dr.liga).find(c => c.n === dr.klub);
          if (rechteKlub){
            nimm(rechteKlub, false);
            const letzterEintrag = angebote[angebote.length - 1];
            if (letzterEintrag){
              letzterEintrag.draftRecht = true;
              letzterEintrag.rolle = 'Holt dich als Draftpick';
            }
            if (!st.draftRuf){
              st.draftRuf = true;
              /* macheAngebote laeuft ausserhalb der Saisonschleife und
                 kennt kein season - die Engine hat fuer genau diesen
                 Fall eine nachgereichte Notiz. */
              notizMerken({ t: dr.klub + ' meldet sich – sie halten deine Rechte '
                + 'seit dem Draft', c: 'good' });
            }
          }
        }
      }

      // 1. Verbleib, sofern die aktuelle Liga noch reicht
      /* Wer beim Verein etwas bedeutet, bekommt praktisch immer ein
         Angebot zu bleiben - und ein besseres. */
      /* ----------------------------------------------------------------
         Warum ein Verein nicht verlaengert

         Hier stand ein flacher Wuerfel: in fuenfzehn Prozent der Faelle
         kein Angebot, ganz gleich wie die Saison lief. Ein Kapitaen mit
         guten Zahlen flog damit genauso oft raus wie ein
         Ergaenzungsspieler in der Krise - und erfuhr nie, warum.

         Jetzt hat jede Absage einen Grund, und jeder Grund haengt an
         etwas, das in der Saison passiert ist. Wer traegt, wird
         gehalten: ohne einen dieser Gruende gibt es immer ein Angebot.
         ---------------------------------------------------------------- */
      const bindung = klubBindung();
      const huerdeHier = LG_MIN[aktuell.lg] !== undefined ? LG_MIN[aktuell.lg] : 58;
      const ueberHuerde = bewertung - huerdeHier;
      const istKapitaen = st.kapitaenSeit === aktuell.n;
      const traegtDenKlub = istKapitaen || st.rollenStand === 'saeule';

      const absageGruende = [];
      if (!traegtDenKlub){
        /* Leistung: wer unter der Huerde seiner Liga spielt, wird
           ersetzt. Bindung schuetzt, aber nicht unbegrenzt. */
        if (ueberHuerde < 1)
          absageGruende.push({ w: 0.42 - bindung * 0.14,
            t: 'Der Klub sieht dich nicht mehr in seiner Aufstellung.' });
        /* Eine Bewaehrungssaison ist genau dafuer da. */
        if (st.rollenStand === 'bewaehrung')
          absageGruende.push({ w: 0.26,
            t: 'Nach der Bewährungssaison verlängert der Klub nicht.' });
        /* Alter - erst spaet und dann steigend. */
        if (st.age >= 34)
          absageGruende.push({ w: 0.08 + (st.age - 34) * 0.07,
            t: 'Der Klub setzt auf jüngere Spieler.' });
        /* Geld: wer sich teuer verhandelt hat, wird teuer. */
        if ((st.gehaltFaktor || 1) > 1.18)
          absageGruende.push({ w: clamp(((st.gehaltFaktor || 1) - 1.18) * 0.9, 0, 0.30),
            t: 'Dein Gehalt sprengt den Etat des Klubs.' });
        /* Der Rest: Kaderplanung. Bewusst klein - er ist der einzige
           Grund, den man nicht selbst beeinflusst hat. */
        absageGruende.push({ w: 0.05,
          t: 'Die Kaderplanung geht in eine andere Richtung.' });
      }

      let absage = null;
      for (const g of absageGruende){
        if (g.w > 0 && r() < g.w){ absage = g.t; break; }
      }
      /* Die Liga selbst kann der Grund sein: wer unter ihre Huerde
         gefallen ist, bekommt dort kein Angebot mehr - auch nicht als
         Kapitaen. Gemessen war das der haeufigste Fall (39 Prozent
         aller Absagen), und ausgerechnet er stand ohne ein Wort da. */
      const ligaZuHoch = !moeglicheLigen.some(l => l.k === aktuell.lg);
      /* "Ein groesserer Klub kauft dich aus dem Vertrag" und daneben
         steht "Verbleib bei deinem Klub" - das widerspricht sich. Wer
         herausgekauft wird, ist beim alten Verein weg. Gemessen war
         der eigene Klub in 96 Prozent dieser Faelle trotzdem dabei. */
      const bleibtMoeglich = !ligaZuHoch && !absage && !st.kauftRaus;
      if (bleibtMoeglich) nimm(aktuell, true);
      else {
        /* ----------------------------------------------------------------
           Nur eine echte Absage ist eine Absage

           Wird man herausgekauft, ist weder die Liga zu hoch noch ein
           Grund gesetzt - und im Kasten stand "null". Das Herauskaufen
           ist auch gar keine Absage des eigenen Vereins: er haette
           gern verlaengert, jemand anders war schneller. Das steht
           schon oben als Grund fuer die Angebote.
           ---------------------------------------------------------------- */
        /* Eine Juniorenliga fordert keine Wertung - dort ist man mit
           einundzwanzig schlicht zu alt. "Fuer die DNL reicht deine
           Wertung nicht mehr" stand trotzdem da, und die DNL verlangt
           null. */
        const grund = ligaZuHoch
          ? (istJugend(aktuell.lg)
              ? ('Mit ' + st.age + ' ist die Zeit in der ' + league(aktuell.lg).n
                 + ' vorbei.')
              : (st.kapitaenSeit === aktuell.n
                  ? ('Auch das C hält dich nicht mehr: für die '
                     + league(aktuell.lg).n + ' reicht deine Wertung nicht.')
                  : ('Für die ' + league(aktuell.lg).n + ' reicht deine Wertung nicht mehr – '
                     + 'der Klub kann dich nicht halten.')))
          : absage;
        st.keineVerlaengerung = grund ? { klub: aktuell.n, grund } : null;
      }

      // 2. Zwei bis drei Angebote aus den erreichbaren Ligen
      /* Wer nichts zurueckgelegt hat, schaut zuerst auf das Gehalt -
         eine Liga, die besser zahlt, rueckt nach vorn. Wer abgesichert
         ist, kann sich den Verein nach anderen Massstaeben aussuchen. */
      const knapp = clamp((3 - st.leben.vermoegen) / 3, 0, 1) * (st.age >= 29 ? 1 : 0.4);
      const gewichtet = moeglicheLigen.map(l => {
        /* ------------------------------------------------------------
           Wer einer Liga entwachsen ist, hoert von dort nichts mehr

           Ein Spieler mit Wertung 90 bekam Angebote aus der DEL, deren
           Huerde bei 72 liegt - gemessen war die haeufigste Mischung
           fuer einen 88er "DEL + DEL + NHL". Ein Verein, der einen
           solchen Mann weder bezahlen noch ueberzeugen kann, meldet
           sich nicht. Heimweh hebt das teilweise auf: nach Hause geht
           man auch unter Wert.
           ------------------------------------------------------------ */
        const huerde = LG_MIN[l.k] !== undefined ? LG_MIN[l.k] : 58;
        const entwachsen = clamp(bewertung - huerde - 6, 0, 24)
                         * (l.k === homeLg ? 0.7 : 2.2);
        /* Der Heimatbonus war zu 24 Punkten fest und stieg erst dann
           mit dem Heimweh. Damit zog die Heimatliga auch den an, der
           gar kein Heimweh hat - und ein Ausnahmespieler bekam Angebote
           aus seiner zweitklassigen Heimatliga statt aus der NHL. Jetzt
           traegt das Heimweh den Bonus fast allein: bei null bleibt ein
           kleiner Rest, bei hohem Heimweh wiegt er schwerer als zuvor. */
        return { l, s: l.prestige + (l.k === homeLg ? 6 + st.leben.heimweh * 0.45 : 0)
              + (l.k === aktuell.lg ? 10 + st.leben.wurzeln * 0.12 : 0)
              + knapp * l.salary * 26 + r() * 30 - entwachsen };
      }).sort((a, b) => b.s - a.s);

      /* ----------------------------------------------------------------
         Mehrere Vereine aus derselben Liga

         Vorher zog die Schleife genau einen Verein je Liga und brach
         dann ab. Zwei Folgen, beide gemeldet: ein Ausnahmespieler bekam
         nie drei NHL-Angebote, sondern eins aus der NHL und zwei von
         weiter unten. Und wer mit einundzwanzig aus der Jugend kam und
         nur eine Liga erreichte, bekam nur ein einziges Angebot -
         gemessen in 39 Prozent der Faelle.

         Jetzt bieten die Ligen reihum, die ueberhaupt im Rennen sind -
         also die, deren Gewicht nahe am besten liegt. Fuer einen
         Ausnahmespieler ist das oft nur die NHL, und dann kommen drei
         NHL-Angebote. Fuer alle anderen sind mehrere Ligen beieinander,
         und die Auswahl bleibt bunt. Heimweh holt die Heimatliga ins
         Rennen zurueck - nach Hause geht man auch unter Wert.

         Die Liste einfach dreimal hintereinanderzuhaengen reicht nicht:
         dann fuellt der erste Durchlauf schon alle drei Plaetze mit
         drei verschiedenen Ligen, und die zweite NHL kommt nie.
         ---------------------------------------------------------------- */
      const bestesGewicht = gewichtet.length ? gewichtet[0].s : 0;
      const imRennen = gewichtet.filter(g => bestesGewicht - g.s <= 22);
      const runde = [];
      for (let durchgang = 0; durchgang < 3; durchgang++)
        imRennen.forEach(g => runde.push(g));
      gewichtet.filter(g => bestesGewicht - g.s > 22).forEach(g => runde.push(g));
      for (const g of runde){
        if (angebote.length >= 3) break;
        const pool = clubsOf(g.l.k).filter(c =>
          c.n !== aktuell.n && !angebote.some(a => a.club.n === c.n));
        if (!pool.length) continue;
        /* ------------------------------------------------------------
           Wer bietet ueberhaupt?

           Frueher: nach fester Klubstaerke sortieren und aus dem
           obersten Fuenftel ziehen. Damit kamen fuer einen Spieler
           immer dieselben zwei, drei Vereine in Frage - die Liste war
           statisch, weil sie an c.str hing und nicht am Zyklus, in dem
           ein Verein gerade steckt.

           Jetzt zaehlt die Naehe: ein Verein interessiert sich fuer
           jemanden, der zu ihm passt. Ein Aufbauteam holt keinen
           Weltklassemann, ein Titelkandidat keinen Ergaenzungsspieler.
           Weil klubStaerke() den Zyklus kennt, aendert sich das Feld
           von Jahr zu Jahr von selbst.
           ------------------------------------------------------------ */
        const schnittLg = ligaSchnittJetzt(g.l.k);
        /* Wo in dieser Liga wuerde der Spieler stehen? */
        /* Bewusst etwas ueber dem eigenen Niveau: ein Verein, der
           jemanden holt, will besser werden, und ein Spieler nimmt
           das beste Angebot. Ohne diesen Versatz landete jeder exakt
           bei seinesgleichen - gemessen fielen die Titelquote von 8,5
           auf 4,7 und die Playoffquote von 59,6 auf 38,2 Prozent,
           weil niemand mehr bei einer starken Mannschaft unterkam. */
        const passend = schnittLg + 5
                      + clamp((bewertung - LG_MIN[g.l.k] - 6) * 0.55, -8, 12);
        const bewertetePool = pool.map(c => ({
          c,
          /* Naehe zaehlt, aber nicht allein - sonst waere es wieder
             deterministisch. Der Zufallsanteil ist bewusst gross. */
          s: -Math.abs(klubStaerke(c) - passend) + r() * 11
             - ((st.zuletztAngeboten || []).indexOf(c.n) >= 0 ? 7 : 0)
        })).sort((a2, b2) => b2.s - a2.s);
        const band = bewertetePool.slice(0, Math.max(3, Math.ceil(pool.length * 0.4)));
        nimm(pick(r, band).c, false);
      }
      /* ------------------------------------------------------------------
         Wer nach Hause will, bekommt die Tuer gezeigt

         Gemessen war es genau umgekehrt: bei hohem Heimweh lag in 14
         Prozent der Angebotsrunden ein Verein von daheim dabei, bei
         geringem in 58. Mechanisch ist das erklaerbar - wer lange fort
         ist, ist meist auch ueber dem Niveau seiner Heimatliga -, aber
         es ist die frustrierendste Form von Heimweh: eine Anzeige, die
         Jahr fuer Jahr steigt, und keine Tuer.

         Ab 55 steht deshalb immer eine Rueckkehr im Angebot, notfalls
         unter Wert und beim schwaechsten der drei Plaetze. Ob man sie
         nimmt, bleibt die eigene Entscheidung - und sie kostet
         wirklich etwas, wenn die Heimatliga zwei Klassen tiefer liegt.
         ------------------------------------------------------------------ */
      if (st.leben.heimweh >= 55
          && !angebote.some(a => istHeimatLiga(a.club.lg, player.nation))){
        const heimLigen = D.LEAGUES
          .filter(l => !l.jugend && istHeimatLiga(l.k, player.nation)
                       && clubsOf(l.k).length)
          .sort((a, b) => (LG_MIN[b.k] || 0) - (LG_MIN[a.k] || 0));
        /* Die beste Heimatliga, die zum Spieler passt - sonst die
           beste ueberhaupt, denn heimfahren geht auch unter Wert. */
        const ziel = heimLigen.find(l => bewertung >= (LG_MIN[l.k] || 0)) || heimLigen[0];
        if (ziel){
          const pool = clubsOf(ziel.k).filter(c => c.n !== aktuell.n);
          if (pool.length){
            const schnittHeim = ligaSchnittJetzt(ziel.k);
            const passend = schnittHeim + 4;
            const beste = pool.map(c => ({ c,
              s: -Math.abs(klubStaerke(c) - passend) + r() * 9 }))
              .sort((a, b) => b.s - a.s)[0].c;
            /* Platz machen: das schwaechste fremde Angebot weicht. */
            if (angebote.length >= 3){
              let raus = -1, tiefstes = Infinity;
              angebote.forEach((a, i) => {
                if (a.bleibt) return;
                const p2 = league(a.club.lg).prestige;
                if (p2 < tiefstes){ tiefstes = p2; raus = i; }
              });
              if (raus >= 0) angebote.splice(raus, 1);
            }
            nimm(beste, false);
          }
        }
      }
      if (!angebote.length) nimm(aktuell, true);
      /* Die Namen fuer die naechsten beiden Runden vormerken. Sechs
         Plaetze reichen dafuer bei hoechstens drei Angeboten. */
      st.zuletztAngeboten = angebote.map(a => a.club.n)
        .concat(st.zuletztAngeboten || []).slice(0, 6);
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

      /* Fuer Torhueter zaehlt vor allem einer: der andere Mann im Tor.
         Seine Staerke haengt am Klub - ein Spitzenteam haelt sich keinen
         schwachen Ersatz. */
      if (isG && st.club){
        let g = pick(rr, D.FIRST) + ' ' + pick(rr, D.LAST);
        let v2 = 0;
        while ((g === player.name || g === m) && v2++ < 5)
          g = pick(rr, D.FIRST) + ' ' + pick(rr, D.LAST);
        const schnitt = lgAvgStr(st.club.lg);
        /* Der Rivale wird nicht unabhaengig gewuerfelt, sondern relativ zu
           dir: sonst ueberragt ein guter Torhueter jeden zufaelligen
           Ersatzmann und der Zweikampf faende nie statt. 'abstand' ist dein
           Vorsprung - bei starken Klubs faellt er kleiner aus, weil sie sich
           keinen schwachen zweiten Mann halten. */
        st.torwartrivale = {
          name: g,
          abstand: round1(clamp((rr() - 0.46) * 1.5
                                - (st.club.str - schnitt) * 0.035, -0.85, 0.85)),
          alter: ri(rr, 21, 34)
        };
      } else if (!isG) {
        st.torwartrivale = null;
      }
    }

    /* ------------------------------------------------------------------
       Der Berater telefoniert noch einmal herum

       Einmal je Angebotsrunde, und nur bei gutem Draht. Die neuen
       Angebote entstehen aus derselben Grundlage - es ist kein besseres
       Blatt, sondern ein zweites. Dass der eigene Verein wieder dabei
       ist, haengt wie beim ersten Mal an den Gruenden, die er hat.

       Der Draht leidet ein wenig: wer seinen Berater herumschickt,
       verbraucht etwas von dem, was ihn traegt.
       ------------------------------------------------------------------ */
    function beraterKannNachfragen(){
      return !!st.angebote && !st.beraterGenutzt && !!st.angebotsBasis
          && st.beraterDraht >= 55;
    }

    function beraterNachfragen(){
      if (!beraterKannNachfragen()) return false;
      st.beraterGenutzt = true;
      st.beraterDraht = clamp(st.beraterDraht - 8, 0, 100);
      const b = st.angebotsBasis;
      const vorher = (st.angebote || []).map(a => a.club.n);
      st.keineVerlaengerung = null;
      st.angebote = macheAngebote(b.bewertung, b.eigenWert);
      /* Damit die Runde sich wirklich anders anfuehlt, treten die
         eben gezeigten Vereine zurueck - dieselbe Regel wie zwischen
         zwei Saisons. */
      st.zuletztAngeboten = vorher.concat(st.zuletztAngeboten || []).slice(0, 6);
      return true;
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
        /* Ein Umzug kostet, und er kostet umso mehr, je mehr man
           zurueckgelassen hat. Ohne das war ein Wechsel eine reine
           Tabellenfrage. */
        if (st.club && st.club.n !== a.club.n){
          const L = st.leben;
          const preis = Math.round(L.wurzeln * 0.09
            + (L.familie === 'kinder' ? 7 : L.familie === 'partner' ? 3 : 0));
          if (preis) moralAendern(-(preis));
          L.wurzeln = Math.round(clamp(L.wurzeln * 0.35 + 8, 0, 100));
          /* ------------------------------------------------------------
             Kinder in der Schule ziehen nicht jedes Mal mit

             Die alte Bedingung verlangte einen Ligawechsel und dann
             noch einen Wurf unter 30 Prozent. Gemessen trat der Fall
             nie ein: das Ereignis "Zwei Wohnungen, zwei Laender"
             erschien in 0,0 Prozent aller Laufbahnen, obwohl es
             geschrieben und gewichtet dasteht.

             Der Ligawechsel war ausserdem das falsche Mass - von der
             DEL in die DEL2 zieht eine Familie mit, in eine andere
             Zeitzone nicht. Jetzt entscheidet, ob es ins Ausland geht.
             ------------------------------------------------------------ */
          const insAusland = !istHeimatLiga(a.club.lg, player.nation);
          if (L.familie === 'kinder' && insAusland && r() < 0.45){
            L.partnerMit = false;
          } else if (a.club.lg === homeLg){
            L.partnerMit = true;
          }
        }
        st.club = a.club;          // fuer die Namensvergabe schon setzen
        umfeldBenennen();
        st.trainerJahre = 0;
        st.trainerVorher = null;
      }
      st.entscheidungen.push(a.club.n);
      st.vertragJahre = a.jahre;
      /* Jeder gemeinsam ausgehandelte Vertrag baut den Draht auf - die
         Beziehung waechst durch Arbeit, nicht durch Zufall. Ohne das
         waere der Berater eine Groesse, die praktisch nie ihre Schwelle
         erreicht: sie startet bei 30, gebraucht werden 55, und das
         einzige Ereignis dazu verlangt Alter 25 und ein Vertragsende. */
      st.beraterDraht = clamp(st.beraterDraht + 6, 0, 100);
      // Die Rolle wird bei einem Wechsel neu verhandelt – bei einer Verlaengerung
      // bleibt sie bestehen, sofern schon eine festgelegt wurde.
      if (!a.bleibt || !st.rolle){
        st.rollenwahl = baueRollenwahl(a.club, a.gehalt);
      }
      st.klausel = false;              // neuer Vertrag, neue Bedingungen
      st.sperre = false;
      st.bonus = null;
      st.gehaltFaktor = 1;
      st.verhandlung = macheVerhandlung(a);
      st.angebote = null;
      st.angebotsGrund = null;
      st.angebotsBelege = null;
      st.keineVerlaengerung = null;
      st.kauftRaus = false;
      return true;
    }

    /* ================================================================
       Bonusklauseln: auf sich selbst wetten

       Bisher war jede Verhandlung eine Frage nach Sicherheit: mehr
       Geld, mehr Jahre, ein Ausweg. Was fehlte, war die Gegenrichtung -
       auf die eigene Leistung setzen statt auf die Zusage des Klubs.
       Genau das ist die Klausel: der Klub zahlt nichts im Voraus,
       sondern erst, wenn eine Zahl steht.

       Die Zahl kommt aus der eigenen Vorsaison, nicht aus der Liga.
       Sie liegt bewusst ueber dem, was das Saisonziel fordert - ein
       Ziel soll erreichbar sein, eine Wette nicht.
       ================================================================ */
    function macheKlausel(a){
      const letzte = st.seasons[st.seasons.length - 1];
      const skala = k => Math.pow((league(k) || {}).level || 20, 0.45);
      const ligaFaktor = letzte
        ? clamp(skala(letzte.lg) / skala(a.club.lg), 0.5, 1.6) : 1;
      /* Ueber dem Saisonziel (dort 1.03), aber nicht ausserhalb der
         Reichweite. Junge Spieler wachsen schneller in ihre Zahl. */
      const hebel = (st.age < 23 ? 1.34 : st.age > 33 ? 1.16 : 1.26) * ligaFaktor;
      const stark = klubStaerke(a.club) - ligaSchnittJetzt(a.club.lg) > 8.6;
      const zerbrechlich = (st.verletzungsjahre || 0) >= 2;

      /* Welche Klausel passt, haengt daran, wer der Spieler ist und
         wohin er geht - nicht am Zufall allein. */
      if (stark && r() < 0.42){
        return { art:'titel', wert: 1, n:'Titelprämie', bed:'Nur mit dem Titel',
                 kurz:'Titel', d:'Der Meistertitel mit ' + a.club.n + '.',
                 lohn:{ geld: 0.55, ruf: 6, moral: 10 } };
      }
      if (zerbrechlich && r() < 0.5){
        const ziel = clamp(Math.round((letzte && letzte.vollGp ? letzte.vollGp : 60) * 0.86), 30, 74);
        return { art:'spiele', wert: ziel, n: ziel + ' Einsätze',
                 bed:'Erst ab ' + ziel + ' Einsätzen',
                 kurz: ziel + ' Sp.', d:'Der Klub will wissen, ob du durchhältst.',
                 lohn:{ geld: 0.34, jahre: 1, moral: 8 } };
      }
      if (isG){
        const ziel = clamp(Math.round(((letzte && letzte.wins) || 12) * hebel), 8, 50);
        return { art:'siege', wert: ziel, n: ziel + ' Siege', kurz: ziel + ' S.',
                 bed:'Erst ab ' + ziel + ' Siegen',
                 d:'Gezählt wird, was hinten stehen bleibt.',
                 lohn:{ geld: 0.48, ruf: 5, moral: 8 } };
      }
      if (player.pos !== 'D' && (!letzte || (letzte.g || 0) >= 12)){
        const ziel = clamp(Math.round(((letzte && letzte.g) || 14) * hebel), 10, 62);
        return { art:'tore', wert: ziel, n: ziel + ' Tore', kurz: ziel + ' T.',
                 bed:'Erst ab ' + ziel + ' Toren',
                 d:'Abschlüsse, keine Ausreden.',
                 lohn:{ geld: 0.48, ruf: 5, moral: 8 } };
      }
      const ziel = clamp(Math.round(((letzte && letzte.p) || 24) * hebel), 14, 118);
      return { art:'punkte', wert: ziel, n: ziel + ' Scorerpunkte', kurz: ziel + ' P.',
               bed:'Erst ab ' + ziel + ' Scorerpunkten',
               d:'Alles zählt, was du auflegst oder selbst machst.',
               lohn:{ geld: 0.48, ruf: 5, moral: 8 } };
    }

    /* Der Lebensstrang als Wirkung einer Entscheidung. Die Namen sind
       dieselben wie im Zustand, damit ein Ereignis schreiben kann
       { leben: { heimweh: -25, wurzeln: 12 } } - und es steht in der
       Folge, damit die Wahl sichtbar etwas bewegt hat. */
    const LEBEN_NAMEN = { heimweh: 'Heimweh', wurzeln: 'Verwurzelung',
                          vermoegen: 'Vermögen' };
    function wirkeLeben(w, merke){
      if (!w) return;
      const L = st.leben;
      Object.entries(w).forEach(([k, v]) => {
        if (k === 'partnerMit'){
          L.partnerMit = !!v;
          merke(v ? 'Die Familie zieht mit' : 'Die Familie bleibt zurück', !!v);
          return;
        }
        if (k === 'familie'){ L.familie = v; return; }
        if (L[k] === undefined) return;
        const grenze = k === 'vermoegen' ? 400 : 100;
        L[k] = k === 'vermoegen' ? round1(clamp(L[k] + v, 0, grenze))
                                 : Math.round(clamp(L[k] + v, 0, grenze));
        const n = LEBEN_NAMEN[k] || k;
        /* Weniger Heimweh ist etwas Gutes - deshalb haengt die Farbe
           nicht am Vorzeichen, sondern an der Bedeutung. */
        const gut = k === 'heimweh' ? v < 0 : v > 0;
        merke((v > 0 ? '+' : '') + v + ' ' + n, gut);
      });
    }

    /* ----------------------------------------------------------------
       Was eine Saison mit dem Leben daneben macht
       ---------------------------------------------------------------- */
    function werteLeben(season){
      const L = st.leben;
      const daheim = st.club && istHeimatLiga(st.club.lg, player.nation);

      /* Heimweh. Daheim faellt es schnell, in der Fremde steigt es
         langsam - und deutlich schneller, wenn niemand mitgekommen
         ist. Wurzeln bremsen: wer sich eingelebt hat, vermisst
         weniger. */
      if (daheim){
        L.heimatjahre++;
        L.heimweh = Math.round(clamp(L.heimweh - 11, 0, 100));
      } else if (!hatHeimatLiga(player.nation)){
        /* Kein Ort, an dem das Heimweh je fallen koennte - dann steigt
           es auch nicht. Siehe hatHeimatLiga. */
      } else {
        L.fremdjahre++;
        const allein = L.familie !== 'allein' && !L.partnerMit;
        L.heimweh = Math.round(clamp(L.heimweh
          + 8 + (allein ? 8 : 0) + (L.kinder > 0 && !L.partnerMit ? 5 : 0)
          - L.wurzeln * 0.05, 0, 100));
      }

      /* Wurzeln wachsen mit jedem Jahr am selben Ort. */
      /* Asymptotisch, sonst steht bei jedem zehnten Spieler am Ende
         schlicht 100 und die Zahl sagt nichts mehr aus. */
      L.wurzeln = Math.round(clamp(
        L.wurzeln + (100 - L.wurzeln) * (st.klubJahre >= 1 ? 0.16 : 0.07), 0, 100));

      /* Die Familie waechst mit den Jahren - aber nicht aus dem
         Nichts: der erste Schritt braucht Zeit, der zweite Ruhe. */
      if (L.familie === 'allein' && st.age >= 22 && r() < 0.16){
        L.familie = 'partner';
        L.partnerMit = true;
        season.events.push({ t: 'Du bist nicht mehr allein', c: 'good' });
        moralAendern(6);
      } else if (L.familie === 'partner' && st.age >= 25
                 && L.wurzeln >= 45 && r() < 0.22){
        L.familie = 'kinder'; L.kinder = 1;
        season.events.push({ t: 'Du bist Vater geworden', c: 'good' });
        moralAendern(8);
      } else if (L.familie === 'kinder' && L.kinder < 3
                 && st.age >= 28 && r() < 0.16){
        L.kinder++;
        season.events.push({ t: 'Nachwuchs, zum ' + L.kinder + '. Mal', c: 'good' });
      }

      /* Vermoegen: was vom Gehalt uebrig bleibt. Wer eine Familie
         hat, legt mehr zurueck - das ist der Sinn der Sache. */
      L.vermoegen = round1(L.vermoegen
        + (season.salary || 0) * (L.familie === 'allein' ? 0.42 : 0.55));

      /* Und die Rueckwirkung auf die Moral: ein Zuhause traegt,
         Heimweh zehrt. Beides klein genug, um nicht alles andere zu
         ueberdecken. */
      const zug = Math.round(L.wurzeln * 0.04 - L.heimweh * 0.07);
      if (zug) moralAendern(zug);
      season.leben = { heimweh: Math.round(L.heimweh), wurzeln: Math.round(L.wurzeln),
                       familie: L.familie, kinder: L.kinder, vermoegen: L.vermoegen };
    }

    /* Am Saisonende wird abgerechnet. Eine verfehlte Klausel kostet
       nichts - der Preis wurde am Verhandlungstisch bezahlt, als die
       sichere Erhoehung ausgeschlagen wurde. */
    function werteKlausel(season){
      const b = st.bonus;
      if (!b) return;
      const ist = b.art === 'titel'  ? (season.title ? 1 : 0)
                : b.art === 'siege'  ? (season.wins || 0)
                : b.art === 'tore'   ? (season.g || 0)
                : b.art === 'spiele' ? (season.gp || 0)
                : (season.p || 0);
      b.ist = ist;
      if (ist >= b.wert){
        b.erfuellt = true;
        st.bonusBilanz.erfuellt++;
        if (b.lohn.geld)  st.gehaltFaktor = round1((st.gehaltFaktor || 1) + b.lohn.geld);
        if (b.lohn.ruf)   st.ruf = clamp(st.ruf + b.lohn.ruf, 20, 99);
        if (b.lohn.moral) moralAendern(b.lohn.moral);
        if (b.lohn.jahre) st.vertragJahre += b.lohn.jahre;
        season.events.push({ t: 'Bonusklausel erfüllt: ' + b.n
          + (b.lohn.jahre ? ' – der Vertrag verlängert sich' : ' – das Gehalt steigt'), c: 'good' });
        st.verlauf.push({ jahr: st.year, alter: st.age, art: 'klausel',
          tag: 'Klausel', titel: 'Bonusklausel erfüllt', wahl: b.n,
          gelungen: true, chance: null, wagnis: false });
        st.bonus = null;                 // eingeloest, sie gilt nur einmal
      } else {
        b.jahre--;
        if (b.jahre <= 0){
          st.bonusBilanz.verfehlt++;
          season.events.push({ t: 'Bonusklausel verfallen: ' + b.n
            + ' (' + ist + ')', c: 'bad' });
          st.verlauf.push({ jahr: st.year, alter: st.age, art: 'klausel',
            tag: 'Klausel', titel: 'Bonusklausel verfallen', wahl: b.n,
            gelungen: false, chance: null, wagnis: false });
          st.bonus = null;
        }
      }
    }

    /* ---------------------------------------------------------------
       Am Tisch sitzt nicht nur der Klub. Eine Forderung ist drin -
       welche, entscheidet, womit du die naechsten Jahre lebst.
       --------------------------------------------------------------- */
    function macheVerhandlung(a){
      const stark = st.ruf >= 88;
      const lang = a.jahre >= 3;
      const kl = macheKlausel(a);
      /* Ein Klub, der deutlich staerker ist als du, dreht die Frage um:
         er will dich nicht ziehen lassen, statt dir einen Ausweg zu
         geben. Dafuer zahlt er. */
      const halten = klubStaerke(a.club) - ligaSchnittJetzt(a.club.lg) > 8.6 && st.ruf >= 78;
      const dritte = halten
        ? { t: 'Wechselsperre akzeptieren', ikone: 'schild',
            chance: 88,
            hinweis: 'Kein Wechsel bis Vertragsende – dafür ein Drittel mehr',
            wirkung: 'sperre',
            gut: { text: 'Sie zahlen den Aufschlag, aber sie schreiben hinein, dass du bleibst. '
                       + 'Was auch kommt: du bleibst.' },
            schlecht: { text: 'Der Klub zieht das Angebot zurück und bleibt beim ersten.' } }
        : { t: 'Eine Ausstiegsklausel verlangen', ikone: 'flug',
            chance: Math.round(clamp(34 + (st.ruf - 80) * 1.4, 15, 74)),
            hinweis: 'Macht einen Wechsel an der Frist deutlich leichter',
            wirkung: 'klausel',
            gut: { text: 'Die Klausel steht. Solltest du gehen wollen, hält dich niemand.' },
            schlecht: { moral: -3,
              text: 'Davon will der Klub nichts wissen. Du bist gebunden wie jeder andere.' } };
      return {
        art: 'verhandlung', ikone: 'stift', tag: 'Vertragsgespräch',
        titel: 'Der Vertrag bei ' + a.club.n + ' liegt auf dem Tisch',
        text: a.jahre + (a.jahre === 1 ? ' Jahr' : ' Jahre') + ', '
            + a.gehalt.toFixed(1) + ' Mio pro Saison. '
            + 'Dein Berater sagt, eine Forderung sei drin – aber nur eine. '
            + (stark ? 'Deine Position ist stark.' : 'Viel Spielraum hast du nicht.'),
        klausel: kl,
        stand: { klub: a.club.n, jahre: a.jahre, gehalt: a.gehalt },
        optionen: [
          { t: 'Mehr Geld verlangen', ikone: 'stern',
            chance: Math.round(clamp(46 + (st.ruf - 80) * 1.1, 25, 82)),
            hinweis: 'Rund ein Fünftel mehr pro Saison',
            wirkung: 'geld',
            gut: { text: 'Sie gehen mit. Am Ende steht eine Zahl, die sich sehen lassen kann.' },
            schlecht: { moral: -4,
              text: 'Man bleibt beim ersten Angebot. Unterschrieben hast du trotzdem.' } },

          { t: lang ? 'Kürzer binden' : 'Länger binden', ikone: 'uhr',
            chance: Math.round(clamp(58 + (st.ruf - 80) * 0.6, 32, 84)),
            hinweis: lang ? 'Ein Jahr weniger – früher wieder frei'
                          : 'Ein Jahr mehr – Sicherheit statt Beweglichkeit',
            wirkung: lang ? 'kuerzer' : 'laenger',
            gut: { moral: 5, text: 'Die Laufzeit wird angepasst. Beide Seiten können damit leben.' },
            schlecht: { text: 'Die Laufzeit bleibt, wie sie war.' } },

          dritte,

          { t: 'Auf dich selbst wetten', ikone: 'ziel',
            chance: 90,
            /* Der Prozentsatz allein laese sich wie das bessere
               Geldangebot - er haengt aber an der Bedingung, und das
               muss vor der Wahl dastehen, nicht danach. */
            hinweis: kl.bed + ': +' + Math.round(kl.lohn.geld * 100) + '% Gehalt'
                   + (kl.lohn.jahre ? ' und ein Jahr mehr' : '') + ', sonst nichts',
            wirkung: 'bonus', klausel: kl,
            gut: { text: 'Kein Aufschlag, keine Sicherheit – eine Zahl. '
                       + 'Erreichst du sie, zahlen sie. Erreichst du sie nicht, war es dein Angebot.' },
            schlecht: { text: 'Sie wollen keine Klauseln im Vertrag. Es bleibt beim Grundangebot.' } },

          { t: 'Unterschreiben wie angeboten', ikone: 'haken', chance: 100,
            hinweis: 'Ohne Gefeilsche – das kommt an',
            wirkung: 'nichts',
            gut: { moral: 7, ruf: 3,
              text: 'Kein Wort über Zahlen. In der Führungsetage spricht man noch Jahre darüber.' },
            schlecht: { text: '' } }
        ]
      };
    }

    function entscheideVerhandlung(index){
      const v = st.verhandlung;
      if (!v) return null;
      const o = v.optionen[clamp(index, 0, v.optionen.length - 1)];
      const wurf = r() * 100;
      const gelungen = wurf < o.chance;
      const e = gelungen ? o.gut : o.schlecht;

      const folge = { gelungen, wurf: Math.round(wurf), text: e.text || '', chance: o.chance,
                      wahl: o.t, titel: v.titel, tag: v.tag, wirkungen: [] };
      const merke = (t, gut) => folge.wirkungen.push({ t, gut });

      if (gelungen){
        if (o.wirkung === 'geld'){
          st.gehaltFaktor = 1.2;
          merke('+20% Gehalt für die Vertragsdauer', true);
        }
        if (o.wirkung === 'laenger'){ st.vertragJahre++; merke('+1 Vertragsjahr', true); }
        if (o.wirkung === 'kuerzer' && st.vertragJahre > 1){
          st.vertragJahre--; merke('-1 Vertragsjahr', true);
        }
        if (o.wirkung === 'klausel'){ st.klausel = true; merke('Ausstiegsklausel', true); }
        if (o.wirkung === 'sperre'){
          st.sperre = true;
          st.gehaltFaktor = 1.35;
          merke('+35% Gehalt', true);
          merke('Wechselsperre bis Vertragsende', false);
        }
        if (o.wirkung === 'bonus'){
          /* Sie gilt fuer die Vertragslaufzeit, aber hoechstens drei
             Jahre - danach ist die Zahl nicht mehr dieselbe Wette. */
          st.bonus = Object.assign({}, o.klausel,
            { jahre: clamp(st.vertragJahre, 1, 3), erfuellt: false, ist: 0 });
          merke('Bonusklausel: ' + o.klausel.n, true);
        }
      }
      if (e.moral){ moralAendern(e.moral);
                    merke((e.moral > 0 ? '+' : '') + e.moral + ' Moral', e.moral > 0); }
      if (e.ruf){   st.ruf = clamp(st.ruf + e.ruf, 20, 99);
                    merke('+' + e.ruf + ' Ansehen', true); }
      if (!folge.wirkungen.length) merke('Der Vertrag bleibt, wie er war', gelungen);

      st.verlauf.push({
        jahr: st.year, alter: st.age, art: 'verhandlung',
        tag: v.tag, titel: v.titel, wahl: o.t, gelungen, chance: o.chance, wagnis: false
      });
      st.letzteFolge = folge;
      st.verhandlung = null;
      return folge;
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
      /* Der Stand im eigenen Jahrgang schlaegt auf den Marktwert durch:
         Wer seine Klasse anfuehrt, wird anders gehandelt als das Schlusslicht. */
      const jgWert = (() => {
        const d = st.jahrgangDelta;
        if (!d || !d.von) return 0;
        const anteil = (d.von - d.platz) / (d.von - 1);   // 1 = Spitze, 0 = letzter
        return round1((anteil - 0.5) * 4);
      })();
      const bewertung = Math.max(naechsterOvr,
                                 st.ruf * 0.5 + naechsterOvr * 0.5) + jgWert;
      if (bewertung < VERTRAG_MIN){ ende('vertraglos'); return true; }
      vertragsangebote(bewertung, letzte);
      return true;
    }

    /* ----------------------------------------------------------------
       Wie weit es reichen kann

       Die Grenze bleibt eine verborgene Zahl - sonst waere jede
       Laufbahn ab dem ersten Tag ausgerechnet. Was der Spieler
       bekommt, ist das, was ein Sichter auch bekaeme: eine Spanne, die
       mit den Jahren enger wird. Mit achtzehn ist sie breit genug, um
       zu hoffen; mit fuenfundzwanzig steht sie fest.
       ---------------------------------------------------------------- */
    const STUFEN = [
      { ab: 92, n:'Ein Spieler für die Geschichtsbücher' },
      { ab: 86, n:'Erste Reihe in der besten Liga der Welt' },
      { ab: 80, n:'Stammkraft ganz oben' },
      { ab: 74, n:'Fester Platz in einer starken Liga' },
      { ab: 68, n:'Solider Profi in Europa' },
      { ab:  0, n:'Zweite Reihe, zweite Liga' }
    ];
    const stufeFuer = w => (STUFEN.find(x => w >= x.ab) || STUFEN[STUFEN.length - 1]);

    function einschaetzung(){
      const grenze = player.potenzial || 80;
      /* Das Rauschen faellt mit dem Alter - und schneller, wenn schon
         viele Saisons als Beleg vorliegen. */
      const jahre = st.age - 18;
      const rausch = clamp(10 - jahre * 1.3 - st.seasons.length * 0.35, 0, 10);
      const unten = stufeFuer(grenze - rausch);
      const oben  = stufeFuer(grenze + rausch);
      return {
        sicher: unten.n === oben.n,
        von: unten.n, bis: oben.n,
        text: unten.n === oben.n ? unten.n : unten.n + ' bis ' + oben.n.charAt(0).toLowerCase() + oben.n.slice(1),
        /* Wie weit die Anlage schon ausgeschoepft ist - das ist keine
           Schaetzung, sondern messbar, und es ist die Zahl, an der die
           eigenen Entscheidungen haengen. */
        ausgeschoepft: Math.round(clamp(
          overall(player, player.attrs) / (grenze / 1.31), 0, 1) * 100)
      };
    }

    /* ---- Rolle im Team festlegen ----

       Der Klub sagt nicht mehr zu allem ja. Jede Rolle traegt, was sie
       verlangt, und was du davon bekommst: zugesagt, auf Bewaehrung
       oder gar nicht. Wer zu hoch greift, landet dort, wo der Trainer
       ihn ohnehin gesehen haette - und weiss das vorher.
       ---- */
    function baueRollenwahl(club, grundgehalt){
      const dev = devAttrs(player.attrs,
        formFactor(st.age, player.traits, (player.wirkung || {}).lernkurve, st.scheitel));
      const rang = klubRang(club, overall(player, dev));
      return (isG ? D.ROLLEN_G : D.ROLLEN).map(x => {
        const luecke = x.anspruch - rang;
        /* ------------------------------------------------------------
           Die Passung entscheidet mit

           Sie wurde berechnet, angezeigt - und dann ignoriert: ueber die
           Zusage entschied allein der Rang beim Klub. Gemessen lag die
           Passung bei den ABGELEHNTEN Rollen im Mittel hoeher (0,11)
           als bei den zugesagten (-0,22). Ausgerechnet die Rolle, fuer
           die einer gebaut ist, bekam er am ehesten nicht, und das
           Spiel sagte ihm dazu "zu hoch gegriffen".

           Wer passt, bekommt jetzt einen Rang gutgeschrieben; wer gar
           nicht passt, einen abgezogen. Die Schwellen liegen bei +/-0,6
           - die Passung spannt gemessen von -1 bis +1, das oberste und
           unterste Fuenftel bekommt also den Ausschlag.
           ------------------------------------------------------------ */
        const pass = rollenPassung(x, dev);
        const passStufe = pass >= 0.6 ? 1 : pass <= -0.6 ? -1 : 0;
        const effektiv = luecke - passStufe;
        return Object.assign({}, x, {
          gehalt: Math.round(grundgehalt * (x.w.gehalt || 1) * 100) / 100,
          rang,
          passung: Math.round(pass * 100) / 100,
          /* Damit die Oberflaeche sagen kann, warum es diesmal doch
             geht - oder warum nicht. */
          passungHilft: passStufe,
          zusage: effektiv <= 0 ? 'sicher' : effektiv === 1 ? 'bewaehrung' : 'abgelehnt'
        });
      });
    }

    function waehleRolle(index){
      if (!st.rollenwahl) return false;
      const gewuenscht = st.rollenwahl[clamp(index, 0, st.rollenwahl.length - 1)];
      const letzte = st.seasons[st.seasons.length - 1];

      /* Zu hoch gegriffen: der Klub gibt dir die groesste Rolle, die er
         dir zutraut - und du merkst dir, dass du gefragt hast. */
      let gewaehlt = gewuenscht, abgelehnt = false;
      if (gewuenscht.zusage === 'abgelehnt'){
        abgelehnt = true;
        const moeglich = st.rollenwahl.filter(x => x.zusage !== 'abgelehnt');
        gewaehlt = moeglich.sort((a, b) => (b.passung - a.passung))[0] || st.rollenwahl[0];
        moralAendern(-(6));
        if (letzte) letzte.events.push({
          t: 'Als ' + gewuenscht.n.replace(/^Als /, '') + ' abgelehnt – es wird '
             + gewaehlt.n.replace(/^Als /, ''), c: 'bad' });
      }

      st.rolle = gewaehlt;
      st.rollenStand = gewaehlt.zusage === 'bewaehrung' || abgelehnt ? 'bewaehrung' : 'gesetzt';
      st.rollenPunkte = st.rollenStand === 'bewaehrung' ? -1 : 1;
      st.rollenJahre = 0;
      /* Der Ausgangswert fuer die Aufbaurolle, die als einzige den
         Fortschritt selbst misst. */
      st.rollenVorOvr = overall(player, devAttrs(player.attrs,
        formFactor(st.age, player.traits, (player.wirkung || {}).lernkurve, st.scheitel)));
      st.rollenLauf.push({ jahr: st.year, rolle: gewaehlt.k, stand: st.rollenStand,
                           grund: abgelehnt ? 'abgelehnt' : 'vereinbart',
                           /* Was du wolltest - sonst laese sich der Eintrag
                              spaeter so, als waere die Rolle abgelehnt
                              worden, die du bekommen hast. */
                           wunsch: abgelehnt ? gewuenscht.k : null });

      if (!abgelehnt && letzte) letzte.events.push({
        t: 'Rolle im Team: ' + gewaehlt.n
           + (st.rollenStand === 'bewaehrung' ? ' – auf Bewährung' : ''), c: '' });
      if (gewaehlt.w && gewaehlt.w.moral) moralAendern(gewaehlt.w.moral);
      if (gewaehlt.w && gewaehlt.w.playoff)
        player.traits.playoff = (player.traits.playoff || 0) + gewaehlt.w.playoff;
      st.rollenwahl = null;
      return true;
    }
    function autoRolle(){
      if (!st.rollenwahl) return false;
      const bewertet = st.rollenwahl.map((x, i) => ({ i,
        s: (x.w.punkte || 0) * 60 + (x.w.plus || 0) * 0.6 + (x.w.anteil || 0) * 90
           - (x.w.risiko || 0) * 120
           + (x.passung || 0) * 26
           + (x.zusage === 'abgelehnt' ? -80 : x.zusage === 'bewaehrung' ? -12 : 0)
           + r() * 8 })).sort((a, b) => b.s - a.s);
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
        moralAendern(8);
        st.ruf = clamp(st.ruf + 4, 20, 99);
        player.traits.playoff = (player.traits.playoff || 0) + 4;
        if (letzte){
          /* ------------------------------------------------------------
             Das C gilt ab der naechsten Saison

             Hier stand "letzte.kapitaen = true" - die gerade beendete
             Saison bekam also rueckwirkend das C, obwohl man es darin
             nicht getragen hat. Gemessen wichen dadurch 118 von 8027
             Saisonkarten vom Zustand ab, und wer danach den Verein
             wechselte, sah eine Saison mit C, in der er keiner war.
             Die Nachricht gehoert trotzdem hierher - sie ist das
             Ergebnis dieser Saison.
             ------------------------------------------------------------ */
          letzte.events.push({ t: 'Kapitän von ' + k.klub + ' – ab der nächsten Saison',
            c: 'good' });
          letzte.story = pick(r, D.STORY.kapitaen);
        }
      } else if (letzte){
        letzte.events.push({ t: 'Kapitänsamt abgelehnt', c: '' });
        moralAendern(-(3));
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
        if (st.bericht) schliesseBericht();
        if (st.jugend) waehleJugend(0);
        if (st.ereignis) chooseEreignis(0);
        if (st.wechselfrist) entscheideWechselfrist(0);
        if (st.nominierung) entscheideNominierung(0);
        if (st.verhandlung) entscheideVerhandlung(3);
        if (st.sommer) entscheideSommer(1);
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
      /* Was du dem Verein bedeutet hast - waehrend der Laufbahn
         gefuehrt, hier nur angehaengt. */
      klubs.forEach(k => {
        const konto = (st.klubKonto || {})[k.n];
        k.rang = konto ? konto.rang : 'zugang';
        k.rangName = konto ? (KLUBRANG.find(x => x.k === konto.rang) || {}).n : 'Zugang';
        k.klubPunkte = konto ? konto.punkte : 0;
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
      /* ----------------------------------------------------------------
         Was ein Verein dir wert ist

         Die Legendenwertung kannte bisher nur Titel, Zahlen und die
         Hoehe der eigenen Wertung - also das, was in einer Tabelle
         steht. Was fehlte, war die andere Art von Groesse: dass
         irgendwo ein Trikot unter dem Hallendach haengt. Zwoelf Jahre
         bei einem Verein ohne Titel sind eine Laufbahn, die zaehlt.
         ---------------------------------------------------------------- */
      const bindungsPunkte = klubs.reduce((a, k) =>
        a + (k.rang === 'legende' ? 90 : k.rang === 'gesicht' ? 35
           : k.rang === 'stammkraft' ? 8 : 0), 0);
      const legacy = Math.round(trophyPts + prodPts + Math.max(0, st.peak - 60) * 3.2
                                + profi.length * 2 + bindungsPunkte);

      /* Was von dieser Laufbahn bleibt */
      const vermaechtnis = [];
      const nimm = id => {
        const v = D.VERMAECHTNIS.find(x => x.id === id);
        if (v && !vermaechtnis.some(x => x.id === id)) vermaechtnis.push(v);
      };
      const hauptklub = klubs.slice().sort((a, b) => b.saisons - a.saisons)[0];
      if (legacy >= 1700) nimm('statue');
      if (legacy >= 1300) nimm('hof');
      /* Frueher eine Faustregel: sieben Saisons beim Hauptverein und
         entweder ein Titel oder 1050 Legendenpunkte. Seit die Bindung
         an jeden Verein waehrend der Laufbahn gefuehrt wird, gibt es
         dafuer eine gemessene Groesse - und sie haengt am Verein, wo
         die Nummer haengen wuerde, nicht an der Gesamtwertung. */
      const legendenKlubs = klubs.filter(k => k.rang === 'legende');
      if (legendenKlubs.length) nimm('nummer');
      if (st.kapitaenSeit && legacy >= 870) nimm('kapitaen');
      if (legacy >= 870 && st.peak >= 84) nimm('legende');
      if (seasons.length >= 14 && legacy >= 700) nimm('trainer');
      if (hauptklub && hauptklub.saisons >= 9) nimm('nachwuchs');
      // Juniorenjahre zaehlen nicht als beste Saison – zu schwache Gegner
      const bewertbar = seasons.filter(s => !istJugend(s.lg));
      const besteSaison = (bewertbar.length ? bewertbar : seasons).slice().sort((a, b) =>
        (isG ? (b.wins || 0) - (a.wins || 0) : (b.p || 0) - (a.p || 0)))[0] || null;

      return {
        player, seasons, totals, isG,
        trophies: trophyList,
        peak: st.peak, peakAttrs: st.peakAttrs || player.attrs,
        besteSaison, rekorde, klubs, ligen, vermaechtnis,
        /* Die Vereine, bei denen es zu etwas gereicht hat - fuer die
           Ehrung in der Abschlussbilanz. */
        klubEhrungen: klubs.filter(k => k.rang === 'legende' || k.rang === 'gesicht')
          .sort((a, b) => b.klubPunkte - a.klubPunkte),
        rivale: st.rivale,
        jahrgang: st.jahrgang,
        jahrgangStand: st.jahrgangStand,
        jahrgangDelta: st.jahrgangDelta,
        ziele: st.ziele,
        ehemalige: st.ehemalige,
        natKapitaen: st.natKapitaen,
        natAbsagen: st.natAbsagen,
        klausel: st.klausel,
        sperre: st.sperre,
        bonus: st.bonus,
        bonusBilanz: st.bonusBilanz,
        leben: st.leben,
        grundstimmung: st.grundstimmung,
        klubKonto: st.klubKonto,
        altlasten: st.altlasten,
        verschleiss: st.verletzungsjahre || 0,
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
        draftRechte: st.draftRechte,
        rolle: st.rolle,
        potenzial: player.potenzial,
        ausgeschoepft: einschaetzung().ausgeschoepft,
        rollenStand: st.rollenStand,
        rollenLauf: st.rollenLauf,
        trainer: st.trainer,
        mitspieler: st.mitspieler,
        torwartrivale: st.torwartrivale,
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
      get beraterDraht(){ return st.beraterDraht; },
      get beraterFrei(){ return beraterKannNachfragen(); },
      beraterNachfragen,
      get training(){ return st.training; },
      get ereignis(){ return st.ereignis; },
      get wechselfrist(){ return st.wechselfrist; },
      get nominierung(){ return st.nominierung; },
      get verhandlung(){ return st.verhandlung; },
      get sommer(){ return st.sommer; },
      /* Die Vorgaben fuer die naechste Saison – sichtbar, bevor gespielt wird */
      get kommendeZiele(){
        if (st.fertig || !st.club) return null;
        return setzeSaisonZiel(st.club);
      },
      get jugend(){ return st.jugend; },
      get rollenwahl(){ return st.rollenwahl; },
      /* Die Vorschau ist keine Entscheidung, sondern die Ruheansicht -
         sie wird bei Bedarf gerechnet und haelt den Ablauf nicht an. */
      get vorschau(){ return macheAuftakt(); },
      get einschaetzung(){ return einschaetzung(); },
      get bericht(){ return st.bericht; },
      get kapitaensfrage(){ return st.kapitaensfrage; },
      get ruecktrittsfrage(){ return st.ruecktrittsfrage; },
      get letzteSaison(){ return st.seasons[st.seasons.length - 1] || null; },
      maxAge,
      playSeason, choose, autoChoose, chooseTraining, autoTraining,
      entscheideWechselfrist, entscheideNominierung, entscheideVerhandlung,
      entscheideSommer,
      waehleJugend, chooseEreignis, waehleRolle, autoRolle, entscheideKapitaen,
      schliesseBericht,
      entscheideRuecktritt, autoWeiter,
      runToEnd, result
    };
  }

  /* Komplettdurchlauf ohne Eingriff – fuer Schnellkarriere, Markt und Tests */
  function simulate(player){
    return createCareer(player).runToEnd();
  }

  /* ---------------- Einordnung ----------------

     Die Schwellen stammen aus den gemessenen Perzentilen von
     siebenhundert Laufbahnen, die ohne Plan gespielt wurden: ein
     Viertel bleibt Journeyman, einer von zwanzig kommt in die
     Ruhmeshalle, einer von hundert darueber hinaus. Wer mit Verstand
     spielt, liegt darueber - das ist der Sinn der Sache.

     Vorher lagen sie hoeher, geeicht auf eine Zeit, in der jeder
     Spieler auf denselben Gesamtwert zulief. Mit der individuellen
     Grenze waeren zweiundvierzig Prozent aller Laufbahnen als
     Journeyman geendet. */
  function legacyRank(v){
    /* Zuletzt gemessen, nachdem Torhueter bekommen, was ihnen zusteht:
       vorher prallten 35 Wirkungen an ihnen ab (siehe attrHeben), und
       ihr Gipfelwert lag entsprechend tiefer. Davor schon einmal, seit
       die Laufbahn mit sechzehn beginnt: zwei
       Saisons mehr bedeuten mehr Produktion und mehr Vereinsjahre, und
       gegen die alten Schwellen gemessen wurde jede achte Laufbahn
       "Unsterblich" statt jeder zwanzigsten. Die Raenge sollen ihre
       Seltenheit behalten, nicht ihre Zahl - die Schwellen sind
       deshalb die gemessenen Perzentile von siebenhundert Laufbahnen:
       ein Viertel bleibt Journeyman, einer von zwanzig kommt in die
       Ruhmeshalle, einer von hundert darueber hinaus. */
    if (v >= 2675) return { n:'Unsterblich', c:'gold', d:'Ein Name, den man in hundert Jahren noch kennt.' };
    if (v >= 1975) return { n:'Hall of Fame', c:'gold', d:'Trikot unter dem Hallendach, Platz in der Ruhmeshalle.' };
    if (v >= 1450) return { n:'Franchise-Ikone', c:'', d:'Ein Klub hat eine Ära nach dir benannt.' };
    if (v >= 1115) return { n:'Topstar', c:'', d:'Jahrelang erste Reihe, erste Wahl, erste Schlagzeile.' };
    if (v >= 785) return { n:'Leistungsträger', c:'', d:'Solide Karriere in starken Ligen.' };
    if (v >= 490) return { n:'Profi', c:'', d:'Ein ehrliches Eishockeyleben.' };
    return { n:'Journeyman', c:'', d:'Viele Busfahrten, wenig Rampenlicht.' };
  }
  /* Dieselben Zahlen wie in legacyRank - zwei Kopien sind zwei
     Gelegenheiten auseinanderzulaufen, aber die Liste wird an anderer
     Stelle in dieser Reihenfolge gebraucht. */
  const RANG_SCHWELLEN = [
    ['Unsterblich', 2675], ['Hall of Fame', 1975], ['Franchise-Ikone', 1450],
    ['Topstar', 1115], ['Leistungsträger', 785], ['Profi', 490]
  ];

  /* ---------------- Herausforderungen ---------------- */
  const HKEY = 'eiszeit.herausforderungen';
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
      if (typeof KONTO !== 'undefined' && KONTO.zustand().frei)
        KONTO.zieleSpeichern(neue);
    }
    return neue;
  }
  function clearHerausforderungen(){ try { localStorage.removeItem(HKEY); } catch(e){} }

  /* ---------------- Speicher ---------------- */
  const KEY = 'eiszeit.karrieren';
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
        seed: result.player.seed,
        modus: result.player.mode || null,

        /* Was die Laufbahn ausgemacht hat. Bewusst knapp - im
           Browserspeicher liegen bis zu sechzig Karrieren. */
        jgPlatz: (() => {
          const e = (result.jahrgangStand || []).find(x => x.eigen);
          return e ? e.platz : null;
        })(),
        jgVon: (result.jahrgangStand || []).length || null,
        straenge: (result.freigeschaltet || []).slice(),
        natKapitaen: !!result.natKapitaen,
        /* Die Rolle am Ende der Laufbahn - und wie oft der Trainer
           unterwegs umgestellt hat. */
        rolle: result.rolle ? result.rolle.n : null,
        rollenStand: result.rollenStand || null,
        umstellungen: (result.rollenLauf || []).filter(x => x.grund === 'umgestellt').length,
        potenzial: result.potenzial || null,
        ausgeschoepft: result.ausgeschoepft != null ? result.ausgeschoepft : null,
        besteLiga: (() => {
          let b = null, hoch = -1;
          (result.seasons || []).forEach(s => {
            const L = league(s.lg) || { prestige: 0 };
            if (!istJugend(s.lg) && L.prestige > hoch){ hoch = L.prestige; b = s.lg; }
          });
          return b;
        })(),
        /* Saison fuer Saison, knapp gehalten. Ohne das laesst sich eine
           fremde Laufbahn nur zusammengefasst zeigen - und genau das
           soll ein Klick in der Bestenliste aufmachen. */
        saisonwerte: (result.seasons || []).filter(s => s.gp).map(s => ({
          j: s.year, a: s.age, k: s.club, l: s.lg, sp: s.gp,
          t: s.g || 0, v: s.a || 0, p: s.p || 0, pm: s.plus || 0,
          ez: s.toi || 0,
          si: s.wins || 0, fq: s.sv ? Math.round(s.sv * 1000) : 0, so: s.so || 0,
          o: s.ovr, r: s.reihe || null, ti: s.title || null,
          au: (s.awards || []).length, pl: s.platz || null,
          ru: s.rollenUrteil || null
        })),
        klubs: (result.ehemalige || []).length + 1,
        wahlen: (result.verlauf || []).length,
        gelungen: (result.verlauf || []).filter(v => v.gelungen).length,
        wendepunkt: (() => {
          const gut = (result.verlauf || []).filter(v => v.gelungen);
          if (!gut.length) return null;
          const b = gut.slice().sort((x, y) => x.chance - y.chance)[0];
          return { wahl: b.wahl, chance: b.chance, alter: b.alter };
        })()
      });
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, 60)));
      /* Zusaetzlich in die Datenbank, wenn ein freigegebenes Profil
         angemeldet ist. Bewusst ohne await: der lokale Speicher hat
         schon zugeschlagen, und ohne Netz soll nichts haengen. */
      if (typeof KONTO !== 'undefined' && KONTO.zustand().frei)
        KONTO.karriereSpeichern(list[0]);
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
    pos, nation, league, clubsOf, attrsOf, lgAvgStr, istHeimatLiga, hatHeimatLiga,
    wertungMitAlter,
    newPlayer, autoDraft,
    draftFrage, applyKarte, karteWert, wirkungNeu,
    overall, formFactor, devAttrs,
    createCareer, simulate, legacyRank, RANG_SCHWELLEN, marktwert,
    saveCareer, loadCareers, clearCareers, randomIdentity,
    ladeHerausforderungen, pruefeHerausforderungen, werteHerausforderungen, clearHerausforderungen,
    trainingsOptionen, trainingAnwenden,
    DRAFT_ROUNDS, LG_MIN, HOME_LG, D
  };
})();

if (typeof window !== 'undefined') window.PUCKERO = PUCKERO;
