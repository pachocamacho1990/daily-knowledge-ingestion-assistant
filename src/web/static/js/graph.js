/* ═══════════════════════════════════════════════════════════════
   graph.js — Koine Design System · Knowledge Graph Logic
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────
  var cy;
  var expandedCommunities = new Set();
  var graphData = null;

  // ── Koine Graph Palette ────────────────────────────────────
  // 15 curated colors: warm, muted, candlelit — harmonized with
  // the gold/cream/dark Koine design system.
  var KOINE_PALETTE = [
    '#c9a84c',  // gold-400 (primary brand)
    '#daa540',  // flame-medium (warm amber)
    '#a06218',  // gold-700 (deep amber)
    '#c97a20',  // flame-deep (burnt orange)
    '#8b6b3a',  // tawny gold
    '#7a8a5a',  // sage green
    '#5a7a9a',  // slate blue (info)
    '#8a5a6a',  // dusty rose
    '#6a5a8a',  // muted plum
    '#5a8a7a',  // teal sage
    '#9a7a5a',  // warm khaki
    '#7a6a4a',  // dark bronze
    '#a08060',  // sandstone
    '#6a8090',  // steel blue
    '#8a7060',  // mocha
  ];

  // Semantic group accent (warm sage instead of bright lime)
  var SG_COLOR = '#7a8a5a';

  // Entity shapes by type — "Connected Nodes" sacred motif
  var ENTITY_SHAPES = {
    'PERSON': 'diamond',
    'ORGANIZATION': 'round-rectangle',
    'CONCEPT': 'ellipse',
    'EVENT': 'hexagon',
    'PRODUCT': 'round-pentagon',
    'LOCATION': 'cut-rectangle',
    'TECHNOLOGY': 'round-triangle',
    'DOCUMENT': 'rectangle',
    'METRIC': 'tag',
    'CATEGORY': 'barrel',
  };
  var DEFAULT_SHAPE = 'ellipse';

  // ── Color Remapping ────────────────────────────────────────
  function remapColors() {
    // Remap metaElements (community nodes + edges)
    graphData.metaElements.forEach(function (el) {
      if (el.data && el.data.type === 'COMMUNITY' && el.data.community !== undefined) {
        el.data.color = KOINE_PALETTE[el.data.community % KOINE_PALETTE.length];
      }
    });

    // Remap entities inside each community's data
    Object.keys(graphData.communityData).forEach(function (commId) {
      var comm = graphData.communityData[commId];
      var paletteColor = KOINE_PALETTE[parseInt(commId) % KOINE_PALETTE.length];

      if (comm.entities) {
        comm.entities.forEach(function (ent) {
          if (ent.data) {
            ent.data.color = paletteColor;
            // Set shape based on entity type
            ent.data._shape = ENTITY_SHAPES[ent.data.type] || DEFAULT_SHAPE;
          }
        });
      }

      // Remap semantic group borders
      if (comm.semantic_groups) {
        comm.semantic_groups.forEach(function (sg) {
          if (sg.data) sg.data._sgColor = SG_COLOR;
        });
      }
    });
  }

  // DOM refs (set after DOMContentLoaded)
  var tooltip, chunkPanel, levelIndicator, nodeInfo, legendEl;

  // ── Boot ───────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    tooltip = document.getElementById('chunk-tooltip');
    chunkPanel = document.getElementById('chunk-panel');
    levelIndicator = document.getElementById('level-indicator');
    nodeInfo = document.getElementById('node-info');
    legendEl = document.getElementById('legend');

    loadData();
  });

  // ── Data Loading ───────────────────────────────────────────
  function loadData() {
    fetch('/static/data/graph_data.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        graphData = data;
        remapColors();
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

  // ── Cytoscape Init ─────────────────────────────────────────
  function initGraph() {
    try {
      cy = cytoscape({
        container: document.getElementById('cy'),
        elements: graphData.metaElements,
        style: [
          // Community meta-nodes (collapsed)
          {
            selector: 'node[type="COMMUNITY"]',
            style: {
              'shape': 'ellipse',
              'background-color': 'data(color)',
              'background-opacity': 0.2,
              'border-color': 'data(color)',
              'border-width': 2,
              'border-opacity': 0.6,
              'label': 'data(label)',
              'font-size': '10px',
              'font-family': 'DM Sans, sans-serif',
              'text-valign': 'center',
              'text-halign': 'center',
              'text-wrap': 'wrap',
              'text-max-width': '100px',
              'color': '#e8d5a3',           // koine-gold-200 — warm readable
              'width': 'data(size)',
              'height': 'data(size)',
              'text-outline-color': '#0a0a12', // koine-dark-500
              'text-outline-width': 2.5,
            }
          },
          // Community meta-nodes (expanded = parent)
          {
            selector: ':parent[type="COMMUNITY"]',
            style: {
              'background-opacity': 0.08,
              'border-style': 'solid',
              'border-width': 2,
              'padding': '20px',
              'text-valign': 'top',
              'font-size': '10px',
              'shape': 'ellipse',
            }
          },
          // Entity nodes — shape varies by type via data(_shape)
          {
            selector: 'node[type!="COMMUNITY"][type!="SEMANTIC_GROUP"]',
            style: {
              'label': 'data(label)',
              'background-color': 'data(color)',
              'background-opacity': 0.45,
              'width': 'data(size)',
              'height': 'data(size)',
              'shape': 'data(_shape)',
              'font-size': '8px',
              'font-family': 'DM Sans, sans-serif',
              'text-valign': 'bottom',
              'text-halign': 'center',
              'text-margin-y': 5,
              'color': '#d4c18a',            // koine-gold-300 — readable
              'text-outline-color': '#0a0a12',
              'text-outline-width': 2,
              'border-width': 1.5,
              'border-color': 'data(color)',
              'border-opacity': 0.5,
            }
          },
          // Semantic group parents
          {
            selector: 'node[type="SEMANTIC_GROUP"]',
            style: {
              'background-color': '#1a1e14',
              'background-opacity': 0.35,
              'border-color': SG_COLOR,
              'border-width': 1.5,
              'border-style': 'dashed',
              'border-opacity': 0.4,
              'shape': 'ellipse',
              'padding': '15px',
              'text-valign': 'top',
              'text-halign': 'center',
              'font-size': '9px',
              'font-family': 'DM Sans, sans-serif',
              'color': SG_COLOR,
              'text-opacity': 0.6,
              'label': 'data(label)',
              'text-outline-color': '#0a0a12',
              'text-outline-width': 2,
            }
          },
          // Edges — warm gold tint
          {
            selector: 'edge',
            style: {
              'width': 1,
              'line-color': '#2a2418',       // warm dark
              'target-arrow-color': '#3a3020',
              'target-arrow-shape': 'triangle',
              'arrow-scale': 0.8,
              'curve-style': 'bezier',
              'opacity': 0.35,
            }
          },
          // Weighted inter-community edges
          {
            selector: 'edge[weight]',
            style: {
              'width': 2,
              'line-color': '#3a3020',
              'target-arrow-shape': 'none',
              'line-style': 'dashed',
              'opacity': 0.25,
            }
          },
          // Selected
          {
            selector: 'node:selected',
            style: {
              'border-width': 4,
              'border-color': '#c9a84c',     // koine-gold-400
              'color': '#f0e0c0',
              'font-size': '12px',
              'font-weight': 'bold',
              'text-outline-width': 3,
              'z-index': 999,
            }
          },
          // Highlighted
          {
            selector: '.highlighted',
            style: {
              'opacity': 1,
              'border-width': 3,
              'border-color': '#c9a84c',     // koine-gold-400
              'color': '#f0e0c0',
              'z-index': 999,
            }
          },
          {
            selector: 'edge.highlighted',
            style: {
              'opacity': 1,
              'width': 2.5,
              'line-color': '#c9a84c',
              'target-arrow-color': '#c9a84c',
            }
          },
          // Dimmed
          {
            selector: '.dimmed',
            style: { 'opacity': 0.12 }
          },
          // Chunk nodes — small document markers
          {
            selector: '.chunk-node',
            style: {
              'background-color': '#6a8090',  // steel blue
              'background-opacity': 0.2,
              'border-color': '#6a8090',
              'border-width': 1.5,
              'width': 16,
              'height': 16,
              'shape': 'rectangle',
              'label': 'data(label)',
              'font-size': '7px',
              'font-family': 'JetBrains Mono, monospace',
              'color': '#6a8090',
              'text-valign': 'bottom',
              'text-margin-y': 3,
              'text-outline-color': '#0a0a12',
              'text-outline-width': 2,
              'z-index': 1000,
              'opacity': 1,
            }
          },
          // Chunk edges
          {
            selector: '.chunk-edge',
            style: {
              'width': 0.8,
              'line-color': '#6a8090',
              'line-style': 'dashed',
              'opacity': 0.3,
              'target-arrow-shape': 'none',
              'curve-style': 'bezier',
              'z-index': 999,
            }
          },
        ],
        layout: {
          name: 'concentric',
          animate: false,
          fit: true,
          padding: 40,
          avoidOverlap: true,
          minNodeSpacing: 30,
          concentric: function (node) {
            return node.data('size') || 40;
          },
          levelWidth: function () { return 3; },
          nodeDimensionsIncludeLabels: true,
        },
        minZoom: 0.15,
        maxZoom: 4,
        wheelSensitivity: 0.3,
      });

      cy.fit(undefined, 40);
      levelIndicator.textContent =
        'Level 0 — ' + cy.nodes().length + ' communities loaded';

      // Bind events
      bindEvents();

    } catch (e) {
      document.getElementById('cy').innerHTML =
        '<div style="color:#c9a84c;padding:40px;font-family:monospace;font-size:14px">' +
        '<b>Cytoscape Error:</b><br><pre style="white-space:pre-wrap;margin-top:12px">' +
        e.message + '\n\n' + e.stack + '</pre></div>';
    }
  }

  // ── Event Bindings ─────────────────────────────────────────
  function bindEvents() {
    // Node tap
    cy.on('tap', 'node', function (evt) {
      try {
        var node = evt.target;
        if (node.hasClass('chunk-node')) return;

        // Semantic group
        if (node.data('type') === 'SEMANTIC_GROUP') {
          clearChunks();
          cy.elements().addClass('dimmed').removeClass('highlighted');
          var children = node.children();
          children.add(node).add(children.edgesWith(children))
            .removeClass('dimmed').addClass('highlighted');
          cy.fit(children.add(node), 60);

          var html = '<div class="name" style="color:' + SG_COLOR + '">' + node.data('label') + '</div>';
          html += '<span class="type-badge" style="background:' + SG_COLOR + '33;color:' + SG_COLOR + '">SEMANTIC GROUP</span>';
          html += '<div class="metric">Members: <span>' + node.data('member_count') + ' entities</span></div>';
          html += buildSemanticGroupHtml(node.data('group_id'));
          nodeInfo.innerHTML = html;
          return;
        }

        // Community meta-node: expand/collapse
        if (node.data('type') === 'COMMUNITY') {
          var commId = node.data('community');
          if (commId === -1) return;
          clearChunks();
          cy.elements().removeClass('dimmed highlighted');

          if (expandedCommunities.has(commId)) {
            collapseCommunity(commId);
          } else {
            expandCommunity(commId);
          }
          showCommunitySummary(commId, node.data('color'));
          return;
        }

        // Entity node
        var d = node.data();
        clearChunks();
        cy.elements().addClass('dimmed').removeClass('highlighted');
        var neighborhood = node.neighborhood().add(node);
        var parentComm = node.parent();
        if (parentComm.length) {
          parentComm.add(parentComm.children()).removeClass('dimmed');
        }
        neighborhood.removeClass('dimmed').addClass('highlighted');

        var sources = JSON.parse(d.source_refs || '[]');
        var sourceStr = sources.length > 0 ? sources.join(', ') : 'single source';

        var infoHtml =
          '<div class="name">' + d.label + '</div>' +
          '<span class="type-badge" style="background:' + d.color + '33;color:' + d.color + '">' + d.type + '</span>' +
          ' <span class="type-badge" style="background:#1a1a2a;color:#888">C' + d.community + '</span>' +
          '<div class="metric">PageRank: <span>' + d.pagerank.toFixed(4) + '</span></div>' +
          '<div class="metric">Degree: <span>' + d.degree_centrality.toFixed(4) + '</span></div>' +
          '<div class="metric">Betweenness: <span>' + d.betweenness.toFixed(4) + '</span></div>' +
          '<div class="metric">Sources: <span>' + d.num_sources + '</span> (' + sourceStr + ')</div>' +
          (d.description ? '<div class="desc">' + d.description + '</div>' : '');

        if (d.chunk_count > 0) {
          infoHtml += '<div class="chunk-hint">' + d.chunk_count + ' source chunks — expanding on graph</div>';
        }

        infoHtml += buildCommSummaryHtml(d.community, d.color);

        var parentNode = node.parent();
        if (parentNode.length > 0 && parentNode.data('type') === 'SEMANTIC_GROUP') {
          var sgId = parentNode.data('group_id');
          infoHtml += '<span class="type-badge" style="background:' + SG_COLOR + '33;color:' + SG_COLOR + ';margin-top:8px;display:inline-block">SG: ' + parentNode.data('label') + '</span>';
          infoHtml += buildSemanticGroupHtml(sgId);
        }

        nodeInfo.innerHTML = infoHtml;

        if (d.chunk_count > 0) {
          showChunks(d.id);
        }
      } catch (err) {
        nodeInfo.innerHTML =
          '<div style="color:#c9a84c;font-family:var(--koine-font-mono);font-size:12px">' +
          '<b>Click Error:</b><pre style="white-space:pre-wrap;margin-top:8px">' +
          err.message + '\n\n' + err.stack + '</pre></div>';
      }
    });

    // Background tap: reset
    cy.on('tap', function (evt) {
      if (evt.target === cy) {
        clearChunks();
        cy.elements().removeClass('dimmed highlighted');
        nodeInfo.innerHTML =
          '<div class="placeholder">Click a community node to expand it<br>Click a community in the legend to focus it</div>';
        updateLevelIndicator();
      }
    });

    // Hover chunk nodes: tooltip
    cy.on('mouseover', '.chunk-node', function (evt) {
      var node = evt.target;
      var d = node.data();
      var rpos = node.renderedPosition();
      var container = cy.container().getBoundingClientRect();

      tooltip.innerHTML =
        '<div class="tooltip-title">#' + d.chunkIndex + ' · ' + d.sourceId + '</div>' +
        '<div>' + d.fullText.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>';

      var left = container.left + rpos.x + 20;
      var top = container.top + rpos.y - 20;
      if (left + 340 > window.innerWidth) left = container.left + rpos.x - 350;
      if (top + 300 > window.innerHeight) top = window.innerHeight - 310;
      if (top < 10) top = 10;

      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
      tooltip.style.display = 'block';
    });

    cy.on('mouseout', '.chunk-node', function () {
      tooltip.style.display = 'none';
    });

    // Hover inter-community edges
    cy.on('mouseover', 'edge[details]', function (evt) {
      var edge = evt.target;
      var d = edge.data();
      var rpos = edge.renderedMidpoint();
      var container = cy.container().getBoundingClientRect();

      var html = '<div class="tooltip-title">' + d.description + '</div>';
      if (d.details && d.details.length > 0) {
        html += '<div>' + d.details.join('\n').replace(/</g, '&lt;') + '</div>';
      }
      tooltip.innerHTML = html;

      var left = container.left + rpos.x + 20;
      var top = container.top + rpos.y - 20;
      if (left + 340 > window.innerWidth) left = container.left + rpos.x - 350;
      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
      tooltip.style.display = 'block';
    });

    cy.on('mouseout', 'edge[details]', function () {
      tooltip.style.display = 'none';
    });
  }

  // ── Community Expand / Collapse ────────────────────────────
  function expandCommunity(commId) {
    var metaNode = cy.getElementById('comm-' + commId);
    if (!metaNode.length) return;

    var data = graphData.communityData[commId];
    if (!data) return;

    var toAdd = [].concat(data.entities, data.edges, data.semantic_groups);
    cy.add(toAdd);

    var descendants = metaNode.descendants();
    var entityNodes = descendants.filter('node[type != "SEMANTIC_GROUP"]');
    var center = metaNode.position();
    var childRadius = Math.max(60, entityNodes.length * 12);

    entityNodes.forEach(function (node, i) {
      var angle = (2 * Math.PI * i) / entityNodes.length - Math.PI / 2;
      node.position({
        x: center.x + childRadius * Math.cos(angle),
        y: center.y + childRadius * Math.sin(angle),
      });
    });

    expandedCommunities.add(commId);
    updateLevelIndicator();
    relayoutTopLevel();
  }

  function collapseCommunity(commId, skipRelayout) {
    var metaNode = cy.getElementById('comm-' + commId);
    if (!metaNode.length) return;

    var children = metaNode.children();
    children.forEach(function (child) {
      cy.remove(cy.elements('.chunk-node[id ^= "chunk-' + child.id() + '"]'));
      cy.remove(cy.elements('.chunk-edge'));
    });

    var descendants = metaNode.descendants();
    cy.remove(descendants.edgesWith(descendants));
    cy.remove(descendants);

    expandedCommunities.delete(commId);
    updateLevelIndicator();
    if (!skipRelayout) relayoutTopLevel();
  }

  function relayoutTopLevel() {
    var topNodes = cy.nodes().filter(function (n) { return !n.isChild(); });
    if (topNodes.length === 0) return;

    var expanded = [];
    var collapsed = [];
    topNodes.forEach(function (n) {
      if (n.isParent()) { expanded.push(n); }
      else { collapsed.push(n); }
    });

    var bb = cy.extent();
    var cx = (bb.x1 + bb.x2) / 2;
    var cyy = (bb.y1 + bb.y2) / 2;

    if (expanded.length === 0) {
      topNodes.sort(function (a, b) {
        return (b.data('size') || 40) - (a.data('size') || 40);
      });
      var baseRadius = Math.max(200, topNodes.length * 25);
      arrangeInCircle(topNodes, cx, cyy, baseRadius, true);
    } else {
      var maxExpandedRadius = 0;
      expanded.forEach(function (n, i) {
        var nbb = n.boundingBox({ includeLabels: false });
        var r = Math.max(nbb.w, nbb.h) / 2;
        if (r > maxExpandedRadius) maxExpandedRadius = r;
        if (expanded.length === 1) {
          n.position({ x: cx, y: cyy });
        } else {
          var angle = (2 * Math.PI * i) / expanded.length - Math.PI / 2;
          var expandedSpread = maxExpandedRadius * 2.5;
          n.position({
            x: cx + expandedSpread * Math.cos(angle),
            y: cyy + expandedSpread * Math.sin(angle),
          });
        }
      });

      if (expanded.length > 1) {
        maxExpandedRadius = 0;
        expanded.forEach(function (n) {
          var nbb = n.boundingBox({ includeLabels: false });
          var dist = Math.sqrt(
            Math.pow(n.position().x - cx, 2) + Math.pow(n.position().y - cyy, 2)
          );
          var rr = dist + Math.max(nbb.w, nbb.h) / 2;
          if (rr > maxExpandedRadius) maxExpandedRadius = rr;
        });
      }

      var outerRadius = maxExpandedRadius + 120;
      arrangeInCircle(collapsed, cx, cyy, outerRadius, true);
    }

    cy.animate({ fit: { padding: 40 }, duration: 300 });
  }

  function arrangeInCircle(nodes, cx, cyy, radius, animate) {
    nodes.forEach(function (n, i) {
      var angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
      var pos = {
        x: cx + radius * Math.cos(angle),
        y: cyy + radius * Math.sin(angle),
      };
      if (animate) { n.animate({ position: pos, duration: 300 }); }
      else { n.position(pos); }
    });
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
    cy.remove(cy.elements('.chunk-node, .chunk-edge'));
    chunkPanel.innerHTML = '';
    tooltip.style.display = 'none';
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
    html += '<div class="metric">Status: <span>' + (expanded ? 'Expanded — click border to collapse' : 'Collapsed — click to expand') + '</span></div>';
    html += buildCommSummaryHtml(commId, color);
    nodeInfo.innerHTML = html;
  }

  // ── Chunks ─────────────────────────────────────────────────
  function showChunks(entityId) {
    clearChunks();
    var refs = graphData.chunkRefs[entityId];
    if (!refs || refs.length === 0) return;

    var chunks = refs.map(function (r) {
      return { index: r.index, source_id: r.source_id, text: graphData.chunkTexts[r.text_idx] };
    });

    var entityNode = cy.getElementById(entityId);
    var pos = entityNode.position();
    var radius = 120 + chunks.length * 8;

    var addedElements = [];
    chunks.forEach(function (chunk, i) {
      var angle = (2 * Math.PI * i) / chunks.length - Math.PI / 2;
      var chunkId = 'chunk-' + entityId + '-' + chunk.index;
      var preview = chunk.source_id.split(':').pop();

      addedElements.push({
        group: 'nodes',
        data: {
          id: chunkId,
          label: '#' + chunk.index + ' ' + preview,
          fullText: chunk.text,
          sourceId: chunk.source_id,
          chunkIndex: chunk.index,
        },
        position: {
          x: pos.x + radius * Math.cos(angle),
          y: pos.y + radius * Math.sin(angle),
        },
        classes: 'chunk-node',
      });
      addedElements.push({
        group: 'edges',
        data: {
          id: 'cedge-' + chunkId,
          source: entityId,
          target: chunkId,
        },
        classes: 'chunk-edge',
      });
    });

    cy.add(addedElements);
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
        var cnode = cy.getElementById(card.dataset.chunkId);
        if (cnode.length) {
          cnode.style('background-opacity', 0.7);
          cnode.style('border-width', 3);
          cnode.style('width', 24);
          cnode.style('height', 24);
        }
      });
      card.addEventListener('mouseleave', function () {
        var cnode = cy.getElementById(card.dataset.chunkId);
        if (cnode.length) {
          cnode.style('background-opacity', 0.25);
          cnode.style('border-width', 2);
          cnode.style('width', 18);
          cnode.style('height', 18);
        }
      });
    });
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

    // Legend header count
    var headerEl = document.querySelector('.graph-legend-header');
    if (headerEl) {
      headerEl.textContent = 'COMMUNITIES (' + communities.length + ')';
    }

    // Legend click handlers
    legendEl.querySelectorAll('.legend-item').forEach(function (item) {
      item.addEventListener('click', function () {
        clearChunks();
        var commId = parseInt(item.dataset.community);
        var color = item.dataset.color;

        if (commId === -1) {
          cy.elements().addClass('dimmed').removeClass('highlighted');
          var otherNodes = cy.nodes('[type="COMMUNITY"][community = -1]');
          otherNodes.removeClass('dimmed').addClass('highlighted');
          if (otherNodes.length) cy.fit(otherNodes, 60);
          return;
        }

        cy.elements().removeClass('dimmed highlighted');

        if (!expandedCommunities.has(commId)) {
          expandCommunity(commId);
        } else {
          var metaNode = cy.getElementById('comm-' + commId);
          cy.animate({
            fit: { eles: metaNode.union(metaNode.descendants()), padding: 60 },
            duration: 300
          });
        }
        showCommunitySummary(commId, color);
      });
    });
  }

  // ── Global Controls ────────────────────────────────────────
  window.graphFit = function () {
    if (cy) cy.fit(undefined, 40);
  };

  window.graphCollapseAll = function () {
    if (!cy) return;
    clearChunks();
    Array.from(expandedCommunities).forEach(function (commId) {
      collapseCommunity(commId, true);
    });
    cy.elements().removeClass('dimmed highlighted');
    relayoutTopLevel();
  };

  window.graphReset = function () {
    if (!cy) return;
    clearChunks();
    cy.elements().removeClass('dimmed highlighted');
    nodeInfo.innerHTML =
      '<div class="placeholder">Click a community node to expand it<br>Click a community in the legend to focus it</div>';
    updateLevelIndicator();
    cy.fit(undefined, 40);
  };

  // Sidebar toggle
  window.toggleGraphSidebar = function () {
    var sidebar = document.querySelector('.graph-sidebar');
    var toggle = document.querySelector('.graph-sidebar-toggle');
    if (sidebar) {
      sidebar.classList.toggle('collapsed');
      toggle.classList.toggle('sidebar-hidden');
      toggle.textContent = sidebar.classList.contains('collapsed') ? '◀' : '▶';
    }
  };

})();
