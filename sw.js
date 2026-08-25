/* ==========================================================
   Eiszeit – Offlinespeicher

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

const VERSION = 'eiszeit-3057cc11';
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
  './assets/style.css?v=3057cc11',
  './assets/data.js?v=3057cc11',
  './assets/draft.js?v=3057cc11',
  './assets/engine.js?v=3057cc11',
  './assets/ereignisse.js?v=3057cc11',
  './assets/wappen.js?v=3057cc11',
  './assets/ui.js?v=3057cc11',
  './assets/game.js?v=3057cc11',
  './assets/konto-config.js?v=3057cc11',
  './assets/konto.js?v=3057cc11',
  './assets/bestenliste.js?v=3057cc11',
  './manifest.json',
  './assets/app/symbol-192.png',
  './assets/app/symbol-512.png'
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

  if (istSeite || istCode){
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
