alter table public.tasks alter column user_id set default auth.uid();
alter table public.task_comments alter column user_id set default auth.uid();
alter table public.tasks add column if not exists completed_at timestamptz;
update public.tasks set completed_at = updated_at
where status = 'done' and completed_at is null;

alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;

drop policy if exists "Public board tasks" on public.tasks;
drop policy if exists "Public board comments" on public.task_comments;
drop policy if exists "Users manage own tasks" on public.tasks;
drop policy if exists "Users manage own comments" on public.task_comments;
drop policy if exists "tasks_select_own" on public.tasks;
drop policy if exists "tasks_insert_own" on public.tasks;
drop policy if exists "tasks_update_own" on public.tasks;
drop policy if exists "tasks_delete_own" on public.tasks;
drop policy if exists "comments_select_own" on public.task_comments;
drop policy if exists "comments_insert_own" on public.task_comments;
drop policy if exists "comments_update_own" on public.task_comments;
drop policy if exists "comments_delete_own" on public.task_comments;

create policy "tasks_select_own" on public.tasks for select to authenticated using ((select auth.uid()) = user_id);
create policy "tasks_insert_own" on public.tasks for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "tasks_update_own" on public.tasks for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "tasks_delete_own" on public.tasks for delete to authenticated using ((select auth.uid()) = user_id);

create policy "comments_select_own" on public.task_comments for select to authenticated using ((select auth.uid()) = user_id);
create policy "comments_insert_own" on public.task_comments for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "comments_update_own" on public.task_comments for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "comments_delete_own" on public.task_comments for delete to authenticated using ((select auth.uid()) = user_id);
