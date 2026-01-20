
// ==========================================
// 상태 관리 (State)
// ==========================================
let currentUser = null;
let currentRole = null; // Teacher or Student

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

// 갤러리 저장을 위한 간단한 로컬 저장소 (새로고침 시 유지용)
function saveGalleryLocal(item) {
    const saved = JSON.parse(localStorage.getItem('gallery_items') || "[]");
    saved.unshift(item);
    localStorage.setItem('gallery_items', JSON.stringify(saved));
}
function loadGalleryLocal() {
    return JSON.parse(localStorage.getItem('gallery_items') || "[]");
}


// 페이지 이동
function navigateTo(pageId) {
    // 0. 인증 체크 (Auth 페이지 제외)
    if (pageId !== 'home' && pageId !== 'auth' && !currentUser) {
        alert("로그인이 필요합니다.");
        navigateTo('auth');
        return;
    }

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));

    const targetPage = getEl(pageId);
    if (targetPage) targetPage.classList.add('active');

    if (pageId === 'community') loadPosts('Post');
    if (pageId === 'notice') loadPosts('Notice'); // 알림장도 GAS에서 로드
    if (pageId === 'gallery') loadGallery();
}

// 모달 닫기
function closeModal(modalId) {
    const m = getEl(modalId);
    if (m) m.style.display = 'none';
}

// ==========================================
// 초기화
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. 로그인 유지 확인
    const savedUser = localStorage.getItem('user_name');
    const savedRole = localStorage.getItem('user_role');

    if (savedUser) {
        currentUser = savedUser;
        currentRole = savedRole; // 저장된 역할 복구
        updateUI_LoggedIn(savedUser, savedRole);
    }

    // 네비게이션
    document.querySelectorAll('.nav-links li').forEach(li => {
        li.addEventListener('click', () => {
            if (li.id === 'login-link') {
                if (currentUser) {
                    // 이미 로그인 상태면 아무것도 안 함 (혹은 프로필?)
                } else {
                    navigateTo('auth');
                    // ★ 항상 로그인 창부터 뜨게 강제 설정
                    toggleAuthMode('login');
                }
            }
        });
    });

    // 폼 이벤트 연결
    if (getEl('login-form')) {
        getEl('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleLogin(getEl('login-id').value, getEl('login-pw').value);
        });
    }

    if (getEl('signup-form')) {
        getEl('signup-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleSignup();
        });
    }

    // 바이트 카운터
    setupByteCounter('comm-title', 'comm-title-byte', 30, 'btn-comm-submit');
    setupByteCounter('comm-content', 'comm-content-byte', 3000, 'btn-comm-submit');
    setupByteCounter('gallery-title', 'gallery-title-byte', 30, 'btn-gallery-submit');
    setupByteCounter('notice-title', 'notice-title-byte', 30, 'btn-notice-submit');
    setupByteCounter('notice-content', 'notice-content-byte', 3000, 'btn-notice-submit');

    // 초기 화면
    navigateTo('home');
});

