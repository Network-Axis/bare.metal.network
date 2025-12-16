---
sidebar_position: 3
---

# IPv6-SLAAC: Modern Addressing and Autoconfiguration

IPv6 with Stateless Address Autoconfiguration (SLAAC) eliminates manual IP address management in bare metal Kubernetes deployments by providing automatic address assignment on server-to-switch links while maintaining support for IPv4 application traffic.

## Problem Statement

Operating a medium-sized bare metal data center with traditional IPv4 addressing creates significant management overhead. Consider a 200-node Kubernetes cluster with redundant network connectivity:

- **200+ IPv4 prefixes** required: one /30 or /31 per server-to-switch link, across two switches per server
- **Manual IP allocation** for each interface, tracked in spreadsheets or IPAM systems
- **DHCP server dependencies** introducing single points of failure and requiring HA configuration
- **Human error** in IP assignment leading to conflicts and troubleshooting delays
- **Change management latency** when adding servers: submit ticket, wait for IP allocation, configure interfaces, update documentation

Address exhaustion compounds the problem. A /16 private network (65,536 addresses) sounds adequate until you account for point-to-point links, loopbacks, out-of-band management, and future growth. Even with careful subnetting, IPv4's 32-bit address space creates artificial constraints in large deployments.

The fundamental question: why are humans manually configuring unique IP addresses on thousands of interfaces when computers could handle this automatically?

## Why This Protocol

IPv6 solves address exhaustion through sheer scale. According to RFC 8200:

> "IPv6 increases the IP address size from 32 bits to 128 bits, to support more levels of addressing hierarchy, a much greater number of addressable nodes, and simpler autoconfiguration"

128 bits provides 340 undecillion addresses—enough to assign a /64 network (18 quintillion addresses) to every grain of sand on Earth and still have address space remaining. In practical terms, a single data center can use a /48 prefix, allocating /64 subnets liberally without concern for exhaustion.

But address space alone doesn't eliminate manual configuration. SLAAC provides the automation. According to RFC 4862:

> "The IPv6 stateless autoconfiguration mechanism requires no manual configuration of hosts, minimal (if any) configuration of routers, and no additional servers."

This is a fundamental shift from DHCPv4's model. No DHCP server means no server to fail, no HA configuration, no lease management. Interfaces configure themselves using Router Advertisements from the local router. As RFC 4862 explains:

> "The stateless approach is used when a site is not particularly concerned with exact addresses...DHCPv6 is used when a site requires tighter control over exact address assignments. Both may be used simultaneously."

For infrastructure links—connections between servers and switches—exact addresses don't matter. What matters is reachability and uniqueness. SLAAC guarantees both without operational burden.

The integration with [BGP](./bgp.md) is particularly powerful: BGP can advertise IPv4 prefixes using IPv6 next hops (RFC 5549). This means your infrastructure operates on IPv6, while applications and services continue using IPv4. The best of both worlds: modern infrastructure, legacy application compatibility.

## How It Works

### IPv6 Address Structure

IPv6 addresses are 128 bits, typically written as eight groups of four hexadecimal digits: `2001:0db8:85a3:0000:0000:8a2e:0370:7334`. For human readability, leading zeros can be omitted and consecutive zero groups compressed: `2001:db8:85a3::8a2e:370:7334`.

Addresses are structured in two parts:
- **Network prefix** (typically 64 bits): Identifies the subnet, analogous to network portion in IPv4 CIDR
- **Interface identifier** (typically 64 bits): Identifies the specific interface within that subnet

Three address types are critical for bare metal networking:
- **Link-local** (`fe80::/10`): Automatically assigned to every interface, valid only on the local link, never routed
- **Global unicast** (`2000::/3`): Routable IPv6 addresses, analogous to public IPv4
- **Multicast** (`ff00::/8`): Group communication, replacing IPv4 broadcast

The simplified header format delivers performance benefits. According to RFC 8200:

> "Some IPv4 header fields have been dropped or made optional, to reduce the common-case processing cost of packet handling"

Extension headers provide flexibility for optional features without bloating the main header.

### SLAAC Mechanism

Stateless autoconfiguration happens in phases when an interface initializes:

**Phase 1: Link-Local Address Generation**
1. Interface creates a tentative link-local address: `fe80::` + interface identifier
2. Interface identifier derived from MAC address (EUI-64 format) or random value (privacy extensions)
3. Example: MAC `00:0c:29:3e:7f:9a` becomes interface ID `020c:29ff:fe3e:7f9a`, resulting in `fe80::20c:29ff:fe3e:7f9a`

**Phase 2: Duplicate Address Detection (DAD)**

Before using the tentative address, the interface must verify no other node on the link has the same address:
1. Send Neighbor Solicitation for the tentative address to the solicited-node multicast address
2. Wait one second (default) for Neighbor Advertisement response
3. If response received: address conflict, abort autoconfiguration
4. If no response: address is unique, assign it to the interface

