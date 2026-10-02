<script>
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { link, route, replace } from '../lib/router.svelte.js';
  import { layout, RING } from '../lib/chakraLayout.js';
  import { formatYear } from '../data/timeline.js';
  import { reveal } from '../lib/actions/reveal.js';
  import { entriesFor, TYPES } from '../lib/encyclopedia.js';

  const L = layout();
  const events = L.events;
  const eras = L.eras;
  const yugas = L.yugas;

  // Selection: an event, an era or a yuga. The URL remembers it.
  let selected = $state(parseSelection(route.params.get('at')));
  function parseSelection(at) {
    if (!at) return { kind: 'event', id: events[0].id ?? 0 };
    const [kind, id] = at.split(':');
    if (kind === 'era' && eras.some((e) => e.id === id)) return { kind, id };
    if (kind === 'yuga' && yugas.some((y) => y.id === id)) return { kind, id };
    const i = Number(id);
    if (kind === 'event' && events[i]) return { kind, id: i };
    return { kind: 'event', id: 0 };
  }
  const current = $derived(
    selected.kind === 'event' ? events[selected.id]
    : selected.kind === 'era' ? eras.find((e) => e.id === selected.id)
    : yugas.find((y) => y.id === selected.id),
  );
  const currentEra = $derived(selected.kind === 'event' ? eras.find((e) => e.id === current.era) : selected.kind === 'era' ? current : null);
  const eventIndex = $derived(selected.kind === 'event' ? selected.id : -1);
  const entries = $derived(entriesFor(selected.kind, selected.kind === 'event' ? current.name : current.id));

  function select(kind, id) {
    selected = { kind, id };
    replace(link('/timeline', { at: `${kind}:${id}` }).slice(1));
  }
  const step = (d) => {
    const i = eventIndex >= 0 ? eventIndex : nearestEvent(scene?.getRotation() ?? 0);
    select('event', Math.min(events.length - 1, Math.max(0, i + d)));
  };

  function nearestEvent(angle) {
    let best = 0;
    let dist = Infinity;
    events.forEach((ev, i) => {
      const d = Math.abs(ev.a - angle);
      if (d < dist) { dist = d; best = i; }
    });
    return best;
  }

  // --- 3D wheel ----------------------------------------------------------------
  let canvas = $state();
  let stage = $state();
  let scene = null;
  let fallback = $state(false);
  let ready = $state(false);
  let marks = $state([]);      // projected event markers
  let eraMarks = $state([]);   // projected era labels
  let yugaMarks = $state([]);  // projected yuga labels
  let needle = $state(null);

  const eventPoints = events.map((ev) => ({ a: ev.a, r: (RING.inner + RING.outer) / 2, ring: 'inner' }));
  const eraPoints = eras.map((e) => ({ a: e.mid, r: RING.label, ring: 'inner' }));
  const yugaPoints = yugas.map((y) => ({ a: y.mid, r: RING.yugaLabel, ring: 'outer' }));
  const needlePoint = [{ a: 0, r: RING.inner - 0.24, ring: 'fixed', z: 0.05 }];

  function updateOverlay() {
    if (!scene) return;
    marks = scene.project(eventPoints);
    eraMarks = scene.project(eraPoints);
    yugaMarks = scene.project(yugaPoints);
    needle = scene.project(needlePoint)[0];
  }

  onMount(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cleanup = () => {};
    let cancelled = false;
    import('../lib/three/chakraScene.js')
      .then(({ createChakraScene }) => {
        if (cancelled) return;
        scene = createChakraScene(canvas, { eras, events, yugas, lit: L.lit, animated: !reduced });
        scene.onFrame(updateOverlay);
        scene.onSettle((angle) => select('event', nearestEvent(angle)));
        applySelection(true);
        scene.start();
        ready = true;
        const onVis = () => (document.hidden ? scene.stop() : scene.start());
        document.addEventListener('visibilitychange', onVis);
        const io = new IntersectionObserver(([e]) => (e.isIntersecting && !document.hidden ? scene.start() : scene.stop()));
        io.observe(canvas);
        cleanup = () => { io.disconnect(); document.removeEventListener('visibilitychange', onVis); scene.dispose(); scene = null; };
      })
      .catch(() => (fallback = true));
    return () => { cancelled = true; cleanup(); };
  });

  function applySelection(immediate = false) {
    if (!scene) return;
    if (selected.kind === 'event') {
      scene.setRotation(current.a, immediate);
      scene.setFocus({ eraId: current.era });
    } else if (selected.kind === 'era') {
      scene.setRotation(current.mid, immediate);
      scene.setFocus({ eraId: current.id });
    } else {
      scene.setFocus({ yugaId: current.id });
    }
  }
  $effect(() => { selected; applySelection(); });

  // Drag to turn the wheel; a flick keeps it spinning, then it settles on an event.
  let drag = null;
  let suppressClick = false;
  function pointerdown(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    drag = { x: e.clientX, x0: e.clientX, t: performance.now(), v: 0, moved: false };
    scene?.dragStart();
    stage.setPointerCapture?.(e.pointerId);
  }
  function pointermove(e) {
    if (!drag || !scene) return;
    const dx = e.clientX - drag.x;
    const now = performance.now();
    const k = -0.0045; // radians per pixel, so content follows the pointer
    drag.v = (dx * k) / Math.max(1, now - drag.t) * 1000;
    drag.x = e.clientX;
    drag.t = now;
    if (Math.abs(e.clientX - drag.x0) > 4) drag.moved = true;
    scene.drag(dx * k);
  }
  function pointerup() {
    if (!drag || !scene) return;
    scene.dragEnd(drag.moved ? drag.v : 0);
    if (drag.moved) {
      suppressClick = true;
      setTimeout(() => (suppressClick = false), 0);
    }
    drag = null;
  }
  const pick = (kind, id) => () => { if (!suppressClick) select(kind, id); };
  let wheelLock = 0;
  function wheel(e) {
    e.preventDefault();
    const now = performance.now();
    if (now - wheelLock < 260) return;
    wheelLock = now;
    step(Math.sign(e.deltaY || e.deltaX));
  }
  function onkeydown(e) {
    if (e.target.closest('input')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
    if (e.key === 'Home') select('event', 0);
    if (e.key === 'End') select('event', events.length - 1);
  }
</script>

<svelte:window {onkeydown} />

<div class="timeline">
  <header class="container head" use:reveal>
    <p class="kicker">कालचक्र</p>
    <h1 class="display">The wheel of time</h1>
    <p class="muted lede">Turn the wheel through five thousand years of recorded history, set within the four ages of the cosmic cycle. Where tradition and scholarship date things differently, both are given.</p>
  </header>

  <section class="chakra" class:fallback>
    {#if !fallback}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="stage" bind:this={stage} onpointerdown={pointerdown} onpointermove={pointermove} onpointerup={pointerup} onpointercancel={pointerup} onwheel={wheel}>
        <canvas bind:this={canvas} class:ready aria-hidden="true"></canvas>
        <div class="overlay" aria-hidden={!ready}>
          {#each events as ev, i}
            {@const m = marks[i]}
            {#if m}
              <button class="mark" class:on={eventIndex === i} class:era-on={currentEra?.id === ev.era} class:far={!m.near}
                style:transform="translate(-50%, -50%) translate({m.x}px, {m.y}px) scale({m.scale})" style:--c={ev.color}
                onclick={pick('event', i)} aria-label="{ev.name}, {ev.date}" title={ev.name}>
                <i></i>
                {#if eventIndex === i}<span class="mark-label">{ev.name}</span>{/if}
              </button>
            {/if}
          {/each}
          {#each eras as era, i}
            {@const m = eraMarks[i]}
            {#if m}
              <button class="era-label" class:on={currentEra?.id === era.id} class:far={!m.near}
                style:transform="translate(-50%, -50%) translate({m.x}px, {m.y}px) scale({m.scale})" style:--c={era.color}
                onclick={pick('era', era.id)}>
                <span class="sa">{era.sa}</span><span class="en">{era.name}</span>
              </button>
            {/if}
          {/each}
          {#each yugas as y, i}
            {@const m = yugaMarks[i]}
            {#if m}
              <button class="yuga-label" class:on={selected.kind === 'yuga' && selected.id === y.id} class:far={!m.near}
                style:transform="translate(-50%, -50%) translate({m.x}px, {m.y}px) scale({m.scale})"
                onclick={pick('yuga', y.id)}>{y.name}</button>
            {/if}
          {/each}
          {#if needle}
            <div class="needle" style:transform="translate(-50%, 0) translate({needle.x}px, {needle.y}px)"></div>
          {/if}
        </div>
        <div class="hint muted">Drag to turn · scroll or ← → to step</div>
      </div>
    {/if}

    <aside class="panel glass">
      {#key `${selected.kind}:${selected.id}`}
        <div class="panel-body" in:fly={{ y: 18, duration: 420 }}>
          <div class="panel-top">
            <span class="badge accent">{selected.kind === 'event' ? 'Event' : selected.kind === 'era' ? 'Era' : 'Yuga'}</span>
            {#if selected.kind === 'event'}
              <button class="era-link ghost" onclick={() => select('era', current.era)}>{currentEra.name} →</button>
            {/if}
          </div>
          <p class="sa-title">{current.sa}</p>
          <h2 class="display">{current.name}</h2>

          <dl class="dates">
            {#if selected.kind === 'event'}
              <div><dt>Date</dt><dd>{current.date}</dd></div>
            {:else if selected.kind === 'era'}
              <div><dt>Scholarly</dt><dd>{current.dating.scholarly}</dd></div>
              {#if current.dating.traditional}<div><dt>Traditional</dt><dd>{current.dating.traditional}</dd></div>{/if}
            {:else}
              <div><dt>Length</dt><dd>{current.years.toLocaleString()} years · {current.share} of 10 parts of the cycle</dd></div>
            {/if}
          </dl>

          <p class="summary">{current.summary}</p>

          {#if selected.kind === 'era'}
            <h3>In this era</h3>
            <ol class="era-events">
              {#each current.events as ev}
                <li><button class="ghost" onclick={() => select('event', events.indexOf(ev))}><span class="muted">{formatYear(ev.year)}</span> {ev.name}</button></li>
              {/each}
            </ol>
          {/if}

          {#if selected.kind === 'yuga'}
            <p class="muted small">The cosmic ring turns on its own. Tradition counts a full cycle of four yugas at 4,320,000 years; a thousand such cycles make one day of Brahma.</p>
          {/if}

          {#if entries.length}
            <h3>In the encyclopedia</h3>
            <div class="chips">
              {#each entries as e (e.id)}
                <a class="chip" href={link(`/encyclopedia/${e.id}`)}><span class="chip-sa">{e.sa}</span>{e.name}</a>
              {/each}
            </div>
          {/if}

          <h3>In the library</h3>
          <div class="chips">
            {#each current.library as q}
              <a class="chip" href={link('/search', { q })}>{q}</a>
            {/each}
          </div>
        </div>
      {/key}
      <div class="panel-nav">
        <button onclick={() => step(-1)} disabled={eventIndex === 0}>‹ Earlier</button>
        <span class="muted counter">{eventIndex >= 0 ? `${eventIndex + 1} / ${events.length}` : ''}</span>
        <button onclick={() => step(1)} disabled={eventIndex === events.length - 1}>Later ›</button>
      </div>
    </aside>
  </section>

  <nav class="container strip" aria-label="Eras" use:reveal>
    {#each eras as era}
      <button class="era-chip" class:on={currentEra?.id === era.id} style:--c={era.color} onclick={() => select('era', era.id)}>
        <span class="dot"></span>
        <span class="era-chip-name">{era.name}</span>
        <span class="muted">{formatYear(era.start)} – {formatYear(era.end)}</span>
      </button>
    {/each}
  </nav>

  {#if fallback}
    <section class="container list">
      {#each eras as era}
        <h2 class="display" style:color={era.color}>{era.name} <span class="muted">{formatYear(era.start)} – {formatYear(era.end)}</span></h2>
        <ol>{#each era.events as ev}<li><button class="ghost" onclick={() => select('event', events.indexOf(ev))}>{ev.date}: {ev.name}</button></li>{/each}</ol>
      {/each}
    </section>
  {/if}
</div>

<style>
  .head { padding-block: 36px 8px; max-width: 900px; }
  .kicker { margin: 0 0 4px; font-family: var(--font-devanagari); color: var(--gold); font-size: 16px; }
  h1 { margin: 0 0 10px; font-size: clamp(38px, 4.5vw, 56px); }
  .lede { margin: 0; max-width: 64ch; }

  .chakra {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(360px, 440px);
    gap: 20px;
    padding: 12px clamp(16px, 4vw, 40px) 0;
    max-width: 1500px;
    margin: 0 auto;
    align-items: start;
  }
  .chakra.fallback { grid-template-columns: 1fr; }

  .stage { position: relative; height: clamp(500px, 64vh, 680px); cursor: grab; user-select: none; touch-action: pan-y; border-radius: var(--radius); overflow: hidden; }
  .stage:active { cursor: grabbing; }
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; opacity: 0; transition: opacity 1.2s; }
  canvas.ready { opacity: 1; }
  .overlay { position: absolute; inset: 0; pointer-events: none; }
  .overlay > * { position: absolute; left: 0; top: 0; pointer-events: auto; }

  .mark {
    min-width: 0; min-height: 0; width: 36px; height: 36px; padding: 0; border: 0; background: transparent; backdrop-filter: none;
    display: grid; place-items: center; transform-origin: center; will-change: transform; box-shadow: none;
  }
  .mark i { width: 8px; height: 8px; border-radius: 50%; background: var(--c); box-shadow: 0 0 10px var(--c), 0 0 2px #fff inset; transition: transform 0.3s, box-shadow 0.3s, opacity 0.3s; opacity: 0.55; }
  .mark.era-on i { opacity: 1; }
  .mark:hover i { transform: scale(1.5); }
  .mark.on i { transform: scale(2.1); background: #fff6e0; box-shadow: 0 0 18px 4px var(--c), 0 0 40px var(--c); opacity: 1; }
  .mark.far { opacity: 0.35; }
  .mark.on.far { opacity: 1; }
  .mark-label {
    position: absolute; top: 100%; left: 50%; transform: translateX(-50%); margin-top: -2px; white-space: nowrap;
    font-size: 14px; font-weight: 600; color: var(--gold-3); text-shadow: 0 0 12px rgba(0, 0, 0, 0.9), 0 0 24px rgba(242, 184, 90, 0.4);
  }
  .era-label {
    min-width: 0; min-height: 0; padding: 4px 10px; border: 0; background: transparent; backdrop-filter: none; box-shadow: none;
    display: flex; flex-direction: column; align-items: center; gap: 0; transform-origin: center; will-change: transform;
    color: var(--text-muted); font-size: 12.5px; letter-spacing: 0.04em; text-transform: uppercase; white-space: nowrap; text-shadow: 0 0 10px rgba(0, 0, 0, 0.9);
    transition: color 0.3s, opacity 0.3s;
  }
  .era-label .sa { font-family: var(--font-devanagari); font-size: 14px; text-transform: none; letter-spacing: 0; color: var(--c); opacity: 0.85; }
  .era-label.on { color: var(--gold-3); }
  .era-label.on .sa { opacity: 1; text-shadow: 0 0 14px var(--c); }
  .era-label.far { opacity: 0.45; }
  .era-label.far:not(.on) .en { display: none; }
  .era-label:hover { color: var(--text); opacity: 1; }
  .yuga-label {
    min-width: 0; min-height: 0; padding: 4px 10px; border: 0; background: transparent; backdrop-filter: none; box-shadow: none;
    font-family: var(--font-display); font-size: 17px; font-style: italic; color: var(--text-faint); white-space: nowrap; transform-origin: center; will-change: transform;
    text-shadow: 0 0 10px rgba(0, 0, 0, 0.9); transition: color 0.3s;
  }
  .yuga-label.on, .yuga-label:hover { color: var(--gold-2); text-shadow: 0 0 16px rgba(242, 184, 90, 0.5); }
  .yuga-label.far { opacity: 0.5; }
  .needle {
    width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-bottom: 16px solid var(--gold-3);
    filter: drop-shadow(0 0 8px var(--gold)); pointer-events: none;
  }
  .hint { position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%); font-size: 12.5px; letter-spacing: 0.03em; pointer-events: none; }

  .panel { display: flex; flex-direction: column; padding: 26px 26px 18px; max-height: clamp(500px, 64vh, 680px); overflow: auto; }
  .panel-body { flex: 1; }
  .panel-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .era-link { min-height: 36px; padding: 0 10px; font-size: 13.5px; color: var(--text-muted); }
  .era-link:hover { color: var(--gold-2); }
  .sa-title { margin: 18px 0 2px; font-family: var(--font-devanagari); font-size: 22px; color: var(--gold); text-shadow: 0 0 18px rgba(242, 184, 90, 0.4); }
  h2 { margin: 0 0 16px; font-size: clamp(28px, 2.6vw, 36px); line-height: 1.1; }
  .dates { margin: 0 0 16px; display: flex; flex-direction: column; gap: 8px; }
  .dates div { display: grid; grid-template-columns: 92px 1fr; gap: 10px; align-items: baseline; }
  dt { font-size: 11.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-faint); }
  dd { margin: 0; font-size: 14.5px; color: var(--text); }
  .summary { margin: 0 0 18px; line-height: 1.65; }
  h3 { margin: 18px 0 8px; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-faint); }
  .era-events { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
  .era-events button { width: 100%; justify-content: flex-start; text-align: left; min-height: 40px; padding: 0 10px; border-radius: 10px; display: flex; gap: 10px; font-size: 15px; }
  .era-events .muted { font-variant-numeric: tabular-nums; min-width: 78px; font-size: 13px; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip { display: inline-flex; align-items: center; min-height: 36px; padding: 0 13px; border-radius: 999px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font-size: 14px; transition: border-color 0.25s, box-shadow 0.3s; }
  .chip:hover { text-decoration: none; border-color: var(--border-strong); box-shadow: var(--glow); }
  .chip-sa { font-family: var(--font-devanagari); color: var(--gold); margin-right: 8px; }
  .small { font-size: 14px; }
  .panel-nav { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--border); }
  .counter { font-variant-numeric: tabular-nums; font-size: 13px; }

  .strip { display: flex; gap: 10px; overflow-x: auto; padding: 28px clamp(16px, 4vw, 40px) 8px; scrollbar-width: none; }
  .strip::-webkit-scrollbar { display: none; }
  .era-chip { flex: none; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 12px 16px; border-radius: 16px; min-width: 200px; text-align: left; line-height: 1.3; }
  .era-chip .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c); box-shadow: 0 0 10px var(--c); margin-bottom: 4px; }
  .era-chip-name { font-weight: 600; font-size: 14.5px; }
  .era-chip .muted { font-size: 12.5px; }
  .era-chip.on { border-color: var(--border-strong); box-shadow: var(--glow); background: var(--surface-3); }

  .list { padding: 24px 0 40px; }
  .list ol { list-style: none; padding: 0 0 12px; margin: 0; }

  @media (max-width: 1100px) {
    .chakra { grid-template-columns: 1fr; min-height: 0; }
    .stage { height: clamp(360px, 96vw, 560px); }
    .panel { max-height: none; overflow: visible; }
    .era-label:not(.on) .en { display: none; }
  }
</style>
