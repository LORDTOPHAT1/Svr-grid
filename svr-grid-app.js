// ============================================================
//  SVR GRID — APP LOGIC
//  Search · Drag & Drop · Grid Reveal Animation
// ============================================================

const GRID_SIZE = 14;

let gridSlots = Array(GRID_SIZE).fill(null); // null = empty slot
let dragSrcIndex = null;
let animationTimer = null;
let currentPairIndex = 0;
let isPlaying = false;
let generatedPairs = [];

// ── ELEMENTS ──
const searchInput    = document.getElementById('driverSearch');
const searchDropdown = document.getElementById('searchDropdown');
const gridList       = document.getElementById('gridList');
const btnGenerate    = document.getElementById('btnGenerate');
const btnClear       = document.getElementById('btnClear');
const btnPlay        = document.getElementById('btnPlay');
const btnReset       = document.getElementById('btnReset');
const btnFullscreen  = document.getElementById('btnFullscreen');
const previewStage   = document.getElementById('previewStage');
const fullscreenOverlay = document.getElementById('fullscreenOverlay');
const fsStage        = document.getElementById('fsStage');
const fsPlay         = document.getElementById('fsPlay');
const fsClose        = document.getElementById('fsClose');

// ── INIT ──
function init() {
  renderGridList();
  bindSearch();
  bindActions();
  bindFullscreen();
}

// ── RENDER GRID SLOTS ──
function renderGridList() {
  gridList.innerHTML = '';
  for (let i = 0; i < GRID_SIZE; i++) {
    const driver = gridSlots[i];
    const slot = document.createElement('div');
    slot.className = 'grid-slot' + (driver ? '' : ' empty');
    slot.dataset.index = i;

    if (driver) {
      slot.draggable = true;
      slot.innerHTML = `
        <span class="slot-position">${i + 1}</span>
        <div class="slot-divider"></div>
        ${avatarHTML(driver, 'slot')}
        <span class="slot-name">${driver.name}</span>
        <div class="slot-status">
          ${driver.hasImage
            ? `<span class="slot-tick">✓</span>`
            : `<button class="slot-search-btn" title="Search for driver image" onclick="retrySearch(${i})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
               </button>`
          }
        </div>
        <button class="slot-delete-btn" onclick="removeFromSlot(${i})" title="Remove">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      `;
      slot.addEventListener('dragstart', onDragStart);
      slot.addEventListener('dragend', onDragEnd);
    } else {
      slot.innerHTML = `
        <span class="slot-position">${i + 1}</span>
        <div class="slot-divider"></div>
        <span class="slot-empty-label">EMPTY</span>
      `;
    }

    slot.addEventListener('dragover', onDragOver);
    slot.addEventListener('dragleave', onDragLeave);
    slot.addEventListener('drop', onDrop);
    gridList.appendChild(slot);
  }
}

// ── AVATAR HTML ──
function avatarHTML(driver, context) {
  const size = context === 'slot' ? 'slot-avatar' : 'dropdown-avatar';
  const placeholderClass = context === 'slot' ? 'slot-avatar-placeholder' : 'dropdown-avatar-placeholder';
  const initial = driver.name.charAt(0).toUpperCase();

  if (driver.hasImage && driver.imageUrl) {
    return `<div class="${size}"><img src="${driver.imageUrl}" alt="${driver.name}" /></div>`;
  }
  return `<div class="${placeholderClass}">${initial}</div>`;
}

// ── SEARCH ──
function bindSearch() {
  searchInput.addEventListener('input', onSearchInput);
  searchInput.addEventListener('keydown', onSearchKeydown);
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) closeDropdown();
  });
}

function onSearchInput() {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) { closeDropdown(); return; }

  const matches = SVR_DRIVERS.filter(d =>
    d.name.toLowerCase().includes(query) &&
    !gridSlots.some(s => s && s.id === d.id)
  );

  if (!matches.length) { closeDropdown(); return; }

  searchDropdown.innerHTML = matches.map(d => `
    <div class="dropdown-item" data-id="${d.id}">
      ${avatarHTML(d, 'dropdown')}
      <span class="dropdown-name">${highlightMatch(d.name, query)}</span>
      <div class="dropdown-status">
        <div class="status-dot ${d.hasImage ? 'has-image' : 'no-image'}"></div>
        <span class="status-label">${d.hasImage ? 'IMAGE' : 'NO IMG'}</span>
      </div>
    </div>
  `).join('');

  searchDropdown.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', () => selectDriver(parseInt(item.dataset.id)));
  });

  searchDropdown.classList.add('open');
}

function highlightMatch(name, query) {
  const idx = name.toLowerCase().indexOf(query);
  if (idx === -1) return name;
  return name.slice(0, idx) +
    `<strong style="color:var(--purple-bright)">${name.slice(idx, idx + query.length)}</strong>` +
    name.slice(idx + query.length);
}

