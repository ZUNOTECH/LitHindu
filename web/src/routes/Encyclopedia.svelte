<script>
  import { fly } from 'svelte/transition';
  import { route, link } from '../lib/router.svelte.js';
  import { ENTRIES, TYPES, byId, searchEntries, timelineLinks } from '../lib/encyclopedia.js';
  import { reveal } from '../lib/actions/reveal.js';
  import { tilt } from '../lib/actions/tilt.js';

  const id = $derived(route.parts[1] || '');
  const entry = $derived(byId[id] || null);
  let filter = $state('');
  let type = $state(route.params.get('type') || 'All');

  const shown = $derived.by(() => {
    const base = filter.trim() ? searchEntries(filter, 200) : ENTRIES;
    return base.filter((e) => type === 'All' || e.type === type);
  });
  const counts = $derived(Object.fromEntries(Object.keys(TYPES).map((t) => [t, ENTRIES.filter((e) => e.type === t).length])));
  const related = $derived(entry ? (entry.related || []).map((r) => byId[r]).filter(Boolean) : []);
  const inbound = $derived(entry ? ENTRIES.filter((e) => e.id !== entry.id && (e.related || []).includes(entry.id) && !(entry.related || []).includes(e.id)) : []);
  const times = $derived(entry ? timelineLinks(entry) : []);
  const siblings = $derived(entry ? ENTRIES.filter((e) => e.type === entry.type) : []);
  const index = $derived(entry ? siblings.indexOf(entry) : -1);

  function onkeydown(e) {
    if (!entry || e.target.closest('input')) return;
    if (e.key === 'ArrowRight' && siblings[index + 1]) location.hash = link(`/encyclopedia/${siblings[index + 1].id}`);
    if (e.key === 'ArrowLeft' && siblings[index - 1]) location.hash = link(`/encyclopedia/${siblings[index - 1].id}`);
    if (e.key === 'Escape') location.hash = link('/encyclopedia', { type: entry.type });
  }
</script>

<svelte:window {onkeydown} />

