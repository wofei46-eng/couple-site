const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// 数据目录：放在用户目录下，保证打包后仍可读写（必须在 require app 之前设置）
const userDataPath = app.getPath('userData');
process.env.COUPLE_DATA_DIR = userDataPath;

// 启动 Express 后端服务
const { startServer } = require('./app');
const PORT = 3838;
let server = null;

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: '情侣小站',
    icon: path.join(__dirname, 'public', 'img', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 隐藏菜单栏
  Menu.setApplicationMenu(null);

  // 加载本地 Express 服务
  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // 先启动后端，再创建窗口
  server = startServer(PORT);
  // 等待服务就绪后打开窗口
  setTimeout(createWindow, 600);
});

app.on('window-all-closed', () => {
  if (server) server.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
