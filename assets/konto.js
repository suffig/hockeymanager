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

  /* ---------- Karrieren ---------- */

  async function karriereSpeichern(satz){
    if (!zustand().frei) return false;      // ohne Freigabe nur lokal
    const c = await ladeClient();
    const { error } = await c.from('karriere').insert(Object.assign(
      { profil_id: sitzung.user.id }, satz));
    if (error) return false;
    return true;
  }

  async function karrierenLaden(){
    if (!zustand().angemeldet) return [];
    const c = await ladeClient();
    const { data, error } = await c.from('karriere')
      .select('*').order('gespielt_am', { ascending: false }).limit(200);
    if (error) return [];
    return data || [];
  }

  async function bestenliste(grenze){
    const c = await ladeClient();
    const { data, error } = await c.from('bestenliste')
      .select('*').limit(grenze || 50);
    if (error) return [];
    return data || [];
  }

  return {
    konfiguriert, starten, zustand, beiAenderung,
    registrieren, anmelden, abmelden, passwortZuruecksetzen, benutzernameAendern,
    profileLaden, freigeben, sperren,
    karriereSpeichern, karrierenLaden, bestenliste
  };
})();

if (typeof window !== 'undefined') window.KONTO = KONTO;
