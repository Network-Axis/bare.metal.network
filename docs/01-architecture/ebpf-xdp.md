---
sidebar_position: 9
---

# eBPF-XDP: Programmable Data Plane for High-Performance Networking

eBPF (extended Berkeley Packet Filter) with XDP (eXpress Data Path) enables custom packet processing logic at the earliest point in the Linux networking stack—the NIC driver level—providing line-rate performance without kernel modules or hardware changes.

## Problem Statement

Traditional approaches to custom packet processing in the Linux kernel face a performance vs safety tradeoff:

**Kernel modules**: Provide full access to kernel internals and can achieve line-rate performance, but:
- Bugs crash the entire system (kernel panic)
- Loading modules requires root, complicates security audits
- Module incompatibilities across kernel versions require recompilation
- Production deployment risk is high

**Userspace processing** (DPDK, netmap): Bypass the kernel entirely, achieving maximum performance, but:
- Applications lose access to kernel TCP/IP stack
- Requires dedicated CPU cores
- Incompatible with standard Linux networking (routing tables, iptables, etc.)
- Complex integration with Kubernetes CNI and existing infrastructure

**Kernel hooks** (Netfilter/iptables, tc): Safe and kernel-version stable, but:
- Limited programmability (rule-based, not arbitrary code)
- Performance overhead increases linearly with rule count
- Cannot implement complex packet manipulations efficiently

Consider a bare metal Kubernetes cluster needing custom packet handling:
- **DDoS mitigation**: Drop malicious traffic at line rate before it consumes resources
- **Load balancing**: Custom hashing or packet steering logic beyond standard ECMP
- **Monitoring**: Per-packet telemetry without performance penalty
- **Protocol fixes**: Workarounds for vendor bugs (like the IPv4-over-IPv6 corruption mentioned in webinars, fixed with 40 lines of eBPF)

The fundamental problem: how do you run custom packet processing logic safely, at line rate, without bypassing the kernel or risking system stability?

## Why This Protocol

eBPF solves this by providing a safe virtual machine inside the Linux kernel. You write packet processing programs in restricted C, compile them to eBPF bytecode, and the kernel loads them after verification.

**Safety through verification**: Before loading, the eBPF verifier statically analyzes your program:
- Ensures no unbounded loops (prevents infinite loops)
- Checks all memory accesses are within bounds (prevents crashes)
- Validates program terminates in finite steps
- Confirms no unsafe kernel function calls

If verification passes, the program is guaranteed safe to run. Unlike kernel modules, eBPF programs cannot crash the kernel.

**XDP (eXpress Data Path)** is an eBPF hook point at the NIC driver level. When a packet arrives:

1. **NIC hardware** receives packet, DMAs it to memory
2. **NIC driver** invokes XDP program (if attached) BEFORE allocating sk_buff (kernel packet structure)
3. **eBPF program** examines packet, returns verdict: XDP_PASS, XDP_DROP, XDP_TX, XDP_REDIRECT
4. **Kernel** processes based on verdict (pass to network stack, drop, retransmit, redirect to another interface)

Running at driver level means XDP processes packets before expensive sk_buff allocation, before netfilter hooks, before routing lookups. This achieves near-hardware performance: modern NICs with XDP support can drop malicious packets at 10+ million packets per second (line rate for smallest 64-byte packets at 100 Gbps).

**JIT compilation**: eBPF bytecode is just-in-time compiled to native machine code (x86, ARM), eliminating interpretation overhead. Your 40-line eBPF program becomes native assembly executing at CPU speed.

**Programmability**: Unlike iptables rules or tc classifiers, eBPF is Turing-complete (within verification constraints). Implement:
- Custom hash functions for load balancing
- Stateful connection tracking
- GeoIP lookups for access control
- Per-packet latency measurements
- Protocol translation (IPv4/IPv6 interworking)
- Arbitrary packet header modifications

The key enabler for bare metal Kubernetes: eBPF programs can read and modify packets without kernel changes, integrate with existing routing (see [Router Fundamentals](./router-fundamentals.md)), and achieve performance comparable to hardware offload.

## How It Works

### eBPF Architecture

eBPF consists of several components:

**eBPF Virtual Machine**: Register-based VM with 11 registers, supporting 64-bit operations. Programs execute in kernel context with access to helper functions for maps, packet access, and kernel state.

**eBPF Maps**: Key-value data structures shared between eBPF programs and userspace. Types include:
- Hash maps: Fast lookups (O(1))
- Arrays: Index-based access
- LRU maps: Least-recently-used eviction for caches
- Per-CPU maps: No synchronization overhead

Maps enable stateful packet processing: track connection states, maintain counters, store configuration.

**Helper Functions**: Kernel-provided functions for safe operations:
- `bpf_map_lookup_elem()`: Read from map
- `bpf_ktime_get_ns()`: Get current timestamp
- `bpf_redirect()`: Send packet to different interface
- `bpf_csum_diff()`: Recalculate checksums after modifications

Verifier ensures only whitelisted helpers are called.

### XDP Program Structure

A minimal XDP program that drops all packets:

```c
#include <linux/bpf.h>
#include <bpf/bpf_helpers.h>

SEC("xdp")
int xdp_drop_all(struct xdp_md *ctx) {
    return XDP_DROP;
}

char _license[] SEC("license") = "GPL";
```

Compiled with clang/LLVM:
```bash
clang -O2 -target bpf -c xdp_drop_all.c -o xdp_drop_all.o
```

Loaded onto interface:
```bash
ip link set dev eth0 xdp obj xdp_drop_all.o sec xdp
```

