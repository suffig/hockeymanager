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
--  Wertung und ob ein Titel dabei war. Zwei Sichten genuegen.
--
--  Wie ueberall hier gilt: die Sicht ist die einzige Tuer. Sie laeuft
--  mit security_invoker = false, zeigt ausschliesslich Zeilen
--  freigegebener Profile und gibt nichts preis, was nicht ohnehin in
--  der Bestenliste steht.
--
--  Nach 01_schema.sql, 02_rls.sql und 03_bestenliste.sql ausfuehren.
--  Mehrfaches Ausfuehren ist unschaedlich.
-- =====================================================================

-- ---------------------------------------------------------------------
--  Eine Zeile je Saison und Verein
--
--  Die Grundlage fuer alles Weitere. Bewusst als eigene Sicht, damit
--  die Aufloesung des jsonb nur an einer Stelle steht.
-- ---------------------------------------------------------------------
create or replace view public.vereins_saison
with (security_invoker = false)
as
  select
    k.id                                    as karriere_id,
    k.name                                  as spieler,
    k.pos                                   as position,
    k.ist_torhueter                         as ist_torhueter,
    k.seed                                  as seed,
    p.benutzername                          as profil,
    (s ->> 'k')                             as klub,
    (s ->> 'l')                             as liga,
    (s ->> 'j')::int                        as jahr,
    coalesce((s ->> 'sp')::int, 0)          as spiele,
    coalesce((s ->> 'p')::int, 0)           as punkte,
    coalesce((s ->> 't')::int, 0)           as tore,
    coalesce((s ->> 'si')::int, 0)          as siege,
    coalesce((s ->> 'o')::int, 0)           as wertung,
    ((s ->> 'ti') is not null)              as titel
    from public.karriere k
    join public.profile  p on p.id = k.profil_id
    cross join lateral jsonb_array_elements(coalesce(k.saisonwerte, '[]'::jsonb)) as s
   where p.status = 'frei'
     and (s ->> 'k') is not null;

comment on view public.vereins_saison is
  'Eine Zeile je gespielter Saison und Verein, nur aus freigegebenen Profilen';

-- ---------------------------------------------------------------------
--  Die Chronik je Verein
--
--  Was in der Halle haengt: wie viele Spieler dort waren, wie lange,
--  was sie geholt haben. "punkte" zaehlt bei Torhuetern die Siege
--  doppelt, damit ein Torhueter neben einem Stuermer nicht verschwindet
--  - dieselbe Rechnung wie im Pokalraum.
-- ---------------------------------------------------------------------
create or replace view public.vereins_chronik
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
  'Je Verein zusammengezaehlt, ueber alle freigegebenen Laufbahnen';

-- ---------------------------------------------------------------------
--  Die Rangliste der Spieler je Verein
--
--  Titel zuerst, dann die Ausbeute, dann die Treue - dieselbe Ordnung
--  wie im Pokalraum, damit dieselbe Frage nicht zwei Antworten hat.
-- ---------------------------------------------------------------------
create or replace view public.vereins_spieler
with (security_invoker = false)
as
  select
    klub,
    spieler,
    max(position)                                as position,
    bool_or(ist_torhueter)                       as ist_torhueter,
    max(profil)                                  as profil,
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
--  Lesen darf jeder, schreiben niemand
--
--  Die Sichten fassen nur zusammen, was ohnehin in der Bestenliste
--  steht. Die Tabellen darunter bleiben durch RLS geschuetzt; erreicht
--  werden sie nur ueber diese Tuer.
-- ---------------------------------------------------------------------
grant select on public.vereins_saison  to anon, authenticated;
grant select on public.vereins_chronik to anon, authenticated;
grant select on public.vereins_spieler to anon, authenticated;

-- ---------------------------------------------------------------------
--  Damit die Auswertung nicht ueber die ganze Tabelle laeuft
-- ---------------------------------------------------------------------
create index if not exists karriere_saisonwerte_gin
  on public.karriere using gin (saisonwerte);
