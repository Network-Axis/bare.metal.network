import React from 'react';
import CTAButton from './CTAButton';

interface HeroProps {
  title: string;
  tagline: string;
  primaryCTA: { text: string; href: string };
  secondaryCTA: { text: string; href: string };
}

const Hero: React.FC<HeroProps> = ({ title, tagline, primaryCTA, secondaryCTA }) => {
  return (
    <header className="hero hero--primary" style={{ padding: '4rem 2rem' }}>
      <div className="container">
        <h1 className="hero__title">{title}</h1>
        <p className="hero__subtitle">{tagline}</p>
        <div style={{ marginTop: '1.5rem' }}>
          <CTAButton text={primaryCTA.text} href={primaryCTA.href} />
          <CTAButton text={secondaryCTA.text} href={secondaryCTA.href} outline={true} />
        </div>
      </div>
    </header>
  );
};

export default Hero;