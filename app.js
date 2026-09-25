// ================= SUPABASE CONNECTION =================
// Paste your Supabase Project URL and Publishable key below.
// Do NOT paste the sb_secret_... key here.
const SUPABASE_URL = "https://lwakgikyaqybovfivrbq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_RqSu4NpgxLpmVAc1KxYCQ_LFxpuclq";

const supabaseConfigured =
  SUPABASE_URL.startsWith("https://") &&
  SUPABASE_PUBLISHABLE_KEY.startsWith("sb_");

const supabaseClient = supabaseConfigured
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;

const ADMIN_EMAIL = "2024msmt013@curaj.ac.in";
let currentSession = null;

async function getSession(){
  if(!supabaseClient) return null;
  const { data } = await supabaseClient.auth.getSession();
  currentSession = data.session || null;
  return currentSession;
}

async function isAdmin(){
  const session = await getSession();
  return !!(session && session.user && session.user.email && session.user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
}

function requireAdmin(action){
  isAdmin().then(ok=>{
    if(!ok) showLoginModal(action || "Admin access");
  });
}

function showLoginModal(afterLogin){
  let m=document.getElementById("authModal");
  if(!m){
    m=document.createElement("div");
    m.id="authModal";
    m.style.cssText="position:fixed;inset:0;background:#17203399;display:grid;place-items:center;padding:20px;z-index:50";
    m.innerHTML=`<div style="position:relative;background:#fff;border-radius:18px;padding:30px;width:min(430px,100%);box-shadow:0 25px 80px #0003">
      <button id="authClose" style="position:absolute;right:14px;top:10px;border:0;background:none;font-size:28px;color:#7a8393;cursor:pointer">×</button>
      <div style="font-size:11px;letter-spacing:2px;font-weight:800;color:#315ed0;margin-bottom:10px">ADMIN LOGIN</div>
      <h2 style="margin:0 0 8px">MathHub IITK</h2>
      <p style="color:#778194;font-size:14px">Login with the authorized Admin account.</p>
      <label style="display:block;font-size:13px;font-weight:700;margin:14px 0">Email<input id="authEmail" type="email" value="${ADMIN_EMAIL}" style="display:block;width:100%;margin-top:7px;padding:12px;border:1px solid #dbe1ea;border-radius:9px"></label>
      <label style="display:block;font-size:13px;font-weight:700;margin:14px 0">Password<input id="authPassword" type="password" placeholder="Enter password" style="display:block;width:100%;margin-top:7px;padding:12px;border:1px solid #dbe1ea;border-radius:9px"></label>
      <p id="authError" style="display:none;color:#c43b3b;font-size:13px"></p>
      <button id="authLogin" class="primary" style="width:100%">Login</button>
    </div>`;
    document.body.appendChild(m);
    document.getElementById("authClose").onclick=()=>m.remove();
    document.getElementById("authLogin").onclick=async()=>{
      const email=document.getElementById("authEmail").value.trim();
      const password=document.getElementById("authPassword").value;
      const err=document.getElementById("authError");
      err.style.display="none";
      if(email.toLowerCase()!==ADMIN_EMAIL.toLowerCase()){err.textContent="This account is not authorized as MathHub Admin.";err.style.display="block";return}
      if(!password){err.textContent="Enter your password.";err.style.display="block";return}
      const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
      if(error){err.textContent=error.message;err.style.display="block";return}
      currentSession=data.session;
      m.remove();
      if(afterLogin){openAdmin();}
    };
  }
}

async function logoutAdmin(){
  if(supabaseClient) await supabaseClient.auth.signOut();
  currentSession=null;
  goHome();
}

function addAdminControls(){
  const title=document.querySelector("#adminPage .page-title");
  if(title && !document.getElementById("adminLogout")){
    const b=document.createElement("button");
    b.id="adminLogout"; b.className="primary"; b.textContent="Logout"; b.style.marginTop="8px"; b.onclick=logoutAdmin;
    title.appendChild(b);
  }
}

async function loadFromSupabase() {
  if (!supabaseClient) return false;

  try {
    const { data: courses, error: cErr } = await supabaseClient
      .from("Courses")
      .select("id,semester,course_code,course_name")
      .order("semester")
      .order("course_code");

    if (cErr) throw cErr;

    const { data: years, error: yErr } = await supabaseClient
      .from("academic_years")
      .select("id,course_id,academic_year")
      .order("academic_year", { ascending: false });

    if (yErr) throw yErr;

    const { data: resources, error: rErr } = await supabaseClient
      .from("resources")
      .select("id,academic_year_id,resource_type,title,file_url")
      .order("id");

    if (rErr) throw rErr;

    const remote = {};
    SEMESTERS.forEach(s => remote["Semester " + s] = {});

    (courses || []).forEach(c => {
      const sk = "Semester " + c.semester;
      if (!remote[sk]) remote[sk] = {};
      remote[sk][c.course_code] = {};

      (years || [])
        .filter(y => y.course_id === c.id)
        .forEach(y => {
          remote[sk][c.course_code][String(y.academic_year)] = {
            PYQ: [],
            Notes: []
          };

          (resources || [])
            .filter(r => r.academic_year_id === y.id)
            .forEach(r => {
              const type = r.resource_type === "Notes" ? "Notes" : "PYQ";
              remote[sk][c.course_code][String(y.academic_year)][type].push({
                id: r.id,
                title: r.title || "Resource",
                url: r.file_url || ""
              });
            });
        });
    });

    data = remote;
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error("Supabase load failed:", err);
    return false;
  }
}

// ========================================================

const SEMESTERS=[1,2,3,4];
const KEY="mathhub_iitk_data_v6_clean";
let data=JSON.parse(localStorage.getItem(KEY)||"null");

function emptyData(){
  const d={};
  SEMESTERS.forEach(s=>d["Semester "+s]={});
  return d;
}

function normalize(){
  // New format: data["Semester 1"]["MTH403"]["2026"] = {PYQ:[], Notes:[]}
  if(!data || typeof data!=="object") data=emptyData();

  SEMESTERS.forEach(s=>{
    const sk="Semester "+s;
    if(!data[sk] || typeof data[sk]!=="object") data[sk]={};
    Object.keys(data[sk]).forEach(course=>{
      if(!data[sk][course] || typeof data[sk][course]!=="object") data[sk][course]={};
      Object.keys(data[sk][course]).forEach(year=>{
        const y=data[sk][course][year];
        if(!y.PYQ) y.PYQ=[];
        if(!y.Notes) y.Notes=[];
      });
    });
  });
  localStorage.setItem(KEY,JSON.stringify(data));
}
normalize();

let currentSemester=1,currentCourse="",currentYear="",currentType="PYQ";

function save(){localStorage.setItem(KEY,JSON.stringify(data))}
function hideAll(){["homePage","semesterPage","yearPage","adminPage"].forEach(id=>document.getElementById(id).classList.add("hidden"))}
function goHome(){hideAll();document.getElementById("homePage").classList.remove("hidden");renderHome()}

function renderHome(){
  document.getElementById("semesterGrid").innerHTML=SEMESTERS.map(s=>{
    const count=Object.keys(data["Semester "+s]||{}).length;
    return `<div class="semester" onclick="openSemester(${s})">
      <div class="sem-number">${s}</div>
      <h3>${s}${s===1?"st":s===2?"nd":s===3?"rd":"th"} Semester</h3>
      <p>${count} courses</p>
    </div>`;
  }).join("");
}

function semesterKey(){return "Semester "+currentSemester}
function courseList(s){return Object.keys(data["Semester "+s]||{}).sort()}

function openSemester(s){
  currentSemester=s; currentCourse=""; currentYear="";
  hideAll();
  document.getElementById("semesterPage").classList.remove("hidden");
  document.getElementById("semesterTitle").textContent=`Semester ${s}`;
  renderCourses();
}

function renderCourses(){
  const courses=courseList(currentSemester);
  const el=document.getElementById("courseGrid");
  el.innerHTML=courses.length ? courses.map(c=>{
    const years=Object.keys(data[semesterKey()][c]||{}).length;
    return `<div class="course">
      <div class="course-icon">📘</div>
      <h3>${esc(c)}</h3>
      <p>${years} academic year${years===1?"":"s"} • PYQs & Notes</p>
      <button class="primary course-open" data-course="${escAttr(c)}">Open Course →</button>
    </div>`;
  }).join("") : '<p>No courses added yet. Go to Admin → Add Course.</p>';

  document.querySelectorAll(".course-open").forEach(btn=>{
    btn.addEventListener("click", e=>{
      e.stopPropagation();
      openCourse(btn.dataset.course);
    });
  });
}

function openCourse(c){
  currentCourse=c; currentYear="";
  hideAll();
  document.getElementById("semesterPage").classList.remove("hidden");
  document.getElementById("semesterTitle").textContent=`Semester ${currentSemester} — ${c}`;
  const years=Object.keys(data[semesterKey()][c]||{}).sort((a,b)=>b.localeCompare(a));
  const el=document.getElementById("courseGrid");
  el.innerHTML=years.length ? years.map(y=>`
    <div class="year">
      <div class="year-icon">📁</div>
      <h3>${esc(y)}</h3>
      <p>PYQs & Notes</p>
      <button class="primary year-open" data-year="${escAttr(y)}">Open Year →</button>
    </div>`).join("") : '<p>No academic years added yet. Use Admin → Add Academic Year.</p>';

  document.querySelectorAll(".year-open").forEach(btn=>{
    btn.addEventListener("click", e=>{
      e.stopPropagation();
      openYear(btn.dataset.year);
    });
  });
  // Change heading context but keep same page.
}

function openYear(y){
  currentYear=y;
  hideAll();
  document.getElementById("yearPage").classList.remove("hidden");
  document.getElementById("breadcrumb").textContent=`SEMESTER ${currentSemester} • ${currentCourse} • ${y}`;
  document.getElementById("yearTitle").textContent=`${currentCourse} — ${y}`;
  renderItems();
}

function renderItems(){
  const node=data[semesterKey()][currentCourse][currentYear]||{PYQ:[],Notes:[]};
  ["PYQ","Notes"].forEach(type=>{
    const el=document.getElementById(type==="PYQ"?"pyqList":"notesList");
    const items=node[type]||[];
    el.innerHTML=items.length ? items.map((x,i)=>`
      <div class="item">
        <div class="item-info"><b>${esc(x.title)}</b><small>${x.url?"PDF / Resource":"No file link"}</small></div>
        ${x.url?`<a class="open" target="_blank" rel="noopener" href="${escAttr(x.url)}">Open</a>`:""}
        <button class="delete-btn" onclick="deleteItem('${type}',${i})">🗑 Delete</button>
      </div>`).join("") : '<p style="color:#8a93a2;font-size:14px">Nothing added yet.</p>';
  });
  isAdmin().then(ok=>{
    document.querySelectorAll("#yearPage .add-btn").forEach(b=>b.style.display=ok?"block":"none");
    document.querySelectorAll("#yearPage .item .back").forEach(b=>b.style.display=ok?"inline-block":"none");
  });
}

function openAdd(type){
  isAdmin().then(ok=>{
    if(!ok){showLoginModal();return}
    currentType=type;
    document.getElementById("modalType").textContent=type;
    document.getElementById("modalTitle").textContent=`Add ${type}`;
    document.getElementById("itemTitle").value="";
    document.getElementById("itemUrl").value="";
    document.getElementById("modal").classList.remove("hidden");
  });
}
function closeModal(){document.getElementById("modal").classList.add("hidden")}
async function saveItem(){
  if(!(await isAdmin())){closeModal();showLoginModal();return}
  const title=document.getElementById("itemTitle").value.trim();
  const url=document.getElementById("itemUrl").value.trim();
  if(!title){alert("Please enter a title.");return}

  if(supabaseClient){
    const {data:yr,error}=await supabaseClient
      .from("academic_years")
      .select("id")
      .eq("academic_year",Number(currentYear))
      .eq("course_id",await findCourseId(currentSemester,currentCourse))
      .single();
    if(error || !yr){alert("Academic year not found in Supabase. Please use Admin → Add Academic Year.");return}
    const {data:row,error:rErr}=await supabaseClient.from("resources").insert({
      academic_year_id:yr.id, resource_type:currentType, title, file_url:url
    }).select("id").single();
    if(rErr){alert("Could not save online: "+rErr.message);return}
    data[semesterKey()][currentCourse][currentYear][currentType].push({id:row.id,title,url});
  }else{
    data[semesterKey()][currentCourse][currentYear][currentType].push({title,url});
  }
  save(); closeModal(); renderItems();
}
async function deleteItem(type,i){
  if(!(await isAdmin())){showLoginModal();return}
  const item=data[semesterKey()][currentCourse][currentYear][type][i];
  if(!confirm("Delete this resource?")) return;
  if(supabaseClient && item && item.id){
    const {error}=await supabaseClient.from("resources").delete().eq("id",item.id);
    if(error){alert("Could not delete online: "+error.message);return}
  }
  data[semesterKey()][currentCourse][currentYear][type].splice(i,1);
  save(); renderItems();
}

async function findCourseId(s,c){
  const {data:row,error}=await supabaseClient.from("Courses").select("id").eq("semester",s).eq("course_code",c).single();
  if(error) return null;
  return row.id;
}

// ---------- ADMIN ----------
function openAdmin(){
  isAdmin().then(ok=>{
    if(!ok){showLoginModal("Admin");return}
    hideAll();
    document.getElementById("adminPage").classList.remove("hidden");
    fillSemesterSelects();
    renderAdmin();
    loadAdminProfile();
    addAdminControls();
  });
}

function fillSemesterSelects(){
  ["adminCourseSemester","adminYearSemester","adminResourceSemester"].forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    const old=el.value;
    el.innerHTML=SEMESTERS.map(s=>`<option value="${s}">Semester ${s}</option>`).join("");
    if(old) el.value=old;
  });
  populateAdminCourses("adminYearSemester","adminYearCourse");
  populateAdminCourses("adminResourceSemester","adminResourceCourse");
  populateAdminYears();
}

