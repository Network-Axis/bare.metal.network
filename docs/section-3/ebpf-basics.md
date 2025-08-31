# eBPF Basics: XDP, tc, and Map Fundamentals

**eBPF (extended Berkeley Packet Filter)** allows us to run custom code in the Linux kernel, safely and efficiently. For networking, eBPF programs can be attached at various hook points to intercept and manipulate packets at run time.

## XDP and tc Hooks

Two key hook points for eBPF in networking are:
- **XDP (eXpress Data Path):** Hooks at the earliest point in packet processing (in the NIC driver, before the Linux networking stack). XDP programs are ideal for very fast packet filtering, load balancing, DDoS mitigation, etc., because they run before the kernel allocates sk_buffs (extremely high performance, millions of packets per second).
- **tc (Traffic Control) ingress/egress:** Hooks into the Linux traffic control subsystem. tc eBPF programs run after the packet is in the Linux network stack, allowing more context and the ability to redirect packets, shape traffic, or implement advanced routing logic.

In our context, we might use XDP for functions like dropping unwanted traffic **extremely** fast (e.g. blocking specific IPs at line rate), and use tc for more complex tasks like encapsulation, load-balancing, or policy enforcement as packets travel through the node.

## eBPF Maps

eBPF programs are stateless by default, but they can interact with **maps** – in-kernel data structures accessible to eBPF. Maps allow programs to store and retrieve data like counters, IP sets, or config flags. For example, an XDP program could consult a map of "blocked IP addresses" to decide whether to drop a packet.

Maps are created in user space (via the `bpf()` system call) and can be updated at runtime. Cilium, for instance, uses maps to keep track of endpoint (pod) identities and policy enforcement (policymap).

## Performance and Safety

One of eBPF's big advantages is performance: eBPF bytecode is JIT-compiled to native machine code, and running in kernel context avoids the overhead of context switches. Programs like an XDP firewall can drop or redirect traffic at tens of gigabits per second using modest CPU.

However, running code in the kernel comes with risk – a buggy program could crash the system. eBPF mitigates this with strict safety checks:
- The **verifier**: When you load an eBPF program (via tc, XDP, etc.), the kernel's eBPF verifier analyzes the bytecode. It ensures the program will terminate (no infinite loops), doesn't access invalid memory, and adheres to constraints (e.g. bounded loops, limited stack usage).
- **Sandboxing**: eBPF programs run in a restricted environment with limited instructions and no direct pointer access to kernel memory (only through provided context or map APIs).

If the verifier fails your program, it will reject the load with errors. Tuning high-performance eBPF code often means iteratively adjusting your code to satisfy the verifier's constraints (e.g., avoiding loops that are too large, or splitting functions).

:::note
Even with the verifier, it's possible to write inefficient eBPF code. Always benchmark your eBPF programs. Use `perf` or built-in counters to measure how many CPU cycles your XDP program uses per packet. The labs include scenarios where you'll compare a simple XDP drop program's throughput vs. iptables.
:::

Armed with the basics of eBPF, we can now move to creating actual network functions with it. The next page and labs will guide you through building and deploying eBPF-based Cloud Native Network Functions (CNFs).
