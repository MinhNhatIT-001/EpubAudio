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

// Phrase boundaries are an audio index only; book markup remains untouched.
export function phraseRange(text, position) {
  const boundary = index => /[.,;:!?…\n\r]/.test(text[index]) && !(text[index] === '.' && /\d/.test(text[index - 1] || '') && /\d/.test(text[index + 1] || ''));
  let point = Math.max(0, Math.min(position, text.length - 1));
  while (point < text.length - 1 && /\s/.test(text[point])) point++;
  let start = point, end = point;
  while (start > 0 && !boundary(start - 1)) start--;
  while (end < text.length && !boundary(end)) end++;
  if (end < text.length) end++;
  while (end < text.length && /[.!?…“”"’')\]]/.test(text[end])) end++;
  while (start < end && /\s/.test(text[start])) start++;
  return [start, end];
}

// Safari may return an element caret; fall back to its selected word or glyph boxes.
export function textPoint(doc, entries, x, y, target) {
  const resolve=(node,offset)=>{const entry=entries.find(e=>e.node===node);return entry?entry.start+Math.min(offset, node.length):null;};
  try {const caret=doc.caretPositionFromPoint?.(x,y);const point=caret && resolve(caret.offsetNode,caret.offset);if(point!=null)return point;}catch{}
  try {const caret=doc.caretRangeFromPoint?.(x,y);const point=caret && resolve(caret.startContainer,caret.startOffset);if(point!=null)return point;}catch{}
  const selection=doc.defaultView.getSelection();
  if(selection?.rangeCount){const range=selection.getRangeAt(0);const rect=range.getBoundingClientRect();if(x>=rect.left-3 && x<=rect.right+3 && y>=rect.top-3 && y<=rect.bottom+3){const point=resolve(range.startContainer,range.startOffset);if(point!=null)return point;}}
  const element=target?.nodeType===1?target:target?.parentElement;
  for(const entry of entries){if(element && !element.contains(entry.node))continue;
    const range=doc.createRange();range.selectNodeContents(entry.node);
    if(!Array.from(range.getClientRects()).some(r=>x>=r.left-3 && x<=r.right+3 && y>=r.top-3 && y<=r.bottom+3))continue;
    for(let offset=0;offset<entry.node.length;offset++){range.setStart(entry.node,offset);range.setEnd(entry.node,offset+1);const r=range.getBoundingClientRect();if(x>=r.left-3 && x<=r.right+3 && y>=r.top-3 && y<=r.bottom+3)return entry.start+offset;}
  }
  return null;
}
