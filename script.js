// Global Variables
let currentUser = null;
let currentProject = null;
let selectedUserType = '';
let selectedUserId = null;
let selectedProjectId = null;

// Local Storage Keys
const STORAGE_KEYS = {
    USERS: 'musharaka_users',
    PROJECTS: 'musharaka_projects',
    INVESTMENTS: 'musharaka_investments',
    NOTIFICATIONS: 'musharaka_notifications',
    CURRENT_USER: 'musharaka_current_user'
};

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    checkAuthentication();
    setupEventListeners();
});

function initializeApp() {
    // Initialize default data if not exists
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
        const defaultUsers = [
            {
                id: 'admin_001',
                email: 'admin@musharaka.com',
                password: 'admin123',
                type: 'admin',
                firstName: 'مدير',
                lastName: 'النظام',
                status: 'approved',
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(defaultUsers));
    }

    if (!localStorage.getItem(STORAGE_KEYS.PROJECTS)) {
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify([]));
    }

    if (!localStorage.getItem(STORAGE_KEYS.INVESTMENTS)) {
        localStorage.setItem(STORAGE_KEYS.INVESTMENTS, JSON.stringify([]));
    }

    if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
    }
}

function setupEventListeners() {
    // Investment amount input listener
    const investmentInput = document.getElementById('investmentAmount');
    if (investmentInput) {
        investmentInput.addEventListener('input', function() {
            if (currentProject) {
                calculateReturn();
            }
            
            // Remove previous button selections
            document.querySelectorAll('.amount-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
        });
    }

    // Modal close on outside click
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeModal();
        }
    });
}

function checkAuthentication() {
    const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            
            if (currentUser.type === 'admin') {
                showScreen('adminDashboard');
                loadAdminDashboard();
                showBottomNav();
            } else if (currentUser.status === 'approved') {
                if (currentUser.type === 'investor') {
                    showScreen('investorHome');
                    loadInvestorHome();
                } else if (currentUser.type === 'owner') {
                    showScreen('ownerHome');
                    loadOwnerHome();
                }
                showBottomNav();
            } else {
                showWaitingScreen();
                return;
            }
            
            updateProfile();
            updateNotificationBadge();
        } catch (error) {
            console.error('Error parsing user data:', error);
            logout();
        }
    }
}

function showWaitingScreen() {
    showAlert('warning', 'حسابك في انتظار التوثيق من الإدارة. سيتم إشعارك عند الموافقة على حسابك.');
    showScreen('welcome');
    hideBottomNav();
}

// Screen Management
function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show selected screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        
        // Load data for specific screens
        if (screenId === 'notifications' && currentUser) {
            loadNotifications();
        }
        
        // Update navigation
        updateNavigation(screenId);
    }
}

function updateNavigation(screenId) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const navMapping = {
        'investorHome': 0,
        'ownerHome': 0,
        'adminDashboard': 0,
        'investorDashboard': 1,
        'notifications': 2,
        'profile': 3
    };
    
    const navIndex = navMapping[screenId];
    if (navIndex !== undefined) {
        const navItems = document.querySelectorAll('.nav-item');
        if (navItems[navIndex]) {
            navItems[navIndex].classList.add('active');
        }
    }
}

function showBottomNav() {
    const bottomNav = document.getElementById('bottomNav');
    if (bottomNav) {
        bottomNav.classList.add('visible');
    }
}

function hideBottomNav() {
    const bottomNav = document.getElementById('bottomNav');
    if (bottomNav) {
        bottomNav.classList.remove('visible');
    }
}

function navigateToHome() {
    if (!currentUser) return;
    
    if (currentUser.type === 'admin') {
        showScreen('adminDashboard');
        loadAdminDashboard();
    } else if (currentUser.type === 'investor') {
        showScreen('investorHome');
        loadInvestorHome();
    } else if (currentUser.type === 'owner') {
        showScreen('ownerHome');
        loadOwnerHome();
    }
}

function navigateToDashboard() {
    if (!currentUser) return;
    
    if (currentUser.type === 'admin') {
        showScreen('adminDashboard');
        loadAdminDashboard();
    } else if (currentUser.type === 'investor') {
        showScreen('investorDashboard');
        loadInvestorDashboard();
    } else if (currentUser.type === 'owner') {
        showScreen('ownerHome');
        loadOwnerHome();
    }
}

