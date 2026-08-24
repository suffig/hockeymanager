/* ==========================================================
   Eiszeit – Charakterdraft

   Fünf Fragen statt acht Kartenrunden. Jede Antwort verschiebt
   Attribute und verleiht eine benannte Eigenschaft, die sich
   über die ganze Laufbahn auswirkt.
   ========================================================== */

const DRAFT = (() => {

  /* ---------- Eigenschaften und ihre Wirkung ----------
     moralStart  – Startstimmung in der Kabine
     rufStart    – Startansehen
     training    – Zusatzgewinn je Sommertraining
     ereignis    – Bonus auf jede Erfolgschance (Prozentpunkte)
     robust      – weniger und kürzere Verletzungen
     langlebig   – späterer Scheitel, längere Laufbahn
     jung        – früher Scheitel, früheres Ende
     playoff     – stärker in der K.-o.-Phase
     heimbonus   – die Heimatliga hält länger an dir fest
     natBonus    – bessere Chance auf die Nationalmannschaft
     lernkurve   – schnellere Entwicklung in jungen Jahren        */
  const EIGENSCHAFTEN = {
    kabinenherz:   { n:'Kabinenherz', icon:'💙',
      d:'Du bist der Kitt der Mannschaft. Die Stimmung startet hoch und bricht nicht so schnell ein.',
      w:{ moralStart:14 } },
    einzelgaenger: { n:'Einzelgänger', icon:'🚪',
      d:'Du brauchst niemanden. Die Kabine bleibt kühl, dafür stört dich kein Umfeld.',
      w:{ moralStart:-8, ereignis:6 } },
    arbeitstier:   { n:'Arbeitstier', icon:'🔨',
      d:'Erster auf dem Eis, letzter runter. Jede Trainingseinheit bringt mehr.',
      w:{ training:2 } },
    medienliebling:{ n:'Medienliebling', icon:'📸',
      d:'Kameras mögen dich. Dein Ansehen wächst schneller als deine Statistik.',
      w:{ rufStart:8 } },
    kaltbluetig:   { n:'Kaltblütig', icon:'🧊',
      d:'Je größer der Moment, desto ruhiger wirst du.',
      w:{ playoff:10, ereignis:8 } },
    eisenmann:     { n:'Eisenmann', icon:'🔩',
      d:'Der Körper hält, was der Kopf verlangt.',
      w:{ robust:14 } },
    glasknochen:   { n:'Verletzungsanfällig', icon:'🩹',
      d:'Dein Körper ist der unzuverlässigste Teil deines Spiels.',
      w:{ robust:-12 } },
    spaetzuender:  { n:'Spätzünder', icon:'🕰',
      d:'Mit dreißig besser als mit zweiundzwanzig – und lange haltbar.',
      w:{ langlebig:16, jung:-6 } },
    wunderkind:    { n:'Wunderkind', icon:'⚡',
      d:'Früh oben, früh ausgebrannt.',
      w:{ jung:18, langlebig:-10, lernkurve:3 } },
    heimverbunden: { n:'Heimverbunden', icon:'🏠',
      d:'Die Heimatliga lässt dich nicht los – dafür schaut die Welt seltener hin.',
      w:{ heimbonus:14, natBonus:6 } },
    weltenbummler: { n:'Weltenbummler', icon:'🌍',
      d:'Ein neues Land ist für dich kein Hindernis, sondern ein Angebot.',
      w:{ ereignis:5, heimbonus:-10 } },
    lernwillig:    { n:'Schwamm', icon:'🧠',
      d:'Du nimmst jeden Hinweis auf und setzt ihn sofort um.',
      w:{ training:2, lernkurve:4 } },
    verbandsliebling:{ n:'Verbandsliebling', icon:'🎖',
      d:'Beim Verband hat man dich früh auf dem Zettel.',
      w:{ natBonus:14 } },
    dickkopf:      { n:'Dickkopf', icon:'🐏',
      d:'Du machst es auf deine Art. Manchmal ist das genau richtig.',
      w:{ rufStart:-5, playoff:6, ereignis:4 } },
    fleissbiene:   { n:'Stiller Malocher', icon:'🐝',
      d:'Keine Schlagzeilen, aber jeder Trainer will dich im Kader.',
      w:{ rufStart:4, robust:6 } }
  };

  /* ---------- Die fünf Fragen ----------
     Runde 3 (Waffe) und 5 (Preis) sind positionsabhängig.        */

  const HERKUNFT = [
    { id:'h_klein', n:'Kleinstadtverein', tag:'Herkunft',
      desc:'Eine Halle mit vierhundert Plätzen, ein Trainer für drei Jahrgänge, '
         + 'und ein Vater, der jedes Auswärtsspiel gefahren ist.',
      b:{ zweikampf:9, nerven:8, defensive:6, praezision:-3,
          reflexe:7, konstanz:8, stellung:5 },
      eig:['kabinenherz'] },
    { id:'h_akademie', n:'Eliteakademie', tag:'Herkunft',
      desc:'Videoanalyse ab vierzehn, Ernährungsplan, zwei Einheiten am Tag. '
         + 'Alles war durchdacht – nur nie deine Idee.',
      b:{ skating:8, pass:8, uebersicht:7, zweikampf:-4,
          stellung:9, lesen:7, puckspiel:5 },
      eig:['lernwillig'] },
    { id:'h_strasse', n:'Straße und Weiher', tag:'Herkunft',
      desc:'Zugefrorene Flächen ohne Bande, ohne Schiedsrichter, ohne Wechsel. '
         + 'Wer den Puck verliert, läuft ihn selbst wieder holen.',
      b:{ puck:10, antritt:8, praezision:6, defensive:-5,
          reflexe:9, beweglich:7, konstanz:-4 },
      eig:['dickkopf'] },
    { id:'h_familie', n:'Eine Familie voller Spieler', tag:'Herkunft',
      desc:'Vater, Onkel, zwei Brüder. Beim Essen wurde über Bullys gestritten, '
         + 'und mit sechs wusstest du, was ein Icing ist.',
      b:{ uebersicht:9, pass:7, nerven:6, antritt:-3,
          lesen:9, konstanz:6, stellung:4 },
      eig:['heimverbunden','lernwillig'] },
    { id:'h_spaet', n:'Spät angefangen', tag:'Herkunft',
      desc:'Mit zwölf zum ersten Mal auf Kufen, weil ein Freund dich mitschleppte. '
         + 'Alles, was die anderen konnten, musstest du dir holen.',
      b:{ zweikampf:7, nerven:9, schuss:6, skating:-5,
          konstanz:7, beweglich:-4 },
      eig:['spaetzuender','arbeitstier'] },
    { id:'h_inline', n:'Vom Inlinehockey', tag:'Herkunft',
      desc:'Sommer auf Asphalt, kein Abseits, viel Raum. Das Eis kam später '
         + 'und fühlte sich lange zu schnell an.',
      b:{ puck:9, praezision:8, antritt:6, defensive:-6,
          fanghand:9, beweglich:8, stellung:-4 },
      eig:['medienliebling'] },
    { id:'h_ausland', n:'Als Kind ausgewandert', tag:'Herkunft',
      desc:'Neue Sprache, neue Halle, neue Regeln. Das Eis war das Einzige, '
         + 'was überall gleich funktioniert hat.',
      b:{ skating:7, uebersicht:6, zweikampf:-3, lesen:8,
          nerven:8, konstanz:5 },
      eig:['weltenbummler'] },
    { id:'h_grossverein', n:'Großverein mit langer Schlange', tag:'Herkunft',
      desc:'Hundertzwanzig Kinder im Jahrgang, drei Mannschaften, ein Kaderplatz. '
         + 'Du hast früh gelernt, dass Talent nicht reicht.',
      b:{ antritt:8, zweikampf:8, defensive:5, puck:-4,
          reflexe:8, stellung:6, konstanz:5 },
      eig:['fleissbiene','einzelgaenger'] },
    { id:'h_torwartschule', n:'Ein Trainer, der an dich glaubte', tag:'Herkunft',
      desc:'Er blieb nach jedem Training eine halbe Stunde länger, nur mit dir. '
         + 'Erst Jahre später hast du verstanden, was das wert war.',
      b:{ praezision:9, uebersicht:7, nerven:7, zweikampf:-4,
          stellung:10, lesen:8, konstanz:6 },
      eig:['lernwillig','kabinenherz'] },
    { id:'h_allein', n:'Meistens allein auf dem Eis', tag:'Herkunft',
      desc:'Frühe Hallenzeiten, wenn sonst niemand wollte. Tausend Schüsse '
         + 'gegen eine leere Bande, bis die Bewegung von selbst kam.',
      b:{ schuss:10, praezision:9, puck:6, pass:-5,
          reflexe:8, konstanz:9, puckspiel:-3 },
      eig:['arbeitstier','einzelgaenger'] }
  ];



  const CHARAKTER = [
    { id:'c_anfuehrer', n:'Der Anführer', tag:'Charakter',
      desc:'Wenn es still wird, redest du. Nicht laut, aber so, dass es sitzt.',
      b:{ nerven:10, zweikampf:6, uebersicht:5, praezision:-3,
          konstanz:7, lesen:4 },
      eig:['kabinenherz','kaltbluetig'] },
    { id:'c_stiller', n:'Der Stille', tag:'Charakter',
      desc:'Du sagst wenig und arbeitest viel. Die Mannschaft merkt es trotzdem.',
      b:{ defensive:8, zweikampf:5, uebersicht:-3, stellung:8,
          konstanz:9, rebound:5 },
      eig:['arbeitstier','einzelgaenger'] },
    { id:'c_star', n:'Der Selbstbewusste', tag:'Charakter',
      desc:'Du weißt, was du kannst, und hast kein Problem damit, es zu sagen.',
      b:{ schuss:9, antritt:7, puck:6, defensive:-5,
          reflexe:9, fanghand:7, konstanz:-4 },
      eig:['medienliebling','dickkopf'] },
    { id:'c_witzbold', n:'Der, der die Stimmung hält', tag:'Charakter',
      desc:'Nach einer Niederlage bist du der Erste, der wieder einen Spruch macht. '
         + 'Manche halten das für Leichtsinn.',
      b:{ nerven:8, antritt:6, pass:5, beweglich:8,
          konstanz:-4 },
      eig:['kabinenherz','medienliebling'] },
    { id:'c_ruhepol', n:'Der Ruhepol', tag:'Charakter',
      desc:'Je größer das Spiel, desto langsamer wirst du. Das steckt an.',
      b:{ nerven:11, uebersicht:6, praezision:5, antritt:-4,
          stellung:7, lesen:6 },
      eig:['kaltbluetig'] },
    { id:'c_streiter', n:'Der Streitbare', tag:'Charakter',
      desc:'Du sagst, was du denkst, auch wenn es niemand hören will. '
         + 'Das kostet dich Freunde und bringt dir Respekt.',
      b:{ zweikampf:10, schuss:6, nerven:5, pass:-5,
          rebound:6, puckspiel:-4 },
      eig:['dickkopf','einzelgaenger'] },
    { id:'c_vorbild', n:'Der, dem die Jungen zuschauen', tag:'Charakter',
      desc:'Du machst nichts Besonderes – du machst es nur jedes Mal richtig.',
      b:{ defensive:7, uebersicht:6, schuss:-3, konstanz:9,
          stellung:7, lesen:5 },
      eig:['lernwillig','kabinenherz'] },
    { id:'c_ehrgeiz', n:'Der Getriebene', tag:'Charakter',
      desc:'Kein Sieg reicht dir lange. Am Morgen danach denkst du schon '
         + 'an das nächste Spiel.',
      b:{ antritt:8, schuss:7, zweikampf:6, nerven:-4,
          reflexe:9, beweglich:6 },
      eig:['fleissbiene','arbeitstier'] },
    { id:'c_gelassen', n:'Der Gelassene', tag:'Charakter',
      desc:'Eishockey ist wichtig, aber nicht alles. Diese Haltung nimmt dir '
         + 'Druck – und manchmal auch den letzten Prozent.',
      b:{ nerven:7, puck:6, pass:6, zweikampf:-5,
          puckspiel:7, rebound:-3 },
      eig:['kaltbluetig','weltenbummler'] }
  ];

  /* Runde 4: Waffe – je Positionsgruppe eigene Auswahl */
  const WAFFE = {
    skater: [
      { id:'w_schuss', n:'Der Abschluss', tag:'Waffe',
        desc:'Ein Handgelenkschuss ohne Ausholbewegung. Der Torhüter sieht ihn zu spät.',
        b:{ schuss:12, praezision:9, antritt:4, defensive:-4 },
        eig:['medienliebling'] },
      { id:'w_kopf', n:'Die Übersicht', tag:'Waffe',
        desc:'Du siehst den Pass zwei Schritte früher als der Rest der Reihe.',
        b:{ uebersicht:12, pass:10, puck:5, zweikampf:-5 },
        eig:['lernwillig'] },
      { id:'w_koerper', n:'Die Präsenz', tag:'Waffe',
        desc:'An der Bande gewinnst du fast jeden Puck. Man spürt dich das ganze Spiel.',
        b:{ zweikampf:12, defensive:9, nerven:4, skating:-4 },
        eig:['eisenmann'] },
      { id:'w_beine', n:'Die Beine', tag:'Waffe',
        desc:'Erster Schritt, erste Sekunde. Wer dich einholen will, kommt zu spät.',
        b:{ antritt:12, skating:10, puck:4, zweikampf:-5 },
        eig:['wunderkind'] },
      { id:'w_technik', n:'Die Hände', tag:'Waffe',
        desc:'Du löst Situationen mit den Händen, bevor sie zu Zweikämpfen werden.',
        b:{ puck:12, praezision:8, pass:6, zweikampf:-6 },
        eig:['medienliebling'] },
      { id:'w_kraft', n:'Das Kraftpaket', tag:'Waffe',
        desc:'Wo andere abdrehen, ziehst du durch. Zwei Gegenspieler reichen selten.',
        b:{ zweikampf:11, schuss:8, defensive:6, skating:-6 },
        eig:['eisenmann','dickkopf'] },
      { id:'w_defensive', n:'Das Spiel nach hinten', tag:'Waffe',
        desc:'Du stehst da, wo der Gegner hinwollte, bevor er losläuft.',
        b:{ defensive:12, uebersicht:8, nerven:5, schuss:-5 },
        eig:['arbeitstier'] },
      { id:'w_bully', n:'Der Punkt', tag:'Waffe',
        desc:'Neun von zehn Bullys gehen an dich. In der Schlussminute steht die Halle auf.',
        b:{ zweikampf:9, praezision:8, nerven:8, skating:-4 },
        eig:['kaltbluetig'] },
      { id:'w_ausdauer', n:'Die Lunge', tag:'Waffe',
        desc:'Im dritten Drittel bist du so schnell wie im ersten. Das entscheidet Spiele.',
        b:{ skating:10, antritt:7, nerven:6, schuss:-4 },
        eig:['arbeitstier','eisenmann'] },
      { id:'w_moment', n:'Der Sinn für den Moment', tag:'Waffe',
        desc:'Zahlen sagen wenig über dich. Aber wenn es zählt, stehst du richtig.',
        b:{ nerven:11, uebersicht:7, praezision:6, konstanz:-5 },
        eig:['kaltbluetig','spaetzuender'] }
    ],
    goalie: [
      { id:'w_reflex', n:'Der Reflex', tag:'Waffe',
        desc:'Was du hältst, kann niemand erklären – du am wenigsten.',
        b:{ reflexe:13, beweglich:9, stellung:-5, konstanz:-3 },
        eig:['medienliebling'] },
      { id:'w_stellung', n:'Das Stellungsspiel', tag:'Waffe',
        desc:'Du machst dich groß und stehst schon da, wo der Schuss hinwill.',
        b:{ stellung:12, lesen:9, konstanz:6, reflexe:-4 },
        eig:['lernwillig'] },
      { id:'w_ruhe', n:'Die Ruhe', tag:'Waffe',
        desc:'Nach einem Gegentor sieht man dir nichts an. Nach fünf auch nicht.',
        b:{ nerven:12, konstanz:10, beweglich:-4, reflexe:-3 },
        eig:['kaltbluetig'] },
      { id:'w_fang', n:'Die Fanghand', tag:'Waffe',
        desc:'Oben rechts ist zu. Das spricht sich in der Liga herum.',
        b:{ fanghand:13, reflexe:7, rebound:5, puckspiel:-5 },
        eig:['medienliebling'] },
      { id:'w_rebound', n:'Die Nachkontrolle', tag:'Waffe',
        desc:'Der erste Schuss ist selten das Problem. Du sorgst dafür, dass es keinen zweiten gibt.',
        b:{ rebound:12, stellung:8, konstanz:6, fanghand:-4 },
        eig:['arbeitstier'] },
      { id:'w_puckspiel', n:'Der dritte Verteidiger', tag:'Waffe',
        desc:'Du spielst den Puck sauber aus dem Drittel. Deine Verteidiger danken es dir.',
        b:{ puckspiel:12, lesen:8, stockhand:6, reflexe:-5 },
        eig:['lernwillig','kabinenherz'] },
      { id:'w_lesen', n:'Das Spiel lesen', tag:'Waffe',
        desc:'Du weißt, wohin der Pass geht, bevor er gespielt wird.',
        b:{ lesen:13, stellung:8, konstanz:5, beweglich:-4 },
        eig:['kaltbluetig'] },
      { id:'w_beweglich', n:'Die Beweglichkeit', tag:'Waffe',
        desc:'Von Pfosten zu Pfosten, ohne den Blick vom Puck zu nehmen.',
        b:{ beweglich:12, reflexe:8, stockhand:5, konstanz:-5 },
        eig:['wunderkind'] },
      { id:'w_stock', n:'Die Stockhand', tag:'Waffe',
        desc:'Die untere Ecke gibst du nicht her, und Pässe durchs Slot enden bei dir.',
        b:{ stockhand:12, lesen:7, rebound:6, fanghand:-4 },
        eig:['arbeitstier'] },
      { id:'w_serie', n:'Die Serie', tag:'Waffe',
        desc:'Wenn es läuft, läuft es wochenlang. Darauf baut eine ganze Mannschaft.',
        b:{ konstanz:12, nerven:8, stellung:6, beweglich:-5 },
        eig:['spaetzuender','eisenmann'] }
    ]
  };

  /* Runde 5: Der Preis – jede Stärke kostet etwas */
  const PREIS = [
    { id:'p_koerper', n:'Der Körper zahlt', tag:'Preis',
      desc:'Du gibst alles, jeden Wechsel. Der Körper führt darüber Buch.',
      b:{ zweikampf:10, defensive:8, nerven:5, skating:-4,
          reflexe:9, rebound:7, beweglich:-4 },
      eig:['glasknochen','arbeitstier'] },
    { id:'p_geduld', n:'Die späte Reife', tag:'Preis',
      desc:'Mit zwanzig bist du keiner, über den man redet. Mit dreißig schon.',
      b:{ uebersicht:7, pass:5, antritt:-6, lesen:8,
          konstanz:8, beweglich:-5 },
      eig:['spaetzuender'] },
    { id:'p_heimat', n:'Die Heimat hält', tag:'Preis',
      desc:'Du bist da geblieben, wo du herkommst. Das bringt Ruhe und kostet Angebote.',
      b:{ defensive:6, zweikampf:5, skating:-3, nerven:8,
          stellung:6, konstanz:5 },
      eig:['heimverbunden'] },
    { id:'p_ferne', n:'Der Koffer steht bereit', tag:'Preis',
      desc:'Jede Liga, jedes Land. Du kommst überall an – und nirgends ganz.',
      b:{ skating:8, antritt:7, puck:5, nerven:-4,
          beweglich:8, puckspiel:6 },
      eig:['weltenbummler','einzelgaenger'] },
    { id:'p_frueh', n:'Zu früh zu weit', tag:'Preis',
      desc:'Mit achtzehn standest du oben. Was danach kommt, ist selten mehr.',
      b:{ antritt:10, schuss:8, puck:6, reflexe:10,
          beweglich:7, konstanz:-7 },
      eig:['wunderkind'] },
    { id:'p_kopf', n:'Der Kopf denkt zu viel', tag:'Preis',
      desc:'Du siehst jede Möglichkeit – auch die, die schiefgehen kann.',
      b:{ uebersicht:10, pass:8, praezision:6, nerven:-6,
          lesen:10, stellung:7 },
      eig:['lernwillig','glasknochen'] },
    { id:'p_alles', n:'Nichts daneben', tag:'Preis',
      desc:'Kein Hobby, kein Ausgleich, kein Abschalten. Nur das hier.',
      b:{ schuss:8, praezision:8, uebersicht:-4, konstanz:9,
          stellung:7, lesen:-3 },
      eig:['arbeitstier','fleissbiene'] },
    { id:'p_verband', n:'Das Trikot des Landes zuerst', tag:'Preis',
      desc:'Du sagst nie ab, wenn dein Land ruft. Dein Klub sieht das anders.',
      b:{ nerven:7, uebersicht:6, zweikampf:5, lesen:6,
          konstanz:-4 },
      eig:['verbandsliebling'] },
    { id:'p_bequem', n:'Der Weg des geringsten Widerstands', tag:'Preis',
      desc:'Talent hat vieles leicht gemacht. Was schwer war, hast du seltener geübt.',
      b:{ puck:10, antritt:8, praezision:7, defensive:-8,
          fanghand:10, reflexe:8, stellung:-7 },
      eig:['medienliebling'] },
    { id:'p_ruf', n:'Der Ruf eilt voraus', tag:'Preis',
      desc:'Man kennt deinen Namen, bevor man dein Spiel gesehen hat. '
         + 'Das öffnet Türen und setzt Maßstäbe, an denen du dich messen musst.',
      b:{ schuss:7, nerven:6, uebersicht:5, zweikampf:-4,
          reflexe:7, konstanz:-3 },
      eig:['medienliebling','dickkopf'] }
  ];

  /* ---------- Die Fragen in Reihenfolge ---------- */
  /* Aus jedem Vorrat werden drei Karten gezogen - abhaengig vom Seed
     des Spielers. Dadurch sieht keine Laufbahn dieselbe Auswahl, und
     dieselbe Laufbahn bleibt trotzdem wiederholbar. */
  function mische(liste, seed, wieviele){
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seed.length; i++){
      h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0;
    }
    const zufall = () => {
      h += 0x6D2B79F5;
      let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const kopie = liste.slice();
    for (let i = kopie.length - 1; i > 0; i--){
      const j = Math.floor(zufall() * (i + 1));
      [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
    }
    return kopie.slice(0, wieviele || 3);
  }

  function fragen(posGruppe, seed){
    const s0 = String(seed || 'eiszeit');
    return [
      { id:'herkunft',  frage:'Wo hast du Eishockey gelernt?',
        text:'Die ersten Jahre prägen mehr als jedes Profitraining.',
        karten: mische(HERKUNFT, s0 + ':h', 3) },
      { id:'waffe',     frage:'Was ist deine Waffe?',
        text:'Wofür holt dich ein Trainer aufs Eis, wenn es eng wird?',
        karten: mische(WAFFE[posGruppe] || WAFFE.skater, s0 + ':w', 3) },
      { id:'charakter', frage:'Wer bist du in der Kabine?',
        text:'Zwanzig Männer, ein Raum. Deine Rolle darin entscheidet mehr, als du denkst.',
        karten: mische(CHARAKTER, s0 + ':c', 3) },
      { id:'preis',     frage:'Was kostet dich dein Spiel?',
        text:'Niemand bekommt alles. Wähle, womit du leben willst.',
        karten: mische(PREIS, s0 + ':p', 3) }
    ];
  }

  const RUNDEN = 4;

  return { EIGENSCHAFTEN, fragen, RUNDEN, HERKUNFT, CHARAKTER, WAFFE, PREIS };
})();

if (typeof window !== 'undefined') window.DRAFT = DRAFT;
