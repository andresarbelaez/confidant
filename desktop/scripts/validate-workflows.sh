#!/bin/bash
# Validate GitHub Actions workflow files locally before pushing
# Requires: actionlint (install with: brew install actionlint)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
WORKFLOWS_DIR="$REPO_ROOT/.github/workflows"

echo "Validating GitHub Actions workflows..."
echo ""

if ! command -v actionlint &> /dev/null; then
    echo "❌ actionlint not found. Install it with:"
    echo "   brew install actionlint"
    echo ""
    echo "Or download from: https://github.com/rhysd/actionlint/releases"
    exit 1
fi

cd "$REPO_ROOT"

# Validate all workflow files
if [ -d "$WORKFLOWS_DIR" ]; then
    actionlint "$WORKFLOWS_DIR"/*.yml "$WORKFLOWS_DIR"/*.yaml
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ All workflow files are valid!"
    else
        echo ""
        echo "❌ Workflow validation failed. Fix errors above before pushing."
        exit 1
    fi
else
    echo "⚠️  No .github/workflows directory found"
    exit 1
fi
