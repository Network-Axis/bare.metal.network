---
title: Attaching eBPF Programs to Netkit
authors: [cassamajor]
tags: [netkit, ebpf, golang, cilium-ebpf]
keywords: [netkit, CO-RE, ringbuf, cilium/ebpf, bpf2go]
description: Attach eBPF programs to netkit hooks and stream kernel events to userspace using ringbuf.
sidebar_position: 4
draft: true
---

# Attaching eBPF Programs to Netkit

This guide covers the eBPF side of netkit monitoring: writing portable programs with CO-RE, loading them with cilium/ebpf, attaching to netkit hooks, and streaming events to userspace with ring buffers.

## Prerequisites

- Linux kernel 6.7+ (netkit support)
- Linux kernel 5.8+ (ringbuf support)
- clang/llvm (for eBPF compilation)
- Go 1.21+
- bpftool (for generating vmlinux.h)

## CO-RE: Write Once, Run Everywhere

### The Kernel Compatibility Problem

One of eBPF's biggest challenges is kernel compatibility. The kernel's internal structures change between versions. A field at offset 24 in kernel 6.1 might be at offset 32 in kernel 6.8.

Traditionally, eBPF programs needed to be compiled specifically for each kernel version. You'd either:

- Ship pre-compiled binaries for every kernel version (impossible to maintain)
- Compile on the target machine (requires development tools in production)

CO-RE (Compile Once - Run Everywhere) solves this fundamental problem.

### How CO-RE Works

CO-RE uses BTF (BPF Type Format) information embedded in modern kernels (5.2+). When you compile your eBPF program with `-g` (debug info), the compiler records which fields you're accessing and their expected layout.

At load time, the cilium/ebpf library reads the running kernel's BTF and relocates field accesses to match actual offsets. Your program adapts automatically.

### vmlinux.h: A Complete Kernel Header

Instead of including dozens of kernel headers, use `vmlinux.h` - a single file generated from BTF containing every kernel type definition:

```c title="bytecode/netkit_ipv6.c"
//go:build ignore

#include "vmlinux.h"
#include <linux/if_link.h>
#include <linux/if_ether.h>
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_endian.h>
#include <bpf/bpf_core_read.h>
```

Generate `vmlinux.h` from your kernel:

```bash
bpftool btf dump file /sys/kernel/btf/vmlinux format c > vmlinux.h
```

**Why not just include kernel headers?** Kernel headers are designed for kernel development, not eBPF. They pull in dependencies that don't compile for BPF targets and may conflict with libbpf helpers.

### BPF_CORE_READ: Safe Field Access

When accessing kernel structure fields, use `BPF_CORE_READ()` instead of direct pointer dereference:

```c
// Without CO-RE (breaks on different kernels)
event->next_header = ip6->nexthdr;

// With CO-RE (works across kernels)
event->next_header = BPF_CORE_READ(ip6, nexthdr);
```

The macro generates BTF relocations that adjust field offsets at load time.

**Why does this matter?** Your netkit IPv6 monitor will run on any kernel with BTF support (5.2+), without recompilation. This is essential for distributing eBPF programs in containers or across heterogeneous clusters.

## Ring Buffer for Events

### Why Ring Buffer Over Perf Buffer?

eBPF programs run in kernel space but often need to send data to userspace. Linux provides two main mechanisms: perf buffers and ring buffers.

Ring buffers (introduced in kernel 5.8) solve several problems with perf buffers:

| Feature | Perf Buffer | Ring Buffer |
|---------|-------------|-------------|
| Memory efficiency | Per-CPU buffers (wastes memory) | Single shared buffer |
| Event ordering | No ordering guarantees | Preserves ordering |
| Variable-size events | Complex | Native support |
| Memory allocation | Can fail silently | Reserve-or-fail semantic |

For most use cases, ring buffers are the better choice.

### Defining the Ring Buffer Map

In your eBPF program, define the ringbuf map:

```c title="bytecode/netkit_ipv6.c"
struct {
    __uint(type, BPF_MAP_TYPE_RINGBUF);
    __uint(max_entries, 256 * 1024);  // 256KB buffer
} ipv6_events SEC(".maps");
```

**Why 256KB?** This is a reasonable default for moderate traffic. Too small and you lose events; too large wastes memory. Adjust based on your traffic volume and event size.

