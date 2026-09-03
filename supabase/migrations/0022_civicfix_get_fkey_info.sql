create or replace function public.debug_get_fkey_info()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_agg(
    jsonb_build_object(
      'constraint_name', tc.constraint_name,
      'table_name', tc.table_name,
      'column_name', kcu.column_name,
      'foreign_table_name', ccu.table_name,
      'foreign_column_name', ccu.column_name
    )
  ) into result
  from information_schema.table_constraints AS tc 
  join information_schema.key_column_usage AS kcu
    on tc.constraint_name = kcu.constraint_name
    and tc.table_schema = kcu.table_schema
  join information_schema.constraint_column_usage AS ccu
    on ccu.constraint_name = tc.constraint_name
    and ccu.table_schema = tc.table_schema
  where tc.constraint_type = 'FOREIGN KEY'
    and tc.table_name in ('department_worker_assignments', 'issue_department_assignments');

  return result;
end;
$$;

grant execute on function public.debug_get_fkey_info() to anon, authenticated;
