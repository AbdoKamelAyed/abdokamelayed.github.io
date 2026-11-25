# ABDO — Personal Digital Hub

Personal website, developer portfolio, automated GitHub intelligence dashboard, editorial journal, and structured knowledge archive for **Abdo Kamel** (`@AbdoKamelAyed`).

## Architecture Overview
- **Frontend**: React + TypeScript + Tailwind CSS compiled to static assets (`dist/`) compatible with **GitHub Pages**.
- **Data Separation**:
  - `public/data/github/*.json`: Automated GitHub REST + GraphQL snapshots updated exclusively by GitHub Actions (`scripts/sync-github.mjs`).
  - `public/data/projects/`, `experience/`, `journal/`, `knowledge/`, `settings/`: Manually curated portfolio and editorial data (never overwritten by GitHub sync).
- **Automation & Validation**:
  - `.github/workflows/sync-github.yml`: Scheduled daily sync + manual `workflow_dispatch`.
  - `.github/workflows/validate-and-deploy.yml`: JSON schema + secret-leak validation (`scripts/validate-schemas.mjs`), TypeScript lint, production build, and GitHub Pages deployment.

## Configuration & Deployment
1. In GitHub repository **Settings → Pages**, choose **GitHub Actions** as the build and deployment source.
2. *(Optional for GraphQL contribution heatmap)* Add a fine-grained read-only PAT as repository secret `GH_METRICS_TOKEN` in **Settings → Secrets and variables → Actions**. Never place tokens in frontend files or JSON datasets.
3. Run **Sync GitHub Intelligence** from the **Actions** tab to refresh live public GitHub data.

## Local Development & Verification
- `npm run dev` — Start Vite dev server on port 3000
- `npm run lint` — TypeScript verification (`tsc --noEmit`)
- `npm run build` — Build static production bundle into `dist/`
- `node scripts/validate-schemas.mjs` — Validate all JSON datasets and scan for secret patterns
- `npx --yes tsx --test src/utils/analytics.test.ts` — Run unit tests
