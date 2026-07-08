(function (root) {
  const QC = (root.QC = root.QC || {});

  let numQubits = 16;
  let circuit = QC.createCircuit(numQubits);

  let gridContainer, resultsPanel, qubitCountEl, shotsInput, examplesMenu, examplesToggle, blochRail, blochRailInner;

  function updateQubitDisplay() {
    qubitCountEl.textContent = numQubits;
  }

  function swapCircuit(newCircuit) {
    circuit = newCircuit;
    QC.dnd.setCircuit(circuit);
  }

  function clampShots() {
    let v = parseInt(shotsInput.value, 10);
    if (Number.isNaN(v)) v = 1024;
    v = Math.max(1, Math.min(100000, v));
    shotsInput.value = v;
    return v;
  }

  // Re-simulates the whole circuit and refreshes every derived view: the
  // results panel, the per-qubit Bloch rail, and any Bloch-snapshot gate
  // chips. Runs on every circuit edit (wired as dnd's onChange below), not
  // just on the Run button, so the display always reflects the live circuit.
  function simulateAndRender() {
    const shots = clampShots();
    const { state, snapshots } = QC.simulateFull(circuit);
    QC.renderResults(circuit, resultsPanel, shots, state);
    QC.renderBlochRail(state, numQubits, blochRailInner);
    QC.refreshSnapshotChips(gridContainer, snapshots);
    updateHash();
  }

  // Keeps the URL hash in sync with the live circuit (replaceState, so every
  // gate edit doesn't spam browser history) — this is what makes a copied
  // URL a shareable link, and what loadStateFromHash() reads back on open.
  function updateHash() {
    const shots = parseInt(shotsInput.value, 10) || 1024;
    const encoded = QC.encodeStateToHash(numQubits, shots, circuit);
    history.replaceState(null, '', `#${encoded}`);
  }

  function applyLoadedState(loaded, toastMessage) {
    numQubits = loaded.numQubits;
    circuit = loaded.circuit;
    QC.dnd.setCircuit(circuit);
    shotsInput.value = loaded.shots;
    updateQubitDisplay();
    QC.dnd.rerender();
    if (toastMessage) QC.showToast(toastMessage);
  }

  function exportCircuit() {
    const payload = QC.serializeState(numQubits, clampShots(), circuit);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quantum-circuit.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    QC.showToast('Circuit exported.');
  }

  function importCircuit(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let loaded = null;
      try {
        loaded = QC.deserializeState(JSON.parse(reader.result));
      } catch {
        loaded = null;
      }
      if (!loaded) {
        QC.showToast('Could not load that file — not a valid circuit export.');
        return;
      }
      applyLoadedState(loaded, 'Circuit loaded.');
    };
    reader.readAsText(file);
  }

  function setNumQubits(n) {
    if (n < QC.MIN_QUBITS || n > QC.MAX_QUBITS) return;
    const wasEmpty = QC.isEmpty(circuit);
    numQubits = n;
    swapCircuit(QC.createCircuit(numQubits));
    updateQubitDisplay();
    QC.dnd.rerender();
    if (!wasEmpty) QC.showToast('Qubit count changed — circuit cleared.');
  }

  function clearCircuit() {
    QC.clearCircuit(circuit);
    QC.dnd.rerender();
    QC.showToast('Circuit cleared.');
  }

  function loadExample(key) {
    const ex = QC.EXAMPLES[key];
    if (!ex) return;
    if (ex.qubits && ex.qubits !== numQubits) {
      numQubits = ex.qubits;
      swapCircuit(QC.createCircuit(numQubits));
    }
    ex.load(circuit);
    updateQubitDisplay();
    QC.dnd.rerender();
    QC.showToast(`Loaded ${ex.name} example.`);
    closeExamplesMenu();
  }

  function openExamplesMenu() {
    examplesMenu.classList.remove('no-display');
  }
  function closeExamplesMenu() {
    examplesMenu.classList.add('no-display');
  }
  function toggleExamplesMenu(e) {
    e.stopPropagation();
    examplesMenu.classList.contains('no-display') ? openExamplesMenu() : closeExamplesMenu();
  }

  function init() {
    gridContainer = document.getElementById('circuit-scroll');
    resultsPanel = document.getElementById('results-panel');
    qubitCountEl = document.getElementById('qubit-count');
    shotsInput = document.getElementById('shots-input');
    examplesMenu = document.getElementById('examples-menu');
    examplesToggle = document.getElementById('examples-toggle');
    blochRail = document.getElementById('bloch-rail');
    blochRailInner = document.getElementById('bloch-rail-inner');

    // A circuit embedded in the URL hash (via updateHash(), below) takes
    // priority over the default empty circuit, so opening a shared link
    // reproduces the circuit it was copied from.
    const loadedFromUrl = QC.decodeStateFromHash(window.location.hash);
    if (loadedFromUrl) {
      numQubits = loadedFromUrl.numQubits;
      circuit = loadedFromUrl.circuit;
      shotsInput.value = loadedFromUrl.shots;
    }

    // Keep the Bloch rail's rows lined up with the circuit's wires as either
    // side is scrolled vertically.
    let syncingScroll = false;
    gridContainer.addEventListener('scroll', () => {
      if (syncingScroll) return;
      syncingScroll = true;
      blochRail.scrollTop = gridContainer.scrollTop;
      syncingScroll = false;
    });
    blochRail.addEventListener('scroll', () => {
      if (syncingScroll) return;
      syncingScroll = true;
      gridContainer.scrollTop = blochRail.scrollTop;
      syncingScroll = false;
    });

    document.getElementById('qubit-inc').addEventListener('click', () => setNumQubits(numQubits + 1));
    document.getElementById('qubit-dec').addEventListener('click', () => setNumQubits(numQubits - 1));
    document.getElementById('clear-btn').addEventListener('click', clearCircuit);
    document.getElementById('export-btn').addEventListener('click', exportCircuit);
    const importInput = document.getElementById('import-input');
    document.getElementById('import-btn').addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', () => {
      if (importInput.files[0]) importCircuit(importInput.files[0]);
      importInput.value = '';
    });
    shotsInput.addEventListener('change', updateHash);
    examplesToggle.addEventListener('click', toggleExamplesMenu);
    document.addEventListener('click', () => closeExamplesMenu());
    examplesMenu.addEventListener('click', (e) => e.stopPropagation());
    examplesMenu.querySelectorAll('[data-example]').forEach((item) => {
      item.addEventListener('click', () => loadExample(item.dataset.example));
    });

    const paletteButtons = Array.from(document.querySelectorAll('.quantum-gate[data-gate]'));
    QC.dnd.attachPaletteListeners(paletteButtons);

    // Passing simulateAndRender as the onChange callback means every circuit
    // edit (place/move/remove a gate, complete a two-qubit link, adjust an
    // angle) automatically re-simulates and re-renders — no manual Run needed.
    QC.dnd.init(circuit, gridContainer, simulateAndRender);
    QC.dnd.rerender();
    updateQubitDisplay();
    if (loadedFromUrl) QC.showToast('Loaded circuit from URL.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : global);
