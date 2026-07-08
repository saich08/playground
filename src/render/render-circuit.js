(function (root) {
  const QC = (root.QC = root.QC || {});

  const MIN_CELL_W = 48;
  const MIN_CELL_H = 34;
  const LABEL_W = 40;

  let resizeObserver = null;

  function gateTitle(cell) {
    const def = QC.GATES[cell.type];
    if (cell.type === 'CNOT') return cell.role === 'control' ? `${def.name} — control` : `${def.name} — target`;
    if (def.param) return `${def.name} (θ = ${(cell.param / Math.PI).toFixed(2)}π) — click to adjust, × to remove`;
    return `${def.name} — click × to remove`;
  }

  function buildGateChip(cell) {
    const def = QC.GATES[cell.type];
    const chip = document.createElement('div');
    chip.dataset.instanceId = cell.instanceId;
    chip.title = gateTitle(cell);

    if (def.category === 'two') {
      if (cell.type === 'CNOT' && cell.role === 'control') {
        chip.className = 'gate-chip gate-control';
      } else if (cell.type === 'CNOT' && cell.role === 'target') {
        chip.className = 'gate-chip gate-target';
      } else if (cell.type === 'CZ') {
        chip.className = 'gate-chip gate-dot';
      } else if (cell.type === 'SWAP') {
        chip.className = 'gate-chip gate-swap-x';
      }
    } else if (def.category === 'measure') {
      chip.className = 'gate-chip gate-measure';
      chip.textContent = def.label;
    } else if (def.category === 'snapshot') {
      chip.className = 'gate-chip gate-snapshot';
      const sphereWrap = document.createElement('div');
      sphereWrap.className = 'gate-snapshot-sphere';
      sphereWrap.textContent = def.label;
      chip.appendChild(sphereWrap);
    } else if (def.category === 'rotation') {
      chip.className = 'gate-chip gate-rotation';
      chip.textContent = def.label;
      chip.draggable = true;
    } else {
      chip.className = cell.type === 'RANDOM' ? 'gate-chip gate-single gate-random' : 'gate-chip gate-single';
      chip.textContent = def.label;
      chip.draggable = true;
    }

    const del = document.createElement('span');
    del.className = 'gate-delete';
    del.textContent = '×';
    del.dataset.role = 'delete';
    chip.appendChild(del);

    return chip;
  }

  function renderCircuit(circuit, container) {
    container.innerHTML = '';
    const n = circuit.numQubits;

    const inner = document.createElement('div');
    inner.className = 'circuit-grid-inner';
    inner.style.gridTemplateColumns = `${LABEL_W}px repeat(${QC.MAX_COLUMNS}, minmax(${MIN_CELL_W}px, 1fr))`;
    inner.style.gridTemplateRows = `repeat(${n}, minmax(${MIN_CELL_H}px, 1fr))`;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'connector-layer');
    inner.appendChild(svg);

    for (let row = 0; row < n; row++) {
      const label = document.createElement('div');
      label.className = 'qubit-label';
      label.textContent = `q${row}`;
      label.style.gridColumn = '1';
      label.style.gridRow = String(row + 1);
      inner.appendChild(label);

      const wire = document.createElement('div');
      wire.className = 'wire-line';
      wire.style.gridColumn = `2 / span ${QC.MAX_COLUMNS}`;
      wire.style.gridRow = String(row + 1);
      inner.appendChild(wire);

      for (let col = 0; col < QC.MAX_COLUMNS; col++) {
        const cellEl = document.createElement('div');
        cellEl.className = 'cell';
        cellEl.style.gridColumn = String(col + 2);
        cellEl.style.gridRow = String(row + 1);
        cellEl.dataset.row = row;
        cellEl.dataset.col = col;

        const cellData = circuit.columns[col][row];
        if (cellData) {
          cellEl.appendChild(buildGateChip(cellData));
        }
        inner.appendChild(cellEl);
      }
    }

    container.appendChild(inner);
    requestAnimationFrame(() => drawConnectors(circuit, inner));

    if (resizeObserver) resizeObserver.disconnect();
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => drawConnectors(circuit, inner));
      resizeObserver.observe(inner);
    }

    return inner;
  }

  function drawConnectors(circuit, gridInner) {
    const svg = gridInner.querySelector('svg.connector-layer');
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const gridRect = gridInner.getBoundingClientRect();

    const seen = new Set();
    for (let col = 0; col < circuit.columns.length; col++) {
      const column = circuit.columns[col];
      for (let row = 0; row < circuit.numQubits; row++) {
        const cell = column[row];
        if (!cell || cell.partnerRow === undefined || seen.has(cell.instanceId)) continue;
        seen.add(cell.instanceId);

        const rowA = Math.min(row, cell.partnerRow);
        const rowB = Math.max(row, cell.partnerRow);
        const cellElA = gridInner.querySelector(`.cell[data-row="${rowA}"][data-col="${col}"]`);
        const cellElB = gridInner.querySelector(`.cell[data-row="${rowB}"][data-col="${col}"]`);
        if (!cellElA || !cellElB) continue;
        const rectA = cellElA.getBoundingClientRect();
        const rectB = cellElB.getBoundingClientRect();
        const x = rectA.left + rectA.width / 2 - gridRect.left;
        const y1 = rectA.top + rectA.height / 2 - gridRect.top;
        const y2 = rectB.top + rectB.height / 2 - gridRect.top;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x);
        line.setAttribute('y2', y2);
        line.style.stroke = 'var(--accent)';
        line.style.strokeWidth = '2';
        svg.appendChild(line);
      }
    }
  }

  QC.MIN_CELL_W = MIN_CELL_W;
  QC.MIN_CELL_H = MIN_CELL_H;
  QC.LABEL_W = LABEL_W;
  QC.renderCircuit = renderCircuit;
  QC.drawConnectors = drawConnectors;
})(typeof window !== 'undefined' ? window : global);
