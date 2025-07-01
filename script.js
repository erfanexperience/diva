// Global variables
let isLoggedIn = false;
let currentScanData = null;

// DOM elements
const loginScreen = document.getElementById('loginScreen');
const mainApp = document.getElementById('mainApp');
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const sidebar = document.getElementById('sidebar');
const scannerInput = document.getElementById('scannerInput');
const clearBtn = document.getElementById('clearBtn');
const resultsSection = document.getElementById('resultsSection');
const historySection = document.getElementById('historySection');
const statusText = document.getElementById('statusText');
const loadingOverlay = document.getElementById('loadingOverlay');
const messageContainer = document.getElementById('messageContainer');

// Login credentials
const VALID_USERNAME = 'Hamid';
const VALID_PASSWORD = 'mayaeva3911';

// Set your Railway backend URL here
const API_BASE_URL = 'https://your-app.up.railway.app'; // TODO: Replace with your actual Railway URL

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Check if user is already logged in
    const savedLogin = localStorage.getItem('divaLogin');
    if (savedLogin) {
        const loginData = JSON.parse(savedLogin);
        if (loginData.isLoggedIn && loginData.timestamp > Date.now() - (24 * 60 * 60 * 1000)) {
            // Login is still valid (within 24 hours)
            login();
        }
    }

    // Set up event listeners
    setupEventListeners();
    
    // Focus on scanner input when app loads
    if (isLoggedIn) {
        setTimeout(() => {
            scannerInput.focus();
        }, 500);
    }
}

function setupEventListeners() {
    // Login form
    loginForm.addEventListener('submit', handleLogin);
    
    // Logout button
    logoutBtn.addEventListener('click', handleLogout);
    
    // Mobile menu toggle
    mobileMenuToggle.addEventListener('click', toggleMobileMenu);
    
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 1024 && 
            !sidebar.contains(e.target) && 
            !mobileMenuToggle.contains(e.target) &&
            sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            mobileMenuToggle.classList.remove('active');
        }
    });
    
    // Scanner input
    scannerInput.addEventListener('input', handleScannerInput);
    scannerInput.addEventListener('keydown', handleScannerKeydown);
    
    // Clear button
    clearBtn.addEventListener('click', clearScanner);
    
    // Action buttons
    document.getElementById('saveBtn').addEventListener('click', saveToDatabase);
    document.getElementById('printBtn').addEventListener('click', printReport);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    
    // Auto-focus on scanner input when app is active
    document.addEventListener('click', function() {
        if (isLoggedIn && document.activeElement !== scannerInput) {
            scannerInput.focus();
        }
    });
}

function handleLogin(e) {
    e.preventDefault();
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
        // Save login state
        localStorage.setItem('divaLogin', JSON.stringify({
            isLoggedIn: true,
            timestamp: Date.now()
        }));
        
        login();
    } else {
        loginError.textContent = 'Invalid username or password';
        loginError.style.display = 'block';
        showMessage('Login failed. Please check your credentials.', 'error');
    }
}

function login() {
    isLoggedIn = true;
    loginScreen.classList.add('hidden');
    mainApp.classList.remove('hidden');
    
    // Clear login form
    usernameInput.value = '';
    passwordInput.value = '';
    loginError.style.display = 'none';
    
    // Focus on scanner input
    setTimeout(() => {
        scannerInput.focus();
    }, 100);
}

function handleLogout() {
    isLoggedIn = false;
    localStorage.removeItem('divaLogin');
    mainApp.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    
    // Clear any displayed data
    clearScanner();
    resultsSection.classList.add('hidden');
    historySection.classList.add('hidden');
}

function toggleMobileMenu() {
    sidebar.classList.toggle('active');
    mobileMenuToggle.classList.toggle('active');
}

