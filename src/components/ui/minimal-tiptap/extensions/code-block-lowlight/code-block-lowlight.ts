import { CodeBlockLowlight as TiptapCodeBlockLowlight } from "@tiptap/extension-code-block-lowlight"
import { common, createLowlight } from "lowlight"

export const CodeBlockLowlight = TiptapCodeBlockLowlight.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      lowlight: createLowlight(common),
      defaultLanguage: null,
      HTMLAttributes: {
        class: "block-node",
      },
      languageClassPrefix: 'language-',
      exitOnTripleEnter: true,
      exitOnArrowDown: true,
      // Tiptap 3.29 made this a required option rather than an optional one, and
      // `this.parent?.()` is optionally called, so the spread above cannot
      // satisfy it. Set to upstream's own default (true) to keep the editor
      // behaving exactly as it did before the upgrade.
      exitOnArrowUp: true,
      enableTabIndentation: false,
      tabSize: 4,
    }
  },
})

export default CodeBlockLowlight
