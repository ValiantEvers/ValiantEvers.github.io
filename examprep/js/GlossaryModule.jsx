// GlossaryModule.jsx
(function() {
const { useState, useMemo, useEffect, useRef } = React;

function GlossaryModule({ data, pendingGlossaryNav }) {
  const { glossary = [], models = [] } = data;
  const [query, setQuery] = useState('');
  const [activeTags, setActiveTags] = useState([]);
  const [selectedId, setSelectedId] = useState(pendingGlossaryNav?.id || null);
  const detailRef = useRef(null);

  // Honour cross-module navigation (mind-map "Read more", search palette result click).
  // pendingGlossaryNav is {id, key}; depending on the object reference re-fires the
  // effect even when the same id is requested twice in a row.
  useEffect(() => {
    if (pendingGlossaryNav?.id) {
      setSelectedId(pendingGlossaryNav.id);
      setActiveTags([]);
      setQuery('');
      if (detailRef.current) detailRef.current.scrollTop = 0;
    }
  }, [pendingGlossaryNav]);

  const allEntries = useMemo(() => {
    const g = glossary.map(e => ({ ...e, _type: 'term' }));
    const m = models.map(e => ({ ...e, _type: 'model' }));
    return [...g, ...m].sort((a, b) => a.term.localeCompare(b.term));
  }, [glossary, models]);

  const filtered = useMemo(() => {
    return allEntries.filter(e => {
      const q = query.toLowerCase();
      const matchText = !q ||
        e.term.toLowerCase().includes(q) ||
        (e.definition || '').toLowerCase().includes(q) ||
        (e.summary || '').toLowerCase().includes(q);
      const matchTags = activeTags.length === 0 ||
        activeTags.every(t => (e.tags || []).includes(t));
      return matchText && matchTags;
    });
  }, [allEntries, query, activeTags]);

  const selected = useMemo(() =>
    allEntries.find(e => e.id === selectedId) || null,
  [allEntries, selectedId]);

  function toggleTag(tag) {
    setActiveTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }

  function selectEntry(id) {
    setSelectedId(id);
    if (detailRef.current) detailRef.current.scrollTop = 0;
  }

  const allTags = Object.keys(window.TAG_TAXONOMY);

  return (
    <div>
      <div className="content-wrap" style={{ paddingBottom: 0 }}>
        <div className="filter-bar">
          <button
            className={'tag' + (activeTags.length === 0 ? ' active' : '')}
            onClick={() => setActiveTags([])}
            aria-pressed={activeTags.length === 0}
          >All</button>
          {allTags.map(tag => (
            <button
              key={tag}
              className={'tag' + (activeTags.includes(tag) ? ' active' : '')}
              onClick={() => toggleTag(tag)}
              aria-pressed={activeTags.includes(tag)}
            >{window.tagLabel(tag)}</button>
          ))}
        </div>

        <div className="search-bar">
          <span className="search-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
            </svg>
          </span>
          <input
            type="search"
            placeholder="Search terms and models…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search glossary"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ink-light)', fontSize:18, lineHeight:1 }}
              aria-label="Clear search"
            >×</button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 24px' }}>
        <div className="glossary-layout">
          {/* List pane */}
          <nav className="glossary-list" aria-label="Glossary entries">
            {filtered.length === 0 && (
              <div className="empty-state">No entries match.</div>
            )}
            {filtered.map(entry => (
              <button
                key={entry.id}
                className={'glossary-list-item' + (selectedId === entry.id ? ' selected' : '')}
                onClick={() => selectEntry(entry.id)}
                aria-selected={selectedId === entry.id}
              >
                <span className="item-term">{entry.term}</span>
                <span className="item-type">
                  {entry._type === 'model' ? '– Model Walkthrough' : '– Term'}
                </span>
              </button>
            ))}
          </nav>

          {/* Detail pane */}
          <div className="glossary-detail" ref={detailRef} aria-live="polite">
            {!selected ? (
              <div className="glossary-detail-empty">
                Select an entry to read its definition or walkthrough.
              </div>
            ) : (
              <EntryDetail entry={selected} allEntries={allEntries} onNavigate={selectEntry} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RecallQuestions({ questions }) {
  const [revealed, setRevealed] = useState(new Set());
  if (!questions || questions.length === 0) return null;

  function toggle(i) {
    setRevealed(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  return (
    <div className="recall-section">
      <hr className="detail-rule" />
      <div className="label recall-label">Active Recall</div>
      {questions.map((q, i) => (
        <div key={i} className="recall-item">
          <p className="recall-question-text">{q.question}</p>
          <button
            className={'recall-reveal-btn' + (revealed.has(i) ? ' revealed' : '')}
            onClick={() => toggle(i)}
            aria-expanded={revealed.has(i)}
          >
            {revealed.has(i) ? 'Hide Answer' : 'Show Answer'}
          </button>
          {revealed.has(i) && (
            <div className="recall-answer">{q.answer}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function EntryDetail({ entry, allEntries, onNavigate }) {
  const isModel = entry._type === 'model';

  const relatedEntries = useMemo(() =>
    (entry.related || [])
      .map(id => allEntries.find(e => e.id === id))
      .filter(Boolean),
  [entry, allEntries]);

  return (
    <div>
      <div className="detail-type-label">
        {isModel ? 'Model Walkthrough' : 'Glossary Term'}
      </div>
      <h2 className="detail-term">{entry.term}</h2>

      {(entry.tags || []).length > 0 && (
        <div className="tags" style={{ marginBottom: 20 }}>
          {entry.tags.map(tag => (
            <span key={tag} className="tag accent-tag">{window.tagLabel(tag)}</span>
          ))}
        </div>
      )}

      {entry.definition && (
        <p className="detail-definition">{entry.definition}</p>
      )}

      {isModel && entry.summary && (
        <blockquote className="detail-summary">{entry.summary}</blockquote>
      )}

      {isModel && entry.walkthrough && (
        <>
          <hr className="detail-rule" />
          <div
            className="detail-walkthrough"
            dangerouslySetInnerHTML={{ __html: window.renderWalkthrough(entry.walkthrough) }}
          />
        </>
      )}

      {entry.flashcardBack && !isModel && (
        <div className="flashcard-back-box">
          <div className="flashcard-back-label">Flashcard recall</div>
          {entry.flashcardBack}
        </div>
      )}

      <RecallQuestions questions={entry.recall_questions} />

      {relatedEntries.length > 0 && (
        <>
          <hr className="detail-rule" />
          <div className="label" style={{ marginBottom: 8 }}>Related</div>
          <div className="related-list">
            {relatedEntries.map(e => (
              <button key={e.id} className="related-chip" onClick={() => onNavigate(e.id)}>
                {e.term}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

window.GlossaryModule = GlossaryModule;
})();
