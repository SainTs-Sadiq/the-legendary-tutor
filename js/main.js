/* ==========================================================================
   THE LEGENDARY TUTOR — main.js
   Handles: mobile nav, FAQ accordion, file-input labels, and form
   submissions (Request a Tutor / Become a Tutor / Contact).

   FORM SUBMISSION ARCHITECTURE
   -----------------------------------------------------------------------
   Every form on the site is submitted through the single function
   `submitForm()` below. It currently posts to FormSubmit's AJAX endpoint
   (https://formsubmit.co/ajax/adinoyi4all@gmail.com), which requires no
   signup and forwards submissions straight to that inbox as email — this
   satisfies "send directly to adinoyi4all@gmail.com" with zero backend.

   NOTE: the first submission to a new destination address triggers a
   one-time "Activate Form" confirmation email from FormSubmit to that
   address. Until it's clicked, submissions are held back. See README.md.

   To swap providers later (EmailJS, Formspree, or a custom API), you only
   need to change ENDPOINTS below and, if the new provider expects a
   different payload shape, adjust buildPayload(). Every field already has
   a stable `name` attribute matching the data model, so no HTML needs to
   change. To connect a real backend + database instead, replace the
   fetch() call inside submitForm() with a call to your own API route —
   the FormData already contains every field, keyed and ready to persist.
   ========================================================================== */

const DESTINATION_EMAIL = "adinoyi4all@gmail.com";

const ENDPOINTS = {
  requestTutor: `https://formsubmit.co/ajax/${DESTINATION_EMAIL}`,
  becomeTutor: `https://formsubmit.co/ajax/${DESTINATION_EMAIL}`,
  contact: `https://formsubmit.co/ajax/${DESTINATION_EMAIL}`,
};

document.addEventListener("DOMContentLoaded", () => {
  initNavToggle();
  initFaqAccordion();
  initFileLabels();
  initForms();
  setYear();
});

/* ---------- Mobile nav ---------- */
function initNavToggle() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (!toggle || !links) return;

  toggle.addEventListener("click", () => {
    const isOpen = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  links.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* ---------- FAQ accordion ---------- */
function initFaqAccordion() {
  document.querySelectorAll(".faq-item").forEach((item) => {
    const btn = item.querySelector(".faq-q");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const wasOpen = item.classList.contains("open");
      item.parentElement
        .querySelectorAll(".faq-item")
        .forEach((el) => el.classList.remove("open"));
      if (!wasOpen) item.classList.add("open");
    });
  });
}

/* ---------- File input labels ---------- */
function initFileLabels() {
  document.querySelectorAll(".file-drop input[type='file']").forEach((input) => {
    input.addEventListener("change", () => {
      const label = input.parentElement.querySelector(".filename");
      if (!label) return;
      label.textContent = input.files.length
        ? Array.from(input.files).map((f) => f.name).join(", ")
        : "";
    });
  });
}

/* ---------- Footer year ---------- */
function setYear() {
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
}

/* ---------- Forms ---------- */
function initForms() {
  document.querySelectorAll("form[data-form]").forEach((form) => {
    form.addEventListener("submit", (e) => handleSubmit(e, form));
  });
}

async function handleSubmit(e, form) {
  e.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const key = form.getAttribute("data-form");
  const endpoint = ENDPOINTS[key];
  const statusEl = form.querySelector(".form-status");
  const submitBtn = form.querySelector("[type='submit']");

  const originalLabel = submitBtn ? submitBtn.textContent : "";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";
  }
  hideStatus(statusEl);

  try {
    const formData = new FormData(form);

    // FormSubmit-specific configuration fields (kept out of the visible form).
    formData.append("_subject", form.dataset.subject || "New submission — The Legendary Tutor");
    formData.append("_captcha", "false");
    formData.append("_template", "table");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: formData,
    });

    if (!response.ok) throw new Error("Network response was not OK");

    showStatus(statusEl, "success", form.dataset.successTitle || "Submission received", form.dataset.successBody || `Thank you — your submission has been sent to our team. We'll be in touch shortly.`);
    form.reset();
    document.querySelectorAll(".file-drop .filename").forEach((el) => (el.textContent = ""));
    if (statusEl) statusEl.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (err) {
    showStatus(
      statusEl,
      "error",
      "Something went wrong",
      "Your submission could not be sent right now. Please try again, or reach us directly on WhatsApp or by email — details are on our Contact page."
    );
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  }
}

function showStatus(el, type, title, body) {
  if (!el) return;
  el.classList.remove("success", "error");
  el.classList.add(type, "show");
  el.innerHTML = `
    <span class="icon">${
      type === "success"
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="8" x2="12" y2="13"></line><circle cx="12" cy="16.5" r="0.5" fill="currentColor"></circle><circle cx="12" cy="12" r="10"></circle></svg>'
    }</span>
    <div><h4>${title}</h4><p>${body}</p></div>
  `;
}

function hideStatus(el) {
  if (!el) return;
  el.classList.remove("show");
}
