/**
 * App.js — Lógica compartida para la App de Informes Fotográficos
 * Sustentambiente Energía Solar
 * v2.0 - With Cloud Sync
 */
console.log("App.js v2.0 loaded");

// ============================================================
// CONFIGURACIÓN DE CATEGORÍAS
// ============================================================
const CATEGORIES = [
    { id: "fachada", name: "Fachada", folder: "detalle__fachada", icon: "foundation" },
    { id: "punto_de_acceso", name: "Punto de acceso de la planta", folder: "detalle__punto_de_acceso", icon: "architecture" },
    { id: "paneles_solares", name: "Paneles solares", folder: "detalle__paneles_solares", icon: "wall_art" },
    { id: "estructura", name: "Estructura", folder: "detalle__estructura", icon: "electrical_services" },
    { id: "canalizacion", name: "Canalización", folder: "detalle__canalización", icon: "plumbing" },
    { id: "cableado", name: "Cableado", folder: "detalle__cableado", icon: "mode_fan" },
    { id: "aterrizaje", name: "Aterrizaje", folder: "detalle__aterrizaje", icon: "roofing" },
    { id: "inversor", name: "Inversor", folder: "detalle__inversor", icon: "home_repair_service" },
    { id: "tablero", name: "Tablero", folder: "detalle__tablero", icon: "potted_plant" },
    { id: "automaticos", name: "Automáticos", folder: "detalle__automáticos", icon: "health_and_safety" },
    { id: "bastidor", name: "Bastidor", folder: "detalle__bastidor", icon: "cleaning_services" },
    { id: "senaletica", name: "Señalética", folder: "detalle__señalética", icon: "fence" },
    { id: "perfil_chile", name: "Perfil chile", folder: "detalle__perfil_chile", icon: "format_paint" },
    { id: "medicion_a_tierra", name: "Medición a tierra", folder: "detalle__medición_a_tierra", icon: "carpenter" },
    { id: "transformador", name: "Transformador", folder: "detalle__transformador", icon: "more_horiz" },
];

// ============================================================
// PHOTO STORAGE — localStorage persistence
// ============================================================
// ============================================================
// PHOTO STORAGE — IndexedDB persistence
// ============================================================
const PhotoStorage = {
    DB_NAME: 'PhotoAppDB',
    DB_VERSION: 1,
    STORE_NAME: 'photos',
    _db: null,

    async init() {
        if (this._db) return this._db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this._db = request.result;
                resolve(this._db);
            };
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
                }
            };
        });
    },

    async _getStore(mode = 'readonly') {
        const db = await this.init();
        return db.transaction(this.STORE_NAME, mode).objectStore(this.STORE_NAME);
    },

    async getPhotos(categoryId) {
        try {
            const store = await this._getStore();
            return new Promise((resolve) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    const allPhotos = request.result;
                    // Filter by category in JS (IndexedDB could use an index, but this is simpler for now)
                    resolve(allPhotos.filter(p => p.categoryId === categoryId));
                };
            });
        } catch (e) {
            console.error('Error reading photos:', e);
            return [];
        }
    },

    async addPhoto(categoryId, photoData) {
        const photos = await this.getPhotos(categoryId);
        const photo = {
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            categoryId,
            data: photoData, // base64
            timestamp: new Date().toISOString(),
            filename: `IMG_${String(photos.length + 1).padStart(3, '0')}.JPG`
        };

        try {
            const store = await this._getStore('readwrite');
            return new Promise((resolve, reject) => {
                const request = store.add(photo);
                request.onsuccess = () => resolve(photo);
                request.onerror = () => {
                    alert('⚠️ Error al guardar la foto en el dispositivo.');
                    reject(request.error);
                };
            });
        } catch (e) {
            console.error('Storage error:', e);
            throw e;
        }
    },

    async deletePhoto(categoryId, photoId) {
        try {
            const store = await this._getStore('readwrite');
            return new Promise((resolve) => {
                const request = store.delete(photoId);
                request.onsuccess = () => resolve();
            });
        } catch (e) {
            console.error('Delete error:', e);
        }
    },

    async getPhotoCount(categoryId) {
        const photos = await this.getPhotos(categoryId);
        return photos.length;
    },

    async getAllCounts() {
        const counts = {};
        for (const cat of CATEGORIES) {
            counts[cat.id] = await this.getPhotoCount(cat.id);
        }
        return counts;
    },

    // Migración de localStorage a IndexedDB
    async migrateFromLocalStorage() {
        const migratedKey = 'migration_done';
        if (localStorage.getItem(migratedKey)) return;

        console.log("Iniciando migración de localStorage a IndexedDB...");
        for (const cat of CATEGORIES) {
            const key = `photos_${cat.id}`;
            const data = localStorage.getItem(key);
            if (data) {
                try {
                    const photos = JSON.parse(data);
                    for (const p of photos) {
                        await this.addPhoto(cat.id, p.data);
                    }
                    localStorage.removeItem(key);
                    console.log(`Migradas ${photos.length} fotos de ${cat.id}`);
                } catch (e) {
                    console.error(`Error migrando categoría ${cat.id}:`, e);
                }
            }
        }
        localStorage.setItem(migratedKey, 'true');
        console.log("Migración completada.");
    }
};

