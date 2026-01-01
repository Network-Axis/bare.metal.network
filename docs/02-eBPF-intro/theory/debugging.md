---
title: Debugging eBPF
description: Tools, tips, and tricks for debugging eBPF programs and applications.
draft: true
---

For debugging, we will be using the `perf` command instead of `printk()`.

The `bpf_printk()` function outputs to `/sys/kernel/debug/tracing/trace_pipe`. Very helpful for debugging.
// `bpf_printk()` has limitations: it impacts performance, is limited to 3 parameters, and is the `trace_pipe` is shared globally across all eBPF programs.


// simple way to see what your eBPF program is doing
// For production use, use ring buffers or perf event arrays.
// `sudo cat /sys/kernel/debug/tracing/trace_pipe`


 For example, there are tracepoints at the start and end of system calls, scheduler events, file system operations, and disk I/O.

---

While pinging from inside the namespace, record this tracepoint and observe
these records. E.g with perf like this:

```sh
sudo perf record -a -e xdp:xdp_exception sleep 4
sudo perf script
```
