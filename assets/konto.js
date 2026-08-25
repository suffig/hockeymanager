/* ==========================================================
   Eiszeit – Konten

   Kapselt alles, was mit Anmeldung und Freigabe zu tun hat.
   Zwei Grundsätze:

   1. Ohne Konto funktioniert das Spiel unverändert. Das Supabase-
      Skript wird deshalb erst geladen, wenn jemand ein Konto
      benutzen will – sonst bliebe die Seite ohne Netz stehen.

   2. Die Rechte liegen in der Datenbank, nicht hier. Was dieses
      Modul anzeigt, ist Bequemlichkeit; was jemand darf, entscheiden
      die Zugriffsregeln aus db/02_rls.sql.
   ========================================================== */

const KONTO = (() => {

  const SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

  let client = null;         // Supabase-Client, erst nach dem Laden
  let ladeVersuch = null;    // laufender Ladevorgang, damit nur einmal
  let sitzung = null;        // aktuelle Anmeldung
  let profil = null;         // Zeile aus public.profile
  const horcher = [];        // wer über Änderungen Bescheid wissen will

  /* ---------- Einrichtung ---------- */

  function konfiguriert(){
    const c = (typeof KONTO_CONFIG !== 'undefined' && KONTO_CONFIG) || {};
    return !!(c.url && c.anonKey);
  }

  /* Das SDK erst bei Bedarf holen. Schlägt das fehl – kein Netz,
     blockiert, Tippfehler in der URL – bleibt das Spiel benutzbar. */
  async function ladeClient(){
    if (client) return client;
    if (!konfiguriert()) throw new Error('nicht-eingerichtet');
    if (ladeVersuch) return ladeVersuch;

    ladeVersuch = (async () => {
      const { createClient } = await import(SDK_URL);
      client = createClient(KONTO_CONFIG.url, KONTO_CONFIG.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true }
      });
      client.auth.onAuthStateChange((_ereignis, s) => {
        sitzung = s;
        if (!s){ profil = null; melden(); }
        else profilLaden().then(melden);
      });
      return client;
    })();
    return ladeVersuch;
  }

  function melden(){
    const stand = zustand();
    horcher.forEach(f => { try { f(stand); } catch(e){} });
  }

  function beiAenderung(f){ horcher.push(f); f(zustand()); }

  /* ---------- Zustand ---------- */

  function zustand(){
    return {
      eingerichtet: konfiguriert(),
      angemeldet:   !!sitzung,
      profil,
      status:       profil ? profil.status : null,
      frei:         !!profil && profil.status === 'frei',
      admin:        !!profil && profil.ist_admin && profil.status === 'frei',
      email:        sitzung && sitzung.user ? sitzung.user.email : null
    };
  }

  async function profilLaden(){
    if (!client || !sitzung) { profil = null; return null; }
    const { data, error } = await client
      .from('profile').select('*').eq('id', sitzung.user.id).maybeSingle();
    if (error){ profil = null; return null; }
    profil = data;
    return profil;
  }

  /* Beim Seitenaufruf: gibt es schon eine Anmeldung? */
  async function starten(){
    if (!konfiguriert()) return zustand();
    try {
      const c = await ladeClient();
      const { data } = await c.auth.getSession();
      sitzung = data.session || null;
      if (sitzung) await profilLaden();
    } catch(e){ /* ohne Konto weiterspielen */ }
    melden();
    return zustand();
  }

  /* ---------- Anmelden und Registrieren ---------- */

  async function registrieren(email, passwort, benutzername){
    const c = await ladeClient();
    const { data, error } = await c.auth.signUp({
      email, password: passwort,
      options: { data: { benutzername: (benutzername || '').trim() } }
    });
    if (error) throw error;
    sitzung = data.session || null;
    if (sitzung) await profilLaden();
    melden();
    return zustand();
  }

  async function anmelden(email, passwort){
    const c = await ladeClient();
    const { data, error } = await c.auth.signInWithPassword({ email, password: passwort });
    if (error) throw error;
    sitzung = data.session;
    await profilLaden();
    melden();
    return zustand();
  }

  async function abmelden(){
    if (!client) return;
    await client.auth.signOut();
    sitzung = null; profil = null;
    melden();
  }

  async function passwortZuruecksetzen(email){
    const c = await ladeClient();
    const { error } = await c.auth.resetPasswordForEmail(email, {
      redirectTo: location.origin + location.pathname.replace(/[^/]*$/, 'konto.html')
    });
    if (error) throw error;
  }

  async function benutzernameAendern(neu){
    const c = await ladeClient();
    if (!sitzung) throw new Error('nicht-angemeldet');
    const { error } = await c.from('profile')
      .update({ benutzername: neu.trim() }).eq('id', sitzung.user.id);
    if (error) throw error;
    await profilLaden();
    melden();
  }

  /* ---------- Adminbereich ----------
     Die Abfragen liefern nur dann etwas, wenn die Datenbank das
     Adminrecht bestaetigt. Ohne es kommt eine leere Liste zurueck,
     kein heimlicher Zugriff. */

  async function profileLaden(status){
    const c = await ladeClient();
    let q = c.from('profile').select('*').order('erstellt_am', { ascending: false });
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function freigeben(id){
    const c = await ladeClient();
    const { error } = await c.rpc('profil_freigeben', { ziel: id });
    if (error) throw error;
  }

  async function sperren(id, grund){
    const c = await ladeClient();
    const { error } = await c.rpc('profil_sperren', { ziel: id, grund: grund || null });
    if (error) throw error;
  }

  /* ---------- Karrieren ----------
     Der lokale Speicher und die Datenbank benutzen unterschiedliche
     Feldnamen: lokal kurz und englisch gewachsen, in der Datenbank
     deutsch und ausgeschrieben. Diese beiden Funktionen sind die
     einzige Stelle, an der das uebersetzt wird. */

  function nachDb(k){
    return {
      name: k.name, pos: k.pos, nation: k.nation, nummer: k.num,
      ist_torhueter: !!k.isG, seed: k.seed, modus: k.modus || null,
      hoehepunkt: k.peak, legendenwert: k.legacy, rang: k.rank,
      saisons: k.seasons, trophaeen: k.titles, punkte: k.p,
      jg_platz: k.jgPlatz != null ? k.jgPlatz : null,
      jg_von: k.jgVon != null ? k.jgVon : null,
      straenge: k.straenge || [],
      nat_kapitaen: !!k.natKapitaen,
      stationen: k.klubs != null ? k.klubs : null,
      wahlen: k.wahlen != null ? k.wahlen : null,
      gelungen: k.gelungen != null ? k.gelungen : null,
      wendepunkt: k.wendepunkt || null,
      beste_liga: k.besteLiga || null,
      potenzial: k.potenzial != null ? k.potenzial : null,
      ausgeschoepft: k.ausgeschoepft != null ? k.ausgeschoepft : null,
      rolle: k.rolle || null,
      rollen_stand: k.rollenStand || null,
      umstellungen: k.umstellungen != null ? k.umstellungen : null,
      saisonwerte: k.saisonwerte || null,
      gespielt_am: new Date(k.t || Date.now()).toISOString()
    };
  }

  function nachLokal(z){
    return {
      t: new Date(z.gespielt_am).getTime(),
      name: z.name, pos: z.pos, nation: z.nation, num: z.nummer,
      peak: z.hoehepunkt, legacy: z.legendenwert, rank: z.rang,
      seasons: z.saisons, titles: z.trophaeen, p: z.punkte,
      isG: !!z.ist_torhueter, seed: z.seed, modus: z.modus,
      jgPlatz: z.jg_platz, jgVon: z.jg_von,
      straenge: z.straenge || [], natKapitaen: !!z.nat_kapitaen,
      klubs: z.stationen, wahlen: z.wahlen, gelungen: z.gelungen,
      wendepunkt: z.wendepunkt,
      besteLiga: z.beste_liga, potenzial: z.potenzial,
      ausgeschoepft: z.ausgeschoepft, rolle: z.rolle,
      rollenStand: z.rollen_stand, umstellungen: z.umstellungen,
      saisonwerte: z.saisonwerte || null,
      ausDb: true, dbId: z.id
    };
  }

  async function karriereSpeichern(satz){
    if (!zustand().frei) return false;      // ohne Freigabe nur lokal
    try {
      const c = await ladeClient();
      const { error } = await c.from('karriere').insert(Object.assign(
        { profil_id: sitzung.user.id }, nachDb(satz)));
      return !error;
    } catch(e){ return false; }             // ohne Netz bleibt es lokal
  }

  /* ------------------------------------------------------------------
     Ohne Konto in die Bestenliste

     Wer nur einmal spielt, legt kein Konto an - und genau der hat
     gerade eine Laufbahn zu Ende gebracht, auf die er stolz ist.
     Statt eines Profils gibt er einen Namen an; die Schranken dagegen
     stehen in der Datenbank (db/06_gast_eintrag.sql), nicht hier, denn
     alles im Browser laesst sich umgehen.
     ------------------------------------------------------------------ */
  const GAST_NAME_KEY = 'eiszeit.gastname';

  function gastnamePruefen(n){
    const name = String(n || '').trim();
    if (name.length < 3)  return { ok:false, grund:'Mindestens drei Zeichen.' };
    if (name.length > 20) return { ok:false, grund:'Höchstens zwanzig Zeichen.' };
    if (!/^[\p{L}\p{N} ._-]+$/u.test(name))
      return { ok:false, grund:'Nur Buchstaben, Ziffern, Punkt, Strich und Leerzeichen.' };
    return { ok:true, name };
  }

  function gastnameLesen(){
    try { return localStorage.getItem(GAST_NAME_KEY) || ''; } catch(e){ return ''; }
  }
  function gastnameMerken(n){
    try { localStorage.setItem(GAST_NAME_KEY, n); } catch(e){}
  }

  async function alsGastEintragen(satz, name){
    const g = gastnamePruefen(name);
    if (!g.ok) return { ok:false, grund:g.grund };
    if (!konfiguriert()) return { ok:false, grund:'Die Bestenliste ist nicht eingerichtet.' };
    try {
      const c = await ladeClient();
      const { error } = await c.from('karriere').insert(Object.assign(
        { profil_id: null, gastname: g.name }, nachDb(satz)));
      if (error){
        /* Die Bremse in der Datenbank meldet sich als Regelverstoss -
           das ist kein Fehler, sondern eine Antwort. */
        const zuOft = /row-level security|policy/i.test(error.message || '');
        return { ok:false, grund: zuOft
          ? 'Unter diesem Namen wurden gerade sehr viele Laufbahnen eingetragen. '
            + 'Versuch es später noch einmal oder nimm einen anderen Namen.'
          : error.message };
      }
      gastnameMerken(g.name);
      return { ok:true, name:g.name };
    } catch(e){ return { ok:false, grund:'Keine Verbindung zur Bestenliste.' }; }
  }

  async function karrierenLaden(){
    if (!zustand().angemeldet) return [];
    try {
      const c = await ladeClient();
      const { data, error } = await c.from('karriere')
        .select('*').order('gespielt_am', { ascending: false }).limit(200);
      if (error) return [];
      return (data || []).map(nachLokal);
    } catch(e){ return []; }
  }

  /* Was lokal liegt, aber noch nicht in der Datenbank. Erkannt am
     Seed samt Zeitpunkt - derselbe Seed kann mehrfach gespielt werden. */
  async function nichtUebertragen(lokal){
    if (!zustand().frei) return [];
    const drin = await karrierenLaden();
    const bekannt = new Set(drin.map(k => k.seed + '|' + k.name));
    return (lokal || []).filter(k => !bekannt.has(k.seed + '|' + k.name));
  }

  async function uebertragen(lokal){
    const offen = await nichtUebertragen(lokal);
    if (!offen.length) return { uebertragen: 0, offen: 0 };
    const c = await ladeClient();
    const zeilen = offen.map(k => Object.assign({ profil_id: sitzung.user.id }, nachDb(k)));
    const { error } = await c.from('karriere').insert(zeilen);
    if (error) return { uebertragen: 0, offen: offen.length, fehler: error.message };
    return { uebertragen: zeilen.length, offen: 0 };
  }

  /* ---------- Erreichte Ziele ---------- */

  async function zieleLaden(){
    if (!zustand().angemeldet) return [];
    try {
      const c = await ladeClient();
      const { data, error } = await c.from('ziel_erreicht').select('ziel_id, erreicht_am');
      if (error) return [];
      return data || [];
    } catch(e){ return []; }
  }

  async function zieleSpeichern(ids){
    if (!zustand().frei || !ids || !ids.length) return false;
    try {
      const c = await ladeClient();
      const zeilen = ids.map(id => ({ profil_id: sitzung.user.id, ziel_id: id }));
      // Doppelte still uebergehen: das Ziel gilt ohnehin nur einmal
      const { error } = await c.from('ziel_erreicht')
        .upsert(zeilen, { onConflict: 'profil_id,ziel_id', ignoreDuplicates: true });
      return !error;
    } catch(e){ return false; }
  }

  /* ---------- Weltweite Bestenliste ----------

     Die Rangliste laedt bewusst ohne Saisonwerte: eine Seite mit
     fuenfzig Laufbahnen wuerde sonst fuenfzig Saisontabellen
     mitschleppen. Die kommen erst beim Klick auf eine Position. */

  /* Nach was sortiert werden darf. Eine feste Liste statt eines
     durchgereichten Spaltennamens - sonst waere die Sortierung eine
     Tuer, durch die beliebige Ausdruecke in die Abfrage wandern. */
  const SORTIERBAR = ['legendenwert', 'punkte', 'trophaeen', 'hoehepunkt', 'saisons'];

  async function bestenliste(opt){
    const o = opt || {};
    const c = await ladeClient();
    let f = c.from('bestenliste').select('*', { count: 'exact' });
    if (o.pos)    f = f.eq('pos', o.pos);
    if (o.nation) f = f.eq('nation', o.nation);
    const nach = SORTIERBAR.includes(o.sortiert) ? o.sortiert : 'legendenwert';
    f = f.order(nach, { ascending: false }).order('gespielt_am', { ascending: true });
    const von = o.von || 0;
    const { data, error, count } = await f.range(von, von + (o.wieviele || 25) - 1);
    if (error) return { zeilen: [], gesamt: 0, fehler: error.message };
    return { zeilen: data || [], gesamt: count || 0 };
  }

  /* ------------------------------------------------------------------
     Die Bestmarken aller Spieler

     Die Bestenliste beantwortet eine Frage: wer ist insgesamt der
     Groesste? Sie beantwortet nicht die andere, die man beim Spielen
     hat: was ist ueberhaupt moeglich? Wie viele Punkte hat der beste
     Scorer je gemacht, wie lange die laengste Laufbahn gedauert.

     Je Feld eine Abfrage - das sind sechs kleine statt einer grossen,
     aber jede holt genau eine Zeile, und die Ansicht ist ohnehin
     indiziert.
     ------------------------------------------------------------------ */
  const REKORDE = [
    { k:'legendenwert', n:'Legendenpunkte',  ik:'krone' },
    { k:'punkte',       n:'Scorerpunkte',    ik:'tor' },
    { k:'trophaeen',    n:'Trophäen',        ik:'pokal' },
    { k:'hoehepunkt',   n:'Höchste Wertung', ik:'hoch' },
    { k:'saisons',      n:'Längste Laufbahn',ik:'kalender', einheit:'Saisons' }
  ];

  async function rekorde(){
    if (!konfiguriert()) return { fehler:'nicht eingerichtet', liste:[] };
    try {
      const c = await ladeClient();
      const treffer = await Promise.all(REKORDE.map(async r => {
        const { data, error } = await c.from('bestenliste')
          .select('benutzername, name, nation, pos, ' + r.k)
          .order(r.k, { ascending: false })
          .limit(1);
        if (error || !data || !data.length) return null;
        return Object.assign({}, r, { wert: data[0][r.k], halter: data[0] });
      }));
      return { liste: treffer.filter(Boolean) };
    } catch(e){ return { fehler:'Keine Verbindung', liste:[] }; }
  }

  /* Eine einzelne fremde Laufbahn, samt Saison fuer Saison. */
  async function karriereAnsicht(id){
    const c = await ladeClient();
    const { data, error } = await c.from('karriere_ansicht')
      .select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return data;
  }

  /* Wo die eigenen Laufbahnen in der Welt stehen. */
  async function eigenePlaetze(){
    if (!zustand().frei) return [];
    try {
      const c = await ladeClient();
      const { data, error } = await c.from('bestenliste')
        .select('platz, id, name, legendenwert, rang')
        .eq('benutzername', (zustand().profil || {}).benutzername || '')
        .order('legendenwert', { ascending: false }).limit(10);
      if (error) return [];
      return data || [];
    } catch(e){ return []; }
  }

  return {
    konfiguriert, starten, zustand, beiAenderung,
    registrieren, anmelden, abmelden, passwortZuruecksetzen, benutzernameAendern,
    profileLaden, freigeben, sperren,
    karriereSpeichern, alsGastEintragen, gastnamePruefen, gastnameLesen, rekorde,
    karrierenLaden, nichtUebertragen, uebertragen,
    zieleLaden, zieleSpeichern, bestenliste, karriereAnsicht, eigenePlaetze
  };
})();

if (typeof window !== 'undefined') window.KONTO = KONTO;
