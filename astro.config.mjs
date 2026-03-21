import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"
import react from "@astrojs/react"

import starlight from "@astrojs/starlight"

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    react(),
    starlight({
      title: "Ranked Leagues",
      customCss: ["./src/starlight.css"],
      markdown: {
        headingLinks: false,
      },
      components: {
        SocialIcons: "./src/components/SocialIcons.astro",
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/Notava1ble/mscl-website",
        },
        {
          icon: "discord",
          label: "Discord",
          href: "https://discord.gg/zzptZsec42",
        },
      ],
      sidebar: [
        {
          label: "Information",
          slug: "info",
        },
        {
          label: "Registration",
          collapsed: false,
          items: [
            { label: "Registration Process", slug: "registration/process" },
          ],
        },
        {
          label: "Rules",
          collapsed: false,
          items: [
            { label: "Organization", slug: "rules/organization" },
            { label: "Points", slug: "rules/points" },
            { label: "Relegations and Promotions", slug: "rules/relegations" },
          ],
        },
        {
          label: "Using the League Bot",
          collapsed: false,
          items: [{ label: "Command List", slug: "bot/commands" }],
        },
        {
          label: "Extra Information",
          collapsed: false,
          items: [
            { label: "Share your stream", slug: "info/share-stream" },
            { label: "Contributions", slug: "info/contributions" },
          ],
        },
      ],
    }),
  ],
})
