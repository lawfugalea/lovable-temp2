import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { NodeViewWrapper } from '@tiptap/react'

// Custom React component for task item
function TaskItemComponent({ node, updateAttributes, editor }) {
  const handleChange = () => {
    updateAttributes({ checked: !node.attrs.checked })
  }

  return (
    <NodeViewWrapper 
      as="li" 
      className="flex items-start gap-2"
      style={{ listStyle: 'none', margin: '0.25rem 0' }}
    >
      <label 
        contentEditable={false} 
        style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: '0.5rem', 
          userSelect: 'none',
          cursor: 'pointer'
        }}
      >
        <input
          type="checkbox"
          checked={node.attrs.checked}
          onChange={handleChange}
          style={{
            width: '10px',
            height: '10px',
            minWidth: '10px',
            minHeight: '10px',
            maxWidth: '10px',
            maxHeight: '10px',
            margin: '0',
            padding: '0',
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            border: '1px solid #9ca3af',
            borderRadius: '2px',
            backgroundColor: node.attrs.checked ? '#3b82f6' : 'white',
            borderColor: node.attrs.checked ? '#3b82f6' : '#9ca3af',
            position: 'relative',
            flexShrink: '0',
            cursor: 'pointer'
          }}
        />
        {node.attrs.checked && (
          <span
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'white',
              fontSize: '7px',
              fontWeight: 'bold',
              lineHeight: '1',
              pointerEvents: 'none',
              marginLeft: '-10px',
              marginTop: '-10px'
            }}
          >
            ✓
          </span>
        )}
      </label>
      <div 
        style={{ flex: '1' }}
        className="task-item-content"
        suppressContentEditableWarning={true}
      />
    </NodeViewWrapper>
  )
}

// Custom TaskItem extension
export const CustomTaskItem = Node.create({
  name: 'taskItem',
  
  addOptions() {
    return {
      nested: true,
      HTMLAttributes: {},
    }
  },

  group: 'listItem',
  content: 'paragraph block*',
  defining: true,

  addAttributes() {
    return {
      checked: {
        default: false,
        keepOnSplit: false,
        parseHTML: element => element.getAttribute('data-checked') === 'true',
        renderHTML: attributes => ({
          'data-checked': attributes.checked,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: `li[data-type="${this.name}"]`,
        priority: 51,
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'li',
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        { 'data-type': this.name }
      ),
      [
        'label',
        { contenteditable: 'false' },
        [
          'input',
          {
            type: 'checkbox',
            checked: node.attrs.checked ? 'checked' : null,
            style: 'width: 10px !important; height: 10px !important; min-width: 10px !important; min-height: 10px !important; appearance: none; -webkit-appearance: none; border: 1px solid #9ca3af; border-radius: 2px; background: white; margin: 0; padding: 0;'
          },
        ],
        ['span', 0],
      ],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(TaskItemComponent)
  },

  addKeyboardShortcuts() {
    const shortcuts = {
      Enter: () => this.editor.commands.splitListItem(this.name),
      'Shift-Tab': () => this.editor.commands.liftListItem(this.name),
    }

    if (!this.options.nested) {
      return shortcuts
    }

    return {
      ...shortcuts,
      Tab: () => this.editor.commands.sinkListItem(this.name),
    }
  },
})

export default CustomTaskItem
