<script>
  let { value = '', placeholder = 'Search', size = 'normal', onsearch, autofocus = false } = $props();
  let text = $state('');
  $effect(() => { text = value; });

  function submit(e) {
    e.preventDefault();
    const q = text.trim();
    if (q) onsearch(q);
  }
</script>

<form class="search {size}" onsubmit={submit} role="search">
  <!-- svelte-ignore a11y_autofocus -->
  <input type="search" bind:value={text} {placeholder} aria-label={placeholder} {autofocus} />
  <button class="primary" type="submit">Search</button>
</form>

<style>
  .search { display: flex; gap: 8px; width: 100%; }
  input { flex: 1; min-width: 0; }
  .large input { min-height: 60px; font-size: 20px; padding: 0 24px; box-shadow: var(--shadow); }
  .large button { min-height: 60px; padding: 0 28px; font-size: 18px; }
</style>
