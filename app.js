
// ==========================================
// 상태 관리 (State)
// ==========================================
let currentUser = null;
let profileImage = localStorage.getItem('teacher_profile_img') || null;

// 임시 데이터저장소 (서버가 없으므로 로컬스토리지 사용 흉내내도 일부 포함)
// 실제 환경에서는 API 응답을 사용합니다.

// ==========================================
// 도우미 함수 (Helpers)
// ==========================================
const getEl = (id) => document.getElementById(id);
const getAll = (sel) => document.querySelectorAll(sel);

// 바이트 계산 (한글 2바이트 가정 or Blob 사용)
const getByteLength = (s) => {
    let b = 0, i, c;
    for (b = i = 0; c = s.charCodeAt(i++); b += c >> 7 ? 2 : 1);
    return b;
    // 정확한 UTF-8 바이트 수가 필요하면 new Blob([s]).size 사용
};

// 바이트 카운터 설정
function setupByteCounter(inputId, counterId, maxBytes, submitBtnId) {
    const input = getEl(inputId);
    const counter = getEl(counterId);
    const btn = getEl(submitBtnId);
    if (!input || !counter) return;

    const update = () => {
        const currentBytes = getByteLength(input.value);
        counter.innerText = `${currentBytes} / ${maxBytes}`;

        if (currentBytes > maxBytes) {
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


// 페이지 이동
function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));

    const targetPage = getEl(pageId);
    if (targetPage) targetPage.classList.add('active');

    const menuLink = document.querySelector(`.nav-links li[data-target="${pageId}"]`);
    if (menuLink) menuLink.classList.add('active');

    // 데이터 로드
    if (pageId === 'community' && currentUser) loadCommunity();
    if (pageId === 'gallery' && currentUser) loadGallery();
    if (pageId === 'notice' && currentUser) loadNotice();
}

// 모달 닫기
function closeModal(modalId) {
    const m = getEl(modalId);
    if (m) m.style.display = 'none';
}

// ==========================================
// 초기화 & 이벤트 리스너
// ==========================================
document.addEventListener('DOMContentLoaded', () => {

    if (typeof CONFIG === 'undefined' || !CONFIG.API_URL) {
        alert("오류: config.js 파일이 로드되지 않았거나 설정이 없습니다.");
        return;
    }

    // 네비게이션
    getAll('.nav-links li').forEach(li => {
        li.addEventListener('click', () => {
            const target = li.getAttribute('data-target');
            if (target) navigateTo(target);
            else if (li.id === 'login-link') navigateTo('auth');
        });
    });

    // 로그인
    const loginForm = getEl('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = getEl('login-id').value;
            const pw = getEl('login-pw').value;

            const btn = loginForm.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = "로그인 중...";
            btn.disabled = true;

            await handleLogin(id, pw);

            btn.innerText = originalText;
            btn.disabled = false;
        });
    }

    // 회원가입
    const signupForm = getEl('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = getEl('signup-id').value;
            const pw = getEl('signup-pw').value;
            const name = getEl('signup-name').value;

            if (id.length !== 4) return alert("학번은 4자리여야 합니다. (예: 1213)");

            const btn = signupForm.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = "신청 중...";
            btn.disabled = true;

            await handleSignup(id, pw, name);

            btn.innerText = originalText;
            btn.disabled = false;
        });
    }

    // 바이트 카운터 연결
    // 1. 커뮤니티
    setupByteCounter('comm-title', 'comm-title-byte', 30, 'btn-comm-submit');
    setupByteCounter('comm-content', 'comm-content-byte', 3000, 'btn-comm-submit');
    // 2. 갤러리
    setupByteCounter('gallery-title', 'gallery-title-byte', 30, 'btn-gallery-submit');
    // 3. 알림장
    setupByteCounter('notice-title', 'notice-title-byte', 30, 'btn-notice-submit');
    setupByteCounter('notice-content', 'notice-content-byte', 3000, 'btn-notice-submit');

    // 초기 화면
    navigateTo('home');
});

// ==========================================
// 인증 시스템
// ==========================================
window.toggleAuthMode = (mode) => {
    const loginView = getEl('login-view');
    const signupView = getEl('signup-view');
    loginView.style.display = (mode === 'login') ? 'block' : 'none';
    signupView.style.display = (mode === 'signup') ? 'block' : 'none';
};

