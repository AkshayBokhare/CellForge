import { useMemo } from 'react';
import PropTypes from 'prop-types';
import Cell from './Cell';
import { cellId, columnLabel, isInRange } from '../utils/cellRefs';
import { formatResult, toNumber } from '../utils/formulaEngine';
import '../styles/Grid.css';

function Grid({
  rowCount,
  colCount,
  cells,
  results,
  range,
  activeCell,
  editing,
  cellHandlers,
  onSelectRow,
  onSelectColumn,
}) {
  const columnIndexes = useMemo(() => Array.from({ length: colCount }, (_, i) => i), [colCount]);
  const rowIndexes = useMemo(() => Array.from({ length: rowCount }, (_, i) => i), [rowCount]);

  const renderCell = (row, col) => {
    const id = cellId(row, col);
    const cell = cells[id];
    const result = results[id];
    const isEditingHere = editing?.id === id;

    const display =
      isEditingHere && editing.source === 'bar' ? editing.draft : formatResult(result);

    return (
      <Cell
        key={id}
        id={id}
        row={row}
        col={col}
        display={display}
        isNumber={toNumber(result) !== null}
        bold={Boolean(cell?.bold)}
        background={cell?.background || undefined}
        isActive={activeCell.row === row && activeCell.col === col}
        isSelected={isInRange(row, col, range)}
        editorValue={isEditingHere && editing.source === 'cell' ? editing.draft : undefined}
        {...cellHandlers}
      />
    );
  };

  return (
    <table className="grid">
      <thead>
        <tr>
          <th className="grid__corner" aria-hidden="true" />
          {columnIndexes.map((col) => (
            <th
              key={col}
              scope="col"
              className={
                col >= range.left && col <= range.right
                  ? 'grid__col-header is-highlighted'
                  : 'grid__col-header'
              }
              onMouseDown={() => onSelectColumn(col)}
              title={`Select column ${columnLabel(col)}`}
            >
              {columnLabel(col)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rowIndexes.map((row) => (
          <tr key={row}>
            <th
              scope="row"
              className={
                row >= range.top && row <= range.bottom
                  ? 'grid__row-header is-highlighted'
                  : 'grid__row-header'
              }
              onMouseDown={() => onSelectRow(row)}
              title={`Select row ${row + 1}`}
            >
              {row + 1}
            </th>
            {columnIndexes.map((col) => renderCell(row, col))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const positionShape = PropTypes.shape({
  row: PropTypes.number.isRequired,
  col: PropTypes.number.isRequired,
});

Grid.propTypes = {
  rowCount: PropTypes.number.isRequired,
  colCount: PropTypes.number.isRequired,
  cells: PropTypes.object.isRequired,
  results: PropTypes.object.isRequired,
  range: PropTypes.shape({
    top: PropTypes.number,
    bottom: PropTypes.number,
    left: PropTypes.number,
    right: PropTypes.number,
  }).isRequired,
  activeCell: positionShape.isRequired,
  editing: PropTypes.shape({
    id: PropTypes.string,
    draft: PropTypes.string,
    source: PropTypes.oneOf(['cell', 'bar']),
  }),
  cellHandlers: PropTypes.shape({
    onMouseDown: PropTypes.func.isRequired,
    onMouseEnter: PropTypes.func.isRequired,
    onDoubleClick: PropTypes.func.isRequired,
    onEditorChange: PropTypes.func.isRequired,
    onEditorKeyDown: PropTypes.func.isRequired,
    onEditorBlur: PropTypes.func.isRequired,
  }).isRequired,
  onSelectRow: PropTypes.func.isRequired,
  onSelectColumn: PropTypes.func.isRequired,
};

export default Grid;
