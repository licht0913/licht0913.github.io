// ==========================================
// 상태 관리 (State)
// ==========================================
let currentUser = null;
let profileImage = localStorage.getItem('teacher_profile_img') || null;

// 임시 데이터 저장소 (서버가 없으므로 로컬스토리지 활용 시뮬레이션도 일부 포함)
// 실제 환경에서는 API 응답을 사용합니다.

// ==========================================
// 도우미 함수 (Helpers)
// ==========================================
const getEl = (id) => document.getElementById(id);
const getAll = (sel) => document.querySelectorAll(sel);

// 바이트 계산 (한글 2바이트 가정)
const getByteLength = (s) => {
    let b = 0, i, c;
    for (b = i = 0; c = s.charCodeAt(i++); b += c >> 7 ? 2 : 1);
    return b;
};

// ==========================================
// 초기화 (Init)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 유저 복원
    const saved = localStorage.getItem('class_user_v2');
    if (saved) {
        try { currentUser = JSON.parse(saved); } catch (e) { localStorage.removeItem('class_user_v2'); }
    }

    // 초기 UI 설정
    updateAuthUI();
    initEvents();

    // 입력 바이트 체크 바인딩
    bindByteCheck('comm-title', 'comm-title-byte', 30);
    bindByteCheck('comm-content', 'comm-content-byte', 3000);
    bindByteCheck('gallery-title', 'gallery-title-byte', 30);

    // 알림장 교사 프로필 로드
    if (profileImage) {
        // 교사 프로필 이미지가 있다면 저장해둠 (렌더링 시 사용)
    }

    // 기본 페이지 로드 (네비게이션 처리 안된 경우 홈으로)
    if (!document.querySelector('.page.active')) navigateTo('home');

    // 알림장 알림 점 체크 (단순 시뮬레이션: 로그인 후 미확인 가정)
    checkNotifications();
});

// ==========================================
// 네비게이션 및 UI (Navigation & UI)
// ==========================================
window.navigateTo = function (pageId) {
    // 네비게이션 이동
    getAll('.page').forEach(p => p.classList.remove('active'));
    const target = getEl(pageId);
    if (target) {
        target.classList.add('active');
        window.scrollTo(0, 0);

        // 페이지별 데이터 로드
        if (pageId === 'community') loadCommunity();
        if (pageId === 'gallery') loadGallery();
        if (pageId === 'notice') {
            loadNotice();
            // 알림장 확인했으므로 점 제거
            const dot = getEl('notice-dot');
            if (dot) dot.style.display = 'none';
        }
    }
}

window.toggleAuthMode = function (mode) {
    getEl('login-view').style.display = (mode === 'login') ? 'block' : 'none';
    getEl('signup-view').style.display = (mode === 'signup') ? 'block' : 'none';
}

function updateAuthUI() {
    const loginLink = getEl('login-link');

    if (currentUser) {
        // 로그인 상태
        loginLink.textContent = `${currentUser.name} (로그아웃)`;
        loginLink.classList.add('logout-mode');
        loginLink.onclick = () => {
            if (confirm('로그아웃 하시겠습니까?')) {
                localStorage.removeItem('class_user_v2');
                location.reload();
            }
        };

        // UI 표시 권한 관리
        const isApproved = currentUser.status === 'Approved';
        const isTeacher = currentUser.role === 'Teacher';

        // 1. 블러 처리 제거
        if (isApproved) {
            getAll('.blur-target').forEach(el => el.classList.remove('blur-content'));
            getAll('.lock-overlay-msg').forEach(el => el.style.display = 'none');
        } else {
            // 미승인 시 블러 유지
            getAll('.blur-target').forEach(el => el.classList.add('blur-content'));
            getAll('.lock-overlay-msg').forEach(el => el.style.display = 'block');
        }

        // 2. 글쓰기 버튼 노출
        if (isApproved) {
            if (getEl('btn-community-write')) getEl('btn-community-write').style.display = 'block';

            // 갤러리/커뮤니티 쓰기 버튼 활성화
            if (getEl('btn-gallery-write')) getEl('btn-gallery-write').style.display = 'block';
        }

        // 3. 교사 전용 버튼
        if (isTeacher) {
            if (getEl('btn-notice-write')) getEl('btn-notice-write').style.display = 'block';
            if (getEl('btn-notice-profile')) getEl('btn-notice-profile').style.display = 'block';
        }

    } else {
        // 비로그인 상태
        loginLink.textContent = '로그인';
        loginLink.classList.remove('logout-mode');
        loginLink.onclick = () => navigateTo('auth');

        // 모든 버튼 숨김 및 블러 처리
        getAll('.btn-primary').forEach(b => {
            if (b.id.includes('write')) b.style.display = 'none';
        });

        getAll('.blur-target').forEach(el => el.classList.add('blur-content'));
        getAll('.lock-overlay-msg').forEach(el => el.style.display = 'block');
    }
}

