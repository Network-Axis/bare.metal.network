---
title: eBPF Extended
draft: true
---

Direct Kernel Interaction: eBPF programs execute within the kernel, interacting with system-level events such as network packets, system calls, or tracepoints.

"eBPF programs can dynamically hook into kernel events, giving developers precise control over system behavior and performance optimization without requiring kernel modifications or reboots.
This makes eBPF an essential tool for system administrators and developers who aim to monitor, optimize, and secure their environments."
- https://eunomia.dev/tutorials/0-introduce/


 enables highly efficient network management in cloud and data center environments via high-speed packet filtering and processing within the kernel



- Tap into kernel tracepoints and function calls to gather detailed insights into system behavior.
- Collect custom metrics, perform in-kernel data aggregation, and identify performance issues.
- deep insights into system and application behavior by attaching to kernel functions, tracepoints, and even user-space probes
- deep inspection of system calls, network traffic, and other kernel activities
- enforce security policies and detect anomalous behavior
- allows custom scheduling policies to be implemented as BPF programs.
    - This enables runtime-customizable scheduling that can optimize for different workloads without kernel modifications.


eBPF enables developers to address real-time requirements like optimizing network traffic, improving security, and enhancing system performance.

eBPF programs can now even be offloaded to GPUs

eBPF can improve performance across CPU, user-space, and GPU workloads.

libbpf is used to help load eBPF bytecode into the kernel

---

- eBPF-powered CPU schedulers (`sched_ext`)

---

Best practice eBPF application development involves designing for cross-platform development, portability, and maintainability from the start.

This course details the combination of using RISC C for the kernel program, and Go for the user space application.

Rust development is currently in progress.

## DPDK vs eBPF

## DPDK

User space is where applications, libraries, and tools are ran. This layer produces overhead

### eBPF

eBPF program = "An eBPF program contains instructions that can be loaded and attached to one or more hooks in the Linux kernel." (direct quote from https://ebpf-go.dev)

Kernel space is resides in the operating system. It is responsible for managing system resources like memory, CPU, and input/output devices. The kernel has the ability to oversee and control the entire operating system. This makes it an ideal place to implement observability, security, and networking functionality.

The kernel requires stability and security, making it difficult (or an arduous/long process) to evolve. Innovation has been slow within the operating system for this reason.



---

CNF terminology:
- Cloud-native Network Function
- Container Network Functions
- Cloud Network Functions
- Software Defined Network Functions