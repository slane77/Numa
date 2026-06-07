-- Extensions
create extension if not exists "pgcrypto";

-- Enums
create type tier_type        as enum ('free','premium');
create type goal_type        as enum ('weight_loss','maintain','weight_gain','event');
create type preference_kind  as enum ('like','dislike','allergy','diet');
create type meal_type        as enum ('breakfast','lunch','dinner','snack');
create type plan_status      as enum ('draft','active','completed','archived');
create type list_status      as enum ('open','completed','archived');

-- updated_at helper
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- PROFILES (1:1 with auth.users)
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  dob           date,
  height_cm     numeric(5,1),
  sex           text check (sex in ('male','female','other','prefer_not')),
  activity_level text check (activity_level in ('sedentary','light','moderate','active','very_active')),
  tier          tier_type not null default 'free',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- GOALS
create table goals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  type            goal_type not null,
  target_weight_kg numeric(5,1),
  target_date     date,
  protein_target_g integer,
  calorie_target  integer,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index goals_user_idx on goals(user_id);

-- WEIGHT LOGS
create table weight_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  logged_at  date not null default current_date,
  weight_kg  numeric(5,1) not null,
  note       text,
  created_at timestamptz not null default now()
);
create index weight_logs_user_idx on weight_logs(user_id, logged_at);

-- FOOD PREFERENCES
create table food_preferences (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       preference_kind not null,
  value      text not null,
  severity   text check (severity in ('mild','moderate','severe')),
  created_at timestamptz not null default now()
);
create index food_preferences_user_idx on food_preferences(user_id);

-- INVENTORY (pantry)
create table inventory (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  item_name  text not null,
  quantity   numeric(10,2) not null default 1,
  unit       text,
  category   text,
  expires_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index inventory_user_idx on inventory(user_id);

-- RECIPES
create table recipes (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  title               text not null,
  servings            integer not null default 1,
  calories_per_serving integer,
  protein_g           numeric(6,1),
  method              text,
  source              text,
  is_public           boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index recipes_user_idx on recipes(user_id);

-- RECIPE INGREDIENTS
create table recipe_ingredients (
  id         uuid primary key default gen_random_uuid(),
  recipe_id  uuid not null references recipes(id) on delete cascade,
  item_name  text not null,
  quantity   numeric(10,2),
  unit       text
);
create index recipe_ingredients_recipe_idx on recipe_ingredients(recipe_id);

-- MEAL PLANS
create table meal_plans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text,
  start_date date not null,
  end_date   date not null,
  status     plan_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index meal_plans_user_idx on meal_plans(user_id);

create table meal_plan_items (
  id           uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references meal_plans(id) on delete cascade,
  day          date not null,
  meal         meal_type not null,
  recipe_id    uuid references recipes(id) on delete set null,
  servings     integer not null default 1
);
create index meal_plan_items_plan_idx on meal_plan_items(meal_plan_id);

-- SHOPPING LISTS
create table shopping_lists (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  meal_plan_id uuid references meal_plans(id) on delete set null,
  title        text,
  status       list_status not null default 'open',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index shopping_lists_user_idx on shopping_lists(user_id);

create table shopping_list_items (
  id               uuid primary key default gen_random_uuid(),
  shopping_list_id uuid not null references shopping_lists(id) on delete cascade,
  item_name        text not null,
  quantity         numeric(10,2),
  unit             text,
  category         text,
  have_in_pantry   boolean not null default false,
  purchased        boolean not null default false
);
create index shopping_list_items_list_idx on shopping_list_items(shopping_list_id);

-- updated_at triggers
create trigger t_profiles_u       before update on profiles       for each row execute function set_updated_at();
create trigger t_goals_u          before update on goals          for each row execute function set_updated_at();
create trigger t_inventory_u      before update on inventory      for each row execute function set_updated_at();
create trigger t_recipes_u        before update on recipes        for each row execute function set_updated_at();
create trigger t_meal_plans_u     before update on meal_plans     for each row execute function set_updated_at();
create trigger t_shopping_lists_u before update on shopping_lists for each row execute function set_updated_at();

-- Auto-create a profile when a new auth user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', null));
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
