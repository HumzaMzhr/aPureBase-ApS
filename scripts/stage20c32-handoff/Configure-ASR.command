#!/bin/bash
set -e
umask 077
PRIVATE_DIR="$HOME/Library/Application Support/aPureBase-C32-Retest"
mkdir -p "$PRIVATE_DIR"
printf 'Only supply a key you are authorized to use for paid OpenAI ASR.\nIt stays outside the ZIP and is never sent to the browser or review export.\n'
read -r -s -p 'Authorized OpenAI ASR key (hidden; Return cancels): ' asem_asr_key
printf '\n'
[ -n "$asem_asr_key" ] || exit 0
printf '%s' "$asem_asr_key" > "$PRIVATE_DIR/openai-asr-key.txt"
chmod 600 "$PRIVATE_DIR/openai-asr-key.txt"
unset asem_asr_key
printf 'Local key saved privately. Stop and restart the local retest app to load it.\n'
