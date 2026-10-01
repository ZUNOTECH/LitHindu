<script>
  import { api } from '../lib/api.js';
  import { reveal } from '../lib/actions/reveal.js';
  import Book3D from '../lib/Book3D.svelte';

  const LANGUAGES = ['All', 'Sanskrit', 'Hindi', 'Tamil', 'English'];

  let books = $state([]);
  let loading = $state(true);
  let error = $state('');
  let filter = $state('');
  let language = $state('All');

  $effect(() => {
    api.books()
      .then((b) => (books = b))
      .catch((e) => (error = e.message))
      .finally(() => (loading = false));
  });

  const shown = $derived(
    books.filter(
      (b) =>
        (language === 'All' || b.language.includes(language)) &&
        b.title.toLowerCase().includes(filter.trim().toLowerCase()),
    ),
  );
  const counts = $derived(Object.fromEntries(LANGUAGES.map((l) => [l, l === 'All' ? books.length : books.filter((b) => b.language.includes(l)).length])));
</script>

<div class="container">
  <header class="head" use:reveal>
    <p class="kicker">ग्रन्थालय</p>
    <h1 class="display">Library</h1>
    <p class="muted">{books.length} books, {books.reduce((n, b) => n + b.pages, 0).toLocaleString()} pages. Every one opens to any page.</p>
  </header>

  <div class="controls glass" use:reveal={80}>
    <input type="search" placeholder="Filter by title" bind:value={filter} aria-label="Filter by title" />
    <div class="chips" role="group" aria-label="Language">
      {#each LANGUAGES as l}
        <button class:on={language === l} aria-pressed={language === l} onclick={() => (language = l)}>
          {l} <span class="n">{counts[l] ?? 0}</span>
        </button>
      {/each}
    </div>
  </div>

  {#if loading}
    <p class="muted status">Opening the library…</p>
  {:else if error}
    <p class="muted status">{error}</p>
  {:else if !shown.length}
    <p class="muted status">No books match.</p>
  {:else}
    <p class="muted count">{shown.length} of {books.length} books</p>
    <div class="grid">
      {#each shown as book, i (book.id)}
        <div use:reveal={Math.min(i, 11) * 60}><Book3D {book} size="md" /></div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .head { padding: 40px 0 24px; }
  .kicker { margin: 0 0 4px; font-family: var(--font-devanagari); color: var(--gold); font-size: 16px; }
  h1 { margin: 0 0 10px; font-size: clamp(38px, 4.5vw, 56px); }
  .head p { margin: 0; }
  .controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; padding: 12px; }
  .controls input { flex: 1 1 260px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chips button { gap: 8px; display: inline-flex; align-items: center; padding: 0 16px; }
  .chips button.on { background: linear-gradient(135deg, var(--gold-2), var(--gold)); border-color: transparent; color: var(--on-accent); box-shadow: 0 0 22px rgba(242, 184, 90, 0.35); }
  .n { font-size: 12px; opacity: 0.7; font-variant-numeric: tabular-nums; }
  .status, .count { margin: 28px 0 12px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 44px 20px; padding: 24px 0 40px; justify-items: center; }
</style>
