import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth, RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, collection, query, where, onSnapshot,
  addDoc, serverTimestamp, orderBy, limit
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

/*
  1) Firebase Console -> Project settings -> Your apps -> Web app.
  2) Copy firebaseConfig from Firebase and replace the placeholders below.
  3) Enable Authentication > Sign-in method > Phone.
  4) Create Firestore Database and publish firestore.rules from this ZIP.
*/
const firebaseConfig = {
  apiKey: "PASTE_API_KEY_HERE",
  authDomain: "PASTE_PROJECT_ID_HERE.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID_HERE",
  storageBucket: "PASTE_PROJECT_ID_HERE.firebasestorage.app",
  messagingSenderId: "PASTE_MESSAGING_SENDER_ID_HERE",
  appId: "PASTE_APP_ID_HERE"
};

const configured = !Object.values(firebaseConfig).some(v => String(v).includes("PASTE_"));
const $ = id => document.getElementById(id);
const translations = {
  uz: {
    welcome:"Yusun App’ga xush kelibsiz", intro:"Telefon raqamingiz bilan kiring va boshqa foydalanuvchilar bilan yozishing.",
    phone:"Telefon raqami (+998...)", sendCode:"SMS kod yuborish", phoneHint:"Raqam xalqaro formatda yozilsin. Firebase SMS tasdiqlashi sozlangan bo‘lishi kerak.",
    smsCode:"SMS kodi", verify:"Tasdiqlash va kirish", changePhone:"Raqamni o‘zgartirish", profile:"Profil",
    profileHint:"Boshqa foydalanuvchilar sizni shu nom bilan ko‘radi.", displayName:"Ismingiz", save:"Saqlash",
    logout:"Chiqish", people:"Foydalanuvchilar", search:"Ism bo‘yicha qidirish", searchPlaceholder:"Ism yozing...",
    loading:"Yuklanmoqda...", back:"← Orqaga", messagePlaceholder:"Xabar yozing...", textOnly:"Hozircha faqat matnli xabarlar ishlaydi.",
    notOfficial:"Rasmiy ommaviy xizmat hali ishga tushmagan", noUsers:"Hozircha boshqa foydalanuvchilar yo‘q.",
    open:"Yozish", saved:"Profil saqlandi.", sent:"SMS kodi yuborildi.", signedOut:"Hisobdan chiqildi.",
    needName:"Ismingizni kiriting.", noMessages:"Birinchi xabarni yuboring.", sendError:"Xabar yuborilmadi. Internet yoki xavfsizlik qoidalarini tekshiring.",
    config:"Firebase sozlanmagan. app.js ichidagi firebaseConfig maydonlarini to‘ldiring; keyin Firebase’da Phone Auth va Firestore’ni yoqing.",
    invalidPhone:"Telefon raqamini xalqaro formatda kiriting, masalan +998901234567.",
    codeSent:"SMS kodi yuborildi. Kodni kiriting.", authError:"Kirish amalga oshmadi. Raqam, SMS limiti va Firebase sozlamalarini tekshiring.",
    profileError:"Profil saqlanmadi. Firestore sozlamalarini tekshiring.", loadingError:"Foydalanuvchilarni yuklab bo‘lmadi.",
    chatWith:"Suhbat", unknown:"Foydalanuvchi", enterMessage:"Avval xabar yozing."
  },
  ru: {
    welcome:"Добро пожаловать в Yusun App", intro:"Войдите по номеру телефона и общайтесь с другими пользователями.",
    phone:"Номер телефона (+998...)", sendCode:"Отправить SMS-код", phoneHint:"Введите номер в международном формате. SMS-подтверждение Firebase должно быть настроено.",
    smsCode:"Код из SMS", verify:"Подтвердить и войти", changePhone:"Изменить номер", profile:"Профиль",
    profileHint:"Другие пользователи увидят это имя.", displayName:"Ваше имя", save:"Сохранить",
    logout:"Выйти", people:"Пользователи", search:"Поиск по имени", searchPlaceholder:"Введите имя...",
    loading:"Загрузка...", back:"← Назад", messagePlaceholder:"Напишите сообщение...", textOnly:"Пока доступны только текстовые сообщения.",
    notOfficial:"Официальный публичный сервис ещё не запущен", noUsers:"Пока нет других пользователей.",
    open:"Написать", saved:"Профиль сохранён.", sent:"SMS-код отправлен.", signedOut:"Вы вышли из аккаунта.",
    needName:"Введите имя.", noMessages:"Отправьте первое сообщение.", sendError:"Сообщение не отправлено. Проверьте интернет и правила безопасности.",
    config:"Firebase не настроен. Заполните firebaseConfig в app.js, затем включите Phone Auth и Firestore в Firebase.",
    invalidPhone:"Введите номер в международном формате, например +998901234567.",
    codeSent:"SMS-код отправлен. Введите код.", authError:"Не удалось войти. Проверьте номер, лимит SMS и настройки Firebase.",
    profileError:"Не удалось сохранить профиль. Проверьте Firestore.", loadingError:"Не удалось загрузить пользователей.",
    chatWith:"Чат", unknown:"Пользователь", enterMessage:"Сначала напишите сообщение."
  }
};
let lang = localStorage.getItem("yusun_lang") || "uz";
let auth, db, confirmation, recaptcha;
let currentUser = null, currentProfile = null, selectedUser = null;
let unsubscribeUsers = null, unsubscribeMessages = null, userCache = [];

