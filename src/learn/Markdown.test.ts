import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderMarkdown } from './Markdown';

const html = (src: string) => renderToStaticMarkup(renderMarkdown(src));

describe('renderMarkdown', () => {
  it('renders bold and lists without html injection', () => {
    const out = html('Un **gras** et *italique* `R32`\n\n- un <script>alert(1)</script>\n- deux');
    expect(out).toContain('<strong>gras</strong>');
    expect(out).toContain('<em>italique</em>');
    expect(out).toContain('<code>R32</code>');
    expect(out).toMatch(/<ul><li>un &lt;script&gt;alert\(1\)&lt;\/script&gt;<\/li><li>deux<\/li><\/ul>/);
    expect(out).not.toContain('<script>');
  });

  it('renders headings and pipe tables', () => {
    const out = html('### Seuils\n\n| Charge | Fréquence |\n|---|---|\n| ≥ 5 t | **12 mois** |\n| ≥ 50 t | 6 mois |');
    expect(out).toContain('<h3>Seuils</h3>');
    expect(out).toContain('<th>Charge</th><th>Fréquence</th>');
    expect(out).toContain('<td>≥ 5 t</td><td><strong>12 mois</strong></td>');
    expect(out.match(/<tr>/g)).toHaveLength(3);
  });

  it('renders numbered lists as ol', () => {
    expect(html('Étapes :\n1. Récupérer\n2. Tirer au **vide**\n10. Charger')).toBe(
      '<p>Étapes :</p><ol><li>Récupérer</li><li>Tirer au <strong>vide</strong></li><li>Charger</li></ol>',
    );
  });

  it('treats \\* as a literal asterisk', () => {
    expect(html('Cerfa 15497\\*04 et *fiche \\* intervention*')).toBe('<p>Cerfa 15497*04 et <em>fiche * intervention</em></p>');
  });

  it('joins consecutive lines into one paragraph', () => {
    expect(html('ligne un\nligne deux\n\nautre')).toBe('<p>ligne un ligne deux</p><p>autre</p>');
  });
});
