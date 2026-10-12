# 0003 — Maintained local storage and email alternatives

Accepted with user approval, 2026-10-12: “Use maintained alternatives.”

Replace the supplied MinIO service with Garage 2.4.1 and MailHog with Mailpit 1.31.5. MinIO's community repository is archived and its final release is affected by an unpatched advisory. MailHog's official image lacks native support for this ARM Mac. Garage provides S3-compatible local storage; Mailpit provides the local SMTP inbox needed to exercise verification and password-reset emails.

Garage has its own Compose network, random credentials and persistent volume. Its development single-node bucket contains no user uploads in Phase 1. Mailpit and every published service bind to loopback. No messages are sent to external email providers.

References: [MinIO repository/archive status](https://github.com/minio/minio), [MinIO advisory](https://github.com/minio/minio/security/advisories/GHSA-xh8f-g2qw-gcm7), [Garage quick start](https://garagehq.deuxfleurs.fr/documentation/quick-start/), [Mailpit Docker installation](https://mailpit.axllent.org/docs/install/docker/).
