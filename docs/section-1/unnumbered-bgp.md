---
authors: [cassamajor]
draft: true
---

# BGP Unnumbered and Fast Failover (BFD)

Continuing our pure L3 design, we use BGP between all spine-leaf pairs *without assigning any IP addresses to interfaces*. This is accomplished with **BGP Unnumbered**, where neighbors are identified by interface name and IPv6 link-local address.

## Unnumbered BGP Configuration

On a router running FRR, an example BGP config for a leaf might look like:
```shell
router bgp 65001
  neighbor swp1 interface remote-as 65010
  neighbor swp2 interface remote-as 65010
  ! Use IPv6 address family for unnumbered session
  address-family ipv6 unicast
    neighbor swp1 activate
    neighbor swp2 activate
```

Instead of hardcoding neighbor IPs, neighbor `<iface>` interface tells FRR to listen on the given interface for any peer with the specified ASN. The BGP sessions will automatically use the link-local IPv6 addresses on those interfaces (as you saw in the previous section).

:::tip
ECMP Enabled: Because each leaf connects to all spines with the same BGP cost, traffic to a given destination can load-balance across multiple spine paths. BGP selects multiple equal-cost paths, and the Linux kernel (via routing ECMP) will utilize all available uplinks.
:::

## Sub-50ms Failover with BFD

By default, BGP detection of neighbor loss can take several seconds (due to hold timers). To achieve sub-50ms failover, we introduce Bidirectional Forwarding Detection (BFD). BFD is a lightweight protocol that sends rapid heartbeat packets between neighbors, independent of BGP.

In FRR, we configure BFD at the interface neighbor level:

```shell
bfd
 profile fast
  transmit-interval 50
  receive-interval 50
  detect-multiplier 3
!
router bgp 65001
  neighbor swp1 interface remote-as 65010
    bfd profile fast
  neighbor swp2 interface remote-as 65010
    bfd profile fast
```

Here we’ve defined a BFD profile named "fast" that sends packets every 50ms. With a detect multiplier of 3, a neighbor failure is detected in 150ms or less. BGP is linked to this BFD profile for each neighbor interface. If BFD reports the link down, BGP withdraws routes almost immediately, triggering failover to remaining paths.

:::caution
Be careful using very aggressive BFD timers. Ensure your network devices and links can handle the load. 50ms BFD on dozens of neighbors can tax CPU on smaller devices. Always test stability when tuning BFD for fast failover.
:::

With unnumbered BGP sessions and BFD configured, our Section 1 network can achieve high resilience and full multipath throughput. Up next, you’ll put this into practice in the lab by configuring a spine-leaf fabric with these exact settings.