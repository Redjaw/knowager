<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { enforceAllowlist } from '$lib/session';

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

    const redirectTo = `${window.location.origin}${base}/app`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
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
  <title>Knowager - Login</title>
</svelte:head>

<main class="login-page">
  <section class="card">
    <h1>Knowager</h1>
    <p class="subtitle">Accedi con magic link</p>

    <form
      on:submit|preventDefault={sendLink}
    >
      <label for="email">Email</label>
      <input id="email" type="email" bind:value={email} placeholder="nome@email.com" required />
      <button type="submit" disabled={loading || !email}>{loading ? 'Invio in corso...' : 'Invia link'}</button>
    </form>

    {#if statusMessage}
      <p class="status">{statusMessage}</p>
    {/if}
    {#if errorMessage}
      <p class="error">{errorMessage}</p>
    {/if}
  </section>
</main>

<style>
  .login-page {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 1rem;
  }
  .card {
    width: min(420px, 100%);
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid #e5e7eb;
  }
  h1 {
    margin: 0;
    font-size: 1.8rem;
  }
  .subtitle {
    margin: 0.25rem 0 1rem;
    color: #6b7280;
  }
  form {
    display: grid;
    gap: 0.75rem;
  }
  input,
  button {
    border-radius: 8px;
    border: 1px solid #d1d5db;
    padding: 0.7rem 0.85rem;
    font: inherit;
  }
  button {
    background: #111827;
    color: white;
    border-color: #111827;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .status {
    color: #166534;
  }
  .error {
    color: #b91c1c;
  }
</style>
