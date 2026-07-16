# Food Sensory AI

Food Sensory AI is an independently runnable, local-first browser application for designing blinded food sensory studies, managing anonymous panelists and samples, validating response data, and producing transparent descriptive analyses. In FoodLab AI V1.0 it can exchange explicit, versioned JSON files with Product Development and Shelf Life while retaining its own LocalStorage and scientific boundaries.

> **Demo sensory data only.** The three built-in studies are synthetic and are provided for software demonstration.

## Why sensory evaluation matters

Sensory evaluation connects controlled product preparation with structured human responses. Good software can reduce transcription errors, preserve study metadata, make calculations reproducible and make limitations visible. It cannot repair a weak study design or replace qualified interpretation.

## Supported methods

- **Hedonic test:** measures degree of liking using a declared scale such as the 9-point hedonic scale. The app reports n, mean, median, sample standard deviation, standard error, 95% confidence interval and distributions.
- **Preference test and ranking:** records first/second/no preference or rank order. Descriptive rank summaries do not establish statistical significance without a suitable test.
- **Triangle test:** uses an exact binomial upper-tail probability with chance probability 1/3. A significant result means a detectable difference, not that one sample is better.
- **JAR and penalty analysis:** groups attribute responses into too low, just-about-right and too high, then reports mean drop, affected percentage and weighted penalty. Groups smaller than five receive a warning.
- **CATA:** counts descriptor selections by sample. High frequency is not treated as a causal explanation. Cochran's Q is planned for V2.
- **Consumer segmentation:** transparent k-means on complete overall-liking vectors, supporting 2–5 clusters and neutral labels. Fewer than 20 valid panelists are rejected.
- **Drivers of liking:** Pearson correlation between attribute ratings and overall liking. Correlation does not prove causation and fewer than ten observations should not support a strong conclusion.
- **Open comments:** lower-casing, punctuation removal, English stop-word removal, synonym grouping, token frequency and keyword context. This is not validated sentiment analysis.

Purchase intent is summarised with mean, Top-2 Box, Bottom-2 Box and neutral percentage. It is not equivalent to real sales behaviour.

## Technology

React, TypeScript, Vite, Tailwind CSS, Recharts, Zustand, React Hook Form, Zod, PapaParse, date-fns, Lucide React, simple-statistics and Vitest. All study data is stored locally in browser LocalStorage using a versioned `{ schemaVersion/version, data/state }` persistence envelope. JSON and CSV provide portable exchange formats. No backend, cloud database, paid API or black-box model is used.

## Install and run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Production validation:

```bash
npm run test
npm run build
```

## FoodLab AI V1.0 hand-offs

The Lifecycle Transfer workspace imports a user-selected `PRODUCT_TO_SENSORY` JSON file, validates and previews its formula samples, and creates a linked sensory project only after confirmation. A completed study can export a `SENSORY_TO_SHELF_LIFE` file containing aggregate results and shared lifecycle identifiers. Panelist-level responses are never included.

Transfer history stores metadata only. No records are synchronized in the background, and existing Sensory LocalStorage data remains readable.

## CSV formats

Templates are in `public/` and can be downloaded from the Responses page.

Hedonic fields: `panelist_id,test_id,sample_code,appearance,aroma,flavour,sweetness,texture,aftertaste,overall_liking,purchase_intent,comments`.

JAR fields: `panelist_id,test_id,sample_code,sweetness_jar,saltiness_jar,texture_jar,flavour_intensity_jar,overall_liking`.

Triangle fields: `panelist_id,test_id,sample_set_code,serving_order,selected_odd_sample,correct_odd_sample,confidence_rating,comments`.

CATA fields: `panelist_id,test_id,sample_code,selected_terms,overall_liking,comments`; separate selected terms with semicolons, for example `creamy;smooth;fruity`.

The hedonic importer validates required fields, known test/sample codes, duplicate participant/sample responses, 1–9 ratings, 1–5 purchase intent and blank rows. Invalid rows are isolated and reported rather than crashing the interface. JSON imports are checked for the required project shape; invalid source text is backed up locally before recovery.

## Built-in demonstration studies

1. **High Protein Chocolate Bar Preference Study:** 60 anonymous consumers, three formulas, hedonic, JAR sweetness, purchase intent, preference ranking and mixed comments.
2. **Reduced Sugar Berry Yoghurt Hedonic Test:** 50 consumers, three sugar levels, hedonic, JAR and CATA.
3. **Plant-Based Oat Beverage Consumer Study:** 45 consumers, three variants, triangle test, hedonic and CATA.

Missing observations are deliberately included. The demo badge remains visible wherever relevant.

## Five-minute portfolio demonstration

1. Open the High Protein Chocolate Bar project.
2. Show the three randomly assigned blind codes on Samples.
3. Open Responses and explain the 9-point hedonic records.
4. Compare the three formulas by descriptive overall liking.
5. Open Analysis → JAR and explain sweetness penalty analysis.
6. Show the sample comparison and stated purchase intent.
7. Open Analysis → Segments and show neutral exploratory clusters.
8. Open Analysis → Comments and explain the transparent keyword method.
9. Point out the scientific notice and the limits of correlations and small groups.
10. Export the Sensory Study Summary as Markdown, JSON or analysis CSV.

Resume description:

> Developed a browser-based food sensory analysis platform for managing blinded product tests, hedonic ratings, preference data, JAR penalty analysis and consumer segmentation using React and TypeScript.

## Scientific disclaimer

This application is for educational, research planning and demonstration purposes only.

Sensory conclusions depend on appropriate experimental design, sample preparation, serving order, blinding, panel selection, statistical methods and qualified interpretation.

The software must not be used as the sole basis for commercial product approval without validated sensory procedures and professional review.

In particular, the software does not prove that consumers will like a product, cannot turn a small sample into a strong general conclusion, and cannot remove bias caused by non-random serving. Untrained consumer data must not be interpreted as if it came from a trained descriptive panel. Every result must be interpreted with the test environment and sample-preparation protocol.

## Post-V1 roadmap

Potential future work includes ANOVA, Tukey HSD, Friedman tests, Cochran's Q, correspondence analysis, PCA, external preference mapping, Latin-square serving designs, PDF export and panel performance monitoring.

Cautious AI-assisted summaries, validated NLP options, cloud persistence, accounts and collaboration remain out of scope until scientific validation, privacy, data ownership and migration requirements are defined.

The project does not claim commercial deployment, industry certification, guaranteed market success or replacement of a sensory scientist.