function handleNavigation(e) {
    e.preventDefault();
    
    const target = e.currentTarget;
    const section = target.getAttribute('data-section');
    
    // Update active navigation link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    target.classList.add('active');
    
    // Show/hide sections
    if (section === 'scanning') {
        resultsSection.classList.remove('hidden');
        historySection.classList.add('hidden');
        document.querySelector('.content-title').textContent = 'ID Scanning';
        
        // Focus on scanner input
        setTimeout(() => {
            scannerInput.focus();
        }, 100);
    } else if (section === 'history') {
        resultsSection.classList.add('hidden');
        historySection.classList.remove('hidden');
        document.querySelector('.content-title').textContent = 'Scan History';
    }
    
    // Close mobile menu
    if (window.innerWidth <= 1024) {
        sidebar.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
    }
}

function handleScannerInput(e) {
    const value = e.target.value;
    
    if (value.length > 0) {
        statusText.textContent = 'Processing scan data...';
        
        // Check if the input contains complete scan data
        if (value.includes('@ANSI') && (value.includes('DL') || value.includes('ID'))) {
            processScanData(value);
        }
    } else {
        statusText.textContent = 'Ready to scan';
    }
}

function handleScannerKeydown(e) {
    // Auto-submit when Enter is pressed and there's data
    if (e.key === 'Enter' && scannerInput.value.trim().length > 0) {
        e.preventDefault();
        processScanData(scannerInput.value);
    }
}

function processScanData(rawData) {
    showLoading(true);
    
    try {
        const parsedData = parseIDData(rawData);
        currentScanData = parsedData;
        
        displayResults(parsedData);
        
        // Auto-clear after a delay
        setTimeout(() => {
            clearScanner();
        }, 3000);
        
    } catch (error) {
        console.error('Error processing scan data:', error);
        showMessage('Error processing scan data. Please try again.', 'error');
        statusText.textContent = 'Error processing data';
    } finally {
        showLoading(false);
    }
}

function parseIDData(rawData) {
    const data = rawData.replace(/\s+/g, '');
    
    // Determine document type
    const isDL = data.includes('DL');
    const isID = data.includes('ID');
    
    if (!isDL && !isID) {
        throw new Error('Invalid document type');
    }
    
    const documentType = isDL ? 'Driving License' : 'Identification Card';
    
    // Extract document number
    let documentNumber = '';
    if (isDL) {
        const dlMatch = data.match(/DL([A-Z0-9]{7,})/);
        if (dlMatch) {
            documentNumber = dlMatch[1];
        }
    } else {
        const idMatch = data.match(/ID([A-Z0-9]{7,})/);
        if (idMatch) {
            documentNumber = idMatch[1];
        }
    }
    
    // Parse AAMVA standard fields
    const parsed = {
        documentType: documentType,
        documentNumber: documentNumber,
        fullName: extractField(data, 'DAC'),
        firstName: extractField(data, 'DDF'),
        middleName: extractField(data, 'DDG'),
        lastName: extractField(data, 'DCS'),
        dateOfBirth: parseDate(extractField(data, 'DBB')),
        expirationDate: parseDate(extractField(data, 'DBA')),
        issueDate: parseDate(extractField(data, 'DBD')),
        streetAddress: extractField(data, 'DAG'),
        city: extractField(data, 'DAI'),
        state: extractField(data, 'DAJ'),
        zipCode: extractField(data, 'DAK'),
        country: extractField(data, 'DCG'),
        gender: parseGender(extractField(data, 'DBC')),
        eyeColor: extractField(data, 'DAY'),
        hairColor: extractField(data, 'DAZ'),
        height: parseHeight(extractField(data, 'DAU')),
        weight: parseWeight(extractField(data, 'DAW')),
        organDonor: extractField(data, 'DDK') === '1' ? 'Yes' : 'No',
        veteranStatus: extractField(data, 'DDL') === '1' ? 'Yes' : 'No',
        race: parseRace(extractField(data, 'DCL')),
        placeOfBirth: extractField(data, 'DCI'),
        restrictions: extractField(data, 'DCF'),
        endorsements: extractField(data, 'DCA'),
        documentClass: extractField(data, 'DCA'),
        rawData: rawData
    };
    
    // Calculate age
    if (parsed.dateOfBirth) {
        parsed.age = calculateAge(parsed.dateOfBirth);
    }
    
    return parsed;
}

