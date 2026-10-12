"""Run every security gate; missing tools and unavailable databases fail the gate."""

import json
import os
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPORTS = ROOT / ".local/checks"


def executable(name: str) -> str:
    paths = [
        ROOT / ".local/bin" / name,
        ROOT / ".local/scanners/bin" / name,
        ROOT / ".venv/bin" / name,
        Path("/Users/shivchoudhary21/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback") / name,
        Path("/Users/shivchoudhary21/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin") / name,
    ]
    for path in paths:
        if path.exists():
            return str(path)
    path = shutil.which(name)
    if not path:
        raise FileNotFoundError(f"{name} missing; run make tools")
    return path


def main() -> None:
    REPORTS.mkdir(parents=True, exist_ok=True)
    os.environ.setdefault("XDG_CACHE_HOME", str(ROOT / ".local/cache"))
    os.environ.setdefault(
        "SEMGREP_SETTINGS_FILE", str(ROOT / ".local/semgrep-settings.yml")
    )
    checks = [
        ("pnpm-audit", ["pnpm", "audit", "--json"]),
        (
            "pip-audit",
            [
                "pip-audit",
                "-r",
                "services/api/requirements.lock",
                "--progress-spinner",
                "off",
                "--format",
                "json",
            ],
        ),
        (
            "semgrep",
            [
                "semgrep",
                "scan",
                "--config",
                "p/owasp-top-ten",
                "--config",
                "p/python",
                "--config",
                "p/javascript",
                "--error",
                "--metrics",
                "off",
                "--exclude",
                ".local",
                "--exclude",
                ".venv",
                "--exclude",
                "node_modules",
                "--exclude",
                ".env",
                "--json",
            ],
        ),
        (
            "gitleaks",
            ["gitleaks", "dir", ".", "--redact", "--config", ".gitleaks.toml"],
        ),
    ]
    results = {}
    for name, command in checks:
        try:
            command[0] = executable(command[0])
            with (REPORTS / f"{name}.log").open("w") as output:
                run = subprocess.run(
                    command,
                    check=False,
                    cwd=ROOT,
                    stdout=output,
                    stderr=subprocess.STDOUT,
                )
            results[name] = {"exit_code": run.returncode, "passed": run.returncode == 0}
        except FileNotFoundError as error:
            results[name] = {"passed": False, "reason": str(error)}
        print(f"{name}: {'PASS' if results[name]['passed'] else 'FAIL / unavailable'}")
    try:
        docker = executable("docker")
        images = subprocess.check_output(
            [docker, "compose", "config", "--images"], cwd=ROOT, text=True
        ).splitlines()
        subprocess.run([docker, "compose", "build"], cwd=ROOT, check=False)
        for index, image in enumerate(sorted(set(images))):
            command = [
                executable("trivy"),
                "image",
                "--severity",
                "HIGH,CRITICAL",
                "--exit-code",
                "1",
                "--scanners",
                "vuln",
                "--format",
                "json",
                "--output",
                str(REPORTS / f"image-{index}.json"),
                image,
            ]
            run = subprocess.run(command, check=False, cwd=ROOT)
            results[f"trivy:{image}"] = {
                "passed": run.returncode == 0,
                "exit_code": run.returncode,
            }
    except (FileNotFoundError, subprocess.CalledProcessError) as error:
        results["trivy"] = {"passed": False, "reason": type(error).__name__}
    (REPORTS / "security-summary.json").write_text(json.dumps(results, indent=2) + "\n")
    if "trivy" in results and not results["trivy"]["passed"]:
        print("trivy: FAIL / unavailable (Docker and built images are required)")
    raise SystemExit(0 if all(result["passed"] for result in results.values()) else 1)


if __name__ == "__main__":
    main()
