# Liuyao Next.js App

## 部署流程
1. 新建一个 GitHub 仓库
2. 把本项目所有文件上传到仓库根目录
3. 在 Vercel 里选择 Import Git Repository
4. 选中这个仓库，直接 Deploy

## 版本管理建议
- `main`: 仅放可上线版本
- `dev`: 日常开发分支
- 每个功能一个 commit
- 每次上线前先在 `dev` 验证，再合并到 `main`

## 推荐 commit 规范
- `feat: add timing prediction`
- `fix: correct trigger logic`
- `refactor: simplify summary rendering`

## 自动更新策略
- Vercel 连接 GitHub
- 推送到 `main` 自动部署正式版
- 推送到 `dev` 查看预览版
