import type {
  AppSettings,
  Collection,
  DocumentRevision,
  Game,
  GameSession,
  LoreDocument,
} from '../types/models';
import { formatExactDateTime, getDocumentDisplayTitle } from './format';

interface ProseNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string }>;
  content?: ProseNode[];
}

export interface DocumentExportMeta {
  gameTitle?: string;
  collectionName?: string;
}

export interface WorkspaceBackupPayload {
  app: 'LOREKEEP';
  schemaVersion: 2;
  exportedAt: string;
  data: {
    games: Game[];
    collections: Collection[];
    documents: LoreDocument[];
    revisions: DocumentRevision[];
    settings: AppSettings[];
    gameSessions: GameSession[];
  };
}

function safeFileSlug(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return base || 'untitled-document';
}

function triggerFileDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInlineMarkdown(nodes?: ProseNode[]): string {
  if (!Array.isArray(nodes)) return '';
  return nodes
    .map((node) => {
      if (node.type === 'hardBreak') return '  \n';
      if (node.type !== 'text') return renderInlineMarkdown(node.content);
      let text = node.text ?? '';
      const marks = node.marks ?? [];
      for (const mark of marks) {
        if (mark.type === 'code') text = `\`${text}\``;
        else if (mark.type === 'bold') text = `**${text}**`;
        else if (mark.type === 'italic') text = `*${text}*`;
        else if (mark.type === 'strike') text = `~~${text}~~`;
        else if (mark.type === 'underline') text = `<u>${text}</u>`;
      }
      return text;
    })
    .join('');
}

function renderBlockMarkdown(node: ProseNode, listDepth = 0): string {
  const type = node.type ?? '';
  switch (type) {
    case 'doc':
      return (node.content ?? []).map((n) => renderBlockMarkdown(n)).join('\n\n').trim();
    case 'heading': {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 1));
      return `${'#'.repeat(level)} ${renderInlineMarkdown(node.content)}`;
    }
    case 'paragraph':
      return renderInlineMarkdown(node.content);
    case 'blockquote': {
      const inner = (node.content ?? [])
        .map((n) => renderBlockMarkdown(n))
        .join('\n\n');
      return inner
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
    }
    case 'bulletList': {
      const indent = '  '.repeat(listDepth);
      return (node.content ?? [])
        .map((li) => {
          const inner = (li.content ?? [])
            .map((child) => renderBlockMarkdown(child, listDepth + 1))
            .join('\n');
          return `${indent}- ${inner}`;
        })
        .join('\n');
    }
    case 'orderedList': {
      const indent = '  '.repeat(listDepth);
      return (node.content ?? [])
        .map((li, idx) => {
          const inner = (li.content ?? [])
            .map((child) => renderBlockMarkdown(child, listDepth + 1))
            .join('\n');
          return `${indent}${idx + 1}. ${inner}`;
        })
        .join('\n');
    }
    case 'codeBlock': {
      const code = (node.content ?? []).map((n) => n.text ?? '').join('');
      return `\`\`\`\n${code}\n\`\`\``;
    }
    case 'horizontalRule':
      return '---';
    default:
      return renderInlineMarkdown(node.content);
  }
}

function renderInlineHtml(nodes?: ProseNode[]): string {
  if (!Array.isArray(nodes)) return '';
  return nodes
    .map((node) => {
      if (node.type === 'hardBreak') return '<br />';
      if (node.type !== 'text') return renderInlineHtml(node.content);
      let html = escapeHtml(node.text ?? '');
      for (const mark of node.marks ?? []) {
        if (mark.type === 'code') html = `<code>${html}</code>`;
        else if (mark.type === 'bold') html = `<strong>${html}</strong>`;
        else if (mark.type === 'italic') html = `<em>${html}</em>`;
        else if (mark.type === 'strike') html = `<s>${html}</s>`;
        else if (mark.type === 'underline') html = `<u>${html}</u>`;
      }
      return html;
    })
    .join('');
}

