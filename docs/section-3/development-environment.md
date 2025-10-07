---
title: Setup an eBPF development environment on macOS
authors: [cassamajor]
tags: [ebpf]
keywords: [eBPF, OrbStack, VS Code, Intellisense, cloud-init, macOS, M1, M2, M3]
description: Learn how to configure macOS for eBPF development
image: ./img/image.png
draft: true
---

So you want to build an eBPF program, and you don't know where to start?

In the following sections, you will learn:
1. How to use cloud-init and OrbStack to create an Ubuntu virtual machine tailored towards eBPF development.
2. How to configure VS Code to make writing eBPF programs a more enjoyable experience.

Let's dive in!

<!-- truncate -->

## Prerequisites
### What is cloud-init?
[cloud-init](https://cloudinit.readthedocs.io/en/latest/reference/examples.html) is a widely used tool for customizing cloud and VM instances during first boot.
It lets you automate tasks like installing packages, setting up symlinks, and running arbitrary commands.

Using cloud-init enables developers to configure machines in a consistent, repeatable, and automated way, whether it be for development or production.

### What is OrbStack?
[OrbStack](https://orbstack.dev) is a lightweight virtualization and container management tool for macOS, designed to make running Linux environments fast, easy, and seamless.
It combines the simplicity of Docker Desktop with the power of a full Linux virtual machine, all while being native to Apple Silicon (M1/M2) and extremely efficient on system resources.

One of the greatest features which enables seamless development is that OrbStack supports two-way file sharing between virtual machines and macOS. We will explain why this is a powerful tool for development [when we configure VS Code](#accessing-header-source-code-using-intellisense).

## Create an Ubuntu Virtual Machine
To begin, create a file named `cloud-init.yaml`, and paste the following snippet:
```yaml title="cloud-init.yaml" showLineNumbers
#cloud-config

package_update: true
package_upgrade: true

packages:
  - clang
  - llvm
  - libbpf-dev
  - golang

runcmd:
  - cd /usr/include/
  - ln -sf aarch64-linux-gnu/asm/ /usr/include/asm
```

<details>
<summary> Configuration Breakdown </summary>

- `package_update`: update packages before performing an upgrade
---
- `package_upgrade`: upgrade the package manager before installing new packages
---
- `packages`: install new packages
   - `clang` - Compiles C source code into eBPF bytecode
   - `llvm` - Used by `clang` to optimize the build process
   - `libbpf-dev` - Contains interfaces to load, verify, and attach eBPF programs to kernel hooks.
   - `golang` - The Go programming language
---
- `runcmd`: Run arbitrary commands to create symbolic links.
You may have noticed we are using relative symlinks rather than absolute symlinks.
This will enable us to access header source code in the IDE, as [described in a later section](#accessing-header-source-code-using-intellisense).

</details>

Next, [download OrbStack from the official website](https://orbstack.dev/download). Once installed, run the following command:

```shell
orb create ubuntu ebpf -c cloud-init.yaml
```

<details>
<summary> Command Breakdown </summary>

In your terminal, enter `orb create -h` to understand available options.

- `orb` is used to manage OrbStack and its machines.
---
- `create` will create a new machine
---
- `ubuntu` is the Linux distribution we will use for our development environment.
We can alternatively provide a specific version, e.g. `ubuntu:24.04.2`.
If you choose a distribution other than Ubuntu, you may need to update the package names and location of the header file directory specified in `cloud-init.yaml`.

---
- `ebpf` is the name of the virtual machine we are creating
---
- `-c` will enable to option to provide a cloud-init user data file
---
- `cloud-init.yaml` is the path to the cloud-init user data file we just created
</details>

## Configure VS Code for eBPF Development
### Accessing header source code using IntelliSense

VS Code can be configured to enable local development with headers, but we need to tell VS Code where to find these files.

The filesystem of the virtual machine is mounted at the following location: `/Users/username/OrbStack/ebpf/`, where the username of the Mac user is `username`, and the name of the eBPF virtual machine is `ebpf`.

### Configure IntelliSense

With the VS Code Editor in focus, open the Command Pallette using the keyboard shortcut <kbd>Command</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>.

In the search bar, begin typing `Edit Configurations`, and select the option that says `C/C++ Edit Configurations (JSON)`.
This will create/modify the `.vscode/c_cpp_properties.json` file.
Copy and paste the following snippet:

```json title=".vscode/c_cpp_properties.json"
{
    "configurations": [
        {
            "name": "Mac",
            "includePath": [
                "/Users/username/OrbStack/ebpf/usr/include",
                "${workspaceFolder}/**"
            ],
            "defines": [],
            "compilerPath": "/usr/bin/clang",
            "cStandard": "c17",
            "cppStandard": "c++17",
            "intelliSenseMode": "macos-clang-arm64"
        }
    ],
    "version": 4
}
```

<details>
<summary> Configuration Breakdown </summary>
- `name`: A label for this configuration.
---
- `includePath`: A list of folders where IntelliSense will look for header files.
`${workspaceFolder}/**` Recursively includes all directories inside the current project.
---
- `compilerPath`: Path to the compiler binary used for parsing and IntelliSense.
---
- `cStandard`: The version of the C standard to use.
---
- `cppStandard`: The C++ standard to use, This is required even if we're not writing C++.
---
- `intelliSenseMode`: Helps VS Code optimize its language services by knowing our system’s architecture and toolchain.
---
- `version`: Schema version of the configuration file.
</details>

If you do not have `Auto Save` enabled (File > Auto Save), then save the file by pressing <kbd>Command</kbd>+<kbd>S</kbd>.
You should now be able to view source files using <kbd>Command</kbd>+<kbd>Left Click</kbd>, or put your cursor on the code definition and press <kbd>Command</kbd>+<kbd>Down Arrow</kbd>.

## Common Issues and Fixes
### Finding Missing Headers on the Filesystem

Typically, to install Linux headers, you would run `apt install linux-headers-$(uname -r)` in your terminal. 
This does not work in an OrbStack Virtual Machine because it uses a custom kernel.
This means there is no official distributed package for its headers.
What I discovered is that all kernel headers can be found in the `/usr/include/aarch64-linux-gnu` directory.

While developing an eBPF program, we tend to look to open source examples, but we don’t always know the development environment.

For example, I've come across `#include <bpf_helpers.h>`; however, its location should instead be specified as `#include <bpf/bpf_helpers.h>`.

To find the location of a missing header, run: `find /usr -name byteorder.h`, where `byteorder.h` is replaced with the name of the missing header file.

Once the header file is found, update the `runcmd` instructions in [`cloud-init.yaml`](https://raw.githubusercontent.com/cassamajor/xcnf/refs/heads/main/config/cloud-init.yaml) to include a symbolic link, as demonstrated in the linked file.

```shell
runcmd:
  - cd /usr/include/
  - ln -sf aarch64-linux-gnu/bits/ /usr/include/bits
```

## Conclusion
With this setup, you’re ready to develop, compile, and test eBPF programs on macOS with minimal friction.
In future posts, I’ll walk through how to access the Linux Virtual Machine to build and debug eBPF-powered applications.