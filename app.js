
// ==========================================
// 상태 관리 (State)
// ==========================================
let currentUser = null;
let currentRole = null; // Teacher or Student
let isAuthorized = false; // 승인된 회원인지 여부

// 데이터 캐싱 (페이지네이션용)
let postCache = {
    community: [],
    notice: []
};
let currentPage = {
    community: 1,
    notice: 1
};
const ITEMS_PER_PAGE = 5;

// ==========================================
// 도우미 함수 (Helpers)
// ==========================================
const getEl = (id) => document.getElementById(id);

// 바이트 계산
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

// 갤러리 로컬 저장
function saveGalleryLocal(item) {
    const saved = JSON.parse(localStorage.getItem('gallery_items') || "[]");
    saved.unshift(item);
    localStorage.setItem('gallery_items', JSON.stringify(saved));
}
function loadGalleryLocal() {
    return JSON.parse(localStorage.getItem('gallery_items') || "[]");
}

// ==========================================
// 페이지 및 권한 관리
// ==========================================
function navigateTo(pageId) {
    // Auth 페이지는 예외
    if (pageId === 'auth') {
        showPage(pageId);
        return;
    }

    // 메인 홈은 누구나 접근
    if (pageId === 'home') {
        showPage(pageId);
        return;
    }

    // 커뮤니티, 갤러리, 알림장은 권한 체크
    showPage(pageId); // 일단 이동은 시킴 (내용을 다르게 보여줄 것임)

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
    const m = getEl(modalId);
    if (m) m.style.display = 'none';
}

