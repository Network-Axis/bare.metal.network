# Foundations and Integration

This section provides reference architectures, reusable templates, and checklists to solidify your knowledge and assist in real-world deployments.

## Reference Architecture

By combining all course components, our reference network architecture looks like:
- **Data Center Fabric:** Spine-leaf L3 IPv6 underlay with unnumbered EBGP and fast failover (BFD).
- **Kubernetes Cluster:** Bare-metal Talos Linux nodes connected to leaf switches, each participating in routing (either via BGP or static routes).
- **Cilium CNI:** Providing pod networking that is routed and integrated with the underlay, plus network policy enforcement via eBPF.
- **eBPF CNFs:** Deployed at strategic points (e.g., on ingress/egress nodes) for high-performance network functions (firewall, load balancing, observability), managed by netkit for chaining.
- **Observability:** Hubble for flow logs, plus Prometheus/Grafana for metrics on BGP sessions, BFD status, and CNF performance.

This blueprint ensures that every packet's journey – from ingress on a top-of-rack switch, through the Kubernetes cluster, and out through service chains – is under your control and fully observable.

## Reusable Templates & Code

Throughout the labs, we use and build templates you can repurpose:
- **Talos Machine Configs:** Parameterized YAML for control plane and worker nodes (with placeholders for IPs, etc.).
- **FRR Config Snippets:** Template for BGP unnumbered sessions and BFD (just plug in ASNs and interface names).
- **Cilium Helm Values:** A baseline values file to deploy Cilium with IPv6, direct routing, and (optionally) BGP enabled.
- **eBPF Program Skeleton:** A starter C file and Makefile for writing your own XDP or tc programs, including common map definitions.

All these are provided in the course repository (see the Reference section for config templates and code).

## Checklists

Finally, here are some **checklists** to use when building or troubleshooting:
- **Underlay Bring-Up Checklist:** Link connectivity (ping6 between directly connected interfaces), BGP sessions established (verify `show bgp summary`), routes learned on leaves/spines, BFD sessions up (sub-50ms detection).
- **Talos/K8s Checklist:** All nodes booted with correct config (`talosctl get machines` shows healthy), Kubernetes nodes in Ready state (`kubectl get nodes`), Cilium pods running with no errors (`cilium status` OK).
- **CNF Deployment Checklist:** eBPF programs loaded (`bpftool prog show` lists expected programs), maps populated (check `bpftool map`), traffic counters incrementing, no verifier errors (check `dmesg` for any eBPF load failures).
- **Failure Drill Checklist:** Simulate a spine failure – verify traffic reroutes (BGP fallback via other spine, BFD down triggers route removal). Simulate a CNF crash – ensure it fails open/closed as designed and that alerts/metrics catch the event.

:::tip
Print these checklists or keep them handy during real maintenance. They can save you from overlooking simple things (like "is BFD definitely running on both sides?") when under pressure.
:::

With these foundations in place, you're well-equipped to design and operate a robust private cloud network. The following reference pages provide quick access to configuration fragments, CLI commands, diagrams, and relevant RFCs for further reading.