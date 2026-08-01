export type NavigationItem = {
  id: "identity" | "experience" | "the-word" | "generations" | "visit";
  label: string;
  href: `#${string}`;
  priority: "normal" | "primary";
};

export const navigationItems = [
  { id: "identity", label: "About", href: "#identity", priority: "normal" },
  { id: "experience", label: "Experience", href: "#experience", priority: "normal" },
  { id: "the-word", label: "The Word", href: "#the-word", priority: "normal" },
  { id: "generations", label: "Generations", href: "#generations", priority: "normal" },
  { id: "visit", label: "Visit", href: "#visit", priority: "primary" },
] as const satisfies readonly NavigationItem[];

export type NavigationSectionId = (typeof navigationItems)[number]["id"];

export const hashTargetIds = [
  "home",
  ...navigationItems.map((item) => item.id),
  "invitation",
] as const;
