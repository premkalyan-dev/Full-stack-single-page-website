/* app.js
   - PIPEDREAM_URL is set to your Pipedream webhook (you provided it earlier)
   - FEES_API uses a local fees.json fallback for easy local testing
*/

// ---------- CONFIG ----------
const PIPEDREAM_URL = "https://eoojzaxqa3hlaj3.m.pipedream.net"; // <-- your Pipedream webhook
const FEES_API = "fee.json"; // local JSON file for fees; if you have a deployed API use full URL

// Timeout helper for fetch
function fetchWithTimeout(url, options = {}, timeout = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const opt = { ...options, signal: controller.signal };
  return fetch(url, opt).finally(() => clearTimeout(id));
}

// ---------- Helpers ----------
function el(id){ return document.getElementById(id) }
function showMsg(node, text, ok = true){
  node.className = 'form-msg ' + (ok ? 'success' : 'error');
  node.textContent = text;
  node.style.display = 'block';
}
function hideMsg(node){
  node.style.display = 'none';
}
function validIndianPhone(phone){
  return /^[6-9]\d{9}$/.test(phone);
}
function formatNumber(n){
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function escapeHtml(s = ''){
  return s.replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

// ---------- Form handling ----------
const form = el('leadForm');
const formMsg = el('formMsg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideMsg(formMsg);

  const data = {
    fullname: form.fullname.value.trim(),
    email: form.email.value.trim(),
    phone: form.phone.value.trim(),
    state: form.state.value,
    course: form.course.value,
    intake: form.intake.value,
    consent: !!form.consent.checked,
    submittedAt: new Date().toISOString()
  };

  // Client-side validation
  if (!data.fullname) { showMsg(formMsg, "Please enter your full name.", false); return; }
  if (!data.email || !/^\S+@\S+\.\S+$/.test(data.email)) { showMsg(formMsg, "Please enter a valid email.", false); return; }
  if (!validIndianPhone(data.phone)) { showMsg(formMsg, "Please enter a valid 10-digit Indian mobile number (starts with 6-9).", false); return; }
  if (!data.state) { showMsg(formMsg, "Please select your state.", false); return; }
  if (!data.course) { showMsg(formMsg, "Please select a course.", false); return; }
  if (!data.intake) { showMsg(formMsg, "Please select intake year.", false); return; }
  if (!data.consent) { showMsg(formMsg, "Please provide consent to be contacted.", false); return; }

  // after building data object
data.source = "Sunrise Private University"; // or "Greenfield International University"

  // Send to Pipedream (with logs and timeout)
  try {
    console.log("Posting to Pipedream:", PIPEDREAM_URL, data);
    const resp = await fetchWithTimeout(PIPEDREAM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }, 10000); // 10s timeout

    console.log('PIPEDREAM response status:', resp.status, resp.statusText);

    if (resp.ok) {
      // try to parse response body if any
      let body = null;
      try { body = await resp.json(); } catch (e) { /* ignore if no json */ }
      console.log('PIPEDREAM response body:', body);
      showMsg(formMsg, "Thanks! Your enquiry was submitted successfully.");
      form.reset();
    } else {
      const txt = await resp.text().catch(()=>'<no body>');
      console.error('PIPEDREAM non-ok:', resp.status, txt);
      showMsg(formMsg, "Submission failed (server). Try again later.", false);
    }
  } catch (err) {
    console.error("PIPEDREAM NETWORK ERROR:", err);
    // distinguish abort (timeout) vs other errors
    if (err.name === 'AbortError') {
      showMsg(formMsg, "Request timed out. Check your connection and try again.", false);
    } else {
      showMsg(formMsg, "Network error. Check your connection and try again.", false);
    }
  }
});

// ---------- Modal: fetch fees and show ----------
const modalBack = el('modalBack');
const modalClose = el('modalClose');
const feesBtn = el('feesBtn');
const feesContent = el('feesContent');

feesBtn.addEventListener('click', async () => {
  modalBack.style.display = 'flex';
  modalBack.setAttribute('aria-hidden', 'false');
  feesContent.textContent = 'Loading...';
  console.log('Fetching fees from:', FEES_API);

  try {
    const resp = await fetchWithTimeout(FEES_API, {}, 8000); // 8s timeout
    console.log('FEES fetch status:', resp.status, resp.statusText);

    if (!resp.ok) {
      // show friendly message but keep logs
      const txt = await resp.text().catch(()=>'<no body>');
      console.error('FEES fetch non-ok:', resp.status, txt);
      feesContent.textContent = 'No fee data available right now.';
      return;
    }

    const json = await resp.json();
    console.log('FEES JSON:', json);

    if (!json || !Array.isArray(json.courses)) {
      feesContent.textContent = 'No fee data available.';
      return;
    }

    const rows = json.courses.map(c => {
      const min = c.feeMin != null ? `₹ ${formatNumber(c.feeMin)}` : 'N/A';
      const max = c.feeMax != null ? `₹ ${formatNumber(c.feeMax)}` : 'N/A';
      return `<div class="fee-row"><strong>${escapeHtml(c.name)}</strong><div class="small">${min} - ${max}</div></div>`;
    }).join('');
    feesContent.innerHTML = rows;
  } catch (err) {
    console.error('FEES ERROR:', err);
    if (err.name === 'AbortError') {
      feesContent.textContent = 'Loading fees timed out. Try again.';
    } else {
      feesContent.textContent = 'Could not load fee data right now. Try again later.';
    }
  }
});

modalClose.addEventListener('click', closeModal);
modalBack.addEventListener('click', (e) => {
  if (e.target === modalBack) closeModal();
});
function closeModal(){
  modalBack.style.display = 'none';
  modalBack.setAttribute('aria-hidden', 'true');
}

// set current year in footer
document.getElementById('year').textContent = new Date().getFullYear();
