async function get(path) {
  const res = await fetch(path);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  stats: () => get('/api/stats'),
  books: () => get('/api/books'),
  book: (id) => get(`/api/books/${id}`),
  page: (id, page) => get(`/api/books/${id}/pages/${page}`),
  search: (q, { book, limit = 20, offset = 0 } = {}) => {
    const params = new URLSearchParams({ q, limit, offset });
    if (book != null) params.set('book', book);
    return get(`/api/search?${params}`);
  },
  fileUrl: (id) => `/api/books/${id}/file`,
};
