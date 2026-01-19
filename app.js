// State
let currentUser = null;

// DOM Helpers - 나중에 DOM이 생성된 후 호출되도록 보장
const getEl = (id) => document.getElementById(id);
const getAll = (sel) => document.querySelectorAll(sel);

// 전역 이동 함수 (HTML에서 직접 호출 가능하도록 설정)
window.navigateTo = function (targetId) {
    console.log("Navigating to:", targetId);
    const pages = getAll('.page');
    pages.forEach(p => p.classList.remove('active'));

    const targetPage = getEl(targetId);
    if (targetPage) {
        targetPage.classList.add('active');
        window.scrollTo(0, 0);

        // 데이터 로드 (함수가 존재하는 경우만)
        if (typeof loadDataFor === 'function') loadDataFor(targetId);
    } else {
        console.error("Target page not found:", targetId);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. 유저 정보 복원
    const savedUser = localStorage.getItem('class_user');
    if (savedUser) currentUser = JSON.parse(savedUser);

    // 2. 초기 UI 업데이트 (블러 처리 등)
    updateAuthUI();

    // 3. 로고 누르면 홈으로
    const logo = document.querySelector('.logo');
    if (logo) logo.addEventListener('click', () => navigateTo('home'));

    // 4. 상단 네비바 버튼 (가입/로그인)
    const loginLink = document.querySelector('.btn-signup');
    if (loginLink) {
        loginLink.addEventListener('click', () => {
            if (currentUser) {
                if (confirm('로그아웃 하시겠습니까?')) {
                    currentUser = null;
                    localStorage.removeItem('class_user');
                    location.reload();
                }
            } else {
                navigateTo('signup');
            }
        });
    }

    // 5. 회원가입/로그인 처리부 연결
    initAuthForms();
});

function updateAuthUI() {
    const loginBtn = document.querySelector('.btn-signup');
    const writeBtn = getEl('btn-write');
    const gWriteBtn = getEl('btn-gallery-write');
    const nWriteBtn = getEl('btn-notice-write');

    if (currentUser) {
        if (loginBtn) {
            loginBtn.textContent = `${currentUser.name} (로그아웃)`;
            loginBtn.classList.add('logout-mode');
        }
        // 버튼 권한
        if (writeBtn) writeBtn.style.display = 'flex';
        if (gWriteBtn) gWriteBtn.style.display = 'flex';
        if (nWriteBtn) nWriteBtn.style.display = (currentUser.role === 'Teacher') ? 'flex' : 'none';

        // 블러 해제
        getAll('.blur-target').forEach(el => el.classList.remove('blur-content'));
        getAll('.lock-msg').forEach(el => el.style.display = 'none');
    } else {
        if (loginBtn) {
            loginBtn.textContent = '로그인';
            loginBtn.classList.remove('logout-mode');
        }
        // 블러 적용 (진입은 되지만 안의 내용을 가림)
        getAll('.blur-target').forEach(el => el.classList.add('blur-content'));
        getAll('.lock-msg').forEach(el => el.style.display = 'block');
    }
}

function initAuthForms() {
    // 로그인 폼
    const loginForm = getEl('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = getEl('login-id').value;
            const pw = getEl('login-pw').value;
            const btn = loginForm.querySelector('button');
            btn.disabled = true; btn.textContent = "확인 중...";

            try {
                const res = await fetch(`${CONFIG.API_URL}?action=login&id=${id}&pw=${pw}`);
                const data = await res.json();
                if (data.success) {
                    const user = { id, name: data.name, role: data.role || 'Student' };
                    localStorage.setItem('class_user', JSON.stringify(user));
                    alert("승인되었습니다!");
                    location.reload();
                } else {
                    alert(data.error || "실패했습니다.");
                    btn.disabled = false; btn.textContent = "로그인";
                }
            } catch (e) { alert("서버 연결 실패"); btn.disabled = false; }
        });
    }

    // 회원가입 폼
    const signupForm = getEl('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = getEl('signup-id').value;
            const pw = getEl('signup-pw').value;
            const name = getEl('signup-name').value;

            // 유효성 (학번 4자리, 비번 8+특수)
            if (!/^\d{4}$/.test(id)) return alert("학번은 4자리 숫자여야 합니다!");
            if (pw.length < 8 || !/[!@#$%^&*]/.test(pw)) return alert("비밀번호 조건을 확인해주세요!");

            const btn = signupForm.querySelector('button');
            btn.disabled = true; btn.textContent = "신청 중...";

            try {
                const res = await fetch(`${CONFIG.API_URL}?action=signup&id=${id}&pw=${pw}&name=${encodeURIComponent(name)}`);
                const data = await res.json();
                if (data.success) {
                    alert("담임 선생님의 승인을 기다리세요!");
                    navigateTo('home');
                    location.reload();
                } else { alert(data.error); btn.disabled = false; }
            } catch (e) { alert("오류"); btn.disabled = false; }
        });
    }
}

// 가입/로그인 뷰 전환
window.toggleAuth = function (showSignup) {
    const loginView = getEl('login-view');
    const signupView = getEl('signup-view');
    if (loginView && signupView) {
        loginView.style.display = showSignup ? 'none' : 'block';
        signupView.style.display = showSignup ? 'block' : 'none';
    }
}

// 노션 데이터 로드 함수 (데이터가 필요할 때 호출)
async function loadDataFor(pageId) {
    if (pageId === 'community') fetchList('Community', 'community-container');
    if (pageId === 'gallery') fetchList('Gallery', 'gallery-container');
    if (pageId === 'notice') fetchList('Notice', 'notice-container');
}

async function fetchList(category, containerId) {
    const container = getEl(containerId);
    if (!container) return;
    container.innerHTML = '<div style="text-align:center; padding:20px;">불러오는 중...</div>';

    try {
        const res = await fetch(`${CONFIG.API_URL}?action=list&category=${category}`);
        const list = await res.json();
        renderList(list, category, container);
    } catch (e) { container.innerHTML = '<p>목록을 가져오지 못했습니다.</p>'; }
}

function renderList(list, category, container) {
    container.innerHTML = '';
    if (!list || list.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:50px;">글이 없습니다.</p>';
        return;
    }
    // ... 기존 렌더링 로직 (Step 370과 동일하게 작동하도록 보강) ...
    list.forEach(item => {
        const div = document.createElement('div');
        if (category === 'Community') {
            div.className = 'community-item';
            div.innerHTML = `<h4 onclick="alert('${item.content}')" style="cursor:pointer">${item.title}</h4><div class="meta">${item.author} &bull; ${item.date}</div>`;
        } else if (category === 'Gallery') {
            div.className = 'gallery-item';
            div.innerHTML = `<img src="${item.content.startsWith('data') ? item.content : 'https://picsum.photos/300'}" style="width:100%">`;
        } else if (category === 'Notice') {
            div.style.cssText = "background:#fef01b; padding:15px; border-radius:15px; margin-bottom:10px;";
            div.innerHTML = `<strong>${item.author} 선생님</strong><p>${item.content}</p><small>${item.date}</small>`;
        }
        container.appendChild(div);
    });
}
