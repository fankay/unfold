# Unfold

Unfold，意为「展开」：把想法画出来，再一步步讲清楚。基于 React、TypeScript、Excalidraw 的无限画布演示 MVP。所有绘图、播放和存储都在浏览器中执行。

## 本地运行

```sh
npm install
npm run dev
```

打开 http://localhost:5173 。首次打开内置四步架构图示例。

## 使用方式

1. 在画布上选中一个或多个对象，点击原生绘图工具栏旁的「出现」或「消失」。自动新增一步，统一淡入淡出，不需要命名。
2. 对象旁显示 1、2、3 等步骤编号。点击编号可选中对象，并打开动画列表。
3. 多个对象需要同一步动画时，可以一起框选再添加，或使用「新步骤」下拉菜单选择已有步骤。
4. 「动画列表」默认收起。按步骤展示具体对象，支持上下排序、把对象动画移到已有步骤和删除。每一步可选择「单击时」（默认）、「与上一动画同时」或「上一动画之后」。同一步中的对象共用开始方式；需要单独控制的对象可移到独立步骤。删除空步骤后编号自动连续更新。
5. 点击「开始演示」后先等待第一次单击。在画面上任意位置单击鼠标左键，执行下一组动画；同时动画一起淡入淡出，自动动画等待前一个动画完成（450ms）后继续，遇到下一项「单击时」暂停；也可使用空格/右方向键，左方向键返回上一组完成状态，Esc 返回完整编辑画布。到达最后一步后，再单击、按空格/右方向键或点击底部「结束演示」，会退出演示并恢复完整编辑画布。底部控制条悬浮在画布上，不占独立底栏；控制按钮单独响应，不会误翻页。演示时隐藏编号和动画列表。
6. 导出 JSON 备份；导入可恢复图形、图片和动画。此前版本导出的文件仍然兼容，原有步骤名称不再显示。旧文件中没有开始方式的步骤自动按「单击时」播放。

未加入任何「出现」步骤的对象从演示开始就可见；加入「出现」步骤的对象在指定步骤才显示。「消失」会持续生效直到后续步骤再次显示。步骤状态从头计算，允许准确返回上一步。绑定文字与其图形作为一个对象展示编号和列表条目。

本地存储采用 IndexedDB，仅当前浏览器可访问。清理站点数据会删除保存内容，请定期导出。导入会替换当前项目，请先导出备份。外部嵌入内容在此 MVP 不支持独立淡入淡出；建议使用图形、文字和本地图片。

## Cloudflare Pages

这是纯静态项目，不使用 Workers Functions、D1、R2、账号或收费 API。

