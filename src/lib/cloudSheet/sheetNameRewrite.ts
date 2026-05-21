type Cells = Record<string, string>;

export function quoteSheetNameForFormula(name: string): string {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return name;
  return `'${name.replace(/'/g, "''")}'`;
}

export function rewriteFormulaSheetNames(formula: string, nameByOriginal: Map<string, string>): string {
  let out = '';
  let i = 0;
  let inDoubleString = false;

  while (i < formula.length) {
    const ch = formula[i];
    if (ch === '"') {
      out += ch;
      if (formula[i + 1] === '"') {
        out += '"';
        i += 2;
        continue;
      }
      inDoubleString = !inDoubleString;
      i++;
      continue;
    }

    if (inDoubleString) {
      out += ch;
      i++;
      continue;
    }

    if (ch === "'") {
      let j = i + 1;
      let name = '';
      while (j < formula.length) {
        if (formula[j] === "'" && formula[j + 1] === "'") {
          name += "'";
          j += 2;
          continue;
        }
        if (formula[j] === "'") break;
        name += formula[j++];
      }
      if (j < formula.length && formula[j + 1] === '!') {
        const next = nameByOriginal.get(name);
        out += next ? `${quoteSheetNameForFormula(next)}!` : formula.slice(i, j + 2);
        i = j + 2;
        continue;
      }
    }

    const bare = formula.slice(i).match(/^([A-Za-z_][A-Za-z0-9_]*)!/);
    if (bare) {
      const next = nameByOriginal.get(bare[1]);
      out += next ? `${quoteSheetNameForFormula(next)}!` : bare[0];
      i += bare[0].length;
      continue;
    }

    out += ch;
    i++;
  }

  return out;
}

export function rewriteCellsFormulaSheetNames(cells: Cells, nameByOriginal: Map<string, string>): Cells {
  let changed = false;
  const out: Cells = {};
  for (const [ref, raw] of Object.entries(cells)) {
    if (!raw.startsWith('=')) {
      out[ref] = raw;
      continue;
    }
    const rewritten = '=' + rewriteFormulaSheetNames(raw.slice(1), nameByOriginal);
    out[ref] = rewritten;
    if (rewritten !== raw) changed = true;
  }
  return changed ? out : cells;
}

export function remapNamedRangeSheet(range: string, nameByOriginal: Map<string, string>): string {
  return rewriteFormulaSheetNames(range, nameByOriginal);
}
