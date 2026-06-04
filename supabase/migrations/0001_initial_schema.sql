-- Phase 1: full schema for the book & movie recommendation website.

-- profiles: one row per authenticated user.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Reader',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- search_history: every search a user performs.
create table public.search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  query text not null,
  clicked_item_id text,
  clicked_item_type text check (clicked_item_type in ('book', 'movie')),
  created_at timestamptz not null default now()
);

-- saved_items: a user's personal list.
create table public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null,
  item_type text not null check (item_type in ('book', 'movie')),
  title text not null,
  cover_url text,
  created_at timestamptz not null default now(),
  unique (user_id, item_id, item_type)
);

-- featured_items: hand-curated home-page picks (managed by the site owner).
create table public.featured_items (
  id uuid primary key default gen_random_uuid(),
  item_id text not null,
  item_type text not null check (item_type in ('book', 'movie')),
  title text not null,
  cover_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- board_posts: global discussion board. parent_id null = top-level post.
create table public.board_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  parent_id uuid references public.board_posts (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

-- title_comments: comments attached to a specific book/movie.
create table public.title_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null,
  item_type text not null check (item_type in ('book', 'movie')),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user is created.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', 'Reader'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row-Level Security.
alter table public.profiles enable row level security;
alter table public.search_history enable row level security;
alter table public.saved_items enable row level security;
alter table public.featured_items enable row level security;
alter table public.board_posts enable row level security;
alter table public.title_comments enable row level security;

-- profiles: anyone can read; a user may update only their own.
create policy "profiles are readable by everyone"
  on public.profiles for select using (true);
create policy "users update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- search_history: fully private to the owning user.
create policy "users read their own history"
  on public.search_history for select using (auth.uid() = user_id);
create policy "users insert their own history"
  on public.search_history for insert with check (auth.uid() = user_id);
create policy "users delete their own history"
  on public.search_history for delete using (auth.uid() = user_id);

-- saved_items: fully private to the owning user.
create policy "users read their own saved items"
  on public.saved_items for select using (auth.uid() = user_id);
create policy "users insert their own saved items"
  on public.saved_items for insert with check (auth.uid() = user_id);
create policy "users delete their own saved items"
  on public.saved_items for delete using (auth.uid() = user_id);

-- featured_items: readable by everyone; writes only via service role
-- (service role bypasses RLS, so no write policy is needed).
create policy "featured items are readable by everyone"
  on public.featured_items for select using (true);

-- board_posts: readable by everyone; a user writes/deletes only their own.
create policy "board posts are readable by everyone"
  on public.board_posts for select using (true);
create policy "users insert their own board posts"
  on public.board_posts for insert with check (auth.uid() = user_id);
create policy "users delete their own board posts"
  on public.board_posts for delete using (auth.uid() = user_id);

-- title_comments: readable by everyone; a user writes/deletes only their own.
create policy "title comments are readable by everyone"
  on public.title_comments for select using (true);
create policy "users insert their own title comments"
  on public.title_comments for insert with check (auth.uid() = user_id);
create policy "users delete their own title comments"
  on public.title_comments for delete using (auth.uid() = user_id);
