<script>
  import { api } from '../lib/api.js';
  import { go, link } from '../lib/router.svelte.js';
  import { reveal } from '../lib/actions/reveal.js';
  import { tilt } from '../lib/actions/tilt.js';
  import SearchBox from '../lib/SearchBox.svelte';
  import Book3D from '../lib/Book3D.svelte';
  import Yantra from '../lib/Yantra.svelte';
  import CountUp from '../lib/CountUp.svelte';

  let stats = $state(null);
  let books = $state([]);
  let error = $state('');

  $effect(() => {
    api.stats().then((s) => (stats = s)).catch((e) => (error = e.message));
    api.books().then((b) => (books = b)).catch(() => {});
  });

  // The largest works first: the epics, Vedas and collected Upanishads.
  const great = $derived([...books].sort((a, b) => b.pages - a.pages).slice(0, 6));

  const EXPLORE = [
    { title: 'Library', text: 'Every book, in Sanskrit, Hindi, Tamil and English. Open any page.', href: '#/library', icon: 'M4 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4zM20 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z' },
    { title: 'Search', text: 'Find a verse, a name or an idea across all works, in any script.', href: '#/search', icon: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm9 16-3.5-3.5' },
    { title: 'Timeline', text: 'The Kala Chakra: five thousand years of history within the four ages of the cosmic cycle.', href: '#/timeline', icon: 'M3 12h18M7 12a1.5 1.5 0 1 0 0-.01M12 12a1.5 1.5 0 1 0 0-.01M17 12a1.5 1.5 0 1 0 0-.01M7 9V6m5 9v3m5-9V6' },
    { title: 'Encyclopedia', text: 'Deities, rishis, texts, concepts, schools, places and festivals, each tied to its sources.', href: '#/encyclopedia', icon: 'M12 3l9 5-9 5-9-5 9-5zm-9 9 9 5 9-5M3 16l9 5 9-5' },
  ];
</script>

<section class="hero">
  <div class="yantra-wrap" aria-hidden="true"><Yantra /></div>
  <div class="scrim" aria-hidden="true"></div>
  <div class="container hero-grid">
    <div class="copy">
      <p class="eyebrow" style:--reveal-delay="0ms" use:reveal>ॐ · सनातन धर्म</p>
      <h1 class="display" use:reveal={80}>
        The living library<br />of <em>Sanatana Dharma</em>
      </h1>
      <p class="lede" use:reveal={160}>
        The Vedas, Upanishads, Itihasas and Puranas, searchable in Sanskrit, Hindi, Tamil and English, with every page of every book to read.
      </p>
      <div class="search-wrap" use:reveal={240}>
        <SearchBox size="large" placeholder="Search: dharma, अग्नि, திருக்குறள்…" onsearch={(q) => go(link('/search', { q }).slice(1))} />
      </div>
      {#if stats}
        <dl class="stats" use:reveal={320}>
          <div><dd><CountUp value={stats.books} /></dd><dt>Books</dt></div>
          <div><dd><CountUp value={stats.pages} /></dd><dt>Pages</dt></div>
          <div><dd><CountUp value={stats.pages ? Math.floor((stats.pages_ready / stats.pages) * 100) : 0} suffix="%" /></dd><dt>Searchable</dt></div>
        </dl>
      {:else if error}
        <p class="muted">{error}</p>
      {/if}
    </div>
  </div>
  <div class="scroll-hint" aria-hidden="true"><span></span></div>
</section>

{#if great.length}
  <section class="container works">
    <div class="section-head" use:reveal>
      <div>
        <p class="kicker">महाग्रन्थाः</p>
        <h2 class="display">Great works</h2>
      </div>
      <a href="#/library" class="all">Browse all {books.length} books <span aria-hidden="true">→</span></a>
    </div>
    <div class="shelf">
      {#each great as book, i (book.id)}
        <div use:reveal={i * 90}><Book3D {book} /></div>
      {/each}
    </div>
  </section>
{/if}

<section class="container explore">
  <div class="section-head" use:reveal>
    <div>
      <p class="kicker">अन्वेषण</p>
      <h2 class="display">Explore</h2>
    </div>
  </div>
  <div class="panels">
    {#each EXPLORE as item, i}
      <a class="panel glass" class:soon={item.soon} href={item.soon ? '#/' : item.href} aria-disabled={item.soon} use:reveal={i * 90} use:tilt={{ max: 6 }}>
        <span class="panel-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d={item.icon} /></svg>
        </span>
        <h3>{item.title} {#if item.soon}<span class="badge">Phase 2</span>{/if}</h3>
        <p>{item.text}</p>
        <span class="panel-light" aria-hidden="true"></span>
      </a>
    {/each}
  </div>
</section>

<style>
  .hero {
    position: relative;
    min-height: calc(100vh - 72px);
    min-height: calc(100dvh - 72px);
    display: flex;
    align-items: center;
    overflow: hidden;
    margin-top: -72px;
    padding-top: 72px;
  }
  .yantra-wrap {
    position: absolute;
    inset: 0;
    left: 38%;
    pointer-events: auto;
    mask-image: linear-gradient(90deg, transparent, #000 22%, #000 92%, transparent);
    -webkit-mask-image: linear-gradient(90deg, transparent, #000 22%, #000 92%, transparent);
  }
  .scrim {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(90deg, rgba(7, 6, 13, 0.9) 0%, rgba(7, 6, 13, 0.55) 34%, transparent 58%);
  }
  .hero-grid { position: relative; z-index: 1; pointer-events: none; padding-block: 64px; }
  .copy { max-width: 640px; pointer-events: auto; }
  .eyebrow { margin: 0 0 18px; }
  h1 { font-size: clamp(42px, 6.2vw, 82px); margin: 0 0 22px; text-shadow: 0 2px 30px rgba(0, 0, 0, 0.5); }
  .lede { max-width: 54ch; margin: 0 0 32px; color: var(--text-muted); font-size: clamp(17px, 1.6vw, 20px); line-height: 1.6; }
  .search-wrap { max-width: 640px; }
  .stats { display: flex; gap: 44px; margin: 40px 0 0; flex-wrap: wrap; }
  .stats div { display: flex; flex-direction: column; }
  dt { color: var(--text-muted); font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; }
  dd { margin: 0; font-family: var(--font-display); font-size: 44px; line-height: 1; font-weight: 500; color: var(--gold-3); font-variant-numeric: tabular-nums; text-shadow: 0 0 24px rgba(242, 184, 90, 0.35); }

  .scroll-hint { position: absolute; left: 50%; bottom: 22px; width: 24px; height: 38px; border: 1px solid var(--border-strong); border-radius: 14px; transform: translateX(-50%); opacity: 0.6; }
  .scroll-hint span { position: absolute; left: 50%; top: 7px; width: 3px; height: 7px; border-radius: 3px; background: var(--gold-2); transform: translateX(-50%); animation: hint 2.2s ease-in-out infinite; box-shadow: 0 0 8px var(--gold); }
  @keyframes hint { 0%, 100% { transform: translate(-50%, 0); opacity: 1; } 70% { transform: translate(-50%, 14px); opacity: 0; } }

  .section-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin: 0 0 28px; flex-wrap: wrap; }
  .kicker { margin: 0 0 4px; font-family: var(--font-devanagari); color: var(--gold); font-size: 16px; opacity: 0.9; }
  h2 { margin: 0; font-size: clamp(32px, 3.6vw, 46px); }
  .all { display: inline-flex; gap: 8px; align-items: center; min-height: var(--tap); color: var(--text-muted); }
  .all:hover { color: var(--gold-2); text-decoration: none; }

  .works { padding-top: 48px; }
  .shelf {
    display: flex;
    gap: clamp(24px, 3vw, 44px);
    overflow-x: auto;
    padding: 24px 8px 40px;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
    mask-image: linear-gradient(90deg, #000 88%, transparent);
    -webkit-mask-image: linear-gradient(90deg, #000 88%, transparent);
    /* A shelf line the books stand on */
    background: linear-gradient(180deg, transparent calc(100% - 36px), rgba(255, 214, 160, 0.08) calc(100% - 36px), transparent calc(100% - 35px));
  }
  .shelf::-webkit-scrollbar { display: none; }
  .shelf > div { flex: none; scroll-snap-align: start; }

  .explore { padding-block: 24px 40px; }
  .panels { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 18px; }
  .panel {
    --rx: 0deg; --ry: 0deg; --tilt: 0;
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 28px 26px 30px;
    min-height: 220px;
    color: var(--text);
    overflow: hidden;
    transform: perspective(900px) rotateX(var(--rx)) rotateY(var(--ry));
    transition: transform 0.5s var(--ease-out), border-color 0.3s, box-shadow 0.4s;
  }
  .panel:hover { text-decoration: none; border-color: var(--border-strong); box-shadow: inset 0 1px 0 rgba(255, 244, 224, 0.1), var(--glow), var(--shadow); }
  .panel.soon { opacity: 0.7; }
  .panel-icon { display: grid; place-items: center; width: 54px; height: 54px; border-radius: 16px; background: var(--accent-soft); color: var(--gold-2); border: 1px solid rgba(242, 184, 90, 0.25); box-shadow: 0 0 20px rgba(242, 184, 90, 0.15); }
  .panel h3 { margin: 6px 0 0; font-family: var(--font-display); font-size: 28px; font-weight: 500; display: flex; align-items: center; gap: 10px; }
  .panel p { margin: 0; color: var(--text-muted); font-size: 15.5px; }
  .panel-light {
    position: absolute; inset: 0; pointer-events: none; opacity: var(--tilt); transition: opacity 0.4s;
    background: radial-gradient(400px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), rgba(255, 214, 160, 0.12), transparent 60%);
  }

  @media (max-width: 900px) {
    .yantra-wrap { left: 0; opacity: 0.5; mask-image: none; -webkit-mask-image: none; }
    .scrim { background: radial-gradient(70% 60% at 30% 45%, rgba(7, 6, 13, 0.85), rgba(7, 6, 13, 0.35) 70%, transparent); }
    .hero-grid { padding-block: 40px; }
    .stats { gap: 28px; }
    dd { font-size: 36px; }
  }
</style>
