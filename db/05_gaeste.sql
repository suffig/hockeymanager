-- =====================================================================
--  Eiszeit - Die Bestenliste oeffnen
--
--  Bisher verlangte die Rangliste ein Konto. Das ist fuer eine
--  Bestenliste die falsche Reihenfolge: sie ist das, was jemanden
--  ueberhaupt dazu bringt, eines anzulegen. Wer sie hinter der
--  Anmeldung versteckt, zeigt sie genau denen, die sie am wenigsten
--  brauchen.
--
--  04_absichern.sql hat den Weg dafuer schon beschrieben; diese Datei
--  geht ihn. Sie nimmt die beiden revoke-Zeilen zurueck und gibt anon
--  Leserecht auf die zwei Ansichten - und nur auf sie.
--
--  Was damit oeffentlich wird
--  --------------------------
--  Genau die Spalten der beiden Ansichten: Benutzername, Spielername
--  und die Zahlen der Laufbahn. Nicht die Tabelle public.karriere, in
--  der profil_id und seed stehen, und nicht public.profile, in der
--  auch nicht freigegebene Konten liegen. Der where-Zweig der Ansichten
--  laesst weiterhin nur Laufbahnen freigegebener Profile durch, und
--  security_barrier aus 04 sorgt dafuer, dass der Filter nicht
--  umgangen werden kann.
--
--  Der Benutzername steht damit oeffentlich neben der Laufbahn. Das
--  ist der Sinn der Sache - eine Rangliste ohne Namen ist eine
--  Zahlenkolonne. Wer das nicht will, laesst sein Profil nicht
--  freigeben.
--
--  Nach 04_absichern.sql ausfuehren. Mehrfach ist unschaedlich.
-- =====================================================================

-- ---------------------------------------------------------------------
--  Leserecht fuer Gaeste - nur auf die Ansichten
-- ---------------------------------------------------------------------
grant select on public.bestenliste      to anon;
grant select on public.karriere_ansicht to anon;

-- Angemeldete behalten es ohnehin.
grant select on public.bestenliste      to authenticated;
grant select on public.karriere_ansicht to authenticated;


-- ---------------------------------------------------------------------
--  Was zu bleiben hat, wie es ist
--
--  Die Tabellen darunter bleiben fuer Gaeste zu. Ohne diese Zeilen
--  waere das Oeffnen der Ansichten der Anfang davon, dass auch alles
--  andere offen ist.
-- ---------------------------------------------------------------------
revoke all on public.karriere from anon;
revoke all on public.profile  from anon;


-- ---------------------------------------------------------------------
--  Zum Nachsehen
--
--  Als Gast (anon-Schluessel, ohne Anmeldung) muss die erste Abfrage
--  Zeilen liefern und die beiden anderen mit "permission denied"
--  scheitern. Tut die zweite oder dritte das nicht, ist mehr offen
--  als gedacht.
-- ---------------------------------------------------------------------
--  select count(*) from public.bestenliste;   -- muss gehen
--  select count(*) from public.karriere;      -- muss scheitern
--  select count(*) from public.profile;       -- muss scheitern
