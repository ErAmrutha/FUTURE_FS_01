// ======================================
// CIVICFIX - SMART CIVIC MANAGEMENT
// ======================================

// STORAGE
let complaints = JSON.parse(localStorage.getItem("complaints")) || [];
let users = JSON.parse(localStorage.getItem("civicUsers")) || [];
let currentUser = JSON.parse(sessionStorage.getItem("currentUser")) || null;

let authMode = "login";

// DEMO MANAGEMENT ACCOUNT
const ADMIN_EMAIL = "admin@civicfix.com";
const ADMIN_PASSWORD = "CivicFix@123";

// Save complaints
function saveComplaints() {
    localStorage.setItem("complaints", JSON.stringify(complaints));
}

// Escape user input
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// Generate unique ID
function generateID() {
    let id;

    do {
        id = "CF" + Math.floor(100000 + Math.random() * 900000);
    } while (complaints.some(item => item.id === id));

    return id;
}

// ======================================
// COMPLAINT SUBMISSION
// ======================================

document.getElementById("complaintForm").addEventListener("submit", function(event) {

    event.preventDefault();

    const photoInput = document.getElementById("photo");
    const file = photoInput.files[0];

    if (file && file.size > 1024 * 1024) {
        alert("Please upload an image smaller than 1 MB.");
        return;
    }

    const saveComplaint = (photoData = "") => {

        const complaint = {
            id: generateID(),
            name: document.getElementById("name").value.trim(),
            category: document.getElementById("category").value,
            location: document.getElementById("location").value.trim(),
            description: document.getElementById("description").value.trim(),
            photo: photoData,
            status: "Pending",
            date: new Date().toLocaleDateString()
        };

        complaints.push(complaint);

        try {
            saveComplaints();
        } catch (error) {
            complaints.pop();
            alert("Storage is full. Please submit without a photograph.");
            return;
        }

        document.getElementById("confirmation").innerHTML = `
            <div class="complaint-card">
                <h3>Complaint Submitted Successfully!</h3>
                <p>Your Complaint ID:</p>
                <h2>${escapeHTML(complaint.id)}</h2>
                <p>Please save this ID to track your complaint.</p>
            </div>
        `;

        this.reset();
        document.getElementById("photoPreview").innerHTML = "";

        displayComplaints();
        updateStatistics();
    };

    if (file) {
        const reader = new FileReader();

        reader.onload = () => saveComplaint(reader.result);
        reader.onerror = () => alert("Unable to read the uploaded image.");

        reader.readAsDataURL(file);
    } else {
        saveComplaint();
    }
});

// ======================================
// PHOTO PREVIEW
// ======================================

document.getElementById("photo").addEventListener("change", function() {

    const preview = document.getElementById("photoPreview");
    preview.innerHTML = "";

    const file = this.files[0];

    if (file) {

        if (file.size > 1024 * 1024) {
            alert("Please select an image smaller than 1 MB.");
            this.value = "";
            return;
        }

        if (!file.type.startsWith("image/")) {
            alert("Please select an image file.");
            this.value = "";
            return;
        }

        const reader = new FileReader();

        reader.onload = function() {
            const image = document.createElement("img");
            image.src = reader.result;
            image.alt = "Complaint photograph";
            image.style.maxWidth = "150px";
            image.style.marginTop = "12px";
            image.style.borderRadius = "8px";

            preview.appendChild(image);
        };

        reader.readAsDataURL(file);
    }
});

// ======================================
// COMPLAINT TRACKING
// ======================================

document.getElementById("trackBtn").addEventListener("click", trackComplaint);

document.getElementById("trackingId").addEventListener("keydown", function(event) {
    if (event.key === "Enter") trackComplaint();
});

