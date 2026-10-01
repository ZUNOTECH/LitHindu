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
  <span class="icon" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
  </span>
  <!-- svelte-ignore a11y_autofocus -->
  <input type="search" bind:value={text} {placeholder} aria-label={placeholder} {autofocus} />
  <button class="primary" type="submit">Search</button>
</form>

<style>
  .search {
    position: relative;
    display: flex;
    gap: 8px;
    width: 100%;
    padding: 6px;
    border-radius: 999px;
    background: linear-gradient(160deg, rgba(255, 244, 224, 0.08), rgba(255, 244, 224, 0.03));
    border: 1px solid var(--border);
    backdrop-filter: blur(16px);
    box-shadow: inset 0 1px 0 rgba(255, 244, 224, 0.08), var(--shadow);
    transition: border-color 0.3s, box-shadow 0.4s;
  }
  .search:focus-within { border-color: var(--border-strong); box-shadow: inset 0 1px 0 rgba(255, 244, 224, 0.1), var(--glow-strong); }
  .icon { position: absolute; left: 22px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
  input { flex: 1; min-width: 0; border: 0; background: transparent; backdrop-filter: none; padding-left: 50px; }
  input:focus { box-shadow: none; background: transparent; border: 0; }
  .large { padding: 8px; }
  .large input { min-height: 62px; font-size: 20px; padding-left: 56px; }
  .large .icon { left: 26px; }
  .large button { min-height: 62px; padding: 0 30px; font-size: 18px; }
  @media (max-width: 520px) { .large button { padding: 0 20px; font-size: 16px; } .large input { font-size: 17px; } }
</style>
