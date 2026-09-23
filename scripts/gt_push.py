#!/usr/bin/env python3
"""Push local GROUNDTRUTH commits to GitHub main via the Git Data API.

Replicates each local commit on top of origin/main as an API commit:
- blobs for added/modified files (mode preserved from git diff --raw)
- {"sha": None} entries for deleted files (unlike push_files.py, strips are real)
- tree on base_tree = remote head's tree, parent = remote head, ref updated

Usage: gt_push.py <sha1> [<sha2> ...]   (local commit SHAs, oldest first)
Auth: stored custom.github connector via authd surrogates (api.github.com only).
"""
from __future__ import annotations

import base64
import subprocess
import sys
import urllib.request

sys.path.insert(0, "/opt/hatch/skills/skill-creator/bin")
from dynamic_credentials import add_surrogate_to_request, read_json_response, DynamicCredentialError

CRED = "custom.github"
HOSTS = ["api.github.com"]
API = "https://api.github.com"
REPO_DIR = "/home/hatch/workspace/groundtruth"


def api(method: str, path: str, payload: dict | None = None):
    import json
    req = urllib.request.Request(API + path, method=method,
                                 data=(json.dumps(payload).encode() if payload is not None else None))
    if payload is not None:
        req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    req.add_header("User-Agent", "groundtruth-push/1.0")
    add_surrogate_to_request(req, CRED, allowed_hosts=HOSTS)
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            return {} if resp.status == 204 else read_json_response(resp)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")[:400]
        raise DynamicCredentialError(f"GitHub {method} {path} -> {e.code}: {body}")


def sh(*args: str) -> str:
    return subprocess.run(args, cwd=REPO_DIR, capture_output=True, text=True, check=True).stdout.strip()


def blob_content(sha: str, path: str) -> bytes:
    return subprocess.run(["git", "show", f"{sha}:{path}"], cwd=REPO_DIR,
                          capture_output=True, check=True).stdout


def main() -> None:
    shas = sys.argv[1:]
    if not shas:
        print("usage: gt_push.py <sha> [<sha> ...]", file=sys.stderr)
        sys.exit(1)

    owner = api("GET", "/user")["login"]
    repo = "groundtruth"

    for sha in shas:
        ref = api("GET", f"/repos/{owner}/{repo}/git/refs/heads/main")
        remote_head = ref["object"]["sha"]
        base_tree = api("GET", f"/repos/{owner}/{repo}/git/commits/{remote_head}")["tree"]["sha"]
        print(f"remote main = {remote_head[:8]}; pushing local {sha[:8]}")

        raw = sh("git", "diff", "--raw", "-z", remote_head, sha)
        parts = raw.split("\0")
        entries = []
        blobs = 0
        i = 0
        while i < len(parts) - 1:
            info, path = parts[i], parts[i + 1]
            i += 2
            fields = info.split()
            # fields: :oldmode newmode oldsha newsha STATUS
            status = fields[4]
            newmode = fields[1]
            if status.startswith("R") or status.startswith("C"):
                oldpath = path
                newpath = parts[i]
                i += 1
                entries.append({"path": oldpath, "mode": "100644", "type": "blob", "sha": None})
                content = blob_content(sha, newpath)
                blob = api("POST", f"/repos/{owner}/{repo}/git/blobs",
                           {"content": base64.b64encode(content).decode(), "encoding": "base64"})
                entries.append({"path": newpath, "mode": newmode, "type": "blob", "sha": blob["sha"]})
                blobs += 1
            elif status == "D":
                entries.append({"path": path, "mode": "100644", "type": "blob", "sha": None})
            else:  # A or M
                content = blob_content(sha, path)
                blob = api("POST", f"/repos/{owner}/{repo}/git/blobs",
                           {"content": base64.b64encode(content).decode(), "encoding": "base64"})
                entries.append({"path": path, "mode": newmode, "type": "blob", "sha": blob["sha"]})
                blobs += 1
        print(f"  {len(entries)} tree entries ({blobs} blobs)")

        tree = api("POST", f"/repos/{owner}/{repo}/git/trees",
                   {"base_tree": base_tree, "tree": entries})
        msg = sh("git", "log", "-1", "--format=%B", sha)
        commit = api("POST", f"/repos/{owner}/{repo}/git/commits",
                     {"message": msg, "tree": tree["sha"], "parents": [remote_head]})
        api("PATCH", f"/repos/{owner}/{repo}/git/refs/heads/main", {"sha": commit["sha"]})
        print(f"  pushed {commit['sha'][:8]} -> main")


main()
