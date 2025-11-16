import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

const FeatureList = [];

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
          <h2 className={styles.sectionTitle}>Designed for data centers, adapted for the enterprise</h2>
          <p className={styles.sectionSubtitle}>
          This network architecture is used by Google, Facebook, Bytedance, and Nokia due to its scalability.
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
