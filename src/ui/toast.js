(function (root) {
  const QC = (root.QC = root.QC || {});

  let containerEl = null;
  let currentTimeout = null;
  let currentEl = null;

  function ensureContainer() {
    if (containerEl) return containerEl;
    containerEl = document.createElement('div');
    containerEl.id = 'toast-container';
    document.body.appendChild(containerEl);
    return containerEl;
  }

  function showToast(message, opts = {}) {
    const container = ensureContainer();
    if (currentEl) currentEl.remove();
    if (currentTimeout) clearTimeout(currentTimeout);

    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    container.appendChild(el);
    currentEl = el;

    if (!opts.sticky) {
      currentTimeout = setTimeout(() => hideToast(), opts.duration || 3200);
    }
  }

  function hideToast() {
    if (currentEl) {
      currentEl.remove();
      currentEl = null;
    }
    if (currentTimeout) {
      clearTimeout(currentTimeout);
      currentTimeout = null;
    }
  }

  QC.showToast = showToast;
  QC.hideToast = hideToast;
})(typeof window !== 'undefined' ? window : global);
