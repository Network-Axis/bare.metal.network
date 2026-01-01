---
title: "Course Overview"
description: An overview of the course that describes what participants will learn.
slug: /
---

Welcome to **Bare Metal Networking for Private Clouds**!
In this course, you'll learn to design and deploy a modern data center network from the ground up.
The course is structured into three main modules:

- **Network Architecture:** Understand the protocols required to implement a scalable Layer 3 data center, using a "Spine and Leaf" topology, IPv6 link-local addressing, unnumbered BGP sessions, ECMP routing, and BFD.
- **Network Infrastructure:** Automate Kubernetes cluster provisioning with Talos Linux and integrate Cilium to align pod networking with the Layer 3 fabric, ultimately creating a Cloud-Native Router.
- **Introduction to eBPF:** Learn the fundamentals of writing eBPF programs (kernel space) and eBPF applications (user space).
- **Networking with eBPF:** Write, build, and deploy Cloud-Native Network Functions (CNFs) that intercept and manipulate network packets at scale. We will leverage **netkit**, the BPF-programmable network device, to achieve zero-overhead performance and service function chaining.

Throughout the course, each concept module is paired with hands-on labs.
You'll get to practice configuring routers, bootstrapping clusters, writing eBPF code, and troubleshooting in realistic scenarios.
By the end, you'll have end-to-end control over packet flow, with confidence in each component's performance and reliability.
