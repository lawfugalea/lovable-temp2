import { Ionicons } from '@expo/vector-icons'
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { fontFamilies, radii, spacing, type ThemeColors, useAppTheme } from '@/theme'

type RichNode = {
  type?: string
  text?: string
  attrs?: Record<string, unknown>
  marks?: { type?: string }[]
  content?: RichNode[]
}

type ToggleTask = (path: number[], checked: boolean) => void
type PreviewLine = { kind: 'text' | 'bullet' | 'task'; text: string; checked?: boolean; marker?: string; path?: number[] }

function asNode(value: unknown): RichNode | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RichNode : null
}

function plainText(node: RichNode): string {
  if (node.type === 'text') return node.text || ''
  if (node.type === 'hardBreak') return '\n'
  return (node.content || []).map(plainText).join('')
}

function previewLines(contentJson: unknown, contentText: string): PreviewLine[] {
  const document = asNode(contentJson)
  const blocks = document?.type === 'doc' && Array.isArray(document.content) ? document.content : []
  const lines: PreviewLine[] = []
  for (const [blockIndex, node] of blocks.entries()) {
    if (node.type === 'taskList') {
      for (const [itemIndex, item] of (node.content || []).entries()) lines.push({ kind: 'task', text: plainText(item).trim(), checked: item.attrs?.checked === true, path: [blockIndex, itemIndex] })
    } else if (node.type === 'bulletList' || node.type === 'orderedList') {
      for (const [index, item] of (node.content || []).entries()) lines.push({ kind: 'bullet', text: plainText(item).trim(), marker: node.type === 'orderedList' ? `${index + 1}.` : '•' })
    } else {
      const text = plainText(node).trim()
      if (text) lines.push({ kind: 'text', text })
    }
    if (lines.length >= 5) break
  }
  if (!lines.length) lines.push({ kind: 'text', text: contentText || 'Empty note' })
  return lines.slice(0, 5)
}

function TaskCheckbox({ checked, size, colors, path, onToggleTask }: { checked: boolean; size: number; colors: ThemeColors; path: number[]; onToggleTask?: ToggleTask }) {
  const icon = <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={size} color={checked ? colors.primary : colors.muted} />
  if (!onToggleTask) return icon
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={checked ? 'Mark checklist item incomplete' : 'Mark checklist item complete'} accessibilityState={{ checked }} hitSlop={10} onPress={event => { event.stopPropagation(); onToggleTask(path, !checked) }} style={({ pressed }) => pressed && styles.checkboxPressed}>{icon}</Pressable>
}

function inline(node: RichNode, key: string, colors: ThemeColors, checked = false): ReactNode {
  if (node.type === 'hardBreak') return '\n'
  if (node.type !== 'text') return (node.content || []).map((child, index) => inline(child, `${key}-${index}`, colors, checked))
  const marks = new Set((node.marks || []).map(mark => mark.type))
  return <Text key={key} style={[
    marks.has('bold') && styles.bold,
    marks.has('italic') && styles.italic,
    marks.has('underline') && styles.underline,
    marks.has('strike') && styles.strike,
    marks.has('code') && [styles.inlineCode, { backgroundColor: colors.backgroundRaised }],
    marks.has('link') && { color: colors.primary },
    checked && { color: colors.muted, textDecorationLine: 'line-through' },
  ]}>{node.text || ''}</Text>
}

function block(node: RichNode, key: string, colors: ThemeColors, checked = false, onToggleTask?: ToggleTask, path: number[] = []): ReactNode {
  const children = node.content || []
  if (node.type === 'paragraph') return <Text key={key} style={[styles.paragraph, { color: checked ? colors.muted : colors.text }, checked && styles.strike]}>{children.map((child, index) => inline(child, `${key}-i${index}`, colors, checked))}</Text>
  if (node.type === 'heading') {
    const level = Number(node.attrs?.level) || 2
    return <Text key={key} style={[styles.heading, level === 1 ? styles.headingOne : level === 3 ? styles.headingThree : styles.headingTwo, { color: colors.text }]}>{children.map((child, index) => inline(child, `${key}-i${index}`, colors))}</Text>
  }
  if (node.type === 'taskList') return <View key={key} style={styles.list}>{children.map((item, index) => {
    const itemChecked = item.attrs?.checked === true
    const itemPath = [...path, index]
    return <View key={`${key}-${index}`} style={styles.taskRow}><TaskCheckbox checked={itemChecked} size={23} colors={colors} path={itemPath} onToggleTask={onToggleTask} /><View style={styles.flex}>{(item.content || []).map((child, childIndex) => block(child, `${key}-${index}-${childIndex}`, colors, itemChecked, onToggleTask, [...itemPath, childIndex]))}</View></View>
  })}</View>
  if (node.type === 'bulletList' || node.type === 'orderedList') return <View key={key} style={styles.list}>{children.map((item, index) => <View key={`${key}-${index}`} style={styles.listRow}><Text style={[styles.marker, { color: colors.muted }]}>{node.type === 'orderedList' ? `${index + 1}.` : '•'}</Text><View style={styles.flex}>{(item.content || []).map((child, childIndex) => block(child, `${key}-${index}-${childIndex}`, colors, false, onToggleTask, [...path, index, childIndex]))}</View></View>)}</View>
  if (node.type === 'listItem' || node.type === 'taskItem' || node.type === 'doc') return <View key={key}>{children.map((child, index) => block(child, `${key}-${index}`, colors, checked || node.attrs?.checked === true, onToggleTask, [...path, index]))}</View>
  if (node.type === 'blockquote') return <View key={key} style={[styles.quote, { borderLeftColor: colors.notes }]}>{children.map((child, index) => block(child, `${key}-${index}`, colors, false, onToggleTask, [...path, index]))}</View>
  if (node.type === 'codeBlock') return <View key={key} style={[styles.codeBlock, { backgroundColor: colors.backgroundRaised }]}><Text style={[styles.codeText, { color: colors.text }]}>{children.map((child, index) => inline(child, `${key}-${index}`, colors))}</Text></View>
  if (node.type === 'horizontalRule') return <View key={key} style={[styles.rule, { backgroundColor: colors.border }]} />
  return children.length ? <View key={key}>{children.map((child, index) => block(child, `${key}-${index}`, colors, checked, onToggleTask, [...path, index]))}</View> : null
}

