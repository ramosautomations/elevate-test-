// ── GLOBALS ──
let employees = [];
let userLocation = "";
let userName = "";
let userIsAdmin = false;
let userIsSuperAdmin = false;

const DIR_COLORS = ['#991b1b','#7f1d1d','#1e3a5f','#14532d','#4a1942','#1c3d2e','#5c3a0a'];
const RECENT_FORMS_KEY = 'scooters_recent_forms';
const DEFAULT_FORMS = ['conversations', 'writeups', 'reviews/index', 'reviews/assistant-manager', 'reviews/shift-lead'];
const RECENT_RESOURCES_KEY = 'scooters_recent_resources';

const FORM_REGISTRY = {
    'monthly-one-on-one': {
        adminOnly: true,
        title: 'Monthly 1:1',
        desc: 'Documented conversations focused on performance, development, and support.',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>',
    },
    'weekly-one-on-one': {
        adminOnly: true,
        title: 'Weekly 1:1',
        desc: 'Documented conversations focused on performance, development, and support.',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>',
    },
    'handbook-acknowledgment': {
        title: 'Handbook Acknowledgement',
        desc: 'Employee acknowledgement.<br><br>',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>',
    },
    'conversations': {
        title: 'Coaching Conversation',
        desc: 'Documented coaching conversations and employee feedback discussions.',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>',
    },
    'writeups': {
        title: 'Disciplinary Action',
        desc: 'Disciplinary action documentation.<br><br>',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>',
    },
    'reviews/assistant-manager': {
        title: 'Assistant Manager Review',
        desc: 'Assistant Manager annual performance review and mid-year assessment.',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>',
    },
    'reviews/index': {
        title: 'Barista Review',
        desc: 'Barista annual performance review and mid-year employee assessment.',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>',
    },
    'reviews/shift-lead': {
        title: 'Shift Lead Review',
        desc: 'Shift lead annual performance review and mid-year employee assessment.',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>',
    },
    'reviews/manager': {
        adminOnly: true,
        title: 'Store Manager Review',
        desc: 'Store Manager annual performance review and mid-year assessment.',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>',
    },

};

function getRecentResources() {
    try {
        const stored = localStorage.getItem(RECENT_RESOURCES_KEY);
        return stored ? JSON.parse(stored) : Object.keys(RESOURCE_REGISTRY);
    } catch { return Object.keys(RESOURCE_REGISTRY); }
}

function trackResourceClick(key) {
    try {
        let recent = getRecentResources().filter(k => k !== key);
        recent.unshift(key);
        recent = recent.slice(0, 4);
        localStorage.setItem(RECENT_RESOURCES_KEY, JSON.stringify(recent));
    } catch(e) {}
}
// ── SESSION CHECK ──
(async function() {
    try {
        const res = await fetch('/auth/current-user', { credentials: 'include' });
        if (!res.ok) { window.location.href = '/'; return; }
        const data = await res.json();
        userLocation = data.location || '';
        userName = data.name || '';
        userIsAdmin  = data.is_admin || false;
        userIsSuperAdmin = data.is_super_admin || false;
        userIsSuperAdmin = data.is_super_admin || false;
        document.getElementById('welcomeName').textContent = (data.name || '').split(' ')[0] || (userIsAdmin ? 'Admin' : (userLocation || 'No location assigned'));
        document.querySelector('.welcome-greeting').textContent = 'Welcome';
        if (userIsAdmin || userIsSuperAdmin) {
            const navItem = document.getElementById('nav-store-manager');
            if (navItem) navItem.style.display = 'flex';
            window._showAdminForms = true;
            if (userIsSuperAdmin) {
                const logsNav = document.getElementById('nav-logs');
                if (logsNav) logsNav.style.display = 'flex';
            }
        } else {
            window._showAdminForms = false;
        }

        const userRole = (data.role || '').toLowerCase();
        if (['owner', 'general manager'].includes(userRole)) {
            const manageFormsNav = document.getElementById('nav-manage-forms');
            if (manageFormsNav) manageFormsNav.style.display = 'flex';
        }

        renderQuickAccess();
        if (document.getElementById('panel-forms') && document.getElementById('panel-forms').classList.contains('active')) renderFormsPage();
        revLoad();
    } catch(e) {
        window.location.href = '/';
    }
})();

// ── NAVIGATION ──
function navigate(el, panel) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-' + panel).classList.add('active');
    if (panel === 'forms') renderFormsPage();
    if (panel === 'directory') dirLoadEmployees();
    if (panel === 'resources') renderResourcesPage();
    if (panel === 'customer-reviews') revInit();
    if (panel === 'logs') logsInit();
    const titles = { home: 'Dashboard', forms: 'Documentation', announcements: 'Announcements', directory: 'Employee Directory', resources: 'Resources', reports: 'Reports & Analytics', settings: 'Settings','customer-reviews': 'Customer Reviews', logs: 'Logs' };
    document.getElementById('pageTitle').textContent = titles[panel] || panel;
}

function toggleSubmenu(event) {
    event.stopPropagation();
    const el  = document.getElementById('formsNav');
    const sub = document.getElementById('submenu-forms');
    if (!sub) return;
    const isOpen = sub.classList.contains('open');
    el.classList.toggle('open', !isOpen);
    sub.classList.toggle('open', !isOpen);
}

// ── FORMS ──
function getRecentForms() {
    try {
        const stored = localStorage.getItem(RECENT_FORMS_KEY);
        return stored ? JSON.parse(stored) : DEFAULT_FORMS;
    } catch { return DEFAULT_FORMS; }
}

