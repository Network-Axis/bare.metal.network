---
sidebar_position: 2
---

# VXLAN-EVPN: Overlay Networking for Bare Metal Kubernetes

VXLAN combined with EVPN provides Layer 2 overlay networking across Layer 3 boundaries, enabling pod networks to span multiple racks in a bare metal Kubernetes cluster while maintaining tenant isolation through programmable segmentation.

## Problem Statement

Bare metal Kubernetes deployments spanning multiple racks face a fundamental networking challenge: pods need Layer 2 connectivity for certain use cases (multicast, service discovery, VM migration), but the underlying network infrastructure is Layer 3-only IP fabric connecting Top-of-Rack switches.

Traditional VLAN-based approaches hit hard limits in this environment:
- **4094 VLAN limit** cannot accommodate multi-tenant clusters with hundreds of namespaces
- **Spanning VLANs across racks** introduces Spanning Tree Protocol, limiting active paths and creating failure domains
- **Manual VLAN configuration** on every switch creates operational burden and slow provisioning

Multi-tenancy adds another dimension: different applications or customers sharing the same physical infrastructure must be network-isolated, even when running on the same server. Traditional approaches require complex VLAN-per-tenant mapping and careful coordination between network and server teams.

## Why This Protocol

VXLAN solves the overlay problem through encapsulation. According to RFC 7348:

> "VXLAN is a Layer 2 overlay scheme on a Layer 3 network. Each overlay is termed a VXLAN segment."

Rather than stretching VLANs, VXLAN encapsulates Layer 2 Ethernet frames inside UDP packets, allowing them to traverse a pure Layer 3 network. The 24-bit VXLAN Network Identifier (VNI) provides 16 million segments—far beyond VLAN limits. As RFC 7348 states:

> "Each VXLAN segment is identified through a 24-bit segment ID, termed the VXLAN Network Identifier (VNI). This allows up to 16 M VXLAN segments to coexist within the same administrative domain."

But VXLAN alone requires either multicast for MAC address learning or manual tunnel configuration—neither scales well. This is where EVPN becomes critical.

EVPN provides the control plane for VXLAN's data plane. According to RFC 8365:

> "This document specifies how Ethernet VPN (EVPN) can be used as a Network Virtualization Overlay (NVO) solution"

EVPN uses BGP extensions to advertise MAC addresses and IP-to-MAC mappings across the network. This eliminates flood-and-learn behavior: when a pod appears on a worker node, EVPN immediately advertises its MAC address to all other nodes via BGP Route Type 2 (MAC/IP Advertisement). No multicast, no flooding—just direct control-plane-driven learning.

The integration with [BGP](./bgp.md) is intentional. BGP's scalability (handling 700k+ routes in the public Internet), policy controls, and extensibility via Address Family Identifiers make it ideal for distributing overlay network state across thousands of nodes.

## How It Works

### VXLAN Data Plane

VXLAN creates a logical Layer 2 network overlaid on top of a Layer 3 IP fabric. Each overlay segment is identified by a VNI, and VXLAN Tunnel Endpoints (VTEPs) perform encapsulation and decapsulation.

When a pod sends an Ethernet frame destined for a pod on another node:

