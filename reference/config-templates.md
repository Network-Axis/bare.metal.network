# Configuration Templates

This page collects commonly used configuration snippets from the course for quick reference.

## FRR BGP (Unnumbered) Template

A basic FRR snippet for a leaf node peering with two spines (AS 65010):
```FRR
router bgp <LEAF_ASN>
  neighbor swp1 interface remote-as 65010
  neighbor swp2 interface remote-as 65010
  !
  address-family ipv6 unicast
    neighbor swp1 activate
    neighbor swp2 activate
```

This assumes two switch ports (swp1, swp2) uplink to spines. It enables IPv6 unicast over those EBGP sessions. For a spine, the configuration is similar but with remote-as of the leaves.

To add BFD (fast failover), define a profile and apply:
```FRR
bfd
 profile fast
  transmit-interval 50
  receive-interval 50
  detect-multiplier 3
!
router bgp <ASN>
  neighbor swp1 interface remote-as <PEER_ASN>
    bfd profile fast
  neighbor swp2 interface remote-as <PEER_ASN>
    bfd profile fast
```

## Talos Control Plane Config Snippet

Talos machine configuration (YAML) for a control plane node might include:

```yaml
systemDisk:
  device: "/dev/sda"
networking:
  hostname: cp1
  interfaces:
    - interface: eth0
      addresses:
        - "fd00:100::1/64"   # Control plane node IP
      neighbors:
        - "fe80::1"          # Spine link-local neighbor (if static routing)
cluster:
  controlPlane:
    init: true
    endpoint: "fd00:100::1"
    nodePortRange: "30000-32767"
```

This is an illustrative subset. It sets a static IPv6 on eth0, marks this node as the first control plane (init: true), and defines an API endpoint.

## Cilium Helm Values (IPv6 + Direct Routing)

To deploy Cilium via Helm, you might use values like:
```yaml
ipv6:
  enabled: true
  allocatePodCIDRs: true
tunnel: "disabled"
autoDirectNodeRoutes: true
bgp:
  enabled: true
  announcePodCIDR: true
  neighbors:
    - peerAddress: "fe80::1"   # example leaf link-local
      peerASN: 65010
      myASN: 65001
```

This enables IPv6, disables tunneling, and turns on the BGP feature to announce the node’s Pod CIDR to a neighbor (like a leaf router). Adjust ASN and addresses per your environment.

## eBPF Program Loader (Skeleton)

If you’re writing a custom eBPF program, you can use the following skeleton in a C file:
```c
#include <linux/bpf.h>
#include <bpf/bpf_helpers.h>
SEC("xdp") int my_prog(struct xdp_md *ctx) {
    // TODO: implement logic
    return XDP_PASS;
}
char _license[] SEC("license") = "GPL";
```

Compile it with clang and load using bpftool or a loader program. Ensure to pin the program (e.g., to /sys/fs/bpf/my_prog) if you need to reference or update it later.

