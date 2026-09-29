@AGENTS.md

## BEM CSS naming

All CSS/SCSS and every `class`/`className` follows BEM — see skill `bem-css` (`.claude/skills/bem-css/SKILL.md`).

Non-negotiables:
- `.block`, `.block__elem`, `.block--mod`, `.block__elem--mod`. Lowercase, dashes for spaces.
- Modifier is an extra class: `class="block block--mod"`, never the modifier alone.
- Flat classes. Never `block__el1__el2`, however deep the DOM nests.
- Single-class selectors only. No tags (`div.block`), no IDs, no `.block .block__elem`.
- Only allowed nesting: `.block--mod .block__elem`.
- Semantic modifier names (`--selected`), never visual (`--border-bottom-5px`).
- No global helpers (`.hidden`, `.red`). No external margin/position on a block.

With Tailwind:
- Markup carries BEM classes only. Utilities live in `@apply` inside the BEM rule, in `@layer components`.
- One-off unnamed layout wrappers may use utilities inline; anything named or reused becomes a block.
- `hover:`/`focus-visible:`/`md:`/`dark:` go in `@apply`. Modifiers stay for app state (`--selected`, `--loading`).
- No `!` importance; modifier rule after base rule. `@apply` utilities only, never another BEM class.
- Prefer theme tokens over arbitrary values. Vue/Svelte/CSS-Module files need `@reference` for `@apply`.

## React component JSDoc

Component documentation is a JSDoc/TSDoc block inside the component file, never a separate markdown doc — see skill `react-components-docs` (`.claude/skills/react-components-docs/SKILL.md`).

Non-negotiables:
- One `/** ... */` block directly above each exported component, plus one per member of the props type.
- No `docs/components/` markdown, no per-component `.md`, no component index.
- No prose `//` comments in `.tsx`/`.jsx`. Questions and caveats go inside the JSDoc, marked `Unverified:`. Only eslint-disable, `@ts-expect-error`, and `TODO(name):` may stay as line comments.
- Component block order: summary → `@remarks` (Status/Type, State & behavior, Variants, Composition, Accessibility, Test ids, CSS classes, Edge cases, Dependencies) → `@example` → `@see`.
- Never restate a prop's type in prose. Literal defaults go in `@defaultValue`; optionality is the `?` in the type.
- Every callback documents when it fires, plus `@param` per argument.
- Changing a prop signature requires updating the JSDoc in the same pass.
