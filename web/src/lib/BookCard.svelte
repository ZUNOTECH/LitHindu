<script>
  import { link } from './router.svelte.js';
  let { book } = $props();
  const progress = $derived(book.pages ? book.pages_ready / book.pages : 1);
</script>

<a class="card" href={link(`/read/${book.id}`)}>
  <div class="spine" aria-hidden="true"></div>
  <div class="body">
    <h3>{book.title}</h3>
    <div class="meta">
      <span class="badge accent">{book.language}</span>
      <span class="badge">{book.pages.toLocaleString()} pages</span>
      {#if book.scanned}<span class="badge">Scanned</span>{/if}
    </div>
    {#if progress < 1}
      <div class="progress" title="Still being processed">
        <div style:width="{Math.round(progress * 100)}%"></div>
      </div>
      <small class="muted">Processing… {Math.round(progress * 100)}% searchable</small>
    {/if}
  </div>
</a>

<style>
  .card {
    display: flex;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    color: var(--text);
    min-height: 120px;
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .card:hover { text-decoration: none; transform: translateY(-2px); box-shadow: var(--shadow); }
  .spine { width: 8px; flex: none; background: linear-gradient(var(--accent), var(--accent-strong)); }
  .body { padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  h3 { margin: 0; font-size: 17px; line-height: 1.35; text-transform: capitalize; overflow-wrap: anywhere; }
  .meta { display: flex; flex-wrap: wrap; gap: 6px; }
  .progress { height: 4px; background: var(--surface-2); border-radius: 4px; overflow: hidden; }
  .progress div { height: 100%; background: var(--accent); }
</style>
