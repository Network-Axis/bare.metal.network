---
title: eBPF Process
draft: true
---

At a high level, these are the steps when an eBPF program is executed:
1. Userspace sends [bytecode](./bytecode-compilation.md) to the kernel together with a [program type](./programs.md) which determines what kernel areas can be accessed.
2. The kernel runs a verifier on the bytecode to make sure the program is safe to run.
3. The kernel JiT-compiles the bytecode to native code and inserts it in (or attaches to) the specified code location (again, based on program type). --- the Just-In-Time (JIT) compiler translates [eBPF bytecode](./bytecode-compilation.md) into optimized machine code for the specific architecture.
4. The inserted code writes data to ringbuffers or generic key-value maps.
5. Userspace reads the result values from the shared maps or ringbuffers.


Since eBPF is event based, it is possible that multiple instances of the program will be executed.
This allows BPF maps to become shared memory.


---

When the eBPF program is loaded into the kernel, it first goes through the eBPF Verifier, then the Just-in-Time (JIT) compiler.
After going through the Verification and JIT Compilation steps, the eBPF program is loaded into the Linux kernel.

An eBPF program is compiled into eBPF bytecode, attached to a hook, then loaded into the kernel.
When the hook is triggered, the eBPF program is executed by the eBPF virtual machine.
This process allows custom code to run in the kernel space, which essentially “reprograms” the kernel.

If Symmetric multiprocessing (SMP) is enabled in the kernel, BPF programs can be executed concurrently.

Just-In-Time (JiT) compilation and verification engine guarantees safety and execution efficiency.

An eBPF program is attached to a hook, which are designated code paths in the kernel.

When the code path is traversed, any attached eBPF programs are executed.


---

A typical eBPF program involves two parts:
1. kernel space code (referred to as the eBPF program)
2. user space code (referred to as the eBPF application)



1. Install [bpf2go](https://github.com/cilium/ebpf/cmd/bpf2go)
1. Write an eBPF program in C which defines the logic to be performed
1. Write a eBPF application in Go which manages loading and interacting with the kernel space code
1. Use `bpf2go` to compile the eBPF program into bytecode to be executed by the kernel
1. Use the eBPF application to load the compiled eBPF program into kernel space and run it
1. Interact with the eBPF program to retrieve metadata from eBPF maps
1. Unload the eBPF program when no longer needed
1. Leverage tools like `bpftool` to optimize the performance of the eBPF program
