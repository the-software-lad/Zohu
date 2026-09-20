begin;

create table if not exists public.ai_extraction_rate_limits (
  user_id text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0)
);

alter table public.ai_extraction_rate_limits enable row level security;
revoke all on table public.ai_extraction_rate_limits from anon, authenticated;

create or replace function public.consume_ai_extraction_quota()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id text := auth.jwt() ->> 'sub';
  current_request_count integer;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  insert into public.ai_extraction_rate_limits as limits (
    user_id,
    window_started_at,
    request_count
  )
  values (current_user_id, now(), 1)
  on conflict (user_id) do update
  set
    window_started_at = case
      when limits.window_started_at <= now() - interval '1 minute' then now()
      else limits.window_started_at
    end,
    request_count = case
      when limits.window_started_at <= now() - interval '1 minute' then 1
      else limits.request_count + 1
    end
  returning request_count into current_request_count;

  if current_request_count > 10 then
    raise exception using errcode = 'P0001', message = 'rate_limit_exceeded';
  end if;
end;
$$;

create or replace function public.create_transaction_with_balance(
  p_user_id text,
  p_account_id uuid,
  p_type text,
  p_amount numeric,
  p_category text,
  p_description text,
  p_date timestamptz,
  p_input_method text,
  p_voice_transcript text
)
returns public.transactions
language plpgsql
set search_path = ''
as $$
declare
  current_user_id text := auth.jwt() ->> 'sub';
  created_transaction public.transactions%rowtype;
begin
  if current_user_id is null or current_user_id <> p_user_id then
    raise exception using errcode = '42501', message = 'transaction_user_mismatch';
  end if;

  if p_amount <= 0 or p_type not in ('INCOME', 'EXPENSE') then
    raise exception using errcode = '22023', message = 'invalid_transaction';
  end if;

  insert into public.transactions (
    user_id,
    account_id,
    type,
    amount,
    category,
    description,
    date,
    input_method,
    voice_transcript
  )
  values (
    p_user_id,
    p_account_id,
    p_type,
    p_amount,
    p_category,
    p_description,
    p_date,
    p_input_method,
    p_voice_transcript
  )
  returning * into created_transaction;

  update public.accounts
  set balance = balance + case
    when p_type = 'INCOME' then p_amount
    else -p_amount
  end
  where id = p_account_id
    and user_id = current_user_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'account_not_found';
  end if;

  return created_transaction;
end;
$$;

create or replace function public.delete_transaction_with_balance(
  p_transaction_id uuid
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  current_user_id text := auth.jwt() ->> 'sub';
  deleted_transaction public.transactions%rowtype;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  delete from public.transactions
  where id = p_transaction_id
    and user_id = current_user_id
  returning * into deleted_transaction;

  if not found then
    raise exception using errcode = 'P0002', message = 'transaction_not_found';
  end if;

  update public.accounts
  set balance = balance + case
    when deleted_transaction.type = 'INCOME' then -deleted_transaction.amount
    else deleted_transaction.amount
  end
  where id = deleted_transaction.account_id
    and user_id = current_user_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'account_not_found';
  end if;
end;
$$;

revoke all on function public.consume_ai_extraction_quota() from public;
revoke all on function public.create_transaction_with_balance(text, uuid, text, numeric, text, text, timestamptz, text, text) from public;
revoke all on function public.delete_transaction_with_balance(uuid) from public;

grant execute on function public.consume_ai_extraction_quota() to authenticated;
grant execute on function public.create_transaction_with_balance(text, uuid, text, numeric, text, text, timestamptz, text, text) to authenticated;
grant execute on function public.delete_transaction_with_balance(uuid) to authenticated;

commit;
