// State
let currentUser = null;

// Helpers
const getEl = (id) => document.getElementById(id);
const getAll = (sel) => document.querySelectorAll(sel);

// Navigation
window.navigateTo = function (targetId) {
    const pages = getAll('.page');
    pages.forEach(p => p.classList.remove('active'));

    const targetPage = getEl(targetId);
    if (targetPage) {
        targetPage.classList.add('active');
        window.scrollTo(0, 0);
        loadDataFor(targetId);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Restore user
    const savedUser = localStorage.getItem('class_user');
    if (savedUser) {
        try { currentUser = JSON.parse(savedUser); } catch (e) { localStorage.removeItem('class_user'); }
    }

    updateAuthUI();
    initGlobalEvents();
    initAuthForms();
    initWriteForms();

    // Byte check binders
    bindByteCheck('post-title', 'title-byte', 30);
    bindByteCheck('gallery-title', 'gallery-byte', 30);
});

function updateAuthUI() {
    const loginLink = document.querySelector('.btn-signup');
    if (currentUser) {
        if (loginLink) {
            loginLink.textContent = `${currentUser.name} (로그아웃)`;
            loginLink.classList.add('logout-mode');
        }
        // Show write buttons
        if (getEl('btn-write')) getEl('btn-write').style.display = 'flex';
        if (getEl('btn-gallery-write')) getEl('btn-gallery-write').style.display = 'flex';
        if (getEl('btn-notice-write')) getEl('btn-notice-write').style.display = (currentUser.role === 'Teacher') ? 'flex' : 'none';

        getAll('.blur-target').forEach(el => el.classList.remove('blur-content'));
        getAll('.lock-msg').forEach(el => el.style.display = 'none');
    } else {
        if (loginLink) {
            loginLink.textContent = '로그인';
            loginLink.classList.remove('logout-mode');
        }
        if (getEl('btn-write')) getEl('btn-write').style.display = 'none';
        if (getEl('btn-gallery-write')) getEl('btn-gallery-write').style.display = 'none';
        if (getEl('btn-notice-write')) getEl('btn-notice-write').style.display = 'none';

        getAll('.blur-target').forEach(el => el.classList.add('blur-content'));
        getAll('.lock-msg').forEach(el => el.style.display = 'block');
    }
}

function initGlobalEvents() {
    const logo = document.querySelector('.logo');
    if (logo) logo.onclick = () => navigateTo('home');

    const loginLink = document.querySelector('.btn-signup');
    if (loginLink) {
        loginLink.onclick = () => {
            if (currentUser) {
                if (confirm('로그아웃 하시겠습니까?')) {
                    localStorage.removeItem('class_user');
                    location.reload();
                }
            } else { navigateTo('signup'); }
        };
    }

    getAll('.close-modal').forEach(btn => {
        btn.onclick = () => { getAll('.modal').forEach(m => m.classList.remove('show')); };
    });
}

