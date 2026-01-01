---
title: eBPF Programs
draft: true
---

The eBPF Program Type sets the execution point, determines where the kernel can attach to the eBPF program, and defines what functions/features/capabilities are available to the eBPF program.

Program type can be considered an API, as it determines four things:
1. Where the program can be attached
2. Which in-kernel helper functions the verifier will allow to be called
3. Whether network packet data can be accessed directly
4. The type of object passed as the first argument to the program

The program type can be deduced by the name of the ELF section. Take for example the following SEC macro:

```c
SEC(“tracepoint/syscalls/sys_enter_kill”)
```

This SEC macro instructs the compiler to place the bytecode in the `tracepoint/syscalls/sys_enter_kill` ELF section.
In `libbpf`, the naming convention for sections names and probes specifies the program type first, and the hook second. In this case, `tracepoint` is the program type, while `syscalls/sys_enter_kill` is the hook.