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
  <header>
    <h1>Knowager</h1>
    <nav>
      <a href={`${base}/app`}>Home</a>
      <a href={`${base}/app/profile`}>Profile</a>
      {#if data.isAdmin}
        <a href={`${base}/app/admin`}>Admin</a>
      {/if}
<<<<<<< codex/implement-project-as-described-in-plans.md-vbkc00
      <button onclick={logout}>Esci</button>
=======
      <button on:click={logout}>Esci</button>
>>>>>>> main
    </nav>
  </header>
  <main>{@render children()}</main>
</div>

<style>
  .shell {
    max-width: 1100px;
    margin: 0 auto;
    padding: 1rem;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }
  h1 {
    margin: 0;
    font-size: 1.4rem;
  }
  nav {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  a,
  button {
    text-decoration: none;
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    border: 1px solid #d1d5db;
    background: white;
    font: inherit;
    cursor: pointer;
  }
</style>
