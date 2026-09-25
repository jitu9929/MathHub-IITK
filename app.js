const SUPABASE_URL = "https://lwakgikyaqybovfivrbq.supabase.co";
const SUPABASE_KEY = "sb_publishable__RqSu4NpgxLpmVAc1KxYCQ_LFxpuclq";
const ADMIN_EMAIL = "2024msmt013@curaj.ac.in";
const SEMESTERS = [1, 2, 3, 4];

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentSemester = 1;
let currentCourse = null;
let currentYear = null;
let currentType = "PYQ";
let courses = [];
let years = [];
let resources = [];
let adminUser = null;

document.addEventListener("DOMContentLoaded", async () => {
  setupAuthListener();
  await refreshAll();
});

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}
function escAttr(s) { return esc(s); }

async function refreshAll() {
  try {
    const { data: sessionData } = await sb.auth.getSession();
    adminUser = sessionData?.session?.user || null;
    await loadData();
    renderHome();
  } catch (err) {
    console.error(err);
    renderHome();
  }
}

async function loadData() {
  const [cRes, yRes, rRes] = await Promise.all([
    sb.from("Courses").select("*").order("semester", { ascending: true }).order("course_code", { ascending: true }),
    sb.from("academic_years").select("*").order("academic_year", { ascending: false }),
    sb.from("resources").select("*").order("created_at", { ascending: true })
  ]);

  if (cRes.error) throw cRes.error;
  if (yRes.error) throw yRes.error;
  if (rRes.error) throw rRes.error;

  courses = cRes.data || [];
  years = yRes.data || [];
  resources = rRes.data || [];
}

function hideAll() {
  ["homePage","semesterPage","yearPage","adminPage"].forEach(id => {
    document.getElementById(id).classList.add("hidden");
  });
}

async function goHome() {
  hideAll();
  document.getElementById("homePage").classList.remove("hidden");
  await refreshAll();
}

function renderHome() {
  const grid = document.getElementById("semesterGrid");
  if (!grid) return;

  grid.innerHTML = SEMESTERS.map(s => {
    const count = courses.filter(c => Number(c.semester) === s).length;
    return `<div class="semester" onclick="openSemester(${s})">
      <div class="sem-number">${s}</div>
      <h3>${s===1?"1st":s===2?"2nd":s===3?"3rd":"4th"} Semester</h3>
      <p>${count} course${count === 1 ? "" : "s"}</p>
    </div>`;
  }).join("");
}

async function openSemester(s) {
  currentSemester = s;
  currentCourse = null;
  currentYear = null;
  hideAll();
  document.getElementById("semesterPage").classList.remove("hidden");
  document.getElementById("semesterTitle").textContent = `Semester ${s}`;
  await renderCourses();
}

async function renderCourses() {
  const list = courses.filter(c => Number(c.semester) === Number(currentSemester));
  const el = document.getElementById("courseGrid");

  if (!list.length) {
    el.innerHTML = '<p>No courses added yet. Admin can add courses.</p>';
    return;
  }

  el.innerHTML = list.map(c => {
    const count = years.filter(y => Number(y.course_id) === Number(c.id)).length;
    return `<div class="course">
      <div class="course-icon">📘</div>
      <h3>${esc(c.course_code)}</h3>
      <p>${count} academic year${count === 1 ? "" : "s"} • PYQs & Notes</p>
      <button class="primary course-open" data-id="${c.id}">Open Course →</button>
    </div>`;
  }).join("");

  document.querySelectorAll(".course-open").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const c = courses.find(x => Number(x.id) === Number(btn.dataset.id));
      if (c) openCourse(c);
    });
  });
}

async function openCourse(course) {
  currentCourse = course;
  currentYear = null;
  hideAll();
  document.getElementById("semesterPage").classList.remove("hidden");
  document.getElementById("semesterTitle").textContent =
    `Semester ${currentSemester} — ${course.course_code}`;

  const list = years
    .filter(y => Number(y.course_id) === Number(course.id))
    .sort((a,b) => Number(b.academic_year) - Number(a.academic_year));

  const el = document.getElementById("courseGrid");
  el.innerHTML = list.length ? list.map(y => `
    <div class="year">
      <div class="year-icon">📁</div>
      <h3>${esc(y.academic_year)}</h3>
      <p>PYQs & Notes</p>
      <button class="primary year-open" data-id="${y.id}">Open Year →</button>
    </div>
  `).join("") : '<p>No academic years added yet. Admin can add one.</p>';

  document.querySelectorAll(".year-open").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const y = years.find(x => Number(x.id) === Number(btn.dataset.id));
      if (y) openYear(y);
    });
  });
}

async function openYear(year) {
  currentYear = year;
  hideAll();
  document.getElementById("yearPage").classList.remove("hidden");

  document.getElementById("breadcrumb").textContent =
    `SEMESTER ${currentSemester} • ${currentCourse.course_code} • ${year.academic_year}`;
  document.getElementById("yearTitle").textContent =
    `${currentCourse.course_code} — ${year.academic_year}`;

  renderItems();
}