// ==========================================
// 인증 시스템
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
            currentRole = json.role || 'Student'; // GAS에서 role 안주면 기본 학생

            // ★ 로그인 정보 저장 (새로고침 유지용)
            localStorage.setItem('user_name', currentUser);
            localStorage.setItem('user_role', currentRole);

            alert(`${json.name}님 환영합니다!`);
            updateUI_LoggedIn(currentUser, currentRole);
        } else {
            if (json.code === "PENDING") alert("승인 대기중입니다.");
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
    if (id.length !== 4) return alert("학번은 4자리!");

    try {
        const url = `${CONFIG.API_URL}?action=signup&id=${id}&pw=${pw}&name=${name}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.success) {
            alert("가입 신청 완료!");
            toggleAuthMode('login');
        } else {
            alert("가입 실패: " + json.error);
        }
    } catch (err) { alert("오류 발생"); }
}

function updateUI_LoggedIn(name, role) {
    const link = getEl('login-link');
    link.innerHTML = `👤 ${name}`;
    link.onclick = () => {
        if (confirm("로그아웃 하시겠습니까?")) {
            localStorage.clear();
            location.reload();
        }
    };

    // 블러 해제
    document.querySelectorAll('.blur-target').forEach(e => e.classList.remove('blur-target'));
    document.querySelectorAll('.lock-overlay-msg').forEach(e => e.style.display = 'none');

    // 버튼 권한 처리
    if (getEl('btn-community-write')) getEl('btn-community-write').style.display = 'inline-block';
    if (getEl('btn-gallery-write')) getEl('btn-gallery-write').style.display = 'inline-block';

    // 알림장은 선생님만 (Role 체크)
    if (role === 'Teacher' || name.includes("선생님")) {
        if (getEl('btn-notice-write')) getEl('btn-notice-write').style.display = 'inline-block';
    } else {
        if (getEl('btn-notice-write')) getEl('btn-notice-write').style.display = 'none';
    }

    navigateTo('home');
}

// ==========================================
// 통합 게시판 로직 (커뮤니티 + 알림장)
// ==========================================
// 글쓰기 모달 열기
if (getEl('btn-community-write')) getEl('btn-community-write').onclick = () => getEl('community-write-modal').style.display = 'flex';
if (getEl('btn-notice-write')) getEl('btn-notice-write').onclick = () => getEl('notice-write-modal').style.display = 'flex';

// 글 등록 (커뮤니티)
window.submitCommunityPost = () => submitPostGeneric('comm', 'Post');
// 글 등록 (알림장)
window.submitNoticePost = () => submitPostGeneric('notice', 'Notice');

async function submitPostGeneric(prefix, type) {
    const title = getEl(`${prefix}-title`).value;
    const content = getEl(`${prefix}-content`).value;

    if (!title || !content) return alert("내용을 입력하세요");
    if (getByteLength(title) > 30 || getByteLength(content) > 3000) return alert("글자수 초과!");

    closeModal(`${prefix === 'comm' ? 'community' : 'notice'}-write-modal`);

    // 가짜 UI 추가 (즉시반영)
    addCardToDisplay({
        title, content, author: currentUser, date: new Date().toISOString().split('T')[0], isNew: true
    }, type, true);

    try {
        await fetch(CONFIG.API_URL, {
            method: 'POST',
            body: JSON.stringify({ Title: title, Content: content, Author: currentUser, Type: type })
        });
    } catch (err) { alert("저장 실패"); }
}


async function loadPosts(type) {
    const containerId = type === 'Post' ? 'community-list' : 'notice-container';
    const list = getEl(containerId);
    if (!list) return; // 에러 방지

    // 로딩 표시 (기존 내용 없으면)
    if (list.children.length === 0) list.innerHTML = '<div style="text-align:center; padding:20px;">로딩중...</div>';

    try {
        // GAS에서 Type별로 가져오도록 요청 (쿼리 파라미터 type 추가 필요)
        const res = await fetch(`${CONFIG.API_URL}?type=${type}`);
        const data = await res.json();

        list.innerHTML = ''; // 초기화
        if (Array.isArray(data)) {
            data.forEach(post => addCardToDisplay(post, type, false));
        } else {
            list.innerHTML = '<div style="text-align:center;">글이 없습니다.</div>';
        }
    } catch (err) {
        console.log(err);
        list.innerHTML = '<div style="text-align:center;">로딩 실패</div>';
    }
}

function addCardToDisplay(post, type, prepend) {
    const containerId = type === 'Post' ? 'community-list' : 'notice-container';
    const list = getEl(containerId);
    if (!list) return;

    const card = document.createElement('div');
    card.className = "post-card";
    if (post.isNew) card.style.border = "2px solid var(--primary)";

    // 미리보기 (50바이트 제한)
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

    if (prepend) list.prepend(card);
    else list.appendChild(card);
}

function openDetail(post) {
    getEl('detail-title').innerText = post.title;
    getEl('detail-meta').innerText = `작성자: ${post.author} | 날짜: ${post.date}`;
    getEl('detail-body').innerText = post.content;
    getEl('post-detail-modal').style.display = 'flex';
}

// ==========================================
// 갤러리 로직 (로컬스토리지 활용)
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
    if (getByteLength(title) > 30) return alert("제목 초과");
    if (file.size > 5 * 1024 * 1024) return alert("5MB 이하만 가능");

    // 파일 확장자 체크
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) return alert("이미지 파일만 가능");

    closeModal('gallery-write-modal');

    // 1. 로컬 저장 (Base64) - 유지용
    const reader = new FileReader();
    reader.onload = async (e) => {
        const imgData = e.target.result;
        const item = { title, author: currentUser, image: imgData, date: new Date().toISOString().split('T')[0] };

        saveGalleryLocal(item); // 로컬스토리지에 저장
        addGalleryItem(item, true); // 화면 표시

        // 2. 서버에는 '제목'과 '작성자'만 저장 (이미지는 불가)
        // (사용자가 이미지 저장이 안 된다고 오해하지 않도록, 일단 카드 정보라도 저장)
        await fetch(CONFIG.API_URL, {
            method: 'POST',
            body: JSON.stringify({ Title: title, Content: "(사진 파일)", Author: currentUser, Type: 'Gallery' })
        });
    };
    reader.readAsDataURL(file);
};

function loadGallery() {
    const grid = getEl('gallery-grid');
    if (grid.children.length > 0) return;

    // 로컬스토리지에서 불러오기
    const items = loadGalleryLocal();
    items.forEach(item => addGalleryItem(item, false));

    // (선택) 서버에서 'Gallery' 타입 글도 불러와서 섞을 수 있지만,
    // 이미지를 못 가져오니 로컬 데이터만 보여주는 게 덜 헷갈립니다.
}

function addGalleryItem(item, prepend) {
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

    if (prepend) grid.prepend(div);
    else grid.appendChild(div);
}

function openImageViewer(src) {
    getEl('viewer-img').src = src;
    getEl('image-viewer-modal').style.display = 'flex';
}

// 급식 모달
window.openLunchModal = () => {
    getEl('lunch-modal').style.display = 'flex';
    getEl('lunch-content').innerHTML = "🍚 오늘은 급식이 없습니다!";
}