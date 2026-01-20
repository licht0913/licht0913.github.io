
// ==========================================
// 상태 관리 (State)
// ==========================================
let currentUser = null;
let currentRole = null;
let isAuthorized = false;

let postCache = {
    community: [],
    notice: []
};
const ITEMS_PER_PAGE = 5;

// ==========================================
// 도우미 함수 (Helpers)
// ==========================================
const getEl = (id) => document.getElementById(id);

const getByteLength = (s) => {
    let b = 0, i, c;
    for (b = i = 0; c = s.charCodeAt(i++); b += c >> 7 ? 2 : 1);
    return b;
};

// 바이트 카운터
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

// 갤러리 로컬 저장 (사진 유지 핵심)
function saveGalleryLocal(item) {
    const saved = JSON.parse(localStorage.getItem('gallery_items') || "[]");
    saved.unshift(item); // 최신순
    // 로컬스토리지 용량 관리 (최대 20장까지만 저장)
    if (saved.length > 20) saved.pop();
    localStorage.setItem('gallery_items', JSON.stringify(saved));
}
function loadGalleryLocal() {
    return JSON.parse(localStorage.getItem('gallery_items') || "[]");
}

// ==========================================
// 초기화 및 이벤트
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. 아이디 기억하기 체크
    const rememberedId = localStorage.getItem('remembered_id');
    if (rememberedId) {
        getEl('login-id').value = rememberedId;
        getEl('remember-me').checked = true;
    }

    // 2. 로그인 상태 복구
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

    // 3. 메인 화면 초기화 (알림 점 체크)
    checkNewContent();

    // 네비게이션
    document.querySelectorAll('.nav-links li').forEach(li => {
        li.addEventListener('click', () => {
            if (li.id === 'login-link') {
                if (currentUser) {
                    if (confirm("로그아웃 하시겠습니까?")) {
                        // ★ 중요: 갤러리 데이터는 지우지 않고 세션만 지움
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

    // 로그인 폼
    const loginForm = getEl('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = getEl('btn-login');
            btn.innerText = "로그인...";
            btn.disabled = true;
            await handleLogin(getEl('login-id').value, getEl('login-pw').value);
            btn.innerText = "로그인";
            btn.disabled = false;
        });
    }

    // 회원가입 폼
    if (getEl('signup-form')) {
        getEl('signup-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = getEl('btn-signup');
            btn.innerText = "가입 신청...";
            btn.disabled = true;
            await handleSignup();
            btn.innerText = "가입 신청";
            btn.disabled = false;
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
// 알림 점 (Red Dot) 체크 로직
// ==========================================
async function checkNewContent() {
    const today = new Date().toISOString().split('T')[0];

    // 1. 커뮤니티 체크
    try {
        const res = await fetch(`${CONFIG.API_URL}?type=Post`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
            postCache['community'] = data; // 캐시 미리 저장
            if (data[0].date === today) getEl('dot-community').style.display = 'block';
        }
    } catch (e) { }

    // 2. 알림장 체크
    try {
        const res = await fetch(`${CONFIG.API_URL}?type=Notice`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
            postCache['notice'] = data;
            if (data[0].date === today) getEl('dot-notice').style.display = 'block';
        }
    } catch (e) { }

    // 3. 갤러리 체크 (로컬스토리지 기준)
    const galleryItems = loadGalleryLocal();
    if (galleryItems.length > 0 && galleryItems[0].date === today) {
        getEl('dot-gallery').style.display = 'block';
    }
}

// ==========================================
// 페이지 이동
// ==========================================
function navigateTo(pageId) {
    if (pageId === 'auth' || pageId === 'home') {
        showPage(pageId);
        return;
    }

    // ★ 권한 체크 없이 일단 페이지 보여줌 (블러 처리된 내용을 보여주기 위함)
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
// 인증 로직
// ==========================================
window.toggleAuthMode = (mode) => {
    getEl('login-view').style.display = (mode === 'login') ? 'block' : 'none';
    getEl('signup-view').style.display = (mode === 'signup') ? 'block' : 'none';
};

async function handleLogin(id, pw) {
    if (!id || !pw) return alert("입력하세요.");

    // 아이디 기억하기
    if (getEl('remember-me').checked) {
        localStorage.setItem('remembered_id', id);
    } else {
        localStorage.removeItem('remembered_id');
    }

    try {
        const url = `${CONFIG.API_URL}?action=login&id=${id}&pw=${pw}`;
        const res = await fetch(url);
        const json = await res.json();

        if (json.success) {
            currentUser = json.name;
            currentRole = json.role || 'Student';
            isAuthorized = true;

            localStorage.setItem('user_name', currentUser);
            localStorage.setItem('user_role', currentRole);

            alert(`${json.name}님 환영합니다!`);
            updateUI_LoggedIn(currentUser, currentRole);
        } else {
            if (json.code === "PENDING") alert("승인 대기중입니다.");
            else if (json.code === "WRONG_PW") alert("비밀번호 불일치");
            else alert("로그인 실패: " + json.error);
        }
    } catch (err) { alert("오류 발생"); }
}

async function handleSignup() {
    const id = getEl('signup-id').value;
    const pw = getEl('signup-pw').value;
    const name = getEl('signup-name').value;
    if (id.length !== 4) return alert("학번은 4자리");

    try {
        const url = `${CONFIG.API_URL}?action=signup&id=${id}&pw=${pw}&name=${name}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.success) {
            alert("신청 완료! 승인을 기다려주세요.");
            toggleAuthMode('login');
        } else alert("실패: " + json.error);
    } catch (e) { alert("오류"); }
}

function updateUI_LoggedIn(name, role) {
    const link = getEl('login-link');
    link.innerHTML = `👤 ${name}`;

    if (getEl('btn-community-write')) getEl('btn-community-write').style.display = 'inline-block';
    if (getEl('btn-gallery-write')) getEl('btn-gallery-write').style.display = 'inline-block';

    if (role === 'Teacher' || name.includes("선생님")) {
        if (getEl('btn-notice-write')) getEl('btn-notice-write').style.display = 'inline-block';
    }

    navigateTo('home');
}


// ==========================================
// 게시판 로직 (리얼 블러 + 페이징)
// ==========================================
// 글쓰기 버튼
if (getEl('btn-community-write')) getEl('btn-community-write').onclick = () => getEl('community-write-modal').style.display = 'flex';
if (getEl('btn-notice-write')) getEl('btn-notice-write').onclick = () => getEl('notice-write-modal').style.display = 'flex';

window.submitCommunityPost = () => submitPostGeneric('comm', 'Post');
window.submitNoticePost = () => submitPostGeneric('notice', 'Notice');

async function submitPostGeneric(prefix, type) {
    const title = getEl(`${prefix}-title`).value;
    const content = getEl(`${prefix}-content`).value;

    if (!title || !content) return alert("입력하세요");
    if (getByteLength(title) > 30 || getByteLength(content) > 3000) return alert("글자수 초과!");

    closeModal(`${prefix === 'comm' ? 'community' : 'notice'}-write-modal`);

    const newPost = {
        title, content, author: currentUser, date: new Date().toISOString().split('T')[0], isNew: true
    };

    const boardKey = (type === 'Post') ? 'community' : 'notice';
    postCache[boardKey].unshift(newPost);
    renderBoard(boardKey, 1);

    try {
        await fetch(CONFIG.API_URL, {
            method: 'POST',
            body: JSON.stringify({ Title: title, Content: content, Author: currentUser, Type: type })
        });
    } catch (e) { }
}

async function loadBoard(boardName) {
    const type = boardName === 'community' ? 'Post' : 'Notice';
    const list = getEl(boardName === 'community' ? 'community-list' : 'notice-container');

    // 데이터 없으면 로딩 표시
    if (postCache[boardName].length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px;">로딩중...</div>';
        try {
            const res = await fetch(`${CONFIG.API_URL}?type=${type}`);
            const data = await res.json();
            if (Array.isArray(data)) postCache[boardName] = data;
        } catch (e) {
            list.innerHTML = '로딩 실패';
            return;
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
        card.className = "post-card"; // 기본 클래스

        // ★ 리얼 블러 로직: 권한 없으면 blur-it 추가
        let contentHtml = '';
        let blurClass = isAuthorized ? '' : 'blur-it';

        // 미리보기
        let preview = post.content;
        if (getByteLength(preview) > 50) preview = preview.substring(0, 30) + "...";

        // 카드 내용
        contentHtml = `
            <div class="${blurClass}">
                <div class="post-header">
                    <span class="post-title">${post.title}</span>
                    <span class="post-date">${post.date}</span>
                </div>
                <div class="post-body-preview">${preview}</div>
                <div class="post-author">${post.author}</div>
            </div>
        `;

        // 권한 없으면 도장 찍기
        if (!isAuthorized) {
            contentHtml += `
                <div class="stamp-overlay">
                    <div class="stamp-text-1">가입/승인</div>
                    <div class="stamp-text-2">후</div>
                    <div class="stamp-text-3">열람!</div>
                </div>
            `;
            // 클릭 이벤트 막기 (혹은 경고창)
            card.onclick = () => alert("회원가입 후 승인을 받아야 볼 수 있습니다.");
        } else {
            card.onclick = () => openDetail(post);
            if (post.isNew) card.style.border = "2px solid var(--primary)";
        }

        card.innerHTML = contentHtml;
        list.appendChild(card);
    });

    // 페이지네이션
    const totalPages = Math.ceil(allPosts.length / ITEMS_PER_PAGE);
    if (totalPages > 1) {
        if (page > 1) {
            const btn = document.createElement('button');
            btn.className = "page-btn";
            btn.innerText = "<";
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
            btn.className = "page-btn";
            btn.innerText = ">";
            btn.onclick = () => renderBoard(boardName, page + 1);
            pagination.appendChild(btn);
        }
    }
}

function openDetail(post) {
    if (!isAuthorized) return;
    getEl('detail-title').innerText = post.title;
    getEl('detail-meta').innerText = `작성자: ${post.author} | 날짜: ${post.date}`;
    getEl('detail-body').innerText = post.content;
    getEl('post-detail-modal').style.display = 'flex';
}

// ==========================================
// 갤러리 로직
// ==========================================
if (getEl('btn-gallery-write')) getEl('btn-gallery-write').onclick = () => {
    getEl('gallery-write-modal').style.display = 'flex';
    getEl('gallery-title').value = '';
    getEl('gallery-file').value = '';
};

window.submitGalleryPost = async () => {
    const title = getEl('gallery-title').value;
    const file = getEl('gallery-file').files[0];

    if (!title || !file) return alert("입력하세요");
    if (file.size > 5 * 1024 * 1024) return alert("5MB 이하만 가능");
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) return alert("이미지 파일만 가능");

    closeModal('gallery-write-modal');

    const reader = new FileReader();
    reader.onload = async (e) => {
        const item = {
            title, author: currentUser, image: e.target.result, date: new Date().toISOString().split('T')[0]
        };
        saveGalleryLocal(item);
        loadGallery();

        await fetch(CONFIG.API_URL, {
            method: 'POST',
            body: JSON.stringify({ Title: title, Content: "(사진)", Author: currentUser, Type: 'Gallery' })
        });
    };
    reader.readAsDataURL(file);
};

function loadGallery() {
    const grid = getEl('gallery-grid');
    grid.innerHTML = '';

    const items = loadGalleryLocal();
    if (items.length === 0) {
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:20px; color:#888;">사진이 없습니다.</p>';
        return;
    }

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = "gallery-item";

        let contentHtml = '';

        if (!isAuthorized) {
            // 리얼 블러 처리
            contentHtml = `
                <img src="${item.image}" class="blur-it">
                <div class="stamp-overlay" style="width:80px; height:80px; font-size:0.7rem;">
                    <div class="stamp-text-1">가입/승인</div>
                    <div class="stamp-text-2">후</div>
                    <div class="stamp-text-3">열람!</div>
                </div>
            `;
            div.onclick = () => alert("회원가입 후 승인을 받아야 볼 수 있습니다.");
        } else {
            contentHtml = `
                <img src="${item.image}" loading="lazy">
                <div class="gallery-overlay">
                    <span class="gallery-title">${item.title}</span>
                    <span class="gallery-author">${item.author}</span>
                </div>
            `;
            div.onclick = () => openImageViewer(item.image);
        }

        div.innerHTML = contentHtml;
        grid.appendChild(div);
    });
}

function openImageViewer(src) {
    if (!isAuthorized) return;
    getEl('viewer-img').src = src;
    getEl('image-viewer-modal').style.display = 'flex';
}

window.openLunchModal = () => getEl('lunch-modal').style.display = 'flex';