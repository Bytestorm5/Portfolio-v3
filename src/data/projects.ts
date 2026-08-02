import type { Tint } from "./experience";

export type Project = {
  name: string;
  blurb: string;
  /** Longer detail shown in the card body. */
  detail: string;
  start: string;
  end: string;
  tint: Tint;
  tags: string[];
  /** Grouping used by the filter row on /projects. */
  kind: "Research" | "ML/AI" | "Tools" | "Simulation";
  links: { label: string; href: string }[];
};

export const featured: Project[] = [
  {
    name: "ML Architecture & Topology Research",
    blurb:
      "Independent study into novel ML architectures, measured by computational efficiency and knowledge representation.",
    detail:
      "Worked with Prof. Amy Hoover on experiments exploring novel machine learning architectures. Implemented and replicated the results of “Topology of Deep Neural Networks” and “Are All Layers Created Equal?”, then tested parameter efficiency in new model types by randomizing or removing layers. Produced visualizations of model decision planes, dataset topology, and model computation/parameter cost.",
    start: "Sep 2024",
    end: "Dec 2024",
    tint: "njit",
    kind: "Research",
    tags: ["PyTorch", "Topology", "Visualization", "NJIT"],
    links: [
      { label: "Topology of Deep Neural Networks", href: "https://arxiv.org/abs/2004.06093" },
      { label: "Are All Layers Created Equal?", href: "https://arxiv.org/abs/1902.01996" },
    ],
  },
  {
    name: "Buckshot Roulette — RL in Stochastic Games",
    blurb:
      "A Python engine for a hidden-information game, built to train reinforcement learning agents against it.",
    detail:
      "Reverse-engineered the original game from decompiled source into a complete, efficient Python library — published on PyPI as buckshot-roulette — specifically so AI engines could be developed against it. Used reinforcement learning to search for optimal strategies, monitored training with Tensorboard, and experimented across a range of training algorithms and model architectures.",
    start: "Jan 2024",
    end: "Nov 2025",
    tint: "personal",
    kind: "ML/AI",
    tags: ["Python", "Reinforcement Learning", "Tensorboard", "PyPI"],
    links: [
      { label: "GitHub", href: "https://github.com/Bytestorm5/Buckshot-Roulette-Python" },
      { label: "PyPI", href: "https://pypi.org/project/buckshot-roulette/" },
    ],
  },
  {
    name: "GalaxyGen",
    blurb:
      "A worldbuilding and mapping tool for sci-fi galaxies — procedural generation with an interactive editor.",
    detail:
      "Three layers: a Python package that procedurally generates and renders galaxies, a FastAPI backend exposing it, and a Next.js + Pixi.js frontend for interactive visualization. Users generate galaxies with customizable star distributions, then edit the graphs representing transit routes across the world, including resource placement with location and density parameters.",
    start: "Jun 2021",
    end: "Jan 2026",
    tint: "personal",
    kind: "Simulation",
    tags: ["TypeScript", "Next.js", "Pixi.js", "FastAPI", "Python"],
    links: [
      { label: "Live demo", href: "https://galaxy-gen-three.vercel.app" },
      { label: "GitHub", href: "https://github.com/Bytestorm5/GalaxyGen" },
    ],
  },
  {
    name: "NJIT Schedule Builder & Course Analysis",
    blurb:
      "Data ingestion and curriculum analysis for a student-built replacement for NJIT's schedule builder.",
    detail:
      "Contributed to a student project aimed at building a better schedule builder for NJIT. Implemented the data ingestion pipelines and ran a variety of analyses on NJIT course curricula and structure — which meant reverse-engineering Ellucian's Scribe language to get at the degree requirements in the first place.",
    start: "Jan 2024",
    end: "Dec 2024",
    tint: "njit",
    kind: "Tools",
    tags: ["Python", "Data Pipelines", "Reverse Engineering"],
    links: [],
  },
  {
    name: "Back2GPT",
    blurb:
      "A retrieval-augmented chatbot answering questions about machine learning course material.",
    detail:
      "Built an LLM-based QA/RAG application to answer questions specific to class material and related topics, as part of my work as a grader. Mined data from approved sources and organized it so answers carry meaningful references — citing Wikipedia or the class website depending on what is most relevant. Used Markprompt for data processing and model access; deployed as a Discord bot in the official class server.",
    start: "May 2023",
    end: "Dec 2023",
    tint: "njit",
    kind: "ML/AI",
    tags: ["LLM", "RAG", "Markprompt", "Discord"],
    links: [],
  },
  {
    name: "ForensicXR",
    blurb:
      "A VR educational tool letting forensic science students investigate digitized crime scenes.",
    detail:
      "Worked on a VR tool that lets forensic science students explore and investigate digitized recreations of staged crime scenes. Developed in the NJIT MIXR Lab, first as a class project and then as a summer research project under the NJIT Provost Undergraduate Summer Research Fellowship.",
    start: "Mar 2022",
    end: "Aug 2022",
    tint: "njit",
    kind: "Research",
    tags: ["VR/XR", "C#", "Unity", "NJIT MIXR Lab"],
    links: [],
  },
];

/**
 * Smaller shipped projects. Metadata only — commit counts and languages for
 * these come from the live GitHub snapshot rather than being restated here.
 */
export const alsoBuilt = [
  {
    name: "Stellaris Mod Utils",
    language: "TypeScript",
    href: "https://github.com/Bytestorm5/Stellaris-Mod-Utils",
    live: "https://stellaris-mod-utils.vercel.app",
  },
  {
    name: "The FollowUp",
    language: "Python",
    href: "https://github.com/Bytestorm5/The-FollowUp",
    live: "https://the-follow-up.vercel.app",
  },
  {
    name: "ServerlessMailer",
    language: "TypeScript",
    href: "https://github.com/Bytestorm5/ServerlessMailer",
    live: "https://serverless-mailer-rho.vercel.app",
  },
  {
    name: "GalaxyForge",
    language: "TypeScript",
    href: "https://github.com/Bytestorm5/GalaxyForge",
    live: null,
  },
  {
    name: "dep-analyzer",
    language: null,
    href: "https://github.com/Bytestorm5/dep-analyzer",
    live: null,
  },
  {
    name: "Live-Search",
    language: "TypeScript",
    href: "https://github.com/Bytestorm5/Live-Search",
    live: null,
  },
  {
    name: "EconomyGame",
    language: "Python",
    href: "https://github.com/Bytestorm5/EconomyGame",
    live: null,
  },
  {
    name: "Project Time Tracker",
    language: "Python",
    href: "https://github.com/Bytestorm5/Project-Time-Tracker",
    live: null,
  },
] as const;

export const projectKinds = ["All", "Research", "ML/AI", "Tools", "Simulation"] as const;