function renderBlockHtml(node: ProseNode): string {
  switch (node.type) {
    case 'doc':
      return (node.content ?? []).map(renderBlockHtml).join('\n');
    case 'heading': {
      const level = Math.min(3, Math.max(1, Number(node.attrs?.level) || 1));
      return `<h${level}>${renderInlineHtml(node.content)}</h${level}>`;
    }
    case 'paragraph': {
      const content = renderInlineHtml(node.content);
      return content ? `<p>${content}</p>` : '<p>&nbsp;</p>';
    }
    case 'blockquote':
      return `<blockquote>${(node.content ?? []).map(renderBlockHtml).join('\n')}</blockquote>`;
    case 'bulletList':
      return `<ul>${(node.content ?? [])
        .map((li) => `<li>${(li.content ?? []).map(renderBlockHtml).join('')}</li>`)
        .join('')}</ul>`;
    case 'orderedList':
      return `<ol>${(node.content ?? [])
        .map((li) => `<li>${(li.content ?? []).map(renderBlockHtml).join('')}</li>`)
        .join('')}</ol>`;
    case 'codeBlock': {
      const code = escapeHtml((node.content ?? []).map((n) => n.text ?? '').join(''));
      return `<pre><code>${code}</code></pre>`;
    }
    case 'horizontalRule':
      return '<hr />';
    default:
      return renderInlineHtml(node.content);
  }
}

export function extractPlainTextFromJson(contentJson: string): string {
  try {
    const parsed = JSON.parse(contentJson) as ProseNode;
    const walk = (node: ProseNode): string => {
      if (node.type === 'text') return node.text ?? '';
      if (node.type === 'hardBreak') return '\n';
      const children = (node.content ?? []).map(walk);
      if (
        node.type === 'doc' ||
        node.type === 'bulletList' ||
        node.type === 'orderedList' ||
        node.type === 'blockquote'
      ) {
        return children.filter(Boolean).join('\n');
      }
      if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'listItem') {
        return children.join('');
      }
      return children.join('');
    };
    return walk(parsed).trim();
  } catch {
    return '';
  }
}

