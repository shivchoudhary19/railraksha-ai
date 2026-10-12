"""Launch the web app using local environment and installed Node/pnpm."""

import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
env = os.environ.copy()
if (ROOT / ".env").exists():
    env.update(
        dict(
            line.split("=", 1)
            for line in (ROOT / ".env").read_text().splitlines()
            if line and not line.startswith("#")
        )
    )
env["API_INTERNAL_URL"] = "http://localhost:8000"
env["OIDC_INTERNAL_ISSUER"] = env.get(
    "OIDC_ISSUER", "http://localhost:8081/realms/railraksha"
)
env["REDIS_URL"] = env.get("REDIS_URL", "redis://localhost:6379").replace(
    "@redis:", "@localhost:"
)
node = shutil.which("node")
pnpm = shutil.which("pnpm")
bundle = Path.home() / ".cache/codex-runtimes/codex-primary-runtime/dependencies"
if not node and (bundle / "node/bin/node").exists():
    env["PATH"] = str(bundle / "node/bin") + os.pathsep + env["PATH"]
    node = str(bundle / "node/bin/node")
if not pnpm and (bundle / "bin/fallback/pnpm").exists():
    pnpm = str(bundle / "bin/fallback/pnpm")
if not node or not pnpm:
    raise SystemExit("Install Node.js 22+ and pnpm before running the web app.")
mode = sys.argv[1] if len(sys.argv) > 1 else "dev"
if mode not in {"dev", "start", "build"}:
    raise SystemExit("Choose dev, start, or build.")
os.chdir(ROOT)
command = [
    pnpm,
    "--config.verifyDepsBeforeRun=false",
    "--filter",
    "@railraksha/web",
    mode,
]
executable = pnpm
if mode == "start":
    standalone = ROOT / "apps/web/.next/standalone"
    server = standalone / "apps/web/server.js"
    if not server.exists():
        raise SystemExit("Build the web app before starting its production preview.")
    shutil.copytree(
        ROOT / "apps/web/.next/static",
        standalone / "apps/web/.next/static",
        dirs_exist_ok=True,
    )
    env["HOSTNAME"] = "127.0.0.1"
    executable = node
    command = [node, str(server)]
# The local CLI chooses only a fixed pnpm executable and one allow-listed subcommand; no shell.
# nosemgrep: python.lang.security.audit.dangerous-os-exec-tainted-env-args.dangerous-os-exec-tainted-env-args
os.execve(
    executable,
    command,
    env,
)
