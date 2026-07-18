import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/Sheet'

const agentId = process.env.NEXT_PUBLIC_KELMA_AGENT_ID

/**
 * In-app help assistant (Kelma agent trained on ClanKeep's docs). Answers
 * questions about how features work — it never sees household data.
 */
export default function HelpChat() {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  if (!agentId) return null

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        aria-label="Help and questions"
        title="Help & questions"
        onClick={() => { setLoaded(true); setOpen(true) }}
      >
        <HelpCircle className="h-4 w-4" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-[min(94vw,420px)] flex-col gap-3 p-4 sm:max-w-[420px]">
          <SheetHeader className="space-y-1 text-left">
            <SheetTitle>Ask ClanKeep</SheetTitle>
            <SheetDescription>
              Answers about how ClanKeep works. It can&rsquo;t see your household&rsquo;s data.
            </SheetDescription>
          </SheetHeader>
          {loaded && (
            <iframe
              src={`https://kelma.chat/widget/${agentId}?mode=inline`}
              title="Chat with ClanKeep support"
              allow="clipboard-write"
              className="min-h-0 w-full flex-1 rounded-xl border-0"
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
