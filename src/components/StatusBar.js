import PropTypes from 'prop-types';
import { formatResult } from '../utils/formulaEngine';
import '../styles/StatusBar.css';

function StatusBar({ stats, notice }) {
  return (
    <footer className="status-bar">
      <div className="status-bar__stats">
        {stats.count > 0 ? (
          <>
            <span>
              Sum: <strong>{formatResult(stats.sum)}</strong>
            </span>
            <span>
              Average: <strong>{formatResult(stats.average)}</strong>
            </span>
            <span>
              Count: <strong>{stats.count}</strong>
            </span>
          </>
        ) : (
          <span className="status-bar__hint">
            Double-click or press Enter to edit &middot; Drag or Shift+click to select a range
          </span>
        )}
      </div>

      <div
        className={notice ? `status-bar__notice status-bar__notice--${notice.tone}` : 'status-bar__notice'}
        role="status"
        aria-live="polite"
      >
        {notice?.text}
      </div>
    </footer>
  );
}

StatusBar.propTypes = {
  stats: PropTypes.shape({
    count: PropTypes.number.isRequired,
    sum: PropTypes.number.isRequired,
    average: PropTypes.number.isRequired,
  }).isRequired,
  notice: PropTypes.shape({
    text: PropTypes.string.isRequired,
    tone: PropTypes.oneOf(['info', 'error']).isRequired,
  }),
};

export default StatusBar;
