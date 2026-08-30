#!/usr/bin/env bash
set -euo pipefail

working_directory="${1:?working directory is required}"
timeout_seconds="${2:?timeout is required}"
executable="${3:?executable is required}"
shift 3
sandbox_root="$(mktemp -d /tmp/guardian-command.XXXXXX)"

cleanup() {
  umount -Rl "$sandbox_root" 2>/dev/null || true
  rm -rf -- "$sandbox_root" 2>/dev/null || true
}
trap cleanup EXIT

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
chmod 1777 "$sandbox_root/tmp" "$sandbox_root/workspace"

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
