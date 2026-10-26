---
name: create-game
description: Reference for scaffolding and configuring new Inglorious Engine game projects.
---

# @inglorious/create-game - Complete Reference

## Core Concept

Scaffolding tool for new games built with `@inglorious/engine`. Same flow as
[`skills/create-app/SKILL.md`](../create-app/SKILL.md) — different package name and template set.

## Usage

```bash
# npm
npm create @inglorious/game@latest

# yarn
yarn create @inglorious/game

# pnpm
pnpm create @inglorious/game
```

You’ll be prompted for the project name and template.

Every template except `minimal` then asks whether to add agent skills. Saying yes runs the [skills CLI](https://skills.sh) in the new project. It asks which coding agents to install for, and installs the [Inglorious Forge skills](https://github.com/IngloriousCoderz/forge-skills) for games: `forge`, `forge-best-practices`, `store`, `utils`, `engine` and `engine-best-practices`. If the install fails, the CLI prints the command to retry it.

## Templates

- `minimal` — plain HTML/CSS/JS, no bundler
- `js` — Vite + JavaScript
- `ts` — Vite + TypeScript
- `ijs` — IngloriousScript + JavaScript (Vite)
- `its` — IngloriousScript + TypeScript (Vite)

The `ijs`/`its` templates wire up `babel-plugin-inglorious-script`; see
[`skills/engine/SKILL.md`](../engine/SKILL.md).

## After Creation

```bash
cd my-awesome-game
pnpm install
pnpm dev
```