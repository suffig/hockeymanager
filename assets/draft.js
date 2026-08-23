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
      eig:['dickkopf'] }
  ];

  const SPIELWEISE = [
    { id:'s_technik', n:'Der Techniker', tag:'Spielweise',
      desc:'Du löst Situationen mit den Händen, bevor sie zu Zweikämpfen werden.',
      b:{ puck:11, pass:9, praezision:7, zweikampf:-6,
          fanghand:10, stockhand:8, rebound:5 },
      eig:['medienliebling'] },
    { id:'s_kraft', n:'Das Kraftpaket', tag:'Spielweise',
      desc:'Du gewinnst, indem der andere aufgibt. Bande, Slot, Bully – überall dasselbe.',
      b:{ zweikampf:12, schuss:8, defensive:6, antritt:-5,
          stellung:8, rebound:9, konstanz:6 },
      eig:['eisenmann'] },
    { id:'s_tempo', n:'Der Tempospieler', tag:'Spielweise',
      desc:'Deine Waffe ist der erste Schritt. Wer dich einholt, hat einen guten Tag.',
      b:{ antritt:12, skating:11, puck:5, defensive:-6,
          beweglich:12, reflexe:8, stellung:-5 },
      eig:['wunderkind'] }
  ];

  const CHARAKTER = [
    { id:'c_anfuehrer', n:'Der Anführer', tag:'Charakter',
      desc:'Wenn es still wird, redest du. Das war schon in der Jugend so.',
      b:{ nerven:9, uebersicht:6, defensive:4, konstanz:6, lesen:5 },
      eig:['kabinenherz','verbandsliebling'] },
    { id:'c_stiller', n:'Der Stille', tag:'Charakter',
      desc:'Du sagst wenig und arbeitest viel. Trainer schätzen das mehr als Journalisten.',
      b:{ defensive:8, zweikampf:6, praezision:5, stellung:7, konstanz:7 },
      eig:['fleissbiene','arbeitstier'] },
    { id:'c_star', n:'Der Selbstbewusste', tag:'Charakter',
      desc:'Du weißt, was du kannst, und sagst es auch. Nicht jeder mag das.',
      b:{ schuss:8, antritt:6, praezision:6, reflexe:6, beweglich:5 },
      eig:['medienliebling','einzelgaenger'] }
  ];

  /* Runde 4: Waffe – je Positionsgruppe eigene Auswahl */
  const WAFFE = {
    skater: [
      { id:'w_schuss', n:'Der Abschluss', tag:'Waffe',
        desc:'Du brauchst einen halben Meter Raum, mehr nicht.',
        b:{ schuss:13, praezision:11, pass:-4 }, eig:['kaltbluetig'] },
      { id:'w_kopf', n:'Die Übersicht', tag:'Waffe',
        desc:'Du siehst die Lücke, bevor sie entsteht.',
        b:{ uebersicht:13, pass:11, schuss:-4 }, eig:['lernwillig'] },
      { id:'w_koerper', n:'Die Präsenz', tag:'Waffe',
        desc:'Vor dem Tor stehst du, bis dich jemand wegträgt.',
        b:{ zweikampf:12, defensive:10, skating:-4 }, eig:['eisenmann'] },
      { id:'w_beine', n:'Die Beine', tag:'Waffe',
        desc:'Zwei Schritte Vorsprung reichen für alles.',
        b:{ skating:12, antritt:11, zweikampf:-4 }, eig:['wunderkind'] }
    ],
    goalie: [
      { id:'w_reflex', n:'Der Reflex', tag:'Waffe',
        desc:'Was du hältst, kann niemand erklären – du selbst am wenigsten.',
        b:{ reflexe:14, beweglich:10, stellung:-5 }, eig:['kaltbluetig'] },
      { id:'w_stellung', n:'Das Stellungsspiel', tag:'Waffe',
        desc:'Du stehst schon dort, wo der Schuss hinwill.',
        b:{ stellung:13, lesen:11, reflexe:-4 }, eig:['lernwillig'] },
      { id:'w_fang', n:'Die Fanghand', tag:'Waffe',
        desc:'Oben rechts ist bei dir kein Ziel, sondern eine Falle.',
        b:{ fanghand:14, rebound:8, puckspiel:-4 }, eig:['medienliebling'] },
      { id:'w_ruhe', n:'Die Konstanz', tag:'Waffe',
        desc:'Siebzig Spiele, siebzig Mal dieselbe Leistung.',
        b:{ konstanz:13, nerven:10, beweglich:-4 }, eig:['fleissbiene'] }
    ]
  };

  /* Runde 5: Der Preis – jede Stärke kostet etwas */
  const PREIS = [
    { id:'p_koerper', n:'Der Körper zahlt', tag:'Preis',
      desc:'Du gibst alles, jeden Wechsel. Dein Körper führt darüber Buch.',
      b:{ zweikampf:8, nerven:7, schuss:5, reflexe:6, rebound:5 },
      eig:['glasknochen'] },
    { id:'p_geduld', n:'Die späte Reife', tag:'Preis',
      desc:'Du brauchst länger als andere – dafür hörst du später auf.',
      b:{ uebersicht:7, defensive:6, pass:5, lesen:7, konstanz:6 },
      eig:['spaetzuender'] },
    { id:'p_heimat', n:'Die Heimat hält', tag:'Preis',
      desc:'Du bleibst, wo du herkommst. Die große Bühne kommt vielleicht nie.',
      b:{ nerven:8, konstanz:7, zweikampf:5, stellung:5 },
      eig:['heimverbunden'] },
    { id:'p_ferne', n:'Der Koffer steht bereit', tag:'Preis',
      desc:'Sprache, Land, Liga – alles verhandelbar. Wurzeln schlägst du keine.',
      b:{ antritt:7, puck:6, praezision:5, beweglich:6, lesen:4 },
      eig:['weltenbummler'] }
  ];

  /* ---------- Die Fragen in Reihenfolge ---------- */
  function fragen(posGruppe){
    return [
      { id:'herkunft',  frage:'Wo hast du Eishockey gelernt?',
        text:'Die ersten Jahre prägen mehr als jedes Profitraining.',
        karten: HERKUNFT },
      { id:'spielweise', frage:'Wie löst du eine Situation?',
        text:'Jeder Spieler hat einen Weg, den er zuerst versucht.',
        karten: SPIELWEISE },
      { id:'charakter',  frage:'Wer bist du in der Kabine?',
        text:'Zwanzig Männer, ein Raum. Deine Rolle darin entscheidet mehr, als du denkst.',
        karten: CHARAKTER },
      { id:'waffe',      frage:'Was ist deine Waffe?',
        text:'Wofür holt dich ein Trainer aufs Eis, wenn es eng wird?',
        karten: WAFFE[posGruppe] || WAFFE.skater },
      { id:'preis',      frage:'Was kostet dich dein Spiel?',
        text:'Niemand bekommt alles. Wähle, womit du leben willst.',
        karten: PREIS }
    ];
  }

  const RUNDEN = 5;

  return { EIGENSCHAFTEN, fragen, RUNDEN, HERKUNFT, SPIELWEISE, CHARAKTER, WAFFE, PREIS };
})();

if (typeof window !== 'undefined') window.DRAFT = DRAFT;
