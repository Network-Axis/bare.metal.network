---
title: An Introduction to Netkit
authors: [cassamajor]
tags: [netkit]
keywords: [netkit]
description: Understand the fundamentals of netkit, the BPF-programmable network device.
sidebar_position: 1
---

netkit is a virtual device that reduces the amount of times a packet traverses the Linux network stack.
Native NIC throughput is achieved by attaching BPF programs that can make `DROP` and `REDIRECT` decisions prior to traversing the network stack.

A netkit device has two interfaces: the `primary` interface host is associated with the host, and the `peer` interface is associated with the guest (container).

BPF programs attached to a `netkit` device are expected to return one of the following values:
- `NETKIT_NEXT`: send the packet to the next BPF program. Will return `NETKIT_PASS` if no additional programs are loaded.
- `NETKIT_PASS`: send the packet to the network stack of the receiver without invoking any additional BPF programs.
- `NETKIT_DROP`: drop the packet.
- `NETKIT_REDIRECT`: avoid the host's network stack. Instead, queue the packet for transmission by redirecting it to a new network device.

:::tip
`NETKIT_NEXT`, `NETKIT_DROP`, and `NETKIT_REDIRECT` all avoid the host's network stack.

:::

The host is able to load BPF programs onto both the `primary` and the `peer` interfaces, allowing each program to modify the packet that is received.
If no BPF program is loaded, each interface can configure either `NETKIT_PASS` or `NETKIT_DROP` as its default policy.