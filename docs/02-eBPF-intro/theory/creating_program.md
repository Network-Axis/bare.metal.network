---
title: Composition of an eBPF program
draft: true
---


Creating an eBPF program consists of:


1. Including header files: You need to include and header files, among others.
2. Defining a license: You need to define a license, typically using "Dual BSD/GPL".
3. Defining a BPF function: You need to define a BPF function, for example, named handle_tp, which takes void *ctx as a parameter and returns int. This is usually written in the C language.
4. Using BPF helper functions: In the BPF function, you can use BPF helper functions such as bpf_get_current_pid_tgid() and bpf_printk().
5. Return value


---

ctx parameter contains tracepoint-specific data and can be used to cast `ctx` to access the tracepoint's arguments.
When not in use, use `void *ctx`.