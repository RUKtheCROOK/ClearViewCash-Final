alter table public.bill_payments
  add column prev_next_due_at date;

comment on column public.bill_payments.prev_next_due_at is
  'The bill''s next_due_at value before this payment advanced it. Null when the payment did not advance the cycle (advanceCycle: false) or for rows created before this column existed.';
