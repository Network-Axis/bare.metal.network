---
sidebar_position: 10
---

# Why Kubernetes Doesn't Need EVPN

When you run `kubectl get pods -o wide` and see pods with different IP addresses communicating across nodes, you might wonder: **how does the network know where to send packets?** In traditional VM-based data centers, this problem was solved with EVPN (Ethernet VPN) - a protocol that advertises MAC addresses and creates Layer 2 overlays across a Layer 3 fabric.

**Kubernetes takes a fundamentally different approach.** Instead of Layer 2 overlays, Kubernetes operates at **pure Layer 3** with IP routing. This architectural decision eliminates the need for EVPN entirely.

## The Problem EVPN Solved (for VMs)

### VM-Based Data Center Challenges

Imagine a data center running virtual machines:

```
┌─────────────────────┐          ┌─────────────────────┐
│ Host 1              │          │ Host 2              │
│ ┌─────────────────┐ │          │ ┌─────────────────┐ │
│ │ VM-A            │ │          │ │ VM-B            │ │
│ │ MAC: aa:bb:...  │ │          │ │ MAC: cc:dd:...  │ │
│ │ IP: 10.1.0.10   │ │          │ │ IP: 10.1.0.20   │ │
│ └─────────────────┘ │          │ └─────────────────┘ │
└──────────┬──────────┘          └──────────┬──────────┘
           │                                │
           │   Layer 3 Fabric (IP routing)  │
           └────────────────────────────────┘
```

**Problem:** VM-A needs to send an Ethernet frame to VM-B (same subnet, 10.1.0.0/24). But the fabric between hosts only understands IP routing, not Ethernet frames.

**Traditional Solution:** Create a **Layer 2 overlay** using VXLAN tunnels:

```
VM-A sends Ethernet frame (MAC aa:bb → MAC cc:dd)
   ↓
Host 1 encapsulates in VXLAN (UDP tunnel)
   ↓
IP fabric routes UDP packet: Host1 IP → Host2 IP
   ↓
Host 2 decapsulates VXLAN, extracts Ethernet frame
   ↓
VM-B receives original frame (MAC aa:bb → MAC cc:dd)
```

**EVPN's Role:** Automatically advertise which MAC addresses are reachable via which VXLAN tunnel. No manual configuration needed.

### EVPN Benefits for VMs

1. **VM Mobility:** Move VMs between hosts without changing IP addresses
2. **Multi-Tenancy:** VNI (VXLAN Network Identifier) segments provide isolation
3. **MAC Learning:** Automatic MAC address discovery via BGP Type 2 routes
4. **Heterogeneous Resources:** Connect VMs, containers, and bare-metal servers in same L2 network

---

## How Kubernetes is Different

### Kubernetes Network Model

Kubernetes makes a **radical simplification**: **All pods get routable IP addresses.** No MAC addresses in policies, no Layer 2 switching, just pure IP routing.

```
┌─────────────────────┐          ┌─────────────────────┐
│ Node 1              │          │ Node 2              │
│ PodCIDR:            │          │ PodCIDR:            │
│ 2001:db8:a::/64     │          │ 2001:db8:b::/64     │
│                     │          │                     │
│ ┌─────────────────┐ │          │ ┌─────────────────┐ │
│ │ Pod A           │ │          │ │ Pod B           │ │
│ │ IP: 2001:db8:a::10 │          │ │ IP: 2001:db8:b::20 │
│ └─────────────────┘ │          │ └─────────────────┘ │
└──────────┬──────────┘          └──────────┬──────────┘
           │                                │
           │   BGP Fabric (IP routing)      │
           │   Node1 advertises 2001:db8:a::/64 →
           │   Node2 advertises 2001:db8:b::/64 →
           └────────────────────────────────┘
```

**How it works:**
1. Each Kubernetes node gets a **PodCIDR** block (e.g., a /64 IPv6 prefix)
2. Node advertises its PodCIDR via **BGP** to the ToR switch
3. Pod A sends IP packet to Pod B (2001:db8:a::10 → 2001:db8:b::20)
4. Underlay fabric routes packet based on **destination IP prefix**
5. Packet arrives at Node 2, delivered to Pod B

**No VXLAN encapsulation. No MAC address learning. Just IP routing.**

---

## What Replaces EVPN in Kubernetes?

### 1. Layer 2 Overlay → Pure Layer 3 Routing

**EVPN (VMs):**
```
VM sends Ethernet frame
   → VXLAN encapsulation
   → UDP tunnel across fabric
   → VXLAN decapsulation
   → Ethernet frame delivered
```

**Kubernetes (Cilium native routing):**
```
Pod sends IP packet
   → Direct routing via underlay BGP
   → IP packet delivered (no encapsulation!)
```

**Cilium Configuration:**
```yaml
cilium:
  tunnel: "disabled"  # No VXLAN overlay
  routingMode: "native"  # Use underlay routing
```

**Result:** Lower latency (no encap/decap), lower CPU (no tunnel overhead), simpler debugging (standard IP routing).

---

### 2. MAC Address Learning → Identity-Based Policies

