insert into storage.buckets (id, name, public)
values ('resolution-images', 'resolution-images', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;