### Event Structure Design

Define what data you send to userspace. The structure must be packed to ensure consistent memory layout across C and Go:

```c title="bytecode/netkit_ipv6.c"
struct ipv6_event {
    __u8 src_addr[16];     // bytes 0-15
    __u8 dst_addr[16];     // bytes 16-31
    __u8 next_header;      // byte 32
    __u16 payload_len;     // bytes 33-34
    __u8 hop_limit;        // byte 35
    __u8 direction;        // byte 36
} __attribute__((packed));  // Total: 37 bytes
```

**Why packed?** Without `__attribute__((packed))`, the compiler may insert padding for alignment. On a 64-bit system, `payload_len` (a 16-bit value) might get padded to an 8-byte boundary, wasting space and causing Go to parse wrong offsets.

### The Reserve-Submit Pattern

To send an event, follow the reserve-submit pattern:

```c title="bytecode/netkit_ipv6.c"
// Reserve space in the buffer
struct ipv6_event *event = bpf_ringbuf_reserve(&ipv6_events,
                                                sizeof(*event), 0);
if (!event)
    return NETKIT_PASS;  // Buffer full, gracefully skip

// Fill in the event data
event->direction = direction;
__builtin_memcpy(event->src_addr, &ip6->saddr, 16);
__builtin_memcpy(event->dst_addr, &ip6->daddr, 16);
event->next_header = BPF_CORE_READ(ip6, nexthdr);
event->payload_len = bpf_ntohs(BPF_CORE_READ(ip6, payload_len));
event->hop_limit = BPF_CORE_READ(ip6, hop_limit);

// Make the event visible to userspace
bpf_ringbuf_submit(event, 0);
```

**Why this pattern?** You get a pointer to pre-allocated memory in the buffer, fill it in, then submit. This is more efficient than copying data into a temporary variable and then into the buffer.

**What if reserve fails?** The buffer is full. In this example, we pass the packet through and lose the event. In production, you might increment a counter to track dropped events.

## Writing the eBPF Program

### Packet Parsing with Bounds Checks

The eBPF verifier requires proof that every memory access is valid. You must check bounds before accessing any header:

```c title="bytecode/netkit_ipv6.c"
static __always_inline int process_ipv6(struct __sk_buff *skb, __u8 direction) {
    void *data_end = (void *)(long)skb->data_end;
    void *data = (void *)(long)skb->data;

    struct ethhdr *eth = data;

    // Bounds check for Ethernet header
    if ((void *)(eth + 1) > data_end)
        return NETKIT_PASS;

    // Check for IPv6 (ethertype 0x86DD)
    if (eth->h_proto != bpf_htons(ETH_P_IPV6))
        return NETKIT_PASS;

    struct ipv6hdr *ip6 = (void *)(eth + 1);

    // Bounds check for IPv6 header
    if ((void *)(ip6 + 1) > data_end)
        return NETKIT_PASS;

    // Now safe to access ip6 fields
    // ...
}
```

**Why `(void *)(eth + 1)`?** Pointer arithmetic on struct pointers advances by the struct size. `eth + 1` points to the byte after the Ethernet header, which is where IPv6 starts.

**Why check before every access?** The verifier tracks what memory regions are proven safe. Each new header level needs its own bounds check.

### Section Names for Netkit Hooks

Netkit provides two attachment points: primary and peer. Use `SEC()` to specify which hook:

```c title="bytecode/netkit_ipv6.c"
SEC("netkit/primary")
int netkit_primary(struct __sk_buff *skb) {
    return process_ipv6(skb, 0);
}

SEC("netkit/peer")
int netkit_peer(struct __sk_buff *skb) {
    return process_ipv6(skb, 1);
}

char _license[] SEC("license") = "GPL";
```

The direction parameter (0 for primary, 1 for peer) lets userspace distinguish which interface saw the packet.

### Return Values

Netkit programs return one of three values:

- `NETKIT_PASS`: Continue processing through the network stack
- `NETKIT_DROP`: Drop the packet
- `NETKIT_REDIRECT`: Redirect to another interface

For a monitoring program, always return `NETKIT_PASS` to avoid disrupting traffic.

## Code Generation with bpf2go

### The Generate Directive

