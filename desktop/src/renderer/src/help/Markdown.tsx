import { type ReactNode } from 'react'

// Schlanker, abhaengigkeitsfreier Markdown-Renderer fuer die Hilfe.
// Unterstuetzt genau die Teilmenge, die die Hilfe-Inhalte verwenden:
// Ueberschriften (#..####), Absaetze, **fett**, `code`, [Links](url),
// Bilder ![alt](src), Aufzaehlungen (-), nummerierte Listen (1.),
// Tabellen (| | |), Zitate (>), Codebloecke (```), Trennlinien (---).

export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/(^-+|-+$)/g, '')
}

// --- Inline-Elemente: **fett**, `code`, [text](url), ![alt](src) ---
function renderInline(
  text: string,
  resolveImage: (src: string) => string | undefined,
  onLink: (url: string) => void
): ReactNode[] {
  const out: ReactNode[] = []
  let rest = text
  let key = 0
  // Reihenfolge: Bild, Link, fett, code – jeweils die naechste Fundstelle.
  const pattern = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/
  let m: RegExpExecArray | null
  while ((m = pattern.exec(rest))) {
    if (m.index > 0) out.push(rest.slice(0, m.index))
    if (m[1] !== undefined && m[2] !== undefined) {
      // Inline-Bild
      const url = resolveImage(m[2])
      if (url) out.push(<img key={key++} src={url} alt={m[1]} className="inline-block align-text-bottom" />)
      else out.push(m[1])
    } else if (m[3] !== undefined && m[4] !== undefined) {
      const href = m[4]
      out.push(
        <button
          key={key++}
          type="button"
          onClick={() => onLink(href)}
          className="text-primary underline underline-offset-2 hover:opacity-80"
        >
          {m[3]}
        </button>
      )
    } else if (m[5] !== undefined) {
      out.push(<strong key={key++} className="font-semibold text-foreground">{m[5]}</strong>)
    } else if (m[6] !== undefined) {
      out.push(
        <code key={key++} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
          {m[6]}
        </code>
      )
    }
    rest = rest.slice(m.index + m[0].length)
  }
  if (rest) out.push(rest)
  return out
}

export function Markdown({
  text,
  resolveImage,
  onLink
}: {
  text: string
  resolveImage: (src: string) => string | undefined
  onLink: (url: string) => void
}): JSX.Element {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0
  const inline = (t: string): ReactNode[] => renderInline(t, resolveImage, onLink)

  while (i < lines.length) {
    const line = lines[i]

    // Leerzeile
    if (!line.trim()) {
      i++
      continue
    }

    // Codeblock
    if (line.startsWith('```')) {
      const buf: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        buf.push(lines[i])
        i++
      }
      i++ // schliessendes ```
      blocks.push(
        <pre key={key++} className="overflow-x-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
          <code className="font-mono">{buf.join('\n')}</code>
        </pre>
      )
      continue
    }

    // Trennlinie
    if (/^---+$/.test(line.trim())) {
      blocks.push(<hr key={key++} className="my-6 border-border" />)
      i++
      continue
    }

    // Ueberschrift
    const h = /^(#{1,4})\s+(.*)$/.exec(line)
    if (h) {
      const level = h[1].length
      const content = h[2].trim()
      const id = slug(content)
      const cls =
        level === 1
          ? 'mt-2 mb-4 text-2xl font-semibold text-foreground'
          : level === 2
            ? 'mt-7 mb-3 text-lg font-semibold text-foreground'
            : level === 3
              ? 'mt-5 mb-2 text-base font-semibold text-foreground'
              : 'mt-4 mb-1 text-sm font-semibold text-muted-foreground'
      const Tag = (`h${level}` as unknown) as 'h1'
      blocks.push(
        <Tag key={key++} id={id} className={cls}>
          {inline(content)}
        </Tag>
      )
      i++
      continue
    }

    // Zitat / Hinweis
    if (line.startsWith('>')) {
      const buf: string[] = []
      while (i < lines.length && lines[i].startsWith('>')) {
        buf.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      blocks.push(
        <blockquote
          key={key++}
          className="my-3 border-l-2 border-primary/60 bg-muted/40 px-4 py-2 text-sm text-foreground"
        >
          {inline(buf.join(' '))}
        </blockquote>
      )
      continue
    }

    // Tabelle
    if (line.startsWith('|')) {
      const rows: string[] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(lines[i])
        i++
      }
      const cells = (r: string): string[] =>
        r.replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim())
      const header = cells(rows[0])
      const body = rows.slice(2) // Zeile 1 = Trenner
      blocks.push(
        <div key={key++} className="my-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                {header.map((c, idx) => (
                  <th key={idx} className="px-3 py-2 text-left font-semibold text-foreground">
                    {inline(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, ridx) => (
                <tr key={ridx} className="border-b border-border/60 align-top">
                  {cells(r).map((c, cidx) => (
                    <td key={cidx} className="px-3 py-2 text-muted-foreground">
                      {inline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    // Nummerierte Liste
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''))
        i++
      }
      blocks.push(
        <ol key={key++} className="my-3 ml-5 list-decimal space-y-1.5 text-sm text-muted-foreground marker:text-muted-foreground">
          {items.map((it, idx) => (
            <li key={idx} className="pl-1 leading-relaxed">{inline(it)}</li>
          ))}
        </ol>
      )
      continue
    }

    // Aufzaehlung
    if (/^[-*]\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s/, ''))
        i++
      }
      blocks.push(
        <ul key={key++} className="my-3 ml-5 list-disc space-y-1.5 text-sm text-muted-foreground marker:text-primary/70">
          {items.map((it, idx) => (
            <li key={idx} className="pl-1 leading-relaxed">{inline(it)}</li>
          ))}
        </ul>
      )
      continue
    }

    // Bild allein auf einer Zeile -> Blockbild mit Rahmen
    const img = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(line.trim())
    if (img) {
      const url = resolveImage(img[2])
      if (url) {
        blocks.push(
          <figure key={key++} className="my-4">
            <img
              src={url}
              alt={img[1]}
              className="w-full rounded-md border border-border"
            />
            {img[1] && (
              <figcaption className="mt-1.5 text-center text-xs text-muted-foreground">{img[1]}</figcaption>
            )}
          </figure>
        )
      }
      i++
      continue
    }

    // Absatz: aufeinanderfolgende Textzeilen zusammenfassen
    const buf: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('|') &&
      !lines[i].startsWith('>') &&
      !lines[i].startsWith('```') &&
      !/^[-*]\s/.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i]) &&
      !/^---+$/.test(lines[i].trim())
    ) {
      buf.push(lines[i])
      i++
    }
    blocks.push(
      <p key={key++} className="my-3 text-sm leading-relaxed text-muted-foreground">
        {inline(buf.join(' '))}
      </p>
    )
  }

  return <div>{blocks}</div>
}
