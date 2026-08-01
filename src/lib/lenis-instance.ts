import type Lenis from "lenis";

let activeLenis: Lenis | null = null;

export function setLenisInstance(instance: Lenis | null) {
  activeLenis = instance;

  if (
    instance &&
    (document.body.classList.contains("navigation-menu-open") ||
      document.body.classList.contains("ezra-chat-open"))
  ) {
    instance.stop();
  }
}

export function getLenisInstance() {
  return activeLenis;
}
