import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { BookOpen, Check, Clock, Download, Heart, MessageCircleQuestion, Mic, Search, Volume2 } from 'lucide-react';
import './index.css';

type ApiRecord = Record<string, unknown>;
type Page = 1 | 2 | 3;

interface CandidatePoem { index: string; poem: string; poet: string; title: string; reason: string }
interface Comment { id: string; author: string; content: string; time: string }
interface LearningCard { original: string; dynasty: string; poet: string; title: string; translation: string; authorIntro: string; imagery: string; emotion: string; scene: string }
interface RecognizedPoem { poem: string; poet: string; title: string; reason: string; confidence: string; source: string }
interface MomentPost {
  id: string;
  author: string;
  avatar: string;
  poem: string;
  title: string;
  content: string;
  image: string;
  time: string;
  likes: number;
  isLiked: boolean;
  comments: Comment[];
  postscript: string;
  likedUsers: string[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';
const demoInputs = ['孤舟蓑笠翁，独钓寒江雪', '写江南春风和思乡的那句诗', '明月何时', '想表达离别和不舍'];
const flowSteps = ['输入线索', '匹配诗句', '候选确认', '诗词卡片', '朋友圈生成'];

const keys = {
  poem: ['诗句'], poet: ['诗人', '作者'], title: ['题目'], reason: ['识别说明'], confidence: ['识别置信度'], source: ['识别来源'],
  candidates: ['候选诗句'], candidateIndex: ['候选'], matchReason: ['匹配理由'], learningCard: ['诗词文化解读'], recitation: ['朗诵文本'],
  postCopy: ['朋友圈文案'], postscript: ['朋友圈附言'], imagePath: ['图片路径'], postTime: ['朋友圈发布时间'],
  likes: ['朋友圈点赞'], comments: ['朋友圈评论'], commenter: ['评论人'], commentContent: ['评论内容'],
  answer: ['回答'],
  original: ['原诗'], dynasty: ['朝代'], translation: ['白话译文'], authorIntro: ['作者简介'], imageryAnalysis: ['意象分析'], emotion: ['情感表达'], scene: ['适用场景'],
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
function normalizeText(value: string) {
  return value.replace(/[^\u4e00-\u9fa5]/g, '');
}
function looksLikeExplicitPoem(input: string, recognized: RecognizedPoem) {
  const plainInput = normalizeText(input);
  const plainPoem = normalizeText(recognized.poem);
  const clueWords = /(写|关于|描述|表达|那句|哪句|类似|适合|想|意思|场景|感觉|不舍|思乡|离别)/;
  if (!plainInput || clueWords.test(input)) return false;
  if (input.includes('，') || input.includes('。') || input.includes(',') || input.includes('、')) return plainInput.length >= 7;
  if (plainPoem && plainInput === plainPoem) return true;
  if (plainInput.length >= 5 && plainPoem.includes(plainInput)) return true;
  if (plainInput.length < 8 || !plainPoem) return false;

  const inputChars = Array.from(new Set(plainInput));
  const matchedChars = inputChars.filter((char) => plainPoem.includes(char)).length;
  return matchedChars / inputChars.length >= 0.75;
}
function splitPoemLines(poem: string) {
  return poem
    .replace(/\r/g, '')
    .split(/\n|(?<=[。！？；，])/)
    .map((line) => line.trim())
    .filter(Boolean);
}
function mapRecognized(data: ApiRecord): RecognizedPoem {
  return {
    poem: getString(data, keys.poem),
    poet: getString(data, keys.poet, '佚名'),
    title: getString(data, keys.title, '未识别题目'),
    reason: getString(data, keys.reason, '已匹配到最可能的原诗句。'),
    confidence: getString(data, keys.confidence),
    source: getString(data, keys.source),
  };
}
function mapCandidate(data: ApiRecord, index: number): CandidatePoem {
  return {
    index: getString(data, keys.candidateIndex, String(index + 1)),
    poem: getString(data, keys.poem),
    poet: getString(data, keys.poet, '佚名'),
    title: getString(data, keys.title, '未识别题目'),
    reason: getString(data, keys.matchReason, '与输入线索的语义和关键词相近。'),
  };
}
function mapLearningCard(data: ApiRecord | null, fallback?: RecognizedPoem): LearningCard | null {
  if (!data || Object.keys(data).length === 0) return null;
  return {
    original: getString(data, keys.original, fallback?.poem ?? ''),
    dynasty: getString(data, keys.dynasty),
    poet: getString(data, keys.poet, fallback?.poet ?? '佚名'),
    title: getString(data, keys.title, fallback?.title ?? '未识别题目'),
    translation: getString(data, keys.translation),
    authorIntro: getString(data, keys.authorIntro),
    imagery: getString(data, keys.imageryAnalysis),
    emotion: getString(data, keys.emotion),
    scene: getString(data, keys.scene),
  };
}
function SectionTitle({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="rounded-lg bg-[#e8f4f1] p-2 text-[#1f6f68]">{icon}</div>
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        {desc && <p className="text-sm leading-relaxed text-[#536b68]">{desc}</p>}
      </div>
    </div>
  );
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
  const [recitationText, setRecitationText] = useState('');
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isQuestionOpen, setIsQuestionOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const selectedCandidate = candidates[selectedCandidateIndex] ?? null;
  const posterFileName = useMemo(() => `${(currentPost?.title || '诗境流年').replace(/[\\/:*?"<>|]/g, '') || '诗境流年'}-朋友圈海报.svg`, [currentPost?.title]);

  const requestJson = async <T,>(url: string, body: unknown): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(await response.text() || `请求失败：${response.status}`);
    return response.json() as Promise<T>;
  };

  const generateMoment = async (poem: RecognizedPoem | CandidatePoem) => {
    setIsGenerating(true);
    setErrorMessage('');
    try {
      const data = await requestJson<ApiRecord>('/create-moments', { poem: poem.poem, poet: poem.poet, title: poem.title });
      const recognized = mapRecognized(data);
      const likedUsers = normalizeLikedUsers(getValue(data, keys.likes));
      const comments = toRecords(getValue(data, keys.comments)).map((comment, i) => ({
        id: `comment-${i}`,
        author: getString(comment, keys.commenter, `诗友${i + 1}`),
        content: getString(comment, keys.commentContent),
        time: '刚刚',
      })).filter((comment) => comment.content);
      const newPost: MomentPost = {
        id: `post-${Date.now()}`,
        author: recognized.poet || '佚名',
        avatar: createLocalAvatar(recognized.poet || '佚名'),
        poem: recognized.poem,
        title: recognized.title,
        content: getString(data, keys.postCopy, recognized.poem),
        postscript: getString(data, keys.postscript, recognized.title),
        image: toAbsoluteUrl(getString(data, keys.imagePath)),
        time: getString(data, keys.postTime, '刚刚'),
        likes: likedUsers.length,
        isLiked: false,
        comments,
        likedUsers,
      };
      setRecognizedPoem(recognized);
      setCurrentPost(newPost);
      setPage(3);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '朋友圈生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const createCardThenGenerateMoment = async (poem: RecognizedPoem | CandidatePoem) => {
    setIsCreatingCard(true);
    setIsGenerating(true);
    setErrorMessage('');
    const cardPromise = requestJson<ApiRecord>('/create-poem-card', { poem: poem.poem, poet: poem.poet, title: poem.title })
      .then((data) => {
        const recognized = mapRecognized({ ...data, 诗句: poem.poem, 识别说明: recognizedPoem?.reason ?? '' });
        setRecognizedPoem(recognized);
        setLearningCard(mapLearningCard(toRecord(getValue(data, keys.learningCard)), recognized));
        setRecitationText(getString(data, keys.recitation, `${poem.title}，${poem.poet}。${poem.poem}`));
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : '诗词卡片生成失败');
      })
      .finally(() => {
        setIsCreatingCard(false);
      });

    const momentPromise = generateMoment(poem);
    await Promise.allSettled([cardPromise, momentPromise]);
  };

  const recognizePoem = async () => {
    const content = inputText.trim();
    if (!content) return;
    setIsRecognizing(true);
    setErrorMessage('');
    setRecognizedPoem(null);
    setCandidates([]);
    setSelectedCandidateIndex(0);
    setLearningCard(null);
    setRecitationText('');
    setCurrentPost(null);
    setQuestion('');
    setAnswer('');
    try {
      const data = await requestJson<ApiRecord>('/recognize-poem', { content });
      const recognized = mapRecognized(data);
      const mapped = toRecords(getValue(data, keys.candidates)).map(mapCandidate);
      const isExplicit = looksLikeExplicitPoem(content, recognized);
      const nextCandidates = isExplicit ? [] : (mapped.length ? mapped : [{ index: '1', poem: recognized.poem, poet: recognized.poet, title: recognized.title, reason: recognized.reason }]);
      setRecognizedPoem(recognized);
      setCandidates(nextCandidates);
      setPage(2);
      if (isExplicit) void createCardThenGenerateMoment(recognized);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '诗句识别失败');
    } finally {
      setIsRecognizing(false);
    }
  };

  const speakText = (text: string) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };
  const speakPoem = () => speakText(recitationText || learningCard?.original || recognizedPoem?.poem || '');

