Adopt docs/submission.md as the canonical narrative, with docs/design_v01.md as the technical reference. Prototype readmes become tier-specific and link back to those docs. All documentation will describe the actual architecture: React UI, Node/Express + TypeScript orchestrator, Python 3.11/vectorbt engine, MongoDB, Gemini.
Phase 1 — TypeScript migration (do first so docs describe final paths)
prototypes/02-mid-fi/ (vanilla JS → TS)
- Add package.json with typescript, esbuild, apexcharts, sweetalert2.
- Add strict tsconfig.json (ES2020, DOM, bundler resolution, noEmit for typecheck).
- Move script.js → src/script.ts, split shared interfaces into src/types.ts (MockData, Run, Profile, Dataset, Robustness, etc.).
- Type AppState, DOM helpers, chart instances, and mockData.json fetch/parse.
- Bundle TS to dist/script.js via esbuild; update index.html to load it.
- Replace fragile inline onclick handlers with data-action/data-screen attributes and typed listeners. This also fixes the currently broken login button markup (onclick="login     </button>").
- Add scripts: build, dev (watch), typecheck.
- Delete the old script.js; commit dist/script.js so the prototype can still be opened statically.
- Add node_modules/ to .gitignore.
prototypes/03-hi-fi/server/ (JS stubs → TS)
- Add package.json and tsconfig.json (ES2022, NodeNext, strict, dist/ output).
- Rename/convert dataabse.js → database.ts (fix typo, ESM import/export, typed connectDB(): Promise<void>).
- Rename empty placeholders to .ts: server.ts, services/assistantService.ts, workers/backtestWorker.ts.
- Remove the misplaced empty models/backtestWorker.js; reserve models/ for future Mongoose schemas.
- Add typed placeholder comments/exports only — no new runtime features.
- Add scripts: dev (tsx watch), build, start, typecheck.
- Populate the currently empty server/.env.example and client/.env.example with the keys already documented in the 03 readme.
- Ignore server/dist/ and node_modules/.
Phase 2 — Markdown reconciliation
readme.md (root)
- Replace the stale “Day 1–2 / Phase 1” coaching plan with a concise project entry point: overview, architecture summary, directory map, quick start for 02-mid-fi and the Python engine, test command, known limitations, and links to canonical docs.
docs/submission.md
- Update the stack row (line ~19) to include the Python/vectorbt engine.
- §3.1: Medium fidelity → TypeScript; High fidelity → React + Express TS orchestrator + Python engine + Gemini.
- §3.3: fix style.css → stylesheet.css, /prototype → prototypes/02-mid-fi, “sixcore”/“Login,,” typos.
- §3.4: align with the Python/vectorbt implementation rather than typed-array JS.
- §5.1: replace promised-but-missing docs with the actual inventory (readme.md, docs/design_v01.md, docs/submission.md, prototype readmes); mark missing docs as deferred, not pending.
- §5.2 + Appendix D: update to the real tree, including engine/, test/, pytest.ini, src/script.ts, .ts server files. Keep lowercase readme.md paths to match existing filenames.
- §6.1/6.5: replace the “single-language Node worker_threads” claim with the actual Node orchestrator spawning Python design; convert snippets to TypeScript (assistantService.ts, typed Zod schema).
- Appendix A: preserve original prompts as historical record, but add a note that the implementation evolved to TypeScript/ApexCharts.
- Fix all remaining stale references (style.css, script.js, database.js).
docs/design_v01.md
- Remove the meta intro (“Here is the enhanced…”) and the duplicated # 8. Prototype Design heading.
- Fix image links to actual files (03-dataset-manager..png, 05---comparison.png.png, etc.).
- Reconcile stack/architecture: Python engine + Node orchestrator; mark Redis/S3/WebSockets as target/optional unless implemented.
- Update testing section: pytest for the engine, Vitest/typecheck planned for TS.
- Add a short “Implementation status (PoC)” section linking to the prototype readmes.
prototypes/01-lo-fi/readme.md
- Trim duplicated proposal content (features, journey, architecture, success criteria) to a lean tier document: purpose, screen list with image links, fidelity notes, link to docs/design_v01.md and docs/submission.md.
- Correct image paths where used.
prototypes/02-mid-fi/readme.md (new)
- Document purpose, stack (HTML/CSS/TypeScript, ApexCharts, SweetAlert2), file map (index.html, stylesheet.css, src/script.ts, dist/script.js, mockData.json), build/run commands, implemented screens, mock-data schema, limitations (no backend/auth), and canonical doc links.
prototypes/03-hi-fi/readme.md
- Remove the outer “### 1. README.md” + ```markdown wrapper, duplicated “Project Structure” heading, stray !, and unrelated trailing tips.
- Fix typos: “Dataabse”, venv → .venv, database.js → database.ts.
- Update tree to the real structure: client/ (placeholder), server/ (TS stubs), engine/, test/, root pytest.ini.
- State clearly: engine is implemented/tested; client/server are scaffolds; 02-mid-fi is the working UI reference.
- Update setup/run/test commands (npm run typecheck, pytest, venv path) and TypeScript code snippets.
- Link to canonical docs and 02-mid-fi.
Phase 3 — Verification
- cd prototypes/02-mid-fi && npm install && npm run typecheck && npm run build
- cd prototypes/03-hi-fi/server && npm install && npm run typecheck
- Smoke-check index.html loads dist/script.js and navigation/login still work.
- Run the existing Python tests (.venv/bin/python -m pytest) to confirm docs changes did not disturb the engine.
- Run a read-only relative-link/image checker over all markdown; verify every referenced path exists.
- rg for stale terms (style.css, script.js, worker_threads, typed arrays, Dataabse, /prototype) and fix remaining inconsistencies.
Out of scope
- Implementing the 03-hi-fi React client or Express routes/workers.
- Creating docs/technical.md, docs/api.md, docs/user-guide.md, CONTRIBUTING.md, or docs/images/.
- Modifying the Python engine logic or renaming image assets.