export const BLOG_TOTAL = 2000
export const BLOG_PER_PAGE = 24

/** 음식 사진 (Unsplash) — postId마다 하나씩 순환 */
const FOOD_PHOTOS = [
  '1546069901-ba9599a7e63c',
  '1569718212165-3a8278d5f624',
  '1555939594-58d7cb561ad1',
  '1565299624946-b28f40a0ae38',
  '1517248135467-4c7edcad34c4',
  '1552566626-52f8b828add9',
  '1504674900247-0877df9cc836',
  '1476224203421-9ac39bce0da5',
  '1482045760723-406988f4437e',
  '1496116218413-95f065b5036c',
  '1529042410750-bbfb9484c0e4',
  '1551218808-94e220e084d2',
  '1567620905732-2d1ec7ab7445',
  '1585036495447-0745a139d757',
  '1596797038530-2c107229754b',
  '1601050690117-94f5444fa038',
  '1603133902878-684fc097f339',
  '1611141919889-522b4f303282',
  '1615362819097-267f57f3750a',
  '1621996346565-e3dbc646d659',
  '1626645735846-99c59e446114',
  '1630387344116-ba407e428978',
  '1631455782-bf43daa58112',
  '1559339352-11d035aa652e',
  '1563805042-7684c019e1cb',
  '1582166240808-aa4e1eec9466',
  '1590301155909-075f96b76095',
  '1598866598160-d899c442a1e5',
  '1600891964092-4316c288032e',
  '1606755960533-62cfc28f0a88',
  '1617191372096-1410422a1279',
  '1571091718762-40b2b5c5e5a1',
  '1568901346635-4b2920d7692f',
  '1563379091339-03b21ab4a4f8',
  '1551782450-17144efb9c50',
  '1525755662770-4d477775a351',
  '1553621042-0a4d5e99632a',
  '1540189549336-e7e273caa1bc',
  '1565958011703-44f9824ba124',
  '1544025162-d76694265947',
]

const PREFIXES = [
  '정든',
  '옛날',
  '소문난',
  '골목',
  '직화',
  '든든',
  '행복',
  '서울',
  '한양',
  '오래된',
  '맛있는',
  '정성',
  '우리',
  '명동',
  '종로',
]
const TYPES = [
  '국밥',
  '칼국수',
  '삼겹살',
  '돈까스',
  '라멘',
  '우동',
  '짬뽕',
  '파스타',
  '덮밥',
  '비빔밥',
  '김치찌개',
  '부대찌개',
  '냉면',
  '쌈밥',
  '곱창',
  '족발',
  '초밥',
  '분식',
  '감자탕',
  '설렁탕',
]
const SUFFIXES = ['본점', '역점', '점', '식당', 'Kitchen', 'House', '1호점', '2호점']
const DISTRICTS = [
  '강남',
  '서초',
  '종로',
  '중구',
  '마포',
  '용산',
  '성수',
  '을지로',
  '여의도',
  '광화문',
  '삼성',
  '잠실',
  '홍대',
  '신촌',
  '을지로3가',
  '시청',
  '을지로입구',
  '충무로',
  '을지로4가',
  '남대문',
]
const CATEGORIES = ['한식', '중식', '일식', '양식', '분식', '고기', '면요리', '국물']
const MENUS = {
  한식: ['김치찌개', '제육볶음', '된장찌개', '순두부', '불고기', '비빔밥', '국밥', '갈비탕'],
  중식: ['짜장면', '짬뽕', '탕수육', '마라탕', '볶음밥', '깐풍기', '양장피'],
  일식: ['돈까스', '라멘', '우동', '초밥', '규동', '가츠동', '냉우동'],
  양식: ['파스타', '리조또', '스테이크', '샐러드', '피자', '함박스테이크'],
  분식: ['떡볶이', '김밥', '라볶이', '순대', '튀김', '쫄면'],
  고기: ['삼겹살', '목살', '갈비', '양념치킨', '곱창', '대창'],
  면요리: ['칼국수', '냉면', '쌀국수', '우육면', '비빔국수'],
  국물: ['설렁탕', '곰탕', '추어탕', '해장국', '감자탕', '전골'],
}
const AUTHORS = [
  '점심러버',
  '직장인K',
  '맛집탐험가',
  '회사원J',
  '런치각편집',
  '혼밥마스터',
  '팀장님도인정',
  '을지로상주',
  '강남직장인',
  '점심30분',
]
const MOOD_TAGS = ['혼밥', '팀점심', '회식', '가성비', '빠른회전', '점심특선', '웨이팅있음', '재방문']

