// App.jsx — main shell
(function() {
const { useState, useEffect } = React;

const MODULES = [
  { id: 'glossary',   label: 'Glossary',  subtitle: 'Terms & Model Walkthroughs' },
  { id: 'timeline',   label: 'Timeline',  subtitle: 'Crises in Chronological Order' },
  { id: 'flashcards', label: 'Flashcards',subtitle: 'Active Recall' },
  { id: 'exams',      label: 'Exams',     subtitle: 'Past Papers & Model Answers' },
];

function Nav({ module, setModule, onSearch }) {
  return (
    <header className="nav" role="banner">
      <div className="nav-inner">
        <div className="nav-masthead">
          <span className="nav-course">GRA6546</span>
          <span className="label" style={{ color: 'var(--ink-light)', fontSize: 9 }}>
            Exam Prep
          </span>
        </div>
        <div className="nav-rule" aria-hidden="true"></div>
        <nav className="nav-links" aria-label="Module navigation">
          {MODULES.map(m => (
            <button
              key={m.id}
              className={'nav-link' + (module === m.id ? ' active' : '')}
              onClick={() => setModule(m.id)}
              aria-current={module === m.id ? 'page' : undefined}
            >{m.label}</button>
          ))}
        </nav>
        <button className="nav-search-btn" onClick={onSearch} aria-label="Open global search (Cmd+K)">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M9 9L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square"/>
          </svg>
          Search
          <span className="nav-search-kbd">⌘K</span>
        </button>
      </div>
    </header>
  );
}

function ModuleHeader({ module }) {
  const m = MODULES.find(x => x.id === module);
  if (!m) return null;
  const nums = { glossary: '01', timeline: '02', flashcards: '03', exams: '04' };
  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--rule)' }}>
      <div className="module-header">
        <div className="module-header-left">
          <div className="label" style={{ marginBottom: 6 }}>
            Section {nums[module]} — Financial Institutions &amp; Crises
          </div>
          <h1 className="module-title">{m.label}</h1>
          <p className="module-subtitle">{m.subtitle}</p>
        </div>
      </div>
      <span className="module-issue-num" aria-hidden="true">{nums[module]}</span>
    </div>
  );
}

function App() {
  const [module, setModule] = useState(() => {
    return window.lsGet('gra6546_module', 'glossary');
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const [data, setData] = useState({
    glossary: [], models: [], timeline: [], flashcards: [], exams: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Persist active module
  useEffect(() => {
    window.lsSet('gra6546_module', module);
  }, [module]);

  // Load all JSON data
  useEffect(() => {
    const files = ['glossary', 'models', 'timeline', 'flashcards', 'exams'];
    Promise.all(
      files.map(f =>
        fetch('data/' + f + '.json')
          .then(r => { if (!r.ok) throw new Error(f + ' not found'); return r.json(); })
      )
    ).then(([glossary, models, timeline, flashcards, exams]) => {
      setData({ glossary, models, timeline, flashcards, exams });
      setLoading(false);
    }).catch(err => {
      setError(err.message);
      setLoading(false);
    });
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function handleNavigate(mod) {
    setModule(mod);
  }

  const GlossaryModule   = window.GlossaryModule;
  const TimelineModule   = window.TimelineModule;
  const FlashcardsModule = window.FlashcardsModule;
  const ExamsModule      = window.ExamsModule;
  const SearchPalette    = window.SearchPalette;

  return (
    <>
      <Nav module={module} setModule={setModule} onSearch={() => setSearchOpen(true)} />

      <ModuleHeader module={module} />

      <main id="main-content" tabIndex={-1}>
        {loading && <div className="loading">Loading content…</div>}
        {error && (
          <div className="loading" style={{ color: 'var(--accent)', flexDirection:'column', gap:8 }}>
            <strong>Could not load data files.</strong>
            <span style={{ fontSize:13, color:'var(--ink-light)' }}>
              Make sure the app is served over HTTP (not opened as a local file).
            </span>
          </div>
        )}
        {!loading && !error && (
          <>
            {module === 'glossary'   && <GlossaryModule   data={data} />}
            {module === 'timeline'   && <TimelineModule   data={data} />}
            {module === 'flashcards' && <FlashcardsModule data={data} />}
            {module === 'exams'      && <ExamsModule      data={data} />}
          </>
        )}
      </main>

      {searchOpen && (
        <SearchPalette
          data={data}
          onClose={() => setSearchOpen(false)}
          onNavigate={handleNavigate}
        />
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