function t(key) { return (translations[lang] || translations.uz)[key] || key; }
function showNotice(message, type="") {
  const n=$("notice"); n.textContent=message; n.className="notice"+(type ? " "+type : ""); n.classList.remove("hidden");
}
function clearNotice(){ $("notice").classList.add("hidden"); }
function setView(id) {
  ["authView","profileView","homeView","chatView"].forEach(v=>$(v).classList.toggle("hidden",v!==id));
  clearNotice();
}
function applyLanguage() {
  document.documentElement.lang=lang; $("language").value=lang;
  document.querySelectorAll("[data-i18n]").forEach(el=>{const key=el.dataset.i18n;el.textContent=t(key);});
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el=>{el.placeholder=t(el.dataset.i18nPlaceholder);});
}
$("language").value=lang;
$("language").addEventListener("change",()=>{lang=$("language").value;localStorage.setItem("yusun_lang",lang);applyLanguage();renderUsers();});
applyLanguage();

if (!configured) {
  $("setupWarning").textContent=t("config"); $("setupWarning").classList.remove("hidden");
} else {
  try {
    const app=initializeApp(firebaseConfig); auth=getAuth(app); db=getFirestore(app);
    onAuthStateChanged(auth, async user=>{
      currentUser=user; stopListeners();
      if (!user) { currentProfile=null; setView("authView"); return; }
      try {
        const ref=doc(db,"users",user.uid), snap=await getDoc(ref);
        if (snap.exists()) {
          currentProfile=snap.data();
          if (!currentProfile.displayName) { $("displayName").value=""; setView("profileView"); }
          else { setView("homeView"); startUsersListener(); }
        } else { $("displayName").value=""; setView("profileView"); }
      } catch(e) { setView("profileView"); showNotice(t("profileError"),"error"); }
    });
  } catch(e) {
    $("setupWarning").textContent=t("config"); $("setupWarning").classList.remove("hidden");
  }
}

$("sendCode").addEventListener("click", async()=>{
  clearNotice();
  const phone=$("phone").value.trim();
  if(!/^\+[1-9]\d{7,14}$/.test(phone)){showNotice(t("invalidPhone"),"error");return;}
  if(!auth){showNotice(t("config"),"error");return;}
  try {
    $("sendCode").disabled=true;
    if(!recaptcha) recaptcha=new RecaptchaVerifier(auth,"recaptcha-container",{size:"normal"});
    await recaptcha.render();
    confirmation=await signInWithPhoneNumber(auth,phone,recaptcha);
    $("phoneStep").classList.add("hidden"); $("codeStep").classList.remove("hidden");
    showNotice(t("codeSent"),"success");
  } catch(e) {
    showNotice(t("authError")+" ("+(e.code||"error")+")","error");
    try { if(recaptcha) await recaptcha.clear(); } catch(_) {}
    recaptcha=null;
  } finally { $("sendCode").disabled=false; }
});
$("verifyCode").addEventListener("click",async()=>{
  const code=$("smsCode").value.trim();
  if(!confirmation||!code){showNotice(t("authError"),"error");return;}
  try { $("verifyCode").disabled=true; await confirmation.confirm(code); }
  catch(e){showNotice(t("authError")+" ("+(e.code||"error")+")","error");}
  finally{$("verifyCode").disabled=false;}
});
$("backPhone").addEventListener("click",()=>{
  $("phoneStep").classList.remove("hidden"); $("codeStep").classList.add("hidden");
  try{if(recaptcha)recaptcha.clear();}catch(_){} recaptcha=null; confirmation=null; clearNotice();
});