Create a `gen.go` file with the bpf2go directive:

```go title="bytecode/gen.go"
package bytecode

//go:generate go tool bpf2go -cc clang -cflags "-O2 -g -Wall -Werror" -target amd64,arm64 Netkit netkit_ipv6.c
```

This generates:
- `netkit_x86_bpfel.go` - Little-endian x86 bindings
- `netkit_arm64_bpfel.go` - Little-endian ARM64 bindings

Run generation with:

```bash
go generate ./bytecode
```

### Understanding Generated Types

bpf2go creates Go types matching your eBPF definitions:

```go
// Generated types (simplified)
type NetkitObjects struct {
    NetkitPrimary *ebpf.Program  // The netkit/primary program
    NetkitPeer    *ebpf.Program  // The netkit/peer program
    Ipv6Events    *ebpf.Map      // The ringbuf map
}

func LoadNetkitObjects(objs *NetkitObjects, opts *ebpf.CollectionOptions) error
```

The names are derived from your C code: `netkit_primary` becomes `NetkitPrimary`, `ipv6_events` becomes `Ipv6Events`.

## Loading and Attaching from Go

### Removing the Memlock Limit

eBPF maps consume locked memory. Modern kernels require removing the memlock limit:

```go title="main.go"
import "github.com/cilium/ebpf/rlimit"

func run(deviceName string) error {
    if err := rlimit.RemoveMemlock(); err != nil {
        return fmt.Errorf("removing memlock: %w", err)
    }
    // ...
}
```

**Why is this needed?** eBPF maps are pinned in kernel memory. The default memlock limit (often 64KB) is too small for useful maps.

### Loading eBPF Objects

Load the compiled eBPF programs and maps:

```go title="main.go"
import "github.com/cassamajor/xcnf/examples/netkit-ipv6/bytecode"

var objs bytecode.NetkitObjects
if err := bytecode.LoadNetkitObjects(&objs, nil); err != nil {
    return fmt.Errorf("loading eBPF objects: %w", err)
}
defer objs.Close()
```

The `LoadNetkitObjects` function:
1. Reads the embedded eBPF bytecode
2. Applies CO-RE relocations for the running kernel
3. Loads programs and creates maps in the kernel
4. Populates the `objs` struct with handles

### Attaching to Primary and Peer

Use cilium/ebpf's `link` package to attach:

```go title="main.go"
import (
    "github.com/cilium/ebpf"
    "github.com/cilium/ebpf/link"
)

// Attach to primary interface
primaryLink, err := link.AttachNetkit(link.NetkitOptions{
    Program:   objs.NetkitPrimary,
    Interface: pair.PrimaryIdx,
    Attach:    ebpf.AttachNetkitPrimary,
})
if err != nil {
    return fmt.Errorf("attaching primary: %w", err)
}
defer primaryLink.Close()

// Attach to peer interface
peerLink, err := link.AttachNetkit(link.NetkitOptions{
    Program:   objs.NetkitPeer,
    Interface: pair.PrimaryIdx,  // Note: still use PrimaryIdx
    Attach:    ebpf.AttachNetkitPeer,
})
if err != nil {
    return fmt.Errorf("attaching peer: %w", err)
}
defer peerLink.Close()
```

**Why does peer attachment use PrimaryIdx?** This is a netkit API design. Both hooks are attached through the primary interface; the `Attach` constant (`AttachNetkitPrimary` vs `AttachNetkitPeer`) determines which hook point receives the program.

### Reading from the Ring Buffer

Open a reader for the ringbuf map:

```go title="main.go"
import "github.com/cilium/ebpf/ringbuf"

rd, err := ringbuf.NewReader(objs.Ipv6Events)
if err != nil {
    return fmt.Errorf("opening ringbuf: %w", err)
}
defer rd.Close()

// Read events in a goroutine
go func() {
    for {
        record, err := rd.Read()
        if err != nil {
            return
        }
        printEvent(record.RawSample)
    }
}()
```

The `rd.Read()` call blocks until an event is available, making the reader efficient.

## Parsing Events in Go

Parse the raw bytes matching your C struct layout:

