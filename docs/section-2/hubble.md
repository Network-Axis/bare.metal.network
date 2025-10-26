---
title: Introduction to Hubble
---

Observability: flow logs, metrics, Grafana dashboard


`to-overlay`: if pods are on diffeent nodes
`to-endpoint`: if both pods are located on the same node (there is no need to access the overlay network to route between them.)

 Isovalent Enterprise for Kubernetes Networking provides an RBAC option for Hubble


 ---

 Click on the "Policies" button in the left column and select the `deathstar-allow-empire policy` at the bottom of the left column.

 The main part of the interface shows the selected identity in the center, with ingress traffic on the left and egress traffic on the right.

![](https://play.instruqt.com/assets/tracks/ylhikjm5qpjv/bf5083e5cf6224ac6c27444c0a858f33/assets/hubble-ui_np-main.png)

This interface can even be used to author and modify network policies.

the YAML manifest for the Network Policy in the bottom-left part of the screen.

Flows table at the bottom of "Connections"