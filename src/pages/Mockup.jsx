import { useState, useRef, useEffect } from "react";

const C = {
  bg: "#0D0D14", surface: "#181822", card: "#1C1C28", cardHover: "#242432",
  border: "#282838",
  primary: "#7C6AF6", primaryLight: "#9D8FFF", primaryDim: "rgba(124,106,246,0.12)",
  accent: "#FF6B8A", accentDim: "rgba(255,107,138,0.12)",
  blue: "#4DA6FF", blueDim: "rgba(77,166,255,0.12)",
  green: "#36D399", greenDim: "rgba(54,211,153,0.12)",
  orange: "#FFB347", orangeDim: "rgba(255,179,71,0.12)",
  cyan: "#22D3EE", cyanDim: "rgba(34,211,238,0.12)",
  pink: "#F472B6",
  text: "#F0F0F5", sub: "#9898AD", muted: "#5A5A72",
};

const CL = {
  blue: "#4DA6FF", emerald: "#36D399", red: "#FB7185", amber: "#FFB347",
  purple: "#7C6AF6", orange: "#FF8C42", teal: "#22D3EE", pink: "#F472B6",
  slate: "#94A3B8", green: "#36D399", cyan: "#22D3EE", sky: "#38BDF8",
};

const ALL_BOTS = [
  {id:"ancano-pro",n:"ANCANO Pro",i:"💎",c:"ai",d:"Ancano 프리미엄 AI 어시스턴트",cl:"purple",av:"/logos/ancano/icon_dark_128.png"},
  {id:"auto-gpt",n:"GPT",i:"🤖",c:"ai",d:"OpenAI 대표 AI 모델",cl:"blue",av:"/logos/gpt.svg"},
  {id:"auto-claude",n:"Claude",i:"🧡",c:"ai",d:"Anthropic 대표 AI 모델",cl:"orange",av:"/logos/claude.png"},
  {id:"auto-gemini",n:"Gemini",i:"💎",c:"ai",d:"Google 대표 AI 모델",cl:"emerald",av:"/logos/gemini.svg"},
  {id:"auto-grok",n:"Grok",i:"⚡",c:"ai",d:"xAI 대표 AI 모델",cl:"teal",av:"/logos/grok.svg"},
  {id:"auto-perplexity",n:"Perplexity",i:"🔍",c:"ai",d:"Perplexity 대표 검색 AI",cl:"pink",av:"/logos/perplexity.svg"},
  {id:"auto-qwen",n:"Qwen",i:"🌏",c:"ai",d:"Alibaba 대표 AI 모델",cl:"amber",av:"/logos/qwen.png"},
  {id:"gpt",n:"GPT-5.4",i:"🤖",c:"ai",d:"AI 최상위 추론 모델",cl:"blue",av:"/logos/gpt.svg"},
  {id:"gpt-mini",n:"GPT-5.4 Mini",i:"⚡",c:"ai",d:"AI 고속 범용 모델",cl:"blue",av:"/logos/gpt.svg"},
  {id:"gpt-nano",n:"GPT-5.4 Nano",i:"💨",c:"ai",d:"AI 초경량 즉답 모델",cl:"blue",av:"/logos/gpt.svg"},
  {id:"claude",n:"Claude Opus 4.6",i:"🧡",c:"ai",d:"AI 최고 지능 모델",cl:"orange",av:"/logos/claude.png"},
  {id:"claude-sonnet",n:"Claude Sonnet 4.5",i:"🎵",c:"ai",d:"AI 균형 잡힌 만능 모델",cl:"orange",av:"/logos/claude.png"},
  {id:"claude-sonnet-4.6",n:"Claude Sonnet 4.6",i:"🎶",c:"ai",d:"AI 최신 균형 모델",cl:"orange",av:"/logos/claude.png"},
  {id:"claude-haiku",n:"Claude Haiku 4.5",i:"🍃",c:"ai",d:"AI 초고속 경량 모델",cl:"orange",av:"/logos/claude.png"},
  {id:"gemini",n:"Gemini 2.5 Flash",i:"💎",c:"ai",d:"AI 고속 만능 모델",cl:"emerald",av:"/logos/gemini.svg"},
  {id:"gemini-3-flash",n:"Gemini 3 Flash",i:"⚡",c:"ai",d:"AI 차세대 고속 모델",cl:"emerald",av:"/logos/gemini.svg"},
  {id:"gemini-3.1",n:"Gemini 3.1 Lite",i:"🍃",c:"ai",d:"AI 초경량 최신 모델",cl:"emerald",av:"/logos/gemini.svg"},
  {id:"gemini-pro",n:"Gemini 3.1 Pro",i:"👑",c:"ai",d:"AI 최상위 프로 모델",cl:"emerald",av:"/logos/gemini.svg"},
  {id:"gemini-flash-lite",n:"Gemini 2.5 Flash Lite",i:"🪶",c:"ai",d:"AI 초경량 가성비 모델",cl:"emerald",av:"/logos/gemini.svg"},
  {id:"perplexity",n:"Perplexity Sonar",i:"🔍",c:"ai",d:"AI 검색·리서치 모델",cl:"pink",av:"/logos/perplexity.svg"},
  {id:"perplexity-pro",n:"Perplexity Sonar Pro",i:"🔎",c:"ai",d:"AI 심층 리서치 모델",cl:"pink",av:"/logos/perplexity.svg"},
  {id:"grok",n:"Grok 4.1 Fast",i:"⚡",c:"ai",d:"AI 고속 위트 모델",cl:"teal",av:"/logos/grok.svg"},
  {id:"grok-4.2",n:"Grok 4.2",i:"🔥",c:"ai",d:"AI 최신 추론 모델",cl:"teal",av:"/logos/grok.svg"},
  {id:"auto-deepseek",n:"DeepSeek",i:"🌊",c:"ai",d:"DeepSeek 대표 AI 모델",cl:"purple",av:"/logos/deepseek.png"},
  {id:"deepseek",n:"DeepSeek V3",i:"🌊",c:"ai",d:"AI 심층분석 전문가",cl:"purple",av:"/logos/deepseek.png"},
  {id:"deepseek-r1",n:"DeepSeek R1",i:"🧠",c:"ai",d:"DeepSeek 추론 특화 모델",cl:"purple",av:"/logos/deepseek.png"},
  {id:"qwen",n:"Qwen 3.5 Flash",i:"🌏",c:"ai",d:"AI 고속 다국어 모델",cl:"amber",av:"/logos/qwen.png"},
  {id:"qwen-9b",n:"Qwen 3.5 9B",i:"🧬",c:"ai",d:"AI 소형 고성능 오픈소스 모델",cl:"amber",av:"/logos/qwen.png"},
  {id:"qwen-plus",n:"Qwen 3.6 Plus",i:"🌐",c:"ai",d:"AI 상위 다국어 추론 모델",cl:"amber",av:"/logos/qwen.png"},
  {id:"qwen-thinking",n:"Qwen3 Max Thinking",i:"🧩",c:"ai",d:"Qwen 추론 특화 모델",cl:"amber",av:"/logos/qwen.png"},
  {id:"llama-maverick",n:"Llama 4 Maverick",i:"🦙",c:"ai",d:"Meta 최강 오픈소스 모델",cl:"blue",av:"/logos/meta.png"},
  {id:"llama-scout",n:"Llama 4 Scout",i:"🦙",c:"ai",d:"Meta 경량 고속 모델",cl:"blue",av:"/logos/meta.png"},
  {id:"mistral-large",n:"Mistral Large 3",i:"🌬️",c:"ai",d:"유럽 최상위 AI 모델",cl:"slate",av:"/logos/mistral.png"},
  {id:"mistral-medium",n:"Mistral Medium 3.1",i:"🌀",c:"ai",d:"유럽 균형잡힌 AI 모델",cl:"slate",av:"/logos/mistral.png"},
  {id:"mistral-small",n:"Mistral Small 4",i:"💨",c:"ai",d:"유럽 경량 고속 모델",cl:"slate",av:"/logos/mistral.png"},
  {id:"codestral",n:"Codestral",i:"💻",c:"ai",d:"Mistral 코딩 전용 모델",cl:"slate",av:"/logos/mistral.png"},
  {id:"mistral-creative",n:"Mistral Small Creative",i:"🎨",c:"ai",d:"창작 글쓰기 특화 모델",cl:"slate",av:"/logos/mistral.png"},
  {id:"devstral",n:"Devstral Medium",i:"🛠️",c:"ai",d:"Mistral 개발자 특화 모델",cl:"slate",av:"/logos/mistral.png"},
  {id:"gemma",n:"Gemma 4 31B",i:"💠",c:"ai",d:"구글 오픈소스 최신 모델",cl:"emerald",av:"/logos/gemini.svg"},
  {id:"phi",n:"Phi-4",i:"🔬",c:"ai",d:"MS 소형 추론 특화 모델",cl:"blue",av:"/logos/microsoft.png"},
  {id:"command-r-plus",n:"Command R+",i:"📚",c:"ai",d:"검색·출처 특화 AI 모델",cl:"green",av:"/logos/cohere.png"},
  {id:"command-a",n:"Command A",i:"📗",c:"ai",d:"Cohere 최신 AI 모델",cl:"green",av:"/logos/cohere.png"},
  {id:"nova-premier",n:"Amazon Nova Premier",i:"📦",c:"ai",d:"아마존 최상위 AI 모델",cl:"amber",av:"/logos/amazon.png"},
  {id:"nova-2-lite",n:"Amazon Nova 2 Lite",i:"📦",c:"ai",d:"아마존 최신 경량 모델, 컨텍스트 1M",cl:"amber",av:"/logos/amazon.png"},
  {id:"dolphin",n:"Dolphin (Venice)",i:"🐬",c:"ai",d:"검열 없는 자유로운 AI",cl:"cyan",av:"/logos/dolphin.png"},
  {id:"glm",n:"GLM 5.1",i:"🔷",c:"ai",d:"중국 최신 대형 AI 모델",cl:"blue",av:"/logos/glm.png"},
  {id:"glm-5v",n:"GLM 5V Turbo",i:"👁️",c:"ai",d:"Z.ai 비전+텍스트 모델",cl:"blue",av:"/logos/glm.png"},
  {id:"mimo",n:"MiMo-V2-Pro",i:"📱",c:"ai",d:"샤오미 AI 프로 모델",cl:"orange",av:"/logos/xiaomi.png"},
  {id:"mimo-flash",n:"MiMo-V2-Flash",i:"⚡",c:"ai",d:"샤오미 AI 경량 고속 모델",cl:"orange",av:"/logos/xiaomi.png"},
  {id:"nemotron",n:"Nemotron 3 Super",i:"🟢",c:"ai",d:"NVIDIA 120B 초대형 모델",cl:"green",av:"/logos/nvidia.png"},
  {id:"seed",n:"Seed 2.0 Lite",i:"🎵",c:"ai",d:"바이트댄스 최신 AI 모델",cl:"blue",av:"/logos/bytedance.png"},
  {id:"seed-mini",n:"Seed 2.0 Mini",i:"🎶",c:"ai",d:"바이트댄스 경량 AI 모델",cl:"blue",av:"/logos/bytedance.png"},
  {id:"minimax",n:"MiniMax M2.7",i:"🟣",c:"ai",d:"중국 멀티모달 최신 모델",cl:"purple",av:"/logos/minimax.png"},
  {id:"kimi",n:"Kimi K2.5",i:"🌙",c:"ai",d:"장문맥 특화 AI 모델",cl:"slate",av:"/logos/moonshot.png"},
  {id:"kimi-thinking",n:"Kimi K2 Thinking",i:"🌑",c:"ai",d:"Moonshot 추론 특화 모델",cl:"slate",av:"/logos/moonshot.png"},
  {id:"solar",n:"Solar Pro 3",i:"☀️",c:"ai",d:"한국 업스테이지 AI 모델",cl:"orange",av:"/logos/solar.png"},
  {id:"mercury",n:"Mercury 2",i:"💫",c:"ai",d:"UAE 초고속 추론 모델",cl:"cyan",av:"/logos/mercury.png"},
  {id:"ernie",n:"ERNIE 4.5",i:"🐾",c:"ai",d:"바이두 300B 초대형 모델",cl:"blue",av:"/logos/baidu.png"},
  {id:"hunyuan",n:"Hunyuan",i:"💬",c:"ai",d:"텐센트 AI 모델",cl:"blue",av:"/logos/tencent.png"},
  {id:"jamba",n:"Jamba Large 1.7",i:"🔮",c:"ai",d:"이스라엘 AI21 대형 모델",cl:"purple",av:"/logos/ai21.png"},
  {id:"granite",n:"Granite 4.0",i:"🏢",c:"ai",d:"IBM 엔터프라이즈 AI 모델",cl:"blue",av:"/logos/ibm.png"},
  {id:"step",n:"Step 3.5 Flash",i:"🚀",c:"ai",d:"스텝펀 최신 고속 모델",cl:"orange",av:"/logos/stepfun.png"},
  {id:"palmyra",n:"Palmyra X5",i:"✍️",c:"ai",d:"글쓰기 특화 AI, 컨텍스트 1M",cl:"purple",av:"/logos/writer.png"},
  {id:"longcat",n:"LongCat Flash",i:"🐱",c:"ai",d:"메이퇀 장문맥 AI 모델",cl:"amber",av:"/logos/meituan.png"},
  {id:"medical",n:"의학 전문가",i:"⚕️",c:"specialist",d:"질병·진단·치료 전문가",cl:"red",av:"/logos/specialist/medical.png"},
  {id:"psychology",n:"심리학 전문가",i:"🎭",c:"specialist",d:"인지·행동·임상심리 전문가",cl:"purple",av:"/logos/specialist/psychology.png"},
  {id:"legal",n:"법학 전문가",i:"⚖️",c:"specialist",d:"법리·판례·규제 전문가",cl:"amber",av:"/logos/specialist/legal.png"},
  {id:"finance",n:"금융 전문가",i:"💰",c:"specialist",d:"자산운용·리스크 전문가",cl:"emerald",av:"/logos/specialist/finance.png"},
  {id:"history",n:"역사학 전문가",i:"📕",c:"specialist",d:"문명사·사료비판 전문가",cl:"orange",av:"/logos/specialist/history.png"},
  {id:"philosophy",n:"철학 전문가",i:"🏛️",c:"specialist",d:"논리·윤리·형이상학 전문가",cl:"teal",av:"/logos/specialist/philosophy.png"},
  {id:"education",n:"교육학 전문가",i:"📖",c:"specialist",d:"교육과정·학습설계 전문가",cl:"blue",av:"/logos/specialist/education.png"},
  {id:"economics",n:"경제학 전문가",i:"📊",c:"specialist",d:"거시·미시 경제분석 전문가",cl:"emerald",av:"/logos/specialist/economics.png"},
  {id:"sociology",n:"사회학 전문가",i:"👥",c:"specialist",d:"사회구조·계층분석 전문가",cl:"pink",av:"/logos/specialist/sociology.png"},
  {id:"political",n:"정치학 전문가",i:"🗳️",c:"specialist",d:"정치체제·권력구조 전문가",cl:"blue",av:"/logos/specialist/political.png"},
  {id:"sports",n:"스포츠과학 전문가",i:"🏃",c:"specialist",d:"운동생리·퍼포먼스 전문가",cl:"orange",av:"/logos/specialist/sports.png"},
  {id:"marketing",n:"마케팅 전문가",i:"📣",c:"specialist",d:"브랜딩·시장전략 전문가",cl:"pink",av:"/logos/specialist/marketing.png"},
  {id:"criminology",n:"범죄학 전문가",i:"🕵️",c:"specialist",d:"범죄심리·수사과학 전문가",cl:"red",av:"/logos/specialist/criminology.png"},
  {id:"physics",n:"물리학 전문가",i:"⚛️",c:"specialist",d:"이론물리·양자역학 전문가",cl:"blue",av:"/logos/specialist/physics.png"},
  {id:"chemistry",n:"화학 전문가",i:"🧪",c:"specialist",d:"반응·물질변환 전문가",cl:"emerald",av:"/logos/specialist/chemistry.png"},
  {id:"biology",n:"생물학 전문가",i:"🧬",c:"specialist",d:"생명현상·유전체 전문가",cl:"emerald",av:"/logos/specialist/biology.png"},
  {id:"earthscience",n:"지구과학 전문가",i:"🌍",c:"specialist",d:"지질·기상·해양 전문가",cl:"teal",av:"/logos/specialist/earthscience.png"},
  {id:"envscience",n:"환경과학 전문가",i:"🌿",c:"specialist",d:"생태계·기후변화 전문가",cl:"emerald",av:"/logos/specialist/envscience.png"},
  {id:"theology",n:"신학/종교학 전문가",i:"🛐",c:"specialist",d:"신학·종교학 전문가",cl:"purple",av:"/logos/specialist/theology.png"},
  {id:"compsci",n:"컴퓨터공학 전문가",i:"🖥️",c:"specialist",d:"알고리즘·시스템설계 전문가",cl:"blue",av:"/logos/specialist/compsci.png"},
  {id:"pubadmin",n:"행정학 전문가",i:"🏢",c:"specialist",d:"공공정책·제도설계 전문가",cl:"amber",av:"/logos/specialist/pubadmin.png"},
  {id:"military",n:"군사 전문가",i:"🎖️",c:"specialist",d:"군사전략·안보·지정학 전문가",cl:"emerald",av:"/logos/specialist/military.png"},
  {id:"intlrelations",n:"국제관계 전문가",i:"🌐",c:"specialist",d:"외교·국제정치 전문가",cl:"blue",av:"/logos/specialist/intlrelations.png"},
  {id:"astronomy",n:"천문학 전문가",i:"🔭",c:"specialist",d:"천체물리·우주탐사 전문가",cl:"purple",av:"/logos/specialist/astronomy.png"},
  {id:"doctor",n:"의사",i:"🩺",c:"occupation",d:"임상 진료 전문의",cl:"red",av:"/logos/occupation/doctor.png"},
  {id:"pharmacist",n:"약사",i:"💊",c:"occupation",d:"약학·처방 전문가",cl:"emerald",av:"/logos/occupation/pharmacist.png"},
  {id:"vet",n:"수의사",i:"🐾",c:"occupation",d:"동물·수의학 전문가",cl:"emerald",av:"/logos/occupation/vet.png"},
  {id:"lawyer",n:"변호사",i:"👨‍⚖️",c:"occupation",d:"소송·법률자문 전문가",cl:"amber",av:"/logos/occupation/lawyer.png"},
  {id:"accountant",n:"회계사",i:"🧾",c:"occupation",d:"회계·세무 전문가",cl:"blue",av:"/logos/occupation/accountant.png"},
  {id:"teacher",n:"교사",i:"👨‍🏫",c:"occupation",d:"교육·학습 전문가",cl:"orange",av:"/logos/occupation/teacher.png"},
  {id:"artist",n:"예술가",i:"🎨",c:"occupation",d:"예술·창작 전문가",cl:"pink",av:"/logos/occupation/artist.png"},
  {id:"journalist",n:"기자",i:"📰",c:"occupation",d:"보도·미디어 전문가",cl:"blue",av:"/logos/occupation/journalist.png"},
  {id:"designer",n:"디자이너",i:"🖌️",c:"occupation",d:"UX·디자인 전문가",cl:"orange",av:"/logos/occupation/designer.png"},
  {id:"engineer",n:"엔지니어",i:"⚙️",c:"occupation",d:"공학·기술 전문가",cl:"teal",av:"/logos/occupation/engineer.png"},
  {id:"programmer",n:"프로그래머",i:"💻",c:"occupation",d:"IT·소프트웨어 전문가",cl:"blue",av:"/logos/occupation/programmer.png"},
  {id:"architect",n:"건축가",i:"🏗️",c:"occupation",d:"건축·설계 전문가",cl:"purple",av:"/logos/occupation/architect.png"},
  {id:"scientist",n:"과학자",i:"🔬",c:"occupation",d:"과학·연구 전문가",cl:"purple",av:"/logos/occupation/scientist.png"},
  {id:"chef",n:"요리사",i:"👨‍🍳",c:"occupation",d:"요리·식문화 전문가",cl:"red",av:"/logos/occupation/chef.png"},
  {id:"pilot",n:"파일럿",i:"✈️",c:"occupation",d:"항공·운항 전문가",cl:"teal",av:"/logos/occupation/pilot.png"},
  {id:"farmer",n:"농부",i:"🌾",c:"occupation",d:"농업·식량 전문가",cl:"emerald",av:"/logos/occupation/farmer.png"},
  {id:"firefighter",n:"소방관",i:"🚒",c:"occupation",d:"재난·안전 전문가",cl:"red",av:"/logos/occupation/firefighter.png"},
  {id:"police",n:"경찰관",i:"🚔",c:"occupation",d:"치안·수사 전문가",cl:"blue",av:"/logos/occupation/police.png"},
  {id:"soldier",n:"군인",i:"⚔️",c:"occupation",d:"군사·안보 전문가",cl:"emerald",av:"/logos/occupation/soldier.png"},
  {id:"taxadvisor",n:"세무사",i:"🧾",c:"occupation",d:"세금·절세 전문가",cl:"amber",av:"/logos/occupation/taxadvisor.png"},
  {id:"stocktrader",n:"펀드매니저",i:"📈",c:"occupation",d:"자산운용·투자 전문가",cl:"blue",av:"/logos/occupation/stocktrader.png"},
  {id:"writer",n:"작가",i:"✍️",c:"occupation",d:"소설·에세이 집필 전문가",cl:"pink",av:"/logos/occupation/writer.png"},
  {id:"gamedev",n:"게임개발자",i:"🎮",c:"occupation",d:"게임개발·기획 전문가",cl:"emerald",av:"/logos/occupation/gamedev.png"},
  {id:"athlete",n:"운동선수",i:"🏅",c:"occupation",d:"스포츠·체력관리 전문가",cl:"amber",av:"/logos/occupation/athlete.png"},
  {id:"barista",n:"바리스타",i:"☕",c:"occupation",d:"커피·카페 문화 전문가",cl:"orange",av:"/logos/occupation/barista.png"},
  {id:"hairstylist",n:"미용사",i:"💇",c:"occupation",d:"헤어·뷰티 전문가",cl:"pink",av:"/logos/occupation/hairstylist.png"},
  {id:"counselor",n:"상담사",i:"💬",c:"occupation",d:"심리상담·코칭 전문가",cl:"purple",av:"/logos/occupation/counselor.png"},
  {id:"socialworker",n:"사회복지사",i:"🤲",c:"occupation",d:"복지·취약계층 지원 전문가",cl:"pink",av:"/logos/occupation/socialworker.png"},
  {id:"diplomat",n:"외교관",i:"🤝",c:"occupation",d:"외교·국제관계 전문가",cl:"teal",av:"/logos/occupation/diplomat.png"},
  {id:"judge",n:"판사",i:"⚖️",c:"occupation",d:"사법·재판 전문가",cl:"amber",av:"/logos/occupation/judge.png"},
  {id:"sailor",n:"선원",i:"⚓",c:"occupation",d:"해운·항해 전문가",cl:"blue",av:"/logos/occupation/sailor.png"},
  {id:"model",n:"모델",i:"👗",c:"occupation",d:"패션·뷰티 전문가",cl:"purple",av:"/logos/occupation/model.png"},
  {id:"flightcrew",n:"승무원",i:"🛫",c:"occupation",d:"항공·서비스 전문가",cl:"blue",av:"/logos/occupation/flightcrew.png"},
  {id:"bodyguard",n:"경호원",i:"🕶️",c:"occupation",d:"신변보호·보안 전문가",cl:"emerald",av:"/logos/occupation/bodyguard.png"},
  {id:"musician",n:"음악가",i:"🎵",c:"occupation",d:"음악·작곡·연주 전문가",cl:"purple",av:"/logos/occupation/musician.png"},
  {id:"comedian",n:"코미디언",i:"🤡",c:"occupation",d:"코미디·엔터테인먼트 전문가",cl:"amber",av:"/logos/occupation/comedian.png"},
  {id:"producer",n:"프로듀서",i:"🎬",c:"occupation",d:"방송·영상 제작 전문가",cl:"red",av:"/logos/occupation/producer.png"},
  {id:"miner",n:"광부",i:"⛏️",c:"occupation",d:"광업·자원 채굴 전문가",cl:"orange",av:"/logos/occupation/miner.png"},
  {id:"fisher",n:"어부",i:"🎣",c:"occupation",d:"어업·수산 전문가",cl:"blue",av:"/logos/occupation/fisher.png"},
  {id:"sommelier",n:"소믈리에",i:"🍷",c:"occupation",d:"와인·음료 전문가",cl:"red",av:"/logos/occupation/sommelier.png"},
  {id:"president",n:"대통령",i:"🏛️",c:"occupation",d:"국가 통치·정책 전문가",cl:"amber",av:"/logos/occupation/president.png"},
  {id:"lawmaker",n:"국회의원",i:"🏢",c:"occupation",d:"입법·정치 전문가",cl:"blue",av:"/logos/occupation/lawmaker.png"},
  {id:"detective",n:"탐정",i:"🔍",c:"occupation",d:"조사·수사 전문가",cl:"purple",av:"/logos/occupation/detective.png"},
  {id:"explorer",n:"탐험가",i:"🧭",c:"occupation",d:"탐험·모험 전문가",cl:"teal",av:"/logos/occupation/explorer.png"},
  {id:"jobs",n:"스티브 잡스",i:"🍎",c:"celebrity",d:"애플 창업자·제품 혁신 아이콘",cl:"pink"},
  {id:"jihwan",n:"유지환 (제작자)",i:"👨‍💻",c:"celebrity",d:"이 서비스의 제작자",cl:"blue"},
  {id:"napoleon",n:"나폴레옹",i:"⚔️",c:"celebrity",d:"전략의 황제·군사 천재",cl:"red"},
  {id:"lincoln",n:"링컨",i:"🎩",c:"celebrity",d:"통합과 해방의 대통령",cl:"blue"},
  {id:"churchill",n:"처칠",i:"🇬🇧",c:"celebrity",d:"전시 불굴의 지도자",cl:"amber"},
  {id:"einstein",n:"아인슈타인",i:"🧪",c:"celebrity",d:"상대성이론의 물리학 혁명가",cl:"purple"},
  {id:"curie",n:"퀴리부인",i:"☢️",c:"celebrity",d:"방사능 연구의 선구자",cl:"emerald"},
  {id:"newton",n:"뉴턴",i:"🍏",c:"celebrity",d:"만유인력·과학혁명의 거인",cl:"orange"},
  {id:"nietzsche",n:"니체",i:"🦅",c:"celebrity",d:"초인·영원회귀의 철학자",cl:"red"},
  {id:"confucius",n:"공자",i:"📿",c:"celebrity",d:"인(仁)·예(禮)의 성인",cl:"amber"},
  {id:"kant",n:"칸트",i:"📐",c:"celebrity",d:"비판철학·도덕법칙의 거장",cl:"blue"},
  {id:"davinci",n:"다빈치",i:"🎨",c:"celebrity",d:"예술과 과학의 르네상스 천재",cl:"amber"},
  {id:"tesla",n:"니콜라 테슬라",i:"⚡",c:"celebrity",d:"교류전기·무선통신 발명가",cl:"purple"},
  {id:"hawking",n:"스티븐 호킹",i:"🌌",c:"celebrity",d:"블랙홀·우주론의 천재",cl:"teal"},
  {id:"darwin",n:"다윈",i:"🐢",c:"celebrity",d:"자연선택·진화론의 아버지",cl:"emerald"},
  {id:"turing",n:"앨런 튜링",i:"🖥️",c:"celebrity",d:"컴퓨터 과학의 아버지",cl:"teal"},
  {id:"aristotle",n:"아리스토텔레스",i:"📜",c:"celebrity",d:"논리학·만학의 아버지",cl:"amber"},
  {id:"sunzi",n:"손자",i:"⚔️",c:"celebrity",d:"병법의 성인·전략의 시조",cl:"red"},
  {id:"mlk",n:"마틴 루터 킹",i:"✊",c:"celebrity",d:"비폭력·인권운동의 상징",cl:"amber"},
  {id:"carnegie",n:"카네기",i:"🏭",c:"celebrity",d:"철강왕·자선의 복음",cl:"amber"},
  {id:"rockefeller",n:"록펠러",i:"🛢️",c:"celebrity",d:"석유왕·독점과 자선",cl:"teal"},
  {id:"alexander",n:"알렉산더 대왕",i:"🏛️",c:"celebrity",d:"동서 문화 융합의 정복왕",cl:"purple"},
  {id:"caesar",n:"율리우스 카이사르",i:"🏛️",c:"celebrity",d:"로마의 독재관·권력과 야망",cl:"red"},
  {id:"shakespeare",n:"셰익스피어",i:"🎭",c:"celebrity",d:"인간 본성의 대극작가",cl:"purple"},
  {id:"beethoven",n:"베토벤",i:"🎹",c:"celebrity",d:"운명에 맞선 불굴의 작곡가",cl:"amber"},
  {id:"mozart",n:"모차르트",i:"🎻",c:"celebrity",d:"천재적 선율의 작곡가",cl:"pink"},
  {id:"michelangelo",n:"미켈란젤로",i:"🗿",c:"celebrity",d:"조각·회화의 르네상스 거장",cl:"teal"},
  {id:"plato",n:"플라톤",i:"📘",c:"celebrity",d:"이데아론·이상국가의 설계자",cl:"blue"},
  {id:"marco-polo",n:"마르코 폴로",i:"🗺️",c:"celebrity",d:"동서양을 잇는 대탐험가",cl:"amber"},
  {id:"galileo",n:"갈릴레오",i:"🔭",c:"celebrity",d:"지동설·근대 과학의 아버지",cl:"purple"},
  {id:"edison",n:"에디슨",i:"💡",c:"celebrity",d:"실용주의 발명왕",cl:"amber"},
  {id:"hannibal",n:"한니발",i:"🐘",c:"celebrity",d:"로마를 공포에 떨게 한 전략가",cl:"red"},
  {id:"columbus",n:"콜럼버스",i:"⛵",c:"celebrity",d:"신대륙 발견의 탐험가",cl:"blue"},
  {id:"machiavelli",n:"마키아벨리",i:"🦊",c:"celebrity",d:"군주론·현실정치의 아버지",cl:"red"},
  {id:"mandela",n:"넬슨 만델라",i:"✊",c:"celebrity",d:"27년 수감 후 화해와 용서의 지도자",cl:"emerald"},
  {id:"van-gogh",n:"반 고흐",i:"🌻",c:"celebrity",d:"고뇌와 색채의 화가",cl:"amber"},
  {id:"tolstoy",n:"톨스토이",i:"📖",c:"celebrity",d:"인간 본질 탐구의 대문호",cl:"orange"},
  {id:"picasso",n:"피카소",i:"🎨",c:"celebrity",d:"입체파·규칙 파괴의 예술가",cl:"blue"},
  {id:"archimedes",n:"아르키메데스",i:"⚙️",c:"celebrity",d:"수학·공학의 천재",cl:"teal"},
  {id:"hippocrates",n:"히포크라테스",i:"⚕️",c:"celebrity",d:"의학의 아버지",cl:"emerald"},
  {id:"pythagoras",n:"피타고라스",i:"📐",c:"celebrity",d:"만물은 수·수학의 시조",cl:"blue"},
  {id:"nightingale",n:"나이팅게일",i:"🏥",c:"celebrity",d:"간호의 어머니·통계 혁신가",cl:"pink"},
  {id:"freud",n:"프로이트",i:"🧠",c:"celebrity",d:"무의식·정신분석의 아버지",cl:"purple"},
  {id:"adam-smith",n:"애덤 스미스",i:"🤝",c:"celebrity",d:"보이지 않는 손·경제학의 아버지",cl:"amber"},
  {id:"rousseau",n:"루소",i:"🌿",c:"celebrity",d:"사회계약론·자연 회귀의 사상가",cl:"emerald"},
  {id:"gutenberg",n:"구텐베르크",i:"📰",c:"celebrity",d:"인쇄 혁명·지식 민주화의 선구자",cl:"orange"},
  {id:"helen-keller",n:"헬렌 켈러",i:"✋",c:"celebrity",d:"장애를 뛰어넘은 의지의 상징",cl:"pink"},
  {id:"musk",n:"일론 머스크",i:"🚀",c:"celebrity",d:"테슬라·SpaceX·미래 설계 혁신가",cl:"purple"},
  {id:"buffett",n:"워렌 버핏",i:"💵",c:"celebrity",d:"오마하의 현인·장기 가치투자의 전설",cl:"amber"},
  {id:"bezos",n:"제프 베조스",i:"📦",c:"celebrity",d:"아마존 창업자·고객 집착의 아이콘",cl:"orange"},
  {id:"gates",n:"빌 게이츠",i:"💻",c:"celebrity",d:"MS 창업자·기술과 자선의 아이콘",cl:"blue"},
  {id:"son-masayoshi",n:"손정의",i:"📱",c:"celebrity",d:"소프트뱅크 회장·300년 비전의 투자가",cl:"amber"},
  {id:"miyazaki",n:"미야자키 하야오",i:"🎬",c:"celebrity",d:"지브리 감독·자연과 상상의 이야기꾼",cl:"emerald"},
  {id:"yuval",n:"유발 하라리",i:"📖",c:"celebrity",d:"사피엔스 저자·인류 역사를 꿰뚫는 사상가",cl:"orange"},
  {id:"nolan",n:"크리스토퍼 놀란",i:"🎥",c:"celebrity",d:"시간과 현실을 뒤트는 감독",cl:"blue"},
  {id:"cameron",n:"제임스 카메론",i:"🌊",c:"celebrity",d:"아바타·타이타닉의 탐험가 감독",cl:"teal"},
  {id:"dalio",n:"레이 달리오",i:"📊",c:"celebrity",d:"원칙·거시경제 사이클의 대가",cl:"teal"},
  {id:"jensen",n:"젠슨 황",i:"💚",c:"celebrity",d:"엔비디아 CEO·AI 인프라의 설계자",cl:"emerald"},
  {id:"zuckerberg",n:"마크 저커버그",i:"👤",c:"celebrity",d:"Meta 창업자·소셜과 메타버스의 미래",cl:"blue"},
  {id:"korean",n:"한국인",i:"🇰🇷",c:"region",d:"빨리빨리·정(情)·눈치의 나라",cl:"blue"},
  {id:"japanese",n:"일본인",i:"🇯🇵",c:"region",d:"장인정신·예의·쿠우키의 나라",cl:"red"},
  {id:"chinese",n:"중국인",i:"🇨🇳",c:"region",d:"관시·체면·대륙의 스케일",cl:"red"},
  {id:"american",n:"미국인",i:"🇺🇸",c:"region",d:"자유·개인주의·아메리칸 드림",cl:"blue"},
  {id:"british",n:"영국인",i:"🇬🇧",c:"region",d:"전통·유머·큐 문화의 나라",cl:"purple"},
  {id:"german",n:"독일인",i:"🇩🇪",c:"region",d:"정확성·마이스터·맥주의 나라",cl:"amber"},
  {id:"french",n:"프랑스인",i:"🇫🇷",c:"region",d:"자유·미식·파업의 나라",cl:"blue"},
  {id:"indian",n:"인도인",i:"🇮🇳",c:"region",d:"다양성·영성·저거드 정신의 나라",cl:"orange"},
  {id:"brazilian",n:"브라질인",i:"🇧🇷",c:"region",d:"삼바·축구·열정의 나라",cl:"emerald"},
  {id:"australian",n:"호주인",i:"🇦🇺",c:"region",d:"아웃도어·여유·메이트 정신의 나라",cl:"blue"},
  {id:"canadian",n:"캐나다인",i:"🇨🇦",c:"region",d:"관용·하키·사과 문화의 나라",cl:"red"},
  {id:"thai",n:"태국인",i:"🇹🇭",c:"region",d:"미소·불교·마이펜라이의 나라",cl:"amber"},
  {id:"vietnamese",n:"베트남인",i:"🇻🇳",c:"region",d:"끈기·쌀국수·도이모이의 나라",cl:"red"},
  {id:"russian",n:"러시아인",i:"🇷🇺",c:"region",d:"광활한 영토·보드카·러시안 소울",cl:"blue"},
  {id:"mexican",n:"멕시코인",i:"🇲🇽",c:"region",d:"타코·축제·가족 중심의 나라",cl:"emerald"},
  {id:"nigerian",n:"나이지리아인",i:"🇳🇬",c:"region",d:"놀리우드·활력·다민족의 나라",cl:"emerald"},
  {id:"italian",n:"이탈리아인",i:"🇮🇹",c:"region",d:"미식·가족·라돌체비타의 나라",cl:"emerald"},
  {id:"spanish",n:"스페인인",i:"🇪🇸",c:"region",d:"열정·시에스타·타파스의 나라",cl:"red"},
  {id:"turkish",n:"터키인",i:"🇹🇷",c:"region",d:"차이·바자르·동서 교차로의 나라",cl:"red"},
  {id:"saudi",n:"사우디인",i:"🇸🇦",c:"region",d:"환대·사막·전통과 변화의 나라",cl:"emerald"},
  {id:"israeli",n:"이스라엘인",i:"🇮🇱",c:"region",d:"후츠파·스타트업·생존의 나라",cl:"blue"},
  {id:"filipino",n:"필리핀인",i:"🇵🇭",c:"region",d:"가족·신앙·바할라나의 나라",cl:"blue"},
  {id:"indonesian",n:"인도네시아인",i:"🇮🇩",c:"region",d:"다양성·조화·고톡로용의 나라",cl:"red"},
  {id:"polish",n:"폴란드인",i:"🇵🇱",c:"region",d:"자부심·피에로기·회복력의 나라",cl:"red"},
  {id:"swedish",n:"스웨덴인",i:"🇸🇪",c:"region",d:"평등·피카·라곰의 나라",cl:"blue"},
  {id:"egyptian",n:"이집트인",i:"🇪🇬",c:"region",d:"고대문명·유머·나일강의 나라",cl:"amber"},
  {id:"argentinian",n:"아르헨티나인",i:"🇦🇷",c:"region",d:"탱고·아사도·자부심의 나라",cl:"blue"},
  {id:"southafrican",n:"남아공인",i:"🇿🇦",c:"region",d:"우분투·다양성·브라이의 나라",cl:"emerald"},
  {id:"taiwanese",n:"대만인",i:"🇹🇼",c:"region",d:"야시장·민주주의·반도체의 섬",cl:"blue"},
  {id:"singaporean",n:"싱가포르인",i:"🇸🇬",c:"region",d:"효율·키아수·호커센터의 도시국가",cl:"red"},
  {id:"malaysian",n:"말레이시아인",i:"🇲🇾",c:"region",d:"다문화·나시르막·조화의 나라",cl:"amber"},
  {id:"dutch",n:"네덜란드인",i:"🇳🇱",c:"region",d:"자전거·직설·자유의 나라",cl:"orange"},
  {id:"swiss",n:"스위스인",i:"🇨🇭",c:"region",d:"정밀·중립·직접민주주의의 나라",cl:"red"},
  {id:"norwegian",n:"노르웨이인",i:"🇳🇴",c:"region",d:"자연·복지·코셀리그의 나라",cl:"blue"},
  {id:"colombian",n:"콜롬비아인",i:"🇨🇴",c:"region",d:"커피·살사·회복의 나라",cl:"amber"},
  {id:"chilean",n:"칠레인",i:"🇨🇱",c:"region",d:"와인·안데스·자연의 나라",cl:"red"},
  {id:"iranian",n:"이란인",i:"🇮🇷",c:"region",d:"시(詩)·노루즈·타아로프의 나라",cl:"emerald"},
  {id:"emirati",n:"UAE인",i:"🇦🇪",c:"region",d:"환대·야망·사막 위의 미래도시",cl:"amber"},
  {id:"pakistani",n:"파키스탄인",i:"🇵🇰",c:"region",d:"비리야니·차이·환대의 나라",cl:"emerald"},
  {id:"bangladeshi",n:"방글라데시인",i:"🇧🇩",c:"region",d:"델타·힐사·회복력의 나라",cl:"emerald"},
  {id:"newzealander",n:"뉴질랜드인",i:"🇳🇿",c:"region",d:"키위·하카·자연 속 삶의 나라",cl:"blue"},
  {id:"irish",n:"아일랜드인",i:"🇮🇪",c:"region",d:"기네스·크래익·문학의 나라",cl:"emerald"},
  {id:"greek",n:"그리스인",i:"🇬🇷",c:"region",d:"필로티모·철학·지중해의 나라",cl:"blue"},
  {id:"czech",n:"체코인",i:"🇨🇿",c:"region",d:"맥주·유머·벨벳 혁명의 나라",cl:"red"},
  {id:"eastasian-culture",n:"동아시아 문화권",i:"🏯",c:"region",d:"교육·가족·예의·집단 조화 중심",cl:"amber"},
  {id:"middleeast-culture",n:"중동 문화권",i:"🏜️",c:"region",d:"환대·공동체·전통 중심",cl:"emerald"},
  {id:"western",n:"서양 문화권",i:"🏛️",c:"region",d:"개인주의·자유·민주주의 중심",cl:"blue"},
  {id:"latin",n:"라틴 문화권",i:"💃",c:"region",d:"정열·가족·축제 문화 중심",cl:"red"},
  {id:"nordic",n:"북유럽 문화권",i:"❄️",c:"region",d:"복지·평등·자연 중심",cl:"teal"},
  {id:"african",n:"아프리카 문화권",i:"🌍",c:"region",d:"우분투·공동체·구전 전통 중심",cl:"orange"},
  {id:"southeast-asian-culture",n:"동남아시아 문화권",i:"🌴",c:"region",d:"다양성·조화·열대 생활 중심",cl:"emerald"},
  {id:"southamerican-culture",n:"남미 문화권",i:"🎭",c:"region",d:"열정·다양성·자연·공동체 중심",cl:"amber"},
  {id:"libertarian",n:"자유주의",i:"🗽",c:"ideology",d:"개인의 자유·권리 최우선",cl:"amber",av:"/logos/ideology/libertarian.png"},
  {id:"conservative",n:"보수주의",i:"🏰",c:"ideology",d:"전통·안정·점진적 변화",cl:"orange",av:"/logos/ideology/conservative.png"},
  {id:"progressive",n:"진보주의",i:"🔄",c:"ideology",d:"개혁·사회변화·평등 추구",cl:"emerald",av:"/logos/ideology/progressive.png"},
  {id:"socialist",n:"사회주의",i:"✊",c:"ideology",d:"평등·공공복지·노동자 권리",cl:"red",av:"/logos/ideology/socialist.png"},
  {id:"communist",n:"공산주의",i:"☭",c:"ideology",d:"생산수단 공유·계급 철폐",cl:"red",av:"/logos/ideology/communist.svg"},
  {id:"democrat",n:"민주주의",i:"🗳️",c:"ideology",d:"국민 주권·다수결·참여",cl:"blue",av:"/logos/ideology/democrat.png"},
  {id:"capitalist",n:"자본주의",i:"💰",c:"ideology",d:"자유시장·경쟁·사유재산",cl:"blue",av:"/logos/ideology/capitalist.png"},
  {id:"nationalist",n:"민족주의",i:"🗻",c:"ideology",d:"국가·민족 이익 최우선",cl:"purple",av:"/logos/ideology/nationalist.png"},
  {id:"anarchist",n:"무정부주의",i:"🔥",c:"ideology",d:"국가·권위 자체를 부정",cl:"pink",av:"/logos/ideology/anarchist.png"},
  {id:"neoliberal",n:"신자유주의",i:"📈",c:"ideology",d:"시장 자유화·민영화·규제 완화",cl:"blue",av:"/logos/ideology/neoliberal.png"},
  {id:"totalitarian",n:"전체주의",i:"⛓️",c:"ideology",d:"국가 권력의 전면적 통제",cl:"red",av:"/logos/ideology/totalitarian.png"},
  {id:"pragmatist_i",n:"실용주의",i:"🔧",c:"ideology",d:"결과 중심·이념 초월",cl:"blue",av:"/logos/ideology/pragmatist_i.png"},
  {id:"humanist",n:"인본주의",i:"🌍",c:"ideology",d:"인간 존엄·이성·윤리 중심",cl:"teal",av:"/logos/ideology/humanist.png"},
  {id:"utilitarian",n:"공리주의",i:"⚖️",c:"ideology",d:"최대 다수의 최대 행복",cl:"emerald",av:"/logos/ideology/utilitarian.png"},
  {id:"populist",n:"포퓰리즘",i:"📣",c:"ideology",d:"반엘리트·대중 동원 정치 노선",cl:"orange",av:"/logos/ideology/populist.png"},
  {id:"pacifist",n:"평화주의",i:"☮️",c:"ideology",d:"비폭력·평화적 해결 추구",cl:"emerald",av:"/logos/ideology/pacifist.png"},
  {id:"stoicism",n:"스토아주의",i:"🏛️",c:"religion",d:"감정 통제·운명 수용의 철학",cl:"blue"},
  {id:"existentialism",n:"실존주의",i:"🚶",c:"religion",d:"실존·자유·의미 창조의 철학",cl:"purple"},
  {id:"nihilism",n:"허무주의",i:"🕳️",c:"religion",d:"모든 가치 해체의 철학",cl:"red"},
  {id:"hedonism",n:"쾌락주의",i:"🍷",c:"religion",d:"쾌락·평정이 최고선인 철학",cl:"pink"},
  {id:"skepticism",n:"회의주의",i:"🧐",c:"religion",d:"모든 확신을 유보하는 철학",cl:"teal"},
  {id:"rationalism",n:"합리주의",i:"🧠",c:"religion",d:"이성으로 진리에 도달하는 철학",cl:"blue"},
  {id:"empiricism",n:"경험주의",i:"👁️",c:"religion",d:"경험이 지식의 원천인 철학",cl:"orange"},
  {id:"pessimism-phil",n:"염세주의",i:"🌑",c:"religion",d:"세계 본질을 고통으로 보는 철학",cl:"purple"},
  {id:"relativism",n:"상대주의",i:"🔄",c:"religion",d:"절대 진리를 부정하는 철학",cl:"pink"},
  {id:"determinism",n:"결정론",i:"⚙️",c:"religion",d:"모든 것은 인과로 결정되는 철학",cl:"teal"},
  {id:"idealism-phil",n:"관념론",i:"💭",c:"religion",d:"정신·관념이 현실 본질인 철학",cl:"purple"},
  {id:"materialism-phil",n:"유물론",i:"⚛️",c:"religion",d:"물질만이 존재한다는 철학",cl:"red"},
  {id:"cynicism",n:"견유주의",i:"🏺",c:"religion",d:"사회 허위를 벗기는 철학",cl:"amber"},
  {id:"postmodernism",n:"포스트모더니즘",i:"🪞",c:"religion",d:"거대 서사 해체의 탈근대 철학",cl:"pink"},
  {id:"asceticism",n:"금욕주의",i:"🧘",c:"religion",d:"절제로 자유에 이르는 철학",cl:"teal"},
  {id:"buddhist",n:"불교",i:"☸️",c:"religion",d:"무상·연기·해탈의 가르침",cl:"amber",av:"/logos/religion/buddhism.svg"},
  {id:"christian",n:"기독교",i:"✝️",c:"religion",d:"사랑·은혜·구원의 신앙",cl:"blue",av:"/logos/religion/christianity.svg"},
  {id:"catholic",n:"가톨릭",i:"🙏",c:"religion",d:"전통·성사·공동선의 신앙",cl:"purple",av:"/logos/religion/catholic.svg"},
  {id:"islamic",n:"이슬람",i:"☪️",c:"religion",d:"율법·정의·공동체의 신앙",cl:"emerald",av:"/logos/religion/islam.svg"},
  {id:"confucian",n:"유교",i:"📜",c:"religion",d:"인륜·예의·덕치의 가르침",cl:"teal",av:"/logos/religion/confucianism.svg"},
  {id:"atheist",n:"무신론",i:"🧪",c:"religion",d:"이성·과학 중심의 세계관",cl:"orange",av:"/logos/religion/atheism.svg"},
  {id:"agnostic",n:"불가지론",i:"🤔",c:"religion",d:"알 수 없음을 인정하는 탐구",cl:"pink",av:"/logos/religion/agnostic.svg"},
  {id:"hindu",n:"힌두교",i:"🕉️",c:"religion",d:"업·윤회·해탈의 가르침",cl:"orange",av:"/logos/religion/hinduism.svg"},
  {id:"jewish",n:"유대교",i:"✡️",c:"religion",d:"토라·율법·지혜의 전통",cl:"blue",av:"/logos/religion/judaism.svg"},
  {id:"protestant",n:"개신교",i:"📖",c:"religion",d:"오직 믿음·오직 성경의 신앙",cl:"teal",av:"/logos/religion/protestant.svg"},
  {id:"orthodox",n:"정교회",i:"☦️",c:"religion",d:"동방 전통·테오시스의 신앙",cl:"amber",av:"/logos/religion/orthodox.svg"},
  {id:"sikh",n:"시크교",i:"🪯",c:"religion",d:"평등·봉사·하나의 신 신앙",cl:"orange",av:"/logos/religion/sikh.svg"},
  {id:"taoist",n:"도교",i:"☯️",c:"religion",d:"무위자연·도(道)의 가르침",cl:"teal",av:"/logos/religion/taoism.svg"},
  {id:"shinto",n:"신도",i:"⛩️",c:"religion",d:"팔백만 신·자연 경외의 신앙",cl:"red",av:"/logos/religion/shinto.svg"},
  {id:"minimalist",n:"미니멀리스트",i:"🪴",c:"lifestyle",d:"소유 최소화·본질에 집중",cl:"teal"},
  {id:"workaholic",n:"워커홀릭",i:"⏰",c:"lifestyle",d:"일 중독·성과 몰입형",cl:"blue"},
  {id:"nomad",n:"디지털 노마드",i:"🌴",c:"lifestyle",d:"원격근무·자유로운 이동",cl:"emerald"},
  {id:"work-life",n:"워라밸 추구자",i:"⚖️",c:"lifestyle",d:"일과 삶의 균형 추구",cl:"pink"},
  {id:"fire",n:"파이어족",i:"🔥",c:"lifestyle",d:"조기 은퇴·경제적 자유 추구",cl:"amber"},
  {id:"frugal",n:"절약주의자",i:"🐷",c:"lifestyle",d:"검소함·낭비 없는 삶",cl:"purple"},
  {id:"slow-living",n:"슬로우 라이프",i:"🐌",c:"lifestyle",d:"느리게·여유롭게·소확행",cl:"teal"},
  {id:"pet-lover",n:"반려동물인",i:"🐕",c:"lifestyle",d:"반려동물 중심 생활",cl:"orange"},
  {id:"homebody",n:"집순이/집돌이",i:"🛋️",c:"lifestyle",d:"집에서 모든 것을 해결",cl:"amber"},
  {id:"highschool",n:"고등학생",i:"📝",c:"lifestyle",d:"입시·학교생활·진로 고민",cl:"blue"},
  {id:"student",n:"대학생",i:"🎓",c:"lifestyle",d:"학업·취업·청춘의 고민",cl:"blue"},
  {id:"newbie-worker",n:"사회초년생",i:"👔",c:"lifestyle",d:"첫 직장·사회생활 적응기",cl:"teal"},
  {id:"solo",n:"1인가구",i:"🏠",c:"lifestyle",d:"혼자 사는 삶·독립생활",cl:"amber"},
  {id:"newlywed",n:"신혼부부",i:"💍",c:"lifestyle",d:"결혼 초기·살림·관계 적응",cl:"pink"},
  {id:"parent",n:"학부모",i:"👨‍👩‍👧",c:"lifestyle",d:"육아·교육·가정 중심",cl:"pink"},
  {id:"dual-income",n:"맞벌이 부부",i:"👫",c:"lifestyle",d:"일과 육아 병행 맞벌이",cl:"teal"},
  {id:"middle-aged",n:"중년",i:"🧑‍💼",c:"lifestyle",d:"경력·건강·가족 사이 균형",cl:"orange"},
  {id:"retiree",n:"은퇴자",i:"🏖️",c:"lifestyle",d:"은퇴 후 삶·연금·건강",cl:"amber"},
  {id:"sherlock",n:"셜록 홈즈",i:"🕵️",c:"fictional",d:"관찰과 연역의 명탐정",cl:"blue",av:"/logos/character/sherlock.png"},
  {id:"dracula",n:"드라큘라",i:"🧛",c:"fictional",d:"어둠의 귀족·영원한 포식자",cl:"red",av:"/logos/character/dracula.png"},
  {id:"frankenstein",n:"프랑켄슈타인",i:"🧟",c:"fictional",d:"버림받은 피조물의 비극",cl:"emerald",av:"/logos/character/frankenstein.png"},
  {id:"alice",n:"앨리스",i:"🐇",c:"fictional",d:"비논리 세계를 탐험하는 소녀",cl:"blue",av:"/logos/character/alice.png"},
  {id:"donquixote",n:"돈키호테",i:"🛡️",c:"fictional",d:"불가능한 꿈을 쫓는 기사",cl:"amber",av:"/logos/character/donquixote.png"},
  {id:"tarzan",n:"타잔",i:"🌿",c:"fictional",d:"정글의 왕·문명과 야생 사이",cl:"emerald"},
  {id:"scrooge",n:"스크루지",i:"💰",c:"fictional",d:"구두쇠에서 깨달은 자선가",cl:"amber",av:"/logos/character/scrooge.png"},
  {id:"robinson-crusoe",n:"로빈슨 크루소",i:"🏝️",c:"fictional",d:"극한 생존·자립의 상징",cl:"emerald",av:"/logos/character/robinson-crusoe.png"},
  {id:"tom-sawyer",n:"톰 소여",i:"🎣",c:"fictional",d:"모험심·기발한 꾀의 소년",cl:"orange",av:"/logos/character/tom-sawyer.png"},
  {id:"jekyll-hyde",n:"지킬과 하이드",i:"🪞",c:"fictional",d:"인간 내면의 이중성",cl:"red",av:"/logos/character/jekyll-hyde.png"},
  {id:"wukong",n:"손오공",i:"🐒",c:"fictional",d:"하늘도 두렵지 않은 자유의 투사",cl:"amber",av:"/logos/character/wukong.png"},
  {id:"zhuge-liang",n:"제갈공명",i:"🪶",c:"celebrity",d:"천하삼분의 전략가",cl:"blue",av:"/logos/character/zhuge-liang.png"},
  {id:"guan-yu",n:"관우",i:"⚔️",c:"celebrity",d:"의리와 충절의 무신(武神)",cl:"red",av:"/logos/character/guan-yu.png"},
  {id:"robin-hood",n:"로빈후드",i:"🏹",c:"fictional",d:"의적·부의 재분배·약자의 편",cl:"emerald",av:"/logos/character/robin-hood.png"},
  {id:"king-arthur",n:"킹 아서",i:"🗡️",c:"fictional",d:"이상적 왕도·원탁의 기사도",cl:"blue",av:"/logos/character/king-arthur.png"},
  {id:"pinocchio",n:"피노키오",i:"🤥",c:"fictional",d:"진짜가 되고 싶은 인형",cl:"amber",av:"/logos/character/pinocchio.png"},
  {id:"sinbad",n:"신밧드",i:"⛵",c:"fictional",d:"일곱 바다의 모험가",cl:"teal",av:"/logos/character/sinbad.png"},
  {id:"aladdin",n:"알라딘",i:"🪔",c:"fictional",d:"소원과 기회의 마법 소년",cl:"amber",av:"/logos/character/aladdin.png"},
  {id:"red-riding-hood",n:"빨간모자",i:"🧣",c:"fictional",d:"용감한 소녀",cl:"red",av:"/logos/character/red-riding-hood.png"},
  {id:"gatsby",n:"개츠비",i:"🥂",c:"fictional",d:"아메리칸 드림·집착의 비극",cl:"amber"},
  {id:"valjean",n:"장발장",i:"⛓️",c:"fictional",d:"속죄·용서·인간의 선함",cl:"blue"},
  {id:"little-prince",n:"어린 왕자",i:"🌹",c:"fictional",d:"본질을 꿰뚫는 순수한 눈",cl:"amber"},
  {id:"hamlet",n:"햄릿",i:"💀",c:"fictional",d:"존재의 고뇌·결단의 비극",cl:"purple"},
  {id:"faust",n:"파우스트",i:"📕",c:"fictional",d:"영혼을 건 지식의 탐구자",cl:"red"},
  {id:"peter-pan",n:"피터팬",i:"🧚",c:"fictional",d:"영원한 소년·성장 거부",cl:"emerald"},
  {id:"gulliver",n:"걸리버",i:"🔍",c:"fictional",d:"풍자의 눈·세상을 비추는 거울",cl:"blue"},
  {id:"lupin",n:"아르센 뤼팽",i:"🎩",c:"fictional",d:"신사 도둑·우아한 괴도",cl:"purple"},
  {id:"wonka",n:"윌리 웡카",i:"🍫",c:"fictional",d:"상상력의 초콜릿 공장주",cl:"amber"},
  {id:"big-brother",n:"빅브라더",i:"👁️",c:"fictional",d:"감시·통제·디스토피아의 권력",cl:"red"},
  {id:"justice-hero",n:"정의의 히어로",i:"🦸",c:"perspective",d:"정의와 공정을 지키는 히어로",cl:"blue"},
  {id:"villain",n:"빌런",i:"💀",c:"perspective",d:"냉소적이고 이기적인 악역",cl:"red"},
  {id:"time-traveler",n:"시간여행자",i:"⏳",c:"perspective",d:"2087년에서 온 미래인",cl:"purple"},
  {id:"lazynist",n:"귀차니스트",i:"😴",c:"perspective",d:"\"그냥 됐고...\" 최소 노력 추구",cl:"amber"},
  {id:"conspiracy",n:"음모론자",i:"🕵️",c:"perspective",d:"\"뭔가 숨기고 있어\" 숨은 의도 파헤침",cl:"teal"},
  {id:"doomist",n:"멸망론자",i:"☢️",c:"perspective",d:"\"이러다 다 망해\" 종말 시나리오",cl:"red"},
  {id:"showoff",n:"허세꾼",i:"🦚",c:"perspective",d:"있어 보이게 포장하는 달인",cl:"purple"},
  {id:"overinvested",n:"과몰입러",i:"🤯",c:"perspective",d:"주제에 지나치게 몰입 분석",cl:"red"},
  {id:"optimist",n:"낙관주의자",i:"🌈",c:"perspective",d:"\"결국 잘 될 거야\" 희망의 시선",cl:"amber"},
  {id:"pessimist",n:"비관주의자",i:"🌧️",c:"perspective",d:"\"최악을 대비해야 해\" 신중한 경고",cl:"purple"},
  {id:"devils-advocate",n:"악마의 변호인",i:"😈",c:"perspective",d:"반대편에서 허점을 공격",cl:"red"},
  {id:"fact-checker",n:"팩트체커",i:"✅",c:"perspective",d:"사실 여부를 검증하는 사람",cl:"emerald"},
  {id:"factbomber",n:"팩폭러",i:"💣",c:"perspective",d:"팩트로 폭격하는 사람",cl:"blue"},
  {id:"question-human",n:"물음표 인간",i:"❓",c:"perspective",d:"끝없는 질문으로 논리 시험",cl:"amber"},
  {id:"doubt-man",n:"의심병 환자",i:"🤨",c:"perspective",d:"\"그거 진짜야?\" 모든 것을 의심",cl:"purple"},
  {id:"nitpicker",n:"트집쟁이",i:"🧐",c:"perspective",d:"사사건건 트집 잡는 사람",cl:"pink"},
  {id:"empathy-person",n:"프로공감러",i:"🤗",c:"perspective",d:"\"그 마음 이해해\" 감정을 대변하는 프로",cl:"pink"},
  {id:"healing-bot",n:"힐링 요정",i:"🧸",c:"perspective",d:"마음을 어루만지는 따뜻한 존재",cl:"emerald"},
  {id:"emotional",n:"감성충",i:"🌙",c:"perspective",d:"새벽 감성으로 모든 걸 느끼는 사람",cl:"purple"},
  {id:"romanticist",n:"로맨티스트",i:"🌹",c:"perspective",d:"모든 것을 이상적이고 아름답게",cl:"pink"},
  {id:"uncomfortable",n:"프로불편러",i:"😤",c:"perspective",d:"불편한 진실을 직면시키는 프로",cl:"orange"},
  {id:"harsh-tongue",n:"독설가",i:"👅",c:"perspective",d:"돌려 말하지 않는 직설 화법",cl:"red"},
  {id:"scary-interviewer",n:"무서운 면접관",i:"😡",c:"perspective",d:"압박 질문으로 논리 시험",cl:"purple"},
  {id:"nagging-king",n:"잔소리 대마왕",i:"🫵",c:"perspective",d:"\"이것도 했어? 저것도 했어?\"",cl:"orange"},
  {id:"narcissist",n:"나르시스트",i:"🪞",c:"perspective",d:"\"나만큼 아는 사람 없어\"",cl:"pink"},
  {id:"chuunibyou",n:"중2병",i:"⚡",c:"perspective",d:"\"내 안의 힘이 깨어난다\" 과대 자의식",cl:"purple"},
  {id:"coward",n:"겁쟁이",i:"😱",c:"perspective",d:"\"그거 위험하지 않아?\" 모든 게 무서움",cl:"amber"},
  {id:"boomer",n:"꼰대",i:"👴",c:"perspective",d:"\"내 때는 말이야\" 경험 기반 훈수",cl:"orange"},
  {id:"tmi-talker",n:"투머치토커",i:"🗣️",c:"perspective",d:"안 물어봐도 다 알려주는 TMI",cl:"orange"},
  {id:"zeus",n:"제우스",i:"⚡",c:"mythology",d:"올림포스 최고신·천둥의 지배자",cl:"amber",av:"/logos/mythology/zeus.png"},
  {id:"athena",n:"아테나",i:"🦉",c:"mythology",d:"전략·지혜·정의의 여신",cl:"blue",av:"/logos/mythology/athena.png"},
  {id:"poseidon",n:"포세이돈",i:"🔱",c:"mythology",d:"바다와 지진의 신",cl:"teal",av:"/logos/mythology/poseidon.png"},
  {id:"hades",n:"하데스",i:"💎",c:"mythology",d:"저승의 왕·공정한 심판자",cl:"purple",av:"/logos/mythology/hades.png"},
  {id:"odysseus-myth",n:"오디세우스",i:"⚓",c:"mythology",d:"지략의 귀향 영웅",cl:"blue",av:"/logos/mythology/odysseus-myth.png"},
  {id:"achilles",n:"아킬레우스",i:"🏛️",c:"mythology",d:"불멸의 전사·발꿈치의 비극",cl:"red",av:"/logos/mythology/achilles.png"},
  {id:"medusa",n:"메두사",i:"🐍",c:"mythology",d:"저주받은 존재·시선의 공포",cl:"emerald",av:"/logos/mythology/medusa.png"},
  {id:"odin",n:"오딘",i:"👁️",c:"mythology",d:"한 눈을 바친 전지의 신",cl:"blue",av:"/logos/mythology/odin.png"},
  {id:"thor",n:"토르",i:"🔨",c:"mythology",d:"천둥의 신·정의의 수호자",cl:"red",av:"/logos/mythology/thor.png"},
  {id:"loki",n:"로키",i:"🦊",c:"mythology",d:"속임과 변신의 트릭스터",cl:"orange",av:"/logos/mythology/loki.png"},
  {id:"gilgamesh",n:"길가메시",i:"🏺",c:"mythology",d:"최초의 영웅왕·불멸의 추구자",cl:"amber",av:"/logos/mythology/gilgamesh.png"},
  {id:"anubis",n:"아누비스",i:"🐺",c:"mythology",d:"저승의 안내자·심장을 재는 신",cl:"purple",av:"/logos/mythology/anubis.png"},
  {id:"hanuman",n:"하누만",i:"🐵",c:"mythology",d:"충성스러운 원숭이 신",cl:"orange",av:"/logos/mythology/hanuman.png"},
  {id:"amaterasu",n:"아마테라스",i:"☀️",c:"mythology",d:"태양의 여신·빛과 질서의 근원",cl:"amber",av:"/logos/mythology/amaterasu.png"},
  {id:"cuchulainn",n:"쿠훌린",i:"🐕",c:"mythology",d:"켈트의 전사영웅·광전사",cl:"red",av:"/logos/mythology/cuchulainn.png"},
  {id:"apollo",n:"아폴론",i:"🌞",c:"mythology",d:"태양·예술·예언의 신",cl:"amber"},
  {id:"artemis",n:"아르테미스",i:"🏹",c:"mythology",d:"달·사냥·야생의 여신",cl:"emerald"},
  {id:"ares",n:"아레스",i:"🗡️",c:"mythology",d:"전쟁·분노·파괴의 신",cl:"red"},
  {id:"prometheus",n:"프로메테우스",i:"🔥",c:"mythology",d:"인류에게 불을 훔쳐준 반역자",cl:"orange"},
  {id:"aphrodite",n:"아프로디테",i:"🌸",c:"mythology",d:"사랑·미·욕망의 여신",cl:"pink"},
  {id:"hermes",n:"헤르메스",i:"👟",c:"mythology",d:"전령·도둑·경계의 신",cl:"teal"},
  {id:"dionysus",n:"디오니소스",i:"🍇",c:"mythology",d:"포도주·축제·광기의 신",cl:"purple"},
  {id:"freya",n:"프레이야",i:"💎",c:"mythology",d:"사랑·전쟁·마법의 여신",cl:"pink"},
  {id:"fenrir",n:"펜리르",i:"🐺",c:"mythology",d:"속박된 거대 늑대·라그나로크 선봉",cl:"red"},
  {id:"ra",n:"라",i:"☀️",c:"mythology",d:"태양신·최고 창조주",cl:"amber"},
  {id:"isis",n:"이시스",i:"🪽",c:"mythology",d:"마법·치유·부활의 여신",cl:"blue"},
  {id:"ganesha",n:"가네샤",i:"🐘",c:"mythology",d:"장애물 제거·지혜·시작의 신",cl:"orange"},
  {id:"kali",n:"칼리",i:"🔥",c:"mythology",d:"파괴·시간·해방의 여신",cl:"red"},
  {id:"susanoo",n:"스사노오",i:"🌊",c:"mythology",d:"폭풍의 신·파괴와 영웅의 양면",cl:"blue"},
  {id:"quetzalcoatl",n:"케찰코아틀",i:"🐉",c:"mythology",d:"깃털 달린 뱀·아즈텍의 신",cl:"emerald"}
];

