export type HomepageImage = {
  id: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  position: string;
};

const squareImage = (
  id: string,
  src: string,
  alt: string,
  position = "center center",
): HomepageImage => ({
  id,
  src,
  width: 1170,
  height: 1170,
  alt,
  position,
});

export const homepageImages = {
  heroRelease: squareImage(
    "hero-release",
    "/images/worship/The%20king%20is%20forever%20exalted%20%F0%9F%99%8C%F0%9F%99%8C..%23sundayservice%20%23worshipmoments%20%23edsaintl%20%23sapele%20%23gospelmusic.webp",
    "",
    "center 44%",
  ),
  identity: squareImage(
    "identity",
    "/images/community/710756767_18053818955773015_7679730723888260997_n.webp",
    "The EDSA congregation gathered together for worship.",
    "center 58%",
  ),
  experienceWorship: squareImage(
    "experience-worship",
    "/images/worship/The%20king%20is%20forever%20exalted%20%F0%9F%99%8C%F0%9F%99%8C..%23sundayservice%20%23worshipmoments%20%23edsaintl%20%23sapele%20%23gospelmusic%20(2).webp",
    "Worship leaders singing together during an EDSA gathering.",
    "center center",
  ),
  experiencePrayer: squareImage(
    "experience-prayer",
    "/images/worship/The%20king%20is%20forever%20exalted%20%F0%9F%99%8C%F0%9F%99%8C..%23sundayservice%20%23worshipmoments%20%23edsaintl%20%23sapele%20%23gospelmusic%20(1).webp",
    "A worshipper praying during an EDSA service.",
    "center 42%",
  ),
  experienceCommunity: squareImage(
    "experience-community",
    "/images/community/713443461_18053818943773015_906575657939165069_n.webp",
    "People sharing an EDSA gathering together.",
    "center 62%",
  ),
  wordPrimary: squareImage(
    "word-primary",
    "/images/preaching/And%20God%C2%A0is%C2%A0able%20to%20make%20all%20grace%20abound%20toward%20you%3B%20that%20ye%2C%20always%20having%20all%20sufficiency%20in.webp",
    "A preacher teaching from Scripture at an EDSA gathering.",
    "center 35%",
  ),
  wordSecondary: squareImage(
    "word-secondary",
    "/images/preaching/The%20king%20is%20forever%20exalted%20%F0%9F%99%8C%F0%9F%99%8C..%23sundayservice%20%23worshipmoments%20%23edsaintl%20%23sapele%20%23gospelmusic%20(3).webp",
    "An adult speaker sharing the Word during an EDSA gathering.",
    "center 40%",
  ),
  wordYouth: squareImage(
    "word-youth",
    "/images/preaching/717186277_18053818865773015_5371683729289110217_n.webp",
    "A young speaker addressing the EDSA congregation.",
    "center 28%",
  ),
  generationsPrimary: squareImage(
    "generations-primary",
    "/images/children/Oh%20that%C2%A0men%C2%A0would%20praise%20the%20LORD%C2%A0for%C2%A0his%20goodness%2C%20and%C2%A0for%C2%A0his%20wonderful%20works%20to%20the%20children%20(1).webp",
    "A child speaking during an EDSA gathering.",
    "center 42%",
  ),
  generationsSecondary: squareImage(
    "generations-secondary",
    "/images/children/Oh%20that%C2%A0men%C2%A0would%20praise%20the%20LORD%C2%A0for%C2%A0his%20goodness%2C%20and%C2%A0for%C2%A0his%20wonderful%20works%20to%20the%20children.webp",
    "Children participating together on the EDSA stage.",
    "center 62%",
  ),
  visit: squareImage(
    "visit",
    "/images/building/And%20out%20of%20them%20shall%20proceed%20thanksgiving%20and%20the%20voice%20of%20them%20that%20make%20merry-%20and%20I%20will%20m%20(1).webp",
    "The entrance to the EDSA Sapele location with welcome hosts.",
    "center 32%",
  ),
  invitation: squareImage(
    "invitation",
    "/images/building/And%20out%20of%20them%20shall%20proceed%20thanksgiving%20and%20the%20voice%20of%20them%20that%20make%20merry-%20and%20I%20will%20m.webp",
    "A smiling welcome host outside Eagle’s Dominion Synergy Assembly.",
    "center 56%",
  ),
} as const satisfies Record<string, HomepageImage>;
