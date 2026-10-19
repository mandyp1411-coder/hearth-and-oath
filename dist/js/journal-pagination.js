// Navigation is transient UI state, never a property of the saved game.
export function journalPage(rows, requested = 0, size = 30) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.min(pages - 1, Math.max(0, Number.isSafeInteger(requested) ? requested : 0));
  const start = page * size;
  return { rows: rows.slice(start, start + size), page, pages, total: rows.length, start: rows.length ? start + 1 : 0, end: Math.min(start + size, rows.length) };
}
export function renderJournalPager(view, kind, label, ui, { total = view.total, query = '' } = {}) {
  const { e, button } = ui;
  return `<div class="journal-paging" data-journal-paging="${e(kind)}"><p id="journal-${e(kind)}-results" tabindex="-1" data-view-results>${e(label)}: ${view.total ? `${view.start}–${view.end} of ${view.total}` : '0'}${query ? ` matching / ${total} saved` : ' saved'}${view.pages > 1 ? ` · Page ${view.page + 1} of ${view.pages}` : ''}.</p>${view.pages > 1 ? `<nav class="quick-actions" aria-label="${e(label)} pages">${button('First', 'journal-page', kind + ':0', 'ghost small', view.page === 0)}${button('Previous', 'journal-page', kind + ':' + (view.page - 1), 'secondary small', view.page === 0)}${button('Next', 'journal-page', kind + ':' + (view.page + 1), 'secondary small', view.page === view.pages - 1)}${button('Last', 'journal-page', kind + ':' + (view.pages - 1), 'ghost small', view.page === view.pages - 1)}</nav>` : ''}</div>`;
}