function populateAdminCourses(semId,courseId){
  const s=Number(document.getElementById(semId).value);
  const el=document.getElementById(courseId);
  const courses=courseList(s);
  el.innerHTML=courses.length ? courses.map(c=>`<option value="${escAttr(c)}">${esc(c)}</option>`).join("") : '<option value="">No course</option>';
}

function populateAdminYears(){
  const s=Number(document.getElementById("adminResourceSemester").value);
  const c=document.getElementById("adminResourceCourse").value;
  const el=document.getElementById("adminResourceYear");
  const years=(data["Semester "+s][c] ? Object.keys(data["Semester "+s][c]).sort((a,b)=>b.localeCompare(a)) : []);
  el.innerHTML=years.length ? years.map(y=>`<option value="${escAttr(y)}">${esc(y)}</option>`).join("") : '<option value="">No year</option>';
}

async function addCourse(){
  if(!(await isAdmin())){showLoginModal();return}
  const s=Number(document.getElementById("adminCourseSemester").value);
  const c=document.getElementById("adminCourse").value.trim().toUpperCase();
  if(!c){alert("Enter a course code/name, e.g. MTH403.");return}
  const sk="Semester "+s;
  if(data[sk][c]){alert("This course already exists.");return}

  if(supabaseClient){
    const {error}=await supabaseClient.from("Courses").insert({semester:s,course_code:c,course_name:c});
    if(error){alert("Could not save course online: "+error.message);return}
  }
  data[sk][c]={}; save();
  document.getElementById("adminCourse").value="";
  fillSemesterSelects(); renderAdmin(); renderHome();
  alert(`${c} added to Semester ${s}.`);
}

