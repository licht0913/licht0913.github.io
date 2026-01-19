// DOM Elements
const pages = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('.nav-links li');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinksContainer = document.querySelector('.nav-links');
const toast = document.getElementById('toast');

// Icons
const ICONS = {
    user: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
};

// State
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('class_user');
    if (savedUser) currentUser = JSON.parse(savedUser);

    updateAuthUI();
    initNavigation();
    checkAllRedDots();

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.remove('show');
        });
    });
});

/* ============================
   1. UI & Auth Logic
   ============================ */
window.toggleAuth = function (showSignup) {
    document.getElementById('login-view').style.display = showSignup ? 'none' : 'block';
    document.getElementById('signup-view').style.display = showSignup ? 'block' : 'none';
    document.querySelectorAll('.error-msg').forEach(el => el.style.display = 'none');
}

function updateAuthUI() {
    const loginMenu = document.querySelector('.btn-signup');
    const writeBtn = document.getElementById('btn-write');
    const galleryWrite = document.getElementById('btn-gallery-write');
    const noticeWrite = document.getElementById('btn-notice-write');
    const signupContainer = document.querySelector('.signup-container');

    if (currentUser) {
        loginMenu.textContent = `${currentUser.name} (로그아웃)`;
        loginMenu.classList.add('logout-mode');

        if (writeBtn) writeBtn.style.display = 'flex';
        // 갤러리 글쓰기: 승인된 회원은 누구나 가능
        if (galleryWrite) galleryWrite.style.display = 'flex';

        // 알림장 쓰기: 선생님만
        if (noticeWrite) {
            if (currentUser.role === 'Teacher') noticeWrite.style.display = 'flex';
            else noticeWrite.style.display = 'none';
        }

        if (signupContainer) {
            signupContainer.innerHTML = `<div class="glass-panel" style="text-align:center; padding:50px;"><h2>반갑습니다, ${currentUser.name}님!</h2><p>오늘도 활기찬 하루 되세요.</p></div>`;
        }

        document.querySelectorAll('.blur-content').forEach(el => el.classList.remove('blur-content'));
        const lockMsg = document.getElementById('gallery-lock-msg');
        if (lockMsg) lockMsg.style.display = 'none';

    } else {
        loginMenu.textContent = '로그인';
        loginMenu.classList.remove('logout-mode');
        if (writeBtn) writeBtn.style.display = 'none';
        if (galleryWrite) galleryWrite.style.display = 'none';
        if (noticeWrite) noticeWrite.style.display = 'none';

        const galleryGrid = document.getElementById('gallery-container');
        if (galleryGrid) galleryGrid.classList.add('blur-content');
        const commList = document.getElementById('community-container');
        if (commList) commList.classList.add('blur-content');
        const lockMsg = document.getElementById('gallery-lock-msg');
        if (lockMsg) lockMsg.style.display = 'block';
    }
}

function handleAuthClick() {
    if (currentUser) {
        if (confirm('로그아웃 하시겠습니까?')) {
            currentUser = null;
            localStorage.removeItem('class_user');
            location.reload();
        }
    } else {
        navigateTo('signup');
    }
}

