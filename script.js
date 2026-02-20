let fossils = JSON.parse(localStorage.getItem('stoneLogData')) || [];
let trash = JSON.parse(localStorage.getItem('stoneLogTrash')) || [];
let currentUploads = [];
let activeCategory = null;

const grid = document.getElementById('catalogGrid');
const menu = document.getElementById('categoryMenu');
const saveBtn = document.getElementById('saveBtn');

// Define Categories (Update images/ paths as needed)
const categories = [
    { name: "Ammonites", img: "images/cat/ammonite.png" },
    { name: "Pyrite Ammonites", img: "images/cat/pyrite_ammonite.png" },
    { name: "Belemnites", img: "images/cat/belemnite.png" },
    { name: "Bone", img: "images/cat/bone.png" },
    { name: "Crinoids", img: "images/cat/crinoid.png" },
    { name: "Other", img: "images/cat/other.png" }
];

function reindexFossils() {
    // Sorts overall array so oldest is always #1
    for (let i = 0; i < fossils.length; i++) {
        fossils[fossils.length - 1 - i].id = i + 1;
    }
}

function showCategories() {
    activeCategory = null;
    document.getElementById('categoryHeader').style.display = 'none';
    grid.style.display = 'none';
    menu.style.display = 'grid';
    renderMenu();
}

function renderMenu() {
    menu.innerHTML = '';
    categories.forEach(cat => {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.style.backgroundImage = `url('${cat.img}')`;
        card.onclick = () => filterByCategory(cat.name);
        card.innerHTML = `<span class="category-title">${cat.name}</span>`;
        menu.appendChild(card);
    });
}

function filterByCategory(catName) {
    activeCategory = catName;
    menu.style.display = 'none';
    document.getElementById('categoryHeader').style.display = 'block';
    document.getElementById('activeCategoryTitle').innerText = catName;
    grid.style.display = 'grid';
    render();
}

