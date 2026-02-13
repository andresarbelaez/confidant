# Validating GitHub Actions Workflows Locally

You can validate workflow files **before pushing** to catch syntax errors early.

## Option 1: actionlint (Recommended)

**Install:**
```bash
brew install actionlint
```

**Validate all workflows:**
```bash
cd /Users/dres/Documents/2026/dant
actionlint .github/workflows/*.yml
```

**Or use the helper script:**
```bash
cd /Users/dres/Documents/2026/dant/desktop
bash scripts/validate-workflows.sh
```

**What it checks:**
- ✅ YAML syntax
- ✅ GitHub Actions workflow syntax
- ✅ Expression syntax (`${{ }}`)
- ✅ Action references
- ✅ Job dependencies
- ✅ Security issues

## Option 2: Manual YAML Check

**Basic YAML syntax:**
```bash
cd /Users/dres/Documents/2026/dant
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/build-test.yml'))" && echo "✅ YAML valid"
```

(Requires `pyyaml`: `pip install pyyaml`)

## Option 3: GitHub CLI (gh)

**Validate with GitHub's API:**
```bash
gh workflow list  # Lists workflows (validates they exist)
```

**Note:** This requires the workflows to already be pushed, so it's less useful for pre-push validation.

## Quick Pre-Push Checklist

Before pushing workflow changes:

1. ✅ **Install actionlint**: `brew install actionlint`
2. ✅ **Run validation**: `actionlint .github/workflows/*.yml`
3. ✅ **Fix any errors** shown
4. ✅ **Commit and push**

## Common Errors actionlint Catches

- Invalid `matrix` usage in `if` conditions
- Missing required workflow fields
- Invalid action references
- Type errors in expressions
- Security issues (hardcoded secrets, etc.)

## Example Output

**Success:**
```
✅ All workflow files are valid!
```

**Failure:**
```
.github/workflows/build-test.yml:35:9: Unrecognized named-value: 'matrix'
```

---

**Tip:** Add this to your pre-commit hook or run it manually before pushing workflow changes.
