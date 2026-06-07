-- Enable RLS everywhere
alter table profiles            enable row level security;
alter table goals               enable row level security;
alter table weight_logs         enable row level security;
alter table food_preferences    enable row level security;
alter table inventory           enable row level security;
alter table recipes             enable row level security;
alter table recipe_ingredients  enable row level security;
alter table meal_plans          enable row level security;
alter table meal_plan_items     enable row level security;
alter table shopping_lists      enable row level security;
alter table shopping_list_items enable row level security;

-- PROFILES: owner-only (id = auth.uid())
create policy profiles_select on profiles for select using (id = auth.uid());
create policy profiles_update on profiles for update using (id = auth.uid());

-- Generic owner policy pattern (user_id = auth.uid()) on direct-owned tables
create policy goals_all            on goals            for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy weight_logs_all      on weight_logs      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy food_preferences_all on food_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy inventory_all        on inventory        for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy meal_plans_all       on meal_plans       for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy shopping_lists_all   on shopping_lists   for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- RECIPES: owner full access + public read
create policy recipes_owner_all on recipes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy recipes_public_read on recipes for select using (is_public = true);

-- Child tables: access governed by parent ownership
create policy recipe_ingredients_all on recipe_ingredients for all
  using (exists (select 1 from recipes r where r.id = recipe_id and (r.user_id = auth.uid() or r.is_public)))
  with check (exists (select 1 from recipes r where r.id = recipe_id and r.user_id = auth.uid()));

create policy meal_plan_items_all on meal_plan_items for all
  using (exists (select 1 from meal_plans m where m.id = meal_plan_id and m.user_id = auth.uid()))
  with check (exists (select 1 from meal_plans m where m.id = meal_plan_id and m.user_id = auth.uid()));

create policy shopping_list_items_all on shopping_list_items for all
  using (exists (select 1 from shopping_lists s where s.id = shopping_list_id and s.user_id = auth.uid()))
  with check (exists (select 1 from shopping_lists s where s.id = shopping_list_id and s.user_id = auth.uid()));
