(function (root) {
  const QC = (root.QC = root.QC || {});
  const { Complex } = QC;

  function initState(n) {
    const N = 1 << n;
    const state = new Array(N);
    for (let i = 0; i < N; i++) state[i] = new Complex(0, 0);
    state[0] = new Complex(1, 0);
    return state;
  }

  // Row 0 is the top qubit and is treated as the most-significant bit,
  // so basis-state labels read top-to-bottom left-to-right (e.g. |q0 q1 q2>).
  function bitPos(n, row) {
    return n - 1 - row;
  }

  function applySingleQubitGate(state, n, row, m) {
    const N = state.length;
    const mask = 1 << bitPos(n, row);
    const newState = new Array(N);
    for (let i = 0; i < N; i++) {
      if ((i & mask) === 0) {
        const j = i | mask;
        const a0 = state[i];
        const a1 = state[j];
        newState[i] = m[0][0].mul(a0).add(m[0][1].mul(a1));
        newState[j] = m[1][0].mul(a0).add(m[1][1].mul(a1));
      }
    }
    return newState;
  }

  function applyCNOT(state, n, controlRow, targetRow) {
    const N = state.length;
    const cMask = 1 << bitPos(n, controlRow);
    const tMask = 1 << bitPos(n, targetRow);
    const newState = new Array(N);
    for (let i = 0; i < N; i++) {
      const j = (i & cMask) ? (i ^ tMask) : i;
      newState[j] = state[i];
    }
    return newState;
  }

  function applyCZ(state, n, aRow, bRow) {
    const N = state.length;
    const aMask = 1 << bitPos(n, aRow);
    const bMask = 1 << bitPos(n, bRow);
    const newState = new Array(N);
    for (let i = 0; i < N; i++) {
      newState[i] = ((i & aMask) && (i & bMask)) ? state[i].scale(-1) : state[i];
    }
    return newState;
  }

  function applySwap(state, n, aRow, bRow) {
    const N = state.length;
    const aMask = 1 << bitPos(n, aRow);
    const bMask = 1 << bitPos(n, bRow);
    const newState = new Array(N);
    for (let i = 0; i < N; i++) {
      const aBit = (i & aMask) ? 1 : 0;
      const bBit = (i & bMask) ? 1 : 0;
      const j = (aBit !== bBit) ? (i ^ aMask ^ bMask) : i;
      newState[j] = state[i];
    }
    return newState;
  }

  // Runs the full circuit column-by-column, recording a Bloch-vector snapshot
  // for every SNAPSHOT marker as of the point it's reached (i.e. after all
  // gates in its own column have been applied). Returns both the final
  // statevector and the list of snapshots.
  function simulateFull(circuit) {
    const GATES = QC.GATES;
    const n = circuit.numQubits;
    let state = initState(n);
    const snapshots = [];

    for (let col = 0; col < circuit.columns.length; col++) {
      const column = circuit.columns[col];
      const handled = new Set();
      for (let row = 0; row < n; row++) {
        const cell = column[row];
        if (!cell || handled.has(cell.instanceId)) continue;
        handled.add(cell.instanceId);

        const def = GATES[cell.type];
        if (def.category === 'single') {
          state = applySingleQubitGate(state, n, row, def.matrix());
        } else if (def.category === 'rotation') {
          state = applySingleQubitGate(state, n, row, def.matrix(cell.param));
        } else if (cell.type === 'CNOT') {
          const controlRow = cell.role === 'control' ? row : cell.partnerRow;
          const targetRow = cell.role === 'control' ? cell.partnerRow : row;
          state = applyCNOT(state, n, controlRow, targetRow);
        } else if (cell.type === 'CZ') {
          state = applyCZ(state, n, row, cell.partnerRow);
        } else if (cell.type === 'SWAP') {
          state = applySwap(state, n, row, cell.partnerRow);
        }
        // MEASURE/SNAPSHOT are visual markers only; they don't alter the statevector.
      }

      for (let row = 0; row < n; row++) {
        const cell = column[row];
        if (cell && cell.type === 'SNAPSHOT') {
          snapshots.push({ instanceId: cell.instanceId, row, col, vec: blochVector(state, n, row) });
        }
      }
    }
    return { state, snapshots };
  }

  // Runs the full circuit column-by-column and returns the final statevector.
  function simulate(circuit) {
    return simulateFull(circuit).state;
  }

  function probabilities(state) {
    return state.map((amp) => amp.abs2());
  }

  // Reduced single-qubit Bloch vector (x, y, z) for the given row, obtained
  // by tracing out every other qubit from the full statevector:
  //   rho00 = P(qubit=0), rho11 = P(qubit=1), rho01 = sum psi(0,rest) * conj(psi(1,rest))
  //   x = 2*Re(rho01), y = -2*Im(rho01), z = rho00 - rho11
  // |r| < 1 whenever the qubit is entangled with (or classically mixed with) the rest.
  function blochVector(state, n, row) {
    const mask = 1 << bitPos(n, row);
    let rho00 = 0;
    let rho11 = 0;
    let reRho01 = 0;
    let imRho01 = 0;
    for (let i = 0; i < state.length; i++) {
      if ((i & mask) !== 0) continue;
      const a0 = state[i];
      const a1 = state[i | mask];
      rho00 += a0.abs2();
      rho11 += a1.abs2();
      reRho01 += a0.re * a1.re + a0.im * a1.im;
      imRho01 += a0.im * a1.re - a0.re * a1.im;
    }
    return { x: 2 * reRho01, y: -2 * imRho01, z: rho00 - rho11 };
  }

  function blochVectors(state, n) {
    const vecs = new Array(n);
    for (let row = 0; row < n; row++) vecs[row] = blochVector(state, n, row);
    return vecs;
  }

  // Weighted random sampling of `shots` measurement outcomes from exact probabilities.
  function sampleShots(probs, shots) {
    const counts = new Array(probs.length).fill(0);
    const cumulative = new Array(probs.length);
    let acc = 0;
    for (let i = 0; i < probs.length; i++) {
      acc += probs[i];
      cumulative[i] = acc;
    }
    for (let s = 0; s < shots; s++) {
      const r = Math.random() * acc;
      let lo = 0;
      let hi = cumulative.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cumulative[mid] < r) lo = mid + 1;
        else hi = mid;
      }
      counts[lo]++;
    }
    return counts;
  }

  QC.initState = initState;
  QC.simulate = simulate;
  QC.simulateFull = simulateFull;
  QC.probabilities = probabilities;
  QC.sampleShots = sampleShots;
  QC.blochVector = blochVector;
  QC.blochVectors = blochVectors;
})(typeof window !== 'undefined' ? window : global);
