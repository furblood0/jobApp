chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.commands.onCommand.addListener((command) => {
  if (command !== "toggle-panel") return;
  chrome.windows.getCurrent((win) => {
    if (!win || win.id === undefined) return;
    const windowId = win.id;
    chrome.sidePanel.open({ windowId });
    chrome.runtime.sendMessage({ type: "close-if-open", windowId }, () => {
      void chrome.runtime.lastError;
    });
  });
});
