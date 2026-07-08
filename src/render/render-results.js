(function (root) {
  const QC = (root.QC = root.QC || {});
  const MAX_SHOWN = 32;

  function bitLabel(i, n) {
    return `|${i.toString(2).padStart(n, '0')}⟩`;
  }

  function buildBarSection(title, entries, totalCount, labelFn) {
    const section = document.createElement('div');
    section.className = 'results-section';

    const h = document.createElement('div');
    h.className = 'results-section-title';
    h.textContent = title;
    section.appendChild(h);

    if (entries.length === 0) {
      const note = document.createElement('div');
      note.className = 'results-note';
      note.textContent = 'No measurable outcomes (empty circuit).';
      section.appendChild(note);
      return section;
    }

    const shown = entries.slice(0, MAX_SHOWN);
    const maxV = shown[0].v;

    const list = document.createElement('div');
    list.className = 'bar-list';
    shown.forEach((entry) => {
      const { v, i } = entry;
      const row = document.createElement('div');
      row.className = 'bar-row';

      const label = document.createElement('span');
      label.className = 'bar-label';
      label.textContent = bitLabel(i, entries.n);

      const track = document.createElement('span');
      track.className = 'bar-track';
      const fill = document.createElement('span');
      fill.className = 'bar-fill';
      fill.style.width = `${maxV > 0 ? (v / maxV) * 100 : 0}%`;
      track.appendChild(fill);

      const val = document.createElement('span');
      val.className = 'bar-value';
      val.textContent = labelFn(entry);

      row.append(label, track, val);
      list.appendChild(row);
    });
    section.appendChild(list);

    if (entries.length > shown.length) {
      const note = document.createElement('div');
      note.className = 'results-note';
      note.textContent = `Showing top ${shown.length} of ${entries.length} non-negligible outcomes (${totalCount} possible).`;
      section.appendChild(note);
    }
    return section;
  }

  function buildStateTable(state, n) {
    const section = document.createElement('div');
    section.className = 'results-section';
    const h = document.createElement('div');
    h.className = 'results-section-title';
    h.textContent = 'State Vector';
    section.appendChild(h);

    const nonzero = state
      .map((amp, i) => ({ amp, i }))
      .filter(({ amp }) => !amp.isNegligible())
      .sort((a, b) => b.amp.abs2() - a.amp.abs2());
    const shown = nonzero.slice(0, MAX_SHOWN);

    const table = document.createElement('div');
    table.className = 'state-table';
    shown.forEach(({ amp, i }) => {
      const row = document.createElement('div');
      row.className = 'state-row';
      const label = document.createElement('span');
      label.className = 'state-label-cell';
      label.textContent = bitLabel(i, n);
      const val = document.createElement('span');
      val.className = 'state-value-cell';
      val.textContent = amp.toString(4);
      const prob = document.createElement('span');
      prob.className = 'state-prob-cell';
      prob.textContent = `${(amp.abs2() * 100).toFixed(2)}%`;
      row.append(label, val, prob);
      table.appendChild(row);
    });
    section.appendChild(table);

    if (nonzero.length > shown.length) {
      const note = document.createElement('div');
      note.className = 'results-note';
      note.textContent = `Showing top ${shown.length} of ${nonzero.length} non-zero amplitudes.`;
      section.appendChild(note);
    }
    return section;
  }

  function renderResults(circuit, container, shots, precomputedState) {
    const n = circuit.numQubits;
    const state = precomputedState || QC.simulate(circuit);
    const probs = QC.probabilities(state);
    const N = probs.length;

    container.innerHTML = '';

    const summary = document.createElement('div');
    summary.className = 'results-summary';
    summary.textContent = `${n} qubit${n > 1 ? 's' : ''} · ${N} basis state${N > 1 ? 's' : ''} · ${shots} shots`;
    container.appendChild(summary);

    const probEntries = probs
      .map((v, i) => ({ v, i }))
      .filter(({ v }) => v > 1e-9)
      .sort((a, b) => b.v - a.v);
    probEntries.n = n;
    container.appendChild(
      buildBarSection('Measurement Probabilities (exact)', probEntries, N, ({ v }) => `${(v * 100).toFixed(2)}%`)
    );

    const counts = QC.sampleShots(probs, shots);
    const countEntries = counts
      .map((cnt, i) => ({ v: cnt / shots, i, cnt }))
      .filter(({ cnt }) => cnt > 0)
      .sort((a, b) => b.v - a.v);
    countEntries.n = n;
    container.appendChild(
      buildBarSection(`Shots Histogram (${shots} shots)`, countEntries, N, ({ v, cnt }) => `${cnt} (${(v * 100).toFixed(1)}%)`)
    );

    container.appendChild(buildStateTable(state, n));
  }

  QC.renderResults = renderResults;
})(typeof window !== 'undefined' ? window : global);
