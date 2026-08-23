/* ==========================================================
   Eiszeit – Wappen- und Pokalgrafiken

   Alle Embleme werden hier selbst gezeichnet. Es werden keine
   echten Vereinslogos verwendet – die sind markenrechtlich
   geschuetzt. Grundlage sind lediglich die Vereinsfarben, aus
   denen jedes Wappen deterministisch erzeugt wird: gleicher
   Klub, gleiches Emblem.
   ========================================================== */

const WAPPEN = (() => {

  /* ---------- Vereinsfarben (Primaer / Sekundaer) ---------- */
  const FARBEN = {
    // NHL
    'Florida Panthers':['#C8102E','#041E42'], 'Colorado Avalanche':['#6F263D','#236192'],
    'Edmonton Oilers':['#FF4C00','#041E42'],  'Dallas Stars':['#006847','#8F8F8C'],
    'Carolina Hurricanes':['#CC0000','#111111'], 'Vegas Golden Knights':['#B4975A','#333F42'],
    'Toronto Maple Leafs':['#00205B','#E8EEFC'], 'Tampa Bay Lightning':['#002868','#E8EEFC'],
    'New Jersey Devils':['#CE1126','#111111'], 'Winnipeg Jets':['#041E42','#AC162C'],
    'New York Rangers':['#0038A8','#CE1126'],  'Los Angeles Kings':['#22262A','#A2AAAD'],
    'Boston Bruins':['#FFB81C','#111111'],     'Minnesota Wild':['#154734','#A6192E'],
    'Ottawa Senators':['#C8102E','#C2912C'],   'Washington Capitals':['#041E42','#C8102E'],
    'Utah Mammoth':['#6CACE4','#101010'],      'Montreal Canadiens':['#AF1E2D','#192168'],
    'Vancouver Canucks':['#001F5B','#00843D'], 'St. Louis Blues':['#002F87','#FCB514'],
    'Detroit Red Wings':['#CE1126','#E8EEFC'], 'Calgary Flames':['#C8102E','#F1BE48'],
    'Columbus Blue Jackets':['#002654','#CE1126'], 'New York Islanders':['#00539B','#F47D30'],
    'Buffalo Sabres':['#003087','#FFB81C'],    'Philadelphia Flyers':['#F74902','#111111'],
    'Seattle Kraken':['#001628','#99D9D9'],    'Pittsburgh Penguins':['#161616','#FCB514'],
    'Anaheim Ducks':['#F47A38','#B9975B'],     'Nashville Predators':['#FFB81C','#041E42'],
    'Chicago Blackhawks':['#CF0A2C','#111111'],'San Jose Sharks':['#006D75','#EA7200'],

    // DEL
    'Eisbären Berlin':['#0B4EA2','#E30613'],   'EHC Red Bull München':['#E4002B','#001E62'],
    'Adler Mannheim':['#003A70','#E30613'],    'Straubing Tigers':['#F39200','#111111'],
    'Kölner Haie':['#E2001A','#E8EEFC'],       'ERC Ingolstadt':['#E2001A','#111111'],
    'Fischtown Pinguins':['#005AA0','#E8EEFC'],'Grizzlys Wolfsburg':['#009640','#E8EEFC'],
    'Nürnberg Ice Tigers':['#E2001A','#FFED00'],'Düsseldorfer EG':['#E2001A','#E8EEFC'],
    'Iserlohn Roosters':['#005CA9','#E2001A'], 'Löwen Frankfurt':['#E2001A','#111111'],
    'Augsburger Panther':['#009640','#E2001A'],'Schwenninger Wild Wings':['#E2001A','#111111'],
    'Dresdner Eislöwen':['#0069B4','#E8EEFC'],

    // DEL2
    'Kassel Huskies':['#003C7D','#E2001A'],    'Krefeld Pinguine':['#E2001A','#FFED00'],
    'EHC Freiburg':['#E2001A','#111111'],      'Hannover Scorpions':['#009640','#111111'],
    'Ravensburg Towerstars':['#005CA9','#FFED00'], 'Bietigheim Steelers':['#E2001A','#111111'],
    'EV Landshut':['#E2001A','#E8EEFC'],       'Eisbären Regensburg':['#0069B4','#E8EEFC'],
    'Starbulls Rosenheim':['#009640','#E8EEFC'],'Lausitzer Füchse':['#F39200','#111111'],
    'Selber Wölfe':['#E2001A','#111111'],      'EC Bad Nauheim':['#E2001A','#003C7D'],

    // SHL
    'Frölunda HC':['#B4131C','#E8EEFC'],       'Skellefteå AIK':['#D50032','#111111'],
    'Växjö Lakers':['#004B87','#7BAFD4'],      'Färjestad BK':['#005AA0','#FFED00'],
    'Luleå HF':['#004B87','#E8EEFC'],          'Rögle BK':['#004B87','#E2001A'],
    'Djurgårdens IF':['#004B87','#B4131C'],    'HV71':['#FFED00','#004B87'],
    'Brynäs IF':['#004B87','#FFED00'],         'Leksands IF':['#004B87','#E8EEFC'],
    'Linköping HC':['#004B87','#E8EEFC'],      'Malmö Redhawks':['#B4131C','#111111'],
    'Örebro HK':['#111111','#E2001A'],         'Timrå IK':['#E2001A','#E8EEFC'],

    // National League
    'ZSC Lions':['#004B87','#E8EEFC'],         'EV Zug':['#004B87','#E2001A'],
    'SC Bern':['#E2001A','#FFED00'],           'Lausanne HC':['#004B87','#E8EEFC'],
    'Fribourg-Gottéron':['#111111','#E2001A'], 'HC Davos':['#FFED00','#004B87'],
    'Genève-Servette HC':['#B4131C','#111111'],'HC Lugano':['#111111','#E8EEFC'],
    'Rapperswil-Jona Lakers':['#009640','#E8EEFC'], 'EHC Biel-Bienne':['#FFED00','#111111'],
    'HC Ambrì-Piotta':['#004B87','#E8EEFC'],   'SCL Tigers':['#FFED00','#111111'],
    'EHC Kloten':['#E2001A','#E8EEFC'],        'HC Ajoie':['#E2001A','#111111'],

    // Liiga
    'Tappara':['#F39200','#004B87'],           'Ilves':['#009640','#E8EEFC'],
    'Kärpät':['#111111','#F39200'],            'Lukko':['#FFED00','#004B87'],
    'KalPa':['#FFED00','#111111'],             'HIFK':['#E2001A','#004B87'],
    'TPS':['#004B87','#E8EEFC'],               'Pelicans':['#F39200','#111111'],
    'JYP':['#004B87','#FFED00'],               'HPK':['#F39200','#111111'],
    'Jukurit':['#004B87','#E8EEFC'],           'KooKoo':['#009640','#111111'],
    'SaiPa':['#004B87','#E2001A'],             'Ässät':['#E2001A','#111111'],

    // KHL
    'SKA Sankt Petersburg':['#004B87','#E2001A'], 'Metallurg Magnitogorsk':['#004B87','#E8EEFC'],
    'Ak Bars Kasan':['#009640','#E8EEFC'],     'Lokomotive Jaroslawl':['#B4131C','#004B87'],
    'CSKA Moskau':['#B4131C','#004B87'],       'Awangard Omsk':['#B4131C','#111111'],
    'Dynamo Moskau':['#004B87','#E2001A'],     'Traktor Tscheljabinsk':['#111111','#F39200'],
    'Salawat Julajew Ufa':['#009640','#FFED00'],'Spartak Moskau':['#B4131C','#E8EEFC'],
    'Torpedo Nischni Nowgorod':['#004B87','#E8EEFC'], 'Barys Astana':['#FFED00','#004B87'],
    'Amur Chabarowsk':['#004B87','#E2001A'],

    // Extraliga
    'HC Oceláři Třinec':['#111111','#E2001A'], 'HC Sparta Prag':['#B4131C','#FFED00'],
    'HC Dynamo Pardubice':['#B4131C','#004B87'],'HC Kometa Brno':['#004B87','#E8EEFC'],
    'Bílí Tygři Liberec':['#004B87','#FFED00'],'Mountfield HK':['#004B87','#E2001A'],
    'HC Vítkovice Ridera':['#004B87','#E8EEFC'],'HC Škoda Plzeň':['#004B87','#E2001A'],
    'Motor České Budějovice':['#111111','#E2001A'], 'HC Olomouc':['#004B87','#E8EEFC'],

    // AHL / ECHL
    'Hershey Bears':['#7B3F00','#E8EEFC'],     'Laval Rocket':['#AF1E2D','#004B87'],
    'Providence Bruins':['#FFB81C','#111111'], 'Rockford IceHogs':['#B4131C','#111111'],
    'Milwaukee Admirals':['#004B87','#E8EEFC'],'Bakersfield Condors':['#F47A38','#111111'],
    'Coachella Valley Firebirds':['#E2001A','#111111'],
    'Wilkes-Barre/Scranton Penguins':['#161616','#FCB514'],

    // ICE / Slowakei
    'EC Red Bull Salzburg':['#E4002B','#001E62'], 'Vienna Capitals':['#004B87','#E8EEFC'],
    'EC KAC':['#E2001A','#E8EEFC'],            'HC Slovan Bratislava':['#004B87','#E8EEFC'],
    'HC Košice':['#FFED00','#111111'],         'HK Nitra':['#004B87','#FFED00'],

    // Junioren
    'London Knights':['#009640','#FFED00'],    'Frölunda HC J20':['#B4131C','#E8EEFC'],
    'Rimouski Océanic':['#004B87','#E8EEFC'],  'Portland Winterhawks':['#111111','#E2001A'],
    'Kärpät U20':['#111111','#F39200'],        'Jungadler Mannheim':['#003A70','#E30613'],
    'GCK Lions U20':['#004B87','#E8EEFC']
  };

  /* Ersatzpalette fuer Klubs ohne hinterlegte Farben */
  const PALETTE = [
    ['#004B87','#E8EEFC'], ['#B4131C','#111111'], ['#009640','#FFED00'],
    ['#F39200','#111111'], ['#5B2C8D','#E8EEFC'], ['#00707A','#F0A202'],
    ['#111111','#C0C6D4'], ['#1E3A8A','#F97316'], ['#7B1E3A','#E8C57A']
  ];

  function hash(str){
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++){
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function farben(name){
    if (FARBEN[name]) return FARBEN[name];
    return PALETTE[hash(name) % PALETTE.length];
  }

  /* Kuerzel aus dem Vereinsnamen: bis zu drei Buchstaben */
  function kuerzel(name){
    const stop = ['HC','HK','EC','EHC','SC','EV','IF','BK','AIK','SK','MHk','FC','II','U20','J20'];
    const woerter = String(name).replace(/[^\p{L}\p{N} .-]/gu, '')
      .split(/[\s.-]+/).filter(Boolean);
    const kern = woerter.filter(w => !stop.includes(w));
    const quelle = kern.length ? kern : woerter;
    if (quelle.length === 1) return quelle[0].slice(0, 3).toUpperCase();
    return quelle.slice(0, 3).map(w => w[0]).join('').toUpperCase();
  }

  /* ---------- Wappen zeichnen ---------- */
  function wappen(name, groesse){
    const g = groesse || 34;
    const h = hash(name);
    const [c1, c2] = farben(name);
    const form = h % 4;            // Schild, Rund, Sechseck, Raute
    const muster = (h >>> 3) % 5;  // Balken, Diagonale, Sparren, Teilung, Ring
    const id = 'w' + (h % 100000);
    const txt = kuerzel(name);
    const hell = istHell(c1) ? '#111820' : '#ffffff';

    const umriss = {
      0: 'M50 4 L92 18 V52 C92 76 72 92 50 96 C28 92 8 76 8 52 V18 Z',
      1: 'M50 4 A46 46 0 1 1 49.9 4 Z',
      2: 'M50 4 L89 27 V73 L50 96 L11 73 V27 Z',
      3: 'M50 2 L96 50 L50 98 L4 50 Z'
    }[form];

    const musterSvg = {
      0: `<rect x="0" y="40" width="100" height="20" fill="${c2}"/>`,
      1: `<path d="M-10 96 L96 -10 L120 14 L14 120 Z" fill="${c2}"/>`,
      2: `<path d="M50 22 L96 62 V86 L50 46 L4 86 V62 Z" fill="${c2}"/>`,
      3: `<rect x="50" y="0" width="50" height="100" fill="${c2}"/>`,
      4: `<circle cx="50" cy="50" r="30" fill="none" stroke="${c2}" stroke-width="11"/>`
    }[muster];

    return `<svg class="wappen" viewBox="0 0 100 100" width="${g}" height="${g}"
      role="img" aria-label="Wappen ${escAttr(name)}">
      <defs>
        <clipPath id="${id}"><path d="${umriss}"/></clipPath>
        <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff" stop-opacity=".22"/>
          <stop offset="1" stop-color="#000000" stop-opacity=".28"/>
        </linearGradient>
      </defs>
      <g clip-path="url(#${id})">
        <rect width="100" height="100" fill="${c1}"/>
        ${musterSvg}
        <rect width="100" height="100" fill="url(#${id}g)"/>
      </g>
      <path d="${umriss}" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="4"/>
      <text x="50" y="50" text-anchor="middle" dominant-baseline="central"
        font-family="Bebas Neue, Arial Narrow, sans-serif" font-size="40"
        fill="${hell}" stroke="rgba(0,0,0,.35)" stroke-width="1">${escAttr(txt)}</text>
    </svg>`;
  }

  function istHell(hex){
    const c = hex.replace('#','');
    const r = parseInt(c.slice(0,2),16), g = parseInt(c.slice(2,4),16), b = parseInt(c.slice(4,6),16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 150;
  }
  function escAttr(s){
    return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  /* ==========================================================
     Pokale und Abzeichen – ebenfalls selbst gezeichnet
     ========================================================== */
  const POKAL_ART = {
    lg_NHL:'cup', lg_KHL:'cup', lg_AHL:'cup', lg_ECHL:'cup',
    lg_SHL:'schale', lg_LII:'schale', lg_NL:'schild', lg_DEL:'schild',
    lg_CZE:'schild', lg_ICE:'schild', lg_SVKL:'schild', lg_DEL2:'schild',
    lg_VHL:'cup', lg_ALL:'schild', lg_SL:'schild', lg_DK:'schild',
    lg_MES:'schild', lg_CZE2:'schild', lg_JUN:'schild',
    int_olympia:'medaille-gold', int_olySilber:'medaille-silber', int_olyBronze:'medaille-bronze',
    int_wm:'medaille-gold', int_wmSilber:'medaille-silber', int_wmBronze:'medaille-bronze',
    int_chl:'schale', int_spengler:'cup', int_winter:'stern',
    int_wmMvp:'statue', int_wmAllstar:'stern'
  };

  /* Einzelauszeichnungen: eigene Form und eigenes Metall je Art */
  const AW_ART = {
    mvp:       ['statue',  'gold'],
    topscorer: ['schale',  'gold'],
    torjaeger: ['puck',    'gold'],
    vorlagen:  ['ring',    'silber'],
    bestD:     ['schild',  'stahl'],
    bestG:     ['maske',   'stahl'],
    selke:     ['schild',  'bronze'],
    rookie:    ['stern',   'silber'],
    playoffMvp:['cup',     'gold'],
    poTop:     ['flamme',  'gold'],
    allstar:   ['stern',   'stahl'],
    allstar1:  ['stern',   'gold'],
    plusminus: ['plakette','silber'],
    ironman:   ['plakette','bronze'],
    comeback:  ['ring',    'bronze'],
    fairplay:  ['plakette','stahl'],
    torwartDuo:['maske',   'silber']
  };

  function awSchluessel(key){
    const m = String(key).match(/^aw_([a-zA-Z0-9]+)_/);
    return m ? m[1] : null;
  }
  function pokalArt(key){
    if (POKAL_ART[key]) return POKAL_ART[key];
    const aw = awSchluessel(key);
    if (aw && AW_ART[aw]) return AW_ART[aw][0];
    if (String(key).indexOf('aw_') === 0) return 'statue';
    return 'schild';
  }
  function pokalMetall(key){
    const aw = awSchluessel(key);
    if (aw && AW_ART[aw]) return AW_ART[aw][1];
    return null;
  }

  const METALL = {
    gold:   ['#ffe9a8','#e0a63c','#8a5f14'],
    silber: ['#f2f5fa','#b9c2d0','#6f7a8b'],
    bronze: ['#f0c9a0','#c07a3e','#7a4519'],
    stahl:  ['#dff1ff','#7fb6d8','#2f5f80']
  };

  function pokal(key, groesse, metall){
    const g = groesse || 40;
    const art = pokalArt(key);
    const m = metall || pokalMetall(key)
                     || (art.indexOf('silber') > 0 ? 'silber'
                       : art.indexOf('bronze') > 0 ? 'bronze' : 'gold');
    const [hellF, mittelF, dunkelF] = METALL[m] || METALL.gold;
    const id = 'p' + hash(key + art + m) % 100000;
    const verlauf = `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${hellF}"/>
        <stop offset=".45" stop-color="${mittelF}"/>
        <stop offset="1" stop-color="${dunkelF}"/>
      </linearGradient>`;

    const koerper = {
      cup: `<path d="M30 14 h40 v18 a20 20 0 0 1 -40 0 z" fill="url(#${id})"/>
            <path d="M30 18 h-9 a9 9 0 0 0 9 12 z M70 18 h9 a9 9 0 0 1 -9 12 z" fill="url(#${id})"/>
            <rect x="46" y="50" width="8" height="14" fill="url(#${id})"/>
            <rect x="34" y="64" width="32" height="7" rx="2" fill="url(#${id})"/>
            <rect x="29" y="71" width="42" height="9" rx="2" fill="${dunkelF}"/>`,
      schale:`<path d="M22 24 h56 l-7 20 a22 22 0 0 1 -42 0 z" fill="url(#${id})"/>
            <rect x="46" y="62" width="8" height="9" fill="url(#${id})"/>
            <rect x="30" y="71" width="40" height="9" rx="2" fill="${dunkelF}"/>`,
      schild:`<path d="M50 14 L78 22 v24 c0 18 -14 28 -28 34 c-14 -6 -28 -16 -28 -34 V22 Z"
              fill="url(#${id})"/>
            <path d="M50 24 L68 29 v16 c0 11 -9 18 -18 22 c-9 -4 -18 -11 -18 -22 V29 Z"
              fill="rgba(0,0,0,.18)"/>`,
      statue:`<circle cx="50" cy="28" r="11" fill="url(#${id})"/>
            <path d="M42 40 h16 l6 22 h-28 z" fill="url(#${id})"/>
            <path d="M40 42 L26 56 l5 5 l12 -11 z M60 42 L74 56 l-5 5 l-12 -11 z" fill="url(#${id})"/>
            <rect x="32" y="64" width="36" height="8" rx="2" fill="${dunkelF}"/>
            <rect x="28" y="72" width="44" height="8" rx="2" fill="${dunkelF}"/>`,
      stern: `<path d="M50 12 l11 23 25 4 -18 18 4 25 -22 -12 -22 12 4 -25 -18 -18 25 -4 z"
              fill="url(#${id})"/>`,
      puck:  `<ellipse cx="50" cy="38" rx="30" ry="11" fill="${hellF}"/>
              <rect x="20" y="38" width="60" height="24" fill="url(#${id})"/>
              <ellipse cx="50" cy="62" rx="30" ry="11" fill="${dunkelF}"/>
              <rect x="28" y="72" width="44" height="8" rx="2" fill="${dunkelF}"/>`,
      maske: `<path d="M50 12 c19 0 28 14 28 32 c0 20 -12 34 -28 34 c-16 0 -28 -14 -28 -34
                c0 -18 9 -32 28 -32 z" fill="url(#${id})"/>
              <ellipse cx="38" cy="42" rx="7" ry="5" fill="rgba(0,0,0,.5)"/>
              <ellipse cx="62" cy="42" rx="7" ry="5" fill="rgba(0,0,0,.5)"/>
              <path d="M38 60 h24 M40 68 h20" stroke="rgba(0,0,0,.45)" stroke-width="4"
                stroke-linecap="round" fill="none"/>`,
      ring:  `<circle cx="50" cy="46" r="26" fill="none" stroke="url(#${id})" stroke-width="12"/>
              <circle cx="50" cy="20" r="9" fill="${hellF}"/>
              <rect x="30" y="74" width="40" height="8" rx="2" fill="${dunkelF}"/>`,
      flamme:`<path d="M50 8 c14 18 24 26 24 42 a24 24 0 0 1 -48 0 c0 -12 8 -18 14 -28
                c3 8 6 11 10 14 c-2 -12 -4 -18 0 -28 z" fill="url(#${id})"/>
              <path d="M50 40 c6 8 10 12 10 20 a10 10 0 0 1 -20 0 c0 -8 4 -12 10 -20 z"
                fill="${hellF}" opacity=".75"/>`,
      plakette:`<rect x="18" y="16" width="64" height="56" rx="6" fill="url(#${id})"/>
              <rect x="26" y="24" width="48" height="40" rx="4" fill="rgba(0,0,0,.22)"/>
              <path d="M50 34 l6 12 13 2 -9.5 9 2 13 -11.5 -6 -11.5 6 2 -13 -9.5 -9 13 -2 z"
                fill="${hellF}"/>
              <rect x="30" y="74" width="40" height="8" rx="2" fill="${dunkelF}"/>`
    };
    const inhalt = koerper[art.split('-')[0]] || koerper.schild;

    if (art.indexOf('medaille') === 0){
      return `<svg class="pokal" viewBox="0 0 100 100" width="${g}" height="${g}" role="img">
        <defs>${verlauf}</defs>
        <path d="M35 8 L48 44 h-14 z M65 8 L52 44 h14 z" fill="#3b4a66"/>
        <circle cx="50" cy="62" r="26" fill="url(#${id})"/>
        <circle cx="50" cy="62" r="18" fill="none" stroke="rgba(0,0,0,.22)" stroke-width="3"/>
      </svg>`;
    }
    return `<svg class="pokal" viewBox="0 0 100 100" width="${g}" height="${g}" role="img">
      <defs>${verlauf}</defs>${inhalt}</svg>`;
  }

  return { wappen, pokal, farben, kuerzel, pokalArt, pokalMetall };
})();

if (typeof window !== 'undefined') window.WAPPEN = WAPPEN;

/* ==========================================================
   Szenenbilder fuer Karriereereignisse
   Selbst gezeichnete Stimmungsbilder, kein Fotomaterial.
   ========================================================== */
const SZENE = (() => {

  const HIMMEL = {
    kabine: ['#0d1a1c','#14322f','#f2b45c'],
    eis:    ['#08131f','#123b56','#a8e6ff'],
    presse: ['#12101a','#2b1f3d','#ffd86a'],
    buero:  ['#131017','#332a22','#ffbf6b'],
    stadt:  ['#0a0f1a','#1b2740','#8fb6ff']
  };

  function bild(art){
    const [dunkel, mittel, licht] = HIMMEL[art] || HIMMEL.eis;
    const id = 'sz' + art;
    const inhalt = {
      /* Kabine: Türrahmen mit Gegenlicht, Silhouette, sitzende Reihen */
      kabine: `
        <rect width="600" height="300" fill="${dunkel}"/>
        <rect x="238" y="40" width="124" height="260" fill="${licht}" opacity=".92"/>
        <rect x="238" y="40" width="124" height="260" fill="url(#${id}glow)"/>
        <path d="M300 74 c22 0 30 16 30 34 c0 10 -3 16 -3 22 l14 130 h-82 l14 -130
          c0 -6 -3 -12 -3 -22 c0 -18 8 -34 30 -34 z" fill="#05070c"/>
        <g fill="${mittel}" opacity=".95">
          <rect x="8" y="150" width="70" height="150" rx="8"/>
          <rect x="86" y="168" width="62" height="132" rx="8"/>
          <rect x="156" y="182" width="56" height="118" rx="8"/>
          <rect x="388" y="182" width="56" height="118" rx="8"/>
          <rect x="452" y="168" width="62" height="132" rx="8"/>
          <rect x="522" y="150" width="70" height="150" rx="8"/>
        </g>
        <g fill="#e9f3ee" opacity=".55">
          <rect x="18" y="196" width="50" height="16" rx="6"/>
          <rect x="94" y="212" width="46" height="14" rx="6"/>
          <rect x="396" y="224" width="42" height="13" rx="6"/>
          <rect x="530" y="196" width="50" height="16" rx="6"/>
        </g>
        <circle cx="300" cy="286" r="7" fill="#d8e6ff" opacity=".9"/>`,

      /* Eis: Bande, Kreise, Scheinwerferkegel */
      eis: `
        <rect width="600" height="300" fill="${dunkel}"/>
        <ellipse cx="300" cy="250" rx="360" ry="120" fill="${mittel}" opacity=".75"/>
        <path d="M120 0 L300 300 L60 300 Z" fill="${licht}" opacity=".13"/>
        <path d="M470 0 L560 300 L360 300 Z" fill="${licht}" opacity=".09"/>
        <circle cx="300" cy="250" r="78" fill="none" stroke="#ff6b7a" stroke-width="3" opacity=".55"/>
        <path d="M300 130 V300" stroke="#ff6b7a" stroke-width="3" opacity=".45"/>
        <path d="M110 190 H490" stroke="${licht}" stroke-width="3" opacity=".3"/>
        <g fill="#05070c">
          <path d="M236 176 c10 0 14 8 14 16 l6 62 -18 4 -8 -46 -10 44 -18 -3 12 -60 c0 -10 8 -17 22 -17 z"/>
          <path d="M370 168 c11 0 16 9 16 18 l8 70 -20 4 -8 -50 -12 48 -19 -4 14 -66 c0 -12 9 -20 21 -20 z"/>
        </g>
        <circle cx="300" cy="292" r="6" fill="#0b0f18"/>`,

      /* Presse: Mikrofone und Blitzlicht */
      presse: `
        <rect width="600" height="300" fill="${dunkel}"/>
        <rect width="600" height="300" fill="url(#${id}glow)"/>
        <g fill="${mittel}">
          <rect x="120" y="150" width="26" height="150" rx="13"/>
          <rect x="180" y="176" width="22" height="124" rx="11"/>
          <rect x="404" y="164" width="24" height="136" rx="12"/>
          <rect x="460" y="186" width="20" height="114" rx="10"/>
        </g>
        <g fill="${licht}">
          <ellipse cx="133" cy="146" rx="20" ry="24"/>
          <ellipse cx="191" cy="172" rx="17" ry="20"/>
          <ellipse cx="416" cy="160" rx="18" ry="22"/>
          <ellipse cx="470" cy="182" rx="15" ry="18"/>
        </g>
        <path d="M270 108 c26 0 40 20 40 42 c0 12 -4 20 -4 26 l12 124 h-96 l12 -124
          c0 -6 -4 -14 -4 -26 c0 -22 14 -42 40 -42 z" fill="#05070c"/>
        <g fill="${licht}" opacity=".85">
          <circle cx="66" cy="70" r="9"/><circle cx="520" cy="52" r="7"/>
          <circle cx="352" cy="44" r="6"/><circle cx="150" cy="40" r="5"/>
        </g>`,

      /* Buero: Fenster, Schreibtisch, Taktiktafel */
      buero: `
        <rect width="600" height="300" fill="${dunkel}"/>
        <rect x="330" y="30" width="230" height="150" rx="6" fill="${licht}" opacity=".85"/>
        <rect x="330" y="30" width="230" height="150" fill="url(#${id}glow)"/>
        <path d="M330 105 H560 M445 30 V180" stroke="${dunkel}" stroke-width="7" opacity=".7"/>
        <rect x="40" y="60" width="200" height="120" rx="6" fill="#f2f6ff" opacity=".9"/>
        <g stroke="#c8102e" stroke-width="4" fill="none" opacity=".8">
          <path d="M64 150 C100 96 150 132 200 88"/>
          <circle cx="200" cy="88" r="8"/>
        </g>
        <g fill="#38d1ff" opacity=".85">
          <circle cx="84" cy="122" r="7"/><circle cx="126" cy="104" r="7"/><circle cx="164" cy="140" r="7"/>
        </g>
        <rect x="0" y="216" width="600" height="84" fill="${mittel}"/>
        <rect x="60" y="196" width="150" height="22" rx="5" fill="#05070c" opacity=".65"/>`,

      /* Stadt: naechtliche Skyline mit einem hellen Fenster */
      stadt: `
        <rect width="600" height="300" fill="${dunkel}"/>
        <circle cx="480" cy="70" r="34" fill="${licht}" opacity=".28"/>
        <g fill="${mittel}">
          <rect x="20" y="140" width="80" height="160"/><rect x="112" y="100" width="66" height="200"/>
          <rect x="190" y="168" width="72" height="132"/><rect x="274" y="120" width="58" height="180"/>
          <rect x="344" y="186" width="80" height="114"/><rect x="436" y="146" width="62" height="154"/>
          <rect x="510" y="192" width="76" height="108"/>
        </g>
        <g fill="${licht}" opacity=".55">
          <rect x="34" y="160" width="12" height="16"/><rect x="60" y="196" width="12" height="16"/>
          <rect x="126" y="128" width="12" height="16"/><rect x="152" y="176" width="12" height="16"/>
          <rect x="288" y="150" width="12" height="16"/><rect x="452" y="176" width="12" height="16"/>
          <rect x="536" y="220" width="12" height="16"/>
        </g>
        <rect x="126" y="220" width="18" height="24" fill="#ffe6a8"/>`
    }[art] || '';

    return `<svg class="szene" viewBox="0 0 600 300" preserveAspectRatio="xMidYMid slice"
      role="img" aria-hidden="true">
      <defs>
        <radialGradient id="${id}glow" cx="50%" cy="35%" r="70%">
          <stop offset="0" stop-color="${licht}" stop-opacity=".55"/>
          <stop offset="1" stop-color="${licht}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      ${inhalt}
      <rect width="600" height="300" fill="url(#${id}vig)"/>
      <defs><linearGradient id="${id}vig" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#000" stop-opacity=".18"/>
        <stop offset=".6" stop-color="#000" stop-opacity="0"/>
        <stop offset="1" stop-color="#000" stop-opacity=".55"/>
      </linearGradient></defs>
    </svg>`;
  }

  return { bild };
})();

if (typeof window !== 'undefined') window.SZENE = SZENE;
