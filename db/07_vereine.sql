-- =====================================================================
--  RINKRISE - Die Vereinschronik ueber alle Spieler
--
--  Im Pokalraum rechnet das Spiel diese Zahlen aus dem lokalen Archiv:
--  was DEINE Spieler bei einem Verein geleistet haben. Diese Datei
--  macht dasselbe fuer alle freigegebenen Profile - damit aus "Krefeld"
--  ein Ort mit Geschichte wird, an dem auch Spieler anderer Leute
--  waren.
--
--  Neue Spalten braucht es dafuer nicht: public.karriere traegt seit
--  03_bestenliste.sql das Feld saisonwerte als jsonb, und darin steht
--  zu jeder Saison der Klub, die Liga, Spiele, Punkte, Siege, die
--  Wertung und ob ein Titel dabei war.
--
--  Wie ueberall hier gilt: die Sicht ist die einzige Tuer. Sie laeuft
--  mit security_invoker = false und zeigt genau die Zeilen, die auch
--  die Bestenliste zeigt - freigegebene Profile und Gasteintraege ohne
--  Profil. Preisgegeben wird nichts, was dort nicht ohnehin steht.
--
--  DRITTE FASSUNG. Die zweite lieferte weiter nichts, und die
--  Diagnosesicht sagte warum: davon_freigegeben war 0. Der Grund ist
--  06_gast_eintrag.sql - dort werden bestenliste und karriere_ansicht
--  NEU definiert, mit left join und "where k.profil_id is null or
--  p.status = 'frei'", damit Gasteintraege ohne Profil durchkommen. Ich
--  hatte die Vorlage aus 03_bestenliste.sql genommen und uebersehen,
--  dass 06 sie ueberschreibt; mein inner join warf damit jede
--  Gastkarriere weg - und genau eine solche liegt in der Datenbank.
--
--  ZWEITE FASSUNG. Die erste lieferte null Zeilen, obwohl die Daten da
--  waren. Ursache war die Aufloesung des jsonb-Feldes: bei
--  "jsonb_array_elements(...) as s" benennt der Alias je nach Kontext
--  die Tabelle oder die Spalte, und "s ->> 'k'" traf damit nicht
--  zuverlaessig die Spalte. Jetzt heisst die Spalte ausdruecklich
--  "wert" - "as s(wert)" -, und darauf laesst sich nichts mehr
--  missverstehen. Dazu unten eine Diagnosesicht, die zeigt, wo etwas
--  verlorengeht, falls doch noch etwas fehlt.
--
--  Nach 01_schema.sql, 02_rls.sql und 03_bestenliste.sql ausfuehren.
--  Mehrfaches Ausfuehren ist unschaedlich.
-- =====================================================================

-- ---------------------------------------------------------------------
--  Erst alles weg, und zwar von aussen nach innen
--
--  Die Reihenfolge ist nicht beliebig: vereins_diagnose liest aus
--  vereins_chronik, und die liest aus vereins_saison. Wer die innere
--  Sicht zuerst verwirft, bekommt "cannot drop view ... because other
--  objects depend on it". Deshalb zuerst die Diagnose, dann die
--  Auswertungen, zuletzt die Grundlage.
-- ---------------------------------------------------------------------
drop view if exists public.vereins_diagnose;
drop view if exists public.vereins_spieler;
drop view if exists public.vereins_chronik;
drop view if exists public.vereins_saison;

-- ---------------------------------------------------------------------
--  Eine Zeile je Saison und Verein
--
--  Die Grundlage fuer alles Weitere. Bewusst als eigene Sicht, damit
--  die Aufloesung des jsonb nur an einer Stelle steht.
-- ---------------------------------------------------------------------
create view public.vereins_saison
with (security_invoker = false)
as
  select
    k.id                                       as karriere_id,
    k.name                                     as spieler,
    k.pos                                      as position,
    k.ist_torhueter                            as ist_torhueter,
    k.seed                                     as seed,
    coalesce(p.benutzername, k.gastname)       as profil,
    (k.profil_id is null)                      as gast,
    (s.wert ->> 'k')                           as klub,
    (s.wert ->> 'l')                           as liga,
    nullif(s.wert ->> 'j', '')::int            as jahr,
    coalesce(nullif(s.wert ->> 'sp', '')::int, 0) as spiele,
    coalesce(nullif(s.wert ->> 'p',  '')::int, 0) as punkte,
    coalesce(nullif(s.wert ->> 't',  '')::int, 0) as tore,
    coalesce(nullif(s.wert ->> 'si', '')::int, 0) as siege,
    coalesce(nullif(s.wert ->> 'o',  '')::int, 0) as wertung,
    (s.wert ->> 'ti') is not null               as titel
    from public.karriere k
    left join public.profile p on p.id = k.profil_id
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(k.saisonwerte) = 'array'
           then k.saisonwerte
           else '[]'::jsonb
      end) as s(wert)
   where (k.profil_id is null or p.status = 'frei')
     and (s.wert ->> 'k') is not null;

