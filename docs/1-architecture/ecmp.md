---
sidebar_position: 5
---

# ECMP: Equal-Cost Multipath Routing

Equal-Cost Multipath (ECMP) enables load balancing across multiple network paths with identical routing metrics, utilizing redundant links to increase throughput and provide automatic failover without requiring external load balancers.

## Problem Statement

Modern bare metal Kubernetes deployments provision redundant network connectivity for reliability: each worker node connects to two Top-of-Rack (ToR) switches via separate interfaces (eth0, eth1). Without multipath routing, traditional routing selects a single "best" path and leaves the backup link idle—wasting 50% of available bandwidth.

The challenge intensifies at scale:
- **Underutilized links**: With thousands of flows across hundreds of nodes, Active/Passive link usage leaves half the infrastructure capacity unused
- **Traffic concentration**: All traffic from a rack uses one uplink to the spine layer, creating bottlenecks
- **Manual load balancing**: Attempting to spread load through static route manipulation is error-prone and doesn't adapt to failures
- **External load balancer dependencies**: Kubernetes Services typically require cloud provider load balancers or software like MetalLB, adding complexity

When two paths to the same destination have equal cost (same metric, AS path length, etc.), why choose only one? Network hardware can forward at line rate—the constraint is total bandwidth, not decision complexity. The question becomes: how do you automatically distribute traffic across all available equal-cost paths while maintaining packet ordering for individual flows?

## Why This Protocol

ECMP leverages a fundamental property of IP networks: routers can install multiple next-hops for the same destination prefix. According to RFC 2991:

> "Using equal-cost multipath means that if multiple equal-cost routes to the same destination exist, they can be discovered and used to provide load balancing among redundant paths."

The "equal-cost" qualifier is critical. ECMP operates when routing metrics converge to the same value. In BGP terms, this means:
- Same LOCAL_PREF
- Same AS_PATH length
- Same ORIGIN
- Same MED (if applicable)

When multiple paths satisfy these criteria, the router can use all of them simultaneously rather than arbitrarily choosing one via tie-breaker rules (router ID, etc.).

RFC 2991 identifies the routing protocols that explicitly support ECMP:

> "Various routing protocols, including OSPF and ISIS, explicitly allow 'Equal-Cost Multipath' routing."

BGP also supports ECMP (see [BGP ADR](./bgp.md)) when configured with `maximum-paths` greater than 1. In FRR, `maximum-paths 64` allows up to 64 equal-cost paths to be installed for a single destination—far exceeding typical hardware link counts.

The hash-based distribution mechanism is what makes ECMP practical at scale. Rather than per-packet round-robin (which would reorder TCP segments, devastating performance), ECMP uses per-flow distribution. According to RFC 2991:

> "The router first selects a key by performing a hash over the packet header fields that identify the flow."

Typical hash inputs include:
- Source IP address
- Destination IP address
- IP protocol (TCP, UDP, ICMP)
- Source port (for TCP/UDP)
- Destination port (for TCP/UDP)

The hash produces a pseudo-random but deterministic value. Given the same 5-tuple (src IP, dst IP, protocol, src port, dst port), the hash always produces the same output, ensuring all packets in a TCP connection follow the same path. Different flows hash to different values, distributing load across links.

## How It Works

### Hash-Based Flow Distribution

When a router with multiple equal-cost next-hops receives a packet:

1. **Flow identification**: Extract 5-tuple from packet headers (or subset if UDP/TCP ports unavailable)
2. **Hash computation**: Apply hash function (CRC, XOR, proprietary algorithm) to the 5-tuple
3. **Next-hop selection**: Hash output modulo number of available paths determines which next-hop to use
4. **Forwarding**: Packet sent out the selected interface toward the selected next-hop

Example with 4 equal-cost paths to 10.244.0.0/16:
- Flow A (hash = 17): 17 % 4 = 1 → Use next-hop #1 (fe80::1 via eth0)
- Flow B (hash = 42): 42 % 4 = 2 → Use next-hop #2 (fe80::2 via eth1)
- Flow C (hash = 21): 21 % 4 = 1 → Use next-hop #1 (same as Flow A)

All packets in Flow A always use next-hop #1. All packets in Flow B always use next-hop #2. Packet ordering is preserved per flow while load is distributed across flows.

### Integration with BGP

