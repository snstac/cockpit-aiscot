// Configuration
const SERVICE_NAME = 'aiscot'; // Change this to your service name
const CONFIG_FILE = `/etc/default/${SERVICE_NAME}`;

let originalContent = '';
let environmentVars = new Map();
let fileStructure = []; // Preserves original file structure including comments
let statusUpdateInterval = null;
let logFollowProcess = null;

// Environment variable definitions for validation and UI hints
const ENV_VAR_DEFINITIONS = {
    'ENABLED': {
        type: 'boolean',
        description: 'Enable or disable the service',
        defaultValue: 'true',
        validation: /^(true|false|yes|no|1|0)$/i
    },
    'COT_URL': {
        type: 'string',
        description: 'URL of the CoT destination, typically Mesh SA or TAK Server.',
        defaultValue: 'udp+wo://239.2.3.1:6969',
        // validation: /^(https?:\/\/)?([\w.-]+)(:\d+)?(\/.*)?$/,
        requiresQuoting: true
    },
    'PORT': {
        type: 'number',
        description: 'Port number for the service to listen on',
        defaultValue: '8080',
        validation: /^\d{1,5}$/,
        range: [1, 65535]
    },
    'BIND_ADDRESS': {
        type: 'string',
        description: 'IP address to bind to',
        defaultValue: '0.0.0.0',
        validation: /^(\d{1,3}\.){3}\d{1,3}$/
    },
    'LOG_LEVEL': {
        type: 'enum',
        description: 'Logging level',
        defaultValue: 'INFO',
        options: ['DEBUG', 'INFO', 'WARN', 'ERROR'],
        validation: /^(DEBUG|INFO|WARN|ERROR)$/i
    },
    'MAX_CONNECTIONS': {
        type: 'number',
        description: 'Maximum concurrent connections',
        defaultValue: '100',
        validation: /^\d+$/,
        range: [1, 10000]
    },
    'CONFIG_DIR': {
        type: 'path',
        description: 'Configuration directory path',
        defaultValue: '/etc/aiscot',
        validation: /^\/[\w\-\/]*$/
    },
    'DATA_DIR': {
        type: 'path',
        description: 'Data storage directory',
        defaultValue: '/var/lib/aiscot',
        validation: /^\/[\w\-\/]*$/
    },
    'USER': {
        type: 'string',
        description: 'User to run as',
        defaultValue: 'aiscot',
        validation: /^[a-zA-Z_][a-zA-Z0-9_-]*$/
    },
    'EXTRA_ARGS': {
        type: 'string',
        description: 'Additional command line arguments',
        defaultValue: '',
        requiresQuoting: true
    }
};

function init() {
    document.getElementById('service-display-name').textContent = SERVICE_NAME;
    document.getElementById('config-file-path').textContent = CONFIG_FILE;
    
    // Set up event listeners for configuration buttons
    document.getElementById('reload-config-btn').addEventListener('click', loadEnvironmentFile);
    document.getElementById('save-restart-btn').addEventListener('click', saveAndRestart);
    document.getElementById('save-reload-btn').addEventListener('click', saveAndReload);
    document.getElementById('test-env-btn').addEventListener('click', testEnvironment);
    document.getElementById('add-variable-btn').addEventListener('click', addNewVariable);
    document.getElementById('refresh-preview-btn').addEventListener('click', updatePreview);
    document.getElementById('validate-syntax-btn').addEventListener('click', validateSyntax);
    
    // Set up event listeners for service control buttons
    document.getElementById('start-service-btn').addEventListener('click', () => serviceAction('start'));
    document.getElementById('stop-service-btn').addEventListener('click', () => serviceAction('stop'));
    document.getElementById('restart-service-btn').addEventListener('click', () => serviceAction('restart'));
    document.getElementById('reload-service-btn').addEventListener('click', () => serviceAction('reload'));
    document.getElementById('enable-service-btn').addEventListener('click', () => serviceAction('enable'));
    document.getElementById('disable-service-btn').addEventListener('click', () => serviceAction('disable'));
    document.getElementById('refresh-status-btn').addEventListener('click', updateServiceStatus);
    
    // Set up event listeners for log controls
    document.getElementById('show-logs-btn').addEventListener('click', showServiceLogs);
    document.getElementById('follow-logs-btn').addEventListener('click', followServiceLogs);
    document.getElementById('stop-logs-btn').addEventListener('click', stopFollowingLogs);
    
    // Set up event listeners for checkboxes
    document.getElementById('auto-quote').addEventListener('change', updatePreview);
    document.getElementById('preserve-comments').addEventListener('change', updatePreview);
    
    // Initialize service status and start periodic updates
    updateServiceStatus();
    startStatusUpdates();
    
    loadEnvironmentFile();
}

