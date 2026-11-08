# Notes for AI assistants

- Releases (beta and stable): follow [RELEASING.md](RELEASING.md) step by step.
- Structure, build and tests: [CONTRIBUTING.md](CONTRIBUTING.md).
- Keep README.md (English) and README.ru.md (Russian) in sync: change both in the same PR.
- A change users notice adds a line to `## Unreleased` at the top of CHANGELOG.md in the same PR.
- Keep `version` in `manifest.json` and `package.json` at `0.0.0` until the first stable release: the `Release` workflow publishes whatever version lands on `main`.
