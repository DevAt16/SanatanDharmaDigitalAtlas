import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { templeData } from './data/temples'
import { lineageData } from './data/lineages'

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
const ALL_DEITIES = 'All Deities'
const MODES = {
  SHIVA: 'shiva',
  SHAKTI: 'shakti',
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
  'Andhra Pradesh',
]
const NAV_LINKS = ['Home', 'About us', 'Story', 'Blog', 'Contact']
const NAV_WITH_DROPDOWN = new Set(['Story', 'Blog'])

const copy = {
  en: {
    portalName: 'Sanatan Dharma Digital Atlas',
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
      temples: 'Temples',
      lineages: 'Lineages',
    },
    lineagesHero: {
      title: 'Lineages and living traditions of Sanatan Dharma.',
      subtitle:
        'Meet the sampradayas that shaped spiritual practice across India, with their founders, core practices, and guiding figures.',
      actions: {
        primary: 'Explore lineages',
        secondary: 'Back to temples',
      },
    },
    lineagesStats: {
      lineages: 'Lineages profiled',
      figures: 'Key figures',
      traditions: 'Traditions covered',
    },
    lineagesPanel: {
      title: 'What you will find',
      subtitle: 'A curated briefing on each lineage and its leaders.',
      items: [
        'Founding teachers and reformers',
        'Core practices, rituals, and study',
        'Important figures to follow',
        'Regional centers and influence',
      ],
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
    lineagesSection: {
      title: 'Lineages and Sampradayas',
      subtitle: 'Ten foundational streams, each with key figures and practices.',
      practicesLabel: 'Core practices',
      figuresLabel: 'Key figures',
      viewDetails: 'View lineage',
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
    footer: 'Sanatan Dharma Portal. Crafted for community, history, and devotion.',
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
    lineagesModal: {
      eyebrow: 'Lineage',
      close: 'Close',
      overview: 'Overview',
      corePractices: 'Core practices',
      figures: 'Important figures',
      sources: 'Sources',
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
    portalName: 'सनातन धर्म डिजिटल एटलस',
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
      temples: 'मंदिर',
      lineages: 'परंपराएँ',
    },
    lineagesHero: {
      title: 'सनातन धर्म की परंपराएँ और जीवंत समप्रदाय।',
      subtitle:
        'वे समप्रदाय जो भारत में साधना और दर्शन की धारा को आकार देते हैं—उनके प्रवर्तक, मुख्य अभ्यास और प्रमुख आचार्य।',
      actions: {
        primary: 'परंपराएँ देखें',
        secondary: 'मंदिरों पर लौटें',
      },
    },
    lineagesStats: {
      lineages: 'प्रोफ़ाइल परंपराएँ',
      figures: 'प्रमुख आचार्य',
      traditions: 'कवर की गई धाराएँ',
    },
    lineagesPanel: {
      title: 'आपको क्या मिलेगा',
      subtitle: 'हर परंपरा का संक्षिप्त और क्यूरेटेड परिचय।',
      items: [
        'प्रवर्तक और सुधारक आचार्य',
        'मुख्य साधना और अध्ययन',
        'प्रमुख व्यक्तित्व',
        'क्षेत्रीय केंद्र और प्रभाव',
      ],
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
    lineagesSection: {
      title: 'परंपराएँ और समप्रदाय',
      subtitle: 'दस प्रमुख धाराएँ, मुख्य आचार्य और साधना विवरण।',
      practicesLabel: 'मुख्य अभ्यास',
      figuresLabel: 'प्रमुख आचार्य',
      viewDetails: 'परंपरा देखें',
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
    lineagesModal: {
      eyebrow: 'परंपरा',
      close: 'बंद करें',
      overview: 'परिचय',
      corePractices: 'मुख्य अभ्यास',
      figures: 'प्रमुख आचार्य',
      sources: 'स्रोत',
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
  const [selectedDeity, setSelectedDeity] = useState(ALL_DEITIES)
  const [searchTerm, setSearchTerm] = useState('')
  const [mode, setMode] = useState(MODES.SHIVA)
  const [activeTemple, setActiveTemple] = useState(null)
  const [activeLineage, setActiveLineage] = useState(null)
  const storyModalRef = useRef(null)
  const [modalImageSrc, setModalImageSrc] = useState('')
  const [isPortraitImage, setIsPortraitImage] = useState(false)
  const t = copy[language]
  const isLineages = activePage === 'lineages'
  const isShivaMode = mode === MODES.SHIVA
  const safeTempleData = useMemo(
    () => templeData.filter((item) => item && typeof item === 'object'),
    []
  )

  const themedTemples = useMemo(() => {
    const isShivaTemple = (item) =>
      item && (item.deity === 'Shiva' || item.tradition === 'Shaiva')
    const isShaktiTemple = (item) =>
      item &&
      (item.tradition === 'Shakta' ||
        (item.tags ?? []).some((tag) => tag.toLowerCase().includes('shakti')))
    return safeTempleData.filter((item) =>
      isShivaMode ? isShivaTemple(item) : isShaktiTemple(item)
    )
  }, [isShivaMode, safeTempleData])

  const visibleTemples = useMemo(
    () => themedTemples.filter((item) => FOCUS_STATES.includes(item.state)),
    [themedTemples]
  )

  const states = useMemo(() => [ALL_STATES, ...FOCUS_STATES], [])

  const deities = useMemo(() => {
    const unique = Array.from(new Set(visibleTemples.map((item) => item.deity).filter(Boolean)))
    return [ALL_DEITIES, ...unique]
  }, [visibleTemples])

  const lineageStats = useMemo(() => {
    const figureCount = lineageData.reduce(
      (total, lineage) => total + (lineage.keyFigures?.length ?? 0),
      0
    )
    const traditions = new Set(lineageData.map((lineage) => lineage.tradition))
    return {
      lineageCount: lineageData.length,
      figureCount,
      traditionCount: traditions.size,
    }
  }, [])

  const templeStats = useMemo(() => {
    const statesSet = new Set(visibleTemples.map((item) => item.state))
    const citiesSet = new Set(visibleTemples.map((item) => item.city))
    return {
      temples: visibleTemples.length,
      cities: citiesSet.size,
      states: statesSet.size,
    }
  }, [visibleTemples])

  const cities = useMemo(() => {
    if (selectedState === ALL_STATES) {
      return [ALL_CITIES]
    }
    const unique = Array.from(
      new Set(
        visibleTemples.filter((item) => item.state === selectedState).map((item) => item.city)
      )
    )
    return [ALL_CITIES, ...unique]
  }, [selectedState, visibleTemples])

  useEffect(() => {
    if (!cities.includes(selectedCity)) {
      setSelectedCity(ALL_CITIES)
    }
  }, [cities, selectedCity])

  useEffect(() => {
    if (!deities.includes(selectedDeity)) {
      setSelectedDeity(ALL_DEITIES)
    }
  }, [deities, selectedDeity])

  useEffect(() => {
    if (!states.includes(selectedState)) {
      setSelectedState(ALL_STATES)
    }
  }, [states, selectedState])

  useEffect(() => {
    if (activeTemple && !visibleTemples.includes(activeTemple)) {
      setActiveTemple(null)
    }
  }, [activeTemple, visibleTemples])

  useEffect(() => {
    document.documentElement.lang = language === 'hi' ? 'hi' : 'en'
  }, [language])

  useEffect(() => {
    if (!activeTemple && !activeLineage) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setActiveTemple(null)
        setActiveLineage(null)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [activeTemple, activeLineage])

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

  const filteredTemples = visibleTemples.filter((item) => {
    const matchState = selectedState === ALL_STATES || item.state === selectedState
    const matchCity = selectedCity === ALL_CITIES || item.city === selectedCity
    const matchDeity = selectedDeity === ALL_DEITIES || item.deity === selectedDeity
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
    return matchState && matchCity && matchDeity && matchSearch
  })
  const displayedTemples = filteredTemples

  const scrollToLineages = () => {
    const section = document.getElementById('lineage-cards')
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const switchPage = (page) => {
    setActivePage(page)
    setActiveTemple(null)
    setActiveLineage(null)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
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

  const getLineageText = (lineage, key) => {
    if (!lineage) {
      return ''
    }
    return lineage[key]
  }

  const getLineageList = (lineage, key) => {
    if (!lineage) {
      return []
    }
    return lineage[key] ?? []
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
  const labelForDeity = (deity) => (deity === ALL_DEITIES ? t.panel.allDeities : deity)
  return (
    <div className={`app theme-${mode} ${language === 'hi' ? 'lang-hi' : ''}`}>
      <nav className="navbar">
        <a href="#" className="logo-container">
          <i className="fa-solid fa-om logo-icon" aria-hidden="true" />
          <div className="brand-text">
            <span className="brand-name-main">Sanatan Dharma</span>
            <span className="brand-name-sub">Digital Atlas</span>
          </div>
        </a>

        <ul className="nav-links">
          {NAV_LINKS.map((item) => (
            <li className="nav-item" key={item}>
              <a href="#" className="nav-link">
                {item}
                {NAV_WITH_DROPDOWN.has(item) ? (
                  <i className="fa-solid fa-chevron-down nav-caret" aria-hidden="true" />
                ) : null}
              </a>
            </li>
          ))}
        </ul>

        <div className="auth-buttons">
          <div className="mode-toggle-inline" role="group" aria-label={t.modeToggle.label}>
            <button
              className={`mode-pill ${isShivaMode ? 'active' : ''}`}
              type="button"
              aria-pressed={isShivaMode}
              onClick={() => setMode(MODES.SHIVA)}
            >
              {t.modeToggle.shiva}
            </button>
            <button
              className={`mode-pill ${!isShivaMode ? 'active' : ''}`}
              type="button"
              aria-pressed={!isShivaMode}
              onClick={() => setMode(MODES.SHAKTI)}
            >
              {t.modeToggle.shakti}
            </button>
          </div>
          <a className="btn btn-login" href="#">
            Log in
          </a>
          <a className="btn btn-signup" href="#">
            Create account
          </a>
        </div>
      </nav>

      {isLineages ? (
        <>
          <header className="hero hero-lineages">
            <div className="hero-content">
              <div className="hero-top">
                <p className="eyebrow">{t.portalName}</p>
              </div>
              <h1>{t.lineagesHero.title}</h1>
              <p className="subtitle">{t.lineagesHero.subtitle}</p>
              <div className="hero-actions">
                <button className="primary" type="button" onClick={scrollToLineages}>
                  {t.lineagesHero.actions.primary}
                </button>
                <button className="ghost" type="button" onClick={() => switchPage('temples')}>
                  {t.lineagesHero.actions.secondary}
                </button>
              </div>
              <div className="hero-stats">
                <div>
                  <p className="stat-number">{lineageStats.lineageCount}</p>
                  <p className="stat-label">{t.lineagesStats.lineages}</p>
                </div>
                <div>
                  <p className="stat-number">{lineageStats.figureCount}</p>
                  <p className="stat-label">{t.lineagesStats.figures}</p>
                </div>
                <div>
                  <p className="stat-number">{lineageStats.traditionCount}</p>
                  <p className="stat-label">{t.lineagesStats.traditions}</p>
                </div>
              </div>
            </div>
            <div className="hero-panel lineage-panel">
              <div className="panel-head">
                <h2>{t.lineagesPanel.title}</h2>
                <p>{t.lineagesPanel.subtitle}</p>
              </div>
              <div className="lineage-panel-list">
                {t.lineagesPanel.items.map((item) => (
                  <div className="lineage-panel-item" key={item}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </header>

          <section className="lineages" id="lineage-cards">
            <div className="section-header">
              <h2>{t.lineagesSection.title}</h2>
              <p>{t.lineagesSection.subtitle}</p>
            </div>
            <div className="lineage-grid">
              {lineageData.map((lineage, index) => {
                const practices = getLineageList(lineage, 'corePractices')
                const figures = getLineageList(lineage, 'keyFigures')
                const visibleFigures = figures.slice(0, 3)
                const extraFigureCount = figures.length - visibleFigures.length
                return (
                  <article
                    className="lineage-card"
                    key={lineage.id}
                    style={{ '--delay': `${index * 80}ms` }}
                  >
                    <div className="lineage-meta">
                      <span className="lineage-tag">{getLineageText(lineage, 'tradition')}</span>
                      <span className="lineage-region">{getLineageText(lineage, 'region')}</span>
                    </div>
                    <h3>{getLineageText(lineage, 'name')}</h3>
                    <p className="lineage-summary">{getLineageText(lineage, 'summary')}</p>
                    {practices.length ? (
                      <div>
                        <p className="lineage-label">{t.lineagesSection.practicesLabel}</p>
                        <div className="lineage-practices">
                          {practices.map((practice) => (
                            <span key={practice}>{practice}</span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {figures.length ? (
                      <div className="lineage-figures">
                        <p className="lineage-label">{t.lineagesSection.figuresLabel}</p>
                        <div className="lineage-figure-list">
                          {visibleFigures.map((figure) => (
                            <span key={figure.name}>{figure.name}</span>
                          ))}
                          {extraFigureCount > 0 ? (
                            <span className="lineage-more">+{extraFigureCount} more</span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    <button
                      className="link"
                      type="button"
                      onClick={() => {
                        setActiveLineage(lineage)
                        setActiveTemple(null)
                      }}
                    >
                      {t.lineagesSection.viewDetails}
                    </button>
                  </article>
                )
              })}
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="stories-section">
            <h1 className="stories-title">{t.heroTitle}</h1>
            <p className="stories-subtitle">{t.heroSubtitle}</p>
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

            <div className="filters-container">
              <label className="input-group" htmlFor="filter-state">
                <select
                  id="filter-state"
                  value={selectedState}
                  onChange={(event) => setSelectedState(event.target.value)}
                >
                  {states.map((state) => (
                    <option key={state} value={state}>
                      {labelForState(state)}
                    </option>
                  ))}
                </select>
                <i className="fa-solid fa-chevron-down input-icon" aria-hidden="true" />
              </label>

              <label className="input-group" htmlFor="filter-deity">
                <select
                  id="filter-deity"
                  value={selectedDeity}
                  onChange={(event) => setSelectedDeity(event.target.value)}
                >
                  {deities.map((deity) => (
                    <option key={deity} value={deity}>
                      {labelForDeity(deity)}
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
          </section>

          <section className="cards" id="temple-cards">
            <div className="card-grid">
              {displayedTemples.map((temple, index) => {
                const imageSrc = temple.image ?? getPlaceholderImage(temple.name)
                const storyText = getTempleText(temple, 'story')
                const wordCount = storyText ? storyText.trim().split(/\s+/).length : 0
                const readTime = wordCount ? Math.max(1, Math.round(wordCount / 90)) : 1
                return (
                  <article
                    className="temple-card"
                    key={temple.name}
                    style={{ '--delay': `${index * 80}ms` }}
                  >
                    <figure className="card-media">
                      <img
                        src={imageSrc}
                        alt={`${getTempleText(temple, 'name')} in ${temple.city}`}
                        loading="lazy"
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
                        onClick={() => setActiveTemple(temple)}
                      >
                        {t.readFullStory}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
            {filteredTemples.length === 0 ? (
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

      {activeLineage ? (
        <div className="story-overlay" onClick={() => setActiveLineage(null)}>
          <div
            className="story-modal lineage-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lineage-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="story-close"
              type="button"
              onClick={() => setActiveLineage(null)}
              aria-label={t.lineagesModal.close}
            >
              {t.lineagesModal.close}
            </button>
            <div className="lineage-header">
              <p className="story-eyebrow">{t.lineagesModal.eyebrow}</p>
              <h2 id="lineage-title">{getLineageText(activeLineage, 'name')}</h2>
              <p className="lineage-subtitle">
                {getLineageText(activeLineage, 'tradition')} · {getLineageText(activeLineage, 'region')}
              </p>
            </div>
            <div className="lineage-body">
              <div className="lineage-section">
                <h3>{t.lineagesModal.overview}</h3>
                <p>{getLineageText(activeLineage, 'summary')}</p>
              </div>
              <div className="lineage-section">
                <h3>{t.lineagesModal.corePractices}</h3>
                <div className="lineage-chip-row">
                  {getLineageList(activeLineage, 'corePractices').map((practice) => (
                    <span key={practice}>{practice}</span>
                  ))}
                </div>
              </div>
              <div className="lineage-section">
                <h3>{t.lineagesModal.figures}</h3>
                <div className="lineage-figures-grid">
                  {getLineageList(activeLineage, 'keyFigures').map((figure) => (
                    <div className="lineage-figure-card" key={figure.name}>
                      <p className="figure-name">{figure.name}</p>
                      <span className="figure-role">{figure.role}</span>
                      <p className="figure-details">{figure.details}</p>
                    </div>
                  ))}
                </div>
              </div>
              {activeLineage.sources?.length ? (
                <div className="lineage-section">
                  <h3>{t.lineagesModal.sources}</h3>
                  <div className="source-list">
                    {activeLineage.sources.map((source) => (
                      <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                        {source.label}
                        {source.type ? <span className="source-type"> · {source.type}</span> : null}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
