---
sidebar_position: 6
---

# BFD: Bidirectional Forwarding Detection

Bidirectional Forwarding Detection provides subsecond failure detection for network links, enabling BGP and other routing protocols to converge in milliseconds rather than minutes when connections fail.

## Problem Statement

BGP's default failure detection relies on keepalive timers: peers send KEEPALIVE messages every 60 seconds, and if no message arrives within the hold time (180 seconds), the session is declared dead. This 3-minute failure detection window is catastrophic for modern applications.

Consider a bare metal Kubernetes cluster where a worker node's link to its Top-of-Rack switch fails:

- **t=0 seconds**: Link fails, packets begin dropping
- **t=0 to 180 seconds**: BGP session appears healthy (keepalive timer hasn't expired)
- **t=180 seconds**: BGP detects failure, begins route withdrawal
- **t=185 seconds**: Alternative paths installed, traffic recovers

During those 180 seconds, applications experience:
- Failed pod-to-pod connections
- LoadBalancer services unreachable
- Database connection timeouts
- Customer-visible errors

At 10 Gbps link speeds, 180 seconds represents 225 gigabytes of potential data transfer—the "great deal of lost data at gigabit rates" described in RFC 5880:

> "The time to detect failures...are no better than a second, which is far too long for some applications and represents a great deal of lost data at gigabit rates."

You can tune BGP timers more aggressively (keepalive=3s, hold=9s), achieving ~9-second detection. But this creates new problems:
- Increased control plane overhead (keepalives every 3 seconds per peer)
- False positives during momentary congestion
- BGP sessions flapping unnecessarily

The core challenge: routing protocols optimize for stability (avoiding route flapping), not for rapid failure detection. What's needed is a dedicated failure detection mechanism that's fast, lightweight, and independent of routing protocol internals.

## Why This Protocol

BFD solves the failure detection problem through specialized purpose-built heartbeats. According to RFC 5880:

> "The goal of Bidirectional Forwarding Detection (BFD) is to provide low-overhead, short-duration detection of failures in the path between adjacent forwarding engines..."

BFD runs independently of routing protocols. According to RFC 5880:

> "Networks use relatively slow 'Hello' mechanisms, usually in routing protocols, to detect failures when there is no hardware signaling to help out."

By decoupling failure detection from route advertisement, BFD achieves subsecond detection times without compromising routing protocol stability:

- **BGP session**: Stable, with conservative timers (keepalive=60s, hold=180s)
- **BFD session**: Aggressive, with millisecond detection (transmit=50ms, detect=150ms)

When BFD detects a failure, it signals BGP: "The path to neighbor X is down." BGP immediately tears down the session and withdraws routes—no need to wait for keepalive expiration.

The protocol's overhead is minimal: BFD packets are simple, fixed-format heartbeats. Unlike routing updates that carry variable-length information and require complex processing, BFD simply proves liveness: "I'm here, are you?" This simplicity enables hardware acceleration in modern switches, achieving detection times as low as 3 milliseconds.

## How It Works

### BFD Session Establishment

BFD typically operates in asynchronous mode, where both endpoints independently send periodic Hello messages. The session establishes in three states:

1. **Down**: Initial state, BFD not yet operational
2. **Init**: Local endpoint sending packets, awaiting response from peer
3. **Up**: Bidirectional communication established, monitoring active

Each BFD speaker generates a unique **My Discriminator** value identifying its session and expects the peer's **Your Discriminator** in responses. This allows routers to multiplex thousands of BFD sessions over the same interface.

### Packet Format and Timing

BFD Control packets are lightweight—24 bytes mandatory section containing:

- **Version** (3 bits): BFD protocol version
- **Diagnostic** (5 bits): Reason for last state change
- **State** (2 bits): Current state (Down/Init/Up/AdminDown)
- **Desired Min TX Interval**: How often this endpoint wants to transmit (microseconds)
- **Required Min RX Interval**: Minimum rate this endpoint can receive packets (microseconds)
- **Detect Mult**: Detection time multiplier (typically 3)

The actual detection time negotiated between peers is determined by:
```
Detection Time = Required Min RX Interval (remote) × Detect Mult (remote)
```

Example with FRR default configuration:
- Worker node: Desired Min TX = 50ms, Required Min RX = 50ms, Detect Mult = 3
- ToR switch: Desired Min TX = 50ms, Required Min RX = 50ms, Detect Mult = 3
- Result: Packets sent every 50ms, failure declared after 150ms (3 × 50ms) without receiving

If the worker receives 2 consecutive packets from the ToR at t=0ms and t=50ms, but nothing at t=100ms, t=150ms, it declares the session Down at t=150ms and notifies BGP.

### Integration with BGP

BFD doesn't replace BGP—it augments it. The typical configuration in FRR:

```
router bgp 65101
  neighbor fe80::1 remote-as 65001
  neighbor fe80::1 bfd
  neighbor fe80::1 bfd check-control-plane-failure
```

The `bfd` directive links BGP to BFD: "Use BFD for failure detection on this neighbor." When BFD detects failure:

1. BFD state transitions: Up → Down
2. BFD notifies registered protocols (BGP in this case)
3. BGP immediately tears down session, withdraws advertised routes
4. Alternative paths (via other interface/switch) take over via [ECMP](./ecmp.md)
5. Traffic recovers in &lt;1 second total

When the link recovers:

1. BFD resumes heartbeats, state transitions: Down → Init → Up
2. BFD notifies BGP: path restored
3. BGP re-establishes session (OPEN handshake)
4. Routes re-advertised
5. ECMP reinstates both paths

The BGP session configuration remains stable (conservative timers). BFD provides the fast detection layer underneath.

For foundational routing concepts, see [Router Fundamentals](./router-fundamentals.md). For BGP configuration details, see [BGP ADR](./bgp.md).

## Trade-offs and Limitations

BFD's rapid detection comes with operational considerations:

**CPU overhead**: Aggressive timers (50ms transmit interval) generate 20 packets per second per BFD session. With 100 BGP neighbors, that's 2,000 BFD packets/second to process. Modern servers handle this easily, but older hardware or resource-constrained edge devices may struggle. Hardware-accelerated BFD in switches offloads this to ASICs, eliminating CPU impact.

**False positives on congested links**: If a BFD packet is delayed by 150ms due to congestion (full transmit queue, QoS deprioritization), BFD declares the link dead even though it's just slow. This triggers unnecessary BGP session resets and route churn. Solutions:
- Increase detect multiplier (3 → 5 allows more tolerance)
- Implement QoS to prioritize BFD packets
- Monitor false-positive rates and tune timers accordingly

**Timer negotiation complexity**: BFD peers negotiate timers dynamically. If you configure "transmit every 10ms" but the peer can only receive every 100ms, the actual rate becomes 100ms. Asymmetric configurations create confusion: "Why isn't my 10ms configuration working?" Understanding negotiation prevents misconfigurations.

**Kernel vs hardware implementation differences**: Software BFD in the Linux kernel provides 10ms minimum intervals (FRR default: 50ms for stability). Hardware-accelerated BFD in switch ASICs can achieve 3ms intervals. Mixing them works (BFD spec handles asymmetric timers), but expectations must align with capabilities.

**Echo mode complications**: BFD supports echo mode where one endpoint sends packets that the peer immediately loops back, enabling single-ended failure detection. This halves the packet rate but requires the peer support it, and introduces NAT/firewall complications (echo packets use different UDP port). Asynchronous mode is simpler and more widely deployed.

**When to skip BFD**:
- **Small clusters with manual intervention acceptable**: If 3-minute failover is tolerable, BGP keepalives suffice
- **Link-layer failure detection available**: If physical layer or LACP provides fast detection, BFD is redundant
- **Resource-constrained devices**: Embedded systems without spare CPU cycles for BFD processing

BFD is essential when you need:
- Subsecond failure detection and recovery
- Application SLAs requiring high availability (99.99%+)
- Clusters where BGP is primary routing protocol (see [BGP ADR](./bgp.md))
- Networks with no hardware-layer failure signaling

According to RFC 5880, the detection time achieved is:

> "...measured in milliseconds rather than seconds."

This shift from seconds to milliseconds fundamentally changes application resilience, transforming outages from user-visible incidents to invisibly handled events.

## References

- [RFC 5880: Bidirectional Forwarding Detection (BFD)](https://datatracker.ietf.org/doc/rfc5880/) - Core BFD specification
- [RFC 5881: Bidirectional Forwarding Detection (BFD) for IPv4 and IPv6 (Single Hop)](https://datatracker.ietf.org/doc/rfc5881/) - Single-hop BFD deployment
- [RFC 5882: Generic Application of Bidirectional Forwarding Detection (BFD)](https://datatracker.ietf.org/doc/rfc5882/) - BFD integration with routing protocols
- [BGP ADR](./bgp.md) - Border Gateway Protocol with BFD integration
- [ECMP ADR](./ecmp.md) - Multipath routing providing alternative paths during BFD-triggered failovers
- [Router Fundamentals](./router-fundamentals.md) - Basic routing concepts
