-- =====================================================================
--  Eiszeit – Datenbankschema
--  PostgreSQL / Supabase
--
--  Reihenfolge: dieses Skript zuerst, danach 02_rls.sql.
--  Ausfuehren im Supabase-Dashboard unter "SQL Editor".
--
--  Die Anmeldung selbst uebernimmt Supabase (Schema auth). Hier liegt
--  nur, was das Spiel braucht: wer freigegeben ist, welche Karrieren
--  gespielt wurden und welche Ziele erreicht sind.
-- =====================================================================

-- ---------------------------------------------------------------------
--  Profile
--  Ein Profil entsteht automatisch bei der Registrierung (Trigger unten)
--  und startet im Status 'wartet'. Erst nach Freigabe darf es speichern.
-- ---------------------------------------------------------------------
create table if not exists public.profile (
  id               uuid primary key
                     references auth.users (id) on delete cascade,
  benutzername     text        not null,
  status           text        not null default 'wartet',
  ist_admin        boolean     not null default false,
  erstellt_am      timestamptz not null default now(),
  freigegeben_am   timestamptz,
  freigegeben_von  uuid        references auth.users (id) on delete set null,
  notiz            text,

  constraint profile_status_gueltig
    check (status in ('wartet', 'frei', 'gesperrt')),
  constraint profile_benutzername_laenge
    check (char_length(benutzername) between 3 and 32),
  -- Freigabedaten nur bei freigegebenen Profilen
  constraint profile_freigabe_stimmig
    check ((status = 'frei') = (freigegeben_am is not null))
);

-- Benutzernamen eindeutig, aber ohne Ruecksicht auf Gross-/Kleinschreibung
create unique index if not exists profile_benutzername_eindeutig
  on public.profile (lower(benutzername));

create index if not exists profile_status_idx
  on public.profile (status, erstellt_am desc);

comment on table  public.profile is 'Spielerprofile; muss vom Admin freigegeben werden';
comment on column public.profile.status is 'wartet = neu, frei = freigegeben, gesperrt = abgelehnt';


-- ---------------------------------------------------------------------
--  Karrieren
--  Eine Zeile je abgeschlossener Laufbahn. Die Felder entsprechen dem,
--  was der Pokalraum bisher im Browserspeicher gehalten hat.
-- ---------------------------------------------------------------------
create table if not exists public.karriere (
  id             bigint generated always as identity primary key,
  profil_id      uuid        not null references public.profile (id) on delete cascade,
  gespielt_am    timestamptz not null default now(),

  -- Identitaet
  name           text        not null,
  pos            text        not null,   -- 'position' ist ein SQL-Schluesselwort
  nation         text        not null,
  nummer         smallint,
  ist_torhueter  boolean     not null default false,
  seed           text        not null,
  modus          text,

  -- Ergebnis
  hoehepunkt     smallint,
  legendenwert   integer,
  rang           text,
  saisons        smallint,
  trophaeen      smallint,
  punkte         integer,      -- Feldspieler: Scorerpunkte, Torhueter: Siege

  -- Was die Laufbahn ausgemacht hat
  jg_platz       smallint,
  jg_von         smallint,
  straenge       text[]      not null default '{}',
  nat_kapitaen   boolean     not null default false,
  stationen      smallint,
  wahlen         smallint,
  gelungen       smallint,
  wendepunkt     jsonb,

  constraint karriere_pos_gueltig
    check (pos in ('C', 'LW', 'RW', 'D', 'G')),
  constraint karriere_gelungen_plausibel
    check (gelungen is null or wahlen is null or gelungen <= wahlen)
);

create index if not exists karriere_profil_idx
  on public.karriere (profil_id, gespielt_am desc);

-- Bestenliste ueber alle freigegebenen Profile
create index if not exists karriere_bestenliste_idx
  on public.karriere (legendenwert desc);

comment on table public.karriere is 'Abgeschlossene Laufbahnen eines Profils';


