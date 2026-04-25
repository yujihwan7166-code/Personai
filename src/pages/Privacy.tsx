import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * 개인정보 처리방침 (v1, 2026-04-26).
 * 운영 정책이 확정되면 항목별 실내용·문의처를 갱신해야 한다.
 * 한국 개인정보 보호법 기준의 최소 항목 + AI 서비스 특성을 반영한 초안.
 */
const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          홈으로
        </Link>

        <h1 className="text-2xl font-bold text-foreground mb-2">개인정보 처리방침</h1>
        <p className="text-[13px] text-muted-foreground mb-8">시행일 2026년 4월 26일</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground/90 leading-relaxed">
          <section>
            <h2 className="text-base font-bold mb-2">1. 수집하는 개인정보 항목</h2>
            <ul className="list-disc pl-5 space-y-1 text-[13.5px]">
              <li><b>회원가입·로그인</b>: 이메일, 비밀번호(암호화 저장), OAuth 사용 시 제공자 식별자</li>
              <li><b>서비스 이용 기록</b>: 대화·검색 입력값, 업로드 파일(이미지·PDF·문서·음성), 모델 호출 로그</li>
              <li><b>자동 수집</b>: IP, 브라우저/OS, 접속 시각, 쿠키·세션 토큰</li>
              <li><b>로컬 저장</b>: 노트·일정·습관·메모 등 사용자 콘텐츠는 기본적으로 브라우저 저장소(IndexedDB·localStorage)에 보관, 동기화 활성 시 서버에 암호화 저장</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">2. 이용 목적</h2>
            <ul className="list-disc pl-5 space-y-1 text-[13.5px]">
              <li>회원 식별·인증·서비스 제공</li>
              <li>AI 모델 호출(OpenRouter·OpenAI 등 외부 LLM 제공자)을 통한 응답 생성</li>
              <li>검색·전사·분석 등 부가 기능 처리</li>
              <li>오류 추적·서비스 품질 개선</li>
              <li>이용약관 위반·악용 방지</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">3. 보유·이용 기간</h2>
            <p className="text-[13.5px]">
              회원 탈퇴 시 즉시 파기합니다. 단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다
              (예: 「전자상거래법」 표시·광고 6개월, 계약 기록 5년 등). 모델 호출 로그는 디버깅·악용 방지 목적으로 최대 90일 보관 후 삭제합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">4. 제3자 제공·위탁</h2>
            <p className="text-[13.5px] mb-2">
              서비스 제공을 위해 다음 처리자에게 처리 위탁합니다.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[13.5px]">
              <li><b>Vercel Inc.</b> — 호스팅·서버리스 함수</li>
              <li><b>OpenRouter</b> — LLM 모델 라우팅</li>
              <li><b>OpenAI</b> — 음성 전사(Whisper)</li>
              <li><b>Serper</b> — 웹 검색 결과 제공</li>
              <li><b>Supabase</b> — (선택) 동기화·인증 백엔드</li>
            </ul>
            <p className="text-[13.5px] mt-2">
              위탁 처리자에게 전송되는 입력은 응답 생성을 위해 필요한 최소한으로 한정합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">5. 이용자의 권리</h2>
            <p className="text-[13.5px]">
              언제든지 본인 개인정보를 열람·수정·삭제·처리정지를 요청할 수 있습니다. 회원 탈퇴 시 모든 데이터는 파기되며, 서버 동기화 데이터는 삭제 요청 후 30일 이내 백업까지 완전 삭제됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">6. 안전성 확보 조치</h2>
            <ul className="list-disc pl-5 space-y-1 text-[13.5px]">
              <li>비밀번호 해시 저장</li>
              <li>전송 구간 TLS 암호화</li>
              <li>API 키 등 민감정보 환경변수 분리</li>
              <li>접근 권한 최소화 원칙</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">7. 쿠키·로컬 저장소</h2>
            <p className="text-[13.5px]">
              서비스 환경 설정·로그인 유지·사용자 콘텐츠 저장 목적으로 쿠키와 IndexedDB·localStorage 를 사용합니다. 브라우저 설정에서 차단할 수 있으나 일부 기능이 제한될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">8. 개정 안내</h2>
            <p className="text-[13.5px]">
              본 방침이 변경될 경우 시행 7일 전 공지하며, 중대한 변경 시 30일 전 공지합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">9. 문의</h2>
            <p className="text-[13.5px]">
              개인정보 관련 문의: <a href="mailto:yujihwan7166@gmail.com" className="underline hover:text-foreground">yujihwan7166@gmail.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
