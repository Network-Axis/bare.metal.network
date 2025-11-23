---
draft: true
---

# Building and Deploying eBPF CNFs (Performance & Observability)

Now that we know what eBPF can do, let's discuss how to build a Cloud-Native Network Function (CNF) using eBPF and ensure it performs at scale.

## Authoring eBPF Programs

eBPF programs are typically written in C (or Rust), then compiled to eBPF bytecode. We'll focus on C in this course:
- You write a C file with your eBPF program and map definitions.
- Use clang (with target `bpf`) to compile it, or rely on a tool like libbpf to generate a skeleton.
- The output is an ELF object containing eBPF bytecode and map definitions.

For example, a simple XDP drop program in C:
```c
#include <linux/bpf.h>
#include <bpf/bpf_helpers.h>

SEC("xdp")
int xdp_drop_all(struct xdp_md *ctx) {
    return XDP_DROP;
}

char _license[] SEC("license") = "GPL";
```

Compile with:

```
clang -O2 -target bpf -c xdp_drop.c -o xdp_drop.o
```

We can then load this program into the kernel (e.g., `sudo bpftool prog load xdp_drop.o "/sys/fs/bpf/xdp_drop" type xdp dev eth0` to attach it to eth0).

## Deploying as a CNF

To treat eBPF programs as CNFs, we package them into containers or operators:
- One approach: build a container that on startup loads the eBPF program into the kernel and attaches it. This container might also expose an API or metrics endpoint for control.
- For instance, a "Firewall CNF" container could load an XDP program to drop certain traffic, and use a map that can be updated via a REST API in the container.
- In Kubernetes, you’d deploy this container as a DaemonSet (to run on every node) or as a Pod on a specific node where needed.

Our toolkit netkit can help orchestrate these CNFs, but at its core, it often comes down to loading eBPF objects and managing their lifecycle.

## Performance Benchmarking

eBPF promises high performance, but it’s crucial to measure it:
- Throughput: We will use tools like iperf and packet generators to see how many Gbps an XDP program can handle. For example, how does xdp_drop_all perform on a 40 Gbps NIC versus a traditional iptables drop?
- Latency: We’ll measure round-trip latency through service chains, comparing baseline (no eBPF) vs. eBPF processing. eBPF adds only microseconds typically, but multiple programs or map lookups could add overhead.
- Use Linux’s perf events and bpftool prog profile to profile eBPF execution time if needed.

One common experiment: send a high-rate packet stream to a node and observe CPU usage. An XDP drop program might handle ~15 Mpps (million packets per second) on a single core before saturating, whereas iptables might only do a fraction of that on the same hardware.

:::tip
Use Hubble & Metrics: When Cilium or our CNFs are running, leverage Hubble to observe packet drops or forwards. Also, check /sys/kernel/debug/tracing/ and use bpftool map and bpftool prog for real-time metrics (like how many packets went through a specific program, via performance counters).
:::

Through careful benchmarking and iteration, you’ll gain intuition on writing efficient eBPF code. The labs will have you implement a simple XDP program and measure its impact on throughput and latency, solidifying these concepts with real data.