function extractField(data, fieldCode) {
    const regex = new RegExp(`${fieldCode}([^D]{1,50})`, 'i');
    const match = data.match(regex);
    return match ? match[1].trim() : '';
}

function parseDate(dateString) {
    if (!dateString || dateString.length !== 8) return '';
    
    const month = dateString.substring(0, 2);
    const day = dateString.substring(2, 4);
    const year = dateString.substring(4, 8);
    
    if (month && day && year) {
        return `${month}/${day}/${year}`;
    }
    
    return '';
}

function parseGender(genderCode) {
    const genderMap = {
        '1': 'Male',
        '2': 'Female',
        '9': 'Not specified'
    };
    return genderMap[genderCode] || genderCode;
}

function parseHeight(heightString) {
    if (!heightString) return '';
    
    // Height is typically in inches
    const inches = parseInt(heightString);
    if (inches) {
        const feet = Math.floor(inches / 12);
        const remainingInches = inches % 12;
        return `${feet}'${remainingInches}"`;
    }
    
    return heightString;
}

function parseWeight(weightString) {
    if (!weightString) return '';
    
    // Weight is typically in pounds
    const pounds = parseInt(weightString);
    if (pounds) {
        return `${pounds} lbs`;
    }
    
    return weightString;
}

function parseRace(raceCode) {
    const raceMap = {
        'A': 'Asian',
        'B': 'Black',
        'I': 'American Indian',
        'W': 'White',
        'U': 'Unknown'
    };
    return raceMap[raceCode] || raceCode;
}

