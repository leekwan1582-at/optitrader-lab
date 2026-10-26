let data = null;

document.addEventListener("DOMContentLoaded", async () => {

    const response =
        await fetch("mockData.json");

    data = await response.json();

    populateDashboard();

});

function login(){

    Swal.fire({
        icon:"success",
        title:"Login Successful"
    });

    showScreen("dashboard-screen");
}

function showScreen(screenId)
{
    document
        .querySelectorAll("section")
        .forEach(section =>
        {
            section.classList.add("d-none");
        });

    const screen =
        document.getElementById(screenId);

    if (!screen)
    {
        console.error(
            `Screen '${screenId}' not found`
        );
        return;
    }

    screen.classList.remove("d-none");
}

function populateDashboard(){

    if(!data) return;

    const completed =
        data.runs.filter(
            x=>x.status==="completed"
        ).length;

    const failed =
        data.runs.filter(
            x=>x.status==="failed"
        ).length;

    document
        .getElementById("completedRuns")
        .innerText = completed;

    document
        .getElementById("failedRuns")
        .innerText = failed;

    renderRunsTable();
}

function renderRunsTable(){

    let html = `
    <thead>
    <tr>
        <th>Run ID</th>
        <th>Status</th>
        <th>Trials</th>
        <th>Duration</th>
    </tr>
    </thead>
    <tbody>
    `;

    data.runs.forEach(run=>{

        html += `
        <tr>

            <td>${run.run_id.substring(0,8)}</td>

            <td>
            <span class="badge bg-${
                run.status==="completed"
                ? "success"
                : "danger"
            }">
            ${run.status}
            </span>
            </td>

            <td>${run.trials}</td>

            <td>${run.duration_ms}</td>

        </tr>
        `;
    });

    html += "</tbody>";

    document.getElementById(
        "runsTable"
    ).innerHTML = html;
}

function parsePrompt(){

    Swal.fire({
        icon:"info",
        title:"Gemini Assistant",
        text:"Parameters parsed successfully."
    });

    showScreen("results");
    renderResults();
}

function renderResults(){

    const run =
        data.runs.find(
            x=>x.status==="completed"
        );

    document
        .getElementById("resultsContainer")
        .innerHTML = `
        <div class="card">

            <div class="card-body">

                <h4>Run Analytics</h4>

                <p>
                    Run ID:
                    ${run.run_id}
                </p>

                <p>
                    Sharpe:
                    ${run.best.sharpe}
                </p>

                <p>
                    Return:
                    ${run.best.total_return}
                </p>

                <p>
                    Max DD:
                    ${run.best.max_drawdown}
                </p>

                <button
                    class="btn btn-warning">

                    Robustness Guard
                </button>

            </div>

        </div>
        `;
}