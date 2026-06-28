# Manava Card Standard

The single card surface used across the whole project. New card-like UI should use
`<Card />` (`src/components/ui/Card.tsx`) rather than re-styling `<article>` ad hoc.

## DNA

| Token | Light (default) | Dark (`tone="dark"`) |
| --- | --- | --- |
| Surface | `#fbfbfb` (near-white) | `#0c2438` (deep navy) |
| Radius | `8px` | `8px` |
| Border | `black/5` → hover `black/10` | `white/8` → hover `white/16` |
| Shadow | `0 1px 2px /04` → hover `0 14px 44px -16px /18` | same shape, darker |
| Hover lift | `-translate-y-0.5` (disabled under reduced-motion) | same |
| Padding | `28px` (`p-7`) | `28px` |
| Title | Inter Display, `#021526`, 17px semibold | Inter Display, white |
| Body | `#596074`, 14px | `#9aa3bd`, 14px |

> Same surface treatment is mirrored in the `.card` / `.card-sm` / `.card-svc`
> utility classes (`src/index.css`) used by app pages — keep them in sync with this table.

## Composition

Media zone **breathes at the top**; the title + description are **anchored at the
bottom** (`mt-auto`). Content sits on the floor of the card, visual space above it.

```
┌───────────────────────┐
│  [ media: icon row,   │   ← media (illustration / icon / mini-diagram)
│    illustration,      │
│    mini-diagram ]     │
│                       │
│  Title (Inter Display)│   ← anchored bottom
│  One or two lines of  │
│  muted body copy.     │
└───────────────────────┘
```

## Usage

```tsx
import { Card } from '@/components/ui/Card'

<Card
  tone="light"            // or "dark" on navy sections
  title="Revision Envelope"
  desc="Lock scope before a single pixel moves."
  media={<IconRow icon={FileText} tag="Scope control" />}
/>
```

- `tone="light"` on `#FBFBFB`/`#FAFAFA` surfaces; `tone="dark"` on `#021526` sections
  (How it works, Roles, FAQ) so the same component reads correctly everywhere.
- Hover is built in (border + shadow lift). Animate only `transform`/`opacity` inside
  `media` — e.g. the feature icons nudge up on `group-hover`.
- Titles stay **Inter Display** (Manava is sans throughout — no serif).

## Reference implementation

`Features` bento in `src/pages/landing/LandingPage.tsx` is the canonical example.
