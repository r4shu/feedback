create extension if not exists pgcrypto;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) between 3 and 2000),
  category text not null check (category in ('Feature', 'Improvement', 'Bug')),
  status text not null default 'open' check (status in ('open', 'planned', 'in_progress', 'completed')),
  author_name text not null default 'Community member' check (char_length(author_name) between 1 and 60),
  votes_count integer not null default 0 check (votes_count >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.feedback_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback_votes (
  feedback_id uuid not null references public.feedback(id) on delete cascade,
  voter_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (feedback_id, voter_id)
);

create index if not exists feedback_created_at_idx on public.feedback (created_at desc);
create index if not exists feedback_votes_count_idx on public.feedback (votes_count desc);

alter table public.feedback enable row level security;
alter table public.feedback_admins enable row level security;
alter table public.feedback_votes enable row level security;

drop policy if exists "Anyone can read feedback" on public.feedback;
create policy "Anyone can read feedback" on public.feedback for select using (true);

drop policy if exists "Anyone can submit feedback" on public.feedback;
create policy "Anyone can submit feedback" on public.feedback for insert to anon, authenticated
  with check (status = 'open' and votes_count = 0);

drop policy if exists "Admins can update feedback" on public.feedback;
create policy "Admins can update feedback" on public.feedback for update to authenticated
  using (exists (select 1 from public.feedback_admins a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.feedback_admins a where a.user_id = (select auth.uid())));

drop policy if exists "Admins can read their own admin record" on public.feedback_admins;
create policy "Admins can read their own admin record" on public.feedback_admins for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.toggle_feedback_vote(p_feedback_id uuid, p_voter_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  vote_exists boolean;
begin
  if p_voter_id is null then
    raise exception 'A voter ID is required';
  end if;

  perform 1 from public.feedback where id = p_feedback_id for update;
  if not found then
    raise exception 'Feedback not found';
  end if;

  select exists (
    select 1 from public.feedback_votes
    where feedback_id = p_feedback_id and voter_id = p_voter_id
  ) into vote_exists;

  if vote_exists then
    delete from public.feedback_votes
    where feedback_id = p_feedback_id and voter_id = p_voter_id;
    update public.feedback set votes_count = greatest(0, votes_count - 1) where id = p_feedback_id;
    return false;
  end if;

  insert into public.feedback_votes (feedback_id, voter_id) values (p_feedback_id, p_voter_id);
  update public.feedback set votes_count = votes_count + 1 where id = p_feedback_id;
  return true;
end;
$$;

revoke all on function public.toggle_feedback_vote(uuid, uuid) from public;
grant execute on function public.toggle_feedback_vote(uuid, uuid) to anon, authenticated;

grant select, insert on public.feedback to anon, authenticated;
grant update on public.feedback to authenticated;
grant select on public.feedback_admins to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'feedback'
  ) then
    alter publication supabase_realtime add table public.feedback;
  end if;
exception when undefined_object then
  raise notice 'Supabase Realtime publication is not available; enable Realtime for public.feedback in the dashboard.';
end;
$$;

-- Create an admin account in Supabase Authentication, then register that user's UUID:
-- insert into public.feedback_admins (user_id) values ('00000000-0000-0000-0000-000000000000');
