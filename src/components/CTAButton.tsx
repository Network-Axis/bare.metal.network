import React from 'react';
import clsx from 'clsx';

interface CTAButtonProps {
  text: string;
  href: string;
  outline?: boolean;
  className?: string;
}

const CTAButton: React.FC<CTAButtonProps> = ({ text, href, outline = false, className }) => {
  return (
    <a
      href={href}
      className={clsx(
        'button button--lg',
        outline ? 'button--outline button--secondary' : 'button--primary',
        className
      )}
      style={{ margin: '0.5rem' }}
    >
      {text}
    </a>
  );
};

export default CTAButton;