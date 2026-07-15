-- ============================================================================
-- BESTIE — Moderation
-- Admin-only RPCs to review user reports and ban/unban users.
-- Gate: users.is_admin = true (same gate as admin_dashboard).
-- Ban: sets auth.users.banned_until so the account cannot sign in or
-- refresh a token — the strongest lever available without deleting data.
-- ============================================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.assert_admin()
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = TRUE) THEN
    RAISE EXCEPTION 'Admins only';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── List reports with both profiles attached ────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_list_reports()
RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
  PERFORM public.assert_admin();
  SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.created_at DESC), '[]'::json)
  INTO v_result
  FROM (
    SELECT
      ur.id, ur.reason, ur.status, ur.created_at,
      json_build_object('id', rep.id, 'full_name', rep.full_name, 'username', rep.username,
                        'avatar_url', rep.avatar_url) AS reporter,
      json_build_object('id', tgt.id, 'full_name', tgt.full_name, 'username', tgt.username,
                        'avatar_url', tgt.avatar_url, 'bestie_score', tgt.bestie_score,
                        'is_banned', tgt.is_banned,
                        'report_count', (SELECT COUNT(*) FROM public.user_reports x
                                         WHERE x.reported_id = tgt.id
                                           AND COALESCE(x.status,'pending') <> 'dismissed')) AS reported
    FROM public.user_reports ur
    LEFT JOIN public.users rep ON rep.id = ur.reporter_id
    LEFT JOIN public.users tgt ON tgt.id = ur.reported_id
  ) r;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Update a report's status: pending | reviewed | dismissed ────────────────
CREATE OR REPLACE FUNCTION public.admin_set_report_status(p_report_id UUID, p_status TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM public.assert_admin();
  IF p_status NOT IN ('pending', 'reviewed', 'dismissed') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  UPDATE public.user_reports SET status = p_status WHERE id = p_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Ban / unban ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_set_ban(p_user_id UUID, p_banned BOOLEAN)
RETURNS VOID AS $$
BEGIN
  PERFORM public.assert_admin();
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot ban yourself';
  END IF;

  PERFORM set_config('bestie.system', 'on', true);
  UPDATE public.users SET is_banned = p_banned WHERE id = p_user_id;

  -- Block (or restore) sign-in at the auth layer
  UPDATE auth.users
  SET banned_until = CASE WHEN p_banned THEN 'infinity'::timestamptz ELSE NULL END
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Banned users disappear from public browsing (RLS stays permissive for the
-- rest — the auth ban already locks them out of the app itself).
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON public.users(is_banned) WHERE is_banned;
