---
title: ELF Sections (SEC Macro)
draft: true
---

The section is a contract/API which defines what the following function should accept as arguments.



https://docs.ebpf.io/ebpf-library/libbpf/ebpf/SEC/

https://docs.kernel.org/bpf/libbpf/program_types.html

---

Example

`tp/syscalls/sys_enter_write`
`tracepoint/<subsystem>/<eventName>` or `tracepoint/<category>/<name>`

View available tracepoints: `sudo ls /sys/kernel/debug/tracing/events/syscalls/`