function seededRandom(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    return s / 0x100000000
  }
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)]
}

function pickN(rng, arr, n) {
  const copy = [...arr]
  const out = []
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(rng() * copy.length)
    out.push(copy.splice(idx, 1)[0])
  }
  return out
}

function formatDate(seed) {
  const start = new Date('2020-06-01').getTime()
  const end = new Date('2026-06-01').getTime()
  const t = start + (seed % (end - start))
  return new Date(t).toISOString().slice(0, 10)
}

export function getBlogImageUrl(postId) {
  const photoId = FOOD_PHOTOS[(postId - 1) % FOOD_PHOTOS.length]
  return `https://images.unsplash.com/photo-${photoId}?w=640&h=400&fit=crop&q=80&auto=format`
}

/** id: 1 ~ 2000 */
export function generateBlogPost(id) {
  if (id < 1 || id > BLOG_TOTAL) return null

  const rng = seededRandom(id * 7919)
  const category = pick(rng, CATEGORIES)
  const type = pick(rng, TYPES)
  const name = `${pick(rng, PREFIXES)} ${type}${pick(rng, SUFFIXES)}`
  const district = pick(rng, DISTRICTS)
  const menus = pickN(rng, MENUS[category] ?? MENUS.한식, 3)
  const rating = (3.5 + rng() * 1.4).toFixed(1)
  const price = Math.floor(7 + rng() * 15) * 1000
  const waitMin = Math.floor(rng() * 25)
  const author = pick(rng, AUTHORS)
  const tags = pickN(rng, MOOD_TAGS, 2)
  const imageUrl = getBlogImageUrl(id)
  const date = formatDate(id * 9973)

  const mainMenu = menus[0]
  const title = `${district} ${name} — ${mainMenu} 후기 (${rating}점)`
  const slug = `review-${id}`

  const paragraphs = [
    `${district} 근처 점심 시간에 ${name}을 다녀왔습니다. ${category} 전문점답게 ${mainMenu}가 시그니처인데, 직장인 점심으로 ${price.toLocaleString()}원대라 가성비도 괜찮았어요.`,
    `주문한 메뉴는 ${menus.join(', ')}입니다. ${mainMenu}는 간이 ${rng() > 0.5 ? '얼큰' : '담백'}한 편이고, 양은 ${rng() > 0.4 ? '1인 점심에 충분' : '팀 점심 2~3명이 나눠 먹기 좋'}했습니다. 밑반찬 리필 ${rng() > 0.6 ? '가능' : '없음'}.`,
    `점심 피크(12시 전후) 기준 웨이팅 ${waitMin > 10 ? `약 ${waitMin}분` : '거의 없음'}. 회전율이 ${waitMin > 15 ? '다소 느린' : '빠른'} 편이라 ${tags.includes('혼밥') ? '혼밥' : '팀 점심'} ${waitMin > 15 ? '엔 시간 체크 필요' : '에도 부담 없어요'}.`,
    `재방문 의사 ${Number(rating) >= 4.3 ? '있음' : '보통'}. ${district} 일대 ${category} 찾는다면 ${mainMenu} 한번 드셔보세요. (본 리뷰는 런치각 편집팀의 가상 체험기입니다.)`,
  ]

  return {
    id,
    slug,
    title,
    restaurant: name,
    district,
    category,
    rating: Number(rating),
    price,
    waitMin,
    author,
    tags,
    menus,
    imageUrl,
    date,
    excerpt: `${district} ${name}에서 ${mainMenu} 먹고 왔어요. ${rating}점 · ${price.toLocaleString()}원대`,
    body: paragraphs,
  }
}

export function generateBlogPage(page) {
  const totalPages = Math.ceil(BLOG_TOTAL / BLOG_PER_PAGE)
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * BLOG_PER_PAGE + 1
  const end = Math.min(start + BLOG_PER_PAGE - 1, BLOG_TOTAL)

  const posts = []
  for (let id = start; id <= end; id++) {
    const p = generateBlogPost(id)
    posts.push({
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      imageUrl: p.imageUrl,
      date: p.date,
      rating: p.rating,
      district: p.district,
      category: p.category,
    })
  }

  return { posts, page: safePage, totalPages, total: BLOG_TOTAL }
}

export function getBlogPostBySlug(slug) {
  const match = /^review-(\d+)$/.exec(slug)
  if (!match) return null
  return generateBlogPost(Number(match[1]))
}
