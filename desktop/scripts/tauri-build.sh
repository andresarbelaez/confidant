#!/bin/bash
# Wrapper script to ensure Cargo is in PATH before running Tauri build

# Source cargo environment if it exists
if [ -f "$HOME/.cargo/env" ]; then
    source "$HOME/.cargo/env"
fi

# Ensure cargo is in PATH
export PATH="$HOME/.cargo/bin:$PATH"

# Run TypeScript compilation first
npx tsc

# Run tauri build
exec npx tauri build
