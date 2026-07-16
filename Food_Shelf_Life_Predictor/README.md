# Food Shelf Life Predictor

An independently runnable browser-based food shelf-life study platform for planning storage trials, managing sampling schedules, recording quality observations and exploring transparent predictive models. In FoodLab AI V1.0 it exchanges explicit, versioned JSON files with Sensory and QA without requiring a backend.

> **Educational and research planning only.** Shelf-life estimates must not be used as commercial expiry dates, food safety approvals or regulatory evidence without validated laboratory testing, approved methods, suitable challenge studies and review by qualified food safety professionals.

## Food science value and basic concepts

Shelf life is condition- and product-specific. A defensible study links a defined product and package to controlled storage conditions, scheduled observations, fit-for-purpose test methods and user-approved acceptance limits. This application preserves that chain from study design to report. It deliberately distinguishes **safety endpoints** from **quality, sensory, packaging and commercial endpoints**. It does not embed universal legal microbial limits or infer pathogen safety.

Three clearly marked demonstration studies are included: Reduced Sugar Berry Yoghurt, High Protein Chocolate Bar, and Plant-Based Oat Beverage. Their observations are synthetic demo data only.

## Technology

React, TypeScript, Vite, Tailwind CSS, Recharts, Zustand, React Hook Form, Zod, PapaParse, date-fns, Lucide React, simple-statistics and Vitest. Persistence uses versioned LocalStorage; exchange uses JSON and CSV.

## Install, run, test and build

```bash
npm install
npm run dev
npm run test
npm run build
```

Vite prints the local development URL. Data stays in the current browser profile.

## FoodLab AI V1.0 hand-offs

The Lifecycle Transfer workspace imports a user-selected `SENSORY_TO_SHELF_LIFE` JSON file, validates and previews aggregate sensory evidence, and creates a linked shelf-life study only after confirmation. A reviewed study can export `SHELF_LIFE_TO_QA` with shared lifecycle identifiers and only the acceptance limits explicitly confirmed by the user.

No panelist-level data is imported, no unconfirmed limit is exported, and no record is synchronized in the background. Transfer history contains metadata only.

## CSV results format

Required columns are `study_code`, `condition_name`, `planned_day`, `parameter_name`, `replicate_number`, `measured_value`, and `result_date`. Optional columns include `unit`, `qualifier`, and `comments`. See `public/sample-shelf-life-results.csv`. Invalid references, numbers, dates, duplicates and blank rows are reported without crashing or silently changing source observations. Sensory panel format is illustrated in `public/sample-sensory-results.csv`.

## Limits and status logic

Limits are configured by the user for each parameter. Values outside a lower/upper limit are `UNACCEPTABLE`; values in the nearest 10% of a valid range are `WARNING`; missing values are `INCOMPLETE`; nonnumeric judgements are `MANUAL_REVIEW`. These statuses support research review only. They do not prove safety. Outliers may be flagged by IQR or Z-score but are never automatically deleted; model exclusions must retain a reason.

## Trend and kinetic models

Linear, log-linear, zero-order and first-order models expose slope, intercept, R², observations and threshold crossing. Fewer than three valid points returns `Insufficient data for prediction`. R² below 0.6 produces a weak-fit warning. When an observed failure exists, the conservative estimate uses the last acceptable observed day. Model-only estimates apply a documented safety factor (default 0.8).

Q10 estimates relative rate change per 10 °C from user inputs. Arrhenius analysis converts °C to K, regresses `ln(k)` against `1/T`, and estimates activation energy. At least three temperatures are required. Real foods may change mechanism or physical state and may not obey one Arrhenius relationship.

## Microbiological results

CFU can be represented as raw or log10 values. Zero is not log-transformed. `Not Detected`, `< detection limit`, presence/absence and exact values remain distinct. The application does not infer pathogen absence, product safety, method adequacy or regulatory compliance.

## Safety and scientific disclaimer

This software cannot replace laboratory testing, a microbiological challenge study, validated methods, regulatory review or professional judgement. It does not automatically prove a product safe and cannot generate an official Use By Date or Best Before Date. When evidence is sparse, it withholds predictions. Every model output requires uncertainty-aware interpretation.

## Portfolio note

Resume description: **Developed a browser-based food shelf-life study platform for managing storage conditions, sampling schedules, quality results and transparent predictive models using React and TypeScript.**

This project demonstrates domain modelling, robust CSV validation, state persistence, scientific calculations, data visualization, cautious language and automated tests. It does not claim real commercial deployment, certification or laboratory replacement.

## Post-V1 roadmap

Potential future work includes PDF reports, environmental logger import, SPC charts, richer replicate tools, packaging comparison, approvals, audit history, calibration records, attachments, survival/Weibull modelling and Bayesian uncertainty.

Cloud databases, accounts, collaboration and permissions remain out of scope until data ownership, privacy, validation and migration requirements are defined.
