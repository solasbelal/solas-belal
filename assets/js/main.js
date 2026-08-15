/* ==========================================================================
   SOLAS BELAL — MAIN JAVASCRIPT
   File: assets/js/main.js
   Project: https://solasbelal.github.io/solas-belal/
   ========================================================================== */

(() => {
  "use strict";


  /* ==========================================================================
     01. PROJECT CONFIG
     ========================================================================== */

  const CONFIG = Object.freeze({
    siteName: "Solas Belal",
    basePath: "/solas-belal/",
    animationThreshold: 0.01,
    backToTopThreshold: 500,
    lightboxTransition: 220,
    externalLinkRel: "noopener noreferrer"
  });


  /* ==========================================================================
     02. LANGUAGE STRINGS
     ========================================================================== */

  const STRINGS = Object.freeze({
    bn: Object.freeze({
      imageViewer: "ছবি দেখার ভিউয়ার",
      closeImageViewer: "ছবি দেখার ভিউয়ার বন্ধ করুন",
      previousImage: "আগের ছবি",
      nextImage: "পরের ছবি",
      copied: "কপি হয়েছে",
      copyFailed: "কপি করা যায়নি",
      linkCopied: "লিংক কপি হয়েছে",
      imageUnavailable: "ছবি পাওয়া যাচ্ছে না",
      shareActionFailed: "শেয়ার করা যায়নি।"
    }),

    en: Object.freeze({
      imageViewer: "Image viewer",
      closeImageViewer: "Close image viewer",
      previousImage: "Previous image",
      nextImage: "Next image",
      copied: "Copied",
      copyFailed: "Copy failed",
      linkCopied: "Link copied",
      imageUnavailable: "Image unavailable",
      shareActionFailed: "Share action failed."
    })
  });


  /* ==========================================================================
     03. STATE
     ========================================================================== */

  const state = {
    initialized: false,
    lightboxOpen: false,
    currentLightboxIndex: 0,
    lightboxItems: [],
    lastFocusedElement: null,
    previousBodyOverflow: ""
  };


  /* ==========================================================================
     04. DOM HELPERS
     ========================================================================== */

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }


  function qsa(selector, root = document) {
    return Array.from(
      root.querySelectorAll(selector)
    );
  }


  function createElement(tag, className = "") {
    const element =
      document.createElement(tag);

    if (className) {
      element.className = className;
    }

    return element;
  }


  function prefersReducedMotion() {
    return window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }


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


  function translate(key) {
    const language =
      getCurrentLanguage();

    return (
      STRINGS[language]?.[key] ||
      STRINGS.en[key] ||
      ""
    );
  }


  function isExternalUrl(url) {
    try {
      const parsed =
        new URL(
          url,
          window.location.href
        );

      return (
        (
          parsed.protocol === "http:" ||
          parsed.protocol === "https:"
        ) &&
        parsed.origin !==
          window.location.origin
      );
    } catch {
      return false;
    }
  }


  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  /* ==========================================================================
     05. CURRENT YEAR
     ========================================================================== */

  function updateCurrentYear() {
    const year =
      String(
        new Date().getFullYear()
      );

    qsa("[data-current-year]")
      .forEach((element) => {
        element.textContent = year;
      });
  }


  /* ==========================================================================
     06. EXTERNAL LINKS
     ========================================================================== */

  function secureExternalLinks() {
    qsa("a[href]").forEach((link) => {
      if (
        !(link instanceof HTMLAnchorElement)
      ) {
        return;
      }

      const href =
        link.getAttribute("href");

      if (
        !href ||
        !isExternalUrl(href)
      ) {
        return;
      }

      if (!link.hasAttribute("target")) {
        link.setAttribute(
          "target",
          "_blank"
        );
      }

      const relValues =
        new Set(
          (
            link.getAttribute("rel") ||
            ""
          )
            .split(/\s+/)
            .filter(Boolean)
        );

      CONFIG.externalLinkRel
        .split(/\s+/)
        .forEach((value) => {
          relValues.add(value);
        });

      link.setAttribute(
        "rel",
        Array.from(relValues)
          .join(" ")
      );
    });
  }


  /* ==========================================================================
     07. LAZY IMAGE FALLBACK
     ========================================================================== */

  function initializeLazyImages() {
    qsa("img").forEach((image) => {
      if (
        !(image instanceof HTMLImageElement)
      ) {
        return;
      }

      if (
        !image.hasAttribute("loading") &&
        !image.hasAttribute("data-priority")
      ) {
        image.loading = "lazy";
      }

      if (
        !image.hasAttribute("decoding")
      ) {
        image.decoding = "async";
      }

      image.addEventListener(
        "error",
        () => {
          image.classList.add(
            "image-load-error"
          );
        },
        {
          once: true
        }
      );
    });
  }


  /* ==========================================================================
     08. REVEAL ANIMATIONS
     ========================================================================== */

  function initializeRevealAnimations() {
    const revealElements =
      qsa(
        "[data-reveal]:not(.is-visible)"
      );

    if (
      revealElements.length === 0
    ) {
      return;
    }

    /*
     * Accessibility / compatibility fallback:
     * If motion is reduced or IntersectionObserver is unavailable,
     * reveal all content immediately.
     */
    if (
      prefersReducedMotion() ||
      !(
        "IntersectionObserver"
        in window
      )
    ) {
      revealElements.forEach(
        (element) => {
          element.classList.add(
            "is-visible"
          );
        }
      );

      return;
    }


    /*
     * Long content such as Privacy Policy or Terms & Conditions
     * can be several times taller than the viewport.
     *
     * IntersectionObserver thresholds are calculated against the
     * entire target height. A large threshold can therefore leave
     * long articles permanently invisible.
     *
     * Any reveal target substantially taller than the viewport is
     * made visible immediately. Normal cards, headings and sections
     * continue to use scroll-based reveal animation.
     */
    const viewportHeight =
      Math.max(
        window.innerHeight || 0,
        document.documentElement
          .clientHeight || 0
      );

    const observableElements = [];

    revealElements.forEach(
      (element) => {
        const rect =
          element.getBoundingClientRect();

        const isLargeRevealTarget =
          viewportHeight > 0 &&
          rect.height >
            viewportHeight * 1.25;

        if (isLargeRevealTarget) {
          element.classList.add(
            "is-visible"
          );

          return;
        }

        observableElements.push(
          element
        );
      }
    );

    if (
      observableElements.length === 0
    ) {
      return;
    }


    /*
     * Use a very small intersection threshold so content becomes
     * visible as soon as it meaningfully enters the viewport.
     */
    const observer =
      new IntersectionObserver(
        (
          entries,
          currentObserver
        ) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }

            const element =
              entry.target;

            const delay =
              Number(
                element.getAttribute(
                  "data-reveal-delay"
                ) || 0
              );

            if (
              Number.isFinite(delay) &&
              delay > 0
            ) {
              window.setTimeout(
                () => {
                  element.classList.add(
                    "is-visible"
                  );
                },
                delay
              );
            } else {
              element.classList.add(
                "is-visible"
              );
            }

            currentObserver.unobserve(
              element
            );
          });
        },
        {
          threshold:
            CONFIG.animationThreshold,

          rootMargin:
            "0px 0px -20px 0px"
        }
      );

    observableElements.forEach(
      (element) => {
        observer.observe(element);
      }
    );


    /*
     * Final safety check:
     * Some mobile browsers can restore a page from cache with
     * unusual IntersectionObserver timing. Content that is already
     * inside the viewport must never remain transparent.
     */
    window.requestAnimationFrame(
      () => {
        observableElements.forEach(
          (element) => {
            if (
              element.classList.contains(
                "is-visible"
              )
            ) {
              return;
            }

            const rect =
              element.getBoundingClientRect();

            const viewportHeightNow =
              Math.max(
                window.innerHeight || 0,
                document.documentElement
                  .clientHeight || 0
              );

            const visibleInViewport =
              rect.bottom > 0 &&
              rect.top <
                viewportHeightNow;

            if (visibleInViewport) {
              element.classList.add(
                "is-visible"
              );

              observer.unobserve(
                element
              );
            }
          }
        );
      }
    );
  }


  /* ==========================================================================
     09. BACK TO TOP
     ========================================================================== */

  function initializeBackToTop() {
    const button =
      qs(".back-to-top");

    if (
      !(button instanceof HTMLElement)
    ) {
      return;
    }

    function updateVisibility() {
      button.classList.toggle(
        "is-visible",
        window.scrollY >=
          CONFIG.backToTopThreshold
      );
    }

    button.addEventListener(
      "click",
      () => {
        window.scrollTo({
          top: 0,
          left: 0,

          behavior:
            prefersReducedMotion()
              ? "auto"
              : "smooth"
        });
      }
    );

    window.addEventListener(
      "scroll",
      updateVisibility,
      {
        passive: true
      }
    );

    updateVisibility();
  }


  /* ==========================================================================
     10. SCROLL TO LINKS
     ========================================================================== */

  function initializeSmoothAnchors() {
    document.addEventListener(
      "click",
      (event) => {
        const target =
          event.target;

        if (
          !(target instanceof Element)
        ) {
          return;
        }

        const link =
          target.closest(
            'a[href^="#"]:not([href="#"])'
          );

        if (
          !(link instanceof HTMLAnchorElement)
        ) {
          return;
        }

        const hash =
          link.getAttribute("href");

        if (!hash) {
          return;
        }

        let destination;

        try {
          destination = qs(hash);
        } catch {
          return;
        }

        if (!destination) {
          return;
        }

        event.preventDefault();

        destination.scrollIntoView({
          behavior:
            prefersReducedMotion()
              ? "auto"
              : "smooth",

          block: "start"
        });

        try {
          history.pushState(
            null,
            "",
            hash
          );
        } catch {
          /*
           * Non-critical.
           */
        }
      }
    );
  }


  /* ==========================================================================
     11. GENERIC FILTER SYSTEM
     ========================================================================== */

  function initializeFilters() {
    const filterGroups =
      qsa("[data-filter-group]");

    filterGroups.forEach((group) => {
      const targetSelector =
        group.getAttribute(
          "data-filter-target"
        );

      if (!targetSelector) {
        return;
      }

      const targetContainer =
        qs(targetSelector);

      if (!targetContainer) {
        return;
      }

      const buttons =
        qsa(
          "[data-filter]",
          group
        );

      const items =
        qsa(
          "[data-category]",
          targetContainer
        );

      if (
        buttons.length === 0 ||
        items.length === 0
      ) {
        return;
      }

      buttons.forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            const filter =
              button.getAttribute(
                "data-filter"
              ) || "all";

            buttons.forEach((item) => {
              const active =
                item === button;

              item.classList.toggle(
                "is-active",
                active
              );

              item.setAttribute(
                "aria-pressed",
                String(active)
              );
            });

            items.forEach((item) => {
              const category =
                item.getAttribute(
                  "data-category"
                ) || "";

              const categories =
                category
                  .split(/\s+/)
                  .filter(Boolean);

              const visible =
                filter === "all" ||
                categories.includes(
                  filter
                );

              item.hidden = !visible;

              if (visible) {
                item.removeAttribute(
                  "aria-hidden"
                );
              } else {
                item.setAttribute(
                  "aria-hidden",
                  "true"
                );
              }
            });

            document.dispatchEvent(
              new CustomEvent(
                "solasbelal:filterchange",
                {
                  detail: {
                    filter,
                    target:
                      targetSelector
                  }
                }
              )
            );
          }
        );
      });
    });
  }


  /* ==========================================================================
     12. LIGHTBOX MARKUP
     ========================================================================== */

  function createLightbox() {
    let lightbox =
      qs("#gallery-lightbox");

    if (lightbox) {
      updateLightboxLanguage(
        lightbox
      );

      return lightbox;
    }

    lightbox =
      createElement(
        "div",
        "lightbox"
      );

    lightbox.id =
      "gallery-lightbox";

    lightbox.setAttribute(
      "role",
      "dialog"
    );

    lightbox.setAttribute(
      "aria-modal",
      "true"
    );

    lightbox.setAttribute(
      "aria-label",
      translate("imageViewer")
    );

    lightbox.setAttribute(
      "aria-hidden",
      "true"
    );

    lightbox.innerHTML = `
      <div class="lightbox__dialog">
        <div class="lightbox__media">
          <img
            class="lightbox__image"
            src=""
            alt=""
            decoding="async"
          >
        </div>

        <button
          class="lightbox__close"
          type="button"
          aria-label="${escapeHtml(
            translate(
              "closeImageViewer"
            )
          )}"
          title="${escapeHtml(
            translate(
              "closeImageViewer"
            )
          )}"
        >
          <span aria-hidden="true">×</span>
        </button>

        <button
          class="lightbox__prev"
          type="button"
          aria-label="${escapeHtml(
            translate(
              "previousImage"
            )
          )}"
          title="${escapeHtml(
            translate(
              "previousImage"
            )
          )}"
        >
          <span aria-hidden="true">‹</span>
        </button>

        <button
          class="lightbox__next"
          type="button"
          aria-label="${escapeHtml(
            translate(
              "nextImage"
            )
          )}"
          title="${escapeHtml(
            translate(
              "nextImage"
            )
          )}"
        >
          <span aria-hidden="true">›</span>
        </button>

        <p
          class="lightbox__caption"
          aria-live="polite"
        ></p>
      </div>
    `;

    document.body.appendChild(
      lightbox
    );

    return lightbox;
  }


  function updateLightboxLanguage(
    lightbox
  ) {
    if (!lightbox) {
      return;
    }

    lightbox.setAttribute(
      "aria-label",
      translate("imageViewer")
    );

    const closeButton =
      qs(
        ".lightbox__close",
        lightbox
      );

    const previousButton =
      qs(
        ".lightbox__prev",
        lightbox
      );

    const nextButton =
      qs(
        ".lightbox__next",
        lightbox
      );

    if (closeButton) {
      closeButton.setAttribute(
        "aria-label",
        translate(
          "closeImageViewer"
        )
      );

      closeButton.setAttribute(
        "title",
        translate(
          "closeImageViewer"
        )
      );
    }

    if (previousButton) {
      previousButton.setAttribute(
        "aria-label",
        translate(
          "previousImage"
        )
      );

      previousButton.setAttribute(
        "title",
        translate(
          "previousImage"
        )
      );
    }

    if (nextButton) {
      nextButton.setAttribute(
        "aria-label",
        translate(
          "nextImage"
        )
      );

      nextButton.setAttribute(
        "title",
        translate(
          "nextImage"
        )
      );
    }
  }


  /* ==========================================================================
     13. LIGHTBOX DATA
     ========================================================================== */

  function collectLightboxItems() {
    const elements =
      qsa("[data-lightbox]");

    state.lightboxItems =
      elements
        .map((element) => {
          let image = null;

          if (
            element instanceof
            HTMLImageElement
          ) {
            image = element;
          } else {
            image =
              qs(
                "img",
                element
              );
          }

          const src =
            element.getAttribute(
              "data-lightbox-src"
            ) ||
            image?.currentSrc ||
            image?.src ||
            element.getAttribute(
              "href"
            ) ||
            "";

          if (!src) {
            return null;
          }

          const alt =
            element.getAttribute(
              "data-lightbox-alt"
            ) ||
            image?.alt ||
            "";

          const caption =
            element.getAttribute(
              "data-lightbox-caption"
            ) ||
            element.getAttribute(
              "data-caption"
            ) ||
            "";

          return {
            trigger: element,
            src,
            alt,
            caption
          };
        })
        .filter(Boolean);
  }


  /* ==========================================================================
     14. LIGHTBOX OPEN / CLOSE
     ========================================================================== */

  function openLightbox(index) {
    if (
      index < 0 ||
      index >=
        state.lightboxItems.length
    ) {
      return;
    }

    const lightbox =
      createLightbox();

    const image =
      qs(
        ".lightbox__image",
        lightbox
      );

    const caption =
      qs(
        ".lightbox__caption",
        lightbox
      );

    const current =
      state.lightboxItems[index];

    if (
      !(
        image instanceof
        HTMLImageElement
      ) ||
      !current
    ) {
      return;
    }

    updateLightboxLanguage(
      lightbox
    );

    state.currentLightboxIndex =
      index;

    state.lightboxOpen =
      true;

    state.lastFocusedElement =
      document.activeElement
        instanceof HTMLElement
        ? document.activeElement
        : null;

    image.src =
      current.src;

    image.alt =
      current.alt;

    if (caption) {
      caption.textContent =
        current.caption ||
        current.alt ||
        "";
    }

    lightbox.classList.add(
      "is-open"
    );

    lightbox.setAttribute(
      "aria-hidden",
      "false"
    );

    state.previousBodyOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const closeButton =
      qs(
        ".lightbox__close",
        lightbox
      );

    if (
      closeButton instanceof
      HTMLElement
    ) {
      window.requestAnimationFrame(
        () => {
          closeButton.focus();
        }
      );
    }

    updateLightboxNavigation();

    document.dispatchEvent(
      new CustomEvent(
        "solasbelal:lightboxopen",
        {
          detail: {
            index,
            item: current
          }
        }
      )
    );
  }


  function closeLightbox() {
    if (!state.lightboxOpen) {
      return;
    }

    const lightbox =
      qs("#gallery-lightbox");

    if (!lightbox) {
      return;
    }

    state.lightboxOpen =
      false;

    lightbox.classList.remove(
      "is-open"
    );

    lightbox.setAttribute(
      "aria-hidden",
      "true"
    );

    document.body.style.overflow =
      state.previousBodyOverflow;

    window.setTimeout(
      () => {
        const image =
          qs(
            ".lightbox__image",
            lightbox
          );

        if (
          image instanceof
          HTMLImageElement
        ) {
          image.removeAttribute(
            "src"
          );

          image.alt = "";
        }
      },
      CONFIG.lightboxTransition
    );

    if (
      state.lastFocusedElement &&
      document.contains(
        state.lastFocusedElement
      )
    ) {
      state.lastFocusedElement
        .focus();
    }

    document.dispatchEvent(
      new CustomEvent(
        "solasbelal:lightboxclose"
      )
    );
  }


  /* ==========================================================================
     15. LIGHTBOX NAVIGATION
     ========================================================================== */

  function updateLightboxNavigation() {
    const lightbox =
      qs("#gallery-lightbox");

    if (!lightbox) {
      return;
    }

    const previous =
      qs(
        ".lightbox__prev",
        lightbox
      );

    const next =
      qs(
        ".lightbox__next",
        lightbox
      );

    const multiple =
      state.lightboxItems.length >
      1;

    if (
      previous instanceof HTMLElement
    ) {
      previous.hidden =
        !multiple;
    }

    if (
      next instanceof HTMLElement
    ) {
      next.hidden =
        !multiple;
    }
  }


  function showLightboxItem(index) {
    if (
      state.lightboxItems.length ===
      0
    ) {
      return;
    }

    const total =
      state.lightboxItems.length;

    state.currentLightboxIndex =
      (
        (
          index % total
        ) + total
      ) % total;

    const lightbox =
      qs("#gallery-lightbox");

    if (!lightbox) {
      return;
    }

    const image =
      qs(
        ".lightbox__image",
        lightbox
      );

    const caption =
      qs(
        ".lightbox__caption",
        lightbox
      );

    const current =
      state.lightboxItems[
        state.currentLightboxIndex
      ];

    if (
      !(
        image instanceof
        HTMLImageElement
      ) ||
      !current
    ) {
      return;
    }

    image.src =
      current.src;

    image.alt =
      current.alt;

    if (caption) {
      caption.textContent =
        current.caption ||
        current.alt ||
        "";
    }
  }


  function showPreviousLightboxItem() {
    showLightboxItem(
      state.currentLightboxIndex - 1
    );
  }


  function showNextLightboxItem() {
    showLightboxItem(
      state.currentLightboxIndex + 1
    );
  }


  /* ==========================================================================
     16. LIGHTBOX FOCUS TRAP
     ========================================================================== */

  function trapLightboxFocus(event) {
    if (
      !state.lightboxOpen ||
      event.key !== "Tab"
    ) {
      return;
    }

    const lightbox =
      qs("#gallery-lightbox");

    if (!lightbox) {
      return;
    }

    const focusable =
      qsa(
        "button:not([hidden]):not([disabled]), a[href], [tabindex]:not([tabindex='-1'])",
        lightbox
      ).filter((element) => {
        return (
          element instanceof
            HTMLElement &&
          element.offsetParent !==
            null
        );
      });

    if (
      focusable.length === 0
    ) {
      return;
    }

    const first =
      focusable[0];

    const last =
      focusable[
        focusable.length - 1
      ];

    if (
      event.shiftKey &&
      document.activeElement ===
        first
    ) {
      event.preventDefault();

      last.focus();

      return;
    }

    if (
      !event.shiftKey &&
      document.activeElement ===
        last
    ) {
      event.preventDefault();

      first.focus();
    }
  }


  /* ==========================================================================
     17. LIGHTBOX EVENTS
     ========================================================================== */

  function initializeLightbox() {
    collectLightboxItems();

    if (
      state.lightboxItems.length ===
      0
    ) {
      return;
    }

    const lightbox =
      createLightbox();

    state.lightboxItems.forEach(
      (item, index) => {
        item.trigger.addEventListener(
          "click",
          (event) => {
            event.preventDefault();

            openLightbox(index);
          }
        );

        if (
          !(
            item.trigger instanceof
            HTMLAnchorElement
          ) &&
          !(
            item.trigger instanceof
            HTMLButtonElement
          )
        ) {
          item.trigger.setAttribute(
            "tabindex",
            "0"
          );

          item.trigger.setAttribute(
            "role",
            "button"
          );

          item.trigger.addEventListener(
            "keydown",
            (event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                event.preventDefault();

                openLightbox(index);
              }
            }
          );
        }
      }
    );

    const closeButton =
      qs(
        ".lightbox__close",
        lightbox
      );

    const previousButton =
      qs(
        ".lightbox__prev",
        lightbox
      );

    const nextButton =
      qs(
        ".lightbox__next",
        lightbox
      );

    closeButton?.addEventListener(
      "click",
      closeLightbox
    );

    previousButton?.addEventListener(
      "click",
      showPreviousLightboxItem
    );

    nextButton?.addEventListener(
      "click",
      showNextLightboxItem
    );

    lightbox.addEventListener(
      "click",
      (event) => {
        if (
          event.target ===
          lightbox
        ) {
          closeLightbox();
        }
      }
    );

    document.addEventListener(
      "keydown",
      (event) => {
        if (
          !state.lightboxOpen
        ) {
          return;
        }

        if (
          event.key === "Escape"
        ) {
          event.preventDefault();

          closeLightbox();

          return;
        }

        if (
          event.key === "ArrowLeft"
        ) {
          event.preventDefault();

          showPreviousLightboxItem();

          return;
        }

        if (
          event.key === "ArrowRight"
        ) {
          event.preventDefault();

          showNextLightboxItem();

          return;
        }

        trapLightboxFocus(event);
      }
    );
  }


  /* ==========================================================================
     18. TOUCH / SWIPE LIGHTBOX
     ========================================================================== */

  function initializeLightboxSwipe() {
    const lightbox =
      qs("#gallery-lightbox");

    if (!lightbox) {
      return;
    }

    let startX = 0;
    let startY = 0;

    lightbox.addEventListener(
      "touchstart",
      (event) => {
        if (
          !state.lightboxOpen ||
          event.touches.length !== 1
        ) {
          return;
        }

        startX =
          event.touches[0].clientX;

        startY =
          event.touches[0].clientY;
      },
      {
        passive: true
      }
    );

    lightbox.addEventListener(
      "touchend",
      (event) => {
        if (
          !state.lightboxOpen ||
          event.changedTouches.length !==
            1
        ) {
          return;
        }

        const endX =
          event.changedTouches[0]
            .clientX;

        const endY =
          event.changedTouches[0]
            .clientY;

        const deltaX =
          endX - startX;

        const deltaY =
          endY - startY;

        if (
          Math.abs(deltaX) < 55 ||
          Math.abs(deltaX) <=
            Math.abs(deltaY)
        ) {
          return;
        }

        if (deltaX > 0) {
          showPreviousLightboxItem();
        } else {
          showNextLightboxItem();
        }
      },
      {
        passive: true
      }
    );
  }


  /* ==========================================================================
     19. IMAGE LOADED STATE
     ========================================================================== */

  function initializeImageStates() {
    qsa("img").forEach((image) => {
      if (
        !(
          image instanceof
          HTMLImageElement
        )
      ) {
        return;
      }

      function markLoaded() {
        image.classList.add(
          "is-loaded"
        );
      }

      if (
        image.complete &&
        image.naturalWidth > 0
      ) {
        markLoaded();
      } else {
        image.addEventListener(
          "load",
          markLoaded,
          {
            once: true
          }
        );
      }
    });
  }


  /* ==========================================================================
     20. CONTACT FORM CLIENT-SIDE VALIDATION
     ========================================================================== */

  function initializeContactForms() {
    const forms =
      qsa(
        "form[data-contact-form]"
      );

    forms.forEach((form) => {
      if (
        !(
          form instanceof
          HTMLFormElement
        )
      ) {
        return;
      }

      form.addEventListener(
        "submit",
        (event) => {
          if (
            !form.checkValidity()
          ) {
            event.preventDefault();

            form.classList.add(
              "was-validated"
            );

            const invalid =
              qs(
                ":invalid",
                form
              );

            if (
              invalid instanceof
              HTMLElement
            ) {
              invalid.focus();
            }

            return;
          }

          form.classList.add(
            "was-validated"
          );
        }
      );
    });
  }


  /* ==========================================================================
     21. COPY BUTTONS
     ========================================================================== */

  function initializeCopyButtons() {
    qsa("[data-copy]")
      .forEach((button) => {
        button.addEventListener(
          "click",
          async () => {
            const value =
              button.getAttribute(
                "data-copy"
              );

            if (!value) {
              return;
            }

            const originalText =
              button.textContent;

            try {
              if (
                navigator.clipboard &&
                window.isSecureContext
              ) {
                await navigator.clipboard
                  .writeText(value);
              } else {
                const textarea =
                  createElement(
                    "textarea"
                  );

                textarea.value =
                  value;

                textarea.setAttribute(
                  "readonly",
                  ""
                );

                textarea.style.position =
                  "fixed";

                textarea.style.opacity =
                  "0";

                document.body.appendChild(
                  textarea
                );

                textarea.select();

                document.execCommand(
                  "copy"
                );

                textarea.remove();
              }

              button.textContent =
                translate("copied");

              window.setTimeout(
                () => {
                  button.textContent =
                    originalText;
                },
                1600
              );
            } catch {
              button.textContent =
                translate(
                  "copyFailed"
                );

              window.setTimeout(
                () => {
                  button.textContent =
                    originalText;
                },
                1600
              );
            }
          }
        );
      });
  }


  /* ==========================================================================
     22. SHARE BUTTONS
     ========================================================================== */

  function initializeShareButtons() {
    qsa("[data-share]")
      .forEach((button) => {
        button.addEventListener(
          "click",
          async () => {
            const shareTitle =
              button.getAttribute(
                "data-share-title"
              ) ||
              document.title ||
              CONFIG.siteName;

            const shareText =
              button.getAttribute(
                "data-share-text"
              ) || "";

            const shareUrl =
              button.getAttribute(
                "data-share-url"
              ) ||
              window.location.href;

            try {
              if (navigator.share) {
                await navigator.share({
                  title: shareTitle,
                  text: shareText,
                  url: shareUrl
                });

                return;
              }

              if (
                navigator.clipboard
              ) {
                await navigator.clipboard
                  .writeText(
                    shareUrl
                  );

                const original =
                  button.textContent;

                button.textContent =
                  translate(
                    "linkCopied"
                  );

                window.setTimeout(
                  () => {
                    button.textContent =
                      original;
                  },
                  1600
                );
              }
            } catch (error) {
              if (
                error &&
                error.name ===
                  "AbortError"
              ) {
                return;
              }

              console.warn(
                translate(
                  "shareActionFailed"
                ),
                error
              );
            }
          }
        );
      });
  }


  /* ==========================================================================
     23. EMAIL LINKS
     ========================================================================== */

  function initializeEmailLinks() {
    qsa("[data-email]")
      .forEach((element) => {
        const user =
          element.getAttribute(
            "data-email-user"
          );

        const domain =
          element.getAttribute(
            "data-email-domain"
          );

        if (
          !user ||
          !domain
        ) {
          return;
        }

        const email =
          `${user}@${domain}`;

        if (
          element instanceof
          HTMLAnchorElement
        ) {
          element.href =
            `mailto:${email}`;
        }

        if (
          !element.textContent?.trim()
        ) {
          element.textContent =
            email;
        }
      });
  }


  /* ==========================================================================
     24. ACTIVE DOCUMENT VISIBILITY
     ========================================================================== */

  function initializeVisibilityHandling() {
    document.addEventListener(
      "visibilitychange",
      () => {
        document.documentElement
          .classList.toggle(
            "document-hidden",
            document.hidden
          );
      }
    );
  }


  /* ==========================================================================
     25. BROKEN IMAGE FALLBACK
     ========================================================================== */

  function initializeBrokenImageHandling() {
    document.addEventListener(
      "error",
      (event) => {
        const target =
          event.target;

        if (
          !(
            target instanceof
            HTMLImageElement
          )
        ) {
          return;
        }

        target.classList.add(
          "image-load-error"
        );

        if (!target.alt) {
          target.alt =
            translate(
              "imageUnavailable"
            );
        }
      },
      true
    );
  }


  /* ==========================================================================
     26. LANGUAGE STATE
     ========================================================================== */

  function initializeLanguageState() {
    const language =
      getCurrentLanguage();

    document.documentElement.dataset.language =
      language;
  }


  /* ==========================================================================
     27. PAGE READY STATE
     ========================================================================== */

  function markPageReady() {
    document.documentElement
      .classList.add(
        "js-ready"
      );

    window.requestAnimationFrame(
      () => {
        document.documentElement
          .classList.add(
            "page-ready"
          );
      }
    );
  }


  /* ==========================================================================
     28. BOOTSTRAP
     ========================================================================== */

  function init() {
    if (state.initialized) {
      return;
    }

    state.initialized = true;

    initializeLanguageState();

    updateCurrentYear();

    secureExternalLinks();

    initializeLazyImages();

    initializeImageStates();

    initializeRevealAnimations();

    initializeBackToTop();

    initializeSmoothAnchors();

    initializeFilters();

    initializeLightbox();

    initializeLightboxSwipe();

    initializeContactForms();

    initializeCopyButtons();

    initializeShareButtons();

    initializeEmailLinks();

    initializeVisibilityHandling();

    initializeBrokenImageHandling();

    markPageReady();

    document.dispatchEvent(
      new CustomEvent(
        "solasbelal:ready",
        {
          detail: {
            site:
              CONFIG.siteName,

            basePath:
              CONFIG.basePath,

            language:
              getCurrentLanguage()
          }
        }
      )
    );
  }


  /* ==========================================================================
     29. START
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
     30. PUBLIC API
     ========================================================================== */

  window.SolasBelal =
    Object.freeze({
      config: CONFIG,

      language:
        getCurrentLanguage,

      translate,

      refreshExternalLinks() {
        secureExternalLinks();
      },

      refreshRevealAnimations() {
        initializeRevealAnimations();
      },

      refreshLightbox() {
        collectLightboxItems();

        const lightbox =
          qs("#gallery-lightbox");

        if (lightbox) {
          updateLightboxLanguage(
            lightbox
          );
        }
      },

      openLightbox(index = 0) {
        openLightbox(index);
      },

      closeLightbox() {
        closeLightbox();
      },

      nextLightboxItem() {
        showNextLightboxItem();
      },

      previousLightboxItem() {
        showPreviousLightboxItem();
      },

      escapeHtml
    });
})();