// ============================================================
// PROJECT DATA STORAGE — localStorage persistence for project info
// ============================================================
const ProjectData = {
    _key: 'project_data',

    getData() {
        try {
            const data = localStorage.getItem(this._key);
            return data ? JSON.parse(data) : {
                title: "Nombre de la Obra",
                subtitle: "Instalación Fotovoltaica",
                date: new Date().toISOString().split('T')[0],
                inspectorName: "",
                inspectorRole: "",
                clientName: ""
            };
        } catch (e) {
            console.error('Error reading project data:', e);
            return {};
        }
    },

    saveData(data) {
        try {
            const current = this.getData();
            const newData = { ...current, ...data };
            localStorage.setItem(this._key, JSON.stringify(newData));
        } catch (e) {
            console.error('Error saving project data:', e);
        }
    },

    async clearAll() {
        if (confirm("⚠️ ¿Estás seguro de BORRAR TODO?\n\nSe eliminarán todas las fotos y los datos del proyecto actual de forma permanente.")) {
            try {
                // Clear IndexedDB photos
                const db = await PhotoStorage.init();
                if (db) {
                    const tx = db.transaction(PhotoStorage.STORE_NAME, 'readwrite');
                    tx.objectStore(PhotoStorage.STORE_NAME).clear();

                    await new Promise((resolve) => {
                        tx.oncomplete = resolve;
                    });
                }

                // Clear project data and metadata
                localStorage.removeItem(this._key);
                localStorage.removeItem('migration_done');

                // Clear individual items just in case (optional, but keep it if requested)
                // localStorage.clear(); 

                alert("Datos eliminados correctamente.");
                location.reload();
            } catch (e) {
                console.error("Error clearing data:", e);
                alert("Error al borrar datos.");
            }
        }
    }
};

// ============================================================
// CAMERA CAPTURE — Uses file input for mobile camera access
// ============================================================
function openCamera(categoryId, onPhotoAdded) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Cámara trasera
    input.style.display = 'none';

    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Compress and store
        compressAndStore(file, categoryId, onPhotoAdded);
        document.body.removeChild(input);
    });

    document.body.appendChild(input);
    input.click();
}

function openGallery(categoryId, onPhotoAdded) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.style.display = 'none';

    input.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        files.forEach(file => {
            compressAndStore(file, categoryId, onPhotoAdded);
        });
        document.body.removeChild(input);
    });

    document.body.appendChild(input);
    input.click();
}

