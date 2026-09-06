// ---------------------------------------------------------
// 선진 — 배경화면 프로토타입
// 메모 = 개인 글 모음, 메일 = 작업 포트폴리오
// 내용은 실제 자료가 정해지기 전까지 자리표시자입니다.
// ---------------------------------------------------------

const $ = (sel) => document.querySelector(sel);

// 목록 등 innerHTML로 삽입되는 텍스트 안의 <, >, & 를 이스케이프
function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

// 제목처럼 원래는 순수 텍스트로 다루는 필드에서 <strong>/<em> 강조만 허용하고 나머지는 이스케이프
function escapeHtmlAllowEmphasis(str) {
  return escapeHtml(str).replace(/&lt;(\/?(?:strong|em))&gt;/g, "<$1>");
}

// 빈 줄로 구분된 본문 텍스트를 문단(<p>) 목록으로 변환
function paragraphsToHtml(text) {
  return (text || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p class="${p.startsWith("[") ? "placeholder" : ""}">${p}</p>`)
    .join("");
}

// ===========================================================
// 공용 앱 윈도우 컨트롤러 (아이콘 ↔ 창, 지니 효과, 드래그, 최대화)
// ===========================================================
let topZ = 10;

function setupAppAndIcon(icon, win) {
  const titlebar = win.querySelector(".titlebar");
  const closeBtn = win.querySelector(".tl-close");
  const minBtn = win.querySelector(".tl-min");
  const zoomBtn = win.querySelector(".tl-zoom");

  function iconCenter() {
    const r = icon.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  function setGenieOrigin(rect) {
    const c = iconCenter();
    win.style.transformOrigin = `${c.x - rect.left}px ${c.y - rect.top}px`;
  }
  // 창이 닫혀있는(축소된) 상태에서도 실제 자리(중앙 정렬 또는 드래그된 위치)를 계산
  function restingRect() {
    const cs = getComputedStyle(win);
    const width = parseFloat(cs.width);
    const height = parseFloat(cs.height);
    let left, top;
    if (win.style.left) {
      left = parseFloat(win.style.left);
      top = parseFloat(win.style.top);
    } else {
      left = (window.innerWidth - width) / 2;
      top = (window.innerHeight - height) / 2;
    }
    return { left, top };
  }
  function focus() {
    win.style.zIndex = String(++topZ);
  }
  function open() {
    setGenieOrigin(restingRect());
    win.classList.add("open");
    win.classList.remove("maximized");
    focus();
  }
  function close() {
    setGenieOrigin(win.getBoundingClientRect());
    win.classList.remove("open", "maximized");
  }

  closeBtn.addEventListener("click", close);
  minBtn.addEventListener("click", close);
  win.addEventListener("mousedown", focus);

  let preZoomRect = null;
  zoomBtn.addEventListener("click", () => {
    const willMaximize = !win.classList.contains("maximized");
    if (willMaximize) {
      preZoomRect = {
        left: win.style.left,
        top: win.style.top,
        right: win.style.right,
        bottom: win.style.bottom,
        margin: win.style.margin,
      };
      win.style.left = "";
      win.style.top = "";
      win.style.right = "";
      win.style.bottom = "";
      win.style.margin = "";
      win.classList.add("maximized");
    } else {
      win.classList.remove("maximized");
      if (preZoomRect) {
        win.style.left = preZoomRect.left;
        win.style.top = preZoomRect.top;
        win.style.right = preZoomRect.right;
        win.style.bottom = preZoomRect.bottom;
        win.style.margin = preZoomRect.margin;
        preZoomRect = null;
      }
    }
  });

  // 타이틀바 드래그로 창 이동
  let dragState = null;
  titlebar.addEventListener("mousedown", (e) => {
    if (e.target.closest(".traffic-lights")) return;
    if (win.classList.contains("maximized")) return;
    const rect = win.getBoundingClientRect();
    dragState = { startX: e.clientX, startY: e.clientY, startLeft: rect.left, startTop: rect.top };
    win.style.left = `${rect.left}px`;
    win.style.top = `${rect.top}px`;
    win.style.right = "auto";
    win.style.bottom = "auto";
    win.style.margin = "0";
    win.classList.add("dragging");
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragState) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    const w = win.offsetWidth;
    let newLeft = dragState.startLeft + dx;
    let newTop = dragState.startTop + dy;
    newTop = Math.max(0, Math.min(newTop, window.innerHeight - 40));
    newLeft = Math.max(120 - w, Math.min(newLeft, window.innerWidth - 120));
    win.style.left = `${newLeft}px`;
    win.style.top = `${newTop}px`;
  });
  window.addEventListener("mouseup", () => {
    if (!dragState) return;
    dragState = null;
    win.classList.remove("dragging");
  });

  // 바탕화면 아이콘 드래그 이동 (드래그가 아니면 클릭으로 간주해 창 열기)
  let iconDrag = null;
  let iconWasDragged = false;
  icon.addEventListener("mousedown", (e) => {
    iconWasDragged = false;
    const rect = icon.getBoundingClientRect();
    iconDrag = { startX: e.clientX, startY: e.clientY, startLeft: rect.left, startTop: rect.top };
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (!iconDrag) return;
    const dx = e.clientX - iconDrag.startX;
    const dy = e.clientY - iconDrag.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) iconWasDragged = true;
    if (!iconWasDragged) return;
    const w = icon.offsetWidth;
    const h = icon.offsetHeight;
    const newLeft = Math.max(0, Math.min(iconDrag.startLeft + dx, window.innerWidth - w));
    const newTop = Math.max(0, Math.min(iconDrag.startTop + dy, window.innerHeight - h));
    icon.style.left = `${newLeft}px`;
    icon.style.top = `${newTop}px`;
    icon.style.transform = "none";
  });
  window.addEventListener("mouseup", () => {
    iconDrag = null;
  });
  icon.addEventListener("click", (e) => {
    if (iconWasDragged) {
      e.preventDefault();
      return;
    }
    open();
  });

  return { icon, win, open, close };
}

const notesApp = setupAppAndIcon($("#notes-icon"), $("#notes-window"));
const mailApp = setupAppAndIcon($("#mail-icon"), $("#mail-window"));
const meApp = setupAppAndIcon($("#me-icon"), $("#me-window"));
const memoryApp = setupAppAndIcon($("#memory-icon"), $("#memory-window"));

// mmm... 아이콘: 아직 만들어지지 않은 공간 안내 툴팁
const mIcon = $("#m-icon");
if (mIcon) {
  mIcon.dataset.definition = "새로운 탑 설계 중...";
  let mIconTooltipTimer = null;
  mIcon.addEventListener("click", () => {
    showWordTooltip(mIcon);
    clearTimeout(mIconTooltipTimer);
    mIconTooltipTimer = setTimeout(hideWordTooltip, 2200);
  });
}

// 바탕화면(창 바깥) 클릭 시 열려있는 창 닫기
const desktopEl = $("#desktop");
desktopEl.addEventListener("click", (e) => {
  if (e.target !== desktopEl) return;
  [notesApp, mailApp, meApp, memoryApp].forEach((a) => {
    if (a.win.classList.contains("open")) a.close();
  });
});

// 배경 문장 트레일 (마우스를 움직이면 문장이 한 글자씩 남았다가 사라짐)
const trailSentence = "안녕하세요. 선진의 홈페이지입니다. 방문해주셔서 반가워요. Hello, welcome to Sunjin's website. It's nice to have you here. こんにちは。ソンジンのホームページへようこそ。ご訪問いただき、うれしいです。 你好，这里是善珍的网站。欢迎访问，很高兴见到你。 ";
let trailIndex = 0;
let lastStarAt = 0;
desktopEl.addEventListener("mousemove", (e) => {
  const now = Date.now();
  if (now - lastStarAt < 45) return;
  lastStarAt = now;
  const rect = desktopEl.getBoundingClientRect();
  const star = document.createElement("span");
  star.className = "desktop-star";
  star.textContent = trailSentence[trailIndex % trailSentence.length];
  trailIndex++;
  star.style.left = `${e.clientX - rect.left}px`;
  star.style.top = `${e.clientY - rect.top}px`;
  star.style.fontSize = `${11 + Math.random() * 3}px`;
  desktopEl.appendChild(star);
  requestAnimationFrame(() => {
    star.style.opacity = String(0.4 + Math.random() * 0.5);
  });
  setTimeout(() => {
    star.style.opacity = "0";
    star.style.transform = `translateY(${-10 - Math.random() * 10}px)`;
  }, 250);
  setTimeout(() => star.remove(), 1400);
});

// ===========================================================
// 메모 — 나의 글을 모아두는 공간 (content/notes.json에서 불러옴)
// ===========================================================
let notes = [];
let folders = [];

const listEl = $("#notes-list");
const detailPane = $("#detail-pane");
const searchInput = $("#search-input");

let activeFolder = "all";
let activeNoteId = null;

function folderCount(id) {
  return id === "all" ? notes.length : notes.filter((n) => n.folder === id).length;
}

function renderFolders() {
  $("#folders-list").innerHTML = folders
    .map(
      (f) => `
      <li>
        <div class="folder-row ${f.id === activeFolder ? "active" : ""}" data-folder="${f.id}">
          <svg viewBox="0 0 24 24" class="icon-folder-sm"><path d="M3 6a2 2 0 012-2h4.5l2 2H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V6z"/></svg>
          <span class="folder-name">${f.label}</span>
          <span class="folder-count">${folderCount(f.id)}</span>
        </div>
      </li>`
    )
    .join("");

  $("#folders-list")
    .querySelectorAll(".folder-row")
    .forEach((row) => {
      row.addEventListener("click", () => {
        activeFolder = row.dataset.folder;
        searchInput.value = "";
        renderFolders();
        renderList();
      });
    });
}

function visibleNotes() {
  const q = searchInput.value.trim().toLowerCase();
  return notes.filter((n) => {
    const inFolder = activeFolder === "all" || n.folder === activeFolder;
    const matchesQuery = !q || n.title.toLowerCase().includes(q) || (n.preview || "").toLowerCase().includes(q);
    return inFolder && matchesQuery;
  });
}

function formatPreview(note) {
  if (note.checklist) {
    const doneCount = note.checklist.filter((c) => c.done).length;
    return `${doneCount}/${note.checklist.length}개 완료`;
  }
  if (note.entries) {
    return `${note.entries.length}개 문장`;
  }
  return note.preview;
}

function entriesMarkup(note) {
  return `<ul class="note-entries">${note.entries
    .map(
      (it) => `
      <li class="note-entry">
        <div class="note-entry-title">${it.title}</div>
        <div class="note-entry-meta">${it.meta || ""}</div>
        <div class="note-entry-text">${it.text}</div>
      </li>`
    )
    .join("")}</ul>`;
}


function bookshelfMarkup(note) {
  const spines = note.entries
    .map((it, i) => {
      const width = 42 + ((i * 13) % 20);
      return `<button type="button" class="book-spine" data-idx="${i}" style="width:${width}px;">
        <span class="book-spine-title">${escapeHtml(it.title)}</span>
      </button>`;
    })
    .join("");
  return `
    <div class="bookshelf">
      <div class="bookshelf-row">${spines}</div>
      <div class="bookshelf-ledge"></div>
      <p class="bookshelf-hint">책등을 눌러 문장을 확인하세요</p>
      <div class="bookshelf-detail" id="bookshelf-detail"></div>
    </div>
  `;
}

function bindBookshelf(note, root) {
  const detail = root.querySelector("#bookshelf-detail");
  root.querySelectorAll(".book-spine").forEach((btn) => {
    btn.addEventListener("click", () => {
      root.querySelectorAll(".book-spine").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const it = note.entries[Number(btn.dataset.idx)];
      detail.innerHTML = `
        <div class="bookshelf-detail-title">${escapeHtml(it.title)}</div>
        <div class="bookshelf-detail-meta">${escapeHtml(it.meta || "")}</div>
        <div class="bookshelf-detail-text">${escapeHtml(it.text)}</div>
      `;
      detail.classList.add("open");
    });
  });
}

const TYPEWRITER_MACHINE_SVG = `
<svg viewBox="0 0 640 260" class="tw-machine-svg" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
  <ellipse cx="150" cy="70" rx="26" ry="26" fill="#8b9070"/>
  <ellipse cx="150" cy="70" rx="10" ry="10" fill="#5f6448"/>
  <ellipse cx="490" cy="70" rx="26" ry="26" fill="#8b9070"/>
  <ellipse cx="490" cy="70" rx="10" ry="10" fill="#5f6448"/>
  <rect x="70" y="55" width="500" height="34" rx="6" fill="#3a3a36"/>
  <path d="M40 100 Q40 78 66 78 H574 Q600 78 600 100 V150 Q600 168 582 168 H58 Q40 168 40 150 Z" fill="#a9ad85"/>
  <path d="M40 100 Q40 78 66 78 H574 Q600 78 600 100 V112 H40 Z" fill="#bcc09c"/>
  <rect x="20" y="160" width="600" height="90" rx="14" fill="#9ba178"/>
  <rect x="20" y="160" width="600" height="18" rx="9" fill="#aeb38c"/>
  <rect x="252" y="176" width="136" height="30" rx="6" fill="#7d8262"/>
  <g fill="#2f2f2c">
    ${Array.from({ length: 13 })
      .map((_, i) => `<circle cx="${72 + i * 40}" cy="238" r="12"/>`)
      .join("")}
  </g>
  <g fill="#e9e6d8">
    ${Array.from({ length: 13 })
      .map((_, i) => `<circle cx="${72 + i * 40}" cy="238" r="8"/>`)
      .join("")}
  </g>
</svg>`;

function typewriterMarkup(note) {
  const entries = note.entries
    .map(
      (it) => `
      <div class="tw-entry">
        <div class="tw-entry-head">
          <span class="tw-entry-title">${it.title}</span>
          <span class="tw-entry-meta">${it.meta || ""}</span>
        </div>
        <div class="tw-entry-rule"></div>
        <p class="tw-entry-text">${it.text}</p>
      </div>`
    )
    .join("");
  return `
    <div class="typewriter-scroll">
      <div class="typewriter-paper">${entries}</div>
      <div class="typewriter-machine-wrap">
        <div class="typewriter-machine">${TYPEWRITER_MACHINE_SVG}</div>
      </div>
    </div>
  `;
}

function renderList() {
  const filtered = visibleNotes();
  const folderLabel = folders.find((f) => f.id === activeFolder)?.label || "모든 메모";
  $("#list-title").textContent = folderLabel;
  $("#list-subtitle").textContent = `${filtered.length}개의 메모`;

  listEl.innerHTML = filtered
    .map(
      (n) => `
      <li>
        <div class="note-row ${n.id === activeNoteId ? "active" : ""}" data-id="${n.id}">
          <div class="row-top">
            <span class="row-title">${escapeHtml(n.title)}</span>
          </div>
          <span class="row-preview">${escapeHtml(formatPreview(n))}</span>
        </div>
      </li>`
    )
    .join("");

  listEl.querySelectorAll(".note-row").forEach((row) => {
    row.addEventListener("click", () => openNote(row.dataset.id));
  });
}

function checklistMarkup(note) {
  const sorted = [...note.checklist].sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));
  return sorted
    .map(
      (c) =>
        `<li class="${c.done ? "done" : ""}" data-uid="${c._uid}"><span class="check-dot"></span><span>${c.text}</span></li>`
    )
    .join("");
}

function bindChecklist(note, ul) {
  ul.querySelectorAll("li").forEach((li) => {
    li.addEventListener("click", () => toggleChecklistItem(note, ul, li));
  });
}

// 체크 시 취소선을 긋고, 눌린 항목이 자연스럽게 아래로 이동하도록 FLIP 애니메이션 적용
function toggleChecklistItem(note, ul, li) {
  const uid = Number(li.dataset.uid);
  const item = note.checklist.find((c) => c._uid === uid);
  if (!item) return;

  const firstRects = new Map();
  Array.from(ul.children).forEach((el) => firstRects.set(el.dataset.uid, el.getBoundingClientRect()));

  item.done = !item.done;
  ul.innerHTML = checklistMarkup(note);
  bindChecklist(note, ul);

  Array.from(ul.children).forEach((el) => {
    const first = firstRects.get(el.dataset.uid);
    if (!first) return;
    const dy = first.top - el.getBoundingClientRect().top;
    if (!dy) return;
    el.style.transition = "none";
    el.style.transform = `translateY(${dy}px)`;
    requestAnimationFrame(() => {
      el.style.transition = "transform .32s cubic-bezier(.32,.72,0,1)";
      el.style.transform = "";
    });
    el.addEventListener("transitionend", () => { el.style.transition = ""; }, { once: true });
  });

  const row = listEl.querySelector(`.note-row[data-id="${note.id}"] .row-preview`);
  if (row) row.textContent = formatPreview(note);
}

function poemsMarkup(poems) {
  return `<div class="poem-columns">${poems
    .map(
      (p) => `<div class="poem-col">
        <p class="poem-title">${escapeHtml(p.title)}</p>
        <p class="poem-text">${escapeHtml(p.text)}</p>
      </div>`
    )
    .join("")}</div>`;
}

function openNote(id) {
  const note = notes.find((n) => n.id === id);
  if (!note) return;
  activeNoteId = id;

  listEl.querySelectorAll(".note-row").forEach((row) => {
    row.classList.toggle("active", row.dataset.id === id);
  });

  $("#detail-title").textContent = note.hideTitle ? "" : note.title;
  $("#detail-title").style.display = note.hideTitle ? "none" : "";

  const content = $("#detail-content");
  if (note.checklist && note.checklist.length) {
    content.innerHTML = `<ul class="checklist"></ul>`;
    const ul = content.querySelector(".checklist");
    ul.innerHTML = checklistMarkup(note);
    bindChecklist(note, ul);
  } else if (note.entries && note.entries.length) {
    if (note.layout === "bookshelf") {
      content.innerHTML = bookshelfMarkup(note);
      bindBookshelf(note, content);
    } else if (note.layout === "typewriter") {
      content.innerHTML = typewriterMarkup(note);
    } else {
      content.innerHTML = entriesMarkup(note);
    }
  } else {
    const embedHtml = note.embed
      ? `<div class="site-embed-wrap"><iframe src="${note.embed}" title="${note.title}" loading="lazy"></iframe></div>`
      : "";
    content.innerHTML = paragraphsToHtml(note.body) + embedHtml;
  }

  const images = note.images || [];
  if (images.length) {
    const photoBtn = (src) =>
      `<button type="button" class="note-photo" data-src="${src}" aria-label="첨부 이미지 크게 보기"><img src="${src}" alt="" loading="lazy" /></button>`;
    let imagesHtml;
    if (note.photoLayout === "feature-right" && images.length > 1) {
      const [feature, ...rest] = images;
      imagesHtml = `<div class="note-photo-feature">
        <div class="note-photo-grid">${rest.map(photoBtn).join("")}</div>
        ${photoBtn(feature).replace('class="note-photo"', 'class="note-photo note-photo-tall"')}
      </div>`;
    } else {
      const gridClass = note.uniformPhotos ? "note-images uniform" : "note-images";
      imagesHtml = `<div class="${gridClass}">${images.map(photoBtn).join("")}</div>`;
    }
    content.insertAdjacentHTML("beforeend", imagesHtml);
    const notePhotoBtns = content.querySelectorAll(".note-photo");
    const noteGallery = Array.from(notePhotoBtns).map((btn) => btn.dataset.src);
    notePhotoBtns.forEach((btn) => btn.addEventListener("click", () => openLightbox(btn.dataset.src, noteGallery)));
  }

  const poems = note.poems || [];
  if (poems.length) {
    content.insertAdjacentHTML("beforeend", poemsMarkup(poems));
  }

  detailPane.classList.add("open");
}

// 방향키로 메모 이동 (검색창에 포커스가 있을 땐 기본 커서 이동 유지)
document.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
  if (document.activeElement === searchInput) return;
  if (!notesApp.win.classList.contains("open")) return;

  const filtered = visibleNotes();
  if (filtered.length === 0) return;
  e.preventDefault();

  const currentIndex = filtered.findIndex((n) => n.id === activeNoteId);
  let nextIndex;
  if (currentIndex === -1) {
    nextIndex = 0;
  } else if (e.key === "ArrowDown") {
    nextIndex = Math.min(currentIndex + 1, filtered.length - 1);
  } else {
    nextIndex = Math.max(currentIndex - 1, 0);
  }
  openNote(filtered[nextIndex].id);
});

$("#back-btn").addEventListener("click", () => {
  detailPane.classList.remove("open");
});

searchInput.addEventListener("input", renderList);

const desktopQuery = window.matchMedia("(min-width: 681px)");
function ensureDesktopSelection() {
  if (desktopQuery.matches && !activeNoteId) {
    openNote(notes[0].id);
  }
}
desktopQuery.addEventListener("change", ensureDesktopSelection);

// ===========================================================
// 메일 — 작업 포트폴리오 (content/mails.json에서 불러옴)
// ===========================================================
let mails = [];
let mailFolders = [];
const mailListEl = $("#mail-list");
const mailSearchInput = $("#mail-search-input");
const mailMainEl = $(".mail-main");

let activeMailFolder = "sent";
let activeMailId = null;

function mailFolderCount(id) {
  return mails.filter((m) => m.folder === id).length;
}
function mailUnreadCount(id) {
  return mails.filter((m) => m.folder === id && m.unread).length;
}

function renderMailFolders() {
  $("#mail-folders-list").innerHTML = mailFolders
    .map((f) => {
      const unread = mailUnreadCount(f.id);
      return `
      <li>
        <div class="folder-row ${f.id === activeMailFolder ? "active" : ""} ${unread > 0 ? "has-unread" : ""}" data-folder="${f.id}">
          <span class="folder-name">${f.label}</span>
          <span class="folder-count">${mailFolderCount(f.id)}</span>
        </div>
      </li>`;
    })
    .join("");

  $("#mail-folders-list")
    .querySelectorAll(".folder-row")
    .forEach((row) => {
      row.addEventListener("click", () => {
        activeMailFolder = row.dataset.folder;
        mailSearchInput.value = "";
        renderMailFolders();
        renderMailList();
      });
    });
}

function visibleMails() {
  const q = mailSearchInput.value.trim().toLowerCase();
  return mails.filter((m) => {
    const inFolder = m.folder === activeMailFolder;
    const matchesQuery =
      !q ||
      m.subject.toLowerCase().includes(q) ||
      (m.preview || "").toLowerCase().includes(q) ||
      m.sender.toLowerCase().includes(q) ||
      (m.to || "").toLowerCase().includes(q);
    return inFolder && matchesQuery;
  });
}

function renderMailList() {
  const filtered = visibleMails();
  const folderLabel = mailFolders.find((f) => f.id === activeMailFolder)?.label || "보낸메일함";
  $("#mail-list-title").textContent = folderLabel;

  mailListEl.innerHTML = filtered
    .map(
      (m) => `
      <li class="mail-row ${m.unread ? "unread" : ""} ${m.starred ? "starred" : ""}" data-id="${m.id}">
        <span class="mail-dot"></span>
        <button class="mail-star" aria-label="중요 표시" data-id="${m.id}">
          <svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6-4.5-4.1 6-.7z"/></svg>
        </button>
        <span class="mail-sender">${escapeHtml(m.to || m.sender)}</span>
        <span class="mail-subject-wrap">
          <span class="mail-subject">${escapeHtmlAllowEmphasis(m.subject)}</span>
        </span>
        <span class="mail-date">${escapeHtml(m.date)}</span>
      </li>`
    )
    .join("");

  mailListEl.querySelectorAll(".mail-star").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const mail = mails.find((m) => m.id === btn.dataset.id);
      mail.starred = !mail.starred;
      renderMailList();
    });
  });

  mailListEl.querySelectorAll(".mail-row").forEach((row) => {
    row.addEventListener("click", () => openMail(row.dataset.id));
  });
}

function youtubeIdFromUrl(url) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  return m ? m[1] : null;
}

function youtubePlaylistIdFromUrl(url) {
  const m = url.match(/[?&]list=([\w-]+)/);
  return m ? m[1] : null;
}

function embedHtml(embed) {
  if (embed.type === "youtube") {
    const id = youtubeIdFromUrl(embed.url);
    if (!id) return "";
    return `<div class="video-embed-wrap"><iframe src="https://www.youtube.com/embed/${id}" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
  }
  if (embed.type === "instagram") {
    return `<blockquote class="instagram-media" data-instgrm-permalink="${embed.url}" data-instgrm-captioned data-instgrm-version="14"></blockquote>`;
  }
  return "";
}

function loadInstagramEmbedScript() {
  if (window.instgrm) {
    window.instgrm.Embeds.process();
    return;
  }
  if (document.getElementById("instagram-embed-script")) return;
  const script = document.createElement("script");
  script.id = "instagram-embed-script";
  script.async = true;
  script.src = "https://www.instagram.com/embed.js";
  script.onload = () => window.instgrm && window.instgrm.Embeds.process();
  document.body.appendChild(script);
}

function postCardHtml(post) {
  const link = post.url
    ? `<a class="mail-post-link" href="${post.url}" target="_blank" rel="noopener">원본 게시물 보기 →</a>`
    : "";
  const mediaHtml = post.video
    ? `<video class="mail-post-video" src="${post.video}" ${post.image ? `poster="${post.image}"` : ""} controls playsinline preload="metadata"></video>`
    : `<div class="mail-post-image" style="background-image:url('${post.image}')"></div>`;
  const hasBody = post.handle || post.caption || post.url;
  const bodyHtml = hasBody
    ? `<div class="mail-post-body">
      ${post.handle ? `<p class="mail-post-handle">${escapeHtml(post.handle)}</p>` : ""}
      ${post.caption ? `<p class="mail-post-caption">${escapeHtml(post.caption)}</p>` : ""}
      ${link}
    </div>`
    : "";
  return `<div class="mail-post-card${post.url ? "" : " no-link"}">
    ${mediaHtml}
    ${bodyHtml}
  </div>`;
}

function openMail(id) {
  const mail = mails.find((m) => m.id === id);
  if (!mail) return;
  activeMailId = id;
  if (mail.unread) {
    mail.unread = false;
    renderMailFolders();
    renderMailList();
  }

  if (mail.labelColor) {
    $("#mail-detail-content").style.setProperty("--mail-label-accent", mail.labelColor);
  } else {
    $("#mail-detail-content").style.removeProperty("--mail-label-accent");
  }

  $("#mail-detail-subject").innerHTML = escapeHtmlAllowEmphasis(mail.subject);
  $("#mail-detail-sender").textContent = mail.to ? `${mail.sender} → ${mail.to}` : mail.sender;
  $("#mail-detail-date").textContent = mail.date;

  const images = mail.images || [];
  let imagesHtml = "";
  if (mail.gallery === "browser" && images.length) {
    const [hero, ...rest] = images;
    const heroHtml = `<div class="browser-hero">
      <div class="browser-hero-bar">
        <span class="browser-hero-dot"></span><span class="browser-hero-dot"></span><span class="browser-hero-dot"></span>
      </div>
      <button type="button" class="browser-hero-image" style="background-image:url('${hero}')" data-src="${hero}" aria-label="크게 보기"></button>
    </div>`;
    const filmItems = rest.map((src) => `<img class="filmstrip-thumb" src="${src}" alt="" loading="lazy" />`);
    const filmHtml = rest.length
      ? `<div class="browser-filmstrip">${filmItems.join('<span class="filmstrip-arrow">›</span>')}</div>`
      : "";
    imagesHtml = heroHtml + filmHtml;
  } else {
    const galleryClass = mail.gallery === "sns" ? " sns-grid" : "";
    imagesHtml = images.length
      ? `<div class="mail-images${galleryClass}">${images
          .map((src) => `<button type="button" class="mail-image-thumb" style="background-image:url('${src}')" data-src="${src}" aria-label="첨부 이미지 크게 보기"></button>`)
          .join("")}</div>`
      : "";
  }

  const embeds = mail.embeds || [];
  const embedsHtml = embeds.length
    ? `<div class="mail-embeds">${embeds.map(embedHtml).join("")}</div>`
    : "";

  const posts = mail.posts || [];
  const captionClampStyle = mail.captionLines ? ` style="--caption-clamp:${mail.captionLines}"` : "";
  const postsGridClass = mail.tightPosts ? "mail-posts tight" : "mail-posts";
  const postsHtml = posts.length
    ? `<div class="${postsGridClass}"${captionClampStyle}>${posts.map(postCardHtml).join("")}</div>`
    : "";

  let bodyHtml;
  if (mail.body.includes("[[EMBEDS]]")) {
    let embedMarkerIndex = 0;
    bodyHtml = mail.body
      .split(/(\[\[POSTS\]\]|\[\[EMBEDS\]\])/)
      .map((part) => {
        if (part === "[[POSTS]]") return postsHtml;
        if (part === "[[EMBEDS]]") {
          const e = embeds[embedMarkerIndex++];
          return e ? `<div class="mail-embeds">${embedHtml(e)}</div>` : "";
        }
        return paragraphsToHtml(part);
      })
      .join("");
  } else if (mail.body.includes("[[POSTS]]")) {
    bodyHtml = mail.body
      .split("[[POSTS]]")
      .map((part) => paragraphsToHtml(part))
      .join(embedsHtml + postsHtml);
  } else {
    bodyHtml = embedsHtml + postsHtml + paragraphsToHtml(mail.body);
  }

  $("#mail-detail-content").innerHTML = bodyHtml + imagesHtml;
  const mailImageBtns = $("#mail-detail-content").querySelectorAll(".mail-image-thumb, .browser-hero-image");
  const mailGallery = Array.from(mailImageBtns).map((btn) => btn.dataset.src);
  mailImageBtns.forEach((btn) => btn.addEventListener("click", () => openLightbox(btn.dataset.src, mailGallery)));

  if (embeds.some((e) => e.type === "instagram")) {
    loadInstagramEmbedScript();
  }

  $("#mail-star-btn").classList.toggle("active", !!mail.starred);

  mailMainEl.classList.add("detail-open");
  $("#mail-detail-pane").scrollTop = 0;
}

$("#mail-back-btn").addEventListener("click", () => {
  mailMainEl.classList.remove("detail-open");
});

$("#mail-star-btn").addEventListener("click", () => {
  const mail = mails.find((m) => m.id === activeMailId);
  if (!mail) return;
  mail.starred = !mail.starred;
  $("#mail-star-btn").classList.toggle("active", mail.starred);
  renderMailList();
});

mailSearchInput.addEventListener("input", renderMailList);

// 메일 클라이언트가 연결되어 있지 않은 방문자를 위해, 주소를 클립보드에도 함께 복사
let toastTimer = null;
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

// ---------------------------------------------------------
// 이메일 주소 모달
// ---------------------------------------------------------
const contactOverlay = $("#contact-overlay");

function openContactModal() {
  contactOverlay.classList.add("open");
}
function closeContactModal() {
  contactOverlay.classList.remove("open");
}

$("#compose-btn").addEventListener("click", openContactModal);
$("#contact-close").addEventListener("click", closeContactModal);
contactOverlay.addEventListener("click", (e) => {
  if (e.target === contactOverlay) closeContactModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && contactOverlay.classList.contains("open")) closeContactModal();
});