```go title="main.go"
import (
    "encoding/binary"
    "fmt"
    "net"
)

func printEvent(data []byte) {
    if len(data) < 37 {
        return  // Incomplete event
    }

    var srcAddr, dstAddr [16]byte
    copy(srcAddr[:], data[0:16])
    copy(dstAddr[:], data[16:32])

    nextHeader := data[32]
    payloadLen := binary.LittleEndian.Uint16(data[33:35])
    hopLimit := data[35]
    direction := data[36]

    dirStr := "primary"
    if direction == 1 {
        dirStr = "peer"
    }

    fmt.Printf("[%s] IPv6: %s -> %s | next=%d len=%d ttl=%d\n",
        dirStr,
        net.IP(srcAddr[:]).String(),
        net.IP(dstAddr[:]).String(),
        nextHeader,
        payloadLen,
        hopLimit,
    )
}
```

**Why not use encoding/binary.Read()?** For performance-critical paths, direct byte manipulation is faster than reflection-based parsing. Since we're processing every packet, this matters.

**Why LittleEndian for payloadLen?** The eBPF program converted network byte order (big-endian) to host byte order with `bpf_ntohs()`. x86/ARM64 are little-endian architectures.

## Graceful Shutdown

Use context-based cancellation for clean shutdown:

```go title="main.go"
import (
    "context"
    "os/signal"
    "syscall"
)

ctx, cancel := signal.NotifyContext(context.Background(),
    syscall.SIGINT, syscall.SIGTERM)
defer cancel()

log.Printf("Monitoring IPv6 traffic (Ctrl+C to exit)")

// Event reading goroutine runs until ctx is cancelled
go func() {
    for {
        record, err := rd.Read()
        if err != nil {
            return  // Reader closed
        }
        printEvent(record.RawSample)
    }
}()

<-ctx.Done()
log.Println("Shutting down...")
```

When the user presses Ctrl+C, the context cancels. Deferred `Close()` calls clean up resources in the correct order.

## Complete Program Flow

Here's the full sequence:

1. **Remove memlock** - Allow eBPF map memory
2. **Create netkit pair** - Primary and peer interfaces
3. **Configure IPv6** - Link-local addresses
4. **Load eBPF objects** - Programs and maps into kernel
5. **Attach to primary** - Hook the primary program
6. **Attach to peer** - Hook the peer program
7. **Open ringbuf reader** - Prepare to receive events
8. **Read events** - Process kernel notifications
9. **Cleanup on shutdown** - Reverse order via defer

## Troubleshooting

**"invalid mem access"**: Bounds check missing in eBPF program. The verifier requires `if ((void *)(ptr + 1) > data_end)` before every header access.

**"R0 leaks addr"**: The eBPF program is returning a pointer instead of a valid return code. Ensure functions return `NETKIT_PASS`, `NETKIT_DROP`, or `NETKIT_REDIRECT`.

**"unknown BPF map type"**: Kernel too old for ringbuf. Requires kernel 5.8+. Consider using perf buffer for older kernels.

**"operation not permitted"**: Need root privileges or capabilities (CAP_SYS_ADMIN, CAP_BPF, CAP_NET_ADMIN).

**Events not appearing**:
- Verify traffic is flowing: `ping6 ff02::1%nk0p`
- Check programs are attached: `bpftool link list`
- Verify map exists: `bpftool map list`

**"failed to relocate"**: BTF mismatch. Regenerate vmlinux.h on the target kernel or ensure you're using CO-RE macros correctly.

## Next Steps

With eBPF programs attached to netkit, you can:

- **Implement packet filtering**: Return `NETKIT_DROP` based on rules
- **Add metrics**: Use BPF maps to count packets by type
- **Build policy enforcement**: Make per-packet decisions

For the foundation of creating netkit pairs, see:
- [Creating Netkit Pairs in Go](/docs/section-3/netkit/netkit-creating-pairs)

## References

- [BPF CO-RE Reference Guide](https://nakryiko.com/posts/bpf-portability-and-co-re/)
- [cilium/ebpf Documentation](https://ebpf-go.dev/)
- [Netkit Kernel Documentation](https://docs.kernel.org/next/networking/netkit.html)
- [BPF Ring Buffer](https://nakryiko.com/posts/bpf-ringbuf/)
- [Source Code](https://github.com/cassamajor/xcnf/tree/main/examples/netkit-ipv6)
