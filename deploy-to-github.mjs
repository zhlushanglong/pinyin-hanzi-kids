#!/usr/bin/env node
/* ============================================================
 * 一键部署到 GitHub + 开启 GitHub Pages
 *
 * 用法（在本文件所在目录执行）：
 *   GITHUB_TOKEN=ghp_xxxxxxxxxxxx node deploy-to-github.mjs
 * Windows PowerShell：
 *   $env:GITHUB_TOKEN="ghp_xxxxxxxxxxxx"; node .\deploy-to-github.mjs
 *
 * Token 获取：GitHub → Settings → Developer settings →
 *   Personal access tokens → Fine-grained tokens（勾选 Repository 的
 *   Administration / Contents / Pages 读写权限），或经典 token 勾选 repo 范围。
 * Token 只用于本机这一次 API 调用，不会写进任何文件。
 * 零第三方依赖，只需要 Node.js 18+。
 * ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const REPO = process.env.REPO_NAME || 'pinyin-hanzi-kids';
const TOKEN = process.env.GITHUB_TOKEN || process.argv[2];
const API = 'https://api.github.com';

if (!TOKEN) {
  console.error('缺少 GITHUB_TOKEN。用法：GITHUB_TOKEN=ghp_xxx node deploy-to-github.mjs');
  process.exit(1);
}

async function req(method, url, body) {
  const headers = {
    'Accept': 'application/vnd.github+json',
    'Authorization': 'Bearer ' + TOKEN,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'pinyin-hanzi-kids-deployer'
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error(method + ' ' + url + ' -> ' + res.status + ' ' + (data.message || ''));
    err.status = res.status;
    throw err;
  }
  return data;
}

const SKIP = new Set(['.git', 'node_modules', '.DS_Store', 'Thumbs.db']);
function collect(dir, prefix) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (SKIP.has(name) || name.startsWith('_smoke') || name.startsWith('_t_')) continue;
    const full = path.join(dir, name);
    const rel = prefix ? prefix + '/' + name : name;
    if (fs.statSync(full).isDirectory()) out.push(...collect(full, rel));
    else out.push({ path: rel, content: fs.readFileSync(full).toString('base64') });
  }
  return out;
}

async function main() {
  const me = await req('GET', '/user');
  const owner = me.login;
  console.log('GitHub 账号：' + owner);

  try {
    await req('POST', '/user/repos', {
      name: REPO,
      description: '🌈 给一年级小朋友的拼音与汉字学习小程序：读汉字、拼声母韵母、答对有掌声',
      homepage: 'https://' + owner.toLowerCase() + '.github.io/' + REPO + '/',
      private: false,
      has_issues: true,
      has_wiki: false,
      auto_init: false
    });
    console.log('✅ 已创建仓库 ' + owner + '/' + REPO);
  } catch (e) {
    if (e.status === 422) console.log('ℹ️ 仓库已存在，直接更新文件');
    else if (e.status === 401) throw new Error('Token 无效或已过期，请重新生成');
    else if (e.status === 403) throw new Error('Token 权限不足，需要 repo（或 Contents + Administration）权限');
    else throw e;
  }

  const info = await req('GET', '/repos/' + owner + '/' + REPO);
  const branch = info.default_branch || 'main';
  const base = '/repos/' + owner + '/' + REPO;

  let parentSha = null, baseTree = null;
  try {
    const ref = await req('GET', base + '/git/ref/heads/' + branch);
    parentSha = ref.object.sha;
    const head = await req('GET', base + '/git/commits/' + parentSha);
    baseTree = head.tree.sha;
  } catch (e) {
    if (e.status !== 404 && e.status !== 409) throw e;
    // 空仓库无法直接调用 /git/blobs（GitHub 返回 409 Git Repository is empty）。
    // 先用 Contents API 写入一个文件建立初始提交，之后才能用 Git Data API 批量推送。
    console.log('ℹ️ 空仓库，先建立初始提交');
    const seed = await req('PUT', base + '/contents/README.md', {
      message: 'chore: 初始化仓库',
      content: Buffer.from('# 🌈 拼音汉字乐园\n').toString('base64'),
      branch: branch
    });
    parentSha = seed.commit.sha;
    const head = await req('GET', base + '/git/commits/' + parentSha);
    baseTree = head.tree.sha;
  }

  const files = collect(ROOT, '');
  console.log('📦 准备上传 ' + files.length + ' 个文件…');
  const tree = [];
  for (const f of files) {
    const blob = await req('POST', base + '/git/blobs', { content: f.content, encoding: 'base64' });
    tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const newTree = await req('POST', base + '/git/trees', baseTree ? { base_tree: baseTree, tree } : { tree });
  const commit = await req('POST', base + '/git/commits', {
    message: 'feat: 拼音汉字乐园 · 一年级拼音拼读与识字练习',
    tree: newTree.sha,
    parents: parentSha ? [parentSha] : []
  });
  if (parentSha) {
    await req('PATCH', base + '/git/refs/heads/' + branch, { sha: commit.sha, force: true });
  } else {
    await req('POST', base + '/git/refs', { ref: 'refs/heads/' + branch, sha: commit.sha });
  }
  console.log('✅ 代码已推送到 ' + branch + ' 分支');

  try {
    await req('POST', base + '/pages', { source: { branch: branch, path: '/' } });
    console.log('✅ GitHub Pages 已开启');
  } catch (e) {
    if (e.status === 409) console.log('ℹ️ Pages 之前已开启');
    else console.log('⚠️ Pages 自动开启失败（' + e.message + '），请在仓库 Settings → Pages 手动选择 ' + branch + ' / root');
  }

  console.log('\n🎉 全部完成！');
  console.log('   仓库：https://github.com/' + owner + '/' + REPO);
  console.log('   在线：https://' + owner.toLowerCase() + '.github.io/' + REPO + '/');
  console.log('   Pages 首次构建约需 1 分钟，稍后刷新即可。');
}

main().catch(function (e) {
  console.error('\n❌ 部署失败：' + e.message);
  process.exit(1);
});