**EVPN (VMs):**
```yaml
# Policy based on MAC address or VLAN
firewall rule: permit MAC aa:bb:cc:dd:ee:ff → MAC 11:22:33:44:55:66
```

**Problem:** MAC addresses are ephemeral - VMs get new MACs when recreated.

**Kubernetes (CiliumNetworkPolicy):**
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-frontend-to-backend
spec:
  endpointSelector:
    matchLabels:
      role: backend  # Identity from label, not MAC
  ingress:
    - fromEndpoints:
        - matchLabels:
            role: frontend  # Source identified by label
```

**Result:** Policies based on **pod labels** (immutable identity), not IP addresses or MAC addresses. Policies automatically follow pods as they scale or restart.

---

### 3. Multi-Tenancy (VNI) → Kubernetes Namespaces + NetworkPolicy

**EVPN (VMs):**
```
Tenant A → VNI 10001 → Separate VXLAN tunnel
Tenant B → VNI 10002 → Separate VXLAN tunnel

Isolation: Different VNIs cannot communicate
```

**Kubernetes:**
```yaml
# Tenant A in namespace "tenant-a"
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: isolate-tenant-a
  namespace: tenant-a
spec:
  endpointSelector: {}  # All pods in namespace
  ingress:
    - fromEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: tenant-a
  # Default: Deny from other namespaces
```

**Result:** Namespace-based isolation with L3-L7 policy enforcement (HTTP, gRPC, DNS). More flexible than VNI segmentation.

---

### 4. VM Mobility → Pod Lifecycle Management

**EVPN (VMs):**
```
VM migrates from Host1 to Host2
   → EVPN advertises new MAC location via BGP
   → Traffic automatically redirected
   → IP address stays the same
```

**Kubernetes:**
```
Pod deleted from Node1, recreated on Node2
   → New IP address allocated from Node2's PodCIDR
   → Service VIP remains stable (load balancer updates backend list)
   → Applications connect via Service, not Pod IP
```

**Key Insight:** Kubernetes applications don't care about individual pod IPs. They connect via **Services** (stable VIPs that load-balance across pods).

**Example:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  selector:
    app: backend  # Automatically includes all backend pods
  ports:
    - port: 8080
```

**Result:** Pod can restart with new IP, Service VIP stays stable. **No VM mobility needed.**

---

## When You WOULD Use EVPN

EVPN is still valuable for **heterogeneous environments** where you need Layer 2 connectivity across different resource types:

### Use Case 1: Mixed VM + Container + Bare Metal

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ VM (KVM)     │     │ Container    │     │ Bare Metal   │
│ MAC: aa:bb.. │────→│ MAC: cc:dd.. │────→│ Server       │
│ IP: 10.1.0.10│     │ IP: 10.1.0.20│     │ IP: 10.1.0.30│
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                     │
       └────────────────────┴─────────────────────┘
                EVPN L2 Overlay (same subnet)
```

**Example:** Migrating legacy application from bare metal → VM → container while maintaining same IP addressing.

### Use Case 2: Layer 2 Network Appliances

Firewalls, load balancers, or legacy apps that require:
- ARP (Address Resolution Protocol)
- Broadcast/multicast within VLAN
- Transparent bridging

**In pure Kubernetes:** These requirements don't exist. All communication is routed IP.

---

## Architecture Comparison

| Aspect | EVPN (VM Data Center) | Kubernetes + Cilium |
|--------|----------------------|---------------------|
| **Layer** | L2 overlay (VXLAN) over L3 fabric | Pure L3 routing |
| **Addressing** | MAC addresses + IP addresses | IP addresses only |
| **Policy** | MAC/VLAN-based | Label-based identity |
| **Multi-Tenancy** | VNI segmentation | Namespaces + NetworkPolicy |
| **Mobility** | EVPN MAC mobility | Service VIP abstraction |
| **Protocol** | BGP EVPN (Type 2, Type 5 routes) | BGP PodCIDR advertisement |
| **Complexity** | High (MAC learning, VXLAN, VNI) | Lower (IP routing only) |
| **Performance** | Encap/decap overhead | Native routing (no overhead) |

---

## Benefits of L3-Only Kubernetes

### 1. Simplicity

**No VXLAN configuration:**
```yaml
# Just enable native routing
cilium:
  tunnel: "disabled"
  routing Mode: "native"
```

**No VNI management, no bridge configuration, no MAC address tracking.**

### 2. Performance

```
EVPN Path:
Pod → veth → bridge → VXLAN encap → IP routing → VXLAN decap → bridge → veth → Pod
   |_______________  ~15-20% CPU overhead  _______________|

Cilium Native Routing:
Pod → eBPF program → IP routing → eBPF program → Pod
   |_______  <5% CPU overhead  _______|
```

**Measured impact:**
- ~10-15% higher throughput (no encap/decap)
- ~50% lower latency (fewer hops)
- ~70% lower CPU usage (eBPF vs. kernel stack)

### 3. Observability

**EVPN debugging:**
```bash
# Layer 2: Check bridge FDB
bridge fdb show | grep vxlan

# Layer 3: Check EVPN routes
show bgp l2vpn evpn

