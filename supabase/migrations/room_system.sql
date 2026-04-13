create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  invite_code varchar(12) unique not null,
  status varchar(20) not null default 'waiting' check (status in ('waiting','locked','in_game','closed')),
  owner_player_id varchar(64) not null,
  mode varchar(16) not null default 'solo',
  difficulty varchar(16) not null default 'normal',
  seed bigint,
  game_version integer not null default 0,
  game_state jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id varchar(64) not null,
  display_name varchar(32) not null,
  is_owner boolean not null default false,
  is_ai boolean not null default false,
  seat_index integer not null,
  joined_at timestamptz not null default now()
);

create index if not exists idx_room_players_room_id on public.room_players(room_id);
create unique index if not exists uniq_room_players_room_player on public.room_players(room_id, player_id);
create unique index if not exists uniq_room_players_room_seat on public.room_players(room_id, seat_index);

alter table public.rooms disable row level security;
alter table public.room_players disable row level security;

grant select, insert, update, delete on public.rooms to anon;
grant select, insert, update, delete on public.room_players to anon;

