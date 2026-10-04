// A parallel text index for speech. The EPUB DOM is never wrapped or rewritten.
export function indexText(doc) {
  const walker = doc.createTreeWalker(doc.body, 4);
  const entries = [];
  let text = '', node, previousBlock = null;
  while ((node = walker.nextNode())) {
    if (node.parentElement?.closest('script,style,noscript,[hidden],[aria-hidden="true"]')) continue;
    const block = node.parentElement?.closest('p,h1,h2,h3,h4,h5,h6,li,blockquote,div,section,figcaption,td');
    if (block && block !== previousBlock && text && !/\s$/.test(text)) text += '\n\n';
    previousBlock = block;
    const value = node.textContent;
    if (!value) continue;
    entries.push({ node, start: text.length, end: text.length + value.length });
    text += value;
  }
  return { text, entries };
}
export function wordRange(text, position) {
  let start = Math.max(0, Math.min(position, text.length));
  let end = start;
  while (start > 0 && !/\s/.test(text[start - 1])) start--;
  while (end < text.length && !/\s/.test(text[end])) end++;
  return [start, end];
}
export function charAtTime(starts, time) {
  let lo = 0, hi = starts.length - 1, answer = 0;
  while (lo <= hi) {
    const middle = (lo + hi) >> 1;
    if (starts[middle] <= time) { answer = middle; lo = middle + 1; }
    else hi = middle - 1;
  }
  return answer;
}
export function domRange(doc, entries, start, end) {
  const first = entries.find(x => x.end > start);
  const last = entries.find(x => x.end >= end && x.start < end);
  if (!first || !last || end <= start) return null;
  const range = doc.createRange();
  range.setStart(first.node, Math.max(0, start - first.start));
  range.setEnd(last.node, Math.min(last.node.length, end - last.start));
  return range;
}
export function offsetOf(entries, node, offset = 0) {
  const entry = entries.find(x => x.node === node);
  return entry ? entry.start + offset : 0;
}
