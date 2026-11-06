# SolveMath website audit

Date: November 5, 2026

## Assessment

SolveMath has a useful presentation editor: manual authoring, ten layouts, mathematical notation, editable tables and graphs, Desmos embeds, static graph images, annotations, and speaker notes. The main product gaps are saving more than one lesson, exporting editable or printable presentations, and entering a problem without a screenshot.

This audit found and corrected misleading copy, unsafe math-rendering options, request-validation gaps, incomplete-answer acceptance, storage failure handling, and several recording defects. The runtime dependency scan is now clear. Deployment-level quotas and rate limits must be verified before enabling public paid-AI access.

This is a source and automated-test audit with local HTTP checks. Browser automation was blocked by a saved permission policy even after the user approved access. Visual layout, real device permissions, actual recorded video/audio, and live-provider mathematical correctness remain unverified. No Lighthouse score, WCAG conformance claim, or browser pass is asserted.

## Coverage

| Area | Reviewed | Limits |
| --- | --- | --- |
| Home page, navigation, sample preview | Wording, actual feature claims, links, metadata, page structure, sample mathematics | Visual spacing and responsive screenshots unavailable |
| Upload and question review | File handling, clipboard/drop entry, service failures, graph/table context, input validation | Live vision providers unavailable in the audit environment |
| Manual presentation editor | All ten layouts, placeholders, columns, table/graph/image/Desmos data, saving, slide navigation | Browser interaction tests unavailable |
| Math and graph rendering | Untrusted input handling, expressions, asymptote segmentation, image and Desmos URL constraints | Visual plotting accuracy needs browser checks and problem-specific review |
| Presenter controls | Keyboard navigation, sidebar resizing, fullscreen and clipboard failures, notes | Screen reader and keyboard-only browser sessions unavailable |
| Recording | Container handling, capture cancellation, resource cleanup, audio startup, fallback selection | No microphone or screen recording was captured |
| API and dependencies | Request types and size limits, configured-service failures, provider recovery, package advisories | No production deployment, load test, or penetration test |
| Documentation | Setup, saving behavior, data flow, supported features | Production-specific policies depend on the eventual host and providers |

## Fixes made

### 1. Misleading and generic copy — fixed

The README claimed accounts, rewards, badges, and progress tracking, although these features do not exist. It now describes the actual editor and setup. The homepage and studio now say what each action does instead of using phrases such as “a little preparation, a clearer lesson” and “everything you need.”

The sample preview also described roots as points. It now correctly identifies roots as x-values and distinguishes them from x-intercepts.

The generation instructions now ask for the actual calculation or observation, problem-specific reasoning, and useful speaker notes. Missing notes remain empty instead of becoming a canned “let’s work through this step by step” script. Copy cleanup preserves the original problem, including formal mathematical wording.

Evidence: `app/page.tsx`, `app/try/page.tsx`, `components/LandingPreview.tsx`, `lib/sample-lesson.ts`, `app/api/solve/route.ts`, `lib/json-extractor.ts`, `README.md`.

### 2. Untrusted math rendering — fixed

The renderer used `trust: true` and could return raw source text into an HTML-rendering path after an error. Uploaded or generated LaTeX should not enable HTML-affecting commands or external images. The renderer now disables trust, limits macro expansion and element sizes, and escapes error fallbacks. Ordinary equations still produce MathML.

