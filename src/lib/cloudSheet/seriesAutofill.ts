/** Fill handle 시리즈 감지 — 숫자 등차 / 요일·월명 cycle / 'Q1' 같은 텍스트+끝숫자 패턴. */

const KO_DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const EN_DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EN_DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const KO_MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const EN_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const EN_MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const CYCLE_LISTS = [KO_DAYS, EN_DAYS_SHORT, EN_DAYS_LONG, KO_MONTHS, EN_MONTHS_SHORT, EN_MONTHS_LONG];

/**
 * src 셀 값들로부터 step 째 다음 값을 예측.
 * step = 0 → src[0], step = src.length → 첫 새 항
 *
 * 우선순위:
 *  1) 모두 숫자 + 등차수열 → 산술 시리즈
 *  2) 첫 값이 cycle list 안 → cycle (요일·월명)
 *  3) 텍스트+숫자 끝 패턴 ('1주차' 같은) → 숫자만 증가
 *  4) 그 외 → 단순 cycle (src[step % src.length])
 */
export function nextSeriesValue(src: string[], step: number): string {
  if (src.length === 0) return '';
  const idx = ((step % src.length) + src.length) % src.length;
  if (step < src.length && step >= 0) return src[idx];

  // 1) 숫자 등차수열
  const nums = src.map((s) => Number(s));
  const allNum = src.every((s) => s.trim() !== '' && Number.isFinite(Number(s)));
  if (allNum && nums.length >= 2) {
    const diff = nums[1] - nums[0];
    const consistent = nums.every((n, i) => i === 0 || n - nums[i - 1] === diff);
    if (consistent) {
      const value = nums[nums.length - 1] + diff * (step - src.length + 1);
      // 정수 보존
      return Number.isInteger(value) ? String(value) : value.toFixed(2);
    }
  }
  if (allNum && nums.length === 1) {
    // 단일 숫자 → 1씩 증가
    return String(nums[0] + (step - src.length + 1));
  }

  // 2) cycle list
  for (const list of CYCLE_LISTS) {
    const i0 = list.indexOf(src[0]);
    if (i0 === -1) continue;
    // src 가 모두 list 안 연속 항인지
    const matchAll = src.every((s, i) => list[(i0 + i) % list.length] === s);
    if (matchAll) {
      const targetIdx = (i0 + step) % list.length;
      return list[targetIdx];
    }
  }

  // 3) 텍스트+끝숫자 패턴 ('1주차', 'Q1', 'Item5')
  const tailNumRe = /^(.*?)(-?\d+)([^\d]*)$/;
  const matches = src.map((s) => s.match(tailNumRe));
  const allTailNum = matches.every((m) => m !== null);
  if (allTailNum && matches.length >= 1) {
    const heads = matches.map((m) => m![1]);
    const tails = matches.map((m) => m![3]);
    const nums2 = matches.map((m) => Number(m![2]));
    const sameHead = heads.every((h) => h === heads[0]);
    const sameTail = tails.every((t) => t === tails[0]);
    if (sameHead && sameTail) {
      if (nums2.length >= 2) {
        const diff = nums2[1] - nums2[0];
        const consistent = nums2.every((n, i) => i === 0 || n - nums2[i - 1] === diff);
        if (consistent) {
          const next = nums2[nums2.length - 1] + diff * (step - src.length + 1);
          return `${heads[0]}${next}${tails[0]}`;
        }
      } else {
        // 단일: 1씩 증가
        return `${heads[0]}${nums2[0] + (step - src.length + 1)}${tails[0]}`;
      }
    }
  }

  // 4) cycle
  return src[idx];
}
