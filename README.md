# The Legendary Tutor — Website

A modern, responsive website for The Legendary Tutor, a curated tutor-matching
agency (not a marketplace). Built with semantic HTML5, modern CSS3, and vanilla
JavaScript — no build step, no framework, no dependencies to install.

## File structure

```
legendary-tutor/
├── index.html            Home
├── about.html             About Us (story, mission, vision, vetting process)
├── subjects.html          Subjects
├── how-it-works.html      How It Works (learner + tutor tracks)
├── request-tutor.html     Request a Tutor (learner application form)
├── become-tutor.html      Become a Tutor (tutor application form, with CV/certificate upload)
├── faqs.html               FAQs
├── contact.html            Contact (WhatsApp, email, contact form)
├── privacy.html            Privacy Policy (placeholder — see note below)
├── terms.html               Terms & Conditions (placeholder — see note below)
├── css/style.css           All styling (design tokens, layout, components)
├── js/main.js               Nav toggle, FAQ accordion, file inputs, form submission
└── assets/favicon.svg      Brand monogram favicon
```

## Viewing it locally

No server or build tools required. Just double-click `index.html`, or open the
folder with a live-reload extension (e.g. VS Code's "Live Server") for the
smoothest experience while editing.

## How form submissions work right now

Both the **Request a Tutor** and **Become a Tutor** forms, plus the **Contact**
form, submit to **FormSubmit** (https://formsubmit.co) — a free service that
forwards form submissions straight to an inbox as email, with no signup, no API
key, and no backend required. Every form is already pointed at
**adinoyi4all@gmail.com**.

**One-time setup step:** the first time any of these forms is submitted,
FormSubmit sends a confirmation email to adinoyi4all@gmail.com with an
"Activate Form" link. Until that link is clicked, submissions are held and
won't arrive. Do a test submission from each form after deploying, then check
that inbox (including spam) for the activation email.

FormSubmit's free tier handles a generous number of submissions per month and
supports file attachments (used by the CV/Certificates fields on the Become a
Tutor form) up to 5MB per file. If volume grows, FormSubmit also offers a paid
tier — see their site for current limits.

## Swapping to EmailJS, Formspree, or a custom backend later

Every form field already has a stable, descriptive `name` attribute (e.g.
`Full Name`, `Subjects`, `Learning Goals`), and every submission flows through
one function: `submitForm()` → `handleSubmit()` in `js/main.js`. To switch
providers:

1. Open `js/main.js` and look at the `ENDPOINTS` object at the top.
2. Change the URL(s) to your new provider's endpoint.
3. If the new provider expects a different request shape than `FormData`
   (e.g. EmailJS's SDK, or a JSON body for a custom API), adjust the body of
   `handleSubmit()` — the surrounding logic (loading state, success/error
   message, resetting the form) stays the same.

No HTML needs to change for this swap.

### Connecting a real backend + database

The long-term plan described in the project brief — an admin dashboard where
staff can view learner requests, approve tutor applications, manage the tutor
database, and send notifications — will need a real backend and database
(e.g. Node/Express + PostgreSQL, or a low-code backend like Supabase/Firebase).

Because every field already has a clean, stable `name`, the migration path is:

1. Stand up an API route (e.g. `POST /api/requests` and `POST /api/tutors`).
2. In `handleSubmit()` in `js/main.js`, replace the `fetch(endpoint, ...)`
   call with a call to your new API route, sending the same `FormData` (or
   convert it to JSON first — the field names already match a clean data
   model).
3. Your backend saves each submission to the database and can still forward a
   copy by email if you want to keep that notification.
4. Build the admin dashboard against that same database.

No redesign of the front end is required for this step.

## Content notes

- **Mission and Vision statements**, the **hero headline/tagline/intro**, and
  the **final CTA copy** are used verbatim from the project brief.
- **Testimonials** are illustrative sample content — replace with real
  learner/parent reviews once available.
- **Privacy Policy and Terms & Conditions** contain real, site-specific
  content (what data each form actually collects, how FormSubmit is used,
  a section on learners under 18, Nigerian governing law, etc.) rather than
  generic filler. They are not legal advice — have them reviewed by a
  qualified professional before you rely on them, especially for NDPA
  (Nigeria Data Protection Act) compliance and your actual payment/refund
  practices once those are finalized.
- WhatsApp links use the `wa.me` format (e.g. `https://wa.me/2348025863243`),
  so they open a chat directly on both mobile and desktop.

## Deployment

This is a fully static site, so it deploys anywhere that serves static files —
Vercel, Netlify, GitHub Pages, or standard web hosting. For Vercel: create a
new project, point it at this folder (no build command needed, output
directory is the project root), and deploy.

## Design system quick reference

- **Colors:** White `#FFFFFF`, Blue `#2563EB`, Purple `#7C3AED`, plus tints
  and a near-black "ink" text color — all defined as CSS variables at the top
  of `css/style.css` (`:root`).
- **Type:** Fraunces (display/headings) + Inter (body/UI), loaded from Google
  Fonts.
- **Icons:** hand-built inline SVGs (no icon library dependency) using
  `currentColor`, so they inherit color from their container automatically.
- **Signature illustration:** the "Learner → Careful Review → Matched Tutor"
  path graphic in the hero section visually encodes the core differentiator —
  this is a matching service, not a browsing marketplace.
