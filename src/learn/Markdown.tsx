import type { ReactNode } from 'react';

const INLINE = /\\([*`\\])|\*\*(.+?)\*\*|\*((?:\\.|[^*])+?)\*|`([^`]+)`/g;
const OL = /^\d+\.\s/;

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = m.index;
    if (m[1] !== undefined) out.push(m[1]);
    else if (m[2] !== undefined) out.push(<strong key={k}>{inline(m[2])}</strong>);
    else if (m[3] !== undefined) out.push(<em key={k}>{inline(m[3])}</em>);
    else out.push(<code key={k}>{m[4]}</code>);
    last = k + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const cells = (row: string) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
const isSep = (row: string | undefined) => !!row && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(row);

export function renderMarkdown(src: string): ReactNode {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    const k = blocks.length;
    if (!t) { i++; continue; }
    if (t.startsWith('### ')) {
      blocks.push(<h3 key={k}>{inline(t.slice(4))}</h3>);
      i++;
    } else if (t.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('- ')) items.push(lines[i++].trim().slice(2));
      blocks.push(<ul key={k}>{items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ul>);
    } else if (OL.test(t)) {
      const items: string[] = [];
      while (i < lines.length && OL.test(lines[i].trim())) items.push(lines[i++].trim().replace(OL, ''));
      blocks.push(<ol key={k}>{items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ol>);
    } else if (t.startsWith('|') && isSep(lines[i + 1])) {
      const head = cells(t);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(cells(lines[i++]));
      blocks.push(
        <div key={k} className="md-table">
          <table>
            <thead><tr>{head.map((c, j) => <th key={j}>{inline(c)}</th>)}</tr></thead>
            <tbody>{rows.map((r, ri) => <tr key={ri}>{r.map((c, j) => <td key={j}>{inline(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
    } else {
      const para: string[] = [];
      while (i < lines.length) {
        const p = lines[i].trim();
        if (!p || p.startsWith('### ') || p.startsWith('- ') || OL.test(p) || (p.startsWith('|') && isSep(lines[i + 1]))) break;
        para.push(p);
        i++;
      }
      blocks.push(<p key={k}>{inline(para.join(' '))}</p>);
    }
  }
  return <>{blocks}</>;
}
