# Main Branch Protection

Apply these settings after P0.4 creates the named GitHub Actions checks. The repository administrator must be authenticated with a token that can administer repository settings.

## GitHub CLI Setup

```bash
OWNER=Sa-Te
REPO=spatial-classroom-engine

gh api --method PUT "repos/$OWNER/$REPO/branches/main/protection" --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["check", "test", "test-integration", "build"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismissal_restrictions": {},
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1,
    "require_last_push_approval": false,
    "bypass_pull_request_allowances": {}
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": false
}
JSON
```

Verify the result:

```bash
gh api "repos/$OWNER/$REPO/branches/main/protection"
```

For an initial solo-maintainer phase, set `required_approving_review_count` to `0` if GitHub blocks necessary maintenance. Restore `1` when a second maintainer is available. Do not allow force pushes, branch deletion, or bypassing required checks.

Enable GitHub secret scanning, push protection, Dependabot alerts, and private vulnerability reporting in the repository Security settings where the repository plan permits them.
