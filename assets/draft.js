/* ==========================================================
   RINKRISE – Charakterdraft

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
      w:{ moralStart:-8, ereignis:6 , grenze:-2} },
    arbeitstier:   { n:'Arbeitstier', icon:'🔨',
      d:'Erster auf dem Eis, letzter runter. Jede Trainingseinheit bringt mehr.',
      w:{ training:2 , grenze:4} },
    medienliebling:{ n:'Medienliebling', icon:'📸',
      d:'Kameras mögen dich. Dein Ansehen wächst schneller als deine Statistik.',
      w:{ rufStart:8 , grenze:-3} },
    kaltbluetig:   { n:'Kaltblütig', icon:'🧊',
      d:'Je größer der Moment, desto ruhiger wirst du.',
      w:{ playoff:10, ereignis:8 , grenze:2} },
    eisenmann:     { n:'Eisenmann', icon:'🔩',
      d:'Der Körper hält, was der Kopf verlangt.',
      w:{ robust:14 , grenze:2} },
    glasknochen:   { n:'Verletzungsanfällig', icon:'🩹',
      d:'Dein Körper ist der unzuverlässigste Teil deines Spiels.',
      w:{ robust:-12 , grenze:-5} },
    spaetzuender:  { n:'Spätzünder', icon:'🕰',
      d:'Mit dreißig besser als mit zweiundzwanzig – und lange haltbar.',
      w:{ langlebig:16, jung:-6 , grenze:3} },
    wunderkind:    { n:'Wunderkind', icon:'⚡',
      d:'Früh oben, früh ausgebrannt.',
      w:{ jung:18, langlebig:-10, lernkurve:3 , grenze:3} },
    heimverbunden: { n:'Heimverbunden', icon:'🏠',
      d:'Die Heimatliga lässt dich nicht los – dafür schaut die Welt seltener hin.',
      w:{ heimbonus:14, natBonus:6 } },
    weltenbummler: { n:'Weltenbummler', icon:'🌍',
      d:'Ein neues Land ist für dich kein Hindernis, sondern ein Angebot.',
      w:{ ereignis:5, heimbonus:-10 } },
    lernwillig:    { n:'Schwamm', icon:'🧠',
      d:'Du nimmst jeden Hinweis auf und setzt ihn sofort um.',
      w:{ training:2, lernkurve:4 , grenze:5} },
    verbandsliebling:{ n:'Verbandsliebling', icon:'🎖',
      d:'Beim Verband hat man dich früh auf dem Zettel.',
      w:{ natBonus:14 } },
    dickkopf:      { n:'Dickkopf', icon:'🐏',
      d:'Du machst es auf deine Art. Manchmal ist das genau richtig.',
      w:{ rufStart:-5, playoff:6, ereignis:4 , grenze:-2} },
    fleissbiene:   { n:'Stiller Malocher', icon:'\ud83d\udc1d',
      d:'Keine Schlagzeilen, aber jeder Trainer will dich im Kader.',
      w:{ rufStart:4, robust:6 , grenze:3} },

    /* ------------------------------------------------------------------
       Sechs Eigenschaften mehr

       Es gab fuenfzehn, und zwoelf gezogene Karten tragen fuenfzehn bis
       achtzehn Zusagen - eine Doppelung war damit rechnerisch kaum zu
       vermeiden, egal wie sorgfaeltig gezogen wird. Gemessen betraf es
       neununddreissig Prozent aller Spieler. Mit einundzwanzig
       Eigenschaften geht die Rechnung auf, und die Vorraete der
       einzelnen Fragen ueberschneiden sich weniger.
       ------------------------------------------------------------------ */
    frueheBuerde:  { n:'Frühe Bürde', icon:'\ud83c\udf96',
      d:'Man hat viel von dir erwartet, bevor du etwas geleistet hattest.',
      w:{ rufStart:10, moralStart:-6, grenze:2 } },
    eisblock:      { n:'Eisblock', icon:'\u2744',
      d:'Kein Trainer bringt dich aus der Ruhe – kein Erfolg auch nicht.',
      w:{ moralStart:6, ereignis:-3, robust:5, grenze:1 } },
    strassenkoeter:{ n:'Straßenköter', icon:'\ud83e\udd85',
      d:'Du hast nichts geschenkt bekommen und spielst genau so.',
      w:{ playoff:7, rufStart:-4, training:1, grenze:2 } },
    spielmacher:   { n:'Spielverstand', icon:'\ud83c\udfaf',
      d:'Du siehst den Pass zwei Sekunden vor allen anderen.',
      w:{ lernkurve:5, grenze:4, rufStart:2 } },
    heimschwaeche: { n:'Fernweh', icon:'\u2708',
      d:'Zu Hause wird es dir schnell zu eng.',
      w:{ heimbonus:-8, natBonus:4, ereignis:4 } },
    knochenmuehle: { n:'Knochenmühle', icon:'\ud83e\uddb4',
      d:'Du spielst über den Schmerz. Der Körper merkt sich das.',
      w:{ robust:7, langlebig:-8, playoff:5, grenze:1 } }
  };

  /* ---------- Die vier Fragen ----------
     Die Waffe ist positionsabhaengig; aus jedem Vorrat werden je
     Spieler nur drei Antworten gezogen.                          */

  const HERKUNFT = [
    { id:'h_klein', n:'Kleinstadtverein', tag:'Herkunft',
      desc:'Eine Halle mit vierhundert Plätzen, ein Trainer für drei Jahrgänge, '
         + 'und ein Vater, der jedes Auswärtsspiel gefahren ist.',
      b:{ zweikampf:12, nerven:10, defensive:8, praezision:-4,
          reflexe:9, konstanz:10, stellung:6 },
      eig:['kabinenherz'] },
    { id:'h_akademie', n:'Eliteakademie', tag:'Herkunft',
      desc:'Videoanalyse ab vierzehn, Ernährungsplan, zwei Einheiten am Tag. '
         + 'Alles war durchdacht – nur nie deine Idee.',
      b:{ skating:10, pass:10, uebersicht:9, zweikampf:-5,
          stellung:12, lesen:9, puckspiel:6 },
      eig:['lernwillig'] },
    { id:'h_strasse', n:'Straße und Weiher', tag:'Herkunft',
      desc:'Zugefrorene Flächen ohne Bande, ohne Schiedsrichter, ohne Wechsel. '
         + 'Wer den Puck verliert, läuft ihn selbst wieder holen.',
      b:{ puck:13, antritt:10, praezision:8, defensive:-6,
          reflexe:12, beweglich:9, konstanz:-5 },
      eig:['dickkopf'] },
    { id:'h_familie', n:'Eine Familie voller Spieler', tag:'Herkunft',
      desc:'Vater, Onkel, zwei Brüder. Beim Essen wurde über Bullys gestritten, '
         + 'und mit sechs wusstest du, was ein Icing ist.',
      b:{ uebersicht:12, pass:9, nerven:8, antritt:-4,
          lesen:12, konstanz:8, stellung:5 },
      eig:['heimverbunden','spielmacher'] },
    { id:'h_spaet', n:'Spät angefangen', tag:'Herkunft',
      desc:'Mit zwölf zum ersten Mal auf Kufen, weil ein Freund dich mitschleppte. '
         + 'Alles, was die anderen konnten, musstest du dir holen.',
      b:{ zweikampf:9, nerven:12, schuss:8, skating:-6,
          konstanz:9, beweglich:-5 },
      eig:['spaetzuender','arbeitstier'] },
    { id:'h_inline', n:'Vom Inlinehockey', tag:'Herkunft',
      desc:'Sommer auf Asphalt, kein Abseits, viel Raum. Das Eis kam später '
         + 'und fühlte sich lange zu schnell an.',
      b:{ puck:12, praezision:10, antritt:8, defensive:-8,
          fanghand:12, beweglich:10, stellung:-5 },
      eig:['medienliebling'] },
    { id:'h_ausland', n:'Als Kind ausgewandert', tag:'Herkunft',
      desc:'Neue Sprache, neue Halle, neue Regeln. Das Eis war das Einzige, '
         + 'was überall gleich funktioniert hat.',
      b:{ skating:9, uebersicht:8, zweikampf:-4, lesen:10,
          nerven:10, konstanz:6 },
      eig:['weltenbummler'] },
    { id:'h_grossverein', n:'Großverein mit langer Schlange', tag:'Herkunft',
      desc:'Hundertzwanzig Kinder im Jahrgang, drei Mannschaften, ein Kaderplatz. '
         + 'Du hast früh gelernt, dass Talent nicht reicht.',
      b:{ antritt:10, zweikampf:10, defensive:6, puck:-5,
          reflexe:10, stellung:8, konstanz:6 },
      eig:['fleissbiene','einzelgaenger'] },
    { id:'h_torwartschule', n:'Ein Trainer, der an dich glaubte', tag:'Herkunft',
      desc:'Er blieb nach jedem Training eine halbe Stunde länger, nur mit dir. '
         + 'Erst Jahre später hast du verstanden, was das wert war.',
      b:{ praezision:12, uebersicht:9, nerven:9, zweikampf:-5,
          stellung:13, lesen:10, konstanz:8 },
      eig:['lernwillig','kabinenherz'] },
    { id:'h_allein', n:'Meistens allein auf dem Eis', tag:'Herkunft',
      desc:'Frühe Hallenzeiten, wenn sonst niemand wollte. Tausend Schüsse '
         + 'gegen eine leere Bande, bis die Bewegung von selbst kam.',
      b:{ schuss:13, praezision:12, puck:8, pass:-6,
          reflexe:10, konstanz:12, puckspiel:-4 },
      eig:['strassenkoeter','einzelgaenger'] },
    /* ---- Nachgelegt: mehr Wege ins Eishockey ---- */
    { id:'h_hallenkind', n:'Die Halle nebenan', tag:'Herkunft',
      desc:'Deine Mutter arbeitete an der Kasse, und du warst jeden Tag drin, '
         + 'bevor das Flutlicht anging. Das Eis war dein Hinterhof.',
      b:{ skating:14, praezision:10, uebersicht:6, zweikampf:-5,
          beweglich:12, stellung:9, konstanz:6, lesen:-4 },
      eig:['heimverbunden','fleissbiene'] },

    { id:'h_spaetstart', n:'Erst mit dreizehn', tag:'Herkunft',
      desc:'Andere standen mit vier auf Kufen. Du kamst spät, aus einem anderen Sport, '
         + 'und hast in drei Jahren aufgeholt, wofür andere zehn brauchten.',
      b:{ antritt:12, zweikampf:10, nerven:9, praezision:-8,
          beweglich:14, reflexe:9, lesen:-6, konstanz:-4 },
      eig:['spaetzuender','lernwillig'] },

    { id:'h_sportschule', n:'Die Sportschule', tag:'Herkunft',
      desc:'Internat, Trainingsplan, Videoanalyse mit fünfzehn. Alles war organisiert – '
         + 'auch das, was du nie selbst herausfinden musstest.',
      b:{ defensive:14, uebersicht:12, konstanz:10, puck:-6,
          stellung:14, lesen:12, beweglich:-5 },
      eig:['arbeitstier','verbandsliebling'] }
  ];



  const CHARAKTER = [
    { id:'c_anfuehrer', n:'Der Anführer', tag:'Charakter',
      desc:'Wenn es still wird, redest du. Nicht laut, aber so, dass es sitzt.',
      b:{ nerven:13, zweikampf:8, uebersicht:6, praezision:-4,
          konstanz:9, lesen:5 },
      eig:['kabinenherz','kaltbluetig'] },
    { id:'c_leise', n:'Der Stille', tag:'Charakter',
      desc:'Du sagst wenig und arbeitest viel. Die Mannschaft merkt es trotzdem.',
      b:{ defensive:12, zweikampf:6, uebersicht:-4, stellung:12,
          konstanz:14, rebound:6 },
      eig:['arbeitstier','heimschwaeche'] },
    { id:'c_star', n:'Der Selbstbewusste', tag:'Charakter',
      desc:'Du weißt, was du kannst, und hast kein Problem damit, es zu sagen.',
      b:{ schuss:12, antritt:9, puck:8, defensive:-6,
          reflexe:12, fanghand:9, konstanz:-5 },
      eig:['frueheBuerde','dickkopf'] },
    { id:'c_witzbold', n:'Der, der die Stimmung hält', tag:'Charakter',
      desc:'Nach einer Niederlage bist du der Erste, der wieder einen Spruch macht. '
         + 'Manche halten das für Leichtsinn.',
      b:{ nerven:10, antritt:8, pass:6, beweglich:10,
          konstanz:-5 },
      eig:['kabinenherz','medienliebling'] },
    { id:'c_ruhepol', n:'Der Ruhepol', tag:'Charakter',
      desc:'Je größer das Spiel, desto langsamer wirst du. Das steckt an.',
      b:{ nerven:14, uebersicht:8, praezision:6, antritt:-5,
          stellung:9, lesen:8 },
      eig:['eisblock'] },
    { id:'c_streiter', n:'Der Streitbare', tag:'Charakter',
      desc:'Du sagst, was du denkst, auch wenn es niemand hören will. '
         + 'Das kostet dich Freunde und bringt dir Respekt.',
      b:{ zweikampf:13, schuss:8, nerven:6, pass:-6,
          rebound:8, puckspiel:-5 },
      eig:['knochenmuehle','einzelgaenger'] },
    { id:'c_vorbild', n:'Der, dem die Jungen zuschauen', tag:'Charakter',
      desc:'Du machst nichts Besonderes – du machst es nur jedes Mal richtig.',
      b:{ defensive:9, uebersicht:8, schuss:-4, konstanz:12,
          stellung:9, lesen:6 },
      eig:['spielmacher','kabinenherz'] },
    { id:'c_ehrgeiz', n:'Der Getriebene', tag:'Charakter',
      desc:'Kein Sieg reicht dir lange. Am Morgen danach denkst du schon '
         + 'an das nächste Spiel.',
      b:{ antritt:10, schuss:9, zweikampf:8, nerven:-5,
          reflexe:12, beweglich:8 },
      eig:['fleissbiene','strassenkoeter'] },
    { id:'c_gelassen', n:'Der Gelassene', tag:'Charakter',
      desc:'Eishockey ist wichtig, aber nicht alles. Diese Haltung nimmt dir '
         + 'Druck – und manchmal auch den letzten Prozent.',
      b:{ nerven:9, puck:8, pass:8, zweikampf:-6,
          puckspiel:9, rebound:-4 },
      eig:['kaltbluetig','weltenbummler'] },
    /* ---- Nachgelegt ---- */
    { id:'c_stiller', n:'Der Stille', tag:'Charakter',
      desc:'Du sagst in einer Saison weniger als andere in einer Kabinenansprache. '
         + 'Aber wenn du etwas sagst, hören zwanzig Männer zu.',
      b:{ konstanz:12, nerven:9, uebersicht:6, zweikampf:-4, lesen:8, stellung:5 },
      eig:['einzelgaenger','eisblock'] },

    { id:'c_spassvogel', n:'Der Spaßvogel', tag:'Charakter',
      desc:'Nach der schlimmsten Niederlage der Saison bringst du die Kabine zum Lachen. '
         + 'Manche Trainer hassen das. Die Mannschaft nicht.',
      b:{ nerven:12, antritt:6, praezision:-5, uebersicht:5, beweglich:9, konstanz:-5 },
      eig:['kabinenherz','medienliebling'] },

    { id:'c_streber', n:'Der Erste im Videoraum', tag:'Charakter',
      desc:'Du kennst die Schwächen des Gegners, bevor der Trainer sie zeigt. '
         + 'Manchmal weißt du zu viel und denkst zu lange.',
      b:{ uebersicht:16, defensive:9, antritt:-5, praezision:5, lesen:16, reflexe:-5 },
      eig:['lernwillig','fleissbiene'] }
  ];

  /* Runde 4: Waffe – je Positionsgruppe eigene Auswahl */
  const WAFFE = {
    skater: [
      { id:'w_schuss', n:'Der Abschluss', tag:'Waffe',
        desc:'Ein Handgelenkschuss ohne Ausholbewegung. Der Torhüter sieht ihn zu spät.',
        b:{ schuss:16, praezision:12, antritt:5, defensive:-5 },
        eig:['frueheBuerde'] },
      { id:'w_kopf', n:'Die Übersicht', tag:'Waffe',
        desc:'Du siehst den Pass zwei Schritte früher als der Rest der Reihe.',
        b:{ uebersicht:16, pass:13, puck:6, zweikampf:-6 },
        eig:['lernwillig'] },
      { id:'w_koerper', n:'Die Präsenz', tag:'Waffe',
        desc:'An der Bande gewinnst du fast jeden Puck. Man spürt dich das ganze Spiel.',
        b:{ zweikampf:16, defensive:12, nerven:5, skating:-5 },
        eig:['eisenmann'] },
      { id:'w_beine', n:'Die Beine', tag:'Waffe',
        desc:'Erster Schritt, erste Sekunde. Wer dich einholen will, kommt zu spät.',
        b:{ antritt:16, skating:13, puck:5, zweikampf:-6 },
        eig:['wunderkind'] },
      { id:'w_technik', n:'Die Hände', tag:'Waffe',
        desc:'Du löst Situationen mit den Händen, bevor sie zu Zweikämpfen werden.',
        b:{ puck:16, praezision:10, pass:8, zweikampf:-8 },
        eig:['medienliebling'] },
      { id:'w_kraft', n:'Das Kraftpaket', tag:'Waffe',
        desc:'Wo andere abdrehen, ziehst du durch. Zwei Gegenspieler reichen selten.',
        b:{ zweikampf:14, schuss:10, defensive:8, skating:-8 },
        eig:['eisenmann','dickkopf'] },
      { id:'w_defensive', n:'Das Spiel nach hinten', tag:'Waffe',
        desc:'Du stehst da, wo der Gegner hinwollte, bevor er losläuft.',
        b:{ defensive:16, uebersicht:10, nerven:6, schuss:-6 },
        eig:['arbeitstier'] },
      { id:'w_bully', n:'Der Punkt', tag:'Waffe',
        desc:'Neun von zehn Bullys gehen an dich. In der Schlussminute steht die Halle auf.',
        b:{ zweikampf:12, praezision:10, nerven:10, skating:-5 },
        eig:['eisblock'] },
      { id:'w_ausdauer', n:'Die Lunge', tag:'Waffe',
        desc:'Im dritten Drittel bist du so schnell wie im ersten. Das entscheidet Spiele.',
        b:{ skating:13, antritt:9, nerven:8, schuss:-5 },
        eig:['strassenkoeter','eisenmann'] },
      { id:'w_moment', n:'Der Sinn für den Moment', tag:'Waffe',
        desc:'Zahlen sagen wenig über dich. Aber wenn es zählt, stehst du richtig.',
        b:{ nerven:14, uebersicht:9, praezision:8, konstanz:-6 },
        eig:['kaltbluetig','spaetzuender'] },
      /* ---- Nachgelegt ---- */
      { id:'w_bullykreis', n:'Der Bullykreis', tag:'Waffe',
      desc:'Zwei Sekunden, in denen sich entscheidet, wem das Drittel gehört. '
         + 'Du gewinnst sie öfter als alle anderen.',
      b:{ zweikampf:16, uebersicht:10, nerven:9, schuss:-5 },
      eig:['kaltbluetig'] },

      { id:'w_verlaengerung', n:'Die dritte Verlängerung', tag:'Waffe',
      desc:'Wenn nach hundert Minuten alle stehen, läufst du noch. Nicht schneller '
         + 'als am Anfang – aber genauso schnell.',
      b:{ antritt:9, skating:14, nerven:10, praezision:-4 },
      eig:['eisenmann','arbeitstier'] },

      { id:'w_wand', n:'Das Spiel an der Bande', tag:'Waffe',
      desc:'Dort, wo es weh tut und niemand hinsieht, holst du die Pucks heraus, '
         + 'aus denen die anderen Tore machen.',
      b:{ zweikampf:17, puck:10, defensive:9, skating:-5 },
      eig:['knochenmuehle'] }
    ],
    goalie: [
      { id:'w_reflex', n:'Der Reflex', tag:'Waffe',
        desc:'Was du hältst, kann niemand erklären – du am wenigsten.',
        b:{ reflexe:17, beweglich:12, stellung:-6, konstanz:-4 },
        eig:['frueheBuerde'] },
      { id:'w_stellung', n:'Das Stellungsspiel', tag:'Waffe',
        desc:'Du machst dich groß und stehst schon da, wo der Schuss hinwill.',
        b:{ stellung:16, lesen:12, konstanz:8, reflexe:-5 },
        eig:['spielmacher'] },
      { id:'w_ruhe', n:'Die Ruhe', tag:'Waffe',
        desc:'Nach einem Gegentor sieht man dir nichts an. Nach fünf auch nicht.',
        b:{ nerven:16, konstanz:13, beweglich:-5, reflexe:-4 },
        eig:['eisblock'] },
      { id:'w_fang', n:'Die Fanghand', tag:'Waffe',
        desc:'Oben rechts ist zu. Das spricht sich in der Liga herum.',
        b:{ fanghand:17, reflexe:9, rebound:6, puckspiel:-6 },
        eig:['medienliebling'] },
      { id:'w_rebound', n:'Die Nachkontrolle', tag:'Waffe',
        desc:'Der erste Schuss ist selten das Problem. Du sorgst dafür, dass es keinen zweiten gibt.',
        b:{ rebound:16, stellung:10, konstanz:8, fanghand:-5 },
        eig:['arbeitstier'] },
      { id:'w_puckspiel', n:'Der dritte Verteidiger', tag:'Waffe',
        desc:'Du spielst den Puck sauber aus dem Drittel. Deine Verteidiger danken es dir.',
        b:{ puckspiel:16, lesen:10, stockhand:8, reflexe:-6 },
        eig:['lernwillig','kabinenherz'] },
      { id:'w_lesen', n:'Das Spiel lesen', tag:'Waffe',
        desc:'Du weißt, wohin der Pass geht, bevor er gespielt wird.',
        b:{ lesen:17, stellung:10, konstanz:6, beweglich:-5 },
        eig:['kaltbluetig'] },
      { id:'w_beweglich', n:'Die Beweglichkeit', tag:'Waffe',
        desc:'Von Pfosten zu Pfosten, ohne den Blick vom Puck zu nehmen.',
        b:{ beweglich:16, reflexe:10, stockhand:6, konstanz:-6 },
        eig:['wunderkind'] },
      { id:'w_stock', n:'Die Stockhand', tag:'Waffe',
        desc:'Die untere Ecke gibst du nicht her, und Pässe durchs Slot enden bei dir.',
        b:{ stockhand:16, lesen:9, rebound:8, fanghand:-5 },
        eig:['strassenkoeter'] },
      { id:'w_serie', n:'Die Serie', tag:'Waffe',
        desc:'Wenn es läuft, läuft es wochenlang. Darauf baut eine ganze Mannschaft.',
        b:{ konstanz:16, nerven:10, stellung:8, beweglich:-6 },
        eig:['spaetzuender','eisenmann'] },
      /* ---- Nachgelegt ---- */
      { id:'wg_ruhe', n:'Die Ruhe im Tor', tag:'Waffe',
      desc:'Du bewegst dich weniger als jeder andere Torhüter der Liga – und stehst '
         + 'trotzdem immer da, wo der Puck hinkommt.',
      b:{ stellung:17, lesen:12, konstanz:9, beweglich:-6 },
      eig:['eisblock'] },

      { id:'wg_aufbau', n:'Der dritte Verteidiger', tag:'Waffe',
      desc:'Dein erster Pass ist der Beginn des Angriffs. Manche Trainer nennen das '
         + 'riskant. Deine Verteidiger nennen es Entlastung.',
      b:{ puckspiel:20, lesen:10, beweglich:6, rebound:-5 },
      eig:['spielmacher'] },

      { id:'wg_serie', n:'Die Serie', tag:'Waffe',
      desc:'In der K.-o.-Runde wirst du ein anderer. Sechs Spiele, sechs Mal besser '
         + 'als der Mann gegenüber.',
      b:{ reflexe:12, nerven:16, konstanz:6, stellung:-5 },
      eig:['kaltbluetig'] }
    ]
  };

  /* Runde 5: Der Preis – jede Stärke kostet etwas */
  const PREIS = [
    { id:'p_koerper', n:'Der Körper zahlt', tag:'Preis',
      desc:'Du gibst alles, jeden Wechsel. Der Körper führt darüber Buch.',
      b:{ zweikampf:13, defensive:10, nerven:6, skating:-5,
          reflexe:12, rebound:9, beweglich:-5 },
      eig:['glasknochen','arbeitstier'] },
    { id:'p_geduld', n:'Die späte Reife', tag:'Preis',
      desc:'Mit zwanzig bist du keiner, über den man redet. Mit dreißig schon.',
      b:{ uebersicht:9, pass:6, antritt:-8, lesen:10,
          konstanz:10, beweglich:-6 },
      eig:['spaetzuender'] },
    { id:'p_heimat', n:'Die Heimat hält', tag:'Preis',
      desc:'Du bist da geblieben, wo du herkommst. Das bringt Ruhe und kostet Angebote.',
      b:{ defensive:8, zweikampf:6, skating:-4, nerven:10,
          stellung:8, konstanz:6 },
      eig:['heimverbunden'] },
    { id:'p_ferne', n:'Der Koffer steht bereit', tag:'Preis',
      desc:'Jede Liga, jedes Land. Du kommst überall an – und nirgends ganz.',
      b:{ skating:10, antritt:9, puck:6, nerven:-5,
          beweglich:10, puckspiel:8 },
      eig:['weltenbummler','heimschwaeche'] },
    { id:'p_frueh', n:'Zu früh zu weit', tag:'Preis',
      desc:'Mit achtzehn standest du oben. Was danach kommt, ist selten mehr.',
      b:{ antritt:13, schuss:10, puck:8, reflexe:13,
          beweglich:9, konstanz:-9 },
      eig:['wunderkind'] },
    { id:'p_kopf', n:'Der Kopf denkt zu viel', tag:'Preis',
      desc:'Du siehst jede Möglichkeit – auch die, die schiefgehen kann.',
      b:{ uebersicht:13, pass:10, praezision:8, nerven:-8,
          lesen:13, stellung:9 },
      eig:['spielmacher','glasknochen'] },
    { id:'p_alles', n:'Nichts daneben', tag:'Preis',
      desc:'Kein Hobby, kein Ausgleich, kein Abschalten. Nur das hier.',
      b:{ schuss:10, praezision:10, uebersicht:-5, konstanz:12,
          stellung:9, lesen:-4 },
      eig:['strassenkoeter','fleissbiene'] },
    { id:'p_verband', n:'Das Trikot des Landes zuerst', tag:'Preis',
      desc:'Du sagst nie ab, wenn dein Land ruft. Dein Klub sieht das anders.',
      b:{ nerven:9, uebersicht:8, zweikampf:6, lesen:8,
          konstanz:-5 },
      eig:['verbandsliebling'] },
    { id:'p_bequem', n:'Der Weg des geringsten Widerstands', tag:'Preis',
      desc:'Talent hat vieles leicht gemacht. Was schwer war, hast du seltener geübt.',
      b:{ puck:13, antritt:10, praezision:9, defensive:-10,
          fanghand:13, reflexe:10, stellung:-9 },
      eig:['frueheBuerde'] },
    { id:'p_vorauseilend', n:'Der Ruf eilt voraus', tag:'Preis',
      desc:'Man kennt deinen Namen, bevor man dein Spiel gesehen hat. '
         + 'Das öffnet Türen und setzt Maßstäbe, an denen du dich messen musst.',
      b:{ schuss:10, nerven:9, uebersicht:6, zweikampf:-5,
          reflexe:10, konstanz:-4 },
      eig:['medienliebling','knochenmuehle'] },
    /* ---- Nachgelegt ---- */
    { id:'p_familie', n:'Die Familie zahlt mit', tag:'Preis',
      desc:'Vier Vereine in sechs Jahren, jedes Mal ein neuer Kindergarten. '
         + 'Zu Hause bist du da, wo dein Vertrag gilt.',
      b:{ nerven:14, uebersicht:9, konstanz:-6, zweikampf:5, lesen:6, stellung:-5 },
      eig:['weltenbummler','heimschwaeche'] },

    { id:'p_ruf', n:'Der Ruf eilt voraus', tag:'Preis',
      desc:'Man kennt dich, bevor du im Raum bist – und weiß auch schon, was man '
         + 'von dir hält. Ändern lässt sich das kaum noch.',
      b:{ nerven:8, praezision:9, schuss:6, defensive:-8, fanghand:8, lesen:-6 },
      eig:['medienliebling','dickkopf'] },

    { id:'p_zufrueh', n:'Zu früh zu viel', tag:'Preis',
      desc:'Mit siebzehn im Profikader, mit achtzehn im Nationalteam. Du hast Jahre '
         + 'übersprungen, die anderen später fehlen – und dir vielleicht auch.',
      b:{ schuss:12, antritt:10, uebersicht:-6, nerven:-5, reflexe:12, lesen:-6 },
      eig:['wunderkind','frueheBuerde'] }
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

  /* ------------------------------------------------------------------
     Wo einer Eishockey gelernt hat, haengt am Land

     Die Herkunftskarten wurden rein zufaellig gezogen - ein Schweizer
     konnte "Strasse und Weiher" bekommen und ein Kanadier "Vom
     Inlinehockey". Beides gibt es, aber nicht ueberall gleich haeufig.
     Die Zahl ist ein Gewicht, keine Sperre: jede Herkunft bleibt
     ueberall moeglich, nur eben unterschiedlich wahrscheinlich.
     ------------------------------------------------------------------ */
  const HERKUNFT_LAND = {
    /*                klein akad strasse familie spaet inline ausland */
    CAN: { h_klein:3.0, h_akademie:0.8, h_strasse:3.0, h_familie:2.2, h_spaet:0.5, h_inline:0.5, h_ausland:1.0 },
    USA: { h_klein:1.4, h_akademie:2.2, h_strasse:1.0, h_familie:1.4, h_spaet:1.4, h_inline:2.6, h_ausland:1.0 },
    SWE: { h_klein:2.0, h_akademie:2.6, h_strasse:2.2, h_familie:1.6, h_spaet:0.8, h_inline:0.8, h_ausland:1.0 },
    FIN: { h_klein:2.4, h_akademie:2.2, h_strasse:2.4, h_familie:1.4, h_spaet:0.8, h_inline:0.6, h_ausland:0.8 },
    RUS: { h_klein:1.6, h_akademie:3.0, h_strasse:2.0, h_familie:1.6, h_spaet:0.6, h_inline:0.6, h_ausland:0.8 },
    CZE: { h_klein:2.2, h_akademie:2.2, h_strasse:1.6, h_familie:2.0, h_spaet:0.8, h_inline:1.2, h_ausland:0.8 },
    SVK: { h_klein:2.4, h_akademie:1.6, h_strasse:1.6, h_familie:1.8, h_spaet:1.0, h_inline:1.2, h_ausland:1.2 },
    GER: { h_klein:2.2, h_akademie:1.4, h_strasse:0.7, h_familie:1.2, h_spaet:2.0, h_inline:2.4, h_ausland:1.6 },
    SUI: { h_klein:2.4, h_akademie:1.8, h_strasse:0.7, h_familie:1.2, h_spaet:1.6, h_inline:1.4, h_ausland:1.6 },
    AUT: { h_klein:2.6, h_akademie:1.0, h_strasse:0.8, h_familie:1.0, h_spaet:2.2, h_inline:1.6, h_ausland:1.6 },
    LAT: { h_klein:2.6, h_akademie:1.2, h_strasse:2.0, h_familie:1.4, h_spaet:1.2, h_inline:0.8, h_ausland:1.8 },
    DEN: { h_klein:2.4, h_akademie:1.2, h_strasse:0.9, h_familie:1.0, h_spaet:2.2, h_inline:1.4, h_ausland:1.8 },
    NOR: { h_klein:2.6, h_akademie:1.0, h_strasse:2.2, h_familie:1.0, h_spaet:1.8, h_inline:0.9, h_ausland:1.6 }
  };

  /* Gewichtet ziehen, ohne Wiederholung. */
  function ziehe(liste, seed, wieviele, gewichte){
    if (!gewichte) return mische(liste, seed, wieviele);
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seed.length; i++){
      h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0;
    }
    const zufall = () => {
      h += 0x6D2B79F5; let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const rest = liste.slice(), raus = [];
    while (raus.length < (wieviele || 3) && rest.length){
      const summe = rest.reduce((a, x) => a + (gewichte[x.id] || 1), 0);
      let ziel = zufall() * summe, i = 0;
      for (; i < rest.length; i++){
        ziel -= (gewichte[rest[i].id] || 1);
        if (ziel <= 0) break;
      }
      raus.push(rest.splice(Math.min(i, rest.length - 1), 1)[0]);
    }
    return raus;
  }

  /* ------------------------------------------------------------------
     Keine Eigenschaft zweimal im selben Draft

     Die vier Fragen wurden unabhaengig voneinander gezogen, und
     dieselbe Eigenschaft steht auf mehreren Karten - "Medienliebling"
     auf sechs, "Lernwillig" auf sechs. Bei zwoelf gezogenen Karten war
     eine Doppelung damit praktisch sicher: gemessen enthielten 600 von
     600 Draftangeboten mindestens eine.

     Das ist nicht nur unschoen, es ist eine gebrochene Zusage. Wer
     eine Eigenschaft schon hat, bekommt sie beim zweiten Mal nicht
     noch einmal - die Karte verspricht also etwas, das sie nicht
     liefert.

     Deshalb wird Karte fuer Karte gezogen, und jede vergebene
     Eigenschaft gilt sofort als vergeben - auch innerhalb derselben
     Frage. Dort entstand die Doppelung naemlich zuerst: in der
     Herkunft tragen "Eliteakademie" und "Eine Familie voller Spieler"
     beide "lernwillig". Reicht der Vorrat nicht, wird aufgefuellt: es
     muessen immer drei Karten zur Wahl stehen.
     ------------------------------------------------------------------ */
  function ohneWiederholung(liste, seed, wieviele, gewichte, schonDa, verboten){
    const roh = ziehe(liste, seed, liste.length, gewichte);
    const raus = [];
    const soll = wieviele || 3;
    /* Was in DIESER Frage schon vergeben ist - getrennt von dem, was
       irgendwann vorher vergeben wurde. Der Unterschied ist wichtig:
       es gibt nur fuenfzehn Eigenschaften insgesamt, und zwoelf
       gezogene Karten tragen fuenfzehn bis achtzehn Zusagen. Ueber
       alle vier Fragen hinweg ist eine Doppelung damit rechnerisch
       kaum zu vermeiden - innerhalb einer Frage dagegen leicht, und
       genau die sieht man nebeneinander. */
    const hier = new Set();
    /* Gemessen: 12 Karten tragen 17.4 Zusagen, der Vorrat hat 21
       Eigenschaften. Die Bedingung "alles frisch" ist damit fast nie
       erfuellbar - in 51 Prozent aller Drafts fiel die Auswahl bis auf
       Stufe 2 durch, und dann stand dieselbe Eigenschaft zweimal im
       Angebot.

       Statt die Karte zu verwerfen, bringt sie jetzt nur noch mit, was
       es noch nicht gibt. Die Karte selbst bleibt also im Spiel - ihr
       Text, ihre Werte, ihre Wirkung - aber eine Eigenschaft wird
       niemals zweimal zugesagt. Dafuer wird die Karte kopiert; das
       Urspruenliche in EIGENSCHAFTEN darf nicht angetastet werden,
       weil es fuer jeden weiteren Draft wieder gebraucht wird. */
    const nimm = (stufe) => {
      for (const k of roh){
        if (raus.some(x => (x.__quelle || x) === k)) continue;
        const eig = k.eig || [];
        /* Was eine frueh getroffene Entscheidung ausschliesst, kommt gar
           nicht erst zur Wahl - auch nicht auf der Notstufe. */
        if (verboten && eig.some(id => verboten.has(id))) continue;
        const frisch = eig.filter(id => !hier.has(id) && !schonDa.has(id));
        /* Stufe 0: die Karte ist rundum neu.
           Stufe 1: sie bringt wenigstens eine offene Eigenschaft mit.
           Stufe 2: sie kommt auch ohne, damit die Frage voll wird. */
        if (stufe === 0 && frisch.length !== eig.length) continue;
        if (stufe === 1 && !frisch.length && eig.length) continue;
        /* Zugesagt wird immer nur das Frische - so steht dieselbe
           Eigenschaft nie zweimal im selben Draft, ganz gleich auf
           welcher Stufe die Karte hereinkam. Die Karte wird dafuer
           kopiert; der Vorrat in EIGENSCHAFTEN wird fuer jeden
           weiteren Draft unveraendert gebraucht. */
        const karte = (frisch.length === eig.length)
          ? k : Object.assign({}, k, { eig: frisch, __quelle: k });
        raus.push(karte);
        /* ----------------------------------------------------------------
           Gesehen ist nicht bekommen

           Hier stand frueher auch schonDa.add(id) - eine Eigenschaft, die
           in Frage eins nur im ANGEBOT stand, wurde damit aus den Karten
           der Fragen zwei bis vier gestrichen, obwohl der Spieler sie nie
           bekommen hat. Wer mehr Karten sieht, verlor dadurch
           Eigenschaften: gemessen kam ein Spieler bei drei Karten je
           Frage auf 6,45 Eigenschaften und eine Talentgrenze von 87,5,
           bei vier Karten nur noch auf 5,61 und 86,2. Mehr Auswahl machte
           schwaecher, und niemand konnte das sehen.

           "hier" bleibt: innerhalb einer Frage soll dieselbe Eigenschaft
           nicht zweimal nebeneinander stehen, denn genau die sieht man
           gleichzeitig. Ueber die Fragen hinweg zaehlt jetzt, was der
           Spieler tatsaechlich gewaehlt hat - das steht in schonDa, das
           aus seinen Karten befuellt wird.
           ---------------------------------------------------------------- */
        frisch.forEach(id => { hier.add(id); });
        if (raus.length >= soll) return true;
      }
      return raus.length >= soll;
    };
    if (!nimm(0) && !nimm(1)) nimm(2);
    return raus;
  }

  /* ------------------------------------------------------------------
     Was sich gegenseitig ausschliesst

     Wer als Kind ausgewandert ist, kann nicht heimatverbunden sein -
     die Herkunftskarte erzaehlt eine neue Sprache und eine neue Halle,
     und zwei Fragen spaeter stand "Heimatverbunden" zur Wahl. Dasselbe
     gilt fuer andere Paare: wer den Raum traegt, ist kein
     Einzelgaenger, und wessen Koerper alles aushaelt, hat keine
     Glasknochen.

     Ausgeschlossen wird nur, was man wirklich GEWAEHLT hat - was bloss
     zur Auswahl stand, zaehlt nicht.
     ------------------------------------------------------------------ */
  const GEGENSAETZE = {
    weltenbummler:   ['heimverbunden'],
    heimverbunden:   ['weltenbummler', 'heimschwaeche'],
    heimschwaeche:   ['heimverbunden'],
    einzelgaenger:   ['kabinenherz'],
    kabinenherz:     ['einzelgaenger'],
    eisenmann:       ['glasknochen'],
    glasknochen:     ['eisenmann'],
    spaetzuender:    ['wunderkind'],
    wunderkind:      ['spaetzuender'],
    fleissbiene:     ['dickkopf'],
    dickkopf:        ['fleissbiene']
  };

  function fragen(posGruppe, seed, nation, gewaehlt){
    const s0 = String(seed || 'rinkrise');
    /* Was der Spieler schon HAT - nicht, was ihm schon gezeigt wurde.
       Eine Eigenschaft wird nie zweimal zugesagt; eine, die er abgelehnt
       hat, darf spaeter wieder auftauchen. */
    const schonDa = new Set();
    (gewaehlt || []).forEach(k => (k.eig || []).forEach(id => schonDa.add(id)));
    /* Was die bisherigen Entscheidungen ausschliessen. */
    const verboten = new Set();
    (gewaehlt || []).forEach(k => (k.eig || []).forEach(id => {
      (GEGENSAETZE[id] || []).forEach(x => verboten.add(x));
    }));
    return [
      /* Vier Karten statt drei: die Vorraete tragen jetzt zwoelf bis
         dreizehn Eintraege, und wer vier davon sieht, trifft eine Wahl
         statt einer Auswahl. Die Zahl der Zuege bleibt bei vier - der
         Spieler wird also nicht staerker, nur die Wege zu ihm werden
         mehr. */
      /* ----------------------------------------------------------------
         Zwei Fragen statt vier

         Vier Fragen mit je vier Karten waren zwoelf Entscheidungen bis
         zum ersten Bully, und sie haben den Spieler mit Eigenschaften
         zugeschuettet - acht bis neun je Laufbahn, von denen die meisten
         nie zur Sprache kamen. Jetzt sind es zwei Fragen mit je sechs
         Karten: weniger Zuege, mehr Auswahl je Zug, und jede Karte
         traegt schwerer.

         Die zweite Frage zieht aus einem zusammengelegten Vorrat -
         Waffe, Charakter und Preis in einem Topf, sechsunddreissig
         Karten. Damit geht kein Inhalt verloren; im Gegenteil, die
         Auswahl ist bunter als vorher, weil in derselben Frage die
         Staerke, die Kabinenrolle und der Preis nebeneinander stehen
         koennen.
         ---------------------------------------------------------------- */
      { id:'herkunft',  frage:'Wo hast du Eishockey gelernt?',
        text:'Die ersten Jahre prägen mehr als jedes Profitraining.',
        karten: ohneWiederholung(HERKUNFT, s0 + ':h', 6, HERKUNFT_LAND[nation], schonDa, verboten) },
      { id:'wesen',     frage:'Was macht dich aus?',
        text:'Deine Waffe, deine Rolle in der Kabine, der Preis dafür – '
           + 'wähle das eine, was man über dich sagen wird.',
        karten: ohneWiederholung(
          (WAFFE[posGruppe] || WAFFE.skater).concat(CHARAKTER, PREIS),
          s0 + ':m', 6, null, schonDa, verboten) }
    ];
  }

  /* ==================================================================
     Die Jugendjahre

     Zwischen den vier Charakterfragen und der ersten Saison lag nichts -
     dabei ist genau dort die Zeit, in der aus einem Kind ein Spieler
     wird. Drei Momente aus diesen Jahren, je einer aus einem eigenen
     Vorrat, jeder mit drei Antworten.

     Sie machen den Spieler bewusst NICHT staerker: jede Antwort gibt
     etwas und nimmt etwas. Wer hier waehlt, entscheidet, was fuer ein
     Spieler er wird - nicht, wie gut. Sonst waere es nur eine weitere
     Runde Punkte, und das Spiel muesste sie an anderer Stelle wieder
     abziehen.
     ================================================================== */
  const JUGEND = [
    { id:'j_wechsel', frage:'Mit vierzehn kommt das Angebot eines größeren Vereins',
      text:'Zwei Stunden Fahrt, jeden Tag. Bessere Trainer, härtere Konkurrenz, '
         + 'und zu Hause bist du nur noch zum Schlafen.',
      antworten:[
        { n:'Gehen', d:'Der weite Weg, früh angefangen.',
          b:{ zweikampf:4, nerven:4, uebersicht:-9,
              beweglich:4, konstanz:4, lesen:-9 }, eig:['weltenbummler'] },
        { n:'Bleiben', d:'Dieselbe Halle, dieselben Freunde, mehr Eiszeit.',
          b:{ puck:5, praezision:4, zweikampf:-9,
              puckspiel:5, reflexe:4, rebound:-9 }, eig:['heimverbunden'] },
        { n:'Erst zusagen, dann doch absagen', d:'Eine Entscheidung, die du nie ganz getroffen hast.',
          b:{ nerven:-9, uebersicht:5, antritt:3,
              lesen:5, konstanz:-9, stellung:3 }, eig:[] }
      ] },

    { id:'j_verein', frage:'Dein Jugendtrainer wird entlassen',
      text:'Er hat dich sechs Jahre trainiert und einmal zu laut gesagt, was er '
         + 'vom Vorstand hält. Am Montag steht ein anderer auf dem Eis.',
      antworten:[
        { n:'Ihm hinterherziehen', d:'Loyalität kostet ein Jahr.',
          b:{ nerven:4, uebersicht:4, skating:-9,
              lesen:4, konstanz:3, beweglich:-9 }, eig:['dickkopf'] },
        { n:'Bleiben und sich arrangieren', d:'Der Neue hat andere Ideen.',
          b:{ defensive:5, konstanz:4, puck:-9,
              stellung:5, rebound:3, puckspiel:-9 }, eig:['lernwillig'] },
        { n:'Nichts sagen und einfach spielen', d:'Es geht ja um Eishockey.',
          b:{ schuss:4, antritt:4, nerven:-9,
              fanghand:4, beweglich:4, lesen:-9 }, eig:[] }
      ] },

    { id:'j_schule', frage:'Die Schule oder das Eis',
      text:'Der Klassenlehrer sagt, so gehe es nicht weiter. Der Trainer sagt, '
         + 'jetzt entscheide sich alles. Beide haben recht.',
      antworten:[
        { n:'Die Schule durchziehen', d:'Ein Netz für den Fall der Fälle.',
          b:{ uebersicht:6, nerven:4, antritt:-9,
              lesen:6, konstanz:4, beweglich:-9 }, eig:['spaetzuender'] },
        { n:'Alles auf Eishockey', d:'Kein Netz, dafür jeden Tag zwei Einheiten.',
          b:{ antritt:5, schuss:4, uebersicht:-9,
              reflexe:5, beweglich:4, lesen:-9 }, eig:['arbeitstier'] },
        { n:'Beides halb', d:'Und nichts davon ganz.',
          b:{ konstanz:4, praezision:3, nerven:-7, defensive:2,
              stellung:4, fanghand:3 }, eig:[] }
      ] },

    { id:'j_bruch', frage:'Der erste richtige Bruch',
      text:'Handgelenk, im Januar, bei einem Zweikampf, an den sich niemand erinnert. '
         + 'Zehn Wochen Gips, und die halbe Saison ist weg.',
      antworten:[
        { n:'Härter zurückkommen', d:'Der Sommer danach war der härteste.',
          b:{ zweikampf:5, nerven:4, praezision:-9,
              rebound:5, konstanz:4, fanghand:-9 }, eig:['eisenmann'] },
        { n:'Vorsichtiger werden', d:'Man geht anders in die Ecke.',
          b:{ uebersicht:5, defensive:4, zweikampf:-9,
              lesen:5, stellung:4, rebound:-9 }, eig:[] },
        { n:'Die Zeit im Kraftraum verbringen', d:'Alles außer Eis.',
          b:{ schuss:6, zweikampf:4, skating:-9,
              fanghand:6, rebound:4, beweglich:-9 }, eig:['fleissbiene'] }
      ] },

    { id:'j_kapitaen', frage:'Sie machen dich mit sechzehn zum Kapitän',
      text:'Du bist der Jüngste in der Mannschaft und trägst das C. Zwei Ältere '
         + 'finden das nicht richtig, und sie sagen es dir nicht ins Gesicht.',
      antworten:[
        { n:'Es annehmen und vorangehen', d:'Früh Verantwortung, früh Gegenwind.',
          b:{ nerven:6, uebersicht:4, praezision:-9,
              konstanz:6, lesen:4, beweglich:-9 }, eig:['frueheBuerde'] },
        { n:'Ablehnen und einfach spielen', d:'Noch nicht.',
          b:{ schuss:4, antritt:4, nerven:-9,
              reflexe:4, fanghand:4, konstanz:-9 }, eig:[] },
        { n:'Es teilen', d:'Zwei Buchstaben auf zwei Trikots.',
          b:{ pass:5, uebersicht:4, schuss:-9,
              puckspiel:5, lesen:4, fanghand:-9 }, eig:['kabinenherz'] }
      ] },

    { id:'j_ausland', frage:'Ein Sommer im Ausland',
      text:'Ein Camp, sechs Wochen, eine Sprache, die du nicht sprichst, und '
         + 'Trainer, die alles anders machen als zu Hause.',
      antworten:[
        { n:'Alles mitnehmen, was geht', d:'Die Technik verändert sich.',
          b:{ praezision:5, puck:4, zweikampf:-9,
              beweglich:5, puckspiel:4, rebound:-9 }, eig:['lernwillig'] },
        { n:'Bei deinem Stil bleiben', d:'Was zu Hause funktioniert.',
          b:{ zweikampf:5, nerven:4, praezision:-9,
              rebound:5, konstanz:4, beweglich:-9 }, eig:['dickkopf'] },
        { n:'Vor allem Leute kennenlernen', d:'Das Netzwerk zählt auch.',
          b:{ nerven:4, uebersicht:4, schuss:-9,
              konstanz:4, lesen:4, fanghand:-9 }, eig:['medienliebling'] }
      ] },

    { id:'j_geld', frage:'Zu Hause wird das Geld knapp',
      text:'Ausrüstung, Fahrten, Lehrgänge – es summiert sich. Am Küchentisch '
         + 'wird nicht mehr darüber geredet, ob, sondern wie.',
      antworten:[
        { n:'Nebenher arbeiten', d:'Weniger Schlaf, mehr Selbstverständlichkeit.',
          b:{ nerven:5, zweikampf:4, antritt:-9,
              konstanz:5, rebound:4, beweglich:-9 }, eig:['arbeitstier'] },
        { n:'Einen Förderer suchen', d:'Es gibt Leute, die so etwas tun.',
          b:{ uebersicht:4, praezision:4, defensive:-9,
              lesen:4, stellung:4, rebound:-9 }, eig:['medienliebling'] },
        { n:'Mit gebrauchter Ausrüstung spielen', d:'Der Schläger ist zu schwer, aber er hält.',
          b:{ zweikampf:4, schuss:4, praezision:-9,
              fanghand:4, rebound:4, beweglich:-9 }, eig:['strassenkoeter'] }
      ] },

    { id:'j_vorbild', frage:'Der Spieler, dem du alles nachmachst',
      text:'Du hast jedes Spiel von ihm gesehen und seine Bewegungen im Hof '
         + 'nachgestellt, bis sie saßen. Er spielt heute noch.',
      antworten:[
        { n:'Ein Techniker', d:'Hände vor Beinen.',
          b:{ praezision:6, puck:4, zweikampf:-9,
              fanghand:6, puckspiel:4, rebound:-9 }, eig:[] },
        { n:'Ein Arbeiter', d:'Jeder Wechsel bis zum Ende.',
          b:{ zweikampf:6, defensive:4, praezision:-9,
              rebound:6, konstanz:4, fanghand:-9 }, eig:['arbeitstier'] },
        { n:'Ein Denker', d:'Immer zwei Sekunden früher da.',
          b:{ uebersicht:6, pass:4, schuss:-9,
              lesen:6, stellung:4, reflexe:-9 }, eig:['spielmacher'] }
      ] },

    { id:'j_niederlage', frage:'Das Endspiel, das ihr verloren habt',
      text:'Ein Tor Rückstand, achtzehn Sekunden, dein Bully. Du verlierst es. '
         + 'Der Rest ist eine lange Busfahrt.',
      antworten:[
        { n:'Es nie wieder passieren lassen', d:'Ein Jahr Bullytraining.',
          b:{ zweikampf:6, nerven:4, uebersicht:-9,
              reflexe:6, konstanz:4, lesen:-9 }, eig:['kaltbluetig'] },
        { n:'Es abhaken', d:'Es war ein Bully.',
          b:{ nerven:5, antritt:4, defensive:-9,
              konstanz:5, beweglich:4, stellung:-9 }, eig:['eisblock'] },
        { n:'Es mit sich herumtragen', d:'Manche Dinge treiben an.',
          b:{ schuss:5, antritt:4, nerven:-9,
              fanghand:5, reflexe:4, konstanz:-9 }, eig:['einzelgaenger'] }
      ] }
  ];

  /* Drei Momente aus neun, in fester Reihenfolge zum Seed. */
  const JUGEND_RUNDEN = 3;
  function jugendfragen(seed){
    return mische(JUGEND, String(seed || 'rinkrise') + ':jugend', JUGEND_RUNDEN);
  }

  /* Zwei Zuege statt vier - siehe die Begruendung in fragen(). */
  const RUNDEN = 2;

  return { EIGENSCHAFTEN, fragen, RUNDEN, HERKUNFT, CHARAKTER, WAFFE, PREIS,
           JUGEND, JUGEND_RUNDEN, jugendfragen };
})();

if (typeof window !== 'undefined') window.DRAFT = DRAFT;
