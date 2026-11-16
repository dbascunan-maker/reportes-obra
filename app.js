/**
 * App.js — Lógica compartida para la App de Informes Fotográficos
 * Sustentambiente Energía Solar
 * v2.6 - Subida secuencial anti-timeout iOS + Construcción DOM segura
 */
console.log("App.js v2.6 loaded");

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
    { id: "transformador", name: "Transformador", folder: "detalle__transformador", icon: "more_horiz" }
];

// ============================================================
// PHOTO STORAGE — IndexedDB persistence
// ============================================================
const PhotoStorage = {
    DB_NAME: "PhotoAppDB",
    DB_VERSION: 1,
    STORE_NAME: "photos",
    _db: null,

    async init() {
        if (this._db) return this._db;
        return new Promise((resolve, reject) => {
            try {
                const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    this._db = request.result;
                    resolve(this._db);
                };
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                        db.createObjectStore(this.STORE_NAME, { keyPath: "id" });
                    }
                };
            } catch (err) {
                reject(err);
            }
        });
    },

    async _getStore(mode = "readonly") {
        const db = await this.init();
        return db.transaction(this.STORE_NAME, mode).objectStore(this.STORE_NAME);
    },

    async getPhotos(categoryId) {
        try {
            const store = await this._getStore();
            return new Promise((resolve) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    const allPhotos = request.result || [];
                    resolve(allPhotos.filter(p => p.categoryId === categoryId));
                };
                request.onerror = () => resolve([]);
            });
        } catch (e) {
            console.error("Error reading photos:", e);
            return [];
        }
    },

    async addPhoto(categoryId, photoData, caption = "") {
        const photos = await this.getPhotos(categoryId);
        const photo = {
            id: Date.now() + "_" + Math.random().toString(36).substr(2, 9),
            categoryId: categoryId,
            data: photoData,
            caption: caption,
            timestamp: new Date().toISOString(),
            filename: "IMG_" + String(photos.length + 1).padStart(3, "0") + ".JPG"
        };

        try {
            const store = await this._getStore("readwrite");
            return new Promise((resolve, reject) => {
                const request = store.add(photo);
                request.onsuccess = () => resolve(photo);
                request.onerror = () => {
                    alert("No se pudo guardar la foto en el dispositivo.");
                    reject(request.error);
                };
            });
        } catch (e) {
            console.error("Storage error:", e);
            alert("Error de almacenamiento: " + e.message);
            throw e;
        }
    },

    async updatePhotoCaption(photoId, newCaption) {
        try {
            const store = await this._getStore("readwrite");
            return new Promise((resolve, reject) => {
                const getReq = store.get(photoId);
                getReq.onsuccess = () => {
                    const photo = getReq.result;
                    if (!photo) return resolve();
                    photo.caption = newCaption;
                    const putReq = store.put(photo);
                    putReq.onsuccess = () => resolve(photo);
                    putReq.onerror = () => reject(putReq.error);
                };
                getReq.onerror = () => reject(getReq.error);
            });
        } catch (e) {
            console.error("Error updating caption:", e);
        }
    },

    async deletePhoto(categoryId, photoId) {
        try {
            const store = await this._getStore("readwrite");
            return new Promise((resolve) => {
                const request = store.delete(photoId);
                request.onsuccess = () => resolve();
                request.onerror = () => resolve();
            });
        } catch (e) {
            console.error("Delete error:", e);
        }
    },

    async getPhotoCount(categoryId) {
        const photos = await this.getPhotos(categoryId);
        return photos.length;
    },

    async migrateFromLocalStorage() {
        try {
            const migratedKey = "migration_done";
            if (localStorage.getItem(migratedKey)) return;

            for (const cat of CATEGORIES) {
                const key = "photos_" + cat.id;
                const data = localStorage.getItem(key);
                if (data) {
                    const photos = JSON.parse(data);
                    for (const p of photos) {
                        await this.addPhoto(cat.id, p.data, p.caption || "");
                    }
                    localStorage.removeItem(key);
                }
            }
            localStorage.setItem(migratedKey, "true");
        } catch (e) {
            console.error("Migration error:", e);
        }
    }
};

