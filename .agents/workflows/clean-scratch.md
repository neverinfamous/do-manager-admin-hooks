---
description: Identify, remove, and untrack agent scratch files from the project workspace and Git history.
---

# Clean Scratch Files Workflow

Agents are instructed by the global `AGENTS.md` rules to never leave scratch files (e.g., temporary scripts, data files, dummy JSONs) inside the project workspace, and instead write them to `<appDataDir>\brain\<conversation-id>\scratch\`. However, when this rule is accidentally violated, this workflow is used to thoroughly scrub these scratch files from the local filesystem and the repository's Git history.

Our repository's Git history is the single source of truth. Therefore, "cleaning up" means scrubbing the file completely out of history whenever possible, rather than just adding a deletion commit.

## 1. Identify Scratch Files

Search the repository for likely scratch files that shouldn't be tracked. Look for:
- Files named `scratch.*`, `tmp.*`, `temp.*`, `test-agent.*`
- Files located in the root directory that clearly contain temporary agent instructions or scratchpads.
- Look at untracked and modified files via `git status`.

## 2. Scrub from Git History (If Tracked)

If the file has already been committed to the repository, you must remove it from the Git history completely to keep the history pristine.

Check if the file is tracked:
```pwsh
git ls-files <file_path>
```

**Scenario A: File is only in the most recent commit (`HEAD`)**
If the file was added in the very last commit, the cleanest way to remove it is to amend the commit:
```pwsh
git rm --cached <file_path>
git commit --amend --no-edit
```

**Scenario B: File is buried deeper in the history**
If the file exists in older commits, use `git filter-branch` to scrub it entirely from all commits in the current branch. 
```pwsh
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch <file_path>" --prune-empty --tag-name-filter cat -- --all
```
*Warning: Only perform this if you are confident the file is a temporary scratch file and not a production asset.*

## 3. Remove from Local Filesystem

After ensuring the file is untracked, delete it forcefully from the local filesystem:
```pwsh
Remove-Item <file_path> -Force
```

## 4. Validation

Verify that the file is gone and no longer tracked:
1. `Test-Path <file_path>` should return `False`.
2. `git ls-files <file_path>` should return empty.
3. `git status` should not show the file as pending deletion (if amended or filter-branched correctly).