// User Type Selection
function selectUserType(type) {
    selectedUserType = type;
    
    // Update UI
    document.querySelectorAll('.user-type-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    const selectedOption = document.getElementById(type + 'Type');
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
    
    // Show/hide relevant fields
    const ownerFields = document.getElementById('ownerFields');
    const investorFields = document.getElementById('investorFields');
    
    if (type === 'investor') {
        if (investorFields) investorFields.style.display = 'block';
        if (ownerFields) ownerFields.style.display = 'none';
    } else if (type === 'owner') {
        if (investorFields) investorFields.style.display = 'none';
        if (ownerFields) ownerFields.style.display = 'block';
    }
}

// Registration Handler
function handleRegister(event) {
    event.preventDefault();
    
    if (!selectedUserType) {
        showAlert('error', 'يرجى اختيار نوع الحساب', 'register');
        return;
    }

    const formData = {
        id: generateId(),
        email: document.getElementById('registerEmail').value,
        password: document.getElementById('registerPassword').value,
        type: selectedUserType,
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        phone: document.getElementById('phone').value,
        nationalId: document.getElementById('nationalId').value,
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    // Add type-specific fields
    if (selectedUserType === 'investor') {
        const education = document.getElementById('education');
        const income = document.getElementById('income');
        if (education) formData.education = education.value;
        if (income) formData.income = income.value;
    } else if (selectedUserType === 'owner') {
        const businessType = document.getElementById('businessType');
        const governorate = document.getElementById('governorate');
        if (businessType) formData.businessType = businessType.value;
        if (governorate) formData.governorate = governorate.value;
    }

    // Check if email already exists
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    if (users.find(user => user.email === formData.email)) {
        showAlert('error', 'البريد الإلكتروني موجود بالفعل', 'register');
        return;
    }

    // Save user
    users.push(formData);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    // Add notification for admin
    addNotification({
        type: 'new_user',
        title: 'مستخدم جديد',
        message: `طلب توثيق من ${formData.firstName} ${formData.lastName}`,
        targetUser: 'admin'
    });

    showAlert('success', 'تم إنشاء الحساب بنجاح! سيتم مراجعة حسابك من قبل الإدارة.', 'register');
    
    // Reset form
    event.target.reset();
    selectedUserType = '';
    document.querySelectorAll('.user-type-option').forEach(option => {
        option.classList.remove('selected');
    });
    document.getElementById('ownerFields').style.display = 'none';
    document.getElementById('investorFields').style.display = 'none';
    
    setTimeout(() => {
        showScreen('login');
    }, 2000);
}

// Login Handler
function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
        showAlert('error', 'البريد الإلكتروني أو كلمة المرور غير صحيحة', 'login');
        return;
    }

    currentUser = user;
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    
    if (user.type === 'admin') {
        showScreen('adminDashboard');
        loadAdminDashboard();
        showBottomNav();
    } else if (user.status === 'pending') {
        showAlert('warning', 'حسابك في انتظار التوثيق من الإدارة', 'login');
        return;
    } else if (user.status === 'rejected') {
        showAlert('error', 'تم رفض طلب التوثيق الخاص بك', 'login');
        return;
    } else if (user.status === 'approved') {
        if (user.type === 'investor') {
            showScreen('investorHome');
            loadInvestorHome();
        } else if (user.type === 'owner') {
            showScreen('ownerHome');
            loadOwnerHome();
        }
        showBottomNav();
    }
    
    updateProfile();
    updateNotificationBadge();
    showAlert('success', `مرحباً بك ${user.firstName} ${user.lastName}!`);
    
    // Clear form
    event.target.reset();
}

// Admin Dashboard Functions
function loadAdminDashboard() {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const projects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || '[]');
    
    const pendingUsers = users.filter(u => u.status === 'pending');
    const pendingProjects = projects.filter(p => p.status === 'pending');
    const approvedUsers = users.filter(u => u.status === 'approved' && u.type !== 'admin');
    const rejectedCount = users.filter(u => u.status === 'rejected').length + 
                        projects.filter(p => p.status === 'rejected').length;
    
    // Update stats
    updateElementText('pendingUsersCount', pendingUsers.length);
    updateElementText('pendingProjectsCount', pendingProjects.length);
    updateElementText('approvedUsersCount', approvedUsers.length);
    updateElementText('rejectedCount', rejectedCount);
    
    loadPendingUsers(pendingUsers);
    loadPendingProjects(pendingProjects);
}

function loadPendingUsers(users) {
    const container = document.getElementById('pendingUsersList');
    if (!container) return;
    
    if (users.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">لا توجد طلبات توثيق في الانتظار</p>';
        return;
    }
    
    container.innerHTML = users.map(user => `
        <div class="pending-item">
            <div class="pending-info">
                <div class="pending-name">${user.firstName} ${user.lastName}</div>
                <div class="pending-type">
                    <i class="fas fa-${user.type === 'investor' ? 'chart-line' : 'briefcase'}"></i>
                    ${user.type === 'investor' ? 'مستثمر' : 'صاحب مشروع'}
                </div>
            </div>
            <div class="pending-actions">
                <button type="button" class="btn btn-small" onclick="viewUserDetails('${user.id}')">
                    <i class="fas fa-eye"></i>
                    عرض
                </button>
            </div>
        </div>
    `).join('');
}