  const askQuestion = async () => {
    if (!question.trim()) return;
    const context = currentPost
      ? { poem: currentPost.poem, poet: currentPost.author, title: currentPost.title }
      : recognizedPoem
        ? { poem: recognizedPoem.poem, poet: recognizedPoem.poet, title: recognizedPoem.title }
        : null;
    if (!context) {
      setAnswer('请先匹配诗句后再提问。');
      return;
    }
    setIsAsking(true);
    setErrorMessage('');
    try {
      const data = await requestJson<ApiRecord>('/ask-poem', { ...context, question });
      const reply = getString(data, keys.answer);
      setAnswer(reply);
      speakText(reply);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '问答生成失败');
    } finally {
      setIsAsking(false);
    }
  };

  const collectPosterStyles = () => {
    const cssFromSheets = Array.from(document.styleSheets).flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((rule) => rule.cssText);
      } catch {
        return [];
      }
    });
    const cssFromTags = Array.from(document.querySelectorAll('style')).map((style) => style.textContent ?? '');
    return [...cssFromSheets, ...cssFromTags].join('\n');
  };

  const imageToDataUrl = async (src: string) => {
    if (!src || src.startsWith('data:')) return src;
    const response = await fetch(src);
    if (!response.ok) return src;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  };

  const inlinePosterImages = async (root: HTMLElement) => {
    const images = Array.from(root.querySelectorAll('img'));
    await Promise.all(images.map(async (image) => {
      const src = image.getAttribute('src') ?? '';
      const dataUrl = await imageToDataUrl(src);
      image.setAttribute('src', dataUrl);
    }));
  };

  const startVoiceInput = () => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) { setErrorMessage('当前浏览器不支持语音输入，请使用文字输入。'); return; }
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onerror = () => { setIsListening(false); setErrorMessage('语音识别失败，请重试或改用文字输入。'); };
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript) setInputText((prev) => `${prev}${prev ? ' ' : ''}${transcript}`);
    };
    recognition.start();
  };

  const startVoiceQuestion = () => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) { setErrorMessage('当前浏览器不支持语音输入，请使用文字输入。'); return; }
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onerror = () => { setIsListening(false); setErrorMessage('语音识别失败，请重试或改用文字输入。'); };
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript) setQuestion((prev) => `${prev}${prev ? ' ' : ''}${transcript}`);
    };
    recognition.start();
  };

  const downloadMomentPoster = async () => {
    if (!momentRef.current || !currentPost) return;
    const cloned = momentRef.current.cloneNode(true) as HTMLElement;
    cloned.querySelectorAll('[data-no-poster="true"]').forEach((node) => node.remove());
    await inlinePosterImages(cloned);
    cloned.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    const styles = collectPosterStyles();
    const html = new XMLSerializer().serializeToString(cloned);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1400" viewBox="0 0 900 1400"><foreignObject width="900" height="1400"><div xmlns="http://www.w3.org/1999/xhtml"><style>${styles}.poster-export{width:900px;min-height:1400px;box-sizing:border-box}</style>${html}</div></foreignObject></svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = posterFileName;
    link.click();
    URL.revokeObjectURL(url);
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
    setNewComment('');
    setCommentAuthor('');
  };

  const renderPager = () => (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#b9d7d2] bg-white p-3 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {([1, 2, 3] as Page[]).map((item) => (
          <button key={item} type="button" onClick={() => setPage(item)} className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${page === item ? 'border-[#1f6f68] bg-[#1f6f68] text-white' : 'border-[#b9d7d2] bg-white text-[#315f5a] hover:bg-[#eef7f5]'}`}>
            第{item}页
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#f5fbf9] text-[#123c3a]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8">
        <section className="overflow-hidden rounded-xl border border-[#b9d7d2] bg-white shadow-sm">
          <div className="grid gap-0 md:grid-cols-[1fr_280px]">
            <div className="p-6 md:p-8">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="h-px w-10 bg-[#8a6f2a]" />
                <p className="text-sm font-semibold tracking-[0.28em] text-[#8a6f2a]">POETIC MOMENTS</p>
              </div>
              <h1 className="text-4xl font-bold leading-tight tracking-[0.12em] md:text-6xl">诗境流年</h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed tracking-[0.08em] text-[#315f5a]">当古诗遇见 AI，诗意回到生活。</p>
            </div>
            <div className="hidden border-l border-[#d4e7e3] bg-[#f7f2df] p-8 md:flex md:flex-col md:justify-between">
              <p className="text-sm leading-loose tracking-[0.08em] text-[#6f642c]">从一句残诗、一处景色、一点心绪里，找回古人留下的回声。</p>
              <div className="text-right">
                <p className="text-xs font-semibold tracking-[0.32em] text-[#8a6f2a]">AI POETRY</p>
                <p className="mt-3 text-3xl font-bold tracking-[0.22em] text-[#8a6f2a]">诗意</p>
              </div>
            </div>
          </div>
        </section>

        {renderPager()}

        {page === 1 && (
          <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
            <div className="rounded-xl border border-[#b9d7d2] bg-white p-5 shadow-sm">
              <SectionTitle icon={<Search className="h-5 w-5" />} title="输入线索" desc="" />
              <textarea
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                placeholder="输入一句残诗、一处景色或一段心绪，生成属于此刻的诗词卡片与朋友圈海报"
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
                <button type="button" onClick={recognizePoem} disabled={!inputText.trim() || isRecognizing || isCreatingCard || isGenerating} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1f6f68] px-5 py-3 font-semibold text-white transition hover:bg-[#185a55] disabled:cursor-not-allowed disabled:opacity-50">
                  <Search className="h-5 w-5" />
                  {isRecognizing || isCreatingCard || isGenerating ? '处理中...' : '开始匹配诗句'}
                </button>
                <button type="button" onClick={startVoiceInput} disabled={isListening} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#1f6f68] px-4 py-3 font-semibold text-[#1f6f68] transition hover:bg-[#e8f4f1] disabled:cursor-not-allowed disabled:opacity-50">
                  <Mic className="h-5 w-5" />
                  {isListening ? '聆听中...' : '语音输入'}
                </button>
              </div>
              {errorMessage && <p className="mt-3 rounded-lg border border-[#d9c985] bg-[#fffbed] p-3 text-sm text-[#6d5b1f]">{errorMessage}</p>}
            </div>

            <aside className="rounded-xl border border-[#b9d7d2] bg-white p-5 shadow-sm">
              <SectionTitle icon={<BookOpen className="h-5 w-5" />} title="生成流程" desc="" />
              <div className="space-y-3">
                {flowSteps.map((step, index) => {
                  const done = index === 0 || (index === 1 && recognizedPoem) || (index === 2 && (recognizedPoem && !candidates.length || selectedCandidate)) || (index === 3 && learningCard) || (index === 4 && currentPost);
                  const active = (index === 1 && isRecognizing) || (index === 3 && isCreatingCard) || (index === 4 && isGenerating);
                  return (
                    <div key={step} className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${done ? 'bg-[#1f6f68] text-white' : active ? 'bg-[#8a6f2a] text-white' : 'bg-[#eef7f5] text-[#536b68]'}`}>
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
            {!recognizedPoem && <div className="rounded-xl border border-[#b9d7d2] bg-white p-5 text-[#536b68]">先在第一页输入线索并点击“开始识别”，这里会展示候选诗句。</div>}
            {recognizedPoem && (
              <>
                <section className="rounded-xl border border-[#b9d7d2] bg-white p-5 shadow-sm">
                  <SectionTitle icon={<Search className="h-5 w-5" />} title="匹配结果" desc="" />
                  <div className="rounded-lg bg-[#eef7f5] p-4">
                    <p className="text-xl font-bold leading-relaxed">{recognizedPoem.poem}</p>
                    <p className="mt-2 text-sm text-[#536b68]">《{recognizedPoem.title}》 · {recognizedPoem.poet}</p>
                    <p className="mt-3 text-sm leading-relaxed text-[#315f5a]">{recognizedPoem.reason}</p>
                  </div>
                </section>

                {candidates.length > 0 && (
                  <section className="rounded-xl border border-[#b9d7d2] bg-white p-5 shadow-sm">
                    <SectionTitle icon={<BookOpen className="h-5 w-5" />} title="候选诗句" desc="选择最符合你本意的一条，诗词卡片会在本页生成。" />
                    <div className="grid gap-3 md:grid-cols-3">
                      {candidates.map((candidate, index) => (
                        <button key={`${candidate.poem}-${index}`} type="button" onClick={() => setSelectedCandidateIndex(index)} className={`rounded-lg border p-4 text-left transition ${selectedCandidateIndex === index ? 'border-[#8a6f2a] bg-[#f7f2df]' : 'border-[#d4e7e3] bg-[#f8fbfa] hover:border-[#1f6f68]'}`}>
                          <p className="mb-2 text-sm font-semibold text-[#8a6f2a]">候选 {candidate.index}</p>
                          <p className="mb-2 font-bold leading-relaxed">{candidate.poem}</p>
                          <p className="mb-3 text-sm text-[#536b68]">《{candidate.title}》 · {candidate.poet}</p>
                          <p className="text-sm leading-relaxed text-[#315f5a]">{candidate.reason}</p>
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={() => selectedCandidate && createCardThenGenerateMoment(selectedCandidate)} disabled={!selectedCandidate || isCreatingCard || isGenerating} className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-[#1f6f68] px-5 py-3 font-semibold text-white transition hover:bg-[#185a55] disabled:cursor-not-allowed disabled:opacity-50">
                      <BookOpen className="h-5 w-5" />
                      {isCreatingCard ? '诗词卡片生成中...' : isGenerating ? '朋友圈生成中...' : '确认并生成诗词卡片'}
                    </button>
                  </section>
                )}

                <section className="rounded-xl border border-[#b9d7d2] bg-white p-5 shadow-sm">
                  <SectionTitle icon={<BookOpen className="h-5 w-5" />} title="诗词卡片" desc="" />
                  {!learningCard && (
                    <div className="rounded-lg bg-[#f8fbfa] p-5 text-sm leading-relaxed text-[#536b68]">
                      {isCreatingCard || isGenerating ? '正在生成诗词卡片，请稍候。' : '请先确认候选诗句。'}
                    </div>
                  )}
                  {learningCard && (
                    <div className="grid gap-4 lg:grid-cols-[minmax(260px,0.72fr)_1.55fr]">
                      <div className="rounded-lg bg-[#f7f2df] p-5">
                        <div className="mb-5 text-center">
                          <h3 className="text-2xl font-bold leading-relaxed">《{learningCard.title}》</h3>
                          <p className="mt-3 text-right text-sm font-semibold text-[#8a6f2a]">
                            {[learningCard.dynasty, learningCard.poet].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <div className="space-y-3 text-center text-lg font-bold leading-loose tracking-[0.16em]">
                          {splitPoemLines(learningCard.original || recognizedPoem.poem).map((line, index) => (
                            <p key={`${line}-${index}`}>{line}</p>
                          ))}
                        </div>
                        <div className="mt-4 flex justify-center">
                          <button type="button" onClick={speakPoem} className="inline-flex items-center gap-2 rounded-lg border border-[#1f6f68] px-4 py-2 font-semibold text-[#1f6f68] transition hover:bg-[#e8f4f1]">
                            <Volume2 className="h-5 w-5" />
                            朗读
                          </button>
                        </div>
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
                            <p className="mb-2 text-sm font-semibold text-[#8a6f2a]">{label}</p>
                            <p className="text-sm leading-relaxed text-[#315f5a]">{value || '暂无内容'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {learningCard && isGenerating && <p className="mt-4 rounded-lg bg-[#eef7f5] p-3 text-sm text-[#315f5a]">朋友圈正在生成，完成后会自动跳转到第三页。</p>}
                </section>
              </>
            )}
          </section>
        )}

        {page === 3 && (
          <section className="mx-auto w-full max-w-4xl">
            {!currentPost && <div className="rounded-xl border border-[#b9d7d2] bg-white p-5 text-[#536b68]">完成生成后，这里会显示朋友圈本体和下载按钮。</div>}
            {currentPost && (
              <div>
                <article ref={momentRef} className="poster-export rounded-xl border border-[#b9d7d2] bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <img src={currentPost.avatar} alt="作者头像" className="h-12 w-12 rounded-lg border border-[#8fc7bf]" />
                    <div>
                      <h2 className="text-xl font-bold">{currentPost.author}</h2>
                      <p className="flex items-center gap-1 text-sm text-[#536b68]"><Clock className="h-4 w-4" />{currentPost.time}</p>
                    </div>
                  </div>

                  <div className="mb-4 rounded-lg border-l-4 border-[#8a6f2a] bg-[#f8fbfa] p-4">
                    <p className="mb-2 text-sm text-[#536b68]">《{currentPost.title}》 · {currentPost.poem}</p>
                    <p className="text-lg leading-relaxed">{currentPost.content}</p>
                    <p className="mt-2 text-sm italic text-[#536b68]">{currentPost.postscript}</p>
                  </div>
                  {currentPost.image && <img src={currentPost.image} alt="古风意境图" className="mb-4 w-full rounded-lg border border-[#b9d7d2] object-cover" />}

                  <div className="border-t border-[#d4e7e3] pt-4">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="rounded-lg bg-[#eef7f5] px-3 py-2 text-sm text-[#315f5a]">{currentPost.likedUsers.length ? currentPost.likedUsers.join('、') : '暂无点赞'}</p>
                      <button type="button" onClick={toggleLike} data-no-poster="true" className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#1f6f68] px-4 py-2 font-semibold text-[#1f6f68] transition hover:bg-[#e8f4f1]">
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
                      <button type="button" onClick={addComment} disabled={!newComment.trim() || !commentAuthor.trim()} className="rounded-lg bg-[#1f6f68] px-4 py-2 font-semibold text-white transition hover:bg-[#185a55] disabled:cursor-not-allowed disabled:opacity-50">评论</button>
                    </div>
                  </div>
                  <div className="mt-5" data-no-poster="true">
                    <button type="button" onClick={downloadMomentPoster} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1f6f68] px-4 py-3 font-semibold text-white transition hover:bg-[#185a55]">
                      <Download className="h-5 w-5" />
                      下载朋友圈海报
                    </button>
                  </div>
                </article>
              </div>
            )}
          </section>
        )}

        <div className="fixed bottom-5 right-5 z-50 h-14 w-14">
          {isQuestionOpen && (
            <div className="absolute bottom-16 right-0 w-[min(360px,calc(100vw-2.5rem))] rounded-xl border border-[#b9d7d2] bg-white p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-[#e8f4f1] p-2 text-[#1f6f68]"><MessageCircleQuestion className="h-5 w-5" /></div>
                  <h2 className="font-bold">互动询问</h2>
                </div>
                <button type="button" onClick={() => setIsQuestionOpen(false)} className="rounded-lg border border-[#d4e7e3] px-3 py-1 text-sm text-[#315f5a] transition hover:bg-[#eef7f5]">
                  关闭
                </button>
              </div>
              <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="例：这句诗适合表达什么情绪？" className="min-h-24 w-full resize-none rounded-lg border border-[#8fc7bf] bg-[#f9fdfc] p-3 outline-none focus:border-[#1f6f68]" maxLength={120} />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={startVoiceQuestion} disabled={isListening} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#1f6f68] px-4 py-3 font-semibold text-[#1f6f68] transition hover:bg-[#e8f4f1] disabled:cursor-not-allowed disabled:opacity-50">
                  <Mic className="h-5 w-5" />
                  {isListening ? '聆听中...' : '语音输入'}
                </button>
                <button type="button" onClick={askQuestion} disabled={!question.trim() || isAsking} className="inline-flex w-full items-center justify-center rounded-lg bg-[#1f6f68] px-4 py-3 font-semibold text-white transition hover:bg-[#185a55] disabled:cursor-not-allowed disabled:opacity-50">
                  {isAsking ? '回答中...' : '提问'}
                </button>
              </div>
              {answer && (
                <div className="mt-3 rounded-lg bg-[#eef7f5] p-3 text-sm leading-relaxed text-[#315f5a]">
                  <p>{answer}</p>
                  <button type="button" onClick={() => speakText(answer)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#1f6f68] px-3 py-2 font-semibold text-[#1f6f68] transition hover:bg-white">
                    <Volume2 className="h-4 w-4" />
                    再朗读一遍
                  </button>
                </div>
              )}
            </div>
          )}
          <button type="button" onClick={() => setIsQuestionOpen((open) => !open)} className="absolute bottom-0 right-0 flex h-14 w-14 items-center justify-center rounded-full bg-[#1f6f68] text-white shadow-xl transition hover:bg-[#185a55]" aria-label="打开互动询问">
            <MessageCircleQuestion className="h-7 w-7" />
          </button>
        </div>
      </div>
    </main>
  );
}

export default App;
