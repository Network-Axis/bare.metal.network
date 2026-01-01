---
draft: true
---

## What is eBPF?

Berkeley Packet Filter (BPF) was initially created in 1992, and was designed to capture, filter, and classify network traffic.

Alexei Starovoitov redesigned BPF in 2014, and it became known as eBPF (where "e" stands for "extended"), and the original BPF is commonly referred to as cBPF (where the "c" stands for "classic").

[Git Commit](https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/commit/?id=daedfb22451dd02b35c0549566cbb7cc06bdd53b)

As part of the redesign, user space programs (called "loader" applications) are allowed to interact with the eBPF virtual machine to run sandboxed programs in the kernel. This allows developers to add additional capabilities during system runtime, and removed networking as the sole use case of BPF.

What this means is developers are now able to extend capabilities of the kernel without modifying kernel source code or loading kernel modules. eBPF allows a program to perform custom tasks inside the Linux kernel. It is event-driven, and primarily used for tracing, networking, and security. An example of an event is when the kernel or an application passes a certain hook point.

By using kernel hooks, it is possible to attach eBPF programs to specific code paths. A kernel probe (`kprobe`) and user probe (`uprobe`) can be created and attached to an eBPF program if a pre-defined hook does not exist for a given use case.


## Why use eBPF?
It is easier to create an eBPF program (kernel space) than to program kernel modules.

Do to the eBPF Verifier, it is also safer as there are safeguards

What are the safeguards?
- 64 bit Reduced Instruction Set Computer (RISC)
- no unbounded loops
- no uninitialized registers
- There are size limitations (restrictions) on the number of instructions. This limit varies whether the eBPF program is privledged or unprivleged.

Security:
- eBPF programs run in the kernel and can be used to observe system calls, and notify ... when a program behaves in a malicious way.



---

eBPF allows developers to run small programs directly in kernel space without disrupting system operations.
overcome the limitations of traditional networking stacks without modifying kernel source code or loading new modules



---

- [bpf2go](https://github.com/cilium/ebpf/cmd/bpf2go): provides an API to load and manipulate the kernel space eBPF program. It decouples the process of obtaining eBPF bytecode from the loading and management of eBPF programs.
- [libbpf-bootstrap](https://github.com/libbpf/libbpf-bootstrap): A modern scaffold based on libbpf that provides an efficient workflow for writing eBPF programs, offering a simple one-time compilation process for reusable bytecode.


---

BPF programs run in a restricted environment and need special helpers to safely read kernel memory. Use `BPF_CORE_READ` to safely read the filename from kernel memory.


