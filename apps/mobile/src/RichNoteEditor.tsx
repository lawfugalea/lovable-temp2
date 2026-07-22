import { Ionicons } from '@expo/vector-icons'
import { useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'
import { radii, useAppTheme } from '@/theme'

type EditorValue = { contentJson: unknown; contentText: string }

function escapeHtml(value: string) { return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') }
function safeHref(value: unknown) { if (typeof value !== 'string') return ''; return /^(https?:|mailto:|tel:|\/|#|\?)/i.test(value) ? escapeHtml(value) : '' }
function renderNode(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ''
  const node = value as { type?: string; text?: string; attrs?: Record<string, unknown>; marks?: { type?: string; attrs?: Record<string, unknown> }[]; content?: unknown[] }
  if (node.type === 'text') {
    let text = escapeHtml(node.text || '')
    for (const mark of node.marks || []) {
      if (mark.type === 'bold') text = `<strong>${text}</strong>`
      else if (mark.type === 'italic') text = `<em>${text}</em>`
      else if (mark.type === 'underline') text = `<u>${text}</u>`
      else if (mark.type === 'strike') text = `<s>${text}</s>`
      else if (mark.type === 'code') text = `<code>${text}</code>`
      else if (mark.type === 'link') { const href = safeHref(mark.attrs?.href); if (href) text = `<a href="${href}">${text}</a>` }
    }
    return text
  }
  if (node.type === 'hardBreak') return '<br>'
  if (node.type === 'horizontalRule') return '<hr>'
  const children = (node.content || []).map(renderNode).join('')
  if (node.type === 'doc') return children
  if (node.type === 'heading') { const level = Number(node.attrs?.level); const tag = level >= 1 && level <= 3 ? `h${level}` : 'h2'; return `<${tag}>${children}</${tag}>` }
  if (node.type === 'taskList') return `<ul data-type="taskList" class="task-list">${children}</ul>`
  if (node.type === 'bulletList') return `<ul>${children}</ul>`
  if (node.type === 'orderedList') return `<ol>${children}</ol>`
  if (node.type === 'taskItem') {
    const checked = node.attrs?.checked === true
    return `<li data-type="taskItem" data-checked="${checked}"><input data-task-checkbox type="checkbox" contenteditable="false"${checked ? ' checked' : ''}>${children}</li>`
  }
  if (node.type === 'listItem') return `<li>${children}</li>`
  if (node.type === 'blockquote') return `<blockquote>${children}</blockquote>`
  if (node.type === 'codeBlock') return `<pre><code>${children}</code></pre>`
  return `<p>${children || '<br>'}</p>`
}

const serializer = String.raw`
function marksFor(node) {
  const marks=[]; let current=node.parentElement;
  while(current && current.id!=='editor') {
    const tag=current.tagName.toLowerCase();
    if(tag==='b'||tag==='strong') marks.push({type:'bold'});
    if(tag==='i'||tag==='em') marks.push({type:'italic'});
    if(tag==='u') marks.push({type:'underline'});
    if(tag==='s'||tag==='strike') marks.push({type:'strike'});
    if(tag==='code' && current.parentElement?.tagName.toLowerCase()!=='pre') marks.push({type:'code'});
    if(tag==='a') marks.push({type:'link',attrs:{href:current.getAttribute('href')||''}});
    current=current.parentElement;
  }
  return marks;
}
function inlineNodes(element) {
  const output=[];
  function visit(node) {
    if(node.nodeType===3) { if(node.nodeValue) { const marks=marksFor(node); output.push({type:'text',text:node.nodeValue,...(marks.length?{marks}:{})}); } return; }
    if(node.nodeType!==1) return;
    if(node.tagName.toLowerCase()==='br') { output.push({type:'hardBreak'}); return; }
    Array.from(node.childNodes).forEach(visit);
  }
  Array.from(element.childNodes).forEach(visit); return output;
}
function ensureTaskItem(item) {
  item.dataset.type='taskItem';
  if(item.dataset.checked!=='true') item.dataset.checked='false';
  let checkbox=Array.from(item.children).find(child=>child.matches?.('input[data-task-checkbox]'));
  if(!checkbox) {
    checkbox=document.createElement('input'); checkbox.type='checkbox'; checkbox.dataset.taskCheckbox=''; checkbox.contentEditable='false'; item.insertBefore(checkbox,item.firstChild);
  }
  checkbox.checked=item.dataset.checked==='true';
}
function normalizeTaskLists(root) {
  root.querySelectorAll('ul[data-type="taskList"]').forEach(list=>Array.from(list.children).filter(item=>item.tagName.toLowerCase()==='li').forEach(ensureTaskItem));
}
let savedRange=null;
function rememberSelection() {
  const selection=window.getSelection();
  if(selection?.rangeCount && editor.contains(selection.anchorNode)) savedRange=selection.getRangeAt(0).cloneRange();
}
function restoreSelection() {
  const selection=window.getSelection();
  editor.focus();
  if(selection?.rangeCount && editor.contains(selection.anchorNode)) return selection;
  const range=document.createRange();
  if(savedRange) {
    try { selection.removeAllRanges(); selection.addRange(savedRange); return selection; } catch { savedRange=null; }
  }
  range.selectNodeContents(editor); range.collapse(false); selection.removeAllRanges(); selection.addRange(range); return selection;
}
function placeCaret(element) {
  const selection=window.getSelection(); const range=document.createRange();
  editor.focus(); range.selectNodeContents(element); range.collapse(false); selection.removeAllRanges(); selection.addRange(range); savedRange=range.cloneRange();
}
function blockNode(element) {
  const tag=element.tagName.toLowerCase();
  if(tag==='hr') return {type:'horizontalRule'};
  if(tag==='ul'||tag==='ol') { const task=tag==='ul'&&element.dataset.type==='taskList'; return {type:task?'taskList':tag==='ul'?'bulletList':'orderedList',content:Array.from(element.children).filter(x=>x.tagName.toLowerCase()==='li').map(blockNode)}; }
  if(tag==='li') { const task=element.dataset.type==='taskItem'||element.parentElement?.dataset.type==='taskList'; const nested=Array.from(element.children).find(x=>['ul','ol'].includes(x.tagName.toLowerCase())); const copy=element.cloneNode(true); copy.querySelectorAll('input,ul,ol').forEach(x=>x.remove()); const inline=inlineNodes(copy); const content=[{type:'paragraph',...(inline.length?{content:inline}:{})}]; if(nested) content.push(blockNode(nested)); return {type:task?'taskItem':'listItem',...(task?{attrs:{checked:element.dataset.checked==='true'}}:{}),content}; }
  if(tag==='blockquote') return {type:'blockquote',content:[{type:'paragraph',content:inlineNodes(element)}]};
  if(tag==='pre') return {type:'codeBlock',content:[{type:'text',text:element.innerText||''}]};
  if(/^h[1-3]$/.test(tag)) return {type:'heading',attrs:{level:Number(tag.slice(1))},content:inlineNodes(element)};
  return {type:'paragraph',content:inlineNodes(element)};
}
function emit() {
  const editor=document.getElementById('editor');
  normalizeTaskLists(editor);
  const content=Array.from(editor.children).map(blockNode);
  if(!content.length) content.push({type:'paragraph'});
  window.ReactNativeWebView.postMessage(JSON.stringify({contentJson:{type:'doc',content},contentText:editor.innerText||''}));
}
function toggleChecklist() {
  const selection=restoreSelection();
  let current=selection?.anchorNode; if(current?.nodeType===3) current=current.parentElement;
  let item=current?.closest?.('li'); let list=item?.parentElement;
  if(list?.tagName.toLowerCase()==='ul'&&list.dataset.type==='taskList') {
    delete list.dataset.type; list.classList.remove('task-list');
    Array.from(list.children).forEach(row=>{ delete row.dataset.type; delete row.dataset.checked; row.querySelector(':scope > input[data-task-checkbox]')?.remove(); });
  } else {
    if(item&&list?.tagName.toLowerCase()==='ul') {
      list.dataset.type='taskList'; list.classList.add('task-list'); normalizeTaskLists(list); placeCaret(item);
    } else {
      let block=current;
      while(block&&block!==editor&&block.parentElement!==editor) block=block.parentElement;
      const taskList=document.createElement('ul'); taskList.dataset.type='taskList'; taskList.classList.add('task-list');
      const taskItem=document.createElement('li'); taskItem.dataset.type='taskItem'; taskItem.dataset.checked='false'; taskList.appendChild(taskItem);
      let content;
      if(block&&block!==editor&&block.parentElement===editor&&!['UL','OL'].includes(block.tagName)) { content=block; block.replaceWith(taskList); }
      else { content=document.createElement('p'); content.appendChild(document.createElement('br')); editor.appendChild(taskList); }
      taskItem.appendChild(content); ensureTaskItem(taskItem); placeCaret(content);
    }
  }
  emit();
}
const editor=document.getElementById('editor');
document.addEventListener('selectionchange',rememberSelection);
editor.addEventListener('input',emit);
editor.addEventListener('change',event=>{ const target=event.target; if(target?.matches?.('input[data-task-checkbox]')) { const item=target.closest('li'); if(item) item.dataset.checked=target.checked?'true':'false'; emit(); } });
editor.addEventListener('keydown',event=>{
  if(event.key!=='Enter'||event.shiftKey) return;
  let current=window.getSelection()?.anchorNode; if(current?.nodeType===3) current=current.parentElement;
  const item=current?.closest?.('li'); const list=item?.parentElement;
  if(!item||list?.dataset.type!=='taskList') return;
  event.preventDefault();
  const next=document.createElement('li'); next.dataset.type='taskItem'; next.dataset.checked='false';
  const paragraph=document.createElement('p'); paragraph.appendChild(document.createElement('br')); next.appendChild(paragraph);
  list.insertBefore(next,item.nextSibling); ensureTaskItem(next); placeCaret(paragraph); emit();
});
normalizeTaskLists(editor); emit(); true;
`

export function RichNoteEditor({ initialJson, initialText, editable, onChange }: { initialJson: unknown | null; initialText: string; editable: boolean; onChange: (value: EditorValue) => void }) {
  const { colors } = useAppTheme()
  const ref = useRef<WebView>(null)
  // The WebView owns the live editing document. Keeping its source stable avoids
  // reloading the editor (and dismissing the keyboard) after every onChange.
  const [html] = useState(() => {
    const initial = initialJson && typeof initialJson === 'object' ? renderNode(initialJson) : `<p>${escapeHtml(initialText).replace(/\n/g, '</p><p>')}</p>`
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>html,body{min-height:100%}body{margin:0;background:${colors.card};color:${colors.text};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:17px;line-height:1.55}#editor{min-height:280px;padding:18px;outline:none;caret-color:${colors.primary}}p{margin:0 0 12px}h1,h2,h3{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.2;margin:18px 0 9px}blockquote{border-left:3px solid ${colors.notes};margin:12px 0;padding-left:12px;color:${colors.muted}}pre{background:${colors.backgroundRaised};padding:12px;border-radius:10px;white-space:pre-wrap}a{color:${colors.primary}}ul,ol{padding-left:24px}ul[data-type="taskList"]{list-style:none;padding-left:2px}li[data-type="taskItem"]{display:flex;align-items:flex-start;gap:10px;margin:7px 0}li[data-type="taskItem"]>input{width:20px;height:20px;margin:3px 0 0;accent-color:${colors.primary};flex:0 0 auto}li[data-type="taskItem"]>p,li[data-type="taskItem"]>div{flex:1;margin:0}li[data-checked="true"]>p,li[data-checked="true"]>div{text-decoration:line-through;color:${colors.muted}}hr{border:0;border-top:1px solid ${colors.border}}</style></head><body><div id="editor" contenteditable="${editable ? 'true' : 'false'}">${initial}</div></body></html>`
  })
  const source = useMemo(() => ({ html }), [html])
  const command = (name: string, value?: string) => ref.current?.injectJavaScript(`document.execCommand(${JSON.stringify(name)},false,${value ? JSON.stringify(value) : 'null'});document.getElementById('editor').focus();emit();true;`)
  const checklist = () => ref.current?.injectJavaScript('toggleChecklist();true;')
  const message = (event: WebViewMessageEvent) => { try { onChange(JSON.parse(event.nativeEvent.data) as EditorValue) } catch { /* Ignore malformed editor messages. */ } }
  const tools = [
    { command: 'bold', label: 'Bold', icon: 'text' }, { command: 'italic', label: 'Italic', icon: 'text-outline' }, { command: 'underline', label: 'Underline', icon: 'remove-outline' }, { command: 'strikeThrough', label: 'Strike', icon: 'remove' }, { command: 'insertUnorderedList', label: 'Bullets', icon: 'list' }, { command: 'insertOrderedList', label: 'Numbered list', icon: 'list-outline' },
  ] as const
  return <View style={[styles.wrap, { borderColor: colors.border, backgroundColor: colors.card }]}>{editable ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.toolbar, { borderBottomColor: colors.border, backgroundColor: colors.cardMuted }]}>{tools.map(tool => <Pressable accessibilityLabel={tool.label} accessibilityRole="button" key={tool.command} onPress={() => command(tool.command)} style={({ pressed }) => [styles.tool, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]}><Ionicons name={tool.icon} size={18} color={colors.text} /></Pressable>)}<Pressable accessibilityLabel="Checklist" accessibilityRole="button" onPress={checklist} style={({ pressed }) => [styles.tool, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]}><Ionicons name="checkbox-outline" size={18} color={colors.text} /></Pressable><Pressable accessibilityLabel="Heading" accessibilityRole="button" onPress={() => command('formatBlock', 'h2')} style={({ pressed }) => [styles.tool, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]}><Ionicons name="text-outline" size={18} color={colors.text} /></Pressable><Pressable accessibilityLabel="Undo" accessibilityRole="button" onPress={() => command('undo')} style={({ pressed }) => [styles.tool, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]}><Ionicons name="arrow-undo" size={18} color={colors.text} /></Pressable></ScrollView> : null}<WebView ref={ref} originWhitelist={['about:blank']} source={source} javaScriptEnabled injectedJavaScript={serializer} onMessage={message} onShouldStartLoadWithRequest={request => request.url === 'about:blank'} setSupportMultipleWindows={false} style={[styles.web, { backgroundColor: colors.card }]} /></View>
}

const styles = StyleSheet.create({
  wrap: { minHeight: 380, borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.large, overflow: 'hidden' },
  toolbar: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 7, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth },
  tool: { width: 40, height: 40, borderRadius: 11, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  web: { minHeight: 326 },
})
