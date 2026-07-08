(function (root) {
  const QC = (root.QC = root.QC || {});

  // Flattens the circuit's null-filled column grid down to just the placed
  // gates — much smaller than the raw grid, which matters once this gets
  // embedded in a URL hash. Two-qubit gates occupy two cells sharing one
  // instanceId; only the first cell encountered emits an entry.
  function circuitToCells(circuit) {
    const cells = [];
    const seen = new Set();
    for (let col = 0; col < circuit.columns.length; col++) {
      const column = circuit.columns[col];
      for (let row = 0; row < circuit.numQubits; row++) {
        const cell = column[row];
        if (!cell || seen.has(cell.instanceId)) continue;
        seen.add(cell.instanceId);
        if (cell.role === 'single') {
          const entry = { col, row, type: cell.type };
          if (cell.param !== undefined) entry.param = cell.param;
          cells.push(entry);
        } else {
          const partner = column[cell.partnerRow];
          cells.push({
            col, row, type: cell.type,
            partnerRow: cell.partnerRow,
            role: cell.role,
            partnerRole: partner.role,
          });
        }
      }
    }
    return cells;
  }

  // Rebuilds a circuit from the flattened cell list. Defensive about
  // malformed input since the URL hash is user-editable: out-of-range
  // positions or unknown gate types are silently skipped rather than
  // thrown, so a bad link degrades to an empty/partial circuit instead of
  // crashing the app.
  function cellsToCircuit(numQubits, cells) {
    const circuit = QC.createCircuit(numQubits);
    cells.forEach((cell) => {
      if (!cell || typeof cell.col !== 'number' || typeof cell.row !== 'number') return;
      const def = QC.GATES[cell.type];
      if (!def) return;
      if (cell.col < 0 || cell.col >= QC.MAX_COLUMNS) return;
      if (cell.row < 0 || cell.row >= numQubits) return;

      if (cell.role === undefined) {
        const param = def.param ? (typeof cell.param === 'number' ? cell.param : def.defaultParam) : undefined;
        QC.placeSingle(circuit, cell.col, cell.row, cell.type, param);
      } else {
        if (typeof cell.partnerRow !== 'number' || cell.partnerRow < 0 || cell.partnerRow >= numQubits) return;
        QC.placeTwo(circuit, cell.col, cell.row, cell.partnerRow, cell.type, cell.role, cell.partnerRole);
      }
    });
    return circuit;
  }

  function serializeState(numQubits, shots, circuit) {
    return { numQubits, shots, gates: circuitToCells(circuit) };
  }

  // Returns null for anything that isn't a well-formed state, so callers can
  // fall back to defaults instead of building a broken circuit.
  function deserializeState(data) {
    if (!data || typeof data !== 'object' || !Array.isArray(data.gates)) return null;
    const numQubits = Number(data.numQubits);
    if (!Number.isInteger(numQubits) || numQubits < QC.MIN_QUBITS || numQubits > QC.MAX_QUBITS) return null;
    const shots = Number(data.shots);
    try {
      const circuit = cellsToCircuit(numQubits, data.gates);
      return { numQubits, shots: Number.isFinite(shots) && shots > 0 ? shots : 1024, circuit };
    } catch {
      return null;
    }
  }

  function encodeStateToHash(numQubits, shots, circuit) {
    return encodeURIComponent(JSON.stringify(serializeState(numQubits, shots, circuit)));
  }

  function decodeStateFromHash(hash) {
    const raw = (hash || '').replace(/^#/, '');
    if (!raw) return null;
    try {
      return deserializeState(JSON.parse(decodeURIComponent(raw)));
    } catch {
      return null;
    }
  }

  QC.serializeState = serializeState;
  QC.deserializeState = deserializeState;
  QC.encodeStateToHash = encodeStateToHash;
  QC.decodeStateFromHash = decodeStateFromHash;
})(typeof window !== 'undefined' ? window : global);
