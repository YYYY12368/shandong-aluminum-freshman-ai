import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUpRight, BookOpen, BusFront, ChevronRight, CircleHelp, GraduationCap, MapPin, Menu, MessageCircleMore, Send, Sparkles, X } from 'lucide-react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const visualTopics = [
  { label: '报到流程', icon: GraduationCap, image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1400&q=85', prompt: '我报到当天需要准备什么？' },
  { label: '住宿生活', icon: MapPin, image: 'https://images.unsplash.com/photo-1606761568499-6d2451b23c66?auto=format&fit=crop&w=1400&q=85', prompt: '宿舍是几人间？有什么设施？' },
  { label: '出行交通', icon: BusFront, image: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1400&q=85', prompt: '从学校怎样去威海站？' },
]

const quickQuestions = [
  '晚自习几点开始？',
  '校园水卡在哪里充值或挂失？',
  '校内快递站在哪里？',
  '可以转专业吗？',
]

const railChapters = [
  { code: '01', label: '新生抵达', title: '刚到威海', accent: '每个问题都有回应。', description: '报到、住宿、交通与校园生活，从第一步开始。' },
  { code: '02', label: '校园攻略', title: '陌生的校园', accent: '会变成你的坐标。', description: '把抵校、住宿和出行需要的线索放在一起。' },
  { code: '03', label: '常见问题', title: '答案不必', accent: '绕远路。', description: '校园卡、快递、晚自习与转专业，逐条说清。' },
  { code: '04', label: 'AI 新生助手', title: '现在，', accent: '就问。', description: '输入问题，按要点得到清晰的回应。' },
]

const answerMap = [
  { keys: ['晚自习'], answer: '大一通常安排晚自习，参考时间为 19:00-20:40；大二一般不设晚自习。具体安排请以学院和辅导员通知为准。' },
  { keys: ['宿舍', '入住', '空调', 'Wi-Fi'], answer: '新生宿舍参考为 6 人间或 8 人间，通常由学院统一安排。8 人间多为上下床，6 人间多为上床下桌；宿舍配有风扇、独立卫浴、楼层饮水机和一层洗衣房。部分宿舍已配空调，安装进度以学校安排为准。' },
  { keys: ['报到', '材料', '军训'], answer: '建议按录取通知书附带的报到清单准备证件、档案及缴费材料，并留意学院发布的报到时间、接站安排和军训通知。军训参考时长约 10-14 天，准确安排请以新生群和学院通知为准。' },
  { keys: ['威海站', '市区', '交通', '车站'], answer: '从校区前往威海市区或威海站，可优先关注南海新区汽车站的城际公交快线，参考为早 6 点至晚 6 点、约 60 分钟一班，车程约 1.5-2 小时。周末还可能有定制公交，发车时间请以当日公告为准。' },
  { keys: ['校园卡', '水卡', '充值', '挂失'], answer: '校园水卡主要用于宿舍洗澡和接水，食堂及超市通常不可使用。充值或挂失参考地点为 1 号食堂一层幸运咖附近。办理校园网络通常需要校园卡，具体资费和流程请向运营点确认。' },
]

function getAnswer(question) {
  return answerMap.find((item) => item.keys.some((key) => question.includes(key)))?.answer
    || '我已收到你的问题。涉及校内具体时间、费用和报到材料时，请同时查看辅导员、新生群和学院官方通知，以最新发布内容为准。'
}

function SceneProgress({ activeScene }) {
  return <div className="scene-progress" aria-label={`当前第 ${activeScene + 1} 节，共 4 节`}>
    {[0, 1, 2, 3].map((item) => <span key={item} className={item === activeScene ? 'is-active' : ''}></span>)}
  </div>
}

function LeftRail({ activeScene, railRef }) {
  return <aside className="left-rail" ref={railRef} aria-label="页面章节">
    {railChapters.map((chapter, index) => <article className={`rail-chapter ${activeScene === index ? 'is-active' : ''}`} key={chapter.code} aria-current={activeScene === index ? 'step' : undefined}>
      <span className="rail-code">{chapter.code}</span>
      <div><p>{chapter.label}</p><h2>{chapter.title}<em>{chapter.accent}</em></h2><small>{chapter.description}</small></div>
    </article>)}
  </aside>
}

function App() {
  const [activeScene, setActiveScene] = useState(0)
  const [leavingScene, setLeavingScene] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [conversation, setConversation] = useState([])
  const [typedAnswers, setTypedAnswers] = useState({})
  const [noticeVisible, setNoticeVisible] = useState(false)
  const storyRef = useRef(null)
  const stageRef = useRef(null)
  const chatRef = useRef(null)
  const railRef = useRef(null)
  const typingTimersRef = useRef(new Map())
  const frameRef = useRef(0)
  const activeSceneRef = useRef(0)
  const leavingSceneTimerRef = useRef(0)

  useEffect(() => {
    const updateStory = () => {
      frameRef.current = 0
      const story = storyRef.current
      const stage = stageRef.current
      if (!story || !stage) return
      const max = Math.max(story.offsetHeight - window.innerHeight, 1)
      const progress = Math.min(Math.max(-story.getBoundingClientRect().top / max, 0), 1)
      stage.style.setProperty('--scroll-progress', progress.toFixed(4))

      const railEntries = railRef.current?.children
      if (railEntries) {
        const anchors = [0, 1 / 3, 2 / 3, 1]
        Array.from(railEntries).forEach((entry, index) => {
          const emphasis = Math.max(0, 1 - Math.abs(progress - anchors[index]) * 3.2)
          entry.style.setProperty('--rail-emphasis', emphasis.toFixed(3))
          entry.style.setProperty('--rail-scale', (0.78 + emphasis * 0.48).toFixed(3))
          entry.style.setProperty('--rail-opacity', (0.6 + emphasis * 0.4).toFixed(3))
        })
      }

      const nextScene = Math.min(3, Math.floor(progress * 4.02))
      if (activeSceneRef.current !== nextScene) {
        setLeavingScene(activeSceneRef.current)
        window.clearTimeout(leavingSceneTimerRef.current)
        // Keep the departing layer mounted until its slowest staggered exit is complete.
        leavingSceneTimerRef.current = window.setTimeout(() => setLeavingScene(null), 1420)
        activeSceneRef.current = nextScene
        setActiveScene(nextScene)
      }
    }
    const requestUpdate = () => {
      if (!frameRef.current) frameRef.current = window.requestAnimationFrame(updateStory)
    }
    updateStory()
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate)
    return () => {
      window.cancelAnimationFrame(frameRef.current)
      window.clearTimeout(leavingSceneTimerRef.current)
      window.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', requestUpdate)
    }
  }, [])

  const sceneClass = (index, name) => `scene ${name} ${activeScene === index ? 'is-active' : ''} ${leavingScene === index ? 'is-leaving' : ''}`

  const typeAnswer = useCallback((id, text) => {
    const existingTimer = typingTimersRef.current.get(id)
    if (existingTimer) window.clearTimeout(existingTimer)

    let index = 0
    const tick = () => {
      index += 1
      setTypedAnswers((current) => ({ ...current, [id]: text.slice(0, index) }))

      if (index < text.length) {
        typingTimersRef.current.set(id, window.setTimeout(tick, 28))
      } else {
        typingTimersRef.current.delete(id)
      }
    }

    setTypedAnswers((current) => ({ ...current, [id]: '' }))
    typingTimersRef.current.set(id, window.setTimeout(tick, 180))
  }, [])

  const ask = useCallback((raw) => {
    const text = raw.trim()
    if (!text) return
    const now = Date.now()
    const aiId = `${now}-ai`
    const answer = getAnswer(text)
    setConversation((items) => [...items, { id: `${now}-user`, role: 'user', text }, { id: aiId, role: 'ai', text: answer }])
    typeAnswer(aiId, answer)
    setQuestion('')
  }, [typeAnswer])

  const jumpToAsk = useCallback((raw) => {
    ask(raw)
    const story = storyRef.current
    if (!story) return
    const top = window.scrollY + story.getBoundingClientRect().top
    const maxScroll = Math.max(story.offsetHeight - window.innerHeight, 1)
    window.scrollTo({ top: top + maxScroll * 0.9, behavior: 'smooth' })
  }, [ask])

  useEffect(() => {
    const chat = chatRef.current
    if (conversation.length && chat) chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' })
  }, [conversation.length])

  useEffect(() => () => {
    typingTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    typingTimersRef.current.clear()
  }, [])

  return <main className="experience">
    <div className="fixed-campus" aria-hidden="true"></div>
    <div className="fixed-campus-wash"></div>
    <div className="wave-blocks" aria-hidden="true"><i className="wallpaper-form wallpaper-indigo"></i><i className="wallpaper-form wallpaper-mint"></i><i className="wallpaper-form wallpaper-teal"></i><i className="wallpaper-form wallpaper-sheen"></i></div>

    <header className="site-header">
      <a className="brand" href="#top" aria-label="回到首页"><span className="brand-mark">AL</span><span>山东铝业职业学院<small>威海校区 · 新生服务</small></span></a>
      <nav className="desktop-nav" aria-label="主导航"><a href="#story">新生攻略</a><a href="#story">常见问题</a><a href="#story">AI 答疑</a></nav>
      <button className="icon-button menu-button" type="button" onClick={() => setDrawerOpen(true)} aria-label="打开导航"><Menu size={22} /></button>
    </header>

    <aside className={`mobile-drawer ${drawerOpen ? 'is-open' : ''}`} aria-hidden={!drawerOpen}>
      <button className="icon-button drawer-close" type="button" onClick={() => setDrawerOpen(false)} aria-label="关闭导航"><X size={24} /></button>
      <a href="#story" onClick={() => setDrawerOpen(false)}>新生攻略</a><a href="#story" onClick={() => setDrawerOpen(false)}>常见问题</a><a href="#story" onClick={() => setDrawerOpen(false)}>AI 答疑</a>
    </aside>

    <section id="top" className="scroll-story" ref={storyRef}>
      <div className="story-stage" ref={stageRef}>
        <SceneProgress activeScene={activeScene} />
        <p className="stage-counter">0{activeScene + 1} / 04</p>
        <LeftRail activeScene={activeScene} railRef={railRef} />

        <section className={sceneClass(0, 'intro-scene')} aria-hidden={activeScene !== 0}>
          <div className="intro-orbit orbit-a scene-right layer-one"></div><div className="intro-orbit orbit-b scene-right layer-two"></div>
          <div className="intro-copy"><p className="mono-label">2026 新生季</p><h1>刚到威海，<br /><em>每个问题都有回应。</em></h1><p>报到、住宿、交通与校园生活，第一次来到校园的每一步，都有人认真回答。</p></div>
          <div className="intro-float-card scene-right layer-three"><Sparkles size={25} /><span>新生 AI 助手<br /><strong>7 x 24 小时</strong></span></div>
          <a className="down-button scene-right layer-four" href="#story" aria-label="向下进入新生攻略"><ArrowDown size={20} /></a>
        </section>

        <section className={sceneClass(1, 'guide-scene')} aria-hidden={activeScene !== 1}>
          <div className="guide-title"><p className="mono-label">新生攻略</p><h2>把陌生的校园，<br /><em>变成你的坐标。</em></h2></div>
          <div className="topic-stack scene-right layer-two">
            {visualTopics.map((topic, index) => {
              const Icon = topic.icon
              return <article className={`stack-card stack-${index + 1}`} key={topic.label}><img src={topic.image} alt="" /><div className="stack-overlay"></div><div className="stack-top"><span>0{index + 1}</span><Icon size={21} /></div><div className="stack-copy"><h3>{topic.label}</h3><button type="button" onClick={() => jumpToAsk(topic.prompt)}>问问 AI <ChevronRight size={17} /></button></div></article>
            })}
          </div>
          <p className="guide-footnote scene-right layer-three"><MapPin size={17} /> 向下滚动，素材会继续展开</p>
        </section>

        <section className={sceneClass(2, 'knowledge-scene')} aria-hidden={activeScene !== 2}>
          <div className="knowledge-back-title">新生答疑</div>
          <div className="knowledge-copy"><p className="mono-label">常见问题</p><h2>答案不必<br /><em>绕远路。</em></h2><p>从校园卡到快递，从晚自习到转专业，先把常见问题说清楚。</p></div>
          <div className="question-dock scene-right layer-two">{quickQuestions.map((item, index) => <button type="button" key={item} onClick={() => jumpToAsk(item)}><span>0{index + 1}</span><strong>{item}</strong><ArrowUpRight size={20} /></button>)}</div>
          <div className="knowledge-sticker scene-right layer-three"><BookOpen size={25} /><span>资料持续更新<br />以学院通知为准</span></div>
        </section>

        <section className={sceneClass(3, 'ask-scene')} aria-hidden={activeScene !== 3}>
          <div className="ask-copy"><p className="mono-label">AI 新生助手</p><h2>现在，<br /><em>就问。</em></h2><p>输入你的问题，我会按要点帮你理清。</p></div>
          <div className="chat-shell scene-right layer-two" ref={chatRef}><div className="chat-top"><span className="ai-dot"><Sparkles size={17} /></span><span>新生 AI 助手</span></div><div className="suggestions">{['晚自习怎么安排？', '快递站在哪里？', '宿舍能用 Wi-Fi 吗？'].map((item) => <button type="button" key={item} onClick={() => ask(item)}>{item}</button>)}</div><form className="ask-form" onSubmit={(event) => { event.preventDefault(); ask(question) }}><MessageCircleMore size={22} /><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="输入你的问题..." aria-label="输入问题" /><button className="send-button" type="submit" aria-label="发送问题"><Send size={18} /></button></form>{conversation.length > 0 && <div className="conversation" aria-live="polite">{conversation.slice(-2).map((item) => {
            const visibleAnswer = item.role === 'ai' ? (typedAnswers[item.id] ?? '') : item.text
            const isTyping = item.role === 'ai' && visibleAnswer.length < item.text.length
            return <div key={item.id} className={`message ${item.role}`}><span>{item.role === 'ai' ? 'AI 新生助手' : '你'}</span>{item.role === 'ai' && <i className="mechanical-light" aria-hidden="true"></i>}<p>{visibleAnswer}{isTyping && <i className="typing-cursor" aria-hidden="true"></i>}</p></div>
          })}</div>}</div>
          <button type="button" className="note-button scene-right layer-three" onClick={() => setNoticeVisible(true)}>使用说明 <CircleHelp size={17} /></button>
        </section>
      </div>
    </section>

    <footer id="story">
      <div className="footer-identity"><span>山东铝业职业学院 · 威海校区</span><span>新生 AI 答疑平台</span></div>
      <p className="platform-disclaimer">本平台由在校生个人自制；答疑内容仅为学长经验及学院官网公开信息整理，不代表校园官方立场或通知。</p>
    </footer>

    {noticeVisible && <div className="modal-backdrop" role="presentation" onClick={() => setNoticeVisible(false)}><section className="notice-modal" role="dialog" aria-modal="true" aria-label="使用说明" onClick={(event) => event.stopPropagation()}><button className="icon-button" type="button" onClick={() => setNoticeVisible(false)} aria-label="关闭说明"><X size={22} /></button><CircleHelp size={31} /><h2>使用说明</h2><p>本平台由在校生个人自制；答疑内容仅为学长经验及学院官网公开信息整理，并非校园官方平台。</p><p>本页面用于帮助新生快速了解常见校园事项。它不替代学院官方通知，也不处理个人信息、缴费或请假申请。</p><p>涉及报到日期、宿舍分配、资助资格、交通班次等信息，请向辅导员、学院官网或官方公众号确认。</p></section></div>}
  </main>
}

createRoot(document.getElementById('root')).render(<App />)