const CAT_ORDER = [
  { id: "all", label: "전체" },
  { id: "ai-agent", label: "AI 에이전트" },
  { id: "ai-model", label: "일반 모델" },
  { id: "occupation", label: "직업" },
  { id: "specialist", label: "전문가" },
  { id: "religion", label: "철학/종교" },
  { id: "ideology", label: "이념" },
  { id: "lifestyle", label: "라이프스타일" },
  { id: "perspective", label: "페르소나" },
  { id: "celebrity", label: "인물" },
  { id: "fictional", label: "캐릭터" },
  { id: "mythology", label: "신화" },
  { id: "region", label: "국가/문화" },
];

function getBotsForCat(catId) {
  if (catId === "all") return ALL_BOTS;
  if (catId === "ai-agent") return ALL_BOTS.filter(b => b.c === "ai" && (b.id.startsWith("auto-") || b.id === "ancano-pro"));
  if (catId === "ai-model") return ALL_BOTS.filter(b => b.c === "ai" && !b.id.startsWith("auto-") && b.id !== "ancano-pro");
  return ALL_BOTS.filter(b => b.c === catId);
}

function botColor(bot) {
  return CL[bot.cl] || C.primary;
}

const APP_CARDS = [
  { icon: "⚖️", title: "찬반 토론", desc: "찬성 vs 반대로 AI 라운드테이블", color: C.blue, dim: C.blueDim, tag: "Only Here" },
  { icon: "🗣️", title: "자유 토론", desc: "주제 자유, AI끼리 대화", color: C.green, dim: C.greenDim, tag: null },
  { icon: "🔬", title: "심층 토론", desc: "깊이 있는 다각도 분석", color: C.primary, dim: C.primaryDim, tag: null },
  { icon: "💡", title: "브레인스토밍", desc: "AI 팀과 아이디어 폭풍", color: C.cyan, dim: C.cyanDim, tag: null },
  { icon: "👥", title: "멀티 채팅", desc: "여러 AI에게 동시 질문", color: C.green, dim: C.greenDim, tag: null },
  { icon: "📊", title: "문서 분석", desc: "PDF·이미지 AI 분석", color: C.primary, dim: C.primaryDim, tag: "NEW" },
  { icon: "🌐", title: "AI 번역", desc: "실시간 다국어 번역", color: C.pink, dim: "rgba(244,114,182,0.12)", tag: null },
  { icon: "📝", title: "AI 글쓰기", desc: "에세이·블로그·카피", color: C.orange, dim: C.orangeDim, tag: null },
];

