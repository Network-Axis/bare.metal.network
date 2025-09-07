---
sidebar_position: 01
---

# Course Overview

Welcome to **Bare Metal Networking for Private Clouds**! In this course, you'll learn to design and deploy a modern data center network from the ground up:

- **Pure L3 IPv6 Fabric:** Build a spine-leaf underlay using IPv6 link-local addressing, unnumbered BGP sessions, ECMP routing, and sub-50ms failover with BFD.
- **Cloud-Native Routers:** Automate Kubernetes cluster provisioning with Talos Linux and integrate Cilium to align pod networking with your L3 fabric.
- **eBPF-Powered Networking:** Write eBPF programs to create Cloud-Native Network Functions (CNFs) and chain them into service pipelines with *netkit*, achieving NIC-level performance.

**Course Structure:** The material is organized into three main sections, a special module on service chaining, and foundational reference content:
- **Section 1:** Scalable Data Center (Pure L3 Networking)
- **Section 2:** Cloud-Native Function Router (Talos + Cilium)
- **Section 3:** Networking with eBPF
- **Service Chains:** Building and operating multi-function network service chains
- **Foundations & Integration:** Deep dives, best practices, and reference architectures

Throughout the course, each concept module is paired with hands-on labs. You'll get to practice configuring routers, bootstrapping clusters, writing eBPF code, and troubleshooting in realistic scenarios. By the end, you'll have end-to-end control over packet flow—from physical wire to container and back—with confidence in each component's performance and reliability.

Let's get started with Section 1, where we tackle building a scalable IPv6 underlay network!
