#!/usr/bin/env bash
set -euo pipefail

workspace_source="${1:?workspace source is required}"
working_directory="${2:?working directory is required}"
timeout_seconds="${3:?timeout is required}"
executable="${4:?executable is required}"
shift 4
sandbox_root="$(mktemp -d /tmp/guardian-command.XXXXXX)"

cleanup() {
  if ! umount -Rl "$sandbox_root" 2>/dev/null; then
    return
  fi
  rm -rf -- "$sandbox_root" 2>/dev/null || true
}
trap cleanup EXIT

case "$workspace_source" in
  /mnt/[a-z]/*) ;;
  *) exit 125 ;;
esac
[ -d "$workspace_source" ] || exit 125
[ ! -L "$workspace_source" ] || exit 125
workspace_real="$(readlink -f -- "$workspace_source")"
[ "$workspace_real" = "$workspace_source" ] || exit 125

case "$working_directory" in
  /workspace|/workspace/*) ;;
  *) exit 125 ;;
esac

mount --make-rprivate /
mount -t tmpfs -o mode=0755,nosuid,nodev tmpfs "$sandbox_root"
mkdir -p "$sandbox_root/dev" "$sandbox_root/etc" "$sandbox_root/proc" \
  "$sandbox_root/tmp" "$sandbox_root/usr" "$sandbox_root$working_directory"
mount --rbind /usr "$sandbox_root/usr"
mount -o remount,bind,ro "$sandbox_root/usr"
ln -s usr/bin "$sandbox_root/bin"
ln -s usr/lib "$sandbox_root/lib"
ln -s usr/lib64 "$sandbox_root/lib64"
ln -s usr/sbin "$sandbox_root/sbin"
touch "$sandbox_root/dev/null"
mount --bind /dev/null "$sandbox_root/dev/null"
mount -o remount,bind,ro "$sandbox_root/dev/null"
mount -t proc -o nosuid,nodev,noexec proc "$sandbox_root/proc"
printf 'nameserver 127.0.0.1\n' > "$sandbox_root/etc/resolv.conf"
printf 'guardian:x:0:0:Guardian Session:/workspace:/usr/bin/false\n' > "$sandbox_root/etc/passwd"
printf 'guardian:x:0:\n' > "$sandbox_root/etc/group"
chmod 1777 "$sandbox_root/tmp"
chmod 0755 "$sandbox_root/workspace"
mount --bind "$workspace_source" "$sandbox_root/workspace"
mount -o remount,bind,rw,nosuid,nodev,noexec "$sandbox_root/workspace"

working_directory_real="$(readlink -f -- "$sandbox_root$working_directory")"
case "$working_directory_real" in
  "$sandbox_root/workspace"|"$sandbox_root/workspace/"*) ;;
  *) exit 125 ;;
esac

chroot "$sandbox_root" /usr/bin/setpriv \
  --bounding-set=-all \
  --inh-caps=-all \
  --ambient-caps=-all \
  --no-new-privs \
  /usr/bin/env --chdir="$working_directory" -i \
  HOME=/workspace \
  LANG=C.UTF-8 \
  PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  USER=guardian \
  GIT_CONFIG_NOSYSTEM=1 \
  GIT_TERMINAL_PROMPT=0 \
  /usr/bin/timeout --signal=KILL "${timeout_seconds}s" \
  "$executable" "$@"