const SIM_CARDS = [
  { icon: "🩺", title: "진료 상담", desc: "의사-환자 롤플레이. 증상 설명 연습과 의료 용어 이해를 도와줍니다.", color: C.green, tag: "인기" },
  { icon: "💼", title: "투자자 피칭", desc: "VC 앞에서 사업 아이디어를 발표하는 연습. 질의응답 포함.", color: C.blue, tag: "추천" },
  { icon: "🎙️", title: "면접 연습", desc: "직무별 맞춤 면접 질문. 피드백과 개선점을 실시간 제공.", color: C.primary, tag: "NEW" },
  { icon: "📞", title: "고객 응대", desc: "불만 고객, 환불 요청 등 CS 시나리오 트레이닝.", color: C.orange, tag: null },
  { icon: "⚖️", title: "법정 공방", desc: "원고·피고 역할을 AI가 수행. 논쟁 논리 훈련.", color: C.blue, tag: null },
  { icon: "🏠", title: "부동산 협상", desc: "매매·전세 가격 협상 시뮬레이션. 실전 대화 연습.", color: C.accent, tag: null },
];

const EXPERT_CARDS = [
  { icon: "⚖️", title: "법률 AI 자문", color: C.blue, vip: true, desc: "대법원 판례 DB + 현행 법령 기반 분석", bullets: ["계약서 리스크 검토","노동법·민법·형법 해설","소송 절차 및 비용 안내"], data: "대법원 판례 120만건 + 현행 법령 전문" },
  { icon: "🏥", title: "의료 AI 상담", color: C.green, vip: false, desc: "의약품 정보 + 질병 데이터 기반 안내", bullets: ["증상 기반 예상 진료과 추천","약물 상호작용 확인","건강검진 결과 해석 도움"], data: "식약처 의약품 DB + 질병관리청 데이터" },
  { icon: "💰", title: "금융 AI 분석", color: C.orange, vip: true, desc: "실시간 시장 데이터 + 경제 지표 분석", bullets: ["주식·ETF 종목 비교 분석","포트폴리오 리밸런싱 제안","금리·환율 시나리오 시뮬레이션"], data: "한국거래소 + 한국은행 경제통계" },
  { icon: "🏠", title: "부동산 AI 분석", color: C.accent, vip: true, desc: "실거래가 + 정책 데이터 기반 시세 분석", bullets: ["아파트·오피스텔 실거래 시세","전세가율·갭투자 리스크 진단","정부 부동산 정책 영향 분석"], data: "국토부 실거래가 + 부동산원 통계" },
  { icon: "📋", title: "세무 AI 가이드", color: C.primary, vip: false, desc: "세법 + 국세청 데이터 기반 세금 안내", bullets: ["종합소득세·부가세 신고 가이드","공제·감면 항목 자동 체크","프리랜서·사업자 절세 전략"], data: "국세청 세법 + 기획재정부 세제 자료" },
  { icon: "👷", title: "노무 AI 자문", color: C.cyan, vip: false, desc: "근로기준법 + 노동부 데이터 기반 상담", bullets: ["부당해고·퇴직금 산정 상담","근로계약서 조항 검토","4대보험·연차 계산"], data: "고용노동부 + 근로기준법 전문" },
];

