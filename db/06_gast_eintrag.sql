-- =====================================================================
--  Eiszeit - Ohne Konto in die Bestenliste
--
--  Bisher brauchte ein Eintrag ein freigegebenes Profil. Wer nur
--  einmal spielt, legt aber kein Konto an - und genau der hat gerade
--  eine Laufbahn zu Ende gebracht, auf die er stolz ist. Jetzt darf er
--  eintragen und gibt dazu einen Namen an.
--
--  Was das bedeutet
--  ----------------
--  Das ist ein Schreibrecht fuer Nicht-Angemeldete. Es ist bewusst eng
--  gefasst, aber es bleibt eines: wer den anon-Schluessel hat, kann
--  Eintraege erzeugen. Die Schranken unten machen Missbrauch
--  unattraktiv, nicht unmoeglich. Wer das nicht will, fuehrt diese
--  Datei einfach nicht aus - alles andere laeuft weiter.
--
--  Die Schranken:
--    1. Nur Zeilen ohne profil_id und mit gastname (kein Untermogeln
--       fremder Profile).
--    2. Der Name ist auf 3 bis 20 Zeichen begrenzt.
--    3. Die Zahlen muessen in einem plausiblen Rahmen liegen - eine
--       Laufbahn mit 900 Saisons oder 99999 Legendenpunkten geht nicht
--       durch.
--    4. Hoechstens 5 Gasteintraege je Stunde und Name.
--
--  Nach 05_gaeste.sql ausfuehren. Mehrfach ist unschaedlich.
-- =====================================================================

-- ---------------------------------------------------------------------
--  Das Feld fuer den Gastnamen
-- ---------------------------------------------------------------------
alter table public.karriere
  add column if not exists gastname text;

comment on column public.karriere.gastname is
  'Selbstgewaehlter Name, wenn die Laufbahn ohne Konto eingetragen wurde';

alter table public.karriere
  drop constraint if exists karriere_gastname_form;
alter table public.karriere
  add constraint karriere_gastname_form
  check (gastname is null or (length(gastname) between 3 and 20));

-- Entweder Profil oder Gastname - nie beides, nie keines.
alter table public.karriere
  drop constraint if exists karriere_herkunft;
alter table public.karriere
  add constraint karriere_herkunft
  check ((profil_id is not null and gastname is null)
      or (profil_id is null and gastname is not null));


-- ---------------------------------------------------------------------
--  Die Bremse: hoechstens fuenf Eintraege je Stunde und Name
-- ---------------------------------------------------------------------
create or replace function public.gast_darf_eintragen(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select count(*) < 5
    from public.karriere
   where gastname = p_name
     and gespielt_am > now() - interval '1 hour';
$$;

comment on function public.gast_darf_eintragen is
  'Bremse gegen massenhafte Gasteintraege unter demselben Namen';


-- ---------------------------------------------------------------------
--  Das Schreibrecht
-- ---------------------------------------------------------------------
drop policy if exists karriere_gast_eintragen on public.karriere;
create policy karriere_gast_eintragen on public.karriere
  for insert
  to anon
  with check (
        profil_id is null
    and gastname is not null
    and length(gastname) between 3 and 20
    -- Plausible Groessenordnungen, damit niemand die Liste mit
    -- Phantasiezahlen anfuehrt
    and saisons      between 1 and 30
    and legendenwert between 0 and 4000
    and coalesce(punkte, 0)    between 0 and 3000
    and coalesce(trophaeen, 0) between 0 and 60
    and coalesce(hoehepunkt, 0) between 1 and 99
    and public.gast_darf_eintragen(gastname)
  );

grant insert on public.karriere to anon;


-- ---------------------------------------------------------------------
--  Die Ansichten zeigen den Namen, egal woher er kommt
-- ---------------------------------------------------------------------
drop view if exists public.bestenliste;

create or replace view public.bestenliste
with (security_invoker = false)
as
  select row_number() over (order by k.legendenwert desc, k.gespielt_am asc) as platz,
         k.id,
         coalesce(p.benutzername, k.gastname) as benutzername,
         (k.profil_id is null)                as gast,
         k.name, k.pos, k.nation, k.ist_torhueter,
         k.legendenwert, k.rang, k.hoehepunkt, k.saisons, k.trophaeen,
         k.punkte, k.beste_liga, k.jg_platz, k.jg_von, k.nat_kapitaen,
         k.stationen, k.straenge, k.wahlen, k.gelungen, k.wendepunkt,
         k.potenzial, k.ausgeschoepft, k.rolle, k.rollen_stand,
         k.umstellungen, k.modus, k.gespielt_am
    from public.karriere k
    left join public.profile p on p.id = k.profil_id
   where k.profil_id is null or p.status = 'frei'
   order by k.legendenwert desc, k.gespielt_am asc;

create or replace view public.karriere_ansicht
with (security_invoker = false)
as
  select k.id,
         coalesce(p.benutzername, k.gastname) as benutzername,
         (k.profil_id is null)                as gast,
         k.name, k.pos, k.nation, k.nummer, k.ist_torhueter,
         k.legendenwert, k.rang, k.hoehepunkt, k.saisons, k.trophaeen,
         k.punkte, k.beste_liga, k.jg_platz, k.jg_von, k.straenge,
         k.nat_kapitaen, k.stationen, k.wahlen, k.gelungen, k.wendepunkt,
         k.potenzial, k.ausgeschoepft, k.rolle, k.rollen_stand,
         k.umstellungen, k.modus, k.saisonwerte, k.gespielt_am
    from public.karriere k
    left join public.profile p on p.id = k.profil_id
   where k.profil_id is null or p.status = 'frei';

alter view public.bestenliste      set (security_barrier = true);
alter view public.karriere_ansicht set (security_barrier = true);

grant select on public.bestenliste      to anon, authenticated;
grant select on public.karriere_ansicht to anon, authenticated;

-- Lesen der Tabelle selbst bleibt zu - nur Schreiben ist erlaubt.
revoke select, update, delete on public.karriere from anon;


-- ---------------------------------------------------------------------
--  Zum Nachsehen
-- ---------------------------------------------------------------------
--  select benutzername, gast, name, legendenwert
--    from public.bestenliste order by platz limit 10;
--  select count(*) from public.karriere where profil_id is null;
