// Employee Directory Variables
let allEmployees = [];
let currentUser = null;

// Fetch current user info for directory scope
async function fetchCurrentUserForDirectory() {
    try {
        const response = await fetch('/auth/current-user', { credentials: 'include' });
        currentUser = await response.json();
        updateDirectoryScope();
    } catch (error) {
        console.error('Error fetching current user:', error);
    }
}

// Update directory scope message
function updateDirectoryScope() {
    const scopeEl = document.getElementById('directoryScope');
    if (!scopeEl) return;
    
    if (!currentUser) {
        scopeEl.textContent = 'Loading...';
        return;
    }

    if (currentUser.is_admin) {
        scopeEl.textContent = 'Viewing all employees across all locations';
    } else if (currentUser.location) {
        scopeEl.textContent = `Viewing employees at ${currentUser.location}`;
    } else {
        scopeEl.textContent = 'Viewing your team';
    }
}

// Fetch employees from API
async function fetchEmployeesForDirectory() {
    try {
        const response = await fetch('/api/employees', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch employees');
        
        allEmployees = await response.json();
        renderEmployees(allEmployees);
    } catch (error) {
        console.error('Error fetching employees:', error);
        showEmployeesError('Failed to load employees');
    }
}

// Render employee cards
function renderEmployees(employees) {
    const container = document.getElementById('employeesGrid');
    if (!container) return;

    if (employees.length === 0) {
        container.innerHTML = \`
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <h3 style="font-family: 'Playfair Display', serif; font-size: 20px; color: #2C2C2C; margin-bottom: 8px;">No Employees Found</h3>
                <p style="color: #6B6560; font-size: 14px;">No employees match your search.</p>
            </div>
        \`;
        return;
    }

    container.innerHTML = employees.map(emp => \`
        <div class="employee-card" style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); transition: transform 0.2s, box-shadow 0.2s; cursor: pointer;" 
             onclick="viewEmployeeDetails(\${emp.id})"
             onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 4px 16px rgba(0,0,0,0.1)'"
             onmouseout="this.style.transform=''; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.05)'">
            <div style="font-family: 'Playfair Display', serif; font-size: 18px; color: #2C2C2C; margin-bottom: 4px; font-weight: 600;">
                \${emp.first_name} \${emp.last_name}
            </div>
            <div style="font-size: 13px; color: #C8866A; font-weight: 600; margin-bottom: 12px;">
                \${emp.title || 'N/A'}
            </div>
            \${emp.department ? \`<span style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; text-transform: uppercase; background: #E8C4B0; color: #8B4513;">\${emp.department}</span>\` : ''}
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #E8E0D8; display: flex; flex-direction: column; gap: 8px;">
                \${emp.location ? \`
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #6B6560;">
                        <svg style="width: 14px; height: 14px; color: #C8866A;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        \${emp.location}
                    </div>
                \` : ''}
                \${emp.email ? \`
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #6B6560;">
                        <svg style="width: 14px; height: 14px; color: #C8866A;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                        \${emp.email}
                    </div>
                \` : ''}
                \${emp.phone ? \`
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #6B6560;">
                        <svg style="width: 14px; height: 14px; color: #C8866A;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                        </svg>
                        \${emp.phone}
                    </div>
                \` : ''}
            </div>
        </div>
    \`).join('');
}

// Search employees
function searchEmployees() {
    const searchTerm = document.getElementById('employeeSearch').value.toLowerCase();
    
    const filtered = allEmployees.filter(emp => {
        const fullName = \`\${emp.first_name} \${emp.last_name}\`.toLowerCase();
        const title = (emp.title || '').toLowerCase();
        const department = (emp.department || '').toLowerCase();
        const location = (emp.location || '').toLowerCase();
        
        return fullName.includes(searchTerm) || 
               title.includes(searchTerm) || 
               department.includes(searchTerm) ||
               location.includes(searchTerm);
    });
    
    renderEmployees(filtered);
}

// View employee details
function viewEmployeeDetails(id) {
    const employee = allEmployees.find(e => e.id === id);
    if (!employee) return;

    alert(\`\${employee.first_name} \${employee.last_name}

Title: \${employee.title || 'N/A'}
Department: \${employee.department || 'N/A'}
Location: \${employee.location || 'N/A'}
Email: \${employee.email || 'N/A'}
Phone: \${employee.phone || 'N/A'}\`);
}

// Show error in employees grid
function showEmployeesError(message) {
    const container = document.getElementById('employeesGrid');
    if (!container) return;
    
    container.innerHTML = \`
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            <h3 style="font-family: 'Playfair Display', serif; font-size: 20px; color: #2C2C2C; margin-bottom: 8px;">Error</h3>
            <p style="color: #6B6560; font-size: 14px;">\${message}</p>
        </div>
    \`;
}

// Update the existing showPanel function to load employees when directory panel is shown
const originalShowPanel = window.showPanel || function() {};
window.showPanel = function(panelName) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('panel-' + panelName);
    if (panel) panel.classList.add('active');
    const titles = { home: 'Dashboard', forms: 'Forms', announcements: 'Announcements', directory: 'Employee Directory', reports: 'Reports & Analytics', settings: 'Settings' };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titles[panelName] || panelName;
    if (panelName === 'directory' && allEmployees.length === 0) {
        fetchCurrentUserForDirectory();
        fetchEmployeesForDirectory();
    }
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
};

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('employeeSearch');
    if (searchInput) searchInput.addEventListener('input', searchEmployees);
});
