import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("borealDesktop", {
  getShellInfo: () => ipcRenderer.invoke("desktop:get-shell-info"),
});
