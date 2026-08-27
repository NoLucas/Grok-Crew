# Grok Crew

<p align="center"><a href="README.md">English</a> &nbsp;·&nbsp; <a href="README.ko.md">한국어</a> &nbsp;·&nbsp; <strong>简体中文</strong> &nbsp;·&nbsp; <a href="README.ja.md">日本語</a></p>

**[在 Windows 打开](https://github.com/NoLucas/Grok-crew-test/releases/latest)** — 下载 [`GrokCrew-Windows.exe`](https://github.com/NoLucas/Grok-crew-test/releases/latest) 并双击。

五步。收到 → 打开 → 连接 → 写下 → 粘贴。

1. **收到** — 一个文件，`GrokCrew-Windows.exe`。
2. **打开** — 双击。若出现蓝屏保护，更多信息 → 仍要运行。
3. **连接** — 把连接文字贴到这台电脑的机器人窗口。这里出现名字就是已连接。
4. **写下** — 标题。
5. **粘贴** — 把任务贴到那个窗口。成片到了此窗口会打开。

要自己剪就放进第二张卡片。没有登录。

它不是托管素材的网站。机器人打不开这台电脑，只推送一个包裹。

```
收到 exe  →  打开  →  连接  →  写下标题  →  粘贴任务  →  成片到了此窗口打开
```

## 给谁用

- 只想规定 Reel 长什么样、不想在这台机器上找原片的人
- 想让已连接的机器人负责找素材和初剪，但门要分开、不能混用的人
- 仍希望成片落在这台电脑、而不是云端编辑器里的人

开始不需要账号。

## 你会看到什么

首屏是一张短书桌。**交给它**是标题 → 复制 → 等待。**自己打开**是放进视频 → 立刻剪。两条路不混在一张卡片里。示例只通过**用示例查看画面**打开。复制之后用人话显示机器人在工作、上次检查、还没有 / 已到达 / 失败。python、端口、文件夹路径默认收起。**更详细**和**高级工具**只在第一段成片到达后变大。剪辑门送来的成片会自己打开。机器人保存的文件夹默认收成一行，展开后列表在左、预览在旁；右键可预览、放大、打开原片或删除。画质按规格锁定，画面比例、字幕和其余剪辑控件仍可改。设置里可选 Shorts、Reels、TikTok 等风格，或把当前选项存成名字。晴昼、暗夜、柔昼、柔夜和文字在左上角齿轮里改。这个工作台不抓网站。

然后是三个标签：

| 标签 | 用来做什么 |
| --- | --- |
| **编辑** | 看预览，在时间线上裁切 |
| **设置** | 风格、字幕、速度 |
| **导出** | 在本机保存 MP4，或在询问后再发布 |

预览是为了剪的时候画面跟得上的快速草稿。保存的文件用原片生成。

## 视频留在这台电脑

原片、剪辑和成片都在这台电脑上。没有 Grok Crew 云端项目，开始时也不用登录。

发布是可选的。默认是 **发布前确认**。如果可能已经发出过，再发一份之前会再问一次。Grok Crew 不会替你注册 Instagram、TikTok 或 YouTube。

## 可选：让这台电脑上的 AI 帮忙

如果 AI 已经在**同一台电脑**上运行，你可以用平常的话说：留下最有力的几句，加上字幕，剪成竖屏，文件放这里，不要上传。

另一台电脑上的 AI 打不开这张桌子。不会把素材寄出去让别处的机器人「看一眼」。

## 怎么打开

**在 Windows 打开** — 从[最新发布](https://github.com/NoLucas/Grok-crew-test/releases/latest)下载 `GrokCrew-Windows.exe` 并双击。只装到当前账户，不询问管理员密码。

若提示 Windows 已保护你的电脑：点 **更多信息 → 仍要运行**。

如果已经有人为你装好了，打开 Grok Crew 窗口即可，或在浏览器打开 [http://localhost:3000](http://localhost:3000/)。

从源码运行需要 [Node.js 22+](https://nodejs.org/) 和 [Python 3.10+](https://www.python.org/downloads/)：

```sh
git clone https://github.com/NoLucas/Grok-Crew.git grok-crew
cd grok-crew
npm run local
```

从源码开窗口：先 `npm install` 一次，再 `npm run desktop`。第一次可能要几分钟。停止用 `Ctrl+C`。

你可以在这台电脑上制作并发布自己的视频。源码按 [BUSL-1.1](LICENSE) 公开，不是开源产品。提问：[CONTRIBUTING.md](CONTRIBUTING.md)。
