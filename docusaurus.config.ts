import { Config } from '@docusaurus/types';
import dotenv from 'dotenv';
dotenv.config();

const config: Config = {
  title: 'Bare Metal Networking for Private Clouds',
  tagline: 'Design a pure L3 IPv6 fabric, automate Talos + Kubernetes, and ship eBPF CNFs with netkit',
  url: 'https://ebpf.guide',
  baseUrl: '/',
  favicon: 'img/favicon.ico',
  organizationName: 'cassamajor',
  projectName: 'bare-metal-networking',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  i18n: { defaultLocale: 'en', locales: ['en'] },
  markdown: { mermaid: true },
  themes: ['@docusaurus/theme-mermaid'],
  presets: [
    [
      '@docusaurus/preset-classic',
      ({
        docs: {
          path: 'docs',
          sidebarPath: require.resolve('./sidebars.ts'),
          editUrl: 'https://github.com/cassamajor/bare-metal-networking/edit/main/',
          remarkPlugins: [require('remark-validate-links')]
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/cassamajor/bare-metal-networking/edit/main/',
          feedOptions: {
            type: 'all',
            title: 'Bare Metal Networking for Private Clouds',
            description: 'Announcements and changelog related to the course',
            copyright: `© ${new Date().getFullYear()} Network Axis`,
            xslt: true
          }
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css')
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5
        },
        gtag: {
          trackingID: process.env.GTAG_TRACKING_ID || 'G-XXXXXXXXXX',
          anonymizeIP: true
        }
      })
    ]
  ],
  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'labs',
        path: 'labs',
        routeBasePath: 'labs',
        sidebarPath: require.resolve('./sidebarsLabs.ts'),
        remarkPlugins: [require('remark-validate-links')]
      }
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'reference',
        path: 'reference',
        routeBasePath: 'reference',
        sidebarPath: require.resolve('./sidebarsReference.ts'),
        remarkPlugins: [require('remark-validate-links')]
      }
    ]
  ],
  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: false
    },
    navbar: {
      title: 'Bare Metal Networking for Private Clouds',
      items: [
        {
          label: 'Curriculum',
          position: 'left',
          items: [
            { to: '/docs/overview', label: 'Overview' },
            { to: '/docs/section-1/', label: 'Section 1: Pure L3 Data Center' },
            { to: '/docs/section-2/', label: 'Section 2: Cloud-Native Router' },
            { to: '/docs/section-3/', label: 'Section 3: Networking with eBPF' },
          ]
        },
        { to: '/blog', label: 'Blog', position: 'left' },
        { to: '/enroll', label: 'Enroll', position: 'right', className: 'navbar-item--button' }
      ]
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Product',
          items: [
            { label: 'Home', to: '/' },
            { label: 'Curriculum', to: '/docs/overview' },
            { label: 'Pricing', to: '/enroll' },
            { label: 'Changelog', to: '/blog' }
          ]
        },
        {
          title: 'Learn',
          items: [
            { label: 'Docs', to: '/docs/overview' },
            { label: 'Labs', to: '/labs/section-1/lab-01-ipv6-underlay' },
            { label: 'Blog', to: '/blog' },
          ]
        },
        {
          title: 'Community',
          items: [
            { label: 'Join Discord', href: '#' },
            { label: 'Join Slack', href: '#' },
            { label: 'Contact Us', href: 'mailto:contact@ebpf.guide' }
          ]
        },
        {
          title: 'Legal',
          items: [
            { label: 'Terms of Service', to: '/legal/terms' },
            { label: 'Privacy Policy', to: '/legal/privacy' }
          ]
        }
      ],
      copyright: `© ${new Date().getFullYear()} Network Axis. All rights reserved.`
    },
    algolia: {
      appId: process.env.DOCSEARCH_APP_ID || 'YOUR_APP_ID',
      apiKey: process.env.DOCSEARCH_API_KEY || 'YOUR_API_KEY',
      indexName: 'bmk8s'
    },
    prism: {
      additionalLanguages: ['go', 'yaml', 'bash', 'diff', 'json', 'c', 'csharp']
    },
    mermaid: {
      theme: { light: 'neutral', dark: 'forest' }
    }
  }
};

export default config;