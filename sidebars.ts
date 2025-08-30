import { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  mainSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Section 1: Scalable Data Center (Pure L3)',
      items: [
        'section-1/spine-leaf',
        'section-1/unnumbered-bgp'
      ]
    },
    {
      type: 'category',
      label: 'Section 2: Cloud-Native Function Router (Talos + Cilium)',
      items: [
        'section-2/talos-bootstrap',
        'section-2/cilium-datapath'
      ]
    },
    {
      type: 'category',
      label: 'Section 3: Networking with eBPF',
      items: [
        'section-3/ebpf-basics',
        'section-3/performance'
      ]
    },
    'service-chains',
    'foundations'
  ]
};

export default sidebars;