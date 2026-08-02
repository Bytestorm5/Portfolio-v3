export const profile = {
  name: "Kamil Arif",
  role: "Data Scientist / ML Engineer",
  location: "New Jersey, USA",
  /* Rotator phrases, carried over from the v2 hero. */
  taglines: [
    "an End-to-End CV pipeline?",
    "an Agentic LLM integration?",
    "custom ML architectures?",
    "network topology optimization?",
  ],
  summary:
    "Data Scientist at AT&T building optimization and anomaly-detection systems for " +
    "a national network. I work where applied ML meets hard operational constraints — " +
    "algorithms that have to survive contact with real infrastructure, real budgets, " +
    "and real engineering agreements.",
  /* No email or phone here on purpose — contact goes through LinkedIn so the
     address never sits in public HTML for scrapers to lift. */
  links: {
    github: "https://github.com/Bytestorm5",
    githubUser: "Bytestorm5",
    linkedin: "https://www.linkedin.com/in/kamil-arif",
    site: "https://kamilarif.com/",
  },
} as const;