function showStatus(message, type = 'success') {
    const statusDiv = document.getElementById('status-message');
    statusDiv.innerHTML = `<div class="status-message status-${type}">${message}</div>`;
    setTimeout(() => statusDiv.innerHTML = '', 5000);
}

function loadEnvironmentFile() {
    cockpit.file(CONFIG_FILE).read()
        .then(content => {
            originalContent = content;
            parseEnvironmentFile(content);
            renderEnvironmentVariables();
            updatePreview();
            showStatus('Environment file loaded successfully');
        })
        .catch(error => {
            showStatus(`Failed to load environment file: ${error.message}`, 'error');
            if (error.message.includes('No such file')) {
                // Create template file
                originalContent = generateTemplateFile();
                parseEnvironmentFile(originalContent);
                renderEnvironmentVariables();
                updatePreview();
            }
        });
}

function generateTemplateFile() {
    return `# Environment configuration for ${SERVICE_NAME}
# This file is sourced by the service startup script
# Variables defined here become environment variables for the service

# Basic configuration
#ENABLED=true
#PORT=8080
#BIND_ADDRESS=0.0.0.0

# Logging
#LOG_LEVEL=INFO

# Paths
#CONFIG_DIR=/etc/${SERVICE_NAME}
#DATA_DIR=/var/lib/${SERVICE_NAME}

# User configuration
#USER=${SERVICE_NAME}

# Additional options
#EXTRA_ARGS=""
`;
}

function parseEnvironmentFile(content) {
    environmentVars.clear();
    fileStructure = [];
    
    // Handle null or undefined content
    if (!content) {
        content = '';
    }
    
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
        const trimmed = line.trim();
        
        if (trimmed === '' || trimmed.startsWith('#')) {
            // Preserve comments and empty lines
            fileStructure.push({
                type: 'comment',
                content: line,
                lineNumber: index + 1
            });
        } else if (trimmed.includes('=')) {
            // Parse variable assignment
            const result = parseShellAssignment(line);
            if (result) {
                environmentVars.set(result.name, {
                    value: result.value,
                    quoted: result.quoted,
                    quoteStyle: result.quoteStyle,
                    originalLine: line,
                    lineNumber: index + 1,
                    commented: line.trim().startsWith('#')
                });
                
                fileStructure.push({
                    type: 'variable',
                    name: result.name,
                    lineNumber: index + 1
                });
            }
        }
    });
}

function parseShellAssignment(line) {
    // Handle commented lines
    let actualLine = line;
    let isCommented = false;
    if (line.trim().startsWith('#')) {
        actualLine = line.replace(/^\s*#\s*/, '');
        isCommented = true;
    }
    
    // Parse VAR=value with various quoting styles
    const match = actualLine.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match) return null;
    
    const [, name, valueWithQuotes] = match;
    let value = valueWithQuotes;
    let quoted = false;
    let quoteStyle = 'none';
    
    // Handle different quote styles
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
        value = value.slice(1, -1);
        quoted = true;
        quoteStyle = 'double';
        // Handle escaped characters in double quotes
        value = value.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    } else if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
        value = value.slice(1, -1);
        quoted = true;
        quoteStyle = 'single';
    }
    
    return { name, value, quoted, quoteStyle, commented: isCommented };
}

function renderEnvironmentVariables() {
    const container = document.getElementById('env-variables');
    container.innerHTML = '';
    
    // Render existing variables
    environmentVars.forEach((varData, name) => {
        container.appendChild(createEnvironmentVariableItem(name, varData));
    });
    
    // Add suggested variables that aren't set
    Object.keys(ENV_VAR_DEFINITIONS).forEach(name => {
        if (!environmentVars.has(name)) {
            const definition = ENV_VAR_DEFINITIONS[name];
            container.appendChild(createEnvironmentVariableItem(name, {
                value: '',
                quoted: false,
                quoteStyle: 'none',
                originalLine: '',
                lineNumber: 0,
                commented: true,
                suggested: true
            }));
        }
    });
}