async function handleLogin(id, pw) {
    if (!id || !pw) return alert("학번과 비밀번호를 입력해주세요.");
    try {
        const url = `${CONFIG.API_URL}?action=login&id=${id}&pw=${pw}`;
        const res = await fetch(url);
        const json = await res.json();

        if (json.success) {
            currentUser = json.name;
            alert(`${json.name}님, 환영합니다!`);
            updateUI_LoggedIn(json.name);
        } else {
            if (json.code === "PENDING") {
                alert(`[승인 대기중]\n\n선생님의 승인을 기다리고 있습니다.\n(신청자: ${json.name})`);
            } else if (json.code === "WRONG_PW") {
                alert("비밀번호가 틀렸습니다.");
            } else if (json.code === "NO_ID") {
                alert("존재하지 않는 학번입니다.\n회원가입을 먼저 해주세요.");
            } else {
                alert(`로그인 실패: ${json.error}`);
            }
        }
    } catch (err) {
        console.error(err);
        alert("서버 연결 실패.");
    }
}

async function handleSignup(id, pw, name) {
    if (!id || !pw || !name) return alert("모든 항목을 입력해주세요.");
    try {
        const url = `${CONFIG.API_URL}?action=signup&id=${id}&pw=${pw}&name=${name}`;
        const res = await fetch(url);
        const json = await res.json();

        if (json.success) {
            alert("가입 신청 완료!\n승인을 기다려주세요.");
            toggleAuthMode('login');
        } else {
            if (json.code === "EXISTS") alert("이미 가입된 학번입니다.");
            else alert(`가입 실패: ${json.error}`);
        }
    } catch (err) {
        alert("오류가 발생했습니다.");
    }
}

function updateUI_LoggedIn(name) {
    const loginLink = getEl('login-link');
    if (loginLink) {
        loginLink.innerHTML = `👤 ${name}`;
        loginLink.onclick = () => { if (confirm("로그아웃 하시겠습니까?")) location.reload(); };
    }

    document.querySelectorAll('.blur-target').forEach(el => el.classList.remove('blur-target'));
    document.querySelectorAll('.lock-overlay-msg').forEach(el => el.style.display = 'none');

    // 버튼 보이기
    const commBtn = getEl('btn-community-write');
    const galBtn = getEl('btn-gallery-write');
    if (commBtn) commBtn.style.display = 'inline-block';
    if (galBtn) galBtn.style.display = 'inline-block';

    // 선생님 권한 체크 (이름에 '선생님' 포함 시)
    if (name.includes("선생님") || name.includes("Teacher")) {
        const noticeBtn = getEl('btn-notice-write');
        const pfBtn = getEl('btn-notice-profile');
        if (noticeBtn) noticeBtn.style.display = 'inline-block';
        if (pfBtn) pfBtn.style.display = 'inline-block';
    }

    navigateTo('home');
}

// ==========================================
// 커뮤니티 로직
// ==========================================
// 모달 열기
if (getEl('btn-community-write')) {
    getEl('btn-community-write').onclick = () => {
        getEl('community-write-modal').style.display = 'flex';
        // 초기화
        getEl('comm-title').value = '';
        getEl('comm-content').value = '';
        getEl('comm-title-byte').innerText = '0 / 30';
        getEl('comm-content-byte').innerText = '0 / 3000';
    };
}

// 글 등록
window.submitCommunityPost = async () => {
    const title = getEl('comm-title').value;
    const content = getEl('comm-content').value;

    if (!title || !content) return alert("제목과 내용을 입력해주세요.");
    if (getByteLength(title) > 30) return alert("제목은 30바이트를 초과할 수 없습니다.");
    if (getByteLength(content) > 3000) return alert("내용은 3000바이트를 초과할 수 없습니다.");

    closeModal('community-write-modal');

    addPostToDisplay({
        title: title,
        content: content,
        author: currentUser,
        date: new Date().toISOString().split('T')[0],
        isNew: true
    }, true);

    try {
        await fetch(CONFIG.API_URL, {
            method: 'POST',
            body: JSON.stringify({ Title: title, Content: content, Author: currentUser, Type: 'Post' })
        });
    } catch (err) {
        alert("글 전송 실패");
    }
};

async function loadCommunity() {
    const list = getEl('community-list');
    if (!list || list.querySelector('.post-card')) return;

    try {
        const res = await fetch(CONFIG.API_URL);
        const data = await res.json();

        if (data.error || !Array.isArray(data)) return;

        list.innerHTML = '';
        data.forEach(post => addPostToDisplay(post, false));
    } catch (err) {
        console.log("Community Load Error");
    }
}