function initNavigation() {
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (link.classList.contains('btn-signup')) return handleAuthClick();
            const targetId = link.getAttribute('data-target');
            if (targetId) navigateTo(targetId);
        });
    });

    mobileMenuBtn.addEventListener('click', () => navLinksContainer.classList.toggle('active'));

    window.navigateTo = function (targetId) {
        pages.forEach(p => p.classList.remove('active'));
        const targetPage = document.getElementById(targetId);
        if (targetPage) {
            targetPage.classList.add('active');
            window.scrollTo(0, 0);
            loadDataFor(targetId);
            clearRedDot(targetId);
        }
    }

    // Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('login-id').value;
            const pw = document.getElementById('login-pw').value;
            const btn = loginForm.querySelector('button');
            btn.disabled = true; btn.textContent = "확인 중...";

            try {
                const res = await fetch(`${CONFIG.API_URL}?action=login&id=${id}&pw=${pw}`);
                const data = await res.json();
                if (data.success) {
                    const user = { id: id, name: data.name, role: data.role || 'Student' };
                    localStorage.setItem('class_user', JSON.stringify(user));
                    alert(`${data.name}${data.role === 'Teacher' ? ' 선생님' : ''} 환영합니다!`);
                    location.reload();
                } else {
                    alert(data.error);
                    btn.disabled = false; btn.textContent = "로그인";
                }
            } catch (err) { alert("접속 오류"); btn.disabled = false; btn.textContent = "로그인"; }
        });
    }

    // Signup Form
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('signup-id').value;
            const pw = document.getElementById('signup-pw').value;
            const name = document.getElementById('signup-name').value;

            if (!/^\d{4}$/.test(id)) return alert("학번은 4자리 숫자여야 합니다!");
            if (pw.length < 8 || !/[!@#$%^&*]/.test(pw)) return alert("비밀번호 조건을 확인해주세요!");

            const btn = signupForm.querySelector('button');
            btn.disabled = true; btn.textContent = "신청 중...";

            try {
                const res = await fetch(`${CONFIG.API_URL}?action=signup&id=${id}&pw=${pw}&name=${encodeURIComponent(name)}`);
                const data = await res.json();
                if (data.success) {
                    alert("담임 선생님의 승인을 기다리세요!");
                    location.reload();
                } else {
                    alert("실패: " + data.error);
                    btn.disabled = false; btn.textContent = "가입 신청하기";
                }
            } catch (err) { alert("오류"); btn.disabled = false; }
        });
    }

    // --- 글쓰기 모달 연결 ---

    // 1. 커뮤니티 (이야기) - write-modal
    const writeModal = document.getElementById('write-modal');
    if (document.getElementById('btn-write')) {
        document.getElementById('btn-write').addEventListener('click', () => writeModal.classList.add('show'));
    }
    const writeForm = document.getElementById('write-form');
    if (writeForm) {
        writeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('post-title').value;
            const content = document.getElementById('post-content').value;
            writeModal.classList.remove('show');
            showToast('등록되었습니다!');
            e.target.reset();
            addPost(title, content, currentUser.name, 'Community');
        });
    }

    // 2. 갤러리 (사진) - gallery-modal
    const galleryModal = document.getElementById('gallery-modal');
    if (document.getElementById('btn-gallery-write')) {
        document.getElementById('btn-gallery-write').addEventListener('click', () => galleryModal.classList.add('show'));
    }
    const galleryForm = document.getElementById('gallery-form');
    if (galleryForm) {
        galleryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('gallery-title').value;
            const fileInput = document.getElementById('gallery-file');

            // 파일 읽기
            let contentBase64 = "";
            if (fileInput.files.length > 0) {
                // 용량 체크 (5MB)
                if (fileInput.files[0].size > 5 * 1024 * 1024) return alert("파일이 너무 큽니다 (5MB 제한)");
                contentBase64 = await toBase64(fileInput.files[0]);
            } else {
                return alert("사진을 선택해주세요!");
            }

            galleryModal.classList.remove('show');
            showToast('사진 업로드 중...');
            e.target.reset();
            document.getElementById('gallery-preview').innerHTML = "";

            // 내용은 Base64 문자열로 저장 (용량 주의)
            addPost(title, contentBase64, currentUser.name, 'Gallery');
        });

        // 미리보기
        document.getElementById('gallery-file').addEventListener('change', async (e) => {
            if (e.target.files[0]) {
                const base64 = await toBase64(e.target.files[0]);
                document.getElementById('gallery-preview').innerHTML = `<img src="${base64}" style="max-height:150px; border-radius:10px;">`;
            }
        });
    }

    // 3. 알림장 (선생님) - notice-modal
    const noticeModal = document.getElementById('notice-modal');
    if (document.getElementById('btn-notice-write')) {
        document.getElementById('btn-notice-write').addEventListener('click', () => noticeModal.classList.add('show'));
    }
    const noticeForm = document.getElementById('notice-form');
    if (noticeForm) {
        noticeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const content = document.getElementById('notice-content').value;
            const fileInput = document.getElementById('notice-file');

            let fileData = "";
            if (fileInput.files.length > 0) {
                if (fileInput.files[0].size > 5 * 1024 * 1024) return alert("파일이 너무 큽니다.");
                fileData = await toBase64(fileInput.files[0]);
            }

            // NOTICE는 본문+사진을 JSON 문자열 등으로 합쳐서 저장하거나
            // 심플하게 "내용 |IMAGE| 베이스64" 형식으로 저장해서 읽을 때 파싱
            const finalContent = fileData ? `${content} |IMG| ${fileData}` : content;

            noticeModal.classList.remove('show');
            showToast('알림 전송 중...');
            e.target.reset();

            addPost("알림장", finalContent, currentUser.name, 'Notice');
        });
    }

    // 바이트 체크 로직
    bindByteCheck('post-title', 'title-byte', 30);
    bindByteCheck('gallery-title', 'gallery-byte', 30);
}

