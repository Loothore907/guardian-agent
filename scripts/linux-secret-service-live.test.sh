#!/bin/sh

set -eu

if [ "$(uname -s)" != "Linux" ]; then
  echo "Linux Secret Service integration requires Linux" >&2
  exit 1
fi

for helper in /usr/bin/dbus-run-session /usr/bin/gnome-keyring-daemon /usr/bin/secret-tool; do
  if [ ! -x "$helper" ]; then
    echo "Linux Secret Service integration tooling is unavailable" >&2
    exit 1
  fi
done

if [ "${GUARDIAN_LINUX_SECRET_SERVICE_SESSION:-}" != "1" ]; then
  test_home=$(mktemp -d /tmp/guardian-secret-service.XXXXXX)
  cleanup() {
    case "$test_home" in
      /tmp/guardian-secret-service.*) rm -rf -- "$test_home" ;;
      *) echo "Linux Secret Service test cleanup path is invalid" >&2 ;;
    esac
  }
  trap cleanup EXIT HUP INT TERM
  chmod 700 "$test_home"
  mkdir -p "$test_home/.local/share"
  /usr/bin/dbus-run-session -- env \
    GUARDIAN_LINUX_SECRET_SERVICE_SESSION=1 \
    GUARDIAN_LINUX_SECRET_SERVICE_HOME="$test_home" \
    HOME="$test_home" \
    XDG_DATA_HOME="$test_home/.local/share" \
    sh "$0"
  exit $?
fi

printf %s "guardian-integration-keyring" | \
  HOME="$GUARDIAN_LINUX_SECRET_SERVICE_HOME" \
  XDG_DATA_HOME="$GUARDIAN_LINUX_SECRET_SERVICE_HOME/.local/share" \
  /usr/bin/gnome-keyring-daemon --unlock --components=secrets >/dev/null

GUARDIAN_TEST_LINUX_SECRET_SERVICE=1 \
  node node_modules/vitest/vitest.mjs run \
  packages/credential-store/src/index.test.ts \
  packages/credential-store/src/linux.integration.test.ts
