/**
 * Narrow-layout switch measured from the page's real width.
 *
 * DingTalk's split pane on a foldable lays the page out ~390px wide while `@media (max-width: 959px)`
 * still evaluates false, so the 242px sidebar stayed fixed and squeezed the content to one character
 * per line. Layout-critical breakpoints therefore key off these classes instead of media queries.
 */
export const NARROW_MAX = 959;
export const COMPACT_MAX = 760;

export function applyViewportClasses(root: HTMLElement, width: number): void {
  root.classList.toggle("zy-narrow", width <= NARROW_MAX);
  root.classList.toggle("zy-compact", width <= COMPACT_MAX);
}

export function watchViewportWidth(root: HTMLElement = document.documentElement): void {
  const update = () => applyViewportClasses(root, root.clientWidth || window.innerWidth);
  update();
  window.addEventListener("resize", update);
  window.visualViewport?.addEventListener("resize", update);
}
