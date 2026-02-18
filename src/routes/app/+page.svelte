<script lang="ts">
  import { onMount } from 'svelte';
<<<<<<< codex/implement-project-as-described-in-plans.md-vbkc00
  import { formatWeekRange, getWeekByOffset, type WeekDay } from '$lib/dateUtils';
  import { supabase } from '$lib/supabaseClient';

  type Selection = { day: string; user_id: string };
  type PublicProfile = {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_id: string | null;
    gravatar_url: string | null;
  };

  let weekOffset = 0;
  let week: WeekDay[] = getWeekByOffset(weekOffset);
=======
  import { getCurrentWeek, type WeekDay } from '$lib/dateUtils';
  import { supabase } from '$lib/supabaseClient';

  type Selection = { day: string; user_id: string };
  type PublicProfile = { id: string; first_name: string | null; last_name: string | null; avatar_id: string | null };

  let week: WeekDay[] = getCurrentWeek();
>>>>>>> main
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

<<<<<<< codex/implement-project-as-described-in-plans.md-vbkc00
  function goToWeek(step: number) {
    weekOffset += step;
    week = getWeekByOffset(weekOffset);
    void loadData();
  }

=======
>>>>>>> main
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
<<<<<<< codex/implement-project-as-described-in-plans.md-vbkc00
        .select('id,first_name,last_name,avatar_id,gravatar_url')
=======
        .select('id,first_name,last_name,avatar_id')
>>>>>>> main
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

<<<<<<< codex/implement-project-as-described-in-plans.md-vbkc00
  function isDisabled(day: WeekDay) {
    return day.isWeekend || closureDays.has(day.key);
  }

  function dayStatus(day: WeekDay) {
    if (day.isWeekend) return 'Weekend';
    if (closureDays.has(day.key)) return 'Non selezionabile';
    return isMine(day.key) ? 'Disponibile' : 'Non impostato';
  }

=======
>>>>>>> main
  function initials(profile?: PublicProfile) {
    const first = profile?.first_name?.at(0) ?? '';
    const last = profile?.last_name?.at(0) ?? '';
    return `${first}${last}`.toUpperCase() || '?';
  }

<<<<<<< codex/implement-project-as-described-in-plans.md-vbkc00
  async function toggle(day: WeekDay) {
    if (isDisabled(day)) return;

    const mine = isMine(day.key);
    const query = supabase.from('day_selections');

    if (mine) {
      const { error } = await query.delete().eq('day', day.key).eq('user_id', currentUserId);
=======
  async function toggle(day: string) {
    if (closureDays.has(day)) return;

    const mine = isMine(day);
    const query = supabase.from('day_selections');

    if (mine) {
      const { error } = await query.delete().eq('day', day).eq('user_id', currentUserId);
>>>>>>> main
      if (error) {
        errorMessage = error.message;
        return;
      }
    } else {
<<<<<<< codex/implement-project-as-described-in-plans.md-vbkc00
      const { error } = await query.insert({ day: day.key, user_id: currentUserId });
=======
      const { error } = await query.insert({ day, user_id: currentUserId });
>>>>>>> main
      if (error) {
        errorMessage = error.message;
        return;
      }
    }

    await loadData();
  }
</script>

<svelte:head>
<<<<<<< codex/implement-project-as-described-in-plans.md-vbkc00
  <title>Knowager - Disponibilità</title>
</svelte:head>

<section class="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
  <div>
    <h2 class="m-0 text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">My Availability</h2>
    <p class="mt-2 text-lg text-sky-900/70">Pianifica la tua settimana e scegli quando sei disponibile.</p>
  </div>

  <div class="flex min-w-[280px] items-center justify-between rounded-xl border border-slate-300 bg-white p-1 shadow-sm" role="group" aria-label="Navigazione settimane">
    <button type="button" class="h-10 w-10 rounded-lg text-2xl text-sky-700 hover:bg-slate-100" onclick={() => goToWeek(-1)} aria-label="Settimana precedente">‹</button>
    <div class="px-2 text-center">
      <strong class="block text-lg text-slate-900">{formatWeekRange(week)}</strong>
      <small class="text-sky-800/60">Settimana {weekOffset === 0 ? 'corrente' : weekOffset > 0 ? `+${weekOffset}` : weekOffset}</small>
    </div>
    <button type="button" class="h-10 w-10 rounded-lg text-2xl text-sky-700 hover:bg-slate-100" onclick={() => goToWeek(1)} aria-label="Settimana successiva">›</button>
  </div>
</section>

{#if warning}
  <p class="mb-4 rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-amber-900">⚠️ {warning}</p>
{/if}

{#if loading}
  <p class="text-slate-600">Caricamento...</p>
{:else if errorMessage}
  <p class="text-red-700">{errorMessage}</p>
{:else}
  <section class="grid grid-cols-1 gap-3 lg:grid-cols-7">
    {#each week as day}
      {@const disabled = isDisabled(day)}
      <button
        class="min-h-[220px] rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-brand-500 {isMine(day.key)
          ? 'border-brand-500 bg-white shadow-[0_0_0_2px_rgba(46,128,230,0.2)]'
          : 'border-slate-300 bg-white'} {disabled
          ? 'cursor-not-allowed border-slate-200 text-slate-400 [background:repeating-linear-gradient(45deg,#f8fafc,#f8fafc_6px,#f1f5f9_6px,#f1f5f9_12px)]'
          : 'cursor-pointer hover:-translate-y-0.5 hover:shadow-sm'}"
        onclick={() => toggle(day)}
        disabled={disabled}
      >
        <div class="flex items-center justify-between">
          <span class="text-sm font-bold tracking-wide {day.isWeekend ? 'text-red-500' : 'text-sky-700'}">{day.label}</span>
          {#if isMine(day.key)}
            <span class="inline-grid h-7 w-7 place-items-center rounded-full bg-brand-500 text-sm font-bold text-white">✓</span>
          {/if}
        </div>

        <h3 class="mt-2 text-5xl font-bold leading-none text-slate-900">{day.dayNumber}</h3>
        <p class="mt-2 min-h-5 text-lg text-sky-800/85">{dayStatus(day)}</p>

        <div class="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
          {#if dayMembers(day.key).length === 0}
            <span class="text-sm text-slate-500">Nessuna selezione</span>
          {:else}
            {#each dayMembers(day.key) as member}
              {@const profile = profiles.get(member.user_id)}
              <span class="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-xs text-white" title={`${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`}>
                {#if profile?.avatar_id === 'gravatar' && profile.gravatar_url}
                  <img src={profile.gravatar_url} alt="Avatar Gravatar" class="h-full w-full object-cover" loading="lazy" />
                {:else if profile?.avatar_id && avatarMap[profile.avatar_id]}
=======
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
>>>>>>> main
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
<<<<<<< codex/implement-project-as-described-in-plans.md-vbkc00
=======

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
>>>>>>> main
