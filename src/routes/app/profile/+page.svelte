<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  const avatars = ['fox', 'owl', 'cat', 'bear', 'rabbit', 'tiger'];
  const avatarEmojis: Record<string, string> = {
    fox: '🦊',
    owl: '🦉',
    cat: '🐱',
    bear: '🐻',
    rabbit: '🐰',
    tiger: '🐯'
  };

  let first_name = '';
  let last_name = '';
  let birth_date = '';
  let avatar_id = 'fox';
  let status = '';
  let error = '';
  let loading = true;

  onMount(async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name,last_name,birth_date,avatar_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      error = profileError.message;
      loading = false;
      return;
    }

    if (profile) {
      first_name = profile.first_name ?? '';
      last_name = profile.last_name ?? '';
      birth_date = profile.birth_date ?? '';
      avatar_id = profile.avatar_id ?? 'fox';
    } else {
      await supabase.from('profiles').upsert({ id: user.id, email: user.email, avatar_id: 'fox' });
    }

    loading = false;
  });

  async function save() {
    status = '';
    error = '';

    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;

    const { error: saveError } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      first_name: first_name || null,
      last_name: last_name || null,
      birth_date: birth_date || null,
      avatar_id
    });

    if (saveError) {
      error = saveError.message;
      return;
    }

    status = 'Profilo salvato.';
  }
</script>

<svelte:head><title>Knowager - Profilo</title></svelte:head>

{#if loading}
  <p>Caricamento...</p>
{:else}
  <section class="card">
    <h2>Profilo</h2>
    <form on:submit|preventDefault={save}>
      <label>Nome <input bind:value={first_name} /></label>
      <label>Cognome <input bind:value={last_name} /></label>
      <label>Data di nascita <input type="date" bind:value={birth_date} /></label>
      <label>Avatar</label>
      <div class="avatar-picker">
        {#each avatars as avatar}
          <button type="button" class:selected={avatar_id === avatar} on:click={() => (avatar_id = avatar)}>
            {avatarEmojis[avatar]} {avatar}
          </button>
        {/each}
      </div>
      <button type="submit">Salva</button>
    </form>
    {#if status}<p class="ok">{status}</p>{/if}
    {#if error}<p class="error">{error}</p>{/if}
  </section>
{/if}

<style>
  .card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 1rem;
    max-width: 560px;
  }
  form {
    display: grid;
    gap: 0.75rem;
  }
  label {
    display: grid;
    gap: 0.3rem;
  }
  input,
  button {
    font: inherit;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 0.55rem 0.7rem;
    background: white;
  }
  .avatar-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .avatar-picker button.selected {
    border-color: #2563eb;
    box-shadow: inset 0 0 0 1px #2563eb;
  }
  .ok {
    color: #166534;
  }
  .error {
    color: #b91c1c;
  }
</style>
