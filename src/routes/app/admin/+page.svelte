<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { enforceAllowlist } from '$lib/session';

  type Closure = { day: string; note: string | null };

  let closures: Closure[] = [];
  let newDay = '';
  let newNote = '';
  let warning = '';
  let message = '';
  let error = '';
  let loading = true;

  onMount(async () => {
    const allow = await enforceAllowlist();
    if (!allow.admin) {
      await goto(`${base}/app`);
      return;
    }
    await loadAll();
  });

  async function loadAll() {
    loading = true;
    const [closuresRes, warningRes] = await Promise.all([
      supabase.from('closures').select('day,note').order('day', { ascending: true }),
      supabase.from('app_config').select('value').eq('key', 'homepage_warning').maybeSingle()
    ]);

    if (closuresRes.error || warningRes.error) {
      error = closuresRes.error?.message || warningRes.error?.message || 'Errore caricamento';
      loading = false;
      return;
    }

    closures = closuresRes.data ?? [];
    warning = warningRes.data?.value ?? '';
    loading = false;
  }

  async function addClosure() {
    message = '';
    error = '';
    if (!newDay) return;

    const { error: insertError } = await supabase.from('closures').upsert({ day: newDay, note: newNote || null });
    if (insertError) {
      error = insertError.message;
      return;
    }

    message = 'Chiusura salvata';
    newDay = '';
    newNote = '';
    await loadAll();
  }

  async function removeClosure(day: string) {
    const { error: deleteError } = await supabase.from('closures').delete().eq('day', day);
    if (deleteError) {
      error = deleteError.message;
      return;
    }
    await loadAll();
  }

  async function saveWarning() {
    const { data: userData } = await supabase.auth.getUser();
    const updated_by = userData.user?.id;

    if (!warning.trim()) {
      const { error: deleteError } = await supabase.from('app_config').delete().eq('key', 'homepage_warning');
      if (deleteError) {
        error = deleteError.message;
        return;
      }
      message = 'Warning rimosso';
      await loadAll();
      return;
    }

    const { error: warningError } = await supabase.from('app_config').upsert({
      key: 'homepage_warning',
      value: warning,
      updated_by
    });

    if (warningError) {
      error = warningError.message;
      return;
    }

    message = 'Warning aggiornato';
    await loadAll();
  }
</script>

<svelte:head><title>Knowager - Admin</title></svelte:head>

{#if loading}
  <p>Caricamento...</p>
{:else}
  <section class="grid">
    <article class="card">
      <h2>Giorni non selezionabili</h2>
      <form class="inline" on:submit|preventDefault={addClosure}>
        <input type="date" bind:value={newDay} required />
        <input placeholder="Nota opzionale" bind:value={newNote} />
        <button type="submit">Aggiungi</button>
      </form>
      <ul>
        {#if closures.length === 0}
          <li>Nessuna chiusura impostata.</li>
        {:else}
          {#each closures as closure}
            <li>
              <span>{closure.day} {closure.note ? `— ${closure.note}` : ''}</span>
              <button on:click={() => removeClosure(closure.day)}>Rimuovi</button>
            </li>
          {/each}
        {/if}
      </ul>
    </article>

    <article class="card">
      <h2>Warning homepage</h2>
      <textarea rows="5" bind:value={warning} placeholder="Testo warning"></textarea>
      <button on:click={saveWarning}>Salva warning</button>
    </article>
  </section>
{/if}

{#if message}<p class="ok">{message}</p>{/if}
{#if error}<p class="error">{error}</p>{/if}

<style>
  .grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: 1fr;
  }
  .card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 1rem;
  }
  .inline {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.5rem;
  }
  li {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 0.4rem;
  }
  textarea,
  input,
  button {
    font: inherit;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 0.55rem 0.7rem;
    background: white;
  }
  .ok {
    color: #166534;
  }
  .error {
    color: #b91c1c;
  }
  @media (min-width: 900px) {
    .grid {
      grid-template-columns: 1fr 1fr;
    }
    .inline {
      grid-template-columns: 180px 1fr auto;
    }
  }
</style>
