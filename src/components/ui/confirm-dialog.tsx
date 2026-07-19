import { createContext, useCallback, useContext, useRef, useState } from "react"
import type { ReactNode } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

export type ConfirmOptions = {
  title?: string
  description?: ReactNode
  confirmText?: string
  cancelText?: string
  /** Style the confirm button as destructive (red). */
  destructive?: boolean
}

type ConfirmFn = (options?: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

/**
 * Promise-based confirmation dialog to replace blocking `window.confirm`.
 * Renders a single accessible AlertDialog and resolves the returned promise
 * with the user's choice (true = confirmed, false = cancelled/dismissed).
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions>({})
  const resolverRef = useRef<((value: boolean) => void) | null>(null)

  const settle = useCallback((value: boolean) => {
    setOpen(false)
    const resolve = resolverRef.current
    resolverRef.current = null
    resolve?.(value)
  }, [])

  const confirm = useCallback<ConfirmFn>((opts = {}) => {
    setOptions(opts)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={open} onOpenChange={(next) => { if (!next) settle(false) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{options.title ?? "Are you sure?"}</AlertDialogTitle>
            {options.description != null && (
              <AlertDialogDescription>{options.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => settle(false)}>
              {options.cancelText ?? "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => settle(true)}
              className={cn(options.destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
            >
              {options.confirmText ?? "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider")
  return ctx
}
