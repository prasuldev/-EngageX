function connectDashboardWS() {
  const token = getInternalToken();
  const socket = new WebSocket(`ws://127.0.0.1:8000/api/internal/dashboard/ws?token=${token}`);

  socket.onopen = () => setLiveStatus(true);
  socket.onmessage = () => {
    loadOverview();
    loadPerformance();
    loadBeautyMatch();
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
  const socket = new WebSocket(`ws://127.0.0.1:8000/api/internal/dashboard/ws?token=${token}`);

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