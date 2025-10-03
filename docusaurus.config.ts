import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Bare Metal Networking for Private Clouds',
  tagline: 'Design a pure L3 IPv6 fabric, automate Talos + Kubernetes, and ship eBPF CNFs with netkit',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://ebpf.guide',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'throw', // Default 'warn'

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  stylesheets: [
    "https://fonts.googleapis.com/icon?family=Material+Icons",
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/cassamajor/bare-metal-networking/edit/main/',
          remarkPlugins: [require('remark-validate-links')]
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: 'all',
            title: 'Bare Metal Networking for Private Clouds',
            description: 'Announcements and changelog related to the course',
            copyright: `© ${new Date().getFullYear()} Network Axis`,
            xslt: true
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/cassamajor/bare-metal-networking/edit/main/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css')
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5
        }
      } satisfies Preset.Options,
    ],
  ],
  
  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    navbar: {
      title: 'Bare Metal Networking for Private Clouds',
      logo: {
        alt: 'BMK8s',
        src: 'img/logo.png',
      },
      items: [
        { to: '/docs', label: 'Curriculum', position: 'left' },
        { to: '/blog', label: 'Changelog', position: 'left' },
       ]
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Course',
          items: [
            { label: 'Curriculum', to: '/docs' },
            { label: 'Changelog', to: '/blog' },
            { label: 'Contact Us', href: 'https://connect.cassamajor.family' },
          ]
        },
        {
          title: 'Legal',
          items: [
            { label: 'Terms of Service', to: '/legal/terms' },
            { label: 'Privacy Policy', to: '/legal/privacy' },
          ]
        }
      ],
      copyright: `© ${new Date().getFullYear()} Network Axis. All rights reserved.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['go', 'yaml', 'bash', 'diff', 'json', 'c', 'csharp']
    },
    colorMode: {
      defaultMode: 'light',
      disableSwitch: true,
      respectPrefersColorScheme: false
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