# Tunnel: Check VXLAN interfaces
ip -d link show type vxlan

# Where is the problem?
```

**Cilium debugging:**
```bash
# Just check IP routes
cilium bgp routes advertised ipv6 unicast

# Flow visibility
hubble observe --from-pod frontend --to-pod backend

# Clear Layer 3 path
```

### 4. Standards Compliance

Kubernetes network model is **defined by the CNI (Container Network Interface) spec:**

- ✅ All pods get unique IP addresses
- ✅ Pods can communicate without NAT
- ✅ Nodes can communicate with pods without NAT
- ✅ Pod sees its own IP address (no address translation)

**EVPN is not required to meet these requirements.** Pure L3 routing satisfies all CNI guarantees.

---

## Technical Deep-Dive: How Cilium Replaces EVPN

### Cilium BGP Control Plane (Replaces EVPN Route Advertisement)

**EVPN Type 2 Route (MAC/IP Advertisement):**
```
Router advertises: "MAC aa:bb:cc is reachable via VXLAN tunnel to VTEP 10.0.0.1"
```

**Cilium BGP Advertisement (IP Prefix):**
```yaml
apiVersion: cilium.io/v2alpha1
kind: CiliumBGPAdvertisement
metadata:
  name: advertise-pod-cidrs
spec:
  advertisements:
    - advertisementType: PodCIDR
      # Advertises: "Prefix 2001:db8:a::/64 is reachable via this node"
```

**Result:** ToR switch knows `2001:db8:a::/64` → Node1, routes packets accordingly.

---

### eBPF Programs (Replace VXLAN Encapsulation)

**EVPN (Kernel VXLAN):**
```c
// Kernel net/vxlan.c
static netdev_tx_t vxlan_xmit(struct sk_buff *skb, ...) {
    // 1. Look up destination MAC in FDB
    // 2. Find VTEP IP for that MAC
    // 3. Add outer IP header (Host1 → Host2)
    // 4. Add UDP header (port 4789)
    // 5. Add VXLAN header (VNI)
    // 6. Transmit encapsulated packet
}
```

**Cilium (eBPF):**
```c
SEC("tc")
int handle_xmit(struct __sk_buff *skb) {
    // 1. Extract destination IP from packet
    // 2. Check routing table (eBPF map)
    // 3. Rewrite source MAC to node MAC
    // 4. Rewrite destination MAC to next-hop MAC
    // 5. Forward to physical interface
    // NO encapsulation!
}
```

**Performance difference:**
- EVPN: ~2000 CPU cycles per packet (encap/decap)
- Cilium: ~300 CPU cycles per packet (direct forwarding)

---

## Migration Path: EVPN → Cilium

If you're running EVPN-based infrastructure today and want to migrate to Kubernetes + Cilium:

### Phase 1: Coexistence

Run both models simultaneously:

```
┌─────────────────────────────────────────────┐
│ EVPN Network (VMs, legacy apps)            │
│ VNI 10001, VXLAN tunnels                   │
└──────────────┬──────────────────────────────┘
               │
               │ L3 Gateway (routes between overlay/underlay)
               │
┌──────────────▼──────────────────────────────┐
│ Kubernetes Network (Cilium native routing) │
│ PodCIDR 2001:db8::/48, BGP advertisement   │
└─────────────────────────────────────────────┘
```

**L3 Gateway Configuration:**
```yaml
# CiliumEgressGatewayPolicy - route to legacy network
apiVersion: cilium.io/v2
kind: CiliumEgressGatewayPolicy
spec:
  selectors:
    - podSelector:
        matchLabels:
          legacy-access: "true"
  destinationCIDRs:
    - "10.1.0.0/16"  # Legacy EVPN network
  egressGateway:
    nodeSelector:
      matchLabels:
        gateway: "true"
```

### Phase 2: Gradual Migration

1. Deploy new services on Kubernetes (pure L3)
2. Migrate stateless applications from VMs → containers
3. Use Services as stable VIPs during migration
4. Retire EVPN segments as VMs are decommissioned

### Phase 3: Pure L3

Once all workloads in Kubernetes:
```yaml
cilium:
  tunnel: "disabled"  # Pure L3, no EVPN/VXLAN
  bgpControlPlane:
    enabled: true  # Advertise PodCIDRs
```

---

## Summary

**EVPN solved important problems for VM-based data centers:**
- Layer 2 overlay across Layer 3 fabric
- MAC address learning and mobility
- Multi-tenancy via VNI segmentation

**Kubernetes eliminates those problems by design:**
- Pure Layer 3 IP routing (no Layer 2 overlay needed)
- Identity-based policies (no MAC addresses)
- Namespace isolation (no VNI needed)
- Service abstraction (no VM mobility needed)

**Result:** Simpler, faster, more observable networking. **EVPN is not required for Kubernetes.**

---

## Related Topics

- [BGP for Route Advertisement](./bgp.md) - How Kubernetes advertises PodCIDRs
- [Router Fundamentals](./router-fundamentals.md) - Understanding routing tables and control planes
- [IPv6 + SLAAC](./ipv6-slaac.md) - Automatic addressing in Kubernetes