const ASSIST_TOOLS = [
  { icon: "✍️", name: "이메일 작성기", color: C.blue },
  { icon: "🌐", name: "AI 번역", color: C.orange },
  { icon: "📝", name: "에세이 작성", color: C.green },
  { icon: "🔄", name: "바꾸어 쓰기", color: C.cyan },
  { icon: "📊", name: "데이터 분석", color: C.primary },
  { icon: "💬", name: "SNS 게시물", color: C.pink },
  { icon: "🎯", name: "광고 카피", color: C.accent },
  { icon: "📋", name: "요약하기", color: C.blue },
  { icon: "🔬", name: "논문 리뷰", color: C.green },
];

const ASSIST_PROMPTS = [
  { icon: "📧", title: "이벤트 이메일", desc: "이벤트 안내 이메일" },
  { icon: "📢", title: "광고 문구", desc: "제품 장점 어필" },
  { icon: "🎁", title: "할인 안내", desc: "할인 프로모션" },
  { icon: "😅", title: "지각 알림", desc: "상사에게 지각 알림" },
  { icon: "📨", title: "직원 공지", desc: "회사 소식 전달" },
  { icon: "🙏", title: "고객 사과", desc: "진심 어린 사과" },
];

/* ─── Tab Bar ─── */
function TabBar({ tab, onTab }) {
  const tabs = [
    { id: "home", label: "메인", emoji: "🏠" },
    { id: "apps", label: "응용", emoji: "📦" },
    { id: "explore", label: "탐색", emoji: "🧭" },
    { id: "premium", label: "프리미엄", emoji: "⭐" },
    { id: "assist", label: "어시스턴트", emoji: "🤖" },
  ];
  return (
    <div style={{ display: "flex", justifyContent: "space-around", paddingTop: 6, paddingBottom: 24, background: C.surface, borderTop: `1px solid ${C.border}` }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onTab(t.id)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <span style={{ fontSize: 18, opacity: tab === t.id ? 1 : 0.4 }}>{t.emoji}</span>
          <span style={{ fontSize: 9, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? C.primary : C.muted }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ─── Floating Input ─── */
function FloatingInput({ bot, onClear, input, onInput, onSend, msgs, chatOpen, onToggle }) {
  return (
    <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: "6px 12px 4px" }}>
      {bot && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: C.primaryDim, borderRadius: 8, padding: "4px 10px" }}>
            <span style={{ fontSize: 14 }}>{bot.i}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.primaryLight }}>{bot.n}</span>
          </div>
          {msgs.length > 0 && (
            <button onClick={onToggle} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: "3px 8px", cursor: "pointer", fontSize: 10, color: C.sub, fontWeight: 600 }}>
              {chatOpen ? "접기 ▼" : "채팅 ▲ " + msgs.length}
            </button>
          )}
          <button onClick={onClear} style={{ background: "none", border: "none", cursor: "pointer", marginLeft: "auto", fontSize: 14, color: C.muted }}>✕</button>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 7, background: C.card, borderRadius: 22, padding: "3px 3px 3px 14px", border: `1.5px solid ${C.border}` }}>
        <span style={{ fontSize: 16, color: C.muted }}>＋</span>
        <input value={input} onChange={e => onInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") onSend(); }}
          placeholder={bot ? bot.n + "에게 질문하세요" : "AI를 선택하고 질문하세요"}
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13.5, color: C.text }} />
        <button onClick={onSend} style={{ width: 32, height: 32, borderRadius: 16, border: "none", background: input.trim() ? C.primary : "transparent", cursor: "pointer", fontSize: 14, color: input.trim() ? "#fff" : C.muted }}>
          {input.trim() ? "↑" : "🎤"}
        </button>
      </div>
    </div>
  );
}

