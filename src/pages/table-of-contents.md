---
title: Table of Contents
---

# Module 1: Scalable Data Center (Pure L3 Networking)
> Discuss the protocols and topology of the underlying network to build a [[Scalable Data Center]].
1.  [[Evolution of the Data Center]]
	1. [[Pure Layer 3 Underlay]]
		1. [[Bidirectional Forwarding Detection|BFD]] is used for sub-second link failover. Meet high availability SLAs
		2. [[Project Notes/Scalable Data Center Resources/IPv6|IPv6]] is used for easy management of IP addresses. Using [[Neighbor Discovery Protocol]] and [[Link-Local Addresses]], we can achieve [[IPv6 Route Advertisement|Route Advertisement]] without any configuration.
2. [[Spine and Leaf Topology]] is used to avoid the overhead of Layer 2 networking.
	1. [[Border Gateway Protocol|BGP]] is used for ~~scalability, flexibility, load balancing, and fast fail over~~. load balancing and advertising routes to other ~~networking~~ devices. In terms of scalability, [[Border Gateway Protocol|BGP]] is currently handling ~700,000 routes of the public internet. [[Border Gateway Protocol|BGP]] can use link-local addresses to exchange information about IP addresses configured in a data center.
	2. [[BIG TCP]]:  Extends TCP’s window-scaling and congestion control, improving performance and throughput as packets enter the networking stack.
	3. [[BBRv3]] is used for
	4. [[Stateless Address Autoconfiguration|SLAAC]] is used for
	5. [[Case Study - Nokia Kubernetes Service]]


# Module 2: A New Take on Routing and Switching
> Automate the provisioning Kubernetes cluster via [[Talos Linux]] and the configuration of [[Cilium Datapath Architecture|Cilium]].
1. [[Cilium Datapath Architecture]]
	- [[Cilium Strengths]]
	- [Tuning Guide](https://docs.cilium.io/en/latest/operations/performance/tuning/)
2. [[Cilium CRDs]]
	- [[Cilium BGP]]
3. [[Provisioning Infrastructure]]
	- [[Kubernetes Infrastructure]]

# Module 3: Networking with eBPF
> Write, build, and deploy eBPF programs that intercept and manipulate network packets at scale, with a focus on efficiency, performance, and security.
> These eBPF programs will be Cloud-native Network Functions.
1. Introduction: How will we use eBPF for our use case?
	1. Set up an eBPF Development Environment
	2. Describe the tooling required to build eBPF applications, e.g. `libbpf`, `bpftool`, `LLVM Clang`, `Linux headers`, and explain what role they play.
2. Writing an eBPF Program
	1. Programming Languages: Restricted C and Go
		1. Discuss advantages and limitations of using C for kernel-space program and Go for user-space application.
	2. Best practices for eBPF application development (e.g. Compile Once Run Everywhere (CO-RE)).
	3. Headers, [[SEC]], so on.
3. Service Function Chaining
	1. Discuss [[netkit]] is used for host-native packet processing speeds. replaces traditional veth/tc datapaths with a BPF-programmable network device
	2. [[BPF Multi-Program Attachment]]