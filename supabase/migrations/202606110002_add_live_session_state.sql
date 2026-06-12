alter table public.sessions
  add column if not exists home_score integer not null default 0,
  add column if not exists away_score integer not null default 0,
  add column if not exists inning integer not null default 1,
  add column if not exists inning_half text not null default 'top',
  add column if not exists balls integer not null default 0,
  add column if not exists strikes integer not null default 0,
  add column if not exists outs integer not null default 0,
  add column if not exists game_status text not null default 'scheduled';

update public.sessions
set
  home_score = greatest(coalesce(home_score, 0), 0),
  away_score = greatest(coalesce(away_score, 0), 0),
  inning = greatest(coalesce(inning, 1), 1),
  inning_half = case when inning_half = 'bottom' then 'bottom' else 'top' end,
  balls = least(greatest(coalesce(balls, 0), 0), 3),
  strikes = least(greatest(coalesce(strikes, 0), 0), 2),
  outs = least(greatest(coalesce(outs, 0), 0), 2),
  game_status = case
    when game_status in ('scheduled', 'active', 'final') then game_status
    when status in ('scheduled', 'active', 'final') then status
    else 'scheduled'
  end;

alter table public.sessions
  alter column home_score set not null,
  alter column away_score set not null,
  alter column inning set not null,
  alter column inning_half set not null,
  alter column balls set not null,
  alter column strikes set not null,
  alter column outs set not null,
  alter column game_status set not null;

alter table public.sessions
  drop constraint if exists sessions_home_score_check,
  drop constraint if exists sessions_away_score_check,
  drop constraint if exists sessions_inning_check,
  drop constraint if exists sessions_inning_half_check,
  drop constraint if exists sessions_balls_check,
  drop constraint if exists sessions_strikes_check,
  drop constraint if exists sessions_outs_check,
  drop constraint if exists sessions_game_status_check;

alter table public.sessions
  add constraint sessions_home_score_check check (home_score >= 0),
  add constraint sessions_away_score_check check (away_score >= 0),
  add constraint sessions_inning_check check (inning >= 1),
  add constraint sessions_inning_half_check check (inning_half in ('top', 'bottom')),
  add constraint sessions_balls_check check (balls between 0 and 3),
  add constraint sessions_strikes_check check (strikes between 0 and 2),
  add constraint sessions_outs_check check (outs between 0 and 2),
  add constraint sessions_game_status_check check (game_status in ('scheduled', 'active', 'final'));
