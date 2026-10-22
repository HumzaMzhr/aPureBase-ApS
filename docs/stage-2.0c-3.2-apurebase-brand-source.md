# aPureBase C-3.2 brand source of truth

This visual-only alignment uses the supplied original aPureBase methodology material. It replaces the preceding invented blue/teal interface identity. It does not change consent, email, ASR, audio, phrase bindings, evidence schemas or backend behavior. No new logo was drawn and no image was generated.

## Original sources inspected

| Source | SHA-256 | Inspection performed |
| --- | --- | --- |
| E-Consents v2.pptx | `82f272599c8b72a07898e1ea64ad398eb5e057b3816560955a703bd43467f0c5` | OOXML slide/master/theme/media inspected and original thumbnail/media contact sheet reviewed |
| E-Permission Communication Document Template.docx | `cdb864c6f29072b01d5dbea4a4ea8e7a81d00fbc1f78c73fa191c30e1de1cee5` | OOXML all content/theme/media inspected; original thumbnails/assets visually reviewed; DOCX also rendered to 31 pages each |
| E-Permission Template.docx | `59df244e9d2ef3a899b42595ff0959c7dae5119fc2c3b965ee96d340c1034e0d` | OOXML all content/theme/media inspected; original thumbnails/assets visually reviewed; DOCX also rendered to 31 pages each |
| E-consent Nordics Feb 15 2021.pdf | `b0e5c0d726f650e5db3dfef3851cbcba68c7415cd6f06d1cfef1ab10b2b9b2bb` | PDF all pages rendered and vector/text colors/fonts extracted |
| E-consent Nordics Feb 15 2021.pptx | `d2ebdd19507821418a8a7dcd08bdc6241664ef6b2d51065811458b4d265486b1` | OOXML slide/master/theme/media inspected and original thumbnail/media contact sheet reviewed |
| Email Consent Collection Nordics Abbott Feb 12 2021.pptx | `acfb87e9d148ef37384f1a0f189c228eefadaac6ca916aca5c33c6343c01dcf4` | OOXML slide/master/theme/media inspected and original thumbnail/media contact sheet reviewed |
| Email Consent Collection Nordics Abbott Feb 15 2021.pptx | `1aa9bbd9335b4f065c3b77565fc95ce0476aec90aea0a9ec373aac90bc94f848` | OOXML slide/master/theme/media inspected and original thumbnail/media contact sheet reviewed |
| Email Consent Methodology 2021 Nordics Abbott.pptx | `57bf53b98089a2fe6213bd6473b8de7d1dcdb28f790b0569126e194dc51cbe79` | OOXML slide/master/theme/media inspected and original thumbnail/media contact sheet reviewed |
| aPureBase E-mail Consent Methodology_2021-02-16_Nordics_Abbott.pdf | `17dc0265bf80e96bf8e02d5d0f2548c2deeb1676c01567fd31e63de2625cfdaa` | PDF all pages rendered and vector/text colors/fonts extracted |

The two original PDFs were rendered completely (six methodology pages and five Nordic consent pages). Every slide/master/theme/media XML part of the five related PPTX files was inspected, with original thumbnails and graphic assets visually reviewed. The two Word templates were inspected as OOXML and rendered to 31 pages each; their pages were reviewed as visual contact sheets with representative source imagery. They use generic blue Word header treatments, which are documented as communication-template styling rather than adopted as aPureBase's primary identity. Existing project screenshots and generated workbench visuals were inventoried and excluded as brand authorities.

No original vector wordmark was found. The supplied SVG assets are checkmark/handshake icons, not logos. There was no higher-resolution original wordmark among the supplied inspected assets. No internet logo or guessed brand font was introduced.

## Source → observed feature → implementation