function loadPendingProjects(projects) {
    const container = document.getElementById('pendingProjectsList');
    if (!container) return;
    
    if (projects.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">لا توجد مشاريع في انتظار المراجعة</p>';
        return;
    }
    
    container.innerHTML = projects.map(project => `
        <div class="pending-item">
            <div class="pending-info">
                <div class="pending-name">${project.name}</div>
                <div class="pending-type">
                    <i class="fas fa-${getProjectIcon(project.type)}"></i>
                    ${getProjectTypeArabic(project.type)}
                </div>
            </div>
            <div class="pending-actions">
                <button type="button" class="btn btn-small" onclick="viewProjectDetails('${project.id}')">
                    <i class="fas fa-eye"></i>
                    عرض
                </button>
            </div>
        </div>
    `).join('');
}

function viewUserDetails(userId) {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    selectedUserId = userId;
    
    const content = `
        <div style="text-align: right;">
            <p><strong>الاسم:</strong> ${user.firstName} ${user.lastName}</p>
            <p><strong>البريد الإلكتروني:</strong> ${user.email}</p>
            <p><strong>رقم الهاتف:</strong> ${user.phone}</p>
            <p><strong>الرقم القومي:</strong> ${user.nationalId}</p>
            <p><strong>نوع الحساب:</strong> ${user.type === 'investor' ? 'مستثمر' : 'صاحب مشروع'}</p>
            ${user.type === 'investor' ? 
                `<p><strong>المستوى التعليمي:</strong> ${getEducationArabic(user.education)}</p>
                 <p><strong>الدخل الشهري:</strong> ${getIncomeArabic(user.income)}</p>` :
                `<p><strong>نوع النشاط:</strong> ${getProjectTypeArabic(user.businessType)}</p>
                 <p><strong>المحافظة:</strong> ${getGovernorateArabic(user.governorate)}</p>`
            }
            <p><strong>تاريخ التسجيل:</strong> ${new Date(user.createdAt).toLocaleDateString('ar-EG')}</p>
        </div>
    `;
    
    const contentElement = document.getElementById('userDetailsContent');
    if (contentElement) {
        contentElement.innerHTML = content;
    }
    
    const modal = document.getElementById('userDetailsModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function viewProjectDetails(projectId) {
    const projects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || '[]');
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    selectedProjectId = projectId;
    
    const content = `
        <div style="text-align: right;">
            <p><strong>اسم المشروع:</strong> ${project.name}</p>
            <p><strong>نوع المشروع:</strong> ${getProjectTypeArabic(project.type)}</p>
            <p><strong>الوصف:</strong></p>
            <p style="background: #f8f9fa; padding: 10px; border-radius: 8px; margin: 10px 0;">${project.description}</p>
            <p><strong>المبلغ المطلوب:</strong> ${project.targetAmount.toLocaleString()} جنيه</p>
            <p><strong>العائد المتوقع:</strong> ${project.expectedReturn}%</p>
            <p><strong>مدة المشروع:</strong> ${project.duration} شهر</p>
            <p><strong>الموقع:</strong> ${project.location}</p>
            <p><strong>تاريخ الإنشاء:</strong> ${new Date(project.createdAt).toLocaleDateString('ar-EG')}</p>
        </div>
    `;
    
    const contentElement = document.getElementById('projectDetailsContent');
    if (contentElement) {
        contentElement.innerHTML = content;
    }
    
    const modal = document.getElementById('projectDetailsModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function approveUser() {
    if (!selectedUserId) return;
    
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const userIndex = users.findIndex(u => u.id === selectedUserId);
    if (userIndex === -1) return;
    
    users[userIndex].status = 'approved';
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    
    // Add notification for user
    addNotification({
        type: 'account_approved',
        title: 'تم توثيق حسابك',
        message: 'تم الموافقة على طلب التوثيق الخاص بك. يمكنك الآن استخدام جميع المميزات',
        targetUser: selectedUserId
    });
    
    closeModal();
    loadAdminDashboard();
    showSuccessModal('تم توثيق المستخدم بنجاح');
}

function rejectUser() {
    if (!selectedUserId) return;
    
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const userIndex = users.findIndex(u => u.id === selectedUserId);
    if (userIndex === -1) return;
    
    users[userIndex].status = 'rejected';
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    
    // Add notification for user
    addNotification({
        type: 'account_rejected',
        title: 'تم رفض طلب التوثيق',
        message: 'تم رفض طلب التوثيق الخاص بك. يمكنك التواصل مع الإدارة لمعرفة الأسباب',
        targetUser: selectedUserId
    });
    
    closeModal();
    loadAdminDashboard();
    showSuccessModal('تم رفض طلب التوثيق');
}

function approveProject() {
    if (!selectedProjectId) return;
    
    const projects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || '[]');
    const projectIndex = projects.findIndex(p => p.id === selectedProjectId);
    if (projectIndex === -1) return;
    
    projects[projectIndex].status = 'approved';
    projects[projectIndex].currentAmount = 0;
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    
    // Add notification for project owner
    addNotification({
        type: 'project_approved',
        title: 'تم قبول مشروعك',
        message: `تم الموافقة على مشروع ${projects[projectIndex].name} ونشره للمستثمرين`,
        targetUser: projects[projectIndex].ownerId
    });
    
    closeModal();
    loadAdminDashboard();
    showSuccessModal('تم قبول المشروع ونشره');
}