function createEnvironmentVariableItem(name, varData) {
    const div = document.createElement('div');
    div.className = `env-var-item ${varData.commented ? 'commented' : ''}`;
    div.id = `env-var-${name}`;
    div.dataset.varName = name;
    
    const definition = ENV_VAR_DEFINITIONS[name] || { 
        type: 'string', 
        description: 'Custom environment variable' 
    };
    
    const isValid = validateVariableValue(name, varData.value);
    
    div.innerHTML = `
        <div class="env-var-header">
            <span class="env-var-name">${name}</span>
            <div class="env-var-controls">
                <label>
                    <input type="checkbox" class="enable-checkbox" ${varData.commented ? '' : 'checked'}> Enabled
                </label>
                <select class="quote-style-select">
                    <option value="none" ${varData.quoteStyle === 'none' ? 'selected' : ''}>No quotes</option>
                    <option value="double" ${varData.quoteStyle === 'double' ? 'selected' : ''}>Double quotes</option>
                    <option value="single" ${varData.quoteStyle === 'single' ? 'selected' : ''}>Single quotes</option>
                </select>
                <button class="btn-danger btn-small remove-var-btn">Remove</button>
            </div>
        </div>
        <input type="text" class="env-var-input" value="${escapeHtml(varData.value)}" 
               placeholder="${definition.defaultValue || 'Enter value'}">
        <div class="env-var-description">${definition.description}</div>
        ${varData.originalLine ? `<div class="env-var-original">Original: ${escapeHtml(varData.originalLine)}</div>` : ''}
        <div class="shell-validation ${isValid ? 'shell-valid' : 'shell-invalid'}">
            ${isValid ? '✓ Valid' : '✗ Invalid value for this variable type'}
        </div>
    `;
    
    // Add event listeners for this item
    const enableCheckbox = div.querySelector('.enable-checkbox');
    const quoteSelect = div.querySelector('.quote-style-select');
    const removeBtn = div.querySelector('.remove-var-btn');
    const valueInput = div.querySelector('.env-var-input');
    
    enableCheckbox.addEventListener('change', () => toggleVariableEnabled(name));
    quoteSelect.addEventListener('change', (e) => changeQuoteStyle(name, e.target.value));
    removeBtn.addEventListener('click', () => removeVariable(name));
    valueInput.addEventListener('input', (e) => updateVariableValue(name, e.target.value));
    
    return div;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function validateVariableValue(name, value) {
    const definition = ENV_VAR_DEFINITIONS[name];
    if (!definition || !definition.validation) return true;
    
    if (value === '') return true; // Empty values are generally OK
    
    const isValid = definition.validation.test(value);
    
    // Additional range checking for numbers
    if (isValid && definition.range && definition.type === 'number') {
        const num = parseInt(value, 10);
        return num >= definition.range[0] && num <= definition.range[1];
    }
    
    return isValid;
}

function updateVariableValue(name, value) {
    if (environmentVars.has(name)) {
        const varData = environmentVars.get(name);
        varData.value = value;
        environmentVars.set(name, varData);
    } else {
        environmentVars.set(name, {
            value: value,
            quoted: false,
            quoteStyle: 'none',
            commented: false
        });
    }
    
    document.getElementById(`env-var-${name}`).classList.add('modified');
    updateValidation(name);
    updatePreview();
}

function updateValidation(name) {
    const item = document.getElementById(`env-var-${name}`);
    const varData = environmentVars.get(name);
    const isValid = validateVariableValue(name, varData.value);
    
    const validationDiv = item.querySelector('.shell-validation');
    validationDiv.className = `shell-validation ${isValid ? 'shell-valid' : 'shell-invalid'}`;
    validationDiv.textContent = isValid ? '✓ Valid' : '✗ Invalid value for this variable type';
}

function toggleVariableEnabled(name) {
    const varData = environmentVars.get(name);
    if (varData) {
        varData.commented = !varData.commented;
        environmentVars.set(name, varData);
        
        const item = document.getElementById(`env-var-${name}`);
        item.classList.toggle('commented', varData.commented);
        item.classList.add('modified');
        updatePreview();
    }
}

function changeQuoteStyle(name, style) {
    const varData = environmentVars.get(name);
    if (varData) {
        varData.quoteStyle = style;
        varData.quoted = style !== 'none';
        environmentVars.set(name, varData);
        
        document.getElementById(`env-var-${name}`).classList.add('modified');
        updatePreview();
    }
}

function removeVariable(name) {
    if (confirm(`Remove variable ${name}?`)) {
        environmentVars.delete(name);
        document.getElementById(`env-var-${name}`).remove();
        updatePreview();
    }
}

function addNewVariable() {
    const nameInput = document.getElementById('new-var-name');
    const valueInput = document.getElementById('new-var-value');
    
    const name = nameInput.value.trim().toUpperCase();
    const value = valueInput.value.trim();
    
    if (!name) {
        alert('Please enter a variable name');
        return;
    }
    
    if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) {
        alert('Variable name must start with a letter or underscore and contain only letters, numbers, and underscores');
        return;
    }
    
    if (environmentVars.has(name)) {
        alert('Variable already exists');
        return;
    }
    
    environmentVars.set(name, {
        value: value,
        quoted: document.getElementById('auto-quote').checked && value.includes(' '),
        quoteStyle: (document.getElementById('auto-quote').checked && value.includes(' ')) ? 'double' : 'none',
        commented: false
    });
    
    nameInput.value = '';
    valueInput.value = '';
    
    renderEnvironmentVariables();
    updatePreview();
}