/* ─── Chat Overlay ─── */
function ChatOverlay({ msgs, bot }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  return (
    <div style={{ maxHeight: 250, overflowY: "auto", padding: "10px 14px", background: C.bg, borderTop: `1px solid ${C.border}` }}>
      {msgs.map((m, i) => (
        <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 8 }}>
          {m.role === "bot" && <div style={{ width: 24, height: 24, borderRadius: 7, background: C.primaryDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, marginRight: 6, marginTop: 2 }}>{bot?.i}</div>}
          <div style={{ maxWidth: "75%", padding: "9px 13px", borderRadius: 14, background: m.role === "user" ? C.primary : C.card, color: m.role === "user" ? "#fff" : C.text, fontSize: 13, lineHeight: 1.5 }}>{m.text}</div>
        </div>
      ))}
      <div ref={ref} />
    </div>
  );
}

/* ─── Bot Modal ─── */
function BotModal({ bot, onClose, onChat }) {
  if (!bot) return null;
  const color = botColor(bot);
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 300, display: "flex", alignItems: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
      <div style={{ position: "relative", width: "100%", background: C.surface, borderRadius: "24px 24px 0 0", padding: "20px 20px 32px" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: "0 auto 16px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <div style={{ width: 54, height: 54, borderRadius: 17, background: color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>{bot.i}</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{bot.n}</div>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{bot.d}</div>
          </div>
        </div>
        <button onClick={() => { onChat(bot); onClose(); }} style={{ width: "100%", background: C.primary, border: "none", borderRadius: 14, padding: "13px 0", fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer" }}>대화 시작</button>
      </div>
    </div>
  );
}

function SidebarPanel({ open, onClose }) {
  if (!open) return null;
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 400 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
      <div style={{ position: "relative", width: 270, height: "100%", background: C.surface, padding: "60px 20px" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.muted }}>✕</button>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 24 }}>Personai</div>
        {["새 대화", "대화 기록", "즐겨찾기", "설정", "피드백", "이용약관"].map((item, i) => (
          <div key={i} style={{ padding: "14px 0", borderBottom: `1px solid ${C.border}`, fontSize: 14, fontWeight: 600, color: C.text, cursor: "pointer" }}>{item}</div>
        ))}
      </div>
    </div>
  );
}

