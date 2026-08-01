import "server-only";

import { church } from "@/content/church";
import { ezraContent } from "@/content/ezra";
import { primaryLocation } from "@/content/locations";

export type EzraLocalAnswer = {
  intent:
    | "address"
    | "church_identity"
    | "ezra_identity"
    | "meeting_times"
    | "name"
    | "slogan"
    | "sunday_time"
    | "wednesday_time";
  text: string;
};

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatAddress() {
  const address = primaryLocation.address;

  return [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

export function findLocalEdsaAnswer(message: string): EzraLocalAnswer | null {
  const value = normalize(message);
  const [sunday, wednesday] = primaryLocation.services;

  if (/^(who|what) are you$/.test(value)) {
    return {
      intent: "ezra_identity",
      text: `I’m ${ezraContent.name}, the ${ezraContent.title}. I’m an AI guide, not a pastor, and I can help with Scripture, Christian living, prayer, and verified information about EDSA.`,
    };
  }

  if (
    /^(what does edsa stand for|what is the full (name|meaning) of edsa|edsa stands for what)$/.test(
      value,
    )
  ) {
    return {
      intent: "name",
      text: `EDSA stands for ${church.name}.`,
    };
  }

  if (
    /^(what is (edsa's|your|the) slogan|what's (edsa's|your|the) slogan|edsa slogan)$/.test(
      value,
    )
  ) {
    return {
      intent: "slogan",
      text: `EDSA’s slogan is “${church.slogan}”`,
    };
  }

  if (
    /^(what is edsa|tell me about edsa|what kind of church is edsa)$/.test(
      value,
    )
  ) {
    return {
      intent: "church_identity",
      text: `${church.name} (${church.shortName}) is ${church.identity.charAt(0).toLowerCase()}${church.identity.slice(1)}`,
    };
  }

  if (
    /\bsunday\b/.test(value) &&
    /\b(service|time|meet|meeting|gather|gathering|worship)\b/.test(value)
  ) {
    return {
      intent: "sunday_time",
      text: `EDSA’s ${sunday.name} is on ${sunday.day} at ${sunday.time} at the ${primaryLocation.name} location.`,
    };
  }

  if (
    /\bwednesday\b/.test(value) &&
    /\b(service|time|meet|meeting|gather|gathering)\b/.test(value)
  ) {
    return {
      intent: "wednesday_time",
      text: `EDSA’s ${wednesday.name} is on ${wednesday.day} at ${wednesday.time} at the ${primaryLocation.name} location.`,
    };
  }

  if (
    /^(when and where (does edsa|do you|does the church) (meet|gather)|when (does edsa|do you|does the church) (meet|gather)|what are (edsa's|your|the) (meeting|service) times|when are (the )?services)$/.test(
      value,
    )
  ) {
    return {
      intent: "meeting_times",
      text: `EDSA meets for ${sunday.name} on ${sunday.day} at ${sunday.time}, and for ${wednesday.name} on ${wednesday.day} at ${wednesday.time}. Both gatherings are at ${formatAddress()}.`,
    };
  }

  if (
    /^(where is edsa|where (is|are) (the church|you) located|what is (edsa's|your|the church) address|how (do|can) i find (edsa|the church)|give me (edsa's|the church) address)$/.test(
      value,
    )
  ) {
    return {
      intent: "address",
      text: `EDSA’s current location is at ${formatAddress()}. You can use the Directions link on the website for the map.`,
    };
  }

  return null;
}