function trackFormClick(key) {
    try {
        let recent = getRecentForms().filter(f => f !== key);
        recent.unshift(key);
        recent = recent.slice(0, 4);
        localStorage.setItem(RECENT_FORMS_KEY, JSON.stringify(recent));
        renderQuickAccess();
        if (document.getElementById('panel-forms') && document.getElementById('panel-forms').classList.contains('active')) renderFormsPage();
        revLoad();
    } catch(e) {}
}

function cardHTML(key) {
    const form = FORM_REGISTRY[key];
    if (!form) return '';
    const action = key.startsWith('reviews/') ? `openReview('${key}')` : `openForm('${key}')`;
    return `
        <div class="form-card">
            <div class="form-card-accent"></div>
            <div class="form-card-body">
                <div class="form-card-icon">
                    <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">${form.icon}</svg>
                </div>
                <div class="form-card-title">${form.title}</div>
                <div class="form-card-desc">${form.desc}</div>
                <button class="form-card-btn" onclick="trackFormClick('${key}'); ${action}">
                    Open
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                    </svg>
                </button>
            </div>
        </div>`;
}

function renderFormsPage() {
    const grid = document.getElementById('formsPageGrid');
    if (!grid) return;
    grid.innerHTML = Object.keys(FORM_REGISTRY)
        .filter(k => !FORM_REGISTRY[k].adminOnly || window._showAdminForms)
        .map(cardHTML).join('');
}

function renderQuickAccess() {
    const grid = document.getElementById('quickAccessGrid');
    if (!grid) return;

    const formCards = getRecentForms()
        .filter(k => !FORM_REGISTRY[k] || !FORM_REGISTRY[k].adminOnly || window._showAdminForms)
        .map(cardHTML).join('');

    const resourceCards = getRecentResources()
        .map(key => {
            const res = RESOURCE_REGISTRY[key];
            if (!res) return '';
            return `
                <div class="form-card">
                    <div class="form-card-accent"></div>
                    <div class="form-card-body">
                        <div class="form-card-icon">
                            <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">${res.icon}</svg>
                        </div>
                        <div class="form-card-title">${res.title}</div>
                        <div class="form-card-desc">${res.desc}</div>
                        <button class="form-card-btn" onclick="openResource('${key}')">
                            Open
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                            </svg>
                        </button>
                    </div>
                </div>`;
        }).join('');

    grid.innerHTML = formCards + resourceCards;
}

function formsFilter() {
    const q = document.getElementById('formsSearch').value.toLowerCase();
    const grid = document.getElementById('formsPageGrid');
    if (!grid) return;
    grid.querySelectorAll('.form-card').forEach(card => {
        card.style.display = card.innerText.toLowerCase().includes(q) ? '' : 'none';
    });
}

function openReview(formType) {
    trackFormClick(formType);
    const formMap = {
        'reviews/index':            '/scooters/forms/barista-review.html',
        'reviews/shift-lead':       '/scooters/forms/shift-lead-review.html',
        'reviews/assistant-manager':'/scooters/forms/assistant-manager-review.html',
        'reviews/manager':          '/scooters/forms/manager-review.html',
        'conversations':            '/scooters/forms/coaching-conversation.html',
        'handbook-acknowledgment':   '/scooters/forms/handbook-acknowledgment.html',
        'weekly-one-on-one':         '/scooters/forms/weekly-one-on-one.html',
        'monthly-one-on-one':        '/scooters/forms/monthly-one-on-one.html',
        'writeups':                 '/scooters/forms/disciplinary-action.html',
    };
    const url = formMap[formType];
    if (!url) { console.error('Unknown form type:', formType); return; }
    const token = btoa(`scooters-page-reviews-${Math.floor(Date.now() / 300000)}`);
    const locationParam = (!userIsAdmin && userLocation) ? `&location=${encodeURIComponent(userLocation)}` : '';
    const adminParam = userIsAdmin ? `&admin=true` : '';
    const tab = window.open(`${url}?pt=${token}${locationParam}${adminParam}`, '_blank');
    if (tab) {
        const poll = setInterval(() => {
            try {
                if (tab.closed) { clearInterval(poll); return; }
                if (tab.location?.href?.includes('thanks')) { setTimeout(() => tab.close(), 2000); clearInterval(poll); }
            } catch(e) { clearInterval(poll); }
        }, 500);
    }
}

function openForm(type) {
    trackFormClick(type);
    const formMap = {
        'conversations':    '/scooters/forms/coaching-conversation.html',
        'handbook-acknowledgment': '/scooters/forms/handbook-acknowledgment.html',
        'weekly-one-on-one': '/scooters/forms/weekly-one-on-one.html',
        'monthly-one-on-one': '/scooters/forms/monthly-one-on-one.html',
        'writeups':         '/scooters/forms/disciplinary-action.html',
    };
    const url = formMap[type];
    if (!url) { console.error('Unknown form type:', type); return; }
    const token = btoa(`scooters-page-${type}-${Math.floor(Date.now() / 300000)}`);
    const locationParam = (!userIsAdmin && userLocation) ? `&location=${encodeURIComponent(userLocation)}` : '';
    const adminParam = userIsAdmin ? `&admin=true` : '';
    const tab = window.open(`${url}?pt=${token}${locationParam}${adminParam}`, '_blank');
    if (tab) {
        const poll = setInterval(() => {
            try {
                if (tab.closed) { clearInterval(poll); return; }
                if (tab.location?.href?.includes('thanks')) { setTimeout(() => tab.close(), 2000); clearInterval(poll); }
            } catch(e) { clearInterval(poll); }
        }, 500);
    }
}

