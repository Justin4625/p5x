import{A as e,D as t,E as n,M as r,N as i,O as a,P as o,T as s,a as c,b as l,c as u,d,f,h as p,k as m,l as h,m as g,o as _,p as v,r as y,s as b,u as x,v as S,w as C,x as ee,y as te}from"./collection-DUUp0a77.js";var w={slots:[null,null,null],navi:null,q:``,elements:new Set,roles:new Set,sort:`new`,mine:!1,aw:{}},T=y();w.mine=(()=>{try{return localStorage.getItem(`p5x-mine`)===`1`}catch{return!1}})()&&T.size>0;var E=e.filter(e=>e.id!==r.id),D=matchMedia(`(prefers-reduced-motion: reduce)`).matches;function O(){return[...w.slots.map(l),l(w.navi)].filter(Boolean)}function k(e){return w.slots.includes(e)||w.navi===e}function A(){let e=w.slots.map(e=>e?encodeURIComponent(e):``).join(`,`),t=w.slots.some(Boolean)||w.navi?`#t=${e}${w.navi?`&n=${encodeURIComponent(w.navi)}`:``}`:` `;history.replaceState(null,``,t===` `?location.pathname:t);try{localStorage.setItem(`p5x-team`,t)}catch{}}function j(){let e=location.hash;if(!e)try{e=localStorage.getItem(`p5x-team`)||``}catch{e=``}let t=new URLSearchParams(e.replace(/^#/,``)),n=(t.get(`t`)||``).split(`,`).map(e=>e&&C.has(e)&&!C.get(e).navigator?e:null);w.slots=[0,1,2].map(e=>n[e]??null);let r=t.get(`n`);w.navi=r&&C.get(r)?.navigator?r:null}function M(){let e=c(`#app`);e.innerHTML=`
  ${_}
  <div class="intro" aria-hidden="true"><div class="intro-band"></div><div class="intro-text">TAKE YOUR TIME</div></div>
  <header class="hero">
    ${d(`builder`)}
    <div class="hero-tag">P5X · GLOBAL SERVER</div>
    <h1>${v(`PHANTOM ROSTER`,`logo`)}</h1>
    <p class="hero-sub">Build a three-thief crew. See who clicks. Learn the turn order.</p>
  </header>
  <main class="layout">
    <section class="builder panel" aria-labelledby="builder-title">
      <div class="panel-head">
        <h2 id="builder-title" class="sect"><span>TEAM</span> BUILDER</h2>
        <button class="btn-ghost" id="clear" type="button">Reset</button>
      </div>
      <div class="slots" id="slots"></div>
      <div class="meter" id="meter"></div>
      <div class="turns" id="turns"></div>
    </section>
    <section class="roster" aria-labelledby="roster-title">
      <div class="roster-head">
        <h2 id="roster-title" class="sect"><span>GLOBAL</span> UNITS <em id="count"></em></h2>
        <p class="hint" id="hint"></p>
      </div>
      <div class="filters">
        <label class="search"><span class="visually-hidden">Search units</span>
          <input id="q" type="search" placeholder="Search name, codename, persona…" autocomplete="off" /></label>
        <div class="chips" id="f-el">${s.map(e=>`<button type="button" class="chip" data-el="${e}" style="--ec:${n[e]}">${t[e]}</button>`).join(``)}</div>
        <div class="chips" id="f-role" hidden>${a.map(e=>`<button type="button" class="chip chip-role" data-role="${e}">${e}</button>`).join(``)}</div>
        <div class="sort sort-mine" role="group" aria-label="Which units">
          <button type="button" class="sort-btn${w.mine?``:` on`}" data-mine="0" aria-pressed="${!w.mine}">All units</button>
          <button type="button" class="sort-btn${w.mine?` on`:``}" data-mine="1" aria-pressed="${w.mine}">My units <em id="mine-n">${T.size||``}</em></button>
        </div>
        <button type="button" class="sort-btn sort-solo" id="role-btn" aria-expanded="false" aria-controls="f-role">Role <em id="role-n"></em></button>
        <div class="sort" role="group" aria-label="Sort">
          ${[`new`,`name`,`speed`].map(e=>`<button type="button" class="sort-btn${e===`new`?` on`:``}" data-sort="${e}">${{new:`Newest`,name:`A–Z`,speed:`Speed`}[e]}</button>`).join(``)}
        </div>
      </div>
      <div class="grid" id="grid"></div>
    </section>
  </main>
  <footer class="foot">Unit data, teams and rotations from <a href="https://lufel.net" target="_blank" rel="noopener">lufel.net</a> (scraped ${new Date(m).toLocaleDateString(`en-GB`,{day:`numeric`,month:`short`,year:`numeric`})}). Fan project, not affiliated with SEGA or Atlus.</footer>
  <div class="drawer" id="drawer" aria-hidden="true"><div class="drawer-scrim" data-close></div><aside class="drawer-body" role="dialog" aria-modal="true" aria-label="Unit details"></aside></div>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
  <div class="skillpop" id="skillpop" role="dialog" aria-label="Skill details"></div>`;let r=!1;try{r=sessionStorage.getItem(`p5x-intro`)===`1`,sessionStorage.setItem(`p5x-intro`,`1`)}catch{}!D&&!r&&document.body.classList.add(`intro-on`),setTimeout(()=>document.body.classList.remove(`intro-on`),1500)}function N(){let e=w.q.trim().toLowerCase(),t=E.filter(t=>!(w.mine&&!T.has(t.id)||w.elements.size&&!t.elements.some(e=>w.elements.has(e))||w.roles.size&&!w.roles.has(t.role)||e&&!`${t.name} ${t.codename} ${t.persona} ${t.mechanics.join(` `)}`.toLowerCase().includes(e)));return t=w.sort===`name`?t.sort((e,t)=>e.name.localeCompare(t.name)):w.sort===`speed`?t.sort((e,t)=>(t.speed??0)-(e.speed??0)):t.sort((e,t)=>t.order-e.order),t}function P(){let e=N();c(`#count`).textContent=String(e.length),c(`#roster-title span`).textContent=w.mine?`MY`:`GLOBAL`;let t=c(`#grid`);t.innerHTML=e.length?e.map((e,t)=>`
    <article class="card" data-id="${h(e.id)}" style="--c:${e.color};--i:${Math.min(t,24)}">
      <button type="button" class="card-hit" data-pick="${h(e.id)}" aria-label="Add ${h(e.name)} to team"></button>
      <div class="card-art">${e.card?`<img src="${b(e)}" alt="" loading="lazy" decoding="async" />`:``}</div>
      <div class="card-badge" aria-hidden="true"></div>
      <div class="card-stamp" aria-hidden="true">IN TEAM</div>
      <div class="card-text">
        <b>${u(e)}</b>
        <span>${h(e.name)}</span>
        <div class="card-pills">${f(e)}</div>
      </div>
      <div class="card-why" aria-hidden="true"></div>
      <button type="button" class="card-info" data-info="${h(e.id)}" aria-label="Details for ${h(e.name)}">i</button>
    </article>`).join(``):w.mine&&!T.size?`<p class="empty">You haven't ticked any units yet. <a href="/p5x/roster.html">Tick the ones you own on My roster</a>.</p>`:`<p class="empty">No thief matches that filter.</p>`,F()}function F(){let e=O(),t=e.filter(e=>!e.navigator),n=c(`#hint`);n.textContent=e.length?`Highlighted cards fit your crew. ${matchMedia(`(hover: hover)`).matches?`Hover a card`:`Tap ⓘ`} to see why.`:`Tap a card to add it. Matching thieves light up.`,document.body.classList.toggle(`has-team`,e.length>0);let r=new Map;for(let n of E)k(n.id)||(!w.mine||T.has(n.id))&&r.set(n.id,p(n,n.navigator?t:e));S(new Map([...r].filter(([e])=>!C.get(e).navigator))),S(new Map([...r].filter(([e])=>C.get(e).navigator)),1,3);for(let e of document.querySelectorAll(`.card`)){let t=C.get(e.dataset.id),n=k(t.id),i=r.get(t.id)??{score:0,tier:`none`,reasons:[]};e.dataset.tier=n?`picked`:i.tier,e.classList.toggle(`is-picked`,n);let a=e.querySelector(`.card-badge`);a.textContent=i.tier===`best`?`BEST`:i.tier===`good`?`GOOD`:``;let o=e.querySelector(`.card-why`);o.innerHTML=i.reasons.filter(e=>e.weight>0).slice(0,2).map(e=>`<p>${e.with?`<b>${h(l(e.with).codename)}</b> `:``}${h(g(e.text,110))}</p>`).join(``)}}function I(e,t){let n=t===`navi`?`NAVI`:`THIEF 0${t+1}`;return e?`<div class="slot slot-full${t===`navi`?` slot-navi`:``}" data-slot="${t}" style="--c:${e.color}">
    <div class="slot-art">${e.card?`<img src="${b(e)}" alt="" />`:``}</div>
    <span class="slot-label">${n}</span>
    <div class="slot-name"><b>${u(e)}</b><span>${h(e.role)}${e.elements.length?` · ${e.elements.join(`/`)}`:``}</span></div>
    <button type="button" class="slot-x" data-remove="${t}" aria-label="Remove ${h(e.name)}">×</button>
    <button type="button" class="slot-hit" data-info="${h(e.id)}" aria-label="Details for ${h(e.name)}"></button>
  </div>`:`<div class="slot slot-empty${t===`navi`?` slot-navi`:``}" data-slot="${t}">
      <div class="slot-star" aria-hidden="true"></div>
      <span class="slot-label">${n}</span>
      <span class="slot-cta">${t===`navi`?`Optional`:`Pick a thief`}</span>
    </div>`}function L(e){let t=r;c(`#slots`).innerHTML=`
    ${w.slots.map((e,t)=>I(l(e),t)).join(``)}
    <div class="slot slot-full slot-wonder" style="--c:#e60012">
      <div class="slot-art">${t.card?`<img src="${b(t)}" alt="" />`:``}</div>
      <span class="slot-label">ALWAYS IN</span>
      <div class="slot-name"><b>WONDER</b><span>Flex · Persona swaps</span></div>
    </div>
    ${I(l(w.navi),`navi`)}`,e!==void 0&&!D&&c(`.slot[data-slot="${e}"]`)?.classList.add(`slam`)}function R(){let e=O(),{score:t,label:n}=te(e),r=e.filter(e=>!e.navigator),i=new Set(r.map(e=>e.role)),a=e=>e.some(e=>i.has(e)),o=[[`Damage`,a([`Sweeper`,`Assassin`])],[`Support`,a([`Strategist`,`Saboteur`,`Virtuoso`])],[`Sustain`,a([`Medic`,`Guardian`])],[`Navigator`,!!w.navi]];c(`#meter`).innerHTML=`
    <div class="meter-score"><span class="meter-num" data-n="${t}">${t}</span><span class="meter-label">${h(n)}</span></div>
    <div class="meter-bar"><i style="--w:${t}%"></i></div>
    <ul class="meter-checks">${o.map(([e,t])=>`<li class="${t?`ok`:``}">${e}</li>`).join(``)}</ul>`;let s=c(`.meter-num`);D||B(s,t)}var z=0;function B(e,t){let n=z;z=t;let r=performance.now(),i=a=>{let o=Math.min(1,(a-r)/600);e.textContent=String(Math.round(n+(t-n)*(1-(1-o)**3))),o<1&&requestAnimationFrame(i)};requestAnimationFrame(i)}function V(){let e=w.slots.map(l).filter(Boolean),t=c(`#turns`);if(!e.length){t.innerHTML=`<div class="turns-empty"><span class="calling">${v(`NO CREW YET`)}</span><p>Add thieves to see the turn-by-turn plan.</p></div>`;return}let n=[...e].sort((e,t)=>(t.speed??0)-(e.speed??0)),a=l(w.navi),s=[...n.map(e=>({u:e,kind:`fighter`})),{u:r,kind:`wonder`},...a?[{u:a,kind:`navi`}]:[]],d=new Set(s.map(e=>e.u.id)),f=e=>{let t=e.rotations.filter(e=>e.with&&d.has(e.with));return t.length?t:e.rotations.filter(e=>!e.with)},p=e=>{let t=f(e),n=T.get(e.id),r=w.aw[e.id],i=e=>e?.match(/A\s*([\d/]+)/)?.[1].split(`/`),a=i(r),o=t.find(e=>e.label===r)??(a&&t.find(e=>i(e.label)?.some(e=>a.includes(e))));return o||!n?o??t[0]:t.map(e=>({r:e,n:Math.max(...(i(e.label)??[`0`]).map(Number))})).filter(e=>e.n<=n.a).sort((e,t)=>t.n-e.n)[0]?.r??t[0]},m=e=>e?.with?`<span class="aw-with" title="Route for a team with ${h(l(e.with)?.name??``)}">${h(l(e.with)?.codename??``)} team</span>`:``,g=Math.min(8,Math.max(3,...s.map(e=>p(e.u)?.steps.length??0))),_=(e,t,n)=>{if(t===`wonder`)return`<div class="act act-flex"><b>PERSONA</b><span>Fill gaps</span></div>`;let r=p(e);return r?`<div class="act-stack">${r.steps[n%r.steps.length].map(t=>{let n=i(e,t),r=n.skill?`${n.label}${n.skill.type?` · ${n.skill.type}`:``}${n.skill.sp?` · ${n.skill.sp} SP`:``}\n\n${n.skill.desc}`:n.label;return`<div class="act${n.idle?` act-idle`:``}${n.auto?` act-auto`:``}${n.code.startsWith(`HL`)?` act-hl`:``}" title="${h(r)}" tabindex="0" data-act="${h(e.id)}" data-tok="${h(t)}">
        <b>${h(n.code)}${n.auto?`<i>AUTO</i>`:``}</b><span>${h(n.label)}</span></div>`}).join(``)}</div>`:`<div class="act act-none"><b>?</b><span>No guide</span></div>`},y=e=>{let t=f(e),n=p(e);return t.length>1?`<label class="aw"><span class="visually-hidden">Awareness for ${h(e.name)}</span><select data-aw="${h(e.id)}">${t.map(e=>`<option value="${h(e.label)}"${e===n?` selected`:``}>${h(o(e.label))}</option>`).join(``)}</select></label>${m(n)}`:n?`<span class="aw aw-one">${h(o(n.label))}</span>${m(n)}`:``},x=s.filter(e=>e.u.rotationNotes.length&&e.kind!==`wonder`);t.innerHTML=`
    <div class="turns-head">
      <h3 class="sect sm"><span>TURN</span> ORDER</h3>
      <p>Action order follows base Speed. Tap a move for the skill text.</p>
    </div>
    <div class="tt" style="--turns:${g}">
      <div class="tt-row tt-top"><div class="tt-who"></div>${Array.from({length:g},(e,t)=>`<div class="tt-t">T${t+1}</div>`).join(``)}</div>
      ${s.map((e,t)=>`
        <div class="tt-row tt-${e.kind}" style="--c:${e.kind===`wonder`?`#e60012`:e.u.color};--li:${t}">
          <div class="tt-who">
            <span class="tt-pos${e.kind===`navi`?` tt-pos-sm`:``}">${e.kind===`navi`?`NAV`:e.kind===`wonder`?`★`:t+1}</span>
            <div class="tt-face">${e.u.card?`<img src="${b(e.u)}" alt="" />`:``}</div>
            <div class="tt-id"><b>${u(e.u)}</b>
              <span>${e.kind===`wonder`?`Speed varies`:e.kind===`navi`?`Support skills`:`SPD ${e.u.speed??`?`}`}</span>
              ${e.kind===`wonder`?``:y(e.u)}</div>
          </div>
          ${Array.from({length:g},(t,n)=>`<div class="tt-c" style="--t:${n}">${_(e.u,e.kind,n)}</div>`).join(``)}
        </div>`).join(``)}
    </div>
    ${x.length?`<details class="tt-notes"><summary>Rotation notes (${x.length})</summary>${x.map(e=>`<div><b>${h(e.u.codename)}</b><ul>${e.u.rotationNotes.map(e=>`<li>${h(e.replace(/^·\s*/,``))}</li>`).join(``)}</ul></div>`).join(``)}</details>`:``}`}function H(e){let t=O();if(!t.length||k(e.id)||e.id===r.id)return``;let n=p(e,e.navigator?t.filter(e=>!e.navigator):t);return n.reasons.length?`<section class="d-sec d-why"><h4>Fit with your crew</h4>${n.reasons.map(e=>`<p>${e.weight<0?`▼`:`★`} ${e.with?`<b>${h(l(e.with).codename)}:</b> `:``}${h(e.text)}</p>`).join(``)}</section>`:``}function U(e){if(e.id===r.id)return``;let{gives:t,wants:n}=ee(e);if(!t.length&&!n.length)return``;let i=(e,t)=>t.length?`<div class="d-play-row"><dt>${e}</dt><dd>${t.map(e=>`<span>${h(e)}</span>`).join(``)}</dd></div>`:``;return`<section class="d-sec d-play"><h4>From the skills</h4><dl>${i(`Brings`,t)}${i(`Looks for`,n)}</dl></section>`}function ne(e){let t=C.get(e);if(!t)return;let n=c(`#drawer`),a=c(`.drawer-body`,n),s=Object.entries(t.skills),u=e=>e.replace(`skill_highlight`,`HL`).replace(`skill_passive`,`P`).replace(`skill_support`,`Sup`).replace(`skill`,`S`);a.style.setProperty(`--c`,t.color),a.innerHTML=`
    <button type="button" class="drawer-x" data-close aria-label="Close">×</button>
    <div class="d-hero">
      <div class="d-art">${t.card?`<img src="${b(t)}" alt="${h(t.name)} card art" />`:``}</div>
      <div class="d-id">
        <span class="d-code">${h(t.codename)}</span>
        <h3>${h(t.name)}</h3>
        <div class="card-pills">${f(t)}${t.limited?`<span class="pill pill-lim">Limited</span>`:``}</div>
        <dl class="d-stats">
          ${t.persona?`<div><dt>Persona</dt><dd>${h(t.persona)}</dd></div>`:``}
          ${t.speed?`<div><dt>Speed</dt><dd>${t.speed}</dd></div>`:``}
          ${t.skillPriority?`<div><dt>Skill priority</dt><dd>${h(t.skillPriority)}</dd></div>`:``}
        </dl>
        ${t.mechanics.length?`<div class="d-tags">${t.mechanics.map(e=>`<span>${h(e)}</span>`).join(``)}</div>`:``}
        ${t.id===r.id?``:`<button type="button" class="btn-red" data-pick="${h(t.id)}">${k(t.id)?`Remove from team`:`Add to team`}</button>`}
      </div>
    </div>
    ${H(t)}
    ${U(t)}
    ${t.review?`<section class="d-sec"><h4>Overview</h4><p>${x(t.review)}</p></section>`:``}
    ${t.friends.length?`<section class="d-sec"><h4>Best partners</h4><div class="d-friends">${t.friends.map(e=>{let t=l(e.id);return`<button type="button" class="d-friend" data-info="${h(t.id)}" style="--c:${t.color}">
        <span class="d-face">${t.card?`<img src="${b(t)}" alt="" />`:``}</span>
        <span><b>${h(t.codename)}</b><small>${h(g(e.comment,160))}</small></span></button>`}).join(``)}</div></section>`:``}
    ${s.length?`<section class="d-sec"><h4>Skills</h4>${s.map(([e,t])=>`
      <div class="d-skill"><span class="d-sk">${u(e)}</span><div><b>${h(t.name)}</b>${t.type?`<em>${h(t.type)}${t.sp?` · ${t.sp} SP`:``}</em>`:``}<p>${h(t.desc)}</p></div></div>`).join(``)}</section>`:``}
    ${t.rotations.length?`<section class="d-sec"><h4>Rotations</h4>${t.rotations.map(e=>`
      <div class="d-rot"><span>${h(o(e.label))}${e.with?` · ${h(l(e.with)?.codename??``)} team`:``}</span><ol>${e.steps.map(e=>`<li>${e.map(e=>h(i(t,e).code)).join(` + `)}</li>`).join(``)}</ol></div>`).join(``)}</section>`:``}`,n.classList.add(`open`),n.setAttribute(`aria-hidden`,`false`),a.scrollTop=0,c(`.drawer-x`,a).focus()}function W(){let e=c(`#drawer`);e.classList.remove(`open`),e.setAttribute(`aria-hidden`,`true`)}var G=0;function K(e){let t=c(`#toast`);t.textContent=e,t.classList.remove(`show`),t.offsetWidth,t.classList.add(`show`),clearTimeout(G),G=window.setTimeout(()=>t.classList.remove(`show`),2400)}function re(e,t){if(D||!e)return;let n=e.querySelector(`img`),r=c(t);if(!n||!r)return;let i=n.getBoundingClientRect(),a=r.getBoundingClientRect(),o=a.bottom>0&&a.top<innerHeight,s=n.cloneNode();if(s.className=`ghost`,Object.assign(s.style,{left:`${i.left}px`,top:`${i.top}px`,width:`${i.width}px`,height:`${i.height}px`}),document.body.appendChild(s),!o){s.animate([{transform:`scale(1) rotate(0)`,opacity:1},{transform:`scale(1.12) rotate(-6deg)`,opacity:1,offset:.4},{transform:`scale(.6) rotate(8deg)`,opacity:0}],{duration:480,easing:`cubic-bezier(.2,1.4,.35,1)`}).onfinish=()=>s.remove();return}let l=a.left+a.width/2-(i.left+i.width/2),u=a.top+a.height/2-(i.top+i.height/2),d=Math.min(a.width/i.width,a.height/i.height);s.animate([{transform:`translate(0,0) rotate(0) scale(1)`,opacity:1},{transform:`translate(${l*.5}px, ${u*.5-80}px) rotate(-14deg) scale(${(1+d)/2})`,opacity:1,offset:.55},{transform:`translate(${l}px, ${u}px) rotate(4deg) scale(${d})`,opacity:0}],{duration:620,easing:`cubic-bezier(.6,-0.2,.3,1)`}).onfinish=()=>s.remove()}function ie(e){let t=C.get(e);if(!t||t.id===r.id)return;let n=document.querySelector(`.card[data-id="${CSS.escape(e)}"]`),i;if(k(e))w.navi===e&&(w.navi=null),w.slots=w.slots.map(t=>t===e?null:t);else if(t.navigator)w.navi=e,i=`navi`;else{let t=w.slots.indexOf(null);if(t===-1){K(`Crew is full. Remove a thief first.`);return}w.slots[t]=e,i=t}if(i!==void 0){let e=c(`.slot[data-slot="${i}"]`).getBoundingClientRect();(e.bottom<0||e.top>innerHeight)&&K(i===`navi`?`${t.codename} is your navigator`:`${t.codename} joins · ${w.slots.filter(Boolean).length}/3`)}q(i),i!==void 0&&re(n,`.slot[data-slot="${i}"]`)}function q(e){if(A(),L(e),R(),V(),F(),c(`#drawer`).classList.contains(`open`)){let e=c(`.drawer-body .btn-red`),t=e?.dataset.pick;e&&t&&(e.textContent=k(t)?`Remove from team`:`Add to team`)}}function ae(){document.addEventListener(`click`,e=>{let t=e.target,n=t.closest(`[data-info]`);if(n){ne(n.dataset.info);return}let r=t.closest(`[data-pick]`);if(r){ie(r.dataset.pick);return}let i=t.closest(`[data-remove]`);if(i){let e=i.dataset.remove;e===`navi`?w.navi=null:w.slots[Number(e)]=null,q();return}if(t.closest(`[data-close]`)){W();return}let a=t.closest(`[data-act]`);if(a){J(a.dataset.act,a.dataset.tok);return}t.closest(`#skillpop`)||Y();let o=t.closest(`.slot-empty`);if(o){o.dataset.slot===`navi`&&(w.roles=new Set([`Navigator`]),Z(),P()),c(`.roster`).scrollIntoView({behavior:D?`auto`:`smooth`,block:`start`});return}let s=t.closest(`[data-el]`);if(s){X(w.elements,s.dataset.el),Z(),P();return}let l=t.closest(`[data-role]`);if(l){X(w.roles,l.dataset.role),Z(),P();return}let u=t.closest(`[data-mine]`);if(u){w.mine=u.dataset.mine===`1`;try{localStorage.setItem(`p5x-mine`,w.mine?`1`:`0`)}catch{}document.querySelectorAll(`[data-mine]`).forEach(e=>{e.classList.toggle(`on`,e===u),e.setAttribute(`aria-pressed`,String(e===u))}),P();return}let d=t.closest(`[data-sort]`);d?(w.sort=d.dataset.sort,document.querySelectorAll(`.sort-btn`).forEach(e=>e.classList.toggle(`on`,e===d)),P()):t.closest(`[data-pop-close]`)?Y():t.closest(`#role-btn`)?Q(document.getElementById(`f-role`).hasAttribute(`hidden`)):t.closest(`#clear`)&&(w.slots=[null,null,null],w.navi=null,q())}),document.addEventListener(`change`,e=>{let t=e.target.closest(`select[data-aw]`);t&&(w.aw[t.dataset.aw]=t.value,V())}),c(`#q`).addEventListener(`input`,e=>{w.q=e.target.value,P()}),document.addEventListener(`keydown`,e=>{e.key===`Escape`&&(W(),Y());let t=e.target.closest?.(`[data-act]`);t&&(e.key===`Enter`||e.key===` `)&&(e.preventDefault(),J(t.dataset.act,t.dataset.tok))})}function J(e,t){let n=C.get(e);if(!n)return;let r=i(n,t),a=c(`#skillpop`),o=[r.code,r.auto?`Auto`:``,r.skill?.type||``,r.skill?.sp?`${r.skill.sp} SP`:``].filter(Boolean).join(` · `);a.innerHTML=`<button type="button" data-pop-close aria-label="Close">×</button>
    <em>${h(n.codename)} · ${h(o)}</em><b>${h(r.label)}</b>
    ${r.skill?.desc?`<p>${h(r.skill.desc)}</p>`:r.idle?`<p>Skip this unit this turn (guard or basic attack).</p>`:``}`,a.classList.add(`show`)}function Y(){c(`#skillpop`).classList.remove(`show`)}function X(e,t){e.has(t)?e.delete(t):e.add(t)}function Z(){document.querySelectorAll(`[data-el]`).forEach(e=>e.classList.toggle(`on`,w.elements.has(e.dataset.el))),document.querySelectorAll(`[data-role]`).forEach(e=>e.classList.toggle(`on`,w.roles.has(e.dataset.role))),c(`#role-n`).textContent=w.roles.size?String(w.roles.size):``,w.roles.size&&Q(!0)}function Q(e){c(`#f-role`).hidden=!e,c(`#role-btn`).setAttribute(`aria-expanded`,String(e)),c(`#role-btn`).classList.toggle(`on`,e)}j(),M(),ae(),L(),R(),V(),P(),A();function $(){T=y(),c(`#mine-n`).textContent=T.size?String(T.size):``,P(),V()}addEventListener(`storage`,e=>{e.key===`p5x-collection`&&$()}),addEventListener(`pageshow`,e=>{e.persisted&&$()});