---
sidebar_position: 7
---

# Big TCP: Large TSO Segments for High-Speed Networks

Big TCP increases the Linux kernel's TCP Segmentation Offload (TSO) maximum segment size beyond the traditional 64KB limit, reducing CPU overhead and improving throughput on 100 Gbps and faster networks.

## Problem Statement

Modern data center networks operate at 100 Gbps, 200 Gbps, or even 400 Gbps link speeds. At these rates, a seemingly small inefficiency compounds into massive CPU waste. Consider transferring 100 GB between Kubernetes pods on different nodes:

With traditional TCP segmentation:
- **Application writes**: 100 GB via socket to kernel
- **Kernel segments**: Breaks into 64 KB chunks (TSO max segment size)
- **Number of segments**: 100 GB / 64 KB = ~1.6 million segments
- **CPU operations**: 1.6 million calls to segmentation logic, packet header construction, checksum offload setup

Each segmentation operation consumes CPU cycles. At 100 Gbps sustained throughput (12.5 GB/sec), the kernel must process 200,000+ segments per second continuously. On a 32-core server running hundreds of pods, this CPU overhead becomes a meaningful tax on application workloads.

The fundamental problem: TCP Segmentation Offload was designed when 10 Gbps was "fast." The 64 KB segment size limit (derived from the 16-bit IP Total Length field) made sense for those speeds. But network hardware evolved faster than kernel defaults. Modern NICs can handle much larger segments, yet the kernel artificially caps segment size, forcing unnecessary CPU work.

The question: why is the kernel breaking a 10 MB database query result into 160 segments when the NIC could handle it in 10 segments?

## Why This Protocol

Big TCP isn't a protocol—it's a Linux kernel optimization removing an artificial limit. Traditional TCP Segmentation Offload works like this:

1. Application writes large buffer (e.g., 1 MB) to TCP socket
2. Kernel creates "super-packets" up to 64 KB (gso_size)
3. Kernel passes super-packets to NIC with segmentation metadata
4. NIC hardware splits super-packets into MTU-sized TCP segments (1500 bytes)
5. NIC transmits segments on wire

The NIC does the actual segmentation, but the kernel still had to create those 64 KB chunks. Big TCP increases gso_size from 64 KB to **512 KB** (configurable), creating fewer, larger super-packets.

With Big TCP enabled:
- **Application writes**: Same 100 GB
- **Kernel segments**: Breaks into 512 KB chunks
- **Number of segments**: 100 GB / 512 KB = ~200,000 segments
- **CPU operations**: 200,000 calls (8x reduction)

The 8x reduction in segmentation overhead translates directly to CPU savings—cycles that can run application code instead of kernel networking stack.

The key enabler is Linux kernel 5.19+ and modern NICs supporting large GSO (Generic Segmentation Offload). Intel E810 series, Mellanox ConnectX-5/6/7, and other recent NICs advertise support for TSO segments beyond 64 KB. Big TCP takes advantage of this hardware capability.

## How It Works

### TSO and GSO Background

Understanding Big TCP requires understanding Generic Segmentation Offload:

**Without TSO/GSO** (ancient times):
- Application writes 100 KB
- Kernel breaks into ~67 × 1500-byte MTU-sized packets
- CPU constructs 67 packet headers
- CPU computes 67 checksums
- NIC transmits 67 packets

**With TSO/GSO** (modern baseline):
- Application writes 100 KB
- Kernel creates 2 × 64 KB super-packets (gso_size=64KB)
- NIC hardware splits super-packets into ~67 × 1500-byte segments
- NIC hardware computes checksums for all 67 packets
- NIC transmits 67 packets

TSO offloads segmentation and checksum computation to hardware. The kernel only handles 2 super-packets instead of 67 real packets—major CPU savings.

**With Big TCP**:
- Application writes 100 KB
- Kernel creates 1 × 100 KB super-packet (gso_size can exceed 64KB)
- NIC hardware splits into ~67 × 1500-byte segments
- NIC hardware computes checksums
- NIC transmits 67 packets

The packet count on the wire is identical. The difference is CPU-side: handling 1 super-packet instead of 2 (or 67 without TSO).

### IPv6 Jumbograms and Big TCP

The original TSO 64 KB limit comes from IPv4's 16-bit Total Length field, maxing at 65,535 bytes. Big TCP leverages IPv6's extensibility:

IPv6 supports **Jumbograms** via the Hop-by-Hop Options extension header, allowing payload sizes up to **4 GB**. While Big TCP doesn't actually send 4 GB packets on the wire (NICs segment them to MTU), the kernel can create 512 KB super-packets with IPv6 Jumbogram headers, and NICs understand how to segment them.