export function exportDocumentAsMarkdown(doc: LoreDocument, meta?: DocumentExportMeta) {
  const title = getDocumentDisplayTitle(doc.title);
  let body = doc.plainText;
  try {
    body = renderBlockMarkdown(JSON.parse(doc.contentJson) as ProseNode);
  } catch {
    // Fallback to plainText
  }

  const metaLines: string[] = [];
  if (meta?.gameTitle) metaLines.push(`Game: ${meta.gameTitle}`);
  if (meta?.collectionName) metaLines.push(`Collection: ${meta.collectionName}`);
  if (doc.tags.length > 0) metaLines.push(`Tags: ${doc.tags.map((t) => `#${t}`).join(' ')}`);

  const header =
    metaLines.length > 0
      ? `# ${title}\n\n_${metaLines.join(' · ')}_\n\n---\n\n`
      : `# ${title}\n\n`;

  triggerFileDownload(
    `${safeFileSlug(title)}.md`,
    `${header}${body}\n`,
    'text/markdown;charset=utf-8',
  );
}

export function exportDocumentAsTxt(doc: LoreDocument, meta?: DocumentExportMeta) {
  const title = getDocumentDisplayTitle(doc.title);
  const metaLines: string[] = [];
  if (meta?.gameTitle) metaLines.push(`Game: ${meta.gameTitle}`);
  if (meta?.collectionName) metaLines.push(`Collection: ${meta.collectionName}`);
  if (doc.tags.length > 0) metaLines.push(`Tags: ${doc.tags.map((t) => `#${t}`).join(', ')}`);

  const header =
    metaLines.length > 0
      ? `${title}\n${'='.repeat(Math.min(60, title.length))}\n${metaLines.join(' | ')}\n\n`
      : `${title}\n${'='.repeat(Math.min(60, title.length))}\n\n`;

  triggerFileDownload(
    `${safeFileSlug(title)}.txt`,
    `${header}${doc.plainText}\n`,
    'text/plain;charset=utf-8',
  );
}

export function exportDocumentAsJson(doc: LoreDocument, meta?: DocumentExportMeta) {
  const title = getDocumentDisplayTitle(doc.title);
  let parsedContent: unknown = null;
  try {
    parsedContent = JSON.parse(doc.contentJson);
  } catch {
    parsedContent = doc.plainText;
  }

  const payload = {
    app: 'LOREKEEP',
    type: 'document',
    exportedAt: new Date().toISOString(),
    document: {
      id: doc.id,
      title,
      game: meta?.gameTitle ?? null,
      collection: meta?.collectionName ?? null,
      tags: doc.tags,
      wordCount: doc.wordCount,
      charCount: doc.charCount,
      createdAt: new Date(doc.createdAt).toISOString(),
      updatedAt: new Date(doc.updatedAt).toISOString(),
      plainText: doc.plainText,
      content: parsedContent,
    },
  };

  triggerFileDownload(
    `${safeFileSlug(title)}.json`,
    JSON.stringify(payload, null, 2),
    'application/json;charset=utf-8',
  );
}

export function exportDocumentAsPdf(doc: LoreDocument, meta?: DocumentExportMeta) {
  const title = getDocumentDisplayTitle(doc.title);
  let bodyHtml = `<p>${escapeHtml(doc.plainText).replace(/\n/g, '<br />')}</p>`;
  try {
    bodyHtml = renderBlockHtml(JSON.parse(doc.contentJson) as ProseNode);
  } catch {
    // Fallback to plainText HTML
  }

  const metaParts: string[] = [];
  if (meta?.gameTitle) metaParts.push(escapeHtml(meta.gameTitle));
  if (meta?.collectionName) metaParts.push(escapeHtml(meta.collectionName));
  if (doc.tags.length > 0) metaParts.push(doc.tags.map((t) => `#${escapeHtml(t)}`).join(' '));
  metaParts.push(escapeHtml(formatExactDateTime(doc.updatedAt)));

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)} — LOREKEEP</title>
<style>
  @page { margin: 22mm 20mm; }
  body {
    font-family: 'Georgia', 'Times New Roman', serif;
    color: #16181d;
    line-height: 1.72;
    font-size: 11.5pt;
    max-width: 680px;
    margin: 0 auto;
  }
  header {
    border-bottom: 1px solid #d5d8e0;
    padding-bottom: 12px;
    margin-bottom: 24px;
  }
  h1.doc-title {
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    font-size: 22pt;
    line-height: 1.2;
    margin: 0 0 8px;
    letter-spacing: -0.02em;
  }
  .doc-meta {
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    font-size: 9pt;
    color: #5b6270;
  }
  h1 { font-size: 16pt; margin: 1.5em 0 0.5em; font-family: system-ui, sans-serif; }
  h2 { font-size: 13.5pt; margin: 1.35em 0 0.45em; font-family: system-ui, sans-serif; }
  h3 { font-size: 11.5pt; margin: 1.2em 0 0.4em; font-family: system-ui, sans-serif; }
  p { margin: 0 0 0.95em; }
  blockquote {
    margin: 1.2em 0;
    padding: 0.2em 0 0.2em 1.1em;
    border-left: 2.5px solid #4b5ee8;
    color: #3d4350;
    font-style: italic;
  }
  ul, ol { margin: 0 0 1em; padding-left: 1.4em; }
  li { margin-bottom: 0.25em; }
  code {
    font-family: Consolas, monospace;
    font-size: 9.5pt;
    background: #f1f3f7;
    padding: 1px 4px;
    border-radius: 3px;
  }
  pre {
    background: #f4f6fa;
    border: 1px solid #e1e4ec;
    padding: 10px 12px;
    border-radius: 6px;
    overflow-x: auto;
  }
  hr { border: none; border-top: 1px solid #d5d8e0; margin: 1.8em 0; }
</style>
</head>
<body>
  <header>
    <h1 class="doc-title">${escapeHtml(title)}</h1>
    <div class="doc-meta">${metaParts.join(' · ')}</div>
  </header>
  <main>${bodyHtml}</main>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc || !iframe.contentWindow) {
    document.body.removeChild(iframe);
    return;
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  window.setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    window.setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 1500);
  }, 150);
}

export function downloadWorkspaceBackupJson(payload: WorkspaceBackupPayload) {
  const dateStamp = new Date().toISOString().slice(0, 10);
  triggerFileDownload(
    `lorekeep-backup-${dateStamp}.json`,
    JSON.stringify(payload, null, 2),
    'application/json;charset=utf-8',
  );
}
