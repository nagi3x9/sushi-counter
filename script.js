const STORAGE_KEY_COUNTS = 'sushi_calculator_counts';
const STORAGE_KEY_PLATES = 'sushi_calculator_plates';
const STORAGE_KEY_PRESETS = 'sushi_calculator_presets';
const STORAGE_KEY_CURRENT_PRESET = 'sushi_calculator_current_preset';

const DEFAULT_PLATES = [
    { id: 'plate-100', price: 100, color: '#f1c40f', name: '黄皿' },
    { id: 'plate-150', price: 150, color: '#e74c3c', name: '赤皿' },
    { id: 'plate-200', price: 200, color: '#3498db', name: '青皿' },
    { id: 'plate-300', price: 300, color: '#2c3e50', name: '黒皿' },
];

const SUSHI_COLORS = [
    '#e74c3c', // 赤
    '#f1c40f', // 黄
    '#3498db', // 青
    '#2ecc71', // 緑
    '#e67e22', // オレンジ
    '#fd79a8', // ピンク
    '#9b59b6', // 紫
    '#1abc9c', // 青緑
    '#bdc3c7', // 銀
    '#2c3e50'  // 黒
];

let customPlates = [];
let counts = {};
let isEditing = false;
let presets = {};
let currentPresetId = 'default';
let currentColorPlateId = null;

// DOM要素の取得
const platesContainer = document.getElementById('plates-container');
const totalAmountEl = document.getElementById('total-amount');
const resetBtn = document.getElementById('reset-btn');
const editToggleBtn = document.getElementById('edit-toggle-btn');
const addPlateBtn = document.getElementById('add-plate-btn');

// プリセット用UI
const presetSection = document.getElementById('preset-section');
const presetSelect = document.getElementById('preset-select');
const savePresetBtn = document.getElementById('save-preset-btn');
const deletePresetBtn = document.getElementById('delete-preset-btn');

