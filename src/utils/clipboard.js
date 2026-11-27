import { cellId } from './cellRefs';
import { formatResult } from './formulaEngine';

export function buildClipboardData(cells, results, range) {
  const block = [];
  const lines = [];

  for (let row = range.top; row <= range.bottom; row += 1) {
    const blockRow = [];
    const textRow = [];
    for (let col = range.left; col <= range.right; col += 1) {
      const id = cellId(row, col);
      blockRow.push(cells[id] ? { ...cells[id] } : null);
      textRow.push(formatResult(results[id]));
    }
    block.push(blockRow);
    lines.push(textRow.join('\t'));
  }

  return {
    block,
    origin: { row: range.top, col: range.left },
    text: lines.join('\n'),
  };
}

export function parseClipboardText(text) {
  const lines = normalizeLineEndings(text).replace(/\n$/, '').split('\n');
  const rows = lines.map((line) => line.split('\t'));
  const width = Math.max(...rows.map((row) => row.length));

  return rows.map((row) =>
    Array.from({ length: width }, (_, i) => (row[i] ? { value: row[i] } : null))
  );
}

export function isSameClipboardText(a, b) {
  return normalizeLineEndings(a).trimEnd() === normalizeLineEndings(b).trimEnd();
}

function normalizeLineEndings(text) {
  return String(text).replace(/\r\n?/g, '\n');
}
