import * as React from "react"
import type { Content, Editor, JSONContent } from "@tiptap/react"
import { EditorContent, EditorContext } from "@tiptap/react"
import { CheckSquare } from "lucide-react"
import { toast } from "sonner"
import { Separator } from "@/components/ui/Separator"
import { TooltipProvider } from "@/components/ui/Tooltip"
import { cn } from "@/lib/utils"
import { useMinimalTiptapEditor } from "@/components/ui/minimal-tiptap/hooks/use-minimal-tiptap"
import { useTiptapEditor } from "@/components/ui/minimal-tiptap/hooks/use-tiptap-editor"
import { SectionOne } from "@/components/ui/minimal-tiptap/components/section/one"
import { SectionTwo } from "@/components/ui/minimal-tiptap/components/section/two"
import { SectionThree } from "@/components/ui/minimal-tiptap/components/section/three"
import { SectionFour } from "@/components/ui/minimal-tiptap/components/section/four"
import { SectionFive } from "@/components/ui/minimal-tiptap/components/section/five"
import { ToolbarButton } from "@/components/ui/minimal-tiptap/components/toolbar-button"
import { LinkBubbleMenu } from "@/components/ui/minimal-tiptap/components/bubble-menu/link-bubble-menu"
import SlashMenu from "./SlashMenu"

interface NoteEditorProps {
  noteId: string
  content?: Content
  onUpdate?: (content: JSONContent, text: string) => void
  placeholder?: string
  editable?: boolean
  className?: string
}

const Toolbar = ({ editor }: { editor: Editor }) => (
  <div className="border-border bg-muted/40 flex shrink-0 overflow-x-auto rounded-t-xl border-b p-2">
    <div className="flex w-max items-center gap-px">
      <SectionOne editor={editor} activeLevels={[1, 2, 3]} />

      <Separator orientation="vertical" className="mx-2 h-7" />

      <SectionTwo
        editor={editor}
        activeActions={[
          "bold",
          "italic",
          "underline",
          "strikethrough",
          "code",
          "clearFormatting",
        ]}
        mainActionCount={3}
      />

      <Separator orientation="vertical" className="mx-2 h-7" />

      <SectionThree editor={editor} />

      <Separator orientation="vertical" className="mx-2 h-7" />

      <SectionFour
        editor={editor}
        activeActions={["orderedList", "bulletList"]}
        mainActionCount={2}
      />
      <ToolbarButton
        isActive={editor.isActive("taskList")}
        tooltip="Checklist"
        aria-label="Checklist"
        pressed={editor.isActive("taskList")}
        onPressedChange={() => editor.chain().focus().toggleTaskList().run()}
      >
        <CheckSquare className="size-5" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-2 h-7" />

      <SectionFive
        editor={editor}
        activeActions={["codeBlock", "blockquote", "horizontalRule"]}
        mainActionCount={0}
      />
    </div>
  </div>
)

export default function NoteEditor({
  noteId,
  content,
  onUpdate,
  placeholder = "Start writing your note...",
  editable = true,
  className,
}: NoteEditorProps) {
  const [showSlashMenu, setShowSlashMenu] = React.useState(false)
  const [slashMenuPosition, setSlashMenuPosition] = React.useState({ top: 0, left: 0 })
  const showSlashMenuRef = React.useRef(showSlashMenu)
  const editorRef = React.useRef<Editor | null>(null)

  React.useEffect(() => {
    showSlashMenuRef.current = showSlashMenu
  }, [showSlashMenu])

  const uploader = React.useCallback(
    async (file: File) => {
      const formData = new FormData()
      formData.append("image", file)
      formData.append("noteId", noteId)

      const response = await fetch("/api/uploads/note-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        let message = "Failed to upload image"
        try {
          const data = await response.json()
          if (data?.error) message = data.error
        } catch {
          // keep default message
        }
        toast.error(message)
        throw new Error(message)
      }

      const { url } = await response.json()
      return url as string
    },
    [noteId]
  )

  const handleUpdate = React.useCallback(
    (json: Content) => {
      const editor = editorRef.current
      if (!editor) return
      onUpdate?.(json as JSONContent, editor.getText())
    },
    [onUpdate]
  )

  const editor = useMinimalTiptapEditor({
    value: content ?? undefined,
    output: "json",
    placeholder,
    editable,
    uploader,
    onUpdate: handleUpdate,
    editorClassName: "focus:outline-none min-h-[300px] px-4 py-4 sm:px-6",
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        class: "focus:outline-none min-h-[300px] px-4 py-4 sm:px-6",
      },
      handleKeyDown: (view, event) => {
        if (event.key === "/") {
          const { $from } = view.state.selection
          const textBefore = $from.nodeBefore?.textContent || ""
          const isAtStart = $from.parentOffset === 0
          const isAfterSpace = textBefore.endsWith(" ")

          if (isAtStart || isAfterSpace) {
            const coords = view.coordsAtPos($from.pos)
            setSlashMenuPosition({
              top: coords.bottom + window.scrollY,
              left: coords.left + window.scrollX,
            })
            setShowSlashMenu(true)
            return false
          }
        }

        if (event.key === "Escape" && showSlashMenuRef.current) {
          setShowSlashMenu(false)
          return true
        }

        return false
      },
    },
  })

  React.useEffect(() => {
    editorRef.current = editor ?? null
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable)
    }
  }, [editor, editable])

  if (!editor) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-border bg-muted/30">
        <div className="text-muted-foreground">Loading editor…</div>
      </div>
    )
  }

  return (
    <EditorContext.Provider value={{ editor }}>
      <TooltipProvider delayDuration={300}>
        <NoteEditorInner
          editor={editor}
          noteId={noteId}
          editable={editable}
          className={className}
          showSlashMenu={showSlashMenu}
          slashMenuPosition={slashMenuPosition}
          onCloseSlashMenu={() => setShowSlashMenu(false)}
        />
      </TooltipProvider>
    </EditorContext.Provider>
  )
}

// Inner component subscribes to editor transactions (via useTiptapEditor) so
// toolbar active states and the character count stay in sync while typing.
function NoteEditorInner({
  editor: providedEditor,
  noteId,
  editable,
  className,
  showSlashMenu,
  slashMenuPosition,
  onCloseSlashMenu,
}: {
  editor: Editor
  noteId: string
  editable: boolean
  className?: string
  showSlashMenu: boolean
  slashMenuPosition: { top: number; left: number }
  onCloseSlashMenu: () => void
}) {
  const { editor } = useTiptapEditor(providedEditor)

  if (!editor) return null

  const characterCount = editor.storage.characterCount as
    | { characters: () => number; words: () => number }
    | undefined

  return (
    <div
      className={cn(
        "flex h-auto w-full flex-col rounded-xl border border-border bg-card shadow-soft-sm",
        "focus-within:border-ring/60",
        className
      )}
    >
      {editable && <Toolbar editor={editor} />}
      <EditorContent editor={editor} className="minimal-tiptap-editor" />
      <LinkBubbleMenu editor={editor} />
      {characterCount && (
        <div className="flex justify-end border-t border-border px-4 py-1.5 text-xs text-muted-foreground">
          {characterCount.words()} words · {characterCount.characters()} characters
        </div>
      )}
      <SlashMenu
        editor={editor}
        noteId={noteId}
        isOpen={showSlashMenu}
        onClose={onCloseSlashMenu}
        position={slashMenuPosition}
      />
    </div>
  )
}