// QR・シェア機能用
const shareBtn = document.getElementById('share-btn');
const qrModal = document.getElementById('qr-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const qrContainer = document.getElementById('qrcode-container');

// カラーパレットモーダル用
const colorModal = document.getElementById('color-modal');
const closeColorModalBtn = document.getElementById('close-color-modal-btn');
const colorPalette = document.getElementById('color-palette');

// 初期化
function init() {
    loadPresets();
    loadData();
    renderPresetSelect();
    renderColorPalette();
    renderPlates();
    updateTotal();

    resetBtn.addEventListener('click', resetCounts);
    editToggleBtn.addEventListener('click', toggleEditMode);
    addPlateBtn.addEventListener('click', addNewPlate);

    // プリセット用イベント
    presetSelect.addEventListener('change', changePreset);
    savePresetBtn.addEventListener('click', saveCurrentAsPreset);
    deletePresetBtn.addEventListener('click', deleteCurrentPreset);

    // カラーモーダル用イベント
    closeColorModalBtn.addEventListener('click', closeColorModal);
    colorModal.addEventListener('click', (e) => {
        if (e.target === colorModal) {
            closeColorModal();
        }
    });

    // シェア機能の初期化
    initShareFeature();
}

// シェア機能のセットアップ
function initShareFeature() {
    shareBtn.addEventListener('click', () => {
        // 現在のURLを取得
        const currentUrl = window.location.href;

        // Web Share APIが使える場合はそちらを優先（スマホネイティブの共有メニュー）
        if (navigator.share) {
            navigator.share({
                title: '代わりにお皿数えます',
                text: 'お寿司のお皿を簡単に数えるアプリ！',
                url: currentUrl,
            }).catch(console.error);
        } else {
            // 使えない場合（PCや非対応ブラウザ）はQRコードモーダルを表示
            showQrModal(currentUrl);
        }
    });

    closeModalBtn.addEventListener('click', () => {
        qrModal.classList.add('hidden');
    });

    // モーダル外枠クリックで閉じる
    qrModal.addEventListener('click', (e) => {
        if (e.target === qrModal) {
            qrModal.classList.add('hidden');
        }
    });
}

// QRコードモーダルの表示
function showQrModal(url) {
    // 既存のQRコードをクリア
    qrContainer.innerHTML = '';

    // 新しいQRコードを生成
    new QRCode(qrContainer, {
        text: url,
        width: 160,
        height: 160,
        colorDark: "#2F3542",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    qrModal.classList.remove('hidden');
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

        // 編集完了時に現在のプリセットを上書き保存する（デフォルト以外の時）
        if (currentPresetId !== 'default') {
            presets[currentPresetId].plates = JSON.parse(JSON.stringify(customPlates));
            localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(presets));
        }

        saveData(); // 編集完了時に保存
        updateTotal();
    }

    renderPlates();
}

// 新しいお皿の追加
function addNewPlate() {
    const newId = 'plate-' + Date.now();
    // ランダムな色を生成（プリセット色から選ぶ）
    const randomColor = SUSHI_COLORS[Math.floor(Math.random() * SUSHI_COLORS.length)];

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

// お皿の色変更
function updatePlateColor(id, newColor) {
    const plate = customPlates.find(p => p.id === id);
    if (plate) {
        plate.color = newColor;
        saveData();
        renderPlates();
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
                <div class="plate-color" style="background-color: ${plate.color};" title="${plate.name}">
                    <div class="plate-count-display" id="count-${plate.id}">${counts[plate.id] > 0 ? counts[plate.id] : ''}</div>
                    <div class="plate-color-input" data-id="${plate.id}"></div>
                </div>
                <div class="plate-price">${plate.price}円</div>
                <input type="number" class="plate-price-input" value="${plate.price}" data-id="${plate.id}" min="0" step="10">
            </div>
            <div class="plate-controls">
                <button class="minus-btn ${counts[plate.id] > 0 ? '' : 'hidden'}" id="minus-${plate.id}" data-id="${plate.id}" title="1枚減らす">−</button>
            </div>
            <button class="plate-delete-btn" data-id="${plate.id}">×</button>
        `;

        platesContainer.appendChild(item);
    });

    // イベントリスナーの追加
    const plateItems = document.querySelectorAll('.plate-item');
    const minusBtns = document.querySelectorAll('.minus-btn');
    const deleteBtns = document.querySelectorAll('.plate-delete-btn');
    const priceInputs = document.querySelectorAll('.plate-price-input');
    const colorInputs = document.querySelectorAll('.plate-color-input');

    // お皿全体をタップして追加
    plateItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (isEditing) return; // 編集モード時はカウントしない

            // マイナスボタンや削除ボタン、インプットフィールドをクリックした場合は何もしない
            if (e.target.closest('.minus-btn') ||
                e.target.closest('.plate-delete-btn') ||
                e.target.closest('.plate-price-input') ||
                e.target.closest('.plate-color-input')) {
                return;
            }

            // それ以外（お皿自体）のクリックで追加
            const id = e.currentTarget.querySelector('.minus-btn').dataset.id;
            updateCount(id, 1);
        });
    });

    // マイナスボタンで減らす
    minusBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // 親要素（お皿全体）へのクリックイベントの伝播を防ぐ
            updateCount(e.currentTarget.dataset.id, -1);
        });
    });

    deleteBtns.forEach(btn => {
        btn.addEventListener('click', (e) => deletePlate(e.target.dataset.id));
    });

    priceInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            updatePlatePrice(e.target.dataset.id, e.target.value);
        });
    });

    colorInputs.forEach(input => {
        input.addEventListener('click', (e) => {
            e.stopPropagation();
            openColorModal(e.target.dataset.id);
        });
    });
}

// 枚数の更新
function updateCount(id, delta) {
    if (counts[id] + delta < 0) return; // 0未満にはしない

    counts[id] += delta;

    // UI更新
    const countEl = document.getElementById(`count-${id}`);
    const minusBtn = document.getElementById(`minus-${id}`);

    if (countEl) {
        countEl.textContent = counts[id] > 0 ? counts[id] : '';

        // アニメーション効果
        countEl.classList.remove('update-anim');
        void countEl.offsetWidth; // リフローを強制
        countEl.classList.add('update-anim');
    }

    if (minusBtn) {
        if (counts[id] > 0) {
            minusBtn.classList.remove('hidden');
        } else {
            minusBtn.classList.add('hidden');
        }
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
            const minusBtn = document.getElementById(`minus-${plate.id}`);
            if (countEl) countEl.textContent = '';
            if (minusBtn) minusBtn.classList.add('hidden');
        });
        saveData();
        updateTotal();
    }
}

// ==================== カラーパレット機能 ====================
function renderColorPalette() {
    colorPalette.innerHTML = '';
    SUSHI_COLORS.forEach(color => {
        const btn = document.createElement('button');
        btn.className = 'palette-color-btn';
        btn.style.backgroundColor = color;
        btn.dataset.color = color;

        btn.addEventListener('click', () => {
            if (currentColorPlateId) {
                updatePlateColor(currentColorPlateId, color);
                closeColorModal();
            }
        });

        colorPalette.appendChild(btn);
    });
}

function openColorModal(plateId) {
    currentColorPlateId = plateId;
    const plate = customPlates.find(p => p.id === plateId);

    // 選択中の色をハイライト
    const btns = colorPalette.querySelectorAll('.palette-color-btn');
    btns.forEach(btn => {
        if (plate && btn.dataset.color.toLowerCase() === plate.color.toLowerCase()) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });

    colorModal.classList.remove('hidden');
}

function closeColorModal() {
    colorModal.classList.add('hidden');
    currentColorPlateId = null;
}

// ==================== プリセット機能 ====================
function loadPresets() {
    const savedPresets = localStorage.getItem(STORAGE_KEY_PRESETS);
    if (savedPresets) {
        try { presets = JSON.parse(savedPresets); } catch (e) { presets = {}; }
    }
    if (!presets['default']) {
        presets['default'] = { name: 'デフォルトセット', plates: JSON.parse(JSON.stringify(DEFAULT_PLATES)) };
    }

    currentPresetId = localStorage.getItem(STORAGE_KEY_CURRENT_PRESET) || 'default';
}

function renderPresetSelect() {
    presetSelect.innerHTML = '';
    Object.keys(presets).forEach(id => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = presets[id].name;
        if (id === currentPresetId) {
            option.selected = true;
        }
        presetSelect.appendChild(option);
    });

    // デフォルトは削除不可に
    deletePresetBtn.style.display = currentPresetId === 'default' ? 'none' : 'block';
}

function changePreset(e) {
    const newPresetId = e.target.value;
    if (presets[newPresetId]) {
        // 現在の変更を保存しておく (デフォルト以外の場合)
        if (currentPresetId !== 'default' && isEditing) {
            presets[currentPresetId].plates = JSON.parse(JSON.stringify(customPlates));
            localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(presets));
        }

        currentPresetId = newPresetId;
        localStorage.setItem(STORAGE_KEY_CURRENT_PRESET, currentPresetId);

        customPlates = JSON.parse(JSON.stringify(presets[currentPresetId].plates));

        // 未知のIDならカウント0初期化
        customPlates.forEach(plate => {
            if (typeof counts[plate.id] === 'undefined') {
                counts[plate.id] = 0;
            }
        });

        saveData();
        renderPlates();
        updateTotal();
        renderPresetSelect();
    }
}

function saveCurrentAsPreset() {
    const name = prompt('保存するセットの名前を入力してください', 'マイお皿セット');
    if (!name) return;

    const newId = 'preset-' + Date.now();
    presets[newId] = {
        name: name,
        plates: JSON.parse(JSON.stringify(customPlates))
    };

    currentPresetId = newId;
    localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(presets));
    localStorage.setItem(STORAGE_KEY_CURRENT_PRESET, currentPresetId);

    renderPresetSelect();
    alert(`「${name}」を保存しました！`);
}

function deleteCurrentPreset() {
    if (currentPresetId === 'default') return;

    if (confirm(`セット「${presets[currentPresetId].name}」を削除しますか？`)) {
        delete presets[currentPresetId];
        localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(presets));

        currentPresetId = 'default';
        localStorage.setItem(STORAGE_KEY_CURRENT_PRESET, currentPresetId);

        customPlates = JSON.parse(JSON.stringify(presets['default'].plates));

        saveData();
        renderPlates();
        updateTotal();
        renderPresetSelect();
        alert('削除しました。');
    }
}
// ========================================================

// 実行
init();
