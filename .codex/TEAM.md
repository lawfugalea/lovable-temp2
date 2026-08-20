# Clankeep Codex team

This repository uses a deliberately small, token-conscious team. The lead agent
does not invoke every role for every task. It delegates only when the saved time,
context isolation, or independent review justifies the additional agent tokens.

## Lead agent

The main Codex agent remains the lead engineer. It interprets the request,
chooses whether to delegate, assigns non-overlapping ownership, waits for required
results, reviews every handoff, integrates changes, and reports final validation.
Small and routine changes stay with the lead.

## Explorer

The Explorer is strictly read-only. Use it for substantial investigation when
moving search traces and execution-path analysis out of the main thread keeps the
lead context clean.

It locates relevant files, functions, components, routes, schemas, and tests;
traces real execution paths; identifies dependencies, risks, and likely affected
areas; and returns concise findings with file references. Do not use it when the
relevant file is already obvious. It never modifies files or external state.

## Worker

The Worker owns one explicitly delegated implementation boundary. It follows
existing architecture, changes only that scope, adds or updates relevant tests,
avoids unrelated refactoring, and reports changed files, commands executed, and
unresolved issues.

Every writable path has one owner. Parallel Workers are allowed only for genuinely
independent boundaries with a clear interface—for example, separate frontend and
backend directories. Never run Workers concurrently against overlapping files,
shared schemas, lockfiles, or deployment configuration.

## Reviewer

The Reviewer is normally read-only. Use it after substantial, risky,
security-sensitive, migration, or release changes. It looks for bugs, regressions,
missing validation, security/data-isolation concerns, poor error handling, and
missing tests; runs relevant permitted checks; and returns concrete findings with
file references and reproduction steps.

Do not use it for trivial text, formatting, or one-line configuration changes
unless security-sensitive. It does not modify application files unless the lead
explicitly delegates a specific fix and provides a writable runtime.

## Delegation contract

Each delegation must state:

1. The precise question or implementation outcome.
2. Read-only status or the exact writable paths owned by the agent.
3. Dependencies and files that are out of scope.
4. The relevant checks the agent may run.
5. The expected concise handoff: findings/changes, file references, checks and
   results, risks, and unresolved issues.

Use at most one Explorer and one Worker for a normal feature unless another
independent boundary clearly warrants more. Add the Reviewer only when risk
justifies it. Avoid repeating repository discovery already completed by another
agent. Wait for required handoffs before integrating and verify agent claims
against the diff and actual command results.

## Subagents versus desktop app tasks

Subagents belong to one parent task. They can run independent pieces of that one
outcome in parallel, and their results return to the lead thread for a single
integration and response. They share the task's workspace unless a different
boundary is explicitly provided.

Unrelated jobs are separate Codex desktop app tasks or threads. Prefer a separate
Git branch/worktree for each writable app task. A busy interactive CLI session is
already executing its current turn; never promise or imply that it can accept and
work on an unrelated instruction concurrently inside that same turn.

For worktree-based app tasks:

- Define a narrow scope and separate branch/worktree for every task.
- Avoid overlapping writable files where practical.
- Do not let multiple tasks write directly to the main branch.
- Review each task's changes before merge.
- Combine the branches first, then perform integration and full relevant
  validation on the combined result.

## Token and safety discipline

Use targeted searches and focused file reads. Avoid loading generated output,
dependency trees, archives, large assets, or long logs without a task-specific
reason. Prefer concise summaries over transcripts. Run the smallest relevant
validation first and escalate to broader tests/builds only when scope or risk
requires it. Never inspect or expose real secrets, and never claim a check passed
unless it actually completed successfully.
