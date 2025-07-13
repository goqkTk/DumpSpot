// 전역 변수
let buildings = [];
let currentBuilding = null;
let currentFloor = 1;
let currentUser = null;

// DOM 요소들
const buildingButtons = document.getElementById('building-buttons');
const floorButtons = document.getElementById('floor-buttons');
const floorList = document.getElementById('floor-list');
const backToBuildingsBtn = document.getElementById('back-to-buildings');
const mapImage = document.getElementById('map-image');
const currentLocation = document.getElementById('current-location');
const locationDescription = document.getElementById('location-description');

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    loadBuildings();
    setupEventListeners();
    checkLoginStatus();
});

// 이벤트 리스너 설정
function setupEventListeners() {
    backToBuildingsBtn.addEventListener('click', showBuildingSelection);
}

// 건물 목록 로드
async function loadBuildings() {
    try {
        const response = await fetch('/api/buildings');
        buildings = await response.json();
        renderBuildingButtons();
    } catch (error) {
        console.error('건물 목록을 불러오는데 실패했습니다:', error);
        showError('건물 목록을 불러오는데 실패했습니다.');
    }
}

// 건물 버튼 렌더링
function renderBuildingButtons() {
    buildingButtons.innerHTML = '';
    
    buildings.forEach(building => {
        const button = document.createElement('button');
        button.className = 'building-button';
        button.textContent = building.name;
        button.dataset.buildingId = building.id;
        button.dataset.floors = building.floors;
        
        button.addEventListener('click', () => selectBuilding(building));
        buildingButtons.appendChild(button);
    });
}

// 건물 선택
function selectBuilding(building) {
    currentBuilding = building;
    currentFloor = 1; // 기본값은 1층
    
    // 건물 버튼 활성화 상태 업데이트
    document.querySelectorAll('.building-button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // 층 선택 UI 표시
    showFloorSelection(building.floors);
    
    // 1층 평면도 로드
    loadFloorPlan(building.id, 1);
}

// 층 선택 UI 표시
function showFloorSelection(totalFloors) {
    buildingButtons.style.display = 'none';
    floorButtons.style.display = 'flex';
    // 건물 이름 + 1층 표시
    const label = document.getElementById('current-floor-label');
    label.textContent = currentBuilding ? currentBuilding.name + ' 1층' : '';
    // 층 버튼 생성
    floorList.innerHTML = '';
    for (let i = 1; i <= totalFloors; i++) {
        const button = document.createElement('button');
        button.className = 'floor-button';
        button.textContent = `${i}층`;
        button.dataset.floor = i;
        if (i === 1) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => selectFloor(i, button));
        floorList.appendChild(button);
    }
}