function rejectProject() {
    if (!selectedProjectId) return;
    
    const projects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || '[]');
    const projectIndex = projects.findIndex(p => p.id === selectedProjectId);
    if (projectIndex === -1) return;
    
    projects[projectIndex].status = 'rejected';
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    
    // Add notification for project owner
    addNotification({
        type: 'project_rejected',
        title: 'تم رفض مشروعك',
        message: `تم رفض مشروع ${projects[projectIndex].name}. يمكنك تعديله وإعادة إرساله`,
        targetUser: projects[projectIndex].ownerId
    });
    
    closeModal();
    loadAdminDashboard();
    showSuccessModal('تم رفض المشروع');
}

// Owner Functions
function loadOwnerHome() {
    const ownerNameElement = document.getElementById('ownerName');
    if (ownerNameElement && currentUser) {
        ownerNameElement.textContent = currentUser.firstName;
    }
    
    const projects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || '[]');
    const userProjects = projects.filter(p => p.ownerId === currentUser.id);
    
    const container = document.getElementById('ownerProjects');
    if (!container) return;
    
    if (userProjects.length === 0) {
        container.innerHTML = `
            <div class="card">
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-plus-circle" style="font-size: 60px; color: #00796B; margin-bottom: 15px;"></i>
                    <h3 style="color: #00796B; margin-bottom: 10px;">لا توجد مشاريع</h3>
                    <p style="color: #666; margin-bottom: 20px;">أضف مشروعك الأول وابدأ في جمع التمويل</p>
                    <button type="button" class="btn" onclick="showScreen('addProject')">
                        <i class="fas fa-plus"></i>
                        إضافة مشروع جديد
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = userProjects.map(project => createProjectCard(project, true)).join('');
}

function handleAddProject(event) {
    event.preventDefault();
    
    const formData = {
        id: generateId(),
        name: document.getElementById('projectName').value,
        description: document.getElementById('projectDescription').value,
        targetAmount: parseInt(document.getElementById('targetAmount').value),
        expectedReturn: parseInt(document.getElementById('expectedReturn').value),
        duration: parseInt(document.getElementById('projectDuration').value),
        type: document.getElementById('projectType').value,
        location: document.getElementById('projectLocation').value,
        ownerId: currentUser.id,
        status: 'pending',
        currentAmount: 0,
        createdAt: new Date().toISOString()
    };
    
    const projects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || '[]');
    projects.push(formData);
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    
    // Add notification for admin
    addNotification({
        type: 'new_project',
        title: 'مشروع جديد',
        message: `مشروع جديد للمراجعة: ${formData.name}`,
        targetUser: 'admin'
    });
    
    showAlert('success', 'تم إرسال مشروعك للمراجعة بنجاح!', 'addProject');
    
    // Clear form
    event.target.reset();
    
    setTimeout(() => {
        goToOwnerHome();
    }, 2000);
}

function goToOwnerHome() {
    showScreen('ownerHome');
    loadOwnerHome();
}

// Investor Functions
function loadInvestorHome() {
    const investorNameElement = document.getElementById('investorName');
    if (investorNameElement && currentUser) {
        investorNameElement.textContent = currentUser.firstName;
    }
    
    const projects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || '[]');
    const approvedProjects = projects.filter(p => p.status === 'approved');
    
    const container = document.getElementById('investorProjects');
    if (!container) return;
    
    if (approvedProjects.length === 0) {
        container.innerHTML = `
            <div class="card">
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-search" style="font-size: 60px; color: #00796B; margin-bottom: 15px;"></i>
                    <h3 style="color: #00796B; margin-bottom: 10px;">لا توجد مشاريع متاحة</h3>
                    <p style="color: #666;">لا توجد مشاريع متاحة للاستثمار حالياً</p>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = approvedProjects.map(project => createProjectCard(project, false)).join('');
}

