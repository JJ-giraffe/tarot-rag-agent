/*
 * 塔罗占卜单页应用
 * - 牌库、抽牌和本地解读均在浏览器内完成
 * - IndexedDB 保存占卜、反馈、参考书和自主复盘报告
 * - EPUB 使用浏览器原生 ZIP 解压能力，不依赖 CDN
 */

const DB_NAME = 'tarot-journal-db';
const DB_VERSION = 2;
const READING_STORE = 'readings';
const REFERENCE_STORE = 'references';
const SETTINGS_STORE = 'settings';
const VECTOR_STORE = 'vectors';
const EMBEDDING_VERSION = 1;
const EMBEDDING_DIMENSIONS = 384;
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

const majorCards = [
  ['愚人', '开始 · 信任 · 自由', '冲动 · 疏忽 · 方向感不足'], ['魔术师', '行动 · 资源 · 创造', '分散 · 操控 · 未兑现'],
  ['女祭司', '直觉 · 静默 · 内在知识', '压抑直觉 · 秘密 · 混乱'], ['皇后', '滋养 · 丰盛 · 生长', '过度付出 · 停滞 · 匮乏感'],
  ['皇帝', '结构 · 责任 · 稳定', '僵化 · 控制 · 失序'], ['教皇', '传统 · 学习 · 指引', '教条 · 质疑 · 脱离规范'],
  ['恋人', '选择 · 连接 · 价值一致', '失衡 · 逃避选择 · 不协调'], ['战车', '意志 · 前进 · 胜利', '失控 · 内耗 · 方向摇摆'],
  ['力量', '勇气 · 温柔 · 自我掌舵', '自我怀疑 · 情绪压制 · 透支'], ['隐者', '独处 · 反思 · 寻找答案', '隔绝 · 拖延 · 迷失'],
  ['命运之轮', '转机 · 周期 · 机会', '抗拒变化 · 失去时机 · 重复模式'], ['正义', '诚实 · 平衡 · 因果', '偏见 · 逃避责任 · 失衡'],
  ['倒吊人', '暂停 · 换位 · 放下执念', '徒劳等待 · 固守 · 受困'], ['死神', '结束 · 转化 · 重启', '抗拒结束 · 延宕 · 旧模式'],
  ['节制', '调和 · 节奏 · 整合', '失衡 · 过度 · 缺乏耐心'], ['恶魔', '欲望 · 依附 · 阴影', '松绑 · 觉察 · 恢复选择'],
  ['塔', '突变 · 真相 · 重建', '延迟冲击 · 恐惧改变 · 勉强维持'], ['星星', '希望 · 疗愈 · 方向', '失望 · 怀疑 · 失去信心'],
  ['月亮', '潜意识 · 想象 · 不确定', '迷雾散去 · 直面恐惧 · 暴露'], ['太阳', '清晰 · 喜悦 · 成功', '迟来的快乐 · 过度乐观 · 暂时遮蔽'],
  ['审判', '觉醒 · 回应召唤 · 复盘', '自我苛责 · 逃避结论 · 犹疑'], ['世界', '完成 · 整合 · 新阶段', '未完事项 · 缺口 · 难以收尾']
];
const majorElements = ['风', '风', '水', '土', '土', '土', '风', '火', '火', '土', '火', '风', '水', '水', '火', '土', '火', '风', '水', '火', '火', '土'];
const majorAstrology = ['天王星', '水星', '月亮', '金星', '土星', '木星', '金星', '战车', '狮子座', '处女座', '木星', '天秤座', '海王星', '冥王星', '射手座', '摩羯座', '火星', '水瓶座', '双鱼座', '太阳', '冥王星', '土星'];
const majorThemes = ['冒险、信任、开端', '表达、资源、执行', '直觉、潜意识、等待', '滋养、创造、丰盛', '秩序、边界、承担', '传统、学习、信念', '关系、选择、价值观', '目标、速度、胜利', '耐心、勇气、驯服', '独处、研究、答案', '周期、转机、机会', '公平、事实、因果', '暂停、换位、放下', '结束、蜕变、重启', '调和、节奏、整合', '欲望、依附、阴影', '突变、真相、重建', '希望、修复、方向', '梦境、恐惧、未知', '清晰、喜悦、成果', '觉醒、召唤、复盘', '完成、整合、远行'];
const suitNames = { wands: '权杖', cups: '圣杯', swords: '宝剑', pentacles: '星币' };
const suitElements = { wands: '火', cups: '水', swords: '风', pentacles: '土' };
const suitThemes = { wands: '行动、意志、创造', cups: '情绪、关系、直觉', swords: '思考、沟通、判断', pentacles: '资源、身体、现实' };
const ranks = [
  ['王牌', '潜能 · 开端 · 一股新能量'], ['二', '选择 · 平衡 · 伙伴'], ['三', '展开 · 协作 · 远景'], ['四', '稳定 · 休整 · 基础'],
  ['五', '摩擦 · 变化 · 挑战'], ['六', '流动 · 分享 · 回归'], ['七', '立场 · 防守 · 评估'], ['八', '速度 · 信息 · 熟练'],
  ['九', '坚持 · 临界点 · 独立'], ['十', '完成 · 负担 · 周期'], ['侍者', '消息 · 学习 · 好奇'], ['骑士', '行动 · 推进 · 追寻'],
  ['王后', '感受 · 养育 · 成熟'], ['国王', '掌控 · 责任 · 领导']
];
const reversedRankWords = ['延迟 · 过量 · 内在调整', '摇摆 · 失衡 · 需要沟通', '分散 · 缺乏协作 · 重新规划', '停滞 · 封闭 · 过度休息', '内耗 · 逃避冲突 · 摩擦升级', '留恋 · 付出失衡 · 旧情绪', '防御过度 · 疲惫 · 立场僵化', '急躁 · 错过信息 · 失控', '焦虑 · 过度警觉 · 需要补给', '耗竭 · 结束拖延 · 放下负担', '消息延后 · 学习受阻 · 说多做少', '方向摇摆 · 冒进 · 缺乏耐心', '情绪泛滥 · 照顾自己 · 边界', '控制欲 · 固执 · 重新分配权力'];

