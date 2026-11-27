import PropTypes from 'prop-types';
import '../styles/FormulaBar.css';

function FormulaBar({ label, value, onChange, onCommit, onCancel }) {
  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onCommit(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="formula-bar">
      <div className="formula-bar__label" title="Current selection">
        {label}
      </div>
      <span className="formula-bar__fx" aria-hidden="true">
        fx
      </span>
      <input
        className="formula-bar__input"
        value={value}
        placeholder="Type a value, or a formula like =SUM(A1:A5)"
        aria-label="Cell contents"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => onCommit(false)}
      />
    </div>
  );
}

FormulaBar.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onCommit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default FormulaBar;
