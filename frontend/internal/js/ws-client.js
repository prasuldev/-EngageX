function connectDashboardWS() {
    const token = getInternalToken();

    if (!token) {
        setLiveStatus(false);
        return;
    }

    const wsUrl =
        `${API_BASE.replace(/^http/, "ws")}/api/internal/dashboard/ws?token=${encodeURIComponent(token)}`;

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        setLiveStatus(true);
        console.log("Dashboard WebSocket connected");
    };

    socket.onmessage = () => {
    loadDashboard();
    loadSalesOverview();
    loadCampaignPerformance();
    loadBeautyMatchPerformance();
    loadCustomerSegments();
};
    };



    socket.onclose = () => {
        setLiveStatus(false);
        console.log("Dashboard WebSocket disconnected. Retrying...");
        setTimeout(connectDashboardWS, 3000);
    };

    socket.onerror = (error) => {
        console.error("Dashboard WebSocket error:", error);
        socket.close();
    };
}

function setLiveStatus(connected) {
    const el = document.getElementById("live-status");

    if (!el) return;

    el.textContent = connected
        ? "● Live"
        : "○ Reconnecting…";

    el.style.color = connected
        ? "#3b8a4f"
        : "#c0392b";
}
