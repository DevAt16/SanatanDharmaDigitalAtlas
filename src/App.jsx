import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { templeData, shaktiTempleData } from './data/temples'
import { andhraPradeshTemples } from './data/temples/andhraPradesh'
import { recentDiscoveries } from './data/recentDiscoveries'
import { pickBestCommonsImage, searchCommonsImages } from './utils/commons'

const placeholderImages = [
  '/temples/temple-01.svg',
  '/temples/temple-02.svg',
  '/temples/temple-03.svg',
  '/temples/temple-04.svg',
  '/temples/temple-05.svg',
  '/temples/temple-06.svg',
]

const getPlaceholderImage = (name) => {
  const total = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return placeholderImages[total % placeholderImages.length]
}

const ALL_STATES = 'All States'
const ALL_CITIES = 'All Cities'
const PAGE_SIZE = 12
const SEARCH_PAGE_SIZE = 12
const RECENT_PAGE_SIZE = 6
const MODES = {
  SHIVA: 'shiva',
  SHAKTI: 'shakti',
}
const STATE_TEMPLE_OVERRIDES = {
  'Andhra Pradesh': andhraPradeshTemples,
}
const FOCUS_STATES = [
  'Madhya Pradesh',
  'Uttar Pradesh',
  'Tamil Nadu',
  'West Bengal',
  'Uttarakhand',
  'Maharashtra',
  'Gujarat',
  'Rajasthan',
  'Karnataka',
  'Kerala',
  'Odisha',
  'Haryana',
  'Andhra Pradesh',
  'Bihar',
  'Tripura',
  'Arunachal Pradesh',
  'Jharkhand',
  'Assam',
  'Telangana',
  'Chhattisgarh',
]
const PAGE_TRACKING_PATHS = {
  temples: '/temples',
  recent: '/recent-discoveries',
  about: '/about',
}
const PAGE_TRACKING_TITLES = {
  temples: 'Temples',
  recent: 'Recent Discoveries',
  about: 'About',
}

