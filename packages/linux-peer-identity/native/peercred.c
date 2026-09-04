#define _GNU_SOURCE

#include <errno.h>
#include <stdio.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>

#define PEER_SOCKET_FD 3

static int write_all(const char *buffer, size_t length) {
  size_t offset = 0;
  while (offset < length) {
    const ssize_t written = write(STDOUT_FILENO, buffer + offset, length - offset);
    if (written < 0) {
      if (errno == EINTR) continue;
      return 1;
    }
    offset += (size_t)written;
  }
  return 0;
}

int main(int argc, char **argv) {
  (void)argv;
  if (argc != 1) return 2;

  struct stat descriptor_stat;
  if (fstat(PEER_SOCKET_FD, &descriptor_stat) != 0 || !S_ISSOCK(descriptor_stat.st_mode)) {
    return 3;
  }

  struct sockaddr_storage address;
  socklen_t address_length = sizeof(address);
  if (getsockname(PEER_SOCKET_FD, (struct sockaddr *)&address, &address_length) != 0 ||
      address.ss_family != AF_UNIX) {
    return 4;
  }

  struct ucred credentials;
  socklen_t credentials_length = sizeof(credentials);
  if (getsockopt(PEER_SOCKET_FD, SOL_SOCKET, SO_PEERCRED, &credentials,
                 &credentials_length) != 0 ||
      credentials_length != sizeof(credentials) || credentials.pid <= 0) {
    return 5;
  }

  char output[128];
  const int output_length = snprintf(output, sizeof(output),
                                     "{\"pid\":%ld,\"uid\":%ld,\"gid\":%ld}\n",
                                     (long)credentials.pid, (long)credentials.uid,
                                     (long)credentials.gid);
  if (output_length <= 0 || (size_t)output_length >= sizeof(output)) return 6;
  return write_all(output, (size_t)output_length) == 0 ? 0 : 7;
}
