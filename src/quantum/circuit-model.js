(function (root) {
  const QC = (root.QC = root.QC || {});

  const MAX_COLUMNS = 16;
  const MIN_QUBITS = 1;
  const MAX_QUBITS = 16;

  function createCircuit(numQubits) {
    return {
      numQubits,
      columns: Array.from({ length: MAX_COLUMNS }, () => new Array(numQubits).fill(null)),
      nextInstanceId: 1,
    };
  }

  function canPlaceSingle(circuit, col, row) {
    return !circuit.columns[col][row];
  }

  function placeSingle(circuit, col, row, type, param) {
    if (!canPlaceSingle(circuit, col, row)) return false;
    const instanceId = circuit.nextInstanceId++;
    circuit.columns[col][row] = { instanceId, type, role: 'single', param };
    return true;
  }

  function canPlaceTwo(circuit, col, rowA, rowB) {
    if (rowA === rowB) return false;
    return !circuit.columns[col][rowA] && !circuit.columns[col][rowB];
  }

  function placeTwo(circuit, col, rowA, rowB, type, roleA, roleB) {
    if (!canPlaceTwo(circuit, col, rowA, rowB)) return false;
    const instanceId = circuit.nextInstanceId++;
    circuit.columns[col][rowA] = { instanceId, type, role: roleA, partnerRow: rowB };
    circuit.columns[col][rowB] = { instanceId, type, role: roleB, partnerRow: rowA };
    return true;
  }

  function removeGateAt(circuit, col, row) {
    const cell = circuit.columns[col][row];
    if (!cell) return;
    const { instanceId } = cell;
    for (let r = 0; r < circuit.numQubits; r++) {
      const c = circuit.columns[col][r];
      if (c && c.instanceId === instanceId) circuit.columns[col][r] = null;
    }
  }

  function setParam(circuit, col, row, param) {
    const cell = circuit.columns[col][row];
    if (cell) cell.param = param;
  }

  function clearCircuit(circuit) {
    for (let c = 0; c < MAX_COLUMNS; c++) {
      circuit.columns[c] = new Array(circuit.numQubits).fill(null);
    }
    circuit.nextInstanceId = 1;
  }

  function isEmpty(circuit) {
    return circuit.columns.every((col) => col.every((cell) => !cell));
  }

  QC.MAX_COLUMNS = MAX_COLUMNS;
  QC.MIN_QUBITS = MIN_QUBITS;
  QC.MAX_QUBITS = MAX_QUBITS;
  QC.createCircuit = createCircuit;
  QC.canPlaceSingle = canPlaceSingle;
  QC.placeSingle = placeSingle;
  QC.canPlaceTwo = canPlaceTwo;
  QC.placeTwo = placeTwo;
  QC.removeGateAt = removeGateAt;
  QC.setParam = setParam;
  QC.clearCircuit = clearCircuit;
  QC.isEmpty = isEmpty;
})(typeof window !== 'undefined' ? window : global);
