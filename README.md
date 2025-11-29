# Pureper (packaged)

This package provides the core foundation utilities extracted from the Pureper SPA project (component lifecycle base classes, Triplet helper, Router, ServiceWorker helper, Fetcher, Theme, and selected helpers).

How to use

1. Install from npm (when published):

   npm install pureper

2. Import what you need:

   import { Triplet, Fetcher, UniHtml } from 'pureper';

Build

The package is built using TypeScript and emits a compiled ES module and declaration files to the `out/` directory. The `prepare` script runs `npm run build` to ensure the package is built before publishing.

License

MIT

CI / Publishing

This repository contains a GitHub Actions workflow that can publish the package to npm:

- Trigger: pushing a version tag that follows vMAJOR.MINOR.PATCH (for example `v1.2.3`) will run the workflow and publish the package.
- Manual: the workflow can also be started manually via the GitHub Actions UI (workflow_dispatch).

Requirements for publishing

- A repository secret named `NPM_TOKEN` must be configured (Settings → Secrets → Actions). The token should be an npm automation token created for your npm account.
- The workflow will run `npm ci` and `npm run build`, and then call `npm publish --access public`.

Notes

- The package `files` list and `.npmignore` have been configured to avoid publishing the `test` folder.
- If you changed the project's `LICENSE` file recently (for example, replaced MIT with an "All rights reserved" text) you may also want to update the `license` field in `package.json` or clarify license instructions in this README to avoid confusion.
