-- =====================================================================
-- ZoemiApp · esquema de base de datos (Supabase / PostgreSQL)
-- Ejecutar completo en: Supabase → SQL Editor → New query → Run
-- Es seguro volver a ejecutarlo (usa "if not exists" / "or replace").
-- =====================================================================

-- ---------- Administradores ------------------------------------------
-- Solo los usuarios listados aquí pueden escribir contenido.
-- Se agregan A MANO desde el SQL Editor (ver README, paso "Primer administrador").
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Es administrador si: (1) está en la tabla admins y (2) inició sesión con
-- verificación en dos pasos (aal2). Si algún día quieres desactivar el
-- requisito de 2 pasos, quita la segunda condición.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid())
     and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

-- ---------- Secciones de "Escucha la Pregunta" -----------------------
create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  color text not null default '#FFD166' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon text not null default 'star',
  position int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Preguntas y opciones -------------------------------------
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 300),
  audio_path text,          -- audio de la pregunta (bucket "media")
  sound_path text,          -- audio opcional (ej. ladrido)
  position int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists questions_section_idx on public.questions (section_id);

create table if not exists public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  position int not null default 0,
  image_path text,          -- imagen de la opción
  text text,                -- o un texto corto (letra / número)
  is_correct boolean not null default false,
  check (image_path is not null or text is not null)
);
create index if not exists options_question_idx on public.question_options (question_id);
-- A lo más una opción correcta por pregunta.
create unique index if not exists one_correct_per_question
  on public.question_options (question_id) where is_correct;

-- ---------- Practica tu Voz: Haz ruido -------------------------------
create table if not exists public.noise_activities (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(text) between 1 and 200),
  audio_path text,
  image_path text not null,
  direction text not null default 'bottom'
    check (direction in ('bottom', 'top', 'left', 'right', 'center')),
  effect text not null default 'reveal' check (effect in ('reveal', 'cover')),
  position int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Practica tu Voz: Karaoke ---------------------------------
create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  audio_path text not null,
  origin text not null check (origin in ('own', 'public_domain', 'licensed')),
  position int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.song_lines (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  position int not null default 0,
  text text not null,
  start_seconds numeric(8, 2) not null check (start_seconds >= 0)
);
create index if not exists song_lines_song_idx on public.song_lines (song_id);

-- ---------- Permisos y seguridad por fila (RLS) ----------------------
alter table public.admins            enable row level security;
alter table public.sections          enable row level security;
alter table public.questions         enable row level security;
alter table public.question_options  enable row level security;
alter table public.noise_activities  enable row level security;
alter table public.songs             enable row level security;
alter table public.song_lines        enable row level security;

grant select on public.sections, public.questions, public.question_options,
  public.noise_activities, public.songs, public.song_lines to anon, authenticated;
grant insert, update, delete on public.sections, public.questions,
  public.question_options, public.noise_activities, public.songs,
  public.song_lines to authenticated;
grant select on public.admins to authenticated;

-- admins: cada usuario solo ve su propia fila. Nadie puede escribir desde la app.
drop policy if exists admins_read_self on public.admins;
create policy admins_read_self on public.admins
  for select to authenticated using (user_id = auth.uid());

-- sections
drop policy if exists sections_read on public.sections;
create policy sections_read on public.sections
  for select to anon, authenticated using (active or public.is_admin());
drop policy if exists sections_write on public.sections;
create policy sections_write on public.sections
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- questions
drop policy if exists questions_read on public.questions;
create policy questions_read on public.questions
  for select to anon, authenticated using (published or public.is_admin());
drop policy if exists questions_write on public.questions;
create policy questions_write on public.questions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- question_options
drop policy if exists options_read on public.question_options;
create policy options_read on public.question_options
  for select to anon, authenticated using (
    public.is_admin()
    or exists (select 1 from public.questions q
               where q.id = question_id and q.published)
  );
drop policy if exists options_write on public.question_options;
create policy options_write on public.question_options
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- noise_activities
drop policy if exists noise_read on public.noise_activities;
create policy noise_read on public.noise_activities
  for select to anon, authenticated using (published or public.is_admin());
drop policy if exists noise_write on public.noise_activities;
create policy noise_write on public.noise_activities
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- songs
drop policy if exists songs_read on public.songs;
create policy songs_read on public.songs
  for select to anon, authenticated using (published or public.is_admin());
drop policy if exists songs_write on public.songs;
create policy songs_write on public.songs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- song_lines
drop policy if exists lines_read on public.song_lines;
create policy lines_read on public.song_lines
  for select to anon, authenticated using (
    public.is_admin()
    or exists (select 1 from public.songs s
               where s.id = song_id and s.published)
  );
drop policy if exists lines_write on public.song_lines;
create policy lines_write on public.song_lines
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Almacenamiento de audios e imágenes ----------------------
-- Bucket público (cualquiera puede LEER por URL); solo admins escriben.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', true, 10485760,  -- 10 MB por archivo
  array['image/png', 'image/jpeg', 'image/webp',
        'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/x-wav']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists media_admin_insert on storage.objects;
create policy media_admin_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
drop policy if exists media_admin_update on storage.objects;
create policy media_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());
drop policy if exists media_admin_delete on storage.objects;
create policy media_admin_delete on storage.objects
  for delete to authenticated using (bucket_id = 'media' and public.is_admin());
drop policy if exists media_admin_select on storage.objects;
create policy media_admin_select on storage.objects
  for select to authenticated using (bucket_id = 'media' and public.is_admin());

-- ---------- Datos iniciales -----------------------------------------
insert into public.sections (name, color, icon, position)
select * from (values
  ('Animales',          '#FFD166', 'paw',      1),
  ('Adivinanzas',       '#C9B8FF', 'question', 2),
  ('Letras y números',  '#8EC5FF', 'letters',  3)
) as v(name, color, icon, position)
where not exists (select 1 from public.sections);