**XDP verdicts**:
- `XDP_PASS`: Continue normal kernel processing
- `XDP_DROP`: Drop packet (no further processing)
- `XDP_TX`: Transmit packet back out same interface (bounce)
- `XDP_REDIRECT`: Send to different interface
- `XDP_ABORTED`: Drop packet and trace error

### Example: IPv4-over-IPv6 Packet Corruption Fix

The webinar mentioned fixing Juniper QFX/MX IPv4-over-IPv6 corruption with 40 lines of eBPF. The pattern:

```c
SEC("xdp")
int fix_ipv4_over_ipv6(struct xdp_md *ctx) {
    void *data_end = (void *)(long)ctx->data_end;
    void *data = (void *)(long)ctx->data;

    struct ethhdr *eth = data;
    if ((void *)(eth + 1) > data_end)
        return XDP_PASS;

    // Check if IPv6
    if (eth->h_proto != bpf_htons(ETH_P_IPV6))
        return XDP_PASS;

    struct ipv6hdr *ip6 = data + sizeof(*eth);
    if ((void *)(ip6 + 1) > data_end)
        return XDP_PASS;

    // Detect malformed IPv4-over-IPv6 encapsulation
    // ... specific fix for Juniper bug ...

    // Correct the packet header
    // ... manipulation logic ...

    return XDP_PASS;
}
```

This runs at every packet on the interface, correcting corruption transparently at line rate.

### Integration with Cilium CNI

Cilium, a Kubernetes CNI, uses eBPF extensively:
- **XDP for DoS protection**: Drop malicious traffic before kernel processing
- **TC eBPF for policy**: Enforce network policies at socket/tc level
- **kprobes for observability**: Trace kernel function calls without overhead
- **Socket eBPF for acceleration**: Bypass iptables for pod-to-pod traffic

In a bare metal cluster using Cilium with XDP enabled, every node runs eBPF programs that:
1. Drop packets failing policy checks (XDP layer)
2. Perform NAT for services (TC layer)
3. Route pod traffic (Socket layer)
4. Generate flow logs (kprobe/tracepoint layer)

All at near-zero overhead compared to iptables-based CNIs.

For foundational routing concepts that eBPF programs interact with, see [Router Fundamentals](./router-fundamentals.md).

## Trade-offs and Limitations

eBPF provides power but requires expertise and has constraints:

**Programming complexity**: eBPF C is restricted: no unbounded loops, no function pointers, limited stack (512 bytes), no standard library. Writing correct eBPF programs requires understanding:
- Kernel packet structures (sk_buff, xdp_md)
- Network protocols (Ethernet, IP, TCP headers)
- BPF helper functions and their constraints
- Verifier requirements (bounded memory access, loop unrolling)

Learning curve is steep compared to writing iptables rules.

**Limited kernel API access**: eBPF cannot call arbitrary kernel functions—only whitelisted helpers. Want to allocate memory dynamically? Not possible. Want to send netlink message? Must use workarounds (like ringbuffer to userspace).

**Verifier complexity**: The verifier sometimes rejects valid programs it cannot prove safe. Complex control flow or pointer arithmetic may require refactoring to satisfy the verifier, even if the logic is correct.

**Debugging challenges**: Traditional debugging tools (gdb) don't work well with eBPF. Debugging techniques:
- `bpf_printk()`: Print messages to kernel trace buffer (low throughput)
- bpftool: Inspect loaded programs and maps
- BTF (BPF Type Format): Preserve type information for better introspection

**Kernel version dependencies**: eBPF features evolve rapidly. Older kernels (< 5.4) lack many helpers and map types. For production:
- Linux 5.10+ recommended for stability
- Linux 5.15+ LTS has most modern features
- Linux 6.1+ LTS includes latest performance improvements

**NIC driver support for XDP**: Not all NICs support native XDP. Fallback is "generic XDP" (runs after driver, slower). Check driver support:
- Intel: i40e (X710), ice (E810) support native XDP
- Mellanox: mlx5 (ConnectX-4+) supports native XDP
- Broadcom: bnxt supports native XDP (recent)

Without native support, XDP performance drops significantly.

**When to avoid eBPF**:
- Simple use cases solvable with iptables (why learn eBPF for basic firewall?)
- Kernel < 5.4 in production (missing critical features)
- No in-house eBPF expertise (operational burden high)

eBPF excels when you need:
- Line-rate packet processing (DDoS mitigation, load balancing)
- Custom logic beyond iptables capabilities
- Observability without performance penalty
- Protocol workarounds or translation
- Integration with modern Kubernetes CNIs (Cilium, Calico eBPF dataplane)

**NIC offload**: Some NICs support eBPF offload—running eBPF programs directly in NIC hardware. Netronome SmartNICs pioneered this. Performance reaches true line rate (no CPU involvement), but offload support is limited and vendor-specific.

## References

- [kernel.org eBPF Documentation](https://www.kernel.org/doc/html/latest/bpf/index.html) - Official Linux kernel eBPF docs
- [eBPF.io](https://ebpf.io/) - Community resource for eBPF learning and projects
- [Cilium eBPF Documentation](https://docs.cilium.io/en/stable/bpf/) - Production eBPF usage in Kubernetes
- [XDP Tutorial](https://github.com/xdp-project/xdp-tutorial) - Hands-on XDP programming guide
- [BPF and XDP Reference Guide (Cilium)](https://docs.cilium.io/en/stable/bpf/progtypes/) - Comprehensive eBPF reference
- [Router Fundamentals](./router-fundamentals.md) - Data plane concepts eBPF operates within

**Note**: eBPF and XDP are Linux kernel technologies, not IETF standards. Authoritative sources are Linux kernel documentation, eBPF.io, and projects like Cilium that deploy eBPF in production.
