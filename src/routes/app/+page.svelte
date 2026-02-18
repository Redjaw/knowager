<script lang="ts">
  import { onMount } from 'svelte';
  import { getCurrentWeek, type WeekDay } from '$lib/dateUtils';
  import { supabase } from '$lib/supabaseClient';

  type Selection = { day: string; user_id: string };
  type PublicProfile = { id: string; first_name: string | null; last_name: string | null; avatar_id: string | null };

  let week: WeekDay[] = getCurrentWeek();
  let selections: Selection[] = [];
  let closureDays = new Set<string>();
  let profiles = new Map<string, PublicProfile>();
  let warning = '';
  let currentUserId = '';
  let loading = true;
  let errorMessage = '';

  const avatarMap: Record<string, string> = {
    fox: '🦊',
    owl: '🦉',
    cat: '🐱',
    bear: '🐻',
    rabbit: '🐰',
    tiger: '🐯'
  };

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    loading = true;
    errorMessage = '';
    const { data: userData } = await supabase.auth.getUser();
    currentUserId = userData.user?.id ?? '';
    const days = week.map((d) => d.key);

    const [selectionsRes, closuresRes, warningRes] = await Promise.all([
      supabase.from('day_selections').select('day,user_id').in('day', days),
      supabase.from('closures').select('day').in('day', days),
      supabase.from('app_config').select('value').eq('key', 'homepage_warning').maybeSingle()
    ]);

    if (selectionsRes.error || closuresRes.error || warningRes.error) {
      errorMessage = selectionsRes.error?.message || closuresRes.error?.message || warningRes.error?.message || 'Errore caricamento';
      loading = false;
      return;
    }

    selections = (selectionsRes.data as Selection[]) ?? [];
    closureDays = new Set((closuresRes.data ?? []).map((row) => row.day));
    warning = warningRes.data?.value ?? '';

    const ids = [...new Set(selections.map((item) => item.user_id))];
    if (ids.length) {
      const profileRes = await supabase
        .from('profiles_public')
        .select('id,first_name,last_name,avatar_id')
        .in('id', ids);

      if (profileRes.error) {
        errorMessage = profileRes.error.message;
      } else {
        profiles = new Map((profileRes.data ?? []).map((p) => [p.id, p as PublicProfile]));
      }
    } else {
      profiles = new Map();
    }

    loading = false;
  }

  function dayMembers(day: string) {
    return selections.filter((item) => item.day === day);
  }

  function isMine(day: string) {
    return selections.some((item) => item.day === day && item.user_id === currentUserId);
  }

  function initials(profile?: PublicProfile) {
    const first = profile?.first_name?.at(0) ?? '';
    const last = profile?.last_name?.at(0) ?? '';
    return `${first}${last}`.toUpperCase() || '?';
  }

  async function toggle(day: string) {
    if (closureDays.has(day)) return;

    const mine = isMine(day);
    const query = supabase.from('day_selections');

    if (mine) {
      const { error } = await query.delete().eq('day', day).eq('user_id', currentUserId);
      if (error) {
        errorMessage = error.message;
        return;
      }
    } else {
      const { error } = await query.insert({ day, user_id: currentUserId });
      if (error) {
        errorMessage = error.message;
        return;
      }
    }

    await loadData();
  }
</script>

<svelte:head>
  <title>Knowager - Home</title>
</svelte:head>

{#if warning}
  <p class="warning">⚠️ {warning}</p>
{/if}

{#if loading}
  <p>Caricamento...</p>
{:else if errorMessage}
  <p class="error">{errorMessage}</p>
{:else}
  <section class="week-grid">
    {#each week as day}
      <button
        class="day-card {isMine(day.key) ? 'mine' : ''} {closureDays.has(day.key) ? 'closed' : ''}"
        on:click={() => toggle(day.key)}
        disabled={closureDays.has(day.key)}
      >
        <h2>{day.dayNumber} — {day.label}</h2>
        <div class="avatars">
          {#if dayMembers(day.key).length === 0}
            <span class="empty">Nessuna selezione</span>
          {:else}
            {#each dayMembers(day.key) as member}
              {@const profile = profiles.get(member.user_id)}
              <span class="avatar" title={`${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`}>
                {#if profile?.avatar_id && avatarMap[profile.avatar_id]}
                  {avatarMap[profile.avatar_id]}
                {:else}
                  {initials(profile)}
                {/if}
              </span>
            {/each}
          {/if}
        </div>
      </button>
    {/each}
  </section>
{/if}

<style>
  .warning {
    background: #fef3c7;
    border: 1px solid #f59e0b;
    padding: 0.75rem;
    border-radius: 8px;
  }
  .error {
    color: #b91c1c;
  }
  .week-grid {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: 1fr;
  }
  .day-card {
    text-align: left;
    border: 1px solid #d1d5db;
    border-radius: 10px;
    padding: 1rem;
    background: white;
    cursor: pointer;
  }
  .day-card.mine {
    border-color: #2563eb;
    box-shadow: inset 0 0 0 1px #2563eb;
  }
  .day-card.closed {
    background: #e5e7eb;
    color: #6b7280;
    cursor: not-allowed;
  }
  h2 {
    margin: 0 0 0.75rem;
    font-size: 1rem;
  }
  .avatars {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .avatar {
    width: 2rem;
    height: 2rem;
    border-radius: 999px;
    background: #111827;
    color: white;
    display: inline-grid;
    place-items: center;
    font-size: 0.85rem;
  }
  .empty {
    color: #6b7280;
    font-size: 0.9rem;
  }
  @media (min-width: 900px) {
    .week-grid {
      grid-template-columns: repeat(7, minmax(0, 1fr));
    }
    .day-card {
      min-height: 170px;
    }
  }
</style>
