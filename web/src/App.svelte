<script>
  import { route } from './lib/router.svelte.js';
  import Home from './routes/Home.svelte';
  import Library from './routes/Library.svelte';
  import Search from './routes/Search.svelte';
  import Reader from './routes/Reader.svelte';

  const section = $derived(route.parts[0] || 'home');
</script>

{#if section === 'read'}
  {#key route.parts[1]}
    <Reader bookId={Number(route.parts[1])} />
  {/key}
{:else}
  <header class="site-header">
    <div class="container bar">
      <a class="brand" href="#/">
        <img src="/favicon.svg" alt="" width="32" height="32" />
        <span>Lit Hindu</span>
      </a>
      <nav>
        <a href="#/library" class:active={section === 'library'}>Library</a>
        <a href="#/search" class:active={section === 'search'}>Search</a>
      </nav>
    </div>
  </header>
  <main>
    {#if section === 'library'}
      <Library />
    {:else if section === 'search'}
      <Search />
    {:else}
      <Home />
    {/if}
  </main>
  <footer class="container muted">Lit Hindu · Library of Sanatana Dharma · works fully offline</footer>
{/if}

<style>
  .site-header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: color-mix(in srgb, var(--bg) 88%, transparent);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--border);
  }
  .bar { display: flex; align-items: center; justify-content: space-between; height: 64px; }
  .brand { display: flex; align-items: center; gap: 10px; font-family: var(--font-display); font-size: 22px; font-weight: 600; color: var(--text); }
  .brand:hover { text-decoration: none; }
  nav { display: flex; gap: 4px; }
  nav a {
    display: inline-flex;
    align-items: center;
    min-height: var(--tap);
    padding: 0 16px;
    border-radius: 999px;
    color: var(--text-muted);
    font-weight: 500;
  }
  nav a:hover { text-decoration: none; color: var(--text); background: var(--surface-2); }
  nav a.active { color: var(--accent-strong); background: var(--accent-soft); }
  main { flex: 1; }
  footer { padding: 32px 16px; font-size: 14px; text-align: center; }
</style>
