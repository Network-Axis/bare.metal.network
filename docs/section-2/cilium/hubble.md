---
sidebar_position: 9
title: Observability with Hubble
draft: true
---

Hubble provides a visual representation of packets flowing throughout the cluster.

Network observability tool.

The Hubble CLI can observe all the flows in the cluster. Filters can be used to narrow down the pod and the namespace.
```
hubble observe --from-pod namespace-name/pod-name
```

The Hubble UI visualizes traffic in the cluster as a service map.

The enterprise edition comes with features like
- Multi-tenant self-service access
- Historical flow and analytics data
- Built-in network policy editor