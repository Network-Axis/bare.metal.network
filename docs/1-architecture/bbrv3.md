---
sidebar_position: 8
---

# BBRv3: Bottleneck Bandwidth and Round-Trip Time Congestion Control

BBR (Bottleneck Bandwidth and Round-Trip time) version 3 is a model-based TCP congestion control algorithm that optimizes throughput and latency by measuring actual network capacity rather than inferring congestion from packet loss.

## Problem Statement

Traditional TCP congestion control algorithms (Reno, CUBIC) were designed in the 1980s-1990s when packet loss primarily indicated network congestion. These loss-based algorithms follow a simple pattern:

1. Increase sending rate until packet loss occurs
2. Interpret loss as congestion signal
3. Drastically reduce sending rate
4. Slowly ramp up again

This approach creates several problems in modern networks:

**Bufferbloat**: ISPs, cloud providers, and network equipment vendors added massive buffers (sometimes hundreds of milliseconds worth) to reduce packet loss. Loss-based algorithms fill these buffers completely before detecting "congestion," creating hundreds of milliseconds of latency while achieving mediocre throughput. A video conference suffers 500ms delay not because the network lacks capacity, but because CUBIC filled every buffer trying to find the loss point.

**Suboptimal throughput**: Loss-based algorithms oscillate between too-fast (causing loss) and too-slow (underutilizing capacity). On a 10 Gbps link with 20ms RTT, CUBIC might average 7 Gbps due to constant oscillation rather than sustaining near 10 Gbps.

**Poor performance over lossy links**: Wireless networks, long-distance satellite links, and datacenter networks with occasional CRC errors experience packet loss unrelated to congestion. Loss-based algorithms catastrophically reduce sending rate even when plenty of capacity exists—a single wireless interference event drops throughput from 1 Gbps to 100 Mbps for seconds.

**Latency spikes under load**: When multiple flows share a bottleneck, loss-based algorithms create saw-tooth patterns in queue depth. Queues fill until loss occurs (high latency), then empty suddenly (low latency), creating unpredictable latency for real-time applications.

The core problem: loss-based congestion control optimizes for the wrong metric. Instead of asking "how much data can the network deliver?", it asks "when do packets start dropping?"—fundamentally different questions with different answers.

## Why This Protocol

BBR takes a model-based approach developed by Google researchers. Rather than reacting to loss, BBR actively measures two physical properties:

1. **BtlBw (Bottleneck Bandwidth)**: Maximum delivery rate the network path can sustain
2. **RTprop (Round-trip propagation time)**: Minimum RTT without queuing delay

By measuring these parameters continuously and adjusting the sending rate to match BtlBw while maintaining minimal queuing (RTprop), BBR achieves:

- **High throughput**: Sending at measured bottleneck bandwidth, not oscillating around it
- **Low latency**: Minimal queue buildup by avoiding buffer-filling behavior
- **Fast convergence**: Adapts to changing network conditions in RTTs, not seconds
- **Loss tolerance**: Occasional packet loss doesn't trigger rate collapse

The key insight: the optimal sending rate equals the bottleneck bandwidth. Sending faster creates queues (latency) without increasing delivery rate. Sending slower wastes capacity. BBR explicitly measures and targets this optimal point.

BBRv1 (2016) demonstrated revolutionary improvements in Google's internal networks and YouTube CDN. BBRv2 (2019) addressed fairness issues when competing with loss-based flows. BBRv3 (2022+) further refines fairness, convergence speed, and stability under diverse conditions.

In bare metal Kubernetes deployments running distributed databases (Cassandra, ScyllaDB), object storage (Ceph, MinIO), or ML training workloads, BBR can significantly improve both throughput and latency compared to CUBIC, especially on high-bandwidth, high-latency paths between datacenters.

## How It Works

### Measuring Bottleneck Bandwidth (BtlBw)

BBR continuously measures delivery rate: bytes acknowledged divided by time interval. The maximum observed delivery rate over a window (typically 10 RTTs) represents the bottleneck bandwidth.

**Example**: Sending data over a 10 Gbps link with 50ms RTT:
- **RTT 1-5**: Delivery rate measured at 9.8 Gbps (network lightly loaded)
- **RTT 6**: Delivery rate measured at 10.0 Gbps (max capacity)
- **RTT 7-10**: Delivery rate measured at 9.9 Gbps
- **BtlBw estimate**: max(9.8, 10.0, 9.9, ...) = 10.0 Gbps

BBR uses this 10.0 Gbps estimate for pacing decisions.

### Measuring Round-Trip Propagation Time (RTprop)

BBR tracks minimum observed RTT over a window (typically 10 seconds). This minimum represents the RTT when no queuing delay exists—pure propagation delay.

**Example on same 10 Gbps, 50ms RTT path**:
- **t=0s**: RTT measured at 51ms (minimal queue)
- **t=2s**: RTT measured at 50ms (empty queue)
- **t=5s**: RTT measured at 120ms (queue buildup from other flows)
- **t=8s**: RTT measured at 52ms
- **RTprop estimate**: min(51, 50, 120, 52, ...) = 50ms

BBR uses this 50ms as the target RTT, knowing that maintaining ~50ms RTT means minimal queuing.

### Pacing and Send Rate Control

BBR sets the sending rate based on measured parameters:

```
pacing_rate = pacing_gain × BtlBw
cwnd = pacing_rate × RTprop
```

