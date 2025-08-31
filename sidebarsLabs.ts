import { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebarsLabs: SidebarsConfig = {
  labSidebar: [
    {
      type: 'category',
      label: 'Section 1 Labs',
      items: [
        'section-1/lab-01-ipv6-underlay',
        'section-1/lab-02-unnumbered-bgp'
      ]
    },
    {
      type: 'category',
      label: 'Section 2 Labs',
      items: [
        'section-2/lab-01-talos-bootstrap'
      ]
    },
    {
      type: 'category',
      label: 'Section 3 Labs',
      items: [
        'section-3/lab-01-xdp-intro'
      ]
    },
    {
      type: 'category',
      label: 'Chain Labs',
      items: [
        'chains/lab-01-basic-chain'
      ]
    }
  ]
};

export default sidebarsLabs;