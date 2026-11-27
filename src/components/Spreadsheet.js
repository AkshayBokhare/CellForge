import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import Toolbar from './Toolbar';
import FormulaBar from './FormulaBar';
import Grid from './Grid';
import StatusBar from './StatusBar';
import { createEmptySheet, sheetReducer } from '../state/sheetReducer';
import { cellId, getRange, idsInRange, rangeLabel } from '../utils/cellRefs';
import { evaluateSheet, toNumber } from '../utils/formulaEngine';
import { buildClipboardData, isSameClipboardText, parseClipboardText } from '../utils/clipboard';
import { downloadSheet, readSheetFile } from '../utils/fileIO';
import { MAX_COLUMN_COUNT, MAX_ROW_COUNT } from '../constants';
import '../styles/Spreadsheet.css';

const START = { row: 0, col: 0 };

const ARROW_KEYS = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function Spreadsheet() {
  const [sheet, dispatch] = useReducer(sheetReducer, undefined, createEmptySheet);
  const [selection, setSelection] = useState({ anchor: START, focus: START });
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState(null);
  const [hasCopiedCells, setHasCopiedCells] = useState(false);

  const gridRef = useRef(null);
  const editingRef = useRef(null);
  const clipboardRef = useRef(null);
  const isDraggingRef = useRef(false);
  const skipScrollRef = useRef(false);

  const { rowCount, colCount, cells } = sheet;
  const range = useMemo(() => getRange(selection.anchor, selection.focus), [selection]);
  const selectedIds = useMemo(() => idsInRange(range), [range]);
  const activeId = cellId(selection.anchor.row, selection.anchor.col);
  const activeCell = cells[activeId];

  // Recalculate all formulas whenever any cell changes
  const results = useMemo(
    () => evaluateSheet(cells, { rowCount, colCount }),
    [cells, rowCount, colCount]
  );

  // Sum / average / count for the status bar
  const selectionStats = useMemo(() => {
    const numbers = selectedIds.map((id) => toNumber(results[id])).filter((n) => n !== null);
    const sum = numbers.reduce((total, n) => total + n, 0);
    return {
      count: numbers.length,
      sum,
      average: numbers.length ? sum / numbers.length : 0,
    };
  }, [selectedIds, results]);

  const showNotice = useCallback((text, tone = 'info') => {
    setNotice({ text, tone });
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  const focusGrid = useCallback(() => {
    gridRef.current?.focus({ preventScroll: true });
  }, []);

  // Keep the focused cell visible when moving with the keyboard
  useEffect(() => {
    if (skipScrollRef.current) {
      skipScrollRef.current = false;
      return;
    }
    const id = cellId(selection.focus.row, selection.focus.col);
    const element = gridRef.current?.querySelector(`[data-cell="${id}"]`);
    element?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [selection.focus]);

  // Mouse can be released outside the grid, so listen on window
  useEffect(() => {
    const stopDragging = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener('mouseup', stopDragging);
    return () => window.removeEventListener('mouseup', stopDragging);
  }, []);

  const moveSelection = useCallback(
    (rowStep, colStep, extend = false) => {
      setSelection((prev) => {
        const from = extend ? prev.focus : prev.anchor;
        const next = {
          row: clamp(from.row + rowStep, 0, rowCount - 1),
          col: clamp(from.col + colStep, 0, colCount - 1),
        };
        return extend ? { anchor: prev.anchor, focus: next } : { anchor: next, focus: next };
      });
    },
    [rowCount, colCount]
  );

  const selectRow = useCallback(
    (row) => {
      skipScrollRef.current = true;
      setSelection({ anchor: { row, col: 0 }, focus: { row, col: colCount - 1 } });
    },
    [colCount]
  );

  const selectColumn = useCallback(
    (col) => {
      skipScrollRef.current = true;
      setSelection({ anchor: { row: 0, col }, focus: { row: rowCount - 1, col } });
    },
    [rowCount]
  );

  // Ref keeps the latest draft for handlers that run before the next render
  const changeEditing = useCallback((next) => {
    editingRef.current = next;
    setEditing(next);
  }, []);

  const startEditing = useCallback(
    (id, initialDraft) => {
      const draft = initialDraft ?? cells[id]?.value ?? '';
      changeEditing({ id, draft, source: 'cell' });
    },
    [cells, changeEditing]
  );

  const commitEdit = useCallback(
    ({ rowStep = 0, colStep = 0, refocus = false } = {}) => {
      const current = editingRef.current;
      if (!current) return;

      changeEditing(null);
      dispatch({ type: 'SET_CELL_VALUE', id: current.id, value: current.draft });

      if (rowStep || colStep) moveSelection(rowStep, colStep);
      if (refocus) focusGrid();
    },
    [changeEditing, moveSelection, focusGrid]
  );

  const cancelEdit = useCallback(() => {
    if (!editingRef.current) return;
    changeEditing(null);
    focusGrid();
  }, [changeEditing, focusGrid]);

  const handleEditorKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commitEdit({ rowStep: event.shiftKey ? -1 : 1, refocus: true });
      } else if (event.key === 'Tab') {
        event.preventDefault();
        commitEdit({ colStep: event.shiftKey ? -1 : 1, refocus: true });
      } else if (event.key === 'Escape') {
        event.preventDefault();
        cancelEdit();
      }

      event.stopPropagation();
    },
    [commitEdit, cancelEdit]
  );

  const handleEditorChange = useCallback(
    (draft) => {
      if (editingRef.current) changeEditing({ ...editingRef.current, draft });
    },
    [changeEditing]
  );

  const handleFormulaBarChange = (draft) => {
    changeEditing({ id: activeId, draft, source: 'bar' });
  };

  const handleCellMouseDown = useCallback((row, col, event) => {
    if (event.button !== 0) return;
    isDraggingRef.current = true;
    const position = { row, col };
    setSelection((prev) =>
      event.shiftKey ? { anchor: prev.anchor, focus: position } : { anchor: position, focus: position }
    );
  }, []);

  const handleCellMouseEnter = useCallback((row, col) => {
    if (!isDraggingRef.current) return;
    setSelection((prev) => ({ anchor: prev.anchor, focus: { row, col } }));
  }, []);

  const handleCellDoubleClick = useCallback(
    (row, col) => {
      setSelection({ anchor: { row, col }, focus: { row, col } });
      startEditing(cellId(row, col));
    },
    [startEditing]
  );

  // Same handler objects every render so memo'd cells don't re-render
  const cellHandlers = useMemo(
    () => ({
      onMouseDown: handleCellMouseDown,
      onMouseEnter: handleCellMouseEnter,
      onDoubleClick: handleCellDoubleClick,
      onEditorChange: handleEditorChange,
      onEditorKeyDown: handleEditorKeyDown,
      onEditorBlur: commitEdit,
    }),
    [
      handleCellMouseDown,
      handleCellMouseEnter,
      handleCellDoubleClick,
      handleEditorChange,
      handleEditorKeyDown,
      commitEdit,
    ]
  );

  const applyFormat = (format) => {
    dispatch({ type: 'APPLY_FORMAT', ids: selectedIds, format });
  };

  const toggleBold = () => applyFormat({ bold: !activeCell?.bold });

  const addRow = () => {
    if (rowCount >= MAX_ROW_COUNT) {
      showNotice(`A sheet can have at most ${MAX_ROW_COUNT} rows.`, 'error');
      return;
    }
    dispatch({ type: 'ADD_ROW' });
  };

  const addColumn = () => {
    if (colCount >= MAX_COLUMN_COUNT) {
      showNotice(`A sheet can have at most ${MAX_COLUMN_COUNT} columns.`, 'error');
      return;
    }
    dispatch({ type: 'ADD_COLUMN' });
  };

  const copySelection = useCallback(() => {
    const data = buildClipboardData(cells, results, range);
    clipboardRef.current = data;
    setHasCopiedCells(true);

    const count = selectedIds.length;
    showNotice(`Copied ${count} ${count === 1 ? 'cell' : 'cells'}`);
    return data.text;
  }, [cells, results, range, selectedIds, showNotice]);

  const pasteBlock = useCallback(
    (block, origin) => {
      const target = { row: range.top, col: range.left };
      const width = Math.max(...block.map((row) => row.length));

      dispatch({
        type: 'PASTE_BLOCK',
        block,
        target,
        rowOffset: origin ? target.row - origin.row : 0,
        colOffset: origin ? target.col - origin.col : 0,
      });

      setSelection({
        anchor: target,
        focus: {
          row: Math.min(target.row + block.length, MAX_ROW_COUNT) - 1,
          col: Math.min(target.col + width, MAX_COLUMN_COUNT) - 1,
        },
      });
      showNotice(`Pasted into ${cellId(target.row, target.col)}`);
    },
    [range, showNotice]
  );

  // Hook into the browser copy/cut/paste events, only while the grid has focus
  useEffect(() => {
    const gridHasFocus = () => document.activeElement === gridRef.current;

    const handleCopy = (event) => {
      if (!gridHasFocus()) return;
      event.preventDefault();
      event.clipboardData.setData('text/plain', copySelection());
    };

    const handleCut = (event) => {
      if (!gridHasFocus()) return;
      event.preventDefault();
      event.clipboardData.setData('text/plain', copySelection());

      // No origin means formulas are not shifted when pasting a cut
      clipboardRef.current.origin = null;
      dispatch({ type: 'CLEAR_CELLS', ids: selectedIds, keepFormatting: false });
    };

    const handlePaste = (event) => {
      if (!gridHasFocus()) return;
      event.preventDefault();

      const text = event.clipboardData.getData('text/plain');
      const copied = clipboardRef.current;

      // Our own copy keeps formulas and formatting, otherwise paste as plain text
      if (copied && (!text || isSameClipboardText(text, copied.text))) {
        pasteBlock(copied.block, copied.origin);
      } else if (text) {
        pasteBlock(parseClipboardText(text), null);
      }
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste);
    };
  }, [copySelection, pasteBlock, selectedIds]);

  const handleCopyButton = () => {
    const text = copySelection();
    // The in-app copy still works if the browser blocks clipboard access.
    navigator.clipboard?.writeText(text).catch(() => {});
    focusGrid();
  };

  const handlePasteButton = () => {
    if (clipboardRef.current) {
      pasteBlock(clipboardRef.current.block, clipboardRef.current.origin);
    }
    focusGrid();
  };

  const handleGridKeyDown = (event) => {
    if (editingRef.current) return;

    const { key } = event;

    if (event.ctrlKey || event.metaKey) {
      if (key.toLowerCase() === 'b') {
        event.preventDefault();
        toggleBold();
      }

      return;
    }

    if (ARROW_KEYS[key]) {
      event.preventDefault();
      const [rowStep, colStep] = ARROW_KEYS[key];
      moveSelection(rowStep, colStep, event.shiftKey);
      return;
    }

    switch (key) {
      case 'Tab':
        event.preventDefault();
        moveSelection(0, event.shiftKey ? -1 : 1);
        break;
      case 'Enter':
      case 'F2':
        event.preventDefault();
        startEditing(activeId);
        break;
      case 'Delete':
      case 'Backspace':
        event.preventDefault();
        dispatch({ type: 'CLEAR_CELLS', ids: selectedIds, keepFormatting: true });
        break;
      default:
        // Typing a printable key starts editing with that character.
        if (key.length === 1 && !event.altKey) {
          event.preventDefault();
          startEditing(activeId, key);
        }
    }
  };

  const handleSave = () => {
    const fileName = downloadSheet(sheet);
    showNotice(`Saved as ${fileName}`);
  };

  const handleLoad = async (file) => {
    try {
      const loaded = await readSheetFile(file);
      changeEditing(null);
      dispatch({ type: 'LOAD_SHEET', sheet: loaded });
      setSelection({ anchor: START, focus: START });
      showNotice(`Opened ${file.name}`);
    } catch (error) {
      showNotice(error.message || 'Could not open that file.', 'error');
    }
  };

  const handleNewSheet = () => {
    const hasData = Object.keys(cells).length > 0;
    if (hasData && !window.confirm('Start a new sheet? Anything you have not saved will be lost.')) {
      return;
    }
    changeEditing(null);
    dispatch({ type: 'RESET_SHEET' });
    setSelection({ anchor: START, focus: START });
    focusGrid();
  };

  const formulaBarValue =
    editing && editing.id === activeId ? editing.draft : activeCell?.value ?? '';

  return (
    <div className="spreadsheet">
      <Toolbar
        title={sheet.title}
        isBold={Boolean(activeCell?.bold)}
        fillColor={activeCell?.background || null}
        canPaste={hasCopiedCells}
        onTitleChange={(title) => dispatch({ type: 'RENAME_SHEET', title })}
        onAddRow={addRow}
        onAddColumn={addColumn}
        onToggleBold={() => {
          toggleBold();
          focusGrid();
        }}
        onFillChange={(background) => applyFormat({ background })}
        onClearFormatting={() => {
          applyFormat({ bold: false, background: null });
          focusGrid();
        }}
        onCopy={handleCopyButton}
        onPaste={handlePasteButton}
        onNewSheet={handleNewSheet}
        onSave={handleSave}
        onLoad={handleLoad}
      />

      <FormulaBar
        label={rangeLabel(range)}
        value={formulaBarValue}
        onChange={handleFormulaBarChange}
        onCommit={(refocus) => commitEdit({ refocus })}
        onCancel={cancelEdit}
      />

      <div
        ref={gridRef}
        className="spreadsheet__viewport"
        tabIndex={0}
        onKeyDown={handleGridKeyDown}
        aria-label="Spreadsheet grid"
      >
        <Grid
          rowCount={rowCount}
          colCount={colCount}
          cells={cells}
          results={results}
          range={range}
          activeCell={selection.anchor}
          editing={editing}
          cellHandlers={cellHandlers}
          onSelectRow={selectRow}
          onSelectColumn={selectColumn}
        />
      </div>

      <StatusBar stats={selectionStats} notice={notice} />
    </div>
  );
}

export default Spreadsheet;
