"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

import { navigationItems } from "@/config/navigation";
import { church } from "@/content/church";
import { useActiveSection } from "@/hooks/useActiveSection";
import { useSectionNavigation } from "@/hooks/useSectionNavigation";
import { getLenisInstance } from "@/lib/lenis-instance";

export function SiteNavigation() {
  const headerRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const restoreMenuFocusRef = useRef(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const activeSection = useActiveSection();
  const { handleAnchorClick } = useSectionNavigation(headerRef);

  const releaseMenuLock = useCallback(() => {
    document.body.classList.remove("navigation-menu-open");
    getLenisInstance()?.start();
  }, []);

  const closeMenu = useCallback(
    (restoreFocus: boolean) => {
      restoreMenuFocusRef.current = restoreFocus;
      const dialog = dialogRef.current;

      if (dialog?.open) {
        dialog.close();
        releaseMenuLock();
      } else {
        setMenuOpen(false);
        releaseMenuLock();

        if (restoreFocus) {
          menuTriggerRef.current?.focus({ preventScroll: true });
        }
      }
    },
    [releaseMenuLock],
  );

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!menuOpen || !dialog || dialog.open) {
      return;
    }

    document.body.classList.add("navigation-menu-open");
    getLenisInstance()?.stop();
    dialog.showModal();
    window.requestAnimationFrame(() => {
      dialog
        .querySelector<HTMLAnchorElement>("a[href]")
        ?.focus({ preventScroll: true });
    });
  }, [menuOpen]);

  useEffect(() => {
    const desktopNavigation = window.matchMedia(
      "(min-width: 1180px)",
    );
    const closeAtDesktop = () => {
      if (desktopNavigation.matches && dialogRef.current?.open) {
        closeMenu(false);
      }
    };

    desktopNavigation.addEventListener("change", closeAtDesktop);

    return () => {
      desktopNavigation.removeEventListener(
        "change",
        closeAtDesktop,
      );
      if (dialogRef.current?.open) {
        dialogRef.current.close();
      }
      releaseMenuLock();
    };
  }, [closeMenu, releaseMenuLock]);

  const handleDialogClose = () => {
    setMenuOpen(false);
    releaseMenuLock();

    if (restoreMenuFocusRef.current) {
      menuTriggerRef.current?.focus({ preventScroll: true });
    }

    restoreMenuFocusRef.current = true;
  };

  const handleDialogCancel = (event: React.SyntheticEvent) => {
    event.preventDefault();
    closeMenu(true);
  };

  const handleBackdropClick = (
    event: ReactMouseEvent<HTMLDialogElement>,
  ) => {
    if (event.target === event.currentTarget) {
      closeMenu(true);
    }
  };

  const handleMobileAnchorClick = (
    event: ReactMouseEvent<HTMLAnchorElement>,
  ) => {
    closeMenu(false);
    handleAnchorClick(event);
  };

  return (
    <header
      ref={headerRef}
      className="site-header"
      data-opening={String(activeSection === "home")}
    >
      <a
        className="site-header__wordmark"
        href="#home"
        aria-label={`${church.name} home`}
        onClick={handleAnchorClick}
      >
        {church.shortName}
      </a>

      <nav
        className="site-header__nav site-header__nav--desktop"
        aria-label="Primary navigation"
      >
        {navigationItems.map((item) => (
          <a
            href={item.href}
            className={
              item.priority === "primary"
                ? "site-header__visit"
                : undefined
            }
            aria-current={
              activeSection === item.id ? "location" : undefined
            }
            onClick={handleAnchorClick}
            key={item.id}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <button
        ref={menuTriggerRef}
        className="site-header__menu-trigger"
        type="button"
        aria-expanded={menuOpen}
        aria-controls="site-navigation-dialog"
        onClick={() => {
          restoreMenuFocusRef.current = true;
          setMenuOpen(true);
        }}
      >
        Menu
      </button>

      <dialog
        ref={dialogRef}
        id="site-navigation-dialog"
        className="mobile-navigation"
        aria-label="Site navigation"
        onClose={handleDialogClose}
        onCancel={handleDialogCancel}
        onClick={handleBackdropClick}
      >
        <div className="mobile-navigation__panel">
          <div className="mobile-navigation__topline">
            <a
              className="mobile-navigation__wordmark"
              href="#home"
              onClick={handleMobileAnchorClick}
            >
              {church.shortName}
            </a>
            <button
              className="mobile-navigation__close"
              type="button"
              onClick={() => closeMenu(true)}
            >
              Close menu
            </button>
          </div>

          <nav
            className="mobile-navigation__links"
            aria-label="Primary navigation"
          >
            {navigationItems.map((item) => (
              <a
                href={item.href}
                data-priority={item.priority}
                aria-current={
                  activeSection === item.id ? "location" : undefined
                }
                onClick={handleMobileAnchorClick}
                key={item.id}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </dialog>
    </header>
  );
}