const cards = majorCards.map((c, i) => ({ id: `major-${i}`, name: c[0], number: i, arcana: '大阿尔卡纳', element: majorElements[i], astrology: majorAstrology[i], themes: majorThemes[i], upright: c[1], reversed: c[2], symbol: ['✧','☿','☾','❀','♜','✠','♡','➶','∞','◌','◎','⚖','◒','♢','△','⛓','ϟ','☆','☽','☀','⟲','◉'][i] }));
Object.entries(suitNames).forEach(([suit, suitName], suitIndex) => ranks.forEach(([rank, upright], rankIndex) => {
  cards.push({ id: `${suit}-${rankIndex + 1}`, name: `${suitName}${rank}`, number: rankIndex + 1, rank: rankIndex + 1, suit, arcana: '小阿尔卡纳', element: suitElements[suit], themes: `${suitThemes[suit]}、${upright.split(' · ')[0]}`, upright: `${upright} · ${suitName}`, reversed: `${reversedRankWords[rankIndex]} · ${suitName}`, symbol: ['杖', '杯', '剑', '币'][suitIndex] });
}));

const spreadLabels = {
  situation: ['现状', '阻碍', '建议'],
  timeline: ['过去', '现在', '未来'],
  self: ['身体', '心念', '灵魂']
};
const spreadNames = { situation: '现状 · 阻碍 · 建议', timeline: '过去 · 现在 · 未来', self: '身 · 心 · 灵' };

let db;
let activeReference = null;
let toastTimer;

const $ = (id) => document.getElementById(id);

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const next = request.result;
      if (!next.objectStoreNames.contains(READING_STORE)) next.createObjectStore(READING_STORE, { keyPath: 'id' });
      if (!next.objectStoreNames.contains(REFERENCE_STORE)) next.createObjectStore(REFERENCE_STORE, { keyPath: 'id' });
      if (!next.objectStoreNames.contains(SETTINGS_STORE)) next.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
      if (!next.objectStoreNames.contains(VECTOR_STORE)) {
        const vectors = next.createObjectStore(VECTOR_STORE, { keyPath: 'id' });
        vectors.createIndex('source', 'source', { unique: false });
      }
    };
    request.onsuccess = () => {
      db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onblocked = () => reject(new Error('请关闭其他已打开的旧版本页面后刷新'));
    request.onerror = () => reject(request.error);
  });
}

function storeRequest(store, mode, action) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    let request;
    try { request = action(transaction.objectStore(store)); } catch (error) { reject(error); return; }
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const getAll = (store) => storeRequest(store, 'readonly', (s) => s.getAll());
const put = (store, value) => storeRequest(store, 'readwrite', (s) => s.put(value));
const deleteValue = (store, key) => storeRequest(store, 'readwrite', (s) => s.delete(key));
const getOne = (store, key) => storeRequest(store, 'readonly', (s) => s.get(key));

function replaceAll(store, values) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, 'readwrite');
    const objectStore = transaction.objectStore(store);
    objectStore.clear();
    values.forEach((value) => objectStore.put(value));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('索引事务已取消'));
  });
}

function showToast(message) {
  const element = $('toast');
  element.textContent = message;
  element.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { element.hidden = true; }, 4200);
}

function secureRandom(max) {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % max;
}

function drawThree() {
  const pool = cards.slice();
  return Array.from({ length: 3 }, (_, index) => {
    const card = pool.splice(secureRandom(pool.length), 1)[0];
    return { ...card, isReversed: secureRandom(2) === 1, position: index };
  });
}

