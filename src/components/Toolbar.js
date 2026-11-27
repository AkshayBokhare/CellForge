import { useRef } from 'react';
import PropTypes from 'prop-types';
import { FILL_COLORS } from '../constants';
import '../styles/Toolbar.css';

function Toolbar({
  title,
  isBold,
  fillColor,
  canPaste,
  onTitleChange,
  onAddRow,
  onAddColumn,
  onToggleBold,
  onFillChange,
  onClearFormatting,
  onCopy,
  onPaste,
  onNewSheet,
  onSave,
  onLoad,
}) {
  const fileInputRef = useRef(null);

  const handleFileChosen = (event) => {
    const file = event.target.files?.[0];
    if (file) onLoad(file);

    event.target.value = '';
  };

  return (
    <div className="toolbar" role="toolbar" aria-label="Spreadsheet tools">
      <div className="toolbar__group toolbar__group--title">
        <input
          className="toolbar__title"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          aria-label="Sheet name"
          title="Sheet name (used as the file name when saving)"
          maxLength={60}
        />
      </div>

      <div className="toolbar__group">
        <span className="toolbar__label">Insert</span>
        <button type="button" className="btn" onClick={onAddRow} title="Add a row at the bottom">
          + Row
        </button>
        <button type="button" className="btn" onClick={onAddColumn} title="Add a column on the right">
          + Column
        </button>
      </div>

      <div className="toolbar__group">
        <span className="toolbar__label">Format</span>
        <button
          type="button"
          className={isBold ? 'btn btn--icon is-on' : 'btn btn--icon'}
          onClick={onToggleBold}
          aria-pressed={isBold}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </button>

        <div className="swatches" role="group" aria-label="Cell background colour">
          <button
            type="button"
            className={!fillColor ? 'swatch swatch--none is-on' : 'swatch swatch--none'}
            onClick={() => onFillChange(null)}
            title="No fill"
            aria-label="No fill"
          />
          {FILL_COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              className={fillColor === color.value ? 'swatch is-on' : 'swatch'}
              style={{ backgroundColor: color.value }}
              onClick={() => onFillChange(color.value)}
              title={color.name}
              aria-label={`${color.name} fill`}
            />
          ))}
          <label className="swatch swatch--custom" title="Pick any colour">
            <input
              type="color"
              value={fillColor || '#ffffff'}
              onChange={(event) => onFillChange(event.target.value)}
              aria-label="Custom fill colour"
            />
          </label>
        </div>

        <button type="button" className="btn" onClick={onClearFormatting} title="Remove bold and fill">
          Clear format
        </button>
      </div>

      <div className="toolbar__group">
        <span className="toolbar__label">Clipboard</span>
        <button type="button" className="btn" onClick={onCopy} title="Copy selection (Ctrl+C)">
          Copy
        </button>
        <button
          type="button"
          className="btn"
          onClick={onPaste}
          disabled={!canPaste}
          title="Paste at the selected cell (Ctrl+V)"
        >
          Paste
        </button>
      </div>

      <div className="toolbar__group toolbar__group--end">
        <button type="button" className="btn" onClick={onNewSheet} title="Start an empty sheet">
          New
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => fileInputRef.current?.click()}
          title="Open a .json file saved from CellForge"
        >
          Open
        </button>
        <button type="button" className="btn btn--primary" onClick={onSave} title="Download as .json">
          Save JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={handleFileChosen}
        />
      </div>
    </div>
  );
}

Toolbar.propTypes = {
  title: PropTypes.string.isRequired,
  isBold: PropTypes.bool.isRequired,
  fillColor: PropTypes.string,
  canPaste: PropTypes.bool.isRequired,
  onTitleChange: PropTypes.func.isRequired,
  onAddRow: PropTypes.func.isRequired,
  onAddColumn: PropTypes.func.isRequired,
  onToggleBold: PropTypes.func.isRequired,
  onFillChange: PropTypes.func.isRequired,
  onClearFormatting: PropTypes.func.isRequired,
  onCopy: PropTypes.func.isRequired,
  onPaste: PropTypes.func.isRequired,
  onNewSheet: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onLoad: PropTypes.func.isRequired,
};

export default Toolbar;