**Phase 3: Router Discovery**

The interface needs a router to provide global prefix information. According to RFC 4862:

> "Router Advertisements are sent periodically to the all-nodes multicast address."

Routers send RAs every 200 seconds by default, but hosts can request faster configuration:
1. Host sends Router Solicitation to all-routers multicast (`ff02::2`)
2. Router immediately responds with Router Advertisement containing:
   - Network prefix (e.g., `2001:db8:1::/64`)
   - Prefix valid and preferred lifetimes
   - Default router information
   - MTU and other parameters

**Phase 4: Global Address Formation**

The host combines the advertised prefix with its interface identifier:
- Prefix from RA: `2001:db8:1::/64`
- Interface ID: `020c:29ff:fe3e:7f9a`
- Result: `2001:db8:1::20c:29ff:fe3e:7f9a/64`

The address is immediately usable. No server involvement, no lease management, no manual configuration.

### Kubernetes Integration

In a bare metal Kubernetes cluster using IPv6 infrastructure with SLAAC:

**Worker node interfaces** (eth0, eth1 connecting to ToR switches) use SLAAC for automatic addressing. When the server boots:
1. Interfaces activate, generate link-local addresses
2. Send Router Solicitations
3. Receive Router Advertisements from ToR switches
4. Configure global unicast addresses automatically
5. FRR detects the configured addresses, establishes BGP sessions using those addresses

**Pod addressing** typically doesn't use SLAAC directly. Pods receive addresses from the CNI's IP address management (IPAM), usually from a delegated prefix. However, the infrastructure between nodes uses SLAAC.

**Dual-stack deployments** run both IPv4 and IPv6:
- Infrastructure uses IPv6 with SLAAC (automatic, scalable)
- Pods can use IPv4, IPv6, or both (application compatibility)
- BGP advertises both address families

For foundational routing concepts, see [Router Fundamentals](./router-fundamentals.md).

## Trade-offs and Limitations

IPv6 with SLAAC reduces operational complexity but introduces deployment challenges:

**IPv6 transition complexity**: Running dual-stack (IPv4 + IPv6) is nearly universal today because legacy applications and external dependencies require IPv4. This means managing two protocol stacks, two address families in BGP, and ensuring feature parity across both. The reward is gradual migration: new infrastructure on IPv6, existing systems on IPv4, with no flag day.

**SLAAC vs DHCPv6 trade-offs**: SLAAC provides no centralized address tracking. You can't query "which addresses are in use" from a server. For infrastructure links, this doesn't matter—you discover active neighbors via BGP. For environments requiring audit trails or precise address assignment, DHCPv6 provides stateful management. Both can operate simultaneously on the same network.

**Privacy extensions**: EUI-64 interface identifiers embed the MAC address, creating tracking concerns for mobile devices. Privacy extensions (RFC 4941) generate random, temporary addresses. For server infrastructure, stable addresses are preferred. For user devices, privacy extensions are recommended. The SLAAC standard accommodates both models.

**Application compatibility**: Most modern software supports IPv6, but edge cases exist. Legacy applications hard-coding IPv4 assumptions, poorly-written parsers expecting dotted-decimal notation, and certain middleware may need updates. Testing dual-stack deployments identifies these issues before production deployment.

**When DHCPv6 might be preferred**:
- Centralized IP address management (IPAM) requirements
- Compliance mandating address audit trails
- Need to distribute DNS servers, NTP servers beyond what RAs provide (though RAs can advertise DNS via RFC 8106)
- Integration with existing DHCPv4 infrastructure and workflows

SLAAC excels when you prioritize:
- Zero infrastructure dependencies (no DHCP server)
- Automatic configuration at scale (hundreds of nodes)
- Fast interface initialization (no DHCP discovery/offer/request/ack round trips)
- Reduced operational complexity

## References

- [RFC 8200: Internet Protocol, Version 6 (IPv6) Specification](https://datatracker.ietf.org/doc/rfc8200/) - Core IPv6 protocol definition
- [RFC 4862: IPv6 Stateless Address Autoconfiguration](https://datatracker.ietf.org/doc/rfc4862/) - SLAAC mechanism
- [RFC 4861: Neighbor Discovery for IP version 6 (IPv6)](https://datatracker.ietf.org/doc/rfc4861/) - NDP protocol enabling SLAAC
- [RFC 5549: Advertising IPv4 Network Layer Reachability Information with an IPv6 Next Hop](https://datatracker.ietf.org/doc/rfc5549/) - IPv4-over-IPv6 for BGP
- [BGP ADR](./bgp.md) - Border Gateway Protocol with IPv6 integration
- [Router Fundamentals](./router-fundamentals.md) - Basic routing concepts