comment on view public.vereins_saison is
  'Eine Zeile je gespielter Saison und Verein, so sichtbar wie die Bestenliste';

-- ---------------------------------------------------------------------
--  Die Chronik je Verein
--
--  Was in der Halle haengt: wie viele Spieler dort waren, wie lange,
--  was sie geholt haben.
-- ---------------------------------------------------------------------
create view public.vereins_chronik
with (security_invoker = false)
as
  select
    klub,
    max(liga)                                        as liga,
    count(*)                                         as saisons,
    count(distinct karriere_id)                      as spieler,
    sum(spiele)                                      as spiele,
    sum(punkte)                                      as punkte,
    sum(tore)                                        as tore,
    sum(siege)                                       as siege,
    count(*) filter (where titel)                    as titel,
    min(jahr)                                        as von_jahr,
    max(jahr)                                        as bis_jahr,
    max(wertung)                                     as beste_wertung
    from public.vereins_saison
   group by klub;

comment on view public.vereins_chronik is
  'Je Verein zusammengezaehlt, ueber alle sichtbaren Laufbahnen';

-- ---------------------------------------------------------------------
--  Die Rangliste der Spieler je Verein
--
--  Titel zuerst, dann die Ausbeute, dann die Treue - dieselbe Ordnung
--  wie im Pokalraum, damit dieselbe Frage nicht zwei Antworten hat.
--  Siege zaehlen doppelt, damit ein Torhueter neben einem Stuermer
--  nicht verschwindet.
-- ---------------------------------------------------------------------
create view public.vereins_spieler
with (security_invoker = false)
as
  select
    klub,
    spieler,
    max(position)                                as position,
    bool_or(ist_torhueter)                       as ist_torhueter,
    max(profil)                                  as profil,
    bool_or(gast)                                as gast,
    max(seed)                                    as seed,
    count(*)                                     as saisons,
    sum(spiele)                                  as spiele,
    sum(punkte)                                  as punkte,
    sum(siege)                                   as siege,
    count(*) filter (where titel)                as titel,
    max(wertung)                                 as beste_wertung,
    min(jahr)                                    as von_jahr,
    max(jahr)                                    as bis_jahr,
    row_number() over (
      partition by klub
      order by count(*) filter (where titel) desc,
               (sum(punkte) + sum(siege) * 2)    desc,
               count(*)                          desc
    )                                            as platz
    from public.vereins_saison
   group by klub, spieler;

comment on view public.vereins_spieler is
  'Wer bei einem Verein gespielt hat, nach Titeln und Ausbeute geordnet';

-- ---------------------------------------------------------------------
--  Diagnose
--
--  Falls die Chronik leer bleibt, sagt diese Sicht in einer Zeile, wo
--  es haengt: wie viele Karrieren es gibt, wie viele davon sichtbar
--  sind (freigegebenes Profil oder Gasteintrag), wie viele ein Feld
--  saisonwerte haben,
--  wie viele davon tatsaechlich ein Array sind, und wie viele
--  Saisonzeilen am Ende herauskommen.
-- ---------------------------------------------------------------------
create view public.vereins_diagnose
with (security_invoker = false)
as
  select
    (select count(*) from public.karriere)                          as karrieren,
    (select count(*) from public.karriere k
       left join public.profile p on p.id = k.profil_id
      where k.profil_id is null or p.status = 'frei')               as davon_sichtbar,
    (select count(*) from public.karriere where saisonwerte is not null)
                                                                    as mit_saisonwerten,
    (select count(*) from public.karriere
      where jsonb_typeof(saisonwerte) = 'array')                    as davon_array,
    (select count(*) from public.vereins_saison)                    as saisonzeilen,
    (select count(*) from public.vereins_chronik)                   as vereine;

comment on view public.vereins_diagnose is
  'Eine Zeile: wo die Vereinschronik ihre Daten verliert';

-- ---------------------------------------------------------------------
--  Lesen darf jeder, schreiben niemand
--
--  Die Sichten fassen nur zusammen, was ohnehin in der Bestenliste
--  steht. Die Tabellen darunter bleiben durch RLS geschuetzt; erreicht
--  werden sie nur ueber diese Tuer.
-- ---------------------------------------------------------------------
grant select on public.vereins_saison    to anon, authenticated;
grant select on public.vereins_chronik   to anon, authenticated;
grant select on public.vereins_spieler   to anon, authenticated;
grant select on public.vereins_diagnose  to anon, authenticated;

-- ---------------------------------------------------------------------
--  Damit die Auswertung nicht ueber die ganze Tabelle laeuft
-- ---------------------------------------------------------------------
create index if not exists karriere_saisonwerte_gin
  on public.karriere using gin (saisonwerte);

-- ---------------------------------------------------------------------
--  Damit PostgREST die neuen Sichten sofort kennt
-- ---------------------------------------------------------------------
notify pgrst, 'reload schema';
