# tarot-rag-agent
# 塔罗个人牌意手记

一个完全运行在浏览器中的三牌塔罗占卜与复盘工具。它会保存每次占卜和用户反馈，并利用最近 30 天的记录、本地牌意知识及上传的《葵花宝典》参考书生成个性化解读。用于积累个人牌意，提高占卜准确性。

在线体验：[https://jj-giraffe.github.io/tarot-rag-agent/](https://jj-giraffe.github.io/tarot-rag-agent/)

## 主要功能

- 从 78 张塔罗牌中随机抽取三张，支持三种三牌牌阵和正逆位
- 展示与中文牌名对应的 Akaxi Tarot 牌面图片
- 结合牌意、元素、灵数、问题语境和三牌关系生成本地解读
- 使用 IndexedDB 保存占卜、反馈、参考书和语义向量
- 检索最近 30 天的相关牌史，用于后续个性化解读
- 每隔 24 小时自动生成高频牌与应验规律复盘
- 支持 EPUB 牌意书、旧占卜补录以及 JSON 数据备份和恢复

## 本地运行

这是一个原生 HTML、CSS 和 JavaScript 项目，不需要安装依赖。

直接打开 `index.html` 即可使用。为了获得更稳定的 IndexedDB 和 EPUB 支持，也可以在项目目录启动任意静态文件服务器，再访问对应的本地地址。

## 数据与隐私

所有占卜记录、反馈、参考书内容和向量索引都保存在当前浏览器的 IndexedDB 中，不会上传到服务器。不同浏览器、不同域名以及本地地址与 GitHub Pages 之间的数据彼此独立，请定期使用“导出 JSON”备份。

当前解读由本地规则、牌意知识和领域特征向量检索共同生成，不依赖 Ollama 或云端大模型。它适合做个人记录与反思，不应替代医疗、法律、财务或其他专业建议。

## 项目文件

```text
index.html              页面结构
styles.css              页面和移动端样式
app.js                  牌库、解读、RAG 与 IndexedDB 逻辑
assets/akaxi-tarot/     78 张牌图、来源列表和许可证说明
```

## 图片来源

牌面图片来自 [look-fate/tarot-lab](https://github.com/look-fate/tarot-lab) 的 Akaxi Tarot 系列。项目仓库采用 MIT License，同时说明图片版权归原作者所有；用于其他用途前请自行确认相应授权。
