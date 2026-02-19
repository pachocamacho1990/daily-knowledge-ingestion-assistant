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
  var DARK_PALETTE = [
    '#c9a84c', '#daa540', '#a06218', '#c97a20', '#8b6b3a',
    '#7a8a5a', '#5a7a9a', '#8a5a6a', '#6a5a8a', '#5a8a7a',
    '#9a7a5a', '#7a6a4a', '#a08060', '#6a8090', '#8a7060',
  ];
  var LIGHT_PALETTE = [
    '#7a5a10', '#8a6015', '#6a3a08', '#5a2a00', '#4a3a20',
    '#3a5a3a', '#2a4a6a', '#4a2a3a', '#3a2a5a', '#2a5a4a',
    '#5a4a2a', '#4a3a2a', '#6a4030', '#3a5060', '#5a4030'
  ];
  var SG_DARK = '#7a8a5a';
  var SG_LIGHT = '#3a5a3a';

  function getActivePalette() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? LIGHT_PALETTE : DARK_PALETTE;
  }

  function getActiveSgColor() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? SG_LIGHT : SG_DARK;
  }

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
    var palette = getActivePalette();
    var sgColor = getActiveSgColor();

    Object.keys(graphData.communityData).forEach(function (commId) {
      var comm = graphData.communityData[commId];
      var paletteColor = palette[parseInt(commId) % palette.length];

      // If root node is currently expanded, immediately update its color too
      if (expandedCommunities.has(parseInt(commId))) {
        var rootNode = currentNodes.find(n => n.id === 'comm-' + commId);
        if (rootNode) rootNode.color = paletteColor;
      }

      if (comm.entities) {
        comm.entities.forEach(function (ent) {
          if (ent.data) ent.data.color = paletteColor;
        });
      }
      if (comm.semantic_groups) {
        comm.semantic_groups.forEach(function (sg) {
          if (sg.data) sg.data._sgColor = sgColor;
        });
      }
    });
  }

  function updateNeighbors() {
    linksByNode = {};
    currentLinks.forEach(link => {
      const a = link.source?.id || link.source;
      const b = link.target?.id || link.target;
      const linkId = link.id || `${a}-${b}`;

      if (!linksByNode[a]) linksByNode[a] = { neighbors: [], links: [] };
      if (!linksByNode[b]) linksByNode[b] = { neighbors: [], links: [] };

      linksByNode[a].neighbors.push(b);
      linksByNode[a].links.push(linkId);
      linksByNode[b].neighbors.push(a);
      linksByNode[b].links.push(linkId);
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
        // Interactive Illumination Update via O(1) Pre-Computed Lookups
        highlightNodes.clear();
        highlightLinks.clear();

        if (node) {
          highlightNodes.add(node.id);
          const adj = linksByNode[node.id];
          if (adj) {
            adj.neighbors.forEach(n => highlightNodes.add(n));
            adj.links.forEach(l => highlightLinks.add(l));
          }
        }

        hoverNode = node || null;
        updateHighlight();
        container.style.cursor = node ? 'pointer' : 'default';
      })
      .onNodeClick(node => {
        if (!node) return;

        // 1. Calculate Base Camera Fly-To (Centered)
        const distance = 150 + (node.size || 40);
        const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
        const basePos = node.x || node.y || node.z
          ? { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }
          : { x: 0, y: 0, z: distance };

        Graph.cameraPosition(basePos, { x: 0, y: 0, z: 0 }, 1500);

        // 2. Apply CSS Pan
        // Instead of tilting the 3D camera (which breaks the rotational pivot wobble),
        // we physically slide the entire WebGL canvas div to the left via 2D CSS.
        // This perfectly centers the globe in the remaining visible UI space.
        const sidebarWidth = window.innerWidth <= 1200 ? 280 : 320;
        container.style.transition = 'transform 1.5s cubic-bezier(0.25, 1, 0.5, 1)';
        container.style.transform = `translateX(-${sidebarWidth / 2}px)`;

        // 3. Logic (Expand/Info)
        processNodeClick(node);
      })
      .onBackgroundClick(() => {
        // Reset everything
        clearChunks();
        nodeInfo.innerHTML = '<div class="placeholder">Click a community node to expand it<br>Click a community in the legend to focus it</div>';
        updateLevelIndicator();

        // No need to reset 3D camera target because it is already locked to 0,0,0
        // We just clear the visual CSS canvas offset smoothly
        container.style.transition = 'transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)';
        container.style.transform = 'translateX(0px)';
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
      var sgColor = getActiveSgColor();
      var html = '<div class="name" style="color:' + sgColor + '">' + d.label + '</div>';
      html += '<span class="type-badge" style="background:' + sgColor + '33;color:' + sgColor + '">SEMANTIC GROUP</span>';
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

    // Push mutates arrays directly avoiding GC reallocation spikes
    currentNodes.push(...newNodes);
    currentLinks.push(...newLinks);

    expandedCommunities.add(commId);

    // Dynamically assign striking identity color to root node
    var rootNode = currentNodes.find(n => n.id === 'comm-' + commId);
    if (rootNode) {
      var palette = getActivePalette();
      rootNode.color = palette[parseInt(commId) % palette.length];
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

    // Push mutates arrays directly avoiding GC reallocation spikes
    currentNodes.push(...addedNodes);
    currentLinks.push(...addedLinks);

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
    var sgColor = getActiveSgColor();
    var html = '<div class="comm-summary-box" style="border-left-color:' + sgColor + '">';
    html += '<div class="comm-title" style="color:' + sgColor + '">Semantic Group: ' + g.canonical + '</div>';
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

    // Switch palette if needed and force graph update
    remapColors();
    refreshGraphData();
    updateHighlight(); // Triggers material refresh
  };

})();
