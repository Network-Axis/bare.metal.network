# Useful CLI Commands

Here are various commands you'll find handy when working through the labs and operating the network:

- **BGP status (FRR):** `vtysh -c "show bgp ipv6 summary"` – Shows BGP neighbor status for IPv6 sessions.
- **BFD status (FRR):** `vtysh -c "show bfd peers"` – Lists BFD peers and their state (Up/Down).
- **Talos apply config:** `talosctl apply-config --insecure --nodes <IP> --file controlplane.yaml` – Apply a Talos config to a node (use for initial bootstrap if no DHCP/metal provisioning).
- **Talos machine status:** `talosctl -n <control-plane IP> get machines` – See the status of all Talos nodes (requires Talos API access).
- **Kubernetes nodes:** `kubectl get nodes -o wide` – Verify Kubernetes nodes are Ready and see their IP addresses.
- **Cilium status:** `cilium status --verbose` – Check Cilium agent health on a node (via a Cilium pod).
- **Hubble observe:** `hubble observe -t drop` – Show recent dropped flows (requires Hubble CLI & access to Hubble).
- **bpftool programs:** `sudo bpftool prog show` – List all eBPF programs loaded in the kernel, with their IDs, types, and attached points.
- **bpftool map dump:** `sudo bpftool map dump id <MAP_ID>` – Dump the contents of an eBPF map (to view counters, IP lists, etc.).
- **iperf3 test (IPv6):** `iperf3 -6 -c <server_ip> -P 4` – Run an IPv6 throughput test to a server with 4 parallel streams.
- **ping6 large packet:** `ping6 -c 4 -s 1500 <dest>` – Send IPv6 pings of 1500 bytes to test MTU and connectivity.

:::tip
Most CLI commands above can be scripted. For example, you might create a script to SSH into each leaf and spine to collect BGP and BFD status in one go.
:::