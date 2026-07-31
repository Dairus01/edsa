export const church = {
  name: "Eagle’s Dominion Synergy Assembly",
  shortName: "EDSA",
  slogan: "Nothing Missing. Nothing Broken.",
  sloganLines: ["Nothing Missing.", "Nothing Broken."],
  services: {
    sunday: {
      label: "Sunday Worship Service",
      time: "8:00 PM",
      requiresVerification: true,
    },
    wednesday: {
      label: "Wednesday Gathering",
      time: "5:00 PM",
      requiresVerification: false,
    },
  },
  address: {
    line1: "107 Okpe Road",
    line2: "Opposite Odebala Plaza",
    city: "Sapele",
    state: "Delta State",
    postalCode: "331107",
    country: "Nigeria",
  },
  links: {
    instagram: "https://www.instagram.com/edsa.intl/",
    facebook:
      "https://www.facebook.com/people/Eagles-Dominion-Synergy-Assembly-EDSA/61584296051802/",
    maps: "https://maps.app.goo.gl/TRLRY64LkofajeFf9",
  },
  metadata: {
    title: "Eagle’s Dominion Synergy Assembly | EDSA Sapele",
    description:
      "Eagle’s Dominion Synergy Assembly is a Christian community in Sapele where people gather to worship, grow in faith, and find belonging. Join EDSA at 107 Okpe Road, opposite Odebala Plaza.",
  },
} as const;
