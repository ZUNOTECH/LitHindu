<script>
  // A book as a 3D object: cover, spine and page block. It turns to show its
  // spine as the pointer moves, and opens slightly when pressed.
  import { tilt } from './actions/tilt.js';
  import { link } from './router.svelte.js';

  let { book, size = 'md', showMeta = true } = $props();

  const PALETTE = {
    Sanskrit: ['#8a3b12', '#d9772c', '#ffd27a'],
    Hindi: ['#6d1225', '#b3263f', '#ffb0a0'],
    Tamil: ['#0f4c4a', '#1f8a84', '#a7f0e4'],
    English: ['#1e2358', '#3f4aa8', '#b9c3ff'],
  };
  const palette = $derived(
    PALETTE[Object.keys(PALETTE).find((k) => book.language.includes(k))] ?? ['#3a2a14', '#8a6a2a', '#ffd27a'],
  );
  // Thickness follows page count: a pamphlet is thin, the Mahabharata is a brick.
  const depth = $derived(Math.round(10 + Math.min(1, Math.log10(Math.max(book.pages, 10)) / 4) * 44));
  const progress = $derived(book.pages ? book.pages_ready / book.pages : 1);
  const short = $derived(book.title.length > 60 ? book.title.slice(0, 57) + '…' : book.title);
</script>

