// DOM 요소들
const buildingButtons = document.getElementById('building-buttons');
const floorButtons = document.getElementById('floor-buttons');
const floorList = document.getElementById('floor-list');
const imageFile = document.getElementById('image-file');
const uploadForm = document.getElementById('upload-form');
const uploadStatus = document.getElementById('upload-status');
const floorPlanList = document.getElementById('floor-plan-list');

// 쓰레기통 관리 DOM 요소들
const trashBuildingButtons = document.getElementById('trash-building-buttons');
const trashFloorButtons = document.getElementById('trash-floor-buttons');
const trashFloorList = document.getElementById('trash-floor-list');
const trashImageFile = document.getElementById('trash-image-file');
const trashDescription = document.getElementById('trash-description');
const trashMap = document.getElementById('trash-map');

// 전역 변수
let buildings = [];
let selectedBuilding = null;
let selectedFloor = null;
let trashBins = [];
let selectedTrashBuilding = null;
let selectedTrashFloor = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    checkAdminPermission();
});

// 관리자 권한 확인
async function checkAdminPermission() {
    try {
        const response = await fetch('/api/check-admin');
        const data = await response.json();
        
        if (data.success && data.isAdmin) {
            // 관리자인 경우 페이지 초기화
            loadBuildings();
            setupEventListeners();
        } else {
            // 관리자가 아닌 경우 메인 페이지로 리다이렉션
            alert('관리자만 접근할 수 있습니다.');
            window.location.href = '/';
        }
    } catch (error) {
        console.error('권한 확인 실패:', error);
        alert('권한 확인 중 오류가 발생했습니다.');
        window.location.href = '/';
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    uploadForm.addEventListener('submit', handleUpload);
}

// 건물 목록 로드
async function loadBuildings() {
    try {
        const response = await fetch('/api/buildings');
        buildings = await response.json();
        renderBuildingButtons();
        renderTrashBuildingButtons();
        loadFloorPlans();
    } catch (error) {
        console.error('건물 목록을 불러오는데 실패했습니다:', error);
        showStatus('건물 목록을 불러오는데 실패했습니다.', 'error');
    }
}

function renderBuildingButtons() {
    buildingButtons.innerHTML = '';
    
    // 전체 캠퍼스 버튼 추가
    const campusButton = document.createElement('button');
    campusButton.className = 'building-button';
    campusButton.textContent = '전체 캠퍼스';
    campusButton.dataset.buildingId = '0';
    campusButton.dataset.floors = '0';
    campusButton.type = 'button';
    campusButton.addEventListener('click', () => selectBuilding({ id: 0, name: '전체 캠퍼스', floors: 0 }, campusButton));
    buildingButtons.appendChild(campusButton);
    
    // 기존 건물 버튼들
    buildings.forEach(building => {
        const button = document.createElement('button');
        button.className = 'building-button';
        button.textContent = building.name;
        button.dataset.buildingId = building.id;
        button.dataset.floors = building.floors;
        button.type = 'button';
        button.addEventListener('click', () => selectBuilding(building, button));
        buildingButtons.appendChild(button);
    });
}

function selectBuilding(building, button) {
    selectedBuilding = building;
    selectedFloor = null;
    document.querySelectorAll('.building-button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    // 전체 캠퍼스인 경우 층 선택 없이 바로 선택
    if (building.id === 0) {
        selectedFloor = 0;
        const label = document.getElementById('current-floor-label');
        label.textContent = '전체 캠퍼스';
        floorButtons.style.display = 'none';
    } else {
        showFloorSelection(building.floors);
    }
}

function showFloorSelection(totalFloors) {
    floorButtons.style.display = 'flex';
    // 건물 이름 + 1층 표시
    const label = document.getElementById('current-floor-label');
    label.textContent = selectedBuilding ? selectedBuilding.name + ' 1층' : '';
    floorList.innerHTML = '';
    for (let i = 1; i <= totalFloors; i++) {
        const button = document.createElement('button');
        button.className = 'floor-button';
        button.textContent = `${i}층`;
        button.dataset.floor = i;
        button.type = 'button';
        button.addEventListener('click', () => selectFloor(i, button));
        floorList.appendChild(button);
    }
}

function selectFloor(floorNumber, button) {
    selectedFloor = floorNumber;
    document.querySelectorAll('.floor-button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    // 건물명 + 층 정보 갱신
    const label = document.getElementById('current-floor-label');
    label.textContent = selectedBuilding ? selectedBuilding.name + ' ' + floorNumber + '층' : '';
}

// 파일 업로드 처리
async function handleUpload(event) {
    event.preventDefault();
    
    const formData = new FormData();
    const buildingId = selectedBuilding ? selectedBuilding.id : null;
    const floorNumber = selectedFloor;
    const file = imageFile.files[0];
    
    console.log('업로드 시도:', { buildingId, floorNumber, file: file ? file.name : '없음' });
    
    // 전체 캠퍼스인 경우 층 선택 검증 제외
    if (!buildingId && buildingId !== 0) {
        showStatus('건물을 선택해주세요.', 'error');
        return;
    }
    
    if (!file) {
        showStatus('이미지 파일을 선택해주세요.', 'error');
        return;
    }
    
    // 전체 캠퍼스가 아닌 경우에만 층 선택 검증
    if (buildingId !== 0 && !floorNumber) {
        showStatus('모든 필드를 입력해주세요.', 'error');
        return;
    }
    
    formData.append('buildingId', buildingId);
    formData.append('floorNumber', floorNumber || 0);
    formData.append('image', file);
    
    // 업로드 버튼 비활성화 및 로딩 표시
    const uploadButton = uploadForm.querySelector('.upload-button');
    const originalText = uploadButton.textContent;
    uploadButton.disabled = true;
    uploadButton.innerHTML = '<span class="loading"></span>업로드 중...';
    
    try {
        const response = await fetch('/api/upload-floor-plan', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showStatus(result.message, 'success');
            uploadForm.reset();
            selectedBuilding = null;
            selectedFloor = null;
            document.querySelectorAll('.building-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.floor-button').forEach(btn => btn.classList.remove('active'));
            floorButtons.style.display = 'none';
            loadFloorPlans(); // 목록 새로고침
        } else {
            showStatus(result.error || '업로드에 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('업로드 중 오류 발생:', error);
        showStatus('업로드 중 오류가 발생했습니다.', 'error');
    } finally {
        // 업로드 버튼 복원
        uploadButton.disabled = false;
        uploadButton.textContent = originalText;
    }
}

// 업로드된 평면도 목록 로드
async function loadFloorPlans() {
    try {
        // 모든 건물의 모든 층에 대해 평면도 확인
        const floorPlans = [];
        
        // 전체 캠퍼스 평면도 확인
        try {
            const campusResponse = await fetch('/api/floor-plan/0/0');
            const campusData = await campusResponse.json();
            
            if (campusData.imagePath) {
                floorPlans.push({
                    building: { id: 0, name: '전체 캠퍼스' },
                    floor: 0,
                    imagePath: campusData.imagePath
                });
            }
        } catch (error) {
            console.error('전체 캠퍼스 평면도 정보 로드 실패:', error);
        }
        
        // 기존 건물들의 평면도 확인
        for (const building of buildings) {
            for (let floor = 1; floor <= building.floors; floor++) {
                try {
                    const response = await fetch(`/api/floor-plan/${building.id}/${floor}`);
                    const data = await response.json();
                    
                    if (data.imagePath) {
                        floorPlans.push({
                            building: building,
                            floor: floor,
                            imagePath: data.imagePath
                        });
                    }
                } catch (error) {
                    console.error(`평면도 정보 로드 실패: ${building.name} ${floor}층`, error);
                }
            }
        }
        
        renderFloorPlanList(floorPlans);
        
    } catch (error) {
        console.error('평면도 목록을 불러오는데 실패했습니다:', error);
        showStatus('평면도 목록을 불러오는데 실패했습니다.', 'error');
    }
}

// 평면도 목록 렌더링
function renderFloorPlanList(floorPlans) {
    if (floorPlans.length === 0) {
        floorPlanList.innerHTML = `
            <div class="no-floor-plans">
                <p>업로드된 평면도가 없습니다.</p>
                <p>위의 폼을 사용하여 평면도를 업로드해주세요.</p>
            </div>
        `;
        return;
    }
    
    floorPlanList.innerHTML = '';
    
    floorPlans.forEach(plan => {
        const item = document.createElement('div');
        item.className = 'floor-plan-item';
        
        // 전체 캠퍼스인 경우 층 표시 제외
        const title = plan.building.id === 0 ? 
            plan.building.name : 
            `${plan.building.name} ${plan.floor}층`;
        
        item.innerHTML = `
            <h4>${title}</h4>
            <p>파일명: ${plan.imagePath}</p>
            <img src="/uploads/${plan.imagePath}" alt="${title} 평면도" 
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <p style="display: none; color: #e74c3c;">이미지를 불러올 수 없습니다.</p>
        `;
        floorPlanList.appendChild(item);
    });
}

// 쓰레기통 건물 버튼 렌더링
function renderTrashBuildingButtons() {
    trashBuildingButtons.innerHTML = '';
    
    // 전체 캠퍼스 버튼 추가
    const campusButton = document.createElement('button');
    campusButton.className = 'building-button';
    campusButton.textContent = '전체 캠퍼스';
    campusButton.dataset.buildingId = '0';
    campusButton.dataset.floors = '0';
    campusButton.type = 'button';
    campusButton.addEventListener('click', () => selectTrashBuilding({ id: 0, name: '전체 캠퍼스', floors: 0 }, campusButton));
    trashBuildingButtons.appendChild(campusButton);
    
    // 기존 건물 버튼들
    buildings.forEach(building => {
        const button = document.createElement('button');
        button.className = 'building-button';
        button.textContent = building.name;
        button.dataset.buildingId = building.id;
        button.dataset.floors = building.floors;
        button.type = 'button';
        button.addEventListener('click', () => selectTrashBuilding(building, button));
        trashBuildingButtons.appendChild(button);
    });
}

// 쓰레기통 건물 선택
function selectTrashBuilding(building, button) {
    selectedTrashBuilding = building;
    selectedTrashFloor = null;
    document.querySelectorAll('#trash-building-buttons .building-button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    // 전체 캠퍼스인 경우 층 선택 없이 바로 선택
    if (building.id === 0) {
        selectedTrashFloor = 0;
        const label = document.getElementById('trash-current-floor-label');
        label.textContent = '전체 캠퍼스';
        trashFloorButtons.style.display = 'none';
        loadTrashMap();
    } else {
        showTrashFloorSelection(building.floors);
    }
}

// 쓰레기통 층 선택 UI 표시
function showTrashFloorSelection(totalFloors) {
    trashFloorButtons.style.display = 'flex';
    const label = document.getElementById('trash-current-floor-label');
    label.textContent = selectedTrashBuilding ? selectedTrashBuilding.name + ' 1층' : '';
    trashFloorList.innerHTML = '';
    for (let i = 1; i <= totalFloors; i++) {
        const button = document.createElement('button');
        button.className = 'floor-button';
        button.textContent = `${i}층`;
        button.dataset.floor = i;
        button.type = 'button';
        button.addEventListener('click', () => selectTrashFloor(i, button));
        trashFloorList.appendChild(button);
    }
}

// 쓰레기통 층 선택
function selectTrashFloor(floorNumber, button) {
    selectedTrashFloor = floorNumber;
    document.querySelectorAll('#trash-floor-list .floor-button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    const label = document.getElementById('trash-current-floor-label');
    label.textContent = selectedTrashBuilding ? selectedTrashBuilding.name + ' ' + floorNumber + '층' : '';
    loadTrashMap();
}

// 쓰레기통 지도 로드
async function loadTrashMap() {
    if (!selectedTrashBuilding || selectedTrashFloor === null) return;
    
    try {
        const response = await fetch(`/api/floor-plan/${selectedTrashBuilding.id}/${selectedTrashFloor}`);
        const data = await response.json();
        
        if (data.imagePath) {
            trashMap.innerHTML = `<img src="/uploads/${data.imagePath}" alt="${selectedTrashBuilding.name} ${selectedTrashFloor}층 평면도">`;
            loadTrashBins();
            setupMapClickHandler();
        } else {
            trashMap.innerHTML = `
                <div class="map-placeholder">
                    <p>${selectedTrashBuilding.name} ${selectedTrashFloor}층 평면도가 업로드되지 않았습니다.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('쓰레기통 지도를 불러오는데 실패했습니다:', error);
        trashMap.innerHTML = `
            <div class="map-placeholder">
                <p>지도를 불러오는데 실패했습니다.</p>
            </div>
        `;
    }
}

// 쓰레기통 목록 로드
async function loadTrashBins() {
    if (!selectedTrashBuilding || selectedTrashFloor === null) return;
    
    try {
        const response = await fetch(`/api/trash-bins/${selectedTrashBuilding.id}/${selectedTrashFloor}`);
        trashBins = await response.json();
        renderTrashMarkers();
    } catch (error) {
        console.error('쓰레기통 목록을 불러오는데 실패했습니다:', error);
    }
}

// 쓰레기통 마커 렌더링
function renderTrashMarkers() {
    // 기존 마커 제거
    document.querySelectorAll('.trash-marker').forEach(marker => marker.remove());
    
    trashBins.forEach(bin => {
        const marker = document.createElement('div');
        marker.className = 'trash-marker';
        marker.style.left = `${bin.x_position}%`;
        marker.style.top = `${bin.y_position}%`;
        marker.dataset.binId = bin.id;
        marker.dataset.binImage = bin.image_path;
        marker.dataset.binDescription = bin.description;
        
        marker.addEventListener('click', (e) => {
            e.stopPropagation();
            showTrashModal(bin);
        });
        
        trashMap.appendChild(marker);
    });
}

// 지도 클릭 핸들러 설정
function setupMapClickHandler() {
    trashMap.addEventListener('click', (e) => {
        if (e.target.tagName === 'IMG') {
            const rect = e.target.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            
            addTrashBin(x, y);
        }
    });
}

// 쓰레기통 추가
async function addTrashBin(x, y) {
    if (!selectedTrashBuilding || selectedTrashFloor === null) return;
    
    const formData = new FormData();
    formData.append('buildingId', selectedTrashBuilding.id);
    formData.append('floorNumber', selectedTrashFloor);
    formData.append('xPosition', x);
    formData.append('yPosition', y);
    
    if (trashImageFile.files[0]) {
        formData.append('image', trashImageFile.files[0]);
    }
    
    if (trashDescription.value) {
        formData.append('description', trashDescription.value);
    }
    
    try {
        const response = await fetch('/api/trash-bins', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showStatus('쓰레기통이 성공적으로 추가되었습니다.', 'success');
            loadTrashBins();
            trashImageFile.value = '';
            trashDescription.value = '';
        } else {
            showStatus(result.error || '쓰레기통 추가에 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('쓰레기통 추가 중 오류 발생:', error);
        showStatus('쓰레기통 추가 중 오류가 발생했습니다.', 'error');
    }
}

// HTML 이스케이프 함수
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 쓰레기통 모달 표시
function showTrashModal(bin) {
    const modal = document.createElement('div');
    modal.className = 'trash-modal';
    
    // 모든 사용자 입력 데이터를 이스케이프 처리
    const escapedId = escapeHtml(bin.id.toString());
    const escapedDescription = bin.description ? escapeHtml(bin.description) : '';
    const escapedImagePath = bin.image_path ? escapeHtml(bin.image_path) : '';
    const escapedBuildingName = escapeHtml(selectedTrashBuilding.name);
    const escapedFloor = escapeHtml(selectedTrashFloor.toString());
    
    modal.innerHTML = `
        <div class="trash-modal-content">
            <button class="trash-modal-close">&times;</button>
            <h3>쓰레기통 #${escapedId}</h3>
            ${escapedImagePath ? `<img src="/uploads/${escapedImagePath}" alt="쓰레기통 이미지" onerror="this.style.display='none'">` : ''}
            ${escapedDescription ? `<p><strong>설명:</strong> ${escapedDescription}</p>` : ''}
            <p><strong>위치:</strong> ${escapedBuildingName} ${escapedFloor}층</p>
            <button class="delete-trash-btn" onclick="deleteTrashBin(${escapedId})">삭제</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    modal.querySelector('.trash-modal-close').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 쓰레기통 삭제
async function deleteTrashBin(binId) {
    if (!confirm('이 쓰레기통을 삭제하시겠습니까?')) return;
    
    try {
        const response = await fetch(`/api/trash-bins/${binId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showStatus('쓰레기통이 성공적으로 삭제되었습니다.', 'success');
            loadTrashBins();
            document.querySelector('.trash-modal').remove();
        } else {
            showStatus(result.error || '쓰레기통 삭제에 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('쓰레기통 삭제 중 오류 발생:', error);
        showStatus('쓰레기통 삭제 중 오류가 발생했습니다.', 'error');
    }
}

// 상태 메시지 표시
function showStatus(message, type) {
    uploadStatus.textContent = message;
    uploadStatus.className = `upload-status ${type}`;
    
    // 5초 후 자동으로 숨기기
    setTimeout(() => {
        uploadStatus.style.display = 'none';
    }, 5000);
}

// 파일 선택 시 미리보기 (선택사항)
imageFile.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        // 파일 크기 확인 (5MB 제한)
        if (file.size > 5 * 1024 * 1024) {
            showStatus('파일 크기는 5MB 이하여야 합니다.', 'error');
            this.value = '';
            return;
        }
        
        // 파일 형식 확인
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            showStatus('이미지 파일만 업로드 가능합니다.', 'error');
            this.value = '';
            return;
        }
        
        showStatus(`파일이 선택되었습니다: ${file.name}`, 'success');
    }
}); 