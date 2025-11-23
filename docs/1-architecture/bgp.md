---
sidebar_position: 4
---

# BGP: Border Gateway Protocol for Bare Metal Kubernetes

Border Gateway Protocol enables scalable, policy-driven routing in bare metal Kubernetes clusters by running on worker nodes themselves, eliminating network-server team silos and enabling automated service advertisement across hundreds to thousands of nodes.

## Problem Statement

A bare metal Kubernetes cluster spanning multiple racks requires a routing protocol to advertise pod networks, service IPs, and maintain reachability as the cluster scales. The networking challenges multiply quickly:

- **Scale requirements**: Hundreds of worker nodes, each hosting dozens of pods, generating thousands of unique IP addresses that must be routable cluster-wide
- **Multi-rack topology**: Pods on different racks must communicate through Top-of-Rack (ToR) switches and spine switches, requiring routing coordination across multiple failure domains
- **Service redundancy**: Load-balanced services with multiple backend pods need Active/Active or Active/Passive failover without external load balancers
- **Policy control**: Traffic engineering requirements (prefer local rack, avoid specific paths, influence ingress/egress) that simple static routing cannot express
- **Operational silos**: Traditional model where network team manages switches and server team manages nodes creates change management bottlenecks—adding a new pod network requires ticketing, VLAN provisioning, and multi-team coordination

Static routing doesn't scale: manually configuring thousands of routes across dozens of switches is error-prone and slow. OSPF, while dynamic, has limitations: link-state flooding doesn't scale to thousands of prefixes as gracefully as path-vector protocols, and OSPF lacks the rich policy mechanisms needed for traffic engineering.

The core question: how do you route pod traffic in a cluster where the network topology is constantly changing (pods being created/destroyed), at massive scale (thousands of prefixes), with minimal operational overhead?

## Why This Protocol

BGP's scalability is proven at the largest scale imaginable. According to RFC 4271:

> "The primary function of a BGP speaking system is to exchange network reachability information with other BGP systems."

This simple purpose—exchanging reachability information—powers the entire Internet. BGP routers in the Internet's Default-Free Zone handle 700,000+ routes. If BGP can scale the public Internet, it can scale a Kubernetes cluster.

The path-vector approach provides inherent advantages over link-state protocols like OSPF. Rather than flooding link-state advertisements to build a complete topology map, BGP simply advertises "I can reach network X via path [AS1, AS2, AS3]." This consumes less memory and CPU at scale. In a Kubernetes context, each worker advertises "I can reach pod CIDR 10.244.5.0/24" without needing to know the complete cluster topology.

Policy control is where BGP truly shines. The protocol's Autonomous System (AS) concept and path attributes enable sophisticated traffic engineering:

- **LOCAL_PREF**: Influence outbound path selection (prefer rack-local routes)
- **AS_PATH**: Control path length and loop prevention
- **COMMUNITY**: Tag routes for filtering and policy application
- **MED (Multi-Exit Discriminator)**: Suggest preferred entry points to neighbors

These mechanisms allow operators to express intent: "Prefer local rack for pod-to-pod traffic," "Never route through switch A," "Advertise service IPs only to spine layer."

Extensibility via Multiprotocol BGP (MP-BGP) is critical for modern use cases. According to RFC 4760, Address Family Identifiers (AFI) and Subsequent AFI (SAFI) allow BGP to carry more than just IPv4 unicast routes. This enables:

- **EVPN** (AFI=25, SAFI=70): MAC/IP advertisement for overlay networks, described in [VXLAN-EVPN ADR](./vxlan-evpn.md)
- **IPv6 unicast** (AFI=2, SAFI=1): Native IPv6 routing alongside IPv4
- **VPN routes**: L2VPN and L3VPN for multi-tenancy

The maturity and ubiquity of BGP cannot be overstated. Every major network vendor implements it, open-source implementations (FRR, BIRD, GoBGP) are production-ready, and operational knowledge is widespread. When you choose BGP, you're choosing a protocol with decades of deployment experience and well-understood failure modes.

## How It Works

### Path-Vector Protocol Fundamentals

