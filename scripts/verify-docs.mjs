#!/usr/bin/env node
// Validates the skill docs against themselves and (optionally) against the
// Inglorious Forge source packages.
//
//   node scripts/verify-docs.mjs                       # internal checks only
//   node scripts/verify-docs.mjs --source ../forge     # + verify every import
//
// Exits 1 if anything fails, so it can gate CI.

import { readFileSync, readdirSync, existsSync } from "node:fs"
import { dirname, join, resolve, relative } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const SKILLS = join(ROOT, "skills")

const argv = process.argv.slice(2)
const sourceArg = argv.includes("--source")
  ? argv[argv.indexOf("--source") + 1]
  : process.env.FORGE_SOURCE
const SOURCE = sourceArg ? resolve(sourceArg) : null

const problems = []
const fail = (where, msg) => problems.push({ where, msg })

// ---------------------------------------------------------------- helpers ---

const skillFiles = () =>
  readdirSync(SKILLS)
    .filter((d) => existsSync(join(SKILLS, d, "SKILL.md")))
    .map((d) => ({ skill: d, file: join(SKILLS, d, "SKILL.md") }))

const read = (f) => readFileSync(f, "utf8")

/** Heading id as GitHub's slugger produces it. */
const slug = (heading) =>
  heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")

/** Every name a module exports, including `export const { a, b } = x` forms. */
function collectExports(src) {
  const names = new Set()
  const add = (raw) => {
    const t = raw.trim().replace(/^type\s+/, "")
    if (!t) return
    // `a as b` exports `b`; plain `a` exports `a`
    const m = t.match(/\bas\s+([\w$]+)$/)
    names.add(m ? m[1] : t)
  }
  for (const m of src.matchAll(
    /\bexport\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([\w$]+)/g,
  ))
    names.add(m[1])
  for (const m of src.matchAll(/\bexport\s*\{([^}]*)\}/g))
    m[1].split(",").forEach(add)
  for (const m of src.matchAll(/\bexport\s+const\s*\{([^}]*)\}/g))
    m[1].split(",").forEach(add)
  return names
}

// ------------------------------------------------- internal consistency ----

