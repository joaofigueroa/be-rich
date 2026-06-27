import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Be Rich — Gestão financeira",
    short_name: "Be Rich",
    description: "Sua vida financeira clara e planejada.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f7f8f5",
    theme_color: "#147a49",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/maskable-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
