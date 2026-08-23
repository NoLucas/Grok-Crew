# Grok Crew

<p align="center"><a href="README.md">English</a> &nbsp;·&nbsp; <a href="README.ko.md">한국어</a> &nbsp;·&nbsp; <strong>简体中文</strong> &nbsp;·&nbsp; <a href="README.ja.md">日本語</a></p>

**把粗剪的短视频素材,变成机器人可执行的剪辑方案、本地 MP4 文件,以及可选的 Instagram 自动上传——无需将项目、素材或机器人历史发送到任何云端。**

<p>
  <img alt="本地优先" src="https://img.shields.io/badge/local--first-127.0.0.1-1d1d1b?style=flat-square">
  <img alt="Node 22 或更高版本" src="https://img.shields.io/badge/Node.js-22%2B-339933?style=flat-square">
  <img alt="Python 3.10 或更高版本" src="https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square">
  <img alt="在你自己的电脑上运行" src="https://img.shields.io/badge/runs-on%20your%20computer-f4c400?style=flat-square">
</p>

![Grok Crew 制作工作台](public/readme/production-workspace.png)

## 观看演示

[![观看 21 秒的 Grok Crew 工作流程演示](public/demo/grok-crew-workflow.gif)](public/demo/grok-crew-workflow.mp4)

*预览会直接在本 README 中播放。点击可打开完整 MP4。*

## 为什么选择 Grok Crew?

当创意简报、机器人指令、剪辑决定、渲染任务和交付状态分散在不同工具里时,短视频编辑就会失去连贯性。Grok Crew 让这一整套交接过程在同一台电脑上可见、可重复:

```text
粗剪素材 → 转录文本剪辑图 → 机器人编辑方式 → 本地 MP4 → 排队或自动上传
```

它是一个**面向个人和同一台电脑上机器人的本地制作台**,不是云端视频编辑器,也不是远程机器人服务。

## 五分钟内开始使用

### 你需要准备

- Node.js 22 或更高版本
- Python 3.10 或更高版本
- 本仓库的本地克隆

### 运行

```sh
git clone https://github.com/NoLucas/JIN-Reel-forge.git grok-crew
cd grok-crew
npm run local
```

