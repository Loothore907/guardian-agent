#!/usr/bin/env python3
"""Credential-free probes for the supported Guardian reference executor."""

import json
import os
import pathlib
import subprocess
import sys
import tempfile
import urllib.request


def local_command_succeeded():
    target = pathlib.Path("/workspace/runtime-write-check.txt")
    target.write_text("guardian-local-ok\n", encoding="utf-8")
    return target.read_text(encoding="utf-8").strip() == "guardian-local-ok"


def direct_public_egress_blocked():
    try:
        urllib.request.urlopen("https://example.com", timeout=3)
    except Exception:
        return True
    return False


def direct_git_push_blocked():
    with tempfile.TemporaryDirectory(prefix="guardian-git-", dir="/tmp") as repo:
        commands = [
            ["git", "init", "--quiet", repo],
            ["git", "-C", repo, "config", "user.name", "Guardian Probe"],
            ["git", "-C", repo, "config", "user.email", "probe@invalid"],
        ]
        for command in commands:
            if subprocess.run(command, check=False, capture_output=True).returncode != 0:
                return False
        pathlib.Path(repo, "README.md").write_text("probe\n", encoding="utf-8")
        setup = [
            ["git", "-C", repo, "add", "README.md"],
            ["git", "-C", repo, "commit", "--quiet", "-m", "probe"],
            [
                "git", "-C", repo, "remote", "add", "origin",
                "https://github.com/Loothore907/guardian-agent.git",
            ],
        ]
        for command in setup:
            if subprocess.run(command, check=False, capture_output=True).returncode != 0:
                return False
        attempt = subprocess.run(
            [
                "git", "-c", "credential.helper=", "-C", repo, "push", "--dry-run",
                "origin", "HEAD:refs/heads/guardian-c4-probe",
            ],
            check=False,
            capture_output=True,
            env={
                "GIT_CONFIG_NOSYSTEM": "1",
                "GIT_TERMINAL_PROMPT": "0",
                "HOME": "/workspace",
                "PATH": os.environ["PATH"],
            },
            text=True,
            timeout=5,
        )
        return attempt.returncode != 0


def host_filesystem_hidden():
    return all(not pathlib.Path(path).exists() for path in ("/home", "/mnt", "/root"))


def provider_credentials_absent():
    sensitive = ("GITHUB_TOKEN", "GH_TOKEN", "NEBIUS_API_KEY", "TAVILY_API_KEY")
    return all(name not in os.environ for name in sensitive)


def runtime_identity_reduced():
    status = pathlib.Path("/proc/self/status").read_text(encoding="utf-8")
    fields = dict(
        line.split(":", 1) for line in status.splitlines() if ":" in line
    )
    return fields.get("CapEff", "").strip() == "0000000000000000" and fields.get(
        "NoNewPrivs", ""
    ).strip() == "1"


def main():
    result = {
        "runtimeProfile": "windows_wsl2_ubuntu_22_04_namespace_v1",
        "observedAt": sys.argv[1],
        "checks": {
            "localCommandSucceeded": local_command_succeeded(),
            "directPublicEgressBlocked": direct_public_egress_blocked(),
            "directGitPushBlocked": direct_git_push_blocked(),
            "hostFilesystemHidden": host_filesystem_hidden(),
            "providerCredentialsAbsent": provider_credentials_absent(),
            "runtimeIdentityReduced": runtime_identity_reduced(),
        },
    }
    print(json.dumps(result, sort_keys=True), flush=True)


if __name__ == "__main__":
    main()
