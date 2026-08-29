function connectDashboardWS() {
  const token = getInternalToken();
  if (!token) return;
  const socket = new WebSocket(`${API_BASE.replace(/^http/, "ws")}/api/internal/dashboard/ws?token=${token}`);

  socket.onopen = () => setLiveStatus(true);
  socket.onmessage = () => {
    loadDashboard();
    loadCampaignPerformance();
    loadBeautyMatchPerformance();
    loadCustomerSegments();
  };
  socket.onclose = () => {
    setLiveStatus(false);
    setTimeout(connectDashboardWS, 3000);
  };
  socket.onerror = () => socket.close();
}

function setLiveStatus(connected) {
  const el = document.getElementById("live-status");
  if (!el) return;
  el.textContent = connected ? "● Live" : "○ Reconnecting…";
  el.style.color = connected ? "#3b8a4f" : "#c0392b";
}

function connectDashboardWS() {
  const token = getInternalToken();
  if (!token) return;
  const socket = new WebSocket(`${API_BASE.replace(/^http/, "ws")}/api/internal/dashboard/ws?token=${token}`);

  socket.onopen = () => setLiveStatus(true);
  socket.onmessage = () => {
    loadOverview();
    loadPerformance();
    loadBeautyMatch();
    loadCustomerSegments();
  };
  socket.onclose = () => {
    setLiveStatus(false);
    setTimeout(connectDashboardWS, 3000);
  };
  socket.onerror = () => socket.close();
}