function bindByteCheck(inputId, displayId, maxv) {
    const input = document.getElementById(inputId);
    const display = document.getElementById(displayId);
    if (input && display) {
        input.addEventListener('input', (e) => {
            let b = 0;
            const val = e.target.value;
            for (let i = 0; i < val.length; i++) b += (val.charCodeAt(i) > 127) ? 2 : 1;
            display.textContent = `${b}/${maxv}`;
            display.style.color = b > maxv ? 'red' : '#888';
        });
    }
}

// 파일 -> Base64 변환
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}


/* ============================
   2. Data Load
   ============================ */

async function loadDataFor(pageId) {
    if (pageId === 'community') fetchPosts('Community');
    else if (pageId === 'gallery') fetchPosts('Gallery');
    else if (pageId === 'notice') fetchPosts('Notice');
}

async function fetchPosts(category) {
    const containerId = category === 'Community' ? 'community-container' :
        (category === 'Gallery' ? 'gallery-container' : 'notice-container');
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<div class="spinner"></div>';

    try {
        const res = await fetch(`${CONFIG.API_URL}?action=list&category=${category}`);
        const list = await res.json();
        renderList(list, category, container);
    } catch (e) {
        console.error(e);
        container.innerHTML = '<p>로딩 실패</p>';
    }
}

function renderList(list, category, container) {
    container.innerHTML = '';

    if (!list || list.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>내용이 없습니다.</p></div>';
        return;
    }

    list.forEach(item => {
        const div = document.createElement('div');

        if (category === 'Community') {
            div.className = 'community-item';
            let shortContent = item.content.length > 30 ? item.content.substring(0, 30) + "..." : item.content;
            div.innerHTML = `
                <div onclick="alert('[${item.title}]\\n\\n${item.content}')" style="cursor:pointer">
                    <h4>${item.title}</h4>
                    <div class="meta"><span>${ICONS.user} ${item.author}</span> &bull; <span>${item.date}</span></div>
                    <p style="color:#666; font-size:0.9rem; margin-top:5px;">${shortContent}</p>
                </div>`;
        }
        else if (category === 'Gallery') {
            div.className = 'gallery-item';
            // content가 Base64 이미지라고 가정
            // 너무 길면 렌더링 느려질 수 있으니 주의
            let imgSrc = item.content.startsWith('data:image') ? item.content : `https://picsum.photos/300/300?random=${item.id}`;

            div.onclick = () => openImageModal(imgSrc, item.title);
            div.innerHTML = `<img src="${imgSrc}" loading="lazy"><div class="gallery-overlay"><h4>${item.title}</h4></div>`;
        }
        else if (category === 'Notice') {
            div.className = 'notice-item';
            div.style.cssText = "display:flex; gap:15px; margin-bottom:20px; align-items:flex-start;";

            // 파싱: "내용 |IMG| 베이스64"
            let realContent = item.content;
            let attachHtml = "";
            if (item.content.includes(" |IMG| ")) {
                const parts = item.content.split(" |IMG| ");
                realContent = parts[0];
                const imgData = parts[1];
                attachHtml = `<div style="margin-bottom:10px;"><a href="#" onclick="openImageModal('${imgData}', '첨부파일'); return false;" style="color:#2980b9; font-weight:bold;">📎 이미지 첨부파일 확인</a></div>`;
            }

            div.innerHTML = `
                <div style="width:50px; height:50px; background:#ffd700; border-radius:50%; flex-shrink:0; overflow:hidden; border:2px solid #fff; box-shadow:0 3px 6px rgba(0,0,0,0.1);">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Teacher" style="width:100%; height:100%;">
                </div>
                <div style="background:#fef01b; padding:15px; border-radius:15px; border-top-left-radius:0; box-shadow:0 2px 5px rgba(0,0,0,0.05); max-width:80%;">
                    <h4 style="margin-bottom:5px; color:#3e2723;">${item.author} 선생님</h4>
                    ${attachHtml}
                    <p style="white-space:pre-wrap; line-height:1.5; color:#000;">${realContent}</p>
                    <div style="font-size:0.8rem; color:#887100; margin-top:5px; text-align:right;">${item.date}</div>
                </div>
            `;
        }
        container.appendChild(div);
    });
}

