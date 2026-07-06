import { Link } from 'react-router-dom'
import ContentPage, { ContentList, ContentSection } from '../components/ContentPage'

export default function Privacy() {
  return (
    <ContentPage
      title="개인정보처리방침"
      description="런치각(LunchGAK) 개인정보처리방침. 위치 정보, 쿠키, Google AdSense 관련 안내."
      path="/privacy"
      backTo={null}
    >
      <p className="text-xs text-gray-400">시행일: 2026년 7월 6일</p>

      <ContentSection title="1. 개요">
        <p>
          런치각(LunchGAK, 이하 &quot;서비스&quot;)은 이용자의 개인정보를 중요하게 생각합니다.
          본 방침은 서비스 이용 시 수집·이용되는 정보와 그 처리 방법을 설명합니다.
        </p>
      </ContentSection>

      <ContentSection title="2. 수집하는 정보">
        <ContentList
          items={[
            '위치 정보: 맛집 추천을 위해 브라우저 GPS(위도·경도)를 사용합니다. 서버에 장기 저장하지 않으며, 추천 요청 처리에만 사용합니다.',
            '문답 정보: 자리·기분·음식·시간·예산 선택값은 추천 API 요청에 포함됩니다.',
            '기기·접속 정보: 브라우저 종류, IP 주소, 접속 시간 등은 웹 서버·호스팅(Cloudflare, Firebase) 로그에 기록될 수 있습니다.',
            '쿠키: Google AdSense 등 광고 서비스 및 사이트 기능 유지를 위해 쿠키가 사용될 수 있습니다.',
          ]}
        />
      </ContentSection>

      <ContentSection title="3. 정보 이용 목적">
        <ContentList
          items={[
            '근처 식당 검색 및 맞춤 추천 제공',
            '서비스 품질 개선 및 오류 대응',
            '법령 준수 및 분쟁 대응',
            'Google AdSense를 통한 광고 게재(승인 후)',
          ]}
        />
      </ContentSection>

      <ContentSection title="4. 제3자 제공 및 처리 위탁">
        <p>서비스는 다음 외부 서비스를 이용합니다.</p>
        <ContentList
          items={[
            '카카오맵: 지도 표시·장소 검색(카카오)',
            'Firebase Cloud Functions: 추천 API 처리(Google)',
            'Google Gemini: AI 추천 생성(Google)',
            'OpenWeather: 날씨 정보',
            '네이버 검색 API: 블로그 후기 수집(서버 측, 네이버)',
            'Cloudflare Pages: 웹사이트 호스팅',
            'Google AdSense: 광고 게재(Google, 승인 후)',
          ]}
        />
        <p className="mt-2">
          위탁 업체는 각 사업자의 개인정보처리방침에 따릅니다.
        </p>
      </ContentSection>

      <ContentSection title="5. Google AdSense 및 광고 쿠키">
        <p>
          Google을 포함한 제3자 공급업체는 쿠키를 사용하여 이용자의 본 사이트 및 다른
          사이트 방문 기록을 바탕으로 광고를 게재합니다. Google의 광고 쿠키 사용으로
          Google 및 파트너가 본 사이트·다른 사이트 방문 정보를 토대로 맞춤 광고를 제공할
          수 있습니다.
        </p>
        <p className="mt-2">
          이용자는{' '}
          <a
            href="https://www.google.com/settings/ads"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            Google 광고 설정
          </a>
          에서 맞춤 광고를 비활성화할 수 있습니다. 자세한 내용은{' '}
          <a
            href="https://policies.google.com/technologies/ads"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            Google 광고 정책
          </a>
          을 참고하세요.
        </p>
      </ContentSection>

      <ContentSection title="6. 보유 기간">
        <p>
          위치·문답 데이터는 추천 요청 처리 시 일시적으로 사용되며, 서비스 운영자가
          별도 DB에 영구 저장하지 않습니다. 서버 접속 로그는 호스팅 업체 정책에 따라
          일정 기간 보관 후 삭제됩니다.
        </p>
      </ContentSection>

      <ContentSection title="7. 이용자 권리">
        <p>
          이용자는 위치 정보 제공을 거부할 수 있습니다. 다만 GPS 미허용 시 추천 정확도가
          낮아질 수 있습니다. 개인정보 관련 문의는{' '}
          <Link to="/contact" className="text-primary underline">
            문의하기
          </Link>
          를 이용해 주세요.
        </p>
      </ContentSection>

      <ContentSection title="8. 방침 변경">
        <p>
          본 방침은 법령·서비스 변경에 따라 수정될 수 있으며, 변경 시 본 페이지에
          게시합니다.
        </p>
      </ContentSection>
    </ContentPage>
  )
}
