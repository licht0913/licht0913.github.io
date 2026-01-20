
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

// 갤러리 상태 (서버에서 가져온 데이터)
let galleryItems = [];
let galleryPage = 1;
const IMAGES_PER_LOAD = 12;

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

    // 3. 알림 점 체크
    checkNewContent();

    // 4. 무한 스크롤
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

    // 갤러리 파일 선택 시 유효성 검사 (즉시)
    const fileInput = getEl('gallery-file');
    if (fileInput) {
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            const btn = getEl('btn-gallery-submit');
            if (file) {
                // 확장자 검사
                if (!file.name.toLowerCase().match(/\.(jpg|jpeg|png)$/i)) {
                    alert("이미지 파일만 가능합니다! (png, jpg, jpeg)");
                    fileInput.value = ''; // 초기화
                    return;
                }
                if (file.size > 5 * 1024 * 1024) {
                    alert("파일 크기가 5MB를 넘습니다!");
                    fileInput.value = '';
                    return;
                }
                // 통과
                if (btn) {
                    btn.disabled = false;
                    btn.innerText = "올리기";
                }
            }
        });
    }

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

    checkDot('community', 'Post', today);
    checkDot('notice', 'Notice', today);
    checkDot('gallery', 'Gallery', today);
}

async function checkDot(key, type, today) {
    const lastRead = localStorage.getItem(`read_date_${key}`);
    if (lastRead === today) return;

    try {
        const res = await fetch(`${CONFIG.API_URL}?type=${type}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
            // 캐시 저장
            if (key === 'gallery') galleryItems = data;
            else postCache[key] = data;

            if (data[0].date === today) {
                getEl(`dot-${key}`).style.display = 'block';
            }
        }
    } catch (e) {
        console.error("Check dot error:", e);
    }
}

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

    if (pageId === 'community') markAsRead('community');
    if (pageId === 'notice') markAsRead('notice');
    if (pageId === 'gallery') markAsRead('gallery');

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

    // 체크박스 상태 저장
    if (getEl('remember-me').checked) localStorage.setItem('remembered_id', id);
    else localStorage.removeItem('remembered_id');

    try {
        const url = `${CONFIG.API_URL}?action=login&id=${id}&pw=${pw}`;
        const res = await fetch(url);
        // HTML이 리턴될 경우를 대비해 텍스트 먼저 확인
        const text = await res.text();
        let json;
        try {
            json = JSON.parse(text);
        } catch (e) {
            throw new Error("서버 응답이 올바르지 않습니다. (HTML 반환됨)");
        }

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
            else if (json.code === "WRONG_PW") alert("비밀번호가 틀렸습니다.");
            else if (json.code === "NO_ID") alert("존재하지 않는 회원입니다.");
            else alert("로그인 실패: " + (json.error || "알 수 없는 오류"));
        }
    } catch (err) {
        console.error("Login failed:", err);
        alert("로그인 중 오류 발생:\n" + err.message);
    }
}

async function handleSignup() {
    const id = getEl('signup-id').value;
    const pw = getEl('signup-pw').value;
    const name = getEl('signup-name').value;
    if (id.length !== 4) return alert("학번은 4자리");

    try {
        const url = `${CONFIG.API_URL}?action=signup&id=${id}&pw=${pw}&name=${name}`;
        const res = await fetch(url);
        const text = await res.text();
        let json;
        try {
            json = JSON.parse(text);
        } catch (e) { throw new Error("서버 응답 오류 (HTML)"); }

        if (json.success) {
            alert("신청 완료! 승인을 기다려주세요.");
            toggleAuthMode('login');
        } else {
            if (json.code === "EXISTS") alert("이미 존재하는 ID입니다.");
            else alert("가입 실패: " + (json.error || ""));
        }
    } catch (e) {
        console.error(e);
        alert("가입 신청 중 오류: " + e.message);
    }
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

    const totalPages = Math.ceil(allPosts.length / ITEMS_PER_PAGE);
    if (totalPages > 1) {
        if (page > 1) {
            const btn = document.createElement('button');
            btn.innerText = "<";
            btn.className = "page-btn";
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
            btn.innerText = ">";
            btn.className = "page-btn";
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
// 갤러리 로직 (서버 연동 & 무한스크롤)
// ==========================================
if (getEl('btn-gallery-write')) getEl('btn-gallery-write').onclick = () => {
    getEl('gallery-write-modal').style.display = 'flex';
    getEl('gallery-title').value = '';
    getEl('gallery-file').value = '';
    const btn = getEl('btn-gallery-submit');
    if (btn) {
        btn.innerText = "올리기";
        btn.disabled = false;
    }
};

function setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            loadMoreGallery();
        }
    });
    const loader = getEl('gallery-loader');
    if (loader) observer.observe(loader);
}

// ★ 사진 업로드 (Base64 -> 서버) ★
window.submitGalleryPost = async () => {
    const title = getEl('gallery-title').value;
    const file = getEl('gallery-file').files[0];

    // 추가 검증 
    if (!title || !file) return alert("입력하세요");
    if (!file.name.toLowerCase().match(/\.(jpg|jpeg|png)$/i)) return alert("확장자 확인!");

    // UI: 업로드 중 표시
    const btn = getEl('btn-gallery-submit');
    btn.innerText = "업로드 중... (잠시만요!)";
    btn.disabled = true;

    // FileReader로 Base64 변환
    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64Data = e.target.result.split(',')[1]; // 헤더 제거

        try {
            const payload = {
                Title: title,
                Author: currentUser,
                Type: 'Gallery',
                Image: base64Data, // data
                MimeType: file.type
            };

            await fetch(CONFIG.API_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            closeModal('gallery-write-modal');
            alert("사진이 등록되었습니다!");

            // 다시 로드
            loadGallery(true); // reload from server

        } catch (err) {
            alert("업로드 실패: " + err);
        } finally {
            if (btn) {
                btn.innerText = "올리기";
                btn.disabled = false;
            }
        }
    };
    reader.readAsDataURL(file);
};

// 갤러리 로드 (서버 기준)
async function loadGallery(reload = false) {
    if (reload) {
        galleryItems = [];
        galleryPage = 1;
        getEl('gallery-grid').innerHTML = '';
    }

    if (galleryItems.length === 0) {
        // 데이터가 없으면 서버에서 가져오기
        try {
            const res = await fetch(`${CONFIG.API_URL}?type=Gallery`);
            const data = await res.json();
            if (Array.isArray(data)) galleryItems = data;
        } catch (e) {
            console.error(e);
        }
    }

    renderGalleryChunk();
}

function loadMoreGallery() {
    if (galleryItems.length === 0) return;
    const currentCount = document.querySelectorAll('.gallery-item').length;
    if (currentCount >= galleryItems.length) return;

    galleryPage++;
    renderGalleryChunk();
}

function renderGalleryChunk() {
    const grid = getEl('gallery-grid');
    const limit = galleryPage * IMAGES_PER_LOAD;
    const currentCount = grid.querySelectorAll('.gallery-item').length;
    const nextBatch = galleryItems.slice(currentCount, limit);

    nextBatch.forEach(item => {
        // item.content 에 이미지 URL이 들어있다고 가정 (GAS에서 처리)
        const imgSrc = (item.content && item.content.startsWith('http')) ? item.content : "https://via.placeholder.com/300?text=No+Image";

        const div = document.createElement('div');
        div.className = "gallery-item";

        let contentHtml = '';
        if (!isAuthorized) {
            contentHtml = `
                <img src="${imgSrc}" class="blur-it">
                 <div class="stamp-overlay" style="width:140px; height:140px; font-size:1.2rem;">
                    <div class="stamp-text-1">가입/승인</div>
                    <div class="stamp-text-2">후</div>
                    <div class="stamp-text-3">열람!</div>
                </div>
            `;
            div.onclick = () => alert("회원가입 후 승인을 받아야 볼 수 있습니다.");
        } else {
            contentHtml = `
                <img src="${imgSrc}" loading="lazy">
                <div class="gallery-overlay">
                    <span class="gallery-title">${item.title}</span>
                    <span class="gallery-author">${item.author}</span>
                </div>
            `;
            div.onclick = () => openImageViewer(imgSrc);
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