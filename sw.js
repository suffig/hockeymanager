/* ==========================================================
   Eiszeit – Offlinespeicher

   Die Seite wirbt seit jeher damit, offline zu funktionieren.
   Bisher stimmte das nur, solange der Browser die Dateien noch im
   eigenen Zwischenspeicher hatte. Hier wird daraus ein Versprechen.

   Zwei Regeln:
   - Fremde Adressen (Supabase, Schriften, das SDK) fasst dieser
     Speicher nicht an. Eine Anmeldung darf niemals aus einem alten
     Zwischenstand beantwortet werden.
   - Seiten kommen aus dem Netz, wenn es geht, und aus dem Speicher,
     wenn nicht. Bausteine umgekehrt - sie aendern sich seltener.
   ========================================================== */

const VERSION = 'eiszeit-v1';
const SCHALE = [
  './',
  './index.html',
  './guides.html',
  './herausforderungen.html',
  './pokalraum.html',
  './schnellkarriere.html',
  './taeglich.html',
  './konto.html',
  './assets/style.css',
  './assets/data.js',
  './assets/draft.js',
  './assets/engine.js',
  './assets/ereignisse.js',
  './assets/wappen.js',
  './assets/ui.js',
  './assets/game.js',
  './assets/konto-config.js',
  './assets/konto.js',
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

  if (istSeite){
    // Seiten: erst das Netz, damit Aenderungen ankommen
    e.respondWith((async () => {
      try {
        const antwort = await fetch(anfrage);
        const speicher = await caches.open(VERSION);
        speicher.put(anfrage, antwort.clone());
        return antwort;
      } catch(err){
        const treffer = await caches.match(anfrage);
        return treffer || caches.match('./index.html');
      }
    })());
    return;
  }

  // Bausteine: erst der Speicher, im Hintergrund auffrischen
  e.respondWith((async () => {
    const treffer = await caches.match(anfrage);
    const holen = fetch(anfrage).then(antwort => {
      caches.open(VERSION).then(sp => sp.put(anfrage, antwort.clone()));
      return antwort;
    }).catch(() => treffer);
    return treffer || holen;
  })());
});