function formatDate(value) {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function cardLabel(card) {
  return `${isCardReversed(card) ? '逆位' : '正位'} ${card.name}`;
}

// 兼容导入的旧备份：新记录使用 isReversed，旧记录可能把 reversed 存成布尔值。
function isCardReversed(card) {
  return typeof card.isReversed === 'boolean' ? card.isReversed : card.reversed === true;
}

const rwsSceneSymbols = {
  愚人: '☼', 魔术师: '∞', 女祭司: '☾', 皇后: '❀', 皇帝: '♜', 教皇: '✠', 恋人: '♡', 战车: '➶', 力量: '♌', 隐者: '⌁',
  命运之轮: '◎', 正义: '⚖', 倒吊人: '◒', 死神: '☠', 节制: '△', 恶魔: '⛓', 塔: 'ϟ', 星星: '☆', 月亮: '☽', 太阳: '☀', 审判: '⟲', 世界: '◉'
};

function renderRwsScene(card) {
  const symbol = rwsSceneSymbols[card.name] || card.symbol;
  const sceneLabel = card.arcana === '大阿尔卡纳' ? `${card.name} · RWS 构图` : `${card.name} · ${card.element}元素场景`;
  return `<div class="card-scene"><span class="card-symbol" aria-hidden="true">${escapeHtml(symbol)}</span><span class="scene-caption">${escapeHtml(sceneLabel)}</span></div>`;
}

function renderCards(drawn, spread) {
  $('drawnCards').innerHTML = drawn.map((card, index) => `
    <article class="tarot-card ${isCardReversed(card) ? 'is-reversed' : ''}" style="animation-delay:${index * 140}ms">
      <p class="card-position">${escapeHtml(spreadLabels[spread][index])}</p>
      <div class="card-art"><div class="card-art-inner">${renderRwsScene(card)}</div></div>
      <div class="card-meta">
        <div class="card-name-row"><h3>${escapeHtml(card.name)}</h3><span class="orientation">${isCardReversed(card) ? '逆位' : '正位'}</span></div>
        <p class="keywords">${escapeHtml(isCardReversed(card) ? (typeof card.reversed === 'string' ? card.reversed : card.upright) : card.upright)}</p>
      </div>
    </article>`).join('');
}

function topicHint(question) {
  const text = question.toLowerCase();
  if (/工作|事业|职业|岗位|求职|实习|项目|面试|考试|学业/.test(text)) return '行动、边界与资源分配';
  if (/感情|关系|恋爱|伴侣|喜欢/.test(text)) return '沟通、需求与相互选择';
  if (/钱|财|收入|投资|买/.test(text)) return '价值、风险与长期稳定';
  return '当下感受、选择与下一步行动';
}

function reduceNumber(value) {
  let number = Math.abs(Number(value)) || 0;
  while (number > 9 && number !== 11 && number !== 22) number = String(number).split('').reduce((sum, digit) => sum + Number(digit), 0);
  return number;
}

function numerologyMeaning(number) {
  return ({ 0: '潜能、空白与新的循环', 1: '开始、意志与自我定位', 2: '关系、选择与协调', 3: '表达、生长与创造', 4: '结构、稳定与边界', 5: '变化、试炼与自由', 6: '责任、照料与价值取舍', 7: '探索、信念与内在判断', 8: '力量、资源与结果', 9: '完成、整合与释放', 10: '周期转折与新一轮机会', 11: '直觉、觉醒与高敏感度', 22: '长期建构、落地与远景' }[number] || '重新定义方向');
}

function analyzeNumerology(drawn) {
  const numbers = drawn.map((card) => Number(card.number) || 0);
  const sum = numbers.reduce((total, number) => total + number, 0);
  const root = reduceNumber(sum);
  const repeated = [...new Set(numbers.filter((number, index) => numbers.indexOf(number) !== index))];
  const elementCounts = drawn.reduce((map, card) => map.set(card.element, (map.get(card.element) || 0) + 1), new Map());
  const dominantElement = [...elementCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    numbers,
    sum,
    root,
    repeated,
    dominantElement: dominantElement ? dominantElement[0] : '未定',
    line: `牌面数字 ${numbers.join('、')}，总和 ${sum}，核心灵数 ${root}（${numerologyMeaning(root)}）；主导元素为${dominantElement ? dominantElement[0] : '未定'}。${repeated.length ? `重复数字 ${repeated.join('、')}，说明这个主题被放大。` : '三张牌没有重复数字，重点在它们之间的流动。'}`
  };
}

function queryTerms(text) {
  const normalized = String(text || '').toLowerCase().replace(/\s+/g, '');
  const terms = new Set(normalized.match(/[a-z0-9]{2,}|[\u4e00-\u9fff]{2}/g) || []);
  const topicWords = ['工作', '事业', '项目', '面试', '考试', '学业', '感情', '关系', '恋爱', '伴侣', '钱', '财', '收入', '投资', '选择', '沟通', '行动', '健康', '家庭'];
  topicWords.forEach((word) => { if (normalized.includes(word)) terms.add(word); });
  return [...terms];
}

const semanticConcepts = {
  career: ['工作', '事业', '职业', '岗位', '求职', '面试', '实习', '项目', '上班', '跳槽', '机会', '升职'],
  relationship: ['感情', '关系', '恋爱', '伴侣', '对象', '喜欢', '复合', '婚姻', '沟通', '相处'],
  finance: ['钱', '财富', '财运', '收入', '投资', '消费', '资源', '回报'],
  wellbeing: ['健康', '身体', '睡眠', '压力', '焦虑', '情绪', '疗愈', '恢复'],
  choice: ['选择', '决定', '是否', '要不要', '方向', '机会', '取舍', '犹豫'],
  action: ['行动', '开始', '推进', '执行', '速度', '勇气', '主动', '突破'],
  block: ['阻碍', '困难', '卡住', '停滞', '拖延', '恐惧', '限制', '内耗'],
  outcome: ['结果', '未来', '成功', '完成', '实现', '应验', '成果', '收获'],
  insight: ['直觉', '反思', '觉察', '内在', '潜意识', '复盘', '答案', '真相']
};

function hashToken(token) {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function semanticTokens(text) {
  const normalized = String(text || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '');
  const tokens = [];
  queryTerms(text).forEach((term) => tokens.push(`term:${term}`));
  for (let index = 0; index < normalized.length - 1; index += 1) tokens.push(`gram:${normalized.slice(index, index + 2)}`);
  Object.entries(semanticConcepts).forEach(([concept, words]) => {
    const hits = words.filter((word) => normalized.includes(word)).length;
    for (let index = 0; index < hits * 3; index += 1) tokens.push(`concept:${concept}`);
  });
  cards.forEach((card) => { if (normalized.includes(card.name)) tokens.push(`card:${card.id}`, `element:${card.element}`); });
  return tokens;
}

// 领域语义特征哈希：无需下载模型，生成固定维度向量并进行 L2 归一化。
function createEmbedding(text) {
  const vector = new Float32Array(EMBEDDING_DIMENSIONS);
  const counts = new Map();
  semanticTokens(text).forEach((token) => counts.set(token, (counts.get(token) || 0) + 1));
  counts.forEach((count, token) => {
    const hash = hashToken(token);
    const index = hash % EMBEDDING_DIMENSIONS;
    const sign = hash & 0x80000000 ? -1 : 1;
    vector[index] += sign * (1 + Math.log(count));
  });
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (magnitude) for (let index = 0; index < vector.length; index += 1) vector[index] /= magnitude;
  return Array.from(vector);
}

function cosineSimilarity(left, right) {
  if (!left || !right || left.length !== right.length) return 0;
  let score = 0;
  for (let index = 0; index < left.length; index += 1) score += left[index] * right[index];
  return score;
}

function splitReferenceText(text, chunkSize = 520, overlap = 80) {
  const paragraphs = String(text || '').split(/\n{2,}|(?<=[。！？])\s+/).map((part) => part.trim()).filter(Boolean);
  const chunks = [];
  let buffer = '';
  paragraphs.forEach((paragraph) => {
    if (buffer && buffer.length + paragraph.length > chunkSize) {
      chunks.push(buffer);
      buffer = `${buffer.slice(-overlap)}${paragraph}`;
    } else buffer += `${buffer ? '\n' : ''}${paragraph}`;
  });
  if (buffer) chunks.push(buffer);
  return chunks;
}

function persistentKnowledgeChunks(records, reference) {
  const chunks = cards.map((card) => ({
    id: `card:${card.id}`,
    source: 'card',
    sourceId: card.id,
    cardName: card.name,
    text: `${card.name}。牌号 ${card.number}。元素 ${card.element}。对应 ${card.astrology || '花色主题'}。主题：${card.themes}。正位：${card.upright}。逆位：${card.reversed}。`
  }));
  records.forEach((record) => chunks.push({
    id: `personal:${record.id}`,
    source: 'personal',
    sourceId: record.id,
    dateTime: record.dateTime,
    feedback: Boolean(record.feedback),
    cardNames: (record.cards || []).map((card) => card.name),
    text: `个人历史：${formatDate(record.dateTime)}。问题：${record.question}。牌面：${(record.cards || []).map(cardLabel).join('、')}。灵数：${record.numerology ? record.numerology.line : '未记录'}。反馈：${record.feedback || '未填写'}。`
  }));
  if (reference && reference.text) splitReferenceText(reference.text).forEach((text, index) => chunks.push({
    id: `book:${reference.id}:${index}`,
    source: 'book',
    sourceId: reference.id,
    bookName: reference.name,
    chunkIndex: index,
    text: `${reference.name} 第 ${index + 1} 段：${text}`
  }));
  return chunks;
}

async function rebuildVectorIndex(records, reference) {
  const chunks = persistentKnowledgeChunks(records, reference).map((chunk) => ({ ...chunk, embeddingVersion: EMBEDDING_VERSION, embedding: createEmbedding(chunk.text) }));
  await replaceAll(VECTOR_STORE, chunks);
  await put(SETTINGS_STORE, { key: 'vectorIndex', value: { embeddingVersion: EMBEDDING_VERSION, dimensions: EMBEDDING_DIMENSIONS, count: chunks.length, builtAt: new Date().toISOString(), method: 'domain-feature-hashing' } });
  renderVectorStatus(chunks.length);
  return chunks;
}

async function ensureVectorIndex(records, reference) {
  const metadata = await getOne(SETTINGS_STORE, 'vectorIndex');
  const expectedMinimum = cards.length + records.length + (reference && reference.text ? 1 : 0);
  if (!metadata || !metadata.value || metadata.value.embeddingVersion !== EMBEDDING_VERSION || metadata.value.count < expectedMinimum) return rebuildVectorIndex(records, reference);
  const vectors = await getAll(VECTOR_STORE);
  renderVectorStatus(vectors.length);
  return vectors;
}

async function retrieveSemanticChunks(query, drawn, records, limit = 8) {
  let chunks = await ensureVectorIndex(records, activeReference);
  const queryVector = createEmbedding(query);
  const cardNames = drawn.map((card) => card.name);
  chunks = chunks.filter((chunk) => chunk.source !== 'personal' || Date.now() - new Date(chunk.dateTime).getTime() <= THIRTY_DAYS);
  return chunks.map((chunk) => {
    const semanticScore = cosineSimilarity(queryVector, chunk.embedding);
    const cardBoost = (chunk.cardName && cardNames.includes(chunk.cardName)) || (chunk.cardNames || []).some((name) => cardNames.includes(name)) ? 0.32 : 0;
    const feedbackBoost = chunk.feedback ? 0.08 : 0;
    const personalBoost = chunk.source === 'personal' ? 0.04 : 0;
    return { ...chunk, semanticScore, score: semanticScore + cardBoost + feedbackBoost + personalBoost };
  }).filter((chunk) => chunk.score > 0.08).sort((a, b) => b.score - a.score).slice(0, limit);
}

async function buildInterpretation(question, drawn, spread, records) {
  const recent = records.filter((record) => Date.now() - new Date(record.dateTime).getTime() <= THIRTY_DAYS);
  const positions = spreadLabels[spread];
  const numerology = analyzeNumerology(drawn);
  const query = `${question} ${drawn.map((card) => `${card.name} ${isCardReversed(card) ? '逆位' : '正位'} ${card.themes || ''}`).join(' ')} ${numerology.line}`;
  const retrieved = await retrieveSemanticChunks(query, drawn, recent, 8);
  const personal = retrieved.filter((chunk) => chunk.source === 'personal');
  const lines = [`你问的是「${question}」。这组${spreadNames[spread]}牌面，围绕${topicHint(question)}展开。`, '', `灵数线索：${numerology.line}`, ''];
  drawn.forEach((card, index) => {
    const orientation = isCardReversed(card) ? '逆位' : '正位';
    const meaning = isCardReversed(card) && typeof card.reversed === 'string' ? card.reversed : card.upright;
    const themes = (card.themes || meaning).split('、').slice(0, 2).join('与');
    lines.push(`${positions[index]} · ${orientation} ${card.name}`);
    lines.push(`牌号 ${card.number} 的数字把主题拉向「${numerologyMeaning(reduceNumber(card.number))}」；${card.element}元素和${card.astrology || '花色'}让它更具体地表现为${themes}。${isCardReversed(card) ? '逆位不是简单的坏消息，而是提示这股能量可能卡在内在、过量或尚未成熟的状态。' : '正位说明这股能量较容易被你看见并投入现实。'}`);
    lines.push(`在${positions[index]}位置，它建议你关注：${meaning.split(' · ').slice(0, 3).join('、')}。`);
    const cardBookChunk = retrieved.find((chunk) => chunk.source === 'book' && (chunk.text.includes(card.name) || (card.themes || '').split('、').some((theme) => theme.length > 1 && chunk.text.includes(theme)))) || retrieved.find((chunk) => chunk.source === 'book');
    if (cardBookChunk) lines.push(`参考书中的对应提示：${cardBookChunk.text.replace(/^.*?第 \d+ 段：/, '').slice(0, 150)}${cardBookChunk.text.length > 150 ? '……' : ''}`);
    lines.push('');
  });
  lines.push(`牌阵合读：${positions[0]}的${drawn[0].name}先提出${(drawn[0].themes || '').split('、').slice(0, 2).join('与')}，${positions[1]}的${drawn[1].name}显示真正的卡点在${(drawn[1].themes || '').split('、').slice(0, 2).join('与')}，最后由${positions[2]}的${drawn[2].name}把核心灵数 ${numerology.root} 落到${numerologyMeaning(numerology.root)}。因此，比起追问“会不会发生”，更适合先做一个能验证这条路径的小行动。`);
  if (personal.length) lines.push(`\n个人牌史回声：${personal[0].text.replace('个人历史：', '')}。这条记录被检索出来，是因为它与本次牌名、问题主题或反馈相似。`);
  else if (recent.length) lines.push('\n个人牌史回声：近 30 天已有记录，但没有找到与本次牌面足够相似的案例。你的下一条反馈会成为新的个人牌意证据。');
  else lines.push('\n这是你的第一层个人牌意样本。等事情发展后回来写下反馈，未来的解读会逐渐形成属于你的牌意。');
  lines.push(`\n今日可实践：把${positions[2]}牌的提醒转成一个 15 分钟内能完成的动作；晚上回来记录它是否应验，以及你身体和情绪的真实反应。`);
  return { text: lines.join('\n'), numerology, retrieval: retrieved.map(({ id, source, score, semanticScore }) => ({ id, source, score, semanticScore })) };
}

function renderHistory(records) {
  const list = $('historyList');
  $('emptyHistory').hidden = records.length > 0;
  list.innerHTML = records.slice().sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime)).map((record) => `
    <details class="history-item">
      <summary class="history-summary">
        <div><span class="history-date">${escapeHtml(formatDate(record.dateTime))} · ${escapeHtml(spreadNames[record.spread] || '三牌牌阵')}</span><p class="history-question">${escapeHtml(record.question)}</p></div>
        <span class="history-chevron" aria-hidden="true">+</span>
      </summary>
      <div class="history-detail">
        <div class="history-card-line">${(record.cards || []).map((card) => `<span class="history-card-chip">${escapeHtml(cardLabel(card))}</span>`).join('')}</div>
        <div class="history-interpretation">${escapeHtml(record.interpretation)}</div>
        <form class="feedback-form" data-id="${escapeHtml(record.id)}">
          <label for="feedback-${escapeHtml(record.id)}">这次后来怎样？</label>
          <div class="feedback-row"><textarea id="feedback-${escapeHtml(record.id)}" maxlength="500" rows="2" placeholder="例如：应验了，下午顺利沟通。">${escapeHtml(record.feedback || '')}</textarea><button class="secondary-button compact" type="submit">保存反馈</button></div>
        </form>
      </div>
    </details>`).join('');
  list.querySelectorAll('.feedback-form').forEach((form) => form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = Number(form.dataset.id);
    const record = await getOne(READING_STORE, id);
    if (!record) return;
    record.feedback = form.querySelector('textarea').value.trim();
    record.feedbackUpdatedAt = new Date().toISOString();
    await put(READING_STORE, record);
    await rebuildVectorIndex(await getAll(READING_STORE), activeReference);
    showToast('反馈已保存，下一次解读会参考它。');
  }));
}