// ── DIRECTORY ──
async function dirLoadEmployees() {
    try {
        const res = await fetch('/api/employees', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch');
        const raw = await res.json();
        const data = raw.filter(e => e.name !== userName);
        employees = data.map(e => ({
            id:               e.id,
            first:            e.name.split(' ')[0],
            last:             e.name.split(' ').slice(1).join(' ') || '',
            email:            e.email           || '',
            role:             e.title           || '',
            location:         e.location        || '',
            start:            e.hire_date        ? e.hire_date.split('T')[0]        : '',
            termination_date: e.termination_date ? e.termination_date.split('T')[0] : '',
            status:           e.status === 'Active' || e.status === 'active' ? 'Active'
                            : ['inactive','Inactive'].includes(e.status) ? 'Inactive'
                            : ['part-time','Part-Time','part time','Part time'].includes(e.status) ? 'Part-Time'
                            : 'Inactive',
            employment_type:  e.employment_type || '',
            pay_type:         e.pay_type        || '',
            pay_amount:       e.pay_amount      || '',
            phone:            e.phone           || '',
            supervisor:       e.supervisor      || '',
        }));
        dirRenderTable(employees);
        dirUpdateStats(employees);
    } catch (err) {
        console.error('Directory load error:', err);
        document.getElementById('dirTableBody').innerHTML = `
            <tr class="dir-empty"><td colspan="6">
                <div class="dir-empty-icon">
                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                </div>
                Failed to load employees. Please refresh.
            </td></tr>`;
    }
}

function dirFilter() {
    const q = document.getElementById('empSearch').value.toLowerCase();
    const filtered = employees.filter(e =>
        `${e.first} ${e.last} ${e.email} ${e.role} ${e.location} ${e.status}`.toLowerCase().includes(q)
    );
    dirRenderTable(filtered);
    dirUpdateStats(filtered);
}

function dirInitials(e) { return (e.first[0] + e.last[0]).toUpperCase(); }
function dirColor(e)    { return DIR_COLORS[(e.first.charCodeAt(0) + e.last.charCodeAt(0)) % DIR_COLORS.length]; }

function dirFormatDate(d) {
    if (!d) return '-';
    const [y,m,day] = d.split('-');
    const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${mo[+m-1]} ${+day}, ${y}`;
}

function dirBadge(s) {
    if (s === 'Active')    return `<span class="badge badge-active">Active</span>`;
    if (s === 'Part-Time') return `<span class="badge badge-part">Part-Time</span>`;
    return `<span class="badge badge-inactive">Inactive</span>`;
}

function dirRenderTable(list) {
    const tbody = document.getElementById('dirTableBody');
    if (!list.length) {
        tbody.innerHTML = `<tr class="dir-empty"><td colspan="6">
            <div class="dir-empty-icon">
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
            </div>
            No employees match your search.
        </td></tr>`;
        return;
    }
    tbody.innerHTML = list.map(e => `
        <tr>
            <td>
                <div class="emp-cell">
                    <div class="emp-avatar" style="background:${dirColor(e)}">${dirInitials(e)}</div>
                    <div>
                        <div class="emp-name">${e.first} ${e.last}</div>
                        <div class="emp-email">${e.email}</div>
                    </div>
                </div>
            </td>
            <td><span class="role-tag">${e.role}</span></td>
            <td>${e.location}</td>
            <td>${dirFormatDate(e.start)}</td>
            <td>${dirBadge(e.status)}</td>
            <td>
                <div class="dir-actions-cell">
                    <button class="dir-action-btn" onclick="dirViewEmployee(${e.id})">View</button>
                    <button class="dir-action-btn" onclick="dirEditEmployee(${e.id})">Edit</button>
                    ${userIsAdmin || userIsSuperAdmin ? `<button class="dir-action-btn dir-action-delete" onclick="dirDeleteEmployee(${e.id}, '${e.first} ${e.last}', event)">Delete</button>` : ''}
                </div>
            </td>
        </tr>`).join('');
}

function dirUpdateStats(list) {
    document.getElementById('dirCountAll').textContent      = list.length;
    document.getElementById('dirCountActive').textContent   = list.filter(e => e.status === 'Active').length;
    document.getElementById('dirCountPart').textContent     = list.filter(e => e.status === 'Part-Time').length;
    document.getElementById('dirCountInactive').textContent = list.filter(e => e.status === 'Inactive').length;
}

function dirGoBack() {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-directory').classList.add('active');
    document.querySelectorAll('.nav-item').forEach(i => {
        i.classList.remove('active');
        if (i.getAttribute('onclick') && i.getAttribute('onclick').includes('directory')) {
            i.classList.add('active');
        }
    });
    document.getElementById('pageTitle').textContent = 'Employee Directory';
}

function dirOpenModal()  { document.getElementById('dirModalOverlay').classList.add('open'); loadSupervisorOptions(); }
function dirCloseModal() { document.getElementById('dirModalOverlay').classList.remove('open'); }
function dirCloseOutside(e) { if (e.target === document.getElementById('dirModalOverlay')) dirCloseModal(); }

async function dirAddEmployee() {
    const name            = document.getElementById('mFirst').value.trim();
    const title           = document.getElementById('mLast').value.trim();
    const email           = document.getElementById('mEmail').value.trim();
    const phone           = document.getElementById('mPhone').value.trim();
    const location        = document.getElementById('mLocation').value;
    const employment_type = document.getElementById('mEmploymentType').value;
    const status          = document.getElementById('mStatus').value;
    const pay_type        = document.getElementById('mPayType').value;
    const pay_amount      = document.getElementById('mPayAmount').value;
    const hire_date       = document.getElementById('mStart').value;
    const termination_date= document.getElementById('mTermDate').value;
    const supervisor      = document.getElementById('mSupervisor').value.trim();

    if (!name || !title || !location || !hire_date) {
        alert('Please fill in all required fields (Name, Title, Location, Start Date).');
        return;
    }

    try {
        const res = await fetch('/api/employees', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name, title, email, phone, location,
                employment_type, status, pay_type,
                pay_amount: pay_amount || null,
                hire_date,
                termination_date: termination_date || null,
                supervisor
            })
        });
        if (!res.ok) {
            const err = await res.json();
            alert('Error: ' + (err.error || 'Failed to add employee'));
            return;
        }
        await dirLoadEmployees();
        dirCloseModal();
        ['mFirst','mLast','mEmail','mPhone','mDepartment','mPayAmount','mStart','mTermDate','mSupervisor']
            .forEach(id => document.getElementById(id).value = '');
        document.getElementById('mLocation').value       = '';
        document.getElementById('mEmploymentType').value = 'full-time';
        document.getElementById('mStatus').value         = 'active';
        document.getElementById('mPayType').value        = 'hourly';
    } catch (err) {
        console.error('Add employee error:', err);
        alert('Something went wrong. Please try again.');
    }
}
// ── EDIT EMPLOYEE ──
async function dirEditEmployee(id) {
    try {
        const res = await fetch(`/api/employees/${id}`, { credentials: 'include' });
        const emp = await res.json();

        // Open modal first
        document.getElementById('editModalOverlay').classList.add('open');
        loadSupervisorOptions(emp.supervisor || '');

        document.getElementById('eId').value             = emp.id             || '';
        document.getElementById('eName').value           = emp.name           || '';
        document.getElementById('eTitle').value          = emp.title          || '';
        document.getElementById('eEmail').value          = emp.email          || '';
        document.getElementById('ePhone').value          = emp.phone          || '';
        document.getElementById('eLocation').value       = emp.location       || '';
        document.getElementById('eEmploymentType').value = emp.employment_type|| 'full-time';
        document.getElementById('eStatus').value         = emp.status         || 'active';
        document.getElementById('ePayType').value        = emp.pay_type       || 'hourly';
        document.getElementById('ePayAmount').value      = emp.pay_amount     || '';
        document.getElementById('eStart').value          = emp.hire_date        ? emp.hire_date.split('T')[0]        : '';
        document.getElementById('eTermDate').value       = emp.termination_date ? emp.termination_date.split('T')[0] : '';
        document.getElementById('eSupervisor').value     = emp.supervisor     || '';

    } catch (err) {
        console.error('Edit load error:', err);
        alert('Failed to load employee data: ' + err.message);
    }
}

function editCloseModal()    { document.getElementById('editModalOverlay').classList.remove('open'); }
function editCloseOutside(e) { if (e.target === document.getElementById('editModalOverlay')) editCloseModal(); }

async function editSaveEmployee() {
    const id = document.getElementById('eId').value;
    const name            = document.getElementById('eName').value.trim();
    const title           = document.getElementById('eTitle').value.trim();
    const email           = document.getElementById('eEmail').value.trim();
    const phone           = document.getElementById('ePhone').value.trim();
    const location        = document.getElementById('eLocation').value;
    const employment_type = document.getElementById('eEmploymentType').value;
    const status          = document.getElementById('eStatus').value;
    const pay_type        = document.getElementById('ePayType').value;
    const pay_amount      = document.getElementById('ePayAmount').value;
    const hire_date       = document.getElementById('eStart').value;
    const termination_date= document.getElementById('eTermDate').value;
    const supervisor      = document.getElementById('eSupervisor').value.trim();

    if (!name || !title || !location) {
        alert('Name, Title, and Location are required.');
        return;
    }

    try {
        const res = await fetch(`/api/employees/${id}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name, title, email, phone, location,
                employment_type, status, pay_type,
                pay_amount: pay_amount || null,
                hire_date: hire_date || null,
                termination_date: termination_date || null,
                supervisor
            })
        });

        if (!res.ok) {
            const err = await res.json();
            alert('Error: ' + (err.error || 'Failed to save'));
            return;
        }

        await dirLoadEmployees();
        editCloseModal();

        // If profile panel is open, refresh it
        if (document.getElementById('panel-employee').classList.contains('active')) {
            dirViewEmployee(id);
        }

    } catch (err) {
        console.error('Save employee error:', err);
        alert('Something went wrong. Please try again.');
    }
}

