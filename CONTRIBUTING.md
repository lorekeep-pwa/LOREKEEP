# Contributing to LOREKEEP

Thanks for taking the time to help improve LOREKEEP. The most useful contributions usually start with a concrete problem: a confusing interaction, a broken workflow, an accessibility issue, or a clear way to make the archive safer and more dependable.

## Before you start

- Search existing issues and pull requests so related work can be discussed together.
- For a substantial feature or a change to stored data, open an issue first. That gives us a chance to agree on the behavior before implementation begins.
- For security vulnerabilities, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
- Keep discussion respectful and follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Development setup

Use a recent Node.js LTS release and npm. From the repository root:

```sh
npm ci
npm run dev
```

Vite prints the local address to open in a browser. The application can run without provider credentials; online cover lookup requires its configured proxy and provider settings.

Useful checks before submitting a change:

```sh
npm run build
npm run typecheck:worker
```

The build script runs the application TypeScript project build and creates the production bundle. The Worker check type-checks `worker/` without emitting files. If a check is not relevant or cannot be run, say so and give the reason. There is currently no dedicated automated test suite.

## Project principles

LOREKEEP is a local-first writing archive. Contributions should preserve these properties:

1. **User data stays under user control.** Story content and archive metadata belong in the browser unless a clearly documented, user-controlled export or integration says otherwise. Avoid introducing a server dependency for core reading or writing.
2. **Offline writing remains useful.** The editor and locally saved documents should not depend on the cover lookup service being available.
3. **Credentials stay on the server.** Never put provider secrets in React code, `VITE_*` variables, static files, commits, issue attachments, or logs. Keep local development values in ignored files and production values in the hosting provider's secret store.
4. **Storage formats are compatibility surfaces.** IndexedDB schemas and exported JSON backups may contain years of user work. When changing them, provide a safe migration path and keep older backups importable where practical.
5. **Metadata should be reviewable.** Provider matching can be ambiguous. Do not silently replace a user's selected game, cover, platform, or other metadata based only on a fuzzy title match.
6. **Keep changes focused.** Prefer a small, understandable patch over broad cleanup mixed into a feature or bug fix.
7. **Treat accessibility as product behavior.** Preserve keyboard operation, visible focus, readable contrast, and meaningful labels for icon-only controls.

## Pull requests

Please include:

- A concise description of the user-visible problem and the approach taken.
- Screenshots or a short recording for visual changes, when useful.
- The commands you ran and their results, plus any manual checks that remain.
- Notes about data migrations, backup compatibility, environment variables, or deployment changes.
- Documentation updates when behavior, setup, security, or operations change.

Keep pull requests focused, use a descriptive title, and avoid committing generated output, local databases, credentials, or personal story data. Do not add dependencies without explaining why the project needs them and what maintenance or bundle cost they introduce.

## Deployment notes

The `main` branch is connected to Cloudflare Pages and publishes the production site after a push. Pull request previews and status comments are currently disabled. Worker changes may require a separate deployment; see [DEPLOY.md](DEPLOY.md) and never include live secrets in a pull request.
