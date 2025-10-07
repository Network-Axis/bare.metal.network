---
sidebar_position: 1
draft: true
---

# Kubernetes Overview

- Kubernetes is a framework to run distributed systems resiliently. It manages scaling and failover for containerized applications/services/workloads to ensure zero downtime.
- Kubernetes facilitates both declarative configuration and automation.
- Kubernetes can manage various deployment patterns (e.g. canary).
- Kubernetes provides:
    - Service discovery: expose a container via DNS name or IP address
    - Load balancing: Distribute network traffic
    - Storage orchestration
    - Automated rollouts and rollbacks: Switch from actual state to desired state at a controlled rate
    - Automatic bin packing: The Kubernetes scheduler can fit containers onto nodes to make the best use of CPU and RAM. This is achieved using:;
        - Resource requests/limits
	    - Taints and tolerations
	    - Affinity/anti-affinity rules
    - Self-healing: restart/replace failing containers or those that fail user-defined health checks. The service is not advertised until ready to serve.
    - Secret and configuration management:  Deploy/update secrets and application configuration without rebuilding container images, and without exposing sensitive information.
    - Batch execution: short-lived, finite tasks for workloads that exit after completion, as opposed to long-running services.
    - Horizontal scaling: based on CPU usage
    - IPv4/IPv6 dual-stack
    - Designed for extensibility: Add features to a cluster without having to merge changes upstream.

## Kubernetes Networking Model

- Every pod in the cluster gets a unique cluster-wide IP address.
- Every pod in the cluster can communicate directly with all other pods on any other node without using Network Address Translation (NAT).
- The containers within a pod all share the same IP address and MAC address.



---

- Kubernetes operates at the container level rather than the hardware level.
- K8s does not limit the types of supported applications. Supports stateless, stateful, and data-processing workloads.
![](./img/Container_Evolution.svg)

- Traditional Deployments: Multiple applications ran on a single machine. There were no resource constraints, which meant one application could use significant RAM/CPU, leaving the other applications to underperform.
- Virtualized Deployments: Applications are isolated, but each VM is a full machine running all components.
- Container Deployments: Applications are isolated from each other, but share the same Operating System.

---

Kubernetes Security is complex and covers multiples areas:
- Data encryption at rest/transit
- Protection of the control plane and workloads
- Identity and Access Management
- ...

[^1]: Adapted from https://kubernetes.io/docs/concepts/overview/