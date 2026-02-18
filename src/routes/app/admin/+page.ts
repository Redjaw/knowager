import { browser } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import { enforceAllowlist } from '$lib/session';
import { base } from '$app/paths';

export async function load() {
  if (!browser) {
    return {};
  }

  const allow = await enforceAllowlist();
  if (!allow.admin) {
    throw redirect(307, `${base}/app`);
  }

  return {};
}