| Source evidence | Observed feature | Implemented token or asset |
| --- | --- | --- |
| Methodology PDF pages 1, 4, 5; editable methodology PPTX theme accent1 and direct text | Lime/yellow-green dominant identity | `--apb-banner-overlay-opacity` | `0.90196` | SOURCE_EXACT | PDF page 4 GS23 normal blend, non-stroking alpha /ca 0.90196 over Image53. |
| `--apb-brand-primary`, `--apb-brand-header` |
| Methodology PPTX `ppt/media/image3.jpg`; PDF page 1 `Image8` | Green wordmark on white, original casing and italic first a | `src/consent/stage32/handoff/brand/apurebase-wordmark.jpg` |
| Methodology PDF page 4 `Image53.jpg`, also reused page 5 | Molecular JPEG with the original 90.196% lime overlay | `src/consent/stage32/handoff/brand/apurebase-molecular-header.jpg` |
| Content pages and PowerPoint white lt1 | White content surfaces and generous white space | `--apb-surface`, white review workspace |
| Original Nordic PPTX direct `5F5F5F` text | Restrained grey text and headings | `--apb-text-secondary`, `--apb-heading` |
| PDF pale neutral/table surfaces | Light secondary fills | `--apb-background`, `--apb-brand-primary-soft` (sampled, not official documented HEX) |
| Calibri, Calibri Bold and Candara Bold embedded/source font names | Corporate sans-serif typography | Calibri/Segoe UI/Arial system stack and Candara-first headings; not a claimed official brand-font specification |
| Source title strips, simple tables and large margins | Minimal decoration, separators, white space | Restrained 6px panel radius, neutral borders, no new shadows or CSS gradients |

The logo asset is copied byte-for-byte from the existing `public/apurebase-logo.jpg`, which matches the original methodology PowerPoint `ppt/media/image3.jpg`:
`54049e9513e608407635aa6effe7c7afd19ee140795b80a70d8edb951ab8232e`.
It remains 250×59 pixels (aspect 4.237288:1). Its encoded color, casing, proportions and built-in white clear space are unchanged. CSS uses width with automatic height; there is no tint, filter, stretch or replacement lettering.

The underlying molecular JPEG is extracted directly as original bytes from page 4 of the methodology PDF. The PDF paints Image53, then a #C2CD23 rectangle using /ExtGState /GS23, normal blend and /ca 0.90196. The UI reproduces that exact source composition with a decorative CSS pseudo-element; the JPEG itself is not recolored or resampled. Extraction of the base JPEG alone would look neutral rather than the original lime banner. Only the background image is included; no original customer contact text, process text, signatures or business terms are copied into the application. The motif remains decorative behind the introductory header and cannot obscure the review controls. Its exact asset digest and source overlay opacity are recorded in the token JSON.

## Palette with provenance classifications

`SOURCE_EXACT` means an actual source XML color value, not a claim that a formal brand manual was supplied. `SOURCE_SAMPLED` means a reproducible 8-bit value derived from a rendered/PDF color rather than an official documented HEX. Accessibility and semantic colors are explicitly UI choices.

| Token | Value | Classification | Evidence |
| --- | --- | --- | --- |
| `--apb-brand-primary` | `#C2CD23` | SOURCE_EXACT | Methodology PPTX ppt/theme/theme1.xml accent1; cross-checked PDF vector fills (0.761,0.804,0.137). |
| `--apb-brand-primary-hover` | `#B0BA1F` | SOURCE_EXACT | Original Nordic decks direct shape/arrow fill and text; reused for hover, not asserted as a published hover specification. |
| `--apb-brand-primary-soft` | `#F4F6E8` | SOURCE_SAMPLED | Rounded 8-bit rendering of the source PDF pale table fill (0.957,0.965,0.910); not an official HEX specification. |
| `--apb-brand-header` | `#C2CD23` | SOURCE_EXACT | Same source accent1, behind the extracted original green molecular header. |
| `--apb-background` | `#F8F8F8` | SOURCE_SAMPLED | Closest 8-bit neutral to source PDF grey 0.973; not an official documented HEX. |
| `--apb-surface` | `#FFFFFF` | SOURCE_EXACT | Original PowerPoint lt1 and white slide working surfaces. |
| `--apb-text-primary` | `#333333` | UI_DERIVED_ACCESSIBILITY | Darker neutral than the original grey for readable small text and lime controls. |
| `--apb-text-secondary` | `#5F5F5F` | SOURCE_EXACT | Original Nordic PPTX direct text colors, also PDF grey 0.373 (rounded). |
| `--apb-heading` | `#5F5F5F` | SOURCE_EXACT | Original grey heading/text treatment; used on white surfaces. |
| `--apb-border` | `#D9D9D9` | SEMANTIC_UI_COLOR | Neutral interface separators; not an official brand specification. |
| `--apb-focus` | `#626A12` | UI_DERIVED_ACCESSIBILITY | Darker yellow-green focus outline, derived for contrast on white. |
| `--apb-brand-label` | `#43490D` | UI_DERIVED_ACCESSIBILITY | Dark lime-family label text for small badges and active-step labels. |
| `--apb-success` | `#486019` | SEMANTIC_UI_COLOR | Restrained positive status, deliberately secondary to source lime. |
| `--apb-success-soft` | `#F0F4E8` | SEMANTIC_UI_COLOR | Light positive-status surface. |
| `--apb-success-border` | `#BDC9A7` | SEMANTIC_UI_COLOR | Positive-status border. |
| `--apb-warning` | `#805B09` | SEMANTIC_UI_COLOR | Restrained amber for concerns; independent from the brand palette. |
| `--apb-warning-soft` | `#FBF6E9` | SEMANTIC_UI_COLOR | Light warning surface. |
| `--apb-error` | `#963C30` | SEMANTIC_UI_COLOR | Restrained red for errors. |
| `--apb-error-soft` | `#FAEFEC` | SEMANTIC_UI_COLOR | Light error surface. |
| `--apb-disabled` | `#EEEEEB` | SEMANTIC_UI_COLOR | Neutral disabled-control surface. |
| `--apb-disabled-text` | `#6B6B65` | UI_DERIVED_ACCESSIBILITY | Readable neutral disabled text, not a new brand color. |
| `--apb-neutral-soft` | `#F3F3EF` | SEMANTIC_UI_COLOR | Secondary panel backgrounds. |

