const API_BASE = window.TLT_API_BASE || '/api';

document.addEventListener('DOMContentLoaded', () => {
  initNavToggle();
  initFaqAccordion();
  initFileLabels();
  initForms();
  setYear();
});

function initNavToggle() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }));
}

function initFaqAccordion() {
  document.querySelectorAll('.faq-item').forEach(item => {
    const btn = item.querySelector('.faq-q');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      item.parentElement.querySelectorAll('.faq-item').forEach(el => el.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
}

function initFileLabels() {
  document.querySelectorAll(".file-drop input[type='file']").forEach(input => {
    input.addEventListener('change', () => {
      const label = input.parentElement.querySelector('.filename');
      if (!label) return;
      label.textContent = input.files.length ? Array.from(input.files).map(f => f.name).join(', ') : '';
    });
  });
}

function setYear() {
  document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
}

function initForms() {
  document.querySelectorAll('form[data-form]').forEach(form => {
    form.addEventListener('submit', e => handleSubmit(e, form));
  });
}

function getAll(formData, key) {
  return formData.getAll(key).filter(value => typeof value === 'string' ? value.trim() : value?.name).map(value => typeof value === 'string' ? value.trim() : value.name).join(', ');
}

function validateForm(form, data) {
  const groups = [
    ['requestTutor', 'Subjects', 'Please select at least one subject.'],
    ['becomeTutor', 'Subjects Taught', 'Please select at least one subject you teach.'],
    ['becomeTutor', 'Academic Levels Taught', 'Please select at least one academic level.']
  ];
  for (const [type, field, message] of groups) {
    if (form.dataset.form === type && !data.getAll(field).filter(Boolean).length) {
      showStatus(form.querySelector('.form-status'), 'error', 'More information needed', message);
      const first = form.querySelector(`input[name="${field}"]`);
      if (first) first.focus();
      return false;
    }
  }
  const files = Array.from(form.querySelectorAll('input[type=file]')).flatMap(input => Array.from(input.files || []));
  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) {
      showStatus(form.querySelector('.form-status'), 'error', 'File too large', `${file.name} exceeds the 5MB limit.`);
      return false;
    }
  }
  return true;
}

async function handleSubmit(e, form) {
  e.preventDefault();
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const statusEl = form.querySelector('.form-status');
  const submitBtn = form.querySelector('[type=submit]');
  const original = submitBtn?.textContent || 'Submit';
  const formData = new FormData(form);
  if (!validateForm(form, formData)) return;
  const data = {};
  for (const [key, value] of formData.entries()) {
    if (key === 'website') continue;
    if (value instanceof File) {
      if (value.name) data[key] = value.name;
    } else if (data[key]) data[key] = `${data[key]}, ${value}`;
    else data[key] = value;
  }
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }
  hideStatus(statusEl);
  try {
    const response = await fetch(`${API_BASE}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ type: form.dataset.form, website: formData.get('website') || '', fullName: formData.get('Full Name'), email: formData.get('Email Address'), message: formData.get('Message'), learningGoals: formData.get('Learning Goals'), data })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Submission failed');
    showStatus(statusEl, 'success', form.dataset.successTitle || 'Submission received', form.dataset.successBody || "Thank you — your submission has been sent to our team. We'll be in touch shortly.");
    form.reset();
    document.querySelectorAll('.file-drop .filename').forEach(el => el.textContent = '');
    statusEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (err) {
    showStatus(statusEl, 'error', 'Something went wrong', err.message || 'Your submission could not be sent right now. Please try again.');
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = original; }
  }
}

function showStatus(el, type, title, body) {
  if (!el) return;
  el.classList.remove('success', 'error');
  el.classList.add(type, 'show');
  el.innerHTML = `<span class="icon">${type === 'success' ? '✓' : '!'}</span><div><h4>${escapeHtml(title)}</h4><p>${escapeHtml(body)}</p></div>`;
}
function hideStatus(el) { if (el) el.classList.remove('show'); }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
