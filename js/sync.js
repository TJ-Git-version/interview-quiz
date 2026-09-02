// js/sync.js —— 用 GitHub Contents API 读写 data.json
const API = 'https://api.github.com';

function enc(s) { return btoa(unescape(encodeURIComponent(s))); }
function dec(s) { return decodeURIComponent(escape(atob(s))); }

export function createSync({ repo, token }) {
  const url = `${API}/repos/${repo}/contents/data.json`;
  const auth = {
    Authorization: 'Bearer ' + token,
    Accept: 'application/vnd.github+json',
  };

  async function read() {
    const res = await fetch(url, { headers: auth });
    if (res.status === 404) return null;        // 尚未同步过
    if (!res.ok) throw new Error('read ' + res.status);
    const j = await res.json();
    return JSON.parse(dec(j.content));
  }

  async function write(obj) {
    const content = enc(JSON.stringify(obj));
    let sha = null;
    try {
      const curr = await fetch(url, { headers: auth });
      if (curr.ok) sha = (await curr.json()).sha;
    } catch { /* file 不存在则用空 sha */ }
    const put = (s) =>
      fetch(url, {
        method: 'PUT',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'interview-quiz sync', content, ...(s ? { sha: s } : {}) }),
      });
    let res = await put(sha);
    if (res.status === 409) {                   // 并发冲突：刷新 sha 重试一次
      const curr = await fetch(url, { headers: auth });
      const sha2 = curr.ok ? (await curr.json()).sha : null;
      res = await put(sha2);
    }
    if (!res.ok) throw new Error('write ' + res.status);
  }

  return { read, write };
}
