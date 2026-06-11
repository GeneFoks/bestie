-- ══════════════════════════════════════════════════════════════════
-- Security hardening → lock down SECURITY DEFINER functions
--
-- New Postgres functions are granted EXECUTE to PUBLIC by default, which
-- means anon/authenticated can call them over the PostgREST RPC API. The
-- functions below should NOT be callable from the client:
--
--   • explain_bestie_score        → diagnostic; leaks profile/score detail
--   • recalculate_all_bestie_scores→ heavy full recompute (DoS risk)
--   • recalculate_bestie_score     → per-user recompute (called by triggers,
--                                    which run as owner regardless of grants)
--
-- Revoking PUBLIC leaves them runnable only by the table owner / service
-- role (Supabase SQL Editor) and by the triggers that already use them.
--
-- The admin dashboards stay reachable for logged-in users (they enforce
-- is_admin internally), but we drop PUBLIC so anon can't even invoke them.
-- Safe to re-run.
-- ══════════════════════════════════════════════════════════════════

-- NOTE: Supabase explicitly grants EXECUTE to the anon and authenticated
-- roles on public functions (not via PUBLIC), so we must revoke from those
-- roles by name — REVOKE ... FROM PUBLIC alone does nothing here.

-- Diagnostic / maintenance — service role + triggers only.
REVOKE ALL ON FUNCTION public.explain_bestie_score(TEXT)          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalculate_all_bestie_scores()     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalculate_bestie_score(UUID)      FROM PUBLIC, anon, authenticated;

-- Admin dashboards — drop anon, keep authenticated (function checks is_admin).
REVOKE ALL ON FUNCTION public.admin_dashboard(INTEGER)  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_analytics(INTEGER)  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics(INTEGER) TO authenticated;
