---
title: Different ways to load programs
draft: true
---

Iproute2 provides libbpf based BPF loading capability that can be used with
the standard `ip` tool; so in this case you can actually load our ELF-file
`xdp_pass_kern.o` (where we named our ELF section "xdp") like this:

```shell
$ sudo ip link set dev lo xdpgeneric obj xdp_pass_kern.o sec xdp
```

Listing the device via `ip link show` also shows the XDP info:

```shell
$ sudo ip link show dev lo
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 xdpgeneric qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    prog/xdp id 408 name xdp_prog_simple tag 3b185187f1855c4c jited
```

Should you run it without `sudo`, you would have less information:

```shell
$ ip link show dev lo
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 xdpgeneric qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    prog/xdp id 408
```

Removing the XDP program again from the device:

```shell
$ sudo ip link set dev lo xdpgeneric off
```

It is important to note that the `ip` tool from iproute2 does not implement
the XDP multi-dispatch protocol. When we use this tool, our program gets
attached directly to the `lo` interface.

iproute2 'ip' command automatically mounts `/sys/fs/bpf/`.