In a Kubernetes cluster using BGP, ECMP happens automatically when multiple routes with equal metrics exist. Consider a pod on worker-3 sending traffic to a pod on worker-7:

**worker-3's routing table** might show:
```
10.244.7.0/24 proto bgp metric 20
    nexthop via fe80::a dev eth0 weight 1
    nexthop via fe80::b dev eth1 weight 1
```

Both paths have metric 20 (equal cost), both are learned via BGP. The kernel's forwarding logic performs the hash and selects one of the two next-hops for each flow.

**Automatic path addition**: When you physically connect a third interface (eth2) to another ToR switch and configure BGP peering, the route automatically appears:

```
10.244.7.0/24 proto bgp metric 20
    nexthop via fe80::a dev eth0 weight 1
    nexthop via fe80::b dev eth1 weight 1
    nexthop via fe80::c dev eth2 weight 1
```

No manual reconfiguration—ECMP adapts to topology changes seamlessly.

### Packet Ordering and TCP Performance

Per-flow hashing is essential for TCP's congestion control algorithms. If packets arrived out-of-order due to different path latencies, TCP would interpret this as congestion (triggering retransmissions and window reduction), devastating throughput.

By hashing on the 5-tuple, all segments in a TCP connection traverse the same path:
- Same latency for all segments
- In-order delivery maintained
- TCP congestion window grows normally
- No spurious retransmissions

The downside: unequal flow distribution. If one TCP connection transfers 10GB while 100 others transfer 1MB each, and the large flow hashes to one link while the others hash to another, utilization is skewed (10GB on link A, 100MB on link B). This is the "elephant flow" problem—a few large flows can dominate individual links even while aggregate traffic is balanced.

For foundational routing concepts, see [Router Fundamentals](./router-fundamentals.md).

## Trade-offs and Limitations

ECMP's simplicity (no state, no signaling) comes with practical constraints:

**Unequal flow distribution**: Hash-based distribution is probabilistic across flows, not deterministic across bandwidth. In expectation, traffic balances evenly, but variance exists:
- 1,000 short flows: ~balanced distribution (each link gets ~250 flows)
- 10 long flows: potentially unbalanced (5 on one link, 5 on another, but size differs)

Large transfers (backups, data synchronization) can persist for hours, creating long-term imbalance. Solutions include flowlet switching (switching paths during flow idle periods) or more sophisticated traffic engineering, but these add complexity.

**Elephant flows**: A single massive flow cannot exceed one link's capacity. If eth0 and eth1 each provide 10 Gbps, one TCP connection maxes out at 10 Gbps—it cannot use both links. Only multiple flows benefit from ECMP. For single-flow performance, use larger pipes (25G, 100G interfaces) rather than bonding.

**Hash polarization**: In multi-stage networks (worker → ToR → spine → ToR → worker), if every router uses identical hash algorithms and inputs, the same flows always map to the same path throughout the topology. This creates "hot spots." Mitigation strategies:
- Use different hash inputs at different layers (add VXLAN VNI to hash at spine layer)
- Employ hash seeds varying per router
- Modern switches implement polarization-resistant algorithms

**Path MTU discovery interactions**: Different paths may traverse different physical links with varying MTUs. If ECMP selects a path with smaller MTU mid-flow (due to link failure and rerouting), TCP's Path MTU Discovery must re-negotiate, potentially causing temporary disruptions.

**When to avoid ECMP**:
- **Single flows requiring &gt;1 link bandwidth**: Use link aggregation (LACP) instead, though this requires both ends support it
- **Deterministic path requirements**: Certain applications (low-latency trading, real-time control) require predictable latency; ECMP's multi-path nature introduces variance
- **Stateful middleboxes**: If traffic must traverse a specific firewall for connection tracking, ECMP's path selection might bypass it

ECMP excels when you have:
- Many concurrent flows (web services, microservices, distributed databases)
- Redundant infrastructure (multiple ToR switches, spine switches)
- BGP or OSPF providing equal-cost route discovery
- No external load balancer available or desired

## References

- [RFC 2991: Multipath Issues in Unicast and Multicast Next-Hop Selection](https://datatracker.ietf.org/doc/rfc2991/) - ECMP design considerations
- [BGP ADR](./bgp.md) - BGP configuration for ECMP (maximum-paths)
- [Router Fundamentals](./router-fundamentals.md) - Basic routing concepts
