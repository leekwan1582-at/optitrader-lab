// --- Navigation Logic ---
function navigate(targetId, navElement = null) {
    // Hide all screens
    document.querySelectorAll('.screen-section').forEach(section => {
        section.classList.add('d-none');
    });
    
    // Show target screen
    document.getElementById(targetId).classList.remove('d-none');

    // Update active nav link
    if (navElement) {
        document.querySelectorAll('.nav-link-custom').forEach(link => link.classList.remove('active'));
        navElement.classList.add('active');
    }

    // Render charts if navigating to them
    if (targetId === 'screen-4') {
        renderEquityChart();
    } else if (targetId === 'screen-5') {
        renderCompareChart();
    }
}

// --- Mock AI Parsing Logic ---
function parseAI() {
    const btn = document.getElementById('parseBtn');
    const originalText = btn.innerHTML;
    
    // Simulate loading state
    btn.innerHTML = '<span class="spinner-border spinner-border-custom me-2" role="status" aria-hidden="true"></span> Parsing...';
    btn.disabled = true;

    setTimeout(() => {
        // Mock update of values based on prompt
        document.getElementById('estCombos').innerText = "ESTIMATED COMBINATIONS: 54 / 500 cap";
        
        // Restore button
        btn.innerHTML = originalText;
        btn.disabled = false;

        // Optional: Flash effect to show update
        const panel = document.querySelector('#screen-2 .panel:last-child');
        panel.style.borderColor = 'var(--accent-cyan)';
        setTimeout(() => {
            panel.style.borderColor = 'var(--border-color)';
        }, 500);

    }, 1500);
}

// --- ApexCharts Configuration ---
let equityChartInstance = null;
let compareChartInstance = null;

const chartBaseOptions = {
    chart: {
        type: 'area',
        height: 350,
        toolbar: { show: false },
        background: 'transparent',
        animations: { enabled: true }
    },
    theme: { mode: 'dark' },
    grid: {
        borderColor: '#2a3447',
        strokeDashArray: 4,
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: true } }
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'straight', width: 2 },
    xaxis: {
        labels: { style: { colors: '#94a3b8' } },
        axisBorder: { show: false },
        axisTicks: { show: false }
    },
    yaxis: {
        labels: { 
            style: { colors: '#94a3b8' },
            formatter: (val) => { return "$" + val.toFixed(0); }
        }
    }
};

async function loadDashboardData() {
    try {
        // Fetch the local JSON file
        const response = await fetch('mockData.json');
        const data = await response.json();
        
        // Example: Populate Screen 1 Table (Assuming you gave the tbody an ID)
        // ... logic to inject data.recentRuns into the table ...

        // Example: Update Chart on Screen 4
        renderEquityChart(data.runResults.chartData);
    } catch (error) {
        console.error("Error loading mock data:", error);
    }
}


function renderCompareChart() {
    if (compareChartInstance) return;

    const options = {
        ...chartBaseOptions,
        chart: {
            ...chartBaseOptions.chart,
            type: 'line'
        },
        series: [
            { name: 'Run A (SMA Sweep)', data: [100, 105, 102, 110, 115, 114, 120, 125, 123, 130, 135] },
            { name: 'Run B (EMA Momentum)', data: [100, 102, 101, 105, 108, 107, 112, 115, 114, 118, 122] }
        ],
        colors: ['#00d2ff', '#ffb020'],
        stroke: { curve: 'smooth', width: 2 },
        legend: {
            position: 'top',
            horizontalAlign: 'right',
            labels: { colors: '#94a3b8' }
        },
        fill: { type: 'solid', opacity: 1 }
    };

    compareChartInstance = new ApexCharts(document.querySelector("#compareChart"), options);
    compareChartInstance.render();
}

// Initialize first screen on load
document.addEventListener('DOMContentLoaded', loadDashboardData);