$("saveProfile").addEventListener("click",async()=>{
  if(!currentUser||!db)return;
  const displayName=$("displayName").value.trim();
  if(!displayName){showNotice(t("needName"),"error");return;}
  try{
    await setDoc(doc(db,"users",currentUser.uid),{
      uid:currentUser.uid,displayName:displayName.slice(0,40),
      updatedAt:serverTimestamp(),createdAt:currentProfile?.createdAt||serverTimestamp()
    },{merge:true});
    currentProfile={...(currentProfile||{}),uid:currentUser.uid,displayName};
    setView("homeView"); startUsersListener(); showNotice(t("saved"),"success");
  }catch(e){showNotice(t("profileError")+" ("+(e.code||"error")+")","error");}
});
$("editProfile").addEventListener("click",()=>{$("displayName").value=currentProfile?.displayName||"";setView("profileView");});
$("logoutProfile").addEventListener("click",logout);
$("logoutHome").addEventListener("click",logout);
async function logout(){try{await signOut(auth);showNotice(t("signedOut"));}catch(e){showNotice(t("authError"),"error");}}
function stopListeners(){
  if(unsubscribeUsers){unsubscribeUsers();unsubscribeUsers=null;}
  if(unsubscribeMessages){unsubscribeMessages();unsubscribeMessages=null;}
}
function startUsersListener(){
  if(!db||!currentUser)return;
  if(unsubscribeUsers)unsubscribeUsers();
  unsubscribeUsers=onSnapshot(collection(db,"users"),snap=>{
    userCache=snap.docs.map(d=>d.data()).filter(u=>u.uid!==currentUser.uid);
    renderUsers();
  },()=>showNotice(t("loadingError"),"error"));
}
$("searchUsers").addEventListener("input",renderUsers);
function renderUsers(){
  const list=$("usersList"); if(!list)return;
  if(!currentUser){list.innerHTML="";return;}
  const q=($("searchUsers").value||"").trim().toLocaleLowerCase(lang==="ru"?"ru":"uz");
  const users=userCache.filter(u=>(u.displayName||"").toLocaleLowerCase().includes(q));
  if(!users.length){list.innerHTML=`<p>${esc(t("noUsers"))}</p>`;return;}
  list.innerHTML=users.map(u=>`<div class="userrow"><div class="avatar">${esc((u.displayName||"?").slice(0,1).toUpperCase())}</div><div class="usertext"><strong>${esc(u.displayName||t("unknown"))}</strong><span>@${esc((u.uid||"").slice(0,8))}</span></div><button class="openchat" data-uid="${esc(u.uid)}">${esc(t("open"))}</button></div>`).join("");
  list.querySelectorAll("[data-uid]").forEach(btn=>btn.addEventListener("click",()=>openChat(userCache.find(u=>u.uid===btn.dataset.uid))));
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function chatId(a,b){return [a,b].sort().join("_");}
async function openChat(user){
  if(!user||!currentUser)return;
  selectedUser=user; $("chatTitle").textContent=user.displayName||t("unknown");
  $("chatSub").textContent=t("chatWith"); $("chatAvatar").textContent=(user.displayName||"?").slice(0,1).toUpperCase();
  setView("chatView");
  if(unsubscribeMessages)unsubscribeMessages();
  $("messages").innerHTML="";
  const id=chatId(currentUser.uid,user.uid);
  try{
    await setDoc(doc(db,"chats",id),{participants:[currentUser.uid,user.uid].sort(),updatedAt:serverTimestamp()},{merge:true});
    const q=query(collection(db,"chats",id,"messages"),orderBy("createdAt","asc"),limit(150));
    unsubscribeMessages=onSnapshot(q,snap=>{
      const box=$("messages"); box.innerHTML="";
      if(snap.empty){box.innerHTML=`<div class="small" style="text-align:center;margin:auto">${esc(t("noMessages"))}</div>`;return;}
      snap.docs.forEach(d=>{
        const m=d.data(), bubble=document.createElement("div");
        bubble.className="bubble"+(m.senderId===currentUser.uid?" mine":"");
        const body=document.createElement("div"); body.textContent=m.text||"";
        const time=document.createElement("span");time.className="time";
        time.textContent=m.createdAt?.toDate?m.createdAt.toDate().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"";
        bubble.append(body,time);box.appendChild(bubble);
      });
      box.scrollTop=box.scrollHeight;
    },()=>showNotice(t("sendError"),"error"));
  }catch(e){showNotice(t("sendError")+" ("+(e.code||"error")+")","error");}
}
$("backHome").addEventListener("click",()=>{if(unsubscribeMessages){unsubscribeMessages();unsubscribeMessages=null;}setView("homeView");});
$("sendForm").addEventListener("submit",async e=>{
  e.preventDefault();const text=$("messageInput").value.trim();
  if(!text){showNotice(t("enterMessage"));return;}
  if(!currentUser||!selectedUser)return;
  const id=chatId(currentUser.uid,selectedUser.uid);
  try{
    await addDoc(collection(db,"chats",id,"messages"),{text:text.slice(0,2000),senderId:currentUser.uid,createdAt:serverTimestamp()});
    await setDoc(doc(db,"chats",id),{participants:[currentUser.uid,selectedUser.uid],updatedAt:serverTimestamp()},{merge:true});
    $("messageInput").value="";clearNotice();
  }catch(e){showNotice(t("sendError")+" ("+(e.code||"error")+")","error");}
});

if("serviceWorker" in navigator && location.protocol.startsWith("http")){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