function updatePreview() {
    const content = generateEnvironmentFile();
    document.getElementById('shell-preview').textContent = content;
}

function generateEnvironmentFile() {
    const lines = [];
    const preserveComments = document.getElementById('preserve-comments').checked;
    
    if (preserveComments && fileStructure.length > 0) {
        // Preserve original structure
        fileStructure.forEach(item => {
            if (item.type === 'comment') {
                lines.push(item.content);
            } else if (item.type === 'variable') {
                const varData = environmentVars.get(item.name);
                if (varData) {
                    lines.push(generateVariableLine(item.name, varData));
                }
            }
        });
        
        // Add new variables at the end
        environmentVars.forEach((varData, name) => {
            const existsInStructure = fileStructure.some(item => 
                item.type === 'variable' && item.name === name
            );
            if (!existsInStructure) {
                lines.push(generateVariableLine(name, varData));
            }
        });
    } else {
        // Generate fresh file
        lines.push(`# Environment configuration for ${SERVICE_NAME}`);
        lines.push('# This file is sourced by the service startup script');
        lines.push('');
        
        environmentVars.forEach((varData, name) => {
            const definition = ENV_VAR_DEFINITIONS[name];
            if (definition) {
                lines.push(`# ${definition.description}`);
            }
            lines.push(generateVariableLine(name, varData));
            lines.push('');
        });
    }
    
    return lines.join('\n');
}

