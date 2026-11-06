# SolveMath

A math presentation editor. Build slides manually, or upload a problem and use AI to draft a solution. Edit the explanation, add graphs, and present with speaker notes and annotations.

## Create a presentation

- **Create manually:** opens a blank presentation without calling an AI service.
- **Upload a problem:** accepts a PNG, JPG, or WebP screenshot up to 6 MB. Review the detected questions, graph observations, and table values before generating slides.
- **View a sample:** opens an editable quadratic lesson without an API key.

There are ten layouts: title slide, title and text, two text columns, text and graph, graph and text, graph comparison, full graph or image, key result, table, and table and graph. Open **Slide layout → Change layout** to compare previews. Each slide supports equations and speaker notes. Slides can be duplicated, reordered, and deleted.

Use `$x^2$` for inline math, `$$x^2$$` for a displayed equation, and `**text**` for bold. Speaker notes stay separate from slide content.

## Tables

Choose **Add or edit tables** in the presenter panel, or pick the **Table** or **Table & graph** layout. Start with a value table, sign table, or blank table. Edit the title, column headings, row headings, and every cell. Add or remove rows and columns, use `$...$` for mathematical notation, or paste a rectangular range from a spreadsheet. Sign tables have quick buttons for +, −, 0, and undefined; new signs and values start blank.

Each slide supports two tables, with up to eight columns and twelve data rows per table. Tables scale to fit the slide. Split dense tables across slides for larger text. Switching layouts keeps the table data, and confirmed edits are included in the saved presentation.

For a value or blank table, open **Plot values on this slide**, choose the x and y columns, and select **Add plot to slide**. Numbers, decimals, and fractions are supported. Completely blank coordinate pairs are skipped; incomplete or non-numeric rows are reported. Points remain separate unless you choose **Join points in row order**. The plot is an editable copy: after changing the table, remove the old graph and plot again.

Tables read from a worksheet can be reviewed and corrected before generating slides. Source tables are retained on the Problem slide and the relevant Solution slide. Oversized source tables remain in the text description so cells are not silently truncated.

## Graphs and images

The built-in graph editor supports functions, multiple curves, labeled points, axis ranges, restricted domains, asymptotes, holes, and symmetry lines. Enter expressions such as `x^2`, `sin(x)`, or `-10/((x+5)*(x-1))`. You can enter exact coordinates or click the preview to place points.

Choose **Add from Desmos** to paste a shared Graphing Calculator link or its embed code. Desmos graphs remain interactive and require an internet connection. Edits or zoom changes in the embedded preview do not change the saved source graph.

Choose **Add graph image** to upload, drop, or paste an exported graph or screenshot. Graph images are prepared locally, displayed without cropping, and saved inside the presentation. You can also replace a live Desmos graph with an image. Large graph images are resized to limit browser-storage use.

For image-based questions, the extraction flow retains graph descriptions and table values. Reconstructions of unscaled drawings are labeled approximate. Review generated mathematics before presenting it; subpart coverage checks do not establish mathematical correctness.

## Present and record

Choose a theme and text size, draw annotations, and use arrow keys or the on-screen buttons to move between slides. `F` opens fullscreen when supported. `Ctrl/Cmd+Z` undoes the latest annotation when a text field is not active.

Recording uses screen-sharing permission and optional microphone permission. Downloads retain their actual video format, such as MP4 or WebM. Browser support for screen capture, audio encoding, and window cropping varies; choosing the current presentation tab gives the most reliable crop.

## Saving and data

Manual presentations are saved in this browser after confirmed changes. Generated presentations use the current tab's session storage. Text inside an open slide editor is committed with **Save changes**. A storage warning means the current in-memory deck can be used, but may be lost on reload or when the tab closes.

The app currently keeps one manual deck and one generated deck per browser/tab storage scope. A named lesson library, portable backups, and document exports are proposed in the [website audit](docs/website-audit-2026-11-05.md).

Uploaded problems and selected question data are sent to the configured AI providers. Manual editing and uploaded graph images do not call an AI service. Embedded Desmos graphs load from Desmos. Do not put provider API keys in browser code.

## Run locally

Use Node.js 20.9 or newer.

```sh
npm ci
npm run dev
```

Restart an existing development server after dependency updates.

Manual editing and the sample lesson work without provider credentials. To enable AI, copy `.env.example` to `.env.local` and set the keys you need:

| Variable | Purpose |
| --- | --- |
| `GROQ_API_KEY` | Generates presentation solutions; can also read problem images. |
| `NVIDIA_API_KEY` | Reads problem images using NVIDIA vision models. Optional when Groq vision is configured. |
| `GROQ_MODEL`, `GROQ_FALLBACK_MODEL` | Optional solution-model overrides. |
| `NVIDIA_VISION_MODEL`, `NVIDIA_VISION_FALLBACK_MODEL` | Optional vision-model overrides. |

Public deployments also need request quotas and rate limiting at the hosting or gateway layer before enabling paid AI routes. Body-size limits are enforced by the app.

## Checks

```sh
npm run lint
npm test
npm run build
npm audit --omit=dev
```

The [audit report](docs/website-audit-2026-11-05.md) separates fixes made from remaining risks and proposed features. It also records which browser and live-provider checks could not be performed.
