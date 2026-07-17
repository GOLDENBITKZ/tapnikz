-- V23: DB-level UNIQUE constraint on (manager_username, client_username)
-- Enforces the "first payment only" rule at the database level.
-- Without this, a race condition (two simultaneous payments) could create
-- two commission rows before either is written, bypassing the code-level guard.
-- If a duplicate is attempted, Postgres throws error code 23505 — the insert
-- fails cleanly and activate-premium.ts silently skips commission creation.

ALTER TABLE public.sales_commissions
  ADD CONSTRAINT sc_manager_client_unique
  UNIQUE (manager_username, client_username);
