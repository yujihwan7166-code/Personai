import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * 이용약관 (v1, 2026-04-26).
 * AI 응답의 법적 한계, 사용자 콘텐츠 권리, 금지 행위 등 표준 항목을 한국 법률 톤으로 작성.
 */
const Terms = () => {
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

        <h1 className="text-2xl font-bold text-foreground mb-2">이용약관</h1>
        <p className="text-[13px] text-muted-foreground mb-8">시행일 2026년 4월 26일</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground/90 leading-relaxed">
          <section>
            <h2 className="text-base font-bold mb-2">제1조 (목적)</h2>
            <p className="text-[13.5px]">
              본 약관은 Expert Chat Forum(이하 "서비스")이 제공하는 AI 기반 채팅·토론·자문·학습 도구의 이용 조건과 절차, 이용자와 서비스 운영자 간 권리·의무 및 책임사항을 규정합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">제2조 (정의)</h2>
            <ul className="list-disc pl-5 space-y-1 text-[13.5px]">
              <li><b>이용자</b>: 본 서비스에 접속하여 약관에 따라 서비스를 이용하는 자</li>
              <li><b>회원</b>: 가입 절차를 거쳐 ID 를 부여받은 이용자</li>
              <li><b>콘텐츠</b>: 이용자가 입력·업로드한 텍스트·파일·음성 등 일체</li>
              <li><b>AI 응답</b>: 외부 LLM(대형 언어 모델)을 통해 생성된 텍스트·이미지·영상</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">제3조 (서비스 제공)</h2>
            <p className="text-[13.5px]">
              서비스는 AI 채팅, 멀티 AI 라운드테이블, 시뮬레이션 리허설, 법률·금융 등 자문 모드, AI 녹음 분석, 학습 노트북, 이미지·동영상 생성 등을 제공합니다. 일부 기능은 외부 LLM 제공자(OpenRouter·OpenAI 등)에 의존하며, 외부 서비스 장애 시 일시 제한될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">제4조 (AI 응답의 법적 한계)</h2>
            <ul className="list-disc pl-5 space-y-1 text-[13.5px]">
              <li>AI 응답은 <b>참고용 정보</b>이며, 법적·의료적·재정적 자격을 갖춘 전문가의 자문을 대체하지 않습니다.</li>
              <li>법률·의약품·금융·세무·노무 등 자문 모드의 응답은 <b>일반 정보 제공</b>에 해당하며, 실제 결정 전 반드시 자격 있는 전문가의 검토를 받아야 합니다.</li>
              <li>AI 응답의 정확성·완전성·시의성을 보장하지 않으며, 응답을 신뢰하여 발생한 손해에 대해 운영자는 책임지지 않습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">제5조 (이용자 콘텐츠와 권리)</h2>
            <p className="text-[13.5px]">
              이용자가 입력·업로드한 콘텐츠의 저작권은 이용자에게 있습니다. 단, 서비스 제공·개선을 위해 콘텐츠를 처리·저장·외부 LLM 제공자에게 전송하는 것에 동의한 것으로 봅니다. 운영자는 이용자 동의 없이 콘텐츠를 광고·판매·공개하지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">제6조 (금지 행위)</h2>
            <p className="text-[13.5px] mb-2">이용자는 다음 행위를 해서는 안 됩니다.</p>
            <ul className="list-disc pl-5 space-y-1 text-[13.5px]">
              <li>타인의 개인정보·저작물을 무단으로 입력·생성·배포</li>
              <li>아동 성착취물, 폭력·테러·자해 조장 콘텐츠 생성·요청</li>
              <li>서비스를 이용한 스팸·피싱·악성코드 배포</li>
              <li>API 우회·자동화 도구로 과도한 호출, 시스템 부하 유발</li>
              <li>법령·공서양속에 반하는 일체 행위</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">제7조 (계정 정지·해지)</h2>
            <p className="text-[13.5px]">
              제6조 위반 시 운영자는 사전 통지 없이 계정을 일시 정지하거나 해지할 수 있습니다. 이용자는 언제든지 회원 탈퇴를 요청할 수 있으며, 탈퇴 시 개인정보 처리방침에 따라 데이터가 파기됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">제8조 (서비스 변경·중단)</h2>
            <p className="text-[13.5px]">
              운영자는 서비스의 일부 또는 전부를 변경·중단할 수 있으며, 중대한 변경은 시행 30일 전 공지합니다. 외부 LLM 제공자의 정책 변경 등 불가피한 사유로 즉시 변경되는 경우 사후 통지될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">제9조 (책임 제한)</h2>
            <p className="text-[13.5px]">
              운영자는 천재지변·외부 서비스 장애·이용자 귀책 사유로 인한 손해에 대해 책임지지 않습니다. AI 응답의 신뢰성에 따른 의사결정 결과는 이용자 본인의 책임입니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">제10조 (분쟁 해결)</h2>
            <p className="text-[13.5px]">
              본 약관은 대한민국 법률에 따라 해석·적용되며, 분쟁 발생 시 민사소송법상 관할 법원에 따릅니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">제11조 (개정)</h2>
            <p className="text-[13.5px]">
              약관 변경 시 시행 7일 전(이용자 권리·의무에 중대한 영향을 미치는 경우 30일 전) 서비스 내 공지합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">문의</h2>
            <p className="text-[13.5px]">
              <a href="mailto:yujihwan7166@gmail.com" className="underline hover:text-foreground">yujihwan7166@gmail.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
