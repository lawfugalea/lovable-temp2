type JsonNode = {
  type?: unknown
  attrs?: Record<string, unknown>
  content?: unknown[]
  [key: string]: unknown
}

function isNode(value: unknown): value is JsonNode {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function setTaskItemChecked(document: unknown, path: number[], checked: boolean): unknown | null {
  if (!isNode(document) || document.type !== 'doc' || !path.length || path.some(index => !Number.isInteger(index) || index < 0)) return null
  let changed = false
  const update = (value: unknown, depth: number): unknown => {
    if (!isNode(value)) return value
    if (depth === path.length) {
      if (value.type !== 'taskItem') return value
      changed = true
      return { ...value, attrs: { ...(value.attrs || {}), checked } }
    }
    const index = path[depth]
    if (index === undefined || !Array.isArray(value.content) || index >= value.content.length) return value
    const child = value.content[index]
    const nextChild = update(child, depth + 1)
    if (child === nextChild) return value
    const content = [...value.content]
    content[index] = nextChild
    return { ...value, content }
  }
  const result = update(document, 0)
  return changed ? result : null
}
