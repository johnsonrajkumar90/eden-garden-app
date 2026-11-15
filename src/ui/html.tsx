// Text from the website shown natively (policies, terms): headings, paragraphs, lists, bold, italics and links.
import React from 'react';
import { Linking, Text, View } from 'react-native';
import { Brand, Fonts } from '../theme';
import { Nav } from '../nav';

type Node = { tag: string; attrs: Record<string, string>; children: (Node | string)[] };

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…', rupee: '₹', copy: '©', middot: '·', bull: '•' };
const decode = (s: string) => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENT[e.toLowerCase()] ?? m);
const VOID = new Set(['br', 'img', 'hr', 'input', 'meta', 'link']);

function parse(html: string): Node {
  const root: Node = { tag: 'root', attrs: {}, children: [] };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<\/?([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[0].startsWith('<!--')) continue;
    const top = stack[stack.length - 1];
    if (m[3] !== undefined) { top.children.push(decode(m[3])); continue; }
    const tag = m[1].toLowerCase();
    if (m[0].startsWith('</')) { for (let i = stack.length - 1; i > 0; i--) if (stack[i].tag === tag) { stack.length = i; break; } continue; }
    const attrs: Record<string, string> = {};
    (m[2] || '').replace(/([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g, (_s, k, _v, a, b, c) => { attrs[k.toLowerCase()] = decode(a ?? b ?? c ?? ''); return ''; });
    const n: Node = { tag, attrs, children: [] };
    top.children.push(n);
    if (!VOID.has(tag) && !m[0].endsWith('/>') && !['script', 'style'].includes(tag)) stack.push(n);
  }
  return root;
}

const BLOCK = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'section', 'article', 'table', 'tr', 'blockquote', 'hr']);
const isBlock = (n: Node | string) => typeof n !== 'string' && BLOCK.has(n.tag);
const openLink = (href: string) => { if (/^(mailto|tel):/.test(href)) Linking.openURL(href).catch(() => {}); else Nav.openLink(href); };

function inline(nodes: (Node | string)[], key = ''): React.ReactNode[] {
  return nodes.map((n, i) => {
    const k = key + i;
    if (typeof n === 'string') return n.replace(/\s+/g, ' ');
    if (n.tag === 'br') return '\n';
    const kids = inline(n.children, k + '.');
    if (n.tag === 'b' || n.tag === 'strong') return <Text key={k} style={{ fontFamily: Fonts.bold }}>{kids}</Text>;
    if (n.tag === 'i' || n.tag === 'em') return <Text key={k} style={{ fontStyle: 'italic' }}>{kids}</Text>;
    if (n.tag === 'a') return <Text key={k} style={{ color: Brand.Blue, textDecorationLine: 'underline' }} onPress={() => n.attrs.href && openLink(n.attrs.href)}>{kids}</Text>;
    if (['script', 'style'].includes(n.tag)) return null;
    return <Text key={k}>{kids}</Text>;
  });
}

function blocks(nodes: (Node | string)[], key = '', listKind: string | null = null): React.ReactNode[] {
  const out: React.ReactNode[] = []; let run: (Node | string)[] = []; let li = 0;
  const flush = () => {
    const t = run; run = [];
    if (!t.some((x) => (typeof x === 'string' ? x.trim() : true))) return;
    out.push(<Text key={key + 'r' + out.length} style={{ fontFamily: Fonts.regular, fontSize: 15, lineHeight: 22, color: Brand.Ink, marginBottom: 8 }}>{inline(t, key + 'i' + out.length)}</Text>);
  };
  nodes.forEach((n, i) => {
    if (!isBlock(n)) { run.push(n); return; }
    flush();
    const b = n as Node; const k = key + i;
    if (/^h[1-6]$/.test(b.tag)) out.push(<Text key={k} style={{ fontFamily: Fonts.s, fontSize: b.tag === 'h1' ? 22 : b.tag === 'h2' ? 19 : 17, color: Brand.Ink, marginTop: 8, marginBottom: 6 }}>{inline(b.children, k)}</Text>);
    else if (b.tag === 'ul' || b.tag === 'ol') out.push(<View key={k} style={{ marginBottom: 8 }}>{blocks(b.children, k + '.', b.tag)}</View>);
    else if (b.tag === 'li') { li++; out.push(<View key={k} style={{ flexDirection: 'row', marginBottom: 4 }}><Text style={{ fontFamily: Fonts.regular, fontSize: 15, lineHeight: 22, color: Brand.Ink, width: 22 }}>{listKind === 'ol' ? `${li}.` : '•'}</Text><View style={{ flex: 1 }}>{blocks(b.children, k + '.')}</View></View>); }
    else if (b.tag === 'hr') out.push(<View key={k} style={{ height: 1, backgroundColor: Brand.Line, marginVertical: 8 }} />);
    else out.push(<View key={k}>{blocks(b.children, k + '.')}</View>);
  });
  flush();
  return out;
}

export function HtmlText({ html }: { html: string }) {
  return <View>{blocks(parse(html).children)}</View>;
}
