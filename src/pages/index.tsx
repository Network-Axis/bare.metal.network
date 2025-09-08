import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

import React from 'react';
import Hero from '@site/src/components/Hero';
import ModuleCard from '@site/src/components/ModuleCard';
import CTAButton from '@site/src/components/CTAButton';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro">
            Docusaurus Tutorial - 5min ⏱️
          </Link>
        </div>
      </div>
    </header>
  );
}

function Homepage(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout description="Bare Metal Networking course - full-stack networking from L3 fabrics to eBPF CNFs">
      <Hero
        title={siteConfig.title}
        tagline={siteConfig.tagline}
        primaryCTA={{ text: 'Join the pilot cohort', href: '/enroll' }}
        secondaryCTA={{ text: 'Preview a lab', href: '/labs/section-1/lab-01-ipv6-underlay' }}
      />
      <main>
        <section className="container margin-top--lg text--center">
          <h2>What You Will Build</h2>
          <div className="row">
            <ModuleCard title="Section 1: Pure L3 Data Center" description="Design a spine-leaf IPv6 fabric with unnumbered BGP, ECMP, and <50ms failover." />
            <ModuleCard title="Section 2: Cloud-Native Router" description="Bootstrap a Talos & Kubernetes cluster, integrate it with the L3 fabric using Cilium." />
            <ModuleCard title="Section 3: Networking with eBPF" description="Develop eBPF-based network functions and achieve kernel-level performance." />
          </div>
          <div className="row margin-top--md">
            <ModuleCard title="Service Chains" description="Chain multiple eBPF network functions (CNFs) into service pipelines with full observability." />
            <ModuleCard title="Foundations" description="Reference designs, templates, and checklists to solidify production readiness." />
          </div>
        </section>
        <section className="container margin-top--xl">
          <h2 className="text--center">Course Highlights</h2>
          <ul>
            <li><strong>Full Packet Path Control:</strong> Master routing from physical underlay to Kubernetes overlay, with eBPF hooking in between.</li>
            <li><strong>Predictable Failover:</strong> Achieve failover within 50ms using BFD and multipath routing – minimizing downtime.</li>
            <li><strong>Line-Rate Performance:</strong> Utilize eBPF to run network functions at NIC-native speeds, handling millions of packets per second.</li>
            <li><strong>Hands-On Learning:</strong> Every module includes labs where you break and fix the network, forging real troubleshooting skills.</li>
          </ul>
        </section>
        <section className="container margin-top--lg margin-bottom--xl">
          <h2 id="faq" className="text--center">FAQ</h2>
          <details>
            <summary><strong>What do you mean by "pure L3" networking?</strong></summary>
            <div>
              <p>"Pure L3" means the underlay uses routing exclusively (no VLANs or bridging). Every link between switches/routers is a Layer-3 interface running a routing protocol, which leads to a simpler, more stable network at scale.</p>
            </div>
          </details>
          <details>
            <summary><strong>Can Cilium really handle ECMP and BGP?</strong></summary>
            <div>
              <p>Yes. Cilium can operate in a mode without overlays (using direct routing), so it works with ECMP in the underlay. Cilium also has a BGP announcement feature (beta) for advertising pod/service routes, or you can use external BGP agents alongside Cilium. We demonstrate one approach in the labs.</p>
            </div>
          </details>
          <details>
            <summary><strong>Why use IPv6 link-local for BGP peering?</strong></summary>
            <div>
              <p>Using IPv6 link-local addresses for BGP unnumbered sessions means we don't need to allocate global IPs for inter-router links. It's convenient and aligns with RFC 5549 which allows IPv4 routes to be advertised with IPv6 next hops. It also inherently ties the peering to the specific interface.</p>
            </div>
          </details>
          <details>
            <summary><strong>What BFD timers are you using?</strong></summary>
            <div>
              <p>We use 50ms send/receive intervals with a multiplier of 3 (so ~150ms detection). This aggressive setting gives fast failover. It's tested in our labs, but in production you'd ensure devices can handle it or adjust slightly higher if needed.</p>
            </div>
          </details>
        </section>
        <section className="container margin-top--lg margin-bottom--xl">
          <h2>Meet the Instructor</h2>
          <div className="avatar avatar--vertical">
            <div className="avatar__intro">
              <h3 className="avatar__name">Steven Cassamajor</h3>
              <small className="avatar__subtitle">Network Engineer & Instructor</small>
            </div>
          </div>
          <p>Steven has over 10 years of experience designing data center networks and has been an active contributor to open-source eBPF projects. He created this course to share a practical, hands-on path to mastering modern network infrastructure by blending traditional protocols with cutting-edge eBPF technology.</p>
        </section>
      </main>
    </Layout>
  );
}

export default Homepage;