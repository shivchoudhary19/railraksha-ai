# 0005 — Dependency and quality gates

Accepted, 2026-10-12.

Application dependencies are recorded in the pnpm and Python lockfiles. pnpm rejects exotic transitive sources and provenance downgrades, and requires releases to be at least seven days old. Lifecycle scripts are allowed only for the declared native build packages. Frozen installs are used in Docker and CI.

The Next.js 15 ESLint preset brings a `fast-glob`/`braces` dependency with an unpatched advisory. Use flat ESLint with TypeScript, React Hooks and JSX accessibility rules instead. Next.js still performs its TypeScript build checks; it emits a notice that its optional ESLint plugin is absent. No audit finding is suppressed. Lighthouse runs directly rather than through the older Lighthouse CI CLI, whose archive dependencies had unpatched advisories. Vitest 4.1.11 fixes the test-mocker advisory; its tests run in Node, with no public development test server.

The pnpm audit fails at any severity. Python dependency auditing, Semgrep and Gitleaks must also pass. Trivy scans every Compose image for high/critical vulnerabilities, including the built API and web images. Missing tools or Docker cause the overall gate to fail. The GitHub workflow is included but has not been executed on GitHub in this local workspace.

Frontend coverage measures authentication, security and Redis logic, all web API routes and the security-header middleware; browser tests separately exercise pages and mutations. Production header configuration has unit checks; an actual HTTPS deployment still needs its own TLS/header assessment. Reports record these limits instead of presenting partial checks as a completed phase.

References: [Vitest advisory](https://github.com/advisories/GHSA-82fw-gwwq-j7x9), [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [pnpm supply-chain settings](https://pnpm.io/settings), [Lighthouse](https://github.com/GoogleChrome/lighthouse).