async function addYear(){
  if(!(await isAdmin())){showLoginModal();return}
  const s=Number(document.getElementById("adminYearSemester").value);
  const c=document.getElementById("adminYearCourse").value;
  const y=document.getElementById("adminYear").value.trim();
  if(!c){alert("First add/select a course.");return}
  if(!/^\d{4}$/.test(y)){alert("Enter a valid year, e.g. 2026.");return}
  const sk="Semester "+s;
  if(!data[sk][c]) data[sk][c]={};
  if(data[sk][c][y]){alert("This academic year already exists.");return}

  if(supabaseClient){
    const courseId=await findCourseId(s,c);
    if(!courseId){alert("Course not found in Supabase. Please add the course first.");return}
    const {error}=await supabaseClient.from("academic_years").insert({course_id:courseId,academic_year:Number(y)});
    if(error){alert("Could not save year online: "+error.message);return}
  }
  data[sk][c][y]={PYQ:[],Notes:[]}; save();
  document.getElementById("adminYear").value="";
  fillSemesterSelects(); renderAdmin();
  alert(`Year ${y} added under ${c} — Semester ${s}.`);
}

async function addAdminResource(){
  if(!(await isAdmin())){showLoginModal();return}
  const s=Number(document.getElementById("adminResourceSemester").value);
  const c=document.getElementById("adminResourceCourse").value;
  const y=document.getElementById("adminResourceYear").value;
  const type=document.getElementById("adminResourceType").value;
  const title=document.getElementById("adminResourceTitle").value.trim();
  const url=document.getElementById("adminResourceUrl").value.trim();
  if(!c){alert("Select a course.");return}
  if(!y){alert("Select/add an academic year.");return}
  if(!title){alert("Enter a title.");return}

  if(supabaseClient){
    const courseId=await findCourseId(s,c);
    if(!courseId){alert("Course not found online.");return}
    const {data:yr,error:yErr}=await supabaseClient.from("academic_years").select("id").eq("course_id",courseId).eq("academic_year",Number(y)).single();
    if(yErr || !yr){alert("Academic year not found online.");return}
    const {data:row,error}=await supabaseClient.from("resources").insert({academic_year_id:yr.id,resource_type:type,title,file_url:url}).select("id").single();
    if(error){alert("Could not save resource online: "+error.message);return}
    data["Semester "+s][c][y][type].push({id:row.id,title,url});
  }else{
    data["Semester "+s][c][y][type].push({title,url});
  }
  save();
  document.getElementById("adminResourceTitle").value="";
  document.getElementById("adminResourceUrl").value="";
  renderAdmin();
  alert(`${type} added under ${c} — ${y}.`);
}

