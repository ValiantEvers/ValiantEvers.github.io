// TimelineModule.jsx
(function() {
const { useState, useMemo } = React;

const CRISIS_ERAS = [
  { id: 'sl',     label: 'S&L Crisis',            yearRange: [1980, 1989], accentYear: '1980s' },
  { id: 'nordic', label: 'Nordic Banking Crises',  yearRange: [1988, 1996], accentYear: '1988–96' },
  { id: 'gfc',    label: 'Global Financial Crisis',yearRange: [2007, 2009], accentYear: '2007–09' },
  { id: 'euro',   label: 'Eurozone Debt Crisis',   yearRange: [2010, 2013], accentYear: '2010–13' },
];

const GFC_HIGHLIGHTS = ['bnp-paribas-aug07', 'bear-stearns', 'lehman-bankruptcy', 'aig-bailout', 'fed-swap-lines'];

function getEraForEvent(event) {
  if (!event.date) return null;
  const year = parseInt(event.date.slice(0, 4));
  for (const era of CRISIS_ERAS) {
    if (year >= era.yearRange[0] && year <= era.yearRange[1]) return era.id;
  }
  return null;
}

function TimelineModule({ data }) {
  const { timeline = [], glossary = [], models = [] } = data;
  const [activeTag, setActiveTag] = useState(null);

  const allEntries = useMemo(() =>
    [...glossary, ...models],
  [glossary, models]);

  const filtered = useMemo(() => {
    if (!activeTag) return timeline;
    return timeline.filter(e => (e.tags || []).includes(activeTag));
  }, [timeline, activeTag]);

  const byEra = useMemo(() => {
    return CRISIS_ERAS.map(era => ({
      ...era,
      events: filtered
        .filter(e => getEraForEvent(e) === era.id)
        .sort((a, b) => (a.date || '').localeCompare(b.date || '')),
    })).filter(era => era.events.length > 0);
  }, [filtered]);

  function findRelated(ids) {
    return (ids || [])
      .map(id => allEntries.find(e => e.id === id))
      .filter(Boolean);
  }

  const crisisTags = ['bank-crises', 'securitisation', 'derivatives-fx', 'bank-regulation', 'case-studies'];

  return (
    <div className="timeline-wrap">
      {/* Tag filter */}
      <div className="filter-bar" style={{ marginBottom: 32 }}>
        <button
          className={'tag' + (!activeTag ? ' active' : '')}
          onClick={() => setActiveTag(null)}
        >All</button>
        {crisisTags.map(tag => (
          <button
            key={tag}
            className={'tag' + (activeTag === tag ? ' active' : '')}
            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
          >{window.tagLabel(tag)}</button>
        ))}
      </div>

      {byEra.length === 0 && (
        <div className="empty-state">No events match this filter.</div>
      )}

      {byEra.map(era => (
        <div key={era.id} className="timeline-era">
          <div className="timeline-era-header">
            <span className="timeline-era-year">{era.accentYear}</span>
            <span className="timeline-era-name">{era.label}</span>
          </div>

          <div className="timeline-events">
            {era.events.map(event => {
              const related = findRelated(event.related);
              const isHighlight = GFC_HIGHLIGHTS.includes(event.id);
              return (
                <article
                  key={event.id}
                  className={'timeline-event' + (isHighlight ? ' highlight' : '')}
                >
                  <div className="event-date">
                    {event.date ? window.formatDate(event.date) : ''}
                  </div>
                  <h3 className="event-title">{event.title}</h3>
                  <p className="event-summary">{event.summary}</p>

                  {event.tags && event.tags.length > 0 && (
                    <div className="tags" style={{ marginTop: 8 }}>
                      {event.tags.map(tag => (
                        <span key={tag} className="tag accent-tag"
                          style={{ fontSize: 9 }}>{window.tagLabel(tag)}</span>
                      ))}
                    </div>
                  )}

                  {related.length > 0 && (
                    <div className="event-related" style={{ marginTop: 10 }}>
                      <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--ink-light)', marginRight:6 }}>See also:</span>
                      {related.map(r => (
                        <span key={r.id} className="related-chip"
                          style={{ fontSize: 11, padding: '2px 8px' }}>{r.term}</span>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 24, marginTop: 16 }}>
        <p className="label" style={{ marginBottom: 6 }}>Schema note</p>
        <p style={{ fontSize: 12, color: 'var(--ink-light)', maxWidth: 560 }}>
          Add events to <code style={{ fontFamily: 'monospace', background: 'var(--paper-dark)', padding: '1px 4px' }}>data/timeline.json</code> with fields: <code style={{ fontFamily: 'monospace', background: 'var(--paper-dark)', padding: '1px 4px' }}>id, date (YYYY-MM-DD), title, summary, tags[], related[]</code>.
        </p>
      </div>
    </div>
  );
}

window.TimelineModule = TimelineModule;
})();