function onSearchKeydown(e) {
  const items = searchDropdown.querySelectorAll('.dropdown-item');
  const highlighted = searchDropdown.querySelector('.highlighted');
  let idx = Array.from(items).indexOf(highlighted);

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (highlighted) highlighted.classList.remove('highlighted');
    const next = items[Math.min(idx + 1, items.length - 1)];
    if (next) next.classList.add('highlighted');
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (highlighted) highlighted.classList.remove('highlighted');
    const prev = items[Math.max(idx - 1, 0)];
    if (prev) prev.classList.add('highlighted');
  } else if (e.key === 'Enter') {
    if (highlighted) {
      selectDriver(parseInt(highlighted.dataset.id));
    } else if (items.length === 1) {
      selectDriver(parseInt(items[0].dataset.id));
    }
  } else if (e.key === 'Escape') {
    closeDropdown();
  }
}

function selectDriver(driverId) {
  const driver = SVR_DRIVERS.find(d => d.id === driverId);
  if (!driver) return;
  const emptyIdx = gridSlots.indexOf(null);
  if (emptyIdx === -1) return; // grid full
  gridSlots[emptyIdx] = driver;
  searchInput.value = '';
  closeDropdown();
  renderGridList();
}

function closeDropdown() {
  searchDropdown.classList.remove('open');
  searchDropdown.innerHTML = '';
}

function retrySearch(slotIndex) {
  gridSlots[slotIndex] = null;
  renderGridList();
  searchInput.focus();
}

function removeFromSlot(index) {
  gridSlots[index] = null;
  renderGridList();
}

// ── DRAG AND DROP ──
function onDragStart(e) {
  dragSrcIndex = parseInt(e.currentTarget.dataset.index);
  e.dataTransfer.effectAllowed = 'move';
  setTimeout(() => e.currentTarget.style.opacity = '0.4', 0);
}

function onDragEnd(e) {
  e.currentTarget.style.opacity = '';
  document.querySelectorAll('.grid-slot').forEach(s => s.classList.remove('drag-over'));
  dragSrcIndex = null;
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}

function onDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function onDrop(e) {
  e.preventDefault();
  const destIndex = parseInt(e.currentTarget.dataset.index);
  if (dragSrcIndex === null || dragSrcIndex === destIndex) return;

  const temp = gridSlots[destIndex];
  gridSlots[destIndex] = gridSlots[dragSrcIndex];
  gridSlots[dragSrcIndex] = temp;

  renderGridList();
}

// ── ACTIONS ──
function bindActions() {
  btnClear.addEventListener('click', () => {
    gridSlots = Array(GRID_SIZE).fill(null);
    renderGridList();
    resetPreview();
  });

  btnGenerate.addEventListener('click', generateGrid);
  btnPlay.addEventListener('click', () => playReveal(previewStage));
  btnReset.addEventListener('click', () => resetAnimation(previewStage));
}

// ── GENERATE ──
function generateGrid() {
  const filled = gridSlots.filter(Boolean);
  if (!filled.length) return;

  // Build pairs bottom-up (P14 to P1, two at a time)
  generatedPairs = [];
  const drivers = [...gridSlots];

  // Pair from last to first: [13,12], [11,10], ... [1,0]
  for (let i = GRID_SIZE - 1; i >= 0; i -= 2) {
    const pair = [];
    if (drivers[i]) pair.push({ pos: i + 1, driver: drivers[i] });
    if (i - 1 >= 0 && drivers[i - 1]) pair.push({ pos: i, driver: drivers[i - 1] });
    if (pair.length) generatedPairs.push(pair);
  }

  currentPairIndex = 0;
  isPlaying = false;

  buildRevealStage(previewStage);

  btnPlay.disabled = false;
  btnReset.disabled = false;
  btnFullscreen.disabled = false;
}

// ── BUILD REVEAL STAGE ──
function posOrdinal(n) {
  if (n === 1) return '1<sup>ST</sup>';
  if (n === 2) return '2<sup>ND</sup>';
  if (n === 3) return '3<sup>RD</sup>';
  return `${n}<sup>TH</sup>`;
}

function buildDriverPanel(entry, side) {
  const { pos, driver } = entry;
  const initial = driver.name.charAt(0).toUpperCase();
  const panel = document.createElement('div');
  panel.className = `reveal-driver-panel ${side}`;

  panel.innerHTML = `
    <div class="panel-team-bar"></div>
    <div class="panel-team-name-vertical">${driver.team || 'SVR RACING'}</div>
    <span class="panel-svr-mark">SVR</span>
    <div class="panel-avatar-zone">
      ${driver.hasImage && driver.imageUrl
        ? `<img src="${driver.imageUrl}" alt="${driver.name}" />`
        : `<span class="panel-avatar-initial">${initial}</span>`
      }
    </div>
    <div class="panel-info">
      <span class="panel-position">${posOrdinal(pos)}</span>
      <span class="panel-name">${driver.name}</span>
      <span class="panel-team">${driver.team || 'SVR Racing'}</span>
    </div>
  `;
  return panel;
}