function initAuthForms() {
    const loginForm = getEl('login-form');
    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const id = getEl('login-id').value;
            const pw = getEl('login-pw').value;
            const btn = loginForm.querySelector('button');
            btn.disabled = true; btn.textContent = "확인 중...";

            try {
                const res = await fetch(`${CONFIG.API_URL}?action=login&id=${id}&pw=${pw}`);
                const data = await res.json();
                if (data.success) {
                    localStorage.setItem('class_user', JSON.stringify({ id, name: data.name, role: data.role || 'Student' }));
                    alert("승인되었습니다!");
                    location.reload();
                } else {
                    alert(data.error || "실패했습니다.");
                    btn.disabled = false; btn.textContent = "로그인";
                }
            } catch (err) { alert("연결 오류"); btn.disabled = false; }
        };
    }

    const signupForm = getEl('signup-form');
    if (signupForm) {
        signupForm.onsubmit = async (e) => {
            e.preventDefault();
            const id = getEl('signup-id').value;
            const pw = getEl('signup-pw').value;
            const name = getEl('signup-name').value;

            if (!/^\d{4}$/.test(id)) return alert("학번은 4자리 숫자여야 합니다!");
            if (pw.length < 8 || !/[!@#$%^&*]/.test(pw)) return alert("비밀번호 조건을 확인해주세요!");

            const btn = signupForm.querySelector('button');
            btn.disabled = true; btn.textContent = "신청 중...";

            try {
                const url = `${CONFIG.API_URL}?action=signup&id=${id}&pw=${pw}&name=${encodeURIComponent(name)}`;
                const res = await fetch(url);
                const text = await res.text();
                let data;
                try { data = JSON.parse(text); } catch (e) { throw new Error("서버 응답 오류"); }

                if (data.success) {
                    alert("담임 선생님의 승인을 기다리세요!");
                    navigateTo('home');
                } else {
                    alert(data.error || "가입 오류");
                    btn.disabled = false; btn.textContent = "가입 신청하기";
                }
            } catch (err) { alert(err.message); btn.disabled = false; }
        };
    }
}

async function loadDataFor(pageId) {
    if (pageId === 'community') fetchList('Community', 'community-container');
    if (pageId === 'gallery') fetchList('Gallery', 'gallery-container');
    if (pageId === 'notice') fetchList('Notice', 'notice-container');
    if (pageId === 'home') loadLunch();
}

async function fetchList(category, containerId) {
    const container = getEl(containerId);
    if (!container) return;
    container.innerHTML = '<div style="text-align:center; padding:20px;">불러오는 중...</div>';
    try {
        const res = await fetch(`${CONFIG.API_URL}?action=list&category=${category}`);
        const list = await res.json();
        renderList(list, category, container);
    } catch (e) { container.innerHTML = '<p>불러오기 실패</p>'; }
}

function renderList(list, category, container) {
    container.innerHTML = '';
    if (!list || list.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:50px;">글이 없습니다.</p>';
        return;
    }
    list.forEach(item => {
        const div = document.createElement('div');
        if (category === 'Community') {
            div.className = 'community-item glass-panel';
            div.style.marginBottom = "15px";
            div.innerHTML = `<h4 onclick="alert('${item.content}')" style="cursor:pointer">${item.title}</h4><div class="meta">${item.author} &bull; ${item.date}</div>`;
        } else if (category === 'Gallery') {
            div.className = 'gallery-item';
            div.innerHTML = `<img src="${item.content}" onclick="window.openImageModal('${item.content}')">`;
        } else if (category === 'Notice') {
            div.className = 'notice-item';
            div.innerHTML = `<div class="notice-meta"><strong>${item.author} 선생님</strong> &bull; ${item.date}</div><p>${item.content}</p>`;
        }
        container.appendChild(div);
    });
}

function bindByteCheck(inputId, displayId, maxv) {
    const input = getEl(inputId);
    const display = getEl(displayId);
    if (input && display) {
        input.oninput = (e) => {
            let b = 0; const val = e.target.value;
            for (let i = 0; i < val.length; i++) b += (val.charCodeAt(i) > 127) ? 2 : 1;
            display.textContent = `${b}/${maxv}`;
            display.style.color = b > maxv ? 'red' : '#888';
        };
    }
}

function initWriteForms() {
    if (getEl('btn-write')) getEl('btn-write').onclick = () => getEl('write-modal').classList.add('show');
    if (getEl('btn-gallery-write')) getEl('btn-gallery-write').onclick = () => getEl('gallery-modal').classList.add('show');
    if (getEl('btn-notice-write')) getEl('btn-notice-write').onclick = () => getEl('notice-modal').classList.add('show');
}

async function loadLunch() {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&ATPT_OFCDC_SC_CODE=J10&SD_SCHUL_CODE=7530544&MLSV_YMD=${today}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        const content = getEl('lunch-content');
        if (data.mealServiceDietInfo) {
            const menu = data.mealServiceDietInfo[1].row[0].DDISH_NM.replace(/<br\/>/g, '\n');
            content.innerText = menu;
        } else { content.innerText = "급식 정보가 없습니다."; }
    } catch (e) { getEl('lunch-content').innerText = "정보 로딩 실패"; }
}

window.openLunchModal = () => { getEl('lunch-modal').classList.add('show'); loadLunch(); };
window.closeLunchModal = () => getEl('lunch-modal').classList.remove('show');
window.openImageModal = (src) => {
    alert("이미지 클릭됨: " + src.substring(0, 20) + "...");
    // 실제 이미지 모달 로직 구현 시 추가
};

window.toggleAuth = (show) => {
    getEl('login-view').style.display = show ? 'none' : 'block';
    getEl('signup-view').style.display = show ? 'block' : 'none';
};
