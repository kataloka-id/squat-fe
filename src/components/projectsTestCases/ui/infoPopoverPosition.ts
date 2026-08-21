export type Placement = 'top' | 'bottom' | 'left' | 'right';
export type Position = { top: number; left: number; placement: Placement };

const VIEWPORT_PADDING = 12;
const GAP = 8;
const MAX_WIDTH = 360;

export const getPosition = (anchor: DOMRect, panel: DOMRect): Position => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(panel.width || MAX_WIDTH, viewportWidth - VIEWPORT_PADDING * 2);
  const height = panel.height || 1;
  const space = {
    bottom: viewportHeight - anchor.bottom - GAP,
    top: anchor.top - GAP,
    right: viewportWidth - anchor.right - GAP,
    left: anchor.left - GAP,
  };
  const preferred: Placement[] =
    space.bottom >= height
      ? ['bottom', 'top', 'right', 'left']
      : space.top >= height
        ? ['top', 'bottom', 'right', 'left']
        : space.right >= width
          ? ['right', 'left', 'bottom', 'top']
          : space.left >= width
            ? ['left', 'right', 'bottom', 'top']
            : (Object.entries(space)
                .sort(([, a], [, b]) => b - a)
                .map(([side]) => side) as Placement[]);
  const placement = preferred[0];
  const clamp = (value: number, maximum: number) =>
    Math.max(VIEWPORT_PADDING, Math.min(value, maximum));
  if (placement === 'top') {
    return {
      placement,
      top: Math.max(VIEWPORT_PADDING, anchor.top - height - GAP),
      left: clamp(
        anchor.left + (anchor.width - width) / 2,
        viewportWidth - width - VIEWPORT_PADDING,
      ),
    };
  }
  if (placement === 'right') {
    return {
      placement,
      top: clamp(
        anchor.top + (anchor.height - height) / 2,
        viewportHeight - height - VIEWPORT_PADDING,
      ),
      left: Math.min(viewportWidth - width - VIEWPORT_PADDING, anchor.right + GAP),
    };
  }
  if (placement === 'left') {
    return {
      placement,
      top: clamp(
        anchor.top + (anchor.height - height) / 2,
        viewportHeight - height - VIEWPORT_PADDING,
      ),
      left: Math.max(VIEWPORT_PADDING, anchor.left - width - GAP),
    };
  }
  return {
    placement,
    top: Math.min(viewportHeight - height - VIEWPORT_PADDING, anchor.bottom + GAP),
    left: clamp(anchor.left + (anchor.width - width) / 2, viewportWidth - width - VIEWPORT_PADDING),
  };
};

export { MAX_WIDTH, VIEWPORT_PADDING };