function calculateAge(birthDate) {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

function displayResults(data) {
    // Update document type badge
    document.getElementById('documentType').textContent = data.documentType;
    
    // Personal Information
    document.getElementById('fullName').textContent = data.fullName || `${data.firstName} ${data.middleName} ${data.lastName}`.trim();
    document.getElementById('dateOfBirth').textContent = data.dateOfBirth || '-';
    document.getElementById('age').textContent = data.age ? `${data.age} years` : '-';
    document.getElementById('gender').textContent = data.gender || '-';
    document.getElementById('eyeColor').textContent = data.eyeColor || '-';
    document.getElementById('hairColor').textContent = data.hairColor || '-';
    document.getElementById('height').textContent = data.height || '-';
    document.getElementById('weight').textContent = data.weight || '-';
    
    // Document Information
    document.getElementById('documentNumber').textContent = data.documentNumber || '-';
    document.getElementById('issueDate').textContent = data.issueDate || '-';
    document.getElementById('expirationDate').textContent = data.expirationDate || '-';
    document.getElementById('documentClass').textContent = data.documentClass || '-';
    document.getElementById('restrictions').textContent = data.restrictions || 'None';
    document.getElementById('endorsements').textContent = data.endorsements || 'None';
    
    // Address Information
    document.getElementById('streetAddress').textContent = data.streetAddress || '-';
    document.getElementById('city').textContent = data.city || '-';
    document.getElementById('state').textContent = data.state || '-';
    document.getElementById('zipCode').textContent = data.zipCode || '-';
    document.getElementById('country').textContent = data.country || 'USA';
    
    // Additional Information
    document.getElementById('organDonor').textContent = data.organDonor || '-';
    document.getElementById('veteranStatus').textContent = data.veteranStatus || '-';
    document.getElementById('race').textContent = data.race || '-';
    document.getElementById('placeOfBirth').textContent = data.placeOfBirth || '-';
    
    // Show results section
    resultsSection.classList.remove('hidden');
    
    // Update status
    statusText.textContent = 'Data processed successfully';
}

function clearScanner() {
    scannerInput.value = '';
    resultsSection.classList.add('hidden');
    currentScanData = null;
    statusText.textContent = 'Ready to scan';
    scannerInput.focus();
}

async function saveToDatabase() {
    if (!currentScanData) {
        showMessage('No data to save. Please scan an ID first.', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        // Try to save to backend API first
        const response = await fetch(`${API_BASE_URL}/api/scans`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(currentScanData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Data saved successfully
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.warn('Backend not available, saving to localStorage:', error.message);
        
        // Fallback to localStorage if backend is not available
        const savedData = {
            ...currentScanData,
            timestamp: new Date().toISOString(),
            id: Date.now()
        };
        
        const savedScans = JSON.parse(localStorage.getItem('divaScans') || '[]');
        savedScans.push(savedData);
        localStorage.setItem('divaScans', JSON.stringify(savedScans));
        
        showMessage('Data saved to local storage (backend unavailable)', 'info');
    } finally {
        showLoading(false);
    }
}

function printReport() {
    if (!currentScanData) {
        showMessage('No data to print. Please scan an ID first.', 'error');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    const printContent = generatePrintContent(currentScanData);
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
    
    showMessage('Print dialog opened', 'info');
}

function generatePrintContent(data) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>ID Scan Report - ${data.documentType}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .section { margin-bottom: 20px; }
                .section h3 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 5px; }
                .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
                .label { font-weight: bold; }
                .timestamp { text-align: center; margin-top: 30px; color: #666; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Diva Security - ID Scan Report</h1>
                <p>Document Type: ${data.documentType}</p>
                <p>Scan Date: ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="section">
                <h3>Personal Information</h3>
                <div class="info-row">
                    <span class="label">Full Name:</span>
                    <span>${data.fullName || `${data.firstName} ${data.middleName} ${data.lastName}`.trim()}</span>
                </div>
                <div class="info-row">
                    <span class="label">Date of Birth:</span>
                    <span>${data.dateOfBirth || '-'}</span>
                </div>
                <div class="info-row">
                    <span class="label">Age:</span>
                    <span>${data.age ? `${data.age} years` : '-'}</span>
                </div>
                <div class="info-row">
                    <span class="label">Gender:</span>
                    <span>${data.gender || '-'}</span>
                </div>
            </div>
            
            <div class="section">
                <h3>Document Information</h3>
                <div class="info-row">
                    <span class="label">Document Number:</span>
                    <span>${data.documentNumber || '-'}</span>
                </div>
                <div class="info-row">
                    <span class="label">Issue Date:</span>
                    <span>${data.issueDate || '-'}</span>
                </div>
                <div class="info-row">
                    <span class="label">Expiration Date:</span>
                    <span>${data.expirationDate || '-'}</span>
                </div>
            </div>
            
            <div class="section">
                <h3>Address Information</h3>
                <div class="info-row">
                    <span class="label">Street Address:</span>
                    <span>${data.streetAddress || '-'}</span>
                </div>
                <div class="info-row">
                    <span class="label">City:</span>
                    <span>${data.city || '-'}</span>
                </div>
                <div class="info-row">
                    <span class="label">State:</span>
                    <span>${data.state || '-'}</span>
                </div>
                <div class="info-row">
                    <span class="label">ZIP Code:</span>
                    <span>${data.zipCode || '-'}</span>
                </div>
            </div>
            
            <div class="timestamp">
                <p>Report generated on ${new Date().toLocaleString()}</p>
            </div>
        </body>
        </html>
    `;
}

function exportData() {
    if (!currentScanData) {
        showMessage('No data to export. Please scan an ID first.', 'error');
        return;
    }
    
    const exportData = {
        ...currentScanData,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `id_scan_${currentScanData.documentNumber}_${Date.now()}.json`;
    link.click();
    
            // Data exported successfully
}

function showLoading(show) {
    if (show) {
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

function showMessage(message, type = 'info') {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    
    const icon = document.createElement('i');
    icon.className = type === 'success' ? 'fas fa-check-circle' : 
                    type === 'error' ? 'fas fa-exclamation-circle' : 
                    'fas fa-info-circle';
    
    const text = document.createElement('span');
    text.textContent = message;
    
    messageElement.appendChild(icon);
    messageElement.appendChild(text);
    
    messageContainer.appendChild(messageElement);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
        }
    }, 5000);
}

// Auto-focus on scanner input when window gains focus
window.addEventListener('focus', function() {
    if (isLoggedIn) {
        setTimeout(() => {
            scannerInput.focus();
        }, 100);
    }
});

// Prevent form submission on Enter key in scanner input
scannerInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && e.target === scannerInput) {
        e.preventDefault();
    }
}); 