#!/bin/sh
# Foreground lifetime belongs to the operator. No secret lookup or unlock occurs.
set -eu
mode=${1:---check}
duration=${2:-1800}
case "$mode" in --check|--hold) ;; *) echo 'usage: linux-credential-session.sh --check | --hold [1..1800 seconds]' >&2; exit 2;; esac
case "$duration" in ''|*[!0-9]*|0|0*) echo 'invalid session duration' >&2; exit 2;; esac
if [ "$duration" -gt 1800 ] || [ "$#" -gt 2 ]; then echo 'invalid session duration' >&2; exit 2; fi
uid=$(id -u)
if [ "$uid" = 0 ]; then echo 'Use the normal Linux user session, not root.' >&2; exit 1; fi
export XDG_RUNTIME_DIR="/run/user/$uid"
export DBUS_SESSION_BUS_ADDRESS="unix:path=$XDG_RUNTIME_DIR/bus"
if ! systemctl is-active --quiet "user@$uid.service" || [ ! -S "$XDG_RUNTIME_DIR/bus" ]; then
  echo 'User manager/bus unavailable. Restore the user session; no credential operation was attempted.' >&2
  exit 1
fi
# Only the documented local WSLg display is admitted. Never import the whole environment.
if [ "${DISPLAY:-}" != ':0' ] || [ "${WAYLAND_DISPLAY:-}" != 'wayland-0' ] || [ ! -S /mnt/wslg/.X11-unix/X0 ]; then
  echo 'Local WSLg display unavailable; no unlock prompt was requested.' >&2
  exit 1
fi
dbus-update-activation-environment --systemd DISPLAY WAYLAND_DISPLAY
manager=$(systemctl show "user@$uid.service" --property=MainPID --value)
echo 'WSL user bus and local display routing ready. This does not mean the keyring is unlocked or GitHub is enrolled.'
if [ "$mode" = '--check' ]; then exit 0; fi
echo "Holding this foreground WSL session for at most $duration seconds. Ctrl+C ends the hold."
remaining=$duration
while [ "$remaining" -gt 0 ]; do
  interval=5
  if [ "$remaining" -lt 5 ]; then interval=$remaining; fi
  sleep "$interval"
  remaining=$((remaining - interval))
  if ! systemctl is-active --quiet "user@$uid.service" || [ ! -S "$XDG_RUNTIME_DIR/bus" ] || [ "$manager" != "$(systemctl show "user@$uid.service" --property=MainPID --value)" ]; then
    echo 'User session changed; stop protected work and re-establish readiness.' >&2
    exit 1
  fi
done
echo 'Foreground session hold ended. Later WSL startup may require a fresh native keyring unlock.'