1. **Source VTEP** (usually the worker node's kernel or vSwitch) receives the frame
2. **VNI assignment**: The frame's VLAN tag or bridge membership determines which VNI to use
3. **Encapsulation**: The original Ethernet frame is wrapped in VXLAN header (8 bytes), UDP header (8 bytes), IP header (20 bytes), and outer Ethernet header (14 bytes)—total 50-byte overhead
4. **IP routing**: The encapsulated packet is routed through the underlay network using standard IP forwarding
5. **Destination VTEP** receives the UDP packet (port 4789), validates the VNI, decapsulates the original Ethernet frame, and delivers it to the destination pod

The underlay network only sees UDP/IP packets between worker node IPs. The overlay network topology—which pods can communicate—is entirely independent of the physical topology.

### EVPN Control Plane

EVPN eliminates the need for data-plane MAC learning by using BGP to distribute reachability information. According to RFC 8365:

> "Control-plane information is distributed with BGP" and "Auto-discovery via BGP is used to discover PE devices participating in a given VPN."

When a new pod is created on a worker node:

1. **Local learning**: The worker's kernel bridge learns the pod's MAC address from its first packet
2. **BGP advertisement**: FRR (the BGP daemon) reads the bridge's MAC table and generates an EVPN Route Type 2 advertisement containing:
   - MAC address
   - IP address (optional but recommended)
   - VNI (carried in the MPLS label field)
   - Route target (for multi-tenancy)
3. **Distribution**: BGP distributes this advertisement to all other worker nodes peering in the EVPN address family
4. **Remote learning**: Other workers receive the advertisement and program their forwarding tables: "To reach MAC aa:bb:cc:dd:ee:ff in VNI 10, encapsulate for VTEP at 10.0.1.5"

Route Type 5 advertisements handle IP prefixes, enabling routing between VNI segments or to external networks. This creates a powerful model: Layer 2 within each VNI, Layer 3 routing between VNIs, all controlled via BGP.

### Integration in Kubernetes

In a bare metal Kubernetes cluster using Cilium or similar CNI:

1. **Pod creation**: Kubernetes scheduler places a pod on a worker node
2. **CNI invocation**: Cilium creates a veth pair, assigns the pod IP from the node's pod CIDR
3. **VNI mapping**: The pod's namespace determines its VNI (e.g., namespace "production" → VNI 100)
4. **Bridge attachment**: The veth interface is attached to a Linux bridge associated with VNI 100
5. **VXLAN interface**: The bridge is connected to a VXLAN interface configured with VNI 100
6. **EVPN advertisement**: FRR detects the new MAC in the bridge's forwarding table, generates Route Type 2 with VNI 100, advertises via BGP
7. **Cluster-wide propagation**: All other worker nodes receive the advertisement within milliseconds, learn the pod's location

Now when another pod sends traffic to this pod, the source node knows exactly which VTEP to use—no ARP flooding, no multicast, just direct VXLAN-encapsulated delivery.

For foundational routing concepts, see [Router Fundamentals](./router-fundamentals.md).

## Trade-offs and Limitations

VXLAN-EVPN is powerful but introduces complexity and overhead:

**Encapsulation overhead**: 50 bytes per packet reduces effective MTU and adds ~3% throughput penalty for large frames. Jumbo frames (MTU 9000) minimize this impact. Alternatively, NIC hardware VXLAN offload eliminates CPU overhead for encapsulation/decapsulation.

**Troubleshooting complexity**: Packet captures show encapsulated packets, not the inner Ethernet frames. You'll need `tcpdump` with decapsulation filters or tools that understand VXLAN to see actual application traffic.

**MTU considerations**: If the underlay MTU is 1500 bytes and you need 1500-byte pod traffic, you must either reduce pod MTU to 1450 bytes or increase underlay MTU to 1550+ bytes (jumbo frames).

**Operational complexity**: EVPN requires BGP knowledge on server teams. Misconfigurations (like advertising wrong route targets) can break tenant isolation. The tradeoff is automation: properly configured, EVPN eliminates manual tunnel configuration and scales to thousands of nodes.

**When to choose alternatives**:
- **Flat Layer 3 with BGP-only**: If you don't need Layer 2 connectivity between pods, skip VXLAN entirely. Advertise pod CIDRs via BGP without overlays. Simpler, lower overhead.
- **WireGuard/IPsec overlays**: For encrypted inter-datacenter links, use encrypted tunnels instead of plain VXLAN.
- **Simpler CNIs for small clusters**: For &lt;50 nodes without multi-tenancy, simpler solutions like Calico BGP-only mode reduce complexity.

VXLAN-EVPN excels when you need:
- Layer 2 segments spanning racks
- Multi-tenancy (VNI-per-namespace)
- Thousands of segments (beyond VLAN limits)
- Automated overlay provisioning

## References

- [RFC 7348: Virtual eXtensible Local Area Network (VXLAN)](https://datatracker.ietf.org/doc/rfc7348/) - VXLAN data plane specification
- [RFC 8365: A Network Virtualization Overlay Solution Using Ethernet VPN (EVPN)](https://datatracker.ietf.org/doc/rfc8365/) - EVPN control plane for VXLAN
- [RFC 4760: Multiprotocol Extensions for BGP-4](https://datatracker.ietf.org/doc/rfc4760/) - BGP extensions enabling EVPN
- [BGP ADR](./bgp.md) - Border Gateway Protocol fundamentals
- [Router Fundamentals](./router-fundamentals.md) - Basic routing concepts
