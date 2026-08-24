-- =====================================================================
--  Eiszeit - Weltweite Bestenliste
--
--  Bisher lag von jeder Laufbahn nur eine Zusammenfassung in der
--  Datenbank: Legendenwert, Rang, Saisonzahl. Das reicht fuer eine
--  Rangliste, aber nicht dafuer, eine fremde Laufbahn anzuschauen -
--  und genau das soll ein Klick auf eine Position koennen.
--
--  Deshalb kommt ein Feld dazu, das die Saisons selbst traegt. Bewusst
--  als jsonb und bewusst knapp: fuenfzehn Saisons mit je einer Handvoll
--  Zahlen sind rund zwei Kilobyte, das traegt jede Zeile mit.
--
--  Nach 01_schema.sql und 02_rls.sql ausfuehren. Mehrfaches Ausfuehren
--  ist unschaedlich.
-- =====================================================================

-- ---------------------------------------------------------------------
--  Neue Felder
-- ---------------------------------------------------------------------
alter table public.karriere
  add column if not exists saisonwerte   jsonb,
  add column if not exists beste_liga    text,
  add column if not exists potenzial     smallint,
  add column if not exists ausgeschoepft smallint,
  add column if not exists rolle         text,
  add column if not exists rollen_stand  text,
  add column if not exists umstellungen  smallint;

comment on column public.karriere.saisonwerte is
  'Saison fuer Saison, knapp gehalten: Jahr, Alter, Klub, Liga, Zahlen';
comment on column public.karriere.ausgeschoepft is
  'Wie viel Prozent der eigenen Anlage die Laufbahn eingeloest hat';

-- Ein zu grosser Satz waere ein Weg, die Tabelle zuzumuellen.
alter table public.karriere
  drop constraint if exists karriere_saisonwerte_knapp;
alter table public.karriere
  add constraint karriere_saisonwerte_knapp
  check (saisonwerte is null or pg_column_size(saisonwerte) < 16384);


-- ---------------------------------------------------------------------
--  Die Rangliste
--
--  Weiterhin eine Ansicht statt breiter Leserechte: sie zeigt, was auf
--  einer Bestenliste stehen soll, und nichts darueber hinaus. Die
--  Platzziffer kommt aus der Datenbank, damit sie ueber alle Seiten
--  hinweg dieselbe ist und nicht von der Anzeige abhaengt.
-- ---------------------------------------------------------------------
drop view if exists public.bestenliste;

create or replace view public.bestenliste
-- Mit den Rechten der Ansicht, nicht des Aufrufers: die Tabelle selbst
-- bleibt damit zu. Sonst braeuchte jeder Angemeldete Leserechte auf
-- public.karriere - und dort stehen auch profil_id und seed, die auf
-- einer Bestenliste nichts zu suchen haben. Der Filter der Ansicht
-- (nur freigegebene Profile) ist die einzige Tuer.
with (security_invoker = false)
as
  select row_number() over (order by k.legendenwert desc, k.gespielt_am asc) as platz,
         k.id,
         p.benutzername,
         k.name,
         k.pos,
         k.nation,
         k.ist_torhueter,
         k.legendenwert,
         k.rang,
         k.hoehepunkt,
         k.saisons,
         k.trophaeen,
         k.punkte,
         k.beste_liga,
         k.jg_platz,
         k.jg_von,
         k.nat_kapitaen,
         k.stationen,
         k.straenge,
         k.wahlen,
         k.gelungen,
         k.wendepunkt,
         k.potenzial,
         k.ausgeschoepft,
         k.rolle,
         k.rollen_stand,
         k.umstellungen,
         k.modus,
         k.gespielt_am
    from public.karriere k
    join public.profile  p on p.id = k.profil_id
   where p.status = 'frei'
   order by k.legendenwert desc, k.gespielt_am asc;

comment on view public.bestenliste is
  'Karrieren freigegebener Profile mit Platzziffer, auf die Anzeige beschraenkt';


-- ---------------------------------------------------------------------
--  Eine einzelne Laufbahn ansehen
--
--  Getrennt von der Rangliste, weil die Saisonwerte um ein Vielfaches
--  groesser sind als alles andere. Wer eine Liste laedt, soll nicht
--  fuenfzig Saisontabellen mitladen.
-- ---------------------------------------------------------------------
create or replace view public.karriere_ansicht
with (security_invoker = false)
as
  select k.id,
         p.benutzername,
         k.name,
         k.pos,
         k.nation,
         k.nummer,
         k.ist_torhueter,
         k.legendenwert,
         k.rang,
         k.hoehepunkt,
         k.saisons,
         k.trophaeen,
         k.punkte,
         k.beste_liga,
         k.jg_platz,
         k.jg_von,
         k.straenge,
         k.nat_kapitaen,
         k.stationen,
         k.wahlen,
         k.gelungen,
         k.wendepunkt,
         k.potenzial,
         k.ausgeschoepft,
         k.rolle,
         k.rollen_stand,
         k.umstellungen,
         k.modus,
         k.saisonwerte,
         k.gespielt_am
    from public.karriere k
    join public.profile  p on p.id = k.profil_id
   where p.status = 'frei';

comment on view public.karriere_ansicht is
  'Eine einzelne freigegebene Laufbahn samt Saisonwerten';


-- ---------------------------------------------------------------------
--  Leserecht auf die beiden Ansichten
--
--  Bewusst nur auf die Ansichten, nicht auf die Tabelle darunter. Die
--  alte Bestenliste lief mit den Rechten des Aufrufers und ohne
--  passende Regel auf public.karriere - sie konnte deshalb nur die
--  eigenen Laufbahnen zeigen, nie fremde.
-- ---------------------------------------------------------------------
grant select on public.bestenliste      to authenticated;
grant select on public.karriere_ansicht to authenticated;

-- Ohne diesen Index sortiert die Rangliste bei jeder Anfrage die
-- ganze Tabelle.
create index if not exists karriere_bestenliste_idx2
  on public.karriere (legendenwert desc, gespielt_am asc);