function renderAdmin(){
  const html=SEMESTERS.map(s=>{
    const sk="Semester "+s, courses=courseList(s);
    if(!courses.length) return `<div class="structure-row"><b>Semester ${s}</b><span>No courses added</span></div>`;
    return `<div class="structure-row"><b>Semester ${s}</b>
      ${courses.map(c=>{
        const years=Object.keys(data[sk][c]||{}).sort((a,b)=>b.localeCompare(a));
        return `<div class="admin-structure-course">
          <div class="structure-course-head">
            <strong>${esc(c)}</strong>
            <button class="delete-btn" data-delete-course="${s}" data-course="${escAttr(c)}">🗑 Delete Course</button>
          </div>
          <div class="structure-years">
            ${years.length ? years.map(y=>`<div class="structure-year">
              <span>📁 ${esc(y)}</span>
              <button class="delete-btn small" data-delete-year="${s}" data-course="${escAttr(c)}" data-year="${escAttr(y)}">🗑 Delete Year</button>
            </div>`).join("") : '<span class="no-year">No academic years added</span>'}
          </div>
        </div>`;
      }).join("")}
    </div>`;
  }).join("");
  document.getElementById("adminStructure").innerHTML=html;

  document.querySelectorAll('[data-delete-course]').forEach(btn=>btn.addEventListener('click',()=>{
    deleteCourse(Number(btn.dataset.deleteCourse),btn.dataset.course);
  }));
  document.querySelectorAll('[data-delete-year]').forEach(btn=>btn.addEventListener('click',()=>{
    deleteYear(Number(btn.dataset.deleteYear),btn.dataset.course,btn.dataset.year);
  }));
}

