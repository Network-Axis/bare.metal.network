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
        enforce L3/L4/L7 packet flow with Cilium network policies,
        and observe network traffic end-to-end using Hubble.
      </>
    ),
  },
  {
    // title: 'NO LEGACY PROTOCOLS',
    title: 'STANDARD PROTOCOLS',
    Svg: require('@site/static/img/stacks/step3-light.svg').default,
    description: (
      <>
        IPv6, BGP, BFD, and ECMP in a Layer 3 "Spine and Leaf" topology ensures the network is resilient to failure, simplifies network maintenance, and supports automation.
      </>
    ),
  },
];

function Feature({ Svg, title, description, index, isVisible }) {
  return (
    <div className={clsx(styles.missionVisionItem, isVisible && styles.visible)}>
      <div className={styles.missionVisionCard}>
        <div className={styles.iconSection}>
          <div className={styles.iconContainer}>
            <Svg className={styles.featureSvg} role="img" />
            <div className={styles.iconGlow}></div>
          </div>
        </div>
        <div className={styles.contentSection}>
          <h3 className={styles.missionVisionTitle}>{title}</h3>
          <p className={styles.missionVisionDescription}>{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function MissionVision() {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = React.useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && containerRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible(true);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.2 }
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
          Infrastructure and networks are rarely operated as one coherent system.
          This course combines the principles of declarative infrastructure and programmable networking to create modern, scalable architecture that is easy to deploy, maintain, and understand.
          </p>
        </div>
        <div ref={containerRef} className={styles.missionVisionGrid}>
          {FeatureList.map((props, idx) => (
            <Feature key={idx} index={idx} isVisible={isVisible} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
