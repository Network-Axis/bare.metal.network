import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'CLOUD-NATIVE NETWORK FUNCTIONS',
    Svg: require('@site/static/img/modular.svg').default,
    description: (
      <>
        Write, build, and deploy <strong><a href="https://ebpf.io" target="_blank" rel="noopener noreferrer">eBPF</a></strong> programs that intercept and manipulate network packets at scale.
      </>
    ),
  },
  {
    title: 'SERVICE FUNCTION CHAINING',
    Svg: require('@site/static/img/cloudnative.svg').default,
    description: (
      <>
      Achieve host-native packet processing speeds with <strong>netkit</strong>, the BPF-programmable network device that replaces traditional veth/tc datapaths.
      </>
    ),
  },
  {
    title: '100% OPEN SOURCE',
    Svg: require('@site/static/img/community.svg').default,
    description: (
      <>
        Automate cluster provisioning with Talos Linux,
        enforce packet flow with Cilium network policy across L3/L4/L7,
        and observe network traffic end-to-end using Hubble.
      </>
    ),
  },
];

function Feature({ Svg, title, description, index }) {
  return (
    <div className={clsx('col col--4', styles.featureCard, 'cnoe-stagger-item')}>
      <div className={styles.featureCardInner}>
        <div className={styles.featureIconContainer}>
          <Svg className={styles.featureSvg} role="img" />
          <div className={styles.featureIconOverlay}></div>
        </div>
        <div className={styles.featureContent}>
          <h3 className={styles.featureTitle}>{title}</h3>
          <p className={styles.featureDescription}>{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function ValueProposition() {
  const containerRef = useRef(null);

  useEffect(() => {
    // Initialize staggered animations for feature cards
    if (typeof window !== 'undefined' && containerRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const cards = entry.target.querySelectorAll('.cnoe-stagger-item');
              cards.forEach((card, index) => {
                setTimeout(() => {
                  card.classList.add('cnoe-animate-visible');
                }, index * 150);
              });
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1 }
      );

      observer.observe(containerRef.current);

      return () => {
        if (containerRef.current) {
          observer.unobserve(containerRef.current);
        }
      };
    }
  }, []);

  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Why take this course?</h2>
          <p className={styles.sectionSubtitle}>
          Network Architecture has been abstracted away during the migration to "The Cloud". It's still very relevant to those who power the cloud (data centers, hyperscalers, telco companies), and those who choose not to use it (on-prem, colo). These companies face the same challenges that exist for every technology company: reduce costs, increase performance, and mitigate risks. While Network Architecture is the guiding principles, the actual implementation comes down to software (that controls the logic) and hardware (where the software runs).
          </p>
        </div>
        <div
          ref={containerRef}
          className={clsx("row", styles.featuresGrid, "cnoe-stagger-container")}
        >
          {FeatureList.map((props, idx) => (
            <Feature key={idx} index={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
