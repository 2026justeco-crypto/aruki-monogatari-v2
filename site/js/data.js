// データの読み込み（相対パス。GitHub Pages のサブパスでも動く）
const cache = new Map();

function getJSON(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(path).then((r) => {
      if (!r.ok) throw new Error(`${path} の読み込みに失敗（${r.status}）`);
      return r.json();
    }).catch((e) => { cache.delete(path); throw e; }));
  }
  return cache.get(path);
}

export const getCatalog = () => getJSON('data/stories.json');
export const getPeopleData = () => getJSON('data/people.json');
export const getScript = (id) => getJSON(`data/${encodeURIComponent(id)}/script.json`);

export async function getStory(id) {
  const cat = await getCatalog();
  return cat.stories.find((s) => s.id === id) || null;
}

export async function getPeopleMap() {
  const d = await getPeopleData();
  return Object.fromEntries(d.people.map((p) => [p.id, p]));
}

export const BASIS = {
  shiryo: '史料にもとづく',
  kaishaku: '解釈',
  sousaku: '創作',
};
