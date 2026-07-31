export type ScriptureDisplayMode =
  | "inline"
  | "feature"
  | "transition";

export type ScriptureAlignment = "left" | "center" | "right";

export type ScriptureEntry = {
  id: string;
  reference: string;
  text: string;
  translation: "KJV";
  sectionId: string;
  theme: string;
  displayMode: ScriptureDisplayMode;
  alignment: ScriptureAlignment;
};

export const scripture = {
  community: {
    id: "community-unity",
    reference: "Psalm 133:1",
    text:
      "Behold, how good and how pleasant it is for brethren to dwell together in unity!",
    translation: "KJV",
    sectionId: "who-we-are",
    theme: "Unity and belonging",
    displayMode: "feature",
    alignment: "left",
  },

  restoration: {
    id: "restoration-hope",
    reference: "Psalm 147:3",
    text:
      "He healeth the broken in heart, and bindeth up their wounds.",
    translation: "KJV",
    sectionId: "what-we-believe",
    theme: "Healing and restoration",
    displayMode: "feature",
    alignment: "left",
  },

  gathering: {
    id: "gathering-together",
    reference: "Acts 2:42",
    text:
      "And they continued stedfastly in the apostles' doctrine and fellowship, and in breaking of bread, and in prayers.",
    translation: "KJV",
    sectionId: "experience",
    theme: "Doctrine, fellowship, and prayer",
    displayMode: "inline",
    alignment: "left",
  },

  word: {
    id: "scripture-purpose",
    reference: "2 Timothy 3:16",
    text:
      "All scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness.",
    translation: "KJV",
    sectionId: "the-word",
    theme: "The purpose of Scripture",
    displayMode: "feature",
    alignment: "left",
  },

  generations: {
    id: "generation-to-generation",
    reference: "Psalm 145:4",
    text:
      "One generation shall praise thy works to another, and shall declare thy mighty acts.",
    translation: "KJV",
    sectionId: "generations",
    theme: "Faith across generations",
    displayMode: "feature",
    alignment: "left",
  },

  invitation: {
    id: "invitation-to-rest",
    reference: "Matthew 11:28",
    text:
      "Come unto me, all ye that labour and are heavy laden, and I will give you rest.",
    translation: "KJV",
    sectionId: "invitation",
    theme: "Welcome and rest",
    displayMode: "feature",
    alignment: "left",
  },
} as const satisfies Record<string, ScriptureEntry>;
