-- Fix Supabase Advisor CRITICAL: "Security Definer View" on the three
-- convenience views from the initial schema. Postgres views default to
-- SECURITY DEFINER semantics (run with the view owner's privileges,
-- bypassing the querying user's RLS). No application code queries these
-- views, but flip them to invoker so they respect RLS if ever exposed.
--
-- Already applied manually to the hosted project (2026-07-08); this
-- migration keeps local/fresh environments in sync. Idempotent.

ALTER VIEW public.v_latest_executions SET (security_invoker = true);
ALTER VIEW public.v_node_performance SET (security_invoker = true);
ALTER VIEW public.v_active_recommendations SET (security_invoker = true);
