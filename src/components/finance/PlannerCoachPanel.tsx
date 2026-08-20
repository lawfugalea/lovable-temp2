import React, { useState } from 'react'
import { Loader2, Lock, RefreshCw, Sparkles, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import type { DeepSeekFinanceResult } from '@/lib/finance/deepseek'
import type { RedactedPlannerPayload } from '@/lib/finance/planner-coach'
import { euros, type PlannerData } from './planner-types'

interface PlannerCoachPanelProps {
  householdId: string
  data: PlannerData
  onError: (message: string) => void
}

type CoachState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'consent'; preview: RedactedPlannerPayload }
  | { kind: 'result'; result: DeepSeekFinanceResult; generatedAt: string }

export default function PlannerCoachPanel({ householdId, data, onError }: PlannerCoachPanelProps) {
  const [state, setState] = useState<CoachState>({ kind: 'idle' })

  const request = async (consent: boolean) => {
    setState({ kind: 'loading' })
    try {
      const response = await fetch('/api/finance/planner/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId, ...(consent ? { consent: true } : {}) }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'AI analysis failed')
      if (payload.requiresConsent) {
        setState({ kind: 'consent', preview: payload.preview })
        return
      }
      setState({ kind: 'result', result: payload, generatedAt: payload.generatedAt })
    } catch (error) {
      setState({ kind: 'idle' })
      onError(error instanceof Error ? error.message : 'AI analysis failed')
    }
  }

  if (!data.aiConfigured) {
    return (
      <EmptyState
        icon={Sparkles}
        module="finances"
        title="AI coaching is not configured"
        description="This deployment has no DeepSeek key set, so the savings coach is unavailable. The plan and goals work fully without it."
      />
    )
  }

  const hasPlan = data.incomes.length > 0 || data.commitments.length > 0
  if (!hasPlan) {
    return (
      <EmptyState
        icon={Sparkles}
        module="finances"
        title="The coach needs your plan first"
        description="Add your income and commitments in the Plan tab, then come back for a personalised savings plan."
      />
    )
  }

  if (state.kind === 'idle') {
    return (
      <EmptyState
        icon={Wand2}
        module="finances"
        title="Get a personalised savings plan"
        description="The coach reads only rounded household aggregates — never names, accounts, or identities — and suggests gentle, practical next steps."
        action={
          <Button onClick={() => void request(false)}>
            <Sparkles className="h-4 w-4" /> Build my savings plan
          </Button>
        }
      />
    )
  }

  if (state.kind === 'loading') {
    return (
      <div className="flex min-h-[280px] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Thinking about your plan…
      </div>
    )
  }

  if (state.kind === 'consent') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-module-finances" /> One-time consent</CardTitle>
          <CardDescription>
            This exact redacted summary — and nothing else — would be sent to DeepSeek for analysis. No member names,
            no account data, no identity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl bg-muted/60 p-4 text-sm">
            <ul className="space-y-1.5">
              <li>Household of <strong>{state.preview.memberCount}</strong></li>
              <li>Income ≈ <strong>€{state.preview.monthlyIncomeEur}</strong>/month · commitments ≈ <strong>€{state.preview.monthlyCommitmentsEur}</strong>/month</li>
              <li>Disposable ≈ <strong>€{state.preview.disposableEur}</strong>/month ({state.preview.commitmentRatioBand})</li>
              <li>{state.preview.categories.length} spending categories · {state.preview.goals.length} goals (labels sanitised)</li>
            </ul>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setState({ kind: 'idle' })}>Not now</Button>
            <Button onClick={() => void request(true)}>
              <Sparkles className="h-4 w-4" /> Agree and analyse
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border-module-finances/30 bg-module-finances/5 hover:-translate-y-0">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-module-finances/10 text-module-finances">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="leading-relaxed">{state.result.summary}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Generated {new Date(state.generatedAt).toLocaleString('en-MT')} · guidance, not regulated financial advice
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {state.result.observations.map((observation, index) => (
          <Card key={index} className="hover:-translate-y-0">
            <CardContent className="p-5">
              <p className="font-display font-semibold tracking-tight">{observation.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{observation.explanation}</p>
              <p className="mt-3 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground">
                {observation.suggestion}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center">
        <Button variant="outline" onClick={() => void request(true)}>
          <RefreshCw className="h-4 w-4" /> Refresh analysis
        </Button>
      </div>
      {data.summary.disposableCents > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          {euros(data.summary.disposableCents)} of monthly headroom to work with — small steps count.
        </p>
      )}
    </div>
  )
}
