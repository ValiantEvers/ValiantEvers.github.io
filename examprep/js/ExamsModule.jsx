// ExamsModule.jsx
(function() {
const { useState, useMemo } = React;

const PAPERS = [
  { id: 'spring-2025-final',   label: 'May 2025 — Final (GRA 65463)',     year: 2025, type: 'final',   date: '2025-05-14' },
  { id: 'spring-2025-midterm', label: 'Feb 2025 — Mid-term (GRA 65462)',  year: 2025, type: 'midterm', date: '2025-02-14' },
  { id: 'spring-2024-final',   label: 'May 2024 — Final (GRA 65463 V3)',  year: 2024, type: 'final',   date: '2024-05-15' },
  { id: 'spring-2024-midterm', label: 'Feb 2024 — Mid-term (GRA 65462)',  year: 2024, type: 'midterm', date: '2024-02-14' },
  { id: 'final-2023',          label: '2023 — Final',                     year: 2023, type: 'final',   date: '2023-05-15' },
  { id: 'final-2022',          label: '2022 — Final',                     year: 2022, type: 'final',   date: '2022-05-15' },
];

const GRADING = [
  { grade: 'A', min: 75 }, { grade: 'B', min: 65 }, { grade: 'C', min: 55 },
  { grade: 'D', min: 45 }, { grade: 'E', min: 35 }, { grade: 'F', min: 0 },
];

function ExamsModule({ data, pendingExamId }) {
  const { exams = [], glossary = [], models = [] } = data;
  const [activeTag, setActiveTag] = useState(null);
  const [groupBy, setGroupBy] = useState('paper'); // 'paper' | 'topic'
  const [expandedIds, setExpandedIds] = useState({});

  const allEntries = useMemo(() => [...glossary, ...models], [glossary, models]);

  function toggleQ(id) {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  }

  // Auto-expand and scroll to a deep-linked question (from Topics module cross-link)
  React.useEffect(() => {
    if (pendingExamId) {
      setExpandedIds(prev => ({ ...prev, [pendingExamId]: true }));
      setTimeout(() => {
        const el = document.querySelector('[data-q-id="' + pendingExamId + '"]');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 250);
    }
  }, [pendingExamId]);

  const filtered = useMemo(() => {
    if (!activeTag) return exams;
    return exams.filter(q => (q.topicTags || []).includes(activeTag));
  }, [exams, activeTag]);

  // Check if all questions are placeholders
  const allPlaceholder = exams.length === 0 ||
    exams.every(q => q.placeholder || q.todo || !q.prompt);

  const topicTags = Object.keys(window.TAG_TAXONOMY);

  function renderByPaper() {
    return PAPERS.map(paper => {
      const qs = filtered.filter(q => q.paperId === paper.id);
      const hasContent = qs.some(q => !q.placeholder && q.prompt);
      const allReconstructed = hasContent && qs.every(q => q.reconstructed);
      // Spring 2024 used a stricter scale; everything else uses May 2025 scale
      const grading = paper.id === 'spring-2024-final'
        ? 'Grading: A≥85 B≥72 C≥60 D≥48 E≥35'
        : 'Grading: A≥75 B≥65 C≥55 D≥45 E≥35';
      return (
        <div key={paper.id} className="exam-paper-group">
          <div className="exam-paper-header">
            <span className="exam-paper-label">{paper.label}</span>
            <span className="exam-paper-meta">
              {paper.type === 'midterm' ? 'Midterm' : 'Final exam'} · 100 points · {grading}
            </span>
          </div>

          {allReconstructed && (
            <div className="exam-reconstructed-banner">
              <strong>Reconstructed paper.</strong> The original question paper for this year was not available — only the grading-guide answer key. The prompts below are inferred from the answer text and may not match the actual exam wording. The model answers, however, are taken verbatim from the answer key. Use the May 2025 paper as the most reliable predictor.
            </div>
          )}

          {!hasContent ? (
            <PlaceholderMsg paperId={paper.id} />
          ) : (
            qs.map(q => (
              <QuestionRow
                key={q.id}
                q={q}
                expanded={!!expandedIds[q.id]}
                onToggle={() => toggleQ(q.id)}
                allEntries={allEntries}
              />
            ))
          )}
        </div>
      );
    });
  }

  function renderByTopic() {
    const byTag = {};
    topicTags.forEach(tag => {
      const qs = filtered.filter(q => (q.topicTags || []).includes(tag) && !q.placeholder && q.prompt);
      if (qs.length > 0) byTag[tag] = qs;
    });
    const untagged = filtered.filter(q => (!q.topicTags || q.topicTags.length === 0) && !q.placeholder && q.prompt);

    if (Object.keys(byTag).length === 0 && untagged.length === 0) {
      return <PlaceholderMsg />;
    }

    return (
      <>
        {Object.entries(byTag).map(([tag, qs]) => (
          <div key={tag} className="exam-paper-group">
            <div className="exam-paper-header">
              <span className="exam-paper-label">{window.tagLabel(tag)}</span>
            </div>
            {qs.map(q => (
              <QuestionRow key={q.id} q={q} expanded={!!expandedIds[q.id]}
                onToggle={() => toggleQ(q.id)} allEntries={allEntries} />
            ))}
          </div>
        ))}
        {untagged.length > 0 && (
          <div className="exam-paper-group">
            <div className="exam-paper-header">
              <span className="exam-paper-label">Untagged</span>
            </div>
            {untagged.map(q => (
              <QuestionRow key={q.id} q={q} expanded={!!expandedIds[q.id]}
                onToggle={() => toggleQ(q.id)} allEntries={allEntries} />
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="exams-wrap">
      {/* Controls */}
      <div style={{ display:'flex', gap:16, alignItems:'center', flexWrap:'wrap', marginBottom:24 }}>
        <div style={{ display:'flex', gap:0, border:'1px solid var(--rule)' }}>
          {[['paper','By Paper'],['topic','By Topic']].map(([val, label]) => (
            <button key={val}
              onClick={() => setGroupBy(val)}
              style={{
                padding:'6px 14px', fontSize:11, fontWeight:700, letterSpacing:'0.06em',
                textTransform:'uppercase', border:'none', cursor:'pointer',
                background: groupBy === val ? 'var(--ink)' : 'transparent',
                color: groupBy === val ? 'var(--paper)' : 'var(--ink-light)',
                fontFamily: 'var(--font-body)',
              }}
            >{label}</button>
          ))}
        </div>

        {groupBy === 'topic' && (
          <div className="filter-bar" style={{ padding:0, border:'none', marginBottom:0, flex:1 }}>
            <button className={'tag' + (!activeTag ? ' active' : '')}
              onClick={() => setActiveTag(null)}>All</button>
            {topicTags.map(tag => (
              <button key={tag}
                className={'tag' + (activeTag === tag ? ' active' : '')}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}>
                {window.tagLabel(tag)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grading reference */}
      <div style={{ display:'flex', gap:6, marginBottom:32, flexWrap:'wrap' }}>
        {GRADING.map(g => (
          <div key={g.grade} style={{
            padding:'4px 10px', border:'1px solid var(--rule)',
            fontSize:11, fontWeight:700, color:'var(--ink-light)',
            fontFamily:'var(--font-body)',
          }}>
            <span style={{ fontFamily:'var(--font-display)', fontWeight:900, color:'var(--ink)', marginRight:4 }}>{g.grade}</span>
            ≥{g.min}pts
          </div>
        ))}
      </div>

      {groupBy === 'paper' ? renderByPaper() : renderByTopic()}

      {/* Schema note */}
      <div style={{ borderTop:'1px solid var(--rule)', paddingTop:24, marginTop:40 }}>
        <p className="label" style={{ marginBottom:6 }}>Adding exam questions</p>
        <p style={{ fontSize:12, color:'var(--ink-light)', maxWidth:640, lineHeight:1.7 }}>
          Add entries to <code style={{ fontFamily:'monospace', background:'var(--paper-dark)', padding:'1px 4px' }}>data/exams.json</code> with fields:{' '}
          <code style={{ fontFamily:'monospace', background:'var(--paper-dark)', padding:'1px 4px' }}>
            id, paperId, paperYear, paperType, paperLabel, paperDate, questionNumber, points, topicTags[], prompt, modelAnswer, relatedGlossary[]
          </code>.
          Set <code style={{ fontFamily:'monospace', background:'var(--paper-dark)', padding:'1px 4px' }}>paperId</code> to one of:{' '}
          {PAPERS.map(p => <code key={p.id} style={{ fontFamily:'monospace', background:'var(--paper-dark)', padding:'1px 4px', marginRight:4 }}>{p.id}</code>)}.
        </p>
      </div>
    </div>
  );
}

function QuestionRow({ q, expanded, onToggle, allEntries }) {
  const related = useMemo(() =>
    (q.relatedGlossary || []).map(id => allEntries.find(e => e.id === id)).filter(Boolean),
  [q, allEntries]);

  return (
    <div className={'exam-question' + (q.reconstructed ? ' reconstructed' : '')} data-q-id={q.id}>
      <div
        className="exam-q-header"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onToggle()}
      >
        <span className="exam-q-num">{q.questionNumber}</span>
        <span className="exam-q-prompt">{q.prompt}</span>
        <span className="exam-q-points">{q.points} pts</span>
        {q.reconstructed && (
          <span className="exam-q-reconstructed-badge" title="Prompt reconstructed from answer key — may not match the original wording">recon</span>
        )}
        {q.topicTags && q.topicTags.length > 0 && (
          <div style={{ display:'flex', gap:4, flexShrink:0 }}>
            {q.topicTags.slice(0,2).map(t => (
              <span key={t} className="tag" style={{ fontSize:9 }}>{window.tagLabel(t)}</span>
            ))}
          </div>
        )}
        <span className={'exam-q-chevron' + (expanded ? ' open' : '')} aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
          </svg>
        </span>
      </div>

      <div className={'exam-q-body ' + (expanded ? 'open' : 'closed')} aria-hidden={!expanded}>
        <div className="exam-q-answer">
          {q.modelAnswer ? (
            <div
              className="topic-section-body"
              dangerouslySetInnerHTML={{ __html: window.renderMarkdown ? window.renderMarkdown(q.modelAnswer) : window.renderWalkthrough(q.modelAnswer) }}
            />
          ) : (
            <p style={{ fontStyle:'italic', color:'var(--ink-light)' }}>Model answer not yet added.</p>
          )}
          {related.length > 0 && (
            <div style={{ marginTop:16 }}>
              <span className="label" style={{ marginRight:8 }}>Concepts referenced:</span>
              <div className="related-list" style={{ marginTop:6 }}>
                {related.map(e => (
                  <span key={e.id} className="related-chip">{e.term}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlaceholderMsg({ paperId }) {
  return (
    <div className="exam-placeholder-msg">
      <h3>Questions not yet added</h3>
      <p>
        Add questions for this paper to <code>data/exams.json</code>.
        {paperId && <> Set <code>paperId: "{paperId}"</code> on each entry.</>}
      </p>
    </div>
  );
}

window.ExamsModule = ExamsModule;
})();
