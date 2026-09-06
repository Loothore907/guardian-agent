#!/bin/sh
set -eu
script="$(dirname "$0")/linux-credential-session.sh"
sh -n "$script"
for duration in 0 01 1801 invalid; do
  if sh "$script" --hold "$duration" >/dev/null 2>&1; then
    echo 'invalid duration was accepted' >&2; exit 1
  fi
done
if sh "$script" --unknown >/dev/null 2>&1; then
  echo 'unknown mode was accepted' >&2; exit 1
fi
if DISPLAY=remote.invalid:0 WAYLAND_DISPLAY=wayland-0 sh "$script" --check >/dev/null 2>&1; then
  echo 'nonlocal display was accepted' >&2; exit 1
fi
# Opt-in intended-host smoke; never reads a secret or opens an unlock prompt.
if [ "${GUARDIAN_TEST_WSL_SESSION:-}" = 1 ]; then
  sh "$script" --hold 2
fi
echo 'Credential-session argument/display checks passed.'
