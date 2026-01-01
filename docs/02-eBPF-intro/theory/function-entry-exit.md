---
title: Function Entry and Exit
tags: [linux 5.5, linux 6.0]
description: Faster, more efficient successors to kprobes.
draft: true
---

:::note

Tracing programs (Program type `BPF_PROG_TYPE_TRACING`) are a newer alternative to `kprobes` and `tracepoints`.
Tracing programs utilize BPF trampolines, a new mechanism which provides practically zero overhead.
In addition, tracing programs can be attached to BPF programs to provide troubleshooting and debugging capabilities, something that is not possible with `kprobes`.

`fentry`/`fexit` programs run about 10x faster than `kprobes`

:::

`fentry` (function entry) and `fexit` (function exit) are the modern way to trace kernel functions in eBPF.

They were introduced in kernel 5.5 for x86 processors and 6.0 for ARM processors.

In comparison to `kprobes`: performance and convenience.
they use a BPF trampoline mechanism instead of the older breakpoint-based approach.

Directly access function parameters just like in regular C code - no need for special helpers like `BPF_CORE_READ`.

- `fexit` allows you to access both the input parameters and the return value at the same time
- `kretprobe` only gives you the return value

access `name->name` without any special helpers

The `BPF_PROG` macro is designed for `fentry`/`fexit`.
It handles the parameter unwrapping automatically so you can focus on your logic.