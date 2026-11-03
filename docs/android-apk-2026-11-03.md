# Android 安装包

游戏可以打包成 Android 应用（APK）。打包由 GitHub Actions 完成，结果发布在仓库的 Release 页面。

## 下载与安装

- 最新版本始终可以从这个地址下载：<https://github.com/khooruizhe-rgb/TBG/releases/latest/download/TBG.apk>
- 在手机上打开链接下载 `TBG.apk`，再打开文件安装。第一次安装时，Android 会要求允许浏览器或文件管理器"安装未知应用"。
- 新版本可以直接覆盖安装。所有版本都用同一把签名密钥，所以故事进度、设置和语言都会保留。

## 应用里的差异

- 卡牌图片、背景和音效全部打包在应用内，离线也能玩。标题字体仍然从 Google Fonts 加载，没有网络时会改用手机自带的字体。
- 应用全屏运行，并锁定为横屏，相当于浏览器版的全屏模式。浏览器版的"全屏"按钮和提示在应用里隐藏。
- 游戏进行时屏幕保持常亮。从屏幕边缘滑动可以临时叫出系统栏。
- 多人模式仍然需要手动填写服务器地址。

## 自动打包

修改游戏 HTML、`touhou_uploaded_images/`、`audio/`、图标或打包脚本并推送到 `main` 后，`.github/workflows/android.yml` 会自动执行：

1. `tools/build-android-web.mjs`：把游戏复制成 `www/index.html`，把仓库内的 `raw.githubusercontent.com` 资源地址改成相对路径，并复制对应文件。如果引用的文件不存在，打包会直接失败。
2. 用 Capacitor 7 生成 Android 工程，用 `assets/` 里的图片生成图标和启动画面。
3. `tools/patch-android.mjs`：设定版本号（`1.0.<打包次数>`）、横屏、沉浸式全屏和常亮。
4. 编译 release 版，用 `android-signing/tbg-release.jks` 签名，然后发布为新的 Release。

也可以在 GitHub 的 Actions 页面手动执行 "Android APK"。打包失败时，错误摘要会显示在该次执行的注释中。

## 签名密钥

签名密钥和密码直接保存在仓库里，这样每次打包都能用同一把密钥，覆盖安装不会失败。仓库是公开的，所以任何人都可以用这把密钥签出看起来相同的安装包。如果以后要上架或公开分发，应该换一把新密钥并改用 GitHub Secrets 保存。注意换密钥后，旧版本需要先卸载才能安装新版本。