async function compressAndStore(file, categoryId, onPhotoAdded) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = async () => {
            // Compress to max 800px wide, quality 0.7
            const canvas = document.createElement('canvas');
            const MAX_W = 800;
            let w = img.width;
            let h = img.height;
            if (w > MAX_W) {
                h = (h * MAX_W) / w;
                w = MAX_W;
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            const compressed = canvas.toDataURL('image/jpeg', 0.7);

            try {
                const photo = await PhotoStorage.addPhoto(categoryId, compressed);
                if (onPhotoAdded) onPhotoAdded(photo);
            } catch (error) {
                console.error("Failed to add photo:", error);
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// ============================================================
// PHOTO GRID RENDERER — For detail pages
// ============================================================
async function renderPhotoGrid(categoryId, gridContainerId, emptyStateId) {
    const photos = await PhotoStorage.getPhotos(categoryId);
    const grid = document.getElementById(gridContainerId);
    const emptyState = document.getElementById(emptyStateId);

    if (!grid) return;

    if (photos.length === 0) {
        grid.style.display = 'none';
        if (emptyState) emptyState.style.display = '';
        return;
    }

    // Hide empty state, show grid
    if (emptyState) emptyState.style.display = 'none';
    grid.style.display = '';

    grid.innerHTML = photos.map(photo => `
        <div class="aspect-square bg-gray-200 rounded-lg overflow-hidden relative group" id="photo-${photo.id}">
            <img src="${photo.data}" alt="${photo.filename}" class="object-cover w-full h-full" />
            <div class="absolute top-1 right-1 bg-green-500 rounded-full p-0.5 shadow-md">
                <span class="material-symbols-outlined text-[12px] text-white font-bold">check</span>
            </div>
            <button onclick="handleDeletePhoto('${categoryId}', '${photo.id}')" 
                    class="absolute bottom-1 right-1 bg-red-500/80 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
                <span class="material-symbols-outlined text-[14px]">delete</span>
            </button>
            <div class="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-2 py-1 flex justify-between">
                <span>${photo.filename}</span>
                <span>${new Date(photo.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        </div>
    `).join('');
}

async function handleDeletePhoto(categoryId, photoId) {
    if (confirm('¿Eliminar esta foto?')) {
        await PhotoStorage.deletePhoto(categoryId, photoId);
        await renderPhotoGrid(categoryId, 'photo-grid', 'empty-state');
        await updatePhotoCountBadge(categoryId);
    }
}

async function updatePhotoCountBadge(categoryId) {
    const count = await PhotoStorage.getPhotoCount(categoryId);
    const badge = document.getElementById('photo-count-badge');
    if (badge) {
        badge.textContent = count === 1 ? '1 FOTO' : `${count} FOTOS`;
        if (count > 0) {
            badge.className = 'bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider';
        } else {
            badge.className = 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider';
        }
    }
}

// ============================================================
// LISTADO — Dynamic photo count updater
// ============================================================
async function updateListadoCounts() {
    const items = document.querySelectorAll('[data-category-id]');
    if (items.length === 0) return;

    // Ejecutar migración si es necesario
    await PhotoStorage.migrateFromLocalStorage();

    let totalWithPhotos = 0;

    for (const item of items) {
        const catId = item.getAttribute('data-category-id');
        const count = await PhotoStorage.getPhotoCount(catId);
        const badge = item.querySelector('.photo-count-badge');
        const iconContainer = item.querySelector('.category-icon');

        if (badge) {
            badge.textContent = count === 1 ? '1 FOTO' : `${count} FOTOS`;
            if (count > 0) {
                badge.className = 'photo-count-badge bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider';
                totalWithPhotos++;
            } else {
                badge.className = 'photo-count-badge bg-zinc-200 dark:bg-zinc-700 text-zinc-500 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider';
            }
        }

        // Update icon color based on photo count
        if (iconContainer) {
            if (count > 0) {
                iconContainer.className = 'w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center';
            } else {
                iconContainer.className = 'w-12 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center';
            }
        }
    }

    // Update progress bar
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    if (progressBar && progressText) {
        const pct = Math.round((totalWithPhotos / CATEGORIES.length) * 100);
        progressBar.style.width = pct + '%';
        progressText.textContent = `Progreso de inspección: ${pct}%`;
    }
}

// ============================================================
// SYNC MANAGER — Send data to Google Apps Script
// ============================================================
const ReportSync = {
    // URL del script de Google Apps Script proporcionada por el usuario
    GAS_URL: "https://script.google.com/macros/s/AKfycbwvzLhEzZhXo7XyIOBTG2LBQsSsNZyxZ1602KJx6ZSmit9xUfC3LBZ8EzH9ColsSyCPJQ/exec",

    async sync() {
        // 1. Gather all data
        const projectData = ProjectData.getData();
        const allPhotos = [];

        for (const cat of CATEGORIES) {
            const photos = await PhotoStorage.getPhotos(cat.id);
            photos.forEach((photo, index) => {
                allPhotos.push({
                    category: cat.name,
                    filename: `${cat.id}_${String(index + 1).padStart(2, '0')}.jpg`,
                    data: photo.data,
                    timestamp: photo.timestamp
                });
            });
        }

        if (allPhotos.length === 0) {
            alert("No hay fotos para guardar.");
            return;
        }

        // 2. Prepare payload
        // Uses 'title' because that's where "Nombre del Proyecto" is stored in the new schema
        const folderName = `${projectData.date || 'SinFecha'} - ${projectData.title || 'Proyecto'} - ${projectData.inspectorName || 'Inspector'}`
            .replace(/[/\\?%*:|"<>]/g, '-'); // Sanitize filename

        const payload = {
            folderName: folderName,
            metadata: projectData,
            photos: allPhotos
        };

        // 3. Send to server
        try {
            const btn = document.getElementById('btn-sync');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> Subiendo...';
            btn.disabled = true;

            // Use text/plain to avoid CORS preflight (Simple Request)
            const response = await fetch(this.GAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(payload)
            });

            // GAS returns a redirect to the actual content, fetch follows it.
            const result = await response.json();

            if (result.status === 'success') {
                alert(`✅ Informe guardado correctamente en Drive.\nCarpeta: ${folderName}\nArchivos: ${result.fileCount}`);
                // Optional: Clear data after success? 
                // ProjectData.clearAll(); 
            } else {
                throw new Error(result.message || 'Error desconocido del script');
            }
        } catch (error) {
            console.error(error);
            alert(`⚠️ El informe se envió, pero hubo un problema leyendo la respuesta.\n\nVerifica tu Google Drive.\n\nDetalle: ${error.message}`);
        } finally {
            const btn = document.getElementById('btn-sync');
            if (btn) {
                btn.innerHTML = '<span class="material-symbols-outlined">cloud_upload</span> Guardar y Finalizar';
                btn.disabled = false;
            }
        }
    }
};
