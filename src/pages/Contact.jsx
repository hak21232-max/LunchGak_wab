import ContentPage, { ContentSection } from '../components/ContentPage'

const CONTACT_EMAIL = 'contact@lunchgak.app'

export default function Contact() {
  return (
    <ContentPage
      title="문의하기"
      description="런치각(LunchGAK) 서비스 문의·제휴·오류 신고. contact@lunchgak.app"
      path="/contact"
      backTo={null}
    >
      <ContentSection title="연락처">
        <p>
          서비스 이용 문의, 오류 신고, 제휴·광고 문의는 아래 이메일로 보내 주세요.
          영업일 기준 3~5일 내 답변을 드리겠습니다.
        </p>
        <p className="mt-3">
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=[런치각] 문의`}
            className="inline-block rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white"
          >
            ✉️ {CONTACT_EMAIL}
          </a>
        </p>
      </ContentSection>

      <ContentSection title="자주 받는 문의">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-semibold text-gray-800">추천 결과가 이상해요</dt>
            <dd className="mt-1 text-gray-600">
              GPS 허용 여부, 선택한 음식·거리 설정을 확인해 주세요. 조건에 맞는 식당이
              없으면 &quot;근처에 맞는 맛집 없음&quot;으로 안내됩니다.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-800">위치가 안 맞아요</dt>
            <dd className="mt-1 text-gray-600">
              브라우저 위치 권한을 허용하고, 실내에서는 GPS 오차가 클 수 있습니다.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-800">개인정보·광고 관련</dt>
            <dd className="mt-1 text-gray-600">
              개인정보처리방침 페이지를 참고해 주세요. AdSense 관련 문의도 위 이메일로
              가능합니다.
            </dd>
          </div>
        </dl>
      </ContentSection>

      <ContentSection title="운영 정보">
        <p className="text-sm text-gray-600">
          서비스명: 런치각 (LunchGAK)
          <br />
          웹사이트: 직장인 점심·회식 맛집 AI 추천
          <br />
          문의: {CONTACT_EMAIL}
        </p>
      </ContentSection>
    </ContentPage>
  )
}
