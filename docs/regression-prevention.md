# UI Regression Prevention

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
