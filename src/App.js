import Spreadsheet from './components/Spreadsheet';
import './styles/App.css';

function App() {
  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__logo" aria-hidden="true" />
          <h1 className="app__name">CellForge</h1>
        </div>
        <p className="app__tagline">
          Formulas: <code>=SUM(A1:A5)</code> <code>=AVERAGE(B1:B3, C2)</code>
        </p>
      </header>

      <main className="app__main">
        <Spreadsheet />
      </main>
    </div>
  );
}

export default App;