async function dirDeleteEmployee(id, name, event) {
    event.stopPropagation();
    if (!confirm(`Are you sure you want to delete ${name}?\n\nThis cannot be undone.`)) return;
    try {
        const res = await fetch(`/api/employees/${id}`, { method: 'DELETE', credentials: 'include' });
        if (!res.ok) {
            const err = await res.json();
            alert('Error: ' + (err.error || 'Failed to delete employee'));
            return;
        }
        await dirLoadEmployees();
    } catch (err) {
        console.error('Delete employee error:', err);
        alert('Something went wrong. Please try again.');
    }
}

// ── EMPLOYEE PROFILE ──
async function dirViewEmployee(id) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-employee').classList.add('active');
    document.getElementById('pageTitle').textContent = 'Employee Profile';
    document.getElementById('profileDocs').innerHTML = '<div class="emp-docs-loading">Loading…</div>';

    try {
        const [empRes, docsRes] = await Promise.all([
            fetch(`/api/employees/${id}`, { credentials: 'include' }),
            fetch(`/api/records?employee_id=${id}`, { credentials: 'include' })
        ]);
        const emp  = await empRes.json();
        const docs = await docsRes.json();

        const initials = emp.name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
        const colors   = DIR_COLORS;
        const color    = colors[(emp.name.charCodeAt(0) + (emp.name.charCodeAt(1)||0)) % colors.length];

        document.getElementById('profileAvatar').textContent      = initials;
        document.getElementById('profileAvatar').style.background = color;
        document.getElementById('profileName').textContent        = emp.name;
        document.getElementById('profileTitle').textContent       = emp.title || '-';
        document.getElementById('profileEditBtn').onclick        = () => dirEditEmployee(emp.id);
        document.getElementById('profileEmail').textContent       = emp.email      || '-';
        document.getElementById('profilePhone').textContent       = emp.phone      || '-';
        document.getElementById('profileLocation').textContent    = emp.location   || '-';
        document.getElementById('profileSupervisor').textContent  = emp.supervisor || '-';

        const statusMap = { active: 'Active', inactive: 'Inactive', 'part-time': 'Part-Time' };
        document.getElementById('profileStatus').textContent  = statusMap[emp.status] || emp.status || '-';
        document.getElementById('profileEmpType').textContent = emp.employment_type
            ? emp.employment_type.charAt(0).toUpperCase() + emp.employment_type.slice(1) : '-';
        document.getElementById('profilePayType').textContent = emp.pay_type
            ? emp.pay_type.charAt(0).toUpperCase() + emp.pay_type.slice(1) : '-';
        document.getElementById('profilePayAmount').textContent = emp.pay_amount
            ? `$${parseFloat(emp.pay_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-';

        const fmt = d => d ? new Date(d).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }) : '-';
        document.getElementById('profileStartDate').textContent = fmt(emp.hire_date);
        document.getElementById('profileTermDate').textContent  = fmt(emp.termination_date);

        if (!docs.length) {
            document.getElementById('profileDocs').innerHTML = `
                <div class="emp-docs-empty">
                    <div class="emp-docs-empty-icon">
                        <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                    </div>
                    <p>No documents found for this employee.</p>
                </div>`;
        } else {
            document.getElementById('profileDocs').dataset.empId = id;
            document.getElementById('profileDocs').innerHTML = docs.map(doc => {
                const date = new Date(doc.submission_date).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
                return `
                    <div class="emp-doc-item">
                        <div class="emp-doc-icon">
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                        </div>
                        <div class="emp-doc-info">
                            <div class="emp-doc-title">${doc.form_title || doc.form_type}</div>
                            <div class="emp-doc-meta">Submitted ${date} · ${doc.submitted_by_name || 'Unknown'}</div>
                        </div>
                        <span class="emp-doc-badge">${doc.status || 'submitted'}</span>
                        ${doc.pdf_filename ? `
                        <a href="/api/forms/pdf/${doc.pdf_filename}" target="_blank" class="dir-action-btn" style="text-decoration:none;">View</a>
                        <a href="/api/forms/pdf/${doc.pdf_filename}" download="${doc.pdf_filename}" class="dir-action-btn" style="text-decoration:none;">Download</a>
                        ` : ''}
                        ${userIsAdmin || userIsSuperAdmin ? `<button class="dir-action-btn dir-action-delete" onclick="deleteDocument(${doc.id})">Delete</button>` : ''}
                    </div>`;
            }).join('');
        }
    } catch (err) {
        console.error('Profile load error:', err);
        document.getElementById('profileDocs').innerHTML = '<div class="emp-docs-loading">Failed to load data.</div>';
    }
}
// ── RESOURCES ──
const RESOURCE_REGISTRY = {
    'job-offer': {
        title: 'Job Offer Letter',
        desc: 'Generate an official employment offer letter for a candidate.',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>',
        url: '/scooters/forms/job-offer.html'
    }
};
function resourcesFilter() {
    const q = document.getElementById('resourcesSearch').value.toLowerCase();
    const grid = document.getElementById('resourcesGrid');
    if (!grid) return;
    grid.querySelectorAll('.form-card').forEach(card => {
        card.style.display = card.innerText.toLowerCase().includes(q) ? '' : 'none';
    });
}
function renderResourcesPage() {
    const grid = document.getElementById('resourcesGrid');
    if (!grid) return;
    grid.innerHTML = Object.entries(RESOURCE_REGISTRY).map(([key, res]) => `
        <div class="form-card" onclick="openResource('${key}')">
            <div class="form-card-accent"></div>
            <div class="form-card-body">
                <div class="form-card-icon">
                    <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">${res.icon}</svg>
                </div>
                <div class="form-card-title">${res.title}</div>
                <div class="form-card-desc">${res.desc}</div>
                <button class="form-card-btn" onclick="event.stopPropagation(); openResource('${key}')">
                    Open
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                    </svg>
                </button>
            </div>
        </div>`).join('');
}

function openResource(key) {
    const res = RESOURCE_REGISTRY[key];
    if (!res) return;
    trackResourceClick(key);
    const token = btoa(`scooters-page-reviews-${Math.floor(Date.now() / 300000)}`);
    const adminParam = userIsAdmin ? `&admin=true` : '';
    const locationParam = (!userIsAdmin && userLocation) ? `&location=${encodeURIComponent(userLocation)}` : '';
    window.open(`${res.url}?pt=${token}${locationParam}${adminParam}`, '_blank');
}

// ==================== CUSTOMER REVIEWS ====================

const REV_COLORS = ['#8B1A1A','#1A5C8B','#2D7A3A','#7A3A1A','#5C1A7A','#1A7A6E'];
let revData     = [];
let revFiltered = [];
let revRating   = 0;

function revInitials(n) { return n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(); }
function revColor(n)    { let h=0; for(const c of n) h=(h*31+c.charCodeAt(0))&0xFFFFFF; return REV_COLORS[Math.abs(h)%REV_COLORS.length]; }
function revFmtDate(d)  {
  if (!d) return '-';
  const [y,m,day] = d.slice(0,10).split('-');
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]+' '+parseInt(day)+', '+y;
}


async function revLoad() {
  try {
    const res = await fetch('/api/reviews', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed');
    let data = await res.json();
    if (!userIsAdmin && userLocation) {
        data = data.filter(r => r.location === userLocation);
    }
    revData = data;
    revFiltered = [...revData];
    revRenderStats();
    revRenderTable();
  } catch (err) {
    console.error('Reviews load error:', err);
  }
}

function revRenderStats() {
    const total    = revData.length;
    const newCount = revData.filter(r=>r.status==='New').length;
    const reviewed = revData.filter(r=>r.status==='Reviewed').length;
    const pending  = revData.filter(r=>r.status==='Pending').length;
    document.getElementById('revStats').innerHTML = `
        <div class="dir-stat"><span class="stat-dot" style="background:#71717A"></span><span class="dir-stat-count">${total}</span><span class="dir-stat-label">Total</span></div>
        <div class="dir-stat"><span class="stat-dot" style="background:#22C55E"></span><span class="dir-stat-count">${reviewed}</span><span class="dir-stat-label">Reviewed</span></div>
        <div class="dir-stat"><span class="stat-dot" style="background:#F59E0B"></span><span class="dir-stat-count">${pending}</span><span class="dir-stat-label">Pending</span></div>
    `;
}

function revFilter() {
  const q = document.getElementById('revSearchInput').value.toLowerCase();
  revFiltered = revData.filter(r =>
    r.customer_name.toLowerCase().includes(q) ||
    (r.customer_email||'').toLowerCase().includes(q) ||
    (r.review_text||'').toLowerCase().includes(q) ||
    (r.location||'').toLowerCase().includes(q) ||
    (r.customer_email||'').toLowerCase().includes(q)
  );
  revRenderTable();
}

function revRenderTable() {
  const tbody   = document.getElementById('revTableBody');
  const noMatch = document.getElementById('revNoMatch');
  if (!revFiltered.length) {
    tbody.innerHTML = '';
    noMatch.style.display = 'block';
    return;
  }
  noMatch.style.display = 'none';
  tbody.innerHTML = revFiltered.map(r => `
    <tr>
        <td class='emp-sub' style='white-space:nowrap'>${revFmtDate(r.review_date)}</td>
        <td>${r.customer_name}</td>
        <td>
            <div class='emp-cell'>
                <div class='emp-avatar' style='background:${revColor(r.customer_email || r.customer_name)}'>${revInitials(r.customer_email || r.customer_name)}</div>
                <div class='emp-name'>${r.customer_email || '-'}</div>
            </div>
        </td>
        <td>${r.location || '-'}</td>
        <td><span class='rev-cat-tag'>${r.category || '-'}</span></td>
        <td><div class='rev-text-cell'>${r.review_text || '-'}</div></td>
        <td>${revStatusBadge(r.status)}</td>
        <td>
            <div class='dir-actions-cell'>
                <button class='dir-action-btn' onclick='revView(${r.id})'>View</button>
                <button class='dir-action-btn' onclick='revEdit(${r.id})'>Edit</button>
                ${userIsAdmin ? `<button class='dir-action-btn dir-action-delete' onclick='revDelete(${r.id})'>Delete</button>` : ''}
            </div>
        </td>
    </tr>
`).join('');
}

function revOpenAdd() {
    document.getElementById('revModalTitle').textContent = 'ADD REVIEW';
    document.getElementById('revEditId').value    = '';
    document.getElementById('revFName').value     = '';
    document.getElementById('revFDate').value     = new Date().toISOString().slice(0,10);
    document.getElementById('revFText').value     = '';
    document.getElementById('revFStatus').value   = 'New';
    document.getElementById('revFManager').value  = '';
    document.getElementById('revFLocation').value = '';
    document.getElementById('revMPhone').checked  = false;
    document.getElementById('revMText').checked   = false;
    document.getElementById('revMEmail').checked  = false;
    revLoadEmployeeOptions();
    document.getElementById('revAddModal').classList.add('open');
}
function revCloseAdd() { document.getElementById('revAddModal').classList.remove('open'); }

function revSetRating(n) { revRating = n; revUpdateStars(n); }
function revUpdateStars(n) {
  document.querySelectorAll('#revStarPicker .rev-star').forEach(s => {
    s.classList.toggle('filled', +s.dataset.val <= n);
  });
}

async function revSave() {
    const name = document.getElementById('revFName').value.trim();
    if (!name) { alert('Customer name is required.'); return; }
 
    const methods = [];
    if (document.getElementById('revMPhone').checked) methods.push('Phone Call');
    if (document.getElementById('revMText').checked)  methods.push('Text Message');
    if (document.getElementById('revMEmail').checked) methods.push('Email');
 
    const id   = document.getElementById('revEditId').value;
    const body = {
        customer_name:    name,
        customer_email:   document.getElementById('revFManager').value.trim(), // reusing email col for manager
        manager_name:     document.getElementById('revFManager').value.trim(),
        location:         document.getElementById('revFLocation').value.trim(),
        contact_method:   methods.join(', '),
        category:         methods.join(', ') || 'General',
        status:           document.getElementById('revFStatus').value,
        review_text:      document.getElementById('revFText').value.trim(),
        review_date:      document.getElementById('revFDate').value || new Date().toISOString().slice(0,10)
    };
 
    try {
        const res = await fetch(id ? `/api/reviews/${id}` : '/api/reviews', {
            method:  id ? 'PUT' : 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body)
        });
        if (!res.ok) throw new Error('Save failed');
        revCloseAdd();
        await revLoad();
    } catch (err) {
        console.error('Review save error:', err);
        alert('Failed to save review. Please try again.');
    }
}

function revEdit(id) {
    const r = revData.find(x => x.id === id);
    if (!r) return;
    document.getElementById('revModalTitle').textContent  = 'EDIT REVIEW';
    document.getElementById('revEditId').value    = r.id;
    document.getElementById('revFManager').value  = r.customer_email || ''; // stored in email col
    document.getElementById('revFLocation').value = r.location || '';
    document.getElementById('revFName').value     = r.customer_name;
    document.getElementById('revFDate').value     = (r.review_date||'').slice(0,10);
    document.getElementById('revFText').value     = r.review_text || '';
    document.getElementById('revFStatus').value   = r.status;
    document.getElementById('revMPhone').checked  = (r.category||'').includes('Phone Call');
    document.getElementById('revMText').checked   = (r.category||'').includes('Text Message');
    document.getElementById('revMEmail').checked  = (r.category||'').includes('Email');
    revLoadEmployeeOptions(r.customer_email, r.location);
    document.getElementById('revAddModal').classList.add('open');
}

async function revDelete(id) {
  if (!confirm('Delete this review?')) return;
  try {
    const res = await fetch(`/api/reviews/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) throw new Error('Delete failed');
    await revLoad();
  } catch (err) {
    console.error('Review delete error:', err);
    alert('Failed to delete review.');
  }
}

