// Panel layouts for the collage grid. Each layout is a tree of rows and columns drawn for a landscape cover;
// for a portrait cover the tree is transposed (rows become columns) so the panels keep their character.
// A leaf is a panel number, or 'T' for the title tile where the lettering lockup sits on a painted sunset.

const row = (...parts) => ({ dir: 'row', parts });
const col = (...parts) => ({ dir: 'col', parts });

/** Every layout the studio offers, in the order the layout picker shows them. */
export const PANEL_LAYOUTS = [
  {
    id: 'trio', name: 'Trio', panels: 3,
    tree: row([1.3, 0], [1, col([1.1, 1], [1, 2])]),
  },
  {
    id: 'quad-mosaic', name: 'Quad Mosaic', panels: 4,
    tree: col([1.15, row([1.7, 0], [1, 1])], [1, row([1, 2], [1.55, 3])]),
  },
  {
    id: 'five-spread', name: 'Five Spread', panels: 5,
    tree: row([1, col([1.25, 0], [1, 1])], [1.2, 2], [1, col([1, 3], [1.35, 4])]),
  },
  {
    id: 'six-stagger', name: 'Six Stagger', panels: 6,
    tree: col([1, row([1.35, 0], [1, 1], [1.1, 2])], [1.05, row([1, 3], [1.25, 4], [1.15, 5])]),
  },
  {
    id: 'seven-classic', name: 'Seven Classic', panels: 7,
    tree: row(
      [1, col([1.2, 0], [1, 1])],
      [1.45, col([1, row([1.3, 2], [1, 3])], [1.25, 4])],
      [1, col([1, 5], [1.3, 6])],
    ),
  },
  {
    id: 'eight-poster', name: 'Eight Poster', panels: 8,
    tree: col(
      [1, row([1, 0], [1.5, 1], [1, 2])],
      [1.1, row([1.4, 3], [1, 4], [1.2, 5])],
      [0.9, row([1.2, 6], [1, 7])],
    ),
  },
  {
    id: 'hero-strip', name: 'Hero + Strip', panels: 4,
    tree: row([2.3, 0], [1, col([1, 1], [1, 2], [1, 3])]),
  },
  {
    id: 'title-tile-six', name: 'Title Tile', panels: 6,
    tree: col(
      [1.1, row([1, 0], [1.35, 1], [1, 2])],
      [0.85, row([1, 3], [2.1, 'T'], [1, 4])],
      [0.75, row([1, 5])],
    ),
  },
];

/** Finds a layout by id, falling back to the classic seven-panel grid. */
export function findLayout(id) {
  return PANEL_LAYOUTS.find((layout) => layout.id === id) ?? PANEL_LAYOUTS[4];
}

/** Swaps rows and columns all the way down, turning a landscape layout into its portrait twin. */
export function transposeLayoutTree(node) {
  if (typeof node !== 'object') return node;
  return { dir: node.dir === 'row' ? 'col' : 'row', parts: node.parts.map(([w, kid]) => [w, transposeLayoutTree(kid)]) };
}

/**
 * Cuts the rectangle (x, y, w, h) into panel rectangles following the layout tree, leaving `gutter` pixels
 * between neighbours. Returns [{ id, x, y, w, h }] with whole-pixel edges so gutters stay crisp.
 */
export function computePanelRects(node, x, y, w, h, gutter) {
  if (typeof node !== 'object') return [{ id: node, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) }];
  const horizontal = node.dir === 'row';
  const total = node.parts.reduce((sum, [weight]) => sum + weight, 0);
  const span = (horizontal ? w : h) - gutter * (node.parts.length - 1);
  const rects = [];
  let cursor = horizontal ? x : y;
  for (const [weight, kid] of node.parts) {
    const size = (span * weight) / total;
    const start = Math.round(cursor);
    const end = Math.round(cursor + size);
    rects.push(...(horizontal
      ? computePanelRects(kid, start, y, end - start, h, gutter)
      : computePanelRects(kid, x, start, w, end - start, gutter)));
    cursor += size + gutter;
  }
  return rects;
}

/** The panel rectangles of a layout for a cover of the given size, with an outer border as wide as a gutter. */
export function layoutPanelsForCover(layout, width, height, gutterRatio) {
  const gutter = Math.max(2, Math.round(Math.min(width, height) * gutterRatio));
  const tree = height > width * 1.08 ? transposeLayoutTree(layout.tree) : layout.tree;
  return { gutter, rects: computePanelRects(tree, gutter, gutter, width - gutter * 2, height - gutter * 2, gutter) };
}
