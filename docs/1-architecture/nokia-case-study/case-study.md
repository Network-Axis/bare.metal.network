---
title: Nokia Case Study
draft: true
---


Since 2014, Nokia's core business has been focused on building telecom networks end-to-end.

Recently, Nokia has adapted this network architecture to Kubernetes.

1. 2018: [Nokia Case Study | Kubernetes](https://kubernetes.io/case-studies/nokia/)
1. 2023: [How Nokia Runs One of the World’s Largest Private Clouds on Talos Linux](https://www.siderolabs.com/case-studies/how-nokia-runs-one-of-the-worlds-largest-private-clouds-on-talos-linux)
1. 2023: [Nokia: Scaling a Private Cloud Managed Kubernetes Service to 100k+ Cores](https://www.youtube.com/watch?v=lkxmO3LVCZk&list=PLSgt7RkT67fcbO5mkbB2q1mS8FjER6B0p&index=5)
1. 2023: [Nokia: Building layer 3 only Baremetal Kubernetes Clusters](https://www.youtube.com/watch?v=7prUnxglfCk)
1. 2025: [Building Managed Bare Metal Kubernetes Service At Scale With 100% Open Source Software](https://www.youtube.com/watch?v=TJThJT9Domk&list=PL09s8ZalKQe8in2Ypw7BHfTidIRpxN18w&index=23)

---

> NKS = Nokia Kubernetes Service

- Nokia provides NKS-Metal as IaaS to internal developers.
	- NKS is the platform to manage their k8s clusters.
	- NKS-Metal only has 112 servers, in comparison to their 12,0000 managed Kubernetes servers.
	- NKS manages 

- 3 layers (Networking not defined as a layer. Because it is offloaded to the DC.)
	- Infrastructure
	- Kubernetes
	- Applications


# Architecture
- Previous architecture was the traditional 3 Layer Design: Core, Access, and Aggregation
- Modernized by migrating to Spine-Leaf w/ only Layer 3 and BGP on host
	- This allows a server pool to be distributed between multiple racks.
	- Since racks in the Data Center are abstracting away, it is easy to scale in/out.
		- Delete the cluster, release the node, release the IP
		- Server and IP return to resource pool, waiting to be isolated

- All connections are point to point
- Every node is a BGP speaker
- Servers are modular and independent.

Started building this in 2020. Improved error handling, add retries, increase timeouts, to make it more robust over time.

Netbox has server inventory


---

# Notes


## BGP Routing + Architecture:
- ﻿﻿FRR running on every host as a container to enable BGP routing
	- FRR runs as a [Talos System Extension](https://github.com/abckey/frr-talos-extension)
- Peering with BGP unnumbered between FRR and the Leaves
	- No IPv4, only IPv6 with link-local address
- Every node has /32 IP allocated and advertised via BGP
	- On control plane nodes: k8s-api vip is also advertised via BGP
- Metal LB is responsible for allocating and advertising K8s LB IPs. FRR then redistributes it to the fabric.
- Allocate /31 IP range to eth0 for bootstrapping -- only during bootstrap. Otherwise, only BGP routing is used.

[[Network Diagram.png]]

- ﻿﻿BGP unnumbered peering between FRR and Leaves
- ﻿﻿FRR peers with MetalLB locally via a veth pair
- ﻿﻿pxeboot on ethO for bootstrap


# Why Talos?

- ﻿﻿Immutable, minimal footprint
- ﻿﻿Purpose built to run Kubernetes
- ﻿﻿Secure
- ﻿﻿Ready only
- ﻿﻿No SSH/shell/console, only 9 binaries in the OS
- ﻿﻿CIS Kubernetes guidelines applied by default
- ﻿﻿Managed by API - Easy automation for operations
- ﻿﻿Declarative OS configuration

![[Example Talos Config.png]]

---

To meet the "single server pool" requirement, an inventory was required. Netbox was used as the source of truth.

---

- Management cluster is either 3 or 5 servers depending on the server pool of the DC.
- SDN API and Resource API run in the Management Cluster.
- Cilium used for CNI but not BGP -- it was not an available feature at the time of conception.
	- Metal also supports FRR as speaker in the background. Running in Native mode.
	- Metal cannot be used to peer with the leaf. FRR is already peering with the leaf.
- Due to simple architecture, only peer with local FRR.

---

Open Source Projects in use:

- [ClusterAPI](https://github.com/kubernetes-sigs/cluster-api) | Replaced by [[Omni Infrastructure Providers]]
- [Kea DHCP](https://www.isc.org/kea) | Replaced by [[Stateless Address Autoconfiguration|SLAAC]]
- [FRR](https://github.com/FRRouting/frr)
- [Talos](https://github.com/siderolabs/talos)
- [Sidero](https://github.com/siderolabs/sidero) | Replaced by [[Omni Infrastructure Providers]]
- [Sonic](https://github.com/sonic-net/SONiC) | Replaced by [[Cilium Datapath Architecture|Cilium]]
- [MetalLB](https://github.com/metallb/metallb) | Replaced by [[Cilium Datapath Architecture|Cilium]]
- [Netbox](https://github.com/netbox-community/netbox) | Discarded
- [Ansible AWX](https://github.com/ansible/awx) | Discarded
