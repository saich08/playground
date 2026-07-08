(function (root) {
  const QC = (root.QC = root.QC || {});

  let circuitRef = null;
  let gridContainerRef = null;
  let onChange = null;
  let pendingLink = null; // { type, col, row, roles: [roleA, roleB] }

  function init(circuit, gridContainer, onChangeCb) {
    circuitRef = circuit;
    gridContainerRef = gridContainer;
    onChange = onChangeCb;
  }

  function setCircuit(circuit) {
    circuitRef = circuit;
    cancelLink();
  }

  function rerender() {
    QC.renderCircuit(circuitRef, gridContainerRef);
    attachCellListeners();
    if (onChange) onChange();
  }

  function cancelLink() {
    if (!pendingLink) return;
    pendingLink = null;
    gridContainerRef.querySelectorAll('.cell.link-target, .cell.link-source').forEach((el) => {
      el.classList.remove('link-target', 'link-source');
    });
    if (QC.hideToast) QC.hideToast();
  }

  function startLink(type, col, row) {
    const def = QC.GATES[type];
    pendingLink = { type, col, row, roles: def.roles };
    highlightLinkTargets();
    if (QC.showToast) {
      QC.showToast(`Click another qubit in this column to complete the ${def.name} gate (Esc to cancel).`, { sticky: true });
    }
  }

  function highlightLinkTargets() {
    if (!pendingLink) return;
    const { col, row } = pendingLink;
    for (let r = 0; r < circuitRef.numQubits; r++) {
      const cellEl = gridContainerRef.querySelector(`.cell[data-row="${r}"][data-col="${col}"]`);
      if (!cellEl) continue;
      if (r === row) {
        cellEl.classList.add('link-source');
      } else if (!circuitRef.columns[col][r]) {
        cellEl.classList.add('link-target');
      }
    }
  }

  function completeLink(targetRow) {
    if (!pendingLink) return;
    const { type, col, row, roles } = pendingLink;
    QC.placeTwo(circuitRef, col, row, targetRow, type, roles[0], roles[1]);
    pendingLink = null;
    if (QC.hideToast) QC.hideToast();
    rerender();
  }

  function handleDragStart(e) {
    const gateType = e.currentTarget.dataset.gate;
    e.dataTransfer.setData('text/plain', gateType);
    e.dataTransfer.effectAllowed = 'copy';
  }

  function handleExistingDragStart(e) {
    const chip = e.currentTarget;
    const cellEl = chip.closest('.cell');
    e.dataTransfer.setData('text/plain', `move:${cellEl.dataset.row}:${cellEl.dataset.col}`);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleCellDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  }

  function handleCellDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
  }

  function handleCellDrop(e) {
    e.preventDefault();
    const cellEl = e.currentTarget;
    cellEl.classList.remove('drag-over');
    const row = parseInt(cellEl.dataset.row, 10);
    const col = parseInt(cellEl.dataset.col, 10);
    const payload = e.dataTransfer.getData('text/plain');
    if (!payload) return;

    if (payload.startsWith('move:')) {
      const parts = payload.split(':');
      const srcRow = parseInt(parts[1], 10);
      const srcCol = parseInt(parts[2], 10);
      if (!QC.canPlaceSingle(circuitRef, col, row) && !(srcRow === row && srcCol === col)) return;
      const cellData = circuitRef.columns[srcCol][srcRow];
      if (!cellData || cellData.role !== 'single') return;
      QC.removeGateAt(circuitRef, srcCol, srcRow);
      QC.placeSingle(circuitRef, col, row, cellData.type, cellData.param);
      cancelLink();
      rerender();
      return;
    }

    const gateType = payload;
    const def = QC.GATES[gateType];
    if (!def) return;

    cancelLink();

    if (def.category === 'two') {
      if (!QC.canPlaceSingle(circuitRef, col, row)) {
        if (QC.showToast) QC.showToast('That qubit already has a gate in this column.');
        return;
      }
      startLink(gateType, col, row);
      return;
    }

    if (!QC.canPlaceSingle(circuitRef, col, row)) {
      if (QC.showToast) QC.showToast('That qubit already has a gate in this column.');
      return;
    }
    const param = def.param ? def.defaultParam : undefined;
    QC.placeSingle(circuitRef, col, row, gateType, param);
    rerender();
  }

  function handleCellClick(e) {
    const cellEl = e.currentTarget;
    const row = parseInt(cellEl.dataset.row, 10);
    const col = parseInt(cellEl.dataset.col, 10);

    if (e.target.dataset.role === 'delete') {
      cancelLink();
      QC.removeGateAt(circuitRef, col, row);
      rerender();
      return;
    }

    if (pendingLink) {
      if (pendingLink.col === col && row !== pendingLink.row && !circuitRef.columns[col][row]) {
        completeLink(row);
      } else {
        cancelLink();
      }
      return;
    }

    const cellData = circuitRef.columns[col][row];
    if (cellData && QC.GATES[cellData.type].param) {
      QC.openAnglePopover(cellEl, circuitRef, col, row, () => rerender());
    }
  }

  function attachCellListeners() {
    gridContainerRef.querySelectorAll('.cell').forEach((cellEl) => {
      cellEl.addEventListener('dragover', handleCellDragOver);
      cellEl.addEventListener('dragleave', handleCellDragLeave);
      cellEl.addEventListener('drop', handleCellDrop);
      cellEl.addEventListener('click', handleCellClick);
      const chip = cellEl.querySelector('.gate-chip[draggable="true"]');
      if (chip) chip.addEventListener('dragstart', handleExistingDragStart);
    });
  }

  function attachPaletteListeners(paletteEls) {
    paletteEls.forEach((el) => {
      el.addEventListener('dragstart', handleDragStart);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      cancelLink();
      if (QC.closeAnglePopover) QC.closeAnglePopover();
    }
  });

  QC.dnd = {
    init,
    setCircuit,
    rerender,
    attachCellListeners,
    attachPaletteListeners,
    cancelLink,
  };
})(typeof window !== 'undefined' ? window : global);
