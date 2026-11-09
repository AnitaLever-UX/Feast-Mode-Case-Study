/* FEAST MODE® case study — motion, navigation, charts, comparisons */
(function(){
  "use strict";
  var reduced=false;try{reduced=matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){}
  var $=function(s,c){return (c||document).querySelector(s)}, $$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))};

  /* ---------- chapter menu ---------- */
  var toggle=$(".bar__toggle"), panel=$("#chapters");
  function setOpen(o){panel.classList.toggle("is-open",o);toggle.setAttribute("aria-expanded",o);toggle.textContent=o?"Close":"Chapters"}
  toggle.addEventListener("click",function(){setOpen(!panel.classList.contains("is-open"))});
  $$("a",panel).forEach(function(a){a.addEventListener("click",function(){setOpen(false)})});
  document.addEventListener("keydown",function(e){if(e.key==="Escape"&&panel.classList.contains("is-open")){setOpen(false);toggle.focus()}});

  /* ---------- current chapter + progress ---------- */
  var chapters=$$(".chapter"), nowNum=$("#now-num"), nowName=$("#now-name"), prog=$(".bar__progress");
  function onScroll(){
    var y=scrollY+innerHeight*.35, cur=chapters[0];
    chapters.forEach(function(c){if(c.offsetTop<=y)cur=c});
    if(nowNum.textContent!=="N° "+cur.dataset.num){
      nowNum.textContent="N° "+cur.dataset.num; nowName.textContent=cur.dataset.name;
      $$("a",panel).forEach(function(a){a.setAttribute("aria-current",a.getAttribute("href")==="#"+cur.id?"true":"false")});
    }
    var h=document.documentElement.scrollHeight-innerHeight; prog.style.transform="scaleX("+(h>0?scrollY/h:0)+")";
  }
  addEventListener("scroll",onScroll,{passive:true}); onScroll();



  /* ---------- palette: every swatch's text box the same height ---------- */
  function eqSw(){var b=$$(".sw small");b.forEach(function(x){x.style.minHeight=""});var m=0;b.forEach(function(x){m=Math.max(m,x.offsetHeight)});b.forEach(function(x){x.style.minHeight=m+"px"});var c=$$(".sw");c.forEach(function(x){x.style.minHeight=""});var n=0;c.forEach(function(x){n=Math.max(n,x.offsetHeight)});c.forEach(function(x){x.style.minHeight=n+"px"})}
  eqSw(); addEventListener("resize",eqSw); if(document.fonts&&document.fonts.ready)document.fonts.ready.then(eqSw);

  /* ---------- scene player ---------- */
  $$("[data-player]").forEach(function(pl){
    var tabs=$$(".player__tab",pl), panels=$$(".player__panel",pl), timer=null;
    function show(stack,v){ // v in frame units, crossfade between neighbours
      var imgs=$$("img",stack), labels=(stack.dataset.labels||"").split("|"), i=Math.floor(v), f=v-i;
      imgs.forEach(function(im,k){ if(!k)return; im.style.opacity=k<=i?1:(k===i+1?f:0) });
      var lab=stack.parentNode.querySelector(".player__frame"); if(lab)lab.textContent=labels[Math.round(v)]||"";
    }
    function bind(panel){
      var stack=$(".player__stack",panel), r=$("[data-scrub]",panel);
      if(r) r.addEventListener("input",function(){stop();show(stack,r.value/100)});
    }
    function stop(){if(timer){cancelAnimationFrame(timer);timer=null}}
    function play(panel){
      stop(); var stack=$(".player__stack",panel), r=$("[data-scrub]",panel); if(!r)return;
      var max=+r.max, t0=null, dur=(max/100)*1100;
      if(reduced){r.value=0;show(stack,0);return}
      function step(t){ if(t0===null)t0=t; var p=Math.min(1,(t-t0)/dur); r.value=Math.round(p*max); show(stack,p*max/100); if(p<1)timer=requestAnimationFrame(step); else timer=null }
      r.value=0; show(stack,0); timer=requestAnimationFrame(step);
    }
    function select(i,focus){
      tabs.forEach(function(t,k){var on=k===i;t.setAttribute("aria-selected",on);t.tabIndex=on?0:-1;panels[k].hidden=!on});
      if(focus)tabs[i].focus(); play(panels[i]);
    }
    panels.forEach(bind);
    tabs.forEach(function(t,i){
      t.addEventListener("click",function(){select(i)});
      t.addEventListener("keydown",function(e){var n=tabs.length,j=null;
        if(e.key==="ArrowRight")j=(i+1)%n; else if(e.key==="ArrowLeft")j=(i-1+n)%n; else if(e.key==="Home")j=0; else if(e.key==="End")j=n-1;
        if(j!==null){e.preventDefault();select(j,true)}});
    });
    if("IntersectionObserver" in window){var io=new IntersectionObserver(function(es){if(es[0].isIntersecting){play(panels[tabs.findIndex(function(t){return t.getAttribute("aria-selected")==="true"})]);io.disconnect()}},{threshold:.45});io.observe(pl)}
  });

  /* ---------- charts (plain SVG) ---------- */
  var NS="http://www.w3.org/2000/svg";
  function el(n,a,p){var e=document.createElementNS(NS,n);for(var k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e}
  function tip(chart){var t=document.createElement("div");t.className="tip";t.setAttribute("aria-hidden","true");chart.appendChild(t);return t}
  function showTip(t,chart,evt,html){var r=chart.getBoundingClientRect();t.innerHTML=html;t.style.left=(evt.clientX-r.left)+"px";t.style.top=(evt.clientY-r.top-8)+"px";t.classList.add("on")}
  function table(host,head,rows){
    var h='<table class="tbl"><thead><tr>'+head.map(function(x,i){return '<th scope="col"'+(i?' class="num"':'')+'>'+x+'</th>'}).join("")+'</tr></thead><tbody>';
    rows.forEach(function(r){h+='<tr>'+r.map(function(x,i){return i?'<td class="num">'+x+'</td>':'<th scope="row" style="font:inherit;text-transform:none;letter-spacing:0;color:inherit">'+x+'</th>'}).join("")+'</tr>'});
    host.innerHTML=h+'</tbody></table>';
  }
  $$("[data-table-toggle]").forEach(function(b){b.addEventListener("click",function(){var c=b.closest(".chart");var on=c.classList.toggle("is-table");b.textContent=on?"Show as chart":"Show as table"})});

  // horizontal single-series bars
  function hbars(id,data,max,ticks,fmt,label,head){
    var chart=$("#"+id), plot=$(".chart__plot",chart), t=$(".tip",chart)||tip(chart); plot.innerHTML="";
    var W=Math.max(300,plot.clientWidth||900), sm=W<560, L=sm?96:150,R=sm?150:150,rowH=38,top=14,H=top+data.length*rowH+26;
    if(sm)ticks=ticks.filter(function(v,i){return i%2===0});
    var svg=el("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":label},plot);
    var x=function(v){return L+(W-L-R)*v/max};
    ticks.forEach(function(v){el("line",{x1:x(v),x2:x(v),y1:top-6,y2:H-24,class:"grid"},svg);var tx=el("text",{x:x(v),y:H-6,"text-anchor":"middle",class:"muted-t"},svg);tx.textContent=v});
    data.forEach(function(d,i){
      var y=top+i*rowH, bh=20, by=y+(rowH-bh)/2-4;
      var lb=el("text",{x:L-14,y:by+bh/2+4,"text-anchor":"end"},svg);lb.textContent=d[0];
      if(d[1]>0){var w=x(d[1])-L, r=Math.min(4,w);
        el("path",{d:"M"+L+" "+by+"H"+(L+w-r)+"Q"+(L+w)+" "+by+" "+(L+w)+" "+(by+r)+"V"+(by+bh-r)+"Q"+(L+w)+" "+(by+bh)+" "+(L+w-r)+" "+(by+bh)+"H"+L+"Z",fill:"var(--chart-b)",class:"bar-fill"},svg)}
      else el("line",{x1:L,x2:L+2,y1:by,y2:by+bh,stroke:"var(--chart-b)","stroke-width":2},svg);
      var v=el("text",{x:x(d[1])+10,y:by+bh/2+4},svg);v.textContent=fmt(d);
      var hit=el("rect",{x:0,y:y-2,width:W,height:rowH,class:"hit"},svg);
      hit.addEventListener("mousemove",function(e){showTip(t,chart,e,"<b>"+d[0]+"</b><br>"+fmt(d))});
      hit.addEventListener("mouseleave",function(){t.classList.remove("on")});
    });
    table($(".chart__table",chart),head,data.map(function(d){return [d[0],fmt(d)]}));
  }
  function drawAll(){
  hbars("pinchart",[["Hero",.95],["Chaos",1.4],["Lab",2.0],["Menu",3.34],["Flavour in Motion",2.3],["Ritual",0],["Posters",2.4],["Final Bite",1.8]],3.5,[0,1,2,3],
    function(d){return d[1]===0?"Unpinned":d[1].toFixed(1)+" screens"},"Bar chart of pinned scroll length per scene, in screen heights",["Scene","Pinned for"]);
  hbars("creditchart",[["01 Opener",2.25,9],["02 Chaos",0,0],["03 Lab",2.25,9],["04 Menu",1.25,5],["05 Motion",.75,3],["06 Ritual",1.25,5],["07 Personality",1.75,7],["08 Final Bite",1,4]],2.5,[0,.5,1,1.5,2,2.5],
    function(d){return d[1].toFixed(2)+" credits · "+d[2]+" images"},"Bar chart of Higgsfield credits spent per section. Total 10.50 credits for 42 images",["Section","Credits · images"]);

  // dumbbell: before → after
  (function(){
    var chart=$("#fpschart"), plot=$(".chart__plot",chart), t=$(".tip",chart)||tip(chart); plot.innerHTML="";
    var data=[["Hero",34,57],["Chaos",47,55],["Lab",50,59],["Menu",57,59],["Sauce",56,56],["Ritual",33,56],["Posters",26,60],["Final Bite",24,60]];
    var W=Math.max(300,plot.clientWidth||900),L=W<560?84:110,R=W<560?34:60,rowH=44,top=16,H=top+data.length*rowH+28, min=20,max=60;
    var svg=el("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"Dumbbell chart of tablet frame rate before and after the performance pass for each scene. All scenes end between 55 and 60 fps; Sauce stayed at 56."},plot);
    var x=function(v){return L+(W-L-R)*(v-min)/(max-min)};
    [20,30,40,50,60].forEach(function(v){el("line",{x1:x(v),x2:x(v),y1:top-6,y2:H-26,class:"grid"},svg);var tx=el("text",{x:x(v),y:H-6,"text-anchor":"middle",class:"muted-t"},svg);tx.textContent=v+(v===60?" fps":"")});
    data.forEach(function(d,i){
      var cy=top+i*rowH+rowH/2-6;
      var lb=el("text",{x:L-16,y:cy+4,"text-anchor":"end"},svg);lb.textContent=d[0];
      el("line",{x1:x(d[1]),x2:x(d[2]),y1:cy,y2:cy,stroke:"rgba(41,41,35,.35)","stroke-width":2},svg);
      el("circle",{cx:x(d[1]),cy:cy,r:7,fill:"var(--chart-a)",stroke:"var(--cream)","stroke-width":2},svg);
      el("circle",{cx:x(d[2]),cy:cy,r:7,fill:"var(--chart-b)",stroke:"var(--cream)","stroke-width":2},svg);
      var same=d[1]===d[2];
      var a=el("text",{x:x(d[1])-(same?0:13),y:same?cy-12:cy+4,"text-anchor":same?"middle":"end",class:"muted-t"},svg);a.textContent=same?"56 → 56":d[1];
      if(!same){var b=el("text",{x:x(d[2])+13,y:cy+4,"font-weight":"700"},svg);b.textContent=d[2]}
      var hit=el("rect",{x:0,y:cy-rowH/2,width:W,height:rowH,class:"hit"},svg);
      hit.addEventListener("mousemove",function(e){showTip(t,chart,e,"<b>"+d[0]+"</b><br>Before "+d[1]+" fps → after "+d[2]+" fps"+(same?"<br>No change":""))});
      hit.addEventListener("mouseleave",function(){t.classList.remove("on")});
    });
    table($(".chart__table",chart),["Scene","Before (fps)","After (fps)"],data.map(function(d){return [d[0],d[1],d[2]]}));
  })();
  }
  drawAll(); var lastW=innerWidth, rz;
  addEventListener("resize",function(){clearTimeout(rz);rz=setTimeout(function(){if(innerWidth!==lastW){lastW=innerWidth;drawAll()}},150)});

  /* ---------- motion ---------- */
  if(reduced||!window.gsap||!window.ScrollTrigger){
    document.documentElement.classList.remove("js-motion");
    $$("[data-flip]").forEach(function(f){f.classList.add("flip--static")});
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // headline lines slide up
  $$(".intro__title,.opener__title").forEach(function(h){
    gsap.from($$(".line>span",h),{yPercent:105,duration:1,ease:"power3.out",stagger:.09,
      scrollTrigger:{trigger:h,start:"top 88%",once:true}});
  });
  $$(".opener__num,.scene__num").forEach(function(n){
    gsap.from(n,{opacity:0,x:-30,duration:1,ease:"power3.out",scrollTrigger:{trigger:n,start:"top 90%",once:true}});
  });
  // reveals
  ScrollTrigger.batch("[data-reveal]",{start:"top 90%",once:true,
    onEnter:function(b){gsap.to(b,{opacity:1,y:0,duration:.9,ease:"power3.out",stagger:.08,overwrite:true})}});
  // screenshot masks
  $$("[data-mask] .shot__frame").forEach(function(f){
    gsap.fromTo(f,{clipPath:"inset(10% 7% 10% 7% round 18px)"},{clipPath:"inset(0% 0% 0% 0% round 18px)",ease:"none",
      scrollTrigger:{trigger:f,start:"top 95%",end:"top 35%",scrub:.4}});
  });
  // parallax on site cut-outs
  $$("[data-speed]").forEach(function(img){
    var s=parseFloat(img.dataset.speed)||0; if(!s)return;
    gsap.fromTo(img,{yPercent:-s*30},{yPercent:s*30,ease:"none",
      scrollTrigger:{trigger:img.closest(".opener,.cover,.launch,.table-art,.materials,.chapter")||img,start:"top bottom",end:"bottom top",scrub:.5}});
  });
  // scene frame flips: real frames swap as you scroll past
  $$("[data-flip]").forEach(function(f){
    var imgs=$$(".flip__stack img",f), ticks=$$(".flip__ticks i",f), n=imgs.length, last=-1;
    ScrollTrigger.create({trigger:f,start:"top 70%",end:"bottom 30%",
      onUpdate:function(st){
        var p=st.progress, i=Math.min(n-1,Math.floor(p*n));
        ticks.forEach(function(t,k){t.style.transform="scaleX("+Math.max(0,Math.min(1,p*n-k))+")"});
        if(i!==last){imgs.forEach(function(im,k){if(k)gsap.to(im,{opacity:k<=i?1:0,duration:.35,overwrite:true})});last=i}
      }});
  });
  // stat counters
  $$("[data-count]").forEach(function(b){
    var to=parseFloat(b.dataset.count), dec=parseInt(b.dataset.dec||"0",10), o={v:0};
    if(!to)return;
    gsap.to(o,{v:to,duration:1.4,ease:"power2.out",scrollTrigger:{trigger:b,start:"top 90%",once:true},
      onUpdate:function(){b.textContent=o.v.toFixed(dec)}});
  });
  // chart bars grow
  $$(".chart").forEach(function(c){ScrollTrigger.create({trigger:c,start:"top 80%",once:true,onEnter:function(){var f=$$(".bar-fill",c);if(f.length)gsap.from(f,{scaleX:0,transformOrigin:"0% 50%",duration:1,ease:"power3.out",stagger:.05})}})});
  addEventListener("load",function(){ScrollTrigger.refresh()});
})();
