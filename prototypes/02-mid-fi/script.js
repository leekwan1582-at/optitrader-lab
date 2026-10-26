/* ==========================================================
   APP STATE
========================================================== */

const AppState = {
    data: null,
    currentRun: null,
    equityChart: null,
    compareChart: null
};

/* ==========================================================
   INITIALIZATION
========================================================== */

document.addEventListener("DOMContentLoaded", async () => {

    await loadMockData();

    navigate("screen-0");

});

/* ==========================================================
   LOAD MOCK DATA
========================================================== */

async function loadMockData() {

    try {

        const response =
            await fetch("mockData.json");

        AppState.data =
            await response.json();

        renderDashboard();

        renderResults();

        renderExperimentLog();

    } catch (error) {

        console.error(
            "Failed to load mock data",
            error
        );

        if (typeof Swal !== "undefined") {

            Swal.fire({
                icon: "error",
                title: "Load Error",
                text: "Unable to load mockData.json"
            });

        }

    }

}

/* ==========================================================
   NAVIGATION
========================================================== */

function navigate(screenId, navElement = null) {

    document
        .querySelectorAll(".screen-section")
        .forEach(section => {
            section.classList.add("d-none");
        });

    const target =
        document.getElementById(screenId);

    if (!target) {

        console.error(
            `Screen '${screenId}' not found`
        );

        return;
    }

    target.classList.remove("d-none");

    if (navElement) {

        document
            .querySelectorAll(".nav-link-custom")
            .forEach(link => {

                link.classList.remove("active");

            });

        navElement.classList.add("active");

    }

    if (screenId === "screen-4") {
        renderResults();
    }

    if (screenId === "screen-5") {
        renderComparisonChart();
        renderExperimentLog();
    }

}

/* ==========================================================
   LOGIN
========================================================== */

function login() {

    const email =
        document
        .getElementById("email")
        .value
        .trim();

    if (!email) {

        Swal.fire({
            icon: "warning",
            title: "Email Required",
            text: "Enter your email address."
        });

        return;
    }

    Swal.fire({
        icon: "success",
        title: "Login Successful",
        text: "Welcome to OptiTrader Lab",
        timer: 1500,
        showConfirmButton: false
    });

    setTimeout(() => {

        navigate("screen-1");

    }, 1200);

}

/* ==========================================================
   AI ASSISTANT
========================================================== */

function parseAI() {

    const button =
        document.getElementById("parseBtn");

    const originalText =
        button.innerHTML;

    button.disabled = true;

    button.innerHTML = `
        <span
            class="spinner-border spinner-border-sm me-2">
        </span>
        Parsing...
    `;

    setTimeout(() => {

        button.disabled = false;

        button.innerHTML =
            originalText;

        Swal.fire({
            icon: "success",
            title: "Parameters Parsed",
            text: "54 combinations generated."
        });

    }, 1500);

}

/* ==========================================================
   DATASET
========================================================== */

function uploadDataset() {

    Swal.fire({
        icon: "success",
        title: "Mock Upload",
        text: "Dataset validated successfully."
    });

}

/* ==========================================================
   DASHBOARD
========================================================== */

function renderDashboard() {

    if (!AppState.data) return;

    const runs =
        AppState.data.runs;

    const profiles =
        AppState.data.profiles;

    const completed =
        runs.filter(
            run => run.status === "completed"
        ).length;

    const failed =
        runs.filter(
            run => run.status === "failed"
        ).length;

    const totalTrials =
        runs.reduce(
            (sum, run) => sum + run.trials,
            0
        );

    document.getElementById(
        "completedRuns"
    ).textContent = completed;

    document.getElementById(
        "failedRuns"
    ).textContent = failed;

    document.getElementById(
        "totalTrials"
    ).textContent = totalTrials;

    document.getElementById(
        "profileCount"
    ).textContent = profiles.length;

    renderRunsTable();

}

/* ==========================================================
   DASHBOARD TABLE
========================================================== */

function renderRunsTable() {

    const tbody =
        document.getElementById(
            "runsTableBody"
        );

    if (!tbody) return;

    tbody.innerHTML = "";

    AppState.data.runs.forEach(run => {

        const statusClass =
            run.status === "completed"
            ? "status-success"
            : "status-failed";

        tbody.innerHTML += `
            <tr>

                <td>
                    ${run.run_id.substring(0,8)}
                </td>

                <td>
                    <span class="${statusClass}">
                        ${run.status.toUpperCase()}
                    </span>
                </td>

                <td>
                    ${run.trials}
                </td>

                <td>
                    ${(run.duration_ms/1000).toFixed(1)} sec
                </td>

            </tr>
        `;

    });

}

/* ==========================================================
   HASH
========================================================== */

function generateRunHash(run) {

    return run.run_id
        .replaceAll("-", "")
        .substring(0, 12);

}

/* ==========================================================
   RESULTS SCREEN
========================================================== */