async function deleteCourse(s,c){
  if(!(await isAdmin())){showLoginModal();return}
  if(!confirm(`Delete course ${c} and all its academic years and PYQs/Notes? This cannot be undone.`)) return;

  if(supabaseClient){
    const courseId=await findCourseId(s,c);
    if(!courseId){alert("Course not found online.");return}

    const {data:years,error:yErr}=await supabaseClient.from("academic_years").select("id").eq("course_id",courseId);
    if(yErr){alert("Could not load academic years: "+yErr.message);return}
    const ids=(years||[]).map(y=>y.id);

    if(ids.length){
      const {error:rErr}=await supabaseClient.from("resources").delete().in("academic_year_id",ids);
      if(rErr){alert("Could not delete course resources: "+rErr.message);return}
      const {error:aErr}=await supabaseClient.from("academic_years").delete().eq("course_id",courseId);
      if(aErr){alert("Could not delete academic years: "+aErr.message);return}
    }

    const {error:cErr}=await supabaseClient.from("Courses").delete().eq("id",courseId);
    if(cErr){alert("Could not delete course online: "+cErr.message);return}
  }

  delete data["Semester "+s][c];
  save();
  await loadFromSupabase();
  fillSemesterSelects(); renderAdmin(); renderHome();
  alert(`${c} and its related data were deleted.`);
}

