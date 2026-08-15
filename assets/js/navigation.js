/* ==========================================================================
   SOLAS BELAL — NAVIGATION
   File: assets/js/navigation.js
   Project: https://solasbelal.github.io/solas-belal/
   ========================================================================== */

(() => {
  "use strict";


  /* ==========================================================================
     01. CONFIGURATION
     ========================================================================== */

  const CONFIG = Object.freeze({
    basePath: "/solas-belal/",
    mobileBreakpoint: 900,
    headerScrollThreshold: 18,

    selectors: {
      header: ".site-header",
      menuToggle: ".menu-toggle",
      mobileNav: ".mobile-nav",
      mobileNavInner: ".mobile-nav__inner",
      desktopLinks: ".site-nav__link",
      mobileLinks: ".mobile-nav__link",

      allNavigationLinks:
        ".site-nav__link, .mobile-nav__link, [data-nav-link]"
    },

    classes: {
      menuOpen: "menu-open",
      navOpen: "is-open",
      active: "is-active",
      headerScrolled: "is-scrolled"
    }
  });


  /* ==========================================================================
     02. LANGUAGE STRINGS
     ========================================================================== */

  const STRINGS = Object.freeze({
    bn: Object.freeze({
      openNavigationMenu: "নেভিগেশন মেনু খুলুন",
      closeNavigationMenu: "নেভিগেশন মেনু বন্ধ করুন"
    }),

    en: Object.freeze({
      openNavigationMenu: "Open navigation menu",
      closeNavigationMenu: "Close navigation menu"
    })
  });


  /* ==========================================================================
     03. STATE
     ========================================================================== */

  const state = {
    initialized: false,
    menuOpen: false,
    scrollY: 0,
    lastFocusedElement: null
  };


  /* ==========================================================================
     04. ELEMENT REFERENCES
     ========================================================================== */

  const elements = {
    header: null,
    menuToggle: null,
    mobileNav: null,
    mobileNavInner: null,
    navigationLinks: []
  };


  /* ==========================================================================
     05. BASIC HELPERS
     ========================================================================== */

  /**
   * Safely query a single element.
   *
   * @param {string} selector
   * @param {ParentNode} root
   * @returns {Element|null}
   */
  function qs(selector, root = document) {
    return root.querySelector(selector);
  }


  /**
   * Safely query multiple elements.
   *
   * @param {string} selector
   * @param {ParentNode} root
   * @returns {Element[]}
   */
  function qsa(selector, root = document) {
    return Array.from(
      root.querySelectorAll(selector)
    );
  }


  /**
   * Determine the current website language.
   *
   * Supported:
   * bn
   * bn-BD
   * en
   * en-BD
   *
   * @returns {"bn"|"en"}
   */
  function getCurrentLanguage() {
    const language = (
      document.documentElement.lang || ""
    )
      .trim()
      .toLowerCase();

    return language.startsWith("bn")
      ? "bn"
      : "en";
  }


  /**
   * Get a translated interface string.
   *
   * @param {keyof typeof STRINGS.en} key
   * @returns {string}
   */
  function translate(key) {
    const language = getCurrentLanguage();

    return (
      STRINGS[language]?.[key] ||
      STRINGS.en[key] ||
      ""
    );
  }


  /**
   * Normalize a pathname for reliable navigation matching.
   *
   * Examples:
   *
   * /solas-belal
   * -> /solas-belal/
   *
   * /solas-belal/about
   * -> /solas-belal/about/
   *
   * /solas-belal/about/
   * -> /solas-belal/about/
   *
   * /solas-belal/index.html
   * -> /solas-belal/
   *
   * /solas-belal/en
   * -> /solas-belal/en/
   *
   * /solas-belal/en/about
   * -> /solas-belal/en/about/
   *
   * @param {string} pathname
   * @returns {string}
   */
  function normalizePath(pathname) {
    let path = pathname || "/";

    try {
      path = decodeURIComponent(path);
    } catch {
      /*
       * Keep original pathname if URI decoding fails.
       */
    }

    path = path
      .replace(/\/index\.html$/i, "/")
      .replace(/\/{2,}/g, "/");

    if (!path.startsWith("/")) {
      path = `/${path}`;
    }

    if (!path.endsWith("/")) {
      path += "/";
    }

    return path;
  }


  /**
   * Resolve a navigation href into an absolute URL.
   *
   * @param {HTMLAnchorElement} link
   * @returns {URL|null}
   */
  function getLinkUrl(link) {
    if (!(link instanceof HTMLAnchorElement)) {
      return null;
    }

    const href = link.getAttribute("href");

    if (!href) {
      return null;
    }

    const normalizedHref = href
      .trim()
      .toLowerCase();

    if (
      href.startsWith("#") ||
      normalizedHref.startsWith("mailto:") ||
      normalizedHref.startsWith("tel:") ||
      normalizedHref.startsWith("javascript:")
    ) {
      return null;
    }

    try {
      return new URL(
        href,
        window.location.href
      );
    } catch {
      return null;
    }
  }


  /**
   * Return focusable elements contained within a node.
   *
   * @param {Element} container
   * @returns {HTMLElement[]}
   */
  function getFocusableElements(container) {
    if (!container) {
      return [];
    }

    const selector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])"
    ].join(",");

    return qsa(
      selector,
      container
    ).filter((element) => {
      if (!(element instanceof HTMLElement)) {
        return false;
      }

      if (element.hasAttribute("hidden")) {
        return false;
      }

      if (
        element.getAttribute("aria-hidden") ===
        "true"
      ) {
        return false;
      }

      return element.offsetParent !== null;
    });
  }


  /**
   * Detect whether viewport is desktop-sized.
   *
   * @returns {boolean}
   */
  function isDesktop() {
    return window.matchMedia(
      `(min-width: ${CONFIG.mobileBreakpoint}px)`
    ).matches;
  }


  /**
   * Check whether reduced motion is preferred.
   *
   * @returns {boolean}
   */
  function prefersReducedMotion() {
    return window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }


  /* ==========================================================================
     06. BODY SCROLL LOCK
     ========================================================================== */

  function lockBodyScroll() {
    state.scrollY = window.scrollY;

    document.body.style.top =
      `-${state.scrollY}px`;

    document.body.style.left = "0";
    document.body.style.right = "0";

    document.body.classList.add(
      CONFIG.classes.menuOpen
    );
  }


  function unlockBodyScroll() {
    document.body.classList.remove(
      CONFIG.classes.menuOpen
    );

    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";

    window.scrollTo({
      top: state.scrollY,
      left: 0,
      behavior: "auto"
    });
  }


  /* ==========================================================================
     07. MOBILE MENU ARIA TEXT
     ========================================================================== */

  function updateMenuToggleLabel() {
    if (!elements.menuToggle) {
      return;
    }

    const label = state.menuOpen
      ? translate("closeNavigationMenu")
      : translate("openNavigationMenu");

    elements.menuToggle.setAttribute(
      "aria-label",
      label
    );

    elements.menuToggle.setAttribute(
      "title",
      label
    );
  }


  /* ==========================================================================
     08. MOBILE MENU
     ========================================================================== */

  function openMobileMenu({
    focusFirst = true
  } = {}) {
    if (
      !elements.mobileNav ||
      !elements.menuToggle ||
      isDesktop() ||
      state.menuOpen
    ) {
      return;
    }

    state.menuOpen = true;

    state.lastFocusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    elements.menuToggle.setAttribute(
      "aria-expanded",
      "true"
    );

    updateMenuToggleLabel();

    elements.mobileNav.classList.add(
      CONFIG.classes.navOpen
    );

    elements.mobileNav.setAttribute(
      "aria-hidden",
      "false"
    );

    lockBodyScroll();

    if (focusFirst) {
      window.requestAnimationFrame(() => {
        const focusable =
          getFocusableElements(
            elements.mobileNav
          );

        if (focusable.length > 0) {
          focusable[0].focus();
          return;
        }

        if (
          elements.mobileNav instanceof HTMLElement
        ) {
          elements.mobileNav.setAttribute(
            "tabindex",
            "-1"
          );

          elements.mobileNav.focus();
        }
      });
    }

    document.dispatchEvent(
      new CustomEvent(
        "solasbelal:menuopen"
      )
    );
  }


  function closeMobileMenu({
    restoreFocus = true,
    preserveScroll = false
  } = {}) {
    if (
      !elements.mobileNav ||
      !elements.menuToggle ||
      !state.menuOpen
    ) {
      return;
    }

    state.menuOpen = false;

    elements.menuToggle.setAttribute(
      "aria-expanded",
      "false"
    );

    updateMenuToggleLabel();

    elements.mobileNav.classList.remove(
      CONFIG.classes.navOpen
    );

    elements.mobileNav.setAttribute(
      "aria-hidden",
      "true"
    );

    if (preserveScroll) {
      document.body.classList.remove(
        CONFIG.classes.menuOpen
      );

      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
    } else {
      unlockBodyScroll();
    }

    if (
      restoreFocus &&
      state.lastFocusedElement &&
      document.contains(
        state.lastFocusedElement
      )
    ) {
      state.lastFocusedElement.focus();
    }

    document.dispatchEvent(
      new CustomEvent(
        "solasbelal:menuclose"
      )
    );
  }


  function toggleMobileMenu() {
    if (state.menuOpen) {
      closeMobileMenu();
      return;
    }

    openMobileMenu();
  }


  /* ==========================================================================
     09. ACCESSIBLE FOCUS TRAP
     ========================================================================== */

  function handleFocusTrap(event) {
    if (
      event.key !== "Tab" ||
      !state.menuOpen ||
      !elements.mobileNav
    ) {
      return;
    }

    const focusable =
      getFocusableElements(
        elements.mobileNav
      );

    if (
      elements.menuToggle instanceof HTMLElement
    ) {
      focusable.unshift(
        elements.menuToggle
      );
    }

    if (focusable.length === 0) {
      return;
    }

    const first = focusable[0];

    const last =
      focusable[
        focusable.length - 1
      ];

    const active =
      document.activeElement;

    if (
      event.shiftKey &&
      active === first
    ) {
      event.preventDefault();

      last.focus();

      return;
    }

    if (
      !event.shiftKey &&
      active === last
    ) {
      event.preventDefault();

      first.focus();
    }
  }


  /* ==========================================================================
     10. ACTIVE PAGE DETECTION
     ========================================================================== */

  function updateActiveNavigation() {
    const currentPath =
      normalizePath(
        window.location.pathname
      );

    elements.navigationLinks.forEach(
      (link) => {
        if (
          !(link instanceof HTMLAnchorElement)
        ) {
          return;
        }

        const linkUrl =
          getLinkUrl(link);

        if (!linkUrl) {
          return;
        }

        if (
          linkUrl.origin !==
          window.location.origin
        ) {
          return;
        }

        const linkPath =
          normalizePath(
            linkUrl.pathname
          );

        const isActive =
          linkPath === currentPath;

        link.classList.toggle(
          CONFIG.classes.active,
          isActive
        );

        if (isActive) {
          link.setAttribute(
            "aria-current",
            "page"
          );
        } else {
          link.removeAttribute(
            "aria-current"
          );
        }
      }
    );
  }


  /* ==========================================================================
     11. HEADER SCROLL STATE
     ========================================================================== */

  function updateHeaderState() {
    if (!elements.header) {
      return;
    }

    const scrolled =
      window.scrollY >
      CONFIG.headerScrollThreshold;

    elements.header.classList.toggle(
      CONFIG.classes.headerScrolled,
      scrolled
    );
  }


  /* ==========================================================================
     12. INTERNAL HASH NAVIGATION
     ========================================================================== */

  function handleHashNavigation(
    link,
    event
  ) {
    if (
      !(link instanceof HTMLAnchorElement)
    ) {
      return false;
    }

    const href =
      link.getAttribute("href");

    if (
      !href ||
      !href.includes("#")
    ) {
      return false;
    }

    let url;

    try {
      url = new URL(
        href,
        window.location.href
      );
    } catch {
      return false;
    }

    const currentPath =
      normalizePath(
        window.location.pathname
      );

    const destinationPath =
      normalizePath(
        url.pathname
      );

    if (
      url.origin !==
        window.location.origin ||
      destinationPath !==
        currentPath ||
      !url.hash
    ) {
      return false;
    }

    let id;

    try {
      id = decodeURIComponent(
        url.hash.slice(1)
      );
    } catch {
      id = url.hash.slice(1);
    }

    if (!id) {
      return false;
    }

    const target =
      document.getElementById(id);

    if (!target) {
      return false;
    }

    event.preventDefault();

    if (state.menuOpen) {
      closeMobileMenu({
        restoreFocus: false
      });
    }

    target.scrollIntoView({
      behavior: prefersReducedMotion()
        ? "auto"
        : "smooth",

      block: "start"
    });

    history.pushState(
      null,
      "",
      `${window.location.pathname}${window.location.search}#${encodeURIComponent(id)}`
    );

    window.setTimeout(
      () => {
        if (
          !(target instanceof HTMLElement)
        ) {
          return;
        }

        const hadTabIndex =
          target.hasAttribute(
            "tabindex"
          );

        if (!hadTabIndex) {
          target.setAttribute(
            "tabindex",
            "-1"
          );
        }

        target.focus({
          preventScroll: true
        });

        if (!hadTabIndex) {
          target.addEventListener(
            "blur",
            () => {
              target.removeAttribute(
                "tabindex"
              );
            },
            {
              once: true
            }
          );
        }
      },

      prefersReducedMotion()
        ? 0
        : 350
    );

    return true;
  }


  /* ==========================================================================
     13. NAVIGATION LINK HANDLER
     ========================================================================== */

  function handleNavigationClick(event) {
    const target =
      event.target;

    if (
      !(target instanceof Element)
    ) {
      return;
    }

    const link =
      target.closest(
        CONFIG.selectors
          .allNavigationLinks
      );

    if (
      !(link instanceof HTMLAnchorElement)
    ) {
      return;
    }

    if (
      handleHashNavigation(
        link,
        event
      )
    ) {
      return;
    }

    const url =
      getLinkUrl(link);

    if (!url) {
      return;
    }

    const isInternal =
      url.origin ===
      window.location.origin;

    if (
      state.menuOpen &&
      isInternal
    ) {
      /*
       * The browser is about to navigate.
       * Remove fixed body styles without
       * restoring the current scroll first.
       */

      closeMobileMenu({
        restoreFocus: false,
        preserveScroll: true
      });
    }
  }


  /* ==========================================================================
     14. KEYBOARD HANDLING
     ========================================================================== */

  function handleKeydown(event) {
    if (
      event.key === "Escape" &&
      state.menuOpen
    ) {
      event.preventDefault();

      closeMobileMenu({
        restoreFocus: true
      });

      return;
    }

    handleFocusTrap(event);
  }


  /* ==========================================================================
     15. MOBILE NAV BACKDROP CLICK
     ========================================================================== */

  function handleMobileNavClick(event) {
    if (
      !state.menuOpen ||
      !elements.mobileNav
    ) {
      return;
    }

    /*
     * Close only when the full-screen
     * navigation backdrop itself is clicked.
     */

    if (
      event.target ===
      elements.mobileNav
    ) {
      closeMobileMenu();
    }
  }


  /* ==========================================================================
     16. VIEWPORT CHANGE HANDLING
     ========================================================================== */

  function handleViewportChange() {
    if (
      isDesktop() &&
      state.menuOpen
    ) {
      closeMobileMenu({
        restoreFocus: false
      });
    }
  }


  /* ==========================================================================
     17. PAGE SHOW / BFCACHE SUPPORT
     ========================================================================== */

  function handlePageShow() {
    /*
     * Restore navigation correctly when
     * returning through browser back/forward
     * cache.
     */

    if (state.menuOpen) {
      closeMobileMenu({
        restoreFocus: false
      });
    }

    updateMenuToggleLabel();
    updateActiveNavigation();
    updateHeaderState();
  }


  /* ==========================================================================
     18. LANGUAGE STATE
     ========================================================================== */

  function initializeLanguageState() {
    const language =
      getCurrentLanguage();

    document.documentElement.dataset.language =
      language;
  }


  /* ==========================================================================
     19. EVENT BINDING
     ========================================================================== */

  function bindEvents() {
    if (elements.menuToggle) {
      elements.menuToggle.addEventListener(
        "click",
        toggleMobileMenu
      );
    }

    document.addEventListener(
      "click",
      handleNavigationClick
    );

    document.addEventListener(
      "keydown",
      handleKeydown
    );

    if (elements.mobileNav) {
      elements.mobileNav.addEventListener(
        "click",
        handleMobileNavClick
      );
    }

    window.addEventListener(
      "scroll",
      updateHeaderState,
      {
        passive: true
      }
    );

    window.addEventListener(
      "resize",
      handleViewportChange,
      {
        passive: true
      }
    );

    window.addEventListener(
      "orientationchange",
      handleViewportChange,
      {
        passive: true
      }
    );

    window.addEventListener(
      "pageshow",
      handlePageShow
    );

    window.addEventListener(
      "popstate",
      updateActiveNavigation
    );
  }


  /* ==========================================================================
     20. ARIA INITIALIZATION
     ========================================================================== */

  function initializeAria() {
    if (elements.menuToggle) {
      elements.menuToggle.setAttribute(
        "aria-expanded",
        "false"
      );

      updateMenuToggleLabel();

      if (
        elements.mobileNav &&
        !elements.menuToggle.hasAttribute(
          "aria-controls"
        )
      ) {
        if (!elements.mobileNav.id) {
          elements.mobileNav.id =
            "mobile-navigation";
        }

        elements.menuToggle.setAttribute(
          "aria-controls",
          elements.mobileNav.id
        );
      }
    }

    if (elements.mobileNav) {
      elements.mobileNav.setAttribute(
        "aria-hidden",
        "true"
      );
    }
  }


  /* ==========================================================================
     21. CACHE DOM
     ========================================================================== */

  function cacheElements() {
    elements.header =
      qs(
        CONFIG.selectors.header
      );

    elements.menuToggle =
      qs(
        CONFIG.selectors.menuToggle
      );

    elements.mobileNav =
      qs(
        CONFIG.selectors.mobileNav
      );

    elements.mobileNavInner =
      elements.mobileNav
        ? qs(
            CONFIG.selectors
              .mobileNavInner,

            elements.mobileNav
          )
        : null;

    elements.navigationLinks =
      qsa(
        CONFIG.selectors
          .allNavigationLinks
      );
  }


  /* ==========================================================================
     22. INITIALIZATION
     ========================================================================== */

  function init() {
    if (state.initialized) {
      return;
    }

    state.initialized = true;

    cacheElements();

    initializeLanguageState();

    initializeAria();

    updateActiveNavigation();

    updateHeaderState();

    bindEvents();

    document.documentElement.classList.add(
      "navigation-ready"
    );

    document.dispatchEvent(
      new CustomEvent(
        "solasbelal:navigationready",
        {
          detail: {
            language:
              getCurrentLanguage()
          }
        }
      )
    );
  }


  /* ==========================================================================
     23. BOOTSTRAP
     ========================================================================== */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once: true
      }
    );
  } else {
    init();
  }


  /* ==========================================================================
     24. PUBLIC API
     ========================================================================== */

  window.SolasBelalNavigation =
    Object.freeze({
      open: openMobileMenu,

      close: closeMobileMenu,

      toggle: toggleMobileMenu,

      updateActive:
        updateActiveNavigation,

      language:
        getCurrentLanguage,

      isOpen() {
        return state.menuOpen;
      }
    });
})();