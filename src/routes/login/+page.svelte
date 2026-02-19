<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { enforceAllowlist } from '$lib/session';

  const WHITELIST_CHECK_ERROR =
    'Impossibile verificare la whitelist in questo momento. Procedo con il login standard.';

  let email = '';
  let loading = false;
  let statusMessage = '';
  let errorMessage = '';

  onMount(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;

    const allow = await enforceAllowlist();
    if (allow.allowed) {
      await goto(`${base}/app`);
    } else {
      errorMessage = 'Accesso non autorizzato';
    }
  });

  async function sendLink() {
    loading = true;
    statusMessage = '';
    errorMessage = '';

    const normalizedEmail = email.trim().toLowerCase();
    const { data: canRequest, error: whitelistError } = await supabase.rpc('can_request_magic_link', {
      request_email: normalizedEmail
    });

    if (whitelistError) {
      console.warn(WHITELIST_CHECK_ERROR, whitelistError);
    }

    if (!whitelistError && !canRequest) {
      loading = false;
      errorMessage = 'Non sei abilitato ad accedere.';
      return;
    }

    const redirectTo = `${window.location.origin}${base}/app`;
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: redirectTo
      }
    });

    loading = false;
    if (error) {
      errorMessage = error.message;
      return;
    }

    statusMessage = 'Controlla la tua email per il magic link.';
  }
</script>

<svelte:head>
  <title>Knowager - Accesso</title>
</svelte:head>

<main class="grid min-h-screen place-items-center p-4">
  <section class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <h1 class="text-3xl font-bold text-slate-900">
      <img src={`${base}/knowager-logo.png`} alt="Knowager" class="h-10 w-auto" />
    </h1>
    <p class="mt-1 text-slate-600">Accedi con magic link</p>

    <form class="mt-5 grid gap-3" on:submit|preventDefault={sendLink}>
      <label class="text-sm font-medium text-slate-700" for="email">Email</label>
      <input
        class="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-blue-500 transition focus:ring-2"
        id="email"
        type="email"
        bind:value={email}
        placeholder="nome@email.com"
        required
      />
      <button class="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={loading || !email}>
        {loading ? 'Invio in corso...' : 'Invia link'}
      </button>
    </form>

    {#if statusMessage}
      <p class="mt-4 text-sm font-medium text-green-700">{statusMessage}</p>
    {/if}
    {#if errorMessage}
      <p class="mt-4 text-sm font-medium text-red-700">{errorMessage}</p>
    {/if}
  </section>
</main>
