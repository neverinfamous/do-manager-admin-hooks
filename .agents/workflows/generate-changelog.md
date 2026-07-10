---
description: Generate CHANGELOG.md and release notes from Git history prior to a version release.
---

# Generate Release Docs

> **Prerequisite**: The target version should typically be bumped (e.g. in `package.json`) before running this workflow, or specified manually. This workflow relies on `lib-git-history` as the single source of truth for both `CHANGELOG.md` and versioned release notes.

## Phase 1: Context Discovery & Version Determination

1. Get the repository remote URL (`git config --get remote.origin.url`) to extract `github_repo` (e.g., `neverinfamous/mysql-mcp`).
2. Get the package name from `package.json` (`npm_package`).
3. Check if a `Dockerfile` exists to infer `docker_image` (`writenotenow/<repo-name>`).
4. Run `git tag -l 'v*' --sort=-v:refname` to determine the previous tagged version. Let this be `vPREV`.
5. **Determine Target Version**: Extract the unreleased commits using `lib-git-history` (`vPREV..HEAD`). Analyze the commit types and metadata:
   - If any commit has `isBreaking: true`, bump the **MAJOR** version (e.g. 3.x.x -> 4.0.0).
   - Else if there are any `feat` commits, bump the **MINOR** version (e.g. 3.2.x -> 3.3.0).
   - Else bump the **PATCH** version (e.g. 3.2.2 -> 3.2.3).

---

## Phase 2: Generate CHANGELOG.md

We use a custom TypeScript formatter (`changelog.ts`) alongside `lib-git-history` to generate a Keep-a-Changelog style markdown file. The file covers *all* tagged releases plus any unreleased changes.

1. **Generate the File**: Run the following command from the project root. This command streams the output directly to disk to prevent context limit issues for repositories with hundreds of commits.
   ```pwsh
   bun C:\Users\chris\Desktop\adamic\.agents\scripts\get-git-history-json.ts --all --changelog-only --format C:\Users\chris\Desktop\adamic\.agents\templates\changelog.ts --stream-to-file CHANGELOG.md
   ```
2. **Review the File**: Do a quick read of the top of `CHANGELOG.md` to ensure it looks correct. Do NOT read the entire file if it's massive.
3. **SSoT Header**: The `changelog.ts` template automatically includes a header explaining that the file is auto-generated from git history. Ensure it is preserved. If the project's `CHANGELOG.md` previously contained any crucial marketing or architecture blurb at the top, verify if it needs to be moved to `README.md`.

---

## Phase 3: Generate Release Notes

Release notes are meant for humans. While `CHANGELOG.md` is exhaustive, release notes highlight the value of the most important changes.

1. **Extract Version JSON**: Extract the changelog-worthy commits for the current release only.
   ```pwsh
   bun C:\Users\chris\Desktop\adamic\.agents\scripts\get-git-history-json.ts -r "vPREV..HEAD" --changelog-only --summary --stream-to-file C:\Users\chris\.gemini\antigravity\brain\<conversation-id>\scratch\release-commits.json
   ```
2. **Review Commits by Impact**: Read the generated `release-commits.json` file. To ensure the release notes highlight the most significant changes, sort the commits by their `metadata.impact` score (e.g., using PowerShell or `jq`). Focus heavily on commits with an impact `>= 0.5`.
3. **Draft Release Notes**: Create `releases/vX.Y.Z-release-notes.md` using the template at `C:\Users\chris\Desktop\adamic\.agents\templates\release-notes-template.md`. 
   - Fill the YAML frontmatter: `product`, `version`, `date`, `slug`, `npm_package`, `github_repo`, `description`. Add `docker_image` if applicable.
   - **Highlights**: Add 3-5 punchy, benefit-driven bullets summarizing the release's highest-impact changes (prioritize by `metadata.impact` score). Be sure to explicitly mention any brand new tools, architectures, or tool groups added in `feat` commits.
   - **Categorized Sections**: Group the most significant JSON entries into `Added`, `Changed`, `Fixed`, `Security`, and `Removed`.
   - **Professional Tone**: Translate technical commit subjects into active voice, scannable, benefit-driven copy. Enhance the tone to emphasize core value, but keep it tasteful, professional, and avoid hyperbolic or grandiose rhetoric. For categories with many entries, group related changes into consolidated bullets rather than listing every single minor fix.
   - Remove empty sections.
   - Add the `## Install` block and `[Full Changelog]` link pointing to the Github diff.

---

## Phase 4: Validation & Review

1. Validate that `CHANGELOG.md` was successfully written and begins with `# Changelog`.
2. Validate that `releases/vX.Y.Z-release-notes.md` has fully compliant YAML frontmatter.
3. **HITL Checkpoint**: Present both generated files to the user for final review and approval. Do NOT commit them until the user confirms.
