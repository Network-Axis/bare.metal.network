---
sidebar_position: 1
slug: /
---

# Course Overview

Welcome to **Bare Metal Networking for Private Clouds**!
In this course, you'll learn to design and deploy a modern data center network from the ground up.

The course is structured into three main sections that cover <ins>*networking*</ins>, <ins>*infrastructure*</ins>, and <ins>*software*</ins>:
- **Section 1: Scalable Data Center (Pure L3 Networking):** Build a Layer 3 spine-leaf underlay using IPv6 link-local addressing, unnumbered BGP sessions, ECMP routing, and sub-50ms failover with BFD.
- **Section 2: Cloud-Native Router (Talos + Cilium):** Automate Kubernetes cluster provisioning with Talos Linux and integrate Cilium to align pod networking with the L3 fabric.
- **Section 3: Networking with eBPF:** Write eBPF programs to create Cloud-Native Network Functions (CNFs) and chain them into service pipelines with *netkit*, achieving NIC-level performance.

Throughout the course, each concept module is paired with hands-on labs.
You'll get to practice configuring routers, bootstrapping clusters, writing eBPF code, and troubleshooting in realistic scenarios.
By the end, you'll have end-to-end control over packet flow, with confidence in each component's performance and reliability.

Let's get started with Section 1, where we tackle building a scalable IPv6 underlay network!
