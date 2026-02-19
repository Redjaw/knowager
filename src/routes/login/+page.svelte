<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { enforceAllowlist } from '$lib/session';

  const OAUTH_ERROR = 'Impossibile completare l’accesso con Google. Riprova più tardi.';

  // Kept to avoid runtime issues on stale bundles referencing `email`.
  let email = '';
  let loading = false;
  let errorMessage = '';

  onMount(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;

    const allow = await enforceAllowlist();
    if (allow.allowed) {
      await goto(`${base}/app`);
      return;
    }

    errorMessage = 'Accesso non autorizzato';
  });

  async function loginWithGoogle() {
    loading = true;
    errorMessage = '';

    const redirectTo = `${window.location.origin}${base}/app`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo
      }
    });

    loading = false;
    if (error) {
      errorMessage = OAUTH_ERROR;
      console.error(OAUTH_ERROR, error);
    }
  }
</script>

<svelte:head>
  <title>Knowager - Accesso</title>
</svelte:head>

<main class="grid min-h-screen place-items-center p-4">
  <section class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <h1 class="text-3xl font-bold text-slate-900">
      <img src={`${base}/knowager-logo.png`} alt="Knowager" class="h-26 w-auto" />
    </h1>
    <p class="mt-1 text-slate-600">Accedi con Google</p>

    <button
      class="mt-5 w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      onclick={loginWithGoogle}
      disabled={loading}
      type="button"
    >
      {loading ? 'Reindirizzamento in corso...' : 'Continua con Google'}
    </button>

    {#if errorMessage}
      <p class="mt-4 text-sm font-medium text-red-700">{errorMessage}</p>
    {/if}
  </section>
</main>
