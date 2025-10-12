import React, { useState } from 'react';
import { Heart, Clock, X } from 'lucide-react';

interface Comment {
  id: string;
  author: string;
  content: string;
  time: string;
}

interface MomentPost {
  id: string;
  author: string;
  avatar: string;
  content: string;
  image: string;
  time: string;
  likes: number;
  isLiked: boolean;
  comments: Comment[];
  postscript: string;
  likedUsers: string[];
}

// 诗人简介数据
interface PoetIntroduction {
  name: string;
  era: string;
  description: string;
  works: string;
}

const poetIntroductions: PoetIntroduction[] = [
  {
    name: "王安石",
    era: "北宋",
    description: "字介甫，号半山，北宋著名政治家、文学家、思想家、改革家。宋神宗时期，他发动了旨在改变北宋积贫积弱局面的一场社会改革运动，史称\"王安石变法\"。",
    works: "《临川先生文集》《王临川集》《临川集拾遗》等"
  },
  {
    name: "苏轼",
    era: "北宋",
    description: "字子瞻，号东坡居士，北宋中期文坛领袖，在诗、词、文、书、画等方面取得很高成就。其诗题材广阔，清新豪健，善用夸张比喻，独具风格，与黄庭坚并称\"苏黄\"。",
    works: "《东坡七集》《东坡易传》《东坡乐府》等"
  },
  {
    name: "李清照",
    era: "北宋末南宋初",
    description: "号易安居士，宋代女词人，婉约词派代表，有\"千古第一才女\"之称。所作词，前期多写其悠闲生活，后期多悲叹身世，情调感伤。形式上善用白描手法，自辟途径，语言清丽。",
    works: "《易安居士文集》《易安词》等"
  },
  {
    name: "朱熹",
    era: "南宋",
    description: "字元晦，又字仲晦，号晦庵，晚称晦翁，南宋著名的理学家、思想家、哲学家、教育家、诗人，闽学派的代表人物，儒学集大成者，世尊称为朱子。",
    works: "《四书章句集注》《太极图说解》《楚辞集注》等"
  },
  {
    name: "黄庭坚",
    era: "北宋",
    description: "字鲁直，号山谷道人，晚号涪翁，北宋著名文学家、书法家，为盛极一时的江西诗派开山之祖，与杜甫、陈师道和陈与义素有\"一祖三宗\"（黄庭坚为其中一宗）之称。",
    works: "《山谷词》《豫章黄先生文集》等"
  },
  {
    name: "陆游",
    era: "南宋",
    description: "字务观，号放翁，南宋文学家、史学家、爱国诗人。陆游一生笔耕不辍，诗词文具有很高成就。其诗语言平易晓畅、章法整饬谨严，兼具李白的雄奇奔放与杜甫的沉郁悲凉。",
    works: "《剑南诗稿》《渭南文集》《老学庵笔记》等"
  },
  {
    name: "辛弃疾",
    era: "南宋",
    description: "原字坦夫，后改字幼安，号稼轩，南宋豪放派词人、将领，有\"词中之龙\"之称。与苏轼合称\"苏辛\"，与李清照并称\"济南二安\"。",
    works: "《稼轩长短句》等"
  },
  {
    name: "文天祥",
    era: "南宋末",
    description: "初名云孙，字宋瑞，又字履善。自号浮休道人、文山。南宋末年政治家、文学家，抗元名臣，民族英雄。祥兴元年（1278年）兵败被张弘范俘虏，在狱中坚持斗争三年多，后在柴市从容就义。",
    works: "《文山诗集》《指南录》《指南后录》《正气歌》等"
  },
  {
    name: "我",
    era: "当代",
    description: "热爱古典文化的现代诗人，喜欢在朋友圈分享古风雅韵。",
    works: "《现代古风作品集》"
  }
];