function checkInternal() {
  const files = skillFiles()
  const dirs = files.map((f) => f.skill)

  // frontmatter name matches its directory
  for (const { skill, file } of files) {
    const name = read(file).match(/^name:\s*(\S+)/m)?.[1]
    if (name !== skill) fail(`${skill}`, `frontmatter name is "${name}", expected "${skill}"`)
  }

  // skills.sh.json covers every skill, and nothing extra
  const shPath = join(ROOT, "skills.sh.json")
  if (existsSync(shPath)) {
    const grouped = new Set(
      JSON.parse(read(shPath)).groupings?.flatMap((g) => g.skills ?? []) ?? [],
    )
    for (const d of dirs)
      if (!grouped.has(d)) fail("skills.sh.json", `"${d}" is not listed in any grouping`)
    for (const d of grouped)
      if (!dirs.includes(d)) fail("skills.sh.json", `"${d}" is listed but has no skills/${d}/SKILL.md`)
  }

  // README lists every skill
  const readme = join(ROOT, "README.md")
  if (existsSync(readme)) {
    const listed = new Set(
      [...read(join(readme)).matchAll(/skills\/([\w-]+)\/SKILL/g)].map((m) => m[1]),
    )
    for (const d of dirs)
      if (!listed.has(d)) fail("README.md", `skills/${d}/SKILL.md is not listed`)
  }

  // relative markdown links resolve; backticked skills/… paths exist
  for (const { skill, file } of [...files, { skill: "README.md", file: readme }]) {
    if (!existsSync(file)) continue
    const base = dirname(file)
    const text = read(file)
    for (const m of text.matchAll(/\]\(([^)#][^)]*)\)/g)) {
      const target = m[1]
      if (/^(https?:|mailto:)/.test(target)) continue
      if (!existsSync(resolve(base, target)))
        fail(skill, `broken link -> ${target}`)
    }
    for (const m of text.matchAll(/`(skills\/[\w./-]+)`/g)) {
      if (!existsSync(join(ROOT, m[1])))
        fail(skill, `path does not exist -> ${m[1]}`)
    }
    // in-page anchors must match a real heading in the same file
    const anchors = new Set(
      [...text.matchAll(/^#{1,6} (.+)$/gm)].map((m) => slug(m[1])),
    )
    for (const m of text.matchAll(/\]\((#[^)]+)\)/g)) {
      if (!anchors.has(m[1].slice(1)))
        fail(skill, `anchor has no matching heading -> ${m[1]}`)
    }
  }

  // no leftover merge markers
  for (const { skill, file } of files) {
    if (/^<{7} |^>{7} |^> > > > /m.test(read(file)))
      fail(skill, "contains a merge/conflict marker")
  }
}

// ------------------------------------------------- imports vs. real source --

function loadPackages() {
  const dir = join(SOURCE, "packages")
  if (!existsSync(dir))
    throw new Error(`no packages/ directory under ${SOURCE}`)
  const map = new Map()
  for (const entry of readdirSync(dir)) {
    const pkgFile = join(dir, entry, "package.json")
    if (!existsSync(pkgFile)) continue
    const pkg = JSON.parse(read(pkgFile))
    map.set(pkg.name, { root: join(dir, entry), exports: pkg.exports ?? {}, main: pkg.main })
  }
  return map
}

const condition = (t) =>
  typeof t === "string" ? t : (t.import ?? t.module ?? t.default ?? t.require)

/** Resolve a bare specifier through the package's `exports` map. */
function resolveSpecifier(spec, pkgs) {
  const parts = spec.split("/")
  const scoped = spec.startsWith("@")
  const pkgName = scoped ? parts.slice(0, 2).join("/") : parts[0]
  const subpath = scoped ? parts.slice(2).join("/") : parts.slice(1).join("/")
  const pkg = pkgs.get(pkgName)
  if (!pkg) return { error: `no package "${pkgName}"` }

  const sub = "." + (subpath ? "/" + subpath : "")
  let target
  if (pkg.exports[sub] != null) {
    target = condition(pkg.exports[sub])
  } else if (Object.keys(pkg.exports).length === 0) {
    target = pkg.main ? "./" + pkg.main.replace(/^\.\//, "") : "./src/index.js"
  } else {
    // longest matching wildcard, e.g. "./*" or "./math/*.js"
    let best
    for (const [key, value] of Object.entries(pkg.exports)) {
      if (!key.includes("*")) continue
      const [pre, post = ""] = key.split("*")
      if (!sub.startsWith(pre) || !sub.endsWith(post)) continue
      if (!best || pre.length > best.pre.length) best = { pre, post, value }
    }
    if (best) {
      const star = sub.slice(best.pre.length, sub.length - best.post.length)
      const t = condition(best.value)
      target = typeof t === "string" ? t.replace(/\*/g, star) : undefined
    }
  }
  if (!target) return { error: `no exports entry for "${sub}"` }

  const base = resolve(pkg.root, target)
  for (const candidate of [base, base + ".js", join(base, "index.js"), join(base, "index.jsx")])
    if (existsSync(candidate)) return { file: candidate }
  return { error: `resolves to a missing file: ${relative(SOURCE, base)}` }
}

function checkImports(pkgs) {
  for (const { skill, file } of skillFiles()) {
    const text = read(file)
    for (const m of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*"(@inglorious\/[^"]+)"/g)) {
      const wanted = m[1]
        .split(",")
        .map((s) => s.trim().split(/\s+as\s+/)[0].trim())
        .filter(Boolean)
      const { file: resolved, error } = resolveSpecifier(m[2], pkgs)
      if (error) {
        fail(skill, `${m[2]} — ${error}`)
        continue
      }
      const exported = collectExports(read(resolved))
      for (const name of wanted)
        if (!exported.has(name))
          fail(skill, `${m[2]} — "${name}" is not exported`)
    }
  }
}

// ------------------------------------------------------------------ main ----

checkInternal()

if (SOURCE) {
  try {
    checkImports(loadPackages())
  } catch (e) {
    console.error(`could not read source packages: ${e.message}`)
    process.exit(2)
  }
} else {
  console.log(
    "note: --source <forge-repo> not given, skipping import verification against real packages\n",
  )
}

if (problems.length) {
  for (const { where, msg } of problems) console.error(`  ${where.padEnd(22)} ${msg}`)
  console.error(`\n${problems.length} problem(s)`)
  process.exit(1)
}
console.log("docs OK" + (SOURCE ? " (structure + imports)" : " (structure only)"))