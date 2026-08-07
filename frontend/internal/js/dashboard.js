// ---------------- Dashboard ----------------

async function loadDashboard() {
    try {
        const res = await fetch("http://127.0.0.1:8002/api/internal/dashboard/campaign-overview");
        const data = await res.json();

        document.getElementById("active-count").textContent = data.active_campaigns;
        document.getElementById("inactive-count").textContent = data.inactive_campaigns;
        document.getElementById("total-count").textContent = data.total_campaigns;
    } catch (err) {
        console.error(err);
    }
}

loadDashboard();

// ---------------- AI Generator ----------------

const generateBtn = document.getElementById("generateBtn");

generateBtn.addEventListener("click", async () => {
    const product = document.getElementById("product").value;
    const audience = document.getElementById("audience").value;
    const goal = document.getElementById("goal").value;

    const output = document.getElementById("campaignOutput");

    if (!product || !audience || !goal) {
        output.innerHTML = "<p style='color:red;'>Please fill all fields.</p>";
        return;
    }

    output.innerHTML = "<p>Generating campaign...</p>";

    try {
        const response = await fetch("http://127.0.0.1:8002/campaign/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                product,
                audience,
                goal
            })
        });

        const data = await response.json();

        output.innerHTML = `
            <h3>${data.title}</h3>
            <strong>Headline:</strong>
            <p>${data.headline}</p>

            <strong>Description:</strong>
            <p>${data.description}</p>
        `;
    } catch (error) {
        output.innerHTML = "<p style='color:red;'>Unable to connect to backend.</p>";
        console.error(error);
    }
});