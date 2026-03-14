# UI Best Practices: Primitive Props and Semantics

Use this guide when defining or refining `@inglorious/ui` primitives. Keep primitives predictable, composable, and easy to theme without custom CSS.

## Boolean prop naming

- Prefer `isSomething`, `hasSomething`, or `canSomething` for all boolean props.
- If a DOM attribute exists (for example `disabled`, `checked`, `selected`), expose the boolean as `isDisabled`, `isChecked`, `isSelected`, and map it to the underlying DOM attribute in the template.
- Avoid bare adjective booleans like `square`, `gutterless`, `compact`, `ghost` unless they are an enum or string variant.

## Radius instead of `isSquare`

- Replace boolean shape toggles with a `radius` prop.
- Use a small set of token-backed values: `none | sm | md | lg | full` (or the theme’s radius scale).
- Map `radius` to a CSS class or style that uses tokens (`--iw-radius-sm`, etc.).
- Avoid `isSquare`; use `radius="none"` for hard corners.

## Shape and border semantics

- Prefer `shape` enums when multiple shapes exist (`square | rectangle | circle | pill`).
- Prefer `border` or `ring` props for outline semantics instead of “dot” booleans.

## Layout padding

- For layout primitives (`container`, `flex`, `grid`, `stack`), allow a `padding` prop with tokenized sizes (`none | sm | md | lg`).
- Do not add boolean “gutterless” flags; use `padding="none"` instead.
- Default to a sensible responsive padding when `padding` is undefined; allow opt-out with `padding="none"`.

## Semantic element control

- When the primitive is a layout wrapper, expose an `element` prop to control the underlying tag (`div`, `section`, `header`, `footer`, `nav`, etc.).
- Preserve semantic primitives as-is when a single element is clearly correct (`list` should be a `ul`).

## Prop-to-DOM mapping

- Keep the public prop names consistent with the API guidelines.
- Translate to DOM attributes/classes in the template layer.
- Avoid leaking DOM naming into the public API unless it matches the naming rules above.

## Example mappings

- `isDisabled` → `disabled`
- `radius="none"` → `class="iw-*-radius-none"`
- `padding="md"` → `class="iw-*-padding-md"`
- `shape="circle"` → `class="iw-*-shape-circle"`
