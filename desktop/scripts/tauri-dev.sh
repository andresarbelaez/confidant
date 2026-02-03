#!/bin/bash
# Wrapper script to ensure Cargo is in PATH before running Tauri

# Source cargo environment if it exists
if [ -f "$HOME/.cargo/env" ]; then
    source "$HOME/.cargo/env"
fi

# Ensure cargo is in PATH
export PATH="$HOME/.cargo/bin:$PATH"

# Run tauri dev
exec npx tauri dev