function renderResults() {

    if (!AppState.data) return;

    const run =
        AppState.data.runs.find(
            x => x.status === "completed"
        );

    if (!run) return;

    AppState.currentRun = run;

    document.getElementById(
        "runHash"
    ).textContent =
        generateRunHash(run);

    document.getElementById(
        "bestSharpe"
    ).textContent =
        run.best.sharpe;

    document.getElementById(
        "totalReturn"
    ).textContent =
        `${(
            run.best.total_return * 100
        ).toFixed(1)}%`;

    document.getElementById(
        "maxDD"
    ).textContent =
        `${(
            run.best.max_drawdown * 100
        ).toFixed(1)}%`;

    document.getElementById(
        "tradeCount"
    ).textContent =
        run.best.trades;

    renderRobustnessGuard();

    renderEquityChart();

}

/* ==========================================================
   ROBUSTNESS GUARD
========================================================== */

function renderRobustnessGuard() {

    const guard =
        document.getElementById(
            "guardList"
        );

    if (!guard) return;

    guard.innerHTML = `
        <li>
            ⚠ Out-of-Sample Drop: -37%
        </li>

        <li>
            ⚠ Transaction Costs Not Included
        </li>

        <li>
            ⚠ Walk-Forward Validation Missing
        </li>

        <li>
            ⚠ Selection Bias Risk Present
        </li>
    `;
}

/* ==========================================================
   EXPERIMENT LOG
========================================================== */

function renderExperimentLog() {

    const tbody =
        document.getElementById(
            "experimentLog"
        );

    if (!tbody) return;

    tbody.innerHTML = "";

    AppState.data.runs.forEach(run => {

        tbody.innerHTML += `
            <tr>

                <td>
                    ${run.run_id.substring(0,8)}
                </td>

                <td>
                    ${generateRunHash(run)}
                </td>

                <td>
                    ${run.trials}
                </td>

                <td>
                    ${run.status}
                </td>

            </tr>
        `;

    });

}

/* ==========================================================
   MOCK EQUITY CURVE
========================================================== */

// function generateEquityCurve(run) {

//     let value = 10000;

//     const data = [];

//     for (let i = 0; i < 50; i++) {

//         value +=
//             Math.random() * 650 - 100;

//         data.push(
//             Math.round(value)
//         );

//     }

//     return data;

// }
function generateEquityCurve(run) {

    if (run.equity_curve) {
        return run.equity_curve;
    }

    return [];
}
/* ==========================================================
   EQUITY CHART
========================================================== */

function renderEquityChart() {

    const chartContainer =
        document.querySelector("#equityChart");

    if (!chartContainer) return;

    if (AppState.equityChart) {

        AppState.equityChart.destroy();

    }

    const seriesData =
        generateEquityCurve(
            AppState.currentRun
        );

    AppState.equityChart =
        new ApexCharts(chartContainer, {

            chart: {
                type: "area",
                height: 350,
                background: "transparent",
                toolbar: {
                    show: false
                }
            },

            theme: {
                mode: "dark"
            },

            colors: ["#00d2ff"],

            series: [
                {
                    name: "Equity",
                    data: seriesData
                }
            ],

            stroke: {
                curve: "smooth",
                width: 3
            },

            dataLabels: {
                enabled: false
            },

            fill: {
                type: "gradient",
                gradient: {
                    opacityFrom: 0.4,
                    opacityTo: 0.05
                }
            },

            xaxis: {
                labels: {
                    show: true
                }
            }

        });

    AppState.equityChart.render();

}

/* ==========================================================
   COMPARISON CHART
========================================================== */

function renderComparisonChart() {

    const chartContainer =
        document.querySelector(
            "#compareChart"
        );

    if (!chartContainer) return;

    if (AppState.compareChart) {

        AppState.compareChart.destroy();

    }

    const completedRuns =
        AppState.data.runs.filter(
            run =>
            run.status === "completed"
        );

    const series =
        completedRuns.map(run => {

            return {

                name:
                    run.run_id.substring(
                        0,
                        8
                    ),

                data:
                    generateEquityCurve(run)

            };

        });

    AppState.compareChart =
        new ApexCharts(chartContainer, {

            chart: {
                type: "line",
                height: 350,
                background: "transparent",
                toolbar: {
                    show: false
                }
            },

            theme: {
                mode: "dark"
            },

            colors: [
                "#00d2ff",
                "#ffb020",
                "#00ff88"
            ],

            stroke: {
                curve: "smooth",
                width: 3
            },

            series,

            dataLabels: {
                enabled: false
            },

            legend: {
                position: "top"
            }

        });

    AppState.compareChart.render();

}

/* ==========================================================
   EXPORT PLACEHOLDERS
========================================================== */

function exportCSV() {

    Swal.fire({
        icon: "info",
        title: "Export",
        text: "CSV export coming soon."
    });

}

function exportPDF() {

    Swal.fire({
        icon: "info",
        title: "Export",
        text: "PDF export coming soon."
    });

}