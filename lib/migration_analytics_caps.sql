-- ══════════════════════════════════════════════════════════════════
-- analytics_events → bound field lengths (defense in depth)
--
-- The client tracker already clamps these, but analytics_events allows
-- INSERT from anon, so a direct API caller could try to store huge values.
-- A CHECK constraint caps row size at the DB level. Safe to re-run.
--
-- NOTE: this does not rate-limit the NUMBER of rows. A hard anti-flood
-- guarantee would require routing analytics through a server endpoint with
-- IP rate limiting (see lib/rateLimit.ts) — tracked as a follow-up.
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.analytics_events DROP CONSTRAINT IF EXISTS analytics_events_len_chk;
ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_events_len_chk CHECK (
        length(coalesce(event_type, '')) <= 40
    AND length(coalesce(path,       '')) <= 400
    AND length(coalesce(element,    '')) <= 200
    AND length(coalesce(href,       '')) <= 400
    AND length(coalesce(referrer,   '')) <= 400
    AND length(coalesce(browser,    '')) <= 40
    AND length(coalesce(os,         '')) <= 40
    AND length(coalesce(device_type,'')) <= 20
  );