{#if entry}
  {#key entry.id}
    <article class="container entry" in:fly={{ y: 20, duration: 450 }}>
      <nav class="crumbs">
        <a href={link('/encyclopedia')}>Encyclopedia</a>
        <span aria-hidden="true">›</span>
        <a href={link('/encyclopedia', { type: entry.type })}>{TYPES[entry.type].label}</a>
      </nav>
      <div class="entry-grid">
        <div class="main">
          <p class="sa-title">{entry.sa}</p>
          <h1 class="display">{entry.name}</h1>
          {#if entry.aka?.length}<p class="aka muted">Also {entry.aka.join(' · ')}</p>{/if}
          <p class="summary">{entry.summary}</p>
          {#if entry.traditions}
            <aside class="traditions glass">
              <h3>Between traditions</h3>
              <p>{entry.traditions}</p>
            </aside>
          {/if}
          {#if entry.facts?.length}
            <dl class="facts">
              {#each entry.facts as [k, v]}
                <div><dt>{k}</dt><dd>{v}</dd></div>
              {/each}
            </dl>
          {/if}
        </div>
        <aside class="side">
          <section class="glass box">
            <h3>In the library</h3>
            <div class="chips">
              {#each entry.library as q}<a class="chip" href={link('/search', { q })}>{q}</a>{/each}
            </div>
          </section>
          {#if times.length}
            <section class="glass box">
              <h3>On the wheel of time</h3>
              <div class="chips">
                {#each times as t}<a class="chip" href={link('/timeline', { at: t.at })}>{t.label}</a>{/each}
              </div>
            </section>
          {/if}
          {#if related.length || inbound.length}
            <section class="glass box">
              <h3>Related</h3>
              <ul class="rel">
                {#each [...related, ...inbound] as r (r.id)}
                  <li><a href={link(`/encyclopedia/${r.id}`)}><span class="rel-sa">{r.sa}</span><span>{r.name}</span><span class="badge">{TYPES[r.type].one}</span></a></li>
                {/each}
              </ul>
            </section>
          {/if}
        </aside>
      </div>
      <nav class="pager">
        {#if siblings[index - 1]}<a href={link(`/encyclopedia/${siblings[index - 1].id}`)}>‹ {siblings[index - 1].name}</a>{:else}<span></span>{/if}
        <span class="muted">{TYPES[entry.type].one} {index + 1} of {siblings.length}</span>
        {#if siblings[index + 1]}<a href={link(`/encyclopedia/${siblings[index + 1].id}`)}>{siblings[index + 1].name} ›</a>{:else}<span></span>{/if}
      </nav>
    </article>
  {/key}
{:else}
  <div class="container">
    <header class="head" use:reveal>
      <p class="kicker">ज्ञानकोश</p>
      <h1 class="display">Encyclopedia</h1>
      <p class="muted lede">Deities, rishis and acharyas, texts, concepts, schools, places and festivals, {ENTRIES.length} entries, each tied to the books in the library. Where traditions differ, the entry says so.</p>
    </header>
    <div class="controls glass" use:reveal={80}>
      <input type="search" placeholder="Find an entry: Shiva, धर्म, Tirukkural…" bind:value={filter} aria-label="Find an entry" />
      <div class="chips" role="group" aria-label="Type">
        <button class:on={type === 'All'} aria-pressed={type === 'All'} onclick={() => (type = 'All')}>All <span class="n">{ENTRIES.length}</span></button>
        {#each Object.entries(TYPES) as [t, meta]}
          <button class:on={type === t} aria-pressed={type === t} onclick={() => (type = t)}>{meta.label} <span class="n">{counts[t]}</span></button>
        {/each}
      </div>
    </div>
    {#if !shown.length}
      <p class="muted status">No entries match.</p>
    {:else}
      <div class="grid">
        {#each shown as e, i (e.id)}
          <a class="card glass" href={link(`/encyclopedia/${e.id}`)} use:reveal={Math.min(i, 14) * 40} use:tilt={{ max: 5 }}>
            <span class="type badge">{TYPES[e.type].one}</span>
            <span class="card-sa">{e.sa}</span>
            <h2>{e.name}</h2>
            <p>{e.summary.length > 150 ? e.summary.slice(0, 147).replace(/\s+\S*$/, '') + '…' : e.summary}</p>
            <span class="card-light" aria-hidden="true"></span>
          </a>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .head { padding-block: 40px 24px; max-width: 900px; }
  .kicker { margin: 0 0 4px; font-family: var(--font-devanagari); color: var(--gold); font-size: 16px; }
  h1 { margin: 0 0 10px; font-size: clamp(38px, 4.5vw, 56px); }
  .lede { margin: 0; max-width: 64ch; }
  .controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; padding: 12px; }
  .controls input { flex: 1 1 280px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .controls .chips button { gap: 8px; display: inline-flex; align-items: center; padding: 0 14px; min-height: 42px; font-size: 15px; }
  .controls .chips button.on { background: linear-gradient(135deg, var(--gold-2), var(--gold)); border-color: transparent; color: var(--on-accent); box-shadow: 0 0 22px rgba(242, 184, 90, 0.35); }
  .n { font-size: 12px; opacity: 0.7; font-variant-numeric: tabular-nums; }
  .status { margin: 28px 0; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; padding: 24px 0 40px; }
  .card {
    --rx: 0deg; --ry: 0deg; --tilt: 0;
    position: relative; display: flex; flex-direction: column; gap: 6px; padding: 22px 22px 24px; color: var(--text); overflow: hidden; min-height: 200px;
    transform: perspective(900px) rotateX(var(--rx)) rotateY(var(--ry));
    transition: transform 0.5s var(--ease-out), border-color 0.3s, box-shadow 0.4s;
  }
  .card:hover { text-decoration: none; border-color: var(--border-strong); box-shadow: inset 0 1px 0 rgba(255, 244, 224, 0.1), var(--glow), var(--shadow); }
  .type { align-self: flex-start; }
  .card-sa { margin-top: 10px; font-family: var(--font-devanagari); font-size: 20px; color: var(--gold); text-shadow: 0 0 16px rgba(242, 184, 90, 0.35); }
  .card h2 { margin: 0; font-family: var(--font-display); font-size: 27px; font-weight: 500; line-height: 1.1; }
  .card p { margin: 6px 0 0; color: var(--text-muted); font-size: 14.5px; line-height: 1.55; }
  .card-light { position: absolute; inset: 0; pointer-events: none; opacity: var(--tilt); transition: opacity 0.4s; background: radial-gradient(360px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), rgba(255, 214, 160, 0.12), transparent 60%); }

  .entry { padding-block: 28px 40px; }
  .crumbs { display: flex; gap: 10px; align-items: center; font-size: 14px; color: var(--text-muted); margin-bottom: 20px; }
  .crumbs a { color: var(--text-muted); min-height: var(--tap); display: inline-flex; align-items: center; }
  .crumbs a:hover { color: var(--gold-2); }
  .entry-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, 380px); gap: 32px; align-items: start; }
  .sa-title { margin: 0 0 4px; font-family: var(--font-devanagari); font-size: 30px; color: var(--gold); text-shadow: 0 0 22px rgba(242, 184, 90, 0.4); }
  .entry h1 { font-size: clamp(40px, 5vw, 64px); margin-bottom: 6px; }
  .aka { margin: 0 0 20px; font-size: 15px; }
  .summary { font-size: clamp(18px, 1.5vw, 20px); line-height: 1.7; margin: 0 0 26px; max-width: 64ch; }
  .traditions { padding: 18px 22px; margin: 0 0 26px; max-width: 64ch; }
  .traditions h3, .box h3 { margin: 0 0 8px; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-faint); }
  .traditions p { margin: 0; color: var(--text); line-height: 1.6; }
  .facts { margin: 0; display: grid; gap: 10px; max-width: 64ch; }
  .facts div { display: grid; grid-template-columns: 150px 1fr; gap: 14px; padding: 10px 0; border-top: 1px solid var(--border); }
  dt { color: var(--text-muted); font-size: 14px; }
  dd { margin: 0; }
  .side { display: flex; flex-direction: column; gap: 14px; position: sticky; top: 88px; }
  .box { padding: 18px 20px; }
  .chip { display: inline-flex; align-items: center; min-height: 36px; padding: 0 13px; border-radius: 999px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font-size: 14px; transition: border-color 0.25s, box-shadow 0.3s; }
  .chip:hover { text-decoration: none; border-color: var(--border-strong); box-shadow: var(--glow); }
  .rel { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
  .rel a { display: flex; align-items: center; gap: 10px; min-height: 42px; padding: 4px 8px; margin: 0 -8px; border-radius: 10px; color: var(--text); }
  .rel a:hover { text-decoration: none; background: var(--surface-2); }
  .rel-sa { font-family: var(--font-devanagari); color: var(--gold); min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 40%; }
  .rel .badge { margin-left: auto; }
  .pager { display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: center; margin-top: 36px; padding-top: 18px; border-top: 1px solid var(--border); font-size: 15px; }
  .pager a { min-height: var(--tap); display: inline-flex; align-items: center; }
  .pager a:last-child { justify-self: end; }
  @media (max-width: 900px) {
    .entry-grid { grid-template-columns: 1fr; }
    .side { position: static; }
    .facts div { grid-template-columns: 1fr; gap: 2px; }
  }
</style>
