/* ==========================================================
   Puckero – Spieldaten
   Ligen, Klubs, Trophäen und Attribute

   Klub-, Liga- und Trophäennamen sind reale Bezeichnungen. Die
   Stärkewerte, Gewichtungen und Punktzahlen sind reine Spielbalance
   und keine Aussage über die tatsächliche Leistungsfähigkeit der
   Vereine. Puckero ist ein Fanprojekt ohne Lizenz oder Verbindung
   zu Ligen, Verbänden oder Klubs.
   ========================================================== */

const PUCKERO_DATA = (() => {

  /* ---------- Attribute ---------- */
  const ATTRS = {
    skater: [
      { k: 'antritt',   n: 'Antritt' },
      { k: 'skating',   n: 'Skating' },
      { k: 'schuss',    n: 'Schusskraft' },
      { k: 'praezision',n: 'Präzision' },
      { k: 'puck',      n: 'Puckkontrolle' },
      { k: 'pass',      n: 'Passspiel' },
      { k: 'uebersicht',n: 'Übersicht' },
      { k: 'zweikampf', n: 'Zweikampf' },
      { k: 'defensive', n: 'Defensive' },
      { k: 'nerven',    n: 'Nervenstärke' }
    ],
    goalie: [
      { k: 'reflexe',   n: 'Reflexe' },
      { k: 'stellung',  n: 'Stellungsspiel' },
      { k: 'fanghand',  n: 'Fanghand' },
      { k: 'stockhand', n: 'Stockhand' },
      { k: 'rebound',   n: 'Rebound-Kontrolle' },
      { k: 'puckspiel', n: 'Puckspiel' },
      { k: 'beweglich', n: 'Beweglichkeit' },
      { k: 'konstanz',  n: 'Konstanz' },
      { k: 'lesen',     n: 'Spiel lesen' },
      { k: 'nerven',    n: 'Nervenstärke' }
    ]
  };

  /* ---------- Positionen ---------- */
  const POSITIONS = [
    {
      k: 'C', n: 'Center', group: 'skater',
      desc: 'Der Motor der Reihe: Bullys, Spielaufbau, Verantwortung in beide Richtungen.',
      w: { antritt:1.0, skating:1.0, schuss:1.0, praezision:1.1, puck:1.3, pass:1.4, uebersicht:1.4, zweikampf:.9, defensive:1.0, nerven:1.1 },
      goalRate: .34, assistRate: .62
    },
    {
      k: 'LW', n: 'Linker Flügel', group: 'skater',
      desc: 'Tempo außen, Abschluss im Slot. Lebt von Antritt und Timing.',
      w: { antritt:1.4, skating:1.3, schuss:1.3, praezision:1.3, puck:1.1, pass:.9, uebersicht:.9, zweikampf:.9, defensive:.8, nerven:1.1 },
      goalRate: .46, assistRate: .48
    },
    {
      k: 'RW', n: 'Rechter Flügel', group: 'skater',
      desc: 'Der klassische Vollstrecker am langen Pfosten und im Konter.',
      w: { antritt:1.35, skating:1.25, schuss:1.4, praezision:1.35, puck:1.1, pass:.9, uebersicht:.9, zweikampf:.95, defensive:.8, nerven:1.1 },
      goalRate: .48, assistRate: .46
    },
    {
      k: 'D', n: 'Verteidiger', group: 'skater',
      desc: 'Erste Passstation, Powerplay-Quarterback oder Abrissbirne vor dem Tor.',
      w: { antritt:.9, skating:1.3, schuss:1.1, praezision:1.0, puck:1.1, pass:1.3, uebersicht:1.2, zweikampf:1.4, defensive:1.6, nerven:1.1 },
      goalRate: .14, assistRate: .52
    },
    {
      k: 'G', n: 'Torhüter', group: 'goalie',
      desc: 'Der letzte Mann. Eine schlechte Nacht kostet eine ganze Serie.',
      w: { reflexe:1.5, stellung:1.4, fanghand:1.2, stockhand:1.0, rebound:1.2, puckspiel:.7, beweglich:1.2, konstanz:1.4, lesen:1.3, nerven:1.4 },
      goalRate: 0, assistRate: .03
    }
  ];

  /* ---------- Nationen ---------- */
  const NATIONS = [
    { k:'CAN', n:'Kanada',      flag:'🇨🇦', bonus:{ puck:3, uebersicht:2 }, wm:96 },
    { k:'USA', n:'USA',         flag:'🇺🇸', bonus:{ antritt:3, schuss:2 },  wm:92 },
    { k:'SWE', n:'Schweden',    flag:'🇸🇪', bonus:{ pass:3, skating:2 },    wm:90 },
    { k:'FIN', n:'Finnland',    flag:'🇫🇮', bonus:{ defensive:3, nerven:2 },wm:88 },
    { k:'RUS', n:'Russland',    flag:'🇷🇺', bonus:{ praezision:3, puck:2 }, wm:88 },
    { k:'CZE', n:'Tschechien',  flag:'🇨🇿', bonus:{ uebersicht:3, praezision:2 }, wm:82 },
    { k:'GER', n:'Deutschland', flag:'🇩🇪', bonus:{ zweikampf:3, nerven:2 },wm:74 },
    { k:'SUI', n:'Schweiz',     flag:'🇨🇭', bonus:{ skating:3, defensive:2 },wm:72 },
    { k:'SVK', n:'Slowakei',    flag:'🇸🇰', bonus:{ schuss:3, zweikampf:2 },wm:68 },
    { k:'LAT', n:'Lettland',    flag:'🇱🇻', bonus:{ nerven:4, defensive:2 },wm:58 },
    { k:'AUT', n:'Österreich',  flag:'🇦🇹', bonus:{ nerven:3, antritt:2 },  wm:54 },
    { k:'DEN', n:'Dänemark',    flag:'🇩🇰', bonus:{ pass:3, nerven:2 },     wm:60 },
    { k:'NOR', n:'Norwegen',    flag:'🇳🇴', bonus:{ skating:3, zweikampf:2 },wm:56 }
  ];

  /* ---------- Ligen ----------
     level    = sportliches Niveau (beeinflusst die Punkteausbeute)
     prestige = Gewicht einer Meisterschaft in der Legendenwertung          */
  const LEAGUES = [
    { k:'NHL',  n:'NHL',                land:'Nordamerika',  level:100, prestige:100, salary:1.0,
      title:'Stanley Cup',              titleShort:'Stanley Cup' },
    { k:'KHL',  n:'KHL',                land:'Osteuropa',    level:82,  prestige:62,  salary:.72,
      title:'Gagarin Cup',              titleShort:'Gagarin Cup' },
    { k:'SHL',  n:'SHL',                land:'Schweden',     level:78,  prestige:58,  salary:.42,
      title:'Le-Mat-Pokal',             titleShort:'Le-Mat-Pokal' },
    { k:'NL',   n:'National League',    land:'Schweiz',      level:74,  prestige:52,  salary:.48,
      title:'Schweizer Meisterschaft',  titleShort:'NL-Titel' },
    { k:'LII',  n:'Liiga',              land:'Finnland',     level:73,  prestige:50,  salary:.34,
      title:'Kanada-Malja',             titleShort:'Kanada-Malja' },
    { k:'DEL',  n:'DEL',                land:'Deutschland',  level:70,  prestige:46,  salary:.38,
      title:'Deutsche Meisterschaft',   titleShort:'DEL-Titel' },
    { k:'CZE',  n:'Extraliga',          land:'Tschechien',   level:69,  prestige:44,  salary:.30,
      title:'Tschechische Meisterschaft', titleShort:'Extraliga-Titel' },
    { k:'AHL',  n:'AHL',                land:'Nordamerika',  level:58,  prestige:14,  salary:.14,
      title:'Calder Cup',               titleShort:'Calder Cup' },
    { k:'ICE',  n:'ICE Hockey League',  land:'Österreich',  level:66,  prestige:30,  salary:.24,
      title:'ICE-Meisterschaft',        titleShort:'ICE-Titel' },
    { k:'SVKL', n:'Slovenská extraliga', land:'Slowakei',     level:64,  prestige:26,  salary:.20,
      title:'Slowakische Meisterschaft',titleShort:'SVK-Titel' },
    { k:'VHL',  n:'VHL',                 land:'Russland',     level:63,  prestige:22,  salary:.18,
      title:'Bratina-Pokal',            titleShort:'Bratina-Pokal' },
    { k:'ALL',  n:'HockeyAllsvenskan',   land:'Schweden',     level:63,  prestige:21,  salary:.17,
      title:'Allsvenskan-Sieg',         titleShort:'Allsvenskan' },
    { k:'SL',   n:'Swiss League',        land:'Schweiz',      level:61,  prestige:20,  salary:.19,
      title:'Swiss-League-Titel',       titleShort:'SL-Titel' },
    { k:'DEL2', n:'DEL2',                land:'Deutschland',  level:59,  prestige:18,  salary:.15,
      title:'DEL2-Meisterschaft',       titleShort:'DEL2-Titel' },
    { k:'DK',   n:'Metal Ligaen',        land:'Dänemark',    level:57,  prestige:17,  salary:.13,
      title:'Dänische Meisterschaft',  titleShort:'DK-Titel' },
    { k:'MES',  n:'Mestis',              land:'Finnland',     level:58,  prestige:16,  salary:.12,
      title:'Mestis-Titel',             titleShort:'Mestis' },
    { k:'CZE2', n:'Chance liga',         land:'Tschechien',   level:58,  prestige:16,  salary:.12,
      title:'Chance-liga-Titel',        titleShort:'Chance liga' },
    { k:'ECHL', n:'ECHL',                land:'Nordamerika',  level:52,  prestige:10,  salary:.08,
      title:'Kelly Cup',                titleShort:'Kelly Cup' },
    { k:'JUN',  n:'Juniorenliga',       land:'International',level:40,  prestige:6,   salary:.03,
      title:'Junioren-Meisterschaft',   titleShort:'Junioren-Titel' }
  ];

  /* ---------- Klubs ----------
     str = Spielstärke im Rahmen dieser Simulation (eigene Einschätzung)     */
  const CLUBS = [
    // ---- NHL ----
    { n:'Florida Panthers',        lg:'NHL', str:91 },
    { n:'Colorado Avalanche',      lg:'NHL', str:90 },
    { n:'Edmonton Oilers',         lg:'NHL', str:89 },
    { n:'Dallas Stars',            lg:'NHL', str:88 },
    { n:'Carolina Hurricanes',     lg:'NHL', str:87 },
    { n:'Vegas Golden Knights',    lg:'NHL', str:87 },
    { n:'Toronto Maple Leafs',     lg:'NHL', str:85 },
    { n:'Tampa Bay Lightning',     lg:'NHL', str:85 },
    { n:'New Jersey Devils',       lg:'NHL', str:84 },
    { n:'Winnipeg Jets',           lg:'NHL', str:84 },
    { n:'New York Rangers',        lg:'NHL', str:83 },
    { n:'Los Angeles Kings',       lg:'NHL', str:82 },
    { n:'Boston Bruins',           lg:'NHL', str:81 },
    { n:'Minnesota Wild',          lg:'NHL', str:80 },
    { n:'Ottawa Senators',         lg:'NHL', str:79 },
    { n:'Washington Capitals',     lg:'NHL', str:79 },
    { n:'Utah Mammoth',            lg:'NHL', str:78 },
    { n:'Montreal Canadiens',      lg:'NHL', str:77 },
    { n:'Vancouver Canucks',       lg:'NHL', str:77 },
    { n:'St. Louis Blues',         lg:'NHL', str:76 },
    { n:'Detroit Red Wings',       lg:'NHL', str:76 },
    { n:'Calgary Flames',          lg:'NHL', str:75 },
    { n:'Columbus Blue Jackets',   lg:'NHL', str:75 },
    { n:'New York Islanders',      lg:'NHL', str:74 },
    { n:'Buffalo Sabres',          lg:'NHL', str:73 },
    { n:'Philadelphia Flyers',     lg:'NHL', str:73 },
    { n:'Seattle Kraken',          lg:'NHL', str:72 },
    { n:'Pittsburgh Penguins',     lg:'NHL', str:72 },
    { n:'Anaheim Ducks',           lg:'NHL', str:71 },
    { n:'Nashville Predators',     lg:'NHL', str:71 },
    { n:'Chicago Blackhawks',      lg:'NHL', str:70 },
    { n:'San Jose Sharks',         lg:'NHL', str:68 },

    // ---- KHL ----
    { n:'SKA Sankt Petersburg',    lg:'KHL', str:83 },
    { n:'Metallurg Magnitogorsk',  lg:'KHL', str:82 },
    { n:'Ak Bars Kasan',           lg:'KHL', str:81 },
    { n:'Lokomotive Jaroslawl',    lg:'KHL', str:80 },
    { n:'CSKA Moskau',             lg:'KHL', str:79 },
    { n:'Awangard Omsk',           lg:'KHL', str:78 },
    { n:'Dynamo Moskau',           lg:'KHL', str:77 },
    { n:'Traktor Tscheljabinsk',   lg:'KHL', str:76 },
    { n:'Salawat Julajew Ufa',     lg:'KHL', str:74 },
    { n:'Spartak Moskau',          lg:'KHL', str:73 },
    { n:'Torpedo Nischni Nowgorod',lg:'KHL', str:72 },
    { n:'Barys Astana',            lg:'KHL', str:69 },
    { n:'Amur Chabarowsk',         lg:'KHL', str:66 },

    // ---- SHL ----
    { n:'Frölunda HC',             lg:'SHL', str:80 },
    { n:'Skellefteå AIK',          lg:'SHL', str:80 },
    { n:'Växjö Lakers',            lg:'SHL', str:78 },
    { n:'Färjestad BK',            lg:'SHL', str:77 },
    { n:'Luleå HF',                lg:'SHL', str:75 },
    { n:'Rögle BK',                lg:'SHL', str:74 },
    { n:'Djurgårdens IF',          lg:'SHL', str:73 },
    { n:'HV71',                    lg:'SHL', str:72 },
    { n:'Brynäs IF',               lg:'SHL', str:71 },
    { n:'Leksands IF',             lg:'SHL', str:70 },
    { n:'Linköping HC',            lg:'SHL', str:69 },
    { n:'Malmö Redhawks',          lg:'SHL', str:69 },
    { n:'Örebro HK',               lg:'SHL', str:68 },
    { n:'Timrå IK',                lg:'SHL', str:67 },

    // ---- National League ----
    { n:'ZSC Lions',               lg:'NL',  str:79 },
    { n:'EV Zug',                  lg:'NL',  str:77 },
    { n:'SC Bern',                 lg:'NL',  str:75 },
    { n:'Lausanne HC',             lg:'NL',  str:74 },
    { n:'Fribourg-Gottéron',       lg:'NL',  str:73 },
    { n:'HC Davos',                lg:'NL',  str:73 },
    { n:'Genève-Servette HC',      lg:'NL',  str:72 },
    { n:'HC Lugano',               lg:'NL',  str:70 },
    { n:'Rapperswil-Jona Lakers',  lg:'NL',  str:69 },
    { n:'EHC Biel-Bienne',         lg:'NL',  str:68 },
    { n:'HC Ambrì-Piotta',         lg:'NL',  str:66 },
    { n:'SCL Tigers',              lg:'NL',  str:65 },
    { n:'EHC Kloten',              lg:'NL',  str:65 },
    { n:'HC Ajoie',                lg:'NL',  str:62 },

    // ---- Liiga ----
    { n:'Tappara',                 lg:'LII', str:78 },
    { n:'Ilves',                   lg:'LII', str:75 },
    { n:'Kärpät',                  lg:'LII', str:74 },
    { n:'Lukko',                   lg:'LII', str:72 },
    { n:'KalPa',                   lg:'LII', str:71 },
    { n:'HIFK',                    lg:'LII', str:71 },
    { n:'TPS',                     lg:'LII', str:70 },
    { n:'Pelicans',                lg:'LII', str:69 },
    { n:'JYP',                     lg:'LII', str:68 },
    { n:'HPK',                     lg:'LII', str:67 },
    { n:'Jukurit',                 lg:'LII', str:66 },
    { n:'KooKoo',                  lg:'LII', str:65 },
    { n:'SaiPa',                   lg:'LII', str:64 },
    { n:'Ässät',                   lg:'LII', str:64 },

    // ---- DEL ----
    { n:'Eisbären Berlin',         lg:'DEL', str:77 },
    { n:'EHC Red Bull München',    lg:'DEL', str:76 },
    { n:'Adler Mannheim',          lg:'DEL', str:74 },
    { n:'Straubing Tigers',        lg:'DEL', str:72 },
    { n:'Kölner Haie',             lg:'DEL', str:71 },
    { n:'ERC Ingolstadt',          lg:'DEL', str:70 },
    { n:'Fischtown Pinguins',      lg:'DEL', str:70 },
    { n:'Grizzlys Wolfsburg',      lg:'DEL', str:68 },
    { n:'Nürnberg Ice Tigers',     lg:'DEL', str:67 },
    { n:'Düsseldorfer EG',         lg:'DEL', str:66 },
    { n:'Iserlohn Roosters',       lg:'DEL', str:64 },
    { n:'Löwen Frankfurt',         lg:'DEL', str:64 },
    { n:'Augsburger Panther',      lg:'DEL', str:63 },
    { n:'Schwenninger Wild Wings', lg:'DEL', str:62 },
    { n:'Dresdner Eislöwen',       lg:'DEL', str:60 },
    { n:'Krefeld Pinguine',        lg:'DEL', str:61 },

    // ---- Extraliga ----
    { n:'HC Oceláři Třinec',       lg:'CZE', str:75 },
    { n:'HC Sparta Prag',          lg:'CZE', str:73 },
    { n:'HC Dynamo Pardubice',     lg:'CZE', str:73 },
    { n:'HC Kometa Brno',          lg:'CZE', str:71 },
    { n:'Bílí Tygři Liberec',      lg:'CZE', str:69 },
    { n:'Mountfield HK',           lg:'CZE', str:68 },
    { n:'HC Vítkovice Ridera',     lg:'CZE', str:66 },
    { n:'HC Škoda Plzeň',          lg:'CZE', str:65 },
    { n:'Motor České Budějovice',  lg:'CZE', str:64 },
    { n:'HC Olomouc',              lg:'CZE', str:62 },

    // ---- AHL ----
    { n:'Hershey Bears',           lg:'AHL', str:62 },
    { n:'Coachella Valley Firebirds', lg:'AHL', str:61 },
    { n:'Laval Rocket',            lg:'AHL', str:60 },
    { n:'Wilkes-Barre/Scranton Penguins', lg:'AHL', str:59 },
    { n:'Milwaukee Admirals',      lg:'AHL', str:59 },
    { n:'Providence Bruins',       lg:'AHL', str:58 },
    { n:'Rockford IceHogs',        lg:'AHL', str:57 },
    { n:'Bakersfield Condors',     lg:'AHL', str:56 },

    // ---- ICE Hockey League ----
    { n:'EC Red Bull Salzburg',    lg:'ICE', str:70 },
    { n:'Vienna Capitals',         lg:'ICE', str:67 },
    { n:'HCB Südtirol Alperia',   lg:'ICE', str:66 },
    { n:'EC KAC',                  lg:'ICE', str:66 },
    { n:'HK Olimpija Ljubljana',   lg:'ICE', str:62 },
    { n:'HC Pustertal',            lg:'ICE', str:63 },
    { n:'Fehérvár AV19',           lg:'ICE', str:62 },
    { n:'Graz99ers',               lg:'ICE', str:60 },

    // ---- Slovenská extraliga ----
    { n:'HC Slovan Bratislava',    lg:'SVKL', str:66 },
    { n:'HC Košice',               lg:'SVKL', str:65 },
    { n:'HK Nitra',                lg:'SVKL', str:64 },
    { n:'HK Poprad',               lg:'SVKL', str:62 },
    { n:'HK Spišská Nová Ves',     lg:'SVKL', str:59 },
    { n:'MHk 32 Liptovský Mikuláš',lg:'SVKL', str:57 },

    // ---- VHL ----
    { n:'Rubin Tjumen',            lg:'VHL', str:64 },
    { n:'SKA-Neva',                lg:'VHL', str:63 },
    { n:'Torpedo-Gorki',           lg:'VHL', str:62 },
    { n:'Buran Woronesch',         lg:'VHL', str:61 },
    { n:'Zvezda Moskau',           lg:'VHL', str:60 },
    { n:'Chimik Woskressensk',     lg:'VHL', str:59 },

    // ---- HockeyAllsvenskan ----
    { n:'Modo Hockey',             lg:'ALL', str:64 },
    { n:'AIK',                     lg:'ALL', str:63 },
    { n:'Björklöven',            lg:'ALL', str:63 },
    { n:'Södertälje SK',         lg:'ALL', str:60 },
    { n:'Almtuna IS',              lg:'ALL', str:57 },
    { n:'Nybro Vikings',           lg:'ALL', str:56 },

    // ---- Swiss League ----
    { n:'EHC Olten',               lg:'SL',  str:62 },
    { n:'HC La Chaux-de-Fonds',    lg:'SL',  str:61 },
    { n:'SC Langenthal',           lg:'SL',  str:60 },
    { n:'EHC Visp',                lg:'SL',  str:59 },
    { n:'GCK Lions',               lg:'SL',  str:57 },
    { n:'HC Sierre',               lg:'SL',  str:56 },

    // ---- DEL2 ----
    { n:'Kassel Huskies',          lg:'DEL2',str:61 },
    { n:'Ravensburg Towerstars',   lg:'DEL2',str:60 },
    { n:'Bietigheim Steelers',     lg:'DEL2',str:59 },
    { n:'EV Landshut',             lg:'DEL2',str:58 },
    { n:'Eisbären Regensburg',    lg:'DEL2',str:57 },
    { n:'Starbulls Rosenheim',     lg:'DEL2',str:56 },
    { n:'Lausitzer Füchse',       lg:'DEL2',str:55 },
    { n:'Selber Wölfe',           lg:'DEL2',str:54 },
    { n:'EC Bad Nauheim',          lg:'DEL2',str:55 },
    { n:'EHC Freiburg',            lg:'DEL2',str:57 },
    { n:'Hannover Scorpions',      lg:'DEL2',str:56 },

    // ---- Metal Ligaen ----
    { n:'Aalborg Pirates',         lg:'DK',  str:60 },
    { n:'Herning Blue Fox',        lg:'DK',  str:59 },
    { n:'Rungsted Seier Capital',  lg:'DK',  str:58 },
    { n:'Esbjerg Energy',          lg:'DK',  str:57 },
    { n:'Odense Bulldogs',         lg:'DK',  str:55 },

    // ---- Mestis ----
    { n:'Kiekko-Espoo',            lg:'MES', str:58 },
    { n:'TUTO Hockey',             lg:'MES', str:57 },
    { n:'RoKi Rovaniemi',          lg:'MES', str:56 },
    { n:'Hokki',                   lg:'MES', str:55 },
    { n:'Kettärä',                 lg:'MES', str:54 },

    // ---- Chance liga ----
    { n:'HC Slavia Prag',          lg:'CZE2',str:59 },
    { n:'HC Dukla Jihlava',        lg:'CZE2',str:58 },
    { n:'HC Zlín',                 lg:'CZE2',str:57 },
    { n:'HC Poruba',               lg:'CZE2',str:55 },
    { n:'Stadion Litoměrice',      lg:'CZE2',str:54 },

    // ---- ECHL ----
    { n:'Florida Everblades',      lg:'ECHL',str:55 },
    { n:'Toledo Walleye',          lg:'ECHL',str:54 },
    { n:'Idaho Steelheads',        lg:'ECHL',str:54 },
    { n:'Fort Wayne Komets',       lg:'ECHL',str:53 },
    { n:'Wheeling Nailers',        lg:'ECHL',str:51 },
    { n:'Reading Royals',          lg:'ECHL',str:50 },

    // ---- Junioren ----
    { n:'London Knights',          lg:'JUN', str:46 },
    { n:'Frölunda HC J20',         lg:'JUN', str:45 },
    { n:'Rimouski Océanic',        lg:'JUN', str:44 },
    { n:'Portland Winterhawks',    lg:'JUN', str:44 },
    { n:'Kärpät U20',              lg:'JUN', str:42 },
    { n:'Jungadler Mannheim',      lg:'JUN', str:40 },
    { n:'GCK Lions U20',           lg:'JUN', str:39 }
  ];

  /* ---------- Individuelle Auszeichnungen ----------
     nhl = Name in der NHL, n = Bezeichnung in den übrigen Ligen            */
  const AWARDS = {
    mvp:      { n:'Wertvollster Spieler der Liga', nhl:'Hart Memorial Trophy',
                short:'MVP',       pts:26, icon:'🏆' },
    topscorer:{ n:'Topscorer der Liga',            nhl:'Art Ross Trophy',
                short:'Topscorer', pts:18, icon:'📈' },
    torjaeger:{ n:'Torschützenkönig',              nhl:'Maurice-Richard-Trophy',
                short:'Torjäger',  pts:16, icon:'🎯' },
    bestD:    { n:'Bester Verteidiger',            nhl:'James-Norris-Trophy',
                short:'Bester D',  pts:18, icon:'🛡' },
    bestG:    { n:'Bester Torhüter',               nhl:'Vezina Trophy',
                short:'Bester G',  pts:18, icon:'🥅' },
    rookie:   { n:'Rookie des Jahres',             nhl:'Calder Memorial Trophy',
                short:'Rookie',    pts:12, icon:'🌟' },
    playoffMvp:{n:'Playoff-MVP',                   nhl:'Conn Smythe Trophy',
                short:'PO-MVP',    pts:22, icon:'👑' },
    allstar:  { n:'All-Star-Team',                 nhl:'NHL All-Star Team',
                short:'All-Star',  pts:6,  icon:'⭐' },
    fairplay: { n:'Fairplay-Auszeichnung',         nhl:'Lady-Byng-Trophy',
                short:'Fairplay',  pts:5,  icon:'🤝' },
    comeback: { n:'Comeback des Jahres',           nhl:'Bill-Masterton-Trophy',
                short:'Comeback',  pts:8,  icon:'🔁' },
    selke:    { n:'Bester defensiver Stürmer',     nhl:'Frank-J.-Selke-Trophy',
                short:'Selke',     pts:16, icon:'🧱' },
    plusminus:{ n:'Bester Plus/Minus-Wert',        nhl:'NHL Plus/Minus-Bester',
                short:'+/-',       pts:9,  icon:'➕' },
    vorlagen: { n:'Meiste Vorlagen der Liga',      nhl:'Meiste Vorlagen der NHL',
                short:'Vorlagen',  pts:12, icon:'🎁' },
    ironman:  { n:'Alle Spiele bestritten',        nhl:'Iron-Man-Saison',
                short:'Ironman',   pts:7,  icon:'🔩' },
    poTop:    { n:'Topscorer der Playoffs',        nhl:'Topscorer der Playoffs',
                short:'PO-Top',    pts:14, icon:'🔥' },
    allstar1: { n:'Erstes All-Star-Team',          nhl:'NHL First All-Star Team',
                short:'1st Team',  pts:11, icon:'🌟' },
    torwartDuo:{n:'Wenigste Gegentore der Liga',   nhl:'William-M.-Jennings-Trophy',
                short:'Jennings',  pts:11, icon:'🧤' }
  };

  /* ---------- Internationale Titel ---------- */
  const INTL = {
    olympia:  { n:'Olympiagold',             pts:34, icon:'🥇' },
    olySilber:{ n:'Olympiasilber',           pts:16, icon:'🥈' },
    wm:       { n:'Weltmeister',             pts:24, icon:'🌍' },
    wmSilber: { n:'WM-Silber',               pts:10, icon:'🥈' },
    chl:      { n:'Champions Hockey League', pts:14, icon:'🏅' },
    spengler: { n:'Spengler Cup',            pts:7,  icon:'❄' },
    winter:   { n:'Winter Classic',          pts:5,  icon:'🌨' },
    wmBronze: { n:'WM-Bronze',               pts:5,  icon:'🥉' },
    olyBronze:{ n:'Olympia-Bronze',          pts:8,  icon:'🥉' },
    wmMvp:    { n:'Wertvollster Spieler der WM', pts:15, icon:'🌟' },
    wmAllstar:{ n:'WM-All-Star-Team',        pts:7,  icon:'⭐' },
    u20Gold:  { n:'U20-Weltmeister',         pts:12, icon:'🥇' },
    u20Silber:{ n:'U20-Silber',              pts:6,  icon:'🥈' },
    u20Bronze:{ n:'U20-Bronze',              pts:4,  icon:'🥉' },
    u18Gold:  { n:'U18-Weltmeister',         pts:8,  icon:'🥇' },
    u18Silber:{ n:'U18-Silber',              pts:4,  icon:'🥈' },
    u18Bronze:{ n:'U18-Bronze',              pts:3,  icon:'🥉' }
  };

  /* ---------- Turniere der Nationalmannschaft ---------- */
  const TURNIERE = {
    u18:     { n:'U18-Weltmeisterschaft', kurz:'U18', spiele:7,  stufe:'U18' },
    u20:     { n:'U20-Weltmeisterschaft', kurz:'U20', spiele:7,  stufe:'U20' },
    wm:      { n:'Weltmeisterschaft',     kurz:'WM',  spiele:10, stufe:'A' },
    olympia: { n:'Olympische Spiele', kurz:'Olympia', spiele:6,  stufe:'A' }
  };

  /* ---------- Erzählbausteine ----------
     Werden je nach Saisonverlauf eingestreut und geben der Laufbahn Farbe. */
  const STORY = {
    gut: [
      'Die Fangkurve singt deinen Namen, wenn du aufs Eis kommst.',
      'Die Sportpresse nennt dich den Schlüsselspieler der Saison.',
      'Dein Trikot ist im Fanshop zuerst ausverkauft.',
      'Ein Zeitungskolumnist schreibt, gegen dich zu verteidigen sei Zeitverschwendung.',
      'Der Trainer stellt seine erste Reihe komplett um dich herum auf.'
    ],
    schlecht: [
      'Die Lokalzeitung fragt öffentlich, ob dein Vertrag noch gerechtfertigt ist.',
      'Beim Heimspiel gibt es Pfiffe, als deine Reihe aufs Eis geht.',
      'Der Trainer setzt dich in einem wichtigen Spiel auf die Bank.',
      'Du rutschst in die vierte Reihe und bekommst kaum noch Eiszeit.',
      'Ein Talent aus dem Nachwuchs nimmt dir Minuten weg.'
    ],
    neutral: [
      'Die Mannschaft zieht im Trainingslager an einem Strang.',
      'Ein Trainerwechsel mitten in der Saison bringt Unruhe in die Kabine.',
      'Das Derby gegen den Nachbarn wird zum Saisonhöhepunkt.',
      'Ein Bandencheck in der Vorbereitung sorgt für Gesprächsstoff.',
      'Die Halle wird umgebaut – ihr spielt ein halbes Jahr auswärts.',
      'Ein Rivale aus der Nachbarstadt sucht in jedem Spiel deine Nähe.'
    ],
    ankunft: [
      'Bei der Vorstellung sitzen mehr Kameras im Raum als erwartet.',
      'Die Kabine nimmt dich freundlich, aber abwartend auf.',
      'Man erwartet hier sofort Ergebnisse – Geduld ist keine Tugend des Klubs.',
      'Ein Landsmann im Team erleichtert dir die ersten Wochen.'
    ],
    kapitaen: [
      'Das C auf der Brust ändert, wie die Kabine dich ansieht.',
      'Der Trainer sagt, er brauche deine Stimme mehr als deine Tore.'
    ]
  };

  /* ---------- Verletzungsarten ----------
     dauer = ungefaehre Ausfallzeit in Spielen, schwere = Verschleisswirkung */
  const VERLETZUNGEN = [
    { n:'Muskelfaserriss im Oberschenkel', min:4,  max:10, schwere:0 },
    { n:'Handgelenksprellung',             min:3,  max:8,  schwere:0 },
    { n:'Bänderriss im Sprunggelenk',      min:10, max:20, schwere:1 },
    { n:'Schulterluxation',                min:12, max:24, schwere:1 },
    { n:'Gehirnerschütterung',             min:8,  max:22, schwere:2 },
    { n:'Handbruch nach Schussblock',      min:9,  max:18, schwere:1 },
    { n:'Rückenprobleme',                  min:6,  max:16, schwere:1 },
    { n:'Kreuzbandriss',                   min:26, max:48, schwere:3 },
    { n:'Kufenschnitt am Unterarm',        min:5,  max:12, schwere:0 },
    { n:'Leistenverletzung',               min:7,  max:15, schwere:1 },
    { n:'Jochbeinbruch',                   min:6,  max:14, schwere:1 },
    { n:'Innenbandriss im Knie',           min:14, max:30, schwere:2 }
  ];

  /* ---------- Rollen im Team ----------
     Wird bei jeder Vertragsunterschrift gewaehlt und gilt fuer dessen Laufzeit. */
  const ROLLEN = [
    { k:'offensiv', n:'Als Scorer verpflichtet', icon:'🎯',
      d:'Du sollst treffen. Alles andere interessiert den Trainer weniger.',
      w:{ punkte:0.16, plus:-6, risiko:0, eiszeit:1.5, gehalt:1.10 } },
    { k:'zweiweg', n:'Als Zweiwegspieler', icon:'⚖',
      d:'Beide Enden des Eises. Weniger Ruhm, mehr Vertrauen.',
      w:{ punkte:0.02, plus:8, risiko:0, eiszeit:1.0, gehalt:1.0, selke:0.18 } },
    { k:'defensiv', n:'Als defensiver Anker', icon:'🧱',
      d:'Unterzahl, letzte Minute, gegnerische Paradereihe. Deine Nacht beginnt, wenn es eng wird.',
      w:{ punkte:-0.14, plus:14, risiko:0.01, eiszeit:1.2, gehalt:0.95, selke:0.3 } },
    { k:'physisch', n:'Als körperlicher Faktor', icon:'💪',
      d:'Du sollst wehtun, den Slot räumen und die Reihe schützen.',
      w:{ punkte:-0.08, plus:4, risiko:0.05, strafen:1.8, eiszeit:0.8, gehalt:0.9, moral:6 } }
  ];
  const ROLLEN_G = [
    { k:'stamm', n:'Als klare Nummer eins', icon:'🥅',
      d:'Siebzig Spiele, keine Diskussion. Und keine Ausrede.',
      w:{ anteil:0.16, risiko:0.03, gehalt:1.12 } },
    { k:'teilung', n:'Als Teil eines Duos', icon:'🤝',
      d:'Geteilte Last, geteilte Verantwortung – und ein frischerer Körper im April.',
      w:{ anteil:-0.10, risiko:-0.04, gehalt:0.95, playoff:4 } },
    { k:'aufbau', n:'Als Entwicklungsprojekt', icon:'🌱',
      d:'Weniger Spiele, mehr Training. Der Klub baut dich langsam auf.',
      w:{ anteil:-0.16, gehalt:0.8, training:2 } }
  ];

  /* ---------- Saisonhoehepunkte ----------
     Ein herausragendes Spiel pro Saison, je nach Ausbeute. */
  const HOEHEPUNKTE = {
    skater: [
      { ab:5, t:'Fünf Scorerpunkte in einem Spiel gegen {gegner}' },
      { ab:4, t:'Vier Punkte beim Auswärtssieg in {gegner}' },
      { ab:3, t:'Hattrick gegen {gegner} – Puck mit nach Hause genommen' },
      { ab:2, t:'Doppelpack in der Verlängerung gegen {gegner}' },
      { ab:1, t:'Siegtreffer 14 Sekunden vor Schluss gegen {gegner}' },
      { ab:0, t:'Ein stiller Abend gegen {gegner}, aber die Reihe stand' }
    ],
    goalie: [
      { ab:5, t:'Shutout mit 48 Paraden gegen {gegner}' },
      { ab:4, t:'41 Paraden beim knappen Sieg über {gegner}' },
      { ab:3, t:'Penaltyschießen gegen {gegner} – alle drei gehalten' },
      { ab:2, t:'Zwei Minuten vor Schluss den Ausgleich verhindert gegen {gegner}' },
      { ab:1, t:'Solider Arbeitssieg gegen {gegner}' },
      { ab:0, t:'Ein Abend zum Vergessen in {gegner}' }
    ]
  };

  /* ---------- Vermaechtnis ---------- */
  const VERMAECHTNIS = [
    { id:'statue',   n:'Statue vor der Halle',        icon:'🗿',
      d:'Der Klub stellt dich in Bronze vor den Haupteingang.' },
    { id:'hof',      n:'Aufnahme in die Ruhmeshalle', icon:'🏛',
      d:'Erste Abstimmungsrunde, deutliche Mehrheit.' },
    { id:'nummer',   n:'Rückennummer gesperrt',       icon:'🎽',
      d:'Deine Nummer hängt unter dem Hallendach und wird nicht mehr vergeben.' },
    { id:'kapitaen', n:'Ehrenkapitän',                icon:'🅲',
      d:'Der Klub verleiht dir das Amt auf Lebenszeit.' },
    { id:'trainer',  n:'Rolle im Trainerstab',        icon:'📋',
      d:'Man will dein Wissen behalten und bietet dir einen Platz an der Bande.' },
    { id:'nachwuchs',n:'Nachwuchsakademie benannt',   icon:'🎓',
      d:'Die Jugendabteilung trägt künftig deinen Namen.' },
    { id:'legende',  n:'Klublegende',                 icon:'⭐',
      d:'Bei jedem Jubiläum wirst du als Erster eingeladen.' }
  ];

  /* ---------- Karriereenden ---------- */
  const ENDEN = {
    ruhestand:  { n:'Regulärer Rücktritt',
                  t:'Nach einer letzten Saison hängst du die Schlittschuhe an den Nagel.' },
    vertraglos: { n:'Kein Vertrag mehr',
                  t:'Das Telefon bleibt still. Kein Klub meldet sich – so endet es leise.' },
    verletzung: { n:'Verletzungsbedingtes Karriereende',
                  t:'Die Ärzte sind sich einig: Ein weiterer Check könnte bleibende Schäden hinterlassen.' },
    hoehepunkt: { n:'Rücktritt auf dem Höhepunkt',
                  t:'Mit dem Pokal in den Händen erklärst du noch auf dem Eis deinen Rücktritt.' },
    familie:    { n:'Rücktritt aus persönlichen Gründen',
                  t:'Zwanzig Jahre Koffer, Hotels und Nachtflüge sind genug. Die Familie kommt zuerst.' },
    verschleiss:{ n:'Der Körper hat genug',
                  t:'Zu viele Operationen, zu viele Reha-Monate. Irgendwann ist die Rechnung fällig.' },
    heimkehr:   { n:'Abschied in der Heimat',
                  t:'Eine letzte Saison dort, wo alles angefangen hat – dann ist Schluss.' }
  };


  /* ---------- Zufallsnamen für Schnellkarrieren ---------- */
  const FIRST = ['Elias','Mika','Nils','Jonas','Lasse','Tim','Leon','Fabian','Marek','Viktor','Anton','Rasmus','Oskar','Kalle','Henri','Milan','Tobias','Jesper','Aleks','Dominik','Sven','Patrik','Robin','Nico','Emil'];
  const LAST  = ['Bergström','Holzmann','Kovar','Nurmi','Lindqvist','Wagner','Petrov','Haas','Vogel','Salo','Marek','Brandt','Sorensen','Novak','Keller','Ruud','Lindner','Jarvi','Sandberg','Frei','Kuznetsov','Baumann','Rautio','Steiner','Malik'];


  /* ==========================================================
     Herausforderungen – Ziele, die über alle Spielarten hinweg gelten.
     Jede prüft eine abgeschlossene Karriere.
     ========================================================== */
  const HEIM_LIGA = { CAN:'NHL', USA:'NHL', SWE:'SHL', FIN:'LII', RUS:'KHL',
                      CZE:'CZE', SVK:'CZE', GER:'DEL', SUI:'NL',
                      AUT:'DEL', LAT:'DEL', DEN:'DEL', NOR:'SHL' };

  const hatTrophaee = (res, key) => res.trophies.some(t => t.k === key);
  const profiSaisons = res => res.seasons.filter(s => s.lg !== 'JUN');

  const HERAUSFORDERUNGEN = [
    { id:'erstesEis', icon:'🏒', n:'Erstes Eis',
      d:'Spiel eine Karriere bis zum Rücktritt durch.',
      pruef: res => res.seasons.length > 0 },

    { id:'stanley', icon:'🏆', n:'Der Pokal',
      d:'Gewinn den Stanley Cup.',
      pruef: res => hatTrophaee(res, 'lg_NHL') },

    { id:'gagarin', icon:'❄', n:'Ostroute',
      d:'Gewinn den Gagarin Cup in der KHL.',
      pruef: res => hatTrophaee(res, 'lg_KHL') },

    { id:'heimtitel', icon:'🏠', n:'Daheim ganz oben',
      d:'Werde Meister in der höchsten Liga deines eigenen Landes.',
      pruef: res => hatTrophaee(res, 'lg_' + (HEIM_LIGA[res.player.nation] || 'NHL')) },

    { id:'doppelgold', icon:'🥇', n:'Doppelgold',
      d:'Gewinn Olympiagold und den WM-Titel in einer Karriere.',
      pruef: res => hatTrophaee(res, 'int_olympia') && hatTrophaee(res, 'int_wm') },

    { id:'europapokal', icon:'🏅', n:'Europapokal',
      d:'Gewinn die Champions Hockey League.',
      pruef: res => hatTrophaee(res, 'int_chl') },

    { id:'tausend', icon:'💯', n:'Der Tausender',
      d:'Sammle 1000 Scorerpunkte als Feldspieler.',
      pruef: res => !res.isG && res.totals.p >= 1000 },

    { id:'eisenmann', icon:'🔩', n:'Eisenmann',
      d:'Bestreite 1000 Pflichtspiele.',
      pruef: res => res.totals.gp >= 1000 },

    { id:'wall', icon:'🥅', n:'Die Wand',
      d:'Halte als Torhüter 50 Spiele zu null.',
      pruef: res => res.isG && res.totals.so >= 50 },

    { id:'weltenbummler', icon:'🌍', n:'Weltenbummler',
      d:'Spiel in mindestens fünf verschiedenen Profiligen.',
      pruef: res => new Set(profiSaisons(res).map(s => s.lg)).size >= 5 },

    { id:'treu', icon:'💙', n:'Einvereinsmann',
      d:'Verbring mindestens acht Profisaisons bei ein und demselben Klub – und nur dort.',
      pruef: res => {
        const p = profiSaisons(res);
        return p.length >= 8 && new Set(p.map(s => s.club)).size === 1;
      } },

    { id:'unsterblich', icon:'👑', n:'Unsterblich',
      d:'Erreiche den höchsten Rang der Legendenwertung.',
      pruef: res => res.rank.n === 'Unsterblich' },

    { id:'purist', icon:'🙈', n:'Blind zum Star',
      d:'Erreiche im Puristenmodus mindestens den Rang Topstar.',
      pruef: res => res.player.mode === 'blind' && res.legacy >= 430 },

    { id:'spaetform', icon:'🕰', n:'Späte Blüte',
      d:'Gewinn mit 33 Jahren oder älter noch eine Einzelauszeichnung.',
      pruef: res => res.seasons.some(s => s.age >= 33 && s.awards && s.awards.length > 0) },

    /* ---- Ziele fuer die Entscheidungen einer Laufbahn.
       Die Schwellen sind an gemessenen Verlaeufen geeicht: mehr als drei
       Erzaehlstraenge kamen in 250 Karrieren nie vor, und der Median
       liegt bei 21 erfuellten Saisonzielen. ---- */

    { id:'ausstieg', icon:'🛫', n:'Der Ausstieg',
      d:'Handle eine Ausstiegsklausel aus und verlass den Klub damit mitten in der Saison.',
      pruef: res => (res.verlauf || []).some(v =>
                      v.gelungen && /Ausstiegsklausel/.test(v.wahl || ''))
                 && res.seasons.some(s => s.wechselVon) },

    { id:'faeden', icon:'🧵', n:'Drei Fäden',
      d:'Öffne in einer Laufbahn drei verschiedene Erzählstränge.',
      pruef: res => (res.freigeschaltet || []).length >= 3 },

    { id:'jahrgangsbester', icon:'🥇', n:'Bester deines Jahrgangs',
      d:'Beende die Karriere an der Spitze deines Draftjahrgangs.',
      pruef: res => {
        const st = res.jahrgangStand || [];
        const ich = st.find(x => x.eigen);
        return !!ich && ich.platz === 1;
      } },

    { id:'wagemut', icon:'🎲', n:'Gegen jede Wahrscheinlichkeit',
      d:'Setz dich bei einer Entscheidung durch, die höchstens 25 Prozent Aussicht hatte.',
      pruef: res => (res.verlauf || []).some(v => v.gelungen && v.chance <= 25) },

    { id:'immerdabei', icon:'🇺🇳', n:'Immer dabei',
      d:'Spiel mindestens acht Turniere für dein Land, ohne je abzusagen.',
      pruef: res => (res.natAbsagen || 0) === 0
                 && ((res.laenderBilanz || {}).turniere || 0) >= 8 },

    { id:'zweibinden', icon:'👑', n:'Zwei Binden',
      d:'Trag das C bei deinem Klub und bei der Nationalmannschaft.',
      pruef: res => !!res.natKapitaen && res.seasons.some(s => s.kapitaen) },

    { id:'wortgetreu', icon:'📋', n:'Wortgetreu',
      d:'Erfüll im Lauf der Karriere dreißig Saisonziele.',
      pruef: res => ((res.zielBilanz || {}).erfuellt || 0) >= 30 },

    { id:'heimkehr', icon:'🔙', n:'Heimkehr',
      d:'Spiel noch einmal für einen Klub, den du zwischenzeitlich verlassen hattest.',
      pruef: res => {
        const gesehen = new Set();
        let letzter = null, zurueck = false;
        res.seasons.forEach(s => {
          if (s.club === letzter) return;
          if (gesehen.has(s.club)) zurueck = true;
          gesehen.add(s.club);
          letzter = s.club;
        });
        return zurueck;
      } }
  ];

  return { ATTRS, POSITIONS, NATIONS, LEAGUES, CLUBS, AWARDS, INTL, TURNIERE,
           VERLETZUNGEN, ROLLEN, ROLLEN_G, HOEHEPUNKTE, VERMAECHTNIS,
           STORY, ENDEN, HERAUSFORDERUNGEN, HEIM_LIGA, FIRST, LAST };
})();

if (typeof window !== 'undefined') window.PUCKERO_DATA = PUCKERO_DATA;
