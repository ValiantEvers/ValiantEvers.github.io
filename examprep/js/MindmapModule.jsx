// MindmapModule.jsx – interactive concept graph powered by Cytoscape.js
(function() {
const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ── Colour helpers ────────────────────────────────────────────

function hexToRgb(hex) {
  const m = hex.replace('#','').match(/.{2}/g).map(h => parseInt(h, 16));
  return { r: m[0], g: m[1], b: m[2] };
}
function rgbToHex(r, g, b) {
  const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2,'0');
  return '#' + c(r) + c(g) + c(b);
}
function lighten(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r + (255-r)*amount, g + (255-g)*amount, b + (255-b)*amount);
}
function darken(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1-amount), g * (1-amount), b * (1-amount));
}

// Frequency tier → marker visual strength
function freqTier(f) {
  if (f >= 4) return 4;
  if (f === 3) return 3;
  if (f === 2) return 2;
  return 0;
}

// ── Build Cytoscape elements + styles from mindmap.json ──────

function buildElements(mm) {
  const elements = [];
  mm.nodes.forEach(n => {
    const cluster = n.cluster ? mm.clusters[n.cluster] : null;
    const baseColor = cluster ? cluster.color : '#a63a2a';
    let fill, border, textColor, size;

    if (n.kind === 'root') {
      fill = '#FDFAF4';
      border = '#a63a2a';
      textColor = '#14100A';
      size = 110;
    } else if (n.kind === 'cluster') {
      fill = baseColor;
      border = darken(baseColor, 0.25);
      textColor = '#FDFAF4';
      size = 64;
    } else {
      fill = lighten(baseColor, 0.55);
      border = baseColor;
      textColor = darken(baseColor, 0.45);
      const t = freqTier(n.exam_frequency);
      size = 38 + t * 2;
    }

    elements.push({
      group: 'nodes',
      data: {
        id: n.id,
        label: n.label,
        kind: n.kind,
        cluster: n.cluster || '',
        clusterLabel: cluster ? cluster.label : '',
        glossary_ref: n.glossary_ref || '',
        topic_ref: n.topic_ref || '',
        exam_frequency: n.exam_frequency || 0,
        baseColor,
        fill, border, textColor,
        size,
      },
      classes: [
        n.kind,
        'freq-' + freqTier(n.exam_frequency),
      ].join(' '),
    });
  });

  mm.edges.forEach((e, i) => {
    elements.push({
      group: 'edges',
      data: {
        id: 'e' + i,
        source: e.source,
        target: e.target,
        kind: e.kind,
        label: e.label || '',
      },
      classes: 'kind-' + e.kind,
    });
  });

  return elements;
}

function buildStyles() {
  return [
    // ── Base nodes ──────────────────────────────────────────
    {
      selector: 'node',
      style: {
        'background-color': 'data(fill)',
        'border-color': 'data(border)',
        'border-width': 2,
        'label': 'data(label)',
        'color': 'data(textColor)',
        'font-family': 'Barlow, sans-serif',
        'font-size': 11,
        'font-weight': 600,
        'text-valign': 'center',
        'text-halign': 'center',
        'text-wrap': 'wrap',
        'text-max-width': 80,
        'width': 'data(size)',
        'height': 'data(size)',
        'transition-property': 'opacity, border-width, border-color, background-color, width, height',
        'transition-duration': 220,
        'overlay-opacity': 0,
      },
    },
    {
      selector: 'node.root',
      style: {
        'font-family': '"Playfair Display", Georgia, serif',
        'font-size': 16,
        'font-weight': 900,
        'font-style': 'italic',
        'border-width': 3,
        'text-max-width': 110,
        'shadow-blur': 28,
        'shadow-color': '#a63a2a',
        'shadow-opacity': 0.18,
        'shadow-offset-x': 0,
        'shadow-offset-y': 0,
      },
    },
    {
      selector: 'node.cluster',
      style: {
        'font-family': '"Playfair Display", Georgia, serif',
        'font-size': 13,
        'font-weight': 700,
        'border-width': 2,
        'text-max-width': 100,
      },
    },
    {
      selector: 'node.leaf',
      style: {
        'font-size': 10,
        'font-weight': 600,
      },
    },

    // ── Exam-frequency markers (gold ring) ──────────────────
    {
      selector: 'node.freq-2',
      style: {
        'border-width': 3,
        'border-color': '#c89b3d',
      },
    },
    {
      selector: 'node.freq-3',
      style: {
        'border-width': 4,
        'border-color': '#c89b3d',
        'shadow-blur': 12,
        'shadow-color': '#c89b3d',
        'shadow-opacity': 0.35,
      },
    },
    {
      selector: 'node.freq-4',
      style: {
        'border-width': 5,
        'border-color': '#d4a84a',
        'shadow-blur': 18,
        'shadow-color': '#c89b3d',
        'shadow-opacity': 0.55,
      },
    },

    // ── Edges ───────────────────────────────────────────────
    {
      selector: 'edge',
      style: {
        'curve-style': 'bezier',
        'line-color': '#8A7A60',
        'opacity': 0.32,
        'width': 1.3,
        'target-arrow-shape': 'none',
        'transition-property': 'opacity, width, line-color',
        'transition-duration': 220,
      },
    },
    {
      selector: 'edge.kind-trunk',
      style: {
        'line-color': '#4A3F30',
        'opacity': 0.45,
        'width': 1.8,
      },
    },
    {
      selector: 'edge.kind-cross',
      style: {
        'line-style': 'dashed',
        'line-color': '#a63a2a',
        'opacity': 0.42,
        'width': 1.4,
      },
    },

    // ── Selected node ───────────────────────────────────────
    {
      selector: 'node.selected',
      style: {
        'border-color': '#14100A',
        'border-width': 4,
      },
    },

    // ── Focus mode ──────────────────────────────────────────
    {
      selector: '.dimmed',
      style: {
        'opacity': 0.18,
      },
    },
    {
      selector: 'edge.focused-edge',
      style: {
        'opacity': 0.85,
        'width': 2.6,
        'line-color': '#14100A',
      },
    },
    {
      selector: 'edge.kind-cross.focused-edge',
      style: {
        'line-color': '#a63a2a',
        'opacity': 0.9,
      },
    },

    // ── Search highlight ────────────────────────────────────
    {
      selector: 'node.search-match',
      style: {
        'border-color': '#14100A',
        'border-width': 4,
      },
    },
  ];
}

