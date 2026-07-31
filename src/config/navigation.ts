export type NavigationItem = {
  id:
    | "who-we-are"
    | "what-we-believe"
    | "experience"
    | "the-word"
    | "generations"
    | "first-visit"
    | "visit";
  label: string;
  shortLabel?: string;
  href: `#${string}`;
  priority?: "normal" | "primary";
};

export const navigationItems = [
  {
    id: "who-we-are",
    label: "About",
    href: "#who-we-are",
    priority: "normal",
  },
  {
    id: "what-we-believe",
    label: "Beliefs",
    href: "#what-we-believe",
    priority: "normal",
  },
  {
    id: "experience",
    label: "Experience",
    href: "#experience",
    priority: "normal",
  },
  {
    id: "the-word",
    label: "The Word",
    href: "#the-word",
    priority: "normal",
  },
  {
    id: "generations",
    label: "Generations",
    href: "#generations",
    priority: "normal",
  },
  {
    id: "first-visit",
    label: "First Visit",
    href: "#first-visit",
    priority: "normal",
  },
  {
    id: "visit",
    label: "Visit",
    href: "#visit",
    priority: "primary",
  },
] as const satisfies readonly NavigationItem[];

export type NavigationSectionId =
  (typeof navigationItems)[number]["id"];

export const hashTargetIds = [
  "home",
  ...navigationItems.map((item) => item.id),
  "invitation",
] as const;
