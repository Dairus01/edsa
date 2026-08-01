export type ChurchLocation = {
  id: string;
  name: string;
  slug: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode?: string;
    country: string;
  };
  services: readonly {
    id: string;
    name: string;
    day: string;
    time: string;
  }[];
  mapsUrl: string;
  isPrimary: boolean;
};

export const locations: readonly ChurchLocation[] = [
  {
    id: "sapele",
    name: "Sapele",
    slug: "sapele",
    address: {
      line1: "107 Okpe Road",
      line2: "Opposite Odebala Plaza",
      city: "Sapele",
      state: "Delta State",
      postalCode: "331107",
      country: "Nigeria",
    },
    services: [
      {
        id: "sunday-worship",
        name: "Sunday Worship Service",
        day: "Sunday",
        time: "8:00 PM",
      },
      {
        id: "wednesday-gathering",
        name: "Wednesday Gathering",
        day: "Wednesday",
        time: "5:00 PM",
      },
    ],
    mapsUrl: "https://maps.app.goo.gl/TRLRY64LkofajeFf9",
    isPrimary: true,
  },
] as const;

export const primaryLocation =
  locations.find((location) => location.isPrimary) ?? locations[0];
