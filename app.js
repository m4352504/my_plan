const SUPABASE_URL="https://odusqcievoipwrtnsftz.supabase.co";
const KEY="sb_publishable_03VYlZENfp-OxRuyZvDe9g_tKS5ztDx";
const db=supabase.createClient(SUPABASE_URL,KEY);

const $=s=>document.querySelector(s);

const esc=s=>String(s||"").replace(/[&<>"']/g,x=>({
  "&":"&amp;",
  "<":"&lt;",
  ">":"&gt;",
  '"':"&quot;",
  "'":"&#39;"
}[x]));

const cols=[
  ["inbox","Входящие","#94a3b8"],
  ["progress","В работе","#0ea5e9"],
  ["waiting","На контроле","#f59e0b"],
  ["done","Сделано","#10b981"]
];

let tasks=[];
let comments=[];
let current=null;

const fmt=x=>new Date(x).toLocaleString("ru-RU",{
  day:"2-digit",
  month:"short",
  hour:"2-digit",
  minute:"2-digit"
});

async function showApp(){
  $("#auth-view").hidden=true;
  $("#app-view").hidden=false;
  $("#logout").hidden=true;
  await load()
}

async function boot(){
  return showApp()
}

async function load(){
  let a=await db.from("tasks").select("*").order("updated_at",{ascending:false});
  let b=await db.from("task_comments").select("*").order("created_at",{ascending:false});

  if(a.error||b.error){
    $("#load-error").hidden=false;
    $("#load-error").textContent="Не удалось загрузить задачи.";
    return
  }

  tasks=a.data||[];
  comments=b.data||[];
  render()
}

function render(){
  let q=$("#search").value.toLowerCase();
  let cat=$("#category-filter").value;
  let st=$("#status-filter").value;

  let shown=tasks.filter(t=>
    (!cat||t.category===cat)&&
    (!st||t.status===st)&&
    ((t.title+" "+t.description+" "+(t.tags||[]).join(" ")).toLowerCase().includes(q))
  );

  $("#board").innerHTML=cols.map(c=>{
    let list=shown.filter(t=>t.status===c[0]);

    return `
      <section class="column">
        <div class="column-head">
          <span>
            <i style="background:${c[2]}"></i>
            ${c[1]}
            <em class="count">${list.length}</em>
          </span>
          <button class="add-small" data-new="${c[0]}">＋</button>
        </div>
        <div class="cards">
          ${list.map(card).join("")}
          ${!list.length?
            `<button class="card" data-new="${c[0]}" style="color:#8994a6;text-align:center;border-style:dashed">Добавить задачу</button>`
            :""
          }
        </div>
      </section>
    `
  }).join("");

  document.querySelectorAll("[data-task]").forEach(x=>{
    x.onclick=()=>openTask(x.dataset.task)
  });

  document.querySelectorAll("[data-new]").forEach(x=>{
    x.onclick=()=>openTask(null,x.dataset.new)
  })
}

function card(t){
  let n=comments.filter(c=>c.task_id===t.id).length;

  let due=t.due_date
    ?new Date(t.due_date+"T00:00:00").toLocaleDateString("ru-RU",{day:"2-digit",month:"short"})
    :"";

  let late=t.due_date&&new Date(t.due_date+"T00:00:00")<new Date(new Date().toDateString());

  return `
    <button class="card" data-task="${t.id}">
      <div class="card-title">
        ${esc(t.title)}
        <i class="dot ${t.category}"></i>
      </div>
      <div class="tags">
        ${(t.tags||[]).slice(0,3).map(x=>`<span class="tag">#${esc(x)}</span>`).join("")}
      </div>
      <div class="card-bottom">
        <span class="${late?"late":""}">${due?"◷ "+due:""}</span>
        <span>${n?"▢ "+n:""}</span>
      </div>
    </button>
  `
}

function openTask(id,status){
  current=id?tasks.find(x=>x.id===id):null;

  $("#dialog-title").textContent=current?"Карточка задачи":"Новая задача";
  $("#task-title").value=current?.title||"";
  $("#task-description").value=current?.description||"";
  $("#task-status").value=current?.status||status||"inbox";
  $("#task-category").value=current?.category||"work";
  $("#task-due").value=current?.due_date||"";
  $("#task-tags").value=(current?.tags||[]).join(", ");

  $("#activity").hidden=!current;
  $("#delete-task").hidden=!current;

  $("#comments").innerHTML=current?
    (
      comments
        .filter(x=>x.task_id===current.id)
        .map(x=>`<div class="comment">${esc(x.body)}<time>${fmt(x.created_at)}</time></div>`)
        .join("")
      ||"<p class='muted'>Пока нет комментариев.</p>"
    )
    :"";

  $("#task-dialog").showModal()
}

$("#task-form").onsubmit=async e=>{
  e.preventDefault();

  let x={
    title:$("#task-title").value.trim(),
    description:$("#task-description").value.trim(),
    status:$("#task-status").value,
    category:$("#task-category").value,
    due_date:$("#task-due").value||null,
    tags:$("#task-tags").value
      .split(",")
      .map(x=>x.trim().replace(/^#/,""))
      .filter(Boolean),
    updated_at:new Date().toISOString()
  };

  if(!x.title)return;

  let r=current
    ?db.from("tasks").update(x).eq("id",current.id)
    :db.from("tasks").insert(x);

  if((await r).error){
    alert("Не удалось сохранить задачу.");
    return
  }

  $("#task-dialog").close();
  load()
};

$("#add-comment").onclick=async()=>{
  let body=$("#comment-input").value.trim();

  if(!body||!current)return;

  let result=await db.from("task_comments").insert({
    task_id:current.id,
    body
  });

  if(result.error){
    alert("Не удалось добавить комментарий.");
    return
  }

  await db
    .from("tasks")
    .update({updated_at:new Date().toISOString()})
    .eq("id",current.id);

  $("#comment-input").value="";
  await load();
  openTask(current.id)
};

$("#delete-task").onclick=async()=>{
  if(!current)return;

  if(confirm("Удалить задачу вместе с комментариями?")){
    await db.from("tasks").delete().eq("id",current.id);
    $("#task-dialog").close();
    load()
  }
};

$("#new-task").onclick=()=>openTask();

$("#search").oninput=render;
$("#category-filter").onchange=render;
$("#status-filter").onchange=render;

$("#export").onclick=()=>{
  let rows=tasks
    .filter(t=>t.status==="done")
    .map(t=>[
      t.title,
      {work:"Работа",personal:"Личное",home:"Дом"}[t.category],
      t.due_date||"",
      comments
        .filter(c=>c.task_id===t.id)
        .map(c=>fmt(c.created_at)+" — "+c.body)
        .join(" | ")
    ]);

  let csv=["Задача;Категория;Дедлайн;Комментарии"]
    .concat(
      rows.map(r=>
        r.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(";")
      )
    )
    .join("\n");

  let a=document.createElement("a");
  a.href=URL.createObjectURL(
    new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"})
  );
  a.download="выполненные-задачи.csv";
  a.click()
};

boot();
