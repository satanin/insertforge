/** Presentation only: equal-width action rows and bounded type fitting. Never touches the canvas. */
export function harmonizeControls(root: HTMLElement, _preference?: string) {
  const rowSelector = '.shelfEditor .actions, .shelfEditor .viewNavigation, .openingView footer .actions, .panelContent .actions, .inventoryDialog .actions';
  let frame = 0;
  let destroyed = false;
  const observed = new Set<Element>();
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(fit); };
  const resize = new ResizeObserver(schedule);
  function fit() {
    if (destroyed) return;
    if (!root.classList.contains('ui-modern')) {
      root.querySelectorAll<HTMLElement>('[data-ui-actions]').forEach(row => { delete row.dataset.uiActions; delete row.dataset.uiStack; row.style.removeProperty('--ui-action-font'); });
      root.querySelectorAll<HTMLElement>('[data-ui-measure]').forEach(measure => measure.style.removeProperty('font-size'));
      return;
    }
    const rows = [...root.querySelectorAll<HTMLElement>(rowSelector)];
    const measures = [...root.querySelectorAll<HTMLElement>('[data-ui-measure]')];
    const current = new Set<Element>([root, ...rows, ...measures]);
    for (const old of observed) if (!current.has(old)) { resize.unobserve(old); observed.delete(old); }
    for (const element of current) if (!observed.has(element)) { resize.observe(element); observed.add(element); }
    for (const row of rows) {
      const buttons = [...row.children].filter((element): element is HTMLButtonElement => element instanceof HTMLButtonElement);
      if (!buttons.length || !row.getBoundingClientRect().width) continue;
      row.dataset.uiActions = '';
      delete row.dataset.uiStack;
      row.style.removeProperty('--ui-action-font');
      const style = getComputedStyle(buttons[0]);
      const base = parseFloat(style.fontSize);
      const gap = parseFloat(getComputedStyle(row).columnGap) || 8;
      const available = (row.clientWidth - gap * (buttons.length - 1)) / buttons.length;
      const fits = (button: HTMLButtonElement, width: number, size: number) => {
        if (!context) return true;
        const computed = getComputedStyle(button);
        context.font = `${computed.fontWeight} ${size}px ${computed.fontFamily}`;
        const icons = [...button.querySelectorAll('svg')].reduce((sum, svg) => sum + svg.getBoundingClientRect().width + 6, 0);
        return context.measureText(button.textContent?.trim() ?? '').width + icons
          + parseFloat(computed.paddingLeft) + parseFloat(computed.paddingRight) + 2 <= width;
      };
      let size = base;
      while (size > 12 && !buttons.every(button => fits(button, available, size))) size = Math.max(12, size - 0.5);
      const stack = !buttons.every(button => fits(button, available, size));
      if (stack) { row.dataset.uiStack = ''; size = base; }
      row.style.setProperty('--ui-action-font', `${size}px`);
    }
    for (const measure of measures) {
      if (!measure.clientWidth || !context) continue;
      measure.style.removeProperty('font-size');
      const style = getComputedStyle(measure);
      let size = parseFloat(style.fontSize);
      const text = measure.textContent?.trim() ?? '';
      const width = () => { context.font = `${style.fontWeight} ${size}px ${style.fontFamily}`; return context.measureText(text).width; };
      while (size > 12 && width() > measure.clientWidth) size = Math.max(12, size - 0.5);
      measure.style.fontSize = `${size}px`;
    }
  }
  const mutation = new MutationObserver(schedule);
  mutation.observe(root, { childList: true, subtree: true, characterData: true });
  resize.observe(root); observed.add(root);
  schedule();
  return {
    update(_preference?: string) { schedule(); },
    destroy() { destroyed = true; cancelAnimationFrame(frame); mutation.disconnect(); resize.disconnect(); }
  };
}