<a class="book-link {size}" href={link(`/read/${book.id}`)} use:tilt={{ max: 10 }}
   style:--c1={palette[0]} style:--c2={palette[1]} style:--c3={palette[2]} style:--depth="{depth}px">
  <div class="stage">
    <div class="book">
      <div class="face cover">
        <div class="cover-art">
          <span class="ornament" aria-hidden="true">✦</span>
          <h3>{short}</h3>
          <span class="lang">{book.language}</span>
        </div>
        <div class="sheen" aria-hidden="true"></div>
      </div>
      <div class="face spine"><span>{short}</span></div>
      <div class="face pages"></div>
      <div class="face top"></div>
      <div class="face back"></div>
    </div>
    <div class="shadow" aria-hidden="true"></div>
  </div>
  {#if showMeta}
    <div class="meta">
      <strong>{book.title}</strong>
      <span class="muted">{book.pages.toLocaleString()} pages{book.scanned ? ' · scanned' : ''}</span>
      {#if progress < 1}
        <span class="progress" title="Still being processed"><i style:width="{Math.round(progress * 100)}%"></i></span>
      {/if}
    </div>
  {/if}
</a>

<style>
  .book-link {
    --w: 168px;
    --h: 244px;
    --rx: 0deg;
    --ry: 0deg;
    --tilt: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    color: var(--text);
    text-decoration: none;
    perspective: 1100px;
    outline-offset: 12px;
    border-radius: 12px;
  }
  .book-link.sm { --w: 128px; --h: 186px; }
  .book-link.lg { --w: 200px; --h: 292px; }
  .book-link:hover { text-decoration: none; }

  .stage { position: relative; width: var(--w); height: var(--h); transform-style: preserve-3d; }
  .book {
    position: absolute;
    inset: 0;
    transform-style: preserve-3d;
    transform: rotateY(calc(24deg - var(--ry) * 0.6)) rotateX(calc(4deg + var(--rx) * 0.5));
    transition: transform 0.7s var(--ease-out);
  }
  .book-link:hover .book { transform: rotateY(calc(32deg - var(--ry))) rotateX(calc(6deg + var(--rx))) translateZ(18px); }
  .book-link:active .book { transform: rotateY(10deg) rotateX(2deg) translateZ(6px); transition-duration: 0.25s; }

  /* Box geometry: cover at +depth/2, back at -depth/2, spine on the left,
     page block on the right, page tops above. */
  .face { position: absolute; }
  .cover, .back { backface-visibility: hidden; }
  .cover {
    inset: 0;
    border-radius: 3px 10px 10px 3px;
    background:
      linear-gradient(100deg, rgba(0, 0, 0, 0.35), transparent 14%),
      linear-gradient(160deg, var(--c2), var(--c1) 70%);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08), inset 6px 0 14px -8px rgba(0, 0, 0, 0.6);
    transform: translateZ(calc(var(--depth) / 2));
    overflow: hidden;
  }
  .cover-art {
    position: absolute;
    inset: 14px 14px 14px 20px;
    border: 1px solid color-mix(in srgb, var(--c3) 55%, transparent);
    border-radius: 2px 8px 8px 2px;
    padding: 18px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .ornament { color: var(--c3); font-size: 14px; opacity: 0.9; }
  .cover-art h3 {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 500;
    font-size: 19px;
    line-height: 1.2;
    color: #fff7e8;
    text-transform: capitalize;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    overflow-wrap: anywhere;
  }
  .sm .cover-art h3 { font-size: 15px; }
  .lg .cover-art h3 { font-size: 22px; }
  .lang {
    margin-top: auto;
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--c3);
  }
  .sheen {
    position: absolute;
    inset: -40%;
    background: radial-gradient(circle at calc(var(--mx, 0.3) * 100%) calc(var(--my, 0.2) * 100%), rgba(255, 255, 255, 0.22), transparent 38%);
    opacity: var(--tilt);
    transition: opacity 0.4s;
    mix-blend-mode: screen;
  }
  .spine {
    top: 0;
    bottom: 0;
    left: 0;
    width: var(--depth);
    background: linear-gradient(180deg, var(--c1), var(--c2) 50%, var(--c1));
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
    transform-origin: left center;
    transform: rotateY(-90deg) translateX(calc(var(--depth) / -2));
    display: grid;
    place-items: center;
  }
  .spine span {
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    font-family: var(--font-display);
    font-size: 12px;
    color: #fff3dc;
    opacity: 0.9;
    max-height: 85%;
    overflow: hidden;
    text-transform: capitalize;
    white-space: nowrap;
  }
  .pages {
    top: 3px;
    bottom: 3px;
    right: 0;
    width: var(--depth);
    background: repeating-linear-gradient(180deg, #efe6d2 0 2px, #cfc4ad 2px 3px);
    transform-origin: right center;
    transform: rotateY(90deg) translateX(calc(var(--depth) / 2));
  }
  .top {
    left: 3px;
    right: 3px;
    top: 0;
    height: var(--depth);
    background: repeating-linear-gradient(90deg, #efe6d2 0 2px, #d6ccb6 2px 3px);
    transform-origin: top center;
    transform: rotateX(90deg) translateY(calc(var(--depth) / -2));
  }
  .back {
    inset: 0;
    border-radius: 3px 10px 10px 3px;
    background: var(--c1);
    transform: translateZ(calc(var(--depth) / -2)) rotateY(180deg);
  }
  .shadow {
    position: absolute;
    left: 6%;
    right: -4%;
    bottom: -18px;
    height: 26px;
    border-radius: 50%;
    background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.6), transparent 70%);
    filter: blur(6px);
    transform: translateZ(-40px);
    transition: transform 0.7s var(--ease-out), opacity 0.7s;
  }
  .book-link:hover .shadow { transform: translateZ(-40px) translateY(8px) scaleX(1.08); opacity: 0.8; }

  .meta { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 2px; max-width: calc(var(--w) + 40px); }
  .meta strong { font-size: 15px; line-height: 1.3; text-transform: capitalize; overflow-wrap: anywhere; }
  .meta .muted { font-size: 13px; }
  .progress { width: 100%; height: 3px; margin-top: 6px; border-radius: 3px; background: var(--surface-3); overflow: hidden; }
  .progress i { display: block; height: 100%; background: linear-gradient(90deg, var(--gold), var(--saffron)); box-shadow: 0 0 10px var(--gold); }
</style>
