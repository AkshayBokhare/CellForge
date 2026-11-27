import { memo, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

function Cell({
  id,
  row,
  col,
  display,
  isNumber,
  bold,
  background,
  isActive,
  isSelected,
  editorValue,
  onMouseDown,
  onMouseEnter,
  onDoubleClick,
  onEditorChange,
  onEditorKeyDown,
  onEditorBlur,
}) {
  const inputRef = useRef(null);
  const isEditing = editorValue !== undefined;

  useEffect(() => {
    if (!isEditing || !inputRef.current) return;
    const input = inputRef.current;
    input.focus();

    input.setSelectionRange(input.value.length, input.value.length);
  }, [isEditing]);

  const classNames = ['cell'];
  if (isSelected) classNames.push('cell--selected');
  if (isActive) classNames.push('cell--active');
  if (isEditing) classNames.push('cell--editing');

  return (
    <td
      data-cell={id}
      className={classNames.join(' ')}
      style={{
        fontWeight: bold ? 700 : undefined,
        backgroundColor: background || undefined,
      }}
      onMouseDown={(event) => onMouseDown(row, col, event)}
      onMouseEnter={() => onMouseEnter(row, col)}
      onDoubleClick={() => onDoubleClick(row, col)}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          className="cell__editor"
          value={editorValue}
          spellCheck={false}
          aria-label={`Edit cell ${id}`}
          onChange={(event) => onEditorChange(event.target.value)}
          onKeyDown={onEditorKeyDown}
          onBlur={() => onEditorBlur()}
          onMouseDown={(event) => event.stopPropagation()}
        />
      ) : (
        <span className={isNumber ? 'cell__value cell__value--number' : 'cell__value'}>
          {display}
        </span>
      )}
    </td>
  );
}

Cell.propTypes = {
  id: PropTypes.string.isRequired,
  row: PropTypes.number.isRequired,
  col: PropTypes.number.isRequired,
  display: PropTypes.string.isRequired,
  isNumber: PropTypes.bool,
  bold: PropTypes.bool,
  background: PropTypes.string,
  isActive: PropTypes.bool,
  isSelected: PropTypes.bool,
  editorValue: PropTypes.string,
  onMouseDown: PropTypes.func.isRequired,
  onMouseEnter: PropTypes.func.isRequired,
  onDoubleClick: PropTypes.func.isRequired,
  onEditorChange: PropTypes.func.isRequired,
  onEditorKeyDown: PropTypes.func.isRequired,
  onEditorBlur: PropTypes.func.isRequired,
};

export default memo(Cell);
