---
name: forge-best-practices
description: Code style for Inglorious Forge and for projects written in its style - kebab-case files and folders, named numbers instead of magic numbers, and the newspaper metaphor (exports first, support functions below). Load when writing, moving, or reviewing code in such a project.
---

# Forge Best Practices: Code Style

Use this guide whenever you write or move code in Inglorious Forge or in a project built in
its style. These rules are about how a file is named and laid out, not about any one package:
package-specific conventions live in [web-best-practices](../web-best-practices/SKILL.md),
[ui-best-practices](../ui-best-practices/SKILL.md) and
[engine-best-practices](../engine-best-practices/SKILL.md).

The repository's `CONTRIBUTING.md` states the same rules for human contributors.

## Name files and folders in kebab-case

Every file and every folder is kebab-case: `keys-per-state.js`, `infinite-scroll.js`,
`data-structures/`. Never camelCase, never snake_case, never PascalCase -- not even for a
component's folder.

The rule is about paths, not about what is inside them. A file exports camelCase or PascalCase
names, because those are what read at the import site:

```javascript
// the path is kebab-case, the name it exports is not
import { createLifeGame } from "./game.js"
import { VirtualList } from "@inglorious/ui/virtual-list"
```

Paths are looked up by tooling -- globs, import maps, bundler resolution -- and one spelling keeps
all of it agreeing. Names are read by people.

The only exceptions are names a tool dictates, such as `README.md`, `CHANGELOG.md`, `SKILL.md`
or `.storybook/`.

When you rename a file, update every import of it, and every doc that names it, in the same
change.

## Name your numbers

A bare number says how much but not why. Give it a name, as a constant below the imports:

```javascript
const ONE_SECOND = 1
const NO_TIME_PASSED = 0
```

- Name it after what it means, not after its value: `ONE_SECOND`, not `ONE`.
- Two numbers that happen to be equal stay two constants if they mean different things --
  `NO_TIME_PASSED` and `FIRST_ROW` are both `0` and change for different reasons.
- ESLint's `no-magic-numbers` warns about the ones left. Treat its warnings in code you touch
  as yours to fix.
- Tests and Storybook stories are exempt: there the number is the example.
- Vector components are exempt too. Destructure instead of indexing:
  `const [x, y, z] = entity.position`. In `docs/`, where readers may come from engines like
  Godot, `X`, `Y` and `Z` constants on top of the file are preferred.

## The newspaper metaphor

A file reads like a newspaper: headline first, details later. Opening `form.js` should show
`Form` first, not `validate()` or `parseRegex()` or whatever private function supports it.
From top to bottom:

1. imports;
2. constants;
3. what the file exports -- the headline;
4. the support functions the exports use -- the details.

```javascript
import { abs, subtract } from "../math/vector.js"

export const manhattanDistance = (a, b) => abs(subtract(a.position, b.position))

export function findPath(graph, start, end, heuristic) {
  // ...sorts its open list with compareTotalCost
}

function compareTotalCost(a, b) {
  return b.totalCost - a.totalCost
}
```

- Write support functions as `function` declarations. They hoist, so an export can call one
  defined below it even while the module loads: `export const setFPS = withPayload("setFPS")`
  works with `withPayload` at the bottom of the file.
- Do not write support functions as arrow functions assigned to a `const`: those do not hoist,
  so they would have to sit above the exports.
- A `const` the exports need while the module loads, such as a default value
  (`const DEFAULT_COMPARATOR = (a, b) => b - a`), is a constant: it stays on top.
- The order among the exports themselves is free: when none supports another, alphabetical is
  a good default. Do not reorder existing exports just to apply this rule.
- When moving a support function, take its doc comment with it.
- Imports and re-exports are sorted by `eslint-plugin-simple-import-sort`: run
  `eslint --fix` rather than ordering them by hand.

## Format and lint before committing

Run `pnpm format` and `pnpm lint` from the repository root before every commit, and fix what
they report in the files you touched -- warnings included, not only errors. Never commit with
`--no-verify`: the pre-commit hook formats and lints the staged files, fixes what it can,
and refuses the commit while any warning is left.

A new workspace needs an `eslint.config.js` (usually
`export { default } from "@inglorious/eslint-config/browser"`) and a `"lint": "eslint ."`
script, or `pnpm lint` skips it without saying so.

## Checklist

Before finishing a change, check every file you created or touched:

- [ ] `pnpm format` leaves it unchanged and `pnpm lint` reports nothing for it.

- [ ] Its path, and every folder on the way, is kebab-case.
- [ ] Every number outside a test or story has a name, unless it is a vector index you can
      destructure.
- [ ] Imports, then constants, then exports, then support functions.
- [ ] Support functions are `function` declarations, not arrow functions in a `const`.
