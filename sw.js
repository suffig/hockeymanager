/* ==========================================================
   RINKRISE – Offlinespeicher

   Die Seite wirbt seit jeher damit, offline zu funktionieren.
   Bisher stimmte das nur, solange der Browser die Dateien noch im
   eigenen Zwischenspeicher hatte. Hier wird daraus ein Versprechen.

   Zwei Regeln:
   - Fremde Adressen (Supabase, Schriften, das SDK) fasst dieser
     Speicher nicht an. Eine Anmeldung darf niemals aus einem alten
     Zwischenstand beantwortet werden.
   - Seiten und Programmdateien kommen aus dem Netz, wenn es geht,
     und aus dem Speicher, wenn nicht. Waeren die Seiten frisch und
     die Skripte alt, traefe neues HTML auf alten Programmcode - das
     geht schief. Nur Bilder und Symbole kommen zuerst aus dem
     Speicher; sie aendern sich mit ihrem Dateinamen.
   ========================================================== */

const VERSION = 'rinkrise-5b670464';
const SCHALE = [
  './',
  './index.html',
  './guides.html',
  './herausforderungen.html',
  './pokalraum.html',
  './bestenliste.html',
  './schnellkarriere.html',
  './taeglich.html',
  './konto.html',
  './assets/style.css?v=5b670464',
  './assets/data.js?v=5b670464',
  './assets/draft.js?v=5b670464',
  './assets/engine.js?v=5b670464',
  './assets/ereignisse.js?v=5b670464',
  './assets/wappen.js?v=5b670464',
  './assets/ui.js?v=5b670464',
  './assets/game.js?v=5b670464',
  './assets/konto-config.js?v=5b670464',
  './assets/konto.js?v=5b670464',
  './assets/bestenliste.js?v=5b670464',
  './manifest.json?v=5b670464',
  './assets/app/symbol-192.png',
  './assets/app/symbol-512.png',
  /* Das Logo gehoert in die Schale: ohne es zeigt die Seite offline
     eine leere Kopfzeile. */
  './assets/rinkrise-240.webp',
  './assets/app/marke-96.png'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const speicher = await caches.open(VERSION);
    /* Einzeln ablegen: faellt eine Datei aus, soll nicht die ganze
       Installation scheitern. */
    await Promise.all(SCHALE.map(pfad =>
      speicher.add(pfad).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const namen = await caches.keys();
    await Promise.all(namen.filter(n => n !== VERSION).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const anfrage = e.request;
  if (anfrage.method !== 'GET') return;

  const url = new URL(anfrage.url);
  // Fremde Adressen unberuehrt lassen - besonders die Datenbank
  if (url.origin !== self.location.origin) return;

  const istSeite = anfrage.mode === 'navigate'
                || (anfrage.headers.get('accept') || '').includes('text/html');
  /* Programmdateien gehoeren zur Seite: sie muessen zum gerade
     geladenen HTML passen, sonst ruft neuer Code alte Bausteine auf. */
  const istCode = /\.(js|css)$/i.test(url.pathname);
  /* ------------------------------------------------------------------
     Das Manifest ist der Name der App, nicht ein Bild

     Es fiel bisher in den Zweig "erst der Speicher, im Hintergrund
     auffrischen" - richtig fuer Symbole, falsch fuer die Datei, in der
     steht, wie die App heisst. Nach der Umbenennung stand auf dem
     Startbildschirm weiter der alte Name, weil die installierte App das
     Manifest aus dem Speicher las und die Auffrischung erst beim
     naechsten Besuch ankam.
     ------------------------------------------------------------------ */
  const istManifest = /\.(json|webmanifest)$/i.test(url.pathname);

  if (istSeite || istCode || istManifest){
    // Erst das Netz, damit Aenderungen sofort ankommen
    e.respondWith((async () => {
      try {
        /* Ohne no-cache beantwortet der Browser diesen Abruf aus seinem
           eigenen Zwischenspeicher - dann waere "erst das Netz" nur ein
           frommer Wunsch. So wird immer nachgefragt; unveraendert
           kommt nur ein 304 zurueck. */
        const antwort = await fetch(new Request(anfrage, { cache: 'no-cache' }));
        const speicher = await caches.open(VERSION);
        speicher.put(anfrage, antwort.clone());
        return antwort;
      } catch(err){
        const treffer = await caches.match(anfrage);
        if (treffer) return treffer;
        return istSeite ? caches.match('./index.html') : Response.error();
      }
    })());
    return;
  }

  // Bilder und Symbole: erst der Speicher, im Hintergrund auffrischen
  e.respondWith((async () => {
    const treffer = await caches.match(anfrage);
    const holen = fetch(anfrage).then(antwort => {
      caches.open(VERSION).then(sp => sp.put(anfrage, antwort.clone()));
      return antwort;
    }).catch(() => treffer);
    return treffer || holen;
  })());
});