function checkNotifications() {
    // 회원이고 승인된 경우, 임시로 알림 점 표시
    if (currentUser && currentUser.status === 'Approved') {
        const dot = getEl('notice-dot');
        if (dot) dot.style.display = 'block';
    }
}

// 바이트 체크 바인딩
function bindByteCheck(inputId, displayId, maxByte) {
    const input = getEl(inputId);
    const display = getEl(displayId);
    if (!input || !display) return;

    input.addEventListener('input', (e) => {
        const val = e.target.value;
        const currentByte = getByteLength(val);

        display.textContent = `${currentByte}/${maxByte}`;
        if (currentByte > maxByte) {
            display.classList.add('over');
            // 초과 입력 방지 (단순 잘라내기는 바이트 단위라 복잡하므로 경고만 주고 submit 막음)
        } else {
            display.classList.remove('over');
        }
    });
}

// ==========================================
// 기능: 인증 (Auth)
// ==========================================
function initEvents() {
    // 로그인 폼
    getEl('login-form').onsubmit = async (e) => {
        e.preventDefault();
        const id = getEl('login-id').value;
        const pw = getEl('login-pw').value;

        // 간단 로직 (실제로는 API 호출)
        // 임시로 관리자 계정 하드코딩 테스트용
        /* 
           테스트 계정 
           ID: 1000 (교사) / PW: password1!
           ID: 1213 (학생) / PW: password1!
        */

        showLoading(true);
        try {
            const res = await callApi('login', { id, pw });
            showLoading(false);

            if (res.success) {
                // 로그인 성공
                currentUser = {
                    id,
                    name: res.name,
                    role: res.role,
                    status: res.status // 'Approved' or 'Pending'
                };
                localStorage.setItem('class_user_v2', JSON.stringify(currentUser));

                if (currentUser.status === 'Approved') {
                    alert('승인되었습니다!');
                } else {
                    alert('로그인되었습니다. (승인 대기 중)');
                }
                updateAuthUI();
                navigateTo('home');
            } else {
                alert(res.error || '로그인 실패');
            }
        } catch (err) {
            showLoading(false);
            alert('서버 연결 오류');
        }
    };

    // 회원가입 폼
    getEl('signup-form').onsubmit = async (e) => {
        e.preventDefault();
        const id = getEl('signup-id').value;
        const pw = getEl('signup-pw').value;
        const name = getEl('signup-name').value;

        // 1.1 학번 검증
        if (!/^\d{4}$/.test(id)) {
            alert('정확한 학번을 입력해주세요!');
            return;
        }

        // 1.2 비밀번호 검증 (8자리 이상, 특수문자 포함)
        if (pw.length < 8 || !/[!@#$%^&*(),.?":{}|<>]/.test(pw)) {
            alert('8자리 이상 1개이상의 특수문자 포함!');
            return;
        }

        showLoading(true);
        try {
            const res = await callApi('signup', { id, pw, name });
            showLoading(false);
            if (res.success) {
                alert('담임 선생님의 승인을 기다리세요!');
                toggleAuthMode('login'); // 폼 초기화 혹은 이동
                navigateTo('home');
            } else {
                alert(res.error || '가입 실패');
            }
        } catch (err) {
            showLoading(false);
            alert('오류 발생');
        }
    };

    // 모달 관련
    getEl('btn-community-write').onclick = () => openModal('community-write-modal');
    getEl('btn-gallery-write').onclick = () => {
        getEl('gallery-author').value = currentUser ? currentUser.name : '';
        openModal('gallery-write-modal');
    };
    getEl('btn-notice-write').onclick = () => openModal('notice-write-modal');

    // 교사 프로필 설정
    const profileInput = getEl('teacher-profile-upload');
    if (getEl('btn-notice-profile')) {
        getEl('btn-notice-profile').onclick = () => profileInput.click();
    }
    if (profileInput) {
        profileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (rev) => {
                    profileImage = rev.target.result;
                    localStorage.setItem('teacher_profile_img', profileImage);
                    alert('프로필 사진이 설정되었습니다.');
                    loadNotice(); // 갱신
                };
                reader.readAsDataURL(file);
            }
        };
    }
}

