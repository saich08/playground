(function (root) {
  const QC = (root.QC = root.QC || {});

  let popoverEl = null;
  let outsideHandler = null;

  function ensurePopover() {
    if (popoverEl) return popoverEl;
    popoverEl = document.createElement('div');
    popoverEl.className = 'angle-popover no-display';
    popoverEl.innerHTML = `
      <div class="angle-popover-title"></div>
      <input type="range" class="custom-range angle-range" min="0" max="6.2832" step="0.0157" />
      <div class="angle-value"></div>
    `;
    document.body.appendChild(popoverEl);
    return popoverEl;
  }

  function closePopover() {
    if (!popoverEl) return;
    popoverEl.classList.add('no-display');
    if (outsideHandler) {
      document.removeEventListener('mousedown', outsideHandler, true);
      outsideHandler = null;
    }
  }

  function openAnglePopover(anchorEl, circuit, col, row, onUpdate) {
    const pop = ensurePopover();
    const cell = circuit.columns[col][row];
    const def = QC.GATES[cell.type];
    const title = pop.querySelector('.angle-popover-title');
    const range = pop.querySelector('.angle-range');
    const valueLabel = pop.querySelector('.angle-value');

    title.textContent = `${def.name} — θ`;
    range.value = cell.param;
    const updateLabel = () => {
      valueLabel.textContent = `${(range.value / Math.PI).toFixed(2)}π rad`;
    };
    updateLabel();

    range.oninput = () => {
      QC.setParam(circuit, col, row, parseFloat(range.value));
      updateLabel();
      onUpdate();
    };

    pop.classList.remove('no-display');
    const rect = anchorEl.getBoundingClientRect();
    pop.style.left = `${Math.min(rect.left, window.innerWidth - 240)}px`;
    pop.style.top = `${rect.bottom + 8 + window.scrollY}px`;

    if (outsideHandler) document.removeEventListener('mousedown', outsideHandler, true);
    outsideHandler = (e) => {
      if (!pop.contains(e.target) && e.target !== anchorEl) closePopover();
    };
    setTimeout(() => document.addEventListener('mousedown', outsideHandler, true), 0);
  }

  QC.openAnglePopover = openAnglePopover;
  QC.closeAnglePopover = closePopover;
})(typeof window !== 'undefined' ? window : global);
