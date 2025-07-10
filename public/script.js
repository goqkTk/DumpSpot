// 전역 변수
let buildings = [];
let currentBuilding = null;
let currentFloor = 1;

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
    floorButtons.style.display = 'block';
    
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
        
        button.addEventListener('click', () => selectFloor(i));
        floorList.appendChild(button);
    }
}

// 층 선택
function selectFloor(floorNumber) {
    currentFloor = floorNumber;
    
    // 층 버튼 활성화 상태 업데이트
    document.querySelectorAll('.floor-button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // 해당 층 평면도 로드
    loadFloorPlan(currentBuilding.id, floorNumber);
}

// 건물 선택으로 돌아가기
function showBuildingSelection() {
    buildingButtons.style.display = 'block';
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

// 기본 평면도 표시 (업로드된 이미지가 없는 경우)
function showDefaultFloorPlan(buildingId, floorNumber) {
    const building = buildings.find(b => b.id == buildingId);
    mapImage.innerHTML = `
        <div class="placeholder">
            <h3>${building.name} ${floorNumber}층</h3>
            <p>평면도 이미지가 업로드되지 않았습니다.</p>
            <p>관리자 페이지에서 평면도를 업로드해주세요.</p>
        </div>
    `;
}

// 기본 지도 표시 (전체 캠퍼스)
function showDefaultMap() {
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

// 위치 정보 업데이트
function updateLocationInfo(buildingId, floorNumber) {
    const building = buildings.find(b => b.id == buildingId);
    currentLocation.textContent = `현재 위치: ${building.name} ${floorNumber}층`;
    locationDescription.textContent = `${building.name} ${floorNumber}층의 평면도를 확인할 수 있습니다.`;
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

// 페이지 로드 시 기본 지도 표시
showDefaultMap(); 