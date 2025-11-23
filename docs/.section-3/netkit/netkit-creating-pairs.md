---
title: Creating Netkit Pairs in Go
authors: [cassamajor]
tags: [netkit, golang, ipv6]
keywords: [netkit, functional options, link-local, vishvananda/netlink]
description: Learn to create netkit device pairs using Go with functional options and automatic IPv6 link-local addressing.
sidebar_position: 3
draft: true
---

# Creating Netkit Pairs in Go

This guide covers the Go implementation for creating and managing netkit device pairs. You'll learn how to design a clean API using functional options, configure IPv6 link-local addressing, and handle resource cleanup correctly.

## Prerequisites

- Linux kernel 6.7+ (netkit support)
- Go 1.21+
- Root privileges (CAP_NET_ADMIN)

## Why Functional Options?

When designing APIs in Go, we face a common challenge: how do we let users customize behavior without creating constructors with many parameters?

Consider the traditional approach:

```go
// This quickly becomes unmanageable
func CreatePair(name string, mode int, scrubPrimary bool, scrubPeer bool, mtu int, ...) (*Pair, error)
```

Callers must remember parameter order, and adding new options breaks existing code.

Functional options solve this elegantly. Each option is a function that modifies configuration:

```go title="netkit/options.go"
package netkit

import "github.com/vishvananda/netlink"

type config struct {
    mode         netlink.NetkitMode
    scrubPrimary netlink.NetkitScrub
    scrubPeer    netlink.NetkitScrub
}

type Option func(*config)

func defaultConfig() *config {
    return &config{
        mode:         netlink.NETKIT_MODE_L3,
        scrubPrimary: netlink.NETKIT_SCRUB_NONE,
        scrubPeer:    netlink.NETKIT_SCRUB_NONE,
    }
}
```

The caller gets readable, self-documenting code:

```go
pair, err := netkit.CreatePair("nk0",
    netkit.WithL3Mode(),
    netkit.WithNoScrub(),
)
```

And you get sensible defaults for anything not explicitly configured. New options can be added without breaking existing callers.

## Configuration Options

### WithL3Mode and WithL2Mode

Netkit supports two operational modes that determine how packets are presented to eBPF programs:

```go title="netkit/options.go"
func WithL2Mode() Option {
    return func(c *config) {
        c.mode = netlink.NETKIT_MODE_L2
    }
}

func WithL3Mode() Option {
    return func(c *config) {
        c.mode = netlink.NETKIT_MODE_L3
    }
}
```

**Why does mode matter?**

- **L2 Mode**: Packets include Ethernet headers. Use when you need MAC addresses or VLAN tags.
- **L3 Mode**: Packets start at the IP layer. More efficient when you only care about IP-level data.

For most CNF use cases, L3 mode is preferred. It reduces packet processing overhead and simplifies your eBPF code.

### WithNoScrub

Scrubbing controls whether netkit preserves packet metadata:

```go title="netkit/options.go"
func WithNoScrub() Option {
    return func(c *config) {
        c.scrubPrimary = netlink.NETKIT_SCRUB_NONE
        c.scrubPeer = netlink.NETKIT_SCRUB_NONE
    }
}
```

**Why disable scrubbing?** When scrubbing is enabled, netkit clears certain packet metadata. For monitoring or debugging, you want all metadata preserved.

## The CreatePair Function

The core function applies options to defaults and creates the netkit pair:

```go title="netkit/netkit.go"
package netkit

import (
    "fmt"
    "syscall"

    "github.com/vishvananda/netlink"
    "golang.org/x/sys/unix"
)

type Pair struct {
    Primary    netlink.Link
    Peer       netlink.Link
    PrimaryIdx int
    PeerIdx    int
}

func CreatePair(name string, opts ...Option) (*Pair, error) {
    if name == "" {
        return nil, fmt.Errorf("netkit: device name cannot be empty")
    }

    cfg := defaultConfig()
    for _, opt := range opts {
        opt(cfg)
    }

    // Create netkit link
    attrs := netlink.NewLinkAttrs()
    attrs.Name = name

    // Set up peer attributes with "p" suffix convention
    // (e.g., "nk0" primary -> "nk0p" peer, similar to veth naming)
    peerName := name + "p"
    peerAttrs := netlink.NewLinkAttrs()
    peerAttrs.Name = peerName

    primary := &netlink.Netkit{
        LinkAttrs: attrs,
        Mode:      cfg.mode,
        Scrub:     cfg.scrubPrimary,
        PeerScrub: cfg.scrubPeer,
    }
    primary.SetPeerAttrs(&peerAttrs)

    if err := netlink.LinkAdd(primary); err != nil {
        return nil, fmt.Errorf("netkit: failed to create primary %q: %w", name, err)
    }

    // Setup cleanup in case of failure
    var cleanupPrimary = true
    defer func() {
        if cleanupPrimary {
            netlink.LinkDel(primary)
        }
    }()

    // Get the peer link (created automatically by netkit)
    peer, err := netlink.LinkByName(peerName)
    if err != nil {
        return nil, fmt.Errorf("netkit: failed to find peer %q: %w", peerName, err)
    }

    // Bring up primary interface
    if err := netlink.LinkSetUp(primary); err != nil {
        return nil, fmt.Errorf("netkit: failed to bring up primary: %w", err)
    }

    // Bring up peer interface
    if err := netlink.LinkSetUp(peer); err != nil {
        return nil, fmt.Errorf("netkit: failed to bring up peer: %w", err)
    }

    cleanupPrimary = false

    return &Pair{
        Primary:    primary,
        Peer:       peer,
        PrimaryIdx: primary.Attrs().Index,
        PeerIdx:    peer.Attrs().Index,
    }, nil
}
```