The approach follows [KaTeX’s security guidance](https://katex.org/docs/security), particularly its treatment of trust settings and unescaped error text.

Evidence: `lib/math-rendering.ts`, `components/MathRenderer.tsx`, `tests/math-rendering.test.ts`.

### 3. Unbounded and weakly validated API requests — fixed

Both AI routes previously parsed the entire body before applying meaningful limits. Invalid field types could become server errors, and image-processing errors could expose internal messages.

The routes now enforce JSON content type, bounded body reads, question and visual-context limits, file types, base64 validation, image pixel limits, and predictable 400/413/415 responses. Problem uploads are limited to 6 MB; graph-image uploads retain their separate 20 MB source limit and local compression. Invalid images return readable errors. Missing AI configuration is distinguished from a temporary provider outage. Provider error bodies are not returned to the user.

The NVIDIA client no longer falls back to a Groq credential. The route chooses a provider only when that provider is configured.

These controls address the request validation and error-handling cases described by the [OWASP REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html).

Evidence: `lib/api-input.ts`, `lib/problem-image.ts`, both `app/api` routes, `components/UploadArea.tsx`, `lib/nvidia.ts`, `tests/api-input.test.ts`.

Requests can now be canceled, time out with a readable message, and are aborted when leaving the studio. This prevents a finished request from redirecting the user out of a manual presentation they opened while waiting. Abort signals are forwarded to the provider request. The app does not promise that a provider reverses charges for canceled work.

Evidence: `lib/client-api.ts`, `app/try/page.tsx`, the AI route and completion modules, `tests/client-api.test.ts`.

### 4. Missing solution subparts accepted as complete — fixed

A deck could have a problem, one solution, and a conclusion, and pass the old completeness check even when the question had several labeled parts. The completion flow now checks the required lettered/Roman-numeral or explicitly numbered Part labels against solution slides, rejects missing coverage, and tries the configured recovery path.

This checks answer coverage. The mathematics still needs review; slide count and labels cannot establish correctness.

Evidence: `lib/solution-completion.ts`, `tests/solution-completion.test.ts`.

### 5. Storage failure could look like AI failure — fixed

If session storage was full or blocked, successful AI output could be discarded before navigation to the editor. The app now retains the current deck in memory and opens it with a storage warning. This also protects manual work during client-side navigation when saving fails.

Saved data is checked before rendering. Corrupt JSON or malformed slide data produces a recovery screen instead of a crash or silent overwrite. Invalid drawing data is filtered before reaching the canvas. The stored copy is left unchanged until the user deliberately starts and saves another presentation.

Evidence: `lib/presentation-store.ts`, `app/try/page.tsx`, `app/presentation/page.tsx`, `tests/presentation-store.test.ts`.

### 6. Recording format, audio startup, and capture cleanup — fixed in code; device validation pending

The fallback recorder could wrap WebM bytes in a `video/mp4` blob and download them with an `.mp4` suffix. It now chooses a supported container, retains the recorder’s actual MIME type, and selects the matching extension. The button says “Download recording.” This follows the [MediaRecorder MIME type contract](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/mimeType).

The primary audio reader previously checked its running flag before the flag was enabled, which could make it exit before reading audio. Startup order is corrected. Audio capability checks determine whether to use the primary engine or the browser recorder.

Starting twice is blocked. Screen sharing is requested from the recording action before awaiting microphone access. Canceling sharing does not trigger another permission attempt. Failed or abandoned starts and component unmounts release capture resources. Errors appear in the page rather than a generic alert.

Evidence: `components/ScreenRecorder.tsx`, `lib/recording.ts`, `tests/recording.test.ts`.

### 7. Presenter and editing controls — fixed in code

Added page landmarks and skip links, keyboard resizing for the presenter panel, readable light-theme header colors, and feedback when fullscreen or clipboard access fails. Empty speaker notes no longer offer active copy/read buttons. An in-page Home navigation attempt is blocked while a slide has unsaved edits, and changed editor content registers the browser’s unload warning. A graph comparison resets after edits so removing a focused graph cannot leave the graph area blank.

These are source-level accessibility improvements. Keyboard, screen-reader, zoom, touch, and visual contrast checks still require a real browser session.

Evidence: `components/Navbar.tsx`, `components/SolutionDisplay.tsx`, `components/SlideEditor.tsx`, `app/studio.css`.

### 8. Vulnerable runtime dependencies — updated

The initial production dependency scan reported 11 affected packages: 1 critical, 6 high, 2 moderate, and 2 low. After updates, `npm audit --omit=dev` reports zero known advisories.

Notable installed versions are Next.js 16.4.5, KaTeX 0.19.1, Sharp 0.35.5, and mathjs 15.2.0. Unused `react-katex`, its type package, and `react-media-recorder` were removed. No literal provider credentials were found in the provider modules.

The full scan still reports eight moderate development-tool entries associated with the TypeScript ESLint/minimatch dependency chain. The suggested forced fix would downgrade the Next.js ESLint configuration, so it was not applied. Track an upstream-compatible fix rather than forcing that downgrade. Package advisory counts do not prove which attacks are reachable in this app.

## Remaining priorities

| Priority | Finding | Recommended action |
| --- | --- | --- |
| High, before public paid-AI access | The source has no application-level authentication or shared request quota for AI routes; deployment rate limits were not available to verify. Body-size limits alone do not bound repeated AI cost. | Configure host/gateway limits and shared per-user or per-session budgets. Bound concurrency and provider spend. Test 429 and retry behavior at the deployed boundary. |
| High product priority | Only the latest manual deck is stored; generated decks use tab-session storage. There is no portable backup. A new deck or cleared browser data can replace or remove work. | Add a named lesson library, versioned storage, and download/import of an editable lesson file before adding more content features. |
| Medium | A browser/device QA pass is still missing. Recording uses estimated crop offsets for windows/screens and cannot reliably identify that a selected surface is the current lesson. | Verify current-tab, window, and screen capture across browsers. Prefer a current-tab flow and show a capture preview before recording. Verify real audio, cancellation, track cleanup, and file playback. |
| Medium | Full edit undo/redo is missing. Current undo mainly covers annotations and limited slide restoration. | Add bounded history for text, graphs, images, layouts, and slide operations. |
| Medium | The eight development-tool advisories remain. | Update the ESLint dependency chain when a compatible patched release is available; keep development and production audit results separate. |
| Medium | Recordings are buffered in memory until download. Long sessions can use substantial memory. | Add a recording-duration/storage indicator and investigate streaming output to disk for longer lessons. Test a full-length recording before relying on it. |
| Medium | A single long question or large text size can still need scrolling inside a slide. Font selection is based partly on character count. | Add overflow detection, a readable fit warning, and an action to split content across slides. Test equations as well as plain text. |
| Medium | Source graph descriptions can include inferred slope or concavity and are shown with the problem. In a classroom, that can reveal what the student is being asked to infer. | Make graph descriptions optional on the Problem slide, keep essential table givens visible, and separate observed source data from solution analysis. |
| Medium | Generated answers can be mathematically wrong despite valid JSON and complete part coverage. | Preserve source context, show extraction uncertainty, and support checking or regenerating an individual part. Keep explicit human review in the workflow. |
| Lower | No share preview image or domain-specific canonical metadata is configured. | Add page/share metadata once the production domain and intended public pages are known. Keep personal editor data out of indexing and public URLs. |

## Most useful next features

| Order | Feature | Why it matters | A useful first version |
| --- | --- | --- | --- |
| 1 | Lesson library and editable backups | Protects preparation work and makes the app reusable across classes. | Named lessons with date/topic, autosave state, duplicate, recoverable deletion, and versioned JSON download/import including images and drawings. |
| 2 | PDF and PowerPoint export | Teachers need files they can print, share, or use outside this app. | PDF first, then editable PPTX with math and static graph images. Make live Desmos graphs an explicit linked/static export choice. |
| 3 | Type or paste a problem | Requiring a screenshot adds work for a question that is already text. | A text input with equation preview, topic selection, and the existing review/generation flow. Reuse the validated solve endpoint. |
| 4 | Tables of values and sign tables — implemented after the audit | Matches graph-heavy worksheets such as the supplied reciprocal-quadratic example. | Editable headers and cells, math notation, spreadsheet paste, row/column controls, accessible tables, two table layouts, and numeric-value plotting. Source tables carry through question review and generation. Plots are editable copies of values; they do not update automatically. |
| 5 | Recheck one answer | Correcting one mistake should not replace a whole manually edited deck. | Select a subpart or slide, retain the source question, review the replacement, and choose whether to apply it. |
| 6 | Undo/redo and draft recovery | Makes experimentation with layouts and graphs less risky. | History for every confirmed edit and recovery of an unfinished slide draft after navigation or reload. |
| 7 | Separate presenter view | Notes disappear from the main workspace when the slide area enters fullscreen. | A second-window speaker view with notes, next slide, timer, and synchronized navigation, tested with recording. |
| 8 | AI readiness and progress | Users should know when generation is unavailable before uploading. Cancel controls are now present. | A configuration/readiness indicator without exposing keys and honest stage labels instead of invented percentage progress. |

Build the library/backups and export path before investing in accounts, badges, analytics, or more decorative themes. Those additions do less to solve the current preparation and sharing problems.

## Copy standard

- Say what an action does: “Upload a problem,” “Generate slides,” “Save changes,” or “Add graph image.”
- Describe implemented behavior. Do not advertise accounts, cloud saving, rewards, or progress analytics until they exist.
- Explain the actual mathematical step. Avoid canned greetings, motivational claims, and repeated “step by step” scene-setting.
- Keep named theorems, precise mathematical terms, and the original problem wording intact.
- Explain what happens to data: which actions send content to AI, which assets stay local, and which graphs require Desmos.
- Preserve uncertainty in graph reconstruction and do not imply that a valid slide deck is a verified proof.

## Verification and follow-up

Automated checks cover request boundaries and status handling, unsafe LaTeX, source wording preservation, storage failures/corruption, recording format selection, omitted solution parts, and the existing graph/image/layout/parser/provider-recovery cases. Results for the final source revision:

| Check | Result |
| --- | --- |
| `npm test` | 126 tests passed after the table feature, including provider-recovery tests with mocked HTTP boundaries |
| `npm run lint` | Passed without errors or warnings |
| `npx tsc --noEmit` | Passed |
| `npm run build` | Production build passed on Node.js 26.5.0 / Next.js 16.4.5 |
| Initial audit: local production HTTP checks | 20 passed: page routes, 404/405 behavior, malformed JSON, field types, unsupported content, oversized requests, invalid images, and missing AI configuration |
| Table feature: server-rendered markup checks | Passed: column/row header semantics, MathML, blank cells, escaped untrusted text, labelled inputs, and plot controls |
| `npm audit --omit=dev` | 0 known runtime advisories |
| Full `npm audit` | 8 moderate development-tool entries in the ESLint/minimatch chain |
| Browser visual/device checks | Blocked by saved browser permission policy |
| Live AI solution accuracy | Not run; provider credentials were not configured for this audit |

The HTTP checks do not execute browser-side editing, microphone capture, or slideshow interaction.

The table follow-up added 16 automated tests for exact sign/interval preservation, empty presets, spreadsheet paste, size limits, numeric and fractional plotting, storage and layout switches, source-table delivery to the solver, relevant slide placement, and recovery from incomplete visual transcription. Lint and the production build were rerun successfully. The sample lesson now includes a sign table beside its quadratic graph. Browser interaction, visual fit, and live-provider extraction accuracy still require verification.

Before calling the site fully browser-tested, check:

1. Home, studio, manual editor, and sample lesson at desktop, tablet, and narrow phone widths; also test browser zoom and reduced motion.
2. Every layout with empty placeholders, normal content, a long equation, and maximum text size.
3. Native graph, Desmos graph, and image import; clipboard paste, drag/drop, replacement, graph focus, and deleting a focused graph.
4. Reload, tab close, back navigation, corrupt saved data, and blocked/full browser storage. Confirm that warnings match actual persistence.
5. Keyboard-only navigation and a screen reader, including graph alternatives, labels, focus return, and the resize handle.
6. Real recordings with and without a microphone; cancel each permission step; stop sharing from the browser; leave during startup; play the downloaded MP4/WebM and inspect the crop.
7. Configured providers against real algebra, multipart, graph-only, sign-table, and low-quality image questions. Compare answers with worked mathematical solutions.
8. Deployment quotas, concurrency, provider limits, privacy disclosures, and public error responses.
