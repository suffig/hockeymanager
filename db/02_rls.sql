-- =====================================================================
--  Eiszeit – Zugriffsrechte (Row Level Security)
--  Nach 01_schema.sql ausfuehren.
--
--  Der Browser spricht direkt mit der Datenbank. Die Rechte muessen
--  deshalb in der Datenbank liegen, nicht im JavaScript - dort koennte
--  sie jeder umgehen. Ohne Freigabe darf niemand schreiben.
-- =====================================================================

alter table public.profile       enable row level security;
alter table public.karriere      enable row level security;
alter table public.ziel_erreicht enable row level security;

-- ---------------------------------------------------------------------
--  Hilfsfunktion: Ist das eigene Profil freigegeben?
-- ---------------------------------------------------------------------
create or replace function public.ist_frei(wer uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profile p
    where p.id = wer and p.status = 'frei'
  );
$$;


-- ---------------------------------------------------------------------
--  Profile
-- ---------------------------------------------------------------------

-- Das eigene Profil sehen - auch waehrend man noch wartet, sonst
-- erfaehrt niemand seinen Status.
drop policy if exists profil_eigenes_lesen on public.profile;
create policy profil_eigenes_lesen on public.profile
  for select using (id = auth.uid());

-- Admins sehen alle Profile - Grundlage des Adminbereichs.
drop policy if exists profil_admin_lesen on public.profile;
create policy profil_admin_lesen on public.profile
  for select using (public.ist_admin());

-- Freigegebene Profile sind untereinander sichtbar, damit in der
-- Bestenliste ein Name statt einer Kennung steht.
drop policy if exists profil_freie_lesen on public.profile;
create policy profil_freie_lesen on public.profile
  for select using (status = 'frei' and public.ist_frei());

-- Am eigenen Profil darf nur der Benutzername geaendert werden.
-- Status und Adminrecht bleiben aussen vor: die Bedingung verlangt,
-- dass beide unveraendert bleiben.
drop policy if exists profil_eigenes_aendern on public.profile;
create policy profil_eigenes_aendern on public.profile
  for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    -- ueber security-definer-Funktionen, sonst laeuft die Regel auf
    -- profile beim Lesen von profile in eine Endlosrekursion
    and status    = public.eigener_status()
    and ist_admin = public.eigenes_adminrecht()
  );

-- Freigeben und Sperren laeuft ueber die Funktionen aus 01_schema.sql.
-- Sie pruefen das Adminrecht selbst und umgehen RLS bewusst.


-- ---------------------------------------------------------------------
--  Karrieren
--  Schreiben nur mit freigegebenem Profil und nur fuer sich selbst.
-- ---------------------------------------------------------------------
drop policy if exists karriere_eigene_lesen on public.karriere;
create policy karriere_eigene_lesen on public.karriere
  for select using (profil_id = auth.uid());

drop policy if exists karriere_admin_lesen on public.karriere;
create policy karriere_admin_lesen on public.karriere
  for select using (public.ist_admin());

drop policy if exists karriere_speichern on public.karriere;
create policy karriere_speichern on public.karriere
  for insert
  with check (profil_id = auth.uid() and public.ist_frei());

drop policy if exists karriere_loeschen on public.karriere;
create policy karriere_loeschen on public.karriere
  for delete using (profil_id = auth.uid());

-- Kein Update: eine abgeschlossene Laufbahn wird nicht nachtraeglich
-- veraendert. Wer sie loswerden will, loescht sie.


-- ---------------------------------------------------------------------
--  Erreichte Ziele
-- ---------------------------------------------------------------------
drop policy if exists ziel_eigene_lesen on public.ziel_erreicht;
create policy ziel_eigene_lesen on public.ziel_erreicht
  for select using (profil_id = auth.uid());

drop policy if exists ziel_admin_lesen on public.ziel_erreicht;
create policy ziel_admin_lesen on public.ziel_erreicht
  for select using (public.ist_admin());

drop policy if exists ziel_speichern on public.ziel_erreicht;
create policy ziel_speichern on public.ziel_erreicht
  for insert
  with check (profil_id = auth.uid() and public.ist_frei());


-- ---------------------------------------------------------------------
--  Bestenliste
--  Eine Ansicht statt breiter Leserechte: sie zeigt nur, was auf einer
--  Bestenliste stehen soll, und nichts darueber hinaus.
-- ---------------------------------------------------------------------
create or replace view public.bestenliste
with (security_invoker = true)
as
  select k.id,
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
         k.gespielt_am
    from public.karriere k
    join public.profile  p on p.id = k.profil_id
   where p.status = 'frei'
   order by k.legendenwert desc;

comment on view public.bestenliste is
  'Karrieren freigegebener Profile, auf die Anzeige beschraenkte Spalten';


-- ---------------------------------------------------------------------
--  Ersten Admin bestimmen
--
--  Henne und Ei: Freigeben darf nur ein Admin, und den ersten kann es
--  noch nicht geben. Deshalb einmalig von Hand - nach der eigenen
--  Registrierung hier die eigene E-Mail eintragen und ausfuehren.
--
--  update public.profile
--     set ist_admin = true,
--         status = 'frei',
--         freigegeben_am = now()
--   where id = (select id from auth.users where email = 'DEINE@MAIL.DE');
-- ---------------------------------------------------------------------