// ==========================================
// 초기화
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('user_name');
    const savedRole = localStorage.getItem('user_role');

    if (savedUser) {
        // 이미 승인된 사용자라고 가정 (로그인이 됐다는 건 승인됐다는 뜻)
        currentUser = savedUser;
        currentRole = savedRole;
        isAuthorized = true;
        updateUI_LoggedIn(savedUser, savedRole);
    } else {
        isAuthorized = false;
    }

    // 네비게이션
    document.querySelectorAll('.nav-links li').forEach(li => {
        li.addEventListener('click', () => {
            // 상단 로그인 버튼
            if (li.id === 'login-link') {
                if (currentUser) {
                    if (confirm("로그아웃 하시겠습니까?")) {
                        localStorage.clear();
                        location.reload();
                    }
                } else {
                    navigateTo('auth');
                    toggleAuthMode('login'); // ★ 항상 로그인창 먼저
                }
            }
        });
    });

    // 폼 처리
    if (getEl('login-form')) {
        getEl('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = getEl('btn-login');
            btn.innerText = "로그인..."; // 버튼 반응
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
            btn.innerText = "가입 신청..."; // 버튼 반응
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
// 인증 및 UI
// ==========================================
window.toggleAuthMode = (mode) => {
    getEl('login-view').style.display = (mode === 'login') ? 'block' : 'none';
    getEl('signup-view').style.display = (mode === 'signup') ? 'block' : 'none';
};

async function handleLogin(id, pw) {
    if (!id || !pw) return alert("입력해주세요.");
    try {
        const url = `${CONFIG.API_URL}?action=login&id=${id}&pw=${pw}`;
        const res = await fetch(url);
        const json = await res.json();

        if (json.success) {
            currentUser = json.name;
            currentRole = json.role || 'Student';
            isAuthorized = true; // 로그인 성공 = 승인됨

            localStorage.setItem('user_name', currentUser);
            localStorage.setItem('user_role', currentRole);

            alert(`${json.name}님 환영합니다!`);
            updateUI_LoggedIn(currentUser, currentRole);
        } else {
            if (json.code === "PENDING") alert("승인 대기중입니다.");
            else if (json.code === "WRONG_PW") alert("비밀번호가 틀렸습니다.");
            else if (json.code === "NO_ID") alert("존재하지 않는 학번입니다.\n회원가입을 먼저 해주세요.");
            else alert("로그인 실패: " + json.error);
        }
    } catch (err) {
        alert("오류가 발생했습니다.");
    }
}

async function handleSignup() {
    const id = getEl('signup-id').value;
    const pw = getEl('signup-pw').value;
    const name = getEl('signup-name').value;
    if (id.length !== 4) return alert("학번은 4자리를 입력해주세요 (예:1213)");

    try {
        const url = `${CONFIG.API_URL}?action=signup&id=${id}&pw=${pw}&name=${name}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.success) {
            alert("가입 신청 완료!\n선생님의 승인을 기다려주세요.");
            toggleAuthMode('login');
        } else {
            if (json.code === "EXISTS") alert("이미 가입된 학번입니다.");
            else alert("가입 실패: " + json.error);
        }
    } catch (err) { alert("오류 발생"); }
}

function updateUI_LoggedIn(name, role) {
    const link = getEl('login-link');
    link.innerHTML = `👤 ${name}`;

    // 버튼 보이기
    if (getEl('btn-community-write')) getEl('btn-community-write').style.display = 'inline-block';
    if (getEl('btn-gallery-write')) getEl('btn-gallery-write').style.display = 'inline-block';

    // 선생님 체크
    if (role === 'Teacher' || name.includes("선생님")) {
        if (getEl('btn-notice-write')) getEl('btn-notice-write').style.display = 'inline-block';
    } else {
        if (getEl('btn-notice-write')) getEl('btn-notice-write').style.display = 'none';
    }

    navigateTo('home');
}

// ==========================================
// 통합 게시판 로직 (페이지네이션 적용)
// ==========================================
// 모달 열기
if (getEl('btn-community-write')) getEl('btn-community-write').onclick = () => getEl('community-write-modal').style.display = 'flex';
if (getEl('btn-notice-write')) getEl('btn-notice-write').onclick = () => getEl('notice-write-modal').style.display = 'flex';

// 글 등록
window.submitCommunityPost = () => submitPostGeneric('comm', 'Post');
window.submitNoticePost = () => submitPostGeneric('notice', 'Notice');

async function submitPostGeneric(prefix, type) {
    const title = getEl(`${prefix}-title`).value;
    const content = getEl(`${prefix}-content`).value;

    if (!title || !content) return alert("내용을 입력하세요");
    if (getByteLength(title) > 30 || getByteLength(content) > 3000) return alert("글자수 초과!");

    closeModal(`${prefix === 'comm' ? 'community' : 'notice'}-write-modal`);

    // 로컬 추가 (즉시 반영)
    const newPost = {
        title, content, author: currentUser, date: new Date().toISOString().split('T')[0], isNew: true
    };

    const boardKey = (type === 'Post') ? 'community' : 'notice';
    postCache[boardKey].unshift(newPost); // 맨 앞에 추가
    renderBoard(boardKey, 1); // 1페이지 다시 렌더링

    try {
        await fetch(CONFIG.API_URL, {
            method: 'POST',
            body: JSON.stringify({ Title: title, Content: content, Author: currentUser, Type: type })
        });
    } catch (err) { alert("서버 저장 실패 (화면엔 보임)"); }
}

// 게시판 로드 (Load)
async function loadBoard(boardName) {
    const container = getEl(boardName === 'community' ? 'community-list' : 'notice-container');
    const pagination = getEl(boardName === 'community' ? 'community-pagination' : 'notice-pagination');

    // ★ 권한 없으면 차단 (도장 보여주기)
    if (!isAuthorized) {
        showBlockedBoard(container, pagination);
        return;
    }

    container.innerHTML = '<div style="padding:20px; text-align:center;">로딩중...</div>';
    pagination.innerHTML = '';

    const type = boardName === 'community' ? 'Post' : 'Notice';

    try {
        // 캐시 확인 (새로고침 안하고 탭 이동만 할때)
        // 여기선 간단히 매번 불러오는 걸로 하되 변수에 저장
        const res = await fetch(`${CONFIG.API_URL}?type=${type}`);
        const data = await res.json();

        if (Array.isArray(data)) {
            postCache[boardName] = data;
        } else {
            postCache[boardName] = [];
        }

        renderBoard(boardName, 1); // 1페이지 렌더링
    } catch (err) {
        container.innerHTML = '<div style="text-align:center;">로딩 실패</div>';
    }
}

// 게시판 렌더링 (Render)
function renderBoard(boardName, page) {
    const list = getEl(boardName === 'community' ? 'community-list' : 'notice-container');
    const pagination = getEl(boardName === 'community' ? 'community-pagination' : 'notice-pagination');

    list.innerHTML = '';
    pagination.innerHTML = '';

    const allPosts = postCache[boardName];
    if (allPosts.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">글이 없습니다.</div>';
        return;
    }

    // 슬라이싱
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pagePosts = allPosts.slice(start, end);

    // 게시글 카드 생성
    pagePosts.forEach(post => {
        const card = document.createElement('div');
        card.className = "post-card";
        if (post.isNew) card.style.border = "2px solid var(--primary)";

        let preview = post.content;
        if (getByteLength(preview) > 50) preview = preview.substring(0, 30) + "...";

        card.innerHTML = `
            <div class="post-header">
                <span class="post-title">${post.title}</span>
                <span class="post-date">${post.date}</span>
            </div>
            <div class="post-body-preview">${preview}</div>
            <div class="post-author">${post.author}</div>
        `;
        card.onclick = () => openDetail(post);
        list.appendChild(card);
    });

    // 페이지네이션 생성
    const totalPages = Math.ceil(allPosts.length / ITEMS_PER_PAGE);
    if (totalPages > 1) {
        // < 이전
        if (page > 1) {
            const prev = document.createElement('button');
            prev.className = "page-btn";
            prev.innerText = "<";
            prev.onclick = () => renderBoard(boardName, page - 1);
            pagination.appendChild(prev);
        }
        // 숫자들
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.className = `page-btn ${i === page ? 'active' : ''}`;
            btn.innerText = i;
            btn.onclick = () => renderBoard(boardName, i);
            pagination.appendChild(btn);
        }
        // > 다음
        if (page < totalPages) {
            const next = document.createElement('button');
            next.className = "page-btn";
            next.innerText = ">";
            next.onclick = () => renderBoard(boardName, page + 1);
            pagination.appendChild(next);
        }
    }
}

// 차단된 게시판 보여주기 (더미 데이터 + 도장)
function showBlockedBoard(container, pagination) {
    container.innerHTML = '';
    if (pagination) pagination.innerHTML = '';

    // 가짜 글 3개
    for (let i = 0; i < 3; i++) {
        const dummy = document.createElement('div');
        dummy.className = "post-card blur-it"; // 블러 처리
        dummy.style.opacity = "0.7";
        dummy.innerHTML = `
            <div class="post-header">
                <span class="post-title">비밀글입니다</span>
                <span class="post-date">2026.01.01</span>
            </div>
            <div class="post-body-preview">이 내용은 승인된 회원만 볼 수 있습니다. 궁금하다면 가입하세요!</div>
            <div class="post-author">관리자</div>
        `;

        // 각각의 게시물 위에 도장 찍기
        const stamp = document.createElement('div');
        stamp.className = "stamp-overlay";
        stamp.innerHTML = `
            <div class="stamp-text-1">가입/승인</div>
            <div class="stamp-text-2">후</div>
            <div class="stamp-text-3">열람!</div>
        `;

        // 카드 안에 도장을 넣으려면 position relative가 필요 (css에 추가함)
        // dummy와 stamp를 감싸는 래퍼가 필요하거나, dummy 안에 stamp를 넣어야 함. 
        // 하지만 dummy 내용물은 블러고 stamp는 선명해야 하므로, 
        // dummy 자체에 블러를 주면 자식도 블러됨.
        // 해결: post-card 내부에 content-wrapper를 두고 블러, stamp는 형제로 둠.

        // 구조 변경
        dummy.className = "post-card"; // 블러는 내부에서
        dummy.innerHTML = `
            <div class="blur-it">
                <div class="post-header">
                    <span class="post-title">비밀글입니다 ${i + 1}</span>
                    <span class="post-date">2026.01.01</span>
                </div>
                <div class="post-body-preview">이 내용은 로그인 후 승인된 회원만 볼 수 있습니다.</div>
                <div class="post-author">관리자</div>
            </div>
        `;
        dummy.appendChild(stamp);

        container.appendChild(dummy);
    }
}

function openDetail(post) {
    if (!isAuthorized) return; // 이중 체크
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

    // 미리보기 (로컬 저장)
    const reader = new FileReader();
    reader.onload = async (e) => {
        const item = {
            title, author: currentUser, image: e.target.result, date: new Date().toISOString().split('T')[0]
        };
        saveGalleryLocal(item);
        loadGallery(); // 다시 로드

        // 서버 전송 (텍스트만)
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

    if (!isAuthorized) {
        showBlockedGallery(grid);
        return;
    }

    const items = loadGalleryLocal();
    if (items.length === 0) {
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:20px; color:#888;">사진이 없습니다.</p>';
        return;
    }
    items.forEach(item => addGalleryItem(item));
}

function addGalleryItem(item) {
    const grid = getEl('gallery-grid');
    const div = document.createElement('div');
    div.className = "gallery-item";
    div.innerHTML = `
        <img src="${item.image}" loading="lazy">
        <div class="gallery-overlay">
            <span class="gallery-title">${item.title}</span>
            <span class="gallery-author">${item.author}</span>
        </div>
    `;
    div.onclick = () => openImageViewer(item.image);
    grid.appendChild(div);
}

// 갤러리 차단 화면
function showBlockedGallery(grid) {
    // 가짜 이미지 6개 정도
    for (let i = 0; i < 6; i++) {
        const div = document.createElement('div');
        div.className = "gallery-item";
        // 회색 박스 + 블러 + 도장
        div.innerHTML = `
            <div style="width:100%; height:100%; background:#eee; display:flex; justify-content:center; align-items:center;" class="blur-it">
                 <span style="font-size:3rem;">🔒</span>
            </div>
        `;

        const stamp = document.createElement('div');
        stamp.className = "stamp-overlay";
        stamp.innerHTML = `
            <div class="stamp-text-1">가입/승인</div>
            <div class="stamp-text-2">후</div>
            <div class="stamp-text-3">열람!</div>
        `;
        // 갤러리 도장은 좀 작게 조정 (css 인라인)
        stamp.style.width = "80px";
        stamp.style.height = "80px";
        stamp.style.fontSize = "0.7rem";

        div.appendChild(stamp);
        grid.appendChild(div);
    }
}

function openImageViewer(src) {
    getEl('viewer-img').src = src;
    getEl('image-viewer-modal').style.display = 'flex';
}

// 급식 모달
window.openLunchModal = () => {
    getEl('lunch-modal').style.display = 'flex';
}