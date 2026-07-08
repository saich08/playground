(function (root) {
  const QC = (root.QC = root.QC || {});

  function loadSuperposition(circuit) {
    QC.clearCircuit(circuit);
    for (let r = 0; r < circuit.numQubits; r++) QC.placeSingle(circuit, 0, r, 'H');
  }

  // q0 = message qubit, q1 = Alice's half of the Bell pair, q2 = Bob's half.
  // The message is a fresh Haar-random state each run (RANDOM), so the demo
  // proves teleportation for an arbitrary unknown state, not a fixed one —
  // and the two SNAPSHOTs (q0 right after prep, q2 at the very end) let you
  // compare them directly. This simulator only evolves a pure statevector
  // (MEASURE is a visual marker and never collapses it — see simulator.js),
  // so the classically-controlled X/Z corrections are applied coherently as
  // CNOT/CZ instead of after a real measurement; the principle of deferred
  // measurement guarantees this lands q2 on the same Bloch vector q0 started
  // with.
  function loadTeleportation(circuit) {
    QC.clearCircuit(circuit);
    QC.placeSingle(circuit, 0, 0, 'RANDOM');
    QC.placeSingle(circuit, 1, 0, 'SNAPSHOT');
    QC.placeSingle(circuit, 2, 1, 'H');
    QC.placeTwo(circuit, 3, 1, 2, 'CNOT', 'control', 'target');
    QC.placeTwo(circuit, 4, 0, 1, 'CNOT', 'control', 'target');
    QC.placeSingle(circuit, 5, 0, 'H');
    QC.placeSingle(circuit, 6, 0, 'MEASURE');
    QC.placeSingle(circuit, 6, 1, 'MEASURE');
    QC.placeTwo(circuit, 7, 1, 2, 'CNOT', 'control', 'target');
    QC.placeTwo(circuit, 8, 0, 2, 'CZ', 'a', 'b');
    QC.placeSingle(circuit, 9, 2, 'SNAPSHOT');
  }

  QC.EXAMPLES = {
    superposition: { key: 'superposition', name: 'Superposition (All H)', qubits: null, load: loadSuperposition },
    teleportation: { key: 'teleportation', name: 'Teleportation (3-qubit)', qubits: 3, load: loadTeleportation },
  };
})(typeof window !== 'undefined' ? window : global);
