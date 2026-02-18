<script lang="ts">
  import { base } from '$app/paths';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';
  let { data, children } = $props();

  async function logout() {
    await supabase.auth.signOut();
    await goto(`${base}/login`);
  }
</script>

<div class="shell">
  <header class="topbar">
    <a class="brand" href={`${base}/app`}>
      <span class="brand-icon" aria-hidden="true">🗓️</span>
      <span>Knowager</span>
    </a>

    <nav class="actions">
      <a class="profile-link" href={`${base}/app/profile`}>Profile</a>
      {#if data.isAdmin}
        <a class="admin-link" href={`${base}/app/admin`}>Admin</a>
      {/if}
      <button class="logout" onclick={logout}>Esci</button>
    </nav>
  </header>

  <main>{@render children()}</main>
</div>

<style>
  .shell {
    min-height: 100vh;
  }

  .topbar {
    height: 72px;
    padding: 0 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #d6dee8;
    background: #f8fafc;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 0.7rem;
    text-decoration: none;
    color: #111827;
    font-size: 2rem;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .brand-icon {
    display: inline-grid;
    place-items: center;
    font-size: 1.65rem;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .actions :is(a, button) {
    text-decoration: none;
    border: 1px solid #d6dee8;
    border-radius: 12px;
    padding: 0.6rem 1rem;
    background: #edf2f7;
    color: #111827;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .actions :is(a, button):hover {
    background: #e2e8f0;
  }

  @media (max-width: 900px) {
    .topbar {
      height: auto;
      padding: 1rem;
      gap: 0.75rem;
      flex-direction: column;
      align-items: stretch;
    }

    .brand {
      font-size: 1.5rem;
      justify-content: center;
    }

    .actions {
      flex-wrap: wrap;
      justify-content: center;
    }
  }
</style>