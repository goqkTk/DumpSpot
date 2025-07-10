// DOM 요소들
const buildingSelect = document.getElementById('building-select');
const floorSelect = document.getElementById('floor-select');
const imageFile = document.getElementById('image-file');
const uploadForm = document.getElementById('upload-form');
const uploadStatus = document.getElementById('upload-status');
const floorPlanList = document.getElementById('floor-plan-list');

// 전역 변수
let buildings = [];

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    loadBuildings();
    setupEventListeners();
});

// 이벤트 리스너 설정
function setupEventListeners() {
    buildingSelect.addEventListener('change', updateFloorOptions);
    uploadForm.addEventListener('submit', handleUpload);
}

// 건물 목록 로드
async function loadBuildings() {
    try {
        const response = await fetch('/api/buildings');
        buildings = await response.json();
        populateBuildingSelect();
        loadFloorPlans();
    } catch (error) {
        console.error('건물 목록을 불러오는데 실패했습니다:', error);
        showStatus('건물 목록을 불러오는데 실패했습니다.', 'error');
    }
}

// 건물 선택 옵션 채우기
function populateBuildingSelect() {
    buildingSelect.innerHTML = '<option value="">건물을 선택하세요</option>';
    
    buildings.forEach(building => {
        const option = document.createElement('option');
        option.value = building.id;
        option.textContent = building.name;
        buildingSelect.appendChild(option);
    });
}

// 층 선택 옵션 업데이트
function updateFloorOptions() {
    const buildingId = buildingSelect.value;
    floorSelect.innerHTML = '<option value="">층을 선택하세요</option>';
    
    if (buildingId) {
        const building = buildings.find(b => b.id == buildingId);
        if (building) {
            for (let i = 1; i <= building.floors; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `${i}층`;
                floorSelect.appendChild(option);
            }
        }
    }
}

// 파일 업로드 처리
async function handleUpload(event) {
    event.preventDefault();
    
    const formData = new FormData();
    const buildingId = buildingSelect.value;
    const floorNumber = floorSelect.value;
    const file = imageFile.files[0];
    
    if (!buildingId || !floorNumber || !file) {
        showStatus('모든 필드를 입력해주세요.', 'error');
        return;
    }
    
    formData.append('buildingId', buildingId);
    formData.append('floorNumber', floorNumber);
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
        item.innerHTML = `
            <h4>${plan.building.name} ${plan.floor}층</h4>
            <p>파일명: ${plan.imagePath}</p>
            <img src="/uploads/${plan.imagePath}" alt="${plan.building.name} ${plan.floor}층 평면도" 
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <p style="display: none; color: #e74c3c;">이미지를 불러올 수 없습니다.</p>
        `;
        floorPlanList.appendChild(item);
    });
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