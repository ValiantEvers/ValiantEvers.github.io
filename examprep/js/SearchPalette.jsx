// SearchPalette.jsx
(function() {
const { useState, useMemo, useEffect, useRef } = React;

function SearchPalette({ data, onClose, onNavigate }) {
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef(null);
  const { glossary = [], models = [], timeline = [], exams = [], topics = [], quiz = [], flashcards = [] } = data;

  useEffect(() => {
    inputRef.current && inputRef.current.focus();
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const sections = [];

    const topicHits = topics.filter(t =>
      (t.title || '').toLowerCase().includes(q) ||
      (t.subtitle || '').toLowerCase().includes(q) ||
      (t.examWeight || '').toLowerCase().includes(q) ||
      (t.sections || []).some(s =>
        (s.heading || '').toLowerCase().includes(q) ||
        (s.body || '').toLowerCase().includes(q)
      ) ||
      (t.keyTerms || []).some(k => (k || '').toLowerCase().includes(q))
    ).slice(0, 5);

    if (topicHits.length) {
      sections.push({
        label: 'Topics',
        module: 'topics',
        items: topicHits.map(t => ({
          id: t.id,
          term: t.title,
          snippet: t.subtitle || '',
          module: 'topics',
        })),
      });
    }

    const termHits = [...glossary, ...models].filter(e =>
      e.term.toLowerCase().includes(q) ||
      (e.definition || '').toLowerCase().includes(q) ||
      (e.summary || '').toLowerCase().includes(q)
    ).slice(0, 5);

    if (termHits.length) {
      sections.push({
        label: 'Glossary & Models',
        module: 'glossary',
        items: termHits.map(e => ({
          id: e.id,
          term: e.term,
          snippet: e.definition || e.summary || '',
          module: 'glossary',
        })),
      });
    }

    const fcHits = flashcards.filter(c =>
      (c.front || '').toLowerCase().includes(q) ||
      (c.back || '').toLowerCase().includes(q)
    ).slice(0, 4);

    if (fcHits.length) {
      sections.push({
        label: 'Flashcards',
        module: 'flashcards',
        items: fcHits.map(c => ({
          id: c.id,
          term: c.front,
          snippet: c.back || '',
          module: 'flashcards',
        })),
      });
    }

    const quizHits = quiz.filter(qz =>
      (qz.prompt || '').toLowerCase().includes(q) ||
      (qz.explanation || '').toLowerCase().includes(q)
    ).slice(0, 4);

    if (quizHits.length) {
      sections.push({
        label: 'Quiz Questions',
        module: 'quiz',
        items: quizHits.map(qz => ({
          id: qz.id,
          term: (qz.type === 'tf' ? 'T/F · ' : 'MC · ') + window.tagLabel(qz.topic),
          snippet: qz.prompt,
          module: 'quiz',
        })),
      });
    }

    const timelineHits = timeline.filter(e =>
      e.title.toLowerCase().includes(q) ||
      (e.summary || '').toLowerCase().includes(q)
    ).slice(0, 4);

    if (timelineHits.length) {
      sections.push({
        label: 'Timeline',
        module: 'timeline',
        items: timelineHits.map(e => ({
          id: e.id,
          term: e.title,
          snippet: window.formatDate(e.date) + (e.summary ? ' — ' + e.summary : ''),
          module: 'timeline',
        })),
      });
    }

    const examHits = exams.filter(e =>
      !e.placeholder &&
      ((e.prompt || '').toLowerCase().includes(q) ||
       (e.modelAnswer || '').toLowerCase().includes(q))
    ).slice(0, 4);

    if (examHits.length) {
      sections.push({
        label: 'Exam Questions',
        module: 'exams',
        items: examHits.map(e => ({
          id: e.id,
          term: 'Q' + e.questionNumber + (e.paperLabel ? ' — ' + e.paperLabel : ''),
          snippet: e.prompt,
          module: 'exams',
        })),
      });
    }

    return sections;
  }, [query, glossary, models, timeline, exams]);

  const flatItems = useMemo(() =>
    results.flatMap(s => s.items),
  [results]);

  useEffect(() => { setHighlighted(0); }, [query]);

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
            placeholder="Search topics, flashcards, exams, quiz, timeline…"
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

        <div className="sp-results" role="listbox">
          {query && results.length === 0 && (
            <div className="sp-empty">No results for "{query}"</div>
          )}
          {!query && (
            <div className="sp-empty">Start typing to search across all content…</div>
          )}
          {results.map(section => (
            <div key={section.label}>
              <div className="sp-section-label">{section.label}</div>
              {section.items.map(item => {
                const isFlatIdx = flatIdx;
                flatIdx++;
                return (
                  <div
                    key={item.id}
                    className={'sp-result' + (highlighted === isFlatIdx ? ' highlighted' : '')}
                    onClick={() => { onNavigate(item.module, item.id); onClose(); }}
                    role="option"
                    aria-selected={highlighted === isFlatIdx}
                    onMouseEnter={() => setHighlighted(isFlatIdx)}
                  >
                    <span className="sp-result-term">{item.term}</span>
                    <span className="sp-result-snippet">{item.snippet}</span>
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