function revView(id) {
    const r = revData.find(x => x.id === id);
    if (!r) return;
    document.getElementById('revViewBody').innerHTML = [
        '<div class="rev-view-grid">',
        '<div><div class="rev-view-label">MANAGER NAME</div><div class="rev-view-val">' + (r.customer_email||'-') + '</div></div>',
        '<div><div class="rev-view-label">LOCATION</div><div class="rev-view-val">' + (r.location||'-') + '</div></div>',
        '<div><div class="rev-view-label">CUSTOMER NAME</div><div class="rev-view-val">' + r.customer_name + '</div></div>',
        '<div><div class="rev-view-label">DATE CONTACTED</div><div class="rev-view-val">' + revFmtDate(r.review_date) + '</div></div>',
        '<div><div class="rev-view-label">CONTACT METHOD</div><div class="rev-view-val">' + (r.category||'-') + '</div></div>',
        '<div><div class="rev-view-label">STATUS</div><div class="rev-view-val">' + revStatusBadge(r.status) + '</div></div>',
        '</div>',
        '<div style="margin-top:4px"><div class="rev-view-label">SUMMARY OF CONVERSATION</div>',
        '<div class="rev-view-body" style="margin-top:4px">' + (r.review_text||'No summary provided.') + '</div></div>'
    ].join('');
    document.getElementById('revViewModal').classList.add('open');
}
function revCloseView() { document.getElementById('revViewModal').classList.remove('open'); }

