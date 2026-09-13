const dailyQuestsTemplate = [
    { id: 'd1', name: '시스템 포털 접속하기', exp: 10 },
    { id: 'd2', name: '오늘의 할일 3개 완료', exp: 20 },
    { id: 'd3', name: '매일 챌린지 1회 달성', exp: 20 }
];

const weeklyQuestsTemplate = [
    { id: 'w1', name: '레벨 3회 상승시키기', exp: 100 },
    { id: 'w2', name: '주간 총 EXP 1000 획득', exp: 150 },
    { id: 'w3', name: '모든 할일/챌린지 완수', exp: 200 }
];

const dailyTodosTemplate = [
    { id: 't1', name: '💻 파이썬 API 코드 리뷰', weight: 1 },
    { id: 't2', name: '🏋️ 체력 단련 30분', weight: 1.5 },
    { id: 't3', name: '⌨️ 키보드 세팅 최적화', weight: 0.5 },
    { id: 't4', name: '📚 전적 검색 로직 독서', weight: 1 },
    { id: 't5', name: '📋 포털 기능 기획서 작성', weight: 1.2 }
];

const rankSystem = [
    { level: 100, title: "전설 (Legend)", img: "https://i.ibb.co/F8S86L0/rank-legend.png", theme: "rank-legend", stars: "★★★★★" },
    { level: 75, title: "고수 (Advanced)", img: "https://i.ibb.co/f47S4Dq/rank-advanced.png", theme: "rank-advanced", stars: "★★★★☆" },
    { level: 30, title: "중수 (Intermediate)", img: "https://i.ibb.co/3pS455W/rank-intermediate.png", theme: "rank-intermediate", stars: "★★★☆☆" },
    { level: 1, title: "초보자 (Beginner)", img: "https://i.ibb.co/5Ym7w6F/rank-beginner.png", theme: "rank-beginner", stars: "★☆☆☆☆" }
];

let gameState = {
    nickname: "", level: 1, exp: 0, maxExp: 100, currentRankIndex: 3,
    quests: { daily: [], weekly: [], lastDailyReset: "", lastWeeklyReset: "" },
    todos: [], version: "3.0"
};

window.onload = function() {
    if (!loadData()) document.getElementById('intro-screen').classList.remove('hidden');
    setupPromotionOverlay();
};

function startPortal() {
    let input = document.getElementById('nickname-input').value.trim();
    if (input === "") { alert("이름을 입력해주세요!"); return; }
    
    gameState.nickname = input;
    resetQuests(true); resetTodos(true);
    
    document.getElementById('intro-screen').classList.add('hidden');
    document.getElementById('main-portal').classList.remove('hidden');
    updateUI(false); saveData();
}

function addNewTodo() {
    let name = document.getElementById('new-todo-name').value.trim();
    let weight = parseFloat(document.getElementById('new-todo-weight').value);
    if (!name || isNaN(weight) || weight <= 0) { alert("내용과 0 이상의 가중치를 입력하세요."); return; }
    
    gameState.todos.push({ id: 't_user_' + Date.now(), name: name, weight: weight, done: false });
    document.getElementById('new-todo-name').value = '';
    document.getElementById('new-todo-weight').value = '';
    updateUI(false); saveData();
}

function addNewQuest() {
    let type = document.getElementById('new-quest-type').value;
    let name = document.getElementById('new-quest-name').value.trim();
    let exp = parseInt(document.getElementById('new-quest-exp').value);
    if (!name || isNaN(exp) || exp <= 0) { alert("이름과 0 이상의 EXP를 입력하세요."); return; }

    gameState.quests[type].push({ id: 'q_user_' + Date.now(), name: name, exp: exp, done: false });
    document.getElementById('new-quest-name').value = '';
    document.getElementById('new-quest-exp').value = '';
    updateUI(false); saveData();
}

function deleteItem(type, id) {
    if (!confirm("삭제하시겠습니까?")) return;
    if (type === 'todo') gameState.todos = gameState.todos.filter(t => t.id !== id);
    else gameState.quests[type] = gameState.quests[type].filter(q => q.id !== id);
    updateUI(false); saveData();
}