function MyPage({ onClose }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 400, background: C.bg, overflow: "auto" }}>
      <div style={{ padding: "14px 18px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.text }}>←</button>
        <span style={{ fontSize: 17, fontWeight: 800, color: C.text }}>마이페이지</span>
      </div>
      <div style={{ padding: "20px 18px", display: "flex", alignItems: "center", gap: 13 }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: `linear-gradient(135deg,${C.primary},${C.primaryLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#fff", fontWeight: 800 }}>Y</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>Yu</div>
          <div style={{ fontSize: 10, color: C.primary, fontWeight: 600, marginTop: 3, background: C.primaryDim, padding: "3px 9px", borderRadius: 6, display: "inline-block" }}>Free Plan</div>
        </div>
      </div>
      <div style={{ padding: "0 18px" }}>
        {["💬 대화 기록", "❤️ 즐겨찾기", "🔔 알림", "🌙 테마", "⚙️ 설정", "📢 피드백", "🚪 로그아웃"].map((item, i) => (
          <div key={i} style={{ padding: "14px 0", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
            <span style={{ fontSize: 15 }}>{item.slice(0, 2)}</span>
            <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1, color: item.includes("로그아웃") ? C.accent : C.text }}>{item.slice(2).trim()}</span>
            <span style={{ color: C.muted }}>›</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════ SCREENS ════ */

function HomeScreen({ onSelectBot, selectedBot }) {
  const [cat, setCat] = useState("all");
  const [showAllCats, setShowAllCats] = useState(false);
  const bots = getBotsForCat(cat);
  const visibleCats = showAllCats ? CAT_ORDER : CAT_ORDER.slice(0, 5);

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      {/* Greeting */}
      <div style={{ padding: "8px 18px 0" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 2 }}>어떤 AI와 대화할까요?</div>
        <div style={{ fontSize: 12, color: C.sub }}>394개의 AI 중 원하는 AI를 선택하세요</div>
      </div>

      {/* Categories */}
      <div style={{ padding: "14px 18px 0" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {visibleCats.map(c => (
            <button key={c.id} onClick={() => setCat(c.id)} style={{
              background: cat === c.id ? C.primary : C.card, color: cat === c.id ? "#fff" : C.sub,
              border: "none", borderRadius: 14, padding: "6px 13px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
            }}>{c.label}</button>
          ))}
          <button onClick={() => setShowAllCats(!showAllCats)} style={{
            background: C.card, color: C.muted,
            border: "none", borderRadius: 14, padding: "6px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
          }}>{showAllCats ? "접기 ▲" : "더보기 ▼"}</button>
        </div>
      </div>

      {/* Bot Count */}
      <div style={{ padding: "10px 18px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: C.muted }}>{bots.length}개 봇</span>
      </div>

      {/* Bot Grid */}
      <div style={{ padding: "6px 18px 0", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
        {bots.slice(0, 40).map(bot => {
          const sel = selectedBot?.id === bot.id;
          const color = botColor(bot);
          return (
            <button key={bot.id} onClick={() => onSelectBot(bot)} style={{
              background: sel ? color + "18" : C.card, border: sel ? `2px solid ${color}` : `1px solid ${C.border}`,
              borderRadius: 14, padding: "12px 3px 10px", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4, position: "relative",
            }}>
              {sel && <div style={{ position: "absolute", top: 5, right: 5, width: 14, height: 14, borderRadius: 7, background: color, color: "#fff", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</div>}
              <div style={{ width: 40, height: 40, borderRadius: 12, background: sel ? color + "20" : C.cardHover, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21 }}>{bot.i}</div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: C.text, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 2px" }}>{bot.n.length > 8 ? bot.n.slice(0, 7) + ".." : bot.n}</div>
              <div style={{ fontSize: 8.5, color: C.muted, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 2px" }}>{(bot.d || "").slice(0, 10)}</div>
            </button>
          );
        })}
      </div>

      {bots.length > 40 && (
        <div style={{ padding: "10px 18px", textAlign: "center" }}>
          <span style={{ fontSize: 11, color: C.muted }}>+{bots.length - 40}개 더 있음 · 탐색 탭에서 전체 보기</span>
        </div>
      )}

      {/* Tip */}
      {!selectedBot && (
        <div style={{ padding: "14px 18px 0" }}>
          <div style={{ background: C.card, borderRadius: 14, padding: "14px 16px", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>💡</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Tip</div>
              <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>AI를 선택하면 하단에 채팅창이 나타납니다</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AppsScreen() {
  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ padding: "4px 18px 0" }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: 0 }}>응용</h1>
        <p style={{ fontSize: 12, color: C.sub, margin: "2px 0 0" }}>다양한 AI 기능을 활용하세요</p>
      </div>
      <div style={{ padding: "14px 18px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {APP_CARDS.map((f, i) => (
          <div key={i} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: "16px 14px",
            cursor: "pointer", position: "relative", overflow: "hidden", aspectRatio: "1/1",
            display: "flex", flexDirection: "column", justifyContent: "flex-end",
          }}>
            <div style={{ position: "absolute", top: -25, right: -25, width: 70, height: 70, borderRadius: 35, background: f.dim, filter: "blur(22px)" }} />
            <div style={{ position: "relative" }}>
              {f.tag && <span style={{ fontSize: 8, fontWeight: 800, color: f.color, background: f.color + "18", padding: "2px 7px", borderRadius: 5, display: "inline-block", marginBottom: 8 }}>{f.tag}</span>}
              <div style={{ fontSize: 30, marginBottom: 8 }}>{f.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{f.title}</div>
              <div style={{ fontSize: 10.5, color: C.sub, marginTop: 4, lineHeight: 1.4 }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ height: 20 }} />
    </div>
  );
}

function ExploreScreen({ onBotDetail }) {
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [showAllCats, setShowAllCats] = useState(false);
  const bots = getBotsForCat(cat).filter(b => !q || b.n.toLowerCase().includes(q.toLowerCase()) || b.d.toLowerCase().includes(q.toLowerCase()));
  const visibleCats = showAllCats ? CAT_ORDER : CAT_ORDER.slice(0, 5);

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ padding: "4px 18px 0" }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: 0 }}>탐색</h1>
        <p style={{ fontSize: 12, color: C.sub, margin: "2px 0 0" }}>{ALL_BOTS.length}개 AI 봇</p>
      </div>
      <div style={{ padding: "12px 18px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, background: C.card, borderRadius: 13, padding: "10px 14px", border: `1.5px solid ${C.border}`, marginBottom: 10 }}>
          <span style={{ color: C.muted }}>🔍</span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="AI 봇 검색" style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13.5, color: C.text }} />
          {q && <button onClick={() => setQ("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: C.muted }}>✕</button>}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {visibleCats.map(c => (
            <button key={c.id} onClick={() => setCat(c.id)} style={{ background: cat === c.id ? C.primary : C.card, color: cat === c.id ? "#fff" : C.sub, border: "none", borderRadius: 14, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{c.label}</button>
          ))}
          <button onClick={() => setShowAllCats(!showAllCats)} style={{ background: C.card, color: C.muted, border: "none", borderRadius: 14, padding: "5px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{showAllCats ? "접기 ▲" : "더보기 ▼"}</button>
        </div>
        <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>{bots.length}개 결과</div>
      </div>
      <div style={{ padding: "0 18px" }}>
        {bots.slice(0, 50).map(bot => {
          const color = botColor(bot);
          return (
            <div key={bot.id} onClick={() => onBotDetail(bot)} style={{ background: C.card, borderRadius: 14, padding: "13px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, border: `1px solid ${C.border}`, cursor: "pointer" }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: color + "12", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{bot.i}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{bot.n}</div>
                <div style={{ fontSize: 11, color: C.sub, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bot.d}</div>
              </div>
              <span style={{ color: C.muted }}>›</span>
            </div>
          );
        })}
        {bots.length > 50 && <div style={{ textAlign: "center", padding: "10px 0", fontSize: 11, color: C.muted }}>+{bots.length - 50}개 더</div>}
      </div>
    </div>
  );
}

/* ─── 프리미엄 ─── */
function PremiumScreen() {
  const [subTab, setSubTab] = useState("sim");

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ padding: "4px 18px 0" }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: 0 }}>프리미엄</h1>
      </div>
      <div style={{ display: "flex", padding: "12px 18px 0", gap: 0 }}>
        {[{ id: "sim", label: "시뮬레이션" }, { id: "expert", label: "전문가 AI" }].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            flex: 1, padding: "10px 0", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
            background: "none", border: "none",
            color: subTab === t.id ? C.primary : C.muted,
            borderBottom: subTab === t.id ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
          }}>{t.label}</button>
        ))}
      </div>
      {subTab === "sim" && (
        <div style={{ padding: "14px 18px 0" }}>
          <div style={{ fontSize: 12, color: C.sub, marginBottom: 12 }}>AI와 실전 시나리오를 롤플레이로 연습하세요</div>
          {SIM_CARDS.map((item, i) => (
            <div key={i} style={{ background: C.card, borderRadius: 16, padding: "16px 14px", marginBottom: 10, border: `1px solid ${C.border}`, cursor: "pointer", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -15, right: -15, width: 50, height: 50, borderRadius: 25, background: item.color + "10", filter: "blur(15px)" }} />
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, position: "relative" }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: item.color + "12", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{item.title}</span>
                    {item.tag && <span style={{ fontSize: 8, fontWeight: 700, color: item.tag === "NEW" ? C.accent : C.primary, background: item.tag === "NEW" ? C.accentDim : C.primaryDim, padding: "2px 6px", borderRadius: 4 }}>{item.tag}</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: C.sub, lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {subTab === "expert" && (
        <div style={{ padding: "14px 18px 0" }}>
          <div style={{ background: `linear-gradient(135deg,${C.primary}25,${C.blue}15)`, borderRadius: 14, padding: "14px 16px", border: `1px solid ${C.primary}25`, marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>👑</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.orange }}>VIP 전문가 자문</div>
              <div style={{ fontSize: 10.5, color: C.sub, marginTop: 2 }}>공공데이터 + RAG 기반 전문 분석</div>
            </div>
            <button style={{ background: C.primary, border: "none", borderRadius: 10, padding: "7px 14px", fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer" }}>구독</button>
          </div>
          {EXPERT_CARDS.map((item, i) => (
            <div key={i} style={{ background: C.card, borderRadius: 16, padding: "16px 14px", marginBottom: 10, border: `1px solid ${C.border}`, cursor: "pointer", position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: item.color + "12", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{item.title}</span>
                    {item.vip && <span style={{ fontSize: 8, fontWeight: 800, color: C.orange, background: C.orangeDim, padding: "2px 5px", borderRadius: 4 }}>VIP</span>}
                  </div>
                  <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{item.desc}</div>
                </div>
              </div>
              <div style={{ marginBottom: 8 }}>
                {item.bullets.map((b, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 4, height: 4, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: C.sub }}>{b}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, background: C.cardHover, borderRadius: 8, padding: "6px 10px" }}>
                <span style={{ fontSize: 10 }}>📂</span>
                <span style={{ fontSize: 10, color: C.muted, fontWeight: 500 }}>{item.data}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ height: 20 }} />
    </div>
  );
}

function AssistScreen() {
  const [ac, setAc] = useState("모두");
  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ padding: "4px 18px 0" }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: 0 }}>어시스턴트</h1>
      </div>
      <div style={{ display: "flex", gap: 7, padding: "12px 18px 0", overflowX: "auto" }}>
        {["모두", "생산성 도구", "교육", "Email"].map(c => (
          <button key={c} onClick={() => setAc(c)} style={{ background: ac === c ? C.blue : C.card, color: ac === c ? "#fff" : C.sub, border: "none", borderRadius: 16, padding: "6px 14px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{c}</button>
        ))}
      </div>
      <div style={{ padding: "14px 18px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>VIP 도구</span><span>👑</span>
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {[{ icon: "🔍", name: "AI 심층 검색" }, { icon: "🧮", name: "수학 문제 해결" }, { icon: "📄", name: "PDF 요약" }, { icon: "📚", name: "AI 숙제 튜터" }].map((t, i) => (
            <div key={i} style={{ minWidth: 88, background: C.card, borderRadius: 14, padding: "13px 9px 10px", border: `1.5px solid ${C.accent}20`, cursor: "pointer", flexShrink: 0, textAlign: "center", position: "relative" }}>
              <span style={{ position: "absolute", top: 5, right: 5, fontSize: 10 }}>🔒</span>
              <div style={{ fontSize: 22, marginBottom: 5 }}>{t.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.text, lineHeight: 1.3 }}>{t.name}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "16px 18px 0" }}>
        <div style={{ marginBottom: 10 }}><span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>도구</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {ASSIST_TOOLS.map((t, i) => (
            <div key={i} style={{ background: C.card, borderRadius: 14, padding: "13px 7px 11px", border: `1px solid ${t.color}20`, cursor: "pointer", textAlign: "center" }}>
              <div style={{ fontSize: 22, marginBottom: 5 }}>{t.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.text, lineHeight: 1.3 }}>{t.name}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "16px 18px 0" }}>
        <div style={{ marginBottom: 10 }}><span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>프롬프트 템플릿</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {ASSIST_PROMPTS.map((p, i) => (
            <div key={i} style={{ background: C.card, borderRadius: 14, padding: "13px 11px", border: `1px solid ${C.border}`, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 17 }}>{p.icon}</span>
                <span style={{ fontSize: 12, color: C.muted }}>♡</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 2 }}>{p.title}</div>
              <div style={{ fontSize: 10, color: C.sub }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ height: 20 }} />
    </div>
  );
}

/* ════ MAIN ════ */
export default function PersonaiV6() {
  const [tab, setTab] = useState("home");
  const [bot, setBot] = useState(null);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [detailBot, setDetailBot] = useState(null);
  const [sidebar, setSidebar] = useState(false);
  const [myPage, setMyPage] = useState(false);

  const selectBot = (b) => {
    if (bot?.id === b.id) { setBot(null); setMsgs([]); setChatOpen(false); }
    else { setBot(b); setMsgs([]); setChatOpen(false); }
  };
  const clearBot = () => { setBot(null); setInput(""); setMsgs([]); setChatOpen(false); };
  const send = () => {
    if (!input.trim()) return;
    const t = input.trim(); setInput(""); setChatOpen(true);
    if (!bot) setBot(ALL_BOTS[0]);
    setMsgs(p => [...p, { role: "user", text: t }]);
    setTimeout(() => setMsgs(p => [...p, { role: "bot", text: (bot?.n || "ANCANO Pro") + " 응답입니다." }]), 500);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0A12", padding: "40px 16px", fontFamily: "'Noto Sans KR', sans-serif" }}>
      <div style={{ position: "fixed", top: 14, left: "50%", transform: "translateX(-50%)", background: "rgba(30,30,42,0.9)", padding: "5px 14px", borderRadius: 8, fontSize: 10.5, fontWeight: 600, color: C.sub, border: `1px solid ${C.border}`, zIndex: 999 }}>
        v6 — 394 AI Bots · {CAT_ORDER.length - 1} Categories
      </div>

      <div style={{ width: 375, height: 812, borderRadius: 40, overflow: "hidden", background: C.bg, position: "relative", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ height: 48, padding: "14px 22px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>1:45</span>
          <div style={{ width: 14, height: 8, border: `1.5px solid ${C.sub}`, borderRadius: 2 }} />
        </div>

        <div style={{ padding: "2px 18px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => setSidebar(true)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: C.text }}>☰</button>
          <span style={{ fontSize: 17, fontWeight: 800, color: C.text }}>Personai</span>
          <button onClick={() => setMyPage(true)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.text }}>👤</button>
        </div>

        <div style={{ height: "calc(100% - 96px)", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, overflowY: "auto", paddingBottom: bot ? 130 : 90 }}>
              {tab === "home" && <HomeScreen onSelectBot={selectBot} selectedBot={bot} />}
              {tab === "apps" && <AppsScreen />}
              {tab === "explore" && <ExploreScreen onBotDetail={setDetailBot} />}
              {tab === "premium" && <PremiumScreen />}
              {tab === "assist" && <AssistScreen />}
            </div>
          </div>
          {chatOpen && msgs.length > 0 && bot && <ChatOverlay msgs={msgs} bot={bot} />}
          <FloatingInput bot={bot} onClear={clearBot} input={input} onInput={setInput} onSend={send} msgs={msgs} chatOpen={chatOpen} onToggle={() => setChatOpen(!chatOpen)} />
          <TabBar tab={tab} onTab={setTab} />
        </div>

        {detailBot && <BotModal bot={detailBot} onClose={() => setDetailBot(null)} onChat={(b) => { setBot(b); setTab("home"); }} />}
        <SidebarPanel open={sidebar} onClose={() => setSidebar(false)} />
        {myPage && <MyPage onClose={() => setMyPage(false)} />}
      </div>
    </div>
  );
}
