
// ==========================================
// 상태 관리 (State)
// ==========================================
let currentUser = null;
let currentRole = null;
let isAuthorized = false;

let postCache = { community: [], notice: [] };
const ITEMS_PER_PAGE = 5;
let galleryItems = [];
let galleryPage = 1;
const IMAGES_PER_LOAD = 12;

// ==========================================
// 도우미 함수 
// ==========================================
const getEl = (id) => document.getElementById(id);
const getByteLength = (s) => {
    let b = 0, i, c;
    for (b = i = 0; c = s.charCodeAt(i++); b += c >> 7 ? 2 : 1);
    return b;
};

// ★ 날짜 포맷팅 함수 (두 줄)
// 입력: 2026-01-21T12:25:00.000Z -> "26.1.21<br>12:25"
function formatDateTwoLines(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);
    const yy = d.getFullYear().toString().slice(2);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');

    return `${yy}.${m}.${day}<br>${hh}:${mm}`;
}

// 오늘 날짜인지 체크 (Red Dot 용)
function isToday(isoString) {
    if (!isoString) return false;
    const d = new Date(isoString);
    const today = new Date();
    return d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();
}


function setupByteCounter(inputId, counterId, maxBytes, submitBtnId) {
    const input = getEl(inputId);
    const counter = getEl(counterId);
    const btn = getEl(submitBtnId);
    if (!input || !counter) return;

    const update = () => {
        const len = getByteLength(input.value);
        counter.innerText = `${len} / ${maxBytes}`;
        if (len > maxBytes) {
            counter.classList.add('over');
            input.style.borderColor = "#ff4757";
            if (btn) btn.disabled = true;
        } else {
            counter.classList.remove('over');
            input.style.borderColor = "#ddd";
            if (btn) btn.disabled = false;
        }
    };
    input.addEventListener('input', update);
}

// ==========================================
// 초기화
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const rememberedId = localStorage.getItem('remembered_id');
    const rememberedPw = localStorage.getItem('remembered_pw');
    if (rememberedId) {
        getEl('login-id').value = rememberedId;
        getEl('remember-me').checked = true;
        if (rememberedPw) getEl('login-pw').value = rememberedPw;
    }

    const savedUser = localStorage.getItem('user_name');
    const savedRole = localStorage.getItem('user_role');
    if (savedUser) {
        currentUser = savedUser;
        currentRole = savedRole;
        isAuthorized = true;
        updateUI_LoggedIn(savedUser, savedRole);
    } else {
        isAuthorized = false;
    }

    checkNewContent();
    setupInfiniteScroll();

    document.querySelectorAll('.nav-links li').forEach(li => {
        li.addEventListener('click', () => {
            if (li.id === 'login-link') {
                if (currentUser) {
                    if (confirm("로그아웃 하시겠습니까?")) {
                        localStorage.removeItem('user_name');
                        localStorage.removeItem('user_role');
                        location.reload();
                    }
                } else {
                    navigateTo('auth');
                    toggleAuthMode('login');
                }
            }
        });
    });

    const fileInput = getEl('gallery-file');
    if (fileInput) {
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            const btn = getEl('btn-gallery-submit');
            if (file) {
                if (!file.name.toLowerCase().match(/\.(jpg|jpeg|png)$/i)) {
                    alert("이미지 파일만 가능합니다! (png, jpg, jpeg)");
                    fileInput.value = ''; return;
                }
                if (file.size > 5 * 1024 * 1024) {
                    alert("파일 크기가 5MB를 넘습니다!");
                    fileInput.value = ''; return;
                }
                if (btn) { btn.disabled = false; btn.innerText = "올리기"; }
            }
        });
    }

    const loginForm = getEl('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = getEl('btn-login');
            btn.innerText = "로그인..."; btn.disabled = true;
            await handleLogin(getEl('login-id').value, getEl('login-pw').value);
            btn.innerText = "로그인"; btn.disabled = false;
        });
    }

    if (getEl('signup-form')) {
        getEl('signup-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = getEl('btn-signup');
            btn.innerText = "가입 신청..."; btn.disabled = true;
            await handleSignup();
            btn.innerText = "가입 신청"; btn.disabled = false;
        });
    }

    setupByteCounter('comm-title', 'comm-title-byte', 30, 'btn-comm-submit');
    setupByteCounter('comm-content', 'comm-content-byte', 3000, 'btn-comm-submit');
    setupByteCounter('gallery-title', 'gallery-title-byte', 30, 'btn-gallery-submit');
    setupByteCounter('notice-title', 'notice-title-byte', 30, 'btn-notice-submit');
    setupByteCounter('notice-content', 'notice-content-byte', 3000, 'btn-notice-submit');

    navigateTo('home');
});