function gainExp(amount, sourceId, sourceType) {
    if (amount <= 0) return;
    if (sourceType === 'daily' || sourceType === 'weekly') {
        let quest = gameState.quests[sourceType].find(q => q.id === sourceId);
        if (quest.done) return;
        quest.done = true;
    } else if (sourceType === 'todo') {
        let todo = gameState.todos.find(t => t.id === sourceId);
        if (todo.done) return;
        todo.done = true;
        amount = Math.floor(10 * todo.weight);
    }

    gameState.exp += amount;
    let promotionOccured = false;
    let oldRankIndex = gameState.currentRankIndex;

    while (gameState.exp >= gameState.maxExp) {
        gameState.level++;
        gameState.exp -= gameState.maxExp;
        gameState.maxExp = Math.floor(gameState.maxExp * 1.1);

        let newRankIndex = rankSystem.findIndex(r => gameState.level >= r.level);
        if (newRankIndex !== -1 && newRankIndex < gameState.currentRankIndex) {
            gameState.currentRankIndex = newRankIndex;
            promotionOccured = true;
        }
    }
    
    if (promotionOccured) triggerPromotionSequence(oldRankIndex, gameState.currentRankIndex);
    updateUI(true); saveData();
}

function triggerPromotionSequence(oldIndex, newIndex) {
    const overlay = document.getElementById('promotion-overlay');
    document.getElementById('promo-rank-text').innerText = rankSystem[newIndex].title;
    document.getElementById('promo-rank-text').style.color = getComputedStyle(document.body).getPropertyValue('--main-color');
    document.getElementById('promo-old-img').src = rankSystem[oldIndex].img;
    document.getElementById('promo-new-img').src = rankSystem[newIndex].img;
    overlay.classList.add('active');
    startFireworks();
}

function setupPromotionOverlay() {
    document.getElementById('promotion-overlay').addEventListener('click', function() {
        this.classList.remove('active');
        stopFireworks(); updateInterfaceTheme(); 
    });
}

function updateInterfaceTheme() {
    document.body.className = document.body.className.replace(/\brank-\w+\b/g, '').trim();
    document.body.classList.add(rankSystem[gameState.currentRankIndex].theme);
}

function updateUI(isAnimateFill = true) {
    const rank = rankSystem[gameState.currentRankIndex];
    document.getElementById('display-name').innerText = gameState.nickname;
    document.getElementById('rank-image').src = rank.img;
    document.getElementById('rank-text').innerText = rank.title;
    document.getElementById('rank-stars').innerText = rank.stars;
    document.getElementById('level-display').innerText = `Lv. ${gameState.level}`;
    document.getElementById('exp-text').innerText = `${gameState.exp} / ${gameState.maxExp} EXP`;
    
    let expPercentage = (gameState.exp / gameState.maxExp) * 100;
    const fill = document.getElementById('exp-bar-fill');
    if (!isAnimateFill) fill.style.transition = 'none';
    fill.style.width = `${expPercentage}%`;
    if (!isAnimateFill) setTimeout(()=> fill.style.transition = '', 50);

    document.getElementById('stat-hp').innerText = (1000 + gameState.level * 250).toLocaleString();
    document.getElementById('stat-atk').innerText = (150 + gameState.level * 15).toLocaleString();
    document.getElementById('stat-def').innerText = (80 + gameState.level * 8).toLocaleString();
    document.getElementById('stat-cp').innerText = (1230 + gameState.level * 380).toLocaleString();

    updateInterfaceTheme(); renderQuestLists(); renderTodoList(); updateTodoBadge();
}

function renderQuestLists() {
    const dailyList = document.getElementById('daily-quest-list');
    const weeklyList = document.getElementById('weekly-quest-list');
    dailyList.innerHTML = ''; weeklyList.innerHTML = '';
    gameState.quests.daily.forEach(q => dailyList.appendChild(createQuestItemHTML(q, 'daily')));
    gameState.quests.weekly.forEach(q => weeklyList.appendChild(createQuestItemHTML(q, 'weekly')));
}

function createQuestItemHTML(quest, type) {
    const li = document.createElement('li');
    li.className = 'quest-item';
    if (quest.done) li.classList.add('quest-done');
    li.innerHTML = `
        <div class="quest-text-area">
            <span class="quest-name">${quest.name}</span>
            <span style="color: var(--main-color); font-size: 11px;">+${quest.exp} EXP</span>
        </div>
        <div style="display:flex; gap:6px;">
            <button class="action-btn" onclick="gainExp(${quest.exp}, '${quest.id}', '${type}')" ${quest.done ? 'disabled' : ''}>
                ${quest.done ? '완료' : '완료하기'}
            </button>
            <button class="delete-btn" onclick="deleteItem('${type}', '${quest.id}')">❌</button>
        </div>`;
    return li;
}