### Understanding the Cleanup Guard

The `cleanupPrimary` boolean pattern deserves special attention:

```go
var cleanupPrimary = true
defer func() {
    if cleanupPrimary {
        netlink.LinkDel(primary)
    }
}()

// ... operations that might fail ...

cleanupPrimary = false
return &Pair{...}, nil
```

**Why this pattern?** If any operation after creating the primary fails (finding the peer, bringing up interfaces), we need to delete the primary to avoid orphan devices. But if everything succeeds, we don't want to delete it. The boolean guard lets the defer run conditionally.

### Naming Convention

The peer naming convention (`name + "p"`) mirrors veth pairs:

- Primary: `nk0`
- Peer: `nk0p`

This convention is explicit in the code through `SetPeerAttrs()`:

```go
peerName := name + "p"
peerAttrs := netlink.NewLinkAttrs()
peerAttrs.Name = peerName
primary.SetPeerAttrs(&peerAttrs)
```

**Why not let the kernel auto-name?** Explicit naming makes the code more predictable. You always know the peer name without querying the kernel.

## IPv6 Link-Local Configuration

### Why Link-Local Addresses?

Link-local addresses (fe80::/64) are automatically scoped to a single network segment. They're ideal for testing because:

- No coordination with external networks needed
- No DHCP or router advertisement required
- Automatically confined to the interface

### Generating Random Interface IDs

Traditional link-local addresses derive the Interface ID from the MAC address using EUI-64. But netkit devices in L3 mode may not have real MAC addresses. Random IIDs work universally:

```go title="netkit/ipv6.go"
package netkit

import (
    "crypto/rand"
    "fmt"
    "net"

    "github.com/vishvananda/netlink"
)

// ConfigureIPv6LinkLocal assigns IPv6 link-local addresses to both
// primary and peer interfaces using random Interface IDs (IIDs).
func (p *Pair) ConfigureIPv6LinkLocal() error {
    if err := p.assignLinkLocal(p.Primary); err != nil {
        return fmt.Errorf("primary: %w", err)
    }

    if err := p.assignLinkLocal(p.Peer); err != nil {
        return fmt.Errorf("peer: %w", err)
    }

    return nil
}

func (p *Pair) assignLinkLocal(link netlink.Link) error {
    // Generate a link-local address (fe80::/64)
    // Using random IID since netkit may not have real MAC addresses
    addr, err := generateLinkLocalAddr()
    if err != nil {
        return err
    }

    // Create netlink address object
    nlAddr := &netlink.Addr{
        IPNet: &net.IPNet{
            IP:   addr,
            Mask: net.CIDRMask(64, 128),
        },
    }

    // Add address to interface
    if err := netlink.AddrAdd(link, nlAddr); err != nil {
        return fmt.Errorf("failed to add address: %w", err)
    }

    return nil
}

func generateLinkLocalAddr() (net.IP, error) {
    // fe80::/64 prefix
    addr := make(net.IP, 16)
    addr[0] = 0xfe
    addr[1] = 0x80

    // Random Interface ID (last 64 bits)
    iid := make([]byte, 8)
    if _, err := rand.Read(iid); err != nil {
        return nil, fmt.Errorf("failed to generate random IID: %w", err)
    }

    copy(addr[8:], iid)

    return addr, nil
}
```

**Why crypto/rand instead of math/rand?** For network addresses, predictability could be a security concern. Using `crypto/rand` ensures unpredictable IIDs.

## Deleting Netkit Pairs

Clean deletion is essential for avoiding resource leaks:

