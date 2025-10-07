---
draft: true
---

# Containerization

- Containers decouple applications from the underlying host infrastructure.
- Containers achieve standardization by packaging an application alongside its runtime dependencies.
    - Runtime dependencies can include: application libraries, system libraries, and default values for essential settings.
    - This level of standardization means the same behavior is achieved wherever the container is ran.
- Containers are intended to be stateless and immutable. If changes are necessary, a new image should be built/deployed, rather than modifying the container that is already running.

- Containers in a Pod are co-located and co-scheduled to run on the same node.
    - co-located: all containers defined in a single Pod are deployed together on that node.
    - co-scheduled: The Pod is treated as a single unit for scheduling decisions. So when Kubernetes places a Pod on a node, it schedules all its containers at once on that node.

- The container runtime is responsible for managing the execution and lifecycle of containers