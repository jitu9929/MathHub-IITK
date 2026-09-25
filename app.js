// ================= SUPABASE CONNECTION =================
// Paste your Supabase Project URL and Publishable key below.
// Do NOT paste the sb_secret_... key here.
const SUPABASE_URL = "https://lwakgikyaqybovfivrbq.supabase.co

";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable__RqSu4NpgxLpmVAc1KxYCQ_LFxpuclq";

const supabaseConfigured =
  SUPABASE_URL.startsWith("https://") &&
  SUPABASE_PUBLISHABLE_KEY.startsWith("sb_");

const supabaseClient = supabaseConfigured
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;

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
        <button class="back" onclick="deleteItem('${type}',${i})">×</button>
      </div>`).join("") : '<p style="color:#8a93a2;font-size:14px">Nothing added yet.</p>';
  });
}

function openAdd(type){
  currentType=type;
  document.getElementById("modalType").textContent=type;
  document.getElementById("modalTitle").textContent=`Add ${type}`;
  document.getElementById("itemTitle").value="";
  document.getElementById("itemUrl").value="";
  document.getElementById("modal").classList.remove("hidden");
}
function closeModal(){document.getElementById("modal").classList.add("hidden")}
async function saveItem(){
  const title=document.getElementById("itemTitle").value.trim();
  const url=document.getElementById("itemUrl").value.trim();
  if(!title){alert("Please enter a title.");return}
  if(supabaseClient && !(await requireAdmin())) return;
  if(supabaseClient){
    const courseId=await getCourseId(currentSemester,currentCourse);
    if(!courseId){alert("Course not found in Supabase.");return}
    const yearId=await getYearId(courseId,currentYear);
    if(!yearId){alert("Academic year not found in Supabase.");return}
    const {error}=await supabaseClient.from("resources").insert({academic_year_id:yearId,resource_type:currentType,title,file_url:url});
    if(error){alert("Could not save resource: "+error.message);return}
    await loadFromSupabase();
    closeModal(); renderItems(); return;
  }
  data[semesterKey()][currentCourse][currentYear][currentType].push({title,url});
  save(); closeModal(); renderItems();
}
async function deleteItem(type,i){
  if(!confirm("Delete this resource?")) return;
  if(supabaseClient){
    if(!(await requireAdmin())) return;
    const courseId=await getCourseId(currentSemester,currentCourse);
    const yearId=courseId ? await getYearId(courseId,currentYear) : null;
    const node=data[semesterKey()][currentCourse][currentYear]||{};
    const item=node[type] && node[type][i];
    if(!item || !yearId){alert("Resource not found.");return}
    const {data:rows,error:qErr}=await supabaseClient.from("resources").select("id").eq("academic_year_id",yearId).eq("resource_type",type).eq("title",item.title).eq("file_url",item.url||"");
    if(qErr){alert(qErr.message);return}
    if(!rows || !rows.length){alert("Resource not found in database.");return}
    const {error}=await supabaseClient.from("resources").delete().eq("id",rows[0].id);
    if(error){alert("Could not delete: "+error.message);return}
    await loadFromSupabase(); renderItems(); return;
  }
  data[semesterKey()][currentCourse][currentYear][type].splice(i,1);
  save(); renderItems();
}

async function getCourseId(semester,courseCode){
  const {data:rows,error}=await supabaseClient.from("Courses").select("id").eq("semester",semester).eq("course_code",courseCode).limit(1);
  if(error) throw error; return rows && rows[0] ? rows[0].id : null;
}
async function getYearId(courseId,year){
  const {data:rows,error}=await supabaseClient.from("academic_years").select("id").eq("course_id",courseId).eq("academic_year",Number(year)).limit(1);
  if(error) throw error; return rows && rows[0] ? rows[0].id : null;
}

// ---------- ADMIN ----------
let adminUser=null;
async function requireAdmin(){
  if(!supabaseClient) return true;
  const {data:{user}}=await supabaseClient.auth.getUser();
  if(user){adminUser=user; return true;}
  alert("Please sign in as Admin first.");
  showAdminLogin();
  return false;
}
function showAdminLogin(){
  const page=document.getElementById("adminPage");
  if(!page || document.getElementById("adminLoginBox")) return;
  const box=document.createElement("div"); box.className="admin-box"; box.id="adminLoginBox";
  box.innerHTML=`<h2>Admin Login</h2><div class="inline-form"><input id="adminEmail" type="email" placeholder="Admin email"><input id="adminPassword" type="password" placeholder="Password"><button class="primary" onclick="adminLogin()">Sign in</button></div><p id="adminLoginMsg" class="hint">Only the admin account can add or change website data.</p>`;
  page.querySelector(".container").insertBefore(box,page.querySelector(".admin-profile"));
}
async function adminLogin(){
  const email=document.getElementById("adminEmail").value.trim(); const password=document.getElementById("adminPassword").value;
  if(!email||!password){alert("Enter email and password.");return;}
  const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
  if(error){document.getElementById("adminLoginMsg").textContent=error.message;return;}
  adminUser=data.user; document.getElementById("adminLoginMsg").textContent="Signed in successfully.";
  document.getElementById("adminLoginBox").remove();
}

function openAdmin(){
  hideAll();
  document.getElementById("adminPage").classList.remove("hidden");
  fillSemesterSelects();
  renderAdmin();
  loadAdminProfile();
  if(supabaseClient) showAdminLogin();
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
  if(supabaseClient && !(await requireAdmin())) return;
  const s=Number(document.getElementById("adminCourseSemester").value);
  const c=document.getElementById("adminCourse").value.trim().toUpperCase();
  if(!c){alert("Enter a course code/name, e.g. MTH403.");return}
  const sk="Semester "+s;
  if(data[sk][c]){alert("This course already exists.");return}
  if(supabaseClient){
    const {error}=await supabaseClient.from("Courses").insert({semester:s,course_code:c,course_name:c});
    if(error){alert("Could not add course: "+error.message);return}
    await loadFromSupabase();
  }else{data[sk][c]={}; save();}
  document.getElementById("adminCourse").value=""; fillSemesterSelects(); renderAdmin(); renderHome();
  alert(`${c} added to Semester ${s}.`);
}

async function addYear(){
  if(supabaseClient && !(await requireAdmin())) return;
  const s=Number(document.getElementById("adminYearSemester").value);
  const c=document.getElementById("adminYearCourse").value;
  const y=document.getElementById("adminYear").value.trim();
  if(!c){alert("First add/select a course.");return}
  if(!/^\d{4}$/.test(y)){alert("Enter a valid year, e.g. 2026.");return}
  const sk="Semester "+s;
  if(data[sk][c] && data[sk][c][y]){alert("This academic year already exists.");return}
  if(supabaseClient){
    const courseId=await getCourseId(s,c);
    if(!courseId){alert("Course not found in Supabase.");return}
    const {error}=await supabaseClient.from("academic_years").insert({course_id:courseId,academic_year:Number(y)});
    if(error){alert("Could not add academic year: "+error.message);return}
    await loadFromSupabase();
  }else{if(!data[sk][c]) data[sk][c]={}; data[sk][c][y]={PYQ:[],Notes:[]}; save();}
  document.getElementById("adminYear").value=""; fillSemesterSelects(); renderAdmin();
  alert(`Year ${y} added under ${c} — Semester ${s}.`);
}

async function addAdminResource(){
  if(supabaseClient && !(await requireAdmin())) return;
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
    const courseId=await getCourseId(s,c);
    const yearId=courseId ? await getYearId(courseId,y) : null;
    if(!yearId){alert("Academic year not found in Supabase.");return}
    const {error}=await supabaseClient.from("resources").insert({academic_year_id:yearId,resource_type:type,title,file_url:url});
    if(error){alert("Could not add resource: "+error.message);return}
    await loadFromSupabase();
  }else{data["Semester "+s][c][y][type].push({title,url}); save();}
  document.getElementById("adminResourceTitle").value=""; document.getElementById("adminResourceUrl").value=""; renderAdmin();
  alert(`${type} added under ${c} — ${y}.`);
}

function renderAdmin(){
  document.getElementById("adminStructure").innerHTML=SEMESTERS.map(s=>{
    const sk="Semester "+s, courses=courseList(s);
    if(!courses.length) return `<div class="structure-row"><b>Semester ${s}</b><span>No courses added</span></div>`;
    return `<div class="structure-row"><b>Semester ${s}</b><span>${courses.map(c=>{
      const years=Object.keys(data[sk][c]||{}).sort((a,b)=>b.localeCompare(a));
      return `${esc(c)} (${years.length?years.join(", "):"no years"})`;
    }).join(" • ")}</span></div>`;
  }).join("");
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

// If Supabase credentials have been pasted, load the shared online data.
// Admin writes use Supabase Auth and require authenticated RLS policies.
loadFromSupabase().then(ok => {
  if (ok) {
    renderHome();
    if (!document.getElementById("semesterPage").classList.contains("hidden")) {
      renderCourses();
    }
  }
});