function renderTodoList() {
    const list = document.getElementById('todo-list');
    list.innerHTML = '';
    gameState.todos.forEach(t => {
        const li = document.createElement('li');
        li.className = 'quest-item';
        if (t.done) li.classList.add('quest-done');
        li.innerHTML = `
            <div class="quest-text-area">
                <span class="quest-name">📌 ${t.name}</span>
                <span style="color: #888; font-size: 11px;">(가중치 ${t.weight})</span>
            </div>
            <div style="display:flex; gap:6px;">
                <button class="action-btn" onclick="gainExp(10, '${t.id}', 'todo')" ${t.done ? 'disabled' : ''}>
                    ${t.done ? '달성' : `+${Math.floor(10 * t.weight)} EXP`}
                </button>
                <button class="delete-btn" onclick="deleteItem('todo', '${t.id}')">❌</button>
            </div>`;
        list.appendChild(li);
    });
}

function updateTodoBadge() {
    const count = gameState.todos.filter(t => !t.done).length;
    const badge = document.getElementById('todo-badge');
    if (count > 0) { badge.innerText = count; badge.classList.remove('hidden'); } 
    else badge.classList.add('hidden');
}

function checkAndResetTimers() {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (gameState.quests.lastDailyReset !== todayStr) {
        gameState.quests.daily.forEach(q => q.done = false);
        gameState.todos.forEach(t => t.done = false);
        gameState.quests.lastDailyReset = todayStr;
    }
}

function resetQuests(isDailyOnly = false) {
    gameState.quests.daily = JSON.parse(JSON.stringify(dailyQuestsTemplate));
    if (!isDailyOnly) gameState.quests.weekly = JSON.parse(JSON.stringify(weeklyQuestsTemplate));
}
function resetTodos() { gameState.todos = JSON.parse(JSON.stringify(dailyTodosTemplate)); }
function saveData() { localStorage.setItem('myMmoRpgData_v3', JSON.stringify(gameState)); }

function loadData() {
    const saved = localStorage.getItem('myMmoRpgData_v3');
    if (saved) {
        gameState = JSON.parse(saved);
        checkAndResetTimers();
        document.getElementById('intro-screen').classList.add('hidden');
        document.getElementById('main-portal').classList.remove('hidden');
        updateUI(false);
        return true;
    }
    return false;
}

function resetData() {
    if (confirm("정말로 모든 캐릭터 데이터와 진행 상황을 초기화하시겠습니까?")) {
        localStorage.removeItem('myMmoRpgData_v3');
        location.reload();
    }
}

function openView(viewId) {
    document.querySelectorAll('.view-container').forEach(v => v.style.display = 'none');
    document.getElementById(`view-${viewId}`).style.display = 'block';
}

function closeView() { document.querySelectorAll('.view-container').forEach(v => v.style.display = 'none'); }

let fireworksInterval = null;
function startFireworks() {
    const container = document.getElementById('fireworks-contain');
    container.innerHTML = '';
    fireworksInterval = setInterval(() => {
        const centerX = window.innerWidth * (0.3 + Math.random() * 0.4);
        const centerY = window.innerHeight * (0.3 + Math.random() * 0.3);
        const color = `hsl(${Math.random() * 60 + 40}, 100%, 60%)`;
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.backgroundColor = color;
            particle.style.left = centerX + 'px'; particle.style.top = centerY + 'px';
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            particle.style.setProperty('--tx', `${Math.cos(angle) * speed}px`);
            particle.style.setProperty('--ty', `${Math.sin(angle) * speed}px`);
            particle.style.animation = `particleFire ${0.5 + Math.random() * 1}s ease-out forwards`;
            container.appendChild(particle);
            setTimeout(() => particle.remove(), 1500);
        }
    }, 300);
}
function stopFireworks() { if (fireworksInterval) clearInterval(fireworksInterval); document.getElementById('fireworks-contain').innerHTML = ''; }