const copy = {
  en: {
    portalName: 'Jai Bhole Nath',
    heroTitle: 'Temple Stories',
    heroSubtitle:
      "A curated collection of narratives, legends, and living traditions from India's sacred spaces.",
    heroActions: {
      start: 'Start a Journey',
      view: 'View Temple Stories',
      search: 'Find a Temple',
    },
    heroStory: {
      eyebrow: 'Featured story',
      title: 'A curated temple story for today',
      read: 'Read story',
      browse: "Browse editor's picks",
    },
    nav: {
      label: 'Primary navigation',
      temples: 'Temples',
      recent: 'Recent Discoveries',
      about: 'About',
    },
    stats: {
      states: 'States listed',
      temples: 'Temples mapped',
      cities: 'Cities covered',
    },
    panel: {
      title: 'Find a Temple',
      subtitle: 'Pick a state, choose a city, and explore the living heritage.',
      searchLabel: 'Search',
      searchPlaceholder: 'Search',
      stateLabel: 'State',
      cityLabel: 'City',
      deityLabel: 'Deity',
      traditionLabel: 'Tradition',
      festivalLabel: 'Festival',
      bestTimeLabel: 'Best time',
      allStates: 'Filter by State',
      allCities: 'Filter by City',
      allDeities: 'Filter by Deity',
      allTraditions: 'All Traditions',
      allFestivals: 'All Festivals',
      allBestTimes: 'All Best Times',
      showing: (count) => `Showing ${count} editor's picks`,
      helper: "Tip: select a state to reveal editor's picks below.",
      explore: "Explore editor's picks below",
      save: 'Save this route',
    },
    labels: {
      allStates: 'All States',
    },
    trailsSection: {
      title: 'Curated Trails',
      subtitle: 'Start with a guided path chosen for story richness and ritual depth.',
      items: [
        {
          title: 'Shakti Peeth Journey',
          description:
            'Powerful Devi shrines that map the living Shakti tradition across regions.',
          action: 'Explore Shakti trail',
          tag: 'Shakta focus',
        },
        {
          title: 'Krishna Leela Circuit',
          description:
            'Sacred places that keep Krishna’s leelas alive through daily worship and festival lore.',
          action: 'Explore Krishna trail',
          tag: 'Vaishnava focus',
        },
        {
          title: 'Ancient Shaiva Sanctums',
          description:
            'Historic Shiva temples and jyotirlinga traditions that anchor timeless devotion.',
          action: 'Explore Shaiva trail',
          tag: 'Shaiva focus',
        },
      ],
    },
    topSection: {
      featuredTitle: 'Featured temples',
      featuredSubtitle: 'Begin with a few sacred journeys.',
      storiesTitle: 'Latest stories',
      storiesSubtitle: 'Short reads from recently added temples.',
    },
    statesSection: {
      title: 'States of Spiritual Significance',
      subtitle: 'Scan through the regions and unlock stories rooted in geography and devotion.',
    },
    cardsSection: {
      title: "Editor's Picks",
      subtitle: 'Handpicked temple stories and themed collections to read in depth.',
    },
    searchSection: {
      title: 'Search results',
      subtitle: (count) => `${count} temples matched your filters.`,
    },
    searchEmpty: {
      title: 'No matches for the current filters.',
      body: 'Try clearing a filter or search term to see more temples.',
    },
    highlightLabel: 'Highlight',
    readFullStory: 'Read Story',
    emptyState: {
      title: 'More temple stories are on the way.',
      body:
        'We are expanding state-by-state coverage. Select another region or request a temple to prioritize next.',
      cta: 'Request a temple',
    },
    featuresSection: {
      title: 'Designed for Pilgrims and Seekers',
      subtitle: 'A modern experience for timeless journeys.',
      items: [
        {
          title: 'State to City Discovery',
          text: 'Navigate India by state, drill into cities, and discover spiritual heritage with clarity.',
        },
        {
          title: 'Living Temple Stories',
          text: 'Concise storytelling focused on rituals, regional traditions, and cultural context.',
        },
        {
          title: 'Pilgrimage Intelligence',
          text: 'Highlights, best moments, and atmosphere notes that help plan meaningful visits.',
        },
      ],
    },
    aboutSection: {
      eyebrow: 'About Us',
      title: 'Jai Bhole Nath is a living archive of sacred geography.',
      subtitle:
        'We curate temple stories so seekers can explore India’s spiritual landscape with clarity and respect.',
      cards: [
        {
          title: 'Our intent',
          body: 'Build a respectful portal that keeps temple lore, ritual rhythm, and regional context alive.',
        },
        {
          title: 'What we curate',
          body: 'Temple stories, key rituals, best visit windows, and verified imagery sourced from public archives.',
        },
        {
          title: 'How to use it',
          body: 'Choose a state, read a story, and plan your visit with cultural sensitivity and local traditions in mind.',
        },
      ],
    },
    disclaimerSection: {
      title: 'Disclaimer',
      body:
        'Information here is curated from public sources and community inputs. Details may vary by local tradition and temple administration. Please verify timings, rituals, and access rules with official temple sources before visiting.',
      note: 'If you notice an error, share a correction so we can update it.',
    },
    recentSection: {
      title: 'Recent Discoveries',
      subtitle:
        'Newly reported or rediscovered Shiva shrines, temple bases, and sacred finds. Some details are still being verified.',
      emptyTitle: 'More discoveries are on the way.',
      emptyBody: 'We will add newly reported finds as they are verified. Check back soon.',
      shaktiOnlyTitle: 'Available in Shiva mode',
      shaktiOnlyBody: 'This section tracks Shaiva discoveries. Switch to Shiva mode to view it.',
      note:
        'These entries summarize recent reports. Rituals, access, and exact chronology may evolve as research continues.',
      pending: 'Details pending',
      labels: {
        period: 'Estimated era',
        source: 'Source',
        status: 'Status',
      },
    },
    footer: 'Jai Bhole Nath Portal. Crafted for community, history, and devotion.',
    modeToggle: {
      label: 'Temple focus',
      shiva: 'Shiva Mode',
      shakti: 'Shakti Mode',
    },
    modal: {
      eyebrow: 'Temple Story',
      close: 'Close',
      story: 'Story',
      signature: 'Signature Moment',
      coreDetails: 'Core Details',
      rituals: 'Rituals',
      festivals: 'Festivals',
      more: 'More details',
      sources: 'Sources',
      puranicSources: 'Puranic sources',
      folkloreSources: 'Folklore sources',
      empty:
        'We are expanding each temple with verified history, festival calendars, and practical visit notes. Share any sources or traditions you want included.',
    },
    details: {
      deity: 'Deity',
      tradition: 'Tradition',
      bestTime: 'Best time',
      timings: 'Timings',
      dressCode: 'Dress code',
      entryNotes: 'Entry notes',
    },
    moreLabels: {
      history: 'History',
      puranic: 'Puranic view',
      folklore: 'Folklore',
      architecture: 'Architecture',
      darshan: 'Darshan & Aarti',
      seasonal: 'Seasonal notes',
      visitorNotes: 'Visitor notes',
      festivals: 'Festivals',
    },
    language: {
      label: 'Language',
      en: 'English',
      hi: 'हिंदी',
    },
  },
  hi: {
    portalName: 'जय भोलेनाथ',
    heroTitle: 'मंदिर कथाएँ',
    heroSubtitle:
      'भारत के पवित्र स्थलों की कथाओं, लोकपरंपराओं और जीवंत साधनाओं का क्यूरेटेड संग्रह।',
    heroActions: {
      start: 'यात्रा शुरू करें',
      view: 'मंदिर कथाएँ देखें',
      search: 'मंदिर खोजें',
    },
    heroStory: {
      eyebrow: 'चयनित कथा',
      title: 'आज की क्यूरेटेड मंदिर कथा',
      read: 'कथा पढ़ें',
      browse: 'चयनित मंदिर देखें',
    },
    nav: {
      label: 'मुख्य नेविगेशन',
      temples: 'मंदिर',
      recent: 'हाल की खोजें',
      about: 'परिचय',
    },
    stats: {
      states: 'सूचीबद्ध राज्य',
      temples: 'मानचित्रित मंदिर',
      cities: 'शामिल शहर',
    },
    panel: {
      title: 'मंदिर खोजें',
      subtitle: 'राज्य चुनें, शहर चुनें और जीवंत विरासत देखें।',
      searchLabel: 'खोजें',
      searchPlaceholder: 'खोजें',
      stateLabel: 'राज्य',
      cityLabel: 'शहर',
      deityLabel: 'देवता',
      traditionLabel: 'संप्रदाय',
      festivalLabel: 'त्योहार',
      bestTimeLabel: 'सर्वश्रेष्ठ समय',
      allStates: 'राज्य चुनें',
      allCities: 'शहर चुनें',
      allDeities: 'देवता चुनें',
      allTraditions: 'सभी संप्रदाय',
      allFestivals: 'सभी त्योहार',
      allBestTimes: 'सभी सर्वोत्तम समय',
      showing: (count) => `${count} संपादक चयन दिख रहे हैं`,
      helper: 'संकेत: नीचे दिखने वाले मंदिरों के लिए राज्य चुनें।',
      explore: 'नीचे चुनिंदा मंदिर देखें',
      save: 'इस मार्ग को सहेजें',
    },
    labels: {
      allStates: 'सभी राज्य',
    },
    trailsSection: {
      title: 'क्यूरेटेड यात्राएँ',
      subtitle: 'कहानी और परंपरा के आधार पर चुने गए मार्गों से शुरुआत करें।',
      items: [
        {
          title: 'शक्ति पीठ यात्रा',
          description: 'देवी परंपरा के प्रमुख शक्ति पीठ और शक्तिस्थल।',
          action: 'शक्ति यात्रा देखें',
          tag: 'शाक्त परंपरा',
        },
        {
          title: 'कृष्ण लीला परिक्रमा',
          description: 'वृंदावन से द्वारका तक कृष्ण लीला से जुड़े पवित्र स्थल।',
          action: 'कृष्ण यात्रा देखें',
          tag: 'वैष्णव परंपरा',
        },
        {
          title: 'प्राचीन शैव धाम',
          description: 'शिव उपासना और ज्योतिर्लिंग परंपरा के ऐतिहासिक मंदिर।',
          action: 'शैव यात्रा देखें',
          tag: 'शैव परंपरा',
        },
      ],
    },
    topSection: {
      featuredTitle: 'चुने हुए मंदिर',
      featuredSubtitle: 'शुरुआत के लिए कुछ पवित्र यात्रा संकेत।',
      storiesTitle: 'नई मंदिर कथाएँ',
      storiesSubtitle: 'हाल ही में जोड़ी गई संक्षिप्त कथाएँ।',
    },
    statesSection: {
      title: 'आध्यात्मिक महत्त्व वाले राज्य',
      subtitle: 'क्षेत्रों को देखें और भूगोल व भक्ति से जुड़ी कथाएँ खोजें।',
    },
    cardsSection: {
      title: 'संपादक चयन',
      subtitle: 'कहानी, अनुष्ठान और संदर्भ के साथ चुनी हुई मंदिर कथाएँ।',
    },
    searchSection: {
      title: 'खोज परिणाम',
      subtitle: (count) => `${count} मंदिर आपके फ़िल्टर से मिले।`,
    },
    searchEmpty: {
      title: 'चयनित फ़िल्टर से कोई परिणाम नहीं मिला।',
      body: 'अधिक मंदिर देखने के लिए फ़िल्टर या खोज शब्द हटाएँ।',
    },
    highlightLabel: 'मुख्य आकर्षण',
    readFullStory: 'कथा पढ़ें',
    emptyState: {
      title: 'और मंदिर कथाएँ जल्द जोड़ी जाएंगी।',
      body:
        'हम राज्यवार कवरेज बढ़ा रहे हैं। किसी अन्य क्षेत्र का चयन करें या अगला मंदिर सुझाएँ।',
      cta: 'मंदिर सुझाएँ',
    },
    featuresSection: {
      title: 'तीर्थयात्रियों और साधकों के लिए',
      subtitle: 'कालातीत यात्राओं के लिए आधुनिक अनुभव।',
      items: [
        {
          title: 'राज्य से शहर खोज',
          text: 'राज्यवार भारत देखें, शहर चुनें और आध्यात्मिक विरासत को स्पष्टता से खोजें।',
        },
        {
          title: 'जीवंत मंदिर कथाएँ',
          text: 'अनुष्ठानों, क्षेत्रीय परंपराओं और सांस्कृतिक संदर्भ पर केंद्रित संक्षिप्त कथन।',
        },
        {
          title: 'यात्रा मार्गदर्शन',
          text: 'मुख्य आकर्षण, सर्वोत्तम समय और वातावरण संबंधी सुझाव।',
        },
      ],
    },
    aboutSection: {
      eyebrow: 'परिचय',
      title: 'जय भोलेनाथ भारत की पवित्र भूगोल यात्रा का जीवंत संग्रह है।',
      subtitle:
        'हम मंदिर कथाएँ, परंपराएँ और यात्रा मार्ग सावधानी से संकलित करते हैं ताकि साधक सम्मान और स्पष्टता के साथ खोज कर सकें।',
      cards: [
        {
          title: 'हमारा उद्देश्य',
          body: 'एक सम्मानजनक, गैर-व्यावसायिक पोर्टल बनाना जो मंदिर की कथा, अनुष्ठान और स्थानीय संदर्भ को जीवित रखे।',
        },
        {
          title: 'हम क्या चुनते हैं',
          body: 'मंदिर कथाएँ, प्रमुख अनुष्ठान, सर्वोत्तम समय और सार्वजनिक अभिलेखों से सत्यापित चित्र।',
        },
        {
          title: 'इसे कैसे उपयोग करें',
          body: 'राज्य चुनें, कथा पढ़ें और स्थानीय परंपराओं के साथ अपनी यात्रा का सम्मानपूर्वक नियोजन करें।',
        },
      ],
    },
    disclaimerSection: {
      title: 'अस्वीकरण',
      body:
        'यहाँ दी गई जानकारी सार्वजनिक स्रोतों और समुदाय इनपुट से संकलित है। स्थानीय परंपराओं और मंदिर प्रशासन के अनुसार विवरण बदल सकते हैं। कृपया यात्रा से पहले आधिकारिक स्रोतों से समय, अनुष्ठान और प्रवेश नियम सत्यापित करें।',
      note: 'यदि कोई त्रुटि दिखे तो सुधार साझा करें ताकि हम अपडेट कर सकें।',
    },
    recentSection: {
      title: 'हाल की शैव खोजें',
      subtitle:
        'हाल में रिपोर्ट हुई या पुनः खोजी गई शिव स्थलों की झलक। कुछ विवरण अभी सत्यापन में हैं।',
      emptyTitle: 'और खोजें जल्द जोड़ी जाएंगी।',
      emptyBody: 'सत्यापन के साथ नई खोजें जोड़ी जाती रहेंगी।',
      shaktiOnlyTitle: 'केवल शिव मोड में उपलब्ध',
      shaktiOnlyBody: 'यह अनुभाग शैव खोजों के लिए है। शिव मोड में देखें।',
      note:
        'यह प्रविष्टियाँ हाल की रिपोर्टों का सार हैं; अनुष्ठान, प्रवेश और कालक्रम पर अतिरिक्त शोध चल रहा हो सकता है।',
      pending: 'विवरण अपडेट होना बाकी',
      labels: {
        period: 'अनुमानित काल',
        source: 'स्रोत',
        status: 'स्थिति',
      },
    },
    footer: 'सनातन धर्म पोर्टल। समुदाय, इतिहास और भक्ति के लिए समर्पित।',
    modeToggle: {
      label: 'केंद्र',
      shiva: 'शिव मोड',
      shakti: 'शक्ति मोड',
    },
    modal: {
      eyebrow: 'मंदिर कथा',
      close: 'बंद करें',
      story: 'कथा',
      signature: 'विशेष क्षण',
      coreDetails: 'मुख्य विवरण',
      rituals: 'अनुष्ठान',
      festivals: 'त्योहार',
      more: 'अधिक विवरण',
      sources: 'स्रोत',
      puranicSources: 'पौराणिक स्रोत',
      folkloreSources: 'लोककथाएँ स्रोत',
      empty:
        'हम सत्यापित इतिहास, त्योहार कैलेंडर और उपयोगी यात्रा नोट्स जोड़ रहे हैं। आपके पास स्रोत हों तो साझा करें।',
    },
    details: {
      deity: 'देवता',
      tradition: 'संप्रदाय',
      bestTime: 'सर्वश्रेष्ठ समय',
      timings: 'समय',
      dressCode: 'ड्रेस कोड',
      entryNotes: 'प्रवेश नोट्स',
    },
    moreLabels: {
      history: 'इतिहास',
      puranic: 'पौराणिक दृष्टि',
      folklore: 'लोककथा',
      architecture: 'वास्तुकला',
      darshan: 'दर्शन और आरती',
      seasonal: 'मौसमी जानकारी',
      visitorNotes: 'आगंतुक नोट्स',
      festivals: 'त्योहार',
    },
    language: {
      label: 'भाषा',
      en: 'English',
      hi: 'हिंदी',
    },
  },
}