BGP is a path-vector protocol: it advertises not just reachability to a destination, but the entire AS path taken to reach that destination. This provides loop prevention—if a BGP speaker sees its own AS number in a received path, it rejects the route.

In a Kubernetes cluster, Autonomous System numbers are typically used to identify layers:
- **Spine switches**: AS 65000
- **Rack 1 ToR switches**: AS 65001
- **Rack 1 worker nodes**: AS 65101-65199
- **Rack 2 ToR switches**: AS 65002
- **Rack 2 worker nodes**: AS 65201-65299

When worker node in AS 65101 advertises pod CIDR 10.244.5.0/24, the path looks like:
- **To ToR switch (AS 65001)**: Path = [65101], single hop
- **To spine switch (AS 65000)**: Path = [65001, 65101], two hops
- **To different rack worker (AS 65201)**: Path = [65000, 65001, 65101], three hops

Each hop appends its AS number, creating a breadcrumb trail preventing loops.

### BGP Session Establishment

BGP operates over TCP (port 179), leveraging TCP's reliability for route exchange. According to RFC 4271:

> "BGP uses TCP [RFC793] as its transport protocol. This eliminates the need for explicit update fragmentation, retransmission, acknowledgement, and sequencing."

Session establishment follows a simple pattern:

1. **TCP connection**: BGP speaker initiates TCP connection to neighbor
2. **OPEN message**: Contains AS number, BGP identifier (router ID), hold time
3. **KEEPALIVE messages**: Sent periodically (default: 60 seconds) to maintain session
4. **UPDATE messages**: Carry actual routing information (advertised routes, withdrawn routes)
5. **NOTIFICATION**: Error reporting, triggers session closure

In a Kubernetes deployment using FRR and IPv6 link-local addressing, BGP sessions can be established automatically via Neighbor Discovery Protocol—no manual neighbor configuration required. When a worker node boots:

1. Interface activates, acquires IPv6 link-local address via SLAAC (see [IPv6-SLAAC ADR](./ipv6-slaac.md))
2. FRR detects neighbor via NDP
3. BGP session automatically established using link-local addresses
4. Pod CIDR advertisement begins immediately

### Route Advertisement and Attributes

When a worker node wants to advertise its pod CIDR, it sends a BGP UPDATE message containing:

**NLRI (Network Layer Reachability Information)**: The actual prefix being advertised (e.g., 10.244.5.0/24)

**Path attributes**:
- **ORIGIN**: IGP (learned from interior protocol), EGP, or incomplete
- **AS_PATH**: Sequence of AS numbers traversed
- **NEXT_HOP**: IP address of next router toward destination
- **LOCAL_PREF**: Local preference for path selection (higher = more preferred)
- **MED**: Metric suggesting preferred entry point to neighboring AS

Example UPDATE message (conceptual):
```
NLRI: 10.244.5.0/24
AS_PATH: 65101
NEXT_HOP: fe80::1234:5678:90ab:cdef
LOCAL_PREF: 100
ORIGIN: IGP
```

Receiving routers store this in their Adj-RIB-In (pre-policy routes from peers), run the decision process, and potentially install it in Loc-RIB (local selected routes) and advertise it to other peers via Adj-RIB-Out.

### Path Selection Algorithm

When multiple routes to the same destination exist, BGP uses a deterministic decision process (RFC 4271, Section 9.1):

1. **Highest LOCAL_PREF** wins (prefer paths configured with higher local preference)
2. **Shortest AS_PATH** wins (fewer AS hops)
3. **Lowest ORIGIN** wins (IGP < EGP < incomplete)
4. **Lowest MED** wins (if from same neighboring AS)
5. **eBGP over iBGP** (external paths preferred over internal)
6. **Lowest IGP cost to NEXT_HOP** (tie-breaker based on internal routing)
7. **Lowest router ID** (final tie-breaker for deterministic choice)

This hierarchical process ensures consistent route selection across the network. In a Kubernetes cluster with [ECMP](./ecmp.md) enabled, equal-cost paths (same LOCAL_PREF, AS_PATH length, etc.) can all be installed for load balancing.