function generateVariableLine(name, varData) {
    let value = varData.value;
    let line = '';
    
    if (varData.commented) {
        line += '#';
    }
    
    // Handle quoting
    if (varData.quoteStyle === 'double') {
        value = '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    } else if (varData.quoteStyle === 'single') {
        value = "'" + value + "'";
    } else if (document.getElementById('auto-quote').checked && value.includes(' ')) {
        value = '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    }
    
    line += `${name}=${value}`;
    return line;
}

function validateSyntax() {
    const content = generateEnvironmentFile();
    
    // Test shell syntax by trying to source it
    cockpit.spawn(['bash', '-n'], { input: content })
        .then(() => {
            showStatus('Shell syntax is valid ✓', 'success');
        })
        .catch(error => {
            showStatus(`Shell syntax error: ${error.message}`, 'error');
        });
}

function testEnvironment() {
    const content = generateEnvironmentFile();
    
    // Create a test script that sources the file and prints all variables
    const testScript = `#!/bin/bash
set -a  # Export all variables
source /dev/stdin
env | grep -E '^[A-Z_][A-Z0-9_]*=' | sort
`;
    
    cockpit.spawn(['bash'], { input: testScript + '\n' + content })
        .then(output => {
            document.getElementById('env-test-output').textContent = 
                'Environment variables that would be set:\n\n' + output;
        })
        .catch(error => {
            document.getElementById('env-test-output').textContent = 
                'Error testing environment: ' + error.message;
        });
}

// Service Control Functions
function updateServiceStatus() {
    const serviceName = SERVICE_NAME.endsWith('.service') ? SERVICE_NAME : SERVICE_NAME + '.service';
    
    cockpit.spawn(['systemctl', 'show', serviceName, 
        '--property=ActiveState,LoadState,UnitFileState,MainPID,MemoryCurrent,ExecMainStartTimestamp'])
        .then(output => {
            const properties = {};
            output.split('\n').forEach(line => {
                const [key, value] = line.split('=');
                if (key && value !== undefined) {
                    properties[key] = value;
                }
            });
            
            updateStatusDisplay(properties);
        })
        .catch(error => {
            showStatus(`Failed to get service status: ${error.message}`, 'error');
        });
}

function updateStatusDisplay(properties) {
    // Update active state
    const activeState = properties.ActiveState || 'unknown';
    const activeElement = document.getElementById('service-active-state');
    activeElement.textContent = activeState;
    activeElement.className = 'status-value';
    
    if (activeState === 'active') {
        activeElement.classList.add('status-active');
    } else if (activeState === 'inactive') {
        activeElement.classList.add('status-inactive');
    } else if (activeState === 'failed') {
        activeElement.classList.add('status-failed');
    }
    
    // Update load state
    const loadState = properties.LoadState || 'unknown';
    document.getElementById('service-load-state').textContent = loadState;
    
    // Update enabled state
    const unitFileState = properties.UnitFileState || 'unknown';
    const enabledElement = document.getElementById('service-enabled');
    enabledElement.textContent = unitFileState;
    enabledElement.className = 'status-value';
    
    if (unitFileState === 'enabled') {
        enabledElement.classList.add('status-enabled');
    } else if (unitFileState === 'disabled') {
        enabledElement.classList.add('status-disabled');
    }
    
    // Update main PID
    const mainPID = properties.MainPID || '0';
    document.getElementById('service-main-pid').textContent = mainPID === '0' ? 'Not running' : mainPID;
    
    // Update memory usage
    const memoryCurrent = properties.MemoryCurrent;
    if (memoryCurrent && memoryCurrent !== '18446744073709551615') {
        const memoryMB = Math.round(parseInt(memoryCurrent) / 1024 / 1024);
        document.getElementById('service-memory').textContent = memoryMB + ' MB';
    } else {
        document.getElementById('service-memory').textContent = 'N/A';
    }
    
    // Update uptime
    const startTimestamp = properties.ExecMainStartTimestamp;
    if (startTimestamp && startTimestamp !== '0' && activeState === 'active') {
        const startTime = new Date(parseInt(startTimestamp) / 1000);
        const uptime = formatUptime(Date.now() - startTime.getTime());
        document.getElementById('service-uptime').textContent = uptime;
    } else {
        document.getElementById('service-uptime').textContent = 'Not running';
    }
    
    // Update button states
    updateControlButtonStates(activeState, unitFileState);
}

function formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

function updateControlButtonStates(activeState, unitFileState) {
    const startBtn = document.getElementById('start-service-btn');
    const stopBtn = document.getElementById('stop-service-btn');
    const restartBtn = document.getElementById('restart-service-btn');
    const reloadBtn = document.getElementById('reload-service-btn');
    const enableBtn = document.getElementById('enable-service-btn');
    const disableBtn = document.getElementById('disable-service-btn');
    
    // Enable/disable buttons based on current state
    startBtn.disabled = activeState === 'active';
    stopBtn.disabled = activeState !== 'active';
    restartBtn.disabled = false;
    reloadBtn.disabled = activeState !== 'active';
    enableBtn.disabled = unitFileState === 'enabled';
    disableBtn.disabled = unitFileState === 'disabled';
}

function serviceAction(action) {
    const serviceName = SERVICE_NAME.endsWith('.service') ? SERVICE_NAME : SERVICE_NAME + '.service';
    const button = document.querySelector(`#${action}-service-btn`);
    
    if (button) {
        button.disabled = true;
        button.textContent = 'Working...';
    }
    
    let command;
    let requiresSudo = true;
    
    switch(action) {
        case 'start':
            command = ['systemctl', 'start', serviceName];
            break;
        case 'stop':
            command = ['systemctl', 'stop', serviceName];
            break;
        case 'restart':
            command = ['systemctl', 'restart', serviceName];
            break;
        case 'reload':
            command = ['systemctl', 'reload', serviceName];
            break;
        case 'enable':
            command = ['systemctl', 'enable', serviceName];
            break;
        case 'disable':
            command = ['systemctl', 'disable', serviceName];
            break;
        default:
            showStatus(`Unknown action: ${action}`, 'error');
            return;
    }
    
    cockpit.spawn(command, { superuser: requiresSudo ? 'require' : 'try' })
        .then(() => {
            showStatus(`Service ${action} completed successfully`, 'success');
            // Wait a moment for the service state to update, then refresh
            setTimeout(updateServiceStatus, 1000);
        })
        .catch(error => {
            showStatus(`Failed to ${action} service: ${error.message}`, 'error');
        })
        .finally(() => {
            if (button) {
                button.disabled = false;
                button.textContent = action.charAt(0).toUpperCase() + action.slice(1);
            }
        });
}

function startStatusUpdates() {
    // Update service status every 5 seconds
    if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
    }
    statusUpdateInterval = setInterval(updateServiceStatus, 5000);
}

