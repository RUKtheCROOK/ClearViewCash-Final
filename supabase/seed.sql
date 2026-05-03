-- Local dev seed data. Runs after migrations on `supabase db reset`.
-- Don't put production-shaped real data here.

-- Two test users via the auth helper. Their personal spaces auto-create via trigger.
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000001', 'alice@example.com', crypt('password123', gen_salt('bf')), now(), '{"display_name":"Alice"}'),
  ('00000000-0000-0000-0000-000000000002', 'bob@example.com', crypt('password123', gen_salt('bf')), now(), '{"display_name":"Bob"}')
on conflict (id) do nothing;
