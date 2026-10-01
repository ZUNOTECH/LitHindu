// Tiny hash router: #/path/parts?query=params

function parse() {
  const hash = location.hash.slice(1) || '/';
  const [path, qs = ''] = hash.split('?');
  return { parts: path.split('/').filter(Boolean), params: new URLSearchParams(qs) };
}

export const route = $state(parse());

window.addEventListener('hashchange', () => Object.assign(route, parse()));

export function go(path) {
  location.hash = path;
}

/** Update the URL without adding a history entry (e.g. turning pages). */
export function replace(path) {
  history.replaceState(null, '', '#' + path);
  Object.assign(route, parse());
}

export function link(path, params = {}) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ''));
  const s = qs.toString();
  return '#' + path + (s ? '?' + s : '');
}