function App() {
  const [inputText, setInputText] = useState('');
  const [currentPost, setCurrentPost] = useState<MomentPost | null>(null);
  const [newComment, setNewComment] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPoetModal, setShowPoetModal] = useState(false);
  const [selectedPoet, setSelectedPoet] = useState<PoetIntroduction | null>(null);

  // 预设的古风评论模板
  const ancientComments = [
    { author: '清风徐来', content: '诗意盎然，如临其境' },
    { author: '月下独酌', content: '字字珠玑，句句动人' },
    { author: '竹影清风', content: '此情此景，令人神往' },
    { author: '梅花三弄', content: '雅韵悠长，心生共鸣' },
    { author: '烟雨江南', content: '意境深远，美不胜收' }
  ];

  // 古风图片占位符（实际项目中可以调用图像生成API）
  const ancientImages = [
    'https://images.pexels.com/photos/302804/pexels-photo-302804.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/1766604/pexels-photo-1766604.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/1323550/pexels-photo-1323550.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/1166209/pexels-photo-1166209.jpeg?auto=compress&cs=tinysrgb&w=400'
  ];

const generateMoment = async () => {
  if (!inputText.trim()) return;

  setIsGenerating(true);

  try {
    // 模拟后端返回数据，用于演示视频录制
    // 使用用户提供的王安石《泊船瓜洲》数据
    const mockData = {
      "诗人": "王安石",
      "诗句": "春风又绿江南岸，明月何时照我还",
      "题目": "泊船瓜洲",
      "朋友圈文案": "驿马匆匆又一年，行至江畔见新绿，独倚船头，忽觉客中春色已浓，归心竟随潮水暗涌。",
      "朋友圈附言": "又是一年春风绿，望月思归几时休。",
      "图片路径": "/春风又绿江南岸，明月何时照我还.png",
      "朋友圈发布时间": "宋·熙宁九年春日 月上碧霄时分",
      "朋友圈点赞": ["苏轼", "黄庭坚", "李清照", "陆游", "辛弃疾", "朱熹", "文天祥"],
      "朋友圈评论": [
        {
          "评论人": "苏轼",
          "评论内容": "这绿字用得妙！春意岂止在岸边，更在游子眼底心头。"
        },
        {
          "评论人": "李清照",
          "评论内容": "绿潮漫卷处藏着时光锋刃，当年渡口柳枝，今已堪系归舟。"
        },
        {
          "评论人": "朱熹",
          "评论内容": "久客他乡者最懂此中况味，新绿虽美终是他乡之景，圆月纵明难照故园之路。诸位且看那汴河堤上新柳，可似咱们家乡的柔枝？"
        }
      ]
    };

    console.log("✅ 使用模拟数据生成朋友圈");

    // 根据模拟数据生成朋友圈对象
    // 获取作者名字的后两个字用于头像
    const authorName = mockData.诗人;
    const avatarText = authorName.length >= 2 ? authorName.slice(-2) : authorName;
    
    const newPost: MomentPost = {
      id: `post-${Date.now()}`,
      author: authorName,
      avatar: `https://ui-avatars.com/api/?name=${avatarText}&background=F39C12&color=fff&size=128`,
      content: mockData.朋友圈文案,
      postscript: mockData.朋友圈附言,
      image: mockData.图片路径,
      time: mockData.朋友圈发布时间,
      likes: mockData.朋友圈点赞.length,
      isLiked: false,
      comments: mockData.朋友圈评论.map((c: any, i: number) => ({
        id: `comment-${i}`,
        author: c.评论人,
        content: c.评论内容,
        time: "刚刚",
      })),
      likedUsers: mockData.朋友圈点赞
    };

    // 添加延迟以模拟真实网络请求
    setTimeout(() => {
      setCurrentPost(newPost);
      setIsGenerating(false);
      setInputText("");
    }, 800);
  } catch (error) {
    console.error("❌ 生成失败：", error);
    setIsGenerating(false);
  }
};

  const toggleLike = () => {
    if (!currentPost) return;
    
    if (currentPost.isLiked) {
      // 取消点赞，从likedUsers中移除当前用户
      setCurrentPost({
        ...currentPost,
        isLiked: false,
        likes: currentPost.likes - 1,
        likedUsers: currentPost.likedUsers.filter(user => user !== '我')
      });
    } else {
      // 点赞，添加当前用户到likedUsers
      setCurrentPost({
        ...currentPost,
        isLiked: true,
        likes: currentPost.likes + 1,
        likedUsers: [...currentPost.likedUsers, '我']
      });
    }
  };

  const addComment = () => {
    if (!currentPost || !newComment.trim() || !commentAuthor.trim()) return;

    const comment: Comment = {
      id: `comment-${Date.now()}`,
      author: commentAuthor,
      content: newComment,
      time: ''
    };

    setCurrentPost({
        ...currentPost,
        comments: [...currentPost.comments, comment]
      });
    setNewComment('');
    setCommentAuthor('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 font-serif">
      {/* 背景装饰 */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4KPGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIgZmlsbD0iIzAwMCIgZmlsbC1vcGFjaXR5PSIuMTUiLz4KPHN2Zz4=')]"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-2xl flex flex-col min-h-[90vh] justify-between">
        {/* 标题区域 - 只在未生成雅贴时显示 */}
        {!currentPost && (
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-amber-800 mb-2 tracking-wider">
              ✨ 留一句诗意，化作古风雅韵 ✨
            </h1>
            <p className="text-amber-600 text-lg opacity-80">
              寄情于诗，托物言志
            </p>
          </div>
        )}

        {/* 输入区域 - 只在没有生成雅贴时显示 */}
        {!currentPost && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-200 p-6 mb-8 z-20 relative" style={{maxWidth: '100%', boxSizing: 'border-box'}}>
          <div className="mb-4">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="书一句诗，寄一份古风心境…"
              className="w-full p-6 border-2 border-amber-200 rounded-xl focus:border-amber-400 focus:outline-none resize-none text-xl text-gray-700 placeholder-amber-400 bg-amber-50/50 font-serif"
              rows={5}
              maxLength={200}
            />
            <div className="text-right text-sm text-amber-500 mt-1">
              {inputText.length}/200
            </div>
          </div>
          
          <button
            onClick={generateMoment}
            disabled={!inputText.trim() || isGenerating}
            className={`w-full py-3 px-6 rounded-xl text-white font-bold text-lg transition-all duration-300 ${
              !inputText.trim() || isGenerating
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 transform hover:scale-105 shadow-lg'
            }`}
          >
            {isGenerating ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                雅帖生成中...
              </div>
            ) : (
              '生成雅帖'
            )}
          </button>
        </div>
        )}

        {/* 朋友圈展示区 */}
        {currentPost && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-amber-200 p-6 transform transition-all duration-500 hover:shadow-2xl">
            {/* 用户信息 */}
            <div className="flex items-center mb-4">
              <img
                src={currentPost.avatar}
                alt="用户头像"
                className="w-12 h-12 rounded-full border-2 border-amber-300 shadow-md"
              />
              <div className="ml-3">
                <h3 className="font-bold text-amber-800 text-lg cursor-pointer hover:text-amber-600 transition-colors duration-200"
                    onClick={() => {
                      const poet = poetIntroductions.find(p => p.name === currentPost.author);
                      if (poet) {
                        setSelectedPoet(poet);
                        setShowPoetModal(true);
                      }
                    }}
                >
                  {currentPost.author}
                </h3>
                <div className="flex items-center text-amber-600 text-sm">
                  <Clock className="w-4 h-4 mr-1" />
                  {currentPost.time}
                </div>
              </div>
            </div>

            {/* 诗句内容 */}
            <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border-l-4 border-amber-400">
              <p className="text-gray-800 text-lg leading-relaxed font-serif tracking-wide">
                {currentPost.content}
              </p>
              {/* 附言 */}
              <p className="text-gray-600 text-sm italic mt-2">
                {currentPost.postscript}
              </p>
            </div>

            {/* 配图 */}
            <div className="mb-4 rounded-xl overflow-hidden shadow-lg">
              <img
                src={currentPost.image}
                alt="古风意境图"
                className="w-full h-auto object-contain transition-transform duration-300 hover:scale-105"
              />
            </div>

            {/* 互动区域 */}
            <div className="border-t border-amber-200 pt-4">
              <div className="flex items-center justify-between mb-4">
                {/* 点赞用户列表 */}
              <div className="flex-1 bg-amber-50/70 px-3 py-2 rounded-lg">
                <span className="text-amber-800 text-sm font-bold">
                  {currentPost.likedUsers.map((user, index) => (
                    <span 
                      key={index} 
                      className="cursor-pointer hover:text-amber-600 transition-colors duration-200"
                      onClick={() => {
                        const poet = poetIntroductions.find(p => p.name === user);
                        if (poet) {
                          setSelectedPoet(poet);
                          setShowPoetModal(true);
                        }
                      }}
                    >
                      {user}{index < currentPost.likedUsers.length - 1 ? '、' : ''}
                    </span>
                  ))}
                </span>
              </div>
                
                {/* 点赞按钮 */}
                <button
                  onClick={toggleLike}
                  className={`flex items-center px-4 py-2 rounded-full transition-all duration-300 ${
                    currentPost.isLiked
                      ? 'bg-red-100 text-red-600 border border-red-300'
                      : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-red-50 hover:text-red-500'
                  }`}
                >
                  <Heart className={`w-5 h-5 mr-2 ${currentPost.isLiked ? 'fill-current' : ''}`} />
                  {currentPost.isLiked ? '已点赞' : '点赞'} ({currentPost.likes})
                </button>
              </div>

              {/* 评论列表 */}
              <div className="space-y-3 mb-4">
                {currentPost.comments.map((comment) => (
                  <div key={comment.id} className="bg-amber-50/80 rounded-lg p-3 border-l-2 border-amber-300">
                    <div className="flex items-center mb-1">
                      <span 
                        className="font-semibold text-amber-800 text-sm cursor-pointer hover:text-amber-600 transition-colors duration-200"
                        onClick={() => {
                          const poet = poetIntroductions.find(p => p.name === comment.author);
                          if (poet) {
                            setSelectedPoet(poet);
                            setShowPoetModal(true);
                          }
                        }}
                      >
                        {comment.author}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>

              {/* 添加评论 */}
              <div className="flex gap-3">
                <input
                  type="text"
                  value={commentAuthor}
                  onChange={(e) => setCommentAuthor(e.target.value)}
                  placeholder="评论者姓名"
                  className="w-1/4 px-4 py-3 border border-amber-300 rounded-full focus:outline-none focus:border-amber-500 bg-amber-50/50 text-gray-700 placeholder-amber-400 text-lg"
                  maxLength={10}
                />
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="留下你的雅致评论..."
                  className="flex-1 px-4 py-3 border border-amber-300 rounded-full focus:outline-none focus:border-amber-500 bg-amber-50/50 text-gray-700 placeholder-amber-400 text-lg"
                  maxLength={100}
                />
                <button
                  onClick={addComment}
                  disabled={!newComment.trim() || !commentAuthor.trim()}
                  className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${(!newComment.trim() || !commentAuthor.trim()) ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-amber-600 text-white hover:bg-amber-700 transform hover:scale-105'}`}
                >
                  评论
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 空状态提示 */}
        {!currentPost && !isGenerating && (
          <div className="text-center py-16">
            <h3 className="text-2xl text-amber-700 mb-4 font-semibold">
              等待你的诗意创作
            </h3>
            <p className="text-amber-600 text-lg">
              输入一句古诗，让我们为你生成一份雅致的古风朋友圈
            </p>
          </div>
        )}

        {/* 诗人介绍弹窗 */}
        {showPoetModal && selectedPoet && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl border border-amber-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-amber-800">{selectedPoet.name}</h3>
                <button 
                  onClick={() => setShowPoetModal(false)}
                  className="p-1 rounded-full hover:bg-amber-100 transition-colors"
                >
                  <X className="w-6 h-6 text-amber-800" />
                </button>
              </div>
              <div className="mb-3">
                <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">{selectedPoet.era}</span>
              </div>
              <p className="text-gray-700 mb-4 leading-relaxed whitespace-pre-line">
                {selectedPoet.description}
              </p>
              <div>
                <h4 className="text-sm font-semibold text-amber-700 mb-1">代表作品：</h4>
                <p className="text-gray-600 text-sm">{selectedPoet.works}</p>
              </div>
              <div className="mt-6 text-center">
                <button 
                  onClick={() => setShowPoetModal(false)}
                  className="px-6 py-2 bg-amber-600 text-white rounded-full hover:bg-amber-700 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;