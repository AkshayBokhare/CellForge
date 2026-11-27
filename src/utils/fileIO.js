import { parseCellId } from './cellRefs';
import { DEFAULT_SHEET_TITLE, MAX_COLUMN_COUNT, MAX_ROW_COUNT } from '../constants';

const FILE_FORMAT = 'cellforge-sheet';
const FILE_VERSION = 1;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function serializeSheet(sheet) {
  const data = {
    format: FILE_FORMAT,
    version: FILE_VERSION,
    title: sheet.title,
    rowCount: sheet.rowCount,
    colCount: sheet.colCount,
    cells: sheet.cells,
    savedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export function downloadSheet(sheet) {
  const blob = new Blob([serializeSheet(sheet)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const fileName = `${toFileName(sheet.title)}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return fileName;
}

export function parseSheet(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('That file does not contain a spreadsheet.');
  }
  if (data.format && data.format !== FILE_FORMAT) {
    throw new Error('That JSON file was not created by CellForge.');
  }
  if (!data.cells || typeof data.cells !== 'object' || Array.isArray(data.cells)) {
    throw new Error('The spreadsheet file is missing its cell data.');
  }

  const rowCount = clampCount(data.rowCount, MAX_ROW_COUNT);
  const colCount = clampCount(data.colCount, MAX_COLUMN_COUNT);
  const cells = {};

  Object.entries(data.cells).forEach(([id, cell]) => {
    const position = parseCellId(id);
    if (!position || position.row >= rowCount || position.col >= colCount) return;
    if (!cell || typeof cell !== 'object') return;

    const cleaned = {
      value: cell.value == null ? '' : String(cell.value),
      bold: cell.bold === true,
      background: HEX_COLOR.test(cell.background) ? cell.background : null,
    };
    if (cleaned.value || cleaned.bold || cleaned.background) {
      cells[id.toUpperCase()] = cleaned;
    }
  });

  const title =
    typeof data.title === 'string' && data.title.trim() ? data.title.trim() : DEFAULT_SHEET_TITLE;

  return { title, rowCount, colCount, cells };
}

export async function readSheetFile(file) {
  const text = await file.text();
  return parseSheet(text);
}

function clampCount(value, max) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error('The spreadsheet file has an invalid grid size.');
  }
  return Math.min(n, max);
}

function toFileName(title) {
  const cleaned = String(title || '')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, '-');
  return cleaned || 'spreadsheet';
}
