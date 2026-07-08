(function (root) {
  const QC = (root.QC = root.QC || {});
  const { Complex } = QC;
  const c = (re, im = 0) => new Complex(re, im);
  const SQRT1_2 = 1 / Math.sqrt(2);

  // Each single/rotation gate exposes matrix() -> 2x2 array of Complex.
  // Two-qubit gates (category 'two') are handled directly by the simulator
  // via bit manipulation, so no matrix is defined here.
  const GATES = {
    H: {
      id: 'H', label: 'H', name: 'Hadamard', category: 'single',
      matrix: () => [[c(SQRT1_2), c(SQRT1_2)], [c(SQRT1_2), c(-SQRT1_2)]],
    },
    X: {
      id: 'X', label: 'X', name: 'Pauli-X', category: 'single',
      matrix: () => [[c(0), c(1)], [c(1), c(0)]],
    },
    Y: {
      id: 'Y', label: 'Y', name: 'Pauli-Y', category: 'single',
      matrix: () => [[c(0), c(0, -1)], [c(0, 1), c(0)]],
    },
    Z: {
      id: 'Z', label: 'Z', name: 'Pauli-Z', category: 'single',
      matrix: () => [[c(1), c(0)], [c(0), c(-1)]],
    },
    S: {
      id: 'S', label: 'S', name: 'Phase (S)', category: 'single',
      matrix: () => [[c(1), c(0)], [c(0), c(0, 1)]],
    },
    Sdg: {
      id: 'Sdg', label: 'S†', name: 'S Dagger', category: 'single',
      matrix: () => [[c(1), c(0)], [c(0), c(0, -1)]],
    },
    T: {
      id: 'T', label: 'T', name: 'T (π/8)', category: 'single',
      matrix: () => [[c(1), c(0)], [c(0), c(Math.cos(Math.PI / 4), Math.sin(Math.PI / 4))]],
    },
    Tdg: {
      id: 'Tdg', label: 'T†', name: 'T Dagger', category: 'single',
      matrix: () => [[c(1), c(0)], [c(0), c(Math.cos(-Math.PI / 4), Math.sin(-Math.PI / 4))]],
    },
    RX: {
      id: 'RX', label: 'RX', name: 'Rotation-X', category: 'rotation', param: true, defaultParam: Math.PI / 2,
      matrix: (t) => [
        [c(Math.cos(t / 2)), c(0, -Math.sin(t / 2))],
        [c(0, -Math.sin(t / 2)), c(Math.cos(t / 2))],
      ],
    },
    RY: {
      id: 'RY', label: 'RY', name: 'Rotation-Y', category: 'rotation', param: true, defaultParam: Math.PI / 2,
      matrix: (t) => [
        [c(Math.cos(t / 2)), c(-Math.sin(t / 2))],
        [c(Math.sin(t / 2)), c(Math.cos(t / 2))],
      ],
    },
    RZ: {
      id: 'RZ', label: 'RZ', name: 'Rotation-Z', category: 'rotation', param: true, defaultParam: Math.PI / 2,
      matrix: (t) => [
        [c(Math.cos(-t / 2), Math.sin(-t / 2)), c(0)],
        [c(0), c(Math.cos(t / 2), Math.sin(t / 2))],
      ],
    },
    CNOT: {
      id: 'CNOT', label: 'CNOT', name: 'Controlled-NOT', category: 'two', arity: 2,
      roles: ['control', 'target'],
    },
    CZ: {
      id: 'CZ', label: 'CZ', name: 'Controlled-Z', category: 'two', arity: 2,
      roles: ['a', 'b'],
    },
    SWAP: {
      id: 'SWAP', label: 'SWAP', name: 'Swap', category: 'two', arity: 2,
      roles: ['a', 'b'],
    },
    MEASURE: {
      id: 'MEASURE', label: 'M', name: 'Measure (Z)', category: 'measure', arity: 1,
    },
    RANDOM: {
      id: 'RANDOM', label: 'R?', name: 'Random State Prep', category: 'single',
      // Fresh Haar-random single-qubit unitary sampled on every simulation run,
      // so applying it to |0> lands on a uniformly random point of the Bloch
      // sphere: z = cos(theta) uniform via theta = acos(1 - 2u), phi uniform.
      matrix: () => {
        const theta = Math.acos(1 - 2 * Math.random());
        const phi = 2 * Math.PI * Math.random();
        const alpha = c(Math.cos(theta / 2));
        const beta = c(Math.cos(phi) * Math.sin(theta / 2), Math.sin(phi) * Math.sin(theta / 2));
        return [
          [alpha, beta.conj().scale(-1)],
          [beta, alpha],
        ];
      },
    },
    SNAPSHOT: {
      id: 'SNAPSHOT', label: '◎', name: 'Bloch Snapshot', category: 'snapshot', arity: 1,
    },
  };

  const GATE_ORDER = {
    single: ['H', 'X', 'Y', 'Z', 'S', 'Sdg', 'T', 'Tdg', 'RANDOM'],
    rotation: ['RX', 'RY', 'RZ'],
    two: ['CNOT', 'CZ', 'SWAP'],
    measure: ['MEASURE'],
    diagnostic: ['SNAPSHOT'],
  };

  QC.GATES = GATES;
  QC.GATE_ORDER = GATE_ORDER;
})(typeof window !== 'undefined' ? window : global);