document.getElementById('revAddModal').addEventListener('mousedown', function(e){ 
    if(e.target === this) revCloseAdd(); 
});
document.getElementById('revViewModal').addEventListener('click', function(e){ if(e.target===this) revCloseView(); });

function revInit() { revLoad(); }

// ── INIT ──
dirLoadEmployees();
async function revLoadEmployeeOptions(presetManager = null, presetLocation = null) {
    try {
        const res = await fetch('/api/employees', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed');
        const allEmployees = await res.json();
        // Fetch all employees unfiltered to get GMs from all locations
        const resAll = await fetch('/api/employees/all', { credentials: 'include' }).catch(() => null);
        const allEmployeesUnfiltered = resAll && resAll.ok ? await resAll.json() : allEmployees;
        // Combine location-filtered employees + all managers from unfiltered list
        const combinedManagers = [...allEmployeesUnfiltered];
        allEmployees.forEach(e => {
            if (!combinedManagers.find(m => m.id === e.id)) combinedManagers.push(e);
        });
        const allManagers = combinedManagers.filter(e => e.title && (e.title.toLowerCase().includes('manager') || e.title.toLowerCase() === 'owner'));

        // Location dropdown first
        const locationSel = document.getElementById('revFLocation');
        const locations = [...new Set(allEmployees.map(e => e.location).filter(Boolean))].sort();
        locationSel.innerHTML = '<option value="">Select location...</option>';
        locations.forEach(loc => {
            const opt = document.createElement('option');
            opt.value = loc;
            opt.textContent = loc;
            locationSel.appendChild(opt);
        });
        const selectedLocation = presetLocation || userLocation || '';
        if (selectedLocation) locationSel.value = selectedLocation;

        // Manager dropdown - filtered by selected location
        function populateManagers(location) {
            const managerSel = document.getElementById('revFManager');

            // Find logged-in user's employee record
            const loggedInEmp = allManagers.find(e => e.name === userName);
            const loggedInTitle = loggedInEmp ? loggedInEmp.title : '';
            const isGMOrOwner = ['General Manager', 'Owner'].includes(loggedInTitle);

            // Filter managers by location
            let filtered = location
                ? allManagers.filter(e => e.location === location && !['General Manager', 'Owner'].includes(e.title))
                : allManagers.filter(e => !['General Manager', 'Owner'].includes(e.title));

            // Always add the logged-in user to the list if they are a manager-level user
            if (loggedInEmp) {
                const alreadyIn = filtered.some(e => e.name === userName);
                if (!alreadyIn) filtered = [loggedInEmp, ...filtered];
            }

            managerSel.innerHTML = '<option value="">Select manager...</option>';
            filtered.forEach(e => {
                const opt = document.createElement('option');
                opt.value = e.name;
                opt.textContent = e.name + ' (' + e.title + ')';
                managerSel.appendChild(opt);
            });
            const selectedManager = presetManager || userName || '';
            if (selectedManager) managerSel.value = selectedManager;
        }

        populateManagers(selectedLocation);

        // Re-filter managers when location changes
        locationSel.onchange = function() {
            populateManagers(this.value);
        };

    } catch (err) {
        console.error('Failed to load employee options:', err);
    }
}

function revStatusBadge(status) {
    const s = (status || 'new').toLowerCase();
    return '<span class="rev-status rev-s-' + s + '">' + (status || '-') + '</span>';
}

async function loadSupervisorOptions(selectedValue = '') {
    try {
        const res = await fetch('/api/employees', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed');
        const emps = await res.json();
        const supervisorTitles = ['General Manager', 'Manager', 'Assistant Manager'];

        ['mSupervisor', 'eSupervisor'].forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;

            // Get the location selected in the corresponding location dropdown
            const locationId = id === 'mSupervisor' ? 'mLocation' : 'eLocation';
            const locationSel = document.getElementById(locationId);

            function populate() {
                const loc = locationSel ? locationSel.value : '';
                const supervisors = emps.filter(e =>
                    supervisorTitles.includes(e.title) &&
                    (!loc || e.location === loc)
                );
                const current = selectedValue || sel.value;
                sel.innerHTML = '';
                supervisors.forEach(e => {
                    const opt = document.createElement('option');
                    opt.value = e.name;
                    opt.textContent = e.name + ' (' + e.title + ')';
                    sel.appendChild(opt);
                });
                if (current) sel.value = current;
            }

            populate();

            // Re-filter when location changes
            if (locationSel) {
                locationSel.onchange = function() { populate(); };
            }
        });
    } catch(err) {
        console.error('Failed to load supervisors:', err);
    }
}

