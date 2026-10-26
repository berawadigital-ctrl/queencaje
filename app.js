(function(){
"use strict";
var KEY="queencaje:v1";
function load(){try{var d=JSON.parse(localStorage.getItem(KEY));if(d&&d.plans)return d;}catch(e){}return {plans:{}};}
function save(){try{localStorage.setItem(KEY,JSON.stringify(db));}catch(e){}}
var db=load();
var fmt=new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:2});
function eur(n){return fmt.format(Math.round((n||0)*100)/100);}
function num(v){v=String(v||"").replace(/[\s€]/g,"");if(v.indexOf(",")>-1)v=v.replace(/\./g,"").replace(",",".");else if(/^\d{1,3}(\.\d{3})+$/.test(v))v=v.replace(/\./g,"");var n=parseFloat(v);return isFinite(n)&&n>0?Math.round(n*100)/100:0;}
function $(s,r){return (r||document).querySelector(s);}
function el(t,a,txt){var e=document.createElement(t);if(a)for(var k in a)e.setAttribute(k,a[k]);if(txt!=null)e.textContent=txt;return e;}
function totals(p){var paid=0,plan=0;(p.items||[]).forEach(function(i){if(i.st==="pagado")paid+=i.a;else plan+=i.a;});return {paid:paid,plan:plan,left:(p.limit||0)-paid-plan};}
function csvCell(v){v=String(v==null?"":v);return /[";\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}
function exportCSV(plans,fname){
  var rows=[["Plan","Año","Límite (€)","Concepto","Categoría","Estado","Importe (€)"]];
  plans.forEach(function(p){
    if(!p.items.length)rows.push([p.name,p.year,p.limit,"","","",""]);
    p.items.forEach(function(i){rows.push([p.name,p.year,p.limit,i.n,i.c||"",i.st,String(i.a).replace(".",",")]);});
  });
  var csv="\ufeff"+rows.map(function(r){return r.map(csvCell).join(";");}).join("\r\n");
  var a=el("a",{href:URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"})),download:fname});
  document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);
}
function allPlans(){return Object.keys(db.plans).map(function(k){return db.plans[k];}).sort(function(a,b){return b.year-a.year||a.name.localeCompare(b.name);});}

var calc=$("#calc");
if(calc){
  var type=calc.dataset.type,pname=calc.dataset.name,cats=JSON.parse(calc.dataset.cats||"[]");
  var yearSel=$("#qe-year"),now=new Date().getFullYear();
  for(var y=now+1;y>=now-3;y--){var o=el("option",{value:y},String(y));if(y===now)o.selected=true;yearSel.appendChild(o);}
  var st="previsto";
  function id(){return type+"-"+yearSel.value;}
  function cur(create){var k=id();if(!db.plans[k]&&create)db.plans[k]={id:k,type:type,name:pname,year:+yearSel.value,limit:0,items:[]};return db.plans[k]||{type:type,name:pname,year:+yearSel.value,limit:0,items:[]};}
  var limitIn=$("#qe-limit"),list=$("#qe-items"),empty=$("#qe-empty");
  var nIn=$("#qe-name"),aIn=$("#qe-amount"),cSel=$("#qe-cat");
  cats.forEach(function(c){cSel.appendChild(el("option",{value:c},c));});
  cSel.appendChild(el("option",{value:"Otros"},"Otros"));
  var chips=$("#qe-chips");
  cats.forEach(function(c){var b=el("button",{type:"button","class":"chip"},"+ "+c);b.addEventListener("click",function(){cSel.value=c;if(!nIn.value)nIn.value=c;aIn.focus();});chips.appendChild(b);});
  document.querySelectorAll("[data-st]").forEach(function(b){b.addEventListener("click",function(){st=b.dataset.st;document.querySelectorAll("[data-st]").forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false");});});});
  function render(){
    var p=cur(false),t=totals(p);
    if(document.activeElement!==limitIn)limitIn.value=p.limit?String(p.limit).replace(".",","):"";
    list.textContent="";
    p.items.forEach(function(i,ix){
      var li=el("li",{"class":"item"});
      var info=el("div",{"class":"it-info"});info.appendChild(el("span",{"class":"it-n"},i.n));if(i.c&&i.c!==i.n)info.appendChild(el("span",{"class":"it-c"},i.c));
      var tg=el("button",{type:"button","class":"badge "+(i.st==="pagado"?"b-paid":"b-plan"),"aria-label":"Cambiar estado de "+i.n+" (ahora "+i.st+")"},i.st==="pagado"?"Pagado":"Previsto");
      tg.addEventListener("click",function(){var q=cur(true);q.items[ix].st=q.items[ix].st==="pagado"?"previsto":"pagado";save();render();});
      var am=el("span",{"class":"it-a"},eur(i.a));
      var del=el("button",{type:"button","class":"x","aria-label":"Quitar "+i.n},"×");
      del.addEventListener("click",function(){var q=cur(true);q.items.splice(ix,1);save();render();});
      li.appendChild(info);li.appendChild(tg);li.appendChild(am);li.appendChild(del);list.appendChild(li);
    });
    empty.hidden=p.items.length>0;
    $("#t-limit").textContent=eur(p.limit);$("#t-paid").textContent=eur(t.paid);$("#t-plan").textContent=eur(t.plan);
    var l=$("#t-left");l.textContent=eur(t.left);l.className=t.left<0?"neg":"";
    check();history();
  }
  function check(){
    var p=cur(false),t=totals(p),c=num($("#qe-new-a").value),box=$("#qe-verdict");
    if(!p.limit){box.className="verdict";box.innerHTML="<strong>Pon tu límite</strong><span>y escribe cuánto cuesta lo que estás pensando.</span>";return;}
    if(!c){box.className="verdict";box.innerHTML="<strong>¿ENCAJA?</strong><span>Escribe cuánto cuesta la nueva compra. Ahora te quedan "+eur(t.left)+".</span>";return;}
    var r=t.left-c;
    if(r>=0){box.className="verdict ok";box.innerHTML="<strong>ENCAJA</strong><span>Después de esta compra te quedarían "+eur(r)+".</span>";}
    else{box.className="verdict ko";box.innerHTML="<strong>NO ENCAJA</strong><span>Te pasarías "+eur(-r)+" de tu límite.</span>";}
  }
  function history(){
    var h=$("#qe-hist");if(!h)return;h.textContent="";
    var ps=allPlans().filter(function(p){return p.type===type&&(p.limit||p.items.length);});
    if(!ps.length){h.appendChild(el("p",{"class":"muted"},"Cuando guardes planes de varios años, aquí verás cuánto pusiste de límite y cuánto pagaste de verdad cada vez."));return;}
    var tb=el("table");var hd=el("tr");["Año","Límite","Pagado","Pagado − límite"].forEach(function(x){hd.appendChild(el("th",{scope:"col"},x));});tb.appendChild(hd);
    ps.forEach(function(p){var t=totals(p),d=t.paid-p.limit,tr=el("tr");tr.appendChild(el("td",null,String(p.year)));tr.appendChild(el("td",null,eur(p.limit)));tr.appendChild(el("td",null,eur(t.paid)));tr.appendChild(el("td",{"class":d>0?"neg":""},(d>0?"+":"")+eur(d)));tb.appendChild(tr);});
    h.appendChild(tb);
  }
  limitIn.addEventListener("input",function(){var p=cur(true);p.limit=num(limitIn.value);save();render();});
  yearSel.addEventListener("change",render);
  $("#qe-add").addEventListener("submit",function(e){e.preventDefault();var a=num(aIn.value),n=nIn.value.trim()||cSel.value;if(!a){aIn.focus();return;}var p=cur(true);p.items.push({n:n,c:cSel.value,a:a,st:st});save();nIn.value="";aIn.value="";render();});
  $("#qe-new-a").addEventListener("input",check);
  $("#qe-new-add").addEventListener("click",function(){var a=num($("#qe-new-a").value);if(!a)return;var p=cur(true);p.items.push({n:$("#qe-new-n").value.trim()||"Nueva compra",c:"Otros",a:a,st:"previsto"});save();$("#qe-new-a").value="";$("#qe-new-n").value="";render();});
  $("#qe-csv").addEventListener("click",function(){exportCSV([cur(false)],"queencaje-"+type+"-"+yearSel.value+".csv");});
  $("#qe-reset").addEventListener("click",function(){if(confirm("¿Borrar el plan "+pname+" "+yearSel.value+" de este dispositivo?")){delete db.plans[id()];save();render();}});
  render();
}
var mine=$("#mis-planes");
if(mine){
  var ps=allPlans().filter(function(p){return p.limit||p.items.length;});
  var ul=$("#mp-list");
  if(ps.length){$("#mp-empty").hidden=true;$("#mp-csv").hidden=false;
    ps.forEach(function(p){var t=totals(p),li=el("li"),a=el("a",{href:mine.dataset.base+(p.type==="libre"?"":"presupuesto-"+p.type+"/")},p.name+" "+p.year);li.appendChild(a);li.appendChild(el("span",{"class":t.left<0?"neg":""},t.left<0?" · te has pasado "+eur(-t.left):" · te quedan "+eur(t.left)));ul.appendChild(li);});
    $("#mp-csv").addEventListener("click",function(){exportCSV(ps,"queencaje-todos-mis-planes.csv");});
  }
}
})();
