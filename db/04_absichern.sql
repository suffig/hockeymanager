-- =====================================================================
--  Eiszeit - Die beiden Ansichten absichern
--
--  Warum in der Supabase-Uebersicht "Unrestricted" steht
--  ----------------------------------------------------
--  Das Abzeichen erscheint an bestenliste und karriere_ansicht, weil
--  beide mit ihren eigenen Rechten laufen (security_invoker = false)
--  und die Zeilenregeln der Tabelle darunter damit nicht greifen. Das
--  ist hier Absicht und kein Versehen:
--
--    Die Tabelle public.karriere bleibt zu. In ihr stehen profil_id
--    und seed - Dinge, die auf einer Bestenliste nichts zu suchen
--    haben. Waeren die Ansichten dagegen an die Rechte des Aufrufers
--    gebunden, muesste jeder Angemeldete die Tabelle lesen duerfen,
--    und dann laege alles offen, nicht nur die Spalten der Ansicht.
--
--  Die Ansichten sind also die einzige Tuer, und ihr where-Zweig
--  (nur freigegebene Profile) ist das Schloss. Damit das haelt,
--  braucht es drei Dinge, die diese Datei ergaenzt.
--
--  Nach 03_bestenliste.sql ausfuehren. Mehrfach ist unschaedlich.
-- =====================================================================


-- ---------------------------------------------------------------------
--  1. Der Filter darf nicht umgangen werden
--
--  Ohne security_barrier darf der Planer eigene Bedingungen vor den
--  where-Zweig der Ansicht ziehen. Eine selbstgeschriebene Funktion in
--  der Bedingung sieht dann Zeilen, die die Ansicht nie ausgeben
--  wuerde. Mit dem Riegel bleibt die Reihenfolge, wie sie gedacht ist.
-- ---------------------------------------------------------------------
alter view public.bestenliste      set (security_barrier = true);
alter view public.karriere_ansicht set (security_barrier = true);


-- ---------------------------------------------------------------------
--  2. Nur Angemeldete
--
--  Supabase gibt neuen Objekten im Schema public von Haus aus Rechte
--  fuer anon mit. Die Bestenliste soll aber dasselbe verlangen wie die
--  Seite es ankuendigt: ein Konto. Wer sie oeffentlich haben will,
--  ersetzt die beiden revoke-Zeilen durch
--      grant select on public.bestenliste to anon;
--  und passt den Hinweis in bestenliste.html an.
-- ---------------------------------------------------------------------
revoke all on public.bestenliste      from anon;
revoke all on public.karriere_ansicht from anon;

grant select on public.bestenliste      to authenticated;
grant select on public.karriere_ansicht to authenticated;


-- ---------------------------------------------------------------------
--  3. Die Tabelle bleibt zu
--
--  Schreiben und die eigenen Laufbahnen lesen laeuft weiter ueber die
--  Regeln aus 02_rls.sql. Fremde Zeilen gibt es nur durch die Ansicht.
--  Diese Zeile stellt sicher, dass keine Voreinstellung daran
--  vorbeigreift.
-- ---------------------------------------------------------------------
revoke all on public.karriere from anon;


-- ---------------------------------------------------------------------
--  Zum Nachsehen: was die Ansichten wirklich hergeben
--
--  Beide Abfragen sollten nur Laufbahnen freigegebener Profile zeigen
--  und keine Spalte mit profil_id oder seed enthalten.
-- ---------------------------------------------------------------------
--  select count(*) from public.bestenliste;
--  select column_name from information_schema.columns
--   where table_name = 'bestenliste' order by ordinal_position;