function stopStatusUpdates() {
    if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
        statusUpdateInterval = null;
    }
}

function showServiceLogs() {
    const lines = document.getElementById('log-lines-select').value;
    const serviceName = SERVICE_NAME.endsWith('.service') ? SERVICE_NAME : SERVICE_NAME + '.service';
    
    cockpit.spawn(['journalctl', '-u', serviceName, '-n', lines, '--no-pager'])
        .then(output => {
            document.getElementById('service-logs').classList.remove('hidden');
            document.getElementById('log-content').textContent = output || 'No logs found';
        })
        .catch(error => {
            document.getElementById('service-logs').classList.remove('hidden');
            document.getElementById('log-content').textContent = 'Error loading logs: ' + error.message;
        });
}

function followServiceLogs() {
    const serviceName = SERVICE_NAME.endsWith('.service') ? SERVICE_NAME : SERVICE_NAME + '.service';
    
    // Stop any existing log following
    stopFollowingLogs();
    
    document.getElementById('service-logs').classList.remove('hidden');
    document.getElementById('log-content').textContent = 'Following logs...\n';
    document.getElementById('follow-logs-btn').classList.add('hidden');
    document.getElementById('stop-logs-btn').classList.remove('hidden');
    document.getElementById('log-content').classList.add('log-following');
    
    // Start following logs
    logFollowProcess = cockpit.spawn(['journalctl', '-u', serviceName, '-f', '--no-pager'], {
        err: 'out'
    });
    
    logFollowProcess.stream(data => {
        const logContent = document.getElementById('log-content');
        logContent.textContent += data;
        // Auto-scroll to bottom
        logContent.scrollTop = logContent.scrollHeight;
    });
    
    logFollowProcess.then(() => {
        // Process ended
        stopFollowingLogs();
    }).catch(error => {
        document.getElementById('log-content').textContent += '\nError following logs: ' + error.message;
        stopFollowingLogs();
    });
}

function stopFollowingLogs() {
    if (logFollowProcess) {
        logFollowProcess.close();
        logFollowProcess = null;
    }
    
    document.getElementById('follow-logs-btn').classList.remove('hidden');
    document.getElementById('stop-logs-btn').classList.add('hidden');
    document.getElementById('log-content').classList.remove('log-following');
}

function saveAndRestart() {
    saveEnvironmentFile().then(() => {
        return cockpit.spawn(['systemctl', 'restart', SERVICE_NAME], { superuser: 'require' });
    }).then(() => {
        showStatus('Environment saved and service restarted successfully');
    }).catch(error => {
        showStatus(`Failed to restart service: ${error.message}`, 'error');
    });
}

function saveAndReload() {
    saveEnvironmentFile().then(() => {
        return cockpit.spawn(['systemctl', 'reload', SERVICE_NAME], { superuser: 'require' });
    }).then(() => {
        showStatus('Environment saved and service reloaded successfully');
    }).catch(error => {
        showStatus(`Failed to reload service: ${error.message}`, 'error');
    });
}

function saveEnvironmentFile() {
    const content = generateEnvironmentFile();
    
    if (document.getElementById('validate-shell').checked) {
        return cockpit.spawn(['bash', '-n'], { input: content })
            .then(() => {
                return cockpit.file(CONFIG_FILE, { superuser: 'require' }).replace(content);
            })
            .then(() => {
                originalContent = content;
                showStatus('Environment file saved successfully');
                // Clear modification markers
                document.querySelectorAll('.env-var-item.modified').forEach(item => {
                    item.classList.remove('modified');
                });
            });
    } else {
        return cockpit.file(CONFIG_FILE, { superuser: 'require' }).replace(content)
            .then(() => {
                originalContent = content;
                showStatus('Environment file saved successfully');
            });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// Cleanup when page is unloaded
window.addEventListener('beforeunload', () => {
    stopStatusUpdates();
    stopFollowingLogs();
});
