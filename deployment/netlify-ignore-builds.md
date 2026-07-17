# Optional Netlify ignore-build commands

These commands are optional deployment-UI optimizations for the five-site repository. They are documented here and are **not enabled in any `netlify.toml`**. Establish a successful baseline deployment for every site before enabling them.

Netlify runs an ignore command from the configured Base directory. Exit code `0` cancels the build because the relevant paths are unchanged; exit code `1` continues the build because a relevant change is present. The `:(top)` pathspecs below anchor every path at the repository root even when the command runs from a child Base directory.

Configure a command under the site's build settings only if unnecessary cross-site rebuilds need to be reduced.

## Portal

```sh
git diff --quiet $CACHED_COMMIT_REF $COMMIT_REF -- ':(top)FoodLab_AI_Portal' ':(top)shared-contracts' ':(top)demo-workflow' ':(top)package.json' ':(top)pnpm-lock.yaml' ':(top)scripts' ':(top)deployment'
```

## Product Development

```sh
git diff --quiet $CACHED_COMMIT_REF $COMMIT_REF -- ':(top)Food_Product_Development_AI' ':(top)shared-contracts' ':(top)package.json' ':(top)pnpm-lock.yaml' ':(top)scripts' ':(top)deployment'
```

## Sensory

```sh
git diff --quiet $CACHED_COMMIT_REF $COMMIT_REF -- ':(top)Food_Sensory_AI' ':(top)shared-contracts' ':(top)package.json' ':(top)pnpm-lock.yaml' ':(top)scripts' ':(top)deployment'
```

## Shelf Life

```sh
git diff --quiet $CACHED_COMMIT_REF $COMMIT_REF -- ':(top)Food_Shelf_Life_Predictor' ':(top)shared-contracts' ':(top)package.json' ':(top)pnpm-lock.yaml' ':(top)scripts' ':(top)deployment'
```

## QA

```sh
git diff --quiet $CACHED_COMMIT_REF $COMMIT_REF -- ':(top)Food_QA_Dashboard' ':(top)shared-contracts' ':(top)package.json' ':(top)pnpm-lock.yaml' ':(top)scripts' ':(top)deployment'
```

When changing shared workflow contracts, root dependency orchestration, verification scripts or deployment documentation, all affected sites are intentionally rebuilt. If later integrations add another shared runtime directory, add it to every relevant command before relying on this optimization.

Reference: [Netlify ignore builds](https://docs.netlify.com/build/configure-builds/ignore-builds/).