正式网站：[https://unfold-canvas.pages.dev/](https://unfold-canvas.pages.dev/)。项目名 `unfold-canvas`，已连接 GitHub 仓库 [fankay/unfold](https://github.com/fankay/unfold)。向 `main` 推送提交后，Cloudflare Pages 自动安装依赖、执行测试和构建，然后更新现有网站及自定义域名。

Cloudflare 构建配置：生产分支 `main`，自动生产部署已启用，构建命令 `npm test && npm run build`，输出目录 `dist`，根目录为仓库根目录，构建系统版本 3。`.node-version` 固定 Node.js 22。其他分支的自动预览部署已关闭。无需 GitHub Actions 或额外部署密钥。

常规更新：

```sh
git push origin main
```

也可手动更新（需安装 Wrangler 并登录部署账户）：

```sh
wrangler login
npm run deploy
```

`npm run deploy` 会先构建，再把 `dist` 上传到同一个 Pages 项目。部署配置保存在 `wrangler.jsonc`。Node.js 使用 22 或以上。字体复制到站点自己的 `/fonts/`，无需环境变量或外部字体 CDN。

首次发布包含 758 个构建文件（757 个资源及 `_headers`），共约 30.2 MiB，最大单个文件约 1.74 MiB，符合 Pages 免费计划的文件数量及单文件大小限制。没有创建 Functions、D1、R2 或其他付费资源。

浏览器数据按站点隔离：localhost 的画布不会自动出现在正式域名。需要从本地导出 JSON，再在正式网站导入。项目仍仅保存在各自浏览器中，不上传画布内容到 Cloudflare。

参考：[Git 集成](https://developers.cloudflare.com/pages/configuration/git-integration/)、[免费计划限制](https://developers.cloudflare.com/pages/platform/limits/)。项目最初使用 Direct Upload，现已通过控制台的「Git 存储库 → 连接」接入 GitHub，保留原项目和域名。

## 检查

```sh
npm test
npm run build
npm run preview
```

画布组件锁定 Excalidraw 0.18.1；后续可以在组件外继续扩展，也可以维护源码版本。演示模型和状态计算独立于绘图组件。Excalidraw 采用 MIT 许可，见 node_modules/@excalidraw/excalidraw/LICENSE。

## 品牌资源

应用名：Unfold。专用 Logo 用三折页面逐层展开的图形表达分步讲解，采用浅紫、紫色与深墨色。可编辑 SVG 位于 `public/unfold-mark.svg`，标题栏与浏览器图标共用。

## 中文字体

选中文字或带文字的图形，在左侧「字体」控件中打开字体列表，可以选择思源黑体（Noto Sans SC）、思源宋体（Noto Serif SC）、马善政楷体（Ma Shan Zheng）和站酷快乐体（ZCOOL KuaiLe）。字体选择随画布自动保存，也包含在 JSON 项目中。

字体由 Fontsource npm 包提供，仅复制 400 常规字重的 WOFF2 分片和许可证到自己的 `/fonts/chinese/`，按当前文本的 Unicode 范围加载，无需电脑安装或外部字体 CDN。四种字体总计约 11 MB 静态资源，首次打开不会全部下载。

来源与许可：[Noto Sans SC](https://fontsource.org/fonts/noto-sans-sc/about)、[Noto Serif SC](https://fontsource.org/fonts/noto-serif-sc/about)、[Ma Shan Zheng](https://github.com/googlefonts/mashanzheng)、[ZCOOL KuaiLe](https://github.com/googlefonts/zcool-kuaile)。每个字体目录附带 OFL 许可证。

当前 Excalidraw 没有公开字体注册接口，`scripts/excalidraw-font-plugin.mjs` 使用固定版本 0.18.1 的原生注册表，并在开发/生产构建中检查适配器。不改写依赖源码。升级 Excalidraw 时需要一起验证该适配器。字体 ID 10–13 是保存格式的一部分，请勿更换对应关系。

## 思维导图

点击画布顶部「思维导图」直接创建中心主题，并立即输入文字。选中主题后，右侧「＋」添加子主题，下方「＋」添加同级主题；Tab 添加子主题，Enter 添加同级主题（中心主题则添加子主题）。新增主题自动选中文字，输入后可继续按 Enter / Tab 连续创建。F2 编辑已有主题，Esc 或 Cmd/Ctrl+Enter 完成编辑，Shift+Enter 换行。输入法确认、多选、普通文字输入不会触发新增。

旁边下拉菜单仍提供「从大纲创建」和「整理布局」。大纲第一行为中心主题，后续每行用两个空格或 Tab 缩进表示子主题，支持最多 100 个主题、8 层初始分支。创建追加到现有画布右侧，不覆盖已有内容。生成的是原生图形、绑定文字和连线，也可以双击进行原生文字编辑；支持原生撤销。连线拖动时跟随，整理布局保留字体、样式和动画引用。

层级信息随图形的 customData 存入 IndexedDB 和项目 JSON，刷新、导入后可继续添加分支。主题和连线可使用现有「出现 / 消失」功能，需要一起演示时一起选中添加动画。删除上级主题不会自动删除其后代，剩余分支仍可编辑和整理。当前使用向右展开的树布局，完全在浏览器内生成，无需 AI API 或服务器。