```go title="netkit/netkit.go"
func (p *Pair) Delete() error {
    if p == nil || p.Primary == nil {
        return nil
    }

    // Deleting primary automatically deletes peer
    if err := netlink.LinkDel(p.Primary); err != nil {
        // Ignore "not found" errors (idempotent)
        if err == unix.ENODEV || err == syscall.ENODEV {
            return nil
        }
        return fmt.Errorf("netkit: failed to delete: %w", err)
    }

    return nil
}
```

**Why only delete primary?** Netkit pairs are linked: deleting the primary automatically deletes the peer. Trying to delete both would cause errors.

**Why check for ENODEV?** This makes deletion idempotent. If someone else already deleted the device, or you call Delete() twice, the function succeeds silently.

## Resource Cleanup with defer

Go's `defer` executes in LIFO (last-in, first-out) order. This is exactly what we need for resource cleanup: release resources in reverse order of acquisition.

When using netkit with eBPF, the typical setup and cleanup looks like this:

```go title="main.go"
func run(deviceName string) error {
    // 1. Remove memlock first (needed for eBPF)
    if err := rlimit.RemoveMemlock(); err != nil {
        return err
    }

    // 2. Create netkit pair
    pair, err := netkit.CreatePair(deviceName, netkit.WithL3Mode())
    if err != nil {
        return err
    }
    defer pair.Delete()  // Will execute LAST

    // 3. Load eBPF objects
    var objs bytecode.NetkitObjects
    if err := bytecode.LoadNetkitObjects(&objs, nil); err != nil {
        return err
    }
    defer objs.Close()  // Will execute THIRD

    // 4. Attach to primary
    primaryLink, err := link.AttachNetkit(link.NetkitOptions{...})
    if err != nil {
        return err
    }
    defer primaryLink.Close()  // Will execute SECOND

    // 5. Open ringbuf reader
    rd, err := ringbuf.NewReader(objs.Ipv6Events)
    if err != nil {
        return err
    }
    defer rd.Close()  // Will execute FIRST

    // ... use resources
    return nil
}
```

**Why does order matter?** If we deleted the netkit pair before closing the eBPF link, the kernel would complain about attached programs on a deleted interface. By closing the link first (defer LIFO), we detach cleanly.

The cleanup sequence is:

1. Close ringbuf reader (stop reading events)
2. Close eBPF links (detach programs)
3. Close eBPF objects (free kernel resources)
4. Delete netkit pair (remove interfaces)

## Complete Usage Example

Here's how everything comes together:

```go title="main.go"
package main

import (
    "log"

    "github.com/cassamajor/xcnf/examples/netkit-ipv6/netkit"
)

func main() {
    // Create pair with functional options
    pair, err := netkit.CreatePair("nk0",
        netkit.WithL3Mode(),
        netkit.WithNoScrub(),
    )
    if err != nil {
        log.Fatal(err)
    }
    defer pair.Delete()

    // Configure IPv6 link-local addresses
    if err := pair.ConfigureIPv6LinkLocal(); err != nil {
        log.Fatal(err)
    }

    log.Printf("Created netkit pair:")
    log.Printf("  Primary: %s (index %d)", pair.Primary.Attrs().Name, pair.PrimaryIdx)
    log.Printf("  Peer: %s (index %d)", pair.Peer.Attrs().Name, pair.PeerIdx)

    // Keep running (in real code, you'd do something with the pair)
    select {}
}
```

## Troubleshooting

**"operation not permitted"**: Need root privileges. Run with `sudo`.

**"netkit not supported"**: Requires kernel 6.7+. Check with `uname -r`.

**"file exists"**: A netkit device with that name already exists. Delete it first with `ip link del nk0`.

**Race condition finding peer**: The kernel creates the peer asynchronously. If `LinkByName` fails, the peer might not exist yet. The current implementation handles this by creating primary and peer atomically via `SetPeerAttrs()`.

## Next Steps

Now that you can create netkit pairs, learn how to attach eBPF programs for packet inspection:

- [Attaching eBPF Programs to Netkit](/docs/section-3/netkit/netkit-attaching-programs) - CO-RE portability, ringbuf events, and kernel hooks

## References

- [Netkit Kernel Documentation](https://docs.kernel.org/next/networking/netkit.html)
- [vishvananda/netlink](https://github.com/vishvananda/netlink)
- [Go Functional Options Pattern](https://dave.cheney.net/2014/10/17/functional-options-for-friendly-apis)
- [IPv6 Link-Local Addresses (RFC 4291)](https://datatracker.ietf.org/doc/html/rfc4291)
- [Source Code](https://github.com/cassamajor/xcnf/tree/main/examples/netkit-ipv6)
