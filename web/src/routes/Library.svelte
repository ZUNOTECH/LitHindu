<script>
  import { api } from '../lib/api.js';
  import BookCard from '../lib/BookCard.svelte';

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
</script>

<div class="container">
  <h1>Library</h1>
  <div class="controls">
    <input type="search" placeholder="Filter by title" bind:value={filter} aria-label="Filter by title" />
    <div class="chips" role="group" aria-label="Language">
      {#each LANGUAGES as l}
        <button class:on={language === l} aria-pressed={language === l} onclick={() => (language = l)}>{l}</button>
      {/each}
    </div>
  </div>

  {#if loading}
    <p class="muted">Loading…</p>
  {:else if error}
    <p class="muted">{error}</p>
  {:else}
    <p class="muted count">{shown.length} of {books.length} books</p>
    <div class="grid">
      {#each shown as book (book.id)}<BookCard {book} />{/each}
    </div>
  {/if}
</div>

<style>
  h1 { font-family: var(--font-display); margin: 32px 0 16px; }
  .controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
  .controls input { flex: 1 1 260px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chips button.on { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
  .count { margin: 16px 0 12px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
</style>
