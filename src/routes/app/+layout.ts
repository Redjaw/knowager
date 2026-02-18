import { browser } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';
import { enforceAllowlist } from '$lib/session';
import { base } from '$app/paths';

export async function load() {
  if (!browser) {
    return {};
  }

  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    throw redirect(307, `${base}/login`);
  }

  const allow = await enforceAllowlist();
  if (!allow.allowed) {
    throw redirect(307, `${base}/login`);
  }

  return { isAdmin: allow.admin };
}
