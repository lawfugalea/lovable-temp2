import React, { useCallback, useEffect, useState } from "react"
import { CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { cn } from "@/lib/utils"
import { withBasePath } from "@/lib/base-path"

export type CaptchaSolution = { id: string; answer: string }

interface MathCaptchaProps {
  /**
   * Called with the challenge id and the user's current answer whenever the
   * input changes, or `null` when there is no usable answer. The parent submits
   * this to the server, which holds the real answer — the check is authoritative
   * server-side, not in this component.
   */
  onChange: (solution: CaptchaSolution | null) => void
  className?: string
}

export default function MathCaptcha({ onChange, className }: MathCaptchaProps) {
  const questionId = React.useId()
  const [challengeId, setChallengeId] = useState("")
  const [question, setQuestion] = useState("")
  const [userAnswer, setUserAnswer] = useState("")
  const [loading, setLoading] = useState(true)

  const loadChallenge = useCallback(async () => {
    setLoading(true)
    setUserAnswer("")
    onChange(null)
    try {
      const response = await fetch(withBasePath("/api/captcha/challenge"), { headers: { accept: "application/json" } })
      const data = await response.json()
      if (!response.ok || typeof data.id !== "string") throw new Error("challenge unavailable")
      setChallengeId(data.id)
      setQuestion(data.question)
    } catch {
      setChallengeId("")
      setQuestion("Could not load the security check. Please refresh.")
    } finally {
      setLoading(false)
    }
  }, [onChange])

  useEffect(() => {
    void loadChallenge()
  }, [loadChallenge])

  const handleAnswerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setUserAnswer(value)
    onChange(challengeId && value.trim() ? { id: challengeId, answer: value.trim() } : null)
  }

  const hasAnswer = Boolean(userAnswer.trim())

  return (
    <fieldset className={cn("space-y-3 rounded-lg border bg-muted/35 p-4", className)}>
      <legend className="sr-only">Security check</legend>
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
        <Label htmlFor="captcha-answer">Security check</Label>
      </div>
      <div className="flex items-center gap-2">
        <div id={questionId} className="flex h-10 flex-1 items-center justify-center rounded-md border bg-background px-3 font-mono text-base font-semibold">
          {loading ? "Loading…" : question}
        </div>
        <Button type="button" variant="outline" size="icon" onClick={() => void loadChallenge()} aria-label="Generate a new question" disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>
      <Input
        id="captcha-answer"
        name="captcha-answer"
        type="number"
        inputMode="numeric"
        value={userAnswer}
        onChange={handleAnswerChange}
        disabled={loading || !challengeId}
        className={cn(hasAnswer && "border-emerald-500 focus-visible:ring-emerald-500")}
        placeholder="Enter the answer"
        aria-describedby={questionId}
        required
      />
      <div className="min-h-5 text-xs" aria-live="polite">
        {hasAnswer ? (
          <span className="flex items-center gap-1.5 font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Ready to submit</span>
        ) : (
          <span className="text-muted-foreground">Solve the short calculation to continue.</span>
        )}
      </div>
    </fieldset>
  )
}