function addPostToDisplay(post, prepend) {
    const list = getEl('community-list');
    const card = document.createElement('div');
    card.className = "post-card";
    if (post.isNew) card.style.border = "2px solid var(--primary)";

    // 내용 50바이트 자르기
    let previewContent = post.content;
    if (getByteLength(previewContent) > 50) {
        previewContent = previewContent.substring(0, 30) + "..."; // 대략 
    }

    card.innerHTML = `
        <div class="post-header">
            <span class="post-title">${post.title}</span>
            <span class="post-date">${post.date}</span>
        </div>
        <div class="post-body-preview">${previewContent}</div>
        <div class="post-author">by ${post.author}</div>
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
// 학급 갤러리 로직
// ==========================================
if (getEl('btn-gallery-write')) {
    getEl('btn-gallery-write').onclick = () => {
        getEl('gallery-write-modal').style.display = 'flex';
        getEl('gallery-title').value = '';
        getEl('gallery-file').value = '';
        getEl('gallery-title-byte').innerText = '0 / 30';
    };
}

window.submitGalleryPost = async () => {
    const title = getEl('gallery-title').value;
    const fileInput = getEl('gallery-file');
    const file = fileInput.files[0];

    if (!title) return alert("제목을 입력해주세요.");
    if (getByteLength(title) > 30) return alert("제목은 30바이트를 초과할 수 없습니다.");
    if (!file) return alert("사진을 선택해주세요.");

    // 파일 형식 체크
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) return alert("PNG, JPG, JPEG 파일만 가능합니다.");

    // 파일 용량 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) return alert("파일 용량은 5MB 이하여야 합니다.");

    closeModal('gallery-write-modal');

    // 미리보기 생성 (FileReader)
    const reader = new FileReader();
    reader.onload = function (e) {
        addGalleryItem({
            title: title,
            author: currentUser,
            image: e.target.result,
            isNew: true
        }, true);
    };
    reader.readAsDataURL(file);

    // 실제 서버 전송은 GAS 한계로 생략하거나 텍스트만 전송 (구현 한계)
    // alert("사진이 등록되었습니다. (실제 서버 저장은 지원되지 않음)");
};

// 갤러리 로드 (가짜 데이터 + 로컬스토리지 흉내)
function loadGallery() {
    const grid = getEl('gallery-grid');
    if (grid.children.length > 0) return; // 이미 로드됨

    // 예시 데이터
    const demos = [
        { title: "체육대회", author: "김철수", image: "https://via.placeholder.com/300" },
        { title: "현장학습", author: "이영희", image: "https://via.placeholder.com/300/ff7979/ffffff" }
    ];

    demos.forEach(item => addGalleryItem(item, false));
}

function addGalleryItem(item, prepend) {
    const grid = getEl('gallery-grid');
    const div = document.createElement('div');
    div.className = "gallery-item";
    div.innerHTML = `
        <img src="${item.image}" alt="${item.title}" loading="lazy">
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


// ==========================================
// 알림장 로직 (선생님 전용)
// ==========================================
if (getEl('btn-notice-write')) {
    getEl('btn-notice-write').onclick = () => {
        getEl('notice-write-modal').style.display = 'flex';
        getEl('notice-title').value = '';
        getEl('notice-content').value = '';
    };
}

window.submitNoticePost = async () => {
    const title = getEl('notice-title').value;
    const content = getEl('notice-content').value;

    if (!title || !content) return alert("제목과 내용을 입력해주세요.");
    if (getByteLength(title) > 30) return alert("제목 초과!");
    if (getByteLength(content) > 3000) return alert("내용 초과!");

    closeModal('notice-write-modal');

    // 알림장 UI에 추가 (채팅 스타일 유지)
    addNoticeItem({
        title: title, // 알림장은 제목을 헤더로
        content: content,
        author: currentUser,
        date: new Date().toISOString().split('T')[0]
    });
};

function loadNotice() {
    // 실제로는 서버에서 가져와야 함. 여기선 데모.
    const container = getEl('notice-container');
    if (container.children.length > 0) return;

    addNoticeItem({ title: "공지사항", content: "내일 준비물: 색종이", author: "선생님", date: "2026-03-02" });
}

function addNoticeItem(item) {
    const list = getEl('notice-container');
    const row = document.createElement('div');
    row.className = "notice-row";

    // 선생님 프로필 (기본)
    const profileImg = localStorage.getItem('teacher_profile_img') || "https://via.placeholder.com/50";

    row.innerHTML = `
        <div class="teacher-profile"><img src="${profileImg}"></div>
        <div class="notice-bubble-wrapper">
            <div class="notice-name">${item.author}</div>
            <div class="notice-bubble">
                <strong>${item.title}</strong><br>
                ${item.content}
            </div>
        </div>
    `;
    list.appendChild(row);
}


// ==========================================
// 급식 모달
// ==========================================
window.openLunchModal = () => {
    getEl('lunch-modal').style.display = 'flex';
    // 데이터 없음 처리
    getEl('lunch-content').innerHTML = "🍚 오늘은 급식이 없습니다!";
};