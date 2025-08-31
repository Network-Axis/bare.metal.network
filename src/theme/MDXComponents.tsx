import React from 'react';
import MDXComponents from '@theme-original/MDXComponents';

// Your custom components
import LabChecklist from '@site/src/components/LabChecklist';
import CTAButton from '@site/src/components/CTAButton';
import VideoEmbed from '@site/src/components/VideoEmbed';
import ModuleCard from '@site/src/components/ModuleCard';

export default {
  ...MDXComponents,
  LabChecklist,
  CTAButton,
  VideoEmbed,
  ModuleCard,
};