---
title: Sockets
authors: [cassamajor]
tags: [networking]
draft: true
---


# Sockets [^1]
- inter-process communication (IPC)
    - Pipes (pipe, fifo)
	- Message queues
	- Shared memory (shm)
	- Semaphores
	- Signals
- stream sockets are connection oriented
- datagram sockets are connectionless
- socket APIs are provided by the OS, abstracting it away from developers.
- Sockets (like files) can be written to and read from via a stream of bytes.

## Calling the `socket()` function
The `socket()` function requires three parameters:
1. Domain/Address Family: specifies the protocol family to be used.
    - `AF_INET` – IPv4 Internet protocols
    - `AF_INET6` – IPv6 Internet protocols
    - `AF_UNIX` (or `AF_LOCAL`) – Local communication (Unix domain sockets). This is a form of IPC.
    - `AF_PACKET` – Low-level packet interface (Linux only)
    - `AF_NETLINK`, AF_BLUETOOTH, etc. – Other less common domains 
2. Type: specifies the communication semantics:
    - `SOCK_STREAM` – Provides sequenced, reliable, two-way, connection-based byte streams (e.g., TCP)
    - `SOCK_DGRAM` – Supports datagrams (connectionless, unreliable messages, e.g., UDP)
    - `SOCK_RAW` – Provides raw network protocol access
    - `SOCK_SEQPACKET` – Provides sequenced, reliable, two-way connection-based data transmission, preserving message boundaries
    - `SOCK_RDM` – Provides reliable datagrams (rarely used)
3. Protocol: specifies a particular protocol to be used with the socket.
    - `0`: Let the system automatically choose the default protocol for the domain and type
    - `IPPROTO_TCP`
    - `IPPROTO_UDP`

Once instantiated/executed, the socket is assigned a file descriptor[^2].

---

Next the socket must be bound to a specific IP Address and Port, using the `bind()` function.
Then, the `listen()` function allows the socket to queue incoming requests
The `accept()` function takes the incoming request, and creates a new file descriptor for the connection.
The client then uses `connect()`.
Both client and server can then use `send()` and `recv()`, the networking equivalent of `write` and `read`.

[^1]: [Getting Started with Networking and Sockets](https://www.kungfudev.com/blog/2024/06/07/getting-started-with-net-and-sockets) describes how to create a TCP Echo Server in Rust.
[^2]: A file descriptor uniquely identifies an open file within a process to allow I/O operations. It is represented as an integer, assigned by the operating system.