function renderItems() {
  const items = resources.filter(r => Number(r.academic_year_id) === Number(currentYear.id));

  ["PYQ","Notes"].forEach(type => {
    const el = document.getElementById(type === "PYQ" ? "pyqList" : "notesList");
    const list = items.filter(r => r.resource_type === type);

    el.innerHTML = list.length ? list.map(x => `
      <div class="item">
        <div class="item-info">
          <b>${esc(x.title)}</b>
          <small>${x.file_url ? "PDF / Resource" : "No file link"}</small>
        </div>
        ${x.file_url ? `<a class="open" target="_blank" rel="noopener" href="${escAttr(x.file_url)}">Open</a>` : ""}
        ${isAdmin() ? `<button class="back" onclick="deleteResource(${x.id})">×</button>` : ""}
      </div>
    `).join("") : '<p style="color:#8a93a2;font-size:14px">Nothing added yet.</p>';
  });
}

function isAdmin() {
  return !!adminUser && String(adminUser.email).toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

async function requireAdmin() {
  if (isAdmin()) return true;
  await showLoginModal();
  return isAdmin();
}

async function openAdmin() {
  const ok = await requireAdmin();
  if (!ok) return;

  hideAll();
  document.getElementById("adminPage").classList.remove("hidden");
  fillSemesterSelects();
  renderAdmin();
  loadAdminProfile();

  const title = document.querySelector("#adminPage .page-title");
  if (title && !document.getElementById("logoutBtn")) {
    const btn = document.createElement("button");
    btn.id = "logoutBtn";
    btn.className = "back";
    btn.textContent = "Logout";
    btn.onclick = logoutAdmin;
    title.appendChild(btn);
  }
}

function fillSemesterSelects() {
  ["adminCourseSemester","adminYearSemester","adminResourceSemester"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const old = el.value;
    el.innerHTML = SEMESTERS.map(s => `<option value="${s}">Semester ${s}</option>`).join("");
    if (old) el.value = old;
  });
  populateAdminCourses("adminYearSemester","adminYearCourse");
  populateAdminCourses("adminResourceSemester","adminResourceCourse");
  populateAdminYears();
}

function populateAdminCourses(semId, courseId) {
  const s = Number(document.getElementById(semId).value);
  const el = document.getElementById(courseId);
  const list = courses.filter(c => Number(c.semester) === s);

  el.innerHTML = list.length
    ? list.map(c => `<option value="${c.id}">${esc(c.course_code)}</option>`).join("")
    : '<option value="">No course</option>';
}

function populateAdminYears() {
  const courseId = Number(document.getElementById("adminResourceCourse").value);
  const el = document.getElementById("adminResourceYear");
  const list = years
    .filter(y => Number(y.course_id) === courseId)
    .sort((a,b) => Number(b.academic_year) - Number(a.academic_year));

  el.innerHTML = list.length
    ? list.map(y => `<option value="${y.id}">${esc(y.academic_year)}</option>`).join("")
    : '<option value="">No year</option>';
}

async function addCourse() {
  if (!(await requireAdmin())) return;

  const semester = Number(document.getElementById("adminCourseSemester").value);
  const code = document.getElementById("adminCourse").value.trim().toUpperCase();

  if (!code) {
    alert("Enter a course code/name, e.g. MTH403.");
    return;
  }

  const duplicate = courses.some(c =>
    Number(c.semester) === semester &&
    String(c.course_code).toUpperCase() === code
  );
  if (duplicate) {
    alert("This course already exists.");
    return;
  }

  const { error } = await sb.from("Courses").insert({
    semester: semester,
    course_code: code,
    course_name: code
  });

  if (error) {
    alert("Could not save course online: " + error.message);
    console.error(error);
    return;
  }

  document.getElementById("adminCourse").value = "";
  await loadData();
  fillSemesterSelects();
  renderAdmin();
  renderHome();
  alert(`${code} added to Semester ${semester}.`);
}

async function addYear() {
  if (!(await requireAdmin())) return;

  const semester = Number(document.getElementById("adminYearSemester").value);
  const courseId = Number(document.getElementById("adminYearCourse").value);
  const year = document.getElementById("adminYear").value.trim();

  if (!courseId) {
    alert("First add/select a course.");
    return;
  }
  if (!/^\d{4}$/.test(year)) {
    alert("Enter a valid year, e.g. 2026.");
    return;
  }

  const duplicate = years.some(y =>
    Number(y.course_id) === courseId && String(y.academic_year) === year
  );
  if (duplicate) {
    alert("This academic year already exists.");
    return;
  }

  const { error } = await sb.from("academic_years").insert({
    course_id: courseId,
    academic_year: Number(year)
  });

  if (error) {
    alert("Could not save academic year online: " + error.message);
    console.error(error);
    return;
  }

  document.getElementById("adminYear").value = "";
  await loadData();
  fillSemesterSelects();
  renderAdmin();
  alert(`Year ${year} added.`);
}

