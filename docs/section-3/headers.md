---
title: Linux Kernel, Linux Headers, and eBPF
authors: [cassamajor]
tags: [ebpf]
keywords: [eBPF, kernel, linux kernel, headers, linux headers]
description: A brief introduction to the eBPF components
---

From high-performance load balancers to real-time security auditing, eBPF empowers us to extend the kernel in production without having to recompile the kernel.
To understand how, we first need to look under the hood at the Linux kernel and its headers, then see how eBPF hooks into those internals.

<!-- truncate -->

## Linux Kernel

The Linux kernel handles communication between applications and hardware: it handles process scheduling and isolation, memory and filesystem management, and network routing and policy enforcement.
Every system call, interrupt, or packet transmission passes through the kernel, placing it in an essential position for being able to observe all aspects of a system.

## Linux Headers

Linux headers expose the kernel’s internal data structures, constants, and macros.
Think of headers as the kernel’s public type definitions: they ensure code can build correctly against a given version of the kernel.

:::info Did you know?
Starting in Linux 6.1, the Rust for Linux framework began introducing Rust-style module declarations alongside traditional C headers.
While most subsystems still rely on C headers, this marks the first step toward production-ready Rust kernel modules.

:::

## eBPF Mechanism

eBPF programs react to the events emitted by the kernel described above.
To compile an eBPF program, we must include the relevant Linux headers.

## How It Fits Together

```
┌───────────────┐       compile-time       ┌────────────────┐
│ eBPF User Code│ ────────────────────────▶│ Linux Headers  │
└───────────────┘                          └────────────────┘
         │                                            ▼
         │  load (bpftool/XDP loader)                 ╔═════════╗
         ▶──────────────────────────────────────────▶ ║ Kernel  ║
                                                      ╚╤═══════╤╝
                                                       ▼       ▲
                                                               │
                                       Runtime eBPF VM ◀───────┘
```

## What’s Next?

In the next post, we’ll walk through [setting up a lightweight Linux VM on macOS for eBPF development](/docs/section-3/developer-environment.md). Stay tuned!