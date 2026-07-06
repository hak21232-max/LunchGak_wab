import { Link } from 'react-router-dom'
import ContentPage, { ContentList, ContentSection } from '../components/ContentPage'

export default function Terms() {
  return (
    <ContentPage
      title="이용약관"
      description="런치각(LunchGAK) 서비스 이용약관."
      path="/terms"
      backTo={null}
    >
      <p className="text-xs text-gray-400">시행일: 2026년 7월 6일</p>

      <ContentSection title="제1조 (목적)">
        <p>
          본 약관은 런치각(LunchGAK, 이하 &quot;서비스&quot;)의 이용 조건 및 절차, 이용자와
          운영자의 권리·의무를 규정함을 목적으로 합니다.
        </p>
      </ContentSection>

      <ContentSection title="제2조 (서비스 내용)">
        <p>
          서비스는 직장인 대상 점심·회식 맛집 추천, 관련 정보 콘텐츠(가이드), 지도 표시
          기능을 무료로 제공합니다. 추천 결과는 AI·공개 API 데이터에 기반한 참고
          정보입니다.
        </p>
      </ContentSection>

      <ContentSection title="제3조 (이용자의 의무)">
        <ContentList
          items={[
            '타인의 권리를 침해하거나 불법적인 목적으로 서비스를 이용하지 않습니다.',
            '서비스 API를 무단으로 대량 호출·스크래핑·재판매하지 않습니다.',
            '허위 위치 정보 등을 악의적으로 입력하지 않습니다.',
          ]}
        />
      </ContentSection>

      <ContentSection title="제4조 (면책)">
        <p>
          운영자는 AI 추천·제3자 API(카카오, 네이버, Google 등) 데이터의 정확성·완전성·
          최신성을 보증하지 않습니다. 추천 식당 방문·주문·결제에 따른 결과(음식 품질,
          가격, 영업 상태, 안전 등)에 대해 운영자는 책임을 지지 않습니다.
        </p>
      </ContentSection>

      <ContentSection title="제5조 (지적재산권)">
        <p>
          서비스의 디자인, 가이드 콘텐츠, 로고 등에 대한 권리는 운영자에게 있습니다.
          이용자는 개인적·비상업적 범위에서 서비스를 이용할 수 있습니다.
        </p>
      </ContentSection>

      <ContentSection title="제6조 (광고)">
        <p>
          서비스는 Google AdSense 등을 통해 광고가 게재될 수 있습니다. 광고 내용은
          광고주가 책임지며, 서비스 운영자는 광고주의 제품·서비스를 보증하지 않습니다.
        </p>
      </ContentSection>

      <ContentSection title="제7조 (약관 변경)">
        <p>
          본 약관은 필요 시 변경될 수 있으며, 변경된 약관은 본 페이지에 게시한 때부터
          효력이 발생합니다.
        </p>
      </ContentSection>

      <ContentSection title="제8조 (문의)">
        <p>
          약관 관련 문의는{' '}
          <Link to="/contact" className="text-primary underline">
            문의하기
          </Link>
          를 이용해 주세요.
        </p>
      </ContentSection>
    </ContentPage>
  )
}
