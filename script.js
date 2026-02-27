const STORAGE_KEY_COUNTS = 'sushi_calculator_counts';
const STORAGE_KEY_PLATES = 'sushi_calculator_plates';

// デフォルトの皿設定
const DEFAULT_PLATES = [
    { id: 'plate-100', price: 100, color: '#f1c40f', name: '黄皿' },
    { id: 'plate-150', price: 150, color: '#e74c3c', name: '赤皿' },
    { id: 'plate-200', price: 200, color: '#3498db', name: '青皿' },
    { id: 'plate-300', price: 300, color: '#2c3e50', name: '黒皿' },
    { id: 'plate-500', price: 500, color: '#f39c12', name: '金皿' }
];

let customPlates = [];
let counts = {};
let isEditing = false;

// DOM要素の取得
const platesContainer = document.getElementById('plates-container');
const totalAmountEl = document.getElementById('total-amount');
const resetBtn = document.getElementById('reset-btn');
const editToggleBtn = document.getElementById('edit-toggle-btn');
const addPlateBtn = document.getElementById('add-plate-btn');

// 初期化
function init() {
    loadData();
    renderPlates();
    updateTotal();
    
    resetBtn.addEventListener('click', resetCounts);
    editToggleBtn.addEventListener('click', toggleEditMode);
    addPlateBtn.addEventListener('click', addNewPlate);
}

// データの読み込み
function loadData() {
    // 枚数データ
    const savedCounts = localStorage.getItem(STORAGE_KEY_COUNTS);
    if (savedCounts) {
        try { counts = JSON.parse(savedCounts); } catch (e) { counts = {}; }
    }
    
    // 皿データ
    const savedPlates = localStorage.getItem(STORAGE_KEY_PLATES);
    if (savedPlates) {
        try { customPlates = JSON.parse(savedPlates); } catch (e) { customPlates = [...DEFAULT_PLATES]; }
    } else {
        // v1互換性対応（古いキーから移行など）または初期化
        const oldSavedCounts = localStorage.getItem('sushi_calculator_data');
        if (oldSavedCounts && !savedCounts) {
            try { counts = JSON.parse(oldSavedCounts); } catch (e) { counts = {}; }
        }
        customPlates = JSON.parse(JSON.stringify(DEFAULT_PLATES));
    }
    
    // 足りないキーを0で初期化
    customPlates.forEach(plate => {
        if (typeof counts[plate.id] === 'undefined') {
            counts[plate.id] = 0;
        }
    });
}

// データの保存
function saveData() {
    localStorage.setItem(STORAGE_KEY_COUNTS, JSON.stringify(counts));
    localStorage.setItem(STORAGE_KEY_PLATES, JSON.stringify(customPlates));
}

// 編集モード切り替え
function toggleEditMode() {
    isEditing = !isEditing;
    
    if (isEditing) {
        editToggleBtn.classList.add('active');
        editToggleBtn.textContent = '完了';
        addPlateBtn.classList.add('editing');
    } else {
        editToggleBtn.classList.remove('active');
        editToggleBtn.textContent = 'カスタマイズ';
        addPlateBtn.classList.remove('editing');
        saveData(); // 編集完了時に保存
        updateTotal();
    }
    
    renderPlates();
}

// 新しいお皿の追加
function addNewPlate() {
    const newId = 'plate-' + Date.now();
    // ランダムな色を生成
    const colors = ['#1abc9c', '#9b59b6', '#34495e', '#e67e22', '#7f8c8d', '#ff9ff3', '#0abde3'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    customPlates.push({
        id: newId,
        price: 100, // デフォルト100円
        color: randomColor,
        name: 'カスタム皿'
    });
    counts[newId] = 0;
    
    saveData();
    renderPlates();
}

// お皿の削除
function deletePlate(id) {
    if (confirm('このお皿を削除しますか？')) {
        customPlates = customPlates.filter(p => p.id !== id);
        delete counts[id];
        saveData();
        renderPlates();
        updateTotal();
    }
}

// お皿の価格変更
function updatePlatePrice(id, newPrice) {
    const parsed = parseInt(newPrice, 10);
    if (!isNaN(parsed) && parsed >= 0) {
        const plate = customPlates.find(p => p.id === id);
        if (plate) {
            plate.price = parsed;
        }
    }
}

// 皿リストの描画
function renderPlates() {
    platesContainer.innerHTML = '';
    
    customPlates.forEach(plate => {
        const item = document.createElement('div');
        item.className = 'plate-item';
        if (isEditing) item.classList.add('editing');
        
        item.innerHTML = `
            <div class="plate-info">
                <div class="plate-color" style="background-color: ${plate.color};" title="${plate.name}"></div>
                <div class="plate-price">${plate.price}円</div>
                <input type="number" class="plate-price-input" value="${plate.price}" data-id="${plate.id}" min="0" step="10">
            </div>
            <div class="plate-controls">
                <button class="control-btn minus-btn" data-id="${plate.id}">-</button>
                <div class="plate-count" id="count-${plate.id}">${counts[plate.id]}</div>
                <button class="control-btn plus-btn" data-id="${plate.id}">+</button>
            </div>
            <button class="plate-delete-btn" data-id="${plate.id}">×</button>
        `;
        
        platesContainer.appendChild(item);
    });
    
    // イベントリスナーの追加
    const plusBtns = document.querySelectorAll('.plus-btn');
    const minusBtns = document.querySelectorAll('.minus-btn');
    const deleteBtns = document.querySelectorAll('.plate-delete-btn');
    const priceInputs = document.querySelectorAll('.plate-price-input');
    
    plusBtns.forEach(btn => {
        btn.addEventListener('click', (e) => updateCount(e.target.dataset.id, 1));
    });
    
    minusBtns.forEach(btn => {
        btn.addEventListener('click', (e) => updateCount(e.target.dataset.id, -1));
    });
    
    deleteBtns.forEach(btn => {
        btn.addEventListener('click', (e) => deletePlate(e.target.dataset.id));
    });
    
    priceInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            updatePlatePrice(e.target.dataset.id, e.target.value);
        });
    });
}

// 枚数の更新
function updateCount(id, delta) {
    if (counts[id] + delta < 0) return; // 0未満にはしない
    
    counts[id] += delta;
    
    // UI更新
    const countEl = document.getElementById(`count-${id}`);
    if (countEl) {
        countEl.textContent = counts[id];
        
        // アニメーション効果
        countEl.classList.remove('update-anim');
        void countEl.offsetWidth; // リフローを強制
        countEl.classList.add('update-anim');
    }
    
    saveData();
    updateTotal();
}

// 合計の計算と更新
function updateTotal() {
    let total = 0;
    customPlates.forEach(plate => {
        total += plate.price * (counts[plate.id] || 0);
    });
    
    // 数値をカンマ区切りに
    totalAmountEl.textContent = total.toLocaleString();
    
    // アニメーション効果
    totalAmountEl.classList.remove('update-anim');
    void totalAmountEl.offsetWidth; // リフローを強制
    totalAmountEl.classList.add('update-anim');
}

// 全クリア
function resetCounts() {
    if (confirm('すべての枚数をクリアしますか？')) {
        customPlates.forEach(plate => {
            counts[plate.id] = 0;
            const countEl = document.getElementById(`count-${plate.id}`);
            if (countEl) countEl.textContent = 0;
        });
        saveData();
        updateTotal();
    }
}

// 実行
init();
