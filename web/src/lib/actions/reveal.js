// Reveal an element when it scrolls into view. `delay` (ms) staggers a group.

let observer;
const pending = new WeakMap();

function ensureObserver() {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );
  return observer;
}

export function reveal(node, delay = 0) {
  node.classList.add('reveal');
  node.style.setProperty('--reveal-delay', `${delay}ms`);
  ensureObserver().observe(node);
  pending.set(node, true);
  return {
    destroy() {
      observer?.unobserve(node);
    },
  };
}
