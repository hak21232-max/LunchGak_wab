import { Link } from 'react-router-dom'
import ContentPage, { ContentList, ContentSection } from '../components/ContentPage'

export default function About() {
  return (
    <ContentPage
      title="서비스 소개"
      description="런치각(LunchGAK)은 직장인 점심·회식 맛집을 AI와 지도 데이터로 추천하는 무료 웹 서비스입니다."
      path="/about"
      backTo={null}
    >
      <ContentSection title="런치각이란?">
        <p>
          <strong>런치각(LunchGAK)</strong>은 직장인을 위한 점심·회식 맛집 추천 웹앱입니다.
          &quot;오늘 뭐 먹지?&quot; 고민을 5가지 질문으로 정리하고, 현재 위치·날씨·블로그
          후기를 종합해 근처 식당 3곳을 추천합니다.
        </p>
        <p className="mt-2">
          단순히 거리순으로 나열하지 않습니다. 사용자가 선택한 음식(매운, 국물, 면류 등)에
          실제로 맞는지 네이버 블로그 후기로 검증한 뒤, Google Gemini AI가 순위와 이유를
          제시합니다.
        </p>
      </ContentSection>

      <ContentSection title="운영 목적">
        <p>
          본 서비스는 <strong>직장인에게 유용한 점심·회식 정보를 제공</strong>하는 것을
          목적으로 합니다. 검색 엔진 노출을 위한 자동 생성 문장이 아니라, 실제 식당
          선택에 도움이 되는 추천과 가이드 콘텐츠를 제공합니다.
        </p>
      </ContentSection>

      <ContentSection title="주요 기능">
        <ContentList
          items={[
            '5단계 문답(자리·기분·음식·시간·예산) 기반 맞춤 추천',
            'GPS 기반 근처 식당 검색(카카오맵 API)',
            '네이버 블로그 후기·메뉴 언급 분석',
            '날씨(비·더위·추위) 반영 추천',
            '카카오맵에서 식당 위치·도보 거리 확인',
            '점심·회식 실용 가이드 콘텐츠 제공',
          ]}
        />
      </ContentSection>

      <ContentSection title="사용 데이터">
        <p>
          위치 정보(GPS), 문답 결과, 날씨 API, 카카오·네이버 공개 API, Google Gemini AI를
          사용합니다. 수집·이용에 관한 자세한 내용은{' '}
          <Link to="/privacy" className="text-primary underline">
            개인정보처리방침
          </Link>
          을 참고해 주세요.
        </p>
      </ContentSection>

      <ContentSection title="면책">
        <p>
          추천 결과는 AI와 공개 데이터를 바탕으로 한 참고 정보이며, 식당의 영업 상태·메뉴·
          가격·위생·맛을 보증하지 않습니다. 방문 전 영업 시간과 메뉴를 직접 확인해 주세요.
        </p>
      </ContentSection>

      <ContentSection title="문의">
        <p>
          서비스 관련 문의는{' '}
          <Link to="/contact" className="text-primary underline">
            문의하기
          </Link>{' '}
          페이지를 이용해 주세요.
        </p>
      </ContentSection>
    </ContentPage>
  )
}