function createProjectCard(project, isOwner = false) {
    const progress = project.targetAmount > 0 ? Math.round((project.currentAmount / project.targetAmount) * 100) : 0;
    const projectIcon = getProjectIcon(project.type);
    
    return `
        <div class="project-card card">
            ${project.status === 'pending' ? '<div class="project-status status-pending">في انتظار المراجعة</div>' : ''}
            ${project.status === 'rejected' ? '<div class="project-status status-rejected">مرفوض</div>' : ''}
            ${project.status === 'approved' ? '<div class="project-status status-approved">منشور</div>' : ''}
            
            <div class="project-image" style="background: ${getProjectGradient(project.type)};">
                <i class="fas fa-${projectIcon}"></i>
                ${!isOwner && project.status === 'approved' ? '<div class="project-badge"><i class="fas fa-star"></i> متاح</div>' : ''}
            </div>
            
            <div class="project-title">
                <i class="fas fa-${projectIcon}"></i>
                ${project.name}
            </div>
            
            <div class="project-description">${project.description}</div>
            
            ${project.status === 'approved' ? `
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="progress-text">تم تمويل ${progress}% من المشروع</div>
                </div>
                
                <div class="project-stats">
                    <div class="stat">
                        <div class="stat-value">
                            <i class="fas fa-percentage"></i>
                            ${progress}%
                        </div>
                        <div class="stat-label">مُمول</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">
                            <i class="fas fa-chart-line"></i>
                            ${project.expectedReturn}%
                        </div>
                        <div class="stat-label">عائد متوقع</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">
                            <i class="fas fa-calendar-alt"></i>
                            ${project.duration}
                        </div>
                        <div class="stat-label">شهر</div>
                    </div>
                </div>
                
                ${!isOwner ? `
                    <button type="button" class="btn" onclick="showInvestmentModal('${project.name}', ${project.expectedReturn}, ${project.duration}, '${project.id}')">
                        <i class="fas fa-hand-holding-usd"></i>
                        شارك الآن
                    </button>
                ` : `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div style="text-align: center; padding: 10px; background: #f8f9fa; border-radius: 8px;">
                            <div style="font-weight: 700; color: #00796B;">${project.currentAmount.toLocaleString()}</div>
                            <div style="font-size: 11px; color: #666;">مُمول</div>
                        </div>
                        <div style="text-align: center; padding: 10px; background: #f8f9fa; border-radius: 8px;">
                            <div style="font-weight: 700; color: #00796B;">${project.targetAmount.toLocaleString()}</div>
                            <div style="font-size: 11px; color: #666;">المطلوب</div>
                        </div>
                    </div>
                `}
            ` : ''}
        </div>
    `;
}