$("#contact-copy").addEventListener("click", () => {
  showToast("이메일 주소가 복사됐어요: apome@naver.com");
  navigator.clipboard?.writeText?.("apome@naver.com").catch(() => {});
});

// ---------------------------------------------------------
// 첨부 이미지 라이트박스
// ---------------------------------------------------------
const lightbox = $("#image-lightbox");
const lightboxImg = $("#lightbox-img");
let lightboxGallery = [];
let lightboxIndex = 0;

function openLightbox(src, gallery) {
  lightboxGallery = gallery && gallery.length ? gallery : [src];
  lightboxIndex = Math.max(0, lightboxGallery.indexOf(src));
  lightboxImg.src = src;
  lightbox.classList.add("open");
}
function showLightboxAt(index) {
  if (!lightboxGallery.length) return;
  lightboxIndex = (index + lightboxGallery.length) % lightboxGallery.length;
  lightboxImg.src = lightboxGallery[lightboxIndex];
}
function closeLightbox() {
  lightbox.classList.remove("open");
  lightboxImg.src = "";
}
$("#lightbox-close").addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener("keydown", (e) => {
  if (!lightbox.classList.contains("open")) return;
  if (e.key === "Escape") closeLightbox();
  else if (e.key === "ArrowRight") { e.preventDefault(); showLightboxAt(lightboxIndex + 1); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); showLightboxAt(lightboxIndex - 1); }
});

