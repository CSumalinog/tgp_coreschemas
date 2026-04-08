-- Normalize existing semester names to: "<1st|2nd> Sem A.Y. YYYY - YYYY"
-- Priority for academic year start:
-- 1) Parse from existing name if already present (A.Y. YYYY - YYYY)
-- 2) Derive from start_date and inferred semester (2nd uses previous year)

with normalized as (
  select
    id,
    case
      when lower(coalesce(name, '')) like '%2nd%' then '2nd'
      else '1st'
    end as sem_choice,
    coalesce(
      nullif(substring(name from 'A\.Y\.\s*([0-9]{4})\s*-\s*[0-9]{4}'), '')::int,
      case
        when start_date is null then null
        when lower(coalesce(name, '')) like '%2nd%' then extract(year from start_date)::int - 1
        else extract(year from start_date)::int
      end
    ) as ay_start
  from public.semesters
)
update public.semesters s
set name = concat(
  n.sem_choice,
  ' Sem A.Y. ',
  n.ay_start,
  ' - ',
  n.ay_start + 1
)
from normalized n
where s.id = n.id
  and n.ay_start is not null;