function showPublicProjects() {
    const projects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || '[]');
    const approvedProjects = projects.filter(p => p.status === 'approved');
    
    const container = document.getElementById('publicProjectsList');
    if (!container) return;
    
    if (approvedProjects.length === 0) {
        container.innerHTML = `
            <div class="card">
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-search" style="font-size: 60px; color: #00796B; margin-bottom: 15px;"></i>
                    <h3 style="color: #00796B; margin-bottom: 10px;">لا توجد مشاريع متاحة</h3>
                    <p style="color: #666;">لا توجد مشاريع متاحة للاستثمار حالياً</p>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = approvedProjects.map(project => createProjectCard(project, false)).join('');
    }
    
    showScreen('publicProjects');
}

// Investment Functions
function showInvestmentModal(projectName, returnRate, period, projectId) {
    if (!currentUser || currentUser.type !== 'investor') {
        showAlert('error', 'يجب تسجيل الدخول كمستثمر للاستثمار');
        return;
    }
    
    currentProject = {
        name: projectName,
        id: projectId,
        returnRate: returnRate / 100,
        period: period
    };
    
    const modalTitle = document.getElementById('modalProjectName');
    if (modalTitle) {
        modalTitle.innerHTML = `
            <i class="fas fa-hand-holding-usd"></i>
            استثمار في ${projectName}
        `;
    }
    
    const periodDisplay = document.getElementById('investmentPeriodDisplay');
    if (periodDisplay) {
        periodDisplay.textContent = `${period} شهر`;
    }
    
    const modal = document.getElementById('investmentModal');
    if (modal) {
        modal.classList.add('active');
    }
    
    calculateReturn();
}

function selectAmount(amount) {
    const input = document.getElementById('investmentAmount');
    if (input) {
        input.value = amount;
    }
    
    // Update button selection
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.classList.add('selected');
    
    calculateReturn();
}

function calculateReturn() {
    if (!currentProject) return;
    
    const amountInput = document.getElementById('investmentAmount');
    const amount = amountInput ? parseFloat(amountInput.value) || 0 : 0;
    const returnAmount = Math.round(amount * currentProject.returnRate);
    const totalReturn = amount + returnAmount;
    
    updateElementText('investmentDisplay', `${amount.toLocaleString()} جنيه`);
    updateElementText('expectedReturnDisplay', `${returnAmount.toLocaleString()} جنيه`);
    updateElementText('totalReturnDisplay', `${totalReturn.toLocaleString()} جنيه`);
}

function confirmInvestment() {
    const amountInput = document.getElementById('investmentAmount');
    const amount = amountInput ? parseFloat(amountInput.value) : 0;
    
    if (!amount || amount < 500) {
        showAlert('error', 'الحد الأدنى للاستثمار هو 500 جنيه');
        return;
    }
    
    if (amount > 50000) {
        showAlert('error', 'الحد الأقصى للاستثمار هو 50,000 جنيه');
        return;
    }
    
    // Create investment record
    const investment = {
        id: generateId(),
        investorId: currentUser.id,
        projectId: currentProject.id,
        projectName: currentProject.name,
        amount: amount,
        returnRate: currentProject.returnRate,
        period: currentProject.period,
        expectedReturn: Math.round(amount * currentProject.returnRate),
        status: 'active',
        investmentDate: new Date().toISOString()
    };
    
    // Save investment
    const investments = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVESTMENTS) || '[]');
    investments.push(investment);
    localStorage.setItem(STORAGE_KEYS.INVESTMENTS, JSON.stringify(investments));
    
    // Update project funding
    const projects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || '[]');
    const projectIndex = projects.findIndex(p => p.id === currentProject.id);
    if (projectIndex !== -1) {
        projects[projectIndex].currentAmount = (projects[projectIndex].currentAmount || 0) + amount;
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
        
        // Add notifications
        addNotification({
            type: 'investment_confirmed',
            title: 'تم تأكيد الاستثمار',
            message: `تم استثمار ${amount.toLocaleString()} جنيه في مشروع ${currentProject.name}`,
            targetUser: currentUser.id
        });
        
        // Notify project owner
        const project = projects[projectIndex];
        addNotification({
            type: 'new_investment',
            title: 'استثمار جديد',
            message: `تم استثمار ${amount.toLocaleString()} جنيه في مشروعك ${project.name}`,
            targetUser: project.ownerId
        });
    }
    
    closeModal();
    showSuccessModal('تم الاستثمار بنجاح!', 'تم تسجيل استثمارك بنجاح وسيتم إرسال العقد الإلكتروني إلى بريدك الإلكتروني خلال 24 ساعة');
    
    // Refresh data
    if (currentUser.type === 'investor') {
        loadInvestorHome();
        loadInvestorDashboard();
    }
}

// Dashboard Functions
function loadInvestorDashboard() {
    if (!currentUser) return;
    
    const investments = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVESTMENTS) || '[]');
    const userInvestments = investments.filter(inv => inv.investorId === currentUser.id);
    
    const totalInvested = userInvestments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalProfits = userInvestments.reduce((sum, inv) => sum + inv.expectedReturn, 0);
    const totalReturn = totalInvested > 0 ? ((totalProfits / totalInvested) * 100).toFixed(1) : 0;
    
    updateElementText('totalInvested', totalInvested.toLocaleString());
    updateElementText('totalProfits', totalProfits.toLocaleString());
    updateElementText('totalReturn', `+${totalReturn}%`);
    updateElementText('activeInvestments', userInvestments.length);
    
    // Load user investments list
    const container = document.getElementById('userInvestments');
    if (!container) return;
    
    if (userInvestments.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">لم تقم بأي استثمارات بعد</p>';
        return;
    }
    
    container.innerHTML = userInvestments.map(investment => `
        <div class="investment-item">
            <div class="investment-info">
                <div class="investment-icon">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="investment-details">
                    <h4>${investment.projectName}</h4>
                    <div class="investment-profit">
                        <i class="fas fa-arrow-up"></i>
                        +${investment.expectedReturn.toLocaleString()} جنيه عائد متوقع
                    </div>
                </div>
            </div>
            <div class="investment-amount">${investment.amount.toLocaleString()} جنيه</div>
        </div>
    `).join('');
}

// Profile Functions
function updateProfile() {
    if (!currentUser) return;
    
    updateElementText('profileName', `${currentUser.firstName} ${currentUser.lastName}`);
    updateElementText('profileType', getUserTypeArabic(currentUser.type));
    
    const statusElement = document.getElementById('profileStatus');
    if (statusElement) {
        statusElement.className = `project-status status-${currentUser.status}`;
        statusElement.textContent = getStatusArabic(currentUser.status);
    }
}

// Notification Functions
function addNotification(notification) {
    const notifications = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
    notification.id = generateId();
    notification.createdAt = new Date().toISOString();
    notification.read = false;
    notifications.unshift(notification);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    updateNotificationBadge();
}

function loadNotifications() {
    if (!currentUser) return;
    
    const notifications = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
    const userNotifications = notifications.filter(n => 
        n.targetUser === currentUser.id || 
        (currentUser.type === 'admin' && n.targetUser === 'admin')
    );
    
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
    if (userNotifications.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">لا توجد إشعارات</p>';
        return;
    }
    
    container.innerHTML = userNotifications.map(notification => `
        <div class="investment-item" style="border-bottom: 1px solid #E8F5E8; padding: 20px 0;">
            <div class="investment-info">
                <div class="investment-icon" style="background: ${getNotificationColor(notification.type)};">
                    <i class="fas fa-${getNotificationIcon(notification.type)}"></i>
                </div>
                <div class="investment-details">
                    <h4>${notification.title}</h4>
                    <div style="color: #666; font-size: 13px;">${notification.message}</div>
                    <div style="color: #999; font-size: 12px; margin-top: 5px;">
                        ${getTimeAgo(notification.createdAt)}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    // Mark notifications as read
    const notificationIds = userNotifications.map(n => n.id);
    markNotificationsAsRead(notificationIds);
}