// ==========================================
// 알림 점 (Red Dot)
// ==========================================
async function checkNewContent() {
    // 오늘 날짜 문자열은 로컬 저장용
    const todayStr = new Date().toISOString().split('T')[0];
    checkDot('community', 'Post', todayStr);
    checkDot('notice', 'Notice', todayStr);
    checkDot('gallery', 'Gallery', todayStr);
}

async function checkDot(key, type, todayStr) {
    const lastRead = localStorage.getItem(`read_date_${key}`);
    if (lastRead === todayStr) return;

    try {
        const res = await fetch(`${CONFIG.API_URL}?type=${type}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
            if (key === 'gallery') galleryItems = data;
            else postCache[key] = data;

            // ★ isToday 함수로 정확하게 비교
            if (isToday(data[0].date)) {
                getEl(`dot-${key}`).style.display = 'block';
            }
        }
    } catch (e) { }
}

function markAsRead(key) {
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.setItem(`read_date_${key}`, todayStr);
    const dot = getEl(`dot-${key}`);
    if (dot) dot.style.display = 'none';
}

function navigateTo(pageId) {
    if (pageId === 'auth' || pageId === 'home') { showPage(pageId); return; }
    if (['community', 'notice', 'gallery'].includes(pageId)) markAsRead(pageId);
    showPage(pageId);
    if (pageId === 'community') loadBoard('community');
    if (pageId === 'notice') loadBoard('notice');
    if (pageId === 'gallery') loadGallery();
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
    const targetPage = getEl(pageId);
    if (targetPage) targetPage.classList.add('active');
}

function closeModal(modalId) {
    getEl(modalId).style.display = 'none';
}


// ==========================================
// 인증 
// ==========================================
window.toggleAuthMode = (mode) => {
    getEl('login-view').style.display = (mode === 'login') ? 'block' : 'none';
    getEl('signup-view').style.display = (mode === 'signup') ? 'block' : 'none';
};

async function handleLogin(id, pw) {
    if (!id || !pw) return alert("입력하세요.");
    try {
        const url = `${CONFIG.API_URL}?action=login&id=${id}&pw=${pw}`;
        const res = await fetch(url);
        const text = await res.text();
        let json; try { json = JSON.parse(text); } catch (e) { alert("서버 오류 (HTML):\n" + text.substring(0, 100)); return; }

        if (json.success) {
            if (getEl('remember-me').checked) {
                localStorage.setItem('remembered_id', id);
                localStorage.setItem('remembered_pw', pw);
            } else {
                localStorage.removeItem('remembered_id');
                localStorage.removeItem('remembered_pw');
            }
            currentUser = json.name;
            currentRole = json.role || 'Student';
            isAuthorized = true;
            localStorage.setItem('user_name', currentUser);
            localStorage.setItem('user_role', currentRole);
            alert(`${json.name}님 환영합니다!`);
            updateUI_LoggedIn(currentUser, currentRole);
        } else {
            if (json.code === "PENDING") alert("승인 대기중인 회원입니다.");
            else if (json.code === "WRONG_PW") alert("비밀번호가 틀렸습니다.");
            else if (json.code === "NO_ID") alert("존재하지 않는 회원입니다.");
            else alert("로그인 실패:\n" + (json.error || "알 수 없는 오류"));
        }
    } catch (err) { alert("통신 오류:\n" + err.message); }
}

async function handleSignup() {
    const id = getEl('signup-id').value;
    const pw = getEl('signup-pw').value;
    const name = getEl('signup-name').value;
    if (!name || name.trim().length === 0) return alert("이름을 써주세요!");
    if (id.length !== 4) return alert("학번은 4자리를 입력해주세요 (예: 1213)");
    const pwRegex = /^(?=.*[\W_]).{8,}$/;
    if (!pwRegex.test(pw)) return alert("비밀번호 조건 확인!\n(8자리 이상, 특수문자 1개 이상)");

    try {
        const url = `${CONFIG.API_URL}?action=signup&id=${id}&pw=${pw}&name=${name}`;
        const res = await fetch(url);
        const text = await res.text();
        let json; try { json = JSON.parse(text); } catch (e) { alert("서버 오류:\n" + text.substring(0, 100)); return; }

        if (json.success) {
            alert("가입 신청 완료!\n선생님의 승인을 기다려주세요.");
            toggleAuthMode('login');
        } else {
            if (json.code === "EXISTS") alert("이미 가입된 학번입니다.");
            else alert("가입 실패:\n" + (json.error || ""));
        }
    } catch (e) { alert("오류: " + e.message); }
}

function updateUI_LoggedIn(name, role) {
    const link = getEl('login-link');
    link.innerHTML = `👤 ${name}`;
    if (getEl('btn-community-write')) getEl('btn-community-write').style.display = 'inline-block';
    if (getEl('btn-gallery-write')) getEl('btn-gallery-write').style.display = 'inline-block';
    if ((role === 'Teacher' || name.includes("선생님")) && getEl('btn-notice-write')) getEl('btn-notice-write').style.display = 'inline-block';
    navigateTo('home');
}

// ==========================================
// 게시판 로직
// ==========================================
if (getEl('btn-community-write')) getEl('btn-community-write').onclick = () => getEl('community-write-modal').style.display = 'flex';
if (getEl('btn-notice-write')) getEl('btn-notice-write').onclick = () => getEl('notice-write-modal').style.display = 'flex';

window.submitCommunityPost = () => submitPostGeneric('comm', 'Post');
window.submitNoticePost = () => submitPostGeneric('notice', 'Notice');

async function submitPostGeneric(prefix, type) {
    const title = getEl(`${prefix}-title`).value;
    const content = getEl(`${prefix}-content`).value;
    if (!title || !content) return alert("입력하세요");
    closeModal(`${prefix === 'comm' ? 'community' : 'notice'}-write-modal`);

    // ★ 날짜를 서버 타임으로 보여주기 위해 새로고침하거나(권장),
    // 임시로 현재 시간을 넣어줄 수도 있습니다. 여기선 임시로 현재 시간 포맷팅해서 보여줍니다.
    const tempDate = new Date().toISOString();

    const newPost = {
        title, content, author: currentUser, date: tempDate, isNew: true
    };
    const boardKey = (type === 'Post') ? 'community' : 'notice';
    postCache[boardKey].unshift(newPost);
    renderBoard(boardKey, 1);

    try {
        await fetch(CONFIG.API_URL, {
            method: 'POST',
            body: JSON.stringify({ Title: title, Content: content, Author: currentUser, Type: type })
        });
        // 저장 후 실제 서버 시간으로 업데이트하기 위해 백그라운드 리로드
        loadBoard(boardKey === 'community' ? 'community' : 'notice');
    } catch (e) { alert("서버 저장 실패"); }
}

async function loadBoard(boardName) {
    const type = boardName === 'community' ? 'Post' : 'Notice';
    const list = getEl(boardName === 'community' ? 'community-list' : 'notice-container');

    if (postCache[boardName].length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px;">로딩중...</div>';
        try {
            const res = await fetch(`${CONFIG.API_URL}?type=${type}`);
            const data = await res.json();
            if (Array.isArray(data)) postCache[boardName] = data;
        } catch (e) {
            list.innerHTML = '로딩 실패';
        }
    }
    renderBoard(boardName, 1);
}

function renderBoard(boardName, page) {
    const list = getEl(boardName === 'community' ? 'community-list' : 'notice-container');
    const pagination = getEl(boardName === 'community' ? 'community-pagination' : 'notice-pagination');
    list.innerHTML = '';
    pagination.innerHTML = '';

    const allPosts = postCache[boardName];
    if (allPosts.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px;">글이 없습니다.</div>';
        return;
    }

    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pagePosts = allPosts.slice(start, end);

    pagePosts.forEach(post => {
        const card = document.createElement('div');
        card.className = "post-card";
        let blurClass = isAuthorized ? '' : 'blur-it';
        let preview = post.content || "";
        if (getByteLength(preview) > 50) preview = preview.substring(0, 30) + "...";

        // ★ 날짜 포맷 적용 (두 줄)
        const dateStr = formatDateTwoLines(post.date);

        let contentHtml = `
            <div class="${blurClass}">
                <div class="post-header">
                    <span class="post-title">${post.title}</span>
                    <span class="post-date" style="text-align:right; line-height:1.2; font-size:0.8rem;">${dateStr}</span>
                </div>
                <div class="post-body-preview">${preview}</div>
                <div class="post-author">${post.author}</div>
            </div>
        `;
        if (!isAuthorized) {
            contentHtml += `
                <div class="stamp-overlay">
                    <div class="stamp-text-1">가입/승인</div>
                    <div class="stamp-text-2">후</div>
                    <div class="stamp-text-3">열람!</div>
                </div>
            `;
            card.onclick = () => alert("회원가입 후 승인을 받아야 볼 수 있습니다.");
        } else {
            card.onclick = () => openDetail(post);
            if (post.isNew) card.style.border = "2px solid var(--primary)";
        }
        card.innerHTML = contentHtml;
        list.appendChild(card);
    });

    const totalPages = Math.ceil(allPosts.length / ITEMS_PER_PAGE);
    if (totalPages > 1) {
        if (page > 1) {
            const btn = document.createElement('button');
            btn.className = "page-btn"; btn.innerText = "<";
            btn.onclick = () => renderBoard(boardName, page - 1);
            pagination.appendChild(btn);
        }
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.className = `page-btn ${i === page ? 'active' : ''}`;
            btn.innerText = i;
            btn.onclick = () => renderBoard(boardName, i);
            pagination.appendChild(btn);
        }
        if (page < totalPages) {
            const btn = document.createElement('button');
            btn.className = "page-btn"; btn.innerText = ">";
            btn.onclick = () => renderBoard(boardName, page + 1);
            pagination.appendChild(btn);
        }
    }
}

function openDetail(post) {
    if (!isAuthorized) return;
    const dateStr = formatDateTwoLines(post.date).replace('<br>', ' '); // 상세에서는 한 줄로
    getEl('detail-title').innerText = post.title;
    getEl('detail-meta').innerText = `작성자: ${post.author} | 일시: ${dateStr}`;
    getEl('detail-body').innerText = post.content;
    getEl('post-detail-modal').style.display = 'flex';
}

// 갤러리 로직 생략 (동일)
// ... (갤러리 로직은 이전과 동일하되, isToday 함수만 활용)
if (getEl('btn-gallery-write')) getEl('btn-gallery-write').onclick = () => {
    getEl('gallery-write-modal').style.display = 'flex';
    getEl('gallery-title').value = '';
    getEl('gallery-file').value = '';
    const btn = getEl('btn-gallery-submit');
    if (btn) { btn.innerText = "올리기"; btn.disabled = false; }
};

window.submitGalleryPost = async () => {
    const title = getEl('gallery-title').value;
    const file = getEl('gallery-file').files[0];
    if (!title || !file) return alert("입력하세요");

    const btn = getEl('btn-gallery-submit');
    btn.innerText = "업로드 중... (잠시만요!)"; btn.disabled = true;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64Data = e.target.result.split(',')[1];
        try {
            const res = await fetch(CONFIG.API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    Title: title,
                    Author: currentUser,
                    Type: 'Gallery',
                    Image: base64Data,
                    MimeType: file.type
                })
            });
            const text = await res.text();
            let json; try { json = JSON.parse(text); } catch (err) { throw new Error(text.substring(0, 100)); }

            if (json.success) {
                closeModal('gallery-write-modal');
                alert("사진이 등록되었습니다!");
                loadGallery(true);
            } else {
                alert("업로드 실패:\n" + (json.error || ""));
            }
        } catch (err) { alert("통신 오류: " + err.message); } finally { if (btn) { btn.innerText = "올리기"; btn.disabled = false; } }
    };
    reader.readAsDataURL(file);
};

// ... (나머지 갤러리 렌더링도 날짜 포맷팅 적용 가능하나, 갤러리는 보통 날짜를 잘 안 보여주거나 툴팁으로 처리합니다. 현재 요구사항은 게시판 위주로 반영.)
async function loadGallery(reload = false) {
    if (reload) { galleryItems = []; galleryPage = 1; getEl('gallery-grid').innerHTML = ''; }
    if (galleryItems.length === 0) {
        try {
            const res = await fetch(`${CONFIG.API_URL}?type=Gallery`);
            const data = await res.json();
            if (Array.isArray(data)) galleryItems = data;
        } catch (e) { }
    }
    renderGalleryChunk();
}
function loadMoreGallery() { if (galleryItems.length > 0 && document.querySelectorAll('.gallery-item').length < galleryItems.length) { galleryPage++; renderGalleryChunk(); } }
function renderGalleryChunk() {
    const grid = getEl('gallery-grid');
    const limit = galleryPage * IMAGES_PER_LOAD;
    const nextBatch = galleryItems.slice(grid.querySelectorAll('.gallery-item').length, limit);
    nextBatch.forEach(item => {
        const imgSrc = (item.content && item.content.startsWith('http')) ? item.content : "https://via.placeholder.com/300?text=No+Image";
        const div = document.createElement('div');
        div.className = "gallery-item";
        let contentHtml = '';
        if (!isAuthorized) {
            contentHtml = `<img src="${imgSrc}" class="blur-it"><div class="stamp-overlay" style="width:140px; height:140px; font-size:1.2rem;"><div class="stamp-text-1">가입/승인</div><div class="stamp-text-2">후</div><div class="stamp-text-3">열람!</div></div>`;
            div.onclick = () => alert("회원가입 후 승인을 받아야 볼 수 있습니다.");
        } else {
            contentHtml = `<img src="${imgSrc}" loading="lazy"><div class="gallery-overlay"><span class="gallery-title">${item.title}</span><span class="gallery-author">${item.author}</span></div>`;
            div.onclick = () => openImageViewer(imgSrc);
        }
        div.innerHTML = contentHtml;
        grid.appendChild(div);
    });
}
function openImageViewer(src) { if (!isAuthorized) return; getEl('viewer-img').src = src; getEl('image-viewer-modal').style.display = 'flex'; }
window.openLunchModal = () => getEl('lunch-modal').style.display = 'flex';