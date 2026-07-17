import React, { useEffect, useState } from "react"
import { CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { cn } from "@/lib/utils"

interface MathCaptchaProps {
  onVerify: (isValid: boolean) => void
  className?: string
}

export default function MathCaptcha({ onVerify, className }: MathCaptchaProps) {
  const questionId = React.useId()
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [userAnswer, setUserAnswer] = useState("")
  const [isVerified, setIsVerified] = useState(false)

  const generateQuestion = () => {
    const operations = ["+", "-", "×"]
    const operation = operations[Math.floor(Math.random() * operations.length)]
    let num1: number
    let num2: number
    let result: number

    if (operation === "+") {
      num1 = Math.floor(Math.random() * 20) + 1
      num2 = Math.floor(Math.random() * 20) + 1
      result = num1 + num2
    } else if (operation === "-") {
      num1 = Math.floor(Math.random() * 20) + 10
      num2 = Math.floor(Math.random() * 10) + 1
      result = num1 - num2
    } else {
      num1 = Math.floor(Math.random() * 10) + 1
      num2 = Math.floor(Math.random() * 10) + 1
      result = num1 * num2
    }

    setQuestion(`${num1} ${operation} ${num2} = ?`)
    setAnswer(result.toString())
    setUserAnswer("")
    setIsVerified(false)
    onVerify(false)
  }

  useEffect(() => {
    generateQuestion()
    // The challenge should be generated once on mount, not whenever the callback identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAnswerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    const verified = value === answer
    setUserAnswer(value)
    setIsVerified(verified)
    onVerify(verified)
  }

  return (
    <fieldset className={cn("space-y-3 rounded-lg border bg-muted/35 p-4", className)}>
      <legend className="sr-only">Security check</legend>
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
        <Label htmlFor="captcha-answer">Security check</Label>
      </div>
      <div className="flex items-center gap-2">
        <div id={questionId} className="flex h-10 flex-1 items-center justify-center rounded-md border bg-background px-3 font-mono text-base font-semibold">
          {question}
        </div>
        <Button type="button" variant="outline" size="icon" onClick={generateQuestion} aria-label="Generate a new question">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      <Input
        id="captcha-answer"
        name="captcha-answer"
        type="number"
        inputMode="numeric"
        value={userAnswer}
        onChange={handleAnswerChange}
        className={cn(
          isVerified && "border-emerald-500 focus-visible:ring-emerald-500",
          userAnswer && !isVerified && "border-destructive focus-visible:ring-destructive"
        )}
        placeholder="Enter the answer"
        aria-describedby={questionId}
        aria-invalid={Boolean(userAnswer && !isVerified)}
        required
      />
      <div className="min-h-5 text-xs" aria-live="polite">
        {isVerified ? (
          <span className="flex items-center gap-1.5 font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Check complete</span>
        ) : (
          <span className="text-muted-foreground">Solve the short calculation to continue.</span>
        )}
      </div>
    </fieldset>
  )
}
