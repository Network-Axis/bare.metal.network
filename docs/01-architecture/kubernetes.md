So here is a list of reasons why I’ve decided to build NaaS on top of Kubernetes:

I can define arbitrary APIs (via custom resources) with whatever structure I like.
These resources are stored, versioned and can be exposed externally.
With openAPI schema, I can define the structure and values of my APIs (similar to YANG but much easier to write).
I get built-in multitenancy through namespaces.
I get AAA with Role-based Access Control, and not just a simple passwords-in-a-text file kind of AAA, but proper TLS-based authentication with oAuth integration.
I get a client-side code with libraries in python, js and go.
I get admission controls that allow me to mutate (e.g. expand interface ranges) and validate (e.g. enforce per-tenant separation) requests before they get accepted.
I get secret management to store sensitive information (e.g. device inventory)
All data is stored in etcd, which can be easily backed up/restored.
All variables, scripts, templates and data models are stored as k8s configmap resources and can be retrieved, updated and versioned.
Operator pattern allows me to write a very simple code to “watch” the incoming requests and do some arbitrary logic described in any language or framework of my choice.
Not to mention all of the more standard capabilities like container orchestration, lifecycle management and auto-healing.


# Why talos Linux

T alos Linux is an open source Linux operating system (OS) purpose-built for
Kubernetes, operates entirely through an API, eliminating traditional SSH or shell
access, thus providing a highly secure and minimal operating system for Kubernetes
clusters.
Key features include:
●
Immutable OS: Prevents configuration drift and enhances security.
Image-based updates simplify upgrades and eliminate patching.
●
API-Only Management: No SSH or shell access, reducing attack surfaces.
Declarative API prevents configuration drift and imperative API endpoints
provide on-demand information gathering and debugging.
●
Built-in Security: Inherent security through the implementation of Kernel
Self Protection Project standards, SELinux, TPM support, disk encryption,
SecureBoot, read-only root filesystem, boot from an in-memory SquashFS
file system, and modern cryptographic standards.
●
Lightweight and Optimized: T alos Linux is designed specifically to run
Kubernetes. It includes fewer than 50 binaries and no package manager or
traditional userland tools included by default. It also provides system
extensions and overlays to add optional drivers, services, and hardware
support.

- Upstream Kubernetes: Talos Linux deploys upstream Kubernetes without API modifications and ensures full
compatibility with the Kubernetes ecosystem. 