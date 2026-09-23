const SEMESTERS=[1,2,3,4];
let db=JSON.parse(localStorage.getItem("mathhub_iitk_db")||"null");
if(!db){db={};SEMESTERS.forEach(s=>db[s]={years:{}});["2026","2025","2024"].forEach(y=>{db[1].years[y]={PYQ:[],Notes:[]}});save();}
let currentSemester=1,currentYear="",currentType="PYQ";
function save(){localStorage.setItem("mathhub_iitk_db",JSON.stringify(db))}
function goHome(){hideAll();document.getElementById("homePage").classList.remove("hidden");renderHome()}
function hideAll(){["homePage","semesterPage","yearPage","adminPage"].forEach(id=>document.getElementById(id).classList.add("hidden"))}
function renderHome(){document.getElementById("semesterGrid").innerHTML=SEMESTERS.map(s=>`<div class="semester" onclick="openSemester(${s})"><div class="sem-number">${s}</div><h3>${s}${s===1?"st":s===2?"nd":s===3?"rd":"th"} Semester</h3><p>${Object.keys(db[s].years).length} academic years</p></div>`).join("")}
function openSemester(s){currentSemester=s;hideAll();document.getElementById("semesterPage").classList.remove("hidden");document.getElementById("semesterTitle").textContent=`Semester ${s}`;const years=Object.keys(db[s].years).sort((a,b)=>b-a);document.getElementById("yearGrid").innerHTML=years.length?years.map(y=>`<div class="year" onclick="openYear('${y}')"><div class="year-icon">📁</div><h3>${y}</h3><p>PYQs & Notes →</p></div>`).join(""):'<p>No years added yet. Use Admin to add one.</p>'}
function openYear(y){currentYear=y;hideAll();document.getElementById("yearPage").classList.remove("hidden");document.getElementById("breadcrumb").textContent=`SEMESTER ${currentSemester}  •  ${y}`;document.getElementById("yearTitle").textContent=`Semester ${currentSemester} — ${y}`;renderItems()}
function renderItems(){["PYQ","Notes"].forEach(type=>{const el=document.getElementById(type==="PYQ"?"pyqList":"notesList"),items=db[currentSemester].years[currentYear][type]||[];el.innerHTML=items.length?items.map((x,i)=>`<div class="item"><div class="item-info"><b>${esc(x.title)}</b><small>${x.url?"PDF / Resource":"No file link"}</small></div>${x.url?`<a class="open" target="_blank" href="${escAttr(x.url)}">Open</a>`:""}<button class="back" onclick="deleteItem('${type}',${i})">×</button></div>`).join(""):'<p style="color:#8a93a2;font-size:14px">Nothing added yet.</p>'})}
function openAdd(type){currentType=type;document.getElementById("modalType").textContent=type;document.getElementById("modalTitle").textContent=`Add ${type}`;document.getElementById("itemTitle").value="";document.getElementById("itemUrl").value="";document.getElementById("modal").classList.remove("hidden")}
function closeModal(){document.getElementById("modal").classList.add("hidden")}
function saveItem(){const title=document.getElementById("itemTitle").value.trim(),url=document.getElementById("itemUrl").value.trim();if(!title){alert("Please enter a title.");return}db[currentSemester].years[currentYear][currentType].push({title,url});save();closeModal();renderItems()}
function deleteItem(type,i){if(confirm("Delete this resource?")){db[currentSemester].years[currentYear][type].splice(i,1);save();renderItems()}}
function openAdmin(){hideAll();document.getElementById("adminPage").classList.remove("hidden");showAdminPhoto();document.getElementById("adminSemester").innerHTML=SEMESTERS.map(s=>`<option value="${s}">Semester ${s}</option>`).join("");renderAdmin()}
function addYear(){const s=Number(document.getElementById("adminSemester").value),y=document.getElementById("adminYear").value.trim();if(!/^\d{4}$/.test(y)){alert("Enter a valid year, e.g. 2026.");return}if(db[s].years[y]){alert("This year already exists.");return}db[s].years[y]={PYQ:[],Notes:[]};save();document.getElementById("adminYear").value="";renderAdmin();alert(`Year ${y} added to Semester ${s}.`)}
function renderAdmin(){document.getElementById("adminStructure").innerHTML=SEMESTERS.map(s=>{const ys=Object.keys(db[s].years).sort((a,b)=>b-a);return `<div class="structure-row"><b>Semester ${s}</b><span>${ys.length?ys.join(" • "):"No years added"}</span></div>`}).join("")}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function escAttr(s){return esc(s)}

function changePhoto(e){
 const file=e.target.files[0];
 if(!file)return;
 const reader=new FileReader();
 reader.onload=function(){
   localStorage.setItem("mathhub_admin_photo",reader.result);
   showAdminPhoto();
 };
 reader.readAsDataURL(file);
}
function showAdminPhoto(){
 const src=localStorage.getItem("mathhub_admin_photo");
 const img=document.getElementById("adminPhoto"), ph=document.getElementById("photoPlaceholder");
 if(!img||!ph)return;
 if(src){img.src=src;img.style.display="block";ph.style.display="none"}
 else{img.style.display="none";ph.style.display="grid"}
}

renderHome();
showAdminPhoto();

function loadProfile(){
 const p=localStorage.getItem("mathhub_profile_photo");
 if(p){document.getElementById("profilePreview").style.backgroundImage=`url(${p})`;document.getElementById("profilePreview").textContent="";}
}
function previewPhoto(e){
 const file=e.target.files[0]; if(!file)return;
 const reader=new FileReader();
 reader.onload=()=>{document.getElementById("profilePreview").style.backgroundImage=`url(${reader.result})`;document.getElementById("profilePreview").textContent="";window._profilePhoto=reader.result};
 reader.readAsDataURL(file);
}
function saveProfile(){
 if(window._profilePhoto)localStorage.setItem("mathhub_profile_photo",window._profilePhoto);
 alert("Profile saved.");
}
loadProfile();

function loadAdminProfile(){
  const email = localStorage.getItem("mathhub_admin_email") || "";
  const emailEl = document.getElementById("adminEmail");
  if(emailEl) emailEl.value = email;
  const photo = localStorage.getItem("mathhub_admin_photo");
  if(photo){
    const img = document.getElementById("profilePhoto");
    const ph = document.getElementById("profilePlaceholder");
    if(img){ img.src = photo; img.style.display = "block"; }
    if(ph) ph.style.display = "none";
  }
}
function previewProfilePhoto(event){
  const file = event.target.files && event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(){
    const img = document.getElementById("profilePhoto");
    const ph = document.getElementById("profilePlaceholder");
    img.src = reader.result;
    img.style.display = "block";
    ph.style.display = "none";
    window._pendingAdminPhoto = reader.result;
  };
  reader.readAsDataURL(file);
}
function saveAdminProfile(){
  const email = document.getElementById("adminEmail").value.trim();
  if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    alert("Please enter a valid email address.");
    return;
  }
  localStorage.setItem("mathhub_admin_email", email);
  if(window._pendingAdminPhoto){
    localStorage.setItem("mathhub_admin_photo", window._pendingAdminPhoto);
  }
  alert("Admin profile saved.");
}
loadAdminProfile();