**pacing_gain** varies depending on BBR's state:
- **Startup**: 2.885x (aggressively probe for bandwidth)
- **Drain**: 0.75x (reduce inflight data after startup)
- **ProbeBW**: Cycles between 0.75x, 1.0x, 1.25x (maintain high utilization, probe for changes)
- **ProbeRTT**: Reduce inflight to 4 packets periodically (refresh RTprop estimate)

Unlike CUBIC's additive-increase-multiplicative-decrease (AIMD), BBR directly sets the rate based on measurements.

### State Machine

BBR operates as a state machine:

**Startup**: When a connection begins, BBR doubles sending rate every RTT until delivery rate stops increasing, quickly finding BtlBw.

**Drain**: After startup fills the bottleneck link's buffer, drain excess queue by sending below BtlBw briefly.

**ProbeBW** (steady state): Spend most time here, cycling pacing_gain (0.75x → 1.0x → 1.25x → 1.0x → 1.0x → ...) every ~8 RTTs. The 1.25x probe tests if more bandwidth is available, the 0.75x drains any queue created, and 1.0x maintains equilibrium.

**ProbeRTT**: Every 10 seconds, reduce inflight data to 4 packets for one RTT to allow queue drainage and refresh RTprop measurement (ensuring estimate stays current).

### Handling Packet Loss

When packet loss occurs, BBR doesn't reduce sending rate (unlike CUBIC). Instead:

1. Retransmit lost packets via standard TCP recovery
2. Continue measuring BtlBw and RTprop
3. If delivery rate decreases (indicating genuine congestion), BtlBw estimate drops naturally
4. Adjust pacing_rate based on new BtlBw

If loss is random (wireless interference, bit errors), delivery rate remains high, BtlBw stays constant, and sending rate continues unaffected. This is BBR's "loss tolerance."

For foundational TCP concepts, see [Router Fundamentals](./router-fundamentals.md) for routing and forwarding context.

## Trade-offs and Limitations

BBRv3 is sophisticated but introduces operational complexity:

**Kernel version requirement**: Linux 6.6+ has BBRv3 implementation (Google's latest version). Earlier kernels have BBRv1 (5.4+) or BBRv2 (experimental). For production:
- Ubuntu 24.04+ (kernel 6.8 ✓)
- Rocky Linux 9.4+ (kernel 5.14, no BBRv3 without upgrade)
- Debian 13+ (kernel 6.6+ ✓)

Check with: `sysctl net.ipv4.tcp_available_congestion_control`

**Competing with loss-based flows**: When BBR shares a bottleneck with CUBIC, fairness depends on version and tuning. BBRv1 could dominate CUBIC flows. BBRv3 has improved fairness but still shows variance. In mixed environments (Internet paths), this matters. In controlled data centers (all flows use BBR), it doesn't.

**Shallow buffers**: BBR performs best with shallow buffers (BDP or less). Very deep buffers (100+ ms) confuse RTprop measurement. Cloud providers and modern switches increasingly deploy shallow buffers, favoring BBR.

**Requires accurate RTT measurement**: BBR depends on reliable RTT sampling. Delayed ACKs, ACK aggregation, or TSO/GRO interactions can skew measurements. Kernel 6.x improvements address many of these issues, but tuning may be needed.

**Not universally deployed**: Servers default to CUBIC. Clients (browsers, mobile apps) increasingly use BBR. For server-to-server bare metal Kubernetes traffic, you must explicitly enable BBR. Inconsistent deployment across the cluster creates asymmetric performance.

**Complex debugging**: When throughput is suboptimal, diagnosing BBR behavior requires understanding its state machine, pacing_gain cycles, and RTprop/BtlBw estimates. Tools like `ss -ti` show BBR state, but interpretation requires expertise.

**When to use CUBIC instead**:
- Kernel &lt;6.6 and stability is critical (BBRv1/v2 have quirks)
- High packet loss environments where BBR's measurements become unreliable (>5% loss)
- Unknown/hostile environments (Internet) where fairness matters

BBR excels in:
- Datacenter-to-datacenter private networks (controlled environment)
- High-bandwidth, low-loss links (100G+ with clean optics)
- Workloads sensitive to latency and throughput (databases, object storage, ML)
- Kubernetes clusters where all nodes use BBR (consistent behavior)

### Enabling BBRv3

On Linux 6.6+ kernel:

```bash
# Check available congestion control algorithms
sysctl net.ipv4.tcp_available_congestion_control

# Enable BBR globally
sysctl -w net.ipv4.tcp_congestion_control=bbr
sysctl -w net.core.default_qdisc=fq  # Fair Queue scheduler recommended

# Persist across reboots
echo "net.ipv4.tcp_congestion_control=bbr" >> /etc/sysctl.conf
echo "net.core.default_qdisc=fq" >> /etc/sysctl.conf
```

Verify with: `ss -ti | grep bbr` on an active connection.

## References

- [IETF Draft: BBR Congestion Control](https://datatracker.ietf.org/doc/draft-cardwell-iccrg-bbr-congestion-control/) - Official BBR specification (Internet Draft)
- [Google BBR GitHub](https://github.com/google/bbr) - BBRv3 implementation and research papers
- [ACM Queue Article: BBR - Congestion-Based Congestion Control](https://queue.acm.org/detail.cfm?id=3022184) - Accessible explanation by BBR creators
- [Linux kernel TCP BBR documentation](https://www.kernel.org/doc/html/latest/networking/net_dim.html) - Kernel implementation details
- [Router Fundamentals](./router-fundamentals.md) - Basic routing and TCP forwarding concepts

**Note**: BBR is based on Google research and IETF drafts (not finalized RFCs). Authoritative sources are Linux kernel documentation, IETF drafts, and academic papers from BBR's creators.