async function addAdminResource() {
  if (!(await requireAdmin())) return;

  const yearId = Number(document.getElementById("adminResourceYear").value);
  const type = document.getElementById("adminResourceType").value;
  const title = document.getElementById("adminResourceTitle").value.trim();
  const url = document.getElementById("adminResourceUrl").value.trim();

  if (!yearId) {
    alert("Select/add an academic year.");
    return;
  }
  if (!title) {
    alert("Enter a title.");
    return;
  }

  const { error } = await sb.from("resources").insert({
    academic_year_id: yearId,
    resource_type: type,
    title: title,
    file_url: url
  });

  if (error) {
    alert("Could not save resource online: " + error.message);
    console.error(error);
    return;
  }

  document.getElementById("adminResourceTitle").value = "";
  document.getElementById("adminResourceUrl").value = "";
  await loadData();
  fillSemesterSelects();
  renderAdmin();
  alert(`${type} added successfully.`);
}

async function deleteResource(id) {
  if (!(await requireAdmin())) return;
  if (!confirm("Delete this resource?")) return;

  const { error } = await sb.from("resources").delete().eq("id", id);
  if (error) {
    alert("Could not delete resource: " + error.message);
    return;
  }

  await loadData();
  renderItems();
  renderAdmin();
}

function renderAdmin() {
  const el = document.getElementById("adminStructure");
  el.innerHTML = SEMESTERS.map(s => {
    const list = courses.filter(c => Number(c.semester) === s);
    if (!list.length) {
      return `<div class="structure-row"><b>Semester ${s}</b><span>No courses added</span></div>`;
    }

    return `<div class="structure-row"><b>Semester ${s}</b><span>${
      list.map(c => {
        const ys = years
          .filter(y => Number(y.course_id) === Number(c.id))
          .sort((a,b) => Number(b.academic_year) - Number(a.academic_year))
          .map(y => y.academic_year);
        return `${esc(c.course_code)} (${ys.length ? ys.join(", ") : "no years"})`;
      }).join(" • ")
    }</span></div>`;
  }).join("");
}

function setupAuthListener() {
  sb.auth.onAuthStateChange((_event, session) => {
    adminUser = session?.user || null;
  });
}

function showLoginModal() {
  return new Promise(resolve => {
    let modal = document.getElementById("loginModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "loginModal";
      modal.className = "modal";
      modal.innerHTML = `
        <div class="modal-box">
          <button class="close" id="loginClose">×</button>
          <div class="eyebrow">ADMIN ACCESS</div>
          <h2>Admin Login</h2>
          <label>Email
            <input id="loginEmail" type="email" value="${ADMIN_EMAIL}">
          </label>
          <label>Password
            <input id="loginPassword" type="password" placeholder="Enter admin password">
          </label>
          <button class="primary full" id="loginBtn">Login</button>
          <p class="hint">Only the authorized MathHub IITK admin account can add or edit content.</p>
        </div>`;
      document.body.appendChild(modal);
    } else {
      modal.classList.remove("hidden");
    }

    const close = () => {
      modal.classList.add("hidden");
      resolve(false);
    };

    document.getElementById("loginClose").onclick = close;
    document.getElementById("loginBtn").onclick = async () => {
      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value;

      if (!email || !password) {
        alert("Enter email and password.");
        return;
      }

      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        alert("Login failed: " + error.message);
        return;
      }

      adminUser = data.user;
      modal.classList.add("hidden");
      resolve(isAdmin());
    };
  });
}

async function logoutAdmin() {
  await sb.auth.signOut();
  adminUser = null;
  await goHome();
}

function openAdd(type) {
  if (!isAdmin()) {
    showLoginModal();
    return;
  }

  currentType = type;
  document.getElementById("modalType").textContent = type;
  document.getElementById("modalTitle").textContent = `Add ${type}`;
  document.getElementById("itemTitle").value = "";
  document.getElementById("itemUrl").value = "";
  document.getElementById("modal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modal").classList.add("hidden");
}

async function saveItem() {
  if (!isAdmin()) {
    closeModal();
    await showLoginModal();
    return;
  }

  const title = document.getElementById("itemTitle").value.trim();
  const url = document.getElementById("itemUrl").value.trim();

  if (!title) {
    alert("Please enter a title.");
    return;
  }

  const { error } = await sb.from("resources").insert({
    academic_year_id: Number(currentYear.id),
    resource_type: currentType,
    title: title,
    file_url: url
  });

  if (error) {
    alert("Could not save resource online: " + error.message);
    return;
  }

  closeModal();
  await loadData();
  renderItems();
  renderAdmin();
}

function previewProfilePhoto(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function() {
    const img = document.getElementById("profilePhoto");
    const ph = document.getElementById("profilePlaceholder");
    img.src = reader.result;
    img.style.display = "block";
    ph.style.display = "none";
    localStorage.setItem("mathhub_admin_photo", reader.result);
  };
  reader.readAsDataURL(file);
}

function loadAdminProfile() {
  const photo = localStorage.getItem("mathhub_admin_photo");
  const img = document.getElementById("profilePhoto");
  const ph = document.getElementById("profilePlaceholder");
  if (!img || !ph) return;

  if (photo) {
    img.src = photo;
    img.style.display = "block";
    ph.style.display = "none";
  } else {
    img.style.display = "none";
    ph.style.display = "grid";
  }
}
