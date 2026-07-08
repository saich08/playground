(function (root) {
  const QC = (root.QC = root.QC || {});

  // Oblique projection basis for the Bloch sphere sketch: Z points straight
  // up, X/Y point down-left/down-right, matching the classic Bloch-sphere
  // orientation while staying pure 2D (no trig/matrices needed per frame).
  const BLOCH_CX = 60;
  const BLOCH_CY = 66;
  const BLOCH_R = 42;
  const BLOCH_EX = [-0.87, 0.5];
  const BLOCH_EY = [0.87, 0.5];
  const BLOCH_EZ = [0, -1];

  function blochProject(x, y, z) {
    return [
      BLOCH_CX + BLOCH_R * (x * BLOCH_EX[0] + y * BLOCH_EY[0] + z * BLOCH_EZ[0]),
      BLOCH_CY + BLOCH_R * (x * BLOCH_EX[1] + y * BLOCH_EY[1] + z * BLOCH_EZ[1]),
    ];
  }

  function arrowHead(tipX, tipY, dirX, dirY, size, color) {
    const len = Math.hypot(dirX, dirY) || 1;
    const ux = dirX / len;
    const uy = dirY / len;
    const px = -uy;
    const py = ux;
    const backX = tipX - ux * size;
    const backY = tipY - uy * size;
    const p1x = backX + px * size * 0.5;
    const p1y = backY + py * size * 0.5;
    const p2x = backX - px * size * 0.5;
    const p2y = backY - py * size * 0.5;
    return `<polygon points="${tipX},${tipY} ${p1x},${p1y} ${p2x},${p2y}" fill="${color}" />`;
  }

  function buildBlochSVG(vec, qubitLabel) {
    const { x, y, z } = vec;
    const [ox, oy] = [BLOCH_CX, BLOCH_CY];
    const axes = [
      { end: blochProject(1.2, 0, 0), color: '#ff6b6b', label: 'X' },
      { end: blochProject(0, 1.2, 0), color: '#3ddc97', label: 'Y' },
      { end: blochProject(0, 0, 1.2), color: '#58a6ff', label: 'Z' },
    ];

    let svg = `<svg class="bloch-row-svg" viewBox="0 0 120 128" xmlns="http://www.w3.org/2000/svg">`;
    if (qubitLabel) {
      svg += `<text x="4" y="17" fill="var(--text-primary, #e6edf3)" font-size="16" font-weight="800" text-anchor="start">${qubitLabel}</text>`;
    }
    svg += `<circle cx="${ox}" cy="${oy}" r="${BLOCH_R}" fill="rgba(88,166,255,0.05)" stroke="rgba(139,148,158,0.35)" stroke-width="1" />`;
    svg += `<ellipse cx="${ox}" cy="${oy}" rx="${BLOCH_R}" ry="${BLOCH_R * 0.32}" fill="none" stroke="rgba(139,148,158,0.25)" stroke-width="1" />`;
    svg += `<ellipse cx="${ox}" cy="${oy}" rx="${BLOCH_R * 0.32}" ry="${BLOCH_R}" fill="none" stroke="rgba(139,148,158,0.2)" stroke-width="1" />`;

    axes.forEach(({ end, color, label }) => {
      svg += `<line x1="${ox}" y1="${oy}" x2="${end[0]}" y2="${end[1]}" stroke="${color}" stroke-width="1.25" opacity="0.85" />`;
      svg += arrowHead(end[0], end[1], end[0] - ox, end[1] - oy, 5, color);
      const lx = ox + (end[0] - ox) * 1.16;
      const ly = oy + (end[1] - oy) * 1.16;
      svg += `<text x="${lx}" y="${ly}" fill="${color}" font-size="11" font-weight="700" text-anchor="middle" dominant-baseline="middle">${label}</text>`;
    });

    const [vx, vy] = blochProject(x, y, z);
    svg += `<line x1="${ox}" y1="${oy}" x2="${vx}" y2="${vy}" stroke="#ffd166" stroke-width="2" />`;
    svg += arrowHead(vx, vy, vx - ox, vy - oy, 6, '#ffd166');
    svg += `<circle cx="${ox}" cy="${oy}" r="2" fill="var(--text-secondary, #8b949e)" />`;
    svg += `</svg>`;
    return svg;
  }

  // Renders one Bloch sphere per row, using the same row-height formula as
  // the circuit grid (src/render/render-circuit.js) so each sphere lines up
  // with its qubit's wire.
  function renderBlochRail(state, n, container) {
    container.innerHTML = '';
    container.style.gridTemplateRows = `repeat(${n}, minmax(${QC.MIN_CELL_H}px, 1fr))`;

    const vecs = QC.blochVectors(state, n);
    vecs.forEach((vec, row) => {
      const mag = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
      const purity = mag > 0.995 ? 'pure' : `|r| ${mag.toFixed(2)} · mixed`;

      const cell = document.createElement('div');
      cell.className = 'bloch-row-cell';
      cell.style.gridRow = String(row + 1);
      cell.title = `q${row} — x ${vec.x.toFixed(2)}, y ${vec.y.toFixed(2)}, z ${vec.z.toFixed(2)} (${purity})`;
      cell.innerHTML = buildBlochSVG(vec, `q${row}`);
      container.appendChild(cell);
    });
  }

  // Updates SNAPSHOT gate chips already in the DOM in place (found by the
  // instance id render-circuit.js stamps on every chip), so a change to the
  // circuit or a re-run refreshes each snapshot's mid-circuit sphere without
  // needing a full circuit re-render.
  function refreshSnapshotChips(gridContainer, snapshots) {
    snapshots.forEach(({ instanceId, row, vec }) => {
      const chip = gridContainer.querySelector(`[data-instance-id="${instanceId}"]`);
      if (!chip) return;
      const mag = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
      const purity = mag > 0.995 ? 'pure' : `|r| ${mag.toFixed(2)} · mixed`;
      chip.title = `q${row} snapshot — x ${vec.x.toFixed(2)}, y ${vec.y.toFixed(2)}, z ${vec.z.toFixed(2)} (${purity})`;
      const sphereWrap = chip.querySelector('.gate-snapshot-sphere');
      if (sphereWrap) sphereWrap.innerHTML = buildBlochSVG(vec, `q${row}`);
    });
  }

  QC.buildBlochSVG = buildBlochSVG;
  QC.renderBlochRail = renderBlochRail;
  QC.refreshSnapshotChips = refreshSnapshotChips;
})(typeof window !== 'undefined' ? window : global);
