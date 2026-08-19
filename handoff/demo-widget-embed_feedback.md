# Review feedback: demo-widget-embed

**Verdict: APPROVED**

## Checks performed

1. **Hero.tsx / Hero.module.css** — `<iframe src="/demo-app/index.html" title="Ordiset live demo" className={heroStyles.demoFrame} />` correctly wired inside `WindowChrome`. No leftover `import DemoApp` or reference to `components/demo/*`. `.demoFrame` matches plan spec exactly (`width:100%; height:100%; border:0; display:block;`).
2. **WindowChrome integration** — `.body` in `WindowChrome.module.css` is `position: relative` with real dimensions (`flex: 1 1 auto` / `aspect-ratio: 16/10`), so the iframe's 100%/100% sizing fills it; `.window`'s `overflow:hidden` + border-radius clips it as intended.
3. **demo-widget/vite.config.ts** — minimal diff, only `base: './'` added.
4. **eslint.config.mjs** — `globalIgnores` addition only appends `demo-widget/**` and `public/demo-app/**`; existing ignores preserved; rest of the app still linted.
5. **Stale references** — grep for `components/demo`, `DemoApp`, `useDemoScale`, old `public/demo/{about,brand,...}` paths: only appear in `handoff/demo-widget-embed_plan.md` and historical `handoff/session_2026-08-13.md`. No live code references. `components/demo/**` and `public/demo/**` fully deleted.
6. **public/demo-app/index.html** — confirmed relative asset paths (`./favicon.png`, `./assets/index-*.js`, `./assets/index-*.css`), no root-absolute paths.
7. **Scope creep** — diff matches plan exactly: `Hero.tsx`, `Hero.module.css`, `demo-widget/vite.config.ts`, `eslint.config.mjs`, `public/demo-app/` (new), `components/demo/` + old `public/demo/*` (deleted). Nothing else touched.

No Critical/Architectural issues. No Minor/Syntax issues.

## Orchestrator follow-up
Written by orchestrator (reviewer agent has no write access). Next: visual verification in browser (`npm run dev`), single-command check, confirm the live demo-widget client app actually renders inside the Hero window with no console errors.
