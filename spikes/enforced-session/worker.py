#!/usr/bin/env python3
"""Deterministic stand-in for an interaction-model loop inside the sandbox."""

import json
import os
import pathlib
import subprocess
import tempfile
import urllib.request


def emit(message):
    print(json.dumps(message, sort_keys=True), flush=True)


def local_command_check():
    completed = subprocess.run(
        ["python3", "-c", "print('guardian-local-ok')"],
        check=False,
        capture_output=True,
        cwd="/workspace",
        env={"HOME": "/workspace", "PATH": os.environ["PATH"]},
        text=True,
        timeout=5,
    )
    return completed.returncode == 0 and completed.stdout.strip() == "guardian-local-ok"


def direct_egress_is_blocked():
    try:
        urllib.request.urlopen("https://example.com", timeout=3)
    except Exception:
        return True
    return False


def direct_git_push_is_blocked():
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
                "git",
                "-C",
                repo,
                "remote",
                "add",
                "origin",
                "https://github.com/Loothore907/guardian-agent.git",
            ],
        ]
        for command in setup:
            if subprocess.run(command, check=False, capture_output=True).returncode != 0:
                return False

        attempt = subprocess.run(
            [
                "git",
                "-c",
                "credential.helper=",
                "-C",
                repo,
                "push",
                "--dry-run",
                "origin",
                "HEAD:refs/heads/guardian-c1-probe",
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


def host_filesystem_is_hidden():
    forbidden_roots = ("/home", "/mnt", "/root")
    return all(not pathlib.Path(path).exists() for path in forbidden_roots)


def provider_credentials_are_absent():
    sensitive_names = (
        "GITHUB_TOKEN",
        "GH_TOKEN",
        "NEBIUS_API_KEY",
        "TAVILY_API_KEY",
    )
    return all(name not in os.environ for name in sensitive_names)


def request_model_proposal():
    request = {
        "type": "model_request",
        "id": "model-1",
        "mission": "Review a pull request safely and gather public review guidance.",
        "allowed_tools": ["guardian.research"],
    }
    emit(request)
    response = json.loads(input())
    proposal = response.get("proposal")
    if (
        response.get("type") != "model_result"
        or response.get("id") != request["id"]
        or response.get("ok") is not True
        or not isinstance(proposal, dict)
    ):
        return None
    return proposal


def request_guardian_research(proposal):
    if not isinstance(proposal, dict):
        return False
    request = {
        "type": "tool_request",
        "id": "research-1",
        "tool": proposal.get("tool"),
        "arguments": proposal.get("arguments"),
    }
    emit(request)
    response_line = input()
    response = json.loads(response_line)
    return (
        response.get("type") == "tool_result"
        and response.get("id") == request["id"]
        and response.get("provider") in ("fake", "tavily")
        and response.get("ok") is True
        and isinstance(response.get("results"), list)
    )


def main():
    emit(
        {
            "type": "session_started",
            "assurance_candidate": "enforced",
            "approved_tools": ["local.exec", "guardian.research"],
            "network_mode": "isolated",
        }
    )

    proposal = request_model_proposal()
    checks = {
        "local_command_succeeds": local_command_check(),
        "direct_public_egress_blocked": direct_egress_is_blocked(),
        "direct_git_push_blocked": direct_git_push_is_blocked(),
        "host_filesystem_hidden": host_filesystem_is_hidden(),
        "provider_credentials_absent": provider_credentials_are_absent(),
        "model_proposal_succeeds": proposal is not None,
        "guardian_research_succeeds": request_guardian_research(proposal),
    }
    emit({"type": "session_result", "ok": all(checks.values()), "checks": checks})


if __name__ == "__main__":
    main()