function buildRevealStage(container) {
  container.innerHTML = '';
  const stage = document.createElement('div');
  stage.className = 'grid-reveal-stage';

  // Centre purple bar with label
  const centre = document.createElement('div');
  centre.className = 'reveal-centre';
  centre.innerHTML = `<span class="reveal-grid-label">SVR STARTING GRID</span>`;
  stage.appendChild(centre);

  generatedPairs.forEach((pair, pIdx) => {
    const pairEl = document.createElement('div');
    pairEl.className = 'reveal-pair' + (pIdx === 0 ? ' active' : '');
    pairEl.dataset.pairIndex = pIdx;

    // Left panel = lower position (e.g. P14), right = higher (e.g. P13)
    // pair[0] is always the lower position (built bottom-up)
    const leftEntry  = pair[0] || null;
    const rightEntry = pair[1] || null;

    if (leftEntry)  pairEl.appendChild(buildDriverPanel(leftEntry, 'left'));
    if (rightEntry) pairEl.appendChild(buildDriverPanel(rightEntry, 'right'));

    // If only one driver in this pair, add an empty right panel
    if (!rightEntry) {
      const empty = document.createElement('div');
      empty.className = 'reveal-driver-panel right';
      empty.style.background = '#0a0a12';
      pairEl.appendChild(empty);
    }

    stage.appendChild(pairEl);
  });

  // Progress pips
  const progress = document.createElement('div');
  progress.className = 'reveal-progress';
  generatedPairs.forEach((_, i) => {
    const pip = document.createElement('div');
    pip.className = 'progress-pip' + (i === 0 ? ' active' : '');
    pip.dataset.pip = i;
    progress.appendChild(pip);
  });
  stage.appendChild(progress);

  container.appendChild(stage);
}

// ── PLAY REVEAL ──
function playReveal(container) {
  if (isPlaying) return;
  isPlaying = true;

  function showPair(idx) {
    if (idx >= generatedPairs.length) {
      isPlaying = false;
      return;
    }

    const pairs = container.querySelectorAll('.reveal-pair');
    const pips = container.querySelectorAll('.progress-pip');

    pairs.forEach((p, i) => {
      p.classList.remove('active', 'exit');
      if (i === idx) p.classList.add('active');
      else if (i < idx) p.classList.add('exit');
    });

    pips.forEach((pip, i) => {
      pip.classList.remove('active', 'done');
      if (i < idx) pip.classList.add('done');
      else if (i === idx) pip.classList.add('active');
    });

    currentPairIndex = idx;
    animationTimer = setTimeout(() => showPair(idx + 1), 2200);
  }

  showPair(currentPairIndex);
}

function resetAnimation(container) {
  clearTimeout(animationTimer);
  isPlaying = false;
  currentPairIndex = 0;

  const pairs = container.querySelectorAll('.reveal-pair');
  const pips = container.querySelectorAll('.progress-pip');

  pairs.forEach((p, i) => {
    p.classList.remove('active', 'exit');
    if (i === 0) p.classList.add('active');
  });

  pips.forEach((pip, i) => {
    pip.classList.remove('active', 'done');
    if (i === 0) pip.classList.add('active');
  });
}

function resetPreview() {
  clearTimeout(animationTimer);
  isPlaying = false;
  generatedPairs = [];
  currentPairIndex = 0;
  previewStage.innerHTML = `
    <div class="preview-placeholder">
      <div class="placeholder-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      </div>
      <p>ADD DRIVERS AND HIT GENERATE</p>
    </div>
  `;
  btnPlay.disabled = true;
  btnReset.disabled = true;
  btnFullscreen.disabled = true;
}

// ── FULLSCREEN ──
function bindFullscreen() {
  btnFullscreen.addEventListener('click', openFullscreen);
  fsClose.addEventListener('click', closeFullscreen);
  fsPlay.addEventListener('click', () => {
    resetAnimation(fsStage);
    playReveal(fsStage);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeFullscreen();
  });
}

function openFullscreen() {
  if (!generatedPairs.length) return;
  fsStage.innerHTML = '';
  buildRevealStage(fsStage);
  fullscreenOverlay.classList.add('open');
}

function closeFullscreen() {
  clearTimeout(animationTimer);
  isPlaying = false;
  fullscreenOverlay.classList.remove('open');
}

// ── START ──
init();
