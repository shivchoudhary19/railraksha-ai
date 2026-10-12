# ADR 0006: Repair the container security gate

Status: accepted; container health, identity journeys and all image scans verified locally.

The first real image scan found High/Critical findings in OS packages and bundled build tools despite clean application dependency audits. Vulnerability exceptions would leave the requested phase gate failing.

Use the current PostgreSQL 16.15 and Redis 7.4.11 patch releases from the official image manifests. Recompile PostgreSQL's same gosu 1.19 privilege helper with Go 1.27.2, which includes the reported standard-library fixes. Copy the initializer into the image with explicit non-executable permissions so PostgreSQL sources it consistently; a host bind mount failed during this Mac's first initialization. Update Redis's Alpine packages.

Run Python 3.12 on Alpine 3.24 to avoid the affected Debian runtime packages. Remove npm and Yarn from the standalone web runtime: production runs Node directly and needs neither package manager.

Keep the official Keycloak 26.8.0 distribution on Eclipse Temurin Java 21/Alpine 3.24. The official UBI image currently includes unfixed PCRE2 packages. This custom runtime requires full identity, email, TOTP, passkey, health and image-scan verification. It is a local development image, not a claim of vendor support for a custom Alpine container.

An unrelated Python server already serves IPv6 localhost port 8080 on this Mac. Expose Keycloak at localhost:8081, retain port 8080 inside the container and update the configured issuer, tests and documentation. Preserve the unrelated process and existing database volumes.

Sources: [PostgreSQL image manifest](https://github.com/docker-library/official-images/blob/master/library/postgres), [Redis image manifest](https://github.com/docker-library/official-images/blob/master/library/redis), [Go release history](https://go.dev/doc/devel/release), [Keycloak supported configurations](https://www.keycloak.org/server/supported-configurations), [Eclipse Temurin image manifest](https://github.com/docker-library/official-images/blob/master/library/eclipse-temurin). Findings and rebuilt-image scans are saved under `.local/checks/`.