async function deleteDocument(id) {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    try {
        const res = await fetch(`/api/forms/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Delete failed');
        // Reload the profile docs
        const empId = document.getElementById('profileDocs').dataset.empId;
        if (empId) dirViewEmployee(parseInt(empId));
    } catch(err) {
        console.error('Delete document error:', err);
        alert('Failed to delete document.');
    }
}

// ==================== LOGS ====================
let loginLogsData = [];
let submissionLogsData = [];

function logsShowTab(tab) {
    document.getElementById('logs-login').style.display = tab === 'login' ? '' : 'none';
    document.getElementById('logs-submissions').style.display = tab === 'submissions' ? '' : 'none';
    document.querySelectorAll('.logs-tab').forEach((btn, i) => {
        btn.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'submissions'));
    });
}

function logsFmtDate(d) {
    if (!d) return '-';
    return new Date(d).toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' });
}

async function logsLoad() {
    await Promise.all([logsLoadLogin(), logsLoadSubmissions()]);
}

async function logsLoadLogin() {
    try {
        const res = await fetch('/api/logs/logins', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed');
        loginLogsData = await res.json();
        logsRenderLogin();
    } catch(err) {
        console.error('Login logs error:', err);
    }
}

async function logsLoadSubmissions() {
    try {
        const res = await fetch('/api/logs/submissions', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed');
        submissionLogsData = await res.json();
        logsRenderSubmissions();
    } catch(err) {
        console.error('Submission logs error:', err);
    }
}

function logsFilterLogin() {
    const q = document.getElementById('loginLogSearch').value.toLowerCase();
    const filtered = loginLogsData.filter(l =>
        (l.name||'').toLowerCase().includes(q) ||
        (l.email||'').toLowerCase().includes(q) ||
        (l.location||'').toLowerCase().includes(q)
    );
    logsRenderLogin(filtered);
}

function logsFilterSubmissions() {
    const q = document.getElementById('submissionLogSearch').value.toLowerCase();
    const filtered = submissionLogsData.filter(s =>
        (s.form_title||'').toLowerCase().includes(q) ||
        (s.employee_name||'').toLowerCase().includes(q) ||
        (s.submitted_by_name||'').toLowerCase().includes(q) ||
        (s.location||'').toLowerCase().includes(q)
    );
    logsRenderSubmissions(filtered);
}

function logsRenderLogin(data) {
    const rows = data || loginLogsData;
    const tbody = document.getElementById('loginLogsBody');
    const empty = document.getElementById('loginLogsEmpty');
    if (!rows.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    tbody.innerHTML = rows.map(l => `
        <tr>
            <td><div class="emp-name">${l.name || '-'}</div></td>
            <td class="emp-sub">${l.email || '-'}</td>
            <td class="emp-sub">${l.location || '-'}</td>
            <td class="emp-sub">${logsFmtDate(l.login_at)}</td>
            <td><span class="badge ${l.success ? 'badge-active' : 'badge-inactive'}">${l.success ? 'Success' : 'Failed'}</span></td>
        </tr>
    `).join('');
}

function logsRenderSubmissions(data) {
    const rows = data || submissionLogsData;
    const tbody = document.getElementById('submissionLogsBody');
    const empty = document.getElementById('submissionLogsEmpty');
    if (!rows.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    tbody.innerHTML = rows.map(s => `
        <tr>
            <td>
                ${s.pdf_filename
                    ? `<a href="/api/forms/pdf/${s.pdf_filename}" target="_blank" class="emp-name" style="color:#18181B;text-decoration:none;cursor:pointer;font-weight:500;">${s.form_title || s.form_type || '-'}</a>`
                    : `<div class="emp-name">${s.form_title || s.form_type || '-'}</div>`
                }
            </td>
            <td class="emp-sub">${s.employee_name || '-'}</td>
            <td class="emp-sub">${s.submitted_by_name || '-'}</td>
            <td class="emp-sub">${s.location || '-'}</td>
            <td class="emp-sub">${logsFmtDate(s.submission_date)}</td>
            <td><span class="badge badge-active">${s.status || 'submitted'}</span></td>
        </tr>
    `).join('');
}

function logsInit() { logsLoad(); }
