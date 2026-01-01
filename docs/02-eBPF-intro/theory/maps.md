---
title: eBPF Maps
draft: true
---

BPF maps are bidirectional data structures that allow sharing data between kernel and user space.

Each map is defined by four values:
1. a type
2. a maximum number of elements
3. a value size in bytes
4. a key size in bytes


Maps are created by invoking the `bpf()` syscall with the `BPF_MAP_CREATE` argument. It can also be created automatically using `SEC(".maps")`.

No integrity is built-in to maps, so it may be important to store this data elsewhere.

Priviledged user-space programs can access maps. One example is using `bpftool` to troubleshoot/debug. 

Data in maps are shared across all eBPF program invocations, and can be accessed using the `bpf_map_lookup_elem()` and `bpf_map_update_elem()` functions.

- Shared piece of memory between an eBPF program and an eBPF loader application
- Types include hash, array, bloom filter, radix-tree, stack, queue, and least recently used (LRU).
- There are also per-CPU map variants, where each core is individually used for storage.

Different eBPF programs can also access the same map to share data

When a map is successfully created, a file descriptor associated with that map is returned. Maps are normally destroyed by closing the associated file descriptor.


:::note
- Hash-based maps have no fixed key-size and are not preallocated in memory
- Array-based is faster than hash-based
- Some map types, such as `BPF_MAP_TYPE_SOCKET_MAP`, work with additional eBPF helper functions that perform special tasks.
- The LRU hash map stores data as a `(key,value)` pair.
- Arrays are preallocated and zeroed (`max_entries` array elements get allocated when the map is first created.)
:::



:::note Map Types
https://github.com/torvalds/linux/blob/ccd1cdca5cd433c8a5dff78b69a79b31d9b77ee1/include/uapi/linux/bpf.h#L980-L1031

:::

:::note Program Types
https://github.com/torvalds/linux/blob/ccd1cdca5cd433c8a5dff78b69a79b31d9b77ee1/include/uapi/linux/bpf.h#L1041-L1076

:::


---

BPF maps are generic key/value stores

Creating a BPF map is done by defining a global struct with SEC(".maps")

```c
struct {
	__uint(type, BPF_MAP_TYPE_ARRAY);
	__type(key, __u32);
	__type(value, struct datarec);
	__uint(max_entries, XDP_ACTION_MAX);
} xdp_stats_map SEC(".maps");
```

Note the key and value type parameters,

---

The user space program must create the maps and programs with separate invocations of the bpf syscall.

---

A libbpf function named `bpf_object__find_map_fd_by_name()` combines `bpf_object__find_map_by_name()` with ``bpf_map__fd()` to obtain the map file descriptor

---

Sharing BPF maps between programs is called _pinning_.
We create a file for each map under a special file system mounted at `/sys/fs/bpf/`.
The mount command is: `mount -t bpf bpf /sys/fs/bpf/`.
If this file system is not mounted, attempts to pin BPF objects will fail.

The libbpf API provides a way to reuse and replace the map inside your BPF object with an already existing pinned map, using `bpf_map__reuse_fd()`.

This call must be made after the object has been opened with `bpf_object__open()` but before it is loaded with `bpf_object__load()`.
- `xdp_program__create()` --> internally calls `bpf_object__open()`
- `xdp_program__attach()` --> internally calls `bpf_object__load()`

