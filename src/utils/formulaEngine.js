import { cellId, columnIndex, columnLabel, parseCellId } from './cellRefs';

// Error type used to show codes like #REF! inside a cell
export class FormulaError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

// Supported functions, each one gets a flat list of numbers
const FUNCTIONS = {
  SUM: (numbers) => numbers.reduce((total, n) => total + n, 0),
  AVERAGE: (numbers) => {
    if (numbers.length === 0) throw new FormulaError('#DIV/0!');
    return FUNCTIONS.SUM(numbers) / numbers.length;
  },
};

export const SUPPORTED_FUNCTIONS = Object.keys(FUNCTIONS);

const REF_PATTERN = /^\$?[A-Z]+\$?\d+$/i;
const RANGE_PATTERN = /^(\$?[A-Z]+\$?\d+)\s*:\s*(\$?[A-Z]+\$?\d+)$/i;
const CALL_PATTERN = /^([A-Z]+)\s*\((.*)\)$/i;

export function isFormula(raw) {
  return typeof raw === 'string' && raw.startsWith('=');
}

// Returns the number, or null for text and empty cells
export function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const n = Number(value.trim());
  return Number.isFinite(n) ? n : null;
}

// A1 or $B$2 -> { row, col }, throws #REF! if it is outside the grid
function parseReference(text, ctx) {
  const position = parseCellId(text.replace(/\$/g, ''));
  const outOfBounds =
    !position ||
    position.row < 0 ||
    position.col < 0 ||
    position.row >= ctx.rowCount ||
    position.col >= ctx.colCount;

  if (outOfBounds) throw new FormulaError('#REF!');
  return position;
}

// Split on commas, but skip the ones inside nested brackets
function splitArguments(text) {
  const args = [];
  let depth = 0;
  let current = '';

  for (const char of text) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (depth < 0) throw new FormulaError('#ERROR!');

    if (char === ',' && depth === 0) {
      args.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  if (depth !== 0) throw new FormulaError('#ERROR!');
  args.push(current);
  return args.map((arg) => arg.trim()).filter((arg) => arg !== '');
}

// One argument can be a nested call, a range, a single cell or a plain number
function collectNumbers(arg, ctx, numbers) {
  if (arg.toUpperCase().includes('#REF!')) throw new FormulaError('#REF!');

  if (CALL_PATTERN.test(arg)) {
    const nested = evaluateExpression(arg, ctx);
    const n = toNumber(nested);
    if (n !== null) numbers.push(n);
    return;
  }

  const rangeMatch = RANGE_PATTERN.exec(arg);
  if (rangeMatch) {
    const start = parseReference(rangeMatch[1], ctx);
    const end = parseReference(rangeMatch[2], ctx);
    const top = Math.min(start.row, end.row);
    const bottom = Math.max(start.row, end.row);
    const left = Math.min(start.col, end.col);
    const right = Math.max(start.col, end.col);

    for (let row = top; row <= bottom; row += 1) {
      for (let col = left; col <= right; col += 1) {
        const n = toNumber(ctx.lookup(cellId(row, col)));
        if (n !== null) numbers.push(n);
      }
    }
    return;
  }

  if (REF_PATTERN.test(arg)) {
    const { row, col } = parseReference(arg, ctx);
    const n = toNumber(ctx.lookup(cellId(row, col)));
    if (n !== null) numbers.push(n);
    return;
  }

  const literal = toNumber(arg);
  if (literal === null) throw new FormulaError('#VALUE!');
  numbers.push(literal);
}

// Evaluates everything after the "=" sign
function evaluateExpression(expression, ctx) {
  const text = expression.trim();
  if (text === '') return '';
  if (text.toUpperCase().includes('#REF!')) throw new FormulaError('#REF!');

  const call = CALL_PATTERN.exec(text);
  if (call) {
    const fn = FUNCTIONS[call[1].toUpperCase()];
    if (!fn) throw new FormulaError('#NAME?');

    const numbers = [];
    splitArguments(call[2]).forEach((arg) => collectNumbers(arg, ctx, numbers));
    return fn(numbers);
  }

  if (REF_PATTERN.test(text)) {
    const { row, col } = parseReference(text, ctx);
    const value = ctx.lookup(cellId(row, col));
    return value === '' ? 0 : value;
  }

  const literal = toNumber(text);
  if (literal !== null) return literal;

  throw new FormulaError('#NAME?');
}

// Calculates all cells, caches each result and catches circular refs
export function evaluateSheet(cells, bounds) {
  const results = {};
  const inProgress = new Set();

  const resolve = (id) => {
    if (id in results) return results[id];

    const raw = cells[id]?.value ?? '';
    if (!isFormula(raw)) {
      results[id] = raw;
      return raw;
    }

    // Already being calculated higher up, so the formula points back to itself
    if (inProgress.has(id)) return new FormulaError('#CIRC!');

    inProgress.add(id);
    let result;
    try {
      result = evaluateExpression(raw.slice(1), { ...bounds, lookup });
    } catch (error) {
      result = error instanceof FormulaError ? error : new FormulaError('#ERROR!');
    }
    inProgress.delete(id);

    results[id] = result;
    return result;
  };

  const lookup = (id) => {
    const value = resolve(id);
    if (value instanceof FormulaError) throw value;
    return value;
  };

  Object.keys(cells).forEach(resolve);
  return results;
}

// Text that is shown in the cell
export function formatResult(result) {
  if (result instanceof FormulaError) return result.code;
  if (typeof result === 'number') {
    if (!Number.isFinite(result)) return '#NUM!';
    // Round off floating point noise, e.g. 0.1 + 0.2.
    return String(parseFloat(result.toFixed(10)));
  }
  return result ?? '';
}

// Moves refs by the paste offset, anything with $ stays fixed
export function shiftFormula(raw, rowOffset, colOffset) {
  if (!isFormula(raw) || (rowOffset === 0 && colOffset === 0)) return raw;

  return raw.replace(/(\$?)([A-Z]+)(\$?)(\d+)/gi, (match, colLock, letters, rowLock, digits) => {
    const col = colLock ? columnIndex(letters) : columnIndex(letters) + colOffset;
    const row = rowLock ? Number(digits) - 1 : Number(digits) - 1 + rowOffset;
    if (col < 0 || row < 0) return '#REF!';
    return `${colLock}${columnLabel(col)}${rowLock}${row + 1}`;
  });
}