For IPv4, Big TCP uses a workaround: the kernel still creates &gt;64 KB super-packets internally, but tags them with metadata indicating segmentation requirements. Modern NICs interpret this metadata correctly even though the IPv4 header can't natively represent &gt;64 KB lengths.

### Enabling Big TCP

On Linux kernel 5.19+:

```bash
# Check current GSO max size (default: 65536 bytes)
ip link show eth0 | grep gso

# Enable Big TCP (512 KB segments)
ip link set dev eth0 gso_max_size 524288
ip link set dev eth0 gso_ipv4_max_size 524288
```

For Kubernetes worker nodes with FRR and VXLAN:

```bash
# Enable on physical interface
ip link set dev eth0 gso_max_size 524288

# Enable on VXLAN interface (for overlay traffic)
ip link set dev vxlan100 gso_max_size 524288
```

The kernel will now create up to 512 KB super-packets. NIC hardware must support this—check with `ethtool -k eth0 | grep generic-segmentation-offload`.

### Performance Impact

Benchmarks show measurable improvements:

- **CPU utilization**: 10-25% reduction in networking stack CPU usage at 100 Gbps
- **Throughput**: Marginal increase (1-3%) at max throughput, more headroom for applications
- **Latency**: No degradation—segmentation still happens at NIC, wire latency unchanged

The primary benefit is CPU efficiency, not raw throughput. At 100 Gbps, hardware is the bottleneck, not the kernel. Big TCP frees CPU cycles for application workloads.

## Trade-offs and Limitations

Big TCP is a clear win on supported hardware, but adoption has prerequisites:

**Kernel version requirement**: Linux 5.19+ (released July 2022). Older kernels ignore gso_max_size > 65536. For production bare metal Kubernetes, this means:
- Ubuntu 22.04+ (kernel 5.15 → requires manual upgrade to 5.19+)
- Rocky Linux 9.1+ (kernel 5.14 → requires upgrade)
- Debian 12+ (kernel 6.1 ✓)

**NIC hardware support**: Older NICs may not handle &gt;64 KB segments correctly. Intel X710 (older generation) has issues; E810 (newer) works perfectly. Mellanox ConnectX-4 has quirks; ConnectX-5+ is solid. Check NIC driver documentation and test before production rollout.

**VXLAN overlay interactions**: When using VXLAN (see [VXLAN-EVPN ADR](./vxlan-evpn.md)), Big TCP applies to both underlay (eth0) and overlay (vxlan100) interfaces. Ensure both are configured for large GSO, or you'll create a bottleneck at one layer.

**Minimal benefit at &lt;100 Gbps**: At 10 Gbps or 25 Gbps, the CPU overhead of 64 KB segments is negligible on modern CPUs. Big TCP shines at 100 Gbps+ where packet rates are high enough to stress the kernel.

**Observability challenges**: Tools like `tcpdump` capture super-packets before segmentation, showing 512 KB "packets" that never actually hit the wire. This can confuse debugging. Use `tcpdump --dont-verify-checksums` and understand you're seeing pre-segmentation state.

**When to skip Big TCP**:
- Kernel &lt;5.19 (not supported)
- NICs without large GSO support (check compatibility)
- Networks &lt;100 Gbps (marginal benefit)
- Stability concerns (wait for 6.x kernel LTS for more mature implementation)

Big TCP is valuable when you have:
- 100 Gbps+ network infrastructure
- Modern NICs (Intel E810, Mellanox ConnectX-5+)
- Recent kernel (5.19+, ideally 6.1+)
- High sustained throughput workloads (database replication, distributed storage, ML training)

## References

- [Linux kernel commit introducing Big TCP](https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/commit/?id=89527be8d8d4) - Original implementation by Eric Dumazet
- [LWN Article: Big TCP](https://lwn.net/Articles/884104/) - Detailed explanation of motivation and design
- [RFC 2675: IPv6 Jumbograms](https://datatracker.ietf.org/doc/rfc2675/) - IPv6 extension enabling &gt;64KB payloads
- [VXLAN-EVPN ADR](./vxlan-evpn.md) - Overlay networking considerations with Big TCP
- [Router Fundamentals](./router-fundamentals.md) - Basic routing and forwarding concepts

**Note**: Big TCP is a Linux kernel optimization, not an IETF standard. Authoritative sources are Linux kernel documentation, kernel commit messages, and LWN (Linux Weekly News) articles.
