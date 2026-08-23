/* ==========================================================
   Eiszeit – Zugang zur Datenbank

   Hier deine beiden Supabase-Werte eintragen. Du findest sie im
   Dashboard unter Project Settings → API:

     url      = "Project URL"
     anonKey  = "anon public" (NICHT der service_role-Schlüssel!)

   Der anon-Schlüssel gehört in den Browser, das ist so vorgesehen –
   er erlaubt für sich genommen nichts. Was jemand damit tun darf,
   entscheiden die Zugriffsregeln in db/02_rls.sql.

   Der service_role-Schlüssel umgeht dagegen alle Regeln. Er darf
   niemals in eine Datei, die im Browser landet, und niemals ins
   Repository.

   Solange hier Platzhalter stehen, läuft Eiszeit ohne Konten:
   gespielt wird wie bisher, gespeichert wird lokal im Browser.
   ========================================================== */

const KONTO_CONFIG = {
  url:     '',   // z. B. 'https://abcdefghijkl.supabase.co'
  anonKey: ''    // der lange anon-public-Schlüssel
};

if (typeof window !== 'undefined') window.KONTO_CONFIG = KONTO_CONFIG;