### iBGP vs eBGP in Kubernetes

Two BGP session types serve different purposes:

**eBGP (External BGP)**: Between different AS numbers
- Used between worker nodes and ToR switches (different AS)
- AS_PATH modified (prepended) when advertising
- Multi-hop eBGP possible but typically single-hop for infrastructure

**iBGP (Internal BGP)**: Within the same AS
- Used for route distribution within a layer (e.g., all workers in same rack)
- AS_PATH not modified when re-advertising
- Requires full mesh or route reflectors at scale

Common deployment pattern:
- Workers use eBGP to ToR switches (advertise pod CIDRs)
- ToR switches use eBGP to spines (aggregate routes upward)
- Spine acts as route reflector for iBGP between ToRs (distribute routes horizontally)

For foundational routing concepts, see [Router Fundamentals](./router-fundamentals.md).

## Trade-offs and Limitations

BGP's power comes with complexity and operational considerations:

**Configuration complexity**: BGP requires more configuration than static routing or simple IGPs. Each worker needs:
- AS number assignment
- Neighbor configuration (or auto-discovery via NDP)
- Route advertisement policies (which prefixes to announce)
- Import/export filters (which routes to accept/reject)

Automation (Ansible, configuration management) is essential at scale. The good news: templates work well—most workers have identical BGP configuration except for AS numbers and advertised prefixes.

**Convergence time**: Default BGP keepalive timers (60 seconds) and hold timer (180 seconds) mean failure detection takes up to 3 minutes. This is unacceptable for modern applications. The solution is [BFD](./bfd.md) (Bidirectional Forwarding Detection), which provides subsecond failure detection. With BFD, BGP sessions can detect link failures in 30-900 milliseconds and reconverge accordingly.

**Memory requirements**: BGP maintains multiple routing tables (Adj-RIB-In, Loc-RIB, Adj-RIB-Out) for each peer. At scale (hundreds of peers, thousands of prefixes), this consumes significant memory. The Linux kernel comfortably handles 500,000+ routes, and modern servers with 64GB+ RAM have no practical limitations for Kubernetes cluster sizes.

**When simpler approaches might suffice**:

- **Small clusters (&lt;50 nodes, single rack)**: Static routing or OSPF may be simpler
- **Clusters without multi-tenancy**: If you don't need EVPN, you don't need MP-BGP extensions
- **Managed Kubernetes (EKS, GKE, AKS)**: Cloud providers handle routing

BGP excels when you need:
- Scalability to hundreds/thousands of nodes
- Policy-driven traffic engineering
- Multi-rack deployments with complex topology
- Integration with EVPN for overlay networking (see [VXLAN-EVPN ADR](./vxlan-evpn.md))
- Automated route advertisement without manual switch configuration

According to RFC 4271:

> "A BGP speaker SHOULD advertise to its peers only those routes that it uses itself."

This principle—advertising only what you use—prevents routing loops and ensures the routing table reflects actual reachability, not hypothetical paths.

## References

- [RFC 4271: A Border Gateway Protocol 4 (BGP-4)](https://datatracker.ietf.org/doc/rfc4271/) - Core BGP specification
- [RFC 4760: Multiprotocol Extensions for BGP-4](https://datatracker.ietf.org/doc/rfc4760/) - MP-BGP enabling EVPN and other address families
- [RFC 5549: Advertising IPv4 Network Layer Reachability Information with an IPv6 Next Hop](https://datatracker.ietf.org/doc/rfc5549/) - IPv4-over-IPv6 for infrastructure
- [VXLAN-EVPN ADR](./vxlan-evpn.md) - EVPN overlay networking using MP-BGP
- [IPv6-SLAAC ADR](./ipv6-slaac.md) - Autoconfiguration enabling BGP neighbor auto-discovery
- [BFD ADR](./bfd.md) - Fast failure detection for BGP convergence
- [ECMP ADR](./ecmp.md) - Load balancing across BGP equal-cost paths
- [Router Fundamentals](./router-fundamentals.md) - Basic routing concepts
