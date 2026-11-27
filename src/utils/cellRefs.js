export function columnLabel(index) {
  let label = '';
  let n = index + 1;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

export function columnIndex(label) {
  let n = 0;
  for (const char of label.toUpperCase()) {
    n = n * 26 + (char.charCodeAt(0) - 64);
  }
  return n - 1;
}

export function cellId(row, col) {
  return `${columnLabel(col)}${row + 1}`;
}

export function parseCellId(id) {
  const match = /^([A-Z]+)(\d+)$/i.exec(String(id).trim());
  if (!match) return null;
  return { row: parseInt(match[2], 10) - 1, col: columnIndex(match[1]) };
}

export function getRange(anchor, focus) {
  return {
    top: Math.min(anchor.row, focus.row),
    bottom: Math.max(anchor.row, focus.row),
    left: Math.min(anchor.col, focus.col),
    right: Math.max(anchor.col, focus.col),
  };
}

export function isInRange(row, col, range) {
  return row >= range.top && row <= range.bottom && col >= range.left && col <= range.right;
}

export function idsInRange(range) {
  const ids = [];
  for (let row = range.top; row <= range.bottom; row += 1) {
    for (let col = range.left; col <= range.right; col += 1) {
      ids.push(cellId(row, col));
    }
  }
  return ids;
}

export function rangeLabel(range) {
  const start = cellId(range.top, range.left);
  const end = cellId(range.bottom, range.right);
  return start === end ? start : `${start}:${end}`;
}