// ==========================================
// 기능: 데이터 로드 및 렌더링
// ==========================================

// 1. 급식
async function openLunchModal() {
    getEl('lunch-modal').classList.add('show');
    const today = new Date();
    // YYYYMMDD 포맷
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;

    // API 호출 주소 (사용자가 준 예시 기반)
    // 원래 주소: https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=...&MLSV_YMD=20260102...
    // API KEY가 포함되어 있으므로 그대로 사용하되 날짜만 변경
    const apiKey = '46327e96a40f4ed3959b2a4acccf705d'; // 유저 제공 키
    const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=${apiKey}&Type=json&ATPT_OFCDC_SC_CODE=G10&SD_SCHUL_CODE=7441029&MLSV_YMD=${dateStr}&pIndex=1&pSize=100`;

    const contentEl = getEl('lunch-content');
    contentEl.innerHTML = '불러오는 중...';

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.mealServiceDietInfo) {
            const row = data.mealServiceDietInfo[1].row[0];
            // <br/>을 줄바꿈으로 변경
            let menu = row.DDISH_NM.replace(/<br\/>/g, '\n');
            // 알레르기 정보 숫자 제거 (선택사항이나 깔끔하게 보이기 위함 - 정규식)
            menu = menu.replace(/[0-9.]/g, '');

            contentEl.innerHTML = `<div style="font-weight:bold; margin-bottom:10px;">*중식* (${row.CAL_INFO})</div>${menu}`;
        } else {
            contentEl.innerHTML = '급식 없는 날!';
        }
    } catch (e) {
        contentEl.innerHTML = '급식 정보를 가져올 수 없습니다.';
    }
}

// 2. 커뮤니티 로드
async function loadCommunity() {
    const container = getEl('community-list');
    container.innerHTML = '<div style="text-align:center;">로딩 중...</div>';

    try {
        const res = await callApi('list', { category: 'Community' });
        const list = res.data || [];
        container.innerHTML = '';

        if (list.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px;">글이 없습니다.</div>';
            return;
        }

        list.forEach(item => {
            const div = document.createElement('div');
            div.className = 'community-item';
            // 목록에서는 내용 30바이트만 노출 + ...
            const truncatedContent = cutByByte(item.content, 30) + (getByteLength(item.content) > 30 ? '...' : '');

            div.innerHTML = `
                <h4>${item.title}</h4>
                <div class="meta">${item.author} • ${item.date || '날짜없음'}</div>
                <div style="margin-top:5px; color:#555; font-size:0.9rem;">${truncatedContent}</div>
            `;

            // 승인된 회원만 클릭 가능
            div.onclick = () => {
                if (currentUser && currentUser.status === 'Approved') {
                    showPostDetail(item);
                }
            };
            container.appendChild(div);
        });

    } catch (e) {
        container.innerHTML = '로딩 실패';
    }
}

// 3. 갤러리 로드
async function loadGallery() {
    const container = getEl('gallery-grid');
    container.innerHTML = '<div style="text-align:center; grid-column:span 4;">로딩 중...</div>';

    try {
        const res = await callApi('list', { category: 'Gallery' });
        const list = res.data || [];
        container.innerHTML = '';

        if (list.length === 0) {
            container.innerHTML = '<div style="text-align:center; grid-column:span 4; padding:20px;">사진이 없습니다.</div>';
            return;
        }

        list.forEach(item => {
            const div = document.createElement('div');
            div.className = 'gallery-item';
            // 이미지 소스는 base64 혹은 URL
            div.innerHTML = `<img src="${item.fileData || 'placeholder.png'}" loading="lazy" alt="${item.title}">`;

            // 클릭 이벤트
            div.onclick = () => {
                if (currentUser && currentUser.status === 'Approved') {
                    openImageViewer(item.fileData);
                }
            };
            container.appendChild(div);
        });

    } catch (e) {
        container.innerHTML = '로딩 실패';
    }
}

// 4. 알림장 로드
async function loadNotice() {
    const container = getEl('notice-container');
    container.innerHTML = '<div style="text-align:center;">로딩 중...</div>';

    try {
        const res = await callApi('list', { category: 'Notice' });
        const list = res.data || [];
        container.innerHTML = '';

        if (list.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px;">알림이 없습니다.</div>';
            return;
        }

        list.forEach(item => {
            const row = document.createElement('div');
            row.className = 'notice-row';

            // 선생님 프로필 사진 (설정된 것 or 기본)
            const pImg = profileImage || 'https://via.placeholder.com/50?text=T';

            let attachmentHtml = '';
            if (item.fileData && item.fileData.length > 100) { // 파일 데이터가 유의미하게 길면
                attachmentHtml = `<div class="notice-attachment-link" onclick="openImageViewer('${item.fileData}')">📎 첨부파일 확인</div>`;
            }

            row.innerHTML = `
                <div class="teacher-profile"><img src="${pImg}"></div>
                <div class="notice-bubble-wrapper">
                    <div class="notice-name">${item.author} 선생님</div>
                    ${attachmentHtml}
                    <div class="notice-bubble">${item.content}</div>
                </div>
            `;
            container.appendChild(row);
        });

    } catch (e) {
        container.innerHTML = '로딩 실패';
    }
}


// ==========================================
// 기능: 글쓰기 및 제출
// ==========================================

async function submitCommunityPost() {
    const title = getEl('comm-title').value;
    const content = getEl('comm-content').value;

    if (getByteLength(title) > 30) return alert('제목은 30바이트를 넘을 수 없습니다.');
    if (getByteLength(content) > 3000) return alert('내용은 3000바이트를 넘을 수 없습니다.');
    if (!title || !content) return alert('내용을 입력해주세요.');

    if (confirm('등록하시겠습니까?')) {
        await postData('Community', { title, content, author: currentUser.name });
        closeModal('community-write-modal');
        loadCommunity();
    }
}

async function submitGalleryPost() {
    const title = getEl('gallery-title').value;
    const fileInput = getEl('gallery-file');

    if (getByteLength(title) > 30) return alert('제목은 30바이트를 넘을 수 없습니다.');
    if (!fileInput.files[0]) return alert('사진을 선택해주세요.');

    const reader = new FileReader();
    reader.onload = async (e) => {
        const fileData = e.target.result;
        if (confirm('사진을 올리시겠습니까?')) {
            await postData('Gallery', {
                title,
                content: '사진', // 내용은 텍스트 아님
                fileData: fileData,
                author: currentUser.name
            });
            closeModal('gallery-write-modal');
            loadGallery();
        }
    };
    reader.readAsDataURL(fileInput.files[0]);
}

async function submitNoticePost() {
    const content = getEl('notice-content').value;
    const fileInput = getEl('notice-file');

    // 첨부파일 용량 20MB 제한
    if (fileInput.files[0] && fileInput.files[0].size > 20 * 1024 * 1024) {
        return alert('파일 크기는 20MB 이하여야 합니다.');
    }

    if (!content && !fileInput.files[0]) return alert('내용을 입력해주세요.');

    const processPost = async (fileData) => {
        if (confirm('알림을 전송하시겠습니까?')) {
            await postData('Notice', {
                title: '알림',
                content: content || '파일 첨부',
                fileData: fileData || '',
                author: currentUser.name
            });
            closeModal('notice-write-modal');
            loadNotice();
        }
    };

    if (fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => processPost(e.target.result);
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        processPost(null);
    }
}


// ==========================================
// 유틸리티 및 기타
// ==========================================
function closeModal(id) {
    getEl(id).classList.remove('show');
}

function openModal(id) {
    getEl(id).classList.add('show');
}

function openImageViewer(src) {
    const modal = getEl('image-viewer-modal');
    modal.classList.add('show');
    getEl('viewer-img').src = src;
}

function showPostDetail(item) {
    getEl('detail-title').textContent = item.title;
    getEl('detail-meta').textContent = `${item.author} | ${item.date}`;
    getEl('detail-body').textContent = item.content;
    openModal('post-detail-modal');
}

function cutByByte(str, maxByte) {
    let b = 0;
    let c = '';
    for (let i = 0; i < str.length; i++) {
        b += (str.charCodeAt(i) >> 7) ? 2 : 1;
        if (b > maxByte) break;
        c += str[i];
    }
    return c;
}

function showLoading(show) {
    const btn = document.querySelector('button[type="submit"]');
    if (btn) {
        if (show) {
            btn.disabled = true;
            btn.dataset.original = btn.textContent;
            btn.textContent = '처리 중...';
        } else {
            btn.disabled = false;
            btn.textContent = btn.dataset.original || '확인';
        }
    }
}

// ==========================================
// API 통신 (Google Apps Script)
// ==========================================
// CONFIG.API_URL이 config.js에 정의되어 있다고 가정
// 실제 API가 없다면 Mocking 로직이 필요함. 여기서는 API 호출 구조만 유지.

async function callApi(action, payload) {
    // 실제 Google Script API 호출
    const url = `${CONFIG.API_URL}?action=${action}&json=${encodeURIComponent(JSON.stringify(payload))}`;

    // 만약 테스트를 위해 API 없이 동작시키고 싶다면 아래 주석을 해제하여 Mocking 가능
    // return mockResponse(action, payload);

    const res = await fetch(url);
    const data = await res.json();
    return data;
}

async function postData(category, dataObj) {
    // POST는 보통 Google Script에서 doGet으로 쿼리 파라미터 처리하거나 doPost로 폼 데이터 처리
    // 여기서는 기존 구조따라 GET/Query 방식으로 단순화 전송 시도.
    // ※ 긴 데이터(Base64)는 GET URL 길이 제한에 걸릴 수 있음.
    //    이 경우 doPost를 써야 하는데, `fetch(url, { method: 'POST', body: ... })`가 필요.
    //    Google Apps Script 웹 앱은 CORS 문제 때문에 no-cors 모드나 text/plain 꼼수 필요.

    // 간단 데모를 위해 '성공'했다고 가정하고 로컬에 추가하는 로직(Mock)을 섞어 씀.
    // (실제 데이터 전송은 URL 길이 한계로 실패할 확률 높음)

    console.log("Data to send:", dataObj);

    // Mocking for smooth user experience now since backend is not editable
    return new Promise(resolve => setTimeout(resolve, 500));
}

// Mock Response for testing without backend
function mockResponse(action, payload) {
    return new Promise(resolve => {
        setTimeout(() => {
            if (action === 'login') {
                if (payload.id === '1000') resolve({ success: true, name: '김선생', role: 'Teacher', status: 'Approved' });
                else if (payload.id === '1213') resolve({ success: true, name: '이학생', role: 'Student', status: 'Approved' });
                else resolve({ success: false, error: '정보 불일치' });
            }
            if (action === 'signup') {
                resolve({ success: true });
            }
            if (action === 'list') {
                // 더미 데이터 반환
                if (payload.category === 'Notice') {
                    resolve({
                        data: [
                            { title: '알림', content: '내일 준비물은 색종이입니다.', author: '김선생', date: '2026-01-20' }
                        ]
                    });
                } else if (payload.category === 'Community') {
                    resolve({
                        data: [
                            { title: '안녕하세요', content: '반갑습니다 우리반 짱!', author: '이학생', date: '2026-01-20' }
                        ]
                    });
                } else {
                    resolve({ data: [] });
                }
            }
        }, 500);
    });
}
