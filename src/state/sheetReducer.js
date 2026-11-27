import { cellId } from '../utils/cellRefs';
import { shiftFormula } from '../utils/formulaEngine';
import {
  DEFAULT_COLUMN_COUNT,
  DEFAULT_ROW_COUNT,
  DEFAULT_SHEET_TITLE,
  MAX_COLUMN_COUNT,
  MAX_ROW_COUNT,
} from '../constants';

export function createEmptySheet() {
  return {
    title: DEFAULT_SHEET_TITLE,
    rowCount: DEFAULT_ROW_COUNT,
    colCount: DEFAULT_COLUMN_COUNT,
    cells: {},
  };
}

function isEmptyCell(cell) {
  return !cell.value && !cell.bold && !cell.background;
}

function writeCell(cells, id, changes) {
  const next = { value: '', bold: false, background: null, ...cells[id], ...changes };
  if (isEmptyCell(next)) {
    delete cells[id];
  } else {
    cells[id] = next;
  }
}

export function sheetReducer(state, action) {
  switch (action.type) {
    case 'SET_CELL_VALUE': {
      const cells = { ...state.cells };
      writeCell(cells, action.id, { value: action.value });
      return { ...state, cells };
    }

    case 'ADD_ROW':
      if (state.rowCount >= MAX_ROW_COUNT) return state;
      return { ...state, rowCount: state.rowCount + 1 };

    case 'ADD_COLUMN':
      if (state.colCount >= MAX_COLUMN_COUNT) return state;
      return { ...state, colCount: state.colCount + 1 };

    case 'APPLY_FORMAT': {
      const cells = { ...state.cells };
      action.ids.forEach((id) => writeCell(cells, id, action.format));
      return { ...state, cells };
    }

    case 'CLEAR_CELLS': {
      const cells = { ...state.cells };
      const cleared = action.keepFormatting ? { value: '' } : { value: '', bold: false, background: null };
      action.ids.forEach((id) => writeCell(cells, id, cleared));
      return { ...state, cells };
    }

    case 'PASTE_BLOCK': {
      const { block, target, rowOffset = 0, colOffset = 0 } = action;
      const blockWidth = Math.max(...block.map((row) => row.length));
      const rowCount = Math.min(Math.max(state.rowCount, target.row + block.length), MAX_ROW_COUNT);
      const colCount = Math.min(Math.max(state.colCount, target.col + blockWidth), MAX_COLUMN_COUNT);
      const cells = { ...state.cells };

      block.forEach((blockRow, i) => {
        blockRow.forEach((source, j) => {
          const row = target.row + i;
          const col = target.col + j;
          if (row >= rowCount || col >= colCount) return;

          writeCell(cells, cellId(row, col), {
            value: source ? shiftFormula(source.value || '', rowOffset, colOffset) : '',
            bold: Boolean(source?.bold),
            background: source?.background || null,
          });
        });
      });

      return { ...state, rowCount, colCount, cells };
    }

    case 'RENAME_SHEET':
      return { ...state, title: action.title };

    case 'LOAD_SHEET':
      return action.sheet;

    case 'RESET_SHEET':
      return createEmptySheet();

    default:
      throw new Error(`Unknown sheet action: ${action.type}`);
  }
}
