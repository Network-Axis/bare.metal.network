---
sidebar_position: 15
draft: true
---

# IPv6 Addressing for Cilium BGP

When you configure Cilium's BGP Control Plane to peer with your ToR switches, there's a **critical addressing requirement** you must understand: **Cilium cannot use IPv6 link-local addresses for BGP peering.**

This is different from traditional bare metal networking approaches where link-local addresses (fe80::/10) work seamlessly with FRR's BGP implementation. This document explains why, and how to configure your infrastructure correctly.

## The Critical Constraint

:::danger CRITICAL REQUIREMENT

**Cilium BGP Control Plane requires globally scoped IPv6 addresses** (ULA or GUA) on point-to-point links between Kubernetes nodes and ToR switches.

**Link-local addresses (fe80::/10) will NOT work** due to a Default Gateway Auto-Discovery limitation.

:::

**What this means:**
```yaml
# ❌ INCORRECT - This will fail
# ToR router interface
interface eth3
  ipv6 address fe80::1/64  # Link-local - Cilium DGA fails

# ✅ CORRECT - This works
# ToR router interface
interface eth3
  ipv6 address fd00:10:0:1::1/64  # ULA - Cilium DGA succeeds
```

---

## Why Link-Local Fails

### Technical Explanation

**IPv6 link-local addresses require interface scoping:**

```bash
# Link-local ping REQUIRES interface name
ping6 fe80::1%eth0  # %eth0 specifies which interface

# Without %ifname, the system doesn't know which interface
# (Same fe80::1 address exists on ALL interfaces)
```

**Cilium's Default Gateway Auto-Discovery (DGA) process:**

```
1. Read default route from node's routing table
2. Extract next-hop IPv6 address
3. Establish BGP session to that address
```

**Problem:** When the default route uses link-local next-hop:

```bash
# Node routing table
default via fe80::1 dev eth1  # Link-local gateway

# Cilium DGA attempts to peer with fe80::1
# ❌ FAILS: No interface-scoped neighbor model in BGP CP v2
# DGA doesn't know it should be "fe80::1%eth1"
```

**Result:** BGP session never establishes. Cilium shows peer state as "Idle" indefinitely.

---

### What is DGA (Default Gateway Auto-Discovery)?

DGA is Cilium's feature that automatically discovers BGP peers by reading the node's default route:

```yaml
# CiliumBGPClusterConfig with DGA enabled
apiVersion: cilium.io/v2alpha1
kind: CiliumBGPClusterConfig
spec:
  bgpInstances:
    - name: "as65000"
      localASN: 65000
      peers:
        - name: tor-auto
          peerASN: 65000
          autoDiscovery:
            mode: DefaultGateway  # Read default route
            defaultGateway:
              addressFamily: ipv6  # Expect IPv6 gateway
```

**How DGA works (simplified):**
```python
# Pseudo-code
default_route = read_default_route(ipv6=True)
gateway_ip = default_route.next_hop  # e.g., "fd00:10:0:1::1"
bgp_session = establish_bgp(remote_ip=gateway_ip, remote_as=65000)
```

**Why it needs globally scoped addresses:**
- Gateway IP must be **unambiguous** (not interface-scoped)
- BGP socket binding requires single IP address
- No "%ifname" support in BGP CP v2 architecture

---

## The Solution: ULA Addressing

### What is ULA?

**ULA (Unique Local Address)** is IPv6's equivalent of RFC1918 private addressing (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16).

**ULA Prefix:** `fd00::/8`

**Characteristics:**
- Globally scoped (not interface-scoped like link-local)
- Not routable on the public internet (like RFC1918)
- Locally unique within your organization
- No registration or allocation required

