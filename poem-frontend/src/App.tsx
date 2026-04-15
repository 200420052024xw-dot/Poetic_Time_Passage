import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { BookOpen, Check, Clock, Download, Heart, MessageCircleQuestion, Mic, Search, Share2, Sparkles, Volume2 } from 'lucide-react';
import './index.css';

type ApiRecord = Record<string, unknown>;
type Page = 1 | 2 | 3;

interface Comment { id: string; author: string; content: string; time: string }
interface CandidatePoem { index: string; poem: string; poet: string; title: string; reason: string }
interface LearningCard { original: string; poet: string; title: string; translation: string; authorIntro: string; imagery: string; emotion: string; scene: string }
interface VisualBrief { imagery: string; tone: string; elements: string; colors: string; style: string }
interface RecognizedPoem { poem: string; poet: string; title: string; reason: string; confidence: string; source: string }
interface MomentPost {
  id: string; author: string; avatar: string; poem: string; title: string; content: string; image: string; time: string;
  likes: number; isLiked: boolean; comments: Comment[]; postscript: string; likedUsers: string[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';
const demoInputs = ['写江南春风和思乡的那句诗', '明月何时', '孤舟蓑笠翁，寒江雪', '想表达离别和不舍', '春眠不觉晓'];
const flowSteps = ['输入线索', '识别诗句', '自主选择候选', '文化解读', '生成朋友圈', '下载分享'];
const keys = {
  poem: ['诗句'], poet: ['诗人', '作者'], title: ['题目'], reason: ['识别说明'], confidence: ['识别置信度'], source: ['识别来源'],
  candidates: ['候选诗句'], candidateIndex: ['候选'], matchReason: ['匹配理由'], learningCard: ['诗词文化解读'], visualBrief: ['意境视觉分析'],
  recitation: ['朗诵文本'], postCopy: ['朋友圈文案'], postscript: ['朋友圈附言'], imagePath: ['图片路径'], postTime: ['朋友圈发布时间'],
  likes: ['朋友圈点赞'], comments: ['朋友圈评论'], commenter: ['评论人'], commentContent: ['评论内容'], answer: ['回答'],
  original: ['原诗'], translation: ['白话译文'], authorIntro: ['作者简介'], imageryAnalysis: ['意象分析'], emotion: ['情感表达'], scene: ['适用场景'],
  visualImagery: ['诗词意象'], visualTone: ['情感基调'], visualElements: ['画面元素'], visualColors: ['色彩建议'], visualStyle: ['画风建议'],
};

function getValue(record: ApiRecord | null | undefined, names: string[]): unknown {
  if (!record) return undefined;
  for (const name of names) if (record[name] !== undefined && record[name] !== null) return record[name];
  return undefined;
}
function getString(record: ApiRecord | null | undefined, names: string[], fallback = '') {
  const value = getValue(record, names);
  return value === undefined || value === null ? fallback : String(value).trim() || fallback;
}
function toRecord(value: unknown): ApiRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as ApiRecord) : {};
}
function toRecords(value: unknown): ApiRecord[] {
  return Array.isArray(value) ? value.map(toRecord) : [];
}
function toAbsoluteUrl(path: string) {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
function normalizeLikedUsers(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return value.split(/[、，,]/).map((user) => user.trim()).filter(Boolean);
  if (typeof value === 'number') return Array.from({ length: value }, (_, index) => `好友${index + 1}`);
  return [];
}
function createLocalAvatar(name: string) {
  const initials = (name.trim() || '诗友').slice(-2).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="64" fill="#1f6f68"/><text x="64" y="74" text-anchor="middle" font-size="42" font-family="serif" font-weight="700" fill="#fff">${initials}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
function splitTags(value?: string) {
  return value ? value.split(/[、，,]/).map((item) => item.trim()).filter(Boolean) : [];
}
function mapRecognized(data: ApiRecord): RecognizedPoem {
  return {
    poem: getString(data, keys.poem), poet: getString(data, keys.poet, '佚名'), title: getString(data, keys.title, '未识别题目'),
    reason: getString(data, keys.reason, '已匹配到最可能的原诗句。'), confidence: getString(data, keys.confidence), source: getString(data, keys.source),
  };
}
function mapCandidate(data: ApiRecord, index: number): CandidatePoem {
  return {
    index: getString(data, keys.candidateIndex, String(index + 1)), poem: getString(data, keys.poem), poet: getString(data, keys.poet, '佚名'),
    title: getString(data, keys.title, '未识别题目'), reason: getString(data, keys.matchReason, '与输入线索的语义和关键词相近。'),
  };
}
function mapLearningCard(data: ApiRecord | null): LearningCard | null {
  if (!data || Object.keys(data).length === 0) return null;
  return {
    original: getString(data, keys.original), poet: getString(data, keys.poet, '佚名'), title: getString(data, keys.title, '未识别题目'),
    translation: getString(data, keys.translation), authorIntro: getString(data, keys.authorIntro), imagery: getString(data, keys.imageryAnalysis),
    emotion: getString(data, keys.emotion), scene: getString(data, keys.scene),
  };
}
function mapVisualBrief(data: ApiRecord | null): VisualBrief | null {
  if (!data || Object.keys(data).length === 0) return null;
  return {
    imagery: getString(data, keys.visualImagery), tone: getString(data, keys.visualTone), elements: getString(data, keys.visualElements),
    colors: getString(data, keys.visualColors), style: getString(data, keys.visualStyle),
  };
}
function SectionTitle({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return <div className="mb-4 flex items-start gap-3"><div className="rounded-lg bg-[#e8f4f1] p-2 text-[#1f6f68]">{icon}</div><div><h2 className="text-xl font-bold">{title}</h2><p className="text-sm leading-relaxed text-[#536b68]">{desc}</p></div></div>;
}

function App() {
  const momentRef = useRef<HTMLElement>(null);
  const [page, setPage] = useState<Page>(1);
  const [inputText, setInputText] = useState('');
  const [currentPost, setCurrentPost] = useState<MomentPost | null>(null);
  const [recognizedPoem, setRecognizedPoem] = useState<RecognizedPoem | null>(null);
  const [candidates, setCandidates] = useState<CandidatePoem[]>([]);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(0);
  const [learningCard, setLearningCard] = useState<LearningCard | null>(null);
  const [visualBrief, setVisualBrief] = useState<VisualBrief | null>(null);
  const [recitationText, setRecitationText] = useState('');
  const [newComment, setNewComment] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const selectedCandidate = candidates[selectedCandidateIndex] ?? null;
  const posterFileName = useMemo(() => `${(currentPost?.title || '诗词朋友圈').replace(/[\\/:*?"<>|]/g, '') || '诗词朋友圈'}-朋友圈海报.svg`, [currentPost?.title]);

  const requestJson = async <T,>(url: string, body: unknown): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(await response.text() || `请求失败：${response.status}`);
    return response.json() as Promise<T>;
  };

  const recognizePoem = async () => {
    const content = inputText.trim();
    if (!content) return;
    setIsRecognizing(true); setErrorMessage(''); setRecognizedPoem(null); setCandidates([]); setSelectedCandidateIndex(0); setLearningCard(null); setVisualBrief(null); setCurrentPost(null); setAnswer('');
    try {
      const data = await requestJson<ApiRecord>('/recognize-poem', { content });
      const recognized = mapRecognized(data);
      const mapped = toRecords(getValue(data, keys.candidates)).map(mapCandidate);
      setRecognizedPoem(recognized);
      setCandidates(mapped.length ? mapped : [{ index: '1', poem: recognized.poem, poet: recognized.poet, title: recognized.title, reason: recognized.reason }]);
      setPage(2);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '诗句识别失败');
    } finally {
      setIsRecognizing(false);
    }
  };

  const generateMoment = async () => {
    const content = selectedCandidate ? `${selectedCandidate.title} ${selectedCandidate.poet} ${selectedCandidate.poem}` : inputText.trim();
    if (!content) return;
    setIsGenerating(true); setErrorMessage(''); setAnswer('');
    try {
      const data = await requestJson<ApiRecord>('/create-moments', { content });
      const recognized = mapRecognized(data);
      const likedUsers = normalizeLikedUsers(getValue(data, keys.likes));
      const comments = toRecords(getValue(data, keys.comments)).map((comment, i) => ({
        id: `comment-${i}`, author: getString(comment, keys.commenter, `诗友${i + 1}`), content: getString(comment, keys.commentContent), time: '刚刚',
      })).filter((comment) => comment.content);
      const newPost: MomentPost = {
        id: `post-${Date.now()}`, author: recognized.poet || '佚名', avatar: createLocalAvatar(recognized.poet || '佚名'), poem: recognized.poem, title: recognized.title,
        content: getString(data, keys.postCopy, recognized.poem), postscript: getString(data, keys.postscript, recognized.title), image: toAbsoluteUrl(getString(data, keys.imagePath)),
        time: getString(data, keys.postTime, '刚刚'), likes: likedUsers.length, isLiked: false, comments, likedUsers,
      };
      const mapped = toRecords(getValue(data, keys.candidates)).map(mapCandidate);
      setRecognizedPoem(recognized); setCandidates(mapped.length ? mapped : candidates); setLearningCard(mapLearningCard(toRecord(getValue(data, keys.learningCard))));
      setVisualBrief(mapVisualBrief(toRecord(getValue(data, keys.visualBrief)))); setRecitationText(getString(data, keys.recitation, `${recognized.title}，${recognized.poet}。${recognized.poem}`));
      setCurrentPost(newPost); setPage(3);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const speakText = (text: string) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN'; utterance.rate = 0.9; utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };
  const speakPoem = () => speakText(recitationText || (currentPost ? `${currentPost.title}，${currentPost.author}。${currentPost.poem}` : ''));

  const askQuestion = async () => {
    if (!currentPost || !question.trim()) return;
    setIsAsking(true); setErrorMessage('');
    try {
      const data = await requestJson<ApiRecord>('/ask-poem', { poem: currentPost.poem, poet: currentPost.author, title: currentPost.title, question });
      const reply = getString(data, keys.answer);
      setAnswer(reply); speakText(reply);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '问答生成失败');
    } finally {
      setIsAsking(false);
    }
  };

  const startVoiceQuestion = () => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) { setErrorMessage('当前浏览器不支持语音输入，请使用文字提问。'); return; }
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'zh-CN'; recognition.interimResults = false; recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onerror = () => { setIsListening(false); setErrorMessage('语音识别失败，请重试或改用文字输入。'); };
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript) setQuestion((prev) => `${prev}${prev ? ' ' : ''}${transcript}`);
    };
    recognition.start();
  };

  const downloadMomentPoster = () => {
    if (!momentRef.current || !currentPost) return;
    const cloned = momentRef.current.cloneNode(true) as HTMLElement;
    cloned.querySelectorAll('[data-no-poster="true"]').forEach((node) => node.remove());
    cloned.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    const styles = Array.from(document.querySelectorAll('style')).map((style) => style.textContent ?? '').join('\n');
    const html = new XMLSerializer().serializeToString(cloned);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1400" viewBox="0 0 900 1400"><foreignObject width="900" height="1400"><div xmlns="http://www.w3.org/1999/xhtml"><style>${styles}.poster-export{width:900px;min-height:1400px;box-sizing:border-box}</style>${html}</div></foreignObject></svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = posterFileName; link.click(); URL.revokeObjectURL(url);
  };

  const toggleLike = () => {
    if (!currentPost) return;
    setCurrentPost(currentPost.isLiked
      ? { ...currentPost, isLiked: false, likes: Math.max(currentPost.likes - 1, 0), likedUsers: currentPost.likedUsers.filter((user) => user !== '我') }
      : { ...currentPost, isLiked: true, likes: currentPost.likes + 1, likedUsers: [...currentPost.likedUsers, '我'] });
  };
  const addComment = () => {
    if (!currentPost || !newComment.trim() || !commentAuthor.trim()) return;
    setCurrentPost({ ...currentPost, comments: [...currentPost.comments, { id: `comment-${Date.now()}`, author: commentAuthor, content: newComment, time: '刚刚' }] });
    setNewComment(''); setCommentAuthor('');
  };

  const renderPager = () => (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#b9d7d2] bg-white p-3 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {([1, 2, 3] as Page[]).map((item) => <button key={item} type="button" onClick={() => setPage(item)} className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${page === item ? 'border-[#1f6f68] bg-[#1f6f68] text-white' : 'border-[#b9d7d2] bg-white text-[#315f5a] hover:bg-[#eef7f5]'}`}>第{item}页</button>)}
      </div>
      <p className="text-sm text-[#536b68]">{page === 1 ? '输入与生成时间轴' : page === 2 ? '识别结果、候选选择、文化解读' : '朋友圈本体、下载与互动问答'}</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#f5fbf9] text-[#123c3a]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-8">
        <section className="rounded-xl border border-[#b9d7d2] bg-white p-6 shadow-sm">
          <p className="mb-2 text-sm font-semibold text-[#c43b4d]">AI 诗词传播展示平台</p>
          <h1 className="max-w-4xl text-3xl font-bold leading-tight md:text-5xl">输入一句诗、半句诗或白话描述，生成可识别、可解读、可朗读、可分享的诗词朋友圈。</h1>
        </section>
        {renderPager()}
        {page === 1 && (
          <section className="grid gap-5 lg:grid-cols-[1fr_380px]">
            <div className="rounded-xl border border-[#b9d7d2] bg-white p-5 shadow-sm">
              <SectionTitle icon={<Search className="h-5 w-5" />} title="输入区" desc="可以输入原句、残句、错别字线索，或直接用白话描述想表达的场景。" />
              <textarea
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                placeholder="例：写江南春风和思乡的那句诗"
                className="min-h-36 w-full resize-none rounded-lg border border-[#8fc7bf] bg-[#f9fdfc] p-4 text-lg leading-relaxed outline-none transition focus:border-[#1f6f68]"
                maxLength={220}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {demoInputs.map((item) => (
                  <button key={item} type="button" onClick={() => setInputText(item)} className="rounded-lg border border-[#b9d7d2] px-3 py-1.5 text-sm text-[#315f5a] transition hover:border-[#1f6f68] hover:bg-[#eef7f5]">
                    {item}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={recognizePoem} disabled={!inputText.trim() || isRecognizing || isGenerating} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#1f6f68] px-4 py-3 font-semibold text-[#1f6f68] transition hover:bg-[#e8f4f1] disabled:cursor-not-allowed disabled:opacity-50">
                  <Search className="h-5 w-5" />
                  {isRecognizing ? '识别中...' : '识别诗句'}
                </button>
                <button type="button" onClick={generateMoment} disabled={!inputText.trim() || isGenerating || isRecognizing} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1f6f68] px-5 py-3 font-semibold text-white transition hover:bg-[#185a55] disabled:cursor-not-allowed disabled:opacity-50">
                  <Share2 className="h-5 w-5" />
                  {isGenerating ? '生成中...' : '一键生成朋友圈'}
                </button>
              </div>
              {errorMessage && <p className="mt-3 rounded-lg border border-[#e3a3ad] bg-[#fff7f8] p-3 text-sm text-[#9d2739]">{errorMessage}</p>}
            </div>

            <aside className="rounded-xl border border-[#b9d7d2] bg-white p-5 shadow-sm">
              <SectionTitle icon={<Sparkles className="h-5 w-5" />} title="生成时间轴" desc="按生成链路展示输入、识别、候选、解读、朋友圈和下载进度。" />
              <div className="space-y-3">
                {flowSteps.map((step, index) => {
                  const done = index === 0 || (index === 1 && recognizedPoem) || (index === 2 && candidates.length) || (index === 3 && learningCard) || (index === 4 && currentPost);
                  const active = (index === 1 && isRecognizing) || (index >= 3 && isGenerating);
                  return (
                    <div key={step} className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${done ? 'bg-[#1f6f68] text-white' : active ? 'bg-[#c43b4d] text-white' : 'bg-[#eef7f5] text-[#536b68]'}`}>
                        {done ? <Check className="h-4 w-4" /> : index + 1}
                      </div>
                      <div className="flex-1 rounded-lg border border-[#d4e7e3] px-3 py-2">
                        <p className="font-semibold">{step}</p>
                        <p className="text-xs text-[#536b68]">{done ? '已完成' : active ? '处理中' : '等待开始'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>
          </section>
        )}

        {page === 2 && (
          <section className="space-y-5">
            {!recognizedPoem && <div className="rounded-xl border border-[#b9d7d2] bg-white p-5 text-[#536b68]">先在第一页输入线索并点击“识别诗句”，这里会展示识别结果和候选卡片。</div>}
            {recognizedPoem && (
              <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
                <aside className="rounded-xl border border-[#b9d7d2] bg-white p-5 shadow-sm">
                  <SectionTitle icon={<Search className="h-5 w-5" />} title="识别结果" desc="展示最终匹配到的诗句、作者、题目和识别说明。" />
                  <div className="space-y-3">
                    <p className="text-xl font-bold leading-relaxed">{recognizedPoem.poem}</p>
                    <p className="text-sm text-[#536b68]">《{recognizedPoem.title}》 · {recognizedPoem.poet}</p>
                    {recognizedPoem.confidence && <p className="text-sm text-[#536b68]">置信度：{recognizedPoem.confidence}</p>}
                    <p className="rounded-lg bg-[#eef7f5] p-3 text-sm leading-relaxed text-[#315f5a]">{recognizedPoem.reason}</p>
                  </div>
                </aside>

                <div className="rounded-xl border border-[#b9d7d2] bg-white p-5 shadow-sm">
                  <SectionTitle icon={<BookOpen className="h-5 w-5" />} title="候选卡片" desc="支持自主选择候选诗句，选中的卡片将作为下一步生成依据。" />
                  <div className="grid gap-3 md:grid-cols-3">
                    {candidates.map((candidate, index) => (
                      <button key={`${candidate.poem}-${index}`} type="button" onClick={() => setSelectedCandidateIndex(index)} className={`rounded-lg border p-4 text-left transition ${selectedCandidateIndex === index ? 'border-[#c43b4d] bg-[#fff7f8]' : 'border-[#d4e7e3] bg-[#f8fbfa] hover:border-[#1f6f68]'}`}>
                        <p className="mb-2 text-sm font-semibold text-[#c43b4d]">候选 {candidate.index}</p>
                        <p className="mb-2 font-bold leading-relaxed">{candidate.poem}</p>
                        <p className="mb-3 text-sm text-[#536b68]">《{candidate.title}》 · {candidate.poet}</p>
                        <p className="text-sm leading-relaxed text-[#315f5a]">{candidate.reason}</p>
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={generateMoment} disabled={isGenerating} className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-[#1f6f68] px-5 py-3 font-semibold text-white transition hover:bg-[#185a55] disabled:cursor-not-allowed disabled:opacity-50">
                    <Share2 className="h-5 w-5" />
                    {isGenerating ? '生成中...' : '用选中候选生成朋友圈'}
                  </button>
                </div>
              </section>
            )}
            {learningCard && (
              <section className="rounded-xl border border-[#b9d7d2] bg-white p-5 shadow-sm">
                <SectionTitle icon={<BookOpen className="h-5 w-5" />} title="诗词文化解读卡" desc="把识别结果转化为适合学习、展示和传播的文化解读。" />
                <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
                  <div className="rounded-lg bg-[#f8f3e9] p-5">
                    <p className="mb-2 text-sm font-semibold text-[#c43b4d]">《{learningCard.title}》 · {learningCard.poet}</p>
                    <p className="text-2xl font-bold leading-relaxed">{learningCard.original}</p>
                    <button type="button" onClick={speakPoem} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#1f6f68] px-4 py-2 font-semibold text-[#1f6f68] transition hover:bg-[#e8f4f1]">
                      <Volume2 className="h-5 w-5" />
                      诗词朗读
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      ['白话译文', learningCard.translation],
                      ['作者简介', learningCard.authorIntro],
                      ['意象分析', learningCard.imagery],
                      ['情感表达', learningCard.emotion],
                      ['适用场景', learningCard.scene],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-[#d4e7e3] bg-[#f8fbfa] p-4">
                        <p className="mb-2 text-sm font-semibold text-[#c43b4d]">{label}</p>
                        <p className="text-sm leading-relaxed text-[#315f5a]">{value || '暂无内容'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {visualBrief && (
              <section className="rounded-xl border border-[#b9d7d2] bg-white p-5 shadow-sm">
                <SectionTitle icon={<Sparkles className="h-5 w-5" />} title="意境到图像分析" desc="展示 AI 如何把诗意转化为视觉生成语言。" />
                <div className="grid gap-3 md:grid-cols-5">
                  {[
                    ['诗词意象', visualBrief.imagery],
                    ['情感基调', visualBrief.tone],
                    ['画面元素', visualBrief.elements],
                    ['色彩建议', visualBrief.colors],
                    ['画风建议', visualBrief.style],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-[#eef7f5] p-4">
                      <p className="mb-3 text-sm font-semibold text-[#c43b4d]">{label}</p>
                      <div className="flex flex-wrap gap-2">
                        {splitTags(value).map((tag) => <span key={tag} className="rounded-lg bg-white px-3 py-1 text-sm text-[#315f5a] shadow-sm">{tag}</span>)}
                        {!splitTags(value).length && <span className="text-sm text-[#536b68]">暂无内容</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </section>
        )}

        {page === 3 && (
          <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
            {!currentPost && <div className="rounded-xl border border-[#b9d7d2] bg-white p-5 text-[#536b68] lg:col-span-2">先完成生成后，第三页会显示朋友圈本体、下载按钮和互动问答区。</div>}
            {currentPost && (
              <>
                <article ref={momentRef} className="poster-export rounded-xl border border-[#b9d7d2] bg-white p-5 shadow-sm">
                  <SectionTitle icon={<Share2 className="h-5 w-5" />} title="朋友圈" desc="这里就是最终下载的海报内容，下载不会再重新设计另一版。" />
                  <div className="mb-4 flex items-center gap-3">
                    <img src={currentPost.avatar} alt="作者头像" className="h-12 w-12 rounded-lg border border-[#8fc7bf]" />
                    <div>
                      <h2 className="text-xl font-bold">{currentPost.author}</h2>
                      <p className="flex items-center gap-1 text-sm text-[#536b68]"><Clock className="h-4 w-4" />{currentPost.time}</p>
                    </div>
                  </div>

                  <div className="mb-4 rounded-lg border-l-4 border-[#c43b4d] bg-[#f8fbfa] p-4">
                    <p className="mb-2 text-sm text-[#536b68]">《{currentPost.title}》 · {currentPost.poem}</p>
                    <p className="text-lg leading-relaxed">{currentPost.content}</p>
                    <p className="mt-2 text-sm italic text-[#536b68]">{currentPost.postscript}</p>
                  </div>
                  {currentPost.image && <img src={currentPost.image} alt="古风意境图" className="mb-4 w-full rounded-lg border border-[#b9d7d2] object-cover" />}

                  <div className="border-t border-[#d4e7e3] pt-4">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="rounded-lg bg-[#eef7f5] px-3 py-2 text-sm text-[#315f5a]">{currentPost.likedUsers.length ? currentPost.likedUsers.join('、') : '暂无点赞'}</p>
                      <button type="button" onClick={toggleLike} data-no-poster="true" className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#c43b4d] px-4 py-2 font-semibold text-[#c43b4d] transition hover:bg-[#fff1f3]">
                        <Heart className={`h-5 w-5 ${currentPost.isLiked ? 'fill-current' : ''}`} />
                        {currentPost.isLiked ? '已点赞' : '点赞'} ({currentPost.likes})
                      </button>
                    </div>
                    <div className="mb-4 space-y-3">
                      {currentPost.comments.map((comment) => (
                        <div key={comment.id} className="rounded-lg bg-[#f8fbfa] p-3">
                          <p className="mb-1 text-sm font-semibold text-[#1f6f68]">{comment.author}</p>
                          <p className="text-sm leading-relaxed text-[#314946]">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[140px_1fr_auto]" data-no-poster="true">
                      <input value={commentAuthor} onChange={(event) => setCommentAuthor(event.target.value)} placeholder="评论人" className="rounded-lg border border-[#8fc7bf] px-3 py-2 outline-none focus:border-[#1f6f68]" maxLength={10} />
                      <input value={newComment} onChange={(event) => setNewComment(event.target.value)} placeholder="留下一句评论" className="rounded-lg border border-[#8fc7bf] px-3 py-2 outline-none focus:border-[#1f6f68]" maxLength={100} />
                      <button type="button" onClick={addComment} disabled={!newComment.trim() || !commentAuthor.trim()} className="rounded-lg bg-[#c43b4d] px-4 py-2 font-semibold text-white transition hover:bg-[#a92f40] disabled:cursor-not-allowed disabled:opacity-50">评论</button>
                    </div>
                  </div>
                </article>

                <div className="space-y-5">
                  <aside className="rounded-xl border border-[#b9d7d2] bg-white p-5 shadow-sm">
                    <SectionTitle icon={<Download className="h-5 w-5" />} title="下载" desc="下载内容就是左侧朋友圈页本身，保留当前文案、配图、点赞和评论。" />
                    <button type="button" onClick={downloadMomentPoster} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1f6f68] px-4 py-3 font-semibold text-white transition hover:bg-[#185a55]">
                      <Download className="h-5 w-5" />
                      下载朋友圈海报
                    </button>
                  </aside>

                  <aside className="rounded-xl border border-[#b9d7d2] bg-white p-5 shadow-sm">
                    <SectionTitle icon={<MessageCircleQuestion className="h-5 w-5" />} title="互动问答区" desc="支持文字或语音输入；AI 回答会以文字展示，并同步语音朗读。" />
                    <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="例：这句诗适合表达什么情绪？" className="min-h-24 w-full resize-none rounded-lg border border-[#8fc7bf] bg-[#f9fdfc] p-3 outline-none focus:border-[#1f6f68]" maxLength={120} />
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <button type="button" onClick={startVoiceQuestion} disabled={isListening} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#1f6f68] px-4 py-3 font-semibold text-[#1f6f68] transition hover:bg-[#e8f4f1] disabled:cursor-not-allowed disabled:opacity-50">
                        <Mic className="h-5 w-5" />
                        {isListening ? '聆听中...' : '语音输入'}
                      </button>
                      <button type="button" onClick={askQuestion} disabled={!question.trim() || isAsking} className="rounded-lg bg-[#c43b4d] px-4 py-3 font-semibold text-white transition hover:bg-[#a92f40] disabled:cursor-not-allowed disabled:opacity-50">
                        {isAsking ? '回答中...' : '提问并朗读'}
                      </button>
                    </div>
                    {answer && (
                      <div className="mt-3 rounded-lg bg-[#fff7f8] p-3 text-sm leading-relaxed text-[#793042]">
                        <p>{answer}</p>
                        <button type="button" onClick={() => speakText(answer)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#c43b4d] px-3 py-2 font-semibold text-[#c43b4d] transition hover:bg-white">
                          <Volume2 className="h-4 w-4" />
                          再朗读一遍
                        </button>
                      </div>
                    )}
                  </aside>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

export default App;
