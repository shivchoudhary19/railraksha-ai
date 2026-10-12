"""Install project-local scanners; verify release checksums before extracting binaries."""

import hashlib
import io
import json
import platform
import subprocess
import sys
import tarfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOCAL = ROOT / ".local"


def download(url: str) -> bytes:
    request = urllib.request.Request(
        url, headers={"User-Agent": "RailRaksha-local-checks"}
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read()


def install_binary(repo: str, name: str, filename: str) -> None:
    release = json.loads(
        download(f"https://api.github.com/repos/{repo}/releases/latest")
    )
    version = release["tag_name"].removeprefix("v")
    archive_name = filename.format(version=version)
    assets = {
        asset["name"]: asset["browser_download_url"] for asset in release["assets"]
    }
    checksums_name = next(key for key in assets if key.endswith("checksums.txt"))
    checksums = download(assets[checksums_name]).decode()
    checksum = next(
        line.split()[0]
        for line in checksums.splitlines()
        if line.split()[-1].lstrip("*") == archive_name
    )
    payload = download(assets[archive_name])
    if hashlib.sha256(payload).hexdigest() != checksum:
        raise SystemExit(f"{name}: checksum verification failed")
    with tarfile.open(fileobj=io.BytesIO(payload), mode="r:gz") as archive:
        member = next(
            item
            for item in archive.getmembers()
            if item.isfile() and Path(item.name).name == name
        )
        source = archive.extractfile(member)
        if source is None:
            raise SystemExit("Missing executable")
        target = LOCAL / "bin" / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(source.read())
        target.chmod(0o755)
    (LOCAL / "bin" / f"{name}-receipt.json").write_text(
        json.dumps(
            {
                "repository": repo,
                "version": version,
                "archive": archive_name,
                "sha256": checksum,
            },
            indent=2,
        )
    )
    print(f"Installed {name} {version}; SHA-256 verified.")


def main() -> None:
    LOCAL.mkdir(exist_ok=True)
    arch = "arm64" if platform.machine() in {"arm64", "aarch64"} else "x64"
    operating_system = "darwin" if sys.platform == "darwin" else "linux"
    install_binary(
        "gitleaks/gitleaks",
        "gitleaks",
        f"gitleaks_{{version}}_{operating_system}_{arch}.tar.gz",
    )
    trivy_os = "macOS" if sys.platform == "darwin" else "Linux"
    trivy_arch = "ARM64" if arch == "arm64" else "64bit"
    install_binary(
        "aquasecurity/trivy",
        "trivy",
        f"trivy_{{version}}_{trivy_os}-{trivy_arch}.tar.gz",
    )
    environment = LOCAL / "scanners"
    subprocess.run([sys.executable, "-m", "venv", str(environment)], check=True)
    metadata = json.loads(download("https://pypi.org/pypi/semgrep/json"))
    version = metadata["info"]["version"]
    subprocess.run(
        [
            str(environment / "bin/python"),
            "-m",
            "pip",
            "install",
            f"semgrep=={version}",
        ],
        check=True,
    )
    print(f"Installed Semgrep {version} in a separate local environment.")


if __name__ == "__main__":
    main()
