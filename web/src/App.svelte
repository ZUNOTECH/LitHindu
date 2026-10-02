<script>
  import { fly } from 'svelte/transition';
  import { route } from './lib/router.svelte.js';
  import CursorGlow from './lib/CursorGlow.svelte';
  import Home from './routes/Home.svelte';
  import Library from './routes/Library.svelte';
  import Search from './routes/Search.svelte';
  import Reader from './routes/Reader.svelte';
  import Timeline from './routes/Timeline.svelte';
  import Encyclopedia from './routes/Encyclopedia.svelte';

  const section = $derived(route.parts[0] || 'home');
  let scrolled = $state(false);

  $effect(() => {
    // Return to the top when moving between sections.
    section;
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
</script>

<svelte:window onscroll={() => (scrolled = window.scrollY > 24)} />

<CursorGlow />

{#if section === 'read'}
  {#key route.parts[1]}
    <Reader bookId={Number(route.parts[1])} />
  {/key}
{:else}
  <header class="site-header" class:scrolled class:hero={section === 'home'}>
    <div class="container bar">
      <a class="brand" href="#/">
        <span class="flame" aria-hidden="true">
          <svg viewBox="0 0 64 64" width="30" height="30"><path d="M32 8c-7 12-15 18-15 29a15 15 0 0 0 30 0c0-11-8-17-15-29z" fill="url(#g)"/><path d="M32 30c-3.5 6-6 8.5-6 12.5a6 6 0 0 0 12 0c0-4-2.5-6.5-6-12.5z" fill="#fff3d6"/><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd98a"/><stop offset="1" stop-color="#ff7a3d"/></linearGradient></defs></svg>
        </span>
        <span class="name">Lit Hindu</span>
      </a>
      <nav aria-label="Main">
        <a href="#/library" class:active={section === 'library'}>Library</a>
        <a href="#/search" class:active={section === 'search'}>Search</a>
        <a href="#/timeline" class:active={section === 'timeline'}>Timeline</a>
        <a href="#/encyclopedia" class:active={section === 'encyclopedia'}>Encyclopedia</a>
      </nav>
    </div>
  </header>
  <main>
    {#key section}
      <div in:fly={{ y: 18, duration: 520, delay: 60, opacity: 0 }}>
        {#if section === 'library'}
          <Library />
        {:else if section === 'search'}
          <Search />
        {:else if section === 'timeline'}
          <Timeline />
        {:else if section === 'encyclopedia'}
          {#key route.parts[1] || ''}<Encyclopedia />{/key}
        {:else}
          <Home />
        {/if}
      </div>
    {/key}
  </main>
  <footer class="container">
    <span class="muted">Lit Hindu · Library of Sanatana Dharma</span>
    <span class="muted dot">·</span>
    <span class="muted">Runs fully offline</span>
  </footer>
{/if}

<style>
  .site-header {
    position: sticky;
    top: 0;
    z-index: 20;
    transition: background 0.4s, border-color 0.4s, backdrop-filter 0.4s;
    border-bottom: 1px solid transparent;
  }
  .site-header.scrolled {
    background: rgba(9, 7, 16, 0.6);
    backdrop-filter: blur(18px) saturate(1.3);
    -webkit-backdrop-filter: blur(18px) saturate(1.3);
    border-color: var(--border);
  }
  .bar { display: flex; align-items: center; justify-content: space-between; height: 72px; }
  .brand { display: flex; align-items: center; gap: 12px; color: var(--text); }
  .brand:hover { text-decoration: none; }
  .flame { display: grid; place-items: center; filter: drop-shadow(0 0 10px rgba(255, 170, 80, 0.55)); }
  .name { font-family: var(--font-display); font-size: 26px; font-weight: 600; letter-spacing: 0.01em; }
  nav { display: flex; gap: 2px; }
  nav a {
    position: relative;
    display: inline-flex;
    align-items: center;
    min-height: var(--tap);
    padding: 0 18px;
    border-radius: 999px;
    color: var(--text-muted);
    font-weight: 500;
    transition: color 0.25s, background 0.25s;
  }
  nav a:hover { text-decoration: none; color: var(--text); background: var(--surface-2); }
  nav a.active { color: var(--gold-2); }
  nav a.active::after {
    content: '';
    position: absolute;
    left: 18px;
    right: 18px;
    bottom: 6px;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--gold-2), transparent);
    box-shadow: 0 0 10px var(--gold);
  }
  main { flex: 1; position: relative; z-index: 1; }
  footer { display: flex; justify-content: center; gap: 10px; padding: 48px 16px 40px; font-size: 14px; }
  .name { white-space: nowrap; }
  @media (max-width: 760px) { .name { font-size: 20px; } .brand { gap: 8px; } nav a { padding: 0 9px; font-size: 14px; } nav { gap: 0; } }
  @media (max-width: 560px) { .name { display: none; } nav a { padding: 0 8px; } }
</style>
