# AI Bot Maintenance Guide

## Metadata rules

- `description`: keep it to one short sentence that explains the bot's role immediately.
- `quote`: keep it to one line and use it to reinforce tone or character.
- `sampleQuestions`: always keep exactly 3 prompts.

## Recommended question structure

1. Identity question
   Show what this bot is good at.
2. Practical question
   Reflect a real task a user is likely to click first.
3. Differentiation question
   Highlight the bot's distinct angle, tone, or strength.

## Tooltip constraints

- Prefer one-line text where possible.
- Avoid abstract or generic prompts like `도와줘` or `어떻게 생각해?`.
- Keep question text short enough to avoid multi-line wrapping in the hover card.

## Visual rules

- `ai`: official logo look and neutral frame
- `specialist`: calm green frame
- `occupation`: practical blue frame
- `perspective`: violet frame
- `ideology`: amber frame
- `celebrity` / `fictional` / `mythology`: expressive pink frame

## Selection rules

- Do not rewrite every bot by default.
- Keep existing text when it is already clear, short, and distinct.
- Prioritize frequently used bots first:
  - major AI models
  - medical/legal/pharmacist
  - designer/engineer/programmer
