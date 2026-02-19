/* ═══════════════════════════════════════════════════════════════
   graph.js — WebGL 3D Knowledge Graph
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────
  var Graph; // 3d-force-graph instance
  var expandedCommunities = new Set();
  var graphData = null;

  var currentNodes = [];
  var currentLinks = [];
  var linksByNode = {};

  var highlightNodes = new Set();
  var highlightLinks = new Set();
  var hoverNode = null;

  // ── Koine Graph Palette ────────────────────────────────────
  var KOINE_PALETTE = [
    '#c9a84c', '#daa540', '#a06218', '#c97a20', '#8b6b3a',
    '#7a8a5a', '#5a7a9a', '#8a5a6a', '#6a5a8a', '#5a8a7a',
    '#9a7a5a', '#7a6a4a', '#a08060', '#6a8090', '#8a7060',
  ];
  var SG_COLOR = '#7a8a5a';

  // ── Theme-Aware Graph Variables ─────────────────────────────
  function getGraphVars() {
    var s = getComputedStyle(document.documentElement);
    return {
      textLabel: s.getPropertyValue('--koine-graph-text-label').trim() || '#2a1808',
      textEntity: s.getPropertyValue('--koine-graph-text-entity').trim() || '#4a3a20',
      textOutline: s.getPropertyValue('--koine-graph-text-outline').trim() || 'rgba(250, 246, 238, 0.6)',
      edgeColor: s.getPropertyValue('--koine-graph-edge-color').trim() || '#c4b090',
      edgeArrow: s.getPropertyValue('--koine-graph-edge-arrow').trim() || '#a09070',
      selectText: s.getPropertyValue('--koine-graph-select-text').trim() || '#1a1408',
      selectBorder: s.getPropertyValue('--koine-graph-select-border').trim() || '#7a4a08',
      chunkColor: s.getPropertyValue('--koine-graph-chunk-color').trim() || '#4a7090',
      sgBg: s.getPropertyValue('--koine-graph-sg-bg').trim() || 'rgba(240, 245, 235, 0.5)',
      surfaceBase: s.getPropertyValue('--koine-surface-base').trim() || '#faf6ee',
      glowAccent: s.getPropertyValue('--koine-glow-accent-rgb').trim() || '122, 74, 8',

      // Premium 3D Tokens
      globeColor: s.getPropertyValue('--koine-border-glow-strong').trim() || 'rgba(122, 74, 8, 0.35)',
      globeWireframe: s.getPropertyValue('--koine-border-glow-med').trim() || 'rgba(122, 74, 8, 0.15)',
      nodeHighlight: s.getPropertyValue('--koine-interactive').trim() || '#7a4a08'
    };
  }
  var gv = getGraphVars();

  // ── Data Processing ──────────────────────────────────────────
  function processMetaNodes(elements) {
    return elements.filter(el => !el.data.source).map(el => {
      // 3d-force-graph needs id at the root of the object
      return Object.assign({ id: el.data.id }, el.data);
    });
  }

  function processMetaLinks(elements) {
    return elements.filter(el => el.data.source).map(el => {
      return Object.assign({ source: el.data.source, target: el.data.target }, el.data);
    });
  }

  function remapColors() {
    // 1. Uniform default state for all root communities
    graphData.metaElements.forEach(function (el) {
      if (el.data && el.data.type === 'COMMUNITY' && el.data.community !== undefined) {
        el.data.color = gv.chunkColor; // Calm uniform base color
        el.data._defaultColor = gv.chunkColor;
      }
    });

    // 2. Pre-assign colors based on community, but only for internal entities/SGs
    // Root communities will adopt this color dynamically upon expansion.
    Object.keys(graphData.communityData).forEach(function (commId) {
      var comm = graphData.communityData[commId];
      var paletteColor = KOINE_PALETTE[parseInt(commId) % KOINE_PALETTE.length];

      if (comm.entities) {
        comm.entities.forEach(function (ent) {
          if (ent.data) ent.data.color = paletteColor;
        });
      }
      if (comm.semantic_groups) {
        comm.semantic_groups.forEach(function (sg) {
          if (sg.data) sg.data._sgColor = SG_COLOR;
        });
      }
    });
  }

  function updateNeighbors() {
    linksByNode = {};
    currentLinks.forEach(link => {
      const a = link.source.id || link.source;
      const b = link.target.id || link.target;
      !linksByNode[a] && (linksByNode[a] = []);
      !linksByNode[b] && (linksByNode[b] = []);
      linksByNode[a].push(b);
      linksByNode[b].push(a);
    });
  }

  function refreshGraphData() {
    updateNeighbors();
    Graph.graphData({ nodes: currentNodes, links: currentLinks });
  }

  // DOM refs
  var tooltip, chunkPanel, levelIndicator, nodeInfo, legendEl;

  document.addEventListener('DOMContentLoaded', function () {
    tooltip = document.getElementById('chunk-tooltip');
    chunkPanel = document.getElementById('chunk-panel');
    levelIndicator = document.getElementById('level-indicator');
    nodeInfo = document.getElementById('node-info');
    legendEl = document.getElementById('legend');

    // Fallback if tooltip isn't in DOM
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'chunk-tooltip';
      tooltip.id = 'chunk-tooltip';
      document.body.appendChild(tooltip);
    }

    loadData();
  });

  function loadData() {
    fetch('/static/data/graph_data.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        graphData = data;
        remapColors();

        currentNodes = processMetaNodes(graphData.metaElements);
        currentLinks = processMetaLinks(graphData.metaElements);

        initGraph();
        buildLegend();
      })
      .catch(function (err) {
        document.getElementById('cy').innerHTML =
          '<div style="color:#c9a84c;padding:40px;font-family:var(--koine-font-mono);font-size:14px">' +
          '<b>Data Error:</b><br><pre style="white-space:pre-wrap;margin-top:12px">' +
          err.message + '</pre></div>';
      });
  }

  // ── WebGL Graph Init ─────────────────────────────────────────
  function initGraph() {
    var container = document.getElementById('cy');

    // Ensure 3d-force-graph library is loaded
    if (typeof ForceGraph3D === 'undefined') {
      setTimeout(initGraph, 100);
      return;
    }

    updateNeighbors();

    Graph = ForceGraph3D()(container)
      .width(container.clientWidth)
      .height(container.clientHeight)
      .graphData({ nodes: currentNodes, links: currentLinks })
      .backgroundColor(gv.surfaceBase)
      .showNavInfo(false)
      .nodeResolution(16)
      .nodeRelSize(4)
      .nodeVal(node => {
        // Size mapping
        if (node.isChunk) return 1;
        var size = node.size || 20;
        return Math.max(2, Math.min(size / 8, 15));
      })
      .nodeColor(node => {
        if (highlightNodes.size === 0) return node.color || gv.textEntity;
        if (highlightNodes.has(node.id)) return node.color || gv.textEntity;
        return `rgba(${gv.glowAccent}, 0.15)`; // Dimmed
      })
      .nodeOpacity(0.9)
      .linkOpacity(0.3)
      .linkColor(link => {
        if (highlightNodes.size === 0) return gv.edgeColor;
        if (highlightLinks.has(link.id || `${link.source.id}-${link.target.id}`)) return gv.nodeHighlight; // High contrast interactive
        return `rgba(${gv.glowAccent}, 0.05)`; // Dimmed
      })
      .linkWidth(link => {
        if (highlightLinks.has(link.id || `${link.source.id}-${link.target.id}`)) return 2;
        return link.weight ? 1.5 : 0.5;
      })
      .linkDirectionalParticles(link => highlightLinks.has(link.id || `${link.source.id}-${link.target.id}`) ? 4 : 0)
      .linkDirectionalParticleWidth(2)
      .nodeLabel(node => {
        // Use the built-in HTML tooltip
        return `<div class="chunk-tooltip" style="display:block; position:static; background:var(--koine-graph-sidebar-bg); backdrop-filter:blur(16px); padding:10px; border-radius:6px; font-family:var(--koine-font-body); font-size:12px; border:1px solid var(--koine-border-subtle); box-shadow:0 4px 12px rgba(0,0,0,0.1);">
           <div style="font-family:var(--koine-font-mono); font-size:10px; color:${node.color || gv.textEntity}; margin-bottom:4px; text-transform:uppercase;">${node.type || 'Node'}</div>
           <strong style="color:var(--koine-text-primary)">${node.label || node.id}</strong>
         </div>`;
      })
      .onNodeHover(node => {
        // Interactive Illumination Update
        highlightNodes.clear();
        highlightLinks.clear();
        if (node) {
          highlightNodes.add(node.id);
          (linksByNode[node.id] || []).forEach(neighbor => highlightNodes.add(neighbor));
          currentLinks.forEach(link => {
            var s = link.source.id || link.source;
            var t = link.target.id || link.target;
            if (s === node.id || t === node.id) {
              highlightLinks.add(link.id || `${s}-${t}`);
            }
          });
        }

        hoverNode = node || null;
        updateHighlight();
        container.style.cursor = node ? 'pointer' : 'default';
      })
      .onNodeClick(node => {
        if (!node) return;

        // 1. Camera Fly-To
        const distance = 150 + (node.size || 40);
        const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
        const newPos = node.x || node.y || node.z
          ? { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }
          : { x: 0, y: 0, z: distance };

        // Calculate dynamic X offset to visually center the globe despite the 320px right sidebar
        // The ratio converts 160px (half sidebar width) of screen space into world space at the given distance
        const screenToWorldRatio = distance / container.clientWidth;
        const offsetX = -160 * screenToWorldRatio;

        Graph.cameraPosition(
          newPos,
          { x: offsetX, y: 0, z: 0 }, // Offset lookAt target to the left
          1500  // ms transition duration
        );

        // 2. Logic (Expand/Info)
        processNodeClick(node);
      })
      .onBackgroundClick(() => {
        // Reset everything
        clearChunks();
        nodeInfo.innerHTML = '<div class="placeholder">Click a community node to expand it<br>Click a community in the legend to focus it</div>';
        updateLevelIndicator();

        // Reset camera lookAt to perfect center when sidebar closes
        const currentPos = Graph.cameraPosition();
        Graph.cameraPosition(
          currentPos,
          { x: 0, y: 0, z: 0 },
          800
        );
      });

    // Disable panning to ensure the globe remains perfectly centered forever
    Graph.controls().enablePan = false;

    levelIndicator.textContent = 'Level 0 — ' + currentNodes.length + ' communities loaded';

    // Spherical layout variables
    const SPHERE_RADIUS = 300;

    // Force layout constraints
    Graph.d3Force('charge').strength(-120);
    // Disable center force to prevent conflicts with our hard spherical constraints around 0,0,0
    Graph.d3Force('center', null);

    // Add Central Sphere Mapping (Premium Glass + Wireframe)
    const sphereGeometry = new THREE.SphereGeometry(SPHERE_RADIUS, 32, 32);
    const sphereMaterial = new THREE.MeshLambertMaterial({
      color: gv.globeColor,
      transparent: true,
      opacity: 0.05,
      depthWrite: false, // Prevents Z-fighting with nodes
      side: THREE.DoubleSide
    });
    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);

    // Wireframe overlay for a "tech globe" aesthetic
    const edgesGeometry = new THREE.EdgesGeometry(sphereGeometry);
    const edgesMaterial = new THREE.LineBasicMaterial({
      color: gv.globeWireframe,
      transparent: true,
      opacity: 0.05
    });
    const sphereEdges = new THREE.LineSegments(edgesGeometry, edgesMaterial);

    const scene = Graph.scene();
    scene.add(sphereMesh);
    scene.add(sphereEdges);

    // Constrain nodes to surface of sphere
    Graph.onEngineTick(() => {
      const gNodes = Graph.graphData().nodes;
      gNodes.forEach(node => {
        const dist = Math.sqrt(node.x * node.x + node.y * node.y + node.z * node.z);
        if (dist > 0) {
          node.x = (node.x / dist) * SPHERE_RADIUS;
          node.y = (node.y / dist) * SPHERE_RADIUS;
          node.z = (node.z / dist) * SPHERE_RADIUS;
        }
      });
    });

    // Make sure camera fits the whole sphere robustly
    setTimeout(() => {
      Graph.zoomToFit(500, 50);
    }, 500);

    // Dynamic resize handler
    window.addEventListener('resize', () => {
      Graph.width(container.clientWidth);
      Graph.height(container.clientHeight);
    });
  }

  function updateHighlight() {
    // trigger update of colors
    Graph
      .nodeColor(Graph.nodeColor())
      .linkColor(Graph.linkColor())
      .linkWidth(Graph.linkWidth())
      .linkDirectionalParticles(Graph.linkDirectionalParticles());
  }

  // ── Interaction Logic ────────────────────────────────────────
  function processNodeClick(node) {
    var d = node;
    if (d.isChunk) return;

    if (d.type === 'SEMANTIC_GROUP') {
      clearChunks();
      var html = '<div class="name" style="color:' + SG_COLOR + '">' + d.label + '</div>';
      html += '<span class="type-badge" style="background:' + SG_COLOR + '33;color:' + SG_COLOR + '">SEMANTIC GROUP</span>';
      html += '<div class="metric">Members: <span>' + d.member_count + ' entities</span></div>';
      html += buildSemanticGroupHtml(d.group_id);
      nodeInfo.innerHTML = html;
      return;
    }

    if (d.type === 'COMMUNITY') {
      var commId = d.community;
      if (commId === -1) return;
      clearChunks();

      if (expandedCommunities.has(commId)) {
        collapseCommunity(commId);
      } else {
        expandCommunity(commId);
      }
      showCommunitySummary(commId, d.color);
      return;
    }

    // Entity node
    clearChunks();
    var sources = JSON.parse(d.source_refs || '[]');
    var sourceStr = sources.length > 0 ? sources.join(', ') : 'single source';

    var infoHtml =
      '<div class="name">' + d.label + '</div>' +
      '<span class="type-badge" style="background:' + d.color + '33;color:' + d.color + '">' + d.type + '</span>' +
      ' <span class="type-badge" style="background:' + gv.textOutline + ';color:' + gv.textEntity + '">C' + d.community + '</span>' +
      '<div class="metric">PageRank: <span>' + (d.pagerank ? d.pagerank.toFixed(4) : 'N/A') + '</span></div>' +
      '<div class="metric">Degree: <span>' + (d.degree_centrality ? d.degree_centrality.toFixed(4) : 'N/A') + '</span></div>' +
      '<div class="metric">Sources: <span>' + d.num_sources + '</span> (' + sourceStr + ')</div>' +
      (d.description ? '<div class="desc">' + d.description + '</div>' : '');

    if (d.chunk_count > 0) {
      infoHtml += '<div class="chunk-hint">' + d.chunk_count + ' source chunks — expanding on graph</div>';
    }
    infoHtml += buildCommSummaryHtml(d.community, d.color);
    nodeInfo.innerHTML = infoHtml;

    if (d.chunk_count > 0) {
      showChunks(d);
    }
  }

  function expandCommunity(commId) {
    if (expandedCommunities.has(commId)) return;
    var data = graphData.communityData[commId];
    if (!data) return;

    var newNodes = processMetaNodes([].concat(data.entities, data.semantic_groups));
    var newLinks = processMetaLinks(data.edges);

    newNodes.forEach(n => n.parentComm = commId);
    newLinks.forEach(l => l.parentComm = commId);

    // Link new nodes to the community meta-node logically to keep them clustered
    newNodes.forEach(n => {
      if (n.type !== 'SEMANTIC_GROUP') {
        newLinks.push({
          source: n.id,
          target: 'comm-' + commId,
          parentComm: commId,
          weight: 0.1 // weak invisible link
        });
      }
    });

    currentNodes = currentNodes.concat(newNodes);
    currentLinks = currentLinks.concat(newLinks);

    expandedCommunities.add(commId);

    // Dynamically assign striking identity color to root node
    var rootNode = currentNodes.find(n => n.id === 'comm-' + commId);
    if (rootNode) {
      rootNode.color = KOINE_PALETTE[parseInt(commId) % KOINE_PALETTE.length];
    }

    refreshGraphData();
    updateHighlight(); // Force color property re-evaluation on globe
    updateLevelIndicator();
  }

  function collapseCommunity(commId) {
    if (!expandedCommunities.has(commId)) return;

    // Remove chunks if requested for this user
    clearChunks();

    currentNodes = currentNodes.filter(n => n.parentComm !== commId);
    currentLinks = currentLinks.filter(l => l.parentComm !== commId);

    expandedCommunities.delete(commId);

    // Revert root node back to uniform default color
    var rootNode = currentNodes.find(n => n.id === 'comm-' + commId);
    if (rootNode) {
      rootNode.color = rootNode._defaultColor || gv.chunkColor;
    }

    refreshGraphData();
    updateHighlight(); // Force color property re-evaluation on globe
    updateLevelIndicator();
  }

  // ── Utility Functions ──────────────────────────────────────
  function updateLevelIndicator() {
    if (expandedCommunities.size === 0) {
      levelIndicator.textContent = 'Level 0 — Community Overview';
    } else {
      levelIndicator.textContent = 'Level 1 — ' + expandedCommunities.size + ' expanded';
    }
  }

  function clearChunks() {
    currentNodes = currentNodes.filter(n => !n.isChunk);
    currentLinks = currentLinks.filter(l => !l.isChunkEdge);
    chunkPanel.innerHTML = '';
    refreshGraphData();
  }

  function showChunks(entityNode) {
    clearChunks();
    var entityId = entityNode.id;
    var refs = graphData.chunkRefs[entityId];
    if (!refs || refs.length === 0) return;

    var chunks = refs.map(function (r) {
      return { index: r.index, source_id: r.source_id, text: graphData.chunkTexts[r.text_idx] };
    });

    var addedNodes = [];
    var addedLinks = [];

    chunks.forEach(function (chunk, i) {
      var chunkId = 'chunk-' + entityId + '-' + chunk.index;
      var preview = chunk.source_id.split(':').pop();

      addedNodes.push({
        id: chunkId,
        label: '#' + chunk.index + ' ' + preview,
        fullText: chunk.text,
        sourceId: chunk.source_id,
        chunkIndex: chunk.index,
        isChunk: true,
        type: 'CHUNK',
        color: gv.chunkColor,
        size: 5 // small chunk size
      });

      addedLinks.push({
        id: 'cedge-' + chunkId,
        source: entityId,
        target: chunkId,
        isChunkEdge: true
      });
    });

    currentNodes = currentNodes.concat(addedNodes);
    currentLinks = currentLinks.concat(addedLinks);

    refreshGraphData();
    levelIndicator.textContent = 'Level 2 — Chunk expansion for ' + entityId;

    // Build chunk panel cards
    var panelHtml = '';
    chunks.forEach(function (chunk) {
      var fullText = chunk.text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      panelHtml += '<div class="chunk-card" data-chunk-id="chunk-' + entityId + '-' + chunk.index + '">' +
        '<div class="chunk-header"><span>#' + chunk.index + ' · ' + chunk.source_id + '</span><span>▾</span></div>' +
        '<div class="chunk-body">' + fullText + '</div>' +
        '</div>';
    });
    chunkPanel.innerHTML = panelHtml;

    // Card interactions
    chunkPanel.querySelectorAll('.chunk-card').forEach(function (card) {
      var header = card.querySelector('.chunk-header');
      var body = card.querySelector('.chunk-body');

      header.addEventListener('click', function () {
        body.classList.toggle('expanded');
      });

      card.addEventListener('mouseenter', function () {
        const cid = card.dataset.chunkId;
        highlightNodes.clear();
        highlightLinks.clear();
        highlightNodes.add(cid);
        highlightNodes.add(entityId);
        highlightLinks.add('cedge-' + cid);
        updateHighlight();
      });
      card.addEventListener('mouseleave', function () {
        highlightNodes.clear();
        highlightLinks.clear();
        updateHighlight();
      });
    });
  }

  function buildCommSummaryHtml(commId, color) {
    var s = graphData.commSummaries[commId];
    if (!s) return '';
    var html = '<div class="comm-summary-box" style="border-left-color:' + (color || '#c9a84c') + '">';
    html += '<div class="comm-title">Community ' + commId + ': ' + s.title + '</div>';
    html += '<div class="comm-text">' + s.summary + '</div>';
    if (s.key_insights && s.key_insights.length > 0) {
      html += '<ul class="comm-insights">';
      s.key_insights.forEach(function (insight) {
        html += '<li>' + insight.replace(/</g, '&lt;') + '</li>';
      });
      html += '</ul>';
    }
    html += '</div>';
    return html;
  }

  function buildSemanticGroupHtml(groupId) {
    var g = graphData.semanticGroups[groupId];
    if (!g) return '';
    var html = '<div class="comm-summary-box" style="border-left-color:' + SG_COLOR + '">';
    html += '<div class="comm-title" style="color:' + SG_COLOR + '">Semantic Group: ' + g.canonical + '</div>';
    html += '<div class="comm-text">' + g.members.length + ' semantically similar entities</div>';
    html += '<ul class="comm-insights">';
    g.members.forEach(function (m) {
      var sim = g.member_similarities[m];
      var simStr = sim ? ' (sim=' + sim.toFixed(4) + ')' : ' (canonical)';
      html += '<li>' + m + simStr + '</li>';
    });
    html += '</ul></div>';
    return html;
  }

  function showCommunitySummary(commId, color) {
    var expanded = expandedCommunities.has(commId);
    var s = graphData.commSummaries[commId];
    if (!s) return;
    var memberCount = graphData.communityData[commId]
      ? graphData.communityData[commId].entities.length : 0;

    var html = '<div class="name" style="color:' + color + '">Community ' + commId + '</div>';
    html += '<span class="type-badge" style="background:' + color + '33;color:' + color + '">COMMUNITY</span>';
    html += '<div class="metric">Members: <span>' + memberCount + ' entities</span></div>';
    html += '<div class="metric">Status: <span>' + (expanded ? 'Expanded' : 'Collapsed') + '</span></div>';
    html += buildCommSummaryHtml(commId, color);
    nodeInfo.innerHTML = html;
  }

  // ── Legend ──────────────────────────────────────────────────
  function buildLegend() {
    var communities = graphData.metaElements.filter(function (el) {
      return el.data && el.data.type === 'COMMUNITY';
    });

    var html = '';
    communities.forEach(function (comm) {
      var d = comm.data;
      html += '<div class="legend-item" data-community="' + d.community + '" data-color="' + d.color + '">' +
        '<div class="legend-dot" style="background:' + d.color + '"></div>' +
        '<div class="legend-label" title="' + d.label + '">' + d.label + '</div>' +
        '<div class="legend-count">' + d.member_count + '</div>' +
        '</div>';
    });
    legendEl.innerHTML = html;

    var headerEl = document.querySelector('.graph-legend-header');
    if (headerEl) {
      headerEl.textContent = 'COMMUNITIES (' + communities.length + ')';
    }

    legendEl.querySelectorAll('.legend-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var commId = parseInt(item.dataset.community);
        var color = item.dataset.color;

        if (commId === -1) { return; } // Unused/Unclassified

        // Fly camera to community node
        var metaNode = currentNodes.find(n => n.id === 'comm-' + commId);
        if (metaNode) {
          const distance = 250;
          const distRatio = 1 + distance / Math.hypot(metaNode.x, metaNode.y, metaNode.z);
          Graph.cameraPosition(
            { x: metaNode.x * distRatio, y: metaNode.y * distRatio, z: metaNode.z * distRatio },
            metaNode,
            1500
          );
        }

        if (!expandedCommunities.has(commId)) {
          expandCommunity(commId);
        }
        showCommunitySummary(commId, color);
      });
    });
  }

  // ── Global Controls ────────────────────────────────────────
  window.graphFit = function () {
    if (Graph) Graph.zoomToFit(1000, 40);
  };

  window.graphCollapseAll = function () {
    if (!Graph) return;
    clearChunks();
    Array.from(expandedCommunities).forEach(function (commId) {
      collapseCommunity(commId);
    });
    window.graphFit();
  };

  window.graphReset = function () {
    if (!Graph) return;
    clearChunks();
    nodeInfo.innerHTML = '<div class="placeholder">Click a community node to expand it<br>Click a community in the legend to focus it</div>';
    updateLevelIndicator();
    window.graphFit();
  };

  window.toggleGraphSidebar = function () {
    var sidebar = document.querySelector('.graph-sidebar');
    var toggle = document.querySelector('.graph-sidebar-toggle');
    if (sidebar) {
      sidebar.classList.toggle('collapsed');
      toggle.classList.toggle('sidebar-hidden');
      toggle.textContent = sidebar.classList.contains('collapsed') ? '◀' : '▶';
    }
  };

  // ── Theme Re-init ──────────────────────────────────────────
  window.reinitGraphStyles = function () {
    if (!Graph) return;
    gv = getGraphVars();
    Graph.backgroundColor(gv.surfaceBase);
    updateHighlight(); // Triggers material refresh
  };

})();
