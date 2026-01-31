/* Quick Response Electrical Service - small, dependency-free helpers. */

function $(sel, root = document) {
  return root.querySelector(sel);
}

function $all(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

function normalizePhoneForTel(phoneText) {
  // Keeps digits only; preserves leading 1 if present.
  return phoneText.replace(/[^\d]/g, "");
}

function initMailtoContactForm() {
  const form = $("#contactForm");
  if (!form) return;

  const email = form.getAttribute("data-to-email");
  if (!email) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = $("#contactName", form)?.value?.trim() || "";
    const fromEmail = $("#contactEmail", form)?.value?.trim() || "";
    const message = $("#contactMessage", form)?.value?.trim() || "";

    const subject = "Website Contact Request";
    const bodyLines = [
      `Name: ${name}`,
      `Email: ${fromEmail}`,
      "",
      "Message:",
      message,
    ];

    const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
    window.location.href = mailto;
  });
}

function initServiceAreaFilter() {
  const input = $("#serviceAreaFilter");
  const list = $("#serviceAreaList");
  if (!input || !list) return;

  const items = $all("li", list);
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    items.forEach((li) => {
      const text = (li.textContent || "").toLowerCase();
      li.style.display = !q || text.includes(q) ? "" : "none";
    });
  });
}

function initPhoneLinks() {
  // If a phone number is rendered as text but missing tel: in some places,
  // we can upgrade it. (No-op when not needed.)
  $all("[data-phone-text]").forEach((el) => {
    const raw = el.getAttribute("data-phone-text") || "";
    const digits = normalizePhoneForTel(raw);
    if (!digits) return;
    const a = document.createElement("a");
    a.href = `tel:${digits}`;
    a.textContent = raw;
    a.className = "link-light link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover";
    el.replaceWith(a);
  });
}

function getCurrentPageName() {
  const raw = window.location.pathname || "";
  const name = decodeURIComponent(raw.split("/").filter(Boolean).pop() || "");
  return name || "index.html";
}

function setActiveNav() {
  const current = getCurrentPageName();

  // Clear existing "active" flags (some older pages hardcoded these).
  $all(".nav-link.active, .dropdown-item.active").forEach((el) => el.classList.remove("active"));

  const links = $all("a.nav-link, a.dropdown-item");
  links.forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (!href || href.startsWith("#")) return;

    let page = "";
    try {
      const u = new URL(href, window.location.href);
      page = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() || "");
    } catch {
      // ignore
    }

    if (page && page === current) {
      a.classList.add("active");

      // If a dropdown item is active, also highlight the dropdown toggle.
      if (a.classList.contains("dropdown-item")) {
        const toggle = document.querySelector(".nav-item.dropdown > .nav-link.dropdown-toggle");
        toggle?.classList.add("active");
      }
    }
  });

  // Match existing behavior on recent_work.html: highlight the dropdown toggle.
  if (current === "recent_work.html") {
    const toggle = document.querySelector(".nav-item.dropdown > .nav-link.dropdown-toggle");
    toggle?.classList.add("active");
  }
}

