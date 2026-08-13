// SearchPalette.jsx – global ⌘K search across all content types
(function() {
const { useState, useMemo, useEffect, useRef } = React;

// ── Helpers ───────────────────────────────────────────────────

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Find the first occurrence of `q` (case-insensitive) inside any of the
// candidate field strings; return { fieldText, matchIndex } for the first hit,
// or null if no field contains the query.
function findFirstMatch(query, fields) {
  const lq = query.toLowerCase();
  for (const text of fields) {
    if (!text) continue;
    const idx = text.toLowerCase().indexOf(lq);
    if (idx >= 0) return { fieldText: text, matchIndex: idx };
  }
  return null;
}

// Render a snippet of `text` centred around the match at `matchIndex`,
// returning HTML with the matched substring wrapped in <mark>.
function snippetHtml(text, matchIndex, queryLen, contextBefore = 40, contextAfter = 80) {
  const start = Math.max(0, matchIndex - contextBefore);
  const end   = Math.min(text.length, matchIndex + queryLen + contextAfter);
  const before = escHtml(text.slice(start, matchIndex));
  const match  = escHtml(text.slice(matchIndex, matchIndex + queryLen));
  const after  = escHtml(text.slice(matchIndex + queryLen, end));
  const prefix = start > 0          ? '…' : '';
  const suffix = end   < text.length ? '…' : '';
  return prefix + before + '<mark>' + match + '</mark>' + after + suffix;
}

// Match the query and produce a snippet from the first matching field.
// Falls back to a default snippet (no highlighting) if no fields match.
function matchAndSnippet(query, fields, fallback) {
  const m = findFirstMatch(query, fields);
  if (!m) return { matched: false, html: escHtml(fallback || '') };
  return {
    matched: true,
    html: snippetHtml(m.fieldText, m.matchIndex, query.length),
  };
}

// Highlight the matched substring inside an arbitrary title string.
function highlightInline(query, text) {
  if (!query || !text) return escHtml(text || '');
  const lq = query.toLowerCase();
  const idx = text.toLowerCase().indexOf(lq);
  if (idx < 0) return escHtml(text);
  const before = escHtml(text.slice(0, idx));
  const match  = escHtml(text.slice(idx, idx + query.length));
  const after  = escHtml(text.slice(idx + query.length));
  return before + '<mark>' + match + '</mark>' + after;
}

// ── Source definitions ────────────────────────────────────────
//
// Each source declares:
//   key         – unique identifier
//   label       – section header in results
//   module      – which module to navigate to on click
//   buildItems  – given the loaded `data` object, return the searchable units
//   searchTexts – for each item, the array of strings to test against the query
//   resultId    – id passed to onNavigate (deep-link target inside the module)
//   resultModule– optional override of `module` per item (used by recall, where
//                 the parent may live in either glossary or topics)
//   title       – string shown as the result heading
//   defaultSnippet – fallback text when no field matched (rare)
//   limit       – max results returned per source

function buildSources(data) {
  const { glossary = [], models = [], timeline = [], exams = [], topics = [],
          quiz = [], flashcards = [], calculations = [] } = data;

  // mindmap is loaded lazily from a separate fetch – passed in via data.mindmap
  const mindmap = data.mindmap || null;
  const mindmapNodes = mindmap?.nodes || [];

  return [
    {
      key: 'topics',
      label: 'Topics',
      module: 'topics',
      buildItems: () => topics,
      searchTexts: t => [
        t.title, t.subtitle, t.examWeight,
        ...(t.keyTerms || []),
        ...(t.sections || []).flatMap(s => [s.heading, s.body]),
      ],
      resultId: t => t.id,
      title: t => t.title,
      defaultSnippet: t => t.subtitle || '',
      limit: 5,
    },
    {
      key: 'glossary',
      label: 'Glossary',
      module: 'glossary',
      buildItems: () => glossary,
      searchTexts: e => [
        e.term, e.definition, e.summary, e.flashcardBack,
      ],
      resultId: e => e.id,
      title: e => e.term,
      defaultSnippet: e => e.definition || e.summary || '',
      limit: 5,
    },
    {
      key: 'models',
      label: 'Models',
      module: 'glossary', // models share the Glossary module
      buildItems: () => models,
      searchTexts: e => [
        e.term, e.summary, e.walkthrough, e.definition,
      ],
      resultId: e => e.id,
      title: e => e.term,
      defaultSnippet: e => e.summary || '',
      limit: 4,
    },
    {
      key: 'flashcards',
      label: 'Flashcards',
      module: 'flashcards',
      buildItems: () => flashcards,
      searchTexts: c => [c.front, c.back],
      resultId: c => c.id,
      title: c => c.front,
      defaultSnippet: c => c.back || '',
      limit: 4,
    },
    {
      key: 'quiz',
      label: 'Quiz',
      module: 'quiz',
      buildItems: () => quiz,
      searchTexts: q => [q.prompt, q.explanation, q.answer],
      resultId: q => q.id,
      title: q => (q.type === 'tf' ? 'T/F · ' : 'MC · ') + window.tagLabel(q.topic),
      defaultSnippet: q => q.prompt || '',
      limit: 4,
    },
    {
      key: 'exams',
      label: 'Past Exams',
      module: 'exams',
      buildItems: () => exams.filter(e => !e.placeholder && e.prompt),
      searchTexts: e => [e.prompt, e.modelAnswer],
      resultId: e => e.id,
      title: e => 'Q' + e.questionNumber + (e.paperLabel ? ' – ' + e.paperLabel : ''),
      defaultSnippet: e => e.prompt || '',
      limit: 4,
    },
    {
      key: 'calculations',
      label: 'Calculations',
      module: 'calculations',
      buildItems: () => calculations,
      searchTexts: c => [
        c.title, c.problem, c.category, c.intuition,
        ...(c.parts || []).flatMap(p => [
          p.prompt, p.answer,
          ...(p.working || []),
        ]),
      ],
      resultId: c => c.id,
      title: c => c.title,
      defaultSnippet: c => c.source || '',
      limit: 4,
    },
    {
      key: 'timeline',
      label: 'Timeline',
      module: 'timeline',
      buildItems: () => timeline,
      searchTexts: e => [e.title, e.summary],
      resultId: e => e.id,
      title: e => e.title,
      defaultSnippet: e => (e.date ? window.formatDate(e.date) + ' – ' : '') + (e.summary || ''),
      limit: 4,
    },
    {
      key: 'mindmap',
      label: 'Mind-map',
      module: 'mindmap',
      buildItems: () => mindmapNodes.filter(n => n.kind !== 'root'),
      searchTexts: n => [n.label, n.cluster, n.kind],
      resultId: n => n.id,
      title: n => n.label,
      defaultSnippet: n => n.cluster ? window.tagLabel(n.cluster) || n.cluster : (n.kind || ''),
      limit: 4,
    },
    {
      // Recall questions are nested inside glossary/model/topic entries.
      // We flatten them to {parent, q, parentKind} tuples so the regular
      // search machinery can handle them; clicking a result navigates to
      // the parent (in its module).
      key: 'recall',
      label: 'Recall questions',
      module: 'glossary', // overridden per-item via resultModule
      buildItems: () => {
        const out = [];
        const push = (parent, parentKind, parentModule) => {
          (parent.recall_questions || []).forEach((q, i) => {
            out.push({
              parent, parentKind, parentModule, q,
              // Synthesise a stable id for de-dup
              _id: `${parent.id}::recall::${i}`,
            });
          });
        };
        glossary.forEach(p => push(p, 'glossary', 'glossary'));
        models.forEach  (p => push(p, 'model',    'glossary'));
        topics.forEach  (p => push(p, 'topic',    'topics'));
        return out;
      },
      searchTexts: ({ q }) => [q.question, q.answer],
      resultId:     ({ parent }) => parent.id,
      resultModule: ({ parentModule }) => parentModule,
      title: ({ parent, q }) => {
        const parentName = parent.term || parent.title || 'Recall';
        const trimmed = (q.question || '').replace(/\s+/g, ' ').trim();
        return parentName + ' – ' + (trimmed.length > 70 ? trimmed.slice(0, 70) + '…' : trimmed);
      },
      defaultSnippet: ({ q }) => (q.answer || ''),
      limit: 4,
    },
  ];
}

// ── Component ─────────────────────────────────────────────────

function SearchPalette({ data, onClose, onNavigate }) {
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const [mindmap, setMindmap] = useState(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Lazy-load mindmap.json the first time the palette opens, so mind-map
  // nodes become searchable without forcing the full graph to mount.
  useEffect(() => {
    if (mindmap) return;
    fetch('data/mindmap.json')
      .then(r => r.ok ? r.json() : null)
      .then(setMindmap)
      .catch(() => {});
  }, [mindmap]);

  useEffect(() => {
    inputRef.current && inputRef.current.focus();
  }, []);

  const sources = useMemo(
    () => buildSources({ ...data, mindmap }),
    [data, mindmap]
  );

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const out = [];
    for (const src of sources) {
      const items = src.buildItems();
      const hits = [];
      for (const item of items) {
        const fields = src.searchTexts(item);
        const m = findFirstMatch(q, fields);
        if (!m) continue;
        hits.push({
          srcKey: src.key,
          label: src.label,
          module: src.resultModule ? src.resultModule(item) : src.module,
          id: src.resultId(item),
          titleHtml: highlightInline(q, src.title(item)),
          snippetHtml: snippetHtml(m.fieldText, m.matchIndex, q.length),
          uid: src.key + '::' + (src.resultId(item) || hits.length) + '::' + hits.length,
        });
        if (hits.length >= src.limit) break;
      }
      if (hits.length) {
        out.push({ key: src.key, label: src.label, items: hits });
      }
    }
    return out;
  }, [query, sources]);

  const flatItems = useMemo(
    () => results.flatMap(s => s.items),
    [results]
  );

  // Reset highlight to first when query changes
  useEffect(() => { setHighlighted(0); }, [query]);

  // Keep highlighted result visible
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector('.sp-result.highlighted');
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlighted]);

  function handleKeyDown(e) {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, flatItems.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    }
    if (e.key === 'Enter' && flatItems[highlighted]) {
      const item = flatItems[highlighted];
      onNavigate(item.module, item.id);
      onClose();
    }
  }

  let flatIdx = 0;
  const totalResults = flatItems.length;

  return (
    <div
      className="search-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Global search"
    >
      <div className="search-palette">
        <div className="sp-input-wrap">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
          </svg>
          <input
            ref={inputRef}
            className="sp-input"
            placeholder="Search topics, glossary, flashcards, quiz, exams, calculations…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Search"
            aria-autocomplete="list"
          />
          <button
            onClick={onClose}
            style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ink-light)', fontSize:12, letterSpacing:'0.04em', fontFamily:'var(--font-body)' }}
            aria-label="Close search"
          >ESC</button>
        </div>

        <div className="sp-results" role="listbox" ref={listRef}>
          {query && totalResults === 0 && (
            <div className="sp-empty">No results for "{query}"</div>
          )}
          {!query && (
            <div className="sp-empty">Start typing to search across all content…</div>
          )}
          {query && totalResults > 0 && (
            <div className="sp-results-meta">
              {totalResults} result{totalResults === 1 ? '' : 's'} across {results.length} {results.length === 1 ? 'section' : 'sections'}
            </div>
          )}
          {results.map(section => (
            <div key={section.key}>
              <div className="sp-section-label">{section.label}</div>
              {section.items.map(item => {
                const isFlatIdx = flatIdx;
                flatIdx++;
                return (
                  <div
                    key={item.uid}
                    className={'sp-result' + (highlighted === isFlatIdx ? ' highlighted' : '')}
                    onClick={() => { onNavigate(item.module, item.id); onClose(); }}
                    role="option"
                    aria-selected={highlighted === isFlatIdx}
                    onMouseEnter={() => setHighlighted(isFlatIdx)}
                  >
                    <span
                      className="sp-result-term"
                      dangerouslySetInnerHTML={{ __html: item.titleHtml }}
                    />
                    <span
                      className="sp-result-snippet"
                      dangerouslySetInnerHTML={{ __html: item.snippetHtml }}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.SearchPalette = SearchPalette;
})();