function render() {
    if (!activeCategory) return;
    grid.innerHTML = '';
    
    // 1. Filter by category
    // 2. Apply nested sort: Location -> Latin Name -> Date
    const filtered = fossils
        .filter(f => f.category === activeCategory)
        .sort((a, b) => {
            // Sort Level 1: Location (A-Z)
            const locCompare = (a.loc || "").localeCompare(b.loc || "");
            if (locCompare !== 0) return locCompare;

            // Sort Level 2: Species/Latin Name (A-Z)
            const speciesCompare = (a.latin || "").localeCompare(b.latin || "");
            if (speciesCompare !== 0) return speciesCompare;

            // Sort Level 3: Rarity (5-1)
            const rarityCompare = (b.rarity || "").localeCompare(a.rarity || "");
            if (rarityCompare !== 0) return rarityCompare;

            // Sort Level 4: Discovery Date (Newest first)
            // Assumes date format is DD/MM/YYYY
            const dateA = a.date ? new Date(a.date.split('/').reverse().join('-')) : 0;
            const dateB = b.date ? new Date(b.date.split('/').reverse().join('-')) : 0;
            return dateB - dateA; 
        });

    filtered.forEach(f => {
        const cover = (f.images && f.images.length > 0) ? f.images[0] : '';
        const card = document.createElement('div');
        card.className = 'fossil-card';
        card.innerHTML = `
            <div onclick="window.location.href='details.html?id=${f.id}'" style="cursor:pointer;">
                <div class="card-img" style="background-image: url('${cover}')">
                    ${getRarityStars(f.rarity || 1)}
                </div>
                <div class="card-body">
                    <p class="detail-subtitle">SPECIMEN #${f.id}</p>
                    <h3>${f.name}</h3>
                    <div class="meta-row"><span class="meta-label">Location</span><span>${f.loc || 'N/A'}</span></div>
                    <div class="meta-row"><span class="meta-label">Era</span><span>${f.era}</span></div>
                    <div class="meta-row"><span class="meta-label">Species</span><span style="font-style:italic;">${f.latin || 'N/A'}</span></div>
                </div>
            </div>
            <div class="card-body" style="padding-top:0;">
                <div class="card-actions">
                    <button class="action-btn edit-btn" onclick="editFossil(${f.id})">Edit Info</button>
                    <button class="action-btn delete-btn" onclick="deleteFossil(${f.id})">Delete</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

saveBtn.addEventListener('click', () => {
    const rarity = document.getElementById('fossilRarity').value;
    const name = document.getElementById('fossilName').value;
    const cat = document.getElementById('fossilCategory').value;
    const latin = document.getElementById('fossilLatin').value;
    const loc = document.getElementById('fossilLoc').value;
    const era = document.getElementById('fossilEra').value;
    const editId = document.getElementById('editId').value;

    if (editId) {
        const idx = fossils.findIndex(f => f.id == editId);
        fossils[idx] = { ...fossils[idx], name, latin, loc, era, rarity }; // Save rarity
    } else {
        fossils.unshift({
            id: 0,
            name, category: cat, latin, loc, era, rarity,
            images: [...currentUploads],
            notes: "",
            date: new Date().toLocaleDateString()
        });
    }

    saveAndRender();
    resetForm();
    showCategories();
});

function editFossil(id) {
    const f = fossils.find(item => item.id == id);
    document.getElementById('fossilName').value = f.name;
    document.getElementById('fossilCategory').value = f.category || 'Ammonites';
    document.getElementById('fossilLatin').value = f.latin || '';
    document.getElementById('fossilLoc').value = f.loc || '';
    document.getElementById('fossilEra').value = f.era;
    document.getElementById('editId').value = f.id;
    currentUploads = [...(f.images || [])];
    renderPreviews();
    document.getElementById('formTitle').innerText = "Update Specimen #" + f.id;
    document.getElementById('cancelEdit').style.display = "inline-block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteFossil(id) {
    if(confirm(`Move Specimen #${id} to Deleted?`)) {
        const idx = fossils.findIndex(f => f.id == id);
        trash.push(fossils.splice(idx, 1)[0]);
        localStorage.setItem('stoneLogTrash', JSON.stringify(trash));
        saveAndRender();
        showCategories();
    }
}

function addPathToList() {
    const input = document.getElementById('fossilPathInput');
    if (input.value.trim()) {
        currentUploads.push(input.value.trim());
        input.value = '';
        renderPreviews();
    }
}

function renderPreviews() {
    const container = document.getElementById('uploadPreview');
    container.innerHTML = '';
    currentUploads.forEach((src, i) => {
        const wrap = document.createElement('div');
        wrap.className = 'preview-wrapper';
        wrap.innerHTML = `
            <img src="${src}" class="mini-preview" onerror="this.src='https://placehold.co/100?text=Error'">
            <div class="reorder-btns">
                <button type="button" class="reorder-btn" onclick="moveImg(${i}, -1)">◀</button>
                <button type="button" class="reorder-btn" onclick="moveImg(${i}, 1)">▶</button>
                <button type="button" class="reorder-btn delete-photo-btn" onclick="removeImg(${i})">✖</button>
            </div>`;
        container.appendChild(wrap);
    });
}

function moveImg(i, dir) {
    const n = i + dir;
    if (n >= 0 && n < currentUploads.length) {
        [currentUploads[i], currentUploads[n]] = [currentUploads[n], currentUploads[i]];
        renderPreviews();
    }
}

function removeImg(i) { currentUploads.splice(i, 1); renderPreviews(); }

function resetForm() {
    document.querySelectorAll('.form-grid input').forEach(i => i.value = '');
    document.getElementById('editId').value = '';
    document.getElementById('formTitle').innerText = "Log New Specimen";
    document.getElementById('cancelEdit').style.display = "none";
    currentUploads = [];
    renderPreviews();
}

function saveAndRender() {
    reindexFossils();
    localStorage.setItem('stoneLogData', JSON.stringify(fossils));
    render();
}

function getRarityStars(rating) {
    let pips = '';
    // We use a loop to create 5 stars. 
    // Filled stars for the rating, transparent ones for the remainder.
    for(let i = 1; i <= 5; i++) {
        pips += `<span class="pip ${i <= rating ? 'filled' : 'empty'}">✦</span>`;
    }
    return `<div class="rarity-pips">${pips}</div>`;
}

showCategories();