// POST 전송
async function addPost(title, content, author, category) {
    try {
        await fetch(CONFIG.API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({ Title: title, Content: content, Author: author, Category: category })
        });

        setTimeout(() => fetchPosts(category), 2000); // 2초 대기 (데이터 저장 시간 고려)
    } catch (e) {
        console.error(e);
        alert("전송 실패 (인터넷 상태를 확인하세요)");
    }
}

// Red Dots
async function checkAllRedDots() {
    if (!currentUser) return;
    ['Community', 'Gallery', 'Notice'].forEach(async cat => {
        try {
            const res = await fetch(`${CONFIG.API_URL}?action=list&category=${cat}`);
            const list = await res.json();
            if (list && list.length > 0) {
                // 저장된 마지막 확인 시간보다 최신 글이 있으면 표시
                // 지금은 편의상 ID나 그냥 무조건 체크하는 식 (정교화 필요)
            }
        } catch (e) { }
    });
}

function clearRedDot(pageId) {
    const dot = document.getElementById(`noti-${pageId}`);
    if (dot) dot.style.display = 'none';
}

// Modal Helpers
window.openImageModal = function (src, title) {
    let modal = document.getElementById('img-preview-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'img-preview-modal';
        modal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:9999; display:flex; justify-content:center; align-items:center; flex-direction:column;";
        modal.innerHTML = `
            <span style="position:absolute; top:20px; right:20px; color:white; font-size:2rem; cursor:pointer;" onclick="this.parentElement.remove()">&times;</span>
            <img id="preview-img" style="max-width:95%; max-height:80%; border-radius:10px; box-shadow:0 0 20px rgba(255,255,255,0.2);">
            <h3 id="preview-title" style="color:white; margin-top:20px;"></h3>
        `;
        document.body.appendChild(modal);
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); }
    }
    document.getElementById('preview-img').src = src;
    document.getElementById('preview-title').textContent = title || "";
}

window.openLunchModal = async function () {/*...생략(기존유지)...*/
    document.getElementById('lunch-modal').classList.add('show');
    const content = document.getElementById('lunch-content');
    content.innerHTML = '<div class="spinner" style="margin:20px auto"></div>';
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}${mm}${dd}`;
    const apiKey = "46327e96a40f4ed3959b2a4acccf705d";
    const officeCode = "G10";
    const schoolCode = "7441029";
    const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=${apiKey}&Type=json&pIndex=1&pSize=10&ATPT_OFCDC_SC_CODE=${officeCode}&SD_SCHUL_CODE=${schoolCode}&MLSV_YMD=${todayStr}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.mealServiceDietInfo) {
            const row = data.mealServiceDietInfo[1].row[0];
            const menuRaw = row.DDISH_NM;
            const cal = row.CAL_INFO;
            content.innerHTML = `<div style="font-weight:bold; font-size:1.2rem; color:var(--primary); margin-bottom:10px;">*오늘의 점심* <span style="font-size:0.9rem; color:#888;">(${cal})</span></div><div>${menuRaw}</div>`;
        } else {
            content.innerHTML = "<h3>급식 없는 날!</h3><p>오늘은 급식이 없습니다.</p>";
        }
    } catch (e) {
        content.textContent = "메뉴를 불러오지 못했습니다.";
    }
};
window.closeLunchModal = function () { document.getElementById('lunch-modal').classList.remove('show'); }
function loadMockGallery() { return; }
