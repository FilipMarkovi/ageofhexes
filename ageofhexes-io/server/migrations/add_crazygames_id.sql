-- Adds CrazyGames account linking to the players table.
-- Run this in the Supabase SQL editor before deploying the CrazyGames auth flow.

alter table public.players
  add column if not exists crazygames_id text;

-- One Supabase account per CrazyGames user id (nulls allowed for Google/guest rows).
create unique index if not exists players_crazygames_id_key
  on public.players (crazygames_id)
  where crazygames_id is not null;