function markNotificationsAsRead(notificationIds) {
    const notifications = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
    notifications.forEach(notification => {
        if (notificationIds.includes(notification.id)) {
            notification.read = true;
        }
    });
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    updateNotificationBadge();
}

function updateNotificationBadge() {
    if (!currentUser) return;
    
    const notifications = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
    const unreadCount = notifications.filter(n => 
        !n.read && (
            n.targetUser === currentUser.id || 
            (currentUser.type === 'admin' && n.targetUser === 'admin')
        )
    ).length;
    
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.classList.add('visible');
        } else {
            badge.classList.remove('visible');
        }
    }
}

// Utility Functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

function getProjectIcon(type) {
    const icons = {
        restaurant: 'utensils',
        store: 'store',
        cafe: 'coffee',
        technology: 'laptop',
        agriculture: 'seedling',
        manufacturing: 'industry',
        services: 'handshake',
        other: 'briefcase'
    };
    return icons[type] || 'briefcase';
}

function getProjectGradient(type) {
    const gradients = {
        restaurant: 'linear-gradient(135deg, #FF6B35 0%, #FF8E53 100%)',
        store: 'linear-gradient(135deg, #E91E63 0%, #F06292 100%)',
        cafe: 'linear-gradient(135deg, #9C27B0 0%, #BA68C8 100%)',
        technology: 'linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)',
        agriculture: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)',
        manufacturing: 'linear-gradient(135deg, #FF9800 0%, #FFB74D 100%)',
        services: 'linear-gradient(135deg, #795548 0%, #A1887F 100%)',
        other: 'linear-gradient(135deg, #607D8B 0%, #90A4AE 100%)'
    };
    return gradients[type] || 'linear-gradient(135deg, #FFA000 0%, #FF8F00 100%)';
}

function getProjectTypeArabic(type) {
    const types = {
        restaurant: 'مطعم',
        store: 'متجر',
        cafe: 'مقهى',
        technology: 'تقنية',
        agriculture: 'زراعة',
        manufacturing: 'تصنيع',
        services: 'خدمات',
        other: 'أخرى'
    };
    return types[type] || 'غير محدد';
}

function getEducationArabic(education) {
    const educations = {
        high_school: 'ثانوية عامة',
        diploma: 'دبلوم',
        bachelor: 'بكالوريوس',
        master: 'ماجستير',
        phd: 'دكتوراه'
    };
    return educations[education] || 'غير محدد';
}

function getIncomeArabic(income) {
    const incomes = {
        less_than_3000: 'أقل من 3,000 جنيه',
        '3000_to_5000': '3,000 - 5,000 جنيه',
        '5000_to_10000': '5,000 - 10,000 جنيه',
        '10000_to_20000': '10,000 - 20,000 جنيه',
        more_than_20000: 'أكثر من 20,000 جنيه'
    };
    return incomes[income] || 'غير محدد';
}