function App() {
  const [language, setLanguage] = useState('en')
  const [activePage, setActivePage] = useState('temples')
  const [selectedState, setSelectedState] = useState(ALL_STATES)
  const [selectedCity, setSelectedCity] = useState(ALL_CITIES)
  const [searchTerm, setSearchTerm] = useState('')
  const [storyState, setStoryState] = useState(ALL_STATES)
  const [stateFilterSource, setStateFilterSource] = useState('dropdown')
  const [mode, setMode] = useState(MODES.SHIVA)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchPage, setSearchPage] = useState(1)
  const [recentPage, setRecentPage] = useState(1)
  const [activeTemple, setActiveTemple] = useState(null)
  const storyModalRef = useRef(null)
  const hasTrackedInitialPage = useRef(false)
  const [modalImageSrc, setModalImageSrc] = useState('')
  const [isPortraitImage, setIsPortraitImage] = useState(false)
  const [auditStatus, setAuditStatus] = useState({ running: false, total: 0, done: 0 })
  const t = copy[language]
  const isAbout = activePage === 'about'
  const isRecent = activePage === 'recent'
  const isShivaMode = mode === MODES.SHIVA
  const shaktiStates = useMemo(() => {
    const seen = new Set()
    const list = []
    shaktiTempleData.forEach((temple) => {
      if (!temple || typeof temple !== 'object') return
      if (!temple.state || seen.has(temple.state)) return
      seen.add(temple.state)
      list.push(temple.state)
    })
    return list
  }, [shaktiTempleData])
  const activeStates = useMemo(
    () => (isShivaMode ? FOCUS_STATES : shaktiStates),
    [isShivaMode, shaktiStates]
  )
  const baseTempleData = useMemo(() => {
    if (!isShivaMode) {
      return shaktiTempleData
    }
    if (selectedState !== ALL_STATES && STATE_TEMPLE_OVERRIDES[selectedState]) {
      return STATE_TEMPLE_OVERRIDES[selectedState]
    }
    return templeData
  }, [isShivaMode, selectedState, shaktiTempleData])
  const safeTempleData = useMemo(
    () => baseTempleData.filter((item) => item && typeof item === 'object'),
    [baseTempleData]
  )

  const themedTemples = useMemo(() => {
    return safeTempleData
  }, [isShivaMode, safeTempleData])

  const recentItems = useMemo(
    () => (isShivaMode ? recentDiscoveries : []),
    [isShivaMode, recentDiscoveries]
  )

  const visibleTemples = useMemo(
    () => themedTemples.filter((item) => activeStates.includes(item.state)),
    [themedTemples, activeStates]
  )

  const states = useMemo(() => [ALL_STATES, ...activeStates], [activeStates])

  const statTemples = useMemo(() => visibleTemples, [visibleTemples])

  const templeStats = useMemo(() => {
    const statesSet = new Set(statTemples.map((item) => item.state))
    const citiesSet = new Set(statTemples.map((item) => item.city))
    return {
      temples: statTemples.length,
      cities: citiesSet.size,
      states: statesSet.size,
    }
  }, [statTemples])

  const cities = useMemo(() => {
    const pool =
      selectedState === ALL_STATES
        ? visibleTemples
        : visibleTemples.filter((item) => item.state === selectedState)
    const unique = Array.from(new Set(pool.map((item) => item.city)))
    return [ALL_CITIES, ...unique]
  }, [selectedState, visibleTemples])

  useEffect(() => {
    if (!cities.includes(selectedCity)) {
      setSelectedCity(ALL_CITIES)
    }
  }, [cities, selectedCity])

  useEffect(() => {
    if (!states.includes(selectedState)) {
      setSelectedState(ALL_STATES)
    }
  }, [states, selectedState])

  useEffect(() => {
    if (storyState !== ALL_STATES && !activeStates.includes(storyState)) {
      setStoryState(ALL_STATES)
    }
  }, [activeStates, storyState])

  useEffect(() => {
    if (activeTemple && !visibleTemples.includes(activeTemple)) {
      setActiveTemple(null)
    }
  }, [activeTemple, visibleTemples])

  useEffect(() => {
    setCurrentPage(1)
  }, [storyState, mode])

  useEffect(() => {
    setRecentPage(1)
  }, [mode])

  useEffect(() => {
    setSearchPage(1)
  }, [selectedState, selectedCity, searchTerm, mode])

  useEffect(() => {
    document.documentElement.lang = language === 'hi' ? 'hi' : 'en'
  }, [language])

  useEffect(() => {
    if (!hasTrackedInitialPage.current) {
      hasTrackedInitialPage.current = true
      return
    }
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
      return
    }
    const pagePath = PAGE_TRACKING_PATHS[activePage] || PAGE_TRACKING_PATHS.temples
    const pageTitle = PAGE_TRACKING_TITLES[activePage] || PAGE_TRACKING_TITLES.temples
    window.gtag('event', 'page_view', {
      page_title: `Jai Bhole Nath - ${pageTitle}`,
      page_path: pagePath,
      page_location: `${window.location.origin}${pagePath}`,
    })
  }, [activePage])

  useEffect(() => {
    if (!activeTemple) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setActiveTemple(null)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [activeTemple])

  useEffect(() => {
    if (activeTemple && storyModalRef.current) {
      storyModalRef.current.scrollTop = 0
    }
  }, [activeTemple])

  useEffect(() => {
    if (!activeTemple) {
      setModalImageSrc('')
      setIsPortraitImage(false)
      return
    }
    const imageSrc = activeTemple.image || getPlaceholderImage(activeTemple.name)
    setModalImageSrc(imageSrc)
    const probe = new Image()
    probe.onload = () => {
      setIsPortraitImage(probe.naturalHeight > probe.naturalWidth)
    }
    probe.onerror = () => {
      setIsPortraitImage(false)
    }
    probe.src = imageSrc
  }, [activeTemple])

  const searchActive =
    (stateFilterSource === 'dropdown' && selectedState !== ALL_STATES) ||
    selectedCity !== ALL_CITIES ||
    searchTerm.trim()
  const searchFilteredTemples = visibleTemples.filter((item) => {
    const matchState = selectedState === ALL_STATES || item.state === selectedState
    const matchCity = selectedCity === ALL_CITIES || item.city === selectedCity
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const matchSearch = normalizedSearch
      ? [
          item.name,
          item.city,
          item.state,
          item.region,
          item.deity,
          item.tradition,
          item.story,
          item.highlight,
          ...(item.tags ?? []),
          ...(item.rituals ?? []),
          ...(item.festivals ?? []),
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch))
      : true
    return matchState && matchCity && matchSearch
  })

  const storyTemples = visibleTemples.filter(
    (item) => storyState === ALL_STATES || item.state === storyState
  )
  const displayedTemples = storyTemples
  const modeLabel = isShivaMode ? t.modeToggle.shiva : t.modeToggle.shakti
  const storyStateLabel = storyState === ALL_STATES ? t.labels.allStates : storyState
  const totalPages = Math.max(1, Math.ceil(displayedTemples.length / PAGE_SIZE))
  const totalSearchPages = Math.max(
    1,
    Math.ceil(searchFilteredTemples.length / SEARCH_PAGE_SIZE)
  )
  const totalRecentPages = Math.max(
    1,
    Math.ceil(recentItems.length / RECENT_PAGE_SIZE)
  )
  const pagedTemples = displayedTemples.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )
  const pagedSearchTemples = searchFilteredTemples.slice(
    (searchPage - 1) * SEARCH_PAGE_SIZE,
    searchPage * SEARCH_PAGE_SIZE
  )
  const pagedRecentItems = recentItems.slice(
    (recentPage - 1) * RECENT_PAGE_SIZE,
    recentPage * RECENT_PAGE_SIZE
  )

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  useEffect(() => {
    if (searchPage > totalSearchPages) {
      setSearchPage(totalSearchPages)
    }
  }, [searchPage, totalSearchPages])

  useEffect(() => {
    if (recentPage > totalRecentPages) {
      setRecentPage(totalRecentPages)
    }
  }, [recentPage, totalRecentPages])

  const slugify = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

  const getTempleId = (temple, index) => {
    if (!temple) return `temple-${index}`
    const base = slugify(`${temple.name}-${temple.city}-${temple.state}`)
    return base ? `temple-${base}` : `temple-${index}`
  }

  const featuredTemple = displayedTemples[0] || null
  const featuredTempleId = featuredTemple ? getTempleId(featuredTemple, 0) : ''

  const scrollToTempleCard = (id) => {
    if (!id || typeof window === 'undefined') return
    const target = document.getElementById(id)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const jumpToFeatured = () => {
    if (!featuredTempleId) return
    if (activePage !== 'temples') {
      switchPage('temples')
      window.setTimeout(() => scrollToTempleCard(featuredTempleId), 60)
      return
    }
    scrollToTempleCard(featuredTempleId)
  }

  const runImageAudit = async () => {
    const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV
    if (!isDev) return
    if (selectedState === ALL_STATES) return
    if (auditStatus.running) return

    const fileNameFromSpecialPath = (url) => {
      const marker = '/Special:FilePath/'
      const idx = String(url || '').indexOf(marker)
      if (idx === -1) return ''
      return decodeURIComponent(String(url).slice(idx + marker.length))
    }

    const isSuspiciousImage = (temple) => {
      const file = fileNameFromSpecialPath(temple?.image).toLowerCase()
      if (!file) return false
      if (file.includes('temple') || file.includes('gopuram') || file.includes('mandir')) return false
      return [
        'bridge',
        'river',
        'canyon',
        'fort',
        'hills',
        'lake',
        'beach',
        'waterfall',
        'falls',
        'view',
        'map',
        'logo',
        'seal',
        'flag',
      ].some((hint) => file.includes(hint))
    }

    const probeImage = (src, timeoutMs = 9000) =>
      new Promise((resolve) => {
        if (!src) {
          resolve({ ok: false, reason: 'missing' })
          return
        }
        let finished = false
        const img = new Image()
        const timer = window.setTimeout(() => {
          if (finished) return
          finished = true
          resolve({ ok: false, reason: 'timeout' })
        }, timeoutMs)
        img.onload = () => {
          if (finished) return
          finished = true
          window.clearTimeout(timer)
          resolve({ ok: true, width: img.naturalWidth, height: img.naturalHeight })
        }
        img.onerror = () => {
          if (finished) return
          finished = true
          window.clearTimeout(timer)
          resolve({ ok: false, reason: 'error' })
        }
        img.src = src
      })

    const temples = safeTempleData.filter((temple) => temple?.state === selectedState)
    setAuditStatus({ running: true, total: temples.length, done: 0 })

    const results = []
    const queue = temples.slice()
    const workers = 4

    const worker = async () => {
      while (queue.length) {
        const temple = queue.shift()
        if (!temple) continue

        const suspect = isSuspiciousImage(temple)
        const probe = await probeImage(temple.image)
        const needsReview = suspect || !probe.ok
        if (needsReview) {
          const query = `${String(temple.name || '')
            .replace(/[()]/g, '')
            .trim()} ${String(temple.city || '').trim()} temple`

          try {
            const candidates = await searchCommonsImages(query, 10)
            const best = pickBestCommonsImage(candidates, { name: temple.name, city: temple.city })
            results.push({
              name: temple.name,
              city: temple.city,
              oldImage: temple.image || '',
              status: probe.ok ? 'suspicious' : `broken:${probe.reason}`,
              query,
              suggestedImage: best?.imageUrl || '',
              suggestedCreditUrl: best?.filePageUrl || '',
              license: best?.license || '',
              suggestedTitle: best?.title || '',
            })
          } catch (error) {
            results.push({
              name: temple.name,
              city: temple.city,
              oldImage: temple.image || '',
              status: probe.ok ? 'suspicious' : `broken:${probe.reason}`,
              query,
              error: String(error?.message || error),
            })
          }
        }

        setAuditStatus((prev) => ({
          running: true,
          total: prev.total,
          done: Math.min(prev.total, prev.done + 1),
        }))
      }
    }

    await Promise.all(Array.from({ length: workers }, () => worker()))

    console.log('TEMPLE_IMAGE_AUDIT_RESULTS', {
      state: selectedState,
      count: results.length,
      results,
    })
    try {
      await navigator.clipboard.writeText(JSON.stringify({ state: selectedState, results }, null, 2))
    } catch {
      // Ignore clipboard failures (permissions / non-secure context).
    }
    setAuditStatus({ running: false, total: temples.length, done: temples.length })
  }

  const switchPage = (page) => {
    setActivePage(page)
    setActiveTemple(null)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const trackAnalyticsEvent = (eventName, params = {}) => {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
      return
    }
    window.gtag('event', eventName, params)
  }

  const handleStateChange = (nextState, source = 'dropdown') => {
    setSelectedState(nextState)
    setStateFilterSource(source)
    trackAnalyticsEvent('filter_state_change', {
      filter_state: nextState,
      filter_source: source,
      active_page: activePage,
    })
  }

  const handleCityChange = (nextCity) => {
    setSelectedCity(nextCity)
    trackAnalyticsEvent('filter_city_change', {
      filter_city: nextCity,
      active_page: activePage,
    })
  }

  const handlePageChange = (nextPage, currentPageValue, onPage, context) => {
    if (nextPage === currentPageValue) return
    onPage(nextPage)
    trackAnalyticsEvent('pagination_click', {
      pagination_context: context,
      page_number: nextPage,
      active_page: activePage,
    })
  }

  const openTempleStory = (temple, context) => {
    setActiveTemple(temple)
    trackAnalyticsEvent('temple_story_open', {
      temple_name: temple?.name || '',
      temple_state: temple?.state || '',
      temple_city: temple?.city || '',
      open_context: context,
      active_page: activePage,
    })
  }

  const getTempleText = (temple, key) => {
    if (!temple) {
      return ''
    }
    if (language === 'hi') {
      return temple[`${key}Hi`] ?? temple[key]
    }
    return temple[key]
  }

  const getTempleList = (temple, key) => {
    if (!temple) {
      return []
    }
    if (language === 'hi') {
      return temple[`${key}Hi`] ?? temple[key] ?? []
    }
    return temple[key] ?? []
  }

  const detailCards = activeTemple
    ? [
        { label: t.details.deity, value: getTempleText(activeTemple, 'deity') },
        { label: t.details.tradition, value: getTempleText(activeTemple, 'tradition') },
        { label: t.details.bestTime, value: getTempleText(activeTemple, 'bestTime') },
        { label: t.details.timings, value: getTempleText(activeTemple, 'timings') },
        { label: t.details.dressCode, value: getTempleText(activeTemple, 'dressCode') },
        { label: t.details.entryNotes, value: getTempleText(activeTemple, 'entryNotes') },
      ].filter((item) => item.value)
    : []
  const ritualList = getTempleList(activeTemple, 'rituals')
  const festivalList = getTempleList(activeTemple, 'festivals')
  const moreDetails = activeTemple?.moreDetails ?? null
  const moreFallbacks = activeTemple
    ? {
        history: getTempleText(activeTemple, 'story'),
        architecture: (() => {
          const tags = getTempleList(activeTemple, 'tags').map((tag) => tag.toLowerCase())
          if (tags.some((tag) => tag.includes('unesco') || tag.includes('chola') || tag.includes('dravidian'))) {
            return 'Heritage temple architecture with regional stone carving traditions and layered gopuram silhouettes.'
          }
          if (tags.some((tag) => tag.includes('heritage') || tag.includes('ruins'))) {
            return 'Historic stone temple architecture with preserved carvings and timeworn shrine layouts.'
          }
          if (tags.some((tag) => tag.includes('cluster'))) {
            return 'Clustered shrine layout within a heritage precinct, reflecting regional temple planning.'
          }
          return 'Regional temple architecture with a sanctum and mandapa layout.'
        })(),
        darshan: (() => {
          if (!ritualList.length) {
            return 'Darshan is available during open hours; rituals follow local tradition.'
          }
          return `Darshan is available during open hours, with rituals such as ${ritualList.join(' · ')}.`
        })(),
        seasonal: getTempleText(activeTemple, 'bestTime'),
        visitorNotes: getTempleText(activeTemple, 'entryNotes'),
        festivals: festivalList.length ? festivalList.join(' · ') : '',
      }
    : {}
  const getMoreDetail = (key) => {
    if (!moreDetails) {
      return moreFallbacks[key]
    }
    if (language === 'hi') {
      return moreDetails[`${key}Hi`] ?? moreDetails[key] ?? moreFallbacks[key]
    }
    return moreDetails[key] ?? moreFallbacks[key]
  }
  const moreBlocks = moreDetails
    ? [
        { label: t.moreLabels.history, value: getMoreDetail('history') },
        { label: t.moreLabels.architecture, value: getMoreDetail('architecture') },
        { label: t.moreLabels.darshan, value: getMoreDetail('darshan') },
        { label: t.moreLabels.seasonal, value: getMoreDetail('seasonal') },
        { label: t.moreLabels.visitorNotes, value: getMoreDetail('visitorNotes') },
        { label: t.moreLabels.festivals, value: getMoreDetail('festivals') },
      ].filter((item) => item.value)
    : []
  const labelForState = (state) => (state === ALL_STATES ? t.panel.allStates : state)
  const labelForCity = (city) => (city === ALL_CITIES ? t.panel.allCities : city)

  const buildPaginationItems = (current, total) => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index + 1)
    }
    const items = [1]
    if (current > 3) items.push('…')
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    for (let page = start; page <= end; page += 1) {
      items.push(page)
    }
    if (current < total - 2) items.push('…')
    items.push(total)
    return items
  }

  const renderPagination = (current, total, onPage, context) => {
    if (total <= 1) return null
    const items = buildPaginationItems(current, total)
    return (
      <div className="pagination">
        <button
          className="page-btn"
          type="button"
          disabled={current === 1}
          onClick={() =>
            handlePageChange(Math.max(1, current - 1), current, onPage, context)
          }
        >
          Prev
        </button>
        {items.map((item, index) =>
          item === '…' ? (
            <span className="page-ellipsis" key={`ellipsis-${index}`}>
              …
            </span>
          ) : (
            <button
              className={`page-btn ${item === current ? 'active' : ''}`}
              type="button"
              key={item}
              onClick={() => handlePageChange(item, current, onPage, context)}
            >
              {item}
            </button>
          )
        )}
        <button
          className="page-btn"
          type="button"
          disabled={current === total}
          onClick={() =>
            handlePageChange(Math.min(total, current + 1), current, onPage, context)
          }
        >
          Next
        </button>
      </div>
    )
  }
  return (
    <div className={`app theme-${mode} ${language === 'hi' ? 'lang-hi' : ''}`}>
      <div className="top-bar">
        {activePage === 'temples' ? (
          <button
            className={`featured-pill ${featuredTemple ? '' : 'is-empty'}`}
            type="button"
            onClick={jumpToFeatured}
            disabled={!featuredTemple}
          >
            <span className="featured-label">Featured</span>
            <span className="featured-name">
              {featuredTemple ? getTempleText(featuredTemple, 'name') : 'No temples found'}
            </span>
          </button>
        ) : (
          <span />
        )}
        <div className="top-bar-actions">
          <nav className="top-nav" aria-label={t.nav.label}>
            <button
              className={`top-nav-link ${activePage === 'temples' ? 'active' : ''}`}
              type="button"
              onClick={() => switchPage('temples')}
            >
              {t.nav.temples}
            </button>
            <button
              className={`top-nav-link ${activePage === 'recent' ? 'active' : ''}`}
              type="button"
              onClick={() => switchPage('recent')}
            >
              {t.nav.recent}
            </button>
            <button
              className={`top-nav-link ${activePage === 'about' ? 'active' : ''}`}
              type="button"
              onClick={() => switchPage('about')}
            >
              {t.nav.about}
            </button>
          </nav>
        </div>
      </div>

      {isAbout ? (
        <>
          <section className="cards about-page" id="about">
            <div className="about-intro">
              <div className="section-header about-header">
                <h2>{t.aboutSection.eyebrow}</h2>
                <p>{t.aboutSection.subtitle}</p>
              </div>
              <div className="about-divider" aria-hidden="true" />
            </div>
            <div className="about-grid">
              {t.aboutSection.cards.map((card, index) => (
                <article className="about-card" key={card.title} style={{ '--delay': `${index * 80}ms` }}>
                  <span className="about-card-badge">{String(index + 1).padStart(2, '0')}</span>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="cards disclaimer-section" aria-label={t.disclaimerSection.title}>
            <div className="disclaimer-card">
              <h3>{t.disclaimerSection.title}</h3>
              <p>{t.disclaimerSection.body}</p>
              <p className="disclaimer-note">{t.disclaimerSection.note}</p>
            </div>
          </section>
        </>
      ) : isRecent ? (
        <section className="cards discoveries-section" id="recent-discoveries">
          <div className="section-header">
            <h2>{t.recentSection.title}</h2>
            <p>{t.recentSection.subtitle}</p>
          </div>
          {isShivaMode && recentItems.length ? (
            <>
              <div className="discovery-grid">
                {pagedRecentItems.map((item, index) => {
                  const source = item.sources?.[0]
                  const summary = item.summary || t.recentSection.pending
                  const period = item.period || t.recentSection.pending
                  const year = item.yearDiscovered || t.recentSection.pending
                  const status = item.status || t.recentSection.pending
                  const location = item.location || t.recentSection.pending
                  return (
                    <article className="discovery-card" key={`${item.name}-${index}`}>
                      <div className="discovery-header">
                        <span className="discovery-badge">{status}</span>
                        <span className="discovery-year">{year}</span>
                      </div>
                      <h3>{item.name}</h3>
                      <p className="discovery-location">{location}</p>
                      <p className="discovery-summary">{summary}</p>
                      <div className="discovery-details">
                        <div className="discovery-detail">
                          <span>{t.recentSection.labels.period}</span>
                          <p>{period}</p>
                        </div>
                        <div className="discovery-detail">
                          <span>{t.recentSection.labels.source}</span>
                          {source ? (
                            <a href={source.url} target="_blank" rel="noreferrer">
                              {source.label}
                            </a>
                          ) : (
                            <p>{t.recentSection.pending}</p>
                          )}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
              {renderPagination(recentPage, totalRecentPages, setRecentPage, 'recent')}
              <p className="discovery-note">{t.recentSection.note}</p>
            </>
          ) : (
            <div className="empty-state">
              <h3>
                {isShivaMode ? t.recentSection.emptyTitle : t.recentSection.shaktiOnlyTitle}
              </h3>
              <p>{isShivaMode ? t.recentSection.emptyBody : t.recentSection.shaktiOnlyBody}</p>
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="stories-section">
            <div className="stories-hero-shell">
              <p className="stories-kicker">{t.portalName}</p>
              <svg
                className="hero-logo"
                viewBox="0 0 240 240"
                role="img"
                aria-label={`${t.portalName} om symbol`}
              >
                <defs>
                  <filter id="brush-stroke" x="-20%" y="-20%" width="140%" height="140%">
                    <feTurbulence
                      type="fractalNoise"
                      baseFrequency="0.015"
                      numOctaves="2"
                      seed="2"
                      result="noise"
                    />
                    <feDisplacementMap
                      in="SourceGraphic"
                      in2="noise"
                      scale="6"
                      xChannelSelector="R"
                      yChannelSelector="G"
                    />
                  </filter>
                </defs>
                <g filter="url(#brush-stroke)">
                  <text
                    className="hero-logo-mark"
                    x="50%"
                    y="55%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    ॐ
                  </text>
                </g>
              </svg>
              <h1 className="stories-title">{t.heroTitle}</h1>
              <p className="stories-subtitle">{t.heroSubtitle}</p>
              <div className="stories-ornament" aria-hidden="true" />
              <div className="hero-stats-row">
                <div className="hero-stat">
                  <span className="hero-stat-number">{templeStats.temples.toLocaleString()}</span>
                  <span className="hero-stat-label">{t.stats.temples}</span>
                </div>
                <div className="hero-stat">
                  <span className="hero-stat-number">{templeStats.cities.toLocaleString()}</span>
                  <span className="hero-stat-label">{t.stats.cities}</span>
                </div>
                <div className="hero-stat">
                  <span className="hero-stat-number">{templeStats.states.toLocaleString()}</span>
                  <span className="hero-stat-label">{t.stats.states}</span>
                </div>
              </div>
              <div className="stories-filter-wrap">
                <div className="filters-container">
                  <label className="input-group" htmlFor="filter-state">
                    <select
                      id="filter-state"
                      value={selectedState}
                      onChange={(event) => handleStateChange(event.target.value, 'dropdown')}
                    >
                      {states.map((state) => (
                        <option key={state} value={state}>
                          {labelForState(state)}
                        </option>
                      ))}
                    </select>
                    <i className="fa-solid fa-chevron-down input-icon" aria-hidden="true" />
                  </label>

                  <label className="input-group" htmlFor="filter-city">
                    <select
                      id="filter-city"
                      value={selectedCity}
                      onChange={(event) => handleCityChange(event.target.value)}
                    >
                      {cities.map((city) => (
                        <option key={city} value={city}>
                          {labelForCity(city)}
                        </option>
                      ))}
                    </select>
                    <i className="fa-solid fa-chevron-down input-icon" aria-hidden="true" />
                  </label>

                  <label className="input-group search-wrapper" htmlFor="filter-search">
                    <i className="fa-solid fa-magnifying-glass input-icon" aria-hidden="true" />
                    <input
                      id="filter-search"
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder={t.panel.searchPlaceholder}
                    />
                  </label>
                </div>
              </div>
              {activeStates.length ? (
                <div className="state-quicklist" role="group" aria-label="Story states">
                  {[ALL_STATES, ...activeStates].map((state) => (
                    <button
                      key={state}
                      className={`state-chip ${storyState === state ? 'active' : ''}`}
                      type="button"
                      onClick={() => {
                        const nextState = storyState === state ? ALL_STATES : state
                        setStoryState(nextState)
                        handleStateChange(nextState, 'chip')
                      }}
                    >
                      {state === ALL_STATES ? t.labels.allStates : state}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV ? (
              <div className="hero-audit-row">
                <button
                  className="ghost"
                  type="button"
                  onClick={runImageAudit}
                  disabled={auditStatus.running || selectedState === ALL_STATES}
                >
                  {auditStatus.running
                    ? `Auditing ${selectedState} images (${auditStatus.done}/${auditStatus.total})`
                    : 'Audit state images (dev)'}
                </button>
              </div>
            ) : null}
          </section>

          {searchActive ? (
            <section className="cards cards-search" id="search-results">
              <div className="section-header compact">
                <h2>{t.searchSection.title}</h2>
                <p>{t.searchSection.subtitle(searchFilteredTemples.length)}</p>
              </div>
              <div className="card-grid">
                {pagedSearchTemples.map((temple, index) => {
                  const imageSrc = temple.image ?? getPlaceholderImage(temple.name)
                  const storyText = getTempleText(temple, 'story')
                  const wordCount = storyText ? storyText.trim().split(/\s+/).length : 0
                  const readTime = wordCount ? Math.max(1, Math.round(wordCount / 90)) : 1
                  return (
                    <article
                      className="temple-card"
                      key={`search-${temple.name}-${index}`}
                      style={{ '--delay': `${index * 60}ms` }}
                    >
                      <figure className="card-media">
                        <img
                          src={imageSrc}
                          alt={`${getTempleText(temple, 'name')} in ${temple.city}`}
                          loading="lazy"
                          onError={(event) => {
                            if (event.currentTarget.dataset.fallbackApplied) return
                            event.currentTarget.dataset.fallbackApplied = '1'
                            event.currentTarget.src = getPlaceholderImage(temple.name)
                          }}
                        />
                        {temple.image && temple.creditUrl && temple.credit ? (
                          <figcaption>
                            <a href={temple.creditUrl} target="_blank" rel="noreferrer">
                              {temple.credit}
                            </a>
                          </figcaption>
                        ) : null}
                      </figure>
                      <div className="card-body">
                        <div className="card-meta">
                          <span className="card-location">
                            <span className="location-dot" aria-hidden="true" />
                            {temple.city}, {temple.state}
                          </span>
                          {getTempleText(temple, 'region') ? (
                            <span className="card-region">{getTempleText(temple, 'region')}</span>
                          ) : null}
                          <span className="card-readtime">{readTime} min read</span>
                        </div>
                        <h3>{getTempleText(temple, 'name')}</h3>
                        <p>{storyText}</p>
                        <button
                          className="card-action"
                          type="button"
                          onClick={() => openTempleStory(temple, 'search_results')}
                        >
                          {t.readFullStory}
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
              {renderPagination(searchPage, totalSearchPages, setSearchPage, 'search')}
              {searchFilteredTemples.length === 0 ? (
                <div className="empty-state">
                  <h3>{t.searchEmpty.title}</h3>
                  <p>{t.searchEmpty.body}</p>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="cards" id="temple-cards">
            <div className="section-header">
              <h2>{t.cardsSection.title}</h2>
              <p>{t.cardsSection.subtitle}</p>
              <div className="section-tags" role="list">
                <span className="section-chip" role="listitem">
                  {modeLabel}
                </span>
                <span className="section-chip" role="listitem">
                  {storyStateLabel}
                </span>
              </div>
            </div>
            <div className="card-grid">
              {pagedTemples.map((temple, index) => {
                const imageSrc = temple.image ?? getPlaceholderImage(temple.name)
                const storyText = getTempleText(temple, 'story')
                const wordCount = storyText ? storyText.trim().split(/\s+/).length : 0
                const readTime = wordCount ? Math.max(1, Math.round(wordCount / 90)) : 1
                return (
                  <article
                    className="temple-card"
                    id={getTempleId(temple, index)}
                    key={temple.name}
                    style={{ '--delay': `${index * 80}ms` }}
                  >
                    <figure className="card-media">
                      <img
                        src={imageSrc}
                        alt={`${getTempleText(temple, 'name')} in ${temple.city}`}
                        loading="lazy"
                        onError={(event) => {
                          if (event.currentTarget.dataset.fallbackApplied) return
                          event.currentTarget.dataset.fallbackApplied = '1'
                          event.currentTarget.src = getPlaceholderImage(temple.name)
                        }}
                      />
                      {temple.image && temple.creditUrl && temple.credit ? (
                        <figcaption>
                          <a href={temple.creditUrl} target="_blank" rel="noreferrer">
                            {temple.credit}
                          </a>
                        </figcaption>
                      ) : null}
                    </figure>
                    <div className="card-body">
                      <div className="card-meta">
                        <span className="card-location">
                          <span className="location-dot" aria-hidden="true" />
                          {temple.city}, {temple.state}
                        </span>
                        {getTempleText(temple, 'region') ? (
                          <span className="card-region">{getTempleText(temple, 'region')}</span>
                        ) : null}
                        <span className="card-readtime">{readTime} min read</span>
                      </div>
                      <h3>{getTempleText(temple, 'name')}</h3>
                      <p>{storyText}</p>
                      <button
                        className="card-action"
                        type="button"
                        onClick={() => openTempleStory(temple, 'temple_cards')}
                      >
                        {t.readFullStory}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
            {renderPagination(currentPage, totalPages, setCurrentPage, 'temples')}
            {displayedTemples.length === 0 ? (
              <div className="empty-state">
                <h3>{t.emptyState.title}</h3>
                <p>{t.emptyState.body}</p>
                <button className="ghost">{t.emptyState.cta}</button>
              </div>
            ) : null}
          </section>

        </>
      )}

      <footer className="footer">
        <p>{t.footer}</p>
      </footer>

      {activeTemple ? (
        <div className="story-overlay" onClick={() => setActiveTemple(null)}>
          <div
            className="story-modal"
            ref={storyModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="story-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="story-close"
              type="button"
              onClick={() => setActiveTemple(null)}
              aria-label={t.modal.close}
            >
              {t.modal.close}
            </button>
            <div className={`story-hero ${isPortraitImage ? 'is-portrait' : ''}`}>
              <img
                src={modalImageSrc}
                alt={`${getTempleText(activeTemple, 'name')} in ${activeTemple.city}`}
                loading="lazy"
                onError={() => {
                  if (activeTemple) {
                    setModalImageSrc(getPlaceholderImage(activeTemple.name))
                    setIsPortraitImage(false)
                  }
                }}
              />
              {activeTemple.image && activeTemple.creditUrl && activeTemple.credit ? (
                <a href={activeTemple.creditUrl} target="_blank" rel="noreferrer">
                  {activeTemple.credit}
                </a>
              ) : null}
            </div>
            <div className="story-header">
              <p className="story-eyebrow">{t.modal.eyebrow}</p>
              <h2 id="story-title">{getTempleText(activeTemple, 'name')}</h2>
              <p className="story-location">
                {activeTemple.city}, {activeTemple.state} · {getTempleText(activeTemple, 'region')}
              </p>
              <div className="story-tags">
                {getTempleList(activeTemple, 'tags').map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="story-content">
              <div className="story-body">
                <div className="story-section">
                  <h3>{t.modal.story}</h3>
                  <p>{getTempleText(activeTemple, 'story')}</p>
                </div>
                <div className="story-section highlight">
                  <h3>{t.modal.signature}</h3>
                  <p>{getTempleText(activeTemple, 'highlight')}</p>
                </div>
                {detailCards.length ? (
                  <div className="story-section">
                    <h3>{t.modal.coreDetails}</h3>
                    <div className="story-details">
                      {detailCards.map((item) => (
                        <div className="detail-card" key={item.label}>
                          <span className="detail-label">{item.label}</span>
                          <p className="detail-value">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {ritualList.length ? (
                  <div className="story-section">
                    <h3>{t.modal.rituals}</h3>
                    <p>{ritualList.join(' · ')}</p>
                  </div>
                ) : null}
                {festivalList.length ? (
                  <div className="story-section">
                    <h3>{t.modal.festivals}</h3>
                    <p>{festivalList.join(' · ')}</p>
                  </div>
                ) : null}
                <div className="story-section">
                  <h3>{t.modal.more}</h3>
                  {moreBlocks.length ? (
                    <div className="story-more">
                      {moreBlocks.map((item) => (
                        <div className="story-block" key={item.label}>
                          <h4>{item.label}</h4>
                          <p>{item.value}</p>
                        </div>
                      ))}
                      {moreDetails?.sources?.length ? (
                        <div className="story-sources">
                          <h4>{t.modal.sources}</h4>
                          <div className="source-list">
                            {moreDetails.sources.map((source) => (
                              <a
                                key={source.url}
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {source.label}
                                {source.type ? <span className="source-type"> · {source.type}</span> : null}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {moreDetails?.puranicSources?.length ? (
                        <div className="story-sources">
                          <h4>{t.modal.puranicSources}</h4>
                          <div className="source-list">
                            {moreDetails.puranicSources.map((source) => (
                              <a
                                key={source.url}
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {source.label}
                                {source.type ? <span className="source-type"> · {source.type}</span> : null}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {moreDetails?.folkloreSources?.length ? (
                        <div className="story-sources">
                          <h4>{t.modal.folkloreSources}</h4>
                          <div className="source-list">
                            {moreDetails.folkloreSources.map((source) => (
                              <a
                                key={source.url}
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {source.label}
                                {source.type ? <span className="source-type"> · {source.type}</span> : null}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p>{t.modal.empty}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  )
}

export default App