export function RichNoteView({ contentJson, contentText, onToggleTask }: { contentJson: unknown; contentText: string; onToggleTask?: ToggleTask }) {
  const { colors } = useAppTheme()
  const document = asNode(contentJson)
  const blocks = document?.type === 'doc' && Array.isArray(document.content) ? document.content : []
  if (!blocks.length) return <Text style={[styles.empty, { color: colors.muted }]}>{contentText || 'This note is empty.'}</Text>
  return <View style={styles.document}>{blocks.map((node, index) => block(node, `block-${index}`, colors, false, onToggleTask, [index]))}</View>
}

export function RichNotePreview({ contentJson, contentText, onToggleTask }: { contentJson: unknown; contentText: string; onToggleTask?: ToggleTask }) {
  const { colors } = useAppTheme()
  return <View style={styles.preview}>{previewLines(contentJson, contentText).map((line, index) => <View key={`${line.kind}-${index}`} style={styles.previewRow}>
    {line.kind === 'task' ? <TaskCheckbox checked={line.checked === true} size={18} colors={colors} path={line.path || []} onToggleTask={onToggleTask} /> : null}
    {line.kind === 'bullet' ? <Text style={[styles.previewMarker, { color: colors.muted }]}>{line.marker}</Text> : null}
    <Text numberOfLines={line.kind === 'text' ? 2 : 1} style={[styles.previewText, { color: line.checked ? colors.muted : colors.text }, line.checked && styles.strike]}>{line.text || 'Empty item'}</Text>
  </View>)}</View>
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  document: { gap: spacing.xs },
  paragraph: { fontFamily: fontFamilies.body, fontSize: 17, lineHeight: 26, marginBottom: spacing.sm },
  heading: { fontFamily: fontFamilies.displayBold, lineHeight: 30, marginTop: spacing.sm, marginBottom: spacing.xs },
  headingOne: { fontSize: 28, lineHeight: 34 },
  headingTwo: { fontSize: 23, lineHeight: 29 },
  headingThree: { fontSize: 19, lineHeight: 25 },
  bold: { fontFamily: fontFamilies.bodyBold },
  italic: { fontStyle: 'italic' },
  underline: { textDecorationLine: 'underline' },
  strike: { textDecorationLine: 'line-through' },
  inlineCode: { fontFamily: 'monospace', fontSize: 15 },
  list: { gap: spacing.xs, marginBottom: spacing.sm },
  taskRow: { minHeight: 32, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  marker: { width: 24, fontFamily: fontFamilies.bodyBold, fontSize: 16, lineHeight: 25, textAlign: 'right' },
  quote: { borderLeftWidth: 3, paddingLeft: spacing.md, marginBottom: spacing.sm },
  codeBlock: { borderRadius: radii.medium, padding: spacing.md, marginBottom: spacing.sm },
  codeText: { fontFamily: 'monospace', fontSize: 14, lineHeight: 21 },
  rule: { height: StyleSheet.hairlineWidth, marginVertical: spacing.md },
  empty: { fontFamily: fontFamilies.body, fontSize: 16, lineHeight: 24, fontStyle: 'italic' },
  preview: { gap: 5 },
  previewRow: { minHeight: 21, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  previewMarker: { width: 18, fontFamily: fontFamilies.bodyBold, fontSize: 14, lineHeight: 20, textAlign: 'right' },
  previewText: { flex: 1, fontFamily: fontFamilies.body, fontSize: 15, lineHeight: 20 },
  checkboxPressed: { opacity: 0.55, transform: [{ scale: 0.9 }] },
})
