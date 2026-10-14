// Hộp quà 12×12 pixel gốc, phóng theo --px
const ROWS = [
  '...rr..rr...',
  '....rrrr....',
  'rrrrrrrrrrrr',
  'rwwwwrrwwwwr',
  'rrrrrrrrrrrr',
  '.ryyyrryyyr.',
  '.ryyyrryyyr.',
  '.ryyyrryyyr.',
  '.ryyyrryyyr.',
  '.ryyyrryyyr.',
  '.ryyyrryyyr.',
  '.rrrrrrrrrr.',
];
const COLORS: Record<string, string> = { r: '#c8463c', w: '#f6efdc', y: '#f2b84b' };

export function GiftIcon() {
  return (
    <svg class="pixel-icon" viewBox="0 0 12 12" shape-rendering="crispEdges" role="img" aria-label="Hộp quà">
      {ROWS.flatMap((row, y) =>
        [...row].map((c, x) => (c in COLORS ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={COLORS[c]} /> : null)),
      )}
    </svg>
  );
}
