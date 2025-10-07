---
sidebar_position: 1
title: Introduction

tags:
  - networking

draft: true
---

# Introduction

Traditional networks required a combination of appliances to address the networking and security requirements detailed in [Network Requirements](#network-requirements)

Appliances included:
- [Routers](./routing.md)
- Switches
- [DNS servers](./DNS.md)
- DHCP servers
- [Load Balancers](./services.md)
- [Firewalls](./networkPolicies.md)
- Network Monitoring Appliances
- VPN Devices

# Network Concepts (Prerequisite Knowledge)
- TCP/IP
- OSI Layers
- Virtualization and [containerization](docs/section-2/cloud-native-overview/containerization.md)
- [Kubernetes basics](docs/section-2/cloud-native-overview/kubernetes-overview.md)
- Core networking building blocks
    - DNS
    - DHCP
    - Routing
    - Switching
    - Load-balancing
    - Firewalls

# Network Requirements
- Applications need to have accessible IP addresses
- Applications need to be able to communicate with other applications
- Applications need to be able to access the outside world (outbound access)
- Applications need to be accessible from the outside world (inbound access)
- Applications need to be secured and data needs to be protected
- Applications need to be globally resilient and highly available
- Applications and networks may need to meet regulatory goals and requirements
- Operators must be able to troubleshoot when applications or the infrastructure behave unexpectedly

---

- The control plane in a network determines how data packets are forwarded.
- The Kubernetes control plane determines where pods should run.