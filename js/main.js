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

   SECOND, PARALLEL LOG: GOOGLE FORMS → GOOGLE SHEETS
   -----------------------------------------------------------------------
   Alongside the FormSubmit email, every submission is also posted to a
   plain Google Form (see FORMS_CONFIG below) — one per site form. Each
   Google Form's responses can be linked to a Google Sheet (Responses tab
   → the Sheets icon), giving searchable, filterable records instead of
   submissions living only in an inbox.

   This is intentionally a "fire and forget" secondary call: it never
   blocks the main submission, and if it fails for any reason, the person
   submitting the form never sees an error — the email side (FormSubmit)
   remains the source of truth for whether a submission succeeded.

   Because a Google Form has a fixed set of fields, and our real forms have
   more fields than that, most of each submission is bundled into one
   "Full Details" text block rather than getting its own Sheet column. See
   README.md for the full field mapping and how to rebuild this if the
   Google Forms are ever recreated (their field IDs would change).
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

    // Fire-and-forget: log to Google Sheets in parallel. Never awaited for
    // its own sake, never allowed to affect the email submission below.
    logToSheet(form, formData);

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

/* ---------- Google Forms logging (secondary, best-effort) ---------- */
// Each entry below was pulled from that form's "pre-fill" link — see
// README.md if these ever need to be regenerated (e.g. the form is
// recreated and gets new field IDs).
const FORMS_CONFIG = {
  requestTutor: {
    actionUrl: "https://docs.google.com/forms/d/e/1FAIpQLSfyyMKFJ5_mkRTnKdt3XTEcTikHgKH7oRm1I9x9sdNGRJZvlA/formResponse",
    entries: {
      fullName: "entry.1748295679",
      email: "entry.1869062530",
      subjects: "entry.1281806503",
      phone: "entry.1396144770",
      budget: "entry.1177135349",
      details: "entry.158702295",
    },
  },
  becomeTutor: {
    actionUrl: "https://docs.google.com/forms/d/e/1FAIpQLSfyU9X4TmjEzU9s8ItRmsk3XdrUdIkouSmcs6FOfQv2SakZVA/formResponse",
    entries: {
      fullName: "entry.1532155404",
      email: "entry.1964928192",
      phone: "entry.1926454829",
      subjectsTaught: "entry.228861162",
      experience: "entry.600885577",
      details: "entry.358808385",
    },
  },
  contact: {
    actionUrl: "https://docs.google.com/forms/d/e/1FAIpQLSfNXhAzuknPo5LSRXDH-ZYHSUcbySfG4QUTbwlaJICzNV3J8A/formResponse",
    entries: {
      fullName: "entry.765864001",
      email: "entry.2083078653",
      subject: "entry.98096301",
      message: "entry.2044177326",
    },
  },
};

function logToSheet(form, formData) {
  const formType = form.dataset.form;
  const config = FORMS_CONFIG[formType];
  if (!config) return;

  try {
    const body = buildGoogleFormBody(formType, config, formData);
    // Google Forms doesn't send back CORS headers, so this has to be a
    // "no-cors" request — the response is unreadable, but the submission
    // still goes through. That's fine here: purely fire-and-forget.
    fetch(config.actionUrl, { method: "POST", mode: "no-cors", body }).catch(() => {
      /* best-effort only — the email submission is the source of truth */
    });
  } catch (err) {
    /* best-effort only */
  }
}

// Pulls every value for a given field name out of FormData (joining
// checkbox groups with a comma) and returns it as one string.
function getAll(formData, key) {
  return formData.getAll(key).filter(Boolean).join(", ");
}

function buildGoogleFormBody(formType, config, formData) {
  const body = new URLSearchParams();
  const e = config.entries;

  if (formType === "requestTutor") {
    body.append(e.fullName, getAll(formData, "Full Name"));
    body.append(e.email, getAll(formData, "Email Address"));
    body.append(e.phone, getAll(formData, "Phone Number"));
    body.append(e.subjects, getAll(formData, "Subjects"));
    body.append(e.budget, getAll(formData, "Budget"));
    body.append(e.details, [
      `Preferred Contact: ${getAll(formData, "Preferred Contact Method")}`,
      `Academic Level: ${getAll(formData, "Academic Level")}`,
      `Examination: ${getAll(formData, "Examination")}`,
      `Lesson Type: ${getAll(formData, "Preferred Lesson Type")}`,
      `Preferred Days: ${getAll(formData, "Preferred Days")}`,
      `Preferred Time: ${getAll(formData, "Preferred Time")}`,
      `Location: ${getAll(formData, "Location")}`,
      `Learning Goals: ${getAll(formData, "Learning Goals")}`,
      `Additional Notes: ${getAll(formData, "Additional Notes")}`,
    ].join("\n"));
  }

  if (formType === "becomeTutor") {
    const cv = formData.get("CV");
    const certs = formData.getAll("Certificates")
      .filter((f) => f && f.name)
      .map((f) => f.name)
      .join(", ");

    body.append(e.fullName, getAll(formData, "Full Name"));
    body.append(e.email, getAll(formData, "Email Address"));
    body.append(e.phone, getAll(formData, "Phone Number"));
    body.append(e.subjectsTaught, getAll(formData, "Subjects Taught"));
    body.append(e.experience, getAll(formData, "Years of Experience"));
    body.append(e.details, [
      `Gender: ${getAll(formData, "Gender")}`,
      `Location: ${getAll(formData, "Location")}`,
      `Academic Levels Taught: ${getAll(formData, "Academic Levels Taught")}`,
      `Teaching Mode: ${getAll(formData, "Teaching Mode")}`,
      `Qualifications: ${getAll(formData, "Qualifications")}`,
      `CV Filename: ${cv && cv.name ? cv.name : ""}`,
      `Certificates: ${certs}`,
      `Availability: ${getAll(formData, "Availability")}`,
      `Expected Pay: ${getAll(formData, "Expected Pay")}`,
      `Personal Statement: ${getAll(formData, "Personal Statement")}`,
    ].join("\n"));
  }

  if (formType === "contact") {
    body.append(e.fullName, getAll(formData, "Full Name"));
    body.append(e.email, getAll(formData, "Email Address"));
    body.append(e.subject, getAll(formData, "Subject"));
    body.append(e.message, getAll(formData, "Message"));
  }

  return body;
}