// ---------------------------------------------------------
// 콘텐츠 불러오기 (content/notes.json, content/mails.json)
// CMS(관리자 페이지)에서 수정한 내용이 이 파일들에 반영됩니다.
// ---------------------------------------------------------
async function loadContent() {
  const [notesData, mailsData, siteData, meData, memoriesData] = await Promise.all([
    fetch("content/notes.json").then((r) => r.json()),
    fetch("content/mails.json").then((r) => r.json()),
    fetch("content/site.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    fetch("content/me.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    fetch("content/memories.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
  ]);

  folders = [{ id: "all", label: "모든 메모" }, ...(notesData.folders || [])];
  notes = notesData.items || [];
  notes.forEach((n, i) => {
    if (!n.id) n.id = `note-${i}`;
    if (n.checklist) n.checklist.forEach((c, ci) => { c._uid = ci; });
  });

  mailFolders = mailsData.folders || [];
  mails = mailsData.items || [];
  mails.forEach((m, i) => {
    if (!m.id) m.id = `mail-${i}`;
  });

  renderFolders();
  renderList();
  ensureDesktopSelection();

  renderMailFolders();
  renderMailList();

  renderProfile(meData);
  renderMemoryGrid(memoriesData.items || [], memoriesData.hint);

  initMusicWidget(siteData.musicUrl);
}

let wordTooltipEl = null;
function showWordTooltip(target) {
  if (!wordTooltipEl) {
    wordTooltipEl = document.createElement("div");
    wordTooltipEl.className = "word-tooltip";
    document.body.appendChild(wordTooltipEl);
  }
  wordTooltipEl.textContent = target.dataset.definition;
  const rect = target.getBoundingClientRect();
  wordTooltipEl.style.left = `${rect.left + rect.width / 2}px`;
  wordTooltipEl.style.top = `${rect.top}px`;
  wordTooltipEl.classList.add("visible");
}
function hideWordTooltip() {
  if (wordTooltipEl) wordTooltipEl.classList.remove("visible");
}

function renderProfile(me) {
  const lines = me.stampLines || [];
  const defs = me.definitions || {};
  $("#stamp-stack").innerHTML = lines
    .map((line, i) => {
      const indent = `margin-left:${i * 9}px`;
      if (defs[line]) {
        return `<p class="stamp-line stamp-line-defined" style="${indent}" data-definition="${escapeHtml(defs[line])}">${escapeHtml(line)}</p>`;
      }
      return `<p class="stamp-line" style="${indent}">${escapeHtml(line)}</p>`;
    })
    .join("");
  $("#stamp-stack")
    .querySelectorAll(".stamp-line-defined")
    .forEach((el) => {
      el.addEventListener("mouseenter", () => showWordTooltip(el));
      el.addEventListener("mouseleave", hideWordTooltip);
    });
}

function renderMemoryGrid(items, hint) {
  const grid = $("#memory-grid");
  if (!items.length) {
    grid.innerHTML = `<p class="memory-empty">아직 추가된 기억이 없습니다.</p>`;
    return;
  }
  const cards = items
    .map((it, i) => {
      const code = `M · ${String(i + 1).padStart(2, "0")}`;
      const label = it.caption ? `${code} — ${escapeHtml(it.caption)}` : code;
      return `<button type="button" class="stamp-card" data-src="${it.image}" aria-label="${escapeHtml(it.caption || "사진")} 크게 보기">
        <span class="stamp-frame"><img src="${it.image}" alt="" loading="lazy" /></span>
        <span class="stamp-label">${label}</span>
      </button>`;
    })
    .join("");
  grid.innerHTML = `
    <div class="stamp-grid">${cards}</div>
    <p class="memory-hint">${escapeHtml(hint || "사진을 눌러 크게 보기")}</p>
  `;
  const stampBtns = grid.querySelectorAll(".stamp-card");
  const stampGallery = Array.from(stampBtns).map((btn) => btn.dataset.src);
  stampBtns.forEach((btn) => btn.addEventListener("click", () => openLightbox(btn.dataset.src, stampGallery)));
}

loadContent().catch((err) => {
  console.error("콘텐츠 로드 실패:", err);
  const el = document.createElement("div");
  el.className = "load-error-banner";
  el.innerHTML = `
    <p>콘텐츠를 불러오지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요.</p>
    <button type="button">새로고침</button>
  `;
  el.querySelector("button").addEventListener("click", () => location.reload());
  document.body.appendChild(el);
});

/* ================= 배경음악 위젯 ================= */
let ytPlayer = null;
let ytPendingPlay = false;

function initMusicWidget(musicUrl) {
  const icon = document.getElementById("music-icon");
  const videoId = musicUrl && youtubeIdFromUrl(musicUrl);
  const playlistId = musicUrl && !videoId && youtubePlaylistIdFromUrl(musicUrl);
  if (!icon || (!videoId && !playlistId)) return;

  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);

  window.onYouTubeIframeAPIReady = () => {
    const playerVars = videoId
      ? { loop: 1, playlist: videoId, controls: 0, disablekb: 1, modestbranding: 1, rel: 0, fs: 0, iv_load_policy: 3 }
      : { listType: "playlist", list: playlistId, loop: 1, controls: 0, disablekb: 1, modestbranding: 1, rel: 0, fs: 0, iv_load_policy: 3 };
    ytPlayer = new YT.Player("yt-player-container", {
      ...(videoId ? { videoId } : {}),
      playerVars,
      events: {
        onReady: (e) => {
          if (ytPendingPlay) {
            ytPendingPlay = false;
            e.target.playVideo();
          }
        },
        onStateChange: (e) => {
          icon.classList.toggle("playing", e.data === YT.PlayerState.PLAYING);
          if (playlistId && e.data === YT.PlayerState.ENDED) {
            const list = e.target.getPlaylist();
            if (list && list.length) {
              const next = (e.target.getPlaylistIndex() + 1) % list.length;
              e.target.playVideoAt(next);
            }
          }
        },
      },
    });
  };

  icon.addEventListener("click", () => {
    if (!ytPlayer || typeof ytPlayer.getPlayerState !== "function") {
      ytPendingPlay = true;
      icon.classList.add("playing");
      return;
    }
    const state = ytPlayer.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
      ytPlayer.pauseVideo();
    } else {
      ytPlayer.playVideo();
    }
  });
}
