# UI Regression Prevention

## 2026-04-05 White Screen Incident

Detailed record:
`docs/question-input-white-screen-postmortem.md`

Short version:

- `src/components/QuestionInput.tsx` used `canAttachFiles` before the constant was initialized.
- The error was a render-time `ReferenceError`, so the app mounted nothing and appeared as a white screen.
- This is now guarded by a render smoke test plus a root error boundary.

## Render Order Rule

Inside React function components, any render-derived value used by callbacks or effects must be declared before the closures that capture it.

High-risk examples:

- `useCallback(..., [someFlag])`
- `useMemo(() => someFlag ? ... : ..., [someFlag])`
- `useEffect(() => { if (someFlag) ... }, [someFlag])`

If declaration order changes during a refactor, re-check first render before finishing.

## General Chat Card Rule

The single-AI general chat UI is controlled by two separate places and both must stay in sync.

1. `src/pages/Index.tsx`
   `getChatVariant()` must keep:
   `if (mainMode === 'general') return 'general-card';`

2. `src/components/DiscussionMessage.tsx`
   The `general-card` variant defines the actual single-AI card layout.

If only one of these is changed, the UI can look like it "rolled back" even though the card design code still exists.

## When Editing General Chat UI

Always check these together:

- `src/pages/Index.tsx`
  Confirm general mode still routes to `general-card`
- `src/components/DiscussionMessage.tsx`
  Confirm the `general-card` block still exists and matches the intended design
- `src/pages/Index.tsx`
  Confirm general chat message container width matches the bottom input width

## Quick Verification Checklist

Run this after changing chat UI:

1. Open `http://localhost:3001/`
2. Hard refresh with `Ctrl+F5`
3. Check general chat:
   AI response card uses the white card design
4. Check general chat:
   AI response width matches the bottom input width
5. Check multi chat:
   `전체 / 상세` still works
6. Check multi chat:
   bottom target chips still work
7. Run `npm run build`

## High-Risk Files

These files are easy to accidentally regress because one visual change can depend on both:

- `src/pages/Index.tsx`
- `src/components/DiscussionMessage.tsx`
- `src/components/QuestionInput.tsx`

## Rule For Future Changes

If a chat design change touches one of the files above, verify the related file in the same pass before finishing.

## Codex Terminal Snapshot Loop Prevention

### What happened

`read_thread_terminal` returned a terminal snapshot where the PowerShell prompt was repeated hundreds of times with ANSI control characters.
That did not look like a project code loop. It was a noisy terminal buffer snapshot, and reading that huge output wasted context/tokens and made the assistant response unstable.

### Prevention rules

1. Do not use `read_thread_terminal` as the default way to inspect state.
   Prefer short direct commands such as `git status --short`, `Get-Content`, `Get-ChildItem`, and `Select-String`.

2. If terminal output may be long, always cap it.
   Use `Select-Object -First 50`, `-TotalCount`, or a narrow pattern search instead of dumping full output.

3. If a terminal snapshot contains repeated prompts or ANSI noise, do not trust it as evidence of an app infinite loop.
   Re-check with a short command that has bounded output.

4. Before running broad code inspection, start with one or two tiny reads.
   This reduces the chance of accidentally pulling a giant noisy buffer into context.

5. If the assistant seems stuck or token usage spikes unexpectedly, suspect tool-output noise first and switch to direct bounded shell commands.

### Quick check

When debugging "possible infinite loop", verify in this order:

1. `git status --short`
2. A small targeted `Select-String` or `Get-Content -TotalCount ...`
3. Only then use terminal snapshot, and only if the current shell prompt/output itself is the thing being investigated
