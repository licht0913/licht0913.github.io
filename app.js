
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

// 갤러리 상태
let galleryItems = [];
let galleryPage = 1;
const IMAGES_PER_LOAD = 12; // 한 번에 12장씩 로딩 (4행 x 3열)

// ==========================================
// 도우미 함수 (Helpers)
// ==========================================
const getEl = (id) => document.getElementById(id);

const getByteLength = (s) => {
    let b = 0, i, c;
    for (b = i = 0; c = s.charCodeAt(i++); b += c >> 7 ? 2 : 1);
    return b;
};

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

// 갤러리 로컬 저장 (용량 관리: 최대 50장)
function saveGalleryLocal(item) {
    const saved = JSON.parse(localStorage.getItem('gallery_items') || "[]");
    saved.unshift(item);
    if (saved.length > 50) saved.pop();
    localStorage.setItem('gallery_items', JSON.stringify(saved));
}
function loadGalleryLocal() {
    return JSON.parse(localStorage.getItem('gallery_items') || "[]");
}

// ==========================================
// 초기화 및 이벤트
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. 아이디 기억하기
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

    // 3. 알림 점 체크 (페이지 로드 시)
    checkNewContent();

    // 4. 무한 스크롤 옵저버 설정
    setupInfiniteScroll();

    // 네비게이션
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

    // 폼 처리
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
// 알림 점 (Red Dot) 로직
// ==========================================
async function checkNewContent() {
    const today = new Date().toISOString().split('T')[0];

    // 로컬스토리지에 'read_date_community' 같은 키로 마지막 확인 날짜 저장
    // 오늘 날짜랑 다르면 새 글 체크

    checkDot('community', 'Post', today);
    checkDot('notice', 'Notice', today);

    // 갤러리 체크
    const items = loadGalleryLocal();
    const lastRead = localStorage.getItem('read_date_gallery');
    if (items.length > 0 && items[0].date === today && lastRead !== today) {
        getEl('dot-gallery').style.display = 'block';
    }
}

async function checkDot(key, type, today) {
    const lastRead = localStorage.getItem(`read_date_${key}`);

    // 이미 오늘 확인했으면 패스
    if (lastRead === today) return;

    try {
        const res = await fetch(`${CONFIG.API_URL}?type=${type}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
            postCache[key] = data; // 캐시
            if (data[0].date === today) {
                getEl(`dot-${key}`).style.display = 'block';
            }
        }
    } catch (e) { }
}

// 읽음 처리 (점을 사라지게 함)
function markAsRead(key) {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`read_date_${key}`, today);
    const dot = getEl(`dot-${key}`);
    if (dot) dot.style.display = 'none';
}


// ==========================================
// 페이지 이동
// ==========================================
function navigateTo(pageId) {
    if (pageId === 'auth' || pageId === 'home') {
        showPage(pageId);
        return;
    }

    // 접속 시 읽음 처리
    if (pageId === 'community') markAsRead('community');
    if (pageId === 'notice') markAsRead('notice');
    if (pageId === 'gallery') markAsRead('gallery');

    showPage(pageId);

    if (pageId === 'community') loadBoard('community');
    if (pageId === 'notice') loadBoard('notice');
    if (pageId === 'gallery') loadGallery(); // 갤러리는 초기화 후 로드
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

    if (getEl('remember-me').checked) localStorage.setItem('remembered_id', id);
    else localStorage.removeItem('remembered_id');

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
    if ((role === 'Teacher' || name.includes("선생님")) && getEl('btn-notice-write')) {
        getEl('btn-notice-write').style.display = 'inline-block';
    }
    navigateTo('home');
}


// ==========================================
// 게시판 (커뮤니티/알림)
// ==========================================
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
        card.className = "post-card";

        let blurClass = isAuthorized ? '' : 'blur-it';
        let preview = post.content;
        if (getByteLength(preview) > 50) preview = preview.substring(0, 30) + "...";

        let contentHtml = `
            <div class="${blurClass}">
                <div class="post-header">
                    <span class="post-title">${post.title}</span>
                    <span class="post-date">${post.date}</span>
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

    // 페이지네이션
    const totalPages = Math.ceil(allPosts.length / ITEMS_PER_PAGE);
    if (totalPages > 1) {
        if (page > 1) {
            // ... (생략 없이 이전 버튼 구현)
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
// 갤러리 로직 (무한 스크롤)
// ==========================================
if (getEl('btn-gallery-write')) getEl('btn-gallery-write').onclick = () => {
    getEl('gallery-write-modal').style.display = 'flex';
    getEl('gallery-title').value = '';
    getEl('gallery-file').value = '';
};

// 무한 스크롤 설정
function setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            loadMoreGallery();
        }
    });
    const loader = getEl('gallery-loader');
    if (loader) observer.observe(loader);
}

window.submitGalleryPost = async () => {
    const title = getEl('gallery-title').value;
    const file = getEl('gallery-file').files[0];
    if (!title || !file) return alert("입력하세요");
    if (file.size > 5 * 1024 * 1024) return alert("5MB 이하");

    closeModal('gallery-write-modal');

    const reader = new FileReader();
    reader.onload = async (e) => {
        const item = {
            title, author: currentUser, image: e.target.result, date: new Date().toISOString().split('T')[0]
        };
        saveGalleryLocal(item);

        // 업로드 하면 맨 처음부터 다시 로드하도록 초기화
        galleryPage = 1;
        loadGallery();

        await fetch(CONFIG.API_URL, {
            method: 'POST',
            body: JSON.stringify({ Title: title, Content: "(사진)", Author: currentUser, Type: 'Gallery' })
        });
    };
    reader.readAsDataURL(file);
};

function loadGallery() {
    galleryItems = loadGalleryLocal(); // 전체 로드
    galleryPage = 1; // 페이지 초기화

    const grid = getEl('gallery-grid');
    grid.innerHTML = ''; // 초기화

    if (galleryItems.length === 0) {
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:20px; color:#888;">사진이 없습니다.</p>';
        return;
    }

    renderGalleryChunk(); // 첫 청크 로드
}

function loadMoreGallery() {
    // 이미 다 로드했거나 초기화 전이면 중단
    if (galleryItems.length === 0) return;

    const currentCount = document.querySelectorAll('.gallery-item').length;
    if (currentCount >= galleryItems.length) return; // 다 보여줌

    galleryPage++;
    renderGalleryChunk();
}

function renderGalleryChunk() {
    const grid = getEl('gallery-grid');

    // 보여줄 범위 계산
    const start = 0; // 항상 0부터? 아니면 추가? -> 인피니트 스크롤은 추가가 맞음.
    // 하지만 여기선 page 변수를 써서 범위를 정함
    const limit = galleryPage * IMAGES_PER_LOAD;

    // 현재 DOM에 있는 개수 확인
    const currentCount = grid.querySelectorAll('.gallery-item').length;

    // 추가할 아이템만 슬라이싱
    const nextBatch = galleryItems.slice(currentCount, limit);

    nextBatch.forEach(item => {
        const div = document.createElement('div');
        div.className = "gallery-item";

        let contentHtml = '';
        if (!isAuthorized) {
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