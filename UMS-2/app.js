// -----------------------------------------
// CONFIG
// -----------------------------------------

const PIPEDREAM_URL = "https://eoojzaxqa3hlaj3.m.pipedream.net";  // same webhook
const FEES_API = "fee.json";  // LP-2 fees file

function el(id) { return document.getElementById(id); }

// timeout wrapper
function fetchWithTimeout(url, options = {}, timeout = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(id));
}

// helpers
function showMsg(node, text, ok = true) {
  node.className = "form-msg " + (ok ? "success" : "error");
  node.textContent = text;
  node.style.display = "block";
}

function hideMsg(node) {
  node.style.display = "none";
}

function validIndianPhone(phone) {
  return /^[6-9]\d{9}$/.test(phone);
}

function escapeHtml(s = "") {
  return s.replace(/[&<>'"]/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]
  ));
}

function formatNumber(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// -----------------------------------------
// FORM LOGIC
// -----------------------------------------

const form = el("leadForm");
const formMsg = el("formMsg");

form.addEventListener("submit", async (e) => {
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

  // validation
  if (!data.fullname) return showMsg(formMsg, "Enter full name", false);
  if (!data.email || !/^\S+@\S+\.\S+$/.test(data.email)) return showMsg(formMsg, "Invalid email", false);
  if (!validIndianPhone(data.phone)) return showMsg(formMsg, "Invalid Indian phone", false);
  if (!data.state) return showMsg(formMsg, "Select state", false);
  if (!data.course) return showMsg(formMsg, "Select course", false);
  if (!data.intake) return showMsg(formMsg, "Select intake year", false);
  if (!data.consent) return showMsg(formMsg, "Please give consent", false);

  console.log("Posting to Pipedream:", PIPEDREAM_URL, data);
// after building data object
data.source = "Greenfield International University"; // or "Greenfield International University"

  try {
    const resp = await fetchWithTimeout(PIPEDREAM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    console.log("PIPEDREAM response status:", resp.status);
    if (resp.ok) {
      showMsg(formMsg, "Submitted successfully!");
      form.reset();
    } else {
      showMsg(formMsg, "Submission failed!", false);
    }
  } catch (err) {
    console.error("NETWORK ERROR:", err);
    showMsg(formMsg, "Network error. Try again.", false);
  }
});

// -----------------------------------------
// FEES MODAL
// -----------------------------------------

const modalBack = el("modalBack");
const modalClose = el("modalClose");
const feesBtn = el("feesBtn");
const feesContent = el("feesContent");

feesBtn.addEventListener("click", async () => {
  modalBack.style.display = "flex";
  feesContent.textContent = "Loading...";

  console.log("Fetching fees from:", FEES_API);

  try {
    const resp = await fetch(FEES_API);
    if (!resp.ok) throw new Error("Failed " + resp.status);

    const json = await resp.json();
    console.log("FEES JSON:", json);

    const html = json.courses.map(c => `
      <div class="fee-row">
        <strong>${escapeHtml(c.name)}</strong>
        <div class="small">₹ ${formatNumber(c.feeMin)} - ₹ ${formatNumber(c.feeMax)}</div>
      </div>
    `).join("");

    feesContent.innerHTML = html;

  } catch (err) {
    feesContent.textContent = "Failed to load fees.";
  }
});

modalClose.addEventListener("click", () => modalBack.style.display = "none");
modalBack.addEventListener("click", (e) => { if (e.target === modalBack) modalBack.style.display = "none"; });

// footer year
el("year").textContent = new Date().getFullYear();