function parseGalleryImages() {
  const el = document.getElementById("galleryImages");
  if (!el) return [];
  try {
    const parsed = JSON.parse(el.textContent || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isLikelyProjectGalleryImage(filename) {
  return /^\d{4}-\d{2}-\d{2}/.test(filename) || /^unnamed\./i.test(filename);
}

function humanizeGalleryAlt(filename) {
  const base = (filename || "")
    .replace(/\.(jpe?g|png|webp|gif)$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(base)) return `Project photo ${base}`;
  if (base) return `Project photo ${base}`;
  return "Project photo";
}

function initGalleryModal(containerEl) {
  if (!containerEl) return;

  const modalImg = document.getElementById("galleryModalImg");
  const modalLabel = document.getElementById("galleryModalLabel");
  const modalOpen = document.getElementById("galleryModalOpen");
  const modalEl = document.getElementById("galleryModal");

  containerEl.addEventListener("click", (e) => {
    const btn = e.target?.closest?.("[data-gallery-src]");
    if (!btn) return;

    const src = btn.getAttribute("data-gallery-src") || "";
    const alt = btn.getAttribute("data-gallery-alt") || "Project photo";

    if (modalImg) {
      modalImg.src = src;
      modalImg.alt = alt;
    }
    if (modalLabel) modalLabel.textContent = alt;
    if (modalOpen) modalOpen.href = src;
  });

  // Clear the modal image when closed (helps memory use on mobile).
  modalEl?.addEventListener("hidden.bs.modal", () => {
    if (!modalImg) return;
    modalImg.src = "";
    modalImg.alt = "";
  });
}

function initGallery() {
  const grid = document.getElementById("galleryGrid");
  if (!grid) return;

  const raw = parseGalleryImages();
  const images = raw.filter(isLikelyProjectGalleryImage);

  if (!images.length) {
    grid.innerHTML = `<div class="col-12"><div class="alert alert-light border mb-0">No gallery images found.</div></div>`;
    return;
  }

  grid.innerHTML = images
    .map((filename) => {
      const src = `assets/img/gallery/${filename}`;
      const alt = humanizeGalleryAlt(filename);
      const caption = filename.replace(/\.(jpe?g|png|webp|gif)$/i, "");

      return `
        <div class="col-6 col-md-4 col-lg-3">
          <button
            type="button"
            class="gallery-btn w-100 text-start"
            data-bs-toggle="modal"
            data-bs-target="#galleryModal"
            data-gallery-src="${src}"
            data-gallery-alt="${alt}"
            aria-label="Open ${alt}"
          >
            <div class="gallery-card">
              <img class="gallery-thumb" src="${src}" alt="${alt}" loading="lazy" decoding="async" />
              <div class="gallery-meta">
                <div class="small text-muted">${caption}</div>
              </div>
            </div>
          </button>
        </div>
      `;
    })
    .join("");

  initGalleryModal(grid);
}

function initRecentWorkPhotoTurnstile() {
  const carouselEl = document.getElementById("recentWorkCarousel");
  const inner = document.getElementById("recentWorkCarouselInner");
  if (!carouselEl || !inner) return;

  const raw = parseGalleryImages();
  const images = raw.filter(isLikelyProjectGalleryImage);

  // Base URL for gallery files.
  // In Flask templates we set: data-gallery-base-url="{{ url_for('static', filename='assets/img/gallery/') }}"
  // Fallback keeps this working even if the attribute isn't present.
  const galleryBaseUrl = (
    carouselEl.getAttribute("data-gallery-base-url") ||
    document.body.getAttribute("data-gallery-base-url") ||
    "/static/assets/img/gallery/"
  ).replace(/\/+$/, "/");

  if (!images.length) {
    inner.innerHTML = `
      <div class="carousel-item active">
        <div class="p-4 rounded-4 border bg-white">
          <div class="text-muted">No project photos found.</div>
        </div>
      </div>
    `;
    return;
  }

  function fitNoUpscale(imgEl) {
    if (!imgEl) return;
    const slide = imgEl.closest?.(".carousel-item");
    const container = slide?.querySelector?.(".qres-turnstile-btn") || slide || carouselEl;
    if (!container) return;

    const nw = imgEl.naturalWidth || 0;
    const nh = imgEl.naturalHeight || 0;
    if (!nw || !nh) return;

    // Fit within available space while NEVER scaling above 100% (prevents blur).
    const maxW = Math.max(1, container.clientWidth || 1);
    const maxH = Math.max(1, Math.floor(window.innerHeight * 0.7));
    const scale = Math.min(1, maxW / nw, maxH / nh);

    imgEl.style.width = `${Math.max(1, Math.floor(nw * scale))}px`;
    imgEl.style.height = `${Math.max(1, Math.floor(nh * scale))}px`;
  }

  function fitActiveSlide() {
    const activeImg = carouselEl.querySelector(".carousel-item.active img.qres-turnstile-img");
    if (!activeImg) return;
    if (activeImg.complete) fitNoUpscale(activeImg);
  }

  inner.innerHTML = images
    .map((filename, idx) => {
      const src = `${galleryBaseUrl}${encodeURIComponent(filename)}`;
      const alt = humanizeGalleryAlt(filename);
      const caption = filename.replace(/\.(jpe?g|png|webp|gif)$/i, "");
      const active = idx === 0 ? " active" : "";
      const eager = idx === 0 ? `loading="eager"` : `loading="lazy"`;

      return `
        <div class="carousel-item${active}">
          <button
            type="button"
            class="qres-turnstile-btn"
            data-bs-toggle="modal"
            data-bs-target="#galleryModal"
            data-gallery-src="${src}"
            data-gallery-alt="${alt}"
            aria-label="Open ${alt}"
          >
            <img class="qres-turnstile-img" src="${src}" alt="${alt}" ${eager} decoding="async" />
          </button>
          <div class="qres-turnstile-caption small text-muted">${caption}</div>
        </div>
      `;
    })
    .join("");

  // Size images once they load (cached images might already be complete).
  $all("img.qres-turnstile-img", inner).forEach((img) => {
    img.addEventListener("load", () => fitNoUpscale(img), { once: true });
    if (img.complete) fitNoUpscale(img);
  });

  const counter = document.getElementById("recentWorkCarouselCounter");
  const updateCounter = () => {
    if (!counter) return;
    const activeIdx = images.length
      ? Math.max(
          0,
          $all(".carousel-item", inner).findIndex((el) => el.classList.contains("active"))
        )
      : 0;
    counter.textContent = `Photo ${activeIdx + 1} of ${images.length}`;
  };

  carouselEl.addEventListener("slid.bs.carousel", () => {
    updateCounter();
    fitActiveSlide();
  });
  window.addEventListener("resize", fitActiveSlide);
  updateCounter();
  fitActiveSlide();

  initGalleryModal(carouselEl);
}

document.addEventListener("DOMContentLoaded", () => {
  initMailtoContactForm();
  initServiceAreaFilter();
  initPhoneLinks();
  setActiveNav();
  initGallery();
  initRecentWorkPhotoTurnstile();
});