function selectFloor(floorNumber, button) {
    currentFloor = floorNumber;
    document.querySelectorAll('.floor-button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    // 건물명 + 층 정보 갱신
    const label = document.getElementById('current-floor-label');
    label.textContent = currentBuilding ? currentBuilding.name + ' ' + floorNumber + '층' : '';
    // 해당 층 평면도 로드
    loadFloorPlan(currentBuilding.id, floorNumber);
}

// 건물 선택으로 돌아가기
function showBuildingSelection() {
    buildingButtons.style.display = 'flex'; // gap이 유지되도록
    floorButtons.style.display = 'none';
    currentBuilding = null;
    currentFloor = 1;
    
    // 버튼 활성화 상태 초기화
    document.querySelectorAll('.building-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 기본 상태로 지도 초기화
    showDefaultMap();
}

// 평면도 로드
async function loadFloorPlan(buildingId, floorNumber) {
    try {
        const response = await fetch(`/api/floor-plan/${buildingId}/${floorNumber}`);
        const data = await response.json();
        
        if (data.imagePath) {
            // 업로드된 평면도 이미지 표시
            mapImage.innerHTML = `<img src="/uploads/${data.imagePath}" alt="${currentBuilding.name} ${floorNumber}층 평면도">`;
            // 쓰레기통 마커 로드
            loadTrashBins(buildingId, floorNumber);
        } else {
            // 기본 평면도 표시 (업로드된 이미지가 없는 경우)
            showDefaultFloorPlan(buildingId, floorNumber);
        }
        
        // 위치 정보 업데이트
        updateLocationInfo(buildingId, floorNumber);
        
    } catch (error) {
        console.error('평면도를 불러오는데 실패했습니다:', error);
        showError('평면도를 불러오는데 실패했습니다.');
    }
}

// 쓰레기통 목록 로드 (메인 페이지용)
async function loadTrashBins(buildingId, floorNumber) {
    try {
        const response = await fetch(`/api/trash-bins/${buildingId}/${floorNumber}`);
        const trashBins = await response.json();
        renderTrashMarkers(trashBins);
    } catch (error) {
        console.error('쓰레기통 목록을 불러오는데 실패했습니다:', error);
    }
}

// 쓰레기통 마커 렌더링 (메인 페이지용)
function renderTrashMarkers(trashBins) {
    // 기존 마커 제거
    document.querySelectorAll('.trash-marker').forEach(marker => marker.remove());
    
    trashBins.forEach(bin => {
        const marker = document.createElement('div');
        marker.className = 'trash-marker';
        marker.style.left = `${bin.x_position}%`;
        marker.style.top = `${bin.y_position}%`;
        marker.dataset.binId = bin.id;
        
        marker.addEventListener('click', (e) => {
            e.stopPropagation();
            showTrashInfo(bin);
        });
        
        mapImage.appendChild(marker);
    });
}

// HTML 이스케이프 함수
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 쓰레기통 정보 표시 (메인 페이지용)
function showTrashInfo(bin) {
    const infoPanel = document.getElementById('location-description');
    let info = `<strong>쓰레기통 #${bin.id}</strong>`;
    
    if (bin.description) {
        const escapedDescription = escapeHtml(bin.description);
        info += `<br><span class="trash-description">${escapedDescription}</span>`;
    }
    
    if (bin.image_path) {
        const escapedImagePath = escapeHtml(bin.image_path);
        info += `<br><div class="trash-image-container"><img src="/uploads/${escapedImagePath}" alt="쓰레기통 이미지" class="trash-image"></div>`;
    }
    
    infoPanel.innerHTML = info;
}

// 기본 평면도 표시 (업로드된 이미지가 없는 경우)
function showDefaultFloorPlan(buildingId, floorNumber) {
    const building = buildings.find(b => b.id == buildingId);
    mapImage.innerHTML = `
        <div class="placeholder">
            <h3>${building.name} ${floorNumber}층</h3>
            <p>평면도 이미지가 업로드되지 않았습니다.</p>
        </div>
    `;
}

// 기본 지도 표시 (전체 캠퍼스)
async function showDefaultMap() {
    try {
        const response = await fetch('/api/floor-plan/0/0');
        const data = await response.json();
        
        if (data.imagePath) {
            // 업로드된 전체 캠퍼스 평면도 이미지 표시
            mapImage.innerHTML = `<img src="/uploads/${data.imagePath}" alt="전체 캠퍼스 평면도">`;
        } else {
            // 기본 평면도 표시 (업로드된 이미지가 없는 경우)
            mapImage.innerHTML = `
                <div class="placeholder">
                    <h3>전체 캠퍼스</h3>
                    <p>정보관, 본관, 신관, 체육관, 운동장</p>
                    <p>왼쪽에서 건물을 선택해주세요</p>
                </div>
            `;
        }
        
        currentLocation.textContent = '현재 위치: 전체 캠퍼스';
        locationDescription.textContent = '학교 전체 평면도를 확인할 수 있습니다.';
        
    } catch (error) {
        console.error('전체 캠퍼스 평면도를 불러오는데 실패했습니다:', error);
        mapImage.innerHTML = `
            <div class="placeholder">
                <h3>전체 캠퍼스</h3>
                <p>정보관, 본관, 신관, 체육관, 운동장</p>
                <p>왼쪽에서 건물을 선택해주세요</p>
            </div>
        `;
        
        currentLocation.textContent = '현재 위치: 전체 캠퍼스';
        locationDescription.textContent = '학교 전체 평면도를 확인할 수 있습니다.';
    }
}

// 위치 정보 업데이트
function updateLocationInfo(buildingId, floorNumber) {
    const building = buildings.find(b => b.id == buildingId);
    currentLocation.textContent = `현재 위치: ${building.name} ${floorNumber}층`;
    locationDescription.textContent = `${building.name} ${floorNumber}층의 쓰레기통 위치를 확인할 수 있습니다.`;
}

// 에러 메시지 표시
function showError(message) {
    mapImage.innerHTML = `
        <div class="placeholder">
            <h3>오류</h3>
            <p>${message}</p>
        </div>
    `;
}

// 로그인 상태 확인
async function checkLoginStatus() {
    try {
        const response = await fetch('/api/session');
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            updateLoginUI(true);
        } else {
            updateLoginUI(false);
        }
    } catch (error) {
        console.error('로그인 상태 확인 실패:', error);
        updateLoginUI(false);
    }
}

// 로그인 UI 업데이트
function updateLoginUI(isLoggedIn) {
    const loginContainer = document.getElementById('login-button-container');
    
    if (isLoggedIn) {
        loginContainer.innerHTML = `
            <div class="user-info-sidebar">
                <div class="user-buttons">
                    ${currentUser.username === 'admin' ? 
                        '<button id="admin-button" class="admin-sidebar-button">관리자 페이지</button>' : 
                        ''
                    }
                    <button id="logout-button" class="logout-sidebar-button">로그아웃</button>
                </div>
            </div>
        `;
        
        // 이벤트 리스너 추가
        if (currentUser.username === 'admin') {
            document.getElementById('admin-button').addEventListener('click', () => {
                window.location.href = '/admin';
            });
        }
        document.getElementById('logout-button').addEventListener('click', handleLogout);
    } else {
        loginContainer.innerHTML = `
            <button id="login-button" class="login-sidebar-button">로그인 / 회원가입</button>
        `;
        
        // 로그인 버튼 이벤트 리스너
        document.getElementById('login-button').addEventListener('click', () => {
            window.location.href = '/login';
        });
    }
}

// 로그아웃 처리
async function handleLogout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = null;
            updateLoginUI(false);
        } else {
            console.error('로그아웃 실패:', data.error);
        }
    } catch (error) {
        console.error('로그아웃 실패:', error);
    }
}

// 페이지 로드 시 기본 지도 표시
showDefaultMap(); 