-- ---------------------------------------------------------------------
--  Erreichte Ziele
--  Die Herausforderungen gelten ueber alle Karrieren hinweg, deshalb
--  eine eigene Tabelle statt eines Feldes an der Karriere.
-- ---------------------------------------------------------------------
create table if not exists public.ziel_erreicht (
  profil_id    uuid        not null references public.profile (id) on delete cascade,
  ziel_id      text        not null,
  erreicht_am  timestamptz not null default now(),
  karriere_id  bigint      references public.karriere (id) on delete set null,

  primary key (profil_id, ziel_id)
);

comment on table public.ziel_erreicht is 'Welches Langzeitziel wann erreicht wurde';


-- ---------------------------------------------------------------------
--  Profil bei der Registrierung anlegen
--  Ohne diesen Trigger muesste jeder Neuzugang von Hand eingetragen
--  werden. Der Benutzername kommt aus den Metadaten der Anmeldung und
--  faellt auf den Teil vor dem @ der E-Mail zurueck.
-- ---------------------------------------------------------------------
create or replace function public.profil_anlegen()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  wunschname text;
  versuch    text;
  zaehler    int := 0;
begin
  wunschname := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'benutzername'), ''),
    split_part(new.email, '@', 1),
    'spieler'
  );
  -- auf erlaubte Laenge stutzen
  wunschname := left(regexp_replace(wunschname, '\s+', '', 'g'), 32);
  if char_length(wunschname) < 3 then
    wunschname := wunschname || 'spieler';
  end if;

  -- Bei Namensgleichheit eine Zahl anhaengen, statt die Anmeldung
  -- scheitern zu lassen.
  versuch := wunschname;
  while exists (select 1 from public.profile p where lower(p.benutzername) = lower(versuch)) loop
    zaehler := zaehler + 1;
    versuch := left(wunschname, 28) || zaehler::text;
  end loop;

  insert into public.profile (id, benutzername)
  values (new.id, versuch);

  return new;
end;
$$;

drop trigger if exists profil_bei_registrierung on auth.users;
create trigger profil_bei_registrierung
  after insert on auth.users
  for each row execute function public.profil_anlegen();


-- ---------------------------------------------------------------------
--  Freigabe und Sperre
--  Als Funktionen, damit Datum und freigebender Admin nicht vergessen
--  werden koennen und die Pruefung an einer Stelle liegt.
-- ---------------------------------------------------------------------
create or replace function public.ist_admin(wer uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Spalten ausdruecklich qualifizieren: die Funktion heisst wie die
  -- Spalte, und solche Zweideutigkeiten raecht Postgres frueher oder spaeter.
  select exists (
    select 1 from public.profile p
    where p.id = wer and p.ist_admin and p.status = 'frei'
  );
$$;

-- Eigenen Status lesen, ohne RLS erneut auszuloesen. Ohne security
-- definer wuerde eine Regel auf profile, die profile abfragt, in eine
-- Endlosrekursion laufen.
create or replace function public.eigener_status()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.status from public.profile p where p.id = auth.uid();
$$;

create or replace function public.eigenes_adminrecht()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.ist_admin from public.profile p where p.id = auth.uid()), false);
$$;

create or replace function public.profil_freigeben(ziel uuid)
returns public.profile
language plpgsql
security definer
set search_path = public
as $$
declare ergebnis public.profile;
begin
  if not public.ist_admin() then
    raise exception 'Nur Admins duerfen Profile freigeben';
  end if;

  update public.profile
     set status = 'frei',
         freigegeben_am = now(),
         freigegeben_von = auth.uid()
   where id = ziel
  returning * into ergebnis;

  if ergebnis is null then
    raise exception 'Profil nicht gefunden';
  end if;
  return ergebnis;
end;
$$;

create or replace function public.profil_sperren(ziel uuid, grund text default null)
returns public.profile
language plpgsql
security definer
set search_path = public
as $$
declare ergebnis public.profile;
begin
  if not public.ist_admin() then
    raise exception 'Nur Admins duerfen Profile sperren';
  end if;

  update public.profile
     set status = 'gesperrt',
         freigegeben_am = null,
         freigegeben_von = null,
         notiz = coalesce(grund, notiz)
   where id = ziel
  returning * into ergebnis;

  if ergebnis is null then
    raise exception 'Profil nicht gefunden';
  end if;
  return ergebnis;
end;
$$;