// ── Definition lookup ─────────────────────────────────────────

function lookupDefinition(node, data) {
  const ref = node.data.glossary_ref;
  const topicRef = node.data.topic_ref;
  if (ref) {
    const g = (data.glossary || []).find(e => e.id === ref);
    if (g) return { source: 'glossary', id: g.id, term: g.term, definition: g.definition };
    const m = (data.models || []).find(e => e.id === ref);
    if (m) return { source: 'glossary', id: m.id, term: m.term, definition: m.definition || m.summary || '' };
  }
  if (topicRef) {
    const t = (data.topics || []).find(e => e.id === topicRef);
    if (t) {
      const sub = (t.subtitle || '').split('–').slice(1).join('–').trim() || t.subtitle || '';
      return { source: 'topic', id: t.id, term: t.title, definition: sub };
    }
  }
  return null;
}

// ── Popup card ────────────────────────────────────────────────

function PopupCard({ node, position, data, clusters, onClose, onNavigate }) {
  if (!node || !position) return null;
  const def = lookupDefinition(node, data);
  const cluster = node.data.cluster ? clusters[node.data.cluster] : null;
  const freq = node.data.exam_frequency || 0;

  function handleReadMore() {
    if (!def) return;
    if (def.source === 'glossary') onNavigate('glossary', def.id);
    else onNavigate('topics', def.id);
  }

  return (
    <div
      className="mindmap-popup"
      style={{
        left: position.x,
        top: position.y,
        '--cluster-accent': cluster ? cluster.color : 'var(--accent)',
      }}
      onClick={e => e.stopPropagation()}
      role="dialog"
      aria-label={'Concept: ' + node.data.label}
    >
      <button
        className="mindmap-popup-close"
        onClick={onClose}
        aria-label="Close"
      >×</button>

      {cluster && (
        <div className="mindmap-popup-cluster">
          <span className="mindmap-popup-dot" />
          {cluster.label}
        </div>
      )}

      <h3 className="mindmap-popup-term">{node.data.label}</h3>

      {def && def.definition && (
        <p className="mindmap-popup-def">{def.definition}</p>
      )}
      {!def && node.data.kind === 'root' && (
        <p className="mindmap-popup-def">
          The full GRA6546 syllabus organised as a connected concept graph. Twelve topic clusters branch out from this centre – each cluster expands into the specific concepts, models, and regulatory frameworks you'll be tested on. Cross-cluster lines mark concepts that bridge two areas of the course.
        </p>
      )}
      {!def && node.data.kind !== 'root' && (
        <p className="mindmap-popup-def mindmap-popup-def-empty">
          A {node.data.kind === 'cluster' ? 'core topic cluster' : 'concept'} in the GRA6546 syllabus.
        </p>
      )}

      {freq >= 2 && (
        <div className="mindmap-popup-freq">
          <span className="mindmap-popup-freq-dot" />
          {freq >= 4
            ? 'Heavily tested – appears across most past exam papers'
            : freq === 3
              ? 'Frequently tested in past exams'
              : 'Appeared in multiple past exam papers'}
        </div>
      )}

      {def && (
        <button className="mindmap-popup-link" onClick={handleReadMore}>
          {def.source === 'glossary' ? 'Read full glossary entry' : 'Read full topic summary'}
          <span aria-hidden="true"> →</span>
        </button>
      )}
    </div>
  );
}

