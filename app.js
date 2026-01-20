
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
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    // 네비게이션 활성화 상태 변경 (필요시)

    // 페이지 활성화
    const targetPage = getEl(pageId);
    if (targetPage) targetPage.classList.add('active');

    // 커뮤니티나 갤러리 진입 시 데이터 로드 (로그인 된 경우만)
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
    // 1. 로그인 폼
    const loginForm = getEl('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = getEl('login-id').value;
            const pw = getEl('login-pw').value;
            await handleLogin(id, pw);
        });
    }

    // 2. 회원가입 폼
    const signupForm = getEl('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = getEl('signup-id').value;
            const pw = getEl('signup-pw').value;
            const name = getEl('signup-name').value;

            // 유효성 검사 (학번 4자리)
            if (id.length !== 4) {
                alert("학번은 4자리여야 합니다. (예: 1213)");
                return;
            }
            await handleSignup(id, pw, name);
        });
    }

    // 초기 화면
    navigateTo('home');
});

// ==========================================
// 인증 시스템 (로그인/가입)
// ==========================================

// 화면 전환 (로그인 <-> 가입)
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

    // 로딩 표시 (Toast 등 활용 가능)
    try {
        // GET 방식으로 요청 (결과값 받기 위해)
        const res = await fetch(`${CONFIG.API_URL}?action=login&id=${id}&pw=${pw}`);
        const json = await res.json();

        if (json.success) {
            currentUser = json.name;
            alert(`${json.name}님, 환영합니다!`);
            updateUI_LoggedIn(json.name);
        } else {
            // 실패 원인별 코드 처리
            if (json.code === "PENDING") {
                alert(`[승인 대기중]\n\n선생님의 가입 승인을 기다리고 있습니다.\n(신청자: ${json.name})`);
            } else if (json.code === "WRONG_PW") {
                alert("비밀번호가 틀렸습니다.");
            } else if (json.code === "NO_ID") {
                alert("존재하지 않는 학번입니다. 회원가입을 먼저 해주세요.");
            } else {
                alert(`로그인 실패: ${json.error}`);
            }
        }
    } catch (err) {
        console.error(err);
        alert("서버 연결 실패. 인터넷 상태를 확인하거나 잠시 후 다시 시도해주세요.");
    }
}

async function handleSignup(id, pw, name) {
    if (!id || !pw || !name) return alert("모든 항목을 입력해주세요.");

    try {
        const res = await fetch(`${CONFIG.API_URL}?action=signup&id=${id}&pw=${pw}&name=${name}`);
        const json = await res.json();

        if (json.success) {
            alert("가입 신청이 완료되었습니다!\n선생님이 승인해주시면 로그인할 수 있습니다.");
            toggleAuthMode('login'); // 로그인 화면으로 이동
        } else {
            if (json.code === "EXISTS") {
                alert("이미 가입된 학번입니다.");
            } else {
                alert(`가입 실패: ${json.error}`);
            }
        }
    } catch (err) {
        alert("오류가 발생했습니다.");
    }
}

function updateUI_LoggedIn(name) {
    // 1. 상단 로그인 버튼 변경
    const loginLink = getEl('login-link');
    if (loginLink) {
        loginLink.innerHTML = `👤 ${name}`;
        loginLink.onclick = () => {
            if (confirm("로그아웃 하시겠습니까?")) location.reload();
        };
    }

    // 2. 잠금 해제 (블러 제거 & 메시지 제거)
    document.querySelectorAll('.blur-target').forEach(el => el.classList.remove('blur-target'));
    document.querySelectorAll('.lock-overlay-msg').forEach(el => el.style.display = 'none');

    // 3. 글쓰기 버튼들 보이기
    const btnIds = ['btn-community-write', 'btn-gallery-write', 'btn-notice-write']; // Notice는 선생님만? 일단 다 품
    btnIds.forEach(id => {
        const btn = getEl(id);
        if (btn) btn.style.display = 'inline-block';
    });

    // 선생님인 경우 프로필 설정 보이기 (예: 이름이 '선생님' or 특정 ID)
    if (name.includes("선생님")) { // 간단한 체크
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
    getEl('btn-community-write').onclick = () => {
        commModal.style.display = 'flex';
    };
}

// 글 등록
window.submitCommunityPost = async () => {
    const titleEl = getEl('comm-title');
    const contentEl = getEl('comm-content');
    const title = titleEl.value;
    const content = contentEl.value;

    if (!title || !content) return alert("제목과 내용을 입력해주세요.");

    // 즉시 UI 반영 (Optimistic UI)
    closeModal('community-write-modal');
    titleEl.value = '';
    contentEl.value = '';

    // 가짜 카드 추가
    addPostToDisplay({
        title: title,
        content: content,
        author: currentUser,
        date: new Date().toISOString().split('T')[0],
        isNew: true
    }, true);

    // 서버 전송
    try {
        await fetch(CONFIG.API_URL, {
            method: 'POST',
            body: JSON.stringify({
                Action: 'write', // GAS에서 처리할 액션
                Title: title,
                Content: content,
                Author: currentUser
            })
        });
    } catch (err) {
        console.error("Post failed", err);
        alert("글 전송에 실패했습니다. (인터넷 확인 필요)");
    }
};

async function loadCommunity() {
    const list = getEl('community-list');
    if (!list || list.querySelector('.post-card')) return; // 이미 로드됨

    try {
        const res = await fetch(CONFIG.API_URL); // GET Request (기본)
        const data = await res.json();

        // 에러나 빈 배열 체크
        if (data.error || !Array.isArray(data)) {
            console.log("No data or error");
            return;
        }

        list.innerHTML = '';
        data.forEach(post => addPostToDisplay(post, false)); // false = append to bottom
    } catch (err) {
        console.log("Load failed");
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

    // 클릭 시 상세 보기 (간단 구현)
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
// 급식 로직 (간단 예시)
// ==========================================
window.openLunchModal = async () => {
    getEl('lunch-modal').style.display = 'flex';
    const content = getEl('lunch-content');

    // 나이스 API 등으로 대체 가능, 현재는 데모
    content.innerHTML = "잡곡밥<br>돈육김치찌개<br>계란말이<br>맛김<br>깍두기";
};

// ==========================================
// 페이지 로드 시
// ==========================================
// (위에서 DOMContentLoaded로 처리함)
