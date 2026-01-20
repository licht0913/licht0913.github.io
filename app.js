// ==========================================
// 상태 관리 (State)
// ==========================================
let currentUser = null;

// ==========================================
// 도우미 함수 (Helpers)
// ==========================================
const getEl = (id) => document.getElementById(id);

// 페이지 이동
function navigateTo(pageId) {
    // 모든 페이지 숨김
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));

    // 목표 페이지 보이기
    const targetPage = getEl(pageId);
    if (targetPage) targetPage.classList.add('active');

    // 메뉴 하이라이트 (있는 경우만)
    const menuLink = document.querySelector(`.nav-links li[data-target="${pageId}"]`);
    if (menuLink) menuLink.classList.add('active');

    // 데이터 로드
    if (pageId === 'community' && currentUser) loadCommunity();
    if (pageId === 'gallery' && currentUser) loadGallery();
    // if (pageId === 'notice' && currentUser) loadNotice(); // 필요시 구현
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

    // 0. Config 체크
    if (typeof CONFIG === 'undefined' || !CONFIG.API_URL) {
        alert("오류: config.js 파일이 로드되지 않았거나 설정이 없습니다.");
        return;
    }

    // 1. 네비게이션 클릭 이벤트 핸들링
    document.querySelectorAll('.nav-links li').forEach(li => {
        li.addEventListener('click', () => {
            const target = li.getAttribute('data-target');
            if (target) {
                navigateTo(target);
            } else if (li.id === 'login-link') {
                // ★ '로그인' 버튼 클릭 시 auth 페이지로 이동 (이게 빠져있었습니다!)
                navigateTo('auth');
            }
        });
    });

    // 2. 로그인 폼 제출
    const loginForm = getEl('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = getEl('login-id').value;
            const pw = getEl('login-pw').value;

            // 버튼 눌림 피드백
            const btn = loginForm.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = "로그인 중...";
            btn.disabled = true;

            await handleLogin(id, pw);

            // 복구
            btn.innerText = originalText;
            btn.disabled = false;
        });
    }

    // 3. 회원가입 폼 제출
    const signupForm = getEl('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = getEl('signup-id').value;
            const pw = getEl('signup-pw').value;
            const name = getEl('signup-name').value;

            if (id.length !== 4) {
                alert("학번은 4자리여야 합니다. (예: 1213)");
                return;
            }

            const btn = signupForm.querySelector('button');
            btn.innerText = "신청 중...";
            btn.disabled = true;

            await handleSignup(id, pw, name);

            btn.innerText = "가입 신청";
            btn.disabled = false;
        });
    }

    // 초기 화면
    navigateTo('home');
});

// ==========================================
// 인증 시스템 (로그인/가입)
// ==========================================

// 화면 전환
window.toggleAuthMode = (mode) => {
    const loginView = getEl('login-view');
    const signupView = getEl('signup-view');

    if (mode === 'signup') {
        loginView.style.display = 'none';
        signupView.style.display = 'block';
    } else {
        loginView.style.display = 'block';
        signupView.style.display = 'none';
    }
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
        alert("서버 연결에 실패했습니다.\n인터넷 연결이나 주소를 확인해주세요.");
    }
}

async function handleSignup(id, pw, name) {
    if (!id || !pw || !name) return alert("모든 항목을 입력해주세요.");

    try {
        const url = `${CONFIG.API_URL}?action=signup&id=${id}&pw=${pw}&name=${name}`;
        const res = await fetch(url);
        const json = await res.json();

        if (json.success) {
            alert("가입 신청이 완료되었습니다!\n선생님이 승인해주시면 로그인할 수 있습니다.");
            toggleAuthMode('login');
        } else {
            if (json.code === "EXISTS") {
                alert("이미 가입된 학번입니다.");
            } else {
                alert(`가입 실패: ${json.error || '알 수 없는 오류'}`);
            }
        }
    } catch (err) {
        console.error(err);
        alert("요청 처리 중 오류가 발생했습니다.");
    }
}

function updateUI_LoggedIn(name) {
    // 1. 상단 로그인 버튼 변경
    const loginLink = getEl('login-link');
    if (loginLink) {
        loginLink.innerHTML = `👤 ${name}`;
        // 로그아웃 기능
        loginLink.onclick = () => {
            if (confirm("로그아웃 하시겠습니까?")) location.reload();
        };
    }

    // 2. 잠금 해제
    document.querySelectorAll('.blur-target').forEach(el => el.classList.remove('blur-target'));
    document.querySelectorAll('.lock-overlay-msg').forEach(el => el.style.display = 'none');

    // 3. 버튼 보이기
    ['btn-community-write', 'btn-gallery-write', 'btn-notice-write'].forEach(id => {
        const btn = getEl(id);
        if (btn) btn.style.display = 'inline-block';
    });

    // 선생님 버튼
    if (name.includes("선생님")) {
        const pfBtn = getEl('btn-notice-profile');
        if (pfBtn) pfBtn.style.display = 'inline-block';
    }

    // 4. 홈으로 이동
    navigateTo('home');
}


// ==========================================
// 커뮤니티 로직
// ==========================================

// 모달 열기
const commModal = getEl('community-write-modal');
if (getEl('btn-community-write')) {
    getEl('btn-community-write').onclick = () => commModal.style.display = 'flex';
}

// 글 등록
window.submitCommunityPost = async () => {
    const titleEl = getEl('comm-title');
    const contentEl = getEl('comm-content');
    const title = titleEl.value;
    const content = contentEl.value;

    if (!title || !content) return alert("제목과 내용을 입력해주세요.");

    // 모달 닫기 & 가짜 UI 추가
    closeModal('community-write-modal');
    titleEl.value = '';
    contentEl.value = '';

    addPostToDisplay({
        title: title,
        content: content,
        author: currentUser,
        date: new Date().toISOString().split('T')[0],
        isNew: true
    }, true);

    // 실제 전송 (doPost 사용)
    try {
        await fetch(CONFIG.API_URL, {
            method: 'POST',
            body: JSON.stringify({
                Title: title,
                Content: content,
                Author: currentUser,
                Type: 'Post'
            })
        });
    } catch (err) {
        console.error("Post failed", err);
        alert("글 전송 실패 (저장은 안 됐을 수 있습니다)");
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
        console.log("Community Load Error", err);
    }
}

function addPostToDisplay(post, prepend) {
    const list = getEl('community-list');
    const card = document.createElement('div');
    card.className = "post-card";
    if (post.isNew) card.style.border = "2px solid var(--primary)";

    card.innerHTML = `
        <div class="post-header">
            <span class="post-title">${post.title}</span>
            <span class="post-date">${post.date}</span>
        </div>
        <div class="post-body">${post.content}</div>
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

// 급식 모달
window.openLunchModal = () => {
    getEl('lunch-modal').style.display = 'flex';
    getEl('lunch-content').innerHTML = "🍚 맛있는 급식<br>오늘의 메뉴를<br>준비중입니다!";
};