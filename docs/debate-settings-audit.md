# 토론 설정 반영 점검표

기준 파일:

- [Index.tsx](/C:/Users/ygh71/OneDrive/바탕%20화면/ai%20debate%201/expert-chat-forum/src/pages/Index.tsx)
- [ExpertSelectionPanel.tsx](/C:/Users/ygh71/OneDrive/바탕%20화면/ai%20debate%201/expert-chat-forum/src/components/ExpertSelectionPanel.tsx)
- [expert.ts](/C:/Users/ygh71/OneDrive/바탕%20화면/ai%20debate%201/expert-chat-forum/src/types/expert.ts)

점검 일자: 2026-04-05

현재 AI 토론 UI 기준 4개 모드:

1. 찬반토론 (`procon`)
2. 심층토론 (`standard`)
3. 자유토론 (`freetalk`)
4. AI vs 유저 (`aivsuser`)

상태 분류:

- `강하게 반영됨`: 실제 프롬프트/라운드 흐름/판정에 직접 영향
- `약하게 반영됨`: 일부만 반영되거나 체감이 약함
- `UI만 있었음`: 이전에는 보였지만 실제 효과가 약했거나 거의 없었음

## 찬반토론

| 설정 | 현재 반영 방식 | 상태 |
| --- | --- | --- |
| 인원 (`proconTeamSize`) | 찬성/반대 슬롯 수, 실제 팀 분할, 시작 가능 조건에 직접 반영 | 강하게 반영됨 |
| 강도 (`debateTone`) | 프롬프트에 온건/보통/격렬 토론 지침으로 직접 반영 | 강하게 반영됨 |
| 라운드 (`rounds`) | 2R/3R/4R/5R에 따라 실제 라운드 수와 UI 라운드 그룹이 바뀜 | 강하게 반영됨 |
| 길이 (`responseLength`) | 답변 길이 지시문으로 직접 반영 | 강하게 반영됨 |

추가 UI 반영:

- 찬반토론 입력창 폭은 답변 컨테이너와 같은 `max-w-3xl`
- 찬반토론 입력창 `+` 메뉴에서는 `파일 추가`, `이미지 만들기` 숨김

## 심층토론

| 설정 | 현재 반영 방식 | 상태 |
| --- | --- | --- |
| 목적 (`debateTone`) | `탐색/분석/합의` 목적 프롬프트로 직접 반영 | 강하게 반영됨 |
| 핵심 논점 (`discussionIssues`) | 선택한 논점을 프롬프트에 목록으로 주입 | 강하게 반영됨 |
| 길이 (`responseLength`) | 답변 길이 지시문으로 직접 반영 | 강하게 반영됨 |
| 라운드 (`rounds`) | 2R/3R/4R에 따라 실제 라운드 흐름이 변경 | 강하게 반영됨 |

이번에 고친 내용:

- 예전에는 `목적` UI가 `debateSettings.debateTone`을 바꾸는데, 실제 프롬프트는 별도 `debateIntensity` 상태를 보고 있어서 어긋남이 있었음
- 현재는 `debateSettings.debateTone`만 보도록 통일

## 자유토론

| 설정 | 현재 반영 방식 | 상태 |
| --- | --- | --- |
| 최대 대화 수 (`freetalkMessageCount`) | 최대 발화 수 상한으로 직접 사용 | 강하게 반영됨 |
| 말투 (`freetalkTone`) | 극존칭/정중/자연스러움/직설적/공격적 지시문으로 프롬프트에 직접 반영 | 강하게 반영됨 |

현재 UI 값:

- `20회 / 40회 / 60회`
- `극존칭 / 정중 / 자연스러움 / 직설적 / 공격적`

참고:

- 예전 `분량` UI는 숨겨졌고, 실제 사용되는 값은 `최대 대화 수`

## AI vs 유저

| 설정 | 현재 반영 방식 | 상태 |
| --- | --- | --- |
| 주제 (`aivsUserTopic`) | 시작 전 고정 주제. 이 값이 없으면 대결 시작 차단 | 강하게 반영됨 |
| 내 입장 (`aivsUserStance`) | 유저 입장 찬성/반대를 고정하고 AI는 반대편으로 자동 설정 | 강하게 반영됨 |
| 참여 인원 (`aivsUserOpponentCount`) | 실제 AI 상대 수와 슬롯 수, 응답 참여 AI 수에 직접 반영 | 강하게 반영됨 |
| 말투/공격성 (`aivsUserDifficulty`) | 친근/논리적/공격적 프롬프트 지시문으로 직접 반영 | 강하게 반영됨 |
| 승패 판정 (`aivsUserVerdict`) | `없음`이면 판정 없이 종료, `마지막 판정`이면 종료 시 판정 API 호출 | 강하게 반영됨 |

현재 구조:

1. 설정창에서 토론 주제 설정
2. 유저가 내 입장 설정
3. 유저가 첫 주장 입력
4. AI 상대가 반대 입장으로 즉시 응답
5. 이후 후속 대결 진행
6. 필요 시 마지막 판정

## 이번 점검에서 확인한 핵심 결론

- 현재 4개 토론 모드의 주요 설정은 모두 실제 대화 흐름이나 프롬프트에 반영되도록 연결되어 있음
- 가장 큰 누락이었던 심층토론 `목적` 연결은 이번에 수정 완료
- 찬반토론과 AI vs 유저는 라운드/인원/판정 같은 구조적 설정이 실제 흐름에 반영됨
- 자유토론은 `최대 대화 수`, `말투`가 프롬프트와 종료 조건에 반영됨

## 후속 주의사항

- [Index.tsx](/C:/Users/ygh71/OneDrive/바탕%20화면/ai%20debate%201/expert-chat-forum/src/pages/Index.tsx)는 거대 파일이라 설정값 연결 회귀가 다시 나기 쉬움
- 심층토론 `목적`은 이제 `debateSettings.debateTone`만 사용하므로, 별도 로컬 상태를 다시 만들지 않는 것이 안전함
- `QuestionInput`의 `+` 메뉴 제약은 모드별 조건문으로 제어되므로, 다른 모드 수정 시 찬반토론 제한이 풀리지 않게 같이 점검할 것
