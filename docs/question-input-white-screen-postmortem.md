# QuestionInput White Screen Postmortem

Date: 2026-04-05
Area: `src/components/QuestionInput.tsx`
Symptom: the browser opened successfully, but the app rendered as a blank white screen.

## What Happened

`QuestionInput` referenced `canAttachFiles` inside a `useCallback` before that constant was initialized in the component body.

Because `const` is in the temporal dead zone until its declaration runs, React hit this line during the first render and threw:

`ReferenceError: Cannot access 'canAttachFiles' before initialization`

The exception happened during render, so the app failed before mounting visible UI.

## Why It Turned Into A Full White Screen

At the time of the incident, the root app had no error boundary.

That meant a render-time exception in one child component propagated upward and blanked the whole application instead of showing a recovery screen.

## Exact Root Cause

Bad pattern:

```ts
const handleFileSelect = useCallback(() => {
  if (!canAttachFiles) return;
}, [canAttachFiles]);

const canAttachFiles = discussionMode !== "procon";
```

Safe pattern:

```ts
const canAttachFiles = discussionMode !== "procon";

const handleFileSelect = useCallback(() => {
  if (!canAttachFiles) return;
}, [canAttachFiles]);
```

## Why We Missed It

1. There was no render smoke test for `QuestionInput`.
2. There was no root error boundary to degrade gracefully.
3. The change looked like a harmless local refactor, but it altered evaluation order inside a function component.

## Prevention Measures Added

1. Added a code-level guard comment in `QuestionInput` to keep render-derived flags above callbacks that capture them.
2. Added `src/test/QuestionInput.test.tsx` to verify first render succeeds in at least two modes.
3. Added `src/components/AppErrorBoundary.tsx` and wrapped the app root in it so future render errors show a recovery UI instead of a blank screen.
4. Added `src/test/AppErrorBoundary.test.tsx` so the recovery path is also covered.

## Rule For Future Refactors

When a function component derives booleans, labels, or config values that are later referenced by:

- `useCallback`
- `useMemo`
- `useEffect`
- inline event handlers created before the declaration

declare those derived values first, before any closures that capture them.

## Fast Debug Checklist For Similar Symptoms

1. Open the page and check the browser console first.
2. Look for `ReferenceError`, `TypeError`, or React render stack traces before assuming CSS or Vite problems.
3. If the DOM root is empty, inspect the most recently changed component for declaration-order issues.
4. Run the component's focused test and then `npm run build`.