// ── Main module ───────────────────────────────────────────────

function MindmapModule({ data, onNavigate, pendingMindmapNav }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [mindmap, setMindmap] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [cyReady, setCyReady] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [popupPos, setPopupPos] = useState(null);
  const [search, setSearch] = useState('');

  // Load mindmap.json
  useEffect(() => {
    fetch('data/mindmap.json')
      .then(r => { if (!r.ok) throw new Error('mindmap.json not found'); return r.json(); })
      .then(setMindmap)
      .catch(err => setLoadError(err.message));
  }, []);

  // Wait for Cytoscape global to be available (loaded via CDN)
  useEffect(() => {
    if (window.cytoscape) { setCyReady(true); return; }
    let cancelled = false;
    const t = setInterval(() => {
      if (window.cytoscape) { setCyReady(true); clearInterval(t); }
    }, 80);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Build the graph
  useEffect(() => {
    if (!mindmap || !containerRef.current || !cyReady) return;
    const cy = window.cytoscape({
      container: containerRef.current,
      elements: buildElements(mindmap),
      style: buildStyles(),
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 900,
        nodeRepulsion: () => 14000,
        idealEdgeLength: () => 110,
        edgeElasticity: () => 110,
        gravity: 60,
        nestingFactor: 1.4,
        numIter: 1500,
        randomize: false,
        fit: true,
        padding: 60,
      },
      wheelSensitivity: 0.22,
      minZoom: 0.35,
      maxZoom: 2.4,
      boxSelectionEnabled: false,
      autoungrabify: false,
    });
    cyRef.current = cy;

    // Hide edges initially; cose will animate node positions into place.
    // Once layout settles, fade edges in with a small stagger so the network
    // "draws itself" rather than appearing as a static dump.
    cy.edges().style({ opacity: 0 });
    cy.one('layoutstop', () => {
      cy.edges().forEach((e, i) => {
        setTimeout(() => {
          const targetOpacity = e.hasClass('kind-trunk') ? 0.45 : (e.hasClass('kind-cross') ? 0.42 : 0.32);
          e.animate({ style: { opacity: targetOpacity } }, { duration: 420, easing: 'ease-out-cubic', queue: false });
        }, i * 7);
      });
    });

    // Node tap → focus + popup
    cy.on('tap', 'node', e => {
      const node = e.target;
      const id = node.id();
      setSelectedNodeId(prev => prev === id ? null : id);
    });

    // Background tap → exit
    cy.on('tap', e => {
      if (e.target === cy) {
        setSelectedNodeId(null);
      }
    });

    // Re-compute popup position on viewport changes (pan/zoom/resize)
    const recomputePopup = () => {
      const sel = cy.$('.selected');
      if (!sel.length) return;
      const pos = sel.renderedPosition();
      const sz = sel.renderedHeight();
      const containerW = containerRef.current ? containerRef.current.clientWidth : 800;
      const POPUP_W = 360;
      const anchorRight = pos.x + sz/2 + POPUP_W + 14 > containerW;
      setPopupPos({
        x: anchorRight ? pos.x - sz/2 - 14 - POPUP_W : pos.x + sz/2 + 14,
        y: pos.y - sz/2,
        anchorRight,
      });
    };
    cy.on('pan zoom resize', recomputePopup);
    cy.on('layoutstop', recomputePopup);

    return () => { cy.destroy(); cyRef.current = null; };
  }, [mindmap, cyReady]);

  // Deep-link from search palette: focus a specific node by id and pan/zoom
  // the viewport onto it. Re-runs when pendingMindmapNav.key bumps, even for
  // the same id, and waits for cy/mindmap to be ready.
  useEffect(() => {
    const id = pendingMindmapNav?.id;
    if (!id) return;
    const cy = cyRef.current;
    if (!cy) return;
    const node = cy.$id(id);
    if (!node || !node.length) return;
    setSelectedNodeId(id);
    setSearch('');
    cy.animate(
      { center: { eles: node }, zoom: Math.max(cy.zoom(), 1.1) },
      { duration: 500, easing: 'ease-out-cubic' }
    );
  }, [pendingMindmapNav, cyReady, mindmap]);

  // Apply focus mode + popup position when selection changes
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().removeClass('selected dimmed focused-edge');

    if (selectedNodeId) {
      const node = cy.$id(selectedNodeId);
      if (!node.length) { setPopupPos(null); return; }
      const neighborhood = node.closedNeighborhood();
      cy.elements().difference(neighborhood).addClass('dimmed');
      node.addClass('selected');
      node.connectedEdges().intersection(neighborhood.edgesWith(neighborhood)).addClass('focused-edge');
      // popup position
      const pos = node.renderedPosition();
      const sz = node.renderedHeight();
      const containerW = containerRef.current ? containerRef.current.clientWidth : 800;
      const POPUP_W = 360;
      const anchorRight = pos.x + sz/2 + POPUP_W + 14 > containerW;
      setPopupPos({
        x: anchorRight ? pos.x - sz/2 - 14 - POPUP_W : pos.x + sz/2 + 14,
        y: pos.y - sz/2,
        anchorRight,
      });
    } else {
      setPopupPos(null);
    }
  }, [selectedNodeId]);

  // Apply search dimming
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const q = search.trim().toLowerCase();
    cy.nodes().removeClass('search-match search-dim');
    if (!q) {
      // Only restore non-focus-mode dimming
      if (!selectedNodeId) cy.elements().removeClass('dimmed');
      return;
    }
    if (!selectedNodeId) cy.elements().removeClass('dimmed');
    const matches = cy.nodes().filter(n => n.data('label').toLowerCase().includes(q));
    matches.addClass('search-match');
    cy.nodes().difference(matches).addClass('dimmed');
    cy.edges().addClass('dimmed');
  }, [search, selectedNodeId]);

  const selectedNode = useMemo(() => {
    if (!mindmap || !selectedNodeId) return null;
    const raw = mindmap.nodes.find(n => n.id === selectedNodeId);
    if (!raw) return null;
    const cluster = raw.cluster ? mindmap.clusters[raw.cluster] : null;
    return {
      id: raw.id,
      data: {
        label: raw.label,
        kind: raw.kind,
        cluster: raw.cluster || '',
        clusterLabel: cluster ? cluster.label : '',
        glossary_ref: raw.glossary_ref || '',
        topic_ref: raw.topic_ref || '',
        exam_frequency: raw.exam_frequency || 0,
      },
    };
  }, [mindmap, selectedNodeId]);

  function handleResetView() {
    const cy = cyRef.current;
    if (cy) cy.animate({ fit: { padding: 60 } }, { duration: 450, easing: 'ease-out-cubic' });
  }
  function handleZoomIn() {
    const cy = cyRef.current;
    if (cy) cy.zoom({ level: cy.zoom() * 1.25, renderedPosition: { x: containerRef.current.clientWidth/2, y: containerRef.current.clientHeight/2 } });
  }
  function handleZoomOut() {
    const cy = cyRef.current;
    if (cy) cy.zoom({ level: cy.zoom() * 0.8, renderedPosition: { x: containerRef.current.clientWidth/2, y: containerRef.current.clientHeight/2 } });
  }

  return (
    <div className="mindmap-wrap">
      <div className="mindmap-toolbar">
        <div className="mindmap-search">
          <span className="mindmap-search-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
            </svg>
          </span>
          <input
            type="search"
            placeholder="Search nodes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search mind-map nodes"
          />
          {search && (
            <button className="mindmap-search-clear" onClick={() => setSearch('')} aria-label="Clear search">×</button>
          )}
        </div>

        <div className="mindmap-zoom">
          <button onClick={handleZoomOut} aria-label="Zoom out">−</button>
          <button onClick={handleResetView} aria-label="Fit to view">⌂</button>
          <button onClick={handleZoomIn} aria-label="Zoom in">+</button>
        </div>

        <div className="mindmap-legend">
          <span className="mindmap-legend-marker" aria-hidden="true"></span>
          <span>Frequently tested in past exams</span>
        </div>
      </div>

      {loadError && (
        <div className="loading" style={{ color: 'var(--accent)', flexDirection: 'column', gap: 8 }}>
          <strong>Could not load mind-map data.</strong>
          <code style={{ fontSize: 11, color: 'var(--ink-light)' }}>{loadError}</code>
        </div>
      )}

      {!loadError && (
        <div className="mindmap-stage">
          <div ref={containerRef} className="mindmap-canvas" />
          {selectedNode && popupPos && mindmap && (
            <PopupCard
              node={selectedNode}
              position={popupPos}
              data={data}
              clusters={mindmap.clusters}
              onClose={() => setSelectedNodeId(null)}
              onNavigate={onNavigate}
            />
          )}
          {!cyReady && (
            <div className="mindmap-loading">Loading graph engine…</div>
          )}
        </div>
      )}

      <div className="mindmap-hint">
        Click any node to focus it · Drag to pan · Scroll to zoom · Click background to reset
      </div>
    </div>
  );
}

window.MindmapModule = MindmapModule;
})();
