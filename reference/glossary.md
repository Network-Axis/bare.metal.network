// FILE: reference/glossary.md
# Glossary

**L3 (Layer 3):** The network layer in the OSI model. In IP networks, this is the layer where routing occurs using IP addresses.

**BGP (Border Gateway Protocol):** The de facto inter-domain routing protocol. Here we use BGP within the data center (EBGP between leaf and spine) to distribute routes in a Clos network.

**BGP Unnumbered:** A BGP session that runs over interfaces without unique IP addresses, typically using IPv6 link-local addresses and the `neighbor interface` configuration. Simplifies IP management in dense networks.

**ECMP (Equal-Cost Multi-Path):** A routing strategy where multiple nexthops are used for the same destination prefix, balancing traffic across parallel links. Our spine-leaf fabric uses ECMP to utilize all uplinks concurrently.

**BFD (Bidirectional Forwarding Detection):** A protocol for rapid detection of link or peer failures, independent of routing protocols. BFD running at 50ms intervals gives failover times under 200ms in our network.

**Talos:** A Kubernetes-specific Linux OS that is managed via APIs and config files. Talos provides immutable, secure nodes for running Kubernetes control planes and workers.

**Cilium:** A Kubernetes CNI plugin powered by eBPF, enabling high-performance networking and network security (NetworkPolicy enforcement) directly in the kernel.

**eBPF (extended Berkeley Packet Filter):** A Linux kernel technology that allows safe, sandboxed programs to run in kernel space. Used for efficient packet processing, tracing, and system call filtering. Core to how Cilium and our CNFs operate.

**XDP (eXpress Data Path):** An eBPF hook at the earliest point of packet reception (in the NIC driver). Used for ultra-fast processing like packet drops or redirections before the kernel's networking stack.

**tc eBPF:** Attaching eBPF programs to the Linux traffic control (tc) ingress/egress hooks. Used for more advanced processing once packets are in the networking stack (e.g., shaping, load-balancing).

**CNF (Cloud-Native Network Function):** A network function (like a router, firewall, load balancer) packaged and managed in a cloud-native way (e.g., containerized). In this course, our CNFs are implemented with eBPF for performance.

**netkit:** A toolkit for orchestrating service function chains of eBPF-based CNFs. It defines the chain order and handles deploying and connecting those functions in the correct sequence.

**Hubble:** The observability platform for Cilium, which provides real-time visibility into network flows, policy decisions, and packet drops at the eBPF level.

**Service Chain:** A sequence of network services (functions) through which traffic is passed to apply multiple policies or transformations. For example, a chain might include a firewall -> IDS -> proxy in series. Our labs demonstrate building service chains using eBPF CNFs.