首次运行会安装浏览器和本地渲染所需的依赖、创建独立的 Python 环境,并启动 Local Studio。完成后打开 [http://localhost:3000/production](http://localhost:3000/production)。

不需要任何云账号或第三方 API 密钥。按 `Ctrl+C` 停止;再次运行同一条命令会继续使用同一个本地工作区。

### 给本地机器人分配第一个任务

在克隆下来的文件夹中,于机器人所在的终端里运行以下命令:

```sh
python local_studio/grok_crew.py contract
python local_studio/grok_crew.py entry --bot-id editor-01 --display-name "Editor 01" --purpose edit_video --task "Prepare a transcript-first short-form edit plan." --execution-mode auto_local
```

然后打开 [Bot Check](http://localhost:3000/bots)。机器人只有在真正完成签到后才会出现在页面上。

## 最基本的工作流程

1. 打开 **Production**,用 `local_studio/workspace/inputs` 下的素材创建一个项目。
2. 让机器人阅读 [Bot Guide](http://localhost:3000/bot-guide?lang=en),设置它的编辑方式,并保存一份转录文本剪辑图。
3. 在 **Operations Center** 中检查素材、保存项目记忆、比较 A/B 剪辑版本并运行质量检查。
4. 在本地渲染。机器人可以使用 `auto_local`,也可以为自己的渲染设置人工审批。
5. 添加一个 Instagram 任务。打开 **Auto-upload** 会立即开始上传,关闭则会留在本地队列中等待手动执行。

## 它能带来什么

| 以前的问题 | Grok Crew 提供的方案 |
| --- | --- |
| 机器人只凭一句模糊的指令去剪辑 | 结构化的本地指南、编辑方式、项目记忆和可见的任务看板 |
| 只能靠猜测判断静音、重拍和口癖的位置 | 以转录文本为核心的剪辑图和素材预检报告 |
| 导出之后才发现问题 | 渲染前、渲染后与交付前的质量报告 |
| 机器人多次运行之间会丢失编辑上下文 | 本地 SQLite 保存的项目记忆、任务历史和机器人心跳记录 |
| 发布之后状态不明 | 本地 MP4 渲染队列,以及可按任务开启的 Instagram 自动上传 |

### 内置制作工具

- 项目设置、本地源文件/输出路径与渲染设置
- 以单词和短语为单位的转录文本剪辑图
- 重新构图、字幕、速度、帧率、画面风格、音频策略与质量选择
- 检测朝向、帧率、时长、音频、黑屏与静音的素材检查
- 渲染前、渲染后、交付前的质量检查
- 项目记忆、机器人任务看板、音频方案、A/B 版本、品牌套件与叠加层位置
- 供下次剪辑参考的失败记录与效果笔记
- 展示真实签到、心跳、剪辑、渲染与上传进度的 Bot Check
- 韩语和英语界面,以及机器可读的机器人指南

## 面向机器人:浏览器或终端

每一份克隆都自带一个无额外依赖的本地 CLI,并且只接受本机回环地址(loopback)。

```sh
# 阅读完整的机器可读手册
python local_studio/grok_crew.py guide

# 输出任意工作区页面对应的浏览器地址
python local_studio/grok_crew.py site --page operations
python local_studio/grok_crew.py site --page export

# 查看真实的机器人在线状态与工作历史
python local_studio/grok_crew.py bots list
python local_studio/grok_crew.py bots activity
```

可用页面包括 `studio`、`edit`、`cut`、`production`、`operations`、`bots`、`guide`、`terminal`、`library`、`agent`、`connect`、`packet`、`gates`、`export`、`privacy`。

完整命令请参见[本地机器人手册](local_studio/README.md),或在启动工作区后打开 [Bot Guide](http://localhost:3000/bot-guide?lang=en)。

## 隐私与可选的 Instagram 投放

浏览器工作区运行在 `localhost:3000`;Local Studio 绑定在 `127.0.0.1:7214`。源素材、渲染结果、SQLite 记录和机器人历史都保留在本机的 `local_studio/` 目录下。

Instagram 投放是可选功能,需要所有者在本地配置好 Meta 凭据以及受支持的本地 MP4 文件。任务可以留在队列中,也可以通过 `--auto-upload` 立即开始;凭据永远不会存入 SQLite,也不会通过本项目暴露给任何机器人。

## 云端机器人的交接方式(适用于不在本机的机器人)

Local Studio 依旧绝不接受来自其他设备的连接——即便是运行在云端沙箱或另一台电脑上的机器人也不例外。这类机器人会改为通过一个专用的 git 仓库交接已完成的剪辑成果,而运行在所有者本机上的 `local_studio/handoff_watcher.py` 会轮询该仓库,并用同一台电脑上机器人已经在用的本地 API 来应用这次交接。设置方法请参见[本地机器人手册](local_studio/README.md),要交给那个机器人的确切打包格式请参见 `local_studio/handoff-guide.json`(或 `handoff-guide.ko.json`)。

## 使用场景

- 创作者把一段口播录像剪成紧凑的竖版 Reel,同时不丢失剪辑逻辑。
- 小型内容团队让多个本地机器人分担调研、剪辑规划、质检和打包工作,同时能看清归属和状态。
- 开发者在决定是否要让某个工作流离开本机之前,先在本地验证视频编辑代理。
- 无法回环访问所有者电脑的云端机器人生成素材和编辑方案后,通过专用 git 仓库交接,而不是直接连接。

## 路线图

- [x] 本地项目台、机器人入场、任务记忆、渲染与可选的 Instagram 投放
- [x] 转录文本剪辑图、素材预检、渲染质检、A/B 版本、音频方案、叠加层与品牌套件
- [x] 韩语/英语机器人指南与浏览器页面地图
- [x] 可移植项目包的导入/导出
- [x] 更多本地渲染预设与字幕排版
- [x] 通过专用 git 仓库实现云端机器人交接,回环地址依旧对网络关闭
- [ ] 社区维护的示例剪辑包

## 反馈与贡献

发现了问题,或者有值得保留的剪辑工作流程?请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。Bug 报告、功能建议、聚焦的小型 Pull Request,以及可复现的本地任务失败记录都特别有帮助。

本仓库基于 [Business Source License 1.1](LICENSE)(`BUSL-1.1`)以源代码可见的方式提供,并非宽松的开源许可证。你可以出于个人、教育或内部业务目的自由使用、复制和修改它,包括在本地运行以制作和发布你自己的内容——具体条款请参见许可证中的 Additional Use Grant。若要将它(或其衍生版本)以托管服务或竞争性商业产品的形式提供给第三方,则需要获得版权所有者的另行授权。该许可证将于 2030-08-23 转换为 MIT 许可证。

## 维护者发布清单

仓库中包含实用的[发布清单](docs/LAUNCH.md)、[宣传素材](docs/ANNOUNCEMENT.md)和[更新日志](CHANGELOG.md)。在正式对外宣布之前,请添加 GitHub 主题标签并发布一个带标签的首个版本。
