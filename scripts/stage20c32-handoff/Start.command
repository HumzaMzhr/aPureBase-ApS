#!/bin/bash
set -e
PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
case "$(uname -m)" in arm64) runtime_arch=arm64;; x86_64) runtime_arch=x64;; *) printf 'Unsupported Mac architecture.\n'; exit 1;; esac
NODE="$PACKAGE_DIR/runtime/$runtime_arch/node"
"$NODE" "$PACKAGE_DIR/verify.mjs" || { printf 'Package verification failed. Do not test this copy.\n'; exit 1; }
"$NODE" --input-type=module -e 'import net from "node:net";const s=net.createServer();s.once("error",()=>{console.error("Port 5173 is occupied. Stop the older aPureBase build first; this launcher never replaces it.");process.exitCode=1;});s.listen(5173,"127.0.0.1",()=>s.close());'
printf '\nFinal consolidated C32 HUMAN RETEST — NOT ACCEPTED / NOT PRODUCTION READY\nListening uses cached audio only. Live ASR starts only after your explicit Start action.\n'
"$NODE" "$PACKAGE_DIR/server.mjs" &
asem_server_pid=$!
cleanup(){ kill "$asem_server_pid" 2>/dev/null || true; }
trap cleanup EXIT
trap 'exit 0' INT TERM
ready=0
for attempt in {1..50}; do
 kill -0 "$asem_server_pid" 2>/dev/null || { printf 'Server exited.\n'; exit 1; }
 if /usr/bin/curl --silent --fail --max-time 1 http://127.0.0.1:5173/api/c31/health >/dev/null; then ready=1; break; fi
 sleep .2
done
[ "$ready" = 1 ] || { printf 'Startup health failed.\n'; exit 1; }
if [ "${APUREBASE_NO_BROWSER:-0}" != 1 ]; then /usr/bin/open 'http://127.0.0.1:5173/'; fi
wait "$asem_server_pid"
