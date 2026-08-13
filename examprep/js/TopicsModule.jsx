// TopicsModule.jsx – 8 topic-summary pages for last-minute exam revision
(function() {
const { useState, useEffect, useMemo } = React;

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
    <div className="recall-section" style={{ maxWidth: 760 }}>
      <hr className="detail-rule" style={{ marginTop: 0 }} />
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

function TopicsModule({ data, navigateToExam, pendingTopicNav }) {
  const topics = data.topics || [];
  const exams = data.exams || [];
  const pendingTopicId = pendingTopicNav?.id;

  const [selectedId, setSelectedId] = useState(() => {
    if (pendingTopicId && topics.find(t => t.id === pendingTopicId)) return pendingTopicId;
    const saved = window.lsGet('gra6546_topic', null);
    return saved && topics.find(t => t.id === saved) ? saved : (topics[0] && topics[0].id) || null;
  });

  useEffect(() => {
    if (selectedId) window.lsSet('gra6546_topic', selectedId);
  }, [selectedId]);

  // Honour cross-module navigation (mind-map "Read more", search palette result).
  // pendingTopicNav is {id, key}; depending on the object reference re-fires the
  // effect even when the same id is requested twice in a row.
  useEffect(() => {
    const id = pendingTopicNav?.id;
    if (id && topics.find(t => t.id === id)) {
      setSelectedId(id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [pendingTopicNav]);

  const selected = topics.find(t => t.id === selectedId);

  // Map of exam-question id → question (for cross-links)
  const examById = useMemo(() => {
    const m = {};
    exams.forEach(q => { m[q.id] = q; });
    return m;
  }, [exams]);

  return (
    <div className="topics-layout">
      <aside className="topics-sidebar" aria-label="Topic list">
        {topics.map(t => (
          <button
            key={t.id}
            className={'topics-list-item' + (selectedId === t.id ? ' selected' : '')}
            onClick={() => setSelectedId(t.id)}
            aria-current={selectedId === t.id ? 'page' : undefined}
          >
            <span className="item-term">{t.title}</span>
            <span className="item-type">{(t.subtitle || '').split('–')[0].trim()}</span>
          </button>
        ))}
      </aside>

      <article className="topics-detail" aria-label="Topic detail">
        {selected ? (
          <>
            <div className="detail-type-label">Topic – {selected.subtitle && selected.subtitle.split('–')[0].trim()}</div>
            <h1 className="detail-term">{selected.title}</h1>
            <p className="detail-summary">{selected.subtitle && selected.subtitle.split('–').slice(1).join('–').trim()}</p>

            {selected.examWeight && (
              <div className="topic-exam-weight">
                <span className="label">Exam weight</span>
                <p>{selected.examWeight}</p>
              </div>
            )}

            <div className="topic-sections">
              {(selected.sections || []).map((s, i) => (
                <section key={i} className="topic-section">
                  <h3 className="topic-section-h">{s.heading}</h3>
                  <div
                    className="topic-section-body"
                    dangerouslySetInnerHTML={{ __html: window.renderMarkdown ? window.renderMarkdown(s.body) : window.renderWalkthrough(s.body) }}
                  />
                </section>
              ))}
            </div>

            <RecallQuestions questions={selected.recall_questions} />

            {selected.keyTerms && selected.keyTerms.length > 0 && (
              <div className="topic-keyterms">
                <span className="label">Key terms to know</span>
                <div className="related-list" style={{ marginTop: 8 }}>
                  {selected.keyTerms.map(t => (
                    <span key={t} className="related-chip" style={{ cursor: 'default' }}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            {selected.readings && selected.readings.length > 0 && (
              <div className="topic-readings">
                <span className="label">Reading list</span>
                <ul className="topic-readings-list">
                  {selected.readings.map((r, i) => (
                    <li key={i} className={r.supplementary ? 'supp' : ''}>
                      <span className="reading-author">{r.author}</span>
                      {r.year && <span className="reading-year"> ({r.year})</span>}
                      {r.title && <span className="reading-title"> – {r.title}</span>}
                      {r.supplementary && <span className="reading-supp"> *supplementary</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selected.examQuestions && selected.examQuestions.length > 0 && (
              <div className="topic-examquestions">
                <span className="label">Past exam questions on this topic</span>
                <div className="topic-examquestions-list">
                  {selected.examQuestions.map(qid => {
                    const q = examById[qid];
                    if (!q) return null;
                    return (
                      <button
                        key={qid}
                        className="topic-examquestion-chip"
                        onClick={() => navigateToExam && navigateToExam(qid)}
                        title={q.prompt}
                      >
                        <strong>{q.paperLabel.replace(' – ', ' ').replace(/\(.*?\)/, '').trim()}</strong>
                        <span style={{ marginLeft: 6 }}>Q{q.questionNumber}</span>
                        <span style={{ marginLeft: 6, color: 'var(--ink-light)' }}>· {q.points} pts</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="glossary-detail-empty">Select a topic to begin.</div>
        )}
      </article>
    </div>
  );
}

window.TopicsModule = TopicsModule;
})();