The earlier invented blue concept values `#0B2D5B`, `#2563EB` and `#06B6D4`, its invented logo, and the preceding teal aP monogram are not used as brand sources. This pass also removes the preceding teal control palette. Real semantic amber/red remain for warnings and errors.

## Accessibility and typography

Original lime is used with dark neutral text, not white small text. A darker lime-family focus color and badge text preserve readable contrast. No new official brand colors are claimed.

| Tested foreground / surface | Calculated WCAG contrast |
| --- | --- |
| `--apb-text-primary` / `--apb-brand-primary` | 7.25:1 |
| `--apb-text-primary` / `--apb-brand-primary-hover` | 5.95:1 |
| `--apb-text-secondary` / `--apb-surface` | 6.385:1 |
| `--apb-brand-label` / `--apb-brand-primary-soft` | 8.735:1 |
| `--apb-focus` / `--apb-surface` | 5.85:1 |
| `--apb-warning` / `--apb-warning-soft` | 5.693:1 |
| `--apb-error` / `--apb-error-soft` | 6.237:1 |
| `--apb-success` / `--apb-success-soft` | 6.349:1 |

These ratios cover the defined flat UI color pairs, not a blanket conformance certification. The original logo is exempt text within its unchanged source image. The original photographic/banner gradient remains source imagery; the browser check additionally samples its rendered colors behind header text. Form labels, score groups, Enter/Tab operation, visible focus outlines, non-color status labels and the skip link remain in place. Original font names were recovered from the supplied documents; fonts themselves are not redistributed. The compatible system stacks support Danish æ/ø/å and uppercase variants.

## Scope and evidence preservation

The pre-brand identity is `929af7f4c86b88be23d5cca95d9eb54fedec6d959321c2902984780c8fbafa60` (base `c647dec9c6caae97b7b7e17d99283f9f402727c9`). Its validated core hash remains `cda13e62d921062f0a734589e992b460d643ef2c912c5d5436eb08fed6c82eea`. The entire App behavior prefix before the page's final JSX return, plus the handoff contract, live adapter, presentation/gating helpers, server, export verifier and JSON schema are protected by recorded SHA-256 checks. This branding task edits only CSS and static logo/header markup, adds two original graphic assets and presentation-only tests, and adjusts the visual startup description in START-HERE.txt.

The five-step workflow, all sixteen exact current listening items, microphone prerequisites, email correction lineage, consent guards, actual elapsed call timing, ratings, safety rules and export format remain intact. No obsolete full-email spoken readback is reintroduced. Four spelling recordings remain diagnostic listening assets; the ordinary email flow displays the resolved email as text.

Validation results, final source/ZIP identity, all five desktop screenshots and the exact changed-file list are recorded in the accompanying brand verification report after clean-extracted package validation. Historical reports and ZIPs remain preserved; only the final branded ZIP should be used for the next human retest. Stage status remains NOT ACCEPTED / NOT PRODUCTION READY.