function trackComplaint() {

    const id = document.getElementById("trackingId").value.trim().toUpperCase();
    const result = document.getElementById("trackingResult");

    if (!id) {
        result.textContent = "Please enter a complaint ID.";
        return;
    }

    const complaint = complaints.find(item =>
        item.id.toUpperCase() === id
    );

    if (!complaint) {
        result.textContent = "No complaint found. Please check your ID.";
        return;
    }

    result.innerHTML = `
        <div class="complaint-card">
            <h3>Complaint Details</h3>
            <p><strong>ID:</strong> ${escapeHTML(complaint.id)}</p>
            <p><strong>Category:</strong> ${escapeHTML(complaint.category)}</p>
            <p><strong>Location:</strong> ${escapeHTML(complaint.location)}</p>
            <p><strong>Date:</strong> ${escapeHTML(complaint.date)}</p>
            <p><strong>Status:</strong>
                <span class="status ${statusClass(complaint.status)}">
                    ${escapeHTML(complaint.status)}
                </span>
            </p>
        </div>
    `;
}

// ======================================
// STATUS MANAGEMENT
// ======================================

function statusClass(status) {
    if (status === "Resolved") return "resolved";
    if (status === "In Progress") return "progress";
    return "pending";
}

function updateStatus(id, newStatus) {

    // Only management can update statuses
    if (!currentUser || currentUser.role !== "management") {
        alert("Access denied. Only management can update complaint statuses.");
        return;
    }

    const allowedStatuses = ["Pending", "In Progress", "Resolved"];

    if (!allowedStatuses.includes(newStatus)) return;

    const complaint = complaints.find(item => item.id === id);

    if (complaint) {

        complaint.status = newStatus;

        saveComplaints();
        displayComplaints();
        updateStatistics();

        const trackingId = document.getElementById("trackingId").value.trim();

        if (trackingId.toUpperCase() === id.toUpperCase()) {
            trackComplaint();
        }
    }
}

// ======================================
// DASHBOARD DISPLAY
// ======================================

function displayComplaints() {

    const list = document.getElementById("complaintList");

    const search = document.getElementById("searchInput").value.toLowerCase();
    const categoryFilter = document.getElementById("filterCategory").value;
    const statusFilter = document.getElementById("filterStatus").value;

    const filtered = complaints.filter(item => {

        const matchesSearch =
            item.id.toLowerCase().includes(search) ||
            item.location.toLowerCase().includes(search);

        const matchesCategory =
            !categoryFilter || item.category === categoryFilter;

        const matchesStatus =
            !statusFilter || item.status === statusFilter;

        return matchesSearch && matchesCategory && matchesStatus;
    });

    if (filtered.length === 0) {
        list.innerHTML = "<p>No matching complaints found.</p>";
        return;
    }

    list.innerHTML = filtered.map(item => `

        <div class="complaint-card">

            <h3>${escapeHTML(item.category)}</h3>

            <p><strong>Complaint ID:</strong> ${escapeHTML(item.id)}</p>
            <p><strong>Citizen:</strong> ${escapeHTML(item.name)}</p>
            <p><strong>Location:</strong> ${escapeHTML(item.location)}</p>
            <p><strong>Description:</strong> ${escapeHTML(item.description)}</p>
            <p><strong>Date:</strong> ${escapeHTML(item.date)}</p>

            ${item.photo ? `
                <img src="${item.photo}"
                alt="Complaint photograph"
                style="max-width:120px; border-radius:8px; margin-top:10px;">
            ` : ""}

            <p>
                <strong>Status:</strong>
                <span class="status ${statusClass(item.status)}">
                    ${escapeHTML(item.status)}
                </span>
            </p>

            ${currentUser && currentUser.role === "management" ? `

                <label>Update Complaint Status</label>

                <select onchange="updateStatus('${item.id}', this.value)">

                    <option value="Pending" ${item.status === "Pending" ? "selected" : ""}>
                        Pending
                    </option>

                    <option value="In Progress" ${item.status === "In Progress" ? "selected" : ""}>
                        In Progress
                    </option>

                    <option value="Resolved" ${item.status === "Resolved" ? "selected" : ""}>
                        Resolved
                    </option>

                </select>

            ` : ""}

        </div>

    `).join("");
}

// ======================================
// SEARCH AND FILTER
// ======================================

document.getElementById("searchInput").addEventListener("input", displayComplaints);
document.getElementById("filterCategory").addEventListener("change", displayComplaints);
document.getElementById("filterStatus").addEventListener("change", displayComplaints);

// ======================================
// DASHBOARD STATISTICS
// ======================================

