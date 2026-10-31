-- R9-S5: database size report (run with psql)
-- Usage: psql "$DIRECT_URL" -f scripts/ops/db-size-report.sql
\pset pager off

select current_database() as database,
       pg_size_pretty(pg_database_size(current_database())) as database_size,
       pg_database_size(current_database()) as database_bytes;

-- Top 10 tables by total size (table + indexes + TOAST)
select c.relname as table_name,
       pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
       pg_total_relation_size(c.oid) as total_bytes,
       coalesce(s.n_live_tup, 0) as live_rows
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_stat_user_tables s on s.relid = c.oid
where n.nspname = 'public' and c.relkind = 'r'
order by total_bytes desc
limit 10;

-- Exam flow tables called out explicitly
select 'ExamAttempt' as table_name,
       pg_size_pretty(pg_total_relation_size('"ExamAttempt"'::regclass)) as total_size,
       (select count(*) from "ExamAttempt") as exact_rows
union all
select 'ExamAttemptAnswer',
       pg_size_pretty(pg_total_relation_size('"ExamAttemptAnswer"'::regclass)),
       (select count(*) from "ExamAttemptAnswer");