**RFC:** [RFC 4193 - Unique Local IPv6 Unicast Addresses](https://datatracker.ietf.org/doc/html/rfc4193)

---

### Recommended Addressing Scheme

#### Hierarchical ULA Structure

```
fd00::/8                           # ULA prefix (RFC 4193)
  └─ fd00:DC::/32                  # Per-datacenter (DC ID)
       └─ fd00:DC:0:RACK::/56      # Per-rack
            └─ fd00:DC:0:RACK:LINK::/64  # Per-link /64
```

**Example for 3-rack deployment:**

```yaml
# Data center ID: 0x10 (16)
# Rack 1, ToR1-to-Node links
fd00:10:0:1:1::/64   # Rack1-ToR1-Node1
fd00:10:0:1:2::/64   # Rack1-ToR1-Node2
fd00:10:0:1:3::/64   # Rack1-ToR1-Node3

# Rack 1, ToR2-to-Node links (redundant ToR)
fd00:10:0:1:11::/64  # Rack1-ToR2-Node1
fd00:10:0:1:12::/64  # Rack1-ToR2-Node2

# Rack 2
fd00:10:0:2:1::/64   # Rack2-ToR1-Node1
fd00:10:0:2:2::/64   # Rack2-ToR1-Node2
```

#### Loopback Addresses

Use a separate block for loopbacks:

```yaml
# Node loopbacks
fd00:10:0:0::1/128   # Node1
fd00:10:0:0::2/128   # Node2
fd00:10:0:0::3/128   # Node3

# ToR loopbacks
fd00:10:0:0::101/128  # ToR1
fd00:10:0:0::102/128  # ToR2

# Spine loopbacks
fd00:10:0:0::201/128  # Spine1
fd00:10:0:0::202/128  # Spine2
```

---

## Configuration Examples

### ToR Router Configuration (FRR)

```bash
# Physical interface to Kubernetes node
interface eth3
  description "Connection to Node1"
  ipv6 address fd00:10:0:1:1::1/64  # ULA address

  # Optional: Enable Router Advertisements for SLAAC
  ipv6 nd prefix fd00:10:0:1:1::/64
  ipv6 nd ra-interval 30
  no ipv6 nd suppress-ra

# BGP configuration
router bgp 65000
  neighbor CILIUM peer-group
  neighbor CILIUM remote-as 65000

  # Dynamic neighbor discovery from entire /64
  bgp listen range fd00:10:0:1:1::/64 peer-group CILIUM

  address-family ipv6 unicast
    neighbor CILIUM activate
    neighbor CILIUM route-map ACCEPT-PODS in
  exit-address-family
```

**Key points:**
- ✅ ULA address on interface (globally scoped)
- ✅ BGP listen range accepts any IP in /64 (dynamic discovery)
- ✅ Router Advertisements optional (enables SLAAC on nodes)

---

### Kubernetes Node Configuration (Talos Linux)

**Option 1: Static ULA Assignment** (Recommended for labs)

```yaml
# Talos machine config
machine:
  network:
    hostname: node1
    interfaces:
      # Management interface (if separate)
      - interface: eth0
        dhcp: true

      # Fabric interface - Static ULA
      - interface: eth1
        addresses:
          - fd00:10:0:1:1::2/64  # Static ULA
        routes:
          - network: ::/0
            gateway: fd00:10:0:1:1::1  # ToR's ULA
        mtu: 9000  # Jumbo frames for performance
```

**Advantages:**
- ✅ Deterministic addressing (easy to document/troubleshoot)
- ✅ No dependency on Router Advertisements
- ✅ Clear mapping: Node1 always ends in ::2

**Disadvantages:**
- ⚠️ Manual configuration per node
- ⚠️ Must track address assignments

---

**Option 2: SLAAC with ULA Prefix** (Production alternative)

```bash
# ToR configuration (same as above, RA enabled)
interface eth3
  ipv6 address fd00:10:0:1:1::1/64
  ipv6 nd prefix fd00:10:0:1:1::/64  # Advertise ULA prefix
  no ipv6 nd suppress-ra
```

```yaml
# Talos machine config - SLAAC-based
machine:
  network:
    hostname: node1
    interfaces:
      - interface: eth1
        # No static address - SLAAC will configure
        dhcp: false
        # Default route will be learned from RA
```

**How it works:**
1. Node boots, sends Neighbor Solicitation to link-local multicast
2. ToR responds from link-local address with Router Advertisement
3. RA contains ULA prefix: fd00:10:0:1:1::/64
4. Node auto-configures: fd00:10:0:1:1::&lt;random-IID&gt;/64
5. Node installs default route: ::/0 via fd00:10:0:1:1::1 (ULA!)
6. Cilium DGA reads gateway fd00:10:0:1:1::1 (globally scoped) ✅
7. BGP session establishes successfully

**Advantages:**
- ✅ Automatic addressing (true zero-touch)
- ✅ Scales to thousands of nodes

**Disadvantages:**
- ⚠️ Random Interface IDs (less predictable)
- ⚠️ Harder to document specific node addresses

---

### Cilium Configuration

```yaml
# Cilium Helm values
cilium:
  ipv6:
    enabled: true
  ipv4:
    enabled: false  # IPv6-only

  tunnel: "disabled"  # Native routing
  routingMode: "native"

  bgpControlPlane:
    enabled: true

  # Required for binding to TCP/179
  securityContext:
    capabilities:
      ciliumAgent:
        - CAP_NET_BIND_SERVICE
```

**CiliumBGPClusterConfig:**

```yaml
apiVersion: cilium.io/v2alpha1
kind: CiliumBGPClusterConfig
metadata:
  name: bgp-cluster-config
spec:
  nodeSelector:
    matchLabels:
      node-role.kubernetes.io/worker: ""

  bgpInstances:
    - name: "as65000"
      localASN: 65000
      localPort: 179

      peers:
        - name: tor-dga
          peerASN: 65000

          # Default Gateway Auto-Discovery
          # Works because gateway is ULA (fd00:...), not link-local
          autoDiscovery:
            mode: DefaultGateway
            defaultGateway:
              addressFamily: ipv6

          peerConfigRef:
            name: cilium-peer-config
```

**CiliumBGPPeerConfig:**

```yaml
apiVersion: cilium.io/v2alpha1
kind: CiliumBGPPeerConfig
metadata:
  name: cilium-peer-config
spec:
  timers:
    connectRetryTimeSeconds: 5
    holdTimeSeconds: 9       # Fast failover (BGP minimum)
    keepAliveTimeSeconds: 3  # 1/3 of hold time

  families:
    - afi: ipv6
      safi: unicast
      advertisements:
        matchLabels:
          advertise: "pod-cidrs"
```

**CiliumBGPAdvertisement:**

```yaml
apiVersion: cilium.io/v2alpha1
kind: CiliumBGPAdvertisement
metadata:
  name: advertise-pod-cidrs
  labels:
    advertise: "pod-cidrs"
spec:
  advertisements:
    - advertisementType: PodCIDR
```

---

## Verification

### Check Node Configuration

```bash
# On Kubernetes node (Talos)
# Verify ULA address exists
ip -6 addr show dev eth1 | grep "inet6 fd00"
# Expected: inet6 fd00:10:0:1:1::2/64 scope global

# Verify default route uses ULA gateway
ip -6 route show default
# Expected: default via fd00:10:0:1:1::1 dev eth1 metric 1024

# NOT: default via fe80::1 dev eth1  (would fail!)

# Test connectivity to gateway
ping6 -c 3 fd00:10:0:1:1::1
```

### Check Cilium BGP Status

```bash
# BGP peer status
cilium bgp peers
# Expected output:
# Peer              AS    State        Uptime   Prefixes
# fd00:10:0:1:1::1  65000 Established  1h30m    5 received, 1 advertised

# If state is "Idle" or "Active", peering failed
# Check that gateway is ULA, not link-local

# Routes advertised by Cilium
cilium bgp routes advertised ipv6 unicast
# Expected: PodCIDR (e.g., 2001:db8:a::/64)

# Routes received from ToR
cilium bgp routes available ipv6 unicast
```

### Check ToR Router

```bash
# On FRR ToR router
show bgp ipv6 unicast summary
# Expected: Neighbor fd00:10:0:1:1::2 (node) in Established state

# Routes received from Cilium node
show bgp ipv6 unicast neighbors fd00:10:0:1:1::2 routes
# Expected: PodCIDR prefixes

# Verify dynamic neighbor accepted
show bgp ipv6 unicast neighbors
# Should show fd00:10:0:1:1::2 (learned via listen range)
```

---

## Troubleshooting

### Symptom: BGP Peering Stuck in "Idle" State

```bash
cilium bgp peers
# Peer           AS    State  Uptime  Prefixes
# fe80::1        65000 Idle   -       0
```

**Diagnosis:** Default route uses link-local gateway

**Check:**
```bash
ip -6 route show default
# If shows: default via fe80::1 dev eth1
# Problem: Link-local gateway
```

**Solution:** Change node configuration to use ULA gateway (see configuration examples above)

---

### Symptom: "Cannot establish connection to peer"

**Check TCP connectivity:**
```bash
# From node, test if ToR's BGP port is reachable
nc -6 -v fd00:10:0:1:1::1 179
# Expected: Connection succeeded

# If "Connection refused":
# - Check ToR BGP configuration
# - Verify bgp listen range includes node's IP
```

**Check firewall:**
```bash
# On node
ip6tables -L -n -v | grep 179
# Should NOT block outgoing TCP/179

# On ToR (if applicable)
# Verify BGP port is open
```

---

### Symptom: Node Has No ULA Address

```bash
ip -6 addr show dev eth1
# Only shows: inet6 fe80::... scope link
# Missing: inet6 fd00:... scope global
```

**Diagnosis:** Static configuration missing OR SLAAC not working

**Solution for Static:**
```yaml
# Add to Talos machine config
machine:
  network:
    interfaces:
      - interface: eth1
        addresses:
          - fd00:10:0:1:1::2/64
```

**Solution for SLAAC:**
```bash
# On ToR, verify RA configuration
show ipv6 interface eth3
# Should show: ND router advertisements are sent every 30 seconds

# Check RA packets reaching node
tcpdump -i eth1 -n icmp6 and 'icmp6[0] = 134'
# Should see Router Advertisement packets from ToR
```

---

## Link-Local is NOT Eliminated

:::info IMPORTANT CLARIFICATION

Link-local addresses are still used and necessary:

1. **Neighbor Discovery Protocol (NDP)** - NS/NA/RA packets
2. **SLAAC Initial Reachability** - Routers respond from link-local
3. **Local Communication** - Direct communication on same link

**What changes:** Link-local is NOT used for **BGP peering addresses**. The default gateway must be ULA/GUA.

:::

**Traffic flow example:**

```
1. Node boots, has only link-local address: fe80::a4b3:12ff:fe34:5678
2. Sends Neighbor Solicitation to ff02::1 (all-routers multicast)
3. ToR responds from fe80::router (link-local RA source)
4. Node learns prefix fd00:10:0:1:1::/64 from RA
5. Node configures: fd00:10:0:1:1::a4b3:12ff:fe34:5678/64 (ULA)
6. Node installs default route: ::/0 via fd00:10:0:1:1::1 (ULA!)
7. Cilium reads default route, sees ULA gateway ✅
8. BGP session to fd00:10:0:1:1::1 established ✅
```

---

## Comparison: Link-Local vs. ULA

| Aspect | Link-Local (fe80::/10) | ULA (fd00::/8) |
|--------|------------------------|----------------|
| **Scope** | Link-local (interface-scoped) | Global (organization-wide) |
| **Addressing** | Requires %ifname (fe80::1%eth0) | Unambiguous (fd00:10::1) |
| **Configuration** | Auto-generated (SLAAC) | Manual or SLAAC with prefix |
| **Routing** | Not routable | Routable within organization |
| **BGP Peering** | ❌ Fails with Cilium DGA | ✅ Works with Cilium DGA |
| **FRR Support** | ✅ Works | ✅ Works |
| **Zero-Touch** | ✅ Fully automatic | ⚠️ Requires RA prefix or static |

**Recommendation:** Use **ULA for BGP peering** (required by Cilium), link-local still used for NDP.

---

## Summary

:::tip KEY TAKEAWAYS

1. **Cilium BGP CP requires ULA or GUA addresses on P2P links** (not link-local)
2. **Reason:** Default Gateway Auto-Discovery cannot handle interface-scoped addresses
3. **Solution:** Use fd00::/8 (ULA) addressing scheme
4. **Two approaches:** Static ULA (predictable) or SLAAC + ULA prefix (scalable)
5. **Link-local still used:** NDP, SLAAC, local communication (just not BGP peering)

:::

**This is the #1 critical constraint** when deploying Cilium on bare metal with BGP. Plan your addressing scheme accordingly!

---

## Related Topics

- [BGP for Route Advertisement](../01-architecture/bgp.md) - How BGP distributes routing information
- [IPv6 + SLAAC](../01-architecture/ipv6-slaac.md) - Automatic addressing fundamentals
- [Router Fundamentals](../01-architecture/router-fundamentals.md) - Understanding routing tables
