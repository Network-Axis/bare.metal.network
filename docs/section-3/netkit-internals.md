---
title: Netkit Internals
sidebar_position: 2
draft: true
tags: ["cilium 1.16"]
---

**Cilium**
- peer will default to `NETKIT_DROP`.
- programs attached to physical devices using `tcx`.
	- These use `bpf_redirect_peer()` for inbound traffic into the netkit device.
	- This supports the `ndo_get_peer_dev` callback
- `bpf_redirect_neigh()` can also be used for egress
	- push from `netkit` peer directly to the physical device, bypassing the Linux network stack on the host.


The primary device resides in the `hostns` network namespace.

`bpf_mprog` manages BPF programs to support multi-attach.

Supports BIG TCP


The `ndo_start_xmit` callback will pass the packet to each attached BPF program sequentially.

---
Sources:
- https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/commit/?id=35dfaad7188c
- https://elixir.bootlin.com/linux/v6.6/source/include/linux/netdevice.h#L1080-L1089
- [bpf_mprog](https://lore.kernel.org/all/20230719140858.13224-2-daniel@iogearbox.net/)
