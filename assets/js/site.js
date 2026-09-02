(() => {
  const navType = () => {
    const entry = performance.getEntriesByType("navigation")[0];
    return entry ? entry.type : "navigate";
  };

  const pinToHeader = () => {
    if (navType() === "back_forward") {
      return;
    }
    const hash = location.hash;
    if (hash && hash !== "#top" && hash !== "#content") {
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  pinToHeader();
  window.addEventListener("DOMContentLoaded", pinToHeader);
  window.addEventListener("load", pinToHeader);
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      return;
    }
    pinToHeader();
  });

  const nav = document.querySelector("[data-nav]");
  const toggle = document.querySelector("[data-nav-toggle]");
  const isMobileNav = () => window.matchMedia("(max-width: 800px)").matches;

  const closeSubmenus = () => {
    if (!nav) {
      return;
    }
    nav.querySelectorAll(".has-sub").forEach((item) => {
      item.classList.remove("is-expanded");
      const trigger = item.querySelector(":scope > a");
      if (trigger) {
        trigger.setAttribute("aria-expanded", "false");
      }
    });
  };

  const closeNav = () => {
    if (nav) {
      nav.classList.remove("is-open");
    }
    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
    }
    document.body.classList.remove("nav-open");
    closeSubmenus();
  };

  if (toggle && nav) {
    let closeBtn = nav.querySelector("[data-nav-close]");
    if (!closeBtn) {
      closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "nav-close";
      closeBtn.setAttribute("data-nav-close", "");
      closeBtn.setAttribute("aria-label", "Close menu");
      closeBtn.textContent = "×";
      nav.appendChild(closeBtn);
    }
    closeBtn.addEventListener("click", closeNav);

    toggle.addEventListener("click", () => {
      const open = !nav.classList.contains("is-open");
      if (open) {
        nav.classList.add("is-open");
        toggle.setAttribute("aria-expanded", "true");
        document.body.classList.add("nav-open");
      } else {
        closeNav();
      }
    });

    nav.querySelectorAll(".has-sub > a").forEach((trigger) => {
      trigger.setAttribute("aria-expanded", "false");
      trigger.setAttribute("aria-haspopup", "true");
      trigger.addEventListener("click", (event) => {
        if (!isMobileNav()) {
          return;
        }
        event.preventDefault();
        const item = trigger.parentElement;
        const open = !item.classList.contains("is-expanded");
        closeSubmenus();
        if (open) {
          item.classList.add("is-expanded");
          trigger.setAttribute("aria-expanded", "true");
        }
      });
    });
  }

  const isHomePage = () => {
    const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    return page === "" || page === "index.html";
  };

  const goToHomeTop = (event) => {
    if (!isHomePage()) {
      closeNav();
      return;
    }
    event.preventDefault();
    closeNav();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  document.querySelectorAll(".brand, .nav-home a").forEach((el) => {
    el.addEventListener("click", goToHomeTop);
  });

  const form = document.querySelector("[data-contact-form]");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const status = form.querySelector("[data-form-status]");
      if (status) {
        status.textContent =
        status.textContent = "This form is not connected yet. Messages are not sent."
      }
    });
  }

  const searchToggle = document.querySelector("[data-search-toggle]");
  const searchRoot = document.querySelector("[data-search]");
  const searchDialog = searchRoot && searchRoot.tagName === "DIALOG" ? searchRoot : null;
  const searchInput = document.querySelector("[data-search-input]");
  const searchResults = document.querySelector("[data-search-results]");
  const searchStatus = document.querySelector("[data-search-status]");
  const searchPanel = document.querySelector("[data-search-panel]");
  const searchClose = document.querySelector("[data-search-close]");
  let searchIndex = null;
  let searchRequest = 0;
  let activeOption = -1;

  const fold = (value) =>
    String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const esc = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const loadIndex = () => {
    if (searchIndex) {
      return Promise.resolve(searchIndex);
    }
    const url = searchRoot && searchRoot.getAttribute("data-search-index");
    if (!url) {
      return Promise.resolve([]);
    }
    return fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Search index could not be loaded.");
        }
        return response.json();
      })
      .then((data) => {
        searchIndex = Array.isArray(data) ? data : [];
        return searchIndex;
      });
  };

  const ARRANGEMENT_TERMS = new Set(["arrangement", "arrangements", "arranged", "adapted", "adaptation", "adaptations"]);
  const BEATLES_TERMS = new Set(["beatles"]);
  const TAG_PILLS = {
    arrangement: { label: "Arrangement", className: "work-tag" },
    beatles: { label: "Beatles", className: "work-tag work-tag--beatles" },
  };
  const TAG_ORDER = ["arrangement", "beatles"];

  const tagsOf = (entry) => entry.tags || [];
  const hasTag = (entry, tag) => tagsOf(entry).includes(tag);

  const tagMarkup = (entry) =>
    TAG_ORDER.filter((tag) => hasTag(entry, tag))
      .map((tag) => {
        const pill = TAG_PILLS[tag];
        return ` <span class="${pill.className}">${pill.label}</span>`;
      })
      .join("");

  const matches = (entry, query) => {
    const tokens = fold(query).trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) {
      return false;
    }
    const wantsBeatles = tokens.some((token) => BEATLES_TERMS.has(token));
    const wantsArrangement = tokens.some((token) => ARRANGEMENT_TERMS.has(token));
    if (wantsBeatles && !hasTag(entry, "beatles")) {
      return false;
    }
    if (wantsArrangement && !hasTag(entry, "arrangement")) {
      return false;
    }
    const rest = tokens.filter((token) => {
      if (wantsBeatles && BEATLES_TERMS.has(token)) {
        return false;
      }
      if (wantsArrangement && ARRANGEMENT_TERMS.has(token)) {
        return false;
      }
      return true;
    });
    if (!rest.length) {
      return true;
    }
    const hay = fold(
      [
        entry.title,
        entry.catalogue_no ? `No. ${entry.catalogue_no}` : "",
        entry.catalogue_no,
        String(entry.catalogue_no || "").replace(/^0+/, ""),
        entry.forces,
        entry.year,
        entry.section,
        ...tagsOf(entry),
        ...tagsOf(entry).map((tag) => tag.replace(/[-_]/g, " ")),
      ].join(" ")
    );
    return rest.every((token) => hay.includes(token));
  };

  const optionEls = () => Array.from(searchResults ? searchResults.querySelectorAll("[role='option']") : []);

  const optionHref = (option) => option && option.getAttribute("data-href");

  const setExpanded = (open) => {
    if (searchInput) {
      searchInput.setAttribute("aria-expanded", open ? "true" : "false");
    }
    if (searchPanel) {
      searchPanel.hidden = !open;
    }
  };

  const setActiveOption = (index) => {
    const options = optionEls();
    options.forEach((option) => {
      option.classList.remove("is-active");
      option.setAttribute("aria-selected", "false");
    });
    if (!options.length || index < 0) {
      activeOption = -1;
      searchInput && searchInput.removeAttribute("aria-activedescendant");
      return;
    }
    activeOption = (index + options.length) % options.length;
    const current = options[activeOption];
    current.classList.add("is-active");
    current.setAttribute("aria-selected", "true");
    searchInput && searchInput.setAttribute("aria-activedescendant", current.id);
    current.scrollIntoView({ block: "nearest" });
  };

  const closeSearchPanel = () => {
    setExpanded(false);
    setActiveOption(-1);
  };

  const renderResults = (query) => {
    if (!searchResults || !searchStatus) {
      return;
    }
    const trimmed = query.trim();
    activeOption = -1;
    if (searchInput) {
      searchInput.removeAttribute("aria-activedescendant");
    }
    if (!trimmed) {
      searchResults.innerHTML = "";
      searchStatus.textContent = "";
      closeSearchPanel();
      return;
    }
    const prefix = (searchRoot && searchRoot.getAttribute("data-prefix")) || "";
    const hits = (searchIndex || []).filter((entry) => matches(entry, trimmed)).slice(0, 100);
    searchStatus.textContent = hits.length
      ? `${hits.length} work${hits.length === 1 ? "" : "s"}`
      : "No works match.";
    searchResults.innerHTML = hits
      .map((entry, index) => {
        const meta = [entry.catalogue_no ? `No. ${entry.catalogue_no}` : "", entry.section, entry.forces]
          .filter(Boolean)
          .join(" · ");
        const href = `${prefix}${entry.href}`;
        const tag = tagMarkup(entry);
        return `<li role="option" id="search-opt-${index}" data-href="${esc(href)}" aria-selected="false"><span class="search-result-title">${esc(entry.title)}${tag}</span><span class="search-result-meta">${esc(meta)}</span></li>`;
      })
      .join("");
    setExpanded(true);
  };

  const runSearch = () => {
    if (!searchInput) {
      return;
    }
    const current = ++searchRequest;
    loadIndex()
      .then(() => {
        if (current === searchRequest) {
          renderResults(searchInput.value);
        }
      })
      .catch(() => {
        if (current === searchRequest && searchStatus) {
          searchStatus.textContent = "Search is unavailable right now.";
          setExpanded(true);
        }
      });
  };

  const followActiveOption = () => {
    const options = optionEls();
    const target = options[activeOption] || options[0];
    const href = optionHref(target);
    if (href) {
      window.location.assign(href);
      return true;
    }
    return false;
  };

  const handleSearchKeydown = (event) => {
    const open = searchInput && searchInput.getAttribute("aria-expanded") === "true";
    if (event.key === "Escape") {
      if (searchDialog) {
        closeSearchDialog();
        return;
      }
      if (open) {
        closeSearchPanel();
      } else if (searchInput.value) {
        searchInput.value = "";
        closeSearchPanel();
      }
      return;
    }
    if (event.key === "Enter") {
      if (followActiveOption()) {
        event.preventDefault();
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open && searchInput.value.trim()) {
        runSearch();
      }
      if (optionEls().length) {
        setActiveOption(activeOption + 1);
      }
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (optionEls().length) {
        setActiveOption(activeOption < 0 ? optionEls().length - 1 : activeOption - 1);
      }
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setActiveOption(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setActiveOption(optionEls().length - 1);
    }
  };

  const albumCovers = document.querySelectorAll("[data-album-cover]");
  if (albumCovers.length) {
    const albumDialog = document.createElement("dialog");
    albumDialog.className = "album-dialog";
    albumDialog.setAttribute("data-album-dialog", "");
    albumDialog.setAttribute("aria-labelledby", "album-dialog-title");
    albumDialog.setAttribute("closedby", "any");
    albumDialog.innerHTML = `
      <div class="album-dialog-panel">
        <div class="album-dialog-bar">
          <h2 id="album-dialog-title" class="album-dialog-title" data-album-dialog-title></h2>
          <button type="button" class="search-close" data-album-dialog-close>Close</button>
        </div>
        <div class="album-dialog-images" data-album-dialog-images></div>
      </div>
    `;
    document.body.appendChild(albumDialog);

    const albumTitle = albumDialog.querySelector("[data-album-dialog-title]");
    const albumImages = albumDialog.querySelector("[data-album-dialog-images]");
    const albumClose = albumDialog.querySelector("[data-album-dialog-close]");

    const closeAlbum = () => {
      if (albumDialog.open) {
        albumDialog.close();
      }
    };

    const openAlbum = (button) => {
      const title =
        button.getAttribute("data-album-title") ||
        (button.getAttribute("aria-label") || "").replace(/^View front and back of /i, "") ||
        "Album";
      const front = button.getAttribute("data-front") || (button.querySelector("img") || {}).getAttribute("src") || "";
      const back = button.getAttribute("data-back") || "";
      const frontAlt = button.getAttribute("data-front-alt") || `Cover of ${title}`;
      const backAlt = button.getAttribute("data-back-alt") || `Back of ${title}`;
      albumTitle.textContent = title;
      albumImages.innerHTML = `
        <figure>
          <img src="${esc(front)}" alt="${esc(frontAlt)}">
          <figcaption>Front</figcaption>
        </figure>
        ${
          back
            ? `<figure>
          <img src="${esc(back)}" alt="${esc(backAlt)}">
          <figcaption>Back</figcaption>
        </figure>`
            : ""
        }
      `;
      if (typeof albumDialog.showModal === "function") {
        albumDialog.showModal();
        albumClose && albumClose.focus();
      }
    };

    albumCovers.forEach((button) => {
      button.addEventListener("click", () => openAlbum(button));
    });
    albumClose && albumClose.addEventListener("click", closeAlbum);
    albumDialog.addEventListener("click", (event) => {
      if (event.target === albumDialog) {
        closeAlbum();
      }
    });
  }

  const photoTriggers = Array.from(document.querySelectorAll("[data-photo-lightbox]"));
  if (photoTriggers.length) {
    const photoDialog = document.createElement("dialog");
    photoDialog.className = "photo-dialog";
    photoDialog.setAttribute("data-photo-dialog", "");
    photoDialog.setAttribute("aria-labelledby", "photo-dialog-title");
    photoDialog.setAttribute("closedby", "any");
    const showNav = photoTriggers.length > 1;
    photoDialog.innerHTML = `
      <div class="photo-dialog-panel">
        <div class="photo-dialog-bar">
          <h2 id="photo-dialog-title" class="photo-dialog-title visually-hidden" data-photo-dialog-title></h2>
          ${
            showNav
              ? `<div class="photo-dialog-nav">
            <button type="button" data-photo-prev>Previous</button>
            <button type="button" data-photo-next>Next</button>
          </div>`
              : "<span></span>"
          }
          <button type="button" class="search-close" data-photo-dialog-close>Close</button>
        </div>
        <div class="photo-dialog-stage" data-photo-dialog-stage></div>
      </div>
    `;
    document.body.appendChild(photoDialog);

    const photoTitle = photoDialog.querySelector("[data-photo-dialog-title]");
    const photoStage = photoDialog.querySelector("[data-photo-dialog-stage]");
    const photoClose = photoDialog.querySelector("[data-photo-dialog-close]");
    const photoPrev = photoDialog.querySelector("[data-photo-prev]");
    const photoNext = photoDialog.querySelector("[data-photo-next]");
    let photoIndex = 0;

    const photoAt = (index) => {
      const button = photoTriggers[index];
      const img = button.querySelector("img");
      return {
        src: button.getAttribute("data-src") || (img && img.getAttribute("src")) || "",
        alt: button.getAttribute("data-alt") || (img && img.getAttribute("alt")) || "",
        caption:
          button.getAttribute("data-caption") ||
          ((button.closest("figure") || {}).querySelector("figcaption") || {}).textContent ||
          "",
      };
    };

    const renderPhoto = (index) => {
      photoIndex = (index + photoTriggers.length) % photoTriggers.length;
      const photo = photoAt(photoIndex);
      const caption = (photo.caption || photo.alt || "Photograph").trim();
      photoTitle.textContent = caption;
      photoStage.innerHTML = `
        <figure>
          <img src="${esc(photo.src)}" alt="${esc(photo.alt || caption)}">
          <figcaption>${esc(caption)}</figcaption>
        </figure>
      `;
    };

    const closePhoto = () => {
      if (photoDialog.open) {
        photoDialog.close();
      }
    };

    const openPhoto = (index) => {
      renderPhoto(index);
      if (typeof photoDialog.showModal === "function") {
        photoDialog.showModal();
        photoClose && photoClose.focus();
      }
    };

    photoTriggers.forEach((button, index) => {
      button.addEventListener("click", () => openPhoto(index));
    });
    photoClose && photoClose.addEventListener("click", closePhoto);
    photoPrev &&
      photoPrev.addEventListener("click", () => renderPhoto(photoIndex - 1));
    photoNext &&
      photoNext.addEventListener("click", () => renderPhoto(photoIndex + 1));
    photoDialog.addEventListener("click", (event) => {
      if (event.target === photoDialog) {
        closePhoto();
      }
    });
    photoDialog.addEventListener("keydown", (event) => {
      if (!photoDialog.open) {
        return;
      }
      if (event.key === "ArrowLeft") {
        renderPhoto(photoIndex - 1);
      }
      if (event.key === "ArrowRight") {
        renderPhoto(photoIndex + 1);
      }
    });
  }

  const openSearchDialog = () => {
    if (!searchDialog || typeof searchDialog.showModal !== "function") {
      return;
    }
    closeNav();
    searchToggle && searchToggle.setAttribute("aria-expanded", "true");
    searchDialog.showModal();
    loadIndex()
      .then(() => {
        renderResults(searchInput ? searchInput.value : "");
        searchInput && searchInput.focus();
      })
      .catch(() => {
        if (searchStatus) {
          searchStatus.textContent = "Search is unavailable right now.";
          setExpanded(true);
        }
        searchInput && searchInput.focus();
      });
  };

  const closeSearchDialog = () => {
    if (searchDialog && searchDialog.open) {
      searchDialog.close();
    }
  };

  if (searchToggle) {
    searchToggle.addEventListener("click", () => {
      if (searchDialog) {
        openSearchDialog();
        return;
      }
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    });
  }

  if (searchResults) {
    searchResults.addEventListener("click", (event) => {
      const option = event.target.closest("[role='option']");
      if (!option) {
        return;
      }
      const href = optionHref(option);
      if (href) {
        window.location.assign(href);
      }
    });
  }

  if (searchDialog) {
    searchClose && searchClose.addEventListener("click", closeSearchDialog);
    searchDialog.addEventListener("close", () => {
      searchToggle && searchToggle.setAttribute("aria-expanded", "false");
      searchRequest += 1;
      closeSearchPanel();
    });
    searchDialog.addEventListener("click", (event) => {
      if (event.target === searchDialog) {
        closeSearchDialog();
      }
    });
    if (searchInput) {
      searchInput.addEventListener("input", runSearch);
      searchInput.addEventListener("keydown", handleSearchKeydown);
    }
  }

  if (searchPanel && searchRoot && searchInput) {
    searchRoot.addEventListener("submit", (event) => {
      event.preventDefault();
      if (searchPanel && !searchPanel.hidden && followActiveOption()) {
        return;
      }
      runSearch();
    });
    searchInput.addEventListener("input", runSearch);
    searchInput.addEventListener("keydown", handleSearchKeydown);
    searchRoot.addEventListener("focusout", (event) => {
      if (!searchRoot.contains(event.relatedTarget)) {
        closeSearchPanel();
      }
    });
    document.addEventListener("click", (event) => {
      if (!searchRoot.contains(event.target) && !(searchToggle && searchToggle.contains(event.target))) {
        closeSearchPanel();
      }
    });
  }

  let backToTop = document.querySelector("[data-back-to-top]");
  if (!backToTop) {
    backToTop = document.createElement("button");
    backToTop.type = "button";
    backToTop.className = "back-to-top";
    backToTop.setAttribute("data-back-to-top", "");
    backToTop.setAttribute("aria-label", "Back to top");
    document.body.appendChild(backToTop);
  }
  backToTop.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 14l6-6 6 6"/></svg>';
  const syncBackToTop = () => {
    backToTop.classList.toggle("is-visible", window.scrollY > 320);
  };
  syncBackToTop();
  window.addEventListener("scroll", syncBackToTop, { passive: true });
  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();
