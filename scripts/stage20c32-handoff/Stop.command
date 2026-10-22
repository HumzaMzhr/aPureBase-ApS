#!/bin/bash
set -e
PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
case "$(uname -m)" in arm64) runtime_arch=arm64;; x86_64) runtime_arch=x64;; *) exit 1;; esac
"$PACKAGE_DIR/runtime/$runtime_arch/node" "$PACKAGE_DIR/stop.mjs"