async function deleteYear(s,c,y){
  if(!(await isAdmin())){showLoginModal();return}
  if(!confirm(`Delete academic year ${y} under ${c}, including its PYQs/Notes? This cannot be undone.`)) return;

  if(supabaseClient){
    const courseId=await findCourseId(s,c);
    if(!courseId){alert("Course not found online.");return}
    const {data:yr,error:yErr}=await supabaseClient.from("academic_years").select("id").eq("course_id",courseId).eq("academic_year",Number(y)).single();
    if(yErr || !yr){alert("Academic year not found online.");return}

    const {error:rErr}=await supabaseClient.from("resources").delete().eq("academic_year_id",yr.id);
    if(rErr){alert("Could not delete year resources: "+rErr.message);return}
    const {error:dErr}=await supabaseClient.from("academic_years").delete().eq("id",yr.id);
    if(dErr){alert("Could not delete academic year online: "+dErr.message);return}
  }

  delete data["Semester "+s][c][y];
  save();
  await loadFromSupabase();
  fillSemesterSelects(); renderAdmin();
  alert(`Academic year ${y} was deleted.`);
}

// ---------- PROFILE ----------
function previewProfilePhoto(event){
  const file=event.target.files && event.target.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=function(){
    const img=document.getElementById("profilePhoto");
    const ph=document.getElementById("profilePlaceholder");
    img.src=reader.result; img.style.display="block"; ph.style.display="none";
    localStorage.setItem("mathhub_admin_photo",reader.result);
  };
  reader.readAsDataURL(file);
}
function loadAdminProfile(){
  const photo=localStorage.getItem("mathhub_admin_photo");
  const img=document.getElementById("profilePhoto");
  const ph=document.getElementById("profilePlaceholder");
  if(!img||!ph)return;
  if(photo){img.src=photo;img.style.display="block";ph.style.display="none"}
  else{img.style.display="none";ph.style.display="grid"}
}

function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function escAttr(s){return esc(s)}

renderHome();

if (supabaseClient) {
  supabaseClient.auth.getSession().then(({data})=>{ currentSession=data.session || null; });
  supabaseClient.auth.onAuthStateChange((_event,session)=>{ currentSession=session || null; });
}

// Load shared online data. Local UI remains available if Supabase is temporarily unavailable.
loadFromSupabase().then(ok => {
  if (ok) {
    renderHome();
    if (!document.getElementById("semesterPage").classList.contains("hidden")) {
      renderCourses();
    }
  }
});