function updateStatistics() {

    document.getElementById("totalCount").textContent = complaints.length;

    document.getElementById("pendingCount").textContent =
        complaints.filter(item => item.status === "Pending").length;

    document.getElementById("progressCount").textContent =
        complaints.filter(item => item.status === "In Progress").length;

    document.getElementById("resolvedCount").textContent =
        complaints.filter(item => item.status === "Resolved").length;
}

// ======================================
// LOGIN AND REGISTRATION
// ======================================

const modal = document.getElementById("authModal");

function openAuth(mode) {

    authMode = mode;

    modal.style.display = "flex";

    document.getElementById("authTitle").textContent =
        mode === "login" ? "Login" : "Citizen Registration";

    document.getElementById("authSubmit").textContent =
        mode === "login" ? "Login" : "Register";

    document.getElementById("authNameGroup").style.display =
        mode === "login" ? "none" : "flex";

    document.getElementById("authMessage").textContent = "";

    document.getElementById("authForm").reset();
}

document.getElementById("loginBtn").addEventListener("click", () => {
    openAuth("login");
});

document.getElementById("registerBtn").addEventListener("click", () => {
    openAuth("register");
});

document.getElementById("closeModal").addEventListener("click", () => {
    modal.style.display = "none";
});

window.addEventListener("click", function(event) {
    if (event.target === modal) modal.style.display = "none";
});

// ======================================
// AUTHENTICATION FORM
// ======================================

document.getElementById("authForm").addEventListener("submit", function(event) {

    event.preventDefault();

    const name = document.getElementById("authName").value.trim();
    const email = document.getElementById("authEmail").value.trim().toLowerCase();
    const password = document.getElementById("authPassword").value;
    const message = document.getElementById("authMessage");

    // MANAGEMENT LOGIN
    if (authMode === "login" &&
        email === ADMIN_EMAIL &&
        password === ADMIN_PASSWORD) {

        currentUser = {
            name: "Management",
            email: ADMIN_EMAIL,
            role: "management"
        };

        sessionStorage.setItem("currentUser", JSON.stringify(currentUser));

        message.textContent = "Management login successful!";

        setTimeout(() => {
            modal.style.display = "none";
            updateAuthButtons();
            displayComplaints();
        }, 800);

        return;
    }

    // CITIZEN REGISTRATION
    if (authMode === "register") {

        if (!name) {
            message.textContent = "Please enter your name.";
            return;
        }

        if (users.some(user => user.email === email)) {
            message.textContent = "An account with this email already exists.";
            return;
        }

        users.push({ name, email, password });

        localStorage.setItem("civicUsers", JSON.stringify(users));

        message.textContent = "Registration successful! Please log in.";

        return;
    }

    // CITIZEN LOGIN
    const user = users.find(user =>
        user.email === email && user.password === password
    );

    if (!user) {
        message.textContent = "Invalid email or password.";
        return;
    }

    currentUser = {
        name: user.name,
        email: user.email,
        role: "citizen"
    };

    sessionStorage.setItem("currentUser", JSON.stringify(currentUser));

    message.textContent = "Welcome, " + user.name + "!";

    setTimeout(() => {
        modal.style.display = "none";
        updateAuthButtons();
        displayComplaints();
    }, 800);
});

// ======================================
// AUTHENTICATION BUTTON DISPLAY
// ======================================

function updateAuthButtons() {

    const loginBtn = document.getElementById("loginBtn");
    const registerBtn = document.getElementById("registerBtn");

    if (currentUser) {

        loginBtn.textContent =
            currentUser.role === "management"
                ? "Management"
                : currentUser.name.split(" ")[0];

        registerBtn.textContent = "Logout";

        loginBtn.disabled = true;
        registerBtn.onclick = logout;

    } else {

        loginBtn.textContent = "Login";
        registerBtn.textContent = "Register";

        loginBtn.disabled = false;

        loginBtn.onclick = () => openAuth("login");
        registerBtn.onclick = () => openAuth("register");
    }
}

function logout() {

    currentUser = null;

    sessionStorage.removeItem("currentUser");

    updateAuthButtons();
    displayComplaints();
}

// ======================================
// INITIALISE APPLICATION
// ======================================

displayComplaints();
updateStatistics();
updateAuthButtons();