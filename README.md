# CellForge

A simple spreadsheet app made with React (Create React App).

It starts with a 10x10 grid. You can add rows and columns, use SUM and AVERAGE formulas, make cells bold or give them a background colour, copy and paste cells, and save/load the sheet as a JSON file.

## Setup

You need Node.js (v16 or above) and npm.

```bash
cd CellForge
npm install
npm start
```

Then open http://localhost:3000 in the browser.

For a production build, run `npm run build`. The output will be in the `build` folder.

## How to use

**Editing**
- Click a cell to select it. Double-click it, press Enter, or just start typing to edit.
- Press Enter or Tab to save, Esc to cancel.
- Delete clears the selected cells.
- You can also edit the selected cell from the formula bar above the grid.

**Selecting**
- Drag with the mouse, or Shift + click, or Shift + arrow keys.
- Click a column letter or row number to select the whole column or row.

**Rows and columns**
- Use the `+ Row` and `+ Column` buttons in the toolbar.

**Formulas**

Start with `=`. Examples:

```
=SUM(A1:A5)
=AVERAGE(B1:B4)
=SUM(A1, B2, 10)
=SUM(A1:A3, AVERAGE(B1:B3))
```

Formulas update by themselves when any cell they use changes. Text and empty cells are ignored. If something is wrong, the cell shows an error like `#REF!` (bad cell reference), `#CIRC!` (formula refers to itself), `#DIV/0!` or `#NAME?`.

**Formatting**
- Select cells, then click **B** (or Ctrl + B) for bold.
- Click a colour swatch for the background. The last swatch opens a colour picker. The first one removes the colour.
- `Clear format` removes both.

**Copy and paste**
- Select cells and press Ctrl + C (or the Copy button). Ctrl + X cuts.
- Click where you want to paste and press Ctrl + V (or the Paste button).
- Formulas shift to the new position, e.g. `=SUM(A1:A3)` pasted one column right becomes `=SUM(B1:B3)`. Use `$` to keep a reference fixed, like `$A$1`.

**Save and load**
- Type a name for the sheet in the box at the top left.
- `Save JSON` downloads the sheet as a `.json` file.
- `Open` loads a saved file back.
- `New` clears everything and starts a new sheet.

## Folder structure

```
src/
  components/   Spreadsheet, Toolbar, FormulaBar, Grid, Cell, StatusBar
  state/        sheetReducer.js - all changes to the sheet data
  utils/        formula engine, cell reference helpers, clipboard, JSON save/load
  styles/       all CSS files
  constants.js  default grid size, limits, colours
```

## Notes

- Max size is 500 rows x 100 columns.
- Only SUM and AVERAGE are supported (no `=A1+B1` style maths).
- There is no undo.