// ============================================================
// PROJECT DATA STORAGE — localStorage + Diagnóstico iOS
// ============================================================
const ProjectData = {
    _key: "project_data",
    _memoryFallback: null,

    checkStorageAvailable() {
        try {
            localStorage.setItem("__sa_test", "1");
            localStorage.removeItem("__sa_test");
            return true;
        } catch (e) {
            alert("Safari está bloqueando el guardado de datos. Asegúrate de no estar en Navegación Privada.");
            return false;
        }
    },

    getData() {
        const defaults = {
            title: "Nombre de la Obra",
            subtitle: "Instalación Fotovoltaica",
            date: new Date().toISOString().split("T")[0],
            inspectorName: "",
            inspectorRole: "",
            clientName: "",
            clientNumber: "",
            coordinates: ""
        };
        try {
            const raw = localStorage.getItem(this._key);
            if (raw) {
                return Object.assign({}, defaults, JSON.parse(raw));
            }
            return this._memoryFallback ? Object.assign({}, defaults, this._memoryFallback) : defaults;
        } catch (e) {
            console.error("Error reading project data:", e);
            return this._memoryFallback ? Object.assign({}, defaults, this._memoryFallback) : defaults;
        }
    },

    saveData(data) {
        const current = this.getData();
        const newData = Object.assign({}, current, data);
        this._memoryFallback = newData;
        try {
            localStorage.setItem(this._key, JSON.stringify(newData));
            return true;
        } catch (e) {
            console.error("Error saving project data:", e);
            alert("No se pudieron guardar los datos en Safari: " + e.message);
            return false;
        }
    },

    async clearAll() {
        if (confirm("¿Estás seguro de BORRAR TODO? Se eliminarán todas las fotos y los datos del proyecto actual.")) {
            try {
                const db = await PhotoStorage.init();
                if (db) {
                    const tx = db.transaction(PhotoStorage.STORE_NAME, "readwrite");
                    tx.objectStore(PhotoStorage.STORE_NAME).clear();
                    await new Promise((resolve) => { tx.oncomplete = resolve; });
                }

                localStorage.removeItem(this._key);
                localStorage.removeItem("migration_done");
                this._memoryFallback = null;

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
// CONVERSIÓN AUTOMÁTICA A CONTROLES TÁCTILES NATIVOS PARA iOS
// ============================================================
function upgradeButtonsForIOS() {
    const actionButtons = document.querySelectorAll('button[onclick*="openCamera"], button[onclick*="openGallery"]');
    actionButtons.forEach((btn) => {
        const onclickAttr = btn.getAttribute("onclick") || "";
        const isCamera = onclickAttr.includes("openCamera");
        const match = onclickAttr.match(/['"]([^'"]+)['"]/);
        const categoryId = match ? match[1] : (typeof CATEGORY_ID !== "undefined" ? CATEGORY_ID : "");

        if (!categoryId) return;

        const wrapper = document.createElement("div");
        wrapper.className = btn.className;
        wrapper.style.position = "relative";
        wrapper.style.overflow = "hidden";
        wrapper.style.cursor = "pointer";
        wrapper.innerHTML = btn.innerHTML;

        const input = document.createElement("input");
        input.type = "file";
        input.setAttribute("accept", "image/*");
        if (isCamera) {
            input.setAttribute("capture", "environment");
        } else {
            input.multiple = true;
        }
        input.style.position = "absolute";
        input.style.top = "0";
        input.style.left = "0";
        input.style.width = "100%";
        input.style.height = "100%";
        input.style.opacity = "0";
        input.style.zIndex = "30";
        input.style.cursor = "pointer";

        input.addEventListener("change", (e) => {
            const files = Array.from(e.target.files || []);
            if (files.length === 0) return;

            files.forEach((file) => {
                compressAndStore(file, categoryId, async (photo) => {
                    if (typeof onPhotoAdded === "function") {
                        await onPhotoAdded(photo);
                    } else {
                        await renderPhotoGrid(categoryId, "photo-grid", "empty-state");
                        await updatePhotoCountBadge(categoryId);
                    }
                });
            });
            input.value = "";
        });

        wrapper.appendChild(input);
        btn.parentNode.replaceChild(wrapper, btn);
    });
}

document.addEventListener("DOMContentLoaded", upgradeButtonsForIOS);

function openCamera(categoryId, onPhotoAdded) {
    const input = document.createElement("input");
    input.type = "file";
    input.setAttribute("accept", "image/*");
    input.setAttribute("capture", "environment");
    input.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) compressAndStore(file, categoryId, onPhotoAdded);
    };
    input.click();
}

function openGallery(categoryId, onPhotoAdded) {
    const input = document.createElement("input");
    input.type = "file";
    input.setAttribute("accept", "image/*");
    input.multiple = true;
    input.onchange = (e) => {
        Array.from(e.target.files || []).forEach(file => compressAndStore(file, categoryId, onPhotoAdded));
    };
    input.click();
}

async function compressAndStore(file, categoryId, onPhotoAdded) {
    const reader = new FileReader();
    reader.onerror = () => alert("Error al leer la imagen seleccionada.");
    reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => alert("Formato de imagen no compatible.");
        img.onload = async () => {
            const canvas = document.createElement("canvas");
            const MAX_W = 800;
            let w = img.width;
            let h = img.height;
            if (w > MAX_W) {
                h = (h * MAX_W) / w;
                w = MAX_W;
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, w, h);
            const compressed = canvas.toDataURL("image/jpeg", 0.7);

            try {
                const photo = await PhotoStorage.addPhoto(categoryId, compressed);
                if (onPhotoAdded) await onPhotoAdded(photo);
            } catch (error) {
                console.error("Failed to add photo:", error);
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// ============================================================
// PHOTO GRID RENDERER — Construcción DOM limpia y segura
// ============================================================
async function renderPhotoGrid(categoryId, gridContainerId, emptyStateId) {
    const photos = await PhotoStorage.getPhotos(categoryId);
    const grid = document.getElementById(gridContainerId);
    const emptyState = document.getElementById(emptyStateId);

    if (!grid) return;

    if (photos.length === 0) {
        grid.style.display = "none";
        if (emptyState) emptyState.style.display = "";
        return;
    }

    if (emptyState) emptyState.style.display = "none";
    grid.className = "grid grid-cols-2 gap-3";
    grid.style.display = "";
    grid.innerHTML = "";

    photos.forEach((photo) => {
        const card = document.createElement("div");
        card.className = "bg-white dark:bg-zinc-900 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col";
        card.id = "photo-" + photo.id;

        const imgBox = document.createElement("div");
        imgBox.className = "aspect-square bg-gray-200 relative group";

        const img = document.createElement("img");
        img.src = photo.data;
        img.alt = photo.filename;
        img.className = "object-cover w-full h-full";

        const checkBadge = document.createElement("div");
        checkBadge.className = "absolute top-1.5 right-1.5 bg-green-500 rounded-full p-0.5 shadow-md";
        checkBadge.innerHTML = '<span class="material-symbols-outlined text-[12px] text-white font-bold">check</span>';

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "absolute top-1.5 left-1.5 bg-red-500/90 text-white rounded-full p-1 shadow-md";
        delBtn.innerHTML = '<span class="material-symbols-outlined text-[14px]">delete</span>';
        delBtn.addEventListener("click", () => handleDeletePhoto(categoryId, photo.id));

        const infoBar = document.createElement("div");
        infoBar.className = "absolute bottom-0 left-0 right-0 bg-black/55 text-white text-[10px] px-2 py-1 flex justify-between";
        const timeStr = new Date(photo.timestamp).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
        infoBar.innerHTML = "<span>" + photo.filename + "</span><span>" + timeStr + "</span>";

        imgBox.appendChild(img);
        imgBox.appendChild(checkBadge);
        imgBox.appendChild(delBtn);
        imgBox.appendChild(infoBar);

        const captionBox = document.createElement("div");
        captionBox.className = "p-1.5 bg-zinc-50 dark:bg-zinc-800/80 border-t border-zinc-200 dark:border-zinc-700";

        const captionInput = document.createElement("input");
        captionInput.type = "text";
        captionInput.value = photo.caption || "";
        captionInput.placeholder = "Pie de foto (opcional)...";
        captionInput.className = "w-full text-xs bg-white dark:bg-zinc-900 text-[#1c130d] dark:text-zinc-100 rounded border border-zinc-300 dark:border-zinc-700 px-2 py-1.5 focus:ring-1 focus:ring-primary focus:border-primary";
        captionInput.addEventListener("change", () => handleUpdateCaption(photo.id, captionInput.value));
        captionInput.addEventListener("blur", () => handleUpdateCaption(photo.id, captionInput.value));

        captionBox.appendChild(captionInput);
        card.appendChild(imgBox);
        card.appendChild(captionBox);
        grid.appendChild(card);
    });
}

async function handleUpdateCaption(photoId, newCaption) {
    await PhotoStorage.updatePhotoCaption(photoId, newCaption.trim());
}

async function handleDeletePhoto(categoryId, photoId) {
    if (confirm("¿Eliminar esta foto?")) {
        await PhotoStorage.deletePhoto(categoryId, photoId);
        await renderPhotoGrid(categoryId, "photo-grid", "empty-state");
        await updatePhotoCountBadge(categoryId);
    }
}

async function updatePhotoCountBadge(categoryId) {
    const count = await PhotoStorage.getPhotoCount(categoryId);
    const badge = document.getElementById("photo-count-badge");
    if (badge) {
        badge.textContent = count === 1 ? "1 FOTO" : count + " FOTOS";
        if (count > 0) {
            badge.className = "bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider";
        } else {
            badge.className = "bg-zinc-200 dark:bg-zinc-700 text-zinc-500 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider";
        }
    }
}

// ============================================================
// LISTADO — Dynamic photo count updater
// ============================================================
async function updateListadoCounts() {
    const items = document.querySelectorAll("[data-category-id]");
    if (items.length === 0) return;

    await PhotoStorage.migrateFromLocalStorage();

    let totalWithPhotos = 0;

    for (const item of items) {
        const catId = item.getAttribute("data-category-id");
        const count = await PhotoStorage.getPhotoCount(catId);
        const badge = item.querySelector(".photo-count-badge");
        const iconContainer = item.querySelector(".category-icon");

        if (badge) {
            badge.textContent = count === 1 ? "1 FOTO" : count + " FOTOS";
            if (count > 0) {
                badge.className = "photo-count-badge bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider";
                totalWithPhotos++;
            } else {
                badge.className = "photo-count-badge bg-zinc-200 dark:bg-zinc-700 text-zinc-500 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider";
            }
        }

        if (iconContainer) {
            if (count > 0) {
                iconContainer.className = "w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center";
            } else {
                iconContainer.className = "w-12 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center";
            }
        }
    }

    const progressBar = document.getElementById("progress-bar");
    const progressText = document.getElementById("progress-text");
    if (progressBar && progressText) {
        const pct = Math.round((totalWithPhotos / CATEGORIES.length) * 100);
        progressBar.style.width = pct + "%";
        progressText.textContent = "Progreso de inspección: " + pct + "%";
    }
}

// ============================================================
// SYNC MANAGER — Subida secuencial (1 foto por petición) + PDF
// ============================================================
const ReportSync = {
    GAS_URL: "https://script.google.com/macros/s/AKfycbwvzLhEzZhXo7XyIOBTG2LBQsSsNZyxZ1602KJx6ZSmit9xUfC3LBZ8EzH9ColsSyCPJQ/exec",

    async postStep(bodyObj) {
        const response = await fetch(this.GAS_URL, {
            method: "POST",
            redirect: "follow",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(bodyObj)
        });
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            throw new Error("Respuesta inválida del servidor Google. Verifica los permisos del script.");
        }
    },

    async sync() {
        const projectData = ProjectData.getData();
        const allPhotos = [];

        for (const cat of CATEGORIES) {
            const photos = await PhotoStorage.getPhotos(cat.id);
            photos.forEach((photo, index) => {
                allPhotos.push({
                    category: cat.name,
                    filename: cat.id + "_" + String(index + 1).padStart(2, "0") + ".jpg",
                    data: photo.data,
                    caption: photo.caption || "",
                    timestamp: photo.timestamp
                });
            });
        }

        if (allPhotos.length === 0) {
            alert("No hay fotos registradas para generar el informe.");
            return;
        }

        const rawFolder = (projectData.date || "SinFecha") + " - " + (projectData.title || "Proyecto") + " - " + (projectData.inspectorName || "Inspector");
        const folderName = rawFolder.replace(/[/\\?%*:|"<>]/g, "-");
        const btn = document.getElementById("btn-sync");

        try {
            if (btn) btn.disabled = true;

            // PASO 1: Crear carpeta en Google Drive
            if (btn) btn.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> Creando carpeta en Drive...';
            const initRes = await this.postStep({
                action: "init",
                folderName: folderName,
                metadata: projectData
            });

            if (initRes.status !== "success") {
                throw new Error(initRes.message || "Error al crear carpeta en Drive");
            }

            const folderId = initRes.folderId;
            const photoRefs = [];

            // PASO 2: Subir las fotografías una por una
            for (let i = 0; i < allPhotos.length; i++) {
                const p = allPhotos[i];
                if (btn) {
                    btn.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> Subiendo foto ' + (i + 1) + ' de ' + allPhotos.length + '...';
                }

                const upRes = await this.postStep({
                    action: "uploadPhoto",
                    folderId: folderId,
                    category: p.category,
                    filename: p.filename,
                    caption: p.caption,
                    data: p.data
                });

                if (upRes.status !== "success") {
                    throw new Error("Error subiendo " + p.filename + ": " + (upRes.message || ""));
                }

                photoRefs.push({
                    fileId: upRes.fileId,
                    category: p.category,
                    filename: p.filename,
                    caption: p.caption
                });
            }

            // PASO 3: Compilar el PDF corporativo
            if (btn) btn.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> Generando informe PDF...';
            const pdfRes = await this.postStep({
                action: "buildPdf",
                folderId: folderId,
                folderName: folderName,
                metadata: projectData,
                photoRefs: photoRefs
            });

            if (pdfRes.status === "success") {
                alert("¡Informe PDF generado con éxito en el Drive corporativo!\n\nCarpeta: " + folderName);
                if (pdfRes.pdfUrl) {
                    window.open(pdfRes.pdfUrl, "_blank");
                }
            } else {
                throw new Error(pdfRes.message || "Error al compilar PDF");
            }
        } catch (error) {
            console.error(error);
            alert("Ocurrió un error al procesar el informe.\n\nDetalle: " + error.message);
        } finally {
            if (btn) {
                btn.innerHTML = '<span class="material-symbols-outlined">cloud_upload</span> Guardar y Finalizar';
                btn.disabled = false;
            }
        }
    }
};
