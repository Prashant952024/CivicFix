insert into storage.buckets (id, name, public)
values ('issue-images', 'issue-images', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;
