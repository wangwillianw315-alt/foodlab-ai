# Portfolio Case Study: Food QA Dashboard

## Project summary

Food QA Dashboard is a frontend quality-data application designed for QA/QC personnel, Food Technologists and Food Science students. It converts laboratory and production CSV records into transparent sample assessments, batch comparisons and trend visualisations.

The project demonstrates a complete workflow rather than a static dashboard: data is validated, converted, assessed, filtered, investigated and exported inside the browser.

## The problem

Food quality measurements are frequently stored in spreadsheets containing sample IDs, batches, dates and parameters such as pH, water activity, moisture and temperature. Manual review becomes slow and inconsistent when teams must repeatedly compare every value with a different product specification.

The application addresses three practical questions:

1. Which samples require attention?
2. Which parameter caused the result?
3. Is the problem isolated or visible across a batch or product trend?

## My solution

- Validate uploaded CSV or Excel data without allowing one bad row to crash the analysis.
- Preview Excel worksheets and map source columns to the dashboard schema before assessment.
- Recalculate every result from parameter values rather than trusting an uploaded status.
- Separate PASS, WARNING, FAIL and INCOMPLETE outcomes.
- Produce a transparent score with named failed, warning and missing parameters.
- Allow QA reviewers to move from a portfolio-level overview to one sample's value-versus-limit detail.
- Let reviewers edit demonstration limits and product warning margins, then transparently reassess every active record.
- Keep uploaded data local to the browser session.

## Demonstration investigation

The built-in dataset contains 64 records across four products. A reviewer can filter to Fruit Juice batch `JUI-4203` and identify three different quality situations:

| Sample | Observation | Dashboard result |
| --- | --- | --- |
| `JUI-010` | Moisture is 83%, below the 85% demonstration minimum | FAIL |
| `JUI-011` | Temperature is missing | INCOMPLETE |
| `JUI-012` | Temperature is 9.5 C, above the 8 C demonstration maximum | FAIL |

This pattern gives the reviewer an actionable next step: verify cold-chain and moisture records, confirm instrument and data-entry integrity, isolate affected material according to the site's approved procedures, and arrange authorised review or retesting. The software supports the decision; it does not replace approved QA procedures.

## Quality logic

The rules engine is implemented as pure TypeScript functions and covered by unit tests.

- A range measurement fails outside its minimum or maximum.
- The nearest 10% inside either range boundary is a warning zone.
- A maximum-only measurement warns from 90% through 100% of its maximum.
- Any missing required measurement makes the sample incomplete.
- Unsupported products are incomplete with a score of 0 because no valid specification comparison is possible.

Scoring begins at 100, deducting 25 for each failure, 5 for each warning and 15 for each missing required parameter, with a minimum of 0.

## Engineering decisions

- React and TypeScript provide a modular, typed UI.
- PapaParse performs resilient browser-side CSV parsing, while ExcelJS is loaded only when an `.xlsx` workbook is selected.
- Recharts provides responsive status, batch, trend and product views.
- Session storage protects work from an accidental refresh without creating a cloud-data dependency.
- Lazy-loaded pages reduce initial JavaScript while keeping the dashboard interactive.
- Vitest verifies assessment boundaries, CSV conversion, invalid dates, duplicate sample handling and analytics.

## Verification

- 36 automated tests
- Strict TypeScript production build
- 64 built-in rows parsed without errors
- Desktop screenshots captured from the running application
- Keyboard-accessible navigation and table-row inspection

## Limitations and next iteration

The standards are illustrative and must not be treated as regulatory or commercial limits. The current release accepts CSV and `.xlsx` workbooks but intentionally excludes legacy `.xls`, authentication, cloud storage and PDF reporting.

The strongest next product increment is SPC control-chart support with process-centre and control-limit calculations, followed by governed standard approval history and PDF reporting.