function calculateReview(records) {
  const recent = records.filter((record) => Date.now() - new Date(record.dateTime).getTime() <= THIRTY_DAYS);
  const counts = new Map();
  const feedbackStats = { positive: 0, negative: 0, other: 0 };
  recent.forEach((record) => {
    (record.cards || []).forEach((card) => {
      const key = `${card.name}|${isCardReversed(card) ? '逆位' : '正位'}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const feedback = (record.feedback || '').toLowerCase();
    if (/应验|很准|准确|实现|顺利|是的|有用/.test(feedback)) feedbackStats.positive += 1;
    else if (/未应验|不准|没有|相反|失效/.test(feedback)) feedbackStats.negative += 1;
    else if (feedback) feedbackStats.other += 1;
  });
  const frequent = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const report = {
    generatedAt: new Date().toISOString(),
    title: recent.length ? `近 30 天，你反复遇见 ${frequent.length ? frequent[0][0].split('|')[0] : '几张牌'}` : '还没有足够的牌史样本',
    summary: recent.length ? `共复盘 ${recent.length} 次占卜、${recent.reduce((sum, r) => sum + (r.cards || []).length, 0)} 张牌。${feedbackStats.positive ? `其中 ${feedbackStats.positive} 条反馈标记为应验或准确。` : '留下反馈后，规律会更清晰。'}` : '完成几次占卜并留下反馈后，这里会自动生成你的个人牌意规律。',
    highlights: frequent.map(([key, count]) => `${key.replace('|', ' · ')} × ${count}`).concat(feedbackStats.negative ? [`未应验反馈 ${feedbackStats.negative} 条`] : []),
    body: recent.length ? `你的高频牌集中在${frequent.map(([key]) => key.split('|')[0]).join('、') || '暂未形成'}。应验规律目前以${feedbackStats.positive ? '正向反馈较多' : '样本不足'}为主；继续在事件结束后记录具体发生了什么，复盘会从“牌的通用含义”逐渐变成“你的个人用法”。` : '先完成一次占卜，系统会在 24 小时后自动为你生成第一份复盘。'
  };
  return report;
}

async function maybeRunReview(records) {
  if (!records.length) return;
  const setting = await getOne(SETTINGS_STORE, 'review');
  const lastReviewAt = setting && setting.value && setting.value.lastReviewAt ? new Date(setting.value.lastReviewAt).getTime() : 0;
  if (Date.now() - lastReviewAt < ONE_DAY && setting.value.report) {
    renderReview(setting.value.report);
    return;
  }
  const report = calculateReview(records);
  await put(SETTINGS_STORE, { key: 'review', value: { lastReviewAt: report.generatedAt, report } });
  renderReview(report);
}

function renderReview(report) {
  if (!report) return;
  $('reviewBanner').hidden = false;
  $('reviewTitle').textContent = report.title;
  $('reviewSummary').textContent = report.summary;
  $('reviewTime').textContent = `生成于 ${formatDate(report.generatedAt)}`;
  $('reviewHighlights').innerHTML = (report.highlights || []).map((item) => `<span class="review-highlight">${escapeHtml(item)}</span>`).join('');
}

function renderReference(reference) {
  activeReference = reference || null;
  if (!reference) {
    $('bookStatus').textContent = '尚未上传参考书';
    $('removeEpub').hidden = true;
    return;
  }
  $('bookStatus').textContent = `${reference.name} · 已提取 ${reference.text.length.toLocaleString()} 字`;
  $('removeEpub').hidden = false;
}

function renderVectorStatus(count) {
  const status = $('vectorStatus');
  if (!status) return;
  status.textContent = `本地语义索引：${Number(count).toLocaleString()} 个知识向量 · ${EMBEDDING_DIMENSIONS} 维`;
}

function readUInt32(view, offset) { return view[offset] | (view[offset + 1] << 8) | (view[offset + 2] << 16) | (view[offset + 3] << 24); }
function readUInt16(view, offset) { return view[offset] | (view[offset + 1] << 8); }

async function unzipTextFiles(buffer) {
  const bytes = new Uint8Array(buffer);
  const files = [];
  let offset = 0;
  const decoder = new TextDecoder('utf-8');
  while (offset + 30 <= bytes.length) {
    const signature = readUInt32(bytes, offset) >>> 0;
    if (signature !== 0x04034b50) break;
    const method = readUInt16(bytes, offset + 8);
    const compressedSize = readUInt32(bytes, offset + 18) >>> 0;
    const nameLength = readUInt16(bytes, offset + 26);
    const extraLength = readUInt16(bytes, offset + 28);
    const name = decoder.decode(bytes.slice(offset + 30, offset + 30 + nameLength));
    const start = offset + 30 + nameLength + extraLength;
    const compressed = bytes.slice(start, start + compressedSize);
    if (!name.endsWith('/')) {
      let content;
      if (method === 0) content = compressed;
      else if (method === 8 && 'DecompressionStream' in window) {
        const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        content = new Uint8Array(await new Response(stream).arrayBuffer());
      } else throw new Error('当前浏览器不支持该 EPUB 的压缩格式');
      files.push({ name, text: decoder.decode(content) });
    }
    offset = start + compressedSize;
  }
  if (!files.length) throw new Error('没有读取到 EPUB 内容');
  return files;
}

function extractText(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,svg,nav').forEach((node) => node.remove());
  return (doc.body ? doc.body.textContent : doc.documentElement.textContent).replace(/\s+/g, ' ').trim();
}

async function parseEpub(file) {
  const files = await unzipTextFiles(await file.arrayBuffer());
  const textFiles = files.filter((entry) => /\.(x?html?|xml)$/i.test(entry.name) && !/container\.xml$|\.opf$/i.test(entry.name));
  const text = textFiles.map((entry) => `【${entry.name.split('/').pop()}】\n${extractText(entry.text)}`).filter(Boolean).join('\n\n');
  if (text.length < 20) throw new Error('EPUB 中没有可提取的正文，请确认不是扫描版或 DRM 文件');
  return { id: 'main', name: file.name, text, importedAt: new Date().toISOString() };
}

async function handleDraw(event) {
  event.preventDefault();
  const question = $('question').value.trim();
  if (!question) { $('question').focus(); showToast('请先写下你的问题。'); return; }
  const button = $('drawButton');
  button.disabled = true;
  button.textContent = '正在洗牌…';
  try {
    const spread = document.querySelector('input[name="spread"]:checked').value;
    const drawn = drawThree();
    const records = await getAll(READING_STORE);
    const interpretation = await buildInterpretation(question, drawn, spread, records);
    const record = { id: Date.now(), dateTime: new Date().toISOString(), question, spread, cards: drawn.map(({ id, name, number, rank, suit, arcana, element, astrology, themes, upright, reversed, symbol, isReversed, position }) => ({ id, name, number, rank, suit, arcana, element, astrology, themes, upright, reversed, symbol, isReversed, position })), interpretation: interpretation.text, numerology: interpretation.numerology, retrieval: interpretation.retrieval, feedback: '', feedbackUpdatedAt: '' };
    await put(READING_STORE, record);
    await rebuildVectorIndex([record, ...records], activeReference);
    renderCards(drawn, spread);
    $('resultSpread').textContent = spreadNames[spread];
    $('resultTime').textContent = formatDate(record.dateTime);
    $('interpretationText').textContent = interpretation.text;
    $('numerologySummary').textContent = `灵数摘要：${interpretation.numerology.line}`;
    $('numerologySummary').hidden = false;
    $('resultSection').hidden = false;
    renderHistory([record, ...records]);
    $('resultSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast('三张牌已抽出，解读也已保存。');
  } catch (error) {
    console.error(error);
    showToast(`抽牌失败：${error.message || '浏览器存储不可用'}`);
  } finally {
    button.disabled = false;
    button.textContent = '抽取三张牌';
  }
}

async function handleUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const button = $('uploadEpub');
  button.disabled = true;
  button.textContent = '正在读取…';
  try {
    const reference = await parseEpub(file);
    await put(REFERENCE_STORE, reference);
    renderReference(reference);
    await rebuildVectorIndex(await getAll(READING_STORE), reference);
    showToast('参考书已保存到本机，下一次解读会检索它。');
  } catch (error) {
    console.error(error);
    showToast(`参考书读取失败：${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = '选择 EPUB';
    event.target.value = '';
  }
}

async function exportData() {
  const payload = { version: 1, exportedAt: new Date().toISOString(), readings: await getAll(READING_STORE), references: await getAll(REFERENCE_STORE), settings: await getAll(SETTINGS_STORE) };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `tarot-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('备份已导出。');
}

async function importData(file) {
  const payload = JSON.parse(await file.text());
  if (!payload || payload.version !== 1 || !Array.isArray(payload.readings)) throw new Error('不是可识别的塔罗备份文件');
  if (!confirm(`将合并 ${payload.readings.length} 条占卜记录，导入内容会覆盖同 ID 记录。继续吗？`)) return;
  for (const reading of payload.readings) if (reading && Number.isFinite(Number(reading.id)) && reading.question && Array.isArray(reading.cards)) await put(READING_STORE, { ...reading, id: Number(reading.id) });
  for (const reference of (payload.references || [])) if (reference && reference.id && reference.text) await put(REFERENCE_STORE, reference);
  for (const setting of (payload.settings || [])) if (setting && setting.key) await put(SETTINGS_STORE, setting);
  const references = await getAll(REFERENCE_STORE);
  renderReference(references[0] || null);
  const records = await getAll(READING_STORE);
  renderHistory(records);
  await rebuildVectorIndex(records, activeReference);
  await maybeRunReview(records);
  showToast('备份已合并恢复。');
}

function parseLegacyCard(value) {
  const raw = String(value || '').trim();
  const isReversed = /逆|反位|\bR\b|\sR$/i.test(raw);
  const cleanName = raw.replace(/\s*(逆位|反位|逆|\bR\b)\s*$/i, '').trim();
  const known = cards.find((card) => card.name === cleanName || card.name.replace('牌', '') === cleanName);
  if (known) return { ...known, isReversed };
  return { id: `legacy-${Date.now()}-${Math.random().toString(16).slice(2)}`, name: cleanName || '未命名牌', number: 0, arcana: '历史登记', element: '未知', themes: '待补充牌意', upright: '用户历史登记', reversed: '用户历史登记', symbol: '◇', isReversed };
}

function openLegacyDialog() {
  const dialog = $('legacyDialog');
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  $('legacyDate').value = now.toISOString().slice(0, 16);
  dialog.showModal();
}

function closeLegacyDialog() {
  const dialog = $('legacyDialog');
  if (dialog.open) dialog.close();
}

async function handleLegacySubmit(event) {
  event.preventDefault();
  const cardsFromForm = [$('legacyCard1').value, $('legacyCard2').value, $('legacyCard3').value].map(parseLegacyCard);
  const dateTime = new Date($('legacyDate').value).toISOString();
  const interpretation = $('legacyInterpretation').value.trim() || '这是从旧记录补录的占卜，尚未填写当时的解读。';
  const record = {
    id: Date.now(),
    dateTime,
    querent: $('legacyQuerent').value.trim(),
    question: $('legacyQuestion').value.trim(),
    spread: 'situation',
    cards: cardsFromForm.map((card, index) => ({ ...card, position: index })),
    interpretation,
    feedback: $('legacyFeedback').value.trim(),
    feedbackUpdatedAt: $('legacyFeedback').value.trim() ? new Date().toISOString() : '',
    importedManually: true
  };
  await put(READING_STORE, record);
  const records = await getAll(READING_STORE);
  renderHistory(records);
  await rebuildVectorIndex(records, activeReference);
  closeLegacyDialog();
  $('legacyForm').reset();
  showToast('旧占卜已登记，并已加入本地语义索引。');
}

async function init() {
  try {
    await openDb();
    const records = await getAll(READING_STORE);
    renderHistory(records);
    const references = await getAll(REFERENCE_STORE);
    renderReference(references[0] || null);
    await ensureVectorIndex(records, references[0] || null);
    await maybeRunReview(records);
  } catch (error) {
    console.error(error);
    showToast('本地数据库无法打开，请使用最新版 Chrome 或 Edge。');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  $('drawForm').addEventListener('submit', handleDraw);
  $('uploadEpub').addEventListener('click', () => $('epubInput').click());
  $('epubInput').addEventListener('change', handleUpload);
  $('removeEpub').addEventListener('click', async () => {
    if (!confirm('确定移除本地参考书吗？历史占卜记录不会被删除。')) return;
    await deleteValue(REFERENCE_STORE, 'main');
    renderReference(null);
    await rebuildVectorIndex(await getAll(READING_STORE), null);
    showToast('参考书已移除。');
  });
  $('exportData').addEventListener('click', () => exportData().catch((error) => showToast(`导出失败：${error.message}`)));
  $('importData').addEventListener('click', () => $('importInput').click());
  $('importInput').addEventListener('change', (event) => { const file = event.target.files && event.target.files[0]; if (file) importData(file).catch((error) => showToast(`导入失败：${error.message}`)); event.target.value = ''; });
  $('addLegacyReading').addEventListener('click', openLegacyDialog);
  $('closeLegacy').addEventListener('click', closeLegacyDialog);
  $('cancelLegacy').addEventListener('click', closeLegacyDialog);
  $('legacyForm').addEventListener('submit', handleLegacySubmit);
  $('dismissReview').addEventListener('click', () => { $('reviewBanner').hidden = true; });
  init();
});