function getGovernorateArabic(governorate) {
    const governorates = {
        cairo: 'القاهرة',
        giza: 'الجيزة',
        alexandria: 'الإسكندرية',
        qalyubia: 'القليوبية',
        dakahlia: 'الدقهلية',
        sharqia: 'الشرقية',
        gharbia: 'الغربية',
        other: 'أخرى'
    };
    return governorates[governorate] || 'غير محدد';
}

function getUserTypeArabic(type) {
    const types = {
        admin: 'مدير النظام',
        investor: 'مستثمر',
        owner: 'صاحب مشروع'
    };
    return types[type] || 'غير محدد';
}

function getStatusArabic(status) {
    const statuses = {
        pending: 'في انتظار التوثيق',
        approved: 'موثق',
        rejected: 'مرفوض'
    };
    return statuses[status] || 'غير محدد';
}

function getNotificationIcon(type) {
    const icons = {
        new_user: 'user-plus',
        new_project: 'project-diagram',
        account_approved: 'check-circle',
        account_rejected: 'times-circle',
        project_approved: 'check',
        project_rejected: 'times',
        investment_confirmed: 'hand-holding-usd',
        new_investment: 'coins',
        profit_distributed: 'money-bill-wave'
    };
    return icons[type] || 'bell';
}

function getNotificationColor(type) {
    const colors = {
        new_user: '#00796B',
        new_project: '#FFA000',
        account_approved: '#4CAF50',
        account_rejected: '#f44336',
        project_approved: '#4CAF50',
        project_rejected: '#f44336',
        investment_confirmed: '#2196F3',
        new_investment: '#FF9800',
        profit_distributed: '#4CAF50'
    };
    return colors[type] || '#00796B';
}

function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    return date.toLocaleDateString('ar-EG');
}

// Modal Functions
function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    
    // Reset investment form
    const investmentInput = document.getElementById('investmentAmount');
    if (investmentInput) {
        investmentInput.value = '';
    }
    
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Reset calculations
    updateElementText('investmentDisplay', '0 جنيه');
    updateElementText('expectedReturnDisplay', '0 جنيه');
    updateElementText('totalReturnDisplay', '0 جنيه');
    
    // Reset selected IDs
    selectedUserId = null;
    selectedProjectId = null;
    currentProject = null;
}

function showSuccessModal(title, message = '') {
    updateElementText('successTitle', title);
    updateElementText('successMessage', message);
    
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function showAlert(type, message, targetScreen = null) {
    const alertTypes = {
        success: 'alert-success',
        error: 'alert-error',
        warning: 'alert-warning'
    };
    
    const alertClass = alertTypes[type] || 'alert-error';
    const alertIcon = type === 'success' ? 'check-circle' : (type === 'warning' ? 'exclamation-triangle' : 'times-circle');
    
    const alertHtml = `
        <div class="alert ${alertClass}">
            <i class="fas fa-${alertIcon}"></i>
            ${message}
        </div>
    `;
    
    if (targetScreen) {
        const alertContainer = document.getElementById(targetScreen + 'Alert');
        if (alertContainer) {
            alertContainer.innerHTML = alertHtml;
            setTimeout(() => {
                alertContainer.innerHTML = '';
            }, 5000);
        }
    } else {
        // Show global alert
        const existingAlert = document.querySelector('.global-alert');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        const alertDiv = document.createElement('div');
        alertDiv.className = 'global-alert';
        alertDiv.innerHTML = alertHtml;
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }
}

// Additional Functions
function logout() {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    currentUser = null;
    hideBottomNav();
    showScreen('welcome');
    showAlert('success', 'تم تسجيل الخروج بنجاح');
}

function editProfile() {
    showAlert('warning', 'ميزة تعديل الملف الشخصي ستكون متاحة قريباً');
}

function notificationSettings() {
    showAlert('warning', 'ميزة إعدادات الإشعارات ستكون متاحة قريباً');
}

function securitySettings() {
    showAlert('warning', 'ميزة إعدادات الأمان ستكون متاحة قريباً');
}

function contactSupport() {
    showAlert('success', 'للدعم الفني، يرجى التواصل على: support@musharaka.com');
}

function aboutApp() {
    showAlert('success', 'مشاركة - منصة التمويل الجماعي الرائدة في الوطن العربي v1.0');
}

function withdrawProfits() {
    showAlert('warning', 'ميزة سحب الأرباح ستكون متاحة قريباً');
}

function reinvest() {
    showAlert('warning', 'ميزة إعادة الاستثمار ستكون متاحة قريباً');
}

function downloadReport() {
    showAlert('warning', 'ميزة تحميل التقرير الشهري ستكون متاحة